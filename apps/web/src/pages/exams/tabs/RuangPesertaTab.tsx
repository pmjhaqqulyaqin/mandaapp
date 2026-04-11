import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Wand2, Download, Printer, Search, DoorOpen, Users, RefreshCw } from 'lucide-react';

interface Props {
  ujianId: string;
}

export const RuangPesertaTab = ({ ujianId }: Props) => {
  const [ruangList, setRuangList] = useState<any[]>([]);
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRuang, setShowAddRuang] = useState(false);
  const [ruangForm, setRuangForm] = useState({ namaRuang: '', kapasitas: 30 });
  const [editRuangId, setEditRuangId] = useState<string | null>(null);
  const [showDistribusi, setShowDistribusi] = useState(false);
  const [distMode, setDistMode] = useState<'kelas' | 'acak' | 'urut'>('kelas');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRuang, setFilterRuang] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, d, c] = await Promise.all([
        apiClient<any[]>(`/exams/${ujianId}/ruang`),
        apiClient<any[]>(`/exams/${ujianId}/distribusi`),
        apiClient<any[]>('/classes').catch(() => []),
      ]);
      setRuangList(r);
      setDistribusi(d);
      setClassesList(c);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [ujianId]);

  // Ruang CRUD
  const handleSaveRuang = async () => {
    if (!ruangForm.namaRuang) { toast.error('Nama ruang wajib diisi'); return; }
    try {
      if (editRuangId) {
        await apiClient(`/exams/ruang/${editRuangId}`, { method: 'PUT', data: ruangForm });
        toast.success('Ruang diperbarui');
      } else {
        await apiClient(`/exams/${ujianId}/ruang`, { data: ruangForm });
        toast.success('Ruang ditambahkan');
      }
      fetchAll();
      setShowAddRuang(false);
      setRuangForm({ namaRuang: '', kapasitas: 30 });
      setEditRuangId(null);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleDeleteRuang = async (id: string) => {
    if (!confirm('Hapus ruang ujian ini?')) return;
    try {
      await apiClient(`/exams/ruang/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch { }
  };

  const handleEditRuang = (r: any) => {
    setRuangForm({ namaRuang: r.namaRuang, kapasitas: r.kapasitas });
    setEditRuangId(r.id);
    setShowAddRuang(true);
  };

  // Distribusi
  const handleGenerate = async () => {
    if (distribusi.length > 0 && !confirm('Distribusi sebelumnya akan dihapus. Lanjutkan?')) return;
    setGenerating(true);
    try {
      const result = await apiClient<any>(`/exams/${ujianId}/distribusi/generate`, {
        data: { mode: distMode, kelasIds: selectedKelasIds.length > 0 ? selectedKelasIds : undefined }
      });
      toast.success(`${result.distributed} peserta berhasil didistribusikan`);
      fetchAll();
      setShowDistribusi(false);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearDistribusi = async () => {
    if (!confirm('Hapus semua distribusi peserta?')) return;
    try {
      await apiClient(`/exams/${ujianId}/distribusi`, { method: 'DELETE' });
      toast.success('Distribusi dihapus');
      fetchAll();
    } catch { }
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL}/exams/${ujianId}/distribusi/export`, '_blank');
  };

  const filtered = distribusi.filter(d => {
    const matchSearch = !search ||
      d.siswa?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      d.siswa?.nis?.includes(search) ||
      d.siswa?.nisn?.includes(search);
    const matchRuang = !filterRuang || d.ruangId === filterRuang;
    return matchSearch && matchRuang;
  });

  // Stats per ruang
  const ruangStats = ruangList.map(r => ({
    ...r,
    pesertaCount: distribusi.filter(d => d.ruangId === r.id).length
  }));

  const inputClass = "w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="space-y-4">
      {/* Ruang Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <DoorOpen size={14} className="text-indigo-500" /> Master Ruang Ujian
          </h3>
          <button onClick={() => { setEditRuangId(null); setRuangForm({ namaRuang: '', kapasitas: 30 }); setShowAddRuang(!showAddRuang); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all">
            <Plus size={12} /> Tambah Ruang
          </button>
        </div>

        {showAddRuang && (
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-3 mb-3 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Nama Ruang</label>
              <input className={inputClass} placeholder="R.01" value={ruangForm.namaRuang} onChange={e => setRuangForm({...ruangForm, namaRuang: e.target.value})} />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Kapasitas</label>
              <input type="number" className={inputClass} value={ruangForm.kapasitas} onChange={e => setRuangForm({...ruangForm, kapasitas: Number(e.target.value)})} />
            </div>
            <button onClick={handleSaveRuang} className="px-3 py-1.5 text-[10px] font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 h-8">
              {editRuangId ? 'Update' : 'Simpan'}
            </button>
            <button onClick={() => { setShowAddRuang(false); setEditRuangId(null); }} className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333] h-8">
              Batal
            </button>
          </div>
        )}

        {ruangStats.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {ruangStats.map(r => (
              <div key={r.id} className={`relative bg-white dark:bg-[#0a0a0a] border rounded-lg p-3 group cursor-pointer transition-all hover:border-indigo-400 ${filterRuang === r.id ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-gray-200 dark:border-[#222]'}`}
                onClick={() => setFilterRuang(filterRuang === r.id ? '' : r.id)}>
                <p className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">{r.namaRuang}</p>
                <p className="text-[10px] text-gray-500">{r.pesertaCount}/{r.kapasitas} peserta</p>
                <div className="w-full bg-gray-100 dark:bg-[#222] rounded-full h-1.5 mt-1.5">
                  <div className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (r.pesertaCount / r.kapasitas) * 100)}%` }} />
                </div>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEditRuang(r); }} className="p-1 rounded hover:bg-blue-50 text-blue-500"><Edit2 size={10} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRuang(r.id); }} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-6 text-center">
            <DoorOpen size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Belum ada ruang ujian. Tambahkan ruang terlebih dahulu.</p>
          </div>
        )}
      </div>

      {/* Distribusi Peserta Section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <Users size={14} className="text-violet-500" /> Distribusi Peserta
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setShowDistribusi(!showDistribusi)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-all">
              <Wand2 size={12} /> Distribusi Otomatis
            </button>
            {distribusi.length > 0 && (
              <>
                <button onClick={handleExport}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                  <Download size={12} /> Export
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                  <Printer size={12} /> Cetak
                </button>
                <button onClick={handleClearDistribusi}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md border border-red-200 dark:border-red-800/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                  <Trash2 size={12} /> Reset
                </button>
              </>
            )}
          </div>
        </div>

        {showDistribusi && (
          <div className="bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-lg p-3 mb-3 space-y-3">
            <p className="text-xs font-semibold text-violet-600">🎯 Pilih Mode Distribusi</p>
            <div className="flex gap-3">
              {([
                ['kelas', '📚 By Kelas', 'Kelompokkan per kelas'],
                ['acak', '🎲 Acak', 'Random seat assignment'],
                ['urut', '📋 No. Urut', 'Berdasarkan NIS'],
              ] as const).map(([mode, label, desc]) => (
                <button key={mode} onClick={() => setDistMode(mode)}
                  className={`flex-1 p-2.5 rounded-lg border text-left transition-all ${
                    distMode === mode
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 ring-1 ring-violet-500/30'
                      : 'border-gray-200 dark:border-[#333] hover:border-violet-300'
                  }`}>
                  <p className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary">{label}</p>
                  <p className="text-[10px] text-gray-500">{desc}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Filter Kelas (opsional)</label>
              <div className="flex flex-wrap gap-1.5">
                {classesList.map(c => (
                  <button key={c.id} onClick={() => {
                    setSelectedKelasIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                  }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      selectedKelasIds.includes(c.id)
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-400 hover:bg-violet-50'
                    }`}>
                    {c.name}{(c.majorName || c.majorCode) ? (/^\d+$/.test(c.majorName || c.majorCode) ? `-${c.majorName || c.majorCode}` : ` ${c.majorName || c.majorCode}`) : ''}
                  </button>
                ))}
                {classesList.length === 0 && <span className="text-[10px] text-gray-400 italic">Tidak ada kelas. Semua siswa aktif akan didistribusikan.</span>}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDistribusi(false)}
                className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333]">Batal</button>
              <button onClick={handleGenerate} disabled={generating}
                className="px-4 py-1.5 text-[10px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                {generating ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                Generate Distribusi
              </button>
            </div>
          </div>
        )}

        {/* Peserta table */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="h-8 pl-8 pr-3 w-full rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Cari nama/NIS..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filterRuang && (
            <button onClick={() => setFilterRuang('')} className="text-[10px] text-indigo-500 font-medium hover:text-indigo-600">
              × Clear filter ruang
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">No</th>
                <th className="px-3 py-2.5 font-semibold">Ruang</th>
                <th className="px-3 py-2.5 font-semibold">Meja</th>
                <th className="px-3 py-2.5 font-semibold">NIS</th>
                <th className="px-3 py-2.5 font-semibold">NISN</th>
                <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                <th className="px-3 py-2.5 font-semibold">Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
              {filtered.slice(0, 100).map((item: any, i: number) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-bold">
                      {item.ruang?.namaRuang || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-indigo-600">{item.nomorMeja || '-'}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{item.siswa?.nis || '-'}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{item.siswa?.nisn || '-'}</td>
                  <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">{item.siswa?.fullName || '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{item.siswa?.className || '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">
                  {loading ? 'Memuat...' : 'Belum ada distribusi peserta. Buat ruang, lalu gunakan "Distribusi Otomatis".'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <p className="text-[10px] text-amber-500 mt-1">Menampilkan 100 dari {filtered.length} peserta. Export Excel untuk data lengkap.</p>
        )}
        <p className="text-[10px] text-gray-400">Total: {filtered.length} peserta • {ruangList.length} ruang</p>
      </div>
    </div>
  );
};
