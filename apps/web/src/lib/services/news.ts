import { apiClient } from '../api';

// TODO: Replace any with proper types when necessary
export const newsService = {
  getAll: () => apiClient<any[]>('/news'),
  getAllAdmin: () => apiClient<any[]>('/news/all'),
  create: (data: any) => apiClient<any>('/news', { data }),
  update: (id: string | number, data: any) => apiClient<any>(`/news/${id}`, { method: 'PUT', data }),
  delete: (id: string | number) => apiClient<any>(`/news/${id}`, { method: 'DELETE' }),
};
