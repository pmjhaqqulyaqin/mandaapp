import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesService } from '../../lib/services/schedules';

export const useSchedules = () => {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['schedules'],
    queryFn: schedulesService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: schedulesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => schedulesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: schedulesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  return {
    queryAll,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
