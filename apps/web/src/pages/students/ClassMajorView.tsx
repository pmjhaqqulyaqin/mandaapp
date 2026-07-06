import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Edit2, Trash2, Plus, CalendarOff, ShieldAlert, Check, HelpCircle, X, Save, Loader2 } from 'lucide-react';
import type { ClassItem } from './types';
import { DataTableToolbar } from '../../components/DataTableToolbar';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';

type SlotStatus = 'available' | 'conditional' | 'unavailable';
const DAY_SHORT: Record<number, string> = { 1: 'Se', 2: 'Se', 3: 'Ra', 4: 'Ka', 5: 'Ju', 6: 'Sa' };

interface Props {
  classes: ClassItem[];
  teachers: any[];
  students: any[];
  loading: boolean;
  onRefresh: () => void;
  apiClient: any;
  isAdmin?: boolean;
  onViewDetails?: (grade: string) => void;
}

// Get grade level from class name (e.g., "XI IPA 1" → "XI")
const getGradeLevel = (name: string): string => {
  const n = name.trim().toUpperCase();
  if (n.startsWith('XII')) return 'XII';
  if (n.startsWith('XI')) return 'XI';
  if (n.startsWith('X')) return 'X';
  return name;
};

const GRADE_COLORS: Record<string, string> = {
  'X': 'from-blue-500 to-blue-600',
  'XI': 'from-emerald-500 to-emerald-600',
  'XII': 'from-amber-500 to-amber-600',
};

