import { apiClient } from '../api';

export const cardPrintService = {
  getHistory: (limit = 50) => apiClient<any[]>(`/cards/print-history?limit=${limit}`),
  getStats: () => apiClient<{ totalPrints: number; totalCards: number; todayPrints: number; todayCards: number }>('/cards/print-history/stats'),
  logPrint: (data: {
    printType: string;
    studentCount: number;
    classFilter?: string;
    orientation?: string;
    templateUsed?: string;
    studentNames?: string;
  }) => apiClient<any>('/cards/print-history', { data }),
};
