import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, Save, X, AlertCircle,
  CalendarOff, ShieldAlert, Check, HelpCircle, Loader2,
  Settings2, Clock, Users, LayoutList, ChevronRight
} from 'lucide-react';
import { Button, Input, Badge } from '@mandaapp/ui';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { DataTableToolbar } from '../../components/DataTableToolbar';

interface Subject {
  id: string;
  kode: string;
  nama: string;
  shortName?: string;
  kelompok?: string;
  isActive: boolean;
  maxJamKe?: number;
  minJamKe?: number;
  allowSingleSplit?: boolean;
  isHeavy?: boolean;
  customSplitRule?: any;
  // Pembatasan fields
  doubleLessonsOverBreaks?: boolean;
  canBeOverLunch?: boolean;
  oncePerDay?: boolean;
  isTemporary?: boolean;
}

type SlotStatus = 'available' | 'conditional' | 'unavailable';
type DetailTab = 'umum' | 'penjadwalan' | 'waktu-kosong' | 'distribusi';

const DAY_NAMES: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
const DAY_SHORT: Record<number, string> = { 1: 'Se', 2: 'Sl', 3: 'Ra', 4: 'Ka', 5: 'Ju', 6: 'Sa' };

const TABS: { key: DetailTab; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'umum', label: 'Umum', icon: <LayoutList size={14} />, desc: 'Identitas mapel' },
  { key: 'penjadwalan', label: 'Penjadwalan', icon: <Settings2 size={14} />, desc: 'Aturan jadwal' },
  { key: 'waktu-kosong', label: 'Waktu Kosong', icon: <Clock size={14} />, desc: 'Slot availability' },
  { key: 'distribusi', label: 'Distribusi', icon: <Users size={14} />, desc: 'Guru & Kelas' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SubjectDetailDialog — Unified dialog ala aSc Timetables
// ═══════════════════════════════════════════════════════════════════════════════

interface SubjectDetailDialogProps {
  subject: Subject | null; // null = tambah baru
  isNew: boolean;
  maxJam: number;
  onClose: () => void;
  onSaved: () => void;
}

const SubjectDetailDialog = ({ subject, isNew, maxJam, onClose, onSaved }: SubjectDetailDialogProps) => {
  const [tab, setTab] = useState<DetailTab>('umum');
  const [saving, setSaving] = useState(false);

  // ─── Umum (form) ───
  const [form, setForm] = useState({
    kode: subject?.kode || '',
    nama: subject?.nama || '',
    shortName: subject?.shortName || '',
    kelompok: subject?.kelompok || 'Kelompok A (Umum)',
    isActive: subject?.isActive ?? true,
  });

  // ─── Penjadwalan ───
  const [sched, setSched] = useState({
    maxJamKe: subject?.maxJamKe ?? '',
    minJamKe: subject?.minJamKe ?? '',
    isHeavy: subject?.isHeavy || false,
    allowSingleSplit: subject?.allowSingleSplit || false,
    doubleLessonsOverBreaks: subject?.doubleLessonsOverBreaks || false,
    canBeOverLunch: subject?.canBeOverLunch || false,
    oncePerDay: subject?.oncePerDay || false,
    isTemporary: subject?.isTemporary || false,
  });

  // ─── Waktu Kosong ───
  const [gridData, setGridData] = useState<Map<string, SlotStatus>>(new Map());
  const [gridLoading, setGridLoading] = useState(false);
  const [gridDirty, setGridDirty] = useState(false);

  // ─── Distribusi ───
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [distribusiLoading, setDistribusiLoading] = useState(false);

  // Load waktu kosong when tab opens
  useEffect(() => {
    if (tab === 'waktu-kosong' && subject && gridData.size === 0 && !gridLoading) {
      setGridLoading(true);
      apiClient<any[]>(`/subjects/${subject.id}/slot-availability`)
        .then(data => {
          const map = new Map<string, SlotStatus>();
          for (const d of data) map.set(`${d.dayOfWeek}-${d.jamKe}`, d.status as SlotStatus);
          setGridData(map);
        })
        .catch(() => setGridData(new Map()))
        .finally(() => setGridLoading(false));
    }
  }, [tab, subject]);

  // Load distribusi when tab opens
  useEffect(() => {
    if (tab === 'distribusi' && subject && distribusi.length === 0 && !distribusiLoading) {
      setDistribusiLoading(true);
      // Fetch from all academic years - get list first, then distribusi for each
      apiClient<any[]>('/academic-years')
        .then(async (years) => {
          const activeYear = years.find((y: any) => y.isActive);
          if (!activeYear) { setDistribusi([]); return; }
          // Fetch distribusi for current year, both semesters
          const [ganjil, genap] = await Promise.all([
            apiClient<any[]>(`/kbm/distribusi?academicYearId=${activeYear.id}&semester=ganjil`).catch(() => []),
            apiClient<any[]>(`/kbm/distribusi?academicYearId=${activeYear.id}&semester=genap`).catch(() => []),
          ]);
          // Filter by this subject's kode
          const all = [...ganjil, ...genap].filter((d: any) => d.subjectKode === subject.kode || d.subjectId === subject.id);
          setDistribusi(all);
        })
        .catch(() => setDistribusi([]))
        .finally(() => setDistribusiLoading(false));
    }
  }, [tab, subject]);

  // Grid helpers
  const days = [1, 2, 3, 4, 5, 6].map(d => ({ key: d, label: DAY_NAMES[d], shortLabel: DAY_SHORT[d] }));
  const jams = Array.from({ length: maxJam }, (_, i) => i + 1);

  const handleCellChange = (day: number, jam: number, status: SlotStatus) => {
    setGridData(prev => {
      const next = new Map(prev);
      if (status === 'available') next.delete(`${day}-${jam}`);
      else next.set(`${day}-${jam}`, status);
      return next;
    });
    setGridDirty(true);
  };

  const handleBatchToggleDay = (day: number) => {
    setGridData(prev => {
      const next = new Map(prev);
      const allAvailable = jams.every(j => (next.get(`${day}-${j}`) || 'available') === 'available');
      for (const jam of jams) {
        if (allAvailable) next.set(`${day}-${jam}`, 'unavailable');
        else next.delete(`${day}-${jam}`);
      }
      return next;
    });
    setGridDirty(true);
  };

  const handleBatchToggleJam = (jam: number) => {
    setGridData(prev => {
      const next = new Map(prev);
      const ds = [1, 2, 3, 4, 5, 6];
      const allAvailable = ds.every(d => (next.get(`${d}-${jam}`) || 'available') === 'available');
      for (const day of ds) {
        if (allAvailable) next.set(`${day}-${jam}`, 'unavailable');
        else next.delete(`${day}-${jam}`);
      }
      return next;
    });
    setGridDirty(true);
  };

  const handleSetAll = () => { setGridData(new Map()); setGridDirty(true); };

  // ─── Save all ───
  const handleSave = async () => {
    if (!form.kode.trim() || !form.nama.trim()) {
      toast.error('Kode dan Nama wajib diisi');
      setTab('umum');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...sched,
        maxJamKe: sched.maxJamKe ? Number(sched.maxJamKe) : null,
        minJamKe: sched.minJamKe ? Number(sched.minJamKe) : null,
      };

      if (isNew) {
        await apiClient('/subjects', { method: 'POST', data: payload });
      } else {
        await apiClient(`/subjects/${subject!.id}`, { method: 'PUT', data: payload });
      }

      // Save waktu kosong if modified
      if (gridDirty && subject) {
        const slots: { dayOfWeek: number; jamKe: number; status: string }[] = [];
        for (const [key, status] of gridData) {
          const [day, jam] = key.split('-').map(Number);
          slots.push({ dayOfWeek: day, jamKe: jam, status });
        }
        await apiClient(`/subjects/${subject.id}/slot-availability/bulk`, {
          method: 'POST',
          data: { slots },
        });
      }

      toast.success(isNew ? 'Mata pelajaran ditambahkan' : 'Mata pelajaran diperbarui');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // Dirty check on close
  const handleClose = () => {
    if (gridDirty && !confirm('Perubahan waktu kosong belum disimpan. Tutup?')) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#222] flex flex-col max-h-[90vh]">
        {/* ═══ Header ═══ */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-[#222] bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-500/5 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {isNew ? 'Tambah Mata Pelajaran' : subject!.nama}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {isNew ? 'Buat mata pelajaran baru' : `Kode: ${subject!.kode} — Pengaturan lengkap`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ═══ Tab Nav ═══ */}
        <div className="flex border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#0c0c0c] overflow-x-auto">
          {TABS.filter(t => isNew ? t.key !== 'waktu-kosong' && t.key !== 'distribusi' : true).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-[12px] font-semibold transition-all border-b-2 whitespace-nowrap ${
                tab === t.key
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-[#111]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ Tab Content ═══ */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ─── Tab: Umum ─── */}
          {tab === 'umum' && (
            <div className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kode <span className="text-red-500">*</span></label>
                  <Input value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} placeholder="PAI-A" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Singkatan</label>
                  <Input value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value }))} placeholder="PAI" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama Mata Pelajaran <span className="text-red-500">*</span></label>
                <Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Pendidikan Agama Islam" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kelompok</label>
                <Input value={form.kelompok} onChange={e => setForm(f => ({ ...f, kelompok: e.target.value }))} placeholder="Kelompok A (Umum)" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status Aktif</span>
              </label>
            </div>
          )}

          {/* ─── Tab: Penjadwalan ─── */}
          {tab === 'penjadwalan' && (
            <div className="space-y-5 max-w-lg">
              {/* Jam constraints */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Batasan Jam</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Min Jam Ke-</label>
                    <Input
                      type="number"
                      value={sched.minJamKe}
                      onChange={e => setSched(s => ({ ...s, minJamKe: e.target.value as any }))}
                      placeholder="Batas bawah"
                    />
                    <p className="text-[10px] text-gray-400">Mapel tidak akan dijadwalkan sebelum jam ini</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Max Jam Ke-</label>
                    <Input
                      type="number"
                      value={sched.maxJamKe}
                      onChange={e => setSched(s => ({ ...s, maxJamKe: e.target.value as any }))}
                      placeholder="Batas atas"
                    />
                    <p className="text-[10px] text-gray-400">Mapel tidak akan dijadwalkan sesudah jam ini</p>
                  </div>
                </div>
              </div>

              {/* Karakteristik Mapel */}
              <div className="border-t border-gray-100 dark:border-[#222] pt-4">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Karakteristik Mapel</h4>
                <div className="space-y-3">
                  <ScheduleCheckbox
                    checked={sched.isHeavy}
                    onChange={v => setSched(s => ({ ...s, isHeavy: v }))}
                    label="Heavy Subject"
                    desc="Mapel berat (e.g. Matematika, Fisika) — prioritas di jam awal"
                    color="red"
                  />
                  <ScheduleCheckbox
                    checked={sched.allowSingleSplit}
                    onChange={v => setSched(s => ({ ...s, allowSingleSplit: v }))}
                    label="Izinkan Single Split"
                    desc="Boleh dijadwalkan 1 jam terpisah (tidak harus blok)"
                    color="blue"
                  />
                  <ScheduleCheckbox
                    checked={sched.oncePerDay}
                    onChange={v => setSched(s => ({ ...s, oncePerDay: v }))}
                    label="Hanya 1× per hari"
                    desc="Distribusi ideal — mapel hanya muncul sekali per hari"
                    color="purple"
                  />
                </div>
              </div>

              {/* Aturan Istirahat */}
              <div className="border-t border-gray-100 dark:border-[#222] pt-4">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Aturan Istirahat & Jeda</h4>
                <div className="space-y-3">
                  <ScheduleCheckbox
                    checked={sched.doubleLessonsOverBreaks}
                    onChange={v => setSched(s => ({ ...s, doubleLessonsOverBreaks: v }))}
                    label="Jam ganda boleh melewati istirahat"
                    desc="Doublelessons can span over long breaks"
                    color="amber"
                  />
                  <ScheduleCheckbox
                    checked={sched.canBeOverLunch}
                    onChange={v => setSched(s => ({ ...s, canBeOverLunch: v }))}
                    label="Boleh saat istirahat siang"
                    desc="Can be scheduled over lunch break"
                    color="amber"
                  />
                </div>
              </div>

              {/* Sementara */}
              <div className="border-t border-gray-100 dark:border-[#222] pt-4">
                <ScheduleCheckbox
                  checked={sched.isTemporary}
                  onChange={v => setSched(s => ({ ...s, isTemporary: v }))}
                  label="Mata pelajaran sementara"
                  desc="Temporary subject — tidak masuk jadwal permanen"
                  color="gray"
                />
              </div>
            </div>
          )}

          {/* ─── Tab: Waktu Kosong ─── */}
          {tab === 'waktu-kosong' && (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSetAll}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                >
                  <Check size={12} className="inline mr-1" /> Reset Semua (Tersedia)
                </button>
                {gridDirty && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Belum disimpan</span>
                )}
              </div>

              {/* Grid */}
              {gridLoading ? (
                <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#161616]">
                        <th className="px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 w-14 border-r border-gray-200 dark:border-[#333]" />
                        {jams.map(jam => (
                          <th
                            key={jam}
                            onClick={() => handleBatchToggleJam(jam)}
                            className="px-1 py-2.5 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-[#222] min-w-[44px] cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                          >
                            {jam}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day, dayIdx) => (
                        <tr key={day.key} className={`border-t ${dayIdx === 0 ? 'border-gray-200 dark:border-[#333]' : 'border-gray-100 dark:border-[#1a1a1a]'}`}>
                          <td
                            onClick={() => handleBatchToggleDay(day.key)}
                            className={`px-2 py-1.5 text-center text-[11px] font-bold border-r border-gray-200 dark:border-[#333] select-none cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all ${
                              day.key === 5 ? 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-500/5' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {day.shortLabel}
                          </td>
                          {jams.map(jam => {
                            const status = gridData.get(`${day.key}-${jam}`) || 'available';
                            const cfg = status === 'available'
                              ? { icon: <Check size={16} strokeWidth={3} />, bg: 'bg-emerald-50 dark:bg-emerald-500/15', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' }
                              : status === 'conditional'
                              ? { icon: <HelpCircle size={16} strokeWidth={2.5} />, bg: 'bg-amber-50 dark:bg-amber-500/15', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' }
                              : { icon: <X size={16} strokeWidth={3} />, bg: 'bg-red-50 dark:bg-red-500/15', border: 'border-red-200 dark:border-red-500/30', text: 'text-red-500 dark:text-red-400' };
                            return (
                              <td
                                key={jam}
                                onClick={() => handleCellChange(day.key, jam,
                                  status === 'available' ? 'conditional' : status === 'conditional' ? 'unavailable' : 'available'
                                )}
                                className="px-0.5 py-0.5 text-center border-r border-gray-50 dark:border-[#1a1a1a] cursor-pointer"
                              >
                                <div className={`flex items-center justify-center w-full h-9 rounded-lg border transition-all hover:scale-105 hover:shadow-sm active:scale-95 ${cfg.bg} ${cfg.border} ${cfg.text} text-sm`}>
                                  {cfg.icon}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-[10px]">
                <span className="text-gray-400">Keterangan :</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center justify-center w-5 h-5 rounded border bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><Check size={12} strokeWidth={3} /></div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Cocok</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center justify-center w-5 h-5 rounded border bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"><HelpCircle size={12} strokeWidth={2.5} /></div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Bersyarat</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center justify-center w-5 h-5 rounded border bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400"><X size={12} strokeWidth={3} /></div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Tidak tersedia</span>
                </div>
                <p className="text-gray-400 dark:text-gray-500 ml-auto">
                  Klik sel untuk toggle. Klik header hari/jam untuk toggle seluruh baris/kolom.
                </p>
              </div>
            </div>
          )}

          {/* ─── Tab: Distribusi (Read-Only) ─── */}
          {tab === 'distribusi' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50/50 dark:bg-amber-500/5 p-3 border border-amber-100 dark:border-amber-500/10">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Data distribusi bersumber dari <b>Distribusi Jam</b> di halaman KBM Settings. Untuk mengubah, silakan edit di sana.
                </p>
              </div>

              {distribusiLoading ? (
                <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
              ) : distribusi.length === 0 ? (
                <div className="py-10 text-center">
                  <Users size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">Belum ada distribusi jam untuk mapel ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#161616]">
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Guru</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Kelas</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-500 w-24">Jam/Pekan</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-500 w-24">Semester</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                      {distribusi.map((d: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{d.guruName || d.guruId}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{d.kelasName || d.kelasId}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {d.jumlahJam} JP
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 capitalize">{d.semester}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {distribusi.length > 0 && (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-[#222]">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{new Set(distribusi.map((d: any) => d.guruId || d.guruName)).size}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Guru</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-[#333]" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{new Set(distribusi.map((d: any) => d.kelasId || d.kelasName)).size}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Kelas</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-[#333]" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{distribusi.reduce((s: number, d: any) => s + (d.jumlahJam || 0), 0)}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Total JP</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/50 dark:bg-[#0c0c0c]">
          <div className="text-[10px] text-gray-400">
            {!isNew && subject && (
              <span>ID: {subject.id.slice(0, 8)}…</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="text-[12px]">
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="text-[12px] bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <><Loader2 size={14} className="animate-spin mr-2" /> Menyimpan...</> : <><Save size={14} className="mr-2" /> Simpan</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helper: Checkbox with label/desc for scheduling options ───
const ScheduleCheckbox = ({ checked, onChange, label, desc, color }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; desc: string; color: string;
}) => {
  const colorMap: Record<string, string> = {
    red: 'text-red-500 focus:ring-red-500',
    blue: 'text-blue-500 focus:ring-blue-500',
    purple: 'text-violet-500 focus:ring-violet-500',
    amber: 'text-amber-500 focus:ring-amber-500',
    gray: 'text-gray-500 focus:ring-gray-500',
  };
  return (
    <label className="flex items-start gap-3 cursor-pointer group p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className={`rounded border-gray-300 w-4 h-4 mt-0.5 ${colorMap[color] || colorMap.amber}`}
      />
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{label}</span>
        <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
      </div>
    </label>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// DashboardSubjects — Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export const DashboardSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Detail dialog state
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const [maxJam, setMaxJam] = useState(8);

  useEffect(() => {
    fetchSubjects();
    apiClient<any[]>('/jurnal/time-slots').then(ts => {
      const allJams = ts.map(t => t.jamKe);
      if (allJams.length > 0) setMaxJam(Math.max(...allJams));
    }).catch(() => {});
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await apiClient<Subject[]>('/subjects');
      setSubjects(data);
    } catch (error) {
      toast.error('Gagal memuat data mata pelajaran');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus mata pelajaran ini?')) return;
    try {
      await apiClient(`/subjects/${id}`, { method: 'DELETE' });
      toast.success('Mata pelajaran dihapus');
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus mata pelajaran');
    }
  };

  const openDetail = (subject: Subject | null) => {
    setDetailSubject(subject);
    setIsNew(!subject);
    setIsDetailOpen(true);
  };

  const filteredSubjects = subjects.filter(s => 
    s.nama.toLowerCase().includes(search.toLowerCase()) || 
    s.kode.toLowerCase().includes(search.toLowerCase()) ||
    (s.kelompok && s.kelompok.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / entriesPerPage));
  const paginatedSubjects = filteredSubjects.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  // Count active scheduling flags per subject for visual tags
  const getTags = (s: Subject) => {
    const tags: { label: string; color: string }[] = [];
    if (s.isHeavy) tags.push({ label: 'Heavy', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' });
    if (s.allowSingleSplit) tags.push({ label: 'Split', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' });
    if (s.oncePerDay) tags.push({ label: '1×/hari', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' });
    if (s.isTemporary) tags.push({ label: 'Sementara', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' });
    return tags;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-primary" />
            Master Mata Pelajaran
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Kelola data mata pelajaran terpusat untuk Ijazah, Jurnal, dan KBM.
          </p>
        </div>
        <Button onClick={() => openDetail(null)} className="gap-2">
          <Plus size={16} /> Tambah Mapel
        </Button>
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-[#222] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Cari mapel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* DataTable Toolbar */}
        <div className="px-4 pt-2">
          <DataTableToolbar
            data={filteredSubjects}
            columns={[
              { header: 'Kode', key: 'kode' },
              { header: 'Nama Mata Pelajaran', key: 'nama' },
              { header: 'Singkatan', key: 'shortName', transform: (v) => v || '-' },
              { header: 'Kelompok', key: 'kelompok', transform: (v) => v || '-' },
              { header: 'Status', key: 'isActive', transform: (v) => v ? 'Aktif' : 'Nonaktif' },
            ]}
            fileName="Master_Mapel"
            title="Master Mata Pelajaran"
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={(n) => { setEntriesPerPage(n); setPage(1); }}
            totalEntries={filteredSubjects.length}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#222] text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama Mata Pelajaran</th>
                <th className="px-4 py-3 font-medium">Singkatan</th>
                <th className="px-4 py-3 font-medium">Kelompok</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Memuat data...</td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Tidak ada mata pelajaran ditemukan.</td>
                </tr>
              ) : (
                paginatedSubjects.map(subject => {
                  const tags = getTags(subject);
                  return (
                    <tr
                      key={subject.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => openDetail(subject)}
                    >
                      <td className="px-4 py-3 font-medium text-primary">{subject.kode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{subject.nama}</div>
                        {tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {tags.map((t, i) => (
                              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.color}`}>{t.label}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{subject.shortName || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{subject.kelompok || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={subject.isActive ? 'success' : 'default'}>
                          {subject.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(subject)} title="Detail & Edit">
                            <Edit2 size={14} className="text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(subject.id)} title="Hapus">
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-[#222]">
            <p className="text-[11px] text-gray-400">
              Menampilkan {((page - 1) * entriesPerPage) + 1}–{Math.min(page * entriesPerPage, filteredSubjects.length)} dari {filteredSubjects.length}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                    page === p
                      ? 'bg-amber-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Subject Detail Dialog ═══ */}
      {isDetailOpen && (
        <SubjectDetailDialog
          subject={detailSubject}
          isNew={isNew}
          maxJam={maxJam}
          onClose={() => setIsDetailOpen(false)}
          onSaved={fetchSubjects}
        />
      )}
    </div>
  );
};
