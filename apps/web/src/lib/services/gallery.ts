import { apiClient, API_BASE_URL } from '../api';

export const galleryService = {
  getAll: () => apiClient<any[]>('/gallery'),
  create: (data: any) => apiClient<any>('/gallery', { data }),
  update: ({ id, ...data }: any) => apiClient<any>(`/gallery/${id}`, { method: 'PUT', data }),
  delete: (id: string | number) => apiClient<any>(`/gallery/${id}`, { method: 'DELETE' }),
  upload: async (file: File | Blob): Promise<{ url: string }> => {
    const formData = new FormData();
    // Use 'image' as matching the backend upload.single("image")
    formData.append('image', file, file instanceof File ? file.name : `camera_${Date.now()}.jpg`);
    // Route uploads to local cPanel PHP script across the domain,
    // thereby persisting files independently of ephemeral Railway servers.
    const uploadTarget = window.location.hostname === 'localhost' 
      ? `${API_BASE_URL}/gallery/upload` 
      : `${window.location.origin}/image-uploader.php`;

    const response = await fetch(uploadTarget, {
      method: 'POST',
      body: formData,
      credentials: 'omit', // No auth needed for public profile photo uploads in this mode
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }
    
    return response.json();
  },
};
