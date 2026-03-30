import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const useSystem = () => {
  const getStatus = useQuery({
    queryKey: ['system', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/system/status');
      return data;
    },
  });

  const checkUpdates = useQuery({
    queryKey: ['system', 'updates'],
    queryFn: async () => {
      const { data } = await api.get('/system/check-updates');
      return data;
    },
    enabled: !!getStatus.data,
  });

  const uploadUpdate = useMutation({
    mutationFn: async ({ file, onProgress }: { file: File, onProgress?: (pct: number) => void }) => {
      const formData = new FormData();
      formData.append('package', file);
      
      const { data } = await api.post('/system/upload-update', formData, { 
        timeout: 180000, // Increase to 3 mins for slow uploads
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });
      return data;
    },
  });

  const rollbackUpdate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/system/rollback', {}, { timeout: 60000 });
      return data;
    },
  });

  const syncGithub = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/system/sync-github', {}, { timeout: 300000 }); // 5 minutes max
      return data;
    },
  });

  return { getStatus, checkUpdates, uploadUpdate, rollbackUpdate, syncGithub };
};
