import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '../../../lib/api';
import { Download, FileSpreadsheet, RefreshCw, Zap, Trash2, AlertTriangle, Loader2, ChevronDown, CheckCircle2, XCircle, MapPin, GripVertical, ArrowLeftRight, Clock, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';

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

// --- DnD Helper Components ---
const DraggableSlot = ({ slot, colorClass, viewMode, canEdit, onDelete }: { slot: JadwalSlot; colorClass: string; viewMode: string; canEdit: boolean; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `slot-${slot.id}`, data: { type: 'existing-slot', slot } });
  return (
    <div ref={setNodeRef} {...(canEdit ? { ...listeners, ...attributes } : {})}
      className={`relative group rounded-lg border px-1.5 py-1 transition-all hover:shadow-sm ${colorClass} ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isDragging ? 'opacity-30 scale-95' : ''}`}
    >
      {canEdit && <GripVertical size={10} className="absolute top-1 right-5 opacity-0 group-hover:opacity-40 text-current" />}
      <div className="font-bold text-[10px] leading-tight truncate">{slot.subjectNama}</div>
      <div className="text-[9px] opacity-70 truncate">{viewMode === 'kelas' ? slot.guruName : slot.kelasName}</div>
      {slot.ruanganNama && <div className="text-[8px] opacity-50 truncate">{slot.ruanganNama}</div>}
      {canEdit && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(slot.id); }}
          className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-500 transition-opacity">
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
};

const DroppableCell = ({ day, jam, children, isOver }: { day: number; jam: number; children: React.ReactNode; isOver?: boolean }) => {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: `cell-${day}-${jam}`, data: { day, jam } });
  const over = isOver || dndIsOver;
  return (
    <td ref={setNodeRef} className={`px-0.5 py-0.5 border-r border-gray-100 dark:border-[#1a1a1a] align-top transition-colors ${over ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}>
      {children}
    </td>
  );
};

const FailedBlockDraggable = ({ block, index }: { block: any; index: number }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `failed-${index}-${block.guruId}-${block.subjectId}`, data: { type: 'failed-block', block } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab active:cursor-grabbing border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30 ${isDragging ? 'opacity-30' : ''}`}
    >
      <span className="text-gray-500 dark:text-gray-400">{"\u2022"} {block.kode}. {block.subject} ({block.size} JP)</span>
      <span className="shrink-0 text-[9px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 font-semibold flex items-center gap-1">
        <MapPin size={9} /> Drag ke grid
      </span>
    </div>
  );
};

