import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { apiClient } from '../lib/api';

export const DashboardClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // States for Adding Major
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [majorForm, setMajorForm] = useState({ name: '' });

  // States for Adding Class
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', majorId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clsRes, mjrRes] = await Promise.all([
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/majors')
      ]);
      setClasses(clsRes);
      setMajors(mjrRes);
    } catch (error) {
      console.error('Failed to fetch classes or majors', error);
    } finally {
      setLoading(false);
    }
  };

  const handeAddMajor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient('/majors', { method: 'POST', data: majorForm });
      alert('Jurusan berhasil ditambahkan!');
      setIsMajorModalOpen(false);
      setMajorForm({ name: '' });
      fetchData();
    } catch (error: any) {
      alert('Gagal menambah jurusan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handeAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient('/classes', { method: 'POST', data: classForm });
      alert('Kelas berhasil ditambahkan!');
      setIsClassModalOpen(false);
      setClassForm({ name: '', majorId: '' });
      fetchData();
    } catch (error: any) {
      alert('Gagal menambah kelas: ' + error.message);
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
            <Button size="sm" onClick={() => setIsMajorModalOpen(true)}>Tambah Jurusan</Button>
          </div>
          {loading ? <p className="text-gray-500">Memuat...</p> : (
            <ul className="space-y-2">
              {majors.map(m => (
                <li key={m.id} className="p-3 border rounded-lg flex justify-between">{m.name}</li>
              ))}
              {majors.length === 0 && <li className="text-gray-400 text-sm">Belum ada jurusan</li>}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Kelas</h2>
            <Button size="sm" onClick={() => setIsClassModalOpen(true)}>Tambah Kelas</Button>
          </div>
          {loading ? <p className="text-gray-500">Memuat...</p> : (
            <ul className="space-y-2">
              {classes.map(c => (
                <li key={c.id} className="p-3 border rounded-lg flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-xs text-gray-500">Wali: {c.homeroomTeacherId || 'Belum di-assign'}</span>
                </li>
              ))}
              {classes.length === 0 && <li className="text-gray-400 text-sm">Belum ada kelas</li>}
            </ul>
          )}
        </div>
      </div>

      <Modal isOpen={isMajorModalOpen} onClose={() => setIsMajorModalOpen(false)} title="Tambah Jurusan Baru">
        <form onSubmit={handeAddMajor} className="space-y-4">
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

      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title="Tambah Kelas Baru">
        <form onSubmit={handeAddClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Kelas*</label>
            <Input required placeholder="X RPL 1" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Pilih Jurusan*</label>
            <select 
              required
              className="w-full flex h-10 w-full rounded-md border border-input bg-background dark:bg-background-dark dark:border-border-dark px-3 py-2 text-sm text-text-primary dark:text-text-darkPrimary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={classForm.majorId} 
              onChange={e => setClassForm({ ...classForm, majorId: e.target.value })}
            >
              <option value="" disabled>Pilih Jurusan...</option>
              {majors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
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
