import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, Filter, Save, X, AlertCircle 
} from 'lucide-react';
import { Button, Input, Badge } from '@mandaapp/ui';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';

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
}

export const DashboardSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  useEffect(() => {
    fetchSubjects();
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
          body: payload
        });
        toast.success('Mata pelajaran diperbarui');
      } else {
        await apiClient('/subjects', {
          method: 'POST',
          body: payload
        });
        toast.success('Mata pelajaran ditambahkan');
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan mata pelajaran');
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.nama.toLowerCase().includes(search.toLowerCase()) || 
    s.kode.toLowerCase().includes(search.toLowerCase()) ||
    (s.kelompok && s.kelompok.toLowerCase().includes(search.toLowerCase()))
  );

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
                filteredSubjects.map(subject => (
                  <tr key={subject.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-primary">{subject.kode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{subject.nama}</div>
                      {(subject.isHeavy || subject.allowSingleSplit) && (
                        <div className="flex gap-1 mt-1">
                          {subject.isHeavy && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded">Heavy</span>}
                          {subject.allowSingleSplit && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded">Single Split</span>}
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
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingSubject(subject); setIsModalOpen(true); }}>
                          <Edit2 size={14} className="text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(subject.id)}>
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
    </div>
  );
};
