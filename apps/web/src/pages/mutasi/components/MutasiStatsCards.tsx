import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, BarChart3 } from 'lucide-react';

interface MutasiStatsCardsProps {
  stats: {
    totalMasuk: number;
    totalKeluar: number;
    totalInternal: number;
    totalBulanIni: number;
  };
  isLoading: boolean;
}

export const MutasiStatsCards: React.FC<MutasiStatsCardsProps> = ({ stats, isLoading }) => {
  const cards = [
    {
      title: 'Mutasi Masuk',
      value: stats.totalMasuk,
      icon: <ArrowDownToLine size={24} className="text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-100 dark:border-emerald-500/20',
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Mutasi Keluar',
      value: stats.totalKeluar,
      icon: <ArrowUpFromLine size={24} className="text-rose-500" />,
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      border: 'border-rose-100 dark:border-rose-500/20',
      color: 'text-rose-600 dark:text-rose-400'
    },
    {
      title: 'Mutasi Internal',
      value: stats.totalInternal,
      icon: <RefreshCw size={24} className="text-blue-500" />,
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-100 dark:border-blue-500/20',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Mutasi Bulan Ini',
      value: stats.totalBulanIni,
      icon: <BarChart3 size={24} className="text-purple-500" />,
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      border: 'border-purple-100 dark:border-purple-500/20',
      color: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {cards.map((card, i) => (
        <div 
          key={i} 
          className="bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow"
        >
          {/* Glassmorphism subtle background blob */}
          <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bg} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
          
          <div className="flex items-center justify-between z-10">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.border} border`}>
              {card.icon}
            </div>
          </div>
          
          <div className="z-10 mt-1">
            <h3 className="text-sm font-semibold text-text-secondary">{card.title}</h3>
            <div className="flex items-baseline gap-2 mt-1">
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-[#222] animate-pulse rounded-lg" />
              ) : (
                <span className={`text-2xl md:text-3xl font-bold ${card.color}`}>
                  {card.value}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
