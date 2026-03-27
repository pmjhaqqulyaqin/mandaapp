import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Upload, Download, Edit2, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiClient, API_BASE_URL } from '../lib/api';

export const DashboardEmployees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ show: false, percent: 0 });
  
  // Add Employee State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    type: 'Guru',
    name: '',
    nip: '',
    rank: '',
    grade: '',
    position: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    task: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await apiClient<any[]>('/employees');
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadProgress({ show: true, percent: 10 });
    const uploadData = new FormData();
    uploadData.append('file', file);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => ({ 
        show: true, 
        percent: prev.percent >= 90 ? 90 : prev.percent + 15 
      }));
    }, 300);

    try {
      const res = await fetch(`${API_BASE_URL}/employees/upload`, {
        method: 'POST',
        body: uploadData
      });
      
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || responseData.message || 'Gagal import.');
      }
      
      clearInterval(progressInterval);
      setUploadProgress({ show: true, percent: 100 });
      
      setTimeout(() => {
        alert(responseData.message || 'Import berhasil!');
        setUploadProgress({ show: false, percent: 0 });
        fetchEmployees();
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

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ id: '', type: 'Guru', name: '', nip: '', rank: '', grade: '', position: '', gender: '', birthPlace: '', birthDate: '', task: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setIsEditing(true);
    setFormData({
      id: emp.id,
      type: emp.type || 'Guru',
      name: emp.name || '',
      nip: emp.nip || '',
      rank: emp.rank || '',
      grade: emp.grade || '',
      position: emp.position || '',
      gender: emp.gender || '',
      birthPlace: emp.birthPlace || '',
      birthDate: emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : '',
      task: emp.task || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if(!window.confirm(`Hapus pegawai ${name}?`)) return;
    setLoading(true);
    try {
      await apiClient(`/employees/${id}`, { method: 'DELETE' });
      alert('Pegawai dihapus');
      fetchEmployees();
    } catch(e: any) {
      alert('Gagal menghapus: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await apiClient(`/employees/${formData.id}`, { method: 'PUT', data: formData });
        alert('Pegawai berhasil diperbarui!');
      } else {
        await apiClient('/employees', { method: 'POST', data: formData });
        alert('Pegawai berhasil ditambahkan!');
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error: any) {
      alert('Gagal menyimpan pegawai: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    window.location.href = `${API_BASE_URL}/employees/template`;
  };

  const handleExportExcel = () => {
    const data = employees.map((emp, idx) => ({
      'No': idx + 1,
      'Jenis Pegawai': emp.type || '-',
      'Nama Lengkap': emp.name || '-',
      'NIP / NUPTK': emp.nip || '-',
      'Jenis Kelamin': emp.gender || '-',
      'Pangkat': emp.rank || '-',
      'Golongan': emp.grade || '-',
      'Nama Jabatan': emp.position || '-',
      'Tugas/Mapel': emp.task || '-',
      'Tempat Lahir': emp.birthPlace || '-',
      'Tanggal Lahir': emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('id-ID') : '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">Data Pegawai</h1>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
            Kelola data Guru dan Tenaga Kependidikan sekolah.
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
            onClick={handleExportExcel}
            title="Export ke format Excel"
          >
            <FileSpreadsheet size={18} className="text-emerald-500" /> Export Excel
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => document.getElementById('excel-upload')?.click()}
            disabled={loading}
          >
            <Upload size={18} /> Import Excel
          </Button>
          <Button className="flex items-center gap-2" onClick={openAddModal}>
            <UserPlus size={18} /> Tambah Pegawai
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
          <Input placeholder="Cari NIP atau Nama..." className="max-w-xs" />
        </div>
        <div className="min-h-[300px] flex items-center justify-center text-gray-500">
          {loading ? 'Memuat data...' : (
            <div className="w-full overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a] text-sm text-text-secondary">
                    <th className="pb-3 px-4 font-medium text-center w-10">No</th>
                    <th className="pb-3 px-4 font-medium">Nama/Jabatan</th>
                    <th className="pb-3 px-4 font-medium">NIP</th>
                    <th className="pb-3 px-4 font-medium">Jenis Pegawai</th>
                    <th className="pb-3 px-4 font-medium">Tugas</th>
                    <th className="pb-3 px-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={emp.id} className="border-b border-gray-50 dark:border-[#222] group hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3 px-4 text-center text-text-secondary">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-text-primary dark:text-text-darkPrimary">{emp.name}</div>
                        <div className="text-xs text-text-secondary">{emp.position || '-'}</div>
                      </td>
                      <td className="py-3 px-4">{emp.nip}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${emp.type === 'Guru' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                          {emp.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{emp.task || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(emp)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(emp.id, emp.name)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">Belum ada data pegawai.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {uploadProgress.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-[#111] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-[#222] w-full max-w-sm text-center">
            <h3 className="text-lg font-bold mb-4 text-text-primary dark:text-text-darkPrimary">Mengimpor Data Excel...</h3>
            <div className="w-full bg-gray-200 dark:bg-[#333] rounded-full h-4 mb-2 overflow-hidden">
              <div 
                className="bg-primary h-4 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress.percent}%` }}
              ></div>
            </div>
            <p className="text-sm font-medium text-gray-500">{uploadProgress.percent}% Selesai</p>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "Edit Data Pegawai" : "Tambah Pegawai Baru"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Jenis Pegawai*</label>
              <select 
                className="w-full flex h-10 w-full rounded-md border border-input bg-background dark:bg-background-dark dark:border-border-dark px-3 py-2 text-sm text-text-primary dark:text-text-darkPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Guru">Guru</option>
                <option value="Tenaga Kependidikan">Tenaga Kependidikan</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Nama Lengkap*</label>
              <Input required placeholder="Budi Santoso, M.Pd" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">NIP / NUPTK*</label>
              <Input required placeholder="1980..." value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} />
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
              <label className="text-sm font-medium">Pangkat</label>
              <Input placeholder="Penata Muda" value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Golongan</label>
              <Input placeholder="III/a" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nama Jabatan</label>
              <Input placeholder="Guru Kelas" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tugas/Mapel</label>
              <Input placeholder="Guru Matematika" value={formData.task} onChange={e => setFormData({...formData, task: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tempat Lahir</label>
              <Input placeholder="Jakarta" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tanggal Lahir</label>
              <Input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Pegawai'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
