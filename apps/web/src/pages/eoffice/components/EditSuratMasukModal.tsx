import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';

interface EditSuratMasukModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  surat: any | null;
}

export const EditSuratMasukModal = ({ isOpen, onClose, onSuccess, surat }: EditSuratMasukModalProps) => {
  const [formData, setFormData] = useState({
    pengirim: '',
    nomorSuratAsli: '',
    perihal: ''
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && surat) {
      setFormData({
        pengirim: surat.pengirim || '',
        nomorSuratAsli: surat.nomorSuratAsli || '',
        perihal: surat.perihal || ''
      });
    }
  }, [isOpen, surat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surat) return;
    setLoading(true);
    try {
      await apiClient(`/eoffice/surat-masuk/${surat.id}`, { method: 'PUT', data: formData });
      toast.success('Data surat berhasil diperbarui!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Gagal memperbarui data surat');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Edit Data Surat Masuk</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form id="edit-masuk-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            form="edit-masuk-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-70"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
};
