import React, { useState } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';

interface CatatSuratMasukModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CatatSuratMasukModal = ({ isOpen, onClose, onSuccess }: CatatSuratMasukModalProps) => {
  const [formData, setFormData] = useState({
    nomorSuratAsli: '',
    tanggalSurat: new Date().toISOString().split('T')[0],
    pengirim: '',
    perihal: '',
    sifat: 'Biasa',
    derajat: 'B'
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient<{nomorAgenda: string}>('/eoffice/surat-masuk', { method: 'POST', data: formData });
      toast.success('Surat Masuk berhasil diregistrasi!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Gagal meregistrasi surat masuk');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Catat Surat Masuk</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form id="masuk-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pengirim / Asal Surat</label>
              <input 
                type="text"
                placeholder="Instansi Pengirim..."
                className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                value={formData.pengirim}
                onChange={e => setFormData({...formData, pengirim: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor Surat Asli</label>
                <input 
                  type="text"
                  placeholder="Nomor dari pengirim"
                  className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={formData.nomorSuratAsli}
                  onChange={e => setFormData({...formData, nomorSuratAsli: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Surat</label>
                <input 
                  type="date"
                  className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={formData.tanggalSurat}
                  onChange={e => setFormData({...formData, tanggalSurat: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perihal / Tentang</label>
              <input 
                type="text"
                placeholder="Perihal surat..."
                className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                value={formData.perihal}
                onChange={e => setFormData({...formData, perihal: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sifat</label>
                <select 
                  className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={formData.sifat}
                  onChange={e => setFormData({...formData, sifat: e.target.value})}
                >
                  <option value="Biasa">Biasa</option>
                  <option value="Segera">Segera</option>
                  <option value="Sangat Segera">Sangat Segera</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keamanan</label>
                <select 
                  className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={formData.derajat}
                  onChange={e => setFormData({...formData, derajat: e.target.value})}
                >
                  <option value="B">Biasa</option>
                  <option value="R">Rahasia</option>
                  <option value="SR">Sangat Rahasia</option>
                </select>
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-[#1a1a1a]">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            Batal
          </button>
          <button 
            type="submit" 
            form="masuk-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-70"
          >
            {loading ? 'Menyimpan...' : 'Simpan & Generate Agenda'}
          </button>
        </div>
      </div>
    </div>
  );
};
