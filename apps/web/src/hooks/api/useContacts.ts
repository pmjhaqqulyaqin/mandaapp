import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsService } from '../../lib/services/contacts';

export const useContacts = () => {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['contacts'],
    queryFn: contactsService.getAll,
  });

  const submitMutation = useMutation({
    mutationFn: contactsService.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    queryAll,
    submitMutation,
  };
};
