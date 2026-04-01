import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

const API_PTSP_URL = '/ptsp';

export function usePTSP() {
  const queryClient = useQueryClient();

  const queryAll = (type?: string, status?: string) => useQuery({
    queryKey: ['ptsp', type, status],
    queryFn: async () => {
      let queryStr = '';
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (status) params.append('status', status);
      
      const pStr = params.toString();
      if (pStr) queryStr = `?${pStr}`;

      const res = await apiClient<any>(`${API_PTSP_URL}${queryStr}`);
      return res?.data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminReply }: { id: string; status: string; adminReply?: string }) => {
      const resData = await apiClient<any>(`${API_PTSP_URL}/${id}/status`, {
        method: 'PATCH',
        data: { status, adminReply },
      });
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptsp'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const data = await apiClient<any>(`${API_PTSP_URL}/${id}`, {
        method: 'DELETE',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptsp'] });
    },
  });

  return {
    queryAll,
    updateStatusMutation,
    deleteMutation,
  };
}
