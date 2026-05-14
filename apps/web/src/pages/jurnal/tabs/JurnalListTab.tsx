import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useJurnalEntries, useJurnalById, useJurnalMutations } from '../../../hooks/api/useJurnal';
import { apiClient, API_BASE_URL } from '../../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Search, Eye, Trash2, CheckCircle2, XCircle, Users, Image as ImageIcon, Star } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const JurnalListTab = ({ onBack }: Props) => {
  const { user } = useAuth();
  const role = user?.role || '';
  const [employeeId, setEmployeeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'semester'>('week');
  const [detailId, setDetailId] = useState('');
  const canSeeAll = ['admin', 'kepala_madrasah', 'wakil_kepala'].includes(role);

  useEffect(() => {
    if (!user?.id || canSeeAll) return;
    apiClient<any>('/employees/me').then(emp => {
      if (emp) setEmployeeId(emp.id);
    }).catch(() => {});
  }, [user?.id]);

  // Build date filters based on period
  const getDateFilter = () => {
    const now = new Date();
    const today = now.toLocaleDateString('sv-SE');
    if (filterPeriod === 'week') {
      const day = now.getDay();
      const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { dateFrom: monday.toLocaleDateString('sv-SE'), dateTo: today };
    }
    if (filterPeriod === 'month') {
      return { dateFrom: `${today.slice(0, 8)}01`, dateTo: today };
    }
    // semester = 6 months
    const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);
    return { dateFrom: sixMonthsAgo.toLocaleDateString('sv-SE'), dateTo: today };
  };

  const filters: Record<string, string> = {};
  if (!canSeeAll && employeeId) filters.teacherId = employeeId;
  const dateFilter = getDateFilter();
  if (dateFilter.dateFrom) filters.dateFrom = dateFilter.dateFrom;
  if (dateFilter.dateTo) filters.dateTo = dateFilter.dateTo;

  const entries = useJurnalEntries(Object.keys(filters).length ? filters : undefined);
  const detail = useJurnalById(detailId);
  const { deleteEntry, approveEntry, rejectEntry } = useJurnalMutations();

  // Filter by search query
  const filteredEntries = (entries.data || []).filter((e: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (e.subjectName?.toLowerCase().includes(q) || e.className?.toLowerCase().includes(q) ||
      e.materiPembelajaran?.toLowerCase().includes(q) || e.date?.includes(q));
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      draft: { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', label: 'Draft' },
      submitted: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', label: 'Submitted' },
      approved: { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', label: 'Tersimpan' },
      rejected: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', label: 'Ditolak' },
    };
    const s = map[status] || map.draft;
    return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${s.bg}`}>{s.label}</span>;
  };

  return (
    <div className="pb-4 -mx-3 md:mx-0">
      {/* Header */}
      <div className="bg-white dark:bg-[#111] px-4 pt-3 pb-3 sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 md:rounded-t-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Riwayat Jurnal</h1>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4 py-3 bg-white dark:bg-[#111] border-b border-gray-100 dark:border-gray-800 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari materi, kelas, atau tanggal..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-[#1a1a1a] focus:border-emerald-500 outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {([['week', 'Minggu Ini'], ['month', 'Bulan Ini'], ['semester', 'Semester']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilterPeriod(key)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-all active:scale-95 ${
                filterPeriod === key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-3">
        {entries.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-xl h-28 animate-pulse border border-gray-100 dark:border-gray-800" />)}
          </div>
        )}

        {filteredEntries.map((e: any) => (
          <button key={e.id} onClick={() => setDetailId(e.id)}
            className={`w-full text-left bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm transition-all active:scale-[0.98] border ${
              e.status === 'draft' ? 'border-amber-200 dark:border-amber-800' : 'border-gray-100 dark:border-gray-800'
            }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(e.date)}</span>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{e.waktuMulai || '--:--'} - {e.waktuSelesai || '--:--'} • Jam ke {e.jamKe || '-'}</p>
              </div>
              <div className="flex gap-1 items-center shrink-0">
                {statusBadge(e.status)}
              </div>
            </div>
            <h4 className="font-semibold text-gray-800 dark:text-white text-base">{e.subjectName} — {e.className}</h4>
            {e.materiPembelajaran && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{e.materiPembelajaran}</p>}
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><Users size={12} /> {e.jumlahHadir || 0}/{e.totalSiswa || 0} siswa</span>
              {canSeeAll && <span className="text-emerald-600 dark:text-emerald-400 font-medium">{e.teacherName}</span>}
            </div>
          </button>
        ))}

        {!entries.isLoading && filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada jurnal pada periode ini</p>
          </div>
        )}
      </div>

      {/* Detail Modal (Bottom Sheet) */}
      {detailId && detail.data && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetailId('')}>
          <div className="bg-white dark:bg-[#111] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-[#111] p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-sm dark:text-white">Detail Jurnal</h3>
              <button onClick={() => setDetailId('')} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">{statusBadge(detail.data.status)}<span className="text-xs text-gray-500">{detail.data.date}</span></div>
              <div><span className="text-xs font-semibold text-gray-500">Mapel:</span> <span className="font-medium dark:text-white">{detail.data.subjectName}</span></div>
              <div><span className="text-xs font-semibold text-gray-500">Kelas:</span> <span className="dark:text-gray-300">{detail.data.className}</span></div>
              <div><span className="text-xs font-semibold text-gray-500">Guru:</span> <span className="dark:text-gray-300">{detail.data.teacherName}</span></div>
              <div><span className="text-xs font-semibold text-gray-500">Jam ke:</span> <span className="dark:text-gray-300">{detail.data.jamKe || '-'}</span></div>
              {detail.data.linkRpp && <div><span className="text-xs font-semibold text-gray-500">RPP:</span> <a href={detail.data.linkRpp} target="_blank" className="text-emerald-600 underline text-xs">Buka Link</a></div>}
              {detail.data.materiPembelajaran && <div><span className="text-xs font-semibold text-gray-500 block">Materi:</span><p className="text-xs mt-1 whitespace-pre-wrap dark:text-gray-300">{detail.data.materiPembelajaran}</p></div>}
              {detail.data.metode && <div><span className="text-xs font-semibold text-gray-500">Metode:</span> <span className="dark:text-gray-300">{detail.data.metode}</span></div>}
              {detail.data.catatan && <div><span className="text-xs font-semibold text-gray-500 block">Catatan:</span><p className="text-xs mt-1 whitespace-pre-wrap dark:text-gray-300">{detail.data.catatan}</p></div>}
              <div className="grid grid-cols-4 gap-2 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-3">
                <div className="text-center"><p className="text-lg font-bold text-emerald-600">{detail.data.jumlahHadir}</p><p className="text-[10px] text-gray-500">Hadir</p></div>
                <div className="text-center"><p className="text-lg font-bold text-blue-600">{detail.data.jumlahIzin}</p><p className="text-[10px] text-gray-500">Izin</p></div>
                <div className="text-center"><p className="text-lg font-bold text-yellow-600">{detail.data.jumlahSakit}</p><p className="text-[10px] text-gray-500">Sakit</p></div>
                <div className="text-center"><p className="text-lg font-bold text-red-600">{detail.data.jumlahAlpa}</p><p className="text-[10px] text-gray-500">Alpa</p></div>
              </div>
              {detail.data.attachments?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 block mb-2">Dokumentasi:</span>
                  <div className="grid grid-cols-3 gap-2">{detail.data.attachments.map((a: any) => (
                    <img key={a.id} src={`${API_BASE_URL.replace('/api', '')}${a.fileUrl.startsWith('/') ? a.fileUrl : `/uploads/${a.fileUrl}`}`} className="w-full aspect-square object-cover rounded-lg" />
                  ))}</div>
                </div>
              )}
              {/* Delete for draft, Approve/Reject for leadership */}
              <div className="flex gap-2 pt-2">
                {detail.data.status === 'draft' && (
                  <button onClick={() => { if (confirm('Hapus jurnal ini?')) deleteEntry.mutate(detail.data.id, { onSuccess: () => { toast.success('Dihapus'); setDetailId(''); } }); }}
                    className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 active:scale-95 border border-red-200 dark:border-red-800">
                    <Trash2 size={14} /> Hapus Draft
                  </button>
                )}
                {canSeeAll && detail.data.status === 'submitted' && (
                  <>
                    <button onClick={() => { approveEntry.mutate(detail.data.id, { onSuccess: () => { toast.success('Approved!'); setDetailId(''); } }); }}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1 active:scale-95"><CheckCircle2 size={14} /> Approve</button>
                    <button onClick={() => { const note = prompt('Catatan penolakan:'); if (note) rejectEntry.mutate({ id: detail.data.id, note }, { onSuccess: () => { toast.success('Rejected'); setDetailId(''); } }); }}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1 active:scale-95"><XCircle size={14} /> Reject</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
