import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@mandaapp/ui';
import { Camera, RefreshCw, X, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError('Gagal mengakses kamera. Pastikan Anda memberikan izin akses kamera.');
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
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border-light dark:border-border-dark shadow-inner">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
            />
            {!isCameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <Button onClick={startCamera} size="sm" variant="outline" className="text-white border-white hover:bg-white/10">
                  Coba Lagi
                </Button>
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3">
        {!capturedImage ? (
          <>
            <Button onClick={onClose} variant="ghost" className="text-text-secondary">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={capturePhoto} disabled={!isCameraReady} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              <Camera className="w-4 h-4 mr-2" />
              Ambil Gambar
            </Button>
          </>
        ) : (
          <>
            <Button onClick={retakePhoto} variant="outline" className="border-border-light dark:border-border-dark">
              <RefreshCw className="w-4 h-4 mr-2" />
              Ulangi
            </Button>
            <Button onClick={confirmPhoto} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              <Check className="w-4 h-4 mr-2" />
              Gunakan Gambar
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
