import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { apiClient } from '../lib/api';
import { Edit2, Trash2 } from 'lucide-react';

export const DashboardClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // States for Adding/Editing Major
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [majorForm, setMajorForm] = useState({ id: '', name: '' });
  const [isEditingMajor, setIsEditingMajor] = useState(false);

  // States for Adding/Editing Class
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ id: '', name: '', majorId: '', homeroomTeacherId: '' });
  const [isEditingClass, setIsEditingClass] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clsRes, mjrRes, tchRes] = await Promise.all([
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/majors'),
        apiClient<any[]>('/employees?type=Guru')
      ]);
      setClasses(clsRes);
      setMajors(mjrRes);
      setTeachers(tchRes);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const openMajorModal = (major?: any) => {
    if (major) {
      setIsEditingMajor(true);
      setMajorForm({ id: major.id, name: major.name });
    } else {
      setIsEditingMajor(false);
      setMajorForm({ id: '', name: '' });
    }
    setIsMajorModalOpen(true);
  };

  const handeSubmitMajor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditingMajor) {
        await apiClient(`/majors/${majorForm.id}`, { method: 'PUT', data: { name: majorForm.name } });
        alert('Jurusan berhasil diperbarui!');
      } else {
        await apiClient('/majors', { method: 'POST', data: { name: majorForm.name } });
        alert('Jurusan berhasil ditambahkan!');
      }
      setIsMajorModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert('Gagal menyimpan jurusan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMajor = async (id: string, name: string) => {
    if(!window.confirm(`Yakin ingin menghapus jurusan ${name}? Data kelas yang terkait mungkin akan hilang.`)) return;
    setLoading(true);
    try {
      await apiClient(`/majors/${id}`, { method: 'DELETE' });
      alert('Jurusan dihapus.');
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openClassModal = (cls?: any) => {
    if (cls) {
      setIsEditingClass(true);
      setClassForm({ id: cls.id, name: cls.name, majorId: cls.majorId, homeroomTeacherId: cls.homeroomTeacherId || '' });
    } else {
      setIsEditingClass(false);
      setClassForm({ id: '', name: '', majorId: '', homeroomTeacherId: '' });
    }
    setIsClassModalOpen(true);
  };

  const handeSubmitClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const dataToSend = { ...classForm };
    if (!dataToSend.homeroomTeacherId) delete (dataToSend as any).homeroomTeacherId;

    try {
      if (isEditingClass) {
        await apiClient(`/classes/${classForm.id}`, { method: 'PUT', data: dataToSend });
        alert('Kelas berhasil diperbarui!');
      } else {
        await apiClient('/classes', { method: 'POST', data: dataToSend });
        alert('Kelas berhasil ditambahkan!');
      }
      setIsClassModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert('Gagal menyimpan kelas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if(!window.confirm(`Yakin ingin menghapus kelas ${name}? Data siswa di kelas ini akan kehilangan referensi.`)) return;
    setLoading(true);
    try {
      await apiClient(`/classes/${id}`, { method: 'DELETE' });
      alert('Kelas dihapus.');
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">Pengaturan Kelas & Jurusan</h1>
        <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
          Kelola data jurusan, daftar kelas, dan penugasan Wali Kelas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Jurusan</h2>
            <Button size="sm" onClick={() => openMajorModal()}>Tambah Jurusan</Button>
          </div>
          {loading ? <p className="text-gray-500">Memuat...</p> : (
            <ul className="space-y-2">
              {majors.map(m => (
                <li key={m.id} className="p-3 border rounded-lg flex justify-between items-center group">
                  <span>{m.name}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openMajorModal(m)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteMajor(m.id, m.name)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
              {majors.length === 0 && <li className="text-gray-400 text-sm">Belum ada jurusan</li>}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Kelas</h2>
            <Button size="sm" onClick={() => openClassModal()}>Tambah Kelas</Button>
          </div>
          {loading ? <p className="text-gray-500">Memuat...</p> : (
            <ul className="space-y-2">
              {classes.map(c => (
                <li key={c.id} className="p-3 border rounded-lg flex justify-between items-center group">
                  <div>
                    <span className="block font-medium text-text-primary dark:text-text-darkPrimary">
                      {c.name} <span className="font-normal text-text-secondary text-sm">{majors.find(m => m.id === c.majorId)?.name || 'Tanpa Jurusan'}</span>
                    </span>
                    <span className="text-xs text-gray-500">Wali: {c.homeroomTeacherName || 'Belum di-assign'}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openClassModal(c)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteClass(c.id, c.name)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
              {classes.length === 0 && <li className="text-gray-400 text-sm">Belum ada kelas</li>}
            </ul>
          )}
        </div>
      </div>

      <Modal isOpen={isMajorModalOpen} onClose={() => setIsMajorModalOpen(false)} title={isEditingMajor ? "Edit Jurusan" : "Tambah Jurusan Baru"}>
        <form onSubmit={handeSubmitMajor} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Jurusan*</label>
            <Input required placeholder="Rekayasa Perangkat Lunak" value={majorForm.name} onChange={e => setMajorForm({ ...majorForm, name: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
            <Button type="button" variant="ghost" onClick={() => setIsMajorModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Jurusan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title={isEditingClass ? "Edit Kelas" : "Tambah Kelas Baru"}>
        <form onSubmit={handeSubmitClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Kelas*</label>
            <Input required placeholder="X RPL 1" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Pilih Jurusan*</label>
            <select 
              required
              className="w-full flex h-10 w-full rounded-md border border-input bg-background dark:bg-background-dark dark:border-border-dark px-3 py-2 text-sm text-text-primary dark:text-text-darkPrimary ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              value={classForm.majorId} 
              onChange={e => setClassForm({ ...classForm, majorId: e.target.value })}
            >
              <option value="" disabled>Pilih Jurusan...</option>
              {majors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Wali Kelas (Opsional)</label>
            <select 
              className="w-full flex h-10 w-full rounded-md border border-input bg-background dark:bg-background-dark dark:border-border-dark px-3 py-2 text-sm text-text-primary dark:text-text-darkPrimary ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              value={classForm.homeroomTeacherId} 
              onChange={e => setClassForm({ ...classForm, homeroomTeacherId: e.target.value })}
            >
              <option value="">-- Kosongkan (Belum ada) --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
            <Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Kelas'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
