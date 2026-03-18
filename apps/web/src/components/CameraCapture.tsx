import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@mandaapp/ui';
import { RefreshCw, Crop as CropIcon, X } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css'; // Don't forget the CSS for the cropper

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

// Helper to draw off-screen canvas and extract cropped image
const getCroppedImg = (image: HTMLImageElement, pixelCrop: PixelCrop): string => {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // Set actual size in memory (scaled to original resolution)
  canvas.width = Math.floor(pixelCrop.width * scaleX);
  canvas.height = Math.floor(pixelCrop.height * scaleY);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // react-image-crop State
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraReady(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Gagal mengakses kamera. Pastikan memberikan izin akses.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // High quality capture from video feed
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to dataUrl and switch to crop mode
        const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
        setCapturedImage(dataUrl);
        stopCamera();
        
        // Reset crop for new image
        setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
        setCompletedCrop(null);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage && imgRef.current && completedCrop?.width && completedCrop?.height) {
      try {
        const finalImage = getCroppedImg(imgRef.current, completedCrop);
        if (finalImage) {
          onCapture(finalImage);
        }
      } catch (e) {
        console.error("Failed to crop image", e);
      }
    } else if (capturedImage) {
      // Fallback if no crop was made, just return original
      onCapture(capturedImage);
    }
  };

  // If we have an image, show the Cropper, otherwise show Camera preview
  return (
    <div className="flex flex-col h-full w-full">
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-border-light dark:border-[#222]">
        
        {/* State 1: LIVE CAMERA VIEW */}
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
            />
            
            {/* Camera Overlay Elements */}
            {!error && isCameraReady && (
              <>
                {/* Close Button */}
                <button 
                  onClick={onClose}
                  className="absolute top-4 left-4 sm:top-6 sm:left-6 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-50"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center">
                   {/* Large Shutter Button */}
                   <button 
                    onClick={capturePhoto} 
                    className="w-20 h-20 rounded-full border-4 border-white/80 flex items-center justify-center p-1 cursor-pointer hover:border-white transition-all active:scale-95"
                   >
                     <div className="w-full h-full bg-white rounded-full"></div>
                   </button>
                </div>
              </>
            )}

            {!isCameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black">
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">Batal</Button>
                  <Button onClick={startCamera} variant="outline" className="text-white border-white hover:bg-white/10">
                    Coba Lagi
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* State 2: RESIZING CROPPER WIDGET */
          <div className="w-full h-full flex flex-col pt-12 items-center justify-center bg-black p-4 relative">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 z-10">
              <span className="text-white text-xs font-medium">Tarik sudut kotak untuk memotong</span>
            </div>
            
            <div className="max-h-full max-w-full overflow-hidden flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                className="max-h-full max-w-full"
              >
                <img 
                  ref={imgRef}
                  src={capturedImage} 
                  alt="Captured" 
                  className="max-h-[70vh] w-auto object-contain"
                />
              </ReactCrop>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Action Buttons */}
      {capturedImage && (
        <div className="flex gap-3 mt-4 px-4 sm:px-0 pb-4 sm:pb-0">
          <Button onClick={retakePhoto} variant="outline" className="flex-1 border-border-light dark:border-[#333] text-gray-300 py-6 sm:py-2 hover:bg-white/10">
            <RefreshCw className="w-5 h-5 mr-2" />
            Ulangi
          </Button>
          <Button onClick={confirmPhoto} className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-lg py-6 sm:py-2">
            <CropIcon className="w-5 h-5 mr-2" />
            Selesai Edit
          </Button>
        </div>
      )}
    </div>
  );
};
