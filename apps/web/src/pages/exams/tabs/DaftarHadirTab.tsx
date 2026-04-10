import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Download, Printer, Search, ListChecks } from 'lucide-react';

interface Props {
  ujianId: string;
  ujian: any;
}

export const DaftarHadirTab = ({ ujianId, ujian }: Props) => {
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [ruangList, setRuangList] = useState<any[]>([]);
  const [jadwalList, setJadwalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRuang, setFilterRuang] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [d, r, j] = await Promise.all([
          apiClient<any[]>(`/exams/${ujianId}/distribusi`),
          apiClient<any[]>(`/exams/${ujianId}/ruang`),
          apiClient<any[]>(`/exams/${ujianId}/jadwal`),
        ]);
        setDistribusi(d);
        setRuangList(r);
        setJadwalList(j);
      } catch { }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [ujianId]);

  const handleExport = () => {
    const url = filterRuang
      ? `${import.meta.env.VITE_API_URL}/exams/${ujianId}/daftar-hadir/export?ruangId=${filterRuang}`
      : `${import.meta.env.VITE_API_URL}/exams/${ujianId}/daftar-hadir/export`;
    window.open(url, '_blank');
    toast.success('Mengunduh daftar hadir...');
  };

  const filtered = distribusi.filter(d => {
    const matchRuang = !filterRuang || d.ruangId === filterRuang;
    const matchSearch = !search ||
      d.siswa?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      d.siswa?.nis?.includes(search);
    return matchRuang && matchSearch;
  });

  const selectedRuang = ruangList.find(r => r.id === filterRuang);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
          value={filterRuang} onChange={e => setFilterRuang(e.target.value)}>
          <option value="">Semua Ruang</option>
          {ruangList.map(r => <option key={r.id} value={r.id}>{r.namaRuang}</option>)}
        </select>

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
            placeholder="Cari peserta..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Print header info */}
      <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-text-primary dark:text-text-darkPrimary">
          DAFTAR HADIR PESERTA UJIAN
        </p>
        <div className="grid grid-cols-2 gap-x-4 text-gray-600 dark:text-gray-400">
          <p>Ujian: <strong>{ujian?.namaUjian}</strong></p>
          <p>Tahun Ajaran: <strong>{ujian?.tahunAjaran}</strong></p>
          {selectedRuang && <p>Ruang: <strong>{selectedRuang.namaRuang}</strong></p>}
          <p>Semester: <strong>{ujian?.semester}</strong></p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold w-10">No</th>
              <th className="px-3 py-2.5 font-semibold">NIS</th>
              <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
              <th className="px-3 py-2.5 font-semibold">Ruang</th>
              <th className="px-3 py-2.5 font-semibold w-24 text-center">TTD</th>
              <th className="px-3 py-2.5 font-semibold w-24">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
            {filtered.map((item: any, i: number) => (
              <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2.5 font-mono text-gray-500">{item.siswa?.nis || item.siswa?.nisn || '-'}</td>
                <td className="px-3 py-2.5 font-medium text-text-primary dark:text-text-darkPrimary">{item.siswa?.fullName || '-'}</td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-bold">
                    {item.ruang?.namaRuang || '-'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="w-16 h-6 mx-auto border-b border-gray-300 dark:border-gray-600" />
                </td>
                <td className="px-3 py-2.5 text-gray-400">_________</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400 italic">
                {loading ? 'Memuat...' : 'Belum ada data peserta. Distribusikan peserta ke ruang terlebih dahulu.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-[10px] text-gray-400">
        <span>Total: {filtered.length} peserta</span>
        <span>Hadir: _____ &nbsp; Tidak Hadir: _____</span>
      </div>
    </div>
  );
};
