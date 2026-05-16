import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { Plus, Trash2, Pencil, Database, Copy, Check, X, Clock, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  academicYearId: string;
  semester: string;
  academicYears: any[];
}

export const KBMSettingsTab = ({ academicYearId, semester, academicYears }: Props) => {
  const [activeSection, setActiveSection] = useState<'mapel' | 'kodeGuru' | 'waktu' | 'tugas' | 'ruangan' | 'copy'>('mapel');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: 'mapel', label: 'Master Mapel' },
          { key: 'kodeGuru', label: 'Kode Guru' },
          { key: 'waktu', label: 'Waktu Pelajaran' },
          { key: 'tugas', label: 'Master Tugas' },
          { key: 'ruangan', label: 'Ruangan' },
          { key: 'copy', label: 'Copy Semester' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key as any)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              activeSection === s.key
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#222]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'mapel' && <MapelSection />}
      {activeSection === 'kodeGuru' && <KodeGuruSection />}
      {activeSection === 'waktu' && <WaktuPelajaranSection />}
      {activeSection === 'tugas' && <TugasMasterSection />}
      {activeSection === 'ruangan' && <RuanganSection />}
      {activeSection === 'copy' && <CopySemesterSection academicYearId={academicYearId} semester={semester} academicYears={academicYears} />}
    </div>
  );
};

// ═══ Mapel Section ═══════════════════════════════════════════

