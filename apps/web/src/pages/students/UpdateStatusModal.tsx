import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { UserCog, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
  apiClient: any;
  onSuccess: () => void;
}

export const UpdateStatusModal: React.FC<Props> = ({ isOpen, onClose, student, apiClient, onSuccess }) => {
  const [status, setStatus] = useState('Aktif');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setStatus(student.status || 'Aktif');
    }
  }, [isOpen, student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setSaving(true);
    try {
      await apiClient(`/students/${student.id}`, { method: 'PUT', data: { status } });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Gagal merubah status: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Status Akademik" description="Ubah status siswa jika berhalangan untuk melanjutkan akademik reguler seperti Mutasi atau Drop Out.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {student && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg flex items-start gap-3">
            <UserCog size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{student.fullName}</p>
              <p className="text-xs opacity-80">Update status keadministrasian untuk siswa ini.</p>
            </div>
          </div>
        )}
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Pilih Status Baru</label>
          <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={status} onChange={e => setStatus(e.target.value)}>
            <option value="Aktif">Aktif</option>
            <option value="Mutasi">Mutasi (Pindah Sekolah)</option>
            <option value="DO">Berhenti (Drop Out)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={saving || status === student?.status} className="flex items-center gap-1.5">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} Simpan Status
          </Button>
        </div>
      </form>
    </Modal>
  );
};
