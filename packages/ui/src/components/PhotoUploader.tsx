import React, { useRef, useState, useCallback } from 'react';

export interface PhotoUploaderProps {
  currentPhotoUrl?: string;
  onPhotoChange: (photoDataUrl: string) => void;
  disabled?: boolean;
}

export const PhotoUploader = ({ currentPhotoUrl, onPhotoChange, disabled }: PhotoUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        onPhotoChange(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [onPhotoChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Drop Zone / Preview */}
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={!disabled ? handleDrop : undefined}
        onDragOver={!disabled ? handleDragOver : undefined}
        onDragLeave={handleDragLeave}
        className={`relative w-36 h-48 rounded-xl overflow-hidden border-2 border-dashed 
          transition-all duration-200 cursor-pointer group
          ${isDragOver
            ? 'border-primary bg-primary/5 scale-105'
            : 'border-border-light dark:border-border-dark hover:border-primary/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-xs font-medium flex flex-col items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  Ganti Foto
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary gap-2 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span className="text-xs text-center leading-tight">
              {isDragOver ? 'Lepas di sini' : 'Klik atau drag foto ke sini'}
            </span>
            <span className="text-[10px] text-gray-400">Rasio 3:4, maks 2MB</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {preview && !disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreview(null);
            onPhotoChange('');
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="text-xs text-error hover:underline"
        >
          Hapus Foto
        </button>
      )}
    </div>
  );
};
