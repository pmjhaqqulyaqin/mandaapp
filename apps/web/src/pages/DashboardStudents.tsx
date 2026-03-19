import React, { useState, useEffect } from 'react';
import { Card } from '@mandaapp/ui/src/components/Card';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Upload, Printer } from 'lucide-react';
import { apiClient } from '../lib/api';

export const DashboardStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // If user is a teacher, API should ideally filter. For now we pass all.
      // E.g., const res = await apiClient<any[]>(`/students${user?.role === 'teacher' ? '?classId=...' : ''}`);
      const studentsData = await apiClient<any[]>('/students');
      setStudents(studentsData);
    } catch (error) {
      console.error('Failed to fetch students', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient<{message:string}>('/students/upload', {
        method: 'POST',
        body: formData
      } as any);
      alert(res.message || 'Import berhasil!');
      fetchStudents();
    } catch (error: any) {
      console.error('Failed to import', error);
      alert('Gagal import: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      // reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">Data Siswa</h1>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
            Kelola data siswa, import dari Excel, dan cetak kartu pelajar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            id="excel-upload" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => document.getElementById('excel-upload')?.click()}
            disabled={loading}
          >
            <Upload size={18} /> Import Excel
          </Button>
          <Button variant="outline" className="flex items-center gap-2 text-primary border-primary hover:bg-primary/10">
            <Printer size={18} /> Cetak Kartu
          </Button>
          <Button className="flex items-center gap-2">
            <UserPlus size={18} /> Tambah Siswa
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
          <Input placeholder="Cari NISN atau Nama..." className="max-w-xs" />
        </div>
        <div className="min-h-[300px] flex items-center justify-center text-gray-500">
          {loading ? 'Memuat data...' : (
            <div className="w-full overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a] text-sm text-text-secondary">
                    <th className="pb-3 px-4 font-medium">Nama Siswa</th>
                    <th className="pb-3 px-4 font-medium">NISN / NIS</th>
                    <th className="pb-3 px-4 font-medium">Kelas</th>
                    <th className="pb-3 px-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} className="border-b border-gray-50 dark:border-[#222]">
                      <td className="py-3 px-4">{student.fullName || '-'}</td>
                      <td className="py-3 px-4">{student.nisn}</td>
                      <td className="py-3 px-4">{student.className || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">Belum ada data siswa.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
