import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_BASE_URL } from '../../lib/api';
import axios from 'axios';

export interface DownloadItem {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  category: string;
  downloadCount: number;
  isPublished: boolean;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminDownloadsResponse {
  items: DownloadItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DownloadStats {
  totalFiles: number;
  totalDownloads: number;
  totalSize: number;
  publicFiles: number;
  privateFiles: number;
}

export function useDownloads() {
  const queryClient = useQueryClient();

  const queryPublic = useQuery<DownloadItem[]>({
    queryKey: ['downloads', 'public'],
    queryFn: () => apiClient('/downloads'),
  });

  const queryAdmin = (opts: { search?: string; fileType?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.search) params.set('search', opts.search);
    if (opts.fileType && opts.fileType !== 'all') params.set('fileType', opts.fileType);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    
    return useQuery<AdminDownloadsResponse>({
      queryKey: ['downloads', 'admin', opts],
      queryFn: () => apiClient(`/downloads/admin${qs ? `?${qs}` : ''}`),
    });
  };

  const queryStats = useQuery<DownloadStats>({
    queryKey: ['downloads', 'stats'],
    queryFn: () => apiClient('/downloads/stats'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (args: { file: File; title: string; description?: string; category?: string; isPublished?: boolean; onProgress?: (pct: number) => void }) => {
      const formData = new FormData();
      formData.append('file', args.file);
      formData.append('title', args.title);
      if (args.description) formData.append('description', args.description);
      if (args.category) formData.append('category', args.category);
      if (args.isPublished !== undefined) formData.append('isPublished', String(args.isPublished));

      const response = await axios.post(`${API_BASE_URL}/downloads/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
        onUploadProgress: (ev) => {
          if (args.onProgress && ev.total) {
            args.onProgress(Math.round((ev.loaded * 100) / ev.total));
          }
        },
      });
      return response.data as DownloadItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; data: Partial<Pick<DownloadItem, 'title' | 'description' | 'category' | 'isPublished'>> }) =>
      apiClient<DownloadItem>(`/downloads/${args.id}`, { method: 'PATCH', data: args.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/downloads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
    },
  });

  const hitDownload = async (id: string) => {
    return apiClient<{ downloadCount: number; filePath: string }>(`/downloads/${id}/hit`, { method: 'POST' });
  };

  return {
    queryPublic,
    queryAdmin,
    queryStats,
    uploadMutation,
    updateMutation,
    deleteMutation,
    hitDownload,
  };
}
