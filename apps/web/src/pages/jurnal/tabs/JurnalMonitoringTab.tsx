import { useState } from 'react';
import { useJurnalMonitoring } from '../../../hooks/api/useJurnal';
import { CheckCircle2, XCircle, Clock, Users, Calendar } from 'lucide-react';

export const JurnalMonitoringTab = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const monitoring = useJurnalMonitoring(date);
  const data = monitoring.data;

  const pct = data?.summary ? Math.round((data.summary.filled / Math.max(data.summary.total, 1)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Calendar size={16} className="text-emerald-600" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs" />
      </div>

      {monitoring.isLoading && <p className="text-xs text-gray-500 text-center py-8">Memuat...</p>}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{data.summary.total}</p>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Total Jadwal</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{data.summary.filled}</p>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Sudah Isi</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{data.summary.notFilled}</p>
              <p className="text-[10px] font-semibold text-red-600 uppercase">Belum Isi</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Progres Pengisian</span>
              <span className="text-sm font-bold text-emerald-600">{pct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Teacher List */}
          <div className="space-y-2">
            {data.teachers?.map((t: any, i: number) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                t.filled
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.filled ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                    {t.filled ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{t.employeeName}</p>
                    <p className="text-[10px] text-gray-500">{t.subjectName} • {t.className} • Jam {t.jamKe || '-'}</p>
                  </div>
                </div>
                {t.filled ? (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    t.jurnalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    t.jurnalStatus === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>{t.jurnalStatus?.toUpperCase()}</span>
                ) : (
                  <XCircle size={16} className="text-red-400 shrink-0" />
                )}
              </div>
            ))}
            {data.teachers?.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Tidak ada jadwal pada tanggal ini</p>}
          </div>
        </>
      )}
    </div>
  );
};
