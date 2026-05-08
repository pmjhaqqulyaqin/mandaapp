import { useState } from 'react';
import { useJurnalRecap } from '../../../hooks/api/useJurnal';
import { jurnalService } from '../../../lib/services/jurnal';
import { BarChart3, Download, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';

export const JurnalRecapTab = () => {
  const today = new Date();
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

  const getRange = () => {
    if (mode === 'daily') return { dateFrom: date, dateTo: date };
    if (mode === 'weekly') {
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const monday = new Date(d); monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
      return { dateFrom: monday.toISOString().split('T')[0], dateTo: friday.toISOString().split('T')[0] };
    }
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { dateFrom: `${month}-01`, dateTo: `${month}-${String(lastDay).padStart(2, '0')}` };
  };

  const filters = getRange();
  const recap = useJurnalRecap(filters);

  const handleExport = async () => {
    try {
      toast.info('Fitur export Excel akan segera tersedia');
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-1 p-0.5 bg-gray-200/70 dark:bg-[#1a1a1a] rounded-lg w-fit">
        {(['daily', 'weekly', 'monthly'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
              mode === m ? 'bg-white dark:bg-[#2a2a2a] text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{m === 'daily' ? 'Harian' : m === 'weekly' ? 'Mingguan' : 'Bulanan'}</button>
        ))}
      </div>

      {/* Date Input */}
      <div className="flex items-center gap-3">
        {mode === 'monthly' ? (
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs" />
        ) : (
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs" />
        )}
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all">
          <Download size={14} /> Export
        </button>
      </div>

      {recap.isLoading && <p className="text-xs text-gray-500 text-center py-8">Memuat...</p>}

      {recap.data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-xl font-bold text-gray-800 dark:text-white">{recap.data.summary.totalEntries}</p>
              <p className="text-[10px] font-semibold text-gray-500">Total Jurnal</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{recap.data.summary.approved}</p>
              <p className="text-[10px] font-semibold text-emerald-600">Approved</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{recap.data.summary.submitted}</p>
              <p className="text-[10px] font-semibold text-blue-600">Submitted</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-xl font-bold text-gray-600">{recap.data.summary.draft}</p>
              <p className="text-[10px] font-semibold text-gray-500">Draft</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-[#0d0d0d]">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Tanggal</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Guru</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Mapel</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Kelas</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Hadir</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recap.data.entries.map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#222]">
                      <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                      <td className="px-3 py-2 font-medium">{e.teacherName}</td>
                      <td className="px-3 py-2">{e.subjectName}</td>
                      <td className="px-3 py-2">{e.className}</td>
                      <td className="px-3 py-2 text-center">{e.jumlahHadir}/{e.totalSiswa}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          e.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          e.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          e.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recap.data.entries.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Tidak ada data</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
