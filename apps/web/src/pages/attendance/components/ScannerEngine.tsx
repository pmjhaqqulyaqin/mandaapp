import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Camera, Lightbulb, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ScannerEngineProps {
  onScan: (data: string) => void;
  isActive: boolean;
  compact?: boolean;
}

// Maximum resolution to process — downscale if larger (big perf win on mobile)
const MAX_SCAN_WIDTH = 640;

export const ScannerEngine: React.FC<ScannerEngineProps> = ({ onScan, isActive, compact = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>();
  const zxingReader = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanned = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Performance tracking refs
  const lastScanTime = useRef<number>(0);
  const jsQrFailCount = useRef<number>(0);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null); // reusable offscreen canvas

  // Initialize ZXing (lazily — only created when needed)
  useEffect(() => {
    // Don't create ZXing upfront, create on demand to speed up startup
    return () => {
      stopScanning();
    };
  }, []);

  // Lazy ZXing initialization
  const getZxingReader = useCallback(() => {
    if (!zxingReader.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      zxingReader.current = new BrowserMultiFormatReader(hints);
    }
    return zxingReader.current;
  }, []);

  // Fetch cameras
  const getCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setError('Kamera tidak didukung di browser ini (atau butuh HTTPS)');
        return;
      }
      // Request permission first to get labels
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.warn('Initial camera permission denied or ignored', err);
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        // Prefer back camera
        const back = videoDevices.find(d => /back|rear|belakang|environment/i.test(d.label));
        setSelectedCamera(back ? back.deviceId : videoDevices[0].deviceId);
      } else {
        setError('Tidak ada kamera ditemukan');
      }
    } catch (err: any) {
      setError('Izin kamera ditolak atau error: ' + err.message);
    }
  }, []);

  useEffect(() => {
    getCameras();
  }, [getCameras]);

  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Get or create reusable offscreen canvas for downsampling
  const getScanCanvas = useCallback(() => {
    if (!scanCanvasRef.current) {
      scanCanvasRef.current = document.createElement('canvas');
    }
    return scanCanvasRef.current;
  }, []);

  // Scan Loop — throttled to ~20fps for performance, with smart downsampling
  const scanLoop = useCallback(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    const now = performance.now();
    // Throttle: scan at most every 50ms (~20fps) — QR codes don't need 60fps
    if (now - lastScanTime.current < 50) {
      requestRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    lastScanTime.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState >= 2 && video.videoWidth > 0) {
      // Determine processing dimensions — downsample if video is large
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = vw > MAX_SCAN_WIDTH ? MAX_SCAN_WIDTH / vw : 1;
      const pw = Math.floor(vw * scale); // processing width
      const ph = Math.floor(vh * scale); // processing height

      // Use offscreen canvas for downsampled processing
      const scanCanvas = getScanCanvas();
      if (scanCanvas.width !== pw || scanCanvas.height !== ph) {
        scanCanvas.width = pw;
        scanCanvas.height = ph;
      }

      const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        requestRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      
      // Draw downsampled frame
      ctx.drawImage(video, 0, 0, pw, ph);
      
      // Crop center 60% for QR scan — smaller area = faster processing
      const cropRatio = 0.6;
      const cw = Math.floor(pw * cropRatio);
      const ch = Math.floor(ph * cropRatio);
      const cx = Math.floor((pw - cw) / 2);
      const cy = Math.floor((ph - ch) / 2);
      
      try {
        const imgData = ctx.getImageData(cx, cy, cw, ch);
        const qr = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
        
        if (qr && qr.data) {
          jsQrFailCount.current = 0;
          handleScanSuccess(qr.data);
        } else {
          jsQrFailCount.current++;
          
          // Only try ZXing (heavier) after 10 consecutive jsQR failures
          // This avoids running the expensive ZXing decode on every frame
          if (jsQrFailCount.current >= 10 && jsQrFailCount.current % 5 === 0) {
            try {
              const reader = getZxingReader();
              // Use the main (visible) canvas for ZXing — it needs a real canvas element
              if (canvas.width !== pw || canvas.height !== ph) {
                canvas.width = pw;
                canvas.height = ph;
              }
              const mainCtx = canvas.getContext('2d');
              if (mainCtx) {
                // Draw a cropped horizontal strip (80% x 40%) for barcode detection
                const stripW = Math.floor(pw * 0.8);
                const stripH = Math.floor(ph * 0.4);
                const stripX = Math.floor((pw - stripW) / 2);
                const stripY = Math.floor((ph - stripH) / 2);
                
                if (barcodeCanvasRef.current) {
                  const bc = barcodeCanvasRef.current;
                  if (bc.width !== stripW || bc.height !== stripH) {
                    bc.width = stripW;
                    bc.height = stripH;
                  }
                  const bCtx = bc.getContext('2d');
                  if (bCtx) {
                    bCtx.drawImage(scanCanvas, stripX, stripY, stripW, stripH, 0, 0, stripW, stripH);
                    const zxingRes = reader.decodeFromCanvas(bc);
                    if (zxingRes && zxingRes.getText()) {
                      jsQrFailCount.current = 0;
                      handleScanSuccess(zxingRes.getText());
                    }
                  }
                }
              }
            } catch(e) {
              // Ignore NotFoundException from ZXing (normal when no barcode in frame)
            }
          }
        }
      } catch (e) {
         // Silently ignore frame processing errors
      }
    }
    
    requestRef.current = requestAnimationFrame(scanLoop);
  }, [isScanning]);

  useEffect(() => {
    if (isScanning) {
      lastScanTime.current = 0;
      jsQrFailCount.current = 0;
      requestRef.current = requestAnimationFrame(scanLoop);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isScanning, scanLoop]);

  const handleScanSuccess = (data: string) => {
    const code = data.trim();
    if (!code) return;
    
    const now = Date.now();
    // Debounce 1.2 seconds for same code (reduced from 2s for faster re-scan)
    if (code === lastScanned.current.code && now - lastScanned.current.time < 1200) {
      return;
    }
    
    lastScanned.current = { code, time: now };
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(100);
    
    // Flash effect
    const flashEl = document.getElementById('scanner-flash');
    if (flashEl) {
      flashEl.style.opacity = '1';
      setTimeout(() => { flashEl.style.opacity = '0'; }, 300);
    }
    
    onScan(code);
  };

  const startScanning = async () => {
    setError(null);
    try {
      // Build constraints — prefer back camera, lower resolution for faster processing
      let constraints: MediaStreamConstraints;
      if (selectedCamera) {
        constraints = {
          video: {
            deviceId: { exact: selectedCamera },
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
      } else {
        // No specific camera selected - use environment (back camera)
        constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
      }
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback: just request any camera
        console.warn('Primary camera constraint failed, trying fallback:', e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      streamRef.current = stream;
      
      // Set scanning state FIRST so video element is rendered in DOM
      setIsScanning(true);
      
      // Wait a tick for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Use onloadedmetadata for reliable playback on mobile
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Video play failed:', err);
          });
        };
      }
      
      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        // @ts-ignore
        setHasTorch(!!capabilities.torch);
      }
      
      // Request Wake Lock
      if ('wakeLock' in navigator) {
        try {
          await navigator.wakeLock.request('screen');
        } catch (err) {}
      }
      
    } catch (err: any) {
      setError('Gagal memulai kamera: ' + err.message);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    setTorchOn(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isActive && !isScanning && !error && selectedCamera) {
      // Auto start if active and not scanning
    }
    if (!isActive && isScanning) {
      stopScanning();
    }
  }, [isActive]);

  const toggleTorch = async () => {
    if (streamRef.current && hasTorch) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }] as any
        });
        setTorchOn(!torchOn);
      } catch (err) {
        console.error('Torch error:', err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 border border-red-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div 
        className={`relative w-full ${compact ? 'min-h-[45vh]' : 'min-h-[50vh]'} md:min-h-0 md:aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center cursor-pointer active:scale-[0.99] transition-transform`}
        onClick={() => isScanning ? stopScanning() : startScanning()}
      >
        {/* Flash Effect */}
        <div 
          id="scanner-flash" 
          className="absolute inset-0 bg-green-500 z-30 pointer-events-none transition-opacity duration-300"
          style={{ opacity: 0 }}
        />

        {!isScanning ? (
          <div className="flex flex-col items-center justify-center text-white/50 p-4 text-center">
            <Camera size={48} className="mb-3 opacity-60" />
            <p className="text-sm font-semibold">Tap untuk aktifkan kamera</p>
            <p className="text-[10px] mt-1 max-w-[200px] opacity-70">Tap lagi untuk mematikan</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Target overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
              <div className="flex-1 bg-black/40" />
              <div className="flex shrink-0">
                <div className="flex-1 bg-black/40" />
                {/* 70% width target box */}
                <div className="relative w-[70%] aspect-square border-2 border-green-500 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  {/* Scan line animation */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-400 shadow-[0_0_8px_rgba(74,222,128,1)] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
                <div className="flex-1 bg-black/40" />
              </div>
              <div className="flex-1 bg-black/40 flex items-end justify-center pb-4">
                <p className="text-white text-xs font-semibold px-3 py-1 bg-black/50 rounded-full backdrop-blur-sm">
                  Arahkan QR/Barcode ke kotak hijau
                </p>
              </div>
            </div>

            {hasTorch && (
              <button 
                onClick={toggleTorch}
                className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  torchOn ? 'bg-yellow-400 text-black' : 'bg-black/50 text-white backdrop-blur-sm'
                }`}
              >
                <Lightbulb size={20} />
              </button>
            )}
          </>
        )}

        {/* Hidden canvases for processing */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={barcodeCanvasRef} className="hidden" />
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 flex items-center gap-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-md px-1.5 py-0.5">
          <Camera size={11} className="text-gray-400 shrink-0" />
          <select 
            value={selectedCamera} 
            onChange={(e) => setSelectedCamera(e.target.value)}
            disabled={isScanning}
            className="flex-1 bg-transparent border-none text-[9px] focus:ring-0 p-0.5 cursor-pointer disabled:opacity-50 text-text-secondary"
          >
            {cameras.length === 0 ? (
              <option value="">Memuat kamera...</option>
            ) : (
              cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Kamera ${i + 1}`}
                </option>
              ))
            )}
          </select>
          <button onClick={getCameras} disabled={isScanning} className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-50">
            <RefreshCw size={11} />
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
