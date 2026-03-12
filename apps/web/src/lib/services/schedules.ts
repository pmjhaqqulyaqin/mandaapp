import { apiClient } from '../api';

export const schedulesService = {
  getAll: () => apiClient<any[]>('/schedules'),
  create: (data: any) => apiClient<any>('/schedules', { data }),
  update: (id: string | number, data: any) => apiClient<any>(`/schedules/${id}`, { method: 'PUT', data }),
  delete: (id: string | number) => apiClient<any>(`/schedules/${id}`, { method: 'DELETE' }),
};
