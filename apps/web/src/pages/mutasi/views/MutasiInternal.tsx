import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Search, Plus, Trash2, Edit, Loader2, RefreshCw } from 'lucide-react';
import { MutasiFormModal } from '../components/MutasiFormModal';

export const MutasiInternal = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['mutations-internal', searchQuery],
    queryFn: () => apiClient<any[]>(`/mutations?type=internal${searchQuery ? `&search=${searchQuery}` : ''}`).then(res => res),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/mutations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mutations-internal'] });
      queryClient.invalidateQueries({ queryKey: ['mutations-all'] });
      queryClient.invalidateQueries({ queryKey: ['mutations-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mutations-recent'] });
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Yakin ingin menghapus data mutasi ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500 pb-10">
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Cari siswa mutasi internal..."
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
        <Button onClick={() => { setEditData(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus size={16} /> Tambah Data Internal
        </Button>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw size={48} className="mx-auto text-blue-200 dark:text-blue-900/50 mb-3" />
            <p className="text-sm font-semibold text-text-primary dark:text-gray-400">Tidak ada data mutasi internal</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#222] text-[11px] uppercase tracking-wider text-text-secondary bg-gray-50/50 dark:bg-[#0a0a0a]">
                  <th className="py-3 px-4 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-4 font-semibold">Kelas Asal</th>
                  <th className="py-3 px-4 font-semibold">Kelas Tujuan</th>
                  <th className="py-3 px-4 font-semibold">Alasan</th>
                  <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a]">
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">{r.student?.fullName || '-'}</p>
                      <p className="text-xs text-text-secondary font-mono">{r.student?.nisn || '-'}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{r.fromClass || '-'}</td>
                    <td className="py-3 px-4 text-sm font-semibold">{r.toClass || '-'}</td>
                    <td className="py-3 px-4 text-sm max-w-[200px] truncate" title={r.reason}>{r.reason || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setEditData(r); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MutasiFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        type="internal" 
        initialData={editData} 
      />
    </div>
  );
};
