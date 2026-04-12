import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Download, Users, UserCheck, ClipboardList, Search } from 'lucide-react';

interface Props {
  ujianId: string;
  ujian: any;
}

export const DaftarHadirTab = ({ ujianId, ujian }: Props) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');

  useEffect(() => {
    if (ujianId) {
      apiClient(`/exams/${ujianId}/ruang`).then(res => setRooms(res.data || res)).catch(console.error);
    }
  }, [ujianId]);

  const docTypes = [
    {
      key: 'dh-peserta',
      icon: ClipboardList,
      label: 'Daftar Hadir Peserta',
      desc: 'Generate daftar hadir peserta ujian berdasarkan data siswa yang sudah didistribusikan ke ruang ujian',
      color: 'indigo' as const,
      hasRoomFilter: true,
    },
    {
      key: 'dh-pengawas',
      icon: UserCheck,
      label: 'Daftar Hadir Pengawas',
      desc: 'Generate daftar hadir untuk seluruh pengawas yang sudah ditugaskan pada ujian ini',
      color: 'blue' as const,
      hasRoomFilter: false,
    },
    {
      key: 'dh-panitia',
      icon: Users,
      label: 'Daftar Hadir Panitia',
      desc: 'Generate daftar hadir untuk seluruh anggota panitia ujian yang sudah terdaftar',
      color: 'violet' as const,
      hasRoomFilter: false,
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
                {doc.hasRoomFilter && (
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

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          📋 Format daftar hadir akan disesuaikan pada tahap pengembangan selanjutnya. Pastikan data peserta, pengawas, dan panitia sudah lengkap sebelum melakukan export.
        </p>
      </div>
    </div>
  );
};
