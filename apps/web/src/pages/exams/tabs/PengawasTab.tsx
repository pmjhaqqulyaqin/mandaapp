import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Wand2, Download, Printer, Trash2, Search, RefreshCw } from 'lucide-react';

interface Props {
  ujianId: string;
}

export const PengawasTab = ({ ujianId }: Props) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apiClient<any[]>(`/exams/${ujianId}/pengawas`);
      setData(result);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [ujianId]);

  const handleGenerate = async () => {
    if (data.length > 0 && !confirm('Ini akan menghapus penugasan lama dan generate ulang. Lanjutkan?')) return;
    setGenerating(true);
    try {
      const result = await apiClient<any>(`/exams/${ujianId}/pengawas/generate`, { data: {} });
      toast.success(`${result.generated} penugasan berhasil di-generate`);
      fetchData();
    } catch (err: any) {
      toast.error('Gagal generate: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus penugasan ini?')) return;
    try {
      await apiClient(`/exams/pengawas/${id}`, { method: 'DELETE' });
      fetchData();
    } catch { }
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL}/exams/${ujianId}/pengawas/export`, '_blank');
    toast.success('Mengunduh penugasan pengawas...');
  };

  const filtered = data.filter(d =>
    d.pengawas?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.jadwal?.mataPelajaran?.toLowerCase().includes(search.toLowerCase()) ||
    d.ruang?.namaRuang?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleGenerate} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
          {generating ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Generate Otomatis
        </button>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          <Download size={14} /> Export Excel
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          <Printer size={14} /> Cetak
        </button>
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Cari pengawas/mapel..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <p className="text-[10px] text-gray-400">
        Generate otomatis membagi pengawas secara round-robin berdasarkan data jadwal dan ruang yang sudah dibuat. Pastikan jadwal dan ruang sudah lengkap.
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">No</th>
              <th className="px-3 py-2.5 font-semibold">Tanggal</th>
              <th className="px-3 py-2.5 font-semibold">Sesi</th>
              <th className="px-3 py-2.5 font-semibold">Mata Pelajaran</th>
              <th className="px-3 py-2.5 font-semibold">Ruang</th>
              <th className="px-3 py-2.5 font-semibold">Pengawas</th>
              <th className="px-3 py-2.5 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
            {filtered.map((item: any, i: number) => (
              <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors group">
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                  {item.jadwal?.tanggal ? new Date(item.jadwal.tanggal).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 text-[10px]">
                  {item.jadwal?.waktuMulai} — {item.jadwal?.waktuSelesai}
                </td>
                <td className="px-3 py-2 font-medium text-text-primary dark:text-text-darkPrimary">{item.jadwal?.mataPelajaran || '-'}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-600 text-[10px] font-bold">
                    {item.ruang?.namaRuang || '-'}
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">{item.pengawas?.name || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">
                {loading ? 'Memuat...' : 'Belum ada penugasan pengawas. Gunakan "Generate Otomatis" setelah mengisi jadwal dan ruang.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400">Total: {filtered.length} penugasan</p>
    </div>
  );
};
