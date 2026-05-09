import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Save, Filter, ClipboardCheck, ShieldCheck, Lock } from 'lucide-react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { useAuth } from '../../contexts/AuthContext';

export const PPDBPenilaianPage = () => {
  const { user } = useAuth();

  const [loadingJalur, setLoadingJalur] = useState(true);
  const [jalurList, setJalurList] = useState<any[]>([]);
  const [selectedJalur, setSelectedJalur] = useState<string>('');

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Master Data
  const [tests, setTests] = useState<any[]>([]);
  const [pendaftar, setPendaftar] = useState<any[]>([]);
  // Whether current user is admin (returned by API)
  const [isAdminView, setIsAdminView] = useState(false);
  // Local edits tracking
  const [edits, setEdits] = useState<Record<string, Record<string, number>>>({});
  // Track original values from DB — used to lock admin editing on pre-existing scores
  const [originalNilai, setOriginalNilai] = useState<Record<string, Record<string, number>>>({});

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
        setIsAdminView(!!res.isAdmin);
        
        // Transform the dictionary so local edits work smoothly
        const list = res.pendaftar || [];
        setPendaftar(list);

        // Reset local edits & track original values from DB
        const initEdits: any = {};
        const initOriginal: any = {};
        list.forEach((p: any) => {
          initEdits[p.pendaftarId] = { ...(p.nilaiTes || {}) };
          initOriginal[p.pendaftarId] = { ...(p.nilaiTes || {}) };
        });
        setEdits(initEdits);
        setOriginalNilai(initOriginal);
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

  // Check if a cell is locked for admin (value already exists from penguji)
  const isCellLocked = (pendaftarId: string, tesId: string): boolean => {
    if (!isAdminView) return false; // Penguji can always edit their own tests
    const origVal = originalNilai[pendaftarId]?.[tesId];
    return origVal !== undefined && origVal !== null && origVal > 0;
  };

  const handleUpdateNilai = (pendaftarId: string, tesId: string, val: string) => {
    // Prevent admin from editing locked cells
    if (isCellLocked(pendaftarId, tesId)) return;
    
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
          // Skip locked cells for admin
          if (isCellLocked(p.pendaftarId, tes.id)) return;
          
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

  // Compute live Nilai Akhir for UI based on edits (Admin only)
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

  // Determine number of fixed columns (No + Nama + NoPendaftar + optionally Nilai Rapor)
  const fixedColCount = isAdminView ? 4 : 3;
  const totalColSpan = fixedColCount + tests.length + (isAdminView ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 md:gap-6">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'PPDB', href: '/dashboard/ppdb' },
        { label: isAdminView ? 'Penilaian Terpadu' : 'Input Nilai Tes', href: '/dashboard/ppdb/penilaian' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {isAdminView ? (
            <>
              <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <ShieldCheck size={24} className="text-emerald-500" />
                Master Penilaian PMB
              </h1>
              <p className="text-gray-500 text-sm mt-1">Muara perhitungan akhir pendaftar. Nilai yang sudah diinput penguji terkunci otomatis.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                <ClipboardCheck size={24} className="text-blue-500" />
                Input Nilai Tes
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Masukkan nilai untuk tes yang menjadi tugas Anda. 
                {tests.length > 0 && (
                  <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                    ({tests.map(t => t.namaTes).join(', ')})
                  </span>
                )}
              </p>
            </>
          )}
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

      {/* Info banner for penguji */}
      {!isAdminView && !loadingData && tests.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 flex items-start gap-3">
          <ClipboardCheck size={20} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Tes Anda:</strong> Anda ditugaskan untuk menilai <strong>{tests.map(t => t.namaTes).join(', ')}</strong>.
            Input nilai pada kolom di bawah, lalu klik <strong>"Simpan Nilai"</strong>. Nilai yang Anda simpan akan otomatis masuk ke Master Penilaian admin.
          </div>
        </div>
      )}

      {!isAdminView && !loadingData && tests.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-start gap-3">
          <Filter size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Belum ada tes yang ditugaskan.</strong> Hubungi admin untuk mengatur penugasan tes pada menu Konfigurasi PPDB.
          </div>
        </div>
      )}

      {/* Admin lock info banner */}
      {isAdminView && !loadingData && pendaftar.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-start gap-3">
          <Lock size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Proteksi Nilai:</strong> Nilai yang sudah diinput oleh penguji/penilai ditandai dengan ikon 🔒 dan <strong>tidak dapat diubah</strong> dari dashboard admin untuk mencegah manipulasi. Hanya penguji yang ditugaskan yang dapat mengubah nilainya.
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#111]">
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-left font-semibold text-gray-600 whitespace-nowrap">No</th>
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-left font-semibold text-gray-600 whitespace-nowrap">Nama Peserta</th>
                <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-left font-semibold text-gray-600 whitespace-nowrap">NoPendaftar</th>
                
                {/* Nilai Rapor column — only visible for admin */}
                {isAdminView && (
                  <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-center font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">Nilai Rapor<br/><span className="text-[10px] font-normal tracking-wide uppercase opacity-70">Rata-rata Sem 1-5</span></th>
                )}
                
                {tests.map(t => (
                  <th key={t.id} className={`px-4 py-3 border-b border-border-light dark:border-border-dark text-center font-bold whitespace-nowrap ${
                    t.isOwnedByCurrentUser 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {t.namaTes}
                    {!isAdminView && <span className="block mt-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded px-1 w-max mx-auto">✏️ Edit</span>}
                  </th>
                ))}
                
                {/* Nilai Akhir column — only visible for admin */}
                {isAdminView && (
                  <th className="px-4 py-3 border-b border-border-light dark:border-border-dark text-center font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">Nilai Akhir<br/><span className="text-[10px] font-normal tracking-wide uppercase opacity-70">Rata-rata Total</span></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loadingData ? (
                <tr><td colSpan={totalColSpan} className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={28}/></td></tr>
              ) : pendaftar.length === 0 ? (
                <tr><td colSpan={totalColSpan} className="py-16 text-center text-gray-400 flex-col flex items-center justify-center"><Filter className="mb-2 opacity-50" size={32}/>Belum ada peserta di jalur ini.</td></tr>
              ) : (
                pendaftar.map((p, idx) => (
                  <tr key={p.pendaftarId} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{p.namaLengkap || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.noPendaftaran}</td>
                    
                    {/* Nilai Rapor — admin only */}
                    {isAdminView && (
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 font-bold">{p.raportRataRata || '0'}</td>
                    )}
                    
                    {tests.map(t => {
                      const locked = isCellLocked(p.pendaftarId, t.id);
                      const canEdit = t.isOwnedByCurrentUser && !locked;
                      
                      return (
                        <td key={t.id} className={`px-4 py-3 text-center ${locked ? 'bg-amber-50/40 dark:bg-amber-900/10' : 'bg-gray-50/30 dark:bg-[#111]/30'}`}>
                          <div className="relative inline-flex items-center">
                            <input 
                              type="number" 
                              min="0" max="100"
                              title={locked ? '🔒 Nilai terkunci — sudah diinput oleh penguji' : (canEdit ? `Input nilai ${t.namaTes}` : 'Hanya penguji tes ini yang dapat mengubah nilainya')}
                              disabled={!canEdit}
                              value={edits[p.pendaftarId]?.[t.id] ?? ''}
                              onChange={e => handleUpdateNilai(p.pendaftarId, t.id, e.target.value)}
                              className={`w-16 px-2 py-1.5 text-center font-bold border rounded-md outline-none transition-colors 
                                ${locked
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 cursor-not-allowed'
                                  : canEdit 
                                    ? 'bg-white dark:bg-background-dark border-gray-300 dark:border-border-dark focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm' 
                                    : 'bg-transparent border-transparent text-gray-500 cursor-not-allowed opacity-70'}`}
                              placeholder="0"
                            />
                            {locked && (
                              <Lock size={10} className="absolute -top-1 -right-1 text-amber-500" />
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Nilai Akhir — admin only */}
                    {isAdminView && (
                      <td className="px-4 py-3 text-center font-black text-purple-600 dark:text-purple-400 text-lg bg-purple-50/30 dark:bg-purple-900/10">
                        {getLiveNilaiAkhir(p)}
                      </td>
                    )}
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
