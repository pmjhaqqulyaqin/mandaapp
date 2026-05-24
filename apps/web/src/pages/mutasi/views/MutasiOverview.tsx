import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { MutasiStatsCards } from '../components/MutasiStatsCards';
import { MutasiChart } from '../components/MutasiChart';
import { RecentActivityTable } from '../components/RecentActivityTable';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MutasiOverview = () => {
  const navigate = useNavigate();

  // Fetch Stats
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['mutations-stats'],
    queryFn: () => apiClient<any>('/mutations/stats').then(res => res),
  });

  // Fetch Recent Activities
  const { data: recentData, isLoading: isRecentLoading } = useQuery({
    queryKey: ['mutations-recent'],
    queryFn: () => apiClient<any[]>('/mutations/recent').then(res => res),
  });

  // Fetch all mutations for chart
  const { data: allMutationsData, isLoading: isMutationsLoading } = useQuery({
    queryKey: ['mutations-all'],
    queryFn: () => apiClient<any[]>('/mutations').then(res => res),
  });

  const defaultStats = { totalMasuk: 0, totalKeluar: 0, totalInternal: 0, totalBulanIni: 0 };

  return (
    <div className="flex flex-col gap-4 md:gap-5 animate-in fade-in duration-500 pb-10">
      <MutasiStatsCards stats={statsData || defaultStats} isLoading={isStatsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2">
          <MutasiChart data={allMutationsData || []} isLoading={isMutationsLoading} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityTable data={recentData || []} isLoading={isRecentLoading} />
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mt-2">
        <button 
          onClick={() => navigate('/dashboard/mutasi/masuk')}
          className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl flex items-center justify-between transition-colors group border border-emerald-100 dark:border-emerald-500/20"
        >
          <span className="font-bold text-sm">Kelola Mutasi Masuk</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button 
          onClick={() => navigate('/dashboard/mutasi/keluar')}
          className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 p-4 rounded-2xl flex items-center justify-between transition-colors group border border-rose-100 dark:border-rose-500/20"
        >
          <span className="font-bold text-sm">Kelola Mutasi Keluar</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button 
          onClick={() => navigate('/dashboard/mutasi/directory')}
          className="bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 text-primary p-4 rounded-2xl flex items-center justify-between transition-colors group border border-primary/20"
        >
          <span className="font-bold text-sm">Lihat Daftar Siswa</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
