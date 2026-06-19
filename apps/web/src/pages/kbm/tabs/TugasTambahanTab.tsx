import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../../lib/api';
import { Plus, Trash2, Download, Pencil, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TugasAssignModal } from '../components/TugasAssignModal';
import { DataTableToolbar } from '../../../components/DataTableToolbar';

interface Props {
  academicYearId: string;
  semester: string;
  canEdit: boolean;
}

interface TugasItem {
  id: string;
  guruId: string;
  guruName: string;
  guruNip: string;
  masterId: string;
  namaTugas: string;
  kategori: string;
  keterangan: string | null;
  setaraJam: number;
}

const KATEGORI_LABELS: Record<string, string> = {
  struktural: 'A. TUGAS TAMBAHAN UMUM',
  kurikulum: 'B. DIBAWAH KOORDINASI KURIKULUM',
  kesiswaan: 'C. DIBAWAH KOORDINASI KESISWAAN',
};

const KATEGORI_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  struktural: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/20' },
  kurikulum: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/20' },
  kesiswaan: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-500/20' },
};

export const TugasTambahanTab = ({ academicYearId, semester, canEdit }: Props) => {
  const [tugas, setTugas] = useState<TugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editJam, setEditJam] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    if (!academicYearId) return;
    setLoading(true);
    apiClient<TugasItem[]>(`/kbm/tugas?academicYearId=${academicYearId}&semester=${semester}`)
      .then(setTugas)
      .catch(() => toast.error('Gagal memuat tugas tambahan'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [academicYearId, semester]);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus tugas tambahan ini?')) return;
    try {
      await apiClient(`/kbm/tugas/${id}`, { method: 'DELETE' });
      setTugas(prev => prev.filter(t => t.id !== id));
      toast.success('Tugas dihapus');
    } catch { toast.error('Gagal menghapus'); }
  };

  const handleEditJam = async (id: string) => {
    try {
      await apiClient(`/kbm/tugas/${id}`, { method: 'PUT', data: { setaraJam: Number(editJam) || 0 } });
      setTugas(prev => prev.map(t => t.id === id ? { ...t, setaraJam: Number(editJam) || 0 } : t));
      setEditId(null);
      toast.success('Setara jam diperbarui');
    } catch { toast.error('Gagal update'); }
  };

  const handleExport = () => {
    window.open(`/api/kbm/tugas/export?academicYearId=${academicYearId}&semester=${semester}`, '_blank');
  };

  const handleDownloadTemplate = () => {
    window.open(`/api/kbm/tugas/template?academicYearId=${academicYearId}&semester=${semester}`, '_blank');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('academicYearId', academicYearId);
      formData.append('semester', semester);

      const res = await fetch('/api/kbm/tugas/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Gagal import');
        return;
      }

      toast.success(data.message);
      if (data.errors?.length > 0) {
        data.errors.forEach((err: string) => toast.warning(err, { duration: 5000 }));
      }
      loadData();
    } catch {
      toast.error('Gagal import file');
    } finally {
      setImporting(false);
    }
  };

  if (!academicYearId) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Pilih Tahun Ajaran terlebih dahulu</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /></div>;
  }

  const categories = ['struktural', 'kurikulum', 'kesiswaan'];
  const grandTotal = tugas.reduce((sum, t) => sum + (Number(t.setaraJam) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg bg-purple-500 text-white hover:bg-purple-600 active:scale-95 transition-all">
            <Plus size={14} /> Tambah Tugas
          </button>
        )}
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] active:scale-95 transition-all">
          <Download size={14} /> Export Excel
        </button>
        <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] active:scale-95 transition-all">
          <FileSpreadsheet size={14} /> Template
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {importing ? 'Importing...' : 'Import Excel'}
        </button>
      </div>

      {/* DataTable Toolbar */}
      <DataTableToolbar
        data={tugas}
        columns={[
          { header: 'Nama Guru', key: 'guruName' },
          { header: 'NIP', key: 'guruNip', transform: (v) => v || '-' },
          { header: 'Tugas', key: 'namaTugas' },
          { header: 'Kategori', key: 'kategori' },
          { header: 'Keterangan', key: 'keterangan', transform: (v) => v || '-' },
          { header: 'Setara Jam', key: 'setaraJam', transform: (v) => String(v) },
        ]}
        fileName="Tugas_Tambahan"
        title="Tugas Tambahan"
        entriesPerPage={tugas.length}
        onEntriesPerPageChange={() => {}}
        totalEntries={tugas.length}
      />

      {/* Tables by category */}
      {categories.map(cat => {
        const items = tugas.filter(t => t.kategori === cat);
        const colors = KATEGORI_COLORS[cat];
        const catTotal = items.reduce((sum, t) => sum + (Number(t.setaraJam) || 0), 0);

        return (
          <div key={cat} className={`rounded-xl border ${colors.border} overflow-hidden`}>
            <div className={`px-4 py-2.5 ${colors.bg}`}>
              <h3 className={`text-[13px] font-bold ${colors.text}`}>{KATEGORI_LABELS[cat]}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#161616]">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-10">No</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Nama</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">NIP</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Tugas</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Keterangan</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500 dark:text-gray-400 w-20">JTM</th>
                    {canEdit && <th className="px-3 py-2 text-center font-semibold text-gray-500 dark:text-gray-400 w-16">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 7 : 6} className="px-3 py-6 text-center text-gray-400 dark:text-gray-500">
                        Belum ada tugas pada kategori ini
                      </td>
                    </tr>
                  ) : (
                    items.map((t, i) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161616]">
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{t.guruName}</td>
                        <td className="px-3 py-2 text-gray-500 hidden md:table-cell">{t.guruNip}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{t.namaTugas}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 hidden md:table-cell">{t.keterangan || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {editId === t.id ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                value={editJam}
                                onChange={(e) => setEditJam(e.target.value)}
                                className="w-14 h-7 text-center text-[12px] rounded border border-purple-400 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleEditJam(t.id); if (e.key === 'Escape') setEditId(null); }}
                              />
                            </div>
                          ) : (
                            <span
                              className={`font-bold ${canEdit ? 'cursor-pointer hover:text-purple-600' : ''}`}
                              onClick={() => { if (canEdit) { setEditId(t.id); setEditJam(String(t.setaraJam)); } }}
                            >
                              {t.setaraJam}
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => handleDelete(t.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50/50 dark:bg-[#161616]">
                      <td colSpan={canEdit ? 5 : 4} className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 text-[11px] hidden md:table-cell">
                        Subtotal:
                      </td>
                      <td colSpan={canEdit ? 5 : 4} className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 text-[11px] md:hidden">
                        Subtotal:
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-gray-800 dark:text-white">{catTotal}</td>
                      {canEdit && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        );
      })}

      {/* Grand Total */}
      <div className="flex justify-end px-4">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <span className="text-[12px] font-semibold">Total Setara Jam:</span>
          <span className="text-xl font-bold">{grandTotal}</span>
        </div>
      </div>

      {/* Assign Modal */}
      {showModal && (
        <TugasAssignModal
          academicYearId={academicYearId}
          semester={semester}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
};
