import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { 
  Users, GraduationCap, Briefcase, BookOpen, 
  TrendingUp, ArrowUpRight, BarChart3, PieChart
} from 'lucide-react';

export const AlumniOverview = () => {
  // Fetch alumni data
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['alumni-overview'],
    queryFn: () => apiClient<any[]>('/students').then(res => res.filter(s => s.status === 'Lulus' || s.status === 'lulus'))
  });

  const stats = useMemo(() => {
    return {
      total: students.length,
      working: Math.floor(students.length * 0.45), // Mock data
      studying: Math.floor(students.length * 0.35), // Mock data
      entrepreneur: Math.floor(students.length * 0.10), // Mock data
      seeking: Math.floor(students.length * 0.10) // Mock data
    };
  }, [students]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <GraduationCap className="text-blue-500" size={20} />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp size={12} /> +12%
            </span>
          </div>
          <h3 className="text-3xl font-black text-text-primary dark:text-text-darkPrimary mb-1">{stats.total}</h3>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Alumni</p>
        </div>

        <div className="bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Briefcase className="text-emerald-500" size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-text-primary dark:text-text-darkPrimary mb-1">{stats.working}</h3>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Bekerja</p>
        </div>

        <div className="bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <BookOpen className="text-amber-500" size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-text-primary dark:text-text-darkPrimary mb-1">{stats.studying}</h3>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Melanjutkan Studi</p>
        </div>

        <div className="bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <Users className="text-purple-500" size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-text-primary dark:text-text-darkPrimary mb-1">{stats.entrepreneur}</h3>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Wirausaha</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Chart Area 1 - Distribusi Keterserapan */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="text-primary" size={18} />
                Tren Keterserapan Alumni
              </h2>
              <p className="text-xs text-text-secondary mt-1">Data 5 tahun terakhir berdasarkan hasil Tracer Study.</p>
            </div>
          </div>
          
          {/* MOCK CHART UI (CSS Based) */}
          <div className="h-64 flex items-end gap-2 sm:gap-4 mt-8 px-2">
            {[2020, 2021, 2022, 2023, 2024].map((year, i) => {
              const h1 = 30 + Math.random() * 40; // working
              const h2 = 20 + Math.random() * 30; // studying
              return (
                <div key={year} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                  <div className="w-full max-w-[40px] flex flex-col justify-end gap-1 h-full">
                    <div 
                      className="w-full bg-blue-500 rounded-t-sm rounded-b-sm transition-all duration-500 group-hover:opacity-80"
                      style={{ height: `${h2}%` }}
                      title={`Studi: ${Math.floor(h2)}%`}
                    />
                    <div 
                      className="w-full bg-emerald-500 rounded-t-sm rounded-b-sm transition-all duration-500 group-hover:opacity-80"
                      style={{ height: `${h1}%` }}
                      title={`Bekerja: ${Math.floor(h1)}%`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-text-secondary">{year}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-text-secondary">Bekerja</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-text-secondary">Melanjutkan Studi</span>
            </div>
          </div>
        </div>

        {/* Info Area 2 - Quick Actions & Recent */}
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <PieChart size={120} />
            </div>
            <h3 className="font-bold text-lg mb-2 relative z-10">Tracer Study 2025</h3>
            <p className="text-xs text-white/80 mb-5 relative z-10 leading-relaxed">
              Kuesioner pelacakan lulusan tahun ini sedang berjalan. 120 alumni belum merespon.
            </p>
            <button className="relative z-10 bg-white text-primary text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:scale-105 transition-transform flex items-center gap-2">
              Kelola Kuesioner <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-5 shadow-sm flex-1">
            <h3 className="font-bold text-sm mb-4">Aktivitas Terbaru</h3>
            <div className="space-y-4">
              {[
                { name: 'Ahmad Fauzi', action: 'Mengisi tracer study', time: '10 menit lalu', color: 'bg-emerald-500' },
                { name: 'Siti Aminah', action: 'Memperbarui profil pekerjaan', time: '1 jam lalu', color: 'bg-blue-500' },
                { name: 'Budi Santoso', action: 'Mendaftar di direktori publik', time: '3 jam lalu', color: 'bg-purple-500' },
              ].map((act, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${act.color} mt-1.5`} />
                    {i !== 2 && <div className="w-px h-full bg-gray-100 dark:bg-[#333] mt-1" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-[13px] font-semibold text-text-primary dark:text-text-darkPrimary">{act.name}</p>
                    <p className="text-xs text-text-secondary">{act.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
