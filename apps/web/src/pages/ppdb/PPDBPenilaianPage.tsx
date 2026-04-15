import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Save, Filter } from 'lucide-react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';

export const PPDBPenilaianPage = () => {
  const [loadingJalur, setLoadingJalur] = useState(true);
  const [jalurList, setJalurList] = useState<any[]>([]);
  const [selectedJalur, setSelectedJalur] = useState<string>('');

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Master Data
  const [tests, setTests] = useState<any[]>([]);
  const [pendaftar, setPendaftar] = useState<any[]>([]);
  // Local edits tracking
  const [edits, setEdits] = useState<Record<string, Record<string, number>>>({});

  // 1. Fetch available Jalurs that the user can grade (or just all Jalurs)
  const fetchJalurList = useCallback(async () => {
    setLoadingJalur(true);
    try {
      const data = await apiClient<any[]>('/ppdb/jalur');
      setJalurList(data || []);
      if (data && data.length > 0) {
        setSelectedJalur(data[0].id);
      }
    } catch(e) {
      toast.error('Gagal memuat daftar jalur');
    } finally {
      setLoadingJalur(false);
    }
  }, []);

  useEffect(() => { fetchJalurList(); }, [fetchJalurList]);

  // 2. Fetch Master Data whenever Jalur changes
  const fetchMasterData = useCallback(async (jalurId: string) => {
    setLoadingData(true);
    try {
      const res = await apiClient<any>(`/ppdb/penguji/master-penilaian?jalurId=${jalurId}`);
      if (res) {
        setTests(res.tests || []);
        
        // Transform the dictionary so local edits work smoothly
        const list = res.pendaftar || [];
        setPendaftar(list);

        // Reset local edits
        const initEdits: any = {};
        list.forEach((p: any) => {
          initEdits[p.pendaftarId] = { ...(p.nilaiTes || {}) };
        });
        setEdits(initEdits);
      }
    } catch(e) {
      toast.error('Gagal memuat data penilaian');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJalur) {
      fetchMasterData(selectedJalur);
    }
  }, [selectedJalur, fetchMasterData]);

  const handleUpdateNilai = (pendaftarId: string, tesId: string, val: string) => {
    let num = parseInt(val) || 0;
    if (num > 100) num = 100;
    if (num < 0) num = 0;
    
    setEdits(prev => ({
      ...prev,
      [pendaftarId]: {
        ...prev[pendaftarId],
        [tesId]: num
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any[] = [];
      tests.forEach(tes => {
        if (!tes.isOwnedByCurrentUser) return;
        
        pendaftar.forEach(p => {
          const val = edits[p.pendaftarId]?.[tes.id];
          if (val !== undefined && val !== null) {
            payload.push({
              tesConfigId: tes.id,
              pendaftarId: p.pendaftarId,
              nilai: val
            });
          }
        });
      });

      if (payload.length === 0) {
        toast.info("Tidak ada nilai baru untuk disimpan.");
        setSaving(false);
        return;
      }

      await apiClient(`/ppdb/penguji/master-penilaian/bulk`, {
        method: 'PUT',
        data: { data: payload }
      });
      
      toast.success('Nilai berhasil disimpan!');
      // Refresh to update computed Nilai Akhir
      fetchMasterData(selectedJalur);
    } catch(e: any) {
      toast.error(e.message || "Gagal menyimpan nilai");
    } finally {
      setSaving(false);
    }
  };

  // Compute live Nilai Akhir for UI based on edits
  const getLiveNilaiAkhir = (p: any) => {
    let sum = p.raportRataRata || 0;
    let count = 1;
    tests.forEach(t => {
      const val = edits[p.pendaftarId]?.[t.id];
      if (val !== undefined && val !== null) {
        sum += val;
        count++;
      }
    });
    return (sum / count).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'PPDB', href: '/dashboard/ppdb' },
        { label: 'Penilaian Terpadu', href: '/dashboard/ppdb/penilaian' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">Master Penilaian PMB</h1>
          <p className="text-gray-500 text-sm mt-1">Muara perhitungan akhir pendaftar. Kolom tes yang menjadi tugas Anda dapat langsung diubah.</p>
        </div>

        <div className="flex items-center gap-3">
          {loadingJalur ? (
            <div className="h-10 px-4 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter size={16} className="text-gray-400" />
              </div>
              <select
                value={selectedJalur}
                onChange={(e) => setSelectedJalur(e.target.value)}
                className="h-10 pl-10 pr-8 bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              >
                {jalurList.map(j => (
                  <option key={j.id} value={j.id}>{j.namaJalur}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={handleSave} 
            disabled={saving || loadingData || pendaftar.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 focus:ring-2 focus:ring-emerald-500 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Nilai
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#111]">
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-left font-semibold text-gray-600 whitespace-nowrap">No</th>
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-left font-semibold text-gray-600 whitespace-nowrap">Nama Peserta</th>
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-left font-semibold text-gray-600 whitespace-nowrap">NoPendaftar</th>
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-center font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">Nilai Rapor<br/><span className="text-[10px] font-normal tracking-wide uppercase opacity-70">Rata-rata Sem 1-5</span></th>
                
                {tests.map(t => (
                  <th key={t.id} className="px-4 py-3 border-b border-border-light dark:border-border-dark text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {t.namaTes}
                    {t.isOwnedByCurrentUser && <span className="block mt-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded px-1 w-max mx-auto">(Edit)</span>}
                  </th>
                ))}
                
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-center font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">Nilai Akhir<br/><span className="text-[10px] font-normal tracking-wide uppercase opacity-70">Rata-rata Total</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loadingData ? (
                <tr><td colSpan={5 + tests.length} className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={28}/></td></tr>
              ) : pendaftar.length === 0 ? (
                <tr><td colSpan={5 + tests.length} className="py-16 text-center text-gray-400 flex-col flex items-center justify-center"><Filter className="mb-2 opacity-50" size={32}/>Belum ada peserta di jalur ini.</td></tr>
              ) : (
                pendaftar.map((p, idx) => (
                  <tr key={p.pendaftarId} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{p.namaLengkap || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.noPendaftaran}</td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 font-bold">{p.raportRataRata || '0'}</td>
                    
                    {tests.map(t => (
                      <td key={t.id} className="px-4 py-3 text-center bg-gray-50/30 dark:bg-[#111]/30">
                        <input 
                          type="number" 
                          min="0" max="100"
                          title={t.isOwnedByCurrentUser ? `Input nilai ${t.namaTes}` : 'Hanya penguji tes ini yang dapat mengubah nilainya'}
                          disabled={!t.isOwnedByCurrentUser}
                          value={edits[p.pendaftarId]?.[t.id] ?? ''}
                          onChange={e => handleUpdateNilai(p.pendaftarId, t.id, e.target.value)}
                          className={`w-16 px-2 py-1.5 text-center font-bold border rounded-md outline-none transition-colors 
                            ${t.isOwnedByCurrentUser 
                              ? 'bg-white dark:bg-background-dark border-gray-300 dark:border-border-dark focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm' 
                              : 'bg-transparent border-transparent text-gray-500 cursor-not-allowed opacity-70'}`}
                          placeholder="0"
                        />
                      </td>
                    ))}

                    <td className="px-4 py-3 text-center font-black text-purple-600 dark:text-purple-400 text-lg bg-purple-50/30 dark:bg-purple-900/10">
                      {getLiveNilaiAkhir(p)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
