import { useState } from 'react';
import { useJurnalRecap } from '../../../hooks/api/useJurnal';
import { ArrowLeft, Clock, CheckCircle2, Users, BookOpen, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onBack: () => void;
}

export const JurnalRecapTab = ({ onBack }: Props) => {
  const today = new Date();
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly' | 'semester'>('daily');
  const [date, setDate] = useState(today.toLocaleDateString('sv-SE'));

  const getRange = () => {
    const d = new Date(date);
    if (mode === 'daily') {
      return { dateFrom: date, dateTo: date };
    }
    if (mode === 'weekly') {
      const dayOfWeek = d.getDay();
      const monday = new Date(d); monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
      return { dateFrom: monday.toLocaleDateString('sv-SE'), dateTo: friday.toLocaleDateString('sv-SE') };
    }
    if (mode === 'monthly') {
      const y = d.getFullYear(), m = d.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      return { dateFrom: `${y}-${String(m + 1).padStart(2, '0')}-01`, dateTo: `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
    }
    // semester
    const sixMonthsAgo = new Date(d); sixMonthsAgo.setMonth(d.getMonth() - 6);
    return { dateFrom: sixMonthsAgo.toLocaleDateString('sv-SE'), dateTo: date };
  };

  const filters = getRange();
  const recap = useJurnalRecap(filters);

  const totalEntries = recap.data?.summary?.totalEntries || 0;
  const approved = recap.data?.summary?.approved || 0;
  const submitted = recap.data?.summary?.submitted || 0;

  // Calculate bar chart data (entries per day of week)
  const dayBuckets = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
  (recap.data?.entries || []).forEach((e: any) => {
    const d = new Date(e.date).getDay();
    const idx = d === 0 ? 6 : d - 1; // Convert Sun=0 to index 6
    dayBuckets[idx]++;
  });
  const maxBucket = Math.max(...dayBuckets, 1);
  const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  // Top subjects
  const subjectCounts: Record<string, number> = {};
  (recap.data?.entries || []).forEach((e: any) => {
    const key = e.subjectName || 'Lainnya';
    subjectCounts[key] = (subjectCounts[key] || 0) + 1;
  });
  const topSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSubjectCount = topSubjects.length > 0 ? topSubjects[0][1] : 1;

  return (
    <div className="pb-4 -mx-3 md:mx-0">
      {/* Header */}
      <div className="bg-white dark:bg-[#111] px-4 pt-3 pb-3 sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 md:rounded-t-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Laporan & Statistik</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Period Selector */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex gap-2">
          {([['daily', 'Hari Ini'], ['weekly', 'Minggu Ini'], ['monthly', 'Bulan Ini'], ['semester', 'Semester']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)}
              className={`flex-1 py-2 text-xs rounded-lg font-medium transition-all active:scale-95 ${
                mode === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>{label}</button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-2">
              <Clock size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalEntries}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Sesi Mengajar</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{approved + submitted}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Jurnal Tersimpan</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-2">
              <Users size={14} className="text-purple-500 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {(() => {
                const entries = recap.data?.entries || [];
                if (entries.length === 0) return '0%';
                const totalH = entries.reduce((s: number, e: any) => s + (e.jumlahHadir || 0), 0);
                const totalS = entries.reduce((s: number, e: any) => s + (e.totalSiswa || 0), 0);
                return totalS > 0 ? `${Math.round((totalH / totalS) * 100)}%` : '0%';
              })()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rata-rata Kehadiran</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-2">
              <BookOpen size={14} className="text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{Object.keys(subjectCounts).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mapel Diampu</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-base text-gray-800 dark:text-white mb-3">Sesi Mengajar per Hari</h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {dayBuckets.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{count > 0 ? count : ''}</span>
                <div className={`w-full rounded-t-lg transition-all duration-500 ${
                  i >= 5 ? 'bg-gray-200 dark:bg-gray-700' : count > 0 ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-gray-100 dark:bg-gray-800'
                }`} style={{ height: `${Math.max((count / maxBucket) * 100, 4)}%` }} />
                <span className={`text-xs ${i >= 5 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Subjects */}
        {topSubjects.length > 0 && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-base text-gray-800 dark:text-white mb-3">Materi Sering Diajarkan</h3>
            <div className="space-y-3">
              {topSubjects.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 ${i === 0 ? 'bg-emerald-600' : i === 1 ? 'bg-emerald-500' : 'bg-emerald-400'} text-white rounded-full text-[10px] flex items-center justify-center font-bold`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{name}</p>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-1">
                      <div className="bg-emerald-500 dark:bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(count / maxSubjectCount) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex gap-3">
          <button onClick={() => toast.info('Fitur ekspor PDF akan segera tersedia')}
            className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800 flex items-center justify-center gap-2 active:scale-95">
            <FileText size={16} /> Ekspor PDF
          </button>
          <button onClick={() => toast.info('Fitur ekspor Excel akan segera tersedia')}
            className="flex-1 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 active:scale-95">
            <FileSpreadsheet size={16} /> Ekspor Excel
          </button>
        </div>
      </div>
    </div>
  );
};
