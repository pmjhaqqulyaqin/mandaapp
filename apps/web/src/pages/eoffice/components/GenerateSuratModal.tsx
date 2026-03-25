import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';

interface GenerateSuratModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nomorLengkap: string) => void;
}

export const GenerateSuratModal = ({ isOpen, onClose, onSuccess }: GenerateSuratModalProps) => {
  const [jenisSurats, setJenisSurats] = useState<any[]>([]);
  const [selectedJenis, setSelectedJenis] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    jenisSuratId: '',
    derajatKode: 'B',
    kodeSatker: 'MA.18.07',
    kkaKode: '',
    perihal: '',
    tujuan: ''
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch jenis surat templates
      apiClient<any>('/eoffice/jenis-surat', { method: 'GET' }).then((res: any) => {
        const dataArray = Array.isArray(res) ? res : res.data || [];
        setJenisSurats(dataArray);
        if (dataArray.length > 0) {
          const defaultSelect = dataArray[0];
          setSelectedJenis(defaultSelect);
          setFormData(f => ({ ...f, jenisSuratId: defaultSelect.id }));
        }
      }).catch((err: any) => toast.error('Gagal mengambil template surat'));
    }
  }, [isOpen]);

  const handleJenisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const js = jenisSurats.find(j => j.id === e.target.value);
    setSelectedJenis(js);
    setFormData(f => ({ ...f, jenisSuratId: js.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient<{nomorLengkap: string}>('/eoffice/surat-keluar/generate', { method: 'POST', data: formData });
      toast.success('Nomor berhasil diamankan!');
      onSuccess(res.nomorLengkap); // Because apiClient unwraps data if we look at typical setups, wait I will check api.ts
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal generate nomor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Ambil Nomor Surat Baru</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form id="generate-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Surat</label>
              <select 
                className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                value={formData.jenisSuratId}
                onChange={handleJenisChange}
                required
              >
                {jenisSurats.map(js => (
                  <option key={js.id} value={js.id}>{js.namaJenis} ({js.kodeJenis})</option>
                ))}
              </select>
            </div>

            {selectedJenis?.butuhDerajat && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Derajat Pengamanan</label>
                <select 
                  className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={formData.derajatKode}
                  onChange={e => setFormData({...formData, derajatKode: e.target.value})}
                >
                  <option value="B">Biasa (B)</option>
                  <option value="R">Rahasia (R)</option>
                  <option value="SR">Sangat Rahasia (SR)</option>
                </select>
              </div>
            )}

            {selectedJenis?.butuhKka && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Klasifikasi Arsip (KKA)</label>
                <input 
                  type="text"
                  placeholder="Contoh: PP.00.6 atau KP.01.2"
                  className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={formData.kkaKode}
                  onChange={e => setFormData({...formData, kkaKode: e.target.value})}
                  required={selectedJenis?.butuhKka}
                />
              </div>
            )}

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

            <div className="transition-all">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tujuan (Opsional)</label>
              <input 
                type="text"
                placeholder="Kepada Yth..."
                className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50"
                value={formData.tujuan}
                onChange={e => setFormData({...formData, tujuan: e.target.value})}
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
            form="generate-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-70"
          >
            {loading ? 'Generating...' : 'Generate Nomor'}
          </button>
        </div>
      </div>
    </div>
  );
};
