import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { galleryService } from '../../lib/services/gallery';

export const useGallery = () => {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['gallery'],
    queryFn: galleryService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: galleryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: galleryService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: galleryService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });

  return {
    queryAll,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
