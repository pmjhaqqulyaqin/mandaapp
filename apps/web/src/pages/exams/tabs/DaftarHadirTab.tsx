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
  
  const [activePreview, setActivePreview] = useState<string>('dh-peserta');
  const [employees, setEmployees] = useState<any[]>([]);
  const [panitia, setPanitia] = useState<any[]>([]);

  useEffect(() => {
    if (ujianId) {
      setLoading(true);
      Promise.allSettled([
        apiClient(`/exams/${ujianId}/ruang`),
        apiClient(`/exams/${ujianId}/distribusi`),
        apiClient(`/employees`),
        apiClient(`/exams/${ujianId}/panitia`)
      ]).then((results) => {
        const r = results[0].status === 'fulfilled' ? results[0].value?.data || results[0].value : [];
        const d = results[1].status === 'fulfilled' ? results[1].value : [];
        const emp = results[2].status === 'fulfilled' ? results[2].value : [];
        const pan = results[3].status === 'fulfilled' ? results[3].value : [];
        
        setRooms(r || []);
        setEmployees(Array.isArray(emp) ? emp : []);
        setPanitia(Array.isArray(pan) ? pan : []);

        let distData = Array.isArray(d) ? d : [];
        const counts: Record<string, number> = {};
        distData = distData.map((x: any) => {
           const rId = x.ruangId || 'unknown';
           counts[rId] = (counts[rId] || 0) + 1;
           return { ...x, urutRuang: counts[rId] };
        });
        setDistribusi(distData);
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
            <div 
              key={doc.key} 
              onClick={() => setActivePreview(doc.key)}
              className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-all ${
                activePreview === doc.key 
                  ? `${colorMap[doc.color]} ring-2 ring-${doc.color}-500 shadow-sm` 
                  : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
              }`}
            >
              <div className={`flex items-center gap-2 ${activePreview === doc.key ? `text-${doc.color}-700 dark:text-${doc.color}-400` : 'text-gray-700 dark:text-gray-300'}`}>
                <Icon size={20} />
                <h4 className="text-sm font-semibold">{doc.label}</h4>
              </div>
              <p className="text-[11px] opacity-80 text-gray-500">{doc.desc}</p>

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
                    onClick={(e) => {
                      e.stopPropagation();
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
                  onClick={(e) => { e.stopPropagation(); handleExport(doc.key); }}
                >
                  <Download size={12} /> Export Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Previews */}
      <div className="space-y-3 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">
            Preview {docTypes.find(d => d.key === activePreview)?.label}
          </h3>
        </div>

        {/* Search - Only for Peserta for now */}
        {activePreview === 'dh-peserta' && (
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
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
          {activePreview === 'dh-peserta' && (
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
                {filtered.slice(0, 100).map((item: any, i: number) => {
                  const siswa = item.siswa || {};
                  const lastYearStr = (ujian?.tahunAjaran || '').length >= 2 ? (ujian?.tahunAjaran || '').slice(-2) : '00';
                  const semesterLower = (ujian?.semester || '').toLowerCase();
                  const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
                  const kelasStr2 = (siswa.fullClassName || siswa.className || '').toUpperCase();
                  let gradeCode = '00';
                  if (kelasStr2.includes('XII') || kelasStr2.includes('12')) gradeCode = '12';
                  else if (kelasStr2.includes('XI') || kelasStr2.includes('11')) gradeCode = '11';
                  else if (kelasStr2.includes('X') || kelasStr2.includes('10')) gradeCode = '10';
                  const ruangMatch = (item.ruang?.namaRuang || '').match(/\d+/);
                  const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
                  const ruangCode = ruangNumber.toString().padStart(2, '0');
                  const urutCode = (item.urutRuang || i + 1).toString().padStart(3, '0');
                  const nomorPeserta = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-indigo-600 font-semibold">{nomorPeserta}</td>
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
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">
                      {loading ? 'Memuat...' : 'Belum ada data peserta. Distribusikan peserta ke ruang terlebih dahulu.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activePreview === 'dh-pengawas' && (() => {
            const group1 = ujian?.pengaturan?.pengawasGroups?.group1 || [];
            const group2 = ujian?.pengaturan?.pengawasGroups?.group2 || [];
            const pengawasEmployees = employees.filter(e => group1.includes(e.id) || group2.includes(e.id)).map(e => ({
              ...e,
              kelompok: group1.includes(e.id) ? 'Kelompok I (Angka)' : 'Kelompok II (Huruf)'
            }));

            return (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold w-10">No</th>
                    <th className="px-3 py-2.5 font-semibold">Nama</th>
                    <th className="px-3 py-2.5 font-semibold">NIP</th>
                    <th className="px-3 py-2.5 font-semibold">Pangkat / Golongan</th>
                    <th className="px-3 py-2.5 font-semibold">Kelompok Ngawas</th>
                    <th className="px-3 py-2.5 font-semibold w-24 text-center">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
                  {pengawasEmployees.map((emp: any, i: number) => (
                    <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">{emp.name || '-'}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{emp.nip || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{emp.pangkatGolongan || emp.pangkat_golongan || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          emp.kelompok.includes('I (Angka)') 
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' 
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                        }`}>
                          {emp.kelompok}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {emp.photoUrl ? (
                          <a href={emp.photoUrl} target="_blank" rel="noreferrer" title="Lihat Foto" className="inline-block transition-transform hover:scale-110">
                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden ring-2 ring-violet-500/20">
                              <img src={emp.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                            </div>
                          </a>
                        ) : (
                          <div className="w-8 h-8 mx-auto rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                            <span className="text-[10px] text-gray-400">-</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pengawasEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-gray-400 italic">
                        {loading ? 'Memuat...' : 'Belum ada pengawas ditugaskan pada ujian ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}

          {activePreview === 'dh-panitia' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 font-semibold w-10">No</th>
                  <th className="px-3 py-2.5 font-semibold">Nama</th>
                  <th className="px-3 py-2.5 font-semibold">NIP</th>
                  <th className="px-3 py-2.5 font-semibold">Pangkat / Golongan</th>
                  <th className="px-3 py-2.5 font-semibold">Jabatan Kepanitiaan</th>
                  <th className="px-3 py-2.5 font-semibold w-24 text-center">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
                {panitia.sort((a,b) => (a.urutan || 0) - (b.urutan || 0)).map((p: any, i: number) => {
                  const emp = p.pegawai || {};
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">{emp.name || '-'}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{emp.nip || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{emp.pangkatGolongan || emp.pangkat_golongan || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 dark:bg-violet-900/20 text-[10px] font-bold">
                          {p.jabatan || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {emp.photoUrl ? (
                          <a href={emp.photoUrl} target="_blank" rel="noreferrer" title="Lihat Foto" className="inline-block transition-transform hover:scale-110">
                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden ring-2 ring-violet-500/20">
                              <img src={emp.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                            </div>
                          </a>
                        ) : (
                          <div className="w-8 h-8 mx-auto rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                            <span className="text-[10px] text-gray-400">-</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {panitia.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-400 italic">
                      {loading ? 'Memuat...' : 'Belum ada anggota panitia pada ujian ini.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {activePreview === 'dh-peserta' && (
          <>
            {filtered.length > 100 && (
              <p className="text-[10px] text-amber-500 mt-1">Menampilkan 100 dari {filtered.length} peserta. Export Excel untuk data lengkap.</p>
            )}
            <p className="text-[10px] text-gray-400">Total: {filtered.length} peserta</p>
          </>
        )}
        {activePreview === 'dh-pengawas' && (
          <p className="text-[10px] text-gray-400">Total: {(() => {
            const g1 = ujian?.pengaturan?.pengawasGroups?.group1 || [];
            const g2 = ujian?.pengaturan?.pengawasGroups?.group2 || [];
            return employees.filter(e => g1.includes(e.id) || g2.includes(e.id)).length;
          })()} pengawas</p>
        )}
        {activePreview === 'dh-panitia' && (
          <p className="text-[10px] text-gray-400">Total: {panitia.length} anggota panitia</p>
        )}
      </div>
    </div>
  );
};
