import { apiClient } from '../api';

export const contactsService = {
  getAll: () => apiClient<any[]>('/contacts'),
  submit: (data: any) => apiClient<any>('/contacts', { data }),
};
