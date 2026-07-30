import { useState, useMemo } from 'react';
import { useJurnalMonitoring } from '../../../hooks/api/useJurnal';
import { jurnalService } from '../../../lib/services/jurnal';
import { CheckCircle2, XCircle, Clock, Calendar, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const JurnalMonitoringTab = () => {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const monitoring = useJurnalMonitoring(date);
  const data = monitoring.data;

  // Download state
  const [selectedClassId, setSelectedClassId] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const pct = data?.summary ? Math.round((data.summary.filled / Math.max(data.summary.total, 1)) * 100) : 0;

  // Extract unique classes from monitoring data
  const uniqueClasses = useMemo(() => {
    if (!data?.teachers) return [];
    const map = new Map<string, string>();
    for (const t of data.teachers) {
      if (t.classId && t.className && !map.has(t.classId)) {
        map.set(t.classId, t.className);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.teachers]);

  const handleDownload = async () => {
    if (!selectedClassId) {
      toast.error('Pilih kelas terlebih dahulu');
      return;
    }
    setDownloading(true);
    try {
      await jurnalService.downloadDailyClassReport(selectedClassId, date);
      toast.success('Laporan Excel berhasil didownload');
    } catch (err: any) {
      toast.error('Gagal download: ' + (err.message || 'Unknown error'));
    }
    setDownloading(false);
  };

  const handleDownloadPdf = async () => {
    if (!selectedClassId) {
      toast.error('Pilih kelas terlebih dahulu');
      return;
    }
    setDownloadingPdf(true);
    try {
      await jurnalService.downloadDailyClassReportPdf(selectedClassId, date);
      toast.success('Laporan PDF berhasil didownload');
    } catch (err: any) {
      toast.error('Gagal download PDF: ' + (err.message || 'Unknown error'));
    }
    setDownloadingPdf(false);
  };

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

          {/* Download Laporan Harian */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">Download Laporan Harian</h3>
            </div>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-400/70 leading-relaxed">
              Download jurnal kelas harian dalam format Excel. Berisi daftar siswa, absensi per jam, nama guru, dan tujuan pembelajaran.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase mb-1 block">Pilih Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full bg-white dark:bg-[#1a1a1a] border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {uniqueClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleDownload}
                disabled={!selectedClassId || downloading}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg active:scale-95 transition-all shadow-sm shadow-emerald-500/20"
                title="Download Excel"
              >
                {downloading ? (
                  <><Loader2 size={14} className="animate-spin" /> Excel...</>
                ) : (
                  <><FileSpreadsheet size={14} /> Excel</>
                )}
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={!selectedClassId || downloadingPdf}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg active:scale-95 transition-all shadow-sm shadow-red-500/20"
                title="Download PDF"
              >
                {downloadingPdf ? (
                  <><Loader2 size={14} className="animate-spin" /> PDF...</>
                ) : (
                  <><FileText size={14} /> PDF</>
                )}
              </button>
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
