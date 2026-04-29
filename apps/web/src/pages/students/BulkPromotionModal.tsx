import React, { useState, useMemo } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { GraduationCap, ArrowUpRight, Loader2, Info } from 'lucide-react';
import type { ClassItem } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedStudents: any[];
  classes: ClassItem[];
  apiClient: any;
  onSuccess: () => void;
}

const getGradeLevel = (name: string): string => {
  const n = (name || '').trim().toUpperCase();
  if (n.startsWith('XII')) return 'XII';
  if (n.startsWith('XI')) return 'XI';
  if (n.startsWith('X')) return 'X';
  return name;
};

export const BulkPromotionModal: React.FC<Props> = ({ isOpen, onClose, selectedStudents, classes, apiClient, onSuccess }) => {
  const [targetClassId, setTargetClassId] = useState('');
  const [targetStatus, setTargetStatus] = useState('Lulus');
  const [saving, setSaving] = useState(false);

  // Determine mode: if ALL selected students are from Grade XII, mode is 'graduate', else 'promote'
  const mode = useMemo(() => {
    if (selectedStudents.length === 0) return 'promote';
    const areAllGrade12 = selectedStudents.every(s => {
      const cls = classes.find(c => c.id === s.classId);
      const name = cls?.name || s.className || '';
      return getGradeLevel(name) === 'XII';
    });
    return areAllGrade12 ? 'graduate' : 'promote';
  }, [selectedStudents, classes]);

  const classOptions = useMemo(() => {
    return classes.map(c => {
      return { ...c, label: c.name };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) return;
    
    setSaving(true);
    try {
      const studentIds = selectedStudents.map(s => s.id);
      const payload: any = { studentIds };
      
      if (mode === 'graduate') {
        payload.status = targetStatus;
      } else {
        if (!targetClassId) throw new Error("Silakan pilih kelas tujuan terlebih dahulu.");
        payload.classId = targetClassId;
      }

      await apiClient('/students/bulk-update', { method: 'PUT', data: payload });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Gagal memproses aksi massal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} 
      title={mode === 'graduate' ? "Proses Kelulusan" : "Kenaikan / Pindah Kelas"} 
      description={`Anda memilih ${selectedStudents.length} siswa untuk diproses secara massal.`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {mode === 'graduate' ? (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-lg flex items-start gap-3">
              <GraduationCap size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Mode Kelulusan Aktif</p>
                <p className="opacity-90 mt-1">Sistem mendeteksi bahwa semua siswa yang Anda pilih berada di Tingkat Kelas XII. Anda dapat meluluskan siswa-siswa ini agar datanya direkam sebagai Alumni.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Status Target</label>
              <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={targetStatus} onChange={e => setTargetStatus(e.target.value)}>
                <option value="Lulus">Lulus (Pindah ke Alumni)</option>
                <option value="Tidak Lulus">Tidak Lulus (Tetap Aktif/Tertinggal)</option>
              </select>
              {targetStatus === 'Tidak Lulus' && (
                <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                  <Info size={12} /> Siswa "Tidak Lulus" akan tetap berstatus Aktif di dashboard.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg flex items-start gap-3">
              <ArrowUpRight size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Mode Naik / Pindah Kelas</p>
                <p className="opacity-90 mt-1">Pilih kelas tujuan di bawah ini. Semua {selectedStudents.length} siswa yang Anda seleksi akan langsung menempati kelas tersebut.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Kelas Tujuan</label>
              <select required className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={targetClassId} onChange={e => setTargetClassId(e.target.value)}>
                <option value="" disabled>Pilih kelas tujuan...</option>
                {classOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={saving || (mode !== 'graduate' && !targetClassId)} className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} Proses {selectedStudents.length} Siswa
          </Button>
        </div>
      </form>
    </Modal>
  );
};
