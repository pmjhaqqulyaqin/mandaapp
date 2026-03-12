import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

const API_PAGES_URL = '/pages'; // apiClient already appends /api automatically

export function usePages() {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const data = await apiClient<any[]>(API_PAGES_URL);
      return data || [];
    },
  });

  const queryBySlug = (slug: string) => useQuery({
    queryKey: ['pages', slug],
    queryFn: async () => {
      const data = await apiClient<any>(`${API_PAGES_URL}/slug/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  const createMutation = useMutation({
    mutationFn: async (newPage: any) => {
      const data = await apiClient<any>(API_PAGES_URL, {
        method: 'POST',
        data: newPage,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const resData = await apiClient<any>(`${API_PAGES_URL}/${id}`, {
        method: 'PATCH',
        data: data,
      });
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const data = await apiClient<any>(`${API_PAGES_URL}/${id}`, {
        method: 'DELETE',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  return {
    queryAll,
    queryBySlug,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
