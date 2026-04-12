import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Download, Users, UserCheck, ClipboardList, Search, Printer } from 'lucide-react';

interface Props {
  ujianId: string;
  ujian: any;
}

export const DaftarHadirTab = ({ ujianId, ujian }: Props) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ujianId) {
      setLoading(true);
      Promise.all([
        apiClient(`/exams/${ujianId}/ruang`).then(res => res.data || res).catch(() => []),
        apiClient(`/exams/${ujianId}/distribusi`).catch(() => []),
      ]).then(([r, d]) => {
        setRooms(r);
        setDistribusi(Array.isArray(d) ? d : []);
      }).finally(() => setLoading(false));
    }
  }, [ujianId]);

  const filtered = distribusi.filter(d => {
    const matchRoom = selectedRoomId === 'ALL' || d.ruangId === selectedRoomId;
    const matchSearch = !search ||
      d.siswa?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      d.siswa?.nis?.includes(search) ||
      d.siswa?.nisn?.includes(search);
    return matchRoom && matchSearch;
  });

  // Stats per room
  const roomStats = rooms.map(r => ({
    ...r,
    pesertaCount: distribusi.filter(d => d.ruangId === r.id).length
  }));

  const docTypes = [
    {
      key: 'dh-peserta',
      icon: ClipboardList,
      label: 'Daftar Hadir Peserta',
      desc: 'Generate daftar hadir peserta ujian berdasarkan data siswa yang sudah didistribusikan ke ruang ujian',
      color: 'indigo' as const,
    },
    {
      key: 'dh-pengawas',
      icon: UserCheck,
      label: 'Daftar Hadir Pengawas',
      desc: 'Generate daftar hadir untuk seluruh pengawas yang sudah ditugaskan pada ujian ini',
      color: 'blue' as const,
    },
    {
      key: 'dh-panitia',
      icon: Users,
      label: 'Daftar Hadir Panitia',
      desc: 'Generate daftar hadir untuk seluruh anggota panitia ujian yang sudah terdaftar',
      color: 'violet' as const,
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800/30',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-800/30',
    violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 border-violet-100 dark:border-violet-800/30',
  };

  const handleExport = (key: string) => {
    const baseUrl = import.meta.env.VITE_API_URL;

    if (key === 'dh-peserta') {
      let url = `${baseUrl}/exams/${ujianId}/daftar-hadir/export?type=peserta`;
      if (selectedRoomId !== 'ALL') url += `&ruangId=${selectedRoomId}`;
      window.open(url, '_blank');
      toast.success('Mengunduh Daftar Hadir Peserta...');
    } else if (key === 'dh-pengawas') {
      const url = `${baseUrl}/exams/${ujianId}/daftar-hadir/export?type=pengawas`;
      window.open(url, '_blank');
      toast.success('Mengunduh Daftar Hadir Pengawas...');
    } else if (key === 'dh-panitia') {
      const url = `${baseUrl}/exams/${ujianId}/daftar-hadir/export?type=panitia`;
      window.open(url, '_blank');
      toast.success('Mengunduh Daftar Hadir Panitia...');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Generate dan export daftar hadir ujian. Pilih jenis daftar hadir yang ingin di-export ke format Excel.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {docTypes.map(doc => {
          const Icon = doc.icon;
          return (
            <div key={doc.key} className={`rounded-xl border p-4 space-y-3 ${colorMap[doc.color]}`}>
              <div className="flex items-center gap-2">
                <Icon size={20} />
                <h4 className="text-sm font-semibold">{doc.label}</h4>
              </div>
              <p className="text-[11px] opacity-80">{doc.desc}</p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {doc.key === 'dh-peserta' && (
                  <select
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    className="h-7 cursor-pointer text-[10px] font-semibold rounded-lg bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="ALL">Semua Ruang</option>
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.namaRuang}</option>
                    ))}
                  </select>
                )}
                {doc.key === 'dh-peserta' && (
                  <button
                    className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => {
                      let url = `/dashboard/print-daftar-hadir/${ujianId}`;
                      if (selectedRoomId !== 'ALL') url += `?ruangId=${selectedRoomId}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Printer size={12} /> Cetak PDF
                  </button>
                )}
                <button
                  className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => handleExport(doc.key)}
                >
                  <Download size={12} /> Export Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daftar Hadir Peserta Preview */}
      <div className="space-y-3 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">
            Preview Daftar Hadir Peserta
          </h3>
        </div>

        {/* Room filter cards removed as requested, using only the dropdown near Cetak PDF */}

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="h-8 pl-8 pr-3 w-full rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Cari nama / NIS / NISN..." value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {selectedRoomId !== 'ALL' && (
            <button onClick={() => setSelectedRoomId('ALL')} className="text-[10px] text-indigo-500 font-medium hover:text-indigo-600">
              × Clear filter
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold w-10">No</th>
                <th className="px-3 py-2.5 font-semibold">No. Peserta</th>
                <th className="px-3 py-2.5 font-semibold">NIS</th>
                <th className="px-3 py-2.5 font-semibold">NISN</th>
                <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                <th className="px-3 py-2.5 font-semibold">Kelas</th>
                <th className="px-3 py-2.5 font-semibold">Ruang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
              {filtered.slice(0, 100).map((item: any, i: number) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-indigo-600 font-semibold">{item.nomorMeja || '-'}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{item.siswa?.nis || '-'}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{item.siswa?.nisn || '-'}</td>
                  <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">{item.siswa?.fullName || '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{item.siswa?.fullClassName || item.siswa?.className || '-'}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-bold">
                      {item.ruang?.namaRuang || '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">
                    {loading ? 'Memuat...' : 'Belum ada data peserta. Distribusikan peserta ke ruang terlebih dahulu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <p className="text-[10px] text-amber-500 mt-1">Menampilkan 100 dari {filtered.length} peserta. Export Excel untuk data lengkap.</p>
        )}
        <p className="text-[10px] text-gray-400">Total: {filtered.length} peserta</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          📋 Format Daftar Hadir Pengawas dan Panitia akan disesuaikan pada tahap pengembangan selanjutnya.
        </p>
      </div>
    </div>
  );
};
