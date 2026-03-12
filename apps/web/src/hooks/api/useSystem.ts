import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
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
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('package', file);
      const { data } = await api.post('/system/upload-update', formData);
      return data;
    },
  });

  return { getStatus, checkUpdates, uploadUpdate };
};