const MapelSection = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKode, setNewKode] = useState('');
  const [newNama, setNewNama] = useState('');

  const load = () => {
    setLoading(true);
    apiClient<any[]>('/kbm/subjects').then(setSubjects).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newKode.trim() || !newNama.trim()) return toast.error('Kode dan Nama wajib diisi');
    try {
      await apiClient('/kbm/subjects', { method: 'POST', data: { kode: newKode.trim(), nama: newNama.trim() } });
      setNewKode(''); setNewNama('');
      load();
      toast.success('Mapel ditambahkan');
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan mapel ini?')) return;
    try {
      await apiClient(`/kbm/subjects/${id}`, { method: 'DELETE' });
      load();
      toast.success('Mapel dinonaktifkan');
    } catch { toast.error('Gagal'); }
  };

  const handleSeed = async () => {
    try {
      const res = await apiClient<any>('/kbm/subjects/seed', { method: 'POST' });
      toast.success(res.message);
      load();
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Master Mata Pelajaran</h3>
        <button onClick={handleSeed} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
          <Database size={12} /> Seed Default
        </button>
      </div>

      {/* Add Form */}
      <div className="flex items-center gap-2">
        <input type="text" value={newKode} onChange={e => setNewKode(e.target.value)} placeholder="Kode" className="w-16 px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-amber-500" />
        <input type="text" value={newNama} onChange={e => setNewNama(e.target.value)} placeholder="Nama Mata Pelajaran" className="flex-1 px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-amber-500" onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
        <button onClick={handleAdd} className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95"><Plus size={14} /></button>
      </div>

      {loading ? (
        <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50 dark:bg-[#161616]">
              <th className="px-3 py-2 text-left font-semibold text-gray-500 w-16">Kode</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500">Nama</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-16">Status</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-14">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {subjects.map(s => (
                <tr key={s.id} className={`${!s.isActive ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-1.5 font-bold text-amber-600 dark:text-amber-400">{s.kode}</td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{s.nama}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-[10px] font-semibold ${s.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {s.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {s.isActive && (
                      <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══ Kode Guru Section ═══════════════════════════════════════

const KodeGuruSection = () => {
  const [gurus, setGurus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editKode, setEditKode] = useState('');

  const load = () => {
    setLoading(true);
    apiClient<any[]>('/kbm/guru-kode').then(setGurus).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (id: string) => {
    try {
      await apiClient(`/kbm/guru-kode/${id}`, { method: 'PUT', data: { kodeGuru: editKode } });
      setEditId(null);
      load();
      toast.success('Kode diperbarui');
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const handleAutoAssign = async () => {
    if (!confirm('Assign kode otomatis (1, 2, 3, ...) untuk semua guru?')) return;
    try {
      const res = await apiClient<any>('/kbm/guru-kode/auto', { method: 'POST' });
      toast.success(res.message);
      load();
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Kode Guru</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Kode singkat untuk format jadwal Excel (misal: 1, 2, 3...)</p>
        </div>
        <button onClick={handleAutoAssign} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
          <Hash size={12} /> Auto Assign
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50 dark:bg-[#161616]">
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-16">Kode</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500">Nama Guru</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 hidden md:table-cell">NIP</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-14">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {gurus.map((g, i) => (
                <tr key={g.id}>
                  <td className="px-3 py-1.5 text-center">
                    {editId === g.id ? (
                      <input
                        type="text"
                        value={editKode}
                        onChange={e => setEditKode(e.target.value)}
                        className="w-12 h-7 text-center text-[12px] rounded border border-amber-400 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(g.id); if (e.key === 'Escape') setEditId(null); }}
                      />
                    ) : (
                      <span
                        className="font-bold text-amber-600 dark:text-amber-400 cursor-pointer hover:underline"
                        onClick={() => { setEditId(g.id); setEditKode(g.kodeGuru || ''); }}
                      >
                        {g.kodeGuru || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{g.name}</td>
                  <td className="px-3 py-1.5 text-gray-400 hidden md:table-cell text-[11px]">{g.nip}</td>
                  <td className="px-3 py-1.5 text-center">
                    {editId === g.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleSave(g.id)} className="p-0.5 rounded text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><Check size={12} /></button>
                        <button onClick={() => setEditId(null)} className="p-0.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222]"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditId(g.id); setEditKode(g.kodeGuru || ''); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-400 hover:text-amber-500">
                        <Pencil size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══ Waktu Pelajaran Section ═════════════════════════════════

const DAY_NAMES: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

const WaktuPelajaranSection = () => {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [newJam, setNewJam] = useState('');
  const [newMulai, setNewMulai] = useState('');
  const [newSelesai, setNewSelesai] = useState('');

  const load = () => {
    setLoading(true);
    apiClient<any[]>('/jurnal/time-slots').then(setSlots).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const daySlots = slots.filter(s => s.dayOfWeek === selectedDay).sort((a, b) => a.jamKe - b.jamKe);

  const handleSave = async () => {
    if (!newJam || !newMulai || !newSelesai) return toast.error('Lengkapi semua field');
    try {
      await apiClient('/jurnal/time-slots', {
        method: 'POST',
        data: { slots: [{ dayOfWeek: selectedDay, jamKe: Number(newJam), waktuMulai: newMulai, waktuSelesai: newSelesai }] },
      });
      setNewJam(''); setNewMulai(''); setNewSelesai('');
      load();
      toast.success('Waktu disimpan');
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const handleCopyDay = async (fromDay: number) => {
    try {
      await apiClient('/jurnal/time-slots/copy', { method: 'POST', data: { fromDay, toDay: selectedDay } });
      load();
      toast.success(`Berhasil copy dari ${DAY_NAMES[fromDay]}`);
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient(`/jurnal/time-slots/${id}`, { method: 'DELETE' });
      load();
      toast.success('Dihapus');
    } catch { toast.error('Gagal'); }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Kelola Waktu Pelajaran</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">Atur jam pelajaran per hari. Digunakan oleh auto-scheduler dan Jurnal Mengajar.</p>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map(d => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              selectedDay === d ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#222]'
            }`}
          >{DAY_NAMES[d]}</button>
        ))}
      </div>

      {/* Copy from another day */}
      <div className="flex items-center gap-2 text-[11px] text-gray-400">
        <span>Copy dari:</span>
        {[1, 2, 3, 4, 5, 6].filter(d => d !== selectedDay).map(d => (
          <button key={d} onClick={() => handleCopyDay(d)} className="px-2 py-0.5 rounded border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-[10px]">
            {DAY_NAMES[d]}
          </button>
        ))}
      </div>

      {/* Add slot */}
      <div className="flex items-center gap-2">
        <input type="number" value={newJam} onChange={e => setNewJam(e.target.value)} placeholder="Jam Ke" className="w-16 px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
        <input type="time" value={newMulai} onChange={e => setNewMulai(e.target.value)} className="px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
        <span className="text-gray-400">—</span>
        <input type="time" value={newSelesai} onChange={e => setNewSelesai(e.target.value)} className="px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
        <button onClick={handleSave} className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95"><Plus size={14} /></button>
      </div>

      {loading ? (
        <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
      ) : daySlots.length === 0 ? (
        <p className="text-[12px] text-gray-400 py-6 text-center">Belum ada waktu untuk {DAY_NAMES[selectedDay]}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50 dark:bg-[#161616]">
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-16">Jam Ke</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500">Mulai</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500">Selesai</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-14">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {daySlots.map(s => (
                <tr key={s.id}>
                  <td className="px-3 py-1.5 text-center font-bold text-amber-600 dark:text-amber-400">{s.jamKe}</td>
                  <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">
                    <Clock size={11} className="inline mr-1 opacity-40" />{s.waktuMulai}
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">{s.waktuSelesai}</td>
                  <td className="px-3 py-1.5 text-center">
                    <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══ Tugas Master Section ════════════════════════════════════

const TugasMasterSection = () => {
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNama, setNewNama] = useState('');
  const [newKategori, setNewKategori] = useState('kurikulum');
  const [newJam, setNewJam] = useState('2');

  const load = () => {
    setLoading(true);
    apiClient<any[]>('/kbm/tugas-master').then(setMasters).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newNama.trim()) return toast.error('Nama tugas wajib diisi');
    try {
      await apiClient('/kbm/tugas-master', { method: 'POST', data: { namaTugas: newNama.trim(), kategori: newKategori, defaultSetaraJam: Number(newJam) || 0 } });
      setNewNama('');
      load();
      toast.success('Tugas ditambahkan');
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus template tugas ini?')) return;
    try {
      await apiClient(`/kbm/tugas-master/${id}`, { method: 'DELETE' });
      load();
      toast.success('Dihapus');
    } catch { toast.error('Gagal'); }
  };

  const handleSeed = async () => {
    try {
      const res = await apiClient<any>('/kbm/tugas-master/seed', { method: 'POST' });
      toast.success(res.message);
      load();
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const katLabels: Record<string, string> = { struktural: 'Struktural', kurikulum: 'Kurikulum', kesiswaan: 'Kesiswaan' };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Master Tugas Tambahan</h3>
        <button onClick={handleSeed} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
          <Database size={12} /> Seed Default
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" value={newNama} onChange={e => setNewNama(e.target.value)} placeholder="Nama Tugas" className="flex-1 min-w-[150px] px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-amber-500" />
        <select value={newKategori} onChange={e => setNewKategori(e.target.value)} className="px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none">
          <option value="struktural">Struktural</option>
          <option value="kurikulum">Kurikulum</option>
          <option value="kesiswaan">Kesiswaan</option>
        </select>
        <input type="number" value={newJam} onChange={e => setNewJam(e.target.value)} placeholder="Jam" className="w-14 px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-amber-500" />
        <button onClick={handleAdd} className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95"><Plus size={14} /></button>
      </div>

      {loading ? (
        <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50 dark:bg-[#161616]">
              <th className="px-3 py-2 text-left font-semibold text-gray-500">Nama Tugas</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-24">Kategori</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-20">Default Jam</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-14">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {masters.map(m => (
                <tr key={m.id}>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{m.namaTugas}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      m.kategori === 'struktural' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                      m.kategori === 'kurikulum' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                      'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                    }`}>{katLabels[m.kategori]}</span>
                  </td>
                  <td className="px-3 py-1.5 text-center font-bold text-gray-700 dark:text-gray-300">{m.defaultSetaraJam}</td>
                  <td className="px-3 py-1.5 text-center">
                    <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══ Ruangan Section ═════════════════════════════════════════

const RuanganSection = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNama, setNewNama] = useState('');
  const [newTipe, setNewTipe] = useState('reguler');
  const [newKapasitas, setNewKapasitas] = useState('40');

  const load = () => {
    setLoading(true);
    apiClient<any[]>('/kbm/ruangan').then(setRooms).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newNama.trim()) return toast.error('Nama ruangan wajib diisi');
    try {
      await apiClient('/kbm/ruangan', { method: 'POST', data: { nama: newNama.trim(), tipe: newTipe, kapasitas: Number(newKapasitas) || 40 } });
      setNewNama('');
      load();
      toast.success('Ruangan ditambahkan');
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus ruangan ini?')) return;
    try {
      await apiClient(`/kbm/ruangan/${id}`, { method: 'DELETE' });
      load();
      toast.success('Dihapus');
    } catch { toast.error('Gagal'); }
  };

  const handleSeedFromClasses = async () => {
    try {
      const res = await apiClient<any>('/kbm/ruangan/seed', { method: 'POST' });
      toast.success(res.message);
      load();
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
  };

  const tipeLabels: Record<string, string> = { reguler: 'Reguler', lab_ipa: 'Lab IPA', lab_agama: 'Lab Agama', lab_komputer: 'Lab Komputer', perpustakaan: 'Perpustakaan' };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Manajemen Ruangan</h3>
        <button onClick={handleSeedFromClasses} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
          <Database size={12} /> Seed dari Kelas
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" value={newNama} onChange={e => setNewNama(e.target.value)} placeholder="Nama Ruangan" className="flex-1 min-w-[150px] px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-amber-500" />
        <select value={newTipe} onChange={e => setNewTipe(e.target.value)} className="px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none">
          {Object.entries(tipeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="number" value={newKapasitas} onChange={e => setNewKapasitas(e.target.value)} placeholder="Kap" className="w-14 px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
        <button onClick={handleAdd} className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95"><Plus size={14} /></button>
      </div>

      {loading ? (
        <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-gray-50 dark:bg-[#161616]">
              <th className="px-3 py-2 text-left font-semibold text-gray-500">Nama</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-24">Tipe</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-20">Kapasitas</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-500 w-14">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {rooms.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Belum ada ruangan</td></tr>
              ) : rooms.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-medium">{r.nama}</td>
                  <td className="px-3 py-1.5 text-center text-[11px] text-gray-500">{tipeLabels[r.tipe] || r.tipe}</td>
                  <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">{r.kapasitas}</td>
                  <td className="px-3 py-1.5 text-center">
                    <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ═══ Copy Semester Section ═══════════════════════════════════

const CopySemesterSection = ({ academicYearId, semester, academicYears }: { academicYearId: string; semester: string; academicYears: any[] }) => {
  const [sourceAY, setSourceAY] = useState('');
  const [sourceSem, setSourceSem] = useState('ganjil');
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!sourceAY) return toast.error('Pilih semester sumber');
    if (sourceAY === academicYearId && sourceSem === semester) return toast.error('Semester sumber dan tujuan tidak boleh sama');
    if (!confirm(`Copy distribusi jam & tugas dari ${sourceSem} ke semester aktif?`)) return;
    setCopying(true);
    try {
      const res = await apiClient<any>('/kbm/distribusi/copy', {
        method: 'POST',
        data: { sourceAYId: sourceAY, sourceSem, targetAYId: academicYearId, targetSem: semester },
      });
      toast.success(`Berhasil copy ${res.copiedDistribusi} distribusi + ${res.copiedTugas} tugas`);
    } catch (err: any) { toast.error(err.message || 'Gagal copy'); }
    finally { setCopying(false); }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Copy dari Semester Lain</h3>
      <p className="text-[11px] text-gray-400">Copy distribusi jam mengajar dan tugas tambahan dari semester sebelumnya ke semester aktif saat ini.</p>

      <div className="flex items-center gap-2 flex-wrap">
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1">Sumber: Tahun Ajaran</label>
          <select value={sourceAY} onChange={e => setSourceAY(e.target.value)} className="px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none min-w-[140px]">
            <option value="">Pilih...</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.tahunAjaran}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 mb-1">Semester</label>
          <select value={sourceSem} onChange={e => setSourceSem(e.target.value)} className="px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none">
            <option value="ganjil">Ganjil</option>
            <option value="genap">Genap</option>
          </select>
        </div>
        <div className="pt-4">
          <span className="text-gray-400 text-lg">→</span>
        </div>
        <div className="pt-4">
          <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">
            Semester Aktif ({semester === 'ganjil' ? 'Ganjil' : 'Genap'})
          </span>
        </div>
      </div>

      <button
        onClick={handleCopy}
        disabled={copying || !sourceAY}
        className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:shadow-md active:scale-95 transition-all disabled:opacity-50"
      >
        <Copy size={14} /> {copying ? 'Menyalin...' : 'Copy Sekarang'}
      </button>
    </div>
  );
};
