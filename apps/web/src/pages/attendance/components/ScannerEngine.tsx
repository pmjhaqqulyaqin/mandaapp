import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Camera, Play, Square, Lightbulb, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ScannerEngineProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export const ScannerEngine: React.FC<ScannerEngineProps> = ({ onScan, isActive }) => {
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

  // Initialize ZXing
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    zxingReader.current = new BrowserMultiFormatReader(hints);
    return () => {
      stopScanning();
    };
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

  // Scan Loop
  const scanLoop = useCallback(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState >= 2 && video.videoWidth > 0) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 1. Try jsQR (Fastest for QR)
        // Crop center 70% for jsQR focus
        const cw = Math.floor(canvas.width * 0.7);
        const ch = Math.floor(canvas.height * 0.7);
        const cx = Math.floor((canvas.width - cw) / 2);
        const cy = Math.floor((canvas.height - ch) / 2);
        
        try {
          const imgData = ctx.getImageData(cx, cy, cw, ch);
          const qr = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
          
          if (qr && qr.data) {
            handleScanSuccess(qr.data);
          } else {
            // Try ZXing for Barcodes occasionally (slower)
            if (Math.random() > 0.7 && zxingReader.current) {
               try {
                  const zxingRes = zxingReader.current.decodeFromCanvas(canvas);
                  if (zxingRes && zxingRes.getText()) {
                     handleScanSuccess(zxingRes.getText());
                  }
               } catch(e) {
                 // Ignore NotFoundException from ZXing
               }
            }
          }
        } catch (e) {
           console.error(e);
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(scanLoop);
  }, [isScanning]);

  useEffect(() => {
    if (isScanning) {
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
    // Debounce 2 seconds for same code
    if (code === lastScanned.current.code && now - lastScanned.current.time < 2000) {
      return;
    }
    
    lastScanned.current = { code, time: now };
    
    // Flash effect
    const flashEl = document.getElementById('scanner-flash');
    if (flashEl) {
      flashEl.style.opacity = '1';
      setTimeout(() => { flashEl.style.opacity = '0'; }, 300);
    }
    
    onScan(code);
  };

  const startScanning = async () => {
    if (!selectedCamera) {
      toast.error('Pilih kamera terlebih dahulu');
      return;
    }
    
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 960 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        // @ts-ignore
        setHasTorch(!!capabilities.torch);
      }
      
      setIsScanning(true);
      
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
      // We don't auto start immediately to prevent annoying camera prompts on first load sometimes,
      // but if the component is mounted to be active, we can.
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
    <div className="flex flex-col gap-3">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 border border-red-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative w-full min-h-[50vh] md:min-h-0 md:aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
        {/* Flash Effect */}
        <div 
          id="scanner-flash" 
          className="absolute inset-0 bg-green-500 z-30 pointer-events-none transition-opacity duration-300"
          style={{ opacity: 0 }}
        />

        {!isScanning ? (
          <div className="flex flex-col items-center justify-center text-white/50 p-4 text-center">
            <Camera size={40} className="mb-3 opacity-50" />
            <p className="text-xs font-medium">Kamera tidak aktif</p>
            <p className="text-[10px] mt-1 max-w-[200px]">Klik tombol "Mulai Kamera" di bawah untuk mengaktifkan pemindai</p>
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

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {!isScanning ? (
          <button 
            onClick={startScanning}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 text-xs rounded-lg font-medium transition-colors"
          >
            <Play size={14} />
            <span>Mulai Kamera</span>
          </button>
        ) : (
          <button 
            onClick={stopScanning}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white py-2 px-3 text-xs rounded-lg font-medium transition-colors"
          >
            <Square size={14} />
            <span>Hentikan Kamera</span>
          </button>
        )}

        <div className="flex-1 flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
          <Camera size={14} className="text-gray-400" />
          <select 
            value={selectedCamera} 
            onChange={(e) => setSelectedCamera(e.target.value)}
            disabled={isScanning}
            className="flex-1 bg-transparent border-none text-[10px] focus:ring-0 p-1 cursor-pointer disabled:opacity-50"
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
          <button onClick={getCameras} disabled={isScanning} className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-50">
            <RefreshCw size={14} />
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
