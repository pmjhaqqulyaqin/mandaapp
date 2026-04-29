import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Info, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { NISStudent, ClassItem } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  apiClient: any;
  onSuccess: () => void;
}

export const PullNISModal: React.FC<Props> = ({ isOpen, onClose, classes, apiClient, onSuccess }) => {
  const [nisStudents, setNisStudents] = useState<NISStudent[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCandidates = async (isSync = false) => {
    if (isSync) setIsSyncing(true);
    else setLoading(true);

    try {
      const data = await apiClient('/nis/pull-candidates');
      setNisStudents(data);
      if (isSync) toast.success('Data dari Manajemen NIS berhasil disinkronkan');
    } catch (err) {
      setNisStudents([]);
      if (isSync) toast.error('Gagal merefresh data');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
      setSelectedIds([]);
      setSelectedClassId('');
    }
  }, [isOpen]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === nisStudents.length ? [] : nisStudents.map(s => s.id));
  };

  const handleConfirm = async () => {
    if (!selectedClassId) { alert('Pilih kelas terlebih dahulu'); return; }
    if (selectedIds.length === 0) { alert('Pilih siswa terlebih dahulu'); return; }
    setSubmitting(true);
    try {
      await apiClient('/students/pull-from-nis', {
        method: 'POST',
        data: { studentIds: selectedIds, classId: selectedClassId }
      });
      alert(`${selectedIds.length} siswa berhasil ditarik dan di-assign kelas.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally { setSubmitting(false); }
  };

  // Build class options for display
  const classOptions = classes.map(c => {
    return { ...c, label: c.name };
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tarik Data dari Manajemen NIS"
      description="Sinkronisasi data siswa dari pangkalan data induk NIS."
      className="max-w-2xl">
      <div className="space-y-5">
        {/* Step 1 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Select Student Table</span>
            </div>
            <button 
              onClick={() => fetchCandidates(true)} 
              disabled={isSyncing || loading} 
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 rounded-md transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              Sinkronisasi
            </button>
          </div>
          <div className="border border-gray-200 dark:border-[#222] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-primary" size={20} /></div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-[#0a0a0a]">
                  <tr className="text-[10px] uppercase tracking-wider text-text-secondary">
                    <th className="py-2.5 px-3 w-8">
                      <input type="checkbox" checked={selectedIds.length === nisStudents.length && nisStudents.length > 0}
                        onChange={toggleAll} className="accent-primary w-3.5 h-3.5" />
                    </th>
                    <th className="py-2.5 px-3 font-semibold">NIS</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Siswa</th>
                    <th className="py-2.5 px-3 font-semibold">Asal Sekolah</th>
                    <th className="py-2.5 px-3 font-semibold">Tgl Daftar</th>
                  </tr>
                </thead>
                <tbody>
                  {nisStudents.map(s => (
                    <tr key={s.id} className="border-t border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] cursor-pointer"
                      onClick={() => toggleSelect(s.id)}>
                      <td className="py-2 px-3">
                        <input type="checkbox" checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelect(s.id)} className="accent-primary w-3.5 h-3.5" />
                      </td>
                      <td className="py-2 px-3 font-mono text-text-secondary">{s.nis}</td>
                      <td className="py-2 px-3 font-medium text-text-primary dark:text-text-darkPrimary">{s.fullName}</td>
                      <td className="py-2 px-3 text-text-secondary">{s.asalSekolah || '-'}</td>
                      <td className="py-2 px-3 text-text-secondary">{new Date(s.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                  {nisStudents.length === 0 && !loading && (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">Tidak ada siswa yang tersedia untuk ditarik.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1.5">
            Showing {nisStudents.length} dari {nisStudents.length} new records found
            {selectedIds.length > 0 && <span className="ml-2 font-semibold text-primary">• {selectedIds.length} dipilih</span>}
          </p>
        </div>

        {/* Step 2 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</span>
            <span className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Assign Section</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Pilih Kelas</label>
              <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                <option value="">Pilih tingkatan kelas...</option>
                {classOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg">
          <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Data yang ditarik akan secara otomatis diverifikasi dengan sistem. Pastikan NIS yang dipilih sudah sesuai dengan dokumen fisik siswa.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleConfirm} disabled={submitting || selectedIds.length === 0}
            className="flex items-center gap-1.5">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Konfirmasi Tarik Data
          </Button>
        </div>
      </div>
    </Modal>
  );
};
