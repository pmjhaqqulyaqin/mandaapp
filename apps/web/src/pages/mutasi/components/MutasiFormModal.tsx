import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { X, Search, Check, Save } from 'lucide-react';
import { Button } from '@mandaapp/ui/src/components/Button';

interface MutasiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'masuk' | 'keluar' | 'internal';
  initialData?: any;
}

export const MutasiFormModal: React.FC<MutasiFormModalProps> = ({ isOpen, onClose, type, initialData }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({
    studentId: '',
    reason: '',
    fromSchool: '',
    toSchool: '',
    fromClass: '',
    toClass: '',
    suratNumber: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const [studentSearch, setStudentSearch] = useState('');
  
  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          effectiveDate: initialData.effectiveDate ? new Date(initialData.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setStudentSearch(initialData.student?.fullName || '');
      } else {
        setFormData({
          studentId: '',
          reason: '',
          fromSchool: '',
          toSchool: '',
          fromClass: '',
          toClass: '',
          suratNumber: '',
          effectiveDate: new Date().toISOString().split('T')[0],
        });
        setStudentSearch('');
      }
    }
  }, [isOpen, initialData]);

  // Fetch students for dropdown/search
  const { data: students = [] } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => apiClient<any[]>(`/students/search-autocomplete?q=${encodeURIComponent(studentSearch)}`).then(res => res),
    enabled: isOpen && studentSearch.length > 2 && !formData.studentId
  });

  const mutation = useMutation({
    mutationFn: (formInput: any) => {
      const payload = { ...formInput, type };
      if (initialData?.id) {
        return apiClient(`/mutations/${initialData.id}`, {
          method: 'PUT',
          data: payload,
        });
      }
      return apiClient('/mutations', {
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mutations-all'] });
      queryClient.invalidateQueries({ queryKey: ['mutations-recent'] });
      queryClient.invalidateQueries({ queryKey: ['mutations-stats'] });
      queryClient.invalidateQueries({ queryKey: ['students-mutasi-directory'] });
      onClose();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[#222]">
          <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary">
            {initialData ? 'Edit Data Mutasi ' : 'Tambah Mutasi '} 
            <span className="capitalize">{type}</span>
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 hide-scrollbar flex flex-col gap-5">
          {/* Student Selection */}
          <div className="flex flex-col gap-2 relative">
            <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Siswa</label>
            {!formData.studentId ? (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Ketik nama atau NIS untuk mencari..." 
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                
                {students.length > 0 && studentSearch.length > 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-xl shadow-lg max-h-48 overflow-y-auto z-10 p-1">
                    {students.map((s: any) => (
                      <div 
                        key={s.id} 
                        onClick={() => {
                          setFormData({ ...formData, studentId: s.id, fromClass: s.className || '' });
                          setStudentSearch(s.fullName);
                        }}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-[#222] rounded-lg cursor-pointer flex flex-col"
                      >
                        <span className="font-bold text-sm text-text-primary dark:text-text-darkPrimary">{s.fullName}</span>
                        <span className="text-xs text-text-secondary">{s.nisn} | Kelas: {s.className || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">{studentSearch}</span>
                  <span className="text-xs text-text-secondary">Siswa Terpilih</span>
                </div>
                <button 
                  onClick={() => setFormData({ ...formData, studentId: '' })}
                  className="text-xs font-semibold text-rose-500 hover:underline px-2 py-1 rounded-lg hover:bg-rose-50"
                >
                  Ganti
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Tanggal Efektif</label>
              <input 
                type="date" 
                value={formData.effectiveDate}
                onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">No Surat Keputusan</label>
              <input 
                type="text" 
                placeholder="OPSIONAL"
                value={formData.suratNumber}
                onChange={e => setFormData({ ...formData, suratNumber: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {type === 'masuk' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Sekolah Asal</label>
                <input 
                  type="text" 
                  value={formData.fromSchool}
                  onChange={e => setFormData({ ...formData, fromSchool: e.target.value })}
                  placeholder="Nama sekolah asal..."
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Ditempatkan di Kelas</label>
                <input 
                  type="text" 
                  value={formData.toClass}
                  onChange={e => setFormData({ ...formData, toClass: e.target.value })}
                  placeholder="Misal: X MIA 1"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {type === 'keluar' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Sekolah Tujuan</label>
                <input 
                  type="text" 
                  value={formData.toSchool}
                  onChange={e => setFormData({ ...formData, toSchool: e.target.value })}
                  placeholder="Nama sekolah tujuan pindah..."
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {type === 'internal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Kelas Asal</label>
                <input 
                  type="text" 
                  value={formData.fromClass}
                  disabled
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-100 dark:bg-[#111] text-gray-500 text-sm outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Kelas Tujuan</label>
                <input 
                  type="text" 
                  value={formData.toClass}
                  onChange={e => setFormData({ ...formData, toClass: e.target.value })}
                  placeholder="Misal: X MIA 2"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Alasan Mutasi</label>
            <textarea 
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Jelaskan alasan secara singkat..."
              className="w-full h-24 p-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button 
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending || !formData.studentId}
            className="flex items-center gap-2"
          >
            {mutation.isPending ? 'Menyimpan...' : <><Save size={16} /> Simpan Data</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