export const JadwalTab = ({ academicYearId, semester, canEdit }: Props) => {
  const [jadwal, setJadwal] = useState<JadwalSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<{ phase: string; progress: number; detail?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'kelas' | 'guru'>('kelas');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [guruList, setGuruList] = useState<{ id: string; name: string }[]>([]);
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [conflicts, setConflicts] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [generateReport, _setGenerateReport] = useState<any>(() => {
    try { const s = localStorage.getItem(`jadwal-report-${academicYearId}-${semester}`); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const setGenerateReport = useCallback((v: any) => {
    _setGenerateReport(v);
    if (v && v.failedBlocks > 0) { try { localStorage.setItem(`jadwal-report-${academicYearId}-${semester}`, JSON.stringify(v)); } catch {} }
    else { try { localStorage.removeItem(`jadwal-report-${academicYearId}-${semester}`); } catch {} }
  }, [academicYearId, semester]);
  const [manualBlock, setManualBlock] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [swapSlots, setSwapSlots] = useState<any[]>([]);
  const [otherSlots, setOtherSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [placingBlock, setPlacingBlock] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<any>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // Pure CSS overlay fullscreen — no Fullscreen API = zero flicker, zero exit issues
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // ESC key to close overlay + lock body scroll
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setIsFullscreen(false); }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

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
      setQualityScore(null);
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

  // --- @dnd-kit setup ---
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeDrag, setActiveDrag] = useState<{ type: 'existing-slot' | 'failed-block'; slot?: JadwalSlot; block?: any } | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'existing-slot') setActiveDrag({ type: 'existing-slot', slot: data.slot });
    else if (data?.type === 'failed-block') setActiveDrag({ type: 'failed-block', block: data.block });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over || !canEdit) return;

    const overData = over.data.current;
    if (!overData?.day || !overData?.jam) return;
    const targetDay = overData.day as number;
    const targetJam = overData.jam as number;

    const activeData = active.data.current;

    // Case 1: Dragging a failed block to place it
    if (activeData?.type === 'failed-block') {
      const block = activeData.block;
      try {
        await apiClient<any>('/kbm/jadwal/manual-place', { method: 'POST', data: { academicYearId, semester, guruId: block.guruId, kelasId: block.kelasId, subjectId: block.subjectId, dayOfWeek: targetDay, jamKe: targetJam } });
        toast.success(`${block.kode}. ${block.subject} → ${DAY_NAMES[targetDay]} jam ${targetJam}`);
        if (generateReport) {
          const nf = [...(generateReport.report?.failedDetails || [])];
          const idx = nf.findIndex((f: any) => f.guruId === block.guruId && f.kelasId === block.kelasId && f.subject === block.subject);
          if (idx >= 0) nf.splice(idx, 1);
          setGenerateReport({ ...generateReport, report: { ...generateReport.report, failedDetails: nf }, failedBlocks: nf.length, failed: nf.reduce((a: number, f: any) => a + f.size, 0), generated: (generateReport.generated || 0) + 1 });
        }
        loadData();
      } catch (err: any) { toast.error(err?.message || 'Konflik: slot sudah terisi'); }
      return;
    }

    // Case 2: Dragging an existing slot
    if (activeData?.type === 'existing-slot') {
      const slot = activeData.slot as JadwalSlot;
      if (slot.dayOfWeek === targetDay && slot.jamKe === targetJam) return; // Same position

      // Check what's at the target
      const targetSlots = grid.get(`${targetDay}-${targetJam}`) || [];

      if (targetSlots.length === 0) {
        // Move to empty cell
        try {
          await apiClient<any>(`/kbm/jadwal/${slot.id}`, { method: 'PUT', data: { dayOfWeek: targetDay, jamKe: targetJam } });
          toast.success(`${slot.subjectNama} → ${DAY_NAMES[targetDay]} jam ${targetJam}`);
          loadData();
        } catch (err: any) { toast.error(err?.message || 'Konflik saat pindah'); }
      } else {
        // Swap with existing slot
        const targetSlot = targetSlots[0];
        try {
          await apiClient<any>('/kbm/jadwal/swap', { method: 'POST', data: { slotIdA: slot.id, slotIdB: targetSlot.id } });
          toast.success(`Swap: ${slot.subjectNama} ↔ ${targetSlot.subjectNama}`);
          loadData();
        } catch (err: any) { toast.error(err?.message || 'Konflik saat swap'); }
      }
    }
  }, [academicYearId, semester, canEdit, grid, generateReport, setGenerateReport, loadData]);

  const handleGenerate = () => {
    setShowConfirmGenerate(false);
    setGenerating(true);
    setGenerateReport(null);
    setGenerateProgress({ phase: 'init', progress: 0, detail: 'Memulai...' });

    const es = new EventSource(`/api/kbm/jadwal/generate-stream?academicYearId=${academicYearId}&semester=${semester}`);

    es.addEventListener('progress', (e) => {
      try { setGenerateProgress(JSON.parse(e.data)); } catch {}
    });

    es.addEventListener('result', (e) => {
      try {
        const res = JSON.parse(e.data);
        toast.success(res.message);
        setGenerateReport(res);
        loadData();
      } catch {}
    });

    es.addEventListener('error', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data || '{}');
        toast.error(data.message || 'Gagal generate');
      } catch { toast.error('Koneksi terputus'); }
      es.close();
      setGenerating(false);
      setGenerateProgress(null);
    });

    es.addEventListener('done', () => {
      es.close();
      setGenerating(false);
      setGenerateProgress(null);
    });

    es.onerror = () => {
      es.close();
      setGenerating(false);
      setGenerateProgress(null);
    };
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="space-y-3">
      {/* Toolbar — hidden in fullscreen */}
      {!isFullscreen && <div className="flex flex-wrap items-center gap-2">
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
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-1 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
            <ChevronDown size={14} /> Lainnya
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#333] shadow-xl z-30 py-1">
                <button onClick={() => { handleExport('kelas'); setShowMenu(false); }} className="w-full text-left px-3 py-2.5 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] flex items-center gap-2">
                  <Download size={13} /> Export per Kelas
                </button>
                <button onClick={() => { handleExport('guru'); setShowMenu(false); }} className="w-full text-left px-3 py-2.5 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] flex items-center gap-2">
                  <Download size={13} /> Export per Guru
                </button>
                <div className="border-t border-gray-100 dark:border-[#333] my-1" />
                <button onClick={() => { handleExportGrid(); setShowMenu(false); }} className="w-full text-left px-3 py-2.5 text-[12px] text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2">
                  <FileSpreadsheet size={13} /> Export Grid Kode
                </button>
                <div className="border-t border-gray-100 dark:border-[#333] my-1" />
                <button onClick={() => { handleCheckConflicts(); setShowMenu(false); }} className="w-full text-left px-3 py-2.5 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] flex items-center gap-2">
                  <AlertTriangle size={13} /> Cek Konflik
                </button>
                <button onClick={async () => {
                  try {
                    const res = await apiClient<any[]>(`/kbm/jadwal/versions?academicYearId=${academicYearId}&semester=${semester}`);
                    setVersions(res);
                    setShowVersions(true);
                  } catch {}
                  setShowMenu(false);
                }} className="w-full text-left px-3 py-2.5 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] flex items-center gap-2">
                  <Clock size={13} /> Riwayat Versi
                </button>
                {canEdit && (
                  <>
                    <div className="border-t border-gray-100 dark:border-[#333] my-1" />
                    <button onClick={() => { setShowConfirmClear(true); setShowMenu(false); }} className="w-full text-left px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                      <Trash2 size={13} /> Hapus Semua Jadwal
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>}

      {/* Version Selector */}
      {!isFullscreen && showVersions && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">📋 Riwayat Versi Jadwal</h4>
            <button onClick={() => setShowVersions(false)} className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {versions.length === 0 ? (
            <p className="text-[10px] text-gray-400">Belum ada versi</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {versions.map((v: any) => (
                <div key={v.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] transition-all ${v.isAktif ? 'bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500/40' : 'bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] hover:border-indigo-200'}`}>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-gray-700 dark:text-gray-200 truncate">{v.nama}</span>
                    {v.isAktif && <span className="ml-1 text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500 text-white font-bold">AKTIF</span>}
                    <div className="text-[9px] text-gray-400">{v.totalSlots} slot • {v.totalFailed || 0} gagal • {new Date(v.createdAt).toLocaleDateString('id-ID')}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!v.isAktif && canEdit && (
                      <button
                        onClick={async () => {
                          try {
                            await apiClient<any>(`/kbm/jadwal/versions/${v.id}/activate`, { method: 'POST' });
                            toast.success(`Versi "${v.nama}" diaktifkan`);
                            loadData();
                            const res = await apiClient<any[]>(`/kbm/jadwal/versions?academicYearId=${academicYearId}&semester=${semester}`);
                            setVersions(res);
                          } catch (err: any) { toast.error(err?.message || 'Gagal aktivasi'); }
                        }}
                        className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 font-semibold"
                      >Aktifkan</button>
                    )}
                    {!v.isAktif && canEdit && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Hapus versi "${v.nama}"?`)) return;
                          try {
                            await apiClient<any>(`/kbm/jadwal/versions/${v.id}`, { method: 'DELETE' });
                            toast.success('Versi dihapus');
                            setVersions(prev => prev.filter(vv => vv.id !== v.id));
                          } catch (err: any) { toast.error(err?.message || 'Gagal hapus'); }
                        }}
                        className="p-0.5 rounded text-red-400 hover:bg-red-100 dark:hover:bg-red-500/15"
                      ><Trash2 size={10} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflict Warning */}
      {!isFullscreen && conflicts?.hasConflicts && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-[12px] font-semibold text-red-700 dark:text-red-300 mb-1">
            {"\u26A0\uFE0F"} Ditemukan {conflicts.guruConflicts.length} konflik guru dan {conflicts.kelasConflicts.length} konflik kelas
          </p>
          <p className="text-[11px] text-red-500 dark:text-red-400">Perbaiki konflik sebelum sync ke Jurnal Mengajar.</p>
        </div>
      )}

      {/* Generate Report — hidden in fullscreen (shown inside grid header instead) */}
      {!isFullscreen && generateReport && (
        <div className={`p-3 rounded-xl border space-y-2 ${generateReport.failedBlocks > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">
                {generateReport.generated} slot ({generateReport.blocks} blok)
              </p>
            </div>
            <button onClick={() => setGenerateReport(null)} className="text-gray-400 hover:text-gray-600 text-[10px]">{"\u2715"}</button>
          </div>
          {/* Pass Results */}
          {generateReport.report?.passResults?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {generateReport.report.passResults.filter((p: any) => p.placed > 0).map((p: any) => (
                <span key={p.pass} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                  p.pass === 1 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                  p.pass <= 3 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                  'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                }`}>Pass {p.pass}: {p.placed} blok {p.pass > 1 ? '(relaxed)' : ''}</span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
            <span>Total JP: <strong>{generateReport.total}</strong></span>
            <span>Berhasil: <strong className="text-emerald-600">{generateReport.generated}</strong></span>
            <span>Gagal: <strong className={generateReport.failed > 0 ? 'text-red-500' : 'text-emerald-600'}>{generateReport.failed}</strong></span>
          </div>
          {generateReport.failedBlocks > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <XCircle size={12} className="text-red-500" />
                <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                  {generateReport.failedBlocks} blok gagal ({generateReport.failed} JP)
                </p>
              </div>
              <details className="text-[10px]" open>
                <summary className="cursor-pointer text-red-500 font-semibold">Detail Blok Gagal — drag ke grid untuk menempatkan manual</summary>
                <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                  {generateReport.report?.failedDetails?.map((f: any, i: number) => (
                    <FailedBlockDraggable key={i} block={f} index={i} />
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Stats + Quality Score — hidden in fullscreen */}
      {!isFullscreen && <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-4 text-[11px] text-gray-400 py-1">
          <span>Total: <strong className="text-gray-700 dark:text-gray-200">{jadwal.length}</strong> slot</span>
          <span>Mapel: <strong className="text-gray-700 dark:text-gray-200">{uniqueSubjects.length}</strong></span>
          <span>Hari: <strong className="text-gray-700 dark:text-gray-200">{new Set(jadwal.map(j => j.dayOfWeek)).size}</strong></span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {jadwal.length > 0 && (
            <button
              onClick={async () => {
                try {
                  const res = await apiClient<any>(`/kbm/jadwal/score?academicYearId=${academicYearId}&semester=${semester}`);
                  setQualityScore(res);
                } catch {}
              }}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-500/20 font-semibold transition-all"
            >
              📊 Cek Kualitas
            </button>
          )}
          {jadwal.length > 0 && (
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh (Esc)' : 'Layar Penuh'}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#333] hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all flex items-center gap-1"
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {isFullscreen ? 'Keluar' : 'Layar Penuh'}
            </button>
          )}
        </div>
      </div>}

      {/* Quality Score Card */}
      {!isFullscreen && qualityScore && qualityScore.totalSlots > 0 && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/5 dark:to-purple-500/5 p-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-black text-violet-600 dark:text-violet-300">
              {qualityScore.percentage}%
            </div>
            <div className="text-[11px]">
              <div className="font-bold text-violet-700 dark:text-violet-200">
                Kualitas Jadwal {'⭐'.repeat(Math.min(5, Math.ceil(qualityScore.percentage / 20)))}
              </div>
              <div className="text-violet-500 dark:text-violet-400">
                {qualityScore.violations.length === 0 ? 'Sempurna — tidak ada pelanggaran soft constraint' : `${qualityScore.violations.length} pelanggaran (penalty: ${qualityScore.totalPenalty})`}
              </div>
            </div>
          </div>
          {Object.keys(qualityScore.summary).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(qualityScore.summary as Record<string, { count: number; totalPenalty: number; label: string }>).map(([key, v]) => (
                <span key={key} className="text-[9px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 font-medium">
                  {v.label}: {v.count}× (−{v.totalPenalty})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid Timetable */}
      {jadwal.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Zap size={32} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">Belum ada jadwal</p>
          <p className="text-[11px] mt-1">Klik "Generate Jadwal" untuk membuat jadwal otomatis dari distribusi jam</p>
        </div>
      ) : (
        <>
          <div ref={fullscreenRef} className={`overflow-auto rounded-xl border border-gray-200 dark:border-[#222] transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-0 z-[9999] bg-white dark:bg-[#111] rounded-none border-0'
              : 'max-h-[calc(100vh-320px)]'
          }`}>
            {/* Fullscreen header bar */}
            {isFullscreen && (
              <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500">
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-white" />
                  <span className="text-white font-bold text-sm">Jadwal KBM — Layar Penuh</span>
                  <span className="text-white/70 text-[11px]">{jadwal.length} slot • {uniqueSubjects.length} mapel</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-[10px]">Tekan ESC untuk keluar</span>
                  <button onClick={toggleFullscreen} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all">
                    <Minimize2 size={14} />
                  </button>
                </div>
              </div>
            )}
            {/* Fullscreen: failed blocks panel */}
            {isFullscreen && generateReport?.failedBlocks > 0 && (
              <div className="sticky top-[44px] z-20 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-500/30 px-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle size={12} className="text-red-500" />
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400">{generateReport.failedBlocks} blok gagal — drag ke grid</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {generateReport.report?.failedDetails?.map((f: any, i: number) => (
                    <FailedBlockDraggable key={i} block={f} index={i} />
                  ))}
                </div>
              </div>
            )}
            <table className="w-full border-collapse text-[11px]">
              <thead className={`sticky z-20 ${isFullscreen ? (generateReport?.failedBlocks > 0 ? 'top-[108px]' : 'top-[44px]') : 'top-0'}`}>
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
                        <DroppableCell key={day} day={day} jam={jam}>
                          {slots.length === 0 ? (
                            <div className={`h-14 rounded-lg border border-dashed transition-all ${activeDrag ? 'border-blue-300 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-500/5' : 'border-gray-100 dark:border-[#222]'}`} />
                          ) : (
                            <div className="space-y-0.5">
                              {slots.map(slot => (
                                <DraggableSlot key={slot.id} slot={slot} colorClass={subjectColorMap.get(slot.subjectId) || SUBJECT_COLORS[0]} viewMode={viewMode} canEdit={canEdit} onDelete={handleDeleteSlot} />
                              ))}
                            </div>
                          )}
                        </DroppableCell>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Drag Overlay */}
          <DragOverlay dropAnimation={null}>
            {activeDrag?.type === 'existing-slot' && activeDrag.slot && (
              <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/80 px-2 py-1.5 shadow-xl text-[11px] min-w-[100px] opacity-90">
                <div className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                  <ArrowLeftRight size={10} /> {activeDrag.slot.subjectNama}
                </div>
                <div className="text-[9px] text-amber-600 dark:text-amber-300">{activeDrag.slot.guruName} • {activeDrag.slot.kelasName}</div>
              </div>
            )}
            {activeDrag?.type === 'failed-block' && activeDrag.block && (
              <div className="rounded-lg border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/80 px-2 py-1.5 shadow-xl text-[11px] min-w-[100px] opacity-90">
                <div className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-1">
                  <MapPin size={10} /> {activeDrag.block.kode}. {activeDrag.block.subject}
                </div>
                <div className="text-[9px] text-blue-600 dark:text-blue-300">{activeDrag.block.size} JP</div>
              </div>
            )}
          </DragOverlay>
        </>
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

      {/* SSE Progress Modal */}
      {generating && generateProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] p-6 w-[420px] max-w-[90vw] space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Zap size={20} className="text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">Generating Jadwal</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {{init: '📦 Memuat Data', scheduling: '🧩 Penjadwalan', optimizing: '⚡ Optimasi', saving: '💾 Menyimpan', done: '✅ Selesai'}[generateProgress.phase] || generateProgress.phase}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 rounded-full bg-gray-100 dark:bg-[#222] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
                  style={{ width: `${generateProgress.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{generateProgress.detail}</span>
                <span className="font-mono font-bold">{generateProgress.progress}%</span>
              </div>
            </div>

            {/* Phase Steps */}
            <div className="flex items-center gap-1 text-[9px]">
              {['init', 'scheduling', 'optimizing', 'saving', 'done'].map((ph, i) => {
                const phases = ['init', 'scheduling', 'optimizing', 'saving', 'done'];
                const currentIdx = phases.indexOf(generateProgress.phase);
                const isActive = i === currentIdx;
                const isDone = i < currentIdx;
                return (
                  <div key={ph} className="flex items-center gap-1">
                    {i > 0 && <div className={`w-4 h-0.5 ${isDone ? 'bg-amber-400' : 'bg-gray-200 dark:bg-[#333]'}`} />}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all ${isDone ? 'bg-amber-400 text-white' : isActive ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 ring-2 ring-amber-400 animate-pulse' : 'bg-gray-100 dark:bg-[#222] text-gray-400'}`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
      {/* Manual Placement Modal */}
      {manualBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setManualBlock(null)}>
          <div className="bg-white dark:bg-[#161616] rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" /> Tempatkan Manual
              </h3>
              <button onClick={() => setManualBlock(null)} className="text-gray-400 hover:text-gray-600 text-lg">{"\u2715"}</button>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4 text-[12px]">
              <p className="font-semibold text-blue-800 dark:text-blue-200">{manualBlock.kode}. {manualBlock.subject} ({manualBlock.size} JP)</p>
              <p className="text-blue-600 dark:text-blue-300 mt-0.5 text-[11px]">Pilih slot yang tersedia di bawah ini</p>
            </div>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> Memuat slot...</div>
            ) : availableSlots.length === 0 && swapSlots.length === 0 && otherSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-[12px]">
                <XCircle size={24} className="mx-auto mb-2 opacity-30" />
                <p>Tidak ada slot tersedia</p>
                <p className="text-[10px] mt-1">Guru dan kelas sudah penuh di semua jam</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableSlots.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-2">{"\u2705"} Slot Langsung Tersedia</p>
                    <div className="space-y-2">
                      {[1,2,3,4,5,6].map(day => {
                        const ds = availableSlots.filter((s) => s.dayOfWeek === day);
                        if (ds.length === 0) return null;
                        return (
                          <div key={day}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{DAY_NAMES[day]}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ds.map((s) => (
                                <button key={`${s.dayOfWeek}-${s.jamKe}`} disabled={placingBlock}
                                  onClick={async () => {
                                    setPlacingBlock(true);
                                    try {
                                      await apiClient<any>('/kbm/jadwal/manual-place', { method: 'POST', data: { academicYearId, semester, guruId: manualBlock.guruId, kelasId: manualBlock.kelasId, subjectId: manualBlock.subjectId, dayOfWeek: s.dayOfWeek, jamKe: s.jamKe } });
                                      toast.success(`${manualBlock.kode}. ${manualBlock.subject} \u2192 ${DAY_NAMES[s.dayOfWeek]} jam ${s.jamKe}`);
                                      if (generateReport) {
                                        const nf = [...generateReport.report.failedDetails];
                                        const idx = nf.findIndex((f) => f.guruId === manualBlock.guruId && f.kelasId === manualBlock.kelasId && f.subject === manualBlock.subject);
                                        if (idx >= 0) nf.splice(idx, 1);
                                        setGenerateReport({ ...generateReport, report: { ...generateReport.report, failedDetails: nf }, failedBlocks: nf.length, failed: nf.reduce((a, f) => a + f.size, 0), generated: generateReport.generated + 1 });
                                      }
                                      setManualBlock(null); loadData();
                                    } catch (err) { toast.error((err as any).response?.data?.error || 'Gagal menempatkan'); }
                                    setPlacingBlock(false);
                                  }}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all"
                                >Jam {s.jamKe}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {swapSlots.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">{"\u26A0\uFE0F"} Kelas Kosong, Tapi Guru Sibuk</p>
                    <p className="text-[10px] text-gray-400 mb-2">Pindahkan jadwal guru di kelas lain terlebih dahulu, lalu tempatkan blok ini</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {swapSlots.slice(0, 20).map((s, i) => (
                        <div key={i} className="text-[10px] px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 text-amber-800 dark:text-amber-300">
                          <span className="font-semibold">{s.dayName} jam {s.jamKe}</span> {"\u2014"} guru mengajar di <span className="font-semibold">{s.blockedByKelasName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {otherSlots.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-1">{"\uD83D\uDCCB"} Slot Kosong di Kelas Lain (Guru Free)</p>
                    <p className="text-[10px] text-gray-400 mb-2">Kelas-kelas lain yang punya jam kosong saat guru ini tersedia</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {otherSlots.map((s: any, i: number) => (
                        <div key={i} className="text-[10px] px-2 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 text-purple-800 dark:text-purple-300">
                          <span className="font-semibold">{s.dayName} jam {s.jamKe}</span> {"\u2014"} <span className="font-semibold">{s.kelasName}</span> kosong
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </DndContext>
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
