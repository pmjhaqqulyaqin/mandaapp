import { apiClient } from '../api';

export const cardsService = {
  getSettings: () => apiClient<any>('/cards/settings'),
  updateSettings: (data: any) => apiClient<any>('/cards/settings', { method: 'PUT', data }),
};
