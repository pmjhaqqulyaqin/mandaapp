import { useState } from 'react';
import { useJurnalRecap } from '../../../hooks/api/useJurnal';
import { ArrowLeft, Clock, CheckCircle2, Users, BookOpen, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onBack: () => void;
}

export const JurnalRecapTab = ({ onBack }: Props) => {
  const today = new Date();
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly' | 'semester'>('daily');
  const [date, setDate] = useState(today.toLocaleDateString('sv-SE'));
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleCard = (card: string) => setExpandedCard(prev => prev === card ? null : card);

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
          {/* Card: Total Sesi Mengajar */}
          <button onClick={() => toggleCard('sesi')} className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-left active:scale-[0.97] transition-all cursor-pointer relative">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-2">
                <Clock size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedCard === 'sesi' ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalEntries}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Sesi Mengajar</p>
          </button>

          {/* Card: Jurnal Tersimpan */}
          <button onClick={() => toggleCard('jurnal')} className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-left active:scale-[0.97] transition-all cursor-pointer relative">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-2">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedCard === 'jurnal' ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{approved + submitted}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Jurnal Tersimpan</p>
          </button>

          {/* Card: Rata-rata Kehadiran */}
          <button onClick={() => toggleCard('kehadiran')} className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-left active:scale-[0.97] transition-all cursor-pointer relative">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-2">
                <Users size={14} className="text-purple-500 dark:text-purple-400" />
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedCard === 'kehadiran' ? 'rotate-180' : ''}`} />
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
          </button>

          {/* Card: Mapel Diampu */}
          <button onClick={() => toggleCard('mapel')} className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 text-left active:scale-[0.97] transition-all cursor-pointer relative">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-2">
                <BookOpen size={14} className="text-amber-500 dark:text-amber-400" />
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedCard === 'mapel' ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{Object.keys(subjectCounts).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mapel Diampu</p>
          </button>
        </div>

        {/* Expanded Detail Panel */}
        {expandedCard && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
                {expandedCard === 'sesi' && 'Detail Sesi Mengajar'}
                {expandedCard === 'jurnal' && 'Jurnal Tersimpan'}
                {expandedCard === 'kehadiran' && 'Detail Kehadiran per Sesi'}
                {expandedCard === 'mapel' && 'Daftar Mapel Diampu'}
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
              {/* Detail: Sesi Mengajar */}
              {expandedCard === 'sesi' && (() => {
                const entries = recap.data?.entries || [];
                if (entries.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Belum ada sesi</p>;
                return entries.map((e: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{e.teacherName || 'Guru'} — {e.subjectName || '-'}</p>
                      <p className="text-xs text-gray-400">{e.className || '-'} • {e.jamKe ? `Jam ke-${e.jamKe}` : '-'}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {e.date ? new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                    </span>
                  </div>
                ));
              })()}

              {/* Detail: Jurnal Tersimpan */}
              {expandedCard === 'jurnal' && (() => {
                const allEntries = recap.data?.entries || [];
                const savedEntries = allEntries.filter((e: any) => e.status === 'submitted' || e.status === 'approved');
                const unsavedEntries = allEntries.filter((e: any) => e.status !== 'submitted' && e.status !== 'approved');
                if (allEntries.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Belum ada jurnal</p>;
                return (
                  <>
                    {savedEntries.map((e: any, i: number) => (
                      <div key={`saved-${i}`} className="px-4 py-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{e.teacherName || 'Guru'} — {e.subjectName || '-'}</p>
                          <p className="text-xs text-gray-400">{e.className || '-'} • {e.materiPembelajaran || '-'}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          e.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>{e.status === 'approved' ? 'Disetujui' : 'Dikirim'}</span>
                      </div>
                    ))}
                    {unsavedEntries.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">Belum Disubmit ({unsavedEntries.length})</p>
                        </div>
                        {unsavedEntries.map((e: any, i: number) => (
                          <div key={`unsaved-${i}`} className="px-4 py-3 flex items-center justify-between bg-red-50/30 dark:bg-red-900/10">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{e.teacherName || 'Guru'} — {e.subjectName || '-'}</p>
                              <p className="text-xs text-gray-400">{e.className || '-'} • {e.materiPembelajaran || '-'}</p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              {e.status === 'draft' ? 'Draft' : e.status === 'rejected' ? 'Ditolak' : 'Belum'}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}

              {/* Detail: Kehadiran */}
              {expandedCard === 'kehadiran' && (() => {
                const entries = recap.data?.entries || [];
                if (entries.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Belum ada data kehadiran</p>;
                return entries.map((e: any, i: number) => {
                  const hadir = e.jumlahHadir || 0;
                  const total = e.totalSiswa || 0;
                  const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{e.teacherName || 'Guru'} — {e.subjectName || '-'} ({e.className || '-'})</p>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0 ml-2">{hadir}/{total} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Detail: Mapel Diampu */}
              {expandedCard === 'mapel' && (() => {
                const subjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]);
                if (subjects.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Belum ada mapel</p>;
                return subjects.map(([name, count], i) => (
                  <div key={name} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{name}</p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">{count} sesi</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

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
