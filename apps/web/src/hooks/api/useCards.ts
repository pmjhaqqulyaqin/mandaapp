import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsService } from '../../lib/services/cards';

export const useCards = () => {
  const queryClient = useQueryClient();

  const querySettings = useQuery({
    queryKey: ['cards', 'settings'],
    queryFn: cardsService.getSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: cardsService.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', 'settings'] });
    },
  });

  return {
    querySettings,
    updateSettingsMutation,
  };
};
