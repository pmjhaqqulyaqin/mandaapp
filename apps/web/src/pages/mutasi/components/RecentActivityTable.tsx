import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Clock } from 'lucide-react';

interface RecentActivityTableProps {
  data: any[];
  isLoading: boolean;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({ data, isLoading }) => {
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'masuk':
        return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: <ArrowDownToLine size={12} />, label: 'Masuk' };
      case 'keluar':
        return { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', icon: <ArrowUpFromLine size={12} />, label: 'Keluar' };
      case 'internal':
        return { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: <RefreshCw size={12} />, label: 'Internal' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', icon: null, label: type };
    }
  };

  const initials = (name: string) => {
    const parts = (name || '?').trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const avatarColor = (name: string) => {
    const colors = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-violet-500','bg-cyan-500','bg-orange-500','bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden flex flex-col h-[350px]">
      <div className="p-4 md:p-5 border-b border-gray-100 dark:border-[#222] flex items-center gap-2">
        <Clock size={18} className="text-primary" />
        <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Riwayat Aktivitas Terbaru</h2>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Clock size={32} className="text-gray-300 dark:text-[#333] mb-2" />
            <p className="text-sm font-semibold text-text-primary dark:text-gray-400">Belum ada aktivitas mutasi</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {data.map((item) => {
              const badge = getBadgeStyle(item.type);
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(item.student?.fullName || '')} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner`}>
                      {initials(item.student?.fullName || '')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary dark:text-text-darkPrimary truncate group-hover:text-primary transition-colors">
                        {item.student?.fullName || 'Siswa Dihapus'}
                      </p>
                      <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                        NISN: {item.student?.nisn || '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                      {badge.icon} {badge.label}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
