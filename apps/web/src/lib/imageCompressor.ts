// src/lib/imageCompressor.ts

/**
 * Compresses an image file in the browser before uploading.
 * @param file The original image file
 * @param options Compression options (maxWidth, maxHeight, quality)
 * @returns A compressed File object
 */
export const compressImage = async (
  file: File,
  {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
  }: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> => {
  // If it's not an image (e.g. SVG) or it's a very small GIF, don't compress
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original if canvas fails
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to Blob (always use JPEG for highest compression if original is not PNG that needs transparency)
        // Here we default to webp for better compression, fallback to jpeg if unsupported
        const mimeType = 'image/webp'; // Modern compression
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // Fallback to original
              return;
            }
            
            // Create a new File object
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: mimeType,
              lastModified: Date.now(),
            });
            
            // Log for debugging
            console.log(`[Compression] Original: ${Math.round(file.size / 1024)}KB -> Compressed: ${Math.round(compressedFile.size / 1024)}KB (-${Math.round((1 - compressedFile.size / file.size) * 100)}%)`);
            
            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
