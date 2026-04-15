import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Plus, ArrowLeft, Save, Star } from 'lucide-react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';

export const PPDBPenilaianPage = () => {
  const [tesList, setTesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTes, setSelectedTes] = useState<any | null>(null);

  const fetchTesList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<any[]>('/ppdb/penguji/tes');
      setTesList(data || []);
    } catch(e: any) {
      toast.error('Gagal memuat daftar tes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTesList(); }, [fetchTesList]);

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={32} /></div>;

  if (selectedTes) {
    return <PenilaianEditor tes={selectedTes} onBack={() => setSelectedTes(null)} />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'PPDB', href: '/dashboard/ppdb' },
        { label: 'Penilaian Ujian/Tes', href: '/dashboard/ppdb/penilaian' },
      ]} />

      <div>
        <h1 className="text-2xl font-black text-gray-800 dark:text-white">Ujian & Penilaian PMB</h1>
        <p className="text-gray-500 text-sm mt-1">Daftar tes yang ditugaskan kepada Anda untuk dinilai.</p>
      </div>

      {tesList.length === 0 ? (
        <div className="bg-white dark:bg-[#111] p-12 text-center rounded-xl border border-border-light dark:border-border-dark">
          <p className="text-gray-400">Belum ada tes/ujian yang ditugaskan kepada Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tesList.map(tes => (
            <div key={tes.id} className="bg-white dark:bg-background-dark border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-xl hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => setSelectedTes(tes)}>
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-3">
                <Star size={18} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-lg">{tes.namaTes}</h3>
              <p className="text-sm text-gray-500 mb-4">Jalur: <span className="font-semibold text-emerald-600">{tes.namaJalur}</span></p>
              
              <div className="flex items-center text-xs font-bold text-emerald-600 gap-1 mt-2">
                <span>Mulai Penilaian</span>
                <ArrowLeft size={14} className="rotate-180" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PenilaianEditor = ({ tes, onBack }: { tes: any, onBack: () => void }) => {
  const [peserta, setPeserta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPeserta = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<any[]>(`/ppdb/penguji/tes/${tes.id}/peserta`);
      setPeserta(data || []);
    } catch(e) {
      toast.error('Gagal memuat peserta');
    } finally {
      setLoading(false);
    }
  }, [tes.id]);

  useEffect(() => { fetchPeserta(); }, [fetchPeserta]);

  const handleUpdateNilai = (pendaftarId: string, val: string) => {
    let num = parseInt(val) || 0;
    if(num > 100) num = 100;
    if(num < 0) num = 0;
    setPeserta(prev => prev.map(p => p.pendaftarId === pendaftarId ? { ...p, nilai: num } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient(`/ppdb/penguji/tes/${tes.id}/nilai`, {
        method: 'PUT',
        data: { data: peserta.map(p => ({ pendaftarId: p.pendaftarId, nilai: p.nilai })) }
      });
      toast.success('Nilai berhasil disimpan!');
    } catch(e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">Input Nilai: {tes.namaTes}</h1>
          <p className="text-gray-500 text-sm mt-1">Jalur {tes.namaJalur} • Skala Penilaian 0-100</p>
        </div>
        <div className="flex-1" />
        <button 
          onClick={handleSave} 
          disabled={saving || peserta.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Nilai
        </button>
      </div>

      <div className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#111]">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">No. Pendaftaran</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Nama Siswa</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Asal Sekolah</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 w-32">Nilai (0-100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {loading ? (
                <tr><td colSpan={4} className="py-12"><Loader2 className="animate-spin mx-auto text-emerald-500" size={20}/></td></tr>
              ) : peserta.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-gray-400">Belum ada peserta di jalur ini.</td></tr>
              ) : (
                peserta.map(p => (
                  <tr key={p.pendaftarId} className="hover:bg-gray-50 dark:hover:bg-[#0a0a0a]">
                    <td className="px-4 py-3 font-mono text-xs">{p.noPendaftaran}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{p.namaLengkap || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.sekolahAsal || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="number" 
                        min="0" max="100"
                        value={p.nilai}
                        onChange={e => handleUpdateNilai(p.pendaftarId, e.target.value)}
                        className="w-20 px-2 py-1.5 text-center font-bold bg-white dark:bg-black border border-gray-200 dark:border-[#333] rounded-md outline-none focus:border-emerald-500"
                      />
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
