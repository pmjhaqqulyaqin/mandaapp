import { apiClient } from '../api';

export interface SchoolEvent {
  id: string;
  title: string;
  description?: string;
  eventDate: string; // YYYY-MM-DD
  endDate?: string;
  category: string;
  color?: string;
  academicYear: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const eventsService = {
  getAll: (academicYear?: string) =>
    apiClient<SchoolEvent[]>(
      academicYear ? `/events?academicYear=${encodeURIComponent(academicYear)}` : '/events'
    ),
  getByRange: (start: string, end: string) =>
    apiClient<SchoolEvent[]>(`/events/range?start=${start}&end=${end}`),
  getYears: () => apiClient<string[]>('/events/years'),
  create: (data: Partial<SchoolEvent>) =>
    apiClient<SchoolEvent>('/events', { data }),
  update: (id: string, data: Partial<SchoolEvent>) =>
    apiClient<SchoolEvent>(`/events/${id}`, { method: 'PUT', data }),
  delete: (id: string) =>
    apiClient<void>(`/events/${id}`, { method: 'DELETE' }),
};
