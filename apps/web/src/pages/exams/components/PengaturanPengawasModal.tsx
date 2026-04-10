import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { X, UserPlus, Trash2, Hash, Type } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ujian: any;
  onSuccess: () => void;
}

export const PengaturanPengawasModal = ({ isOpen, onClose, ujian, onSuccess }: Props) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [group1, setGroup1] = useState<string[]>([]);
  const [group2, setGroup2] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      const config = ujian?.pengaturan || {};
      setGroup1(config.pengawasGroups?.group1 || []);
      setGroup2(config.pengawasGroups?.group2 || []);
    }
  }, [isOpen, ujian]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await apiClient<any[]>('/employees?status=active');
      setEmployees(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const newPengaturan = {
        ...(ujian.pengaturan || {}),
        pengawasGroups: { group1, group2 }
      };
      await apiClient(`/exams/${ujian.id}`, {
        method: 'PUT',
        data: { pengaturan: newPengaturan }
      });
      toast.success('Kelompok pengawas disimpan');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    }
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) &&
    !group1.includes(e.id) && !group2.includes(e.id)
  );

  const getEmpName = (id: string) => employees.find(e => e.id === id)?.name || 'Loading...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Settings Kelompok Pengawas</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employee Pool */}
          <div className="flex flex-col h-full border-r border-gray-100 dark:border-[#111] pr-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Daftar Pegawai Aktif</p>
            <div className="relative mb-3">
              <input 
                className="w-full h-8 pl-3 pr-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="Cari guru..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-auto space-y-1 min-h-[300px]">
              {filteredEmployees.map(e => (
                <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-black/20 group">
                  <span className="text-xs text-text-primary dark:text-text-darkPrimary truncate mr-2">{e.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setGroup1([...group1, e.id])} className="p-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100"><Hash size={12} /></button>
                    <button onClick={() => setGroup2([...group2, e.id])} className="p-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100"><Type size={12} /></button>
                  </div>
                </div>
              ))}
              {filteredEmployees.length === 0 && <p className="text-[10px] text-gray-400 text-center py-10">Tidak ada pegawai lain</p>}
            </div>
          </div>

          {/* Group 1 (Numeric) */}
          <div className="flex flex-col h-full">
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1">
              <Hash size={12} /> Kelompok I (Angka)
            </p>
            <div className="flex-1 bg-indigo-50/30 dark:bg-indigo-900/5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/30 p-2 space-y-1 overflow-auto max-h-[400px]">
              {group1.map((id, i) => (
                <div key={id} className="flex items-center gap-2 p-2 bg-white dark:bg-[#111] rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                  <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded font-bold text-[10px]">{i + 1}</span>
                  <span className="text-xs text-text-primary dark:text-text-darkPrimary truncate flex-1">{getEmpName(id)}</span>
                  <button onClick={() => setGroup1(group1.filter(gid => gid !== id))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
                </div>
              ))}
              {group1.length === 0 && <p className="text-[10px] text-gray-400 text-center py-10 italic">Belum ada pengawas I</p>}
            </div>
          </div>

          {/* Group 2 (Alphabetic) */}
          <div className="flex flex-col h-full">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1">
              <Type size={12} /> Kelompok II (Huruf)
            </p>
            <div className="flex-1 bg-amber-50/30 dark:bg-amber-900/5 rounded-xl border border-dashed border-amber-200 dark:border-amber-800/30 p-2 space-y-1 overflow-auto max-h-[400px]">
              {group2.map((id, i) => {
                const alpha = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : '');
                return (
                  <div key={id} className="flex items-center gap-2 p-2 bg-white dark:bg-[#111] rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/30">
                    <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-amber-500 text-white rounded font-bold text-[10px]">{alpha}</span>
                    <span className="text-xs text-text-primary dark:text-text-darkPrimary truncate flex-1">{getEmpName(id)}</span>
                    <button onClick={() => setGroup2(group2.filter(gid => gid !== id))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
                  </div>
                );
              })}
              {group2.length === 0 && <p className="text-[10px] text-gray-400 text-center py-10 italic">Belum ada pengawas II</p>}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-[#222] flex justify-end gap-2 bg-gray-50/50 dark:bg-[#0a0a0a]">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-white transition-all">Batal</button>
          <button onClick={handleSave} className="px-6 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
            Simpan Kelompok
          </button>
        </div>
      </div>
    </div>
  );
};
