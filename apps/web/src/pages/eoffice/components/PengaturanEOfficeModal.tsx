import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

interface PengaturanEOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PengaturanEOfficeModal = ({ isOpen, onClose }: PengaturanEOfficeModalProps) => {
  const [activeTab, setActiveTab] = useState<'jenis' | 'kka'>('jenis');
  
  // Data States
  const [jenisSurats, setJenisSurats] = useState<any[]>([]);
  const [kkas, setKkas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States (Jenis Surat)
  const [newJenis, setNewJenis] = useState({ namaJenis: '', kodeJenis: '', formatPenomoran: '{{nomor_urut}}/{{kode_satker}}/{{tahun}}', butuhKka: true, butuhDerajat: true });
  
  // Form States (KKA)
  const [newKka, setNewKka] = useState({ kode: '', keterangan: '' });

  const fetchData = async () => {
    try {
      const resJenis = await apiClient<any>('/eoffice/jenis-surat', { method: 'GET' });
      setJenisSurats(Array.isArray(resJenis) ? resJenis : resJenis.data || []);
      
      // Assume endpoint for KKA exists
      const resKka = await apiClient<any>('/eoffice/kka', { method: 'GET' });
      setKkas(Array.isArray(resKka) ? resKka : resKka.data || []);
    } catch (err: any) {
      console.log('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleAddJenis = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient('/eoffice/jenis-surat', { method: 'POST', data: newJenis });
      toast.success('Jenis Surat berhasil ditambah');
      setNewJenis({ namaJenis: '', kodeJenis: '', formatPenomoran: '{{nomor_urut}}/{{kode_satker}}/{{tahun}}', butuhKka: true, butuhDerajat: true });
      fetchData();
    } catch (error) {
      toast.error('Gagal menambah jenis surat');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKka = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient('/eoffice/kka', { method: 'POST', data: newKka });
      toast.success('KKA berhasil ditambah');
      setNewKka({ kode: '', keterangan: '' });
      fetchData();
    } catch (error) {
      toast.error('Gagal menambah KKA');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJenis = async (id: string) => {
    if (!confirm('Hapus jenis surat ini?')) return;
    try {
      await apiClient(`/eoffice/jenis-surat/${id}`, { method: 'DELETE' });
      toast.success('Jenis surat dihapus');
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus jenis surat');
    }
  };

  const handleDeleteKka = async (id: string) => {
    if (!confirm('Hapus KKA ini?')) return;
    try {
      await apiClient(`/eoffice/kka/${id}`, { method: 'DELETE' });
      toast.success('KKA dihapus');
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus KKA');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pengaturan E-Office</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 pt-2 gap-4">
          <button 
            className={`pb-2 font-medium ${activeTab === 'jenis' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('jenis')}
          >
            Jenis Surat & Template
          </button>
          <button 
            className={`pb-2 font-medium ${activeTab === 'kka' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('kka')}
          >
            Master KKA (Kode Klasifikasi)
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20">
          
          {activeTab === 'jenis' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <h4 className="font-semibold mb-3">Tambah Jenis Surat Baru</h4>
                <form onSubmit={handleAddJenis} className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Nama Surat (ex: Surat Edaran)" required value={newJenis.namaJenis} onChange={e=>setNewJenis({...newJenis, namaJenis:e.target.value})} className="col-span-1 p-2 border rounded-lg dark:bg-[#2a2a2a] dark:border-gray-700" />
                  <input type="text" placeholder="Kode (ex: SE)" required value={newJenis.kodeJenis} onChange={e=>setNewJenis({...newJenis, kodeJenis:e.target.value})} className="col-span-1 p-2 border rounded-lg dark:bg-[#2a2a2a] dark:border-gray-700" />
                  <input type="text" placeholder="Format: {{nomor_urut}}/{{kode_satker}}/{{tahun}}" required value={newJenis.formatPenomoran} onChange={e=>setNewJenis({...newJenis, formatPenomoran:e.target.value})} className="col-span-2 p-2 border rounded-lg dark:bg-[#2a2a2a] dark:border-gray-700" title="Token: {{nomor_urut}}, {{tahun}}, {{bulan}}, {{kode_satker}}, {{kka_kode}}, {{derajat}}" />
                  <div className="col-span-2 flex justify-end">
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"><Plus size={16}/> Tambah</button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr><th className="p-3">Nama Jenis</th><th className="p-3">Format Penomoran</th><th className="p-3">Aksi</th></tr>
                  </thead>
                  <tbody>
                    {jenisSurats.map(j => (
                      <tr key={j.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-3 font-medium">{j.namaJenis} <span className="text-gray-400">({j.kodeJenis})</span></td>
                        <td className="p-3 text-emerald-600 font-mono text-xs">{j.formatPenomoran}</td>
                        <td className="p-3 text-red-500"><button onClick={() => handleDeleteJenis(j.id)}><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'kka' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <h4 className="font-semibold mb-3">Tambah Master KKA</h4>
                <form onSubmit={handleAddKka} className="grid grid-cols-3 gap-3">
                  <input type="text" placeholder="Kode (ex: KP.01)" required value={newKka.kode} onChange={e=>setNewKka({...newKka, kode:e.target.value})} className="col-span-1 p-2 border rounded-lg dark:bg-[#2a2a2a] dark:border-gray-700" />
                  <input type="text" placeholder="Keterangan (ex: Kepegawaian)" required value={newKka.keterangan} onChange={e=>setNewKka({...newKka, keterangan:e.target.value})} className="col-span-2 p-2 border rounded-lg dark:bg-[#2a2a2a] dark:border-gray-700" />
                  <div className="col-span-3 flex justify-end">
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"><Plus size={16}/> Simpan</button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr><th className="p-3 w-1/4">Kode KKA</th><th className="p-3">Keterangan</th><th className="p-3 w-16">Aksi</th></tr>
                  </thead>
                  <tbody>
                    {kkas.map(k => (
                      <tr key={k.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-3 font-semibold">{k.kode}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">{k.keterangan}</td>
                        <td className="p-3 text-red-500"><button onClick={() => handleDeleteKka(k.id)}><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
