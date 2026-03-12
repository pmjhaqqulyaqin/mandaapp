import { apiClient } from '../api';

export const studentsService = {
  getAll: () => apiClient<any[]>('/students'),
  getRevisions: () => apiClient<any[]>('/students/revisions'),
  getById: (id: string | number) => apiClient<any>(`/students/${id}`),
  update: (id: string | number, data: any) => apiClient<any>(`/students/${id}`, { method: 'PUT', data }),
  createRevision: (data: any) => apiClient<any>('/students/revisions', { data }),
  updateRevision: (id: string | number, data: any) => apiClient<any>(`/students/revisions/${id}`, { method: 'PUT', data }),
};
