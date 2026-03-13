import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { settingsService } from '../../lib/services/settings';

export const useSettings = () => {
  const queryClient = useQueryClient();

  const queryAll = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getAll,
  });

  const updateMutation = useMutation({
    mutationFn: settingsService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    queryAll,
    updateMutation,
  };
};

/** Lightweight read-only hook for public pages (no mutation needed) */
export const useSiteSettings = () => {
  const { queryAll } = useSettings();

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(queryAll.data)) {
      queryAll.data.forEach((s: any) => {
        if (s.value) map[s.key] = s.value;
      });
    }
    return map;
  }, [queryAll.data]);

  const get = (key: string, fallback = '') => settingsMap[key] || fallback;

  const getRelatedWebsites = (): { label: string; url: string }[] => {
    try {
      const raw = settingsMap['related_websites'];
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return { get, getRelatedWebsites, isLoading: queryAll.isLoading };
};
