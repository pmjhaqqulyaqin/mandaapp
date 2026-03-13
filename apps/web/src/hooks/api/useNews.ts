import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsService } from '../../lib/services/news';

export const useNews = () => {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['news'],
    queryFn: newsService.getAll,
  });

  const queryAllAdmin = useQuery({
    queryKey: ['news', 'admin'],
    queryFn: newsService.getAllAdmin,
  });

  const createMutation = useMutation({
    mutationFn: newsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => newsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: newsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const safeData = Array.isArray(queryAll.data) ? queryAll.data : [];
  const safeAdminData = Array.isArray(queryAllAdmin.data) ? queryAllAdmin.data : [];

  return {
    queryAll: { ...queryAll, data: safeData },
    queryAllAdmin: { ...queryAllAdmin, data: safeAdminData },
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
