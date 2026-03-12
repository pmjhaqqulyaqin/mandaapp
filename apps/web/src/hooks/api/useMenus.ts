import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

const API_MENUS_URL = '/menus'; // apiClient appends /api

export function useMenus() {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const data = await apiClient<any[]>(API_MENUS_URL);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newMenu: any) => {
      const data = await apiClient<any>(API_MENUS_URL, {
        method: 'POST',
        data: newMenu,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const resData = await apiClient<any>(`${API_MENUS_URL}/${id}`, {
        method: 'PATCH',
        data: data,
      });
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const data = await apiClient<any>(`${API_MENUS_URL}/${id}`, {
        method: 'DELETE',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });

  return {
    queryAll,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
