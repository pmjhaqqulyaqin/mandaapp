import { apiClient } from '../api';

export const galleryService = {
  getAll: () => apiClient<any[]>('/gallery'),
  create: (data: any) => apiClient<any>('/gallery', { data }),
  update: ({ id, ...data }: any) => apiClient<any>(`/gallery/${id}`, { method: 'PUT', data }),
  delete: (id: string | number) => apiClient<any>(`/gallery/${id}`, { method: 'DELETE' }),
};
