import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Wand2, Download, Search, RefreshCw, Settings2, ShieldCheck, DoorOpen, Calendar } from 'lucide-react';
import { PengaturanPengawasModal } from '../components/PengaturanPengawasModal';

interface Props {
  ujianId: string;
}

export const PengawasTab = ({ ujianId }: Props) => {
  const [data, setData] = useState<any[]>([]);
  const [ruangList, setRuangList] = useState<any[]>([]);
  const [ujian, setUjian] = useState<any>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pData, rData, uData, eData] = await Promise.all([
        apiClient<any[]>(`/exams/${ujianId}/pengawas`),
        apiClient<any[]>(`/exams/${ujianId}/ruang`),
        apiClient<any>(`/exams/${ujianId}`),
        apiClient<any[]>('/employees')
      ]);
      setData(pData);
      setRuangList(rData);
      setUjian(uData);
      setAllEmployees(eData || []);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [ujianId]);

  const handleGenerate = async () => {
    if (data.length > 0 && !confirm('Ini akan menghapus penugasan lama dan generate ulang. Lanjutkan?')) return;
    setGenerating(true);
    try {
      const result = await apiClient<any>(`/exams/${ujianId}/pengawas/generate`, { data: {} });
      toast.success(`${result.generated} penugasan berhasil di-generate di ${result.sessions} sesi`);
      fetchData();
    } catch (err: any) {
      toast.error('Gagal generate: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL}/exams/${ujianId}/pengawas/export`, '_blank');
    toast.success('Mengunduh penugasan pengawas...');
  };

  // Matrix Processing
  // Group assignments by Session (Jadwal ID)
  const sessionMap = new Map();
  data.forEach(p => {
    const key = p.jadwalId;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        jadwal: p.jadwal,
        assignments: {} // ruangId -> codes
      });
    }
    const sess = sessionMap.get(key);
    if (!sess.assignments[p.ruangId]) sess.assignments[p.ruangId] = [];
    sess.assignments[p.ruangId].push(p.kodeLabel);
  });

  const sortedSessions = Array.from(sessionMap.values()).sort((a,b) => {
    if (a.jadwal.tanggal !== b.jadwal.tanggal) return a.jadwal.tanggal.localeCompare(b.jadwal.tanggal);
    return a.jadwal.waktuMulai.localeCompare(b.jadwal.waktuMulai);
  });

  const filteredSessions = sortedSessions.filter(s => 
    s.jadwal.mataPelajaran.toLowerCase().includes(search.toLowerCase()) ||
    new Date(s.jadwal.tanggal).toLocaleDateString('id-ID').includes(search)
  );

  const getEmpName = (id: string, group: string) => {
     const ids = ujian?.pengaturan?.pengawasGroups?.[group] || [];
     // This is inefficient but group size is small
     return ""; // We only show codes in matrix like in the image
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleGenerate} disabled={generating || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
          {generating ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Generate Otomatis
        </button>
        <button onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800/30 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95">
          <Settings2 size={14} /> Set Kelompok
        </button>
        <button onClick={handleExport} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          <Download size={14} /> Export Excel Matrix
        </button>
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Cari mapel/tanggal..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex items-start gap-4 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20">
        <ShieldCheck size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
           <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Aturan Rotasi Pengawas</p>
           <p className="text-[10px] text-amber-600/80 dark:text-amber-500/60 leading-relaxed">
             Sistem membagi 2 pengawas per ruang (1 Angka & 1 Huruf) dengan algoritma rotasi berantai. 
             Index kelompok bergeser otomatis di setiap sesi untuk mencegah bentrok dan memastikan variasi pasangan.
           </p>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-[#222] shadow-sm bg-white dark:bg-[#050505]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-black/20 text-[9px] uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-[#222]">
              <th className="px-3 py-3 font-bold border-r border-gray-100 dark:border-[#222] sticky left-0 bg-gray-50 dark:bg-[#0a0a0a] z-10">No</th>
              <th className="px-3 py-3 font-bold border-r border-gray-100 dark:border-[#222] sticky left-11 bg-gray-50 dark:bg-[#0a0a0a] z-10 w-28">Hari / Tanggal</th>
              <th className="px-3 py-3 font-bold border-r border-gray-100 dark:border-[#222] text-center w-12">Jam</th>
              <th className="px-3 py-3 font-bold border-r border-gray-100 dark:border-[#222] text-center w-24">Waktu</th>
              <th colSpan={ruangList.length} className="px-3 py-2 font-black text-center text-text-primary dark:text-text-darkPrimary bg-indigo-50/30 dark:bg-indigo-900/10">Ruang & Kode Pengawas</th>
            </tr>
            <tr className="bg-gray-50/50 dark:bg-black/10 text-[9px] font-bold text-center border-b border-gray-100 dark:border-[#222]">
              <th colSpan={4} className="border-r border-gray-100 dark:border-[#222] sticky left-0 bg-gray-50 dark:bg-[#0a0a0a]"></th>
              {ruangList.map(r => (
                <th key={r.id} className="px-2 py-1.5 border-r border-gray-100 dark:border-[#222] min-w-[50px] text-indigo-600 dark:text-indigo-400">
                  {r.namaRuang}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
            {filteredSessions.map((sess, i) => {
              const d = new Date(sess.jadwal.tanggal);
              const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
              
              // Find order in same day
              const daySess = filteredSessions.filter(s => s.jadwal.tanggal === sess.jadwal.tanggal);
              const sessIdx = daySess.indexOf(sess);
              const roman = ['I', 'II', 'III', 'IV', 'V'][sessIdx] || (sessIdx + 1).toString();

              return (
                <tr key={sess.jadwal.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                  <td className="px-3 py-2.5 text-gray-400 border-r border-gray-50 dark:border-[#1a1a1a] text-center sticky left-0 bg-white dark:bg-[#050505]">{i + 1}</td>
                  <td className="px-3 py-2.5 border-r border-gray-50 dark:border-[#1a1a1a] sticky left-11 bg-white dark:bg-[#050505]">
                    <p className="font-bold text-text-primary dark:text-text-darkPrimary leading-tight">{hariNames[d.getDay()]}</p>
                    <p className="text-[10px] text-gray-400">{d.toLocaleDateString('id-ID')}</p>
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-amber-600 bg-amber-50/10 border-r border-gray-50 dark:border-[#1a1a1a]">{roman}</td>
                  <td className="px-2 py-2.5 text-center font-mono text-[10px] text-indigo-500 border-r border-gray-50 dark:border-[#1a1a1a]">
                    {sess.jadwal.waktuMulai}<br/>{sess.jadwal.waktuSelesai}
                  </td>
                  {ruangList.map(r => {
                    const codes = sess.assignments[r.id] || [];
                    return (
                      <td key={r.id} className="px-2 py-2.5 text-center border-r border-gray-50 dark:border-[#1a1a1a]">
                        {codes.length > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                             {codes.map((c: string) => (
                               <span key={c} className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                                 /^\d+$/.test(c) 
                                   ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                                   : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                               }`}>
                                 {c}
                               </span>
                             ))}
                          </div>
                        ) : '-'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filteredSessions.length === 0 && (
              <tr><td colSpan={ruangList.length + 4} className="px-3 py-16 text-center text-gray-400 italic">
                {loading ? 'Memuat data...' : 'Belum ada jadwal atau penugasan pengawas.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info / Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/20 bg-indigo-50/30 dark:bg-indigo-900/10">
           <h4 className="text-[10px] font-black uppercase text-indigo-500 mb-3 flex items-center gap-2">
             <Hash size={12} /> Legenda Kelompok I (Angka)
           </h4>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(ujian?.pengaturan?.pengawasGroups?.group1 || []).map((id: string, i: number) => {
                const emp = allEmployees.find(e => e.id === id);
                return (
                  <div key={id} className="text-[10px] flex items-center gap-2 bg-white dark:bg-[#111] p-1.5 rounded border border-indigo-100/50 dark:border-indigo-900/50 shadow-sm">
                    <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded font-bold text-[9px]">{i+1}</span>
                    <span className="truncate text-text-primary dark:text-text-darkPrimary font-medium">{emp?.name || '...'}</span> 
                  </div>
                );
              })}
           </div>
           {(!ujian?.pengaturan?.pengawasGroups?.group1?.length) && <p className="text-[10px] text-gray-400 italic">Belum diatur</p>}
        </div>
        <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/20 bg-amber-50/30 dark:bg-amber-900/10">
           <h4 className="text-[10px] font-black uppercase text-amber-500 mb-3 flex items-center gap-2">
             <Type size={12} /> Legenda Kelompok II (Huruf)
           </h4>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(ujian?.pengaturan?.pengawasGroups?.group2 || []).map((id: string, i: number) => {
                const alpha = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : '');
                const emp = allEmployees.find(e => e.id === id);
                return (
                  <div key={id} className="text-[10px] flex items-center gap-2 bg-white dark:bg-[#111] p-1.5 rounded border border-amber-100/50 dark:border-amber-900/50 shadow-sm">
                    <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-amber-500 text-white rounded font-bold text-[9px]">{alpha}</span>
                    <span className="truncate text-text-primary dark:text-text-darkPrimary font-medium">{emp?.name || '...'}</span>
                  </div>
                );
              })}
           </div>
           {(!ujian?.pengaturan?.pengawasGroups?.group2?.length) && <p className="text-[10px] text-gray-400 italic">Belum diatur</p>}
        </div>
      </div>

      <PengaturanPengawasModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        ujian={ujian}
        allEmployees={allEmployees}
        onSuccess={fetchData}
      />
    </div>
  );
};

const Hash = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>;
const Type = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>;
