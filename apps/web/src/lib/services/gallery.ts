import { apiClient, API_BASE_URL } from '../api';
import { compressImage } from '../imageCompressor';

export const galleryService = {
  getAll: () => apiClient<any[]>('/gallery'),
  create: (data: any) => apiClient<any>('/gallery', { data }),
  update: ({ id, ...data }: any) => apiClient<any>(`/gallery/${id}`, { method: 'PUT', data }),
  delete: (id: string | number) => apiClient<any>(`/gallery/${id}`, { method: 'DELETE' }),
  upload: async (file: File | Blob): Promise<{ url: string }> => {
    // Compress image if it's a File (Blobs from CameraCapture are already handled or can be adapted)
    const processedFile = file instanceof File ? await compressImage(file) : file;

    const formData = new FormData();
    // Use 'image' as matching the backend upload.single("image")
    formData.append('image', processedFile, processedFile instanceof File ? processedFile.name : `camera_${Date.now()}.jpg`);
    const uploadTarget = `${API_BASE_URL}/gallery/upload`;

    const response = await fetch(uploadTarget, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }
    
    return response.json();
  },
};
