import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@mandaapp/ui';
import { RefreshCw, Crop, X } from 'lucide-react';
import Cropper from 'react-easy-crop';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

// Helper to draw off-screen canvas and extract cropped image
const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cropper State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const confirmPhoto = async () => {
    if (capturedImage && croppedAreaPixels) {
      try {
        const finalImage = await getCroppedImg(capturedImage, croppedAreaPixels);
        if (finalImage) {
          onCapture(finalImage);
        }
      } catch (e) {
        console.error("Failed to crop image", e);
      }
    }
  };

  // If we have an image, show the Cropper, otherwise show Camera preview
  return (
    <div className="flex flex-col h-full w-full">
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden border border-border-light dark:border-[#222]">
        
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
          /* State 2: CROPPER WIDGET */
          <div className="absolute inset-0 bg-black">
            <Cropper
              image={capturedImage}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3} // Common photo aspect ratio, adjust if needed
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              classes={{
                containerClassName: 'h-full w-full',
              }}
            />
            {/* Zoom Control Overlay Overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-white text-xs font-medium">Geser untuk memotong, cubit untuk perbesar</span>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Action Buttons */}
      {capturedImage && (
        <div className="flex gap-3 mt-4">
          <Button onClick={retakePhoto} variant="outline" className="flex-1 border-border-light dark:border-border-dark py-6 sm:py-2">
            <RefreshCw className="w-5 h-5 mr-2" />
            Ulangi
          </Button>
          <Button onClick={confirmPhoto} className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-lg py-6 sm:py-2">
            <Crop className="w-5 h-5 mr-2" />
            Selesai Edit
          </Button>
        </div>
      )}
    </div>
  );
};
