import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api';
import { Download, FileSpreadsheet, RefreshCw, Zap, Trash2, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  academicYearId: string;
  semester: string;
  canEdit: boolean;
}

interface JadwalSlot {
  id: string;
  guruId: string;
  guruName: string;
  kelasId: string;
  kelasName: string;
  subjectId: string;
  subjectKode: string;
  subjectNama: string;
  ruanganId: string | null;
  ruanganNama: string | null;
  dayOfWeek: number;
  jamKe: number;
}

const DAY_NAMES: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
const DAY_SHORT: Record<number, string> = { 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab' };

// Auto-generate color palette for subjects
const SUBJECT_COLORS = [
  'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-500/30',
  'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/30',
  'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-500/30',
  'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-500/30',
  'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-500/30',
  'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-500/30',
  'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-500/30',
  'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-500/30',
  'bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-500/30',
  'bg-pink-100 dark:bg-pink-500/15 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-500/30',
  'bg-lime-100 dark:bg-lime-500/15 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-500/30',
  'bg-fuchsia-100 dark:bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-500/30',
];

export const JadwalTab = ({ academicYearId, semester, canEdit }: Props) => {
  const [jadwal, setJadwal] = useState<JadwalSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'kelas' | 'guru'>('kelas');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [guruList, setGuruList] = useState<{ id: string; name: string }[]>([]);
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [conflicts, setConflicts] = useState<any>(null);

  const loadData = useCallback(() => {
    if (!academicYearId) return;
    setLoading(true);
    const params = new URLSearchParams({ academicYearId, semester });
    if (selectedFilter && viewMode === 'kelas') params.set('kelasId', selectedFilter);
    if (selectedFilter && viewMode === 'guru') params.set('guruId', selectedFilter);

    Promise.all([
      apiClient<JadwalSlot[]>(`/kbm/jadwal?${params}`),
      apiClient<any[]>('/classes'),
      apiClient<any[]>('/employees?type=Guru'),
    ]).then(([data, cls, guru]) => {
      setJadwal(data);
      setClassList((cls as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setGuruList((guru as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }).catch(() => toast.error('Gagal memuat jadwal'))
      .finally(() => setLoading(false));
  }, [academicYearId, semester, selectedFilter, viewMode]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build subject color map
  const subjectColorMap = new Map<string, string>();
  const uniqueSubjects = [...new Set(jadwal.map(j => j.subjectId))];
  uniqueSubjects.forEach((id, i) => subjectColorMap.set(id, SUBJECT_COLORS[i % SUBJECT_COLORS.length]));

  // Determine max jam from data
  const allJam = jadwal.map(j => j.jamKe);
  const maxJam = allJam.length > 0 ? Math.max(...allJam) : 8;
  const jamRange = Array.from({ length: maxJam }, (_, i) => i + 1);
  const days = [1, 2, 3, 4, 5, 6];

  // Build grid: day -> jam -> slot(s)
  const grid = new Map<string, JadwalSlot[]>();
  for (const j of jadwal) {
    const key = `${j.dayOfWeek}-${j.jamKe}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(j);
  }

  const handleGenerate = async () => {
    setShowConfirmGenerate(false);
    setGenerating(true);
    try {
      const res = await apiClient<any>('/kbm/jadwal/generate', {
        method: 'POST', data: { academicYearId, semester, clearExisting: true },
      });
      toast.success(res.message);
      loadData();
    } catch (err: any) { toast.error(err.message || 'Gagal generate'); }
    finally { setGenerating(false); }
  };

  const handleSync = async () => {
    setShowConfirmSync(false);
    setSyncing(true);
    try {
      const res = await apiClient<any>('/kbm/jadwal/sync', { method: 'POST', data: { academicYearId, semester } });
      toast.success(res.message);
    } catch (err: any) { toast.error(err.message || 'Gagal sync'); }
    finally { setSyncing(false); }
  };

  const handleClear = async () => {
    setShowConfirmClear(false);
    try {
      const res = await apiClient<any>('/kbm/jadwal/clear', { method: 'POST', data: { academicYearId, semester } });
      toast.success(res.message);
      loadData();
    } catch (err: any) { toast.error(err.message || 'Gagal hapus'); }
  };

  const handleCheckConflicts = async () => {
    try {
      const res = await apiClient<any>(`/kbm/jadwal/conflicts?academicYearId=${academicYearId}&semester=${semester}`);
      setConflicts(res);
      if (!res.hasConflicts) toast.success('Tidak ada konflik');
    } catch (err: any) { toast.error(err.message || 'Gagal cek'); }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Hapus slot ini?')) return;
    try {
      await apiClient(`/kbm/jadwal/${id}`, { method: 'DELETE' });
      setJadwal(prev => prev.filter(j => j.id !== id));
      toast.success('Slot dihapus');
    } catch { toast.error('Gagal hapus'); }
  };

  const handleExport = (groupBy: string) => {
    window.open(`/api/kbm/jadwal/export?academicYearId=${academicYearId}&semester=${semester}&groupBy=${groupBy}`, '_blank');
  };

  const handleExportGrid = () => {
    window.open(`/api/kbm/jadwal/export-grid?academicYearId=${academicYearId}&semester=${semester}`, '_blank');
  };

  if (!academicYearId) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Pilih Tahun Ajaran terlebih dahulu</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View mode toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-[#333] overflow-hidden">
          <button
            onClick={() => { setViewMode('kelas'); setSelectedFilter(''); }}
            className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${viewMode === 'kelas' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400'}`}
          >Per Kelas</button>
          <button
            onClick={() => { setViewMode('guru'); setSelectedFilter(''); }}
            className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${viewMode === 'guru' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400'}`}
          >Per Guru</button>
        </div>

        {/* Filter */}
        <select
          value={selectedFilter}
          onChange={e => setSelectedFilter(e.target.value)}
          className="px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none min-w-[140px]"
        >
          <option value="">Semua {viewMode === 'kelas' ? 'Kelas' : 'Guru'}</option>
          {(viewMode === 'kelas' ? classList : guruList).map(item => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <div className="flex-1" />

        {canEdit && (
          <>
            <button
              onClick={() => setShowConfirmGenerate(true)}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {generating ? 'Generating...' : 'Generate Jadwal'}
            </button>
            <button
              onClick={() => setShowConfirmSync(true)}
              disabled={syncing || jadwal.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {syncing ? 'Syncing...' : 'Sync ke Jurnal'}
            </button>
          </>
        )}

        {/* More actions dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
            <ChevronDown size={14} /> Lainnya
          </button>
          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#333] shadow-lg z-30 hidden group-hover:block">
            <button onClick={() => handleExport('kelas')} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] flex items-center gap-2">
              <Download size={12} /> Export per Kelas
            </button>
            <button onClick={() => handleExport('guru')} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] flex items-center gap-2">
              <Download size={12} /> Export per Guru
            </button>
            <button onClick={handleCheckConflicts} className="w-full text-left px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] flex items-center gap-2">
              <AlertTriangle size={12} /> Cek Konflik
            </button>
            <div className="border-t border-gray-100 dark:border-[#333] my-1" />
            <button onClick={handleExportGrid} className="w-full text-left px-3 py-2 text-[12px] text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2">
              <FileSpreadsheet size={12} /> Export Grid Kode
            </button>
            {canEdit && (
              <button onClick={() => setShowConfirmClear(true)} className="w-full text-left px-3 py-2 text-[12px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                <Trash2 size={12} /> Hapus Semua Jadwal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Warning */}
      {conflicts?.hasConflicts && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-[12px] font-semibold text-red-700 dark:text-red-300 mb-1">
            ⚠️ Ditemukan {conflicts.guruConflicts.length} konflik guru dan {conflicts.kelasConflicts.length} konflik kelas
          </p>
          <p className="text-[11px] text-red-500 dark:text-red-400">Perbaiki konflik sebelum sync ke Jurnal Mengajar.</p>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-[11px] text-gray-400">
        <span>Total: <strong className="text-gray-700 dark:text-gray-200">{jadwal.length}</strong> slot</span>
        <span>Mapel: <strong className="text-gray-700 dark:text-gray-200">{uniqueSubjects.length}</strong></span>
        <span>Hari: <strong className="text-gray-700 dark:text-gray-200">{new Set(jadwal.map(j => j.dayOfWeek)).size}</strong></span>
      </div>

      {/* Grid Timetable */}
      {jadwal.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Zap size={32} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">Belum ada jadwal</p>
          <p className="text-[11px] mt-1">Klik "Generate Jadwal" untuk membuat jadwal otomatis dari distribusi jam</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-gray-200 dark:border-[#222] max-h-[calc(100vh-320px)]">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-100 dark:bg-[#1a1a1a]">
                <th className="sticky left-0 z-30 bg-gray-100 dark:bg-[#1a1a1a] px-2 py-2.5 text-left font-semibold text-gray-500 border-r border-gray-200 dark:border-[#333] w-14">Jam</th>
                {days.map(d => (
                  <th key={d} className="px-1 py-2.5 text-center font-semibold text-gray-500 border-r border-gray-200 dark:border-[#333] min-w-[120px]">
                    <span className="hidden md:inline">{DAY_NAMES[d]}</span>
                    <span className="md:hidden">{DAY_SHORT[d]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jamRange.map(jam => (
                <tr key={jam} className="border-t border-gray-100 dark:border-[#1a1a1a]">
                  <td className="sticky left-0 z-10 bg-white dark:bg-[#111] px-2 py-1 text-center font-bold text-gray-500 border-r border-gray-200 dark:border-[#333]">{jam}</td>
                  {days.map(day => {
                    const slots = grid.get(`${day}-${jam}`) || [];
                    return (
                      <td key={day} className="px-0.5 py-0.5 border-r border-gray-100 dark:border-[#1a1a1a] align-top">
                        {slots.length === 0 ? (
                          <div className="h-14 rounded-lg border border-dashed border-gray-100 dark:border-[#222]" />
                        ) : (
                          <div className="space-y-0.5">
                            {slots.map(slot => (
                              <div
                                key={slot.id}
                                className={`relative group rounded-lg border px-1.5 py-1 cursor-default transition-all hover:shadow-sm ${subjectColorMap.get(slot.subjectId) || SUBJECT_COLORS[0]}`}
                              >
                                <div className="font-bold text-[10px] leading-tight truncate">{slot.subjectNama}</div>
                                <div className="text-[9px] opacity-70 truncate">
                                  {viewMode === 'kelas' ? slot.guruName : slot.kelasName}
                                </div>
                                {slot.ruanganNama && (
                                  <div className="text-[8px] opacity-50 truncate">{slot.ruanganNama}</div>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-500 transition-opacity"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Generate Modal */}
      {showConfirmGenerate && (
        <ConfirmModal
          title="Generate Jadwal Otomatis"
          message="Ini akan menghapus jadwal lama dan membuat jadwal baru dari data distribusi jam. Lanjutkan?"
          confirmText="Generate"
          onConfirm={handleGenerate}
          onCancel={() => setShowConfirmGenerate(false)}
          color="amber"
        />
      )}

      {/* Confirm Sync Modal */}
      {showConfirmSync && (
        <ConfirmModal
          title="Sync ke Jurnal Mengajar"
          message={`Ini akan meng-update jadwal di Jurnal Mengajar (${jadwal.length} slot). Jadwal yang dibuat manual oleh guru tidak akan terpengaruh. Lanjutkan?`}
          confirmText="Sync Sekarang"
          onConfirm={handleSync}
          onCancel={() => setShowConfirmSync(false)}
          color="emerald"
        />
      )}

      {/* Confirm Clear Modal */}
      {showConfirmClear && (
        <ConfirmModal
          title="Hapus Semua Jadwal"
          message="Ini akan menghapus semua jadwal semester ini. Data distribusi jam tidak terpengaruh. Lanjutkan?"
          confirmText="Hapus"
          onConfirm={handleClear}
          onCancel={() => setShowConfirmClear(false)}
          color="red"
        />
      )}
    </div>
  );
};

// Reusable confirm modal
const ConfirmModal = ({ title, message, confirmText, onConfirm, onCancel, color }: {
  title: string; message: string; confirmText: string;
  onConfirm: () => void; onCancel: () => void; color: string;
}) => {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500 hover:bg-amber-600',
    emerald: 'bg-emerald-500 hover:bg-emerald-600',
    red: 'bg-red-500 hover:bg-red-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-[#161616] rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-[12px] font-semibold rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
            Batal
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-[12px] font-semibold rounded-xl text-white active:scale-95 transition-all ${colorClasses[color] || colorClasses.amber}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
