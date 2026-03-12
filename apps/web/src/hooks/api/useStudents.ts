import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '../../lib/services/students';

export const useStudents = () => {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['students'],
    queryFn: studentsService.getAll,
  });

  const queryRevisions = useQuery({
    queryKey: ['students', 'revisions'],
    queryFn: studentsService.getRevisions,
  });

  const useGetById = (id: string | number) => useQuery({
    queryKey: ['students', id],
    queryFn: () => studentsService.getById(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => studentsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', variables.id] });
    },
  });

  const createRevisionMutation = useMutation({
    mutationFn: studentsService.createRevision,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'revisions'] });
    },
  });

  const updateRevisionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => studentsService.updateRevision(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'revisions'] });
    },
  });

  return {
    queryAll,
    queryRevisions,
    useGetById,
    updateMutation,
    createRevisionMutation,
    updateRevisionMutation,
  };
};
