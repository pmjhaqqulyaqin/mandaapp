import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Plus, Trash2, Key, CheckCircle, XCircle, Copy } from 'lucide-react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Badge } from '@mandaapp/ui/src/components/Badge';

interface IntegrationApp {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

export function IntegrationsPage() {
  const [apps, setApps] = useState<IntegrationApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAppName, setNewAppName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/integrations/admin/apps');
      setApps(res.data);
    } catch (error) {
      toast.error('Gagal mengambil data aplikasi integrasi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    
    try {
      setIsCreating(true);
      const res = await api.post('/integrations/admin/apps', { name: newAppName });
      setApps([...apps, res.data]);
      setNewAppName('');
      toast.success('Aplikasi integrasi berhasil dibuat');
    } catch (error) {
      toast.error('Gagal membuat aplikasi integrasi');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await api.put(`/integrations/admin/apps/${id}`, { isActive: !currentStatus });
      setApps(apps.map(app => app.id === id ? res.data : app));
      toast.success(`Aplikasi berhasil di${!currentStatus ? 'aktifkan' : 'nonaktifkan'}`);
    } catch (error) {
      toast.error('Gagal mengubah status aplikasi');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus aplikasi integrasi ini? API Key-nya tidak akan bisa digunakan lagi.')) return;
    
    try {
      await api.delete(`/integrations/admin/apps/${id}`);
      setApps(apps.filter(app => app.id !== id));
      toast.success('Aplikasi berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus aplikasi');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('API Key berhasil disalin ke clipboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manajemen Integrasi API</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola akses aplikasi pihak ketiga (seperti Aplikasi Absensi, Perpus) yang dapat menarik data dari sistem ini.
        </p>
      </div>

      {/* Form Tambah */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-medium mb-4">Daftarkan Aplikasi Baru</h3>
        <form onSubmit={handleCreate} className="flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Aplikasi Pihak Ketiga</label>
            <Input 
              value={newAppName} 
              onChange={e => setNewAppName(e.target.value)} 
              placeholder="Contoh: Aplikasi Absensi Fingerprint v2" 
              required
            />
          </div>
          <Button type="submit" disabled={isCreating || !newAppName.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Generate API Key
          </Button>
        </form>
      </div>

      {/* Tabel Daftar Aplikasi */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-medium">Daftar API Key Terdaftar</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : apps.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Belum ada aplikasi yang terdaftar. Silakan buat baru di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Nama Aplikasi</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">API Key</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Dibuat Tanggal</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {app.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700 select-all">
                          {app.apiKey}
                        </code>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => copyToClipboard(app.apiKey)}
                          title="Salin API Key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={app.isActive ? 'success' : 'default'}>
                        {app.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className={`p-1.5 rounded-md transition-colors ${app.isActive ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                          onClick={() => handleToggleStatus(app.id, app.isActive)}
                          title={app.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {app.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          onClick={() => handleDelete(app.id)}
                          title="Hapus Aplikasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Petunjuk Penggunaan */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
        <div className="flex gap-3">
          <Key className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-blue-900 font-medium">Panduan Integrasi (Untuk Programmer)</h4>
            <p className="text-sm text-blue-800 mt-1 mb-3">
              Gunakan API Key di atas pada header <code className="bg-blue-100 px-1 rounded">x-api-key</code> saat melakukan request ke endpoint MandaApp.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                <h5 className="font-semibold text-sm mb-2">Endpoint Tarik Pegawai</h5>
                <code className="block text-xs bg-gray-50 p-2 rounded border">
                  GET /api/integrations/v1/employees<br/>
                  ?last_sync=2026-08-15 (opsional)
                </code>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                <h5 className="font-semibold text-sm mb-2">Endpoint Tarik Siswa & Kelas</h5>
                <code className="block text-xs bg-gray-50 p-2 rounded border">
                  GET /api/integrations/v1/classes-students<br/>
                  ?last_sync=2026-08-15 (opsional)
                </code>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                <h5 className="font-semibold text-sm mb-2">Endpoint Tarik Presensi</h5>
                <code className="block text-xs bg-gray-50 p-2 rounded border">
                  GET /api/integrations/v1/attendances<br/>
                  ?last_sync=2026-08-15 (opsional)
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
