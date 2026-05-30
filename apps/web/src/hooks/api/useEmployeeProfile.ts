import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiClient, API_BASE_URL } from '../../lib/api';

// ── Types ──
export interface EmployeeProfile {
  id: string;
  userId: string | null;
  type: string;
  name: string;
  nip: string;
  rank: string | null;
  grade: string | null;
  position: string | null;
  gender: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  task: string | null;
  kodeGuru: string | null;
  status: string | null;
}

export interface NipLookupResult {
  id: string;
  name: string;
  nip: string;
  type: string;
  rank: string | null;
  grade: string | null;
  position: string | null;
  gender: string | null;
  photoUrl: string | null;
  isLinked: boolean;
  isLinkedToCurrentUser: boolean;
}

// ── Hooks ──

/** Get all employees */
export function useEmployees() {
  return useQuery<EmployeeProfile[]>({
    queryKey: ['employees'],
    queryFn: () => apiClient<EmployeeProfile[]>('/employees'),
    staleTime: 5 * 60 * 1000,
  });
}

/** Get the current user's linked employee record */
export function useMyEmployee() {
  return useQuery<EmployeeProfile | null>({
    queryKey: ['employee', 'me'],
    queryFn: () => apiClient<EmployeeProfile | null>('/employees/me'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Debounce hook */
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Lookup employee by NIP (preview before linking) */
export function useLookupNip(nip: string) {
  const debouncedNip = useDebounce(nip.trim(), 500);
  const query = useQuery<NipLookupResult | null>({
    queryKey: ['employee', 'lookup', debouncedNip],
    queryFn: () => apiClient<NipLookupResult | null>(`/employees/lookup/${encodeURIComponent(debouncedNip)}`),
    enabled: debouncedNip.length >= 5, // Only search when NIP has at least 5 chars
    staleTime: 30 * 1000,
    retry: 1,
  });
  // isTyping: user is still typing (debounce not settled yet)
  const isTyping = nip.trim() !== debouncedNip;
  return { ...query, isTyping };
}

/** Link current user to employee by NIP */
export function useLinkNip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nip: string) => apiClient<EmployeeProfile>('/employees/link-by-nip', {
      method: 'POST',
      data: { nip },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'me'] });
    },
  });
}

/** Upload profile photo */
export function useUploadProfilePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      return apiClient<{ photoUrl: string; employeeLinked: boolean }>('/employees/me/photo', {
        method: 'POST',
        data: formData,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'me'] });
    },
  });
}