export const ClassMajorView: React.FC<Props> = ({ classes, teachers, students, onRefresh, apiClient: apiClientProp, isAdmin, onViewDetails }) => {
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ id: '', name: '', homeroomTeacherId: '' });
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [saving, setSaving] = useState(false);

  // Waktu Kosong modal state
  const [waktuKosongClass, setWaktuKosongClass] = useState<ClassItem | null>(null);
  const [gridData, setGridData] = useState<Map<string, SlotStatus>>(new Map());
  const [gridLoading, setGridLoading] = useState(false);
  const [gridSaving, setGridSaving] = useState(false);
  const [gridDirty, setGridDirty] = useState(false);
  const [maxJam, setMaxJam] = useState(8);

  // Pembatasan modal state
  const [pembatasanClass, setPembatasanClass] = useState<ClassItem | null>(null);
  const [pembatasanForm, setPembatasanForm] = useState({
    lunchBreakStart: null as number | null,
    lunchBreakEnd: null as number | null,
    minLessonsPerDay: null as number | null,
    maxLessonsPerDay: null as number | null,
    numTeachingDays: null as number | null,
  });
  const [pembatasanSaving, setPembatasanSaving] = useState(false);

  // Load max jam from time slots
  useEffect(() => {
    apiClient<any[]>('/jurnal/time-slots').then(ts => {
      const allJams = ts.map((t: any) => t.jamKe);
      if (allJams.length > 0) setMaxJam(Math.max(...allJams));
    }).catch(() => {});
  }, []);

  // Group classes by grade level
  const gradeGroups = classes.reduce<Record<string, ClassItem[]>>((acc, cls) => {
    const level = getGradeLevel(cls.name);
    if (!acc[level]) acc[level] = [];
    acc[level].push(cls);
    return acc;
  }, {});

  // Count students per grade
  const studentCountByGrade = (grade: string) => {
    const classIds = (gradeGroups[grade] || []).map(c => c.id);
    return students.filter(s => classIds.includes(s.classId)).length;
  };

  // Count students per class
  const studentCountByClass = (classId: string) => {
    return students.filter(s => s.classId === classId).length;
  };

  // Handlers
  const openClassModal = (cls?: ClassItem) => {
    if (cls) { setIsEditingClass(true); setClassForm({ id: cls.id, name: cls.name, homeroomTeacherId: cls.homeroomTeacherId || '' }); }
    else { setIsEditingClass(false); setClassForm({ id: '', name: '', homeroomTeacherId: '' }); }
    setIsClassModalOpen(true);
  };

  const submitClass = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const data: any = { name: classForm.name };
    if (classForm.homeroomTeacherId) data.homeroomTeacherId = classForm.homeroomTeacherId;
    try {
      if (isEditingClass) await apiClientProp(`/classes/${classForm.id}`, { method: 'PUT', data });
      else await apiClientProp('/classes', { method: 'POST', data });
      setIsClassModalOpen(false); onRefresh();
    } catch (err: any) { alert('Gagal: ' + err.message); }
    finally { setSaving(false); }
  };

  const deleteClass = async (id: string, name: string) => {
    if (!isAdmin) {
      alert('Fitur hapus dinonaktifkan untuk role Anda.');
      return;
    }
    const count = studentCountByClass(id);
    if (count > 0) { alert(`Tidak bisa hapus "${name}" karena masih memiliki ${count} siswa aktif.`); return; }
    if (!window.confirm(`Hapus kelas "${name}"?`)) return;
    try { await apiClientProp(`/classes/${id}`, { method: 'DELETE' }); onRefresh(); }
    catch (err: any) { alert('Gagal: ' + err.message); }
  };

  // ═══ Waktu Kosong Handlers ═══════════════════════════════════════════════

  const openWaktuKosong = async (cls: ClassItem) => {
    setWaktuKosongClass(cls);
    setGridLoading(true);
    setGridDirty(false);
    try {
      const data = await apiClient<any[]>(`/classes/${cls.id}/slot-availability`);
      const map = new Map<string, SlotStatus>();
      for (const d of data) {
        map.set(`${d.dayOfWeek}-${d.jamKe}`, d.status as SlotStatus);
      }
      setGridData(map);
    } catch {
      setGridData(new Map());
    } finally {
      setGridLoading(false);
    }
  };

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
      const jams = Array.from({ length: maxJam }, (_, i) => i + 1);
      const statuses = jams.map(j => next.get(`${day}-${j}`) || 'available');
      const allAvailable = statuses.every(s => s === 'available');
      const newStatus: SlotStatus = allAvailable ? 'unavailable' : 'available';
      for (const jam of jams) {
        if (newStatus === 'available') next.delete(`${day}-${jam}`);
        else next.set(`${day}-${jam}`, newStatus);
      }
      return next;
    });
    setGridDirty(true);
  };

  const handleBatchToggleJam = (jam: number) => {
    setGridData(prev => {
      const next = new Map(prev);
      const days = [1, 2, 3, 4, 5, 6];
      const statuses = days.map(d => next.get(`${d}-${jam}`) || 'available');
      const allAvailable = statuses.every(s => s === 'available');
      const newStatus: SlotStatus = allAvailable ? 'unavailable' : 'available';
      for (const day of days) {
        if (newStatus === 'available') next.delete(`${day}-${jam}`);
        else next.set(`${day}-${jam}`, newStatus);
      }
      return next;
    });
    setGridDirty(true);
  };

  const handleSetAll = () => {
    setGridData(new Map());
    setGridDirty(true);
  };

  const handleSaveAvailability = async () => {
    if (!waktuKosongClass) return;
    setGridSaving(true);
    try {
      const slots: { dayOfWeek: number; jamKe: number; status: string }[] = [];
      for (const [key, status] of gridData) {
        const [day, jam] = key.split('-').map(Number);
        slots.push({ dayOfWeek: day, jamKe: jam, status });
      }
      await apiClient(`/classes/${waktuKosongClass.id}/slot-availability/bulk`, {
        method: 'POST',
        data: { slots },
      });
      setGridDirty(false);
      toast.success('Waktu kosong disimpan');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setGridSaving(false);
    }
  };

  // ═══ Pembatasan Handlers ═════════════════════════════════════════════════

  const openPembatasan = (cls: ClassItem) => {
    setPembatasanClass(cls);
    setPembatasanForm({
      lunchBreakStart: cls.lunchBreakStart ?? null,
      lunchBreakEnd: cls.lunchBreakEnd ?? null,
      minLessonsPerDay: cls.minLessonsPerDay ?? null,
      maxLessonsPerDay: cls.maxLessonsPerDay ?? null,
      numTeachingDays: cls.numTeachingDays ?? null,
    });
  };

  const handleSavePembatasan = async () => {
    if (!pembatasanClass) return;
    setPembatasanSaving(true);
    try {
      await apiClient(`/classes/${pembatasanClass.id}`, {
        method: 'PUT',
        data: pembatasanForm,
      });
      toast.success('Pembatasan disimpan');
      setPembatasanClass(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pembatasan');
    } finally {
      setPembatasanSaving(false);
    }
  };

  const gradeOrder = ['X', 'XI', 'XII'];
  const sortedGrades = Object.keys(gradeGroups).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

  const days = [1, 2, 3, 4, 5, 6].map(d => ({ key: d, shortLabel: DAY_SHORT[d] }));
  const jams = Array.from({ length: maxJam }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Daftar Kelas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Daftar Kelas</h2>
          </div>
          <Button size="sm" className="flex items-center gap-1.5" onClick={() => openClassModal()}>
            <Plus size={14} /> Tambah Kelas
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedGrades.map(grade => {
            const classesInGrade = gradeGroups[grade];
            const count = studentCountByGrade(grade);
            const rombel = classesInGrade.length;
            const gradientClass = GRADE_COLORS[grade] || 'from-gray-500 to-gray-600';
            const labels: Record<string, string> = { 'X': 'Kelas Sepuluh', 'XI': 'Kelas Sebelas', 'XII': 'Kelas Dua Belas' };
            return (
              <div key={grade} className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-3 hover:shadow-md transition-all duration-300 group">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${gradientClass} text-white font-bold text-xs mb-2.5`}>
                  {grade}
                </div>
                <h3 className="font-semibold text-text-primary dark:text-text-darkPrimary text-[13px] leading-snug">{labels[grade] || `Kelas ${grade}`}</h3>
                <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  {count} Total Siswa
                </p>
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100 dark:border-[#222]">
                  <span className="text-[9.5px] font-semibold text-primary uppercase tracking-wider">{rombel} ROMBEL</span>
                  <button className="text-[11.5px] text-primary font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onViewDetails?.(grade)}>Detail Kelas</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Kelas List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-emerald-500 rounded-full" />
          <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Semua Kelas Terdaftar</h2>
        </div>
        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
          <div className="px-3 pt-3">
            <DataTableToolbar
              data={classes.map(cls => ({ ...cls, studentCount: studentCountByClass(cls.id), gradeLevel: getGradeLevel(cls.name) }))}
              columns={[
                { header: 'Nama Kelas', key: 'name' },
                { header: 'Wali Kelas', key: 'homeroomTeacherName', transform: (v) => v || '-' },
                { header: 'Jumlah Siswa', key: 'studentCount', transform: (v) => String(v) },
                { header: 'Tingkat', key: 'gradeLevel' },
              ]}
              fileName="Daftar_Kelas"
              title="Daftar Kelas"
              entriesPerPage={classes.length}
              onEntriesPerPageChange={() => {}}
              totalEntries={classes.length}
            />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#222] text-[9.5px] uppercase tracking-wider text-text-secondary">
                <th className="py-2.5 px-3 font-semibold">No</th>
                <th className="py-2.5 px-3 font-semibold">Nama Kelas</th>
                <th className="py-2.5 px-3 font-semibold">Wali Kelas</th>
                <th className="py-2.5 px-3 font-semibold">Jumlah Siswa</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, idx) => {
                const count = studentCountByClass(cls.id);
                const maxStudents = Math.max(...classes.map(c => studentCountByClass(c.id)), 1);
                const pct = Math.round((count / maxStudents) * 100);
                return (
                  <tr key={cls.id} className="group border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                    <td className="py-2 px-3 text-[11px] text-text-secondary font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 text-[13px] font-semibold text-primary">{cls.name}</td>
                    <td className="py-2 px-3 text-[12px] text-text-secondary">{cls.homeroomTeacherName || '-'}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-medium text-text-primary dark:text-text-darkPrimary min-w-[60px]">{count} Siswa</span>
                        <div className="flex-1 max-w-[120px] bg-gray-200 dark:bg-[#222] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openClassModal(cls)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-blue-500 transition-colors" title="Edit"><Edit2 size={13} /></button>
                        <button onClick={() => openWaktuKosong(cls)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-amber-500 transition-colors" title="Waktu Kosong"><CalendarOff size={13} /></button>
                        <button onClick={() => openPembatasan(cls)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-violet-500 transition-colors" title="Pembatasan"><ShieldAlert size={13} /></button>
                        <button onClick={() => deleteClass(cls.id, cls.name)} disabled={!isAdmin} className={`p-1 rounded-md transition-colors ${isAdmin ? 'hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-red-500' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'}`} title={isAdmin ? "Hapus" : "Akses Ditolak"}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {classes.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-xs">Belum ada kelas terdaftar</td></tr>}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-[#222] text-xs text-text-secondary">
            Menampilkan {classes.length} dari {classes.length} Kelas Terdaftar
          </div>
        </div>
      </div>

      {/* Class Modal */}
      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title={isEditingClass ? "Edit Kelas" : "Tambah Kelas Baru"}>
        <form onSubmit={submitClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Kelas+Jurusan *</label>
            <Input required placeholder="Contoh: XI IPA, X-4, XII IPS 1" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
            <p className="text-[10px] text-text-secondary mt-1">Tulis langsung nama kelas beserta jurusannya, misal: XI IPA, X-4, XII IPS 1</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Wali Kelas (Opsional)</label>
            <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={classForm.homeroomTeacherId} onChange={e => setClassForm({ ...classForm, homeroomTeacherId: e.target.value })}>
              <option value="">-- Kosongkan --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
            <Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Kelas'}</Button>
          </div>
        </form>
      </Modal>

      {/* ═══ Modal: Waktu Kosong Kelas ═══════════════════════════════════════ */}
      {waktuKosongClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-[#222]">
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100 dark:border-[#222]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarOff size={16} className="text-amber-500" />
                  Waktu Kosong — {waktuKosongClass.name}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Atur slot waktu yang tersedia untuk kelas ini. Klik sel untuk toggle status.
                </p>
              </div>
              <button onClick={() => { if (gridDirty && !confirm('Perubahan belum disimpan. Tutup?')) return; setWaktuKosongClass(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleSetAll} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all">
                  <Check size={12} className="inline mr-1" /> Set Semua
                </button>
                <button onClick={handleSaveAvailability} disabled={gridSaving || !gridDirty} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 disabled:opacity-40 transition-all">
                  {gridSaving ? <><Loader2 size={12} className="animate-spin inline" /> Menyimpan...</> : <><Save size={12} className="inline" /> Simpan</>}
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
                          <th key={jam} onClick={() => handleBatchToggleJam(jam)} className="px-1 py-2.5 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-[#222] min-w-[44px] cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all">
                            {jam}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day, dayIdx) => (
                        <tr key={day.key} className={`border-t ${dayIdx === 0 ? 'border-gray-200 dark:border-[#333]' : 'border-gray-100 dark:border-[#1a1a1a]'}`}>
                          <td onClick={() => handleBatchToggleDay(day.key)} className={`px-2 py-1.5 text-center text-[11px] font-bold border-r border-gray-200 dark:border-[#333] select-none cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all ${day.key === 5 ? 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-500/5' : 'text-gray-500 dark:text-gray-400'}`}>
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
                              <td key={jam} onClick={() => handleCellChange(day.key, jam, status === 'available' ? 'conditional' : status === 'conditional' ? 'unavailable' : 'available')} className="px-0.5 py-0.5 text-center border-r border-gray-50 dark:border-[#1a1a1a] cursor-pointer">
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
                <p className="text-gray-400 dark:text-gray-500 ml-auto">Klik sel untuk mengatur. Klik header hari/jam untuk toggle seluruh baris/kolom.</p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-[#222] flex justify-end">
              <Button variant="outline" onClick={() => { if (gridDirty && !confirm('Perubahan belum disimpan. Tutup?')) return; setWaktuKosongClass(null); }}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Pembatasan Kelas ═════════════════════════════════════════ */}
      {pembatasanClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-200 dark:border-[#222]">
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100 dark:border-[#222]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert size={16} className="text-violet-500" />
                  Pembatasan — {pembatasanClass.name}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Atur constraint penjadwalan untuk kelas ini.</p>
              </div>
              <button onClick={() => setPembatasanClass(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-5 space-y-5">
              {/* Lunch break interval */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Istirahat Siang (Lunch)</label>
                <p className="text-[10px] text-gray-400">Interval jam pelajaran untuk istirahat siang</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pembatasanForm.lunchBreakStart ?? ''}
                    onChange={e => setPembatasanForm(f => ({ ...f, lunchBreakStart: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Dari jam ke-"
                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                  <span className="text-gray-400 text-sm">—</span>
                  <input
                    type="number"
                    value={pembatasanForm.lunchBreakEnd ?? ''}
                    onChange={e => setPembatasanForm(f => ({ ...f, lunchBreakEnd: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Sampai jam ke-"
                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-[#222]" />

              {/* Min/Max lessons per day */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min / Maks Jumlah Pelajaran per Hari</label>
                <p className="text-[10px] text-gray-400">Number of lessons per day must be in this interval</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-gray-400 font-medium">Min</span>
                    <input
                      type="number"
                      value={pembatasanForm.minLessonsPerDay ?? ''}
                      onChange={e => setPembatasanForm(f => ({ ...f, minLessonsPerDay: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="0"
                      className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                  <span className="text-gray-400 text-sm mt-5">—</span>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-gray-400 font-medium">Maks</span>
                    <input
                      type="number"
                      value={pembatasanForm.maxLessonsPerDay ?? ''}
                      onChange={e => setPembatasanForm(f => ({ ...f, maxLessonsPerDay: e.target.value ? Number(e.target.value) : null }))}
                      placeholder={String(maxJam)}
                      className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-[#222]" />

              {/* Number of teaching days */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah Hari Mengajar per Minggu</label>
                <p className="text-[10px] text-gray-400">Set the number of days in which the class should have lessons</p>
                <select
                  value={pembatasanForm.numTeachingDays ?? ''}
                  onChange={e => setPembatasanForm(f => ({ ...f, numTeachingDays: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  <option value="">— Tidak diatur —</option>
                  {[1, 2, 3, 4, 5, 6].map(d => (
                    <option key={d} value={d}>{d} hari</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-[#222] flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPembatasanClass(null)}>Batal</Button>
              <Button onClick={handleSavePembatasan} disabled={pembatasanSaving} className="bg-violet-500 hover:bg-violet-600">
                {pembatasanSaving ? <><Loader2 size={14} className="animate-spin mr-2" /> Menyimpan...</> : <><Save size={14} className="mr-2" /> Simpan</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
