import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Upload, Printer, Download, Edit2, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiClient, API_BASE_URL } from '../lib/api';

export const DashboardStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [majorsList, setMajorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ show: false, percent: 0 });
  
  // Add Student State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    nisn: '',
    nis: '',
    className: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    address: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchMajors();
  }, [user]);

  const fetchMajors = async () => {
    try {
      const mjrData = await apiClient<any[]>('/majors');
      setMajorsList(mjrData);
    } catch (e) {
      console.error('Failed to fetch majors');
    }
  };

  const fetchClasses = async () => {
    try {
      const clsData = await apiClient<any[]>('/classes');
      setClassesList(clsData);
    } catch (e) {
      console.error('Failed to fetch classes');
    }
  };

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
    setUploadProgress({ show: true, percent: 10 });
    const formData = new FormData();
    formData.append('file', file);

    // Simulated progress leading up to 90%
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => ({ 
        show: true, 
        percent: prev.percent >= 90 ? 90 : prev.percent + 15 
      }));
    }, 300);

    try {
      const res = await apiClient<{message:string}>('/students/upload', {
        method: 'POST',
        body: formData
      } as any);
      
      clearInterval(progressInterval);
      setUploadProgress({ show: true, percent: 100 });
      
      setTimeout(() => {
        alert(res.message || 'Import berhasil!');
        setUploadProgress({ show: false, percent: 0 });
        fetchStudents();
      }, 500);
      
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadProgress({ show: false, percent: 0 });
      console.error('Failed to import', error);
      alert('Gagal import: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleEditClick = (student: any) => {
    setFormData({
      fullName: student.fullName || '',
      nisn: student.nisn || '',
      nis: student.nis || '',
      className: student.className || '',
      gender: student.gender || '',
      birthPlace: student.birthPlace || '',
      birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
      address: student.address || ''
    });
    setEditId(student.id);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await apiClient(`/students/${editId}`, { method: 'PUT', data: formData });
        alert('Data siswa berhasil diupdate!');
      } else {
        await apiClient('/students', { method: 'POST', data: formData });
        alert('Siswa berhasil ditambahkan!');
      }
      setIsAddModalOpen(false);
      setEditId(null);
      setFormData({ fullName: '', nisn: '', nis: '', className: '', gender: '', birthPlace: '', birthDate: '', address: '' });
      fetchStudents();
    } catch (error: any) {
      alert(`Gagal ${editId ? 'mengupdate' : 'menambah'} siswa: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(!window.confirm(`Yakin ingin menghapus data siswa ${name}?`)) return;
    setLoading(true);
    try {
      await apiClient(`/students/${id}`, { method: 'DELETE' });
      alert('Data siswa berhasil dihapus.');
      fetchStudents();
    } catch (error: any) {
      alert('Gagal menghapus siswa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    window.location.href = `${API_BASE_URL}/students/template`;
  };

  const handleExportExcel = () => {
    const data = students.map((student, idx) => {
      const classObj = classesList.find(c => c.id === student.classId);
      const majorName = classObj ? majorsList.find(m => m.id === classObj.majorId)?.name : '';
      const kelasLabel = classObj ? (majorName ? `${classObj.name} - ${majorName}` : classObj.name) : (student.className || '-');

      return {
        'No': idx + 1,
        'Nama Lengkap': student.fullName || '-',
        'NISN': student.nisn || '-',
        'NIS': student.nis || '-',
        'Kelas': kelasLabel,
        'Jenis Kelamin': student.gender || '-',
        'Tempat Lahir': student.birthPlace || '-',
        'Tanggal Lahir': student.birthDate ? new Date(student.birthDate).toLocaleDateString('id-ID') : '-',
        'Alamat': student.address || '-'
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "Data_Siswa.xlsx");
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
            onClick={downloadTemplate}
          >
            <Download size={18} /> Download Template
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => document.getElementById('excel-upload')?.click()}
            disabled={loading}
          >
            <Upload size={18} /> Import Excel
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleExportExcel}
            title="Export ke format Excel"
          >
            <FileSpreadsheet size={18} className="text-emerald-500" /> Export Excel
          </Button>
          <Button variant="outline" className="flex items-center gap-2 text-primary border-primary hover:bg-primary/10">
            <Printer size={18} /> Cetak Kartu
          </Button>
          <Button className="flex items-center gap-2" onClick={() => {
            setEditId(null);
            setFormData({ fullName: '', nisn: '', nis: '', className: '', gender: '', birthPlace: '', birthDate: '', address: '' });
            setIsAddModalOpen(true);
          }}>
            <UserPlus size={18} /> Tambah Siswa
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] overflow-hidden">
        {uploadProgress.show && (
          <div className="w-full bg-gray-200 dark:bg-[#333] h-1.5">
            <div className="bg-primary h-1.5 transition-all duration-300" style={{ width: `${uploadProgress.percent}%` }} />
          </div>
        )}
        <div className="p-4 border-b border-gray-100 dark:border-[#2a2a2a] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <select
            className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 min-w-[180px]"
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
          >
            <option value="">Semua Kelas</option>
            {classesList.map(c => {
              const majorName = majorsList.find(m => m.id === c.majorId)?.name || '';
              return <option key={c.id} value={c.id}>{c.name}{majorName ? ` - ${majorName}` : ''}</option>;
            })}
          </select>
          <Input 
            placeholder="Cari NISN atau Nama..." 
            className="max-w-xs ml-auto" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="min-h-[300px] flex items-center justify-center text-gray-500">
          {loading ? 'Memuat data...' : (
            <div className="w-full overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a] text-sm text-text-secondary">
                    <th className="pb-3 px-4 font-medium text-center w-10">No</th>
                    <th className="pb-3 px-4 font-medium">Nama Siswa</th>
                    <th className="pb-3 px-4 font-medium">NISN</th>
                    <th className="pb-3 px-4 font-medium">NIS</th>
                    <th className="pb-3 px-4 font-medium">TTL</th>
                    <th className="pb-3 px-4 font-medium">L/P</th>
                    <th className="pb-3 px-4 font-medium">Kelas</th>
                    <th className="pb-3 px-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(s => {
                      const matchClass = !filterClass || s.classId === filterClass;
                      const q = searchQuery.toLowerCase();
                      const matchSearch = !q || (s.fullName || '').toLowerCase().includes(q) || (s.nisn || '').includes(q);
                      return matchClass && matchSearch;
                    })
                    .map((student, idx) => {
                    const classObj = classesList.find(c => c.id === student.classId);
                    const majorName = classObj ? majorsList.find(m => m.id === classObj.majorId)?.name : '';
                    const kelasLabel = classObj ? (majorName ? `${classObj.name} - ${majorName}` : classObj.name) : (student.className || '-');
                    const ttl = [student.birthPlace, student.birthDate ? new Date(student.birthDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''].filter(Boolean).join(', ');
                    return (
                    <tr key={student.id} className="group border-b border-gray-50 dark:border-[#222]">
                      <td className="py-3 px-4 text-center text-text-secondary">{idx + 1}</td>
                      <td className="py-3 px-4">{student.fullName || '-'}</td>
                      <td className="py-3 px-4">{student.nisn || '-'}</td>
                      <td className="py-3 px-4">{student.nis || '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{ttl || '-'}</td>
                      <td className="py-3 px-4">{student.gender === 'Laki-laki' ? 'L' : student.gender === 'Perempuan' ? 'P' : '-'}</td>
                      <td className="py-3 px-4">{kelasLabel}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(student)} className="text-blue-500 hover:text-blue-700" title="Edit Siswa"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(student.id, student.fullName)} className="text-red-500 hover:text-red-700" title="Hapus Siswa"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {students.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">Belum ada data siswa.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditId(null); }} title={editId ? "Edit Data Siswa" : "Tambah Data Siswa Spesifik"}>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nama Lengkap*</label>
              <Input required placeholder="Budi Santoso" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">NISN*</label>
              <Input required placeholder="1234567890" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">NIS</label>
              <Input placeholder="1001" value={formData.nis} onChange={e => setFormData({...formData, nis: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Kelas</label>
              <select 
                className="w-full flex h-10 w-full rounded-md border border-input bg-background dark:bg-background-dark dark:border-border-dark px-3 py-2 text-sm text-text-primary dark:text-text-darkPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                value={formData.className} 
                onChange={e => setFormData({...formData, className: e.target.value})}
              >
                <option value="">-- Pilih Kelas --</option>
                {classesList.map(c => {
                  const majorName = majorsList.find(m => m.id === c.majorId)?.name || 'Tanpa Jurusan';
                  return <option key={c.id} value={c.name}>{c.name} {majorName}</option>;
                })}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Jenis Kelamin</label>
              <select 
                className="w-full flex h-10 w-full rounded-md border border-input bg-background dark:bg-background-dark dark:border-border-dark px-3 py-2 text-sm text-text-primary dark:text-text-darkPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                value={formData.gender} 
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="">-- Pilih --</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tempat Lahir</label>
              <Input placeholder="Jakarta" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Tanggal Lahir</label>
              <Input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Alamat</label>
              <Input placeholder="Jl. Raya..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
            <Button type="button" variant="ghost" onClick={() => { setIsAddModalOpen(false); setEditId(null); }}>Batal</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Siswa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
