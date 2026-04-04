import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService, SchoolEvent } from '../../lib/services/events';

export const useEvents = (academicYear?: string) => {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['events', academicYear],
    queryFn: () => eventsService.getAll(academicYear),
    enabled: !!academicYear,
  });

  const queryYears = useQuery({
    queryKey: ['event-years'],
    queryFn: eventsService.getYears,
  });

  const createMutation = useMutation({
    mutationFn: eventsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-years'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SchoolEvent> }) =>
      eventsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: eventsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-years'] });
    },
  });

  return {
    queryAll,
    queryYears,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
