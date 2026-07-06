import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, Filter, Save, X, AlertCircle,
  CalendarOff, ShieldAlert, Check, HelpCircle, Loader2
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

const DAY_NAMES: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
const DAY_SHORT: Record<number, string> = { 1: 'Se', 2: 'Se', 3: 'Ra', 4: 'Ka', 5: 'Ju', 6: 'Sa' };

export const DashboardSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Waktu Kosong modal state
  const [waktuKosongSubject, setWaktuKosongSubject] = useState<Subject | null>(null);
  const [gridData, setGridData] = useState<Map<string, SlotStatus>>(new Map());
  const [gridLoading, setGridLoading] = useState(false);
  const [gridSaving, setGridSaving] = useState(false);
  const [gridDirty, setGridDirty] = useState(false);
  const [maxJam, setMaxJam] = useState(8);

  // Pembatasan modal state
  const [pembatasanSubject, setPembatasanSubject] = useState<Subject | null>(null);
  const [pembatasanForm, setPembatasanForm] = useState({
    doubleLessonsOverBreaks: false,
    canBeOverLunch: false,
    oncePerDay: false,
    isTemporary: false,
  });
  const [pembatasanSaving, setPembatasanSaving] = useState(false);

  useEffect(() => {
    fetchSubjects();
    // Load max jam from time slots
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
    } catch (error) {
      toast.error('Gagal menghapus mata pelajaran');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      kode: formData.get('kode') as string,
      nama: formData.get('nama') as string,
      shortName: formData.get('shortName') as string,
      kelompok: formData.get('kelompok') as string,
      isActive: formData.get('isActive') === 'on',
      maxJamKe: formData.get('maxJamKe') ? parseInt(formData.get('maxJamKe') as string) : null,
      minJamKe: formData.get('minJamKe') ? parseInt(formData.get('minJamKe') as string) : null,
      allowSingleSplit: formData.get('allowSingleSplit') === 'on',
      isHeavy: formData.get('isHeavy') === 'on',
    };

    try {
      if (editingSubject) {
        await apiClient(`/subjects/${editingSubject.id}`, {
          method: 'PUT',
          data: payload
        });
        toast.success('Mata pelajaran diperbarui');
      } else {
        await apiClient('/subjects', {
          method: 'POST',
          data: payload
        });
        toast.success('Mata pelajaran ditambahkan');
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan mata pelajaran');
    }
  };

  // ═══ Waktu Kosong Handlers ═══════════════════════════════════════════════

  const openWaktuKosong = async (subject: Subject) => {
    setWaktuKosongSubject(subject);
    setGridLoading(true);
    setGridDirty(false);
    try {
      const data = await apiClient<any[]>(`/subjects/${subject.id}/slot-availability`);
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
    if (!waktuKosongSubject) return;
    setGridSaving(true);
    try {
      const slots: { dayOfWeek: number; jamKe: number; status: string }[] = [];
      for (const [key, status] of gridData) {
        const [day, jam] = key.split('-').map(Number);
        slots.push({ dayOfWeek: day, jamKe: jam, status });
      }
      await apiClient(`/subjects/${waktuKosongSubject.id}/slot-availability/bulk`, {
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

  const openPembatasan = (subject: Subject) => {
    setPembatasanSubject(subject);
    setPembatasanForm({
      doubleLessonsOverBreaks: subject.doubleLessonsOverBreaks || false,
      canBeOverLunch: subject.canBeOverLunch || false,
      oncePerDay: subject.oncePerDay || false,
      isTemporary: subject.isTemporary || false,
    });
  };

  const handleSavePembatasan = async () => {
    if (!pembatasanSubject) return;
    setPembatasanSaving(true);
    try {
      await apiClient(`/subjects/${pembatasanSubject.id}`, {
        method: 'PUT',
        data: pembatasanForm,
      });
      toast.success('Pembatasan disimpan');
      setPembatasanSubject(null);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pembatasan');
    } finally {
      setPembatasanSaving(false);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.nama.toLowerCase().includes(search.toLowerCase()) || 
    s.kode.toLowerCase().includes(search.toLowerCase()) ||
    (s.kelompok && s.kelompok.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / entriesPerPage));
  const paginatedSubjects = filteredSubjects.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  const days = [1, 2, 3, 4, 5, 6].map(d => ({ key: d, label: DAY_NAMES[d], shortLabel: DAY_SHORT[d] }));
  const jams = Array.from({ length: maxJam }, (_, i) => i + 1);

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
        <Button onClick={() => { setEditingSubject(null); setIsModalOpen(true); }} className="gap-2">
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
                paginatedSubjects.map(subject => (
                  <tr key={subject.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-primary">{subject.kode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{subject.nama}</div>
                      {(subject.isHeavy || subject.allowSingleSplit || subject.oncePerDay || subject.isTemporary) && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {subject.isHeavy && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded">Heavy</span>}
                          {subject.allowSingleSplit && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded">Single Split</span>}
                          {subject.oncePerDay && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded">1×/hari</span>}
                          {subject.isTemporary && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded">Sementara</span>}
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingSubject(subject); setIsModalOpen(true); }} title="Edit">
                          <Edit2 size={14} className="text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openWaktuKosong(subject)} title="Waktu Kosong">
                          <CalendarOff size={14} className="text-amber-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openPembatasan(subject)} title="Pembatasan">
                          <ShieldAlert size={14} className="text-violet-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(subject.id)} title="Hapus">
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Modal: Tambah/Edit Mata Pelajaran ═══════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-gray-200 dark:border-[#222]">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 dark:border-[#222]">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Kode *</label>
                  <Input name="kode" required defaultValue={editingSubject?.kode || ''} placeholder="Contoh: PAI-A" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Singkatan</label>
                  <Input name="shortName" defaultValue={editingSubject?.shortName || ''} placeholder="Contoh: PAI" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Mata Pelajaran *</label>
                <Input name="nama" required defaultValue={editingSubject?.nama || ''} placeholder="Contoh: Pendidikan Agama Islam" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kelompok</label>
                <Input name="kelompok" defaultValue={editingSubject?.kelompok || 'Kelompok A (Umum)'} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-[#222]">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Max Jam Ke-</label>
                  <Input type="number" name="maxJamKe" defaultValue={editingSubject?.maxJamKe || ''} placeholder="Batasan atas jam" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Min Jam Ke-</label>
                  <Input type="number" name="minJamKe" defaultValue={editingSubject?.minJamKe || ''} placeholder="Batasan bawah jam" />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isActive" defaultChecked={editingSubject ? editingSubject.isActive : true} className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isHeavy" defaultChecked={editingSubject?.isHeavy} className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Heavy Subject (E.g. Matematika, Fisika)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="allowSingleSplit" defaultChecked={editingSubject?.allowSingleSplit} className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Izinkan Single Split (Boleh 1 Jam)</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-[#222]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  <Save size={16} className="mr-2" /> Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Modal: Waktu Kosong ═════════════════════════════════════════════ */}
      {waktuKosongSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-[#222]">
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100 dark:border-[#222]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarOff size={16} className="text-amber-500" />
                  Waktu Kosong — {waktuKosongSubject.nama}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Atur slot waktu yang tersedia untuk mapel ini. Klik sel untuk toggle status.
                </p>
              </div>
              <button onClick={() => { if (gridDirty && !confirm('Perubahan belum disimpan. Tutup?')) return; setWaktuKosongSubject(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSetAll}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                >
                  <Check size={12} className="inline mr-1" /> Set Semua
                </button>
                <button
                  onClick={handleSaveAvailability}
                  disabled={gridSaving || !gridDirty}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 disabled:opacity-40 transition-all"
                >
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
                  Klik sel untuk mengatur. Klik header hari/jam untuk toggle seluruh baris/kolom.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-[#222] flex justify-end">
              <Button variant="outline" onClick={() => { if (gridDirty && !confirm('Perubahan belum disimpan. Tutup?')) return; setWaktuKosongSubject(null); }}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Pembatasan ═══════════════════════════════════════════════ */}
      {pembatasanSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-200 dark:border-[#222]">
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100 dark:border-[#222]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert size={16} className="text-violet-500" />
                  Pembatasan — {pembatasanSubject.nama}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Atur constraint penjadwalan untuk mata pelajaran ini.
                </p>
              </div>
              <button onClick={() => setPembatasanSubject(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {/* Existing scheduling info (read-only display) */}
              <div className="rounded-xl bg-gray-50 dark:bg-[#0a0a0a] p-3 space-y-2 border border-gray-100 dark:border-[#222]">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Info Penjadwalan Saat Ini</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-gray-500">Min Jam Ke:</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{pembatasanSubject.minJamKe || '—'}</div>
                  <div className="text-gray-500">Max Jam Ke:</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{pembatasanSubject.maxJamKe || '—'}</div>
                  <div className="text-gray-500">Heavy Subject:</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{pembatasanSubject.isHeavy ? 'Ya' : 'Tidak'}</div>
                  <div className="text-gray-500">Single Split:</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{pembatasanSubject.allowSingleSplit ? 'Ya' : 'Tidak'}</div>
                </div>
              </div>

              {/* Pembatasan checkboxes */}
              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={pembatasanForm.doubleLessonsOverBreaks}
                    onChange={e => setPembatasanForm(f => ({ ...f, doubleLessonsOverBreaks: e.target.checked }))}
                    className="rounded border-gray-300 text-violet-500 focus:ring-violet-500 w-4 h-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Jam ganda boleh melewati istirahat panjang</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Doublelessons can span over 'long breaks'</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={pembatasanForm.canBeOverLunch}
                    onChange={e => setPembatasanForm(f => ({ ...f, canBeOverLunch: e.target.checked }))}
                    className="rounded border-gray-300 text-violet-500 focus:ring-violet-500 w-4 h-4 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Boleh dijadwalkan saat istirahat siang</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Can be over lunch</p>
                  </div>
                </label>

                <div className="border-t border-gray-100 dark:border-[#222] pt-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pembatasanForm.oncePerDay}
                      onChange={e => setPembatasanForm(f => ({ ...f, oncePerDay: e.target.checked }))}
                      className="rounded border-gray-300 text-violet-500 focus:ring-violet-500 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Hanya 1× per hari</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Ideal distribution — can be only once per day</p>
                    </div>
                  </label>
                </div>

                <div className="border-t border-gray-100 dark:border-[#222] pt-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pembatasanForm.isTemporary}
                      onChange={e => setPembatasanForm(f => ({ ...f, isTemporary: e.target.checked }))}
                      className="rounded border-gray-300 text-violet-500 focus:ring-violet-500 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Mata pelajaran sementara</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Temporary subject — tidak masuk jadwal permanen</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-[#222] flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPembatasanSubject(null)}>
                Batal
              </Button>
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
