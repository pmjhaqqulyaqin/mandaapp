import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useJurnalEntries, useJurnalById, useJurnalMutations } from '../../../hooks/api/useJurnal';
import { apiClient, API_BASE_URL } from '../../../lib/api';
import { toast } from 'sonner';
import { Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export const JurnalListTab = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const [employeeId, setEmployeeId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailId, setDetailId] = useState('');
  const canSeeAll = ['admin', 'kepala_madrasah', 'wakil_kepala'].includes(role);

  useEffect(() => {
    if (!user?.id || canSeeAll) return;
    apiClient<any[]>('/employees').then(emps => {
      const me = emps.find((e: any) => e.userId === user.id);
      if (me) setEmployeeId(me.id);
    }).catch(() => {});
  }, [user?.id]);

  const filters: Record<string, string> = {};
  if (!canSeeAll && employeeId) filters.teacherId = employeeId;
  if (filterDate) filters.date = filterDate;
  if (filterStatus) filters.status = filterStatus;

  const entries = useJurnalEntries(Object.keys(filters).length ? filters : undefined);
  const detail = useJurnalById(detailId);
  const { deleteEntry, approveEntry, rejectEntry } = useJurnalMutations();

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${map[status] || map.draft}`}>{status}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* List */}
      {entries.isLoading && <p className="text-xs text-gray-500 text-center py-8">Memuat...</p>}
      <div className="space-y-2">
        {entries.data?.map((e: any) => (
          <div key={e.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{e.subjectName}</p>
                  {statusBadge(e.status)}
                </div>
                <p className="text-xs text-gray-500">{e.className} • {e.date} • Jam ke {e.jamKe || '-'}</p>
                {canSeeAll && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{e.teacherName}</p>}
                {e.materiPembelajaran && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{e.materiPembelajaran}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                  <span>👤 {e.jumlahHadir}/{e.totalSiswa} Hadir</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setDetailId(e.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors"><Eye size={14} className="text-gray-500" /></button>
                {e.status === 'draft' && (
                  <button onClick={() => { if (confirm('Hapus jurnal ini?')) deleteEntry.mutate(e.id, { onSuccess: () => toast.success('Dihapus') }); }}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
        {entries.data?.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Belum ada jurnal</p>}
      </div>

      {/* Detail Modal */}
      {detailId && detail.data && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetailId('')}>
          <div className="bg-white dark:bg-[#111] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-[#111] p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-sm">Detail Jurnal</h3>
              <button onClick={() => setDetailId('')} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">{statusBadge(detail.data.status)}<span className="text-xs text-gray-500">{detail.data.date}</span></div>
              <div><span className="text-xs font-semibold text-gray-500">Mapel:</span> <span className="font-medium">{detail.data.subjectName}</span></div>
              <div><span className="text-xs font-semibold text-gray-500">Kelas:</span> {detail.data.className}</div>
              <div><span className="text-xs font-semibold text-gray-500">Guru:</span> {detail.data.teacherName}</div>
              {detail.data.linkRpp && <div><span className="text-xs font-semibold text-gray-500">RPP:</span> <a href={detail.data.linkRpp} target="_blank" className="text-emerald-600 underline text-xs">Buka Link</a></div>}
              {detail.data.materiPembelajaran && <div><span className="text-xs font-semibold text-gray-500 block">Materi:</span><p className="text-xs mt-1 whitespace-pre-wrap">{detail.data.materiPembelajaran}</p></div>}
              {detail.data.metode && <div><span className="text-xs font-semibold text-gray-500">Metode:</span> {detail.data.metode}</div>}
              {detail.data.catatan && <div><span className="text-xs font-semibold text-gray-500 block">Catatan:</span><p className="text-xs mt-1 whitespace-pre-wrap">{detail.data.catatan}</p></div>}
              {detail.data.evaluasi && <div><span className="text-xs font-semibold text-gray-500 block">Evaluasi:</span><p className="text-xs mt-1 whitespace-pre-wrap">{detail.data.evaluasi}</p></div>}
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
              {/* Approve/Reject for leadership */}
              {canSeeAll && detail.data.status === 'submitted' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { approveEntry.mutate(detail.data.id, { onSuccess: () => { toast.success('Approved!'); setDetailId(''); } }); }}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1 active:scale-95"><CheckCircle2 size={14} /> Approve</button>
                  <button onClick={() => { const note = prompt('Catatan penolakan:'); if (note) rejectEntry.mutate({ id: detail.data.id, note }, { onSuccess: () => { toast.success('Rejected'); setDetailId(''); } }); }}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1 active:scale-95"><XCircle size={14} /> Reject</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
