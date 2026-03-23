import { apiClient, API_BASE_URL } from '../api';

export interface SettingItem {
  id?: string;
  key: string;
  value: string | null;
  group: string;
  updatedAt?: string;
}

export const settingsService = {
  getAll: () => apiClient<SettingItem[]>('/settings'),
  getByGroup: (group: string) => apiClient<SettingItem[]>(`/settings/${group}`),
  update: (settings: { key: string; value: string | null; group: string }[]) =>
    apiClient<SettingItem[]>('/settings', { method: 'PUT', data: { settings } }),
  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    
    const uploadTarget = window.location.hostname === 'localhost' 
      ? `${API_BASE_URL}/settings/upload-logo` 
      : `${window.location.origin}/image-uploader.php`;

    const response = await fetch(uploadTarget, {
      method: 'POST',
      body: formData,
      credentials: 'omit',
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
  uploadFavicon: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('favicon', file);

    const uploadTarget = window.location.hostname === 'localhost' 
      ? `${API_BASE_URL}/settings/upload-favicon` 
      : `${window.location.origin}/image-uploader.php`;

    const response = await fetch(uploadTarget, {
      method: 'POST',
      body: formData,
      credentials: 'omit',
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
};
