import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { Plus, Trash2, Pencil, Database, Copy, Check, X, Clock, Hash, Settings2, CalendarOff, HelpCircle, Save, Download, Loader2, ShieldAlert, ListChecks, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  academicYearId: string;
  semester: string;
  academicYears: any[];
}

export const KBMSettingsTab = ({ academicYearId, semester, academicYears }: Props) => {
  const [activeSection, setActiveSection] = useState<'kodeGuru' | 'waktu' | 'tugas' | 'ruangan' | 'scheduler' | 'copy'>('kodeGuru');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: 'kodeGuru', label: 'Kode Guru' },
          { key: 'waktu', label: 'Waktu Pelajaran' },
          { key: 'tugas', label: 'Master Tugas' },
          { key: 'ruangan', label: 'Ruangan' },
          { key: 'scheduler', label: 'âš¡ Scheduler' },
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

      {activeSection === 'kodeGuru' && <KodeGuruSection />}
      {activeSection === 'waktu' && <WaktuPelajaranSection />}
      {activeSection === 'tugas' && <TugasMasterSection />}
      {activeSection === 'ruangan' && <RuanganSection />}
      {activeSection === 'scheduler' && <SchedulerSection academicYearId={academicYearId} semester={semester} />}
      {activeSection === 'copy' && <CopySemesterSection academicYearId={academicYearId} semester={semester} academicYears={academicYears} />}
    </div>
  );
};



// â•â•â• Kode Guru Section â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
                        {g.kodeGuru || <span className="text-gray-300 dark:text-gray-600">â€”</span>}
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

// â•â•â• Waktu Pelajaran Section â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
        <span className="text-gray-400">â€”</span>
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

// â•â•â• Tugas Master Section â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

// â•â•â• Ruangan Section â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    } catch (err: any) { 
      toast.error(err?.response?.data?.error || err.message || 'Gagal menghapus ruangan'); 
    }
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

// â•â•â• Copy Semester Section â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
          <span className="text-gray-400 text-lg">â†’</span>
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

// â•â•â• Scheduler Section (Per-Slot Availability + Config) â•â•â•â•â•â•

const SDAY_NAMES: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
const SDAY_SHORT: Record<number, string> = { 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab' };

type SlotStatus = 'available' | 'conditional' | 'unavailable';

const SchedulerSection = ({ academicYearId, semester }: { academicYearId: string; semester: string }) => {
  const [config, setConfig] = useState<any>(null);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<'availability' | 'pembatasan' | 'aturan' | 'config'>('availability');

  // Pembatasan guru state
  const [selGuruPembatasan, setSelGuruPembatasan] = useState('');
  const [pembatasanForm, setPembatasanForm] = useState({
    maxGapsPerWeek: null as number | null,
    maxTeachingDays: null as number | null,
    minLessonsPerDay: null as number | null,
    maxLessonsPerDay: null as number | null,
    maxConsecutiveLessons: null as number | null,
  });
  const [pembatasanSaving, setPembatasanSaving] = useState(false);

  // Aturan Jadwal state
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm, setRuleForm] = useState({
    ruleType: 'not_same_day',
    subjectIds: [] as string[],
    classScope: 'all',
    classIds: [] as string[],
    params: {} as any,
    priority: 'normal',
    notes: '',
  });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [subjectList, setSubjectList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);

  // Availability grid state
  const [selGuru, setSelGuru] = useState('');
  const [gridData, setGridData] = useState<Map<string, SlotStatus>>(new Map());
  const [gridLoading, setGridLoading] = useState(false);
  const [gridSaving, setGridSaving] = useState(false);
  const [gridDirty, setGridDirty] = useState(false);
  const [maxJam, setMaxJam] = useState(8);
  const [migrating, setMigrating] = useState(false);
  const [guruConstraintSummary, setGuruConstraintSummary] = useState<Map<string, number>>(new Map());

  const load = () => {
    if (!academicYearId) return;
    setLoading(true);
    Promise.all([
      apiClient<any>(`/kbm/schedule-config?academicYearId=${academicYearId}&semester=${semester}`).catch(() => ({ maxDailyJpThreshold: 20, maxDailyJpLimit: 6, afternoonStartJam: 7, afternoonExcludeFriday: true })),
      apiClient<any[]>('/employees?type=Guru').catch(() => []),
      apiClient<any[]>('/jurnal/time-slots').catch(() => []),
    ]).then(([c, g, ts]) => {
      setConfig(c);
      setGuruList(Array.isArray(g) ? (g as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)) : []);
      // Determine max jam from time slots
      const allJams = (ts as any[]).map((t: any) => t.jamKe);
      setMaxJam(allJams.length > 0 ? Math.max(...allJams) : 8);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [academicYearId, semester]);

  // Load guru's slot availability when guru changes
  const loadGuruAvailability = async (guruId: string) => {
    if (!guruId || !academicYearId) return;
    setGridLoading(true);
    try {
      const data = await apiClient<any[]>(`/kbm/guru-slot-availability?guruId=${guruId}&academicYearId=${academicYearId}&semester=${semester}`);
      const map = new Map<string, SlotStatus>();
      for (const d of data) {
        map.set(`${d.dayOfWeek}-${d.jamKe}`, d.status as SlotStatus);
      }
      setGridData(map);
      setGridDirty(false);
    } catch { setGridData(new Map()); }
    finally { setGridLoading(false); }
  };

  // Load summary of all guru constraints
  useEffect(() => {
    if (!academicYearId) return;
    apiClient<any[]>(`/kbm/guru-unavailability?academicYearId=${academicYearId}&semester=${semester}`)
      .then(data => {
        const summary = new Map<string, number>();
        for (const d of data) {
          summary.set(d.guruId, (summary.get(d.guruId) || 0) + 1);
        }
        setGuruConstraintSummary(summary);
      }).catch(() => {});
  }, [academicYearId, semester]);

  useEffect(() => {
    if (selGuru) loadGuruAvailability(selGuru);
  }, [selGuru]);

  const handleCellChange = (day: number, jam: number, status: SlotStatus) => {
    setGridData(prev => {
      const next = new Map(prev);
      if (status === 'available') next.delete(`${day}-${jam}`);
      else next.set(`${day}-${jam}`, status);
      return next;
    });
    setGridDirty(true);
  };

  const handleBatchToggleDay = (day: number) => {
    setGridData(prev => {
      const next = new Map(prev);
      // Check current dominant status for this day
      const jams = Array.from({ length: maxJam }, (_, i) => i + 1);
      const statuses = jams.map(j => next.get(`${day}-${j}`) || 'available');
      const allAvailable = statuses.every(s => s === 'available');
      const newStatus: SlotStatus = allAvailable ? 'unavailable' : 'available';
      for (const jam of jams) {
        if (newStatus === 'available') next.delete(`${day}-${jam}`);
        else next.set(`${day}-${jam}`, newStatus);
      }
      return next;
    });
    setGridDirty(true);
  };

  const handleBatchToggleJam = (jam: number) => {
    setGridData(prev => {
      const next = new Map(prev);
      const days = [1, 2, 3, 4, 5, 6];
      const statuses = days.map(d => next.get(`${d}-${jam}`) || 'available');
      const allAvailable = statuses.every(s => s === 'available');
      const newStatus: SlotStatus = allAvailable ? 'unavailable' : 'available';
      for (const day of days) {
        if (newStatus === 'available') next.delete(`${day}-${jam}`);
        else next.set(`${day}-${jam}`, newStatus);
      }
      return next;
    });
    setGridDirty(true);
  };

  const handleSetAll = () => {
    setGridData(new Map());
    setGridDirty(true);
  };

  const handleSaveAvailability = async () => {
    if (!selGuru || !academicYearId) return;
    setGridSaving(true);
    try {
      const slots: { dayOfWeek: number; jamKe: number; status: string }[] = [];
      for (const [key, status] of gridData) {
        const [day, jam] = key.split('-').map(Number);
        slots.push({ dayOfWeek: day, jamKe: jam, status });
      }
      await apiClient('/kbm/guru-slot-availability/bulk', {
        method: 'POST',
        data: { guruId: selGuru, academicYearId, semester, slots },
      });
      setGridDirty(false);
      toast.success('Ketersediaan disimpan');
    } catch (err: any) { toast.error(err.message || 'Gagal menyimpan'); }
    finally { setGridSaving(false); }
  };

  const handleMigrate = async () => {
    if (!confirm('Migrasi data "Hari Kosong Guru" lama ke format per-slot baru?\n\nHari kosong = semua jam di hari itu jadi âŒ tidak tersedia.')) return;
    setMigrating(true);
    try {
      const res = await apiClient<any>('/kbm/guru-slot-availability/migrate', {
        method: 'POST',
        data: { academicYearId, semester },
      });
      toast.success(res.message);
      if (selGuru) loadGuruAvailability(selGuru);
    } catch (err: any) { toast.error(err.message || 'Gagal migrasi'); }
    finally { setMigrating(false); }
  };

  const loadGuruPembatasan = async (guruId: string) => {
    if (!guruId) return;
    try {
      const guru = await apiClient<any>(`/employees/${guruId}`);
      setPembatasanForm({
        maxGapsPerWeek: guru.maxGapsPerWeek ?? null,
        maxTeachingDays: guru.maxTeachingDays ?? null,
        minLessonsPerDay: guru.minLessonsPerDay ?? null,
        maxLessonsPerDay: guru.maxLessonsPerDay ?? null,
        maxConsecutiveLessons: guru.maxConsecutiveLessons ?? null,
      });
    } catch {
      setPembatasanForm({ maxGapsPerWeek: null, maxTeachingDays: null, minLessonsPerDay: null, maxLessonsPerDay: null, maxConsecutiveLessons: null });
    }
  };

  const handleSavePembatasan = async () => {
    if (!selGuruPembatasan) return;
    setPembatasanSaving(true);
    try {
      await apiClient(`/employees/${selGuruPembatasan}`, {
        method: 'PUT',
        data: pembatasanForm,
      });
      toast.success('Pembatasan guru disimpan');
    } catch (err: any) { toast.error(err.message || 'Gagal menyimpan'); }
    finally { setPembatasanSaving(false); }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await apiClient('/kbm/schedule-config', {
        method: 'POST',
        data: {
          academicYearId, semester,
          maxDailyJpThreshold: Number(config.maxDailyJpThreshold) || 20,
          maxDailyJpLimit: Number(config.maxDailyJpLimit) || 6,
          afternoonStartJam: Number(config.afternoonStartJam) || 7,
          afternoonExcludeFriday: config.afternoonExcludeFriday !== false,
          defaultSplitRules: config.defaultSplitRules,
        },
      });
      toast.success('Konfigurasi disimpan');
    } catch (err: any) { toast.error(err.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  if (!academicYearId) return <p className="text-sm text-gray-400 py-6 text-center">Pilih Tahun Ajaran terlebih dahulu</p>;
  if (loading) return <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>;

  const days = [1, 2, 3, 4, 5, 6].map(d => ({ key: d, label: SDAY_NAMES[d], shortLabel: SDAY_SHORT[d] }));
  const jams = Array.from({ length: maxJam }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Panel Tabs */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setActivePanel('availability')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
            activePanel === 'availability'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#222]'
          }`}
        >
          <CalendarOff size={12} /> Ketersediaan Guru
        </button>
        <button
          onClick={() => setActivePanel('config')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
            activePanel === 'config'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#222]'
          }`}
        >
          <Settings2 size={12} /> Konfigurasi
        </button>
        <button
          onClick={() => setActivePanel('pembatasan')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
            activePanel === 'pembatasan'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#222]'
          }`}
        >
          <ShieldAlert size={12} /> Pembatasan Guru
        </button>
        <button
          onClick={() => setActivePanel('aturan')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
            activePanel === 'aturan'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#222]'
          }`}
        >
          <ListChecks size={12} /> Aturan Jadwal
        </button>
      </div>

      {/* â•â•â• Panel: Ketersediaan Guru â•â•â• */}
      {activePanel === 'availability' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <CalendarOff size={14} className="text-red-500" /> Waktu Kosong Guru
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Atur ketersediaan guru per hari dan jam. Scheduler akan otomatis menghindari slot yang tidak tersedia dan menghindari slot bersyarat sebisa mungkin.
            </p>
          </div>

          {/* Guru selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selGuru}
              onChange={e => { if (gridDirty && !confirm('Perubahan belum disimpan. Lanjutkan?')) return; setSelGuru(e.target.value); }}
              className="min-w-[220px] px-3 py-2 text-[12px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            >
              <option value="">Pilih Guru...</option>
              {guruList.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} {guruConstraintSummary.get(g.id) ? `(${guruConstraintSummary.get(g.id)} hari kosong)` : ''}
                </option>
              ))}
            </select>

            {selGuru && (
              <>
                <button
                  onClick={handleSetAll}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                >
                  <Check size={12} className="inline mr-1" /> Set Semua Tersedia
                </button>
                <button
                  onClick={handleSaveAvailability}
                  disabled={gridSaving || !gridDirty}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 disabled:opacity-40 transition-all"
                >
                  {gridSaving ? <><Loader2 size={12} className="animate-spin inline" /> Menyimpan...</> : <><Save size={12} className="inline" /> Simpan</>}
                </button>
                {gridDirty && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Belum disimpan</span>
                )}
              </>
            )}

            <div className="flex-1" />

            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] disabled:opacity-50 transition-all"
            >
              {migrating ? <><Loader2 size={12} className="animate-spin inline" /> Migrasi...</> : <><Download size={12} className="inline" /> Migrasi dari Hari Kosong</>}
            </button>
          </div>

          {/* Availability Grid */}
          {selGuru ? (
            gridLoading ? (
              <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#161616]">
                      <th className="px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 w-14 border-r border-gray-200 dark:border-[#333]" />
                      {jams.map(jam => (
                        <th
                          key={jam}
                          onClick={() => handleBatchToggleJam(jam)}
                          className="px-1 py-2.5 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-[#222] min-w-[44px] cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                        >
                          {jam}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day, dayIdx) => (
                      <tr key={day.key} className={`border-t ${dayIdx === 0 ? 'border-gray-200 dark:border-[#333]' : 'border-gray-100 dark:border-[#1a1a1a]'}`}>
                        <td
                          onClick={() => handleBatchToggleDay(day.key)}
                          className={`px-2 py-1.5 text-center text-[11px] font-bold border-r border-gray-200 dark:border-[#333] select-none cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all ${
                            day.key === 5 ? 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-500/5' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {day.shortLabel}
                        </td>
                        {jams.map(jam => {
                          const status = gridData.get(`${day.key}-${jam}`) || 'available';
                          const cfg = status === 'available'
                            ? { icon: <Check size={16} strokeWidth={3} />, bg: 'bg-emerald-50 dark:bg-emerald-500/15', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' }
                            : status === 'conditional'
                            ? { icon: <HelpCircle size={16} strokeWidth={2.5} />, bg: 'bg-amber-50 dark:bg-amber-500/15', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' }
                            : { icon: <X size={16} strokeWidth={3} />, bg: 'bg-red-50 dark:bg-red-500/15', border: 'border-red-200 dark:border-red-500/30', text: 'text-red-500 dark:text-red-400' };
                          return (
                            <td
                              key={jam}
                              onClick={() => handleCellChange(day.key, jam,
                                status === 'available' ? 'conditional' : status === 'conditional' ? 'unavailable' : 'available'
                              )}
                              className="px-0.5 py-0.5 text-center border-r border-gray-50 dark:border-[#1a1a1a] cursor-pointer"
                            >
                              <div className={`flex items-center justify-center w-full h-9 rounded-lg border transition-all hover:scale-105 hover:shadow-sm active:scale-95 ${cfg.bg} ${cfg.border} ${cfg.text} text-sm`}>
                                {cfg.icon}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-[12px]">
              <CalendarOff size={28} className="mx-auto mb-2 opacity-30" />
              <p>Pilih guru untuk mengatur ketersediaan per jam</p>
            </div>
          )}

          {/* Legend */}
          {selGuru && !gridLoading && (
            <div className="flex flex-wrap items-center gap-4 text-[10px]">
              <span className="text-gray-400">Keterangan :</span>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-5 h-5 rounded border bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><Check size={12} strokeWidth={3} /></div>
                <span className="text-gray-500 dark:text-gray-400 font-medium">Tersedia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-5 h-5 rounded border bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"><HelpCircle size={12} strokeWidth={2.5} /></div>
                <span className="text-gray-500 dark:text-gray-400 font-medium">Bersyarat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-5 h-5 rounded border bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400"><X size={12} strokeWidth={3} /></div>
                <span className="text-gray-500 dark:text-gray-400 font-medium">Tidak tersedia</span>
              </div>
              <p className="text-gray-400 dark:text-gray-500 ml-auto">
                Klik sel untuk mengatur. Klik header hari/jam untuk toggle seluruh baris/kolom.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Panel: Pembatasan Guru ═══ */}
      {activePanel === 'pembatasan' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <ShieldAlert size={14} className="text-violet-500" /> Pembatasan Guru
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Atur constraint penjadwalan per guru — batas jam jeda, hari mengajar, jumlah pelajaran, dan pelajaran berurutan.
            </p>
          </div>

          {/* Guru selector */}
          <select
            value={selGuruPembatasan}
            onChange={e => { setSelGuruPembatasan(e.target.value); if (e.target.value) loadGuruPembatasan(e.target.value); }}
            className="min-w-[220px] px-3 py-2 text-[12px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          >
            <option value="">Pilih Guru...</option>
            {guruList.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {selGuruPembatasan ? (
            <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] p-4 md:p-5 space-y-5">
              {/* Max Gaps Per Week */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batas Jumlah Jam Jeda per Minggu</label>
                <p className="text-[10px] text-gray-400">Misalnya, guru memiliki 3 jam jeda di jadwal jika ia memiliki pelajaran ke-2 dan kemudian ke-6.</p>
                <input
                  type="number"
                  value={pembatasanForm.maxGapsPerWeek ?? ''}
                  onChange={e => setPembatasanForm(f => ({ ...f, maxGapsPerWeek: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Kosongkan = tidak dibatasi"
                  className="w-full max-w-[200px] px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div className="border-t border-gray-100 dark:border-[#222]" />

              {/* Max Teaching Days */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batas Hari Mengajar</label>
                <p className="text-[10px] text-gray-400">Catatan: Anda dapat membatasi jumlah hari mengajar. Generator akan menyesuaikannya.</p>
                <select
                  value={pembatasanForm.maxTeachingDays ?? ''}
                  onChange={e => setPembatasanForm(f => ({ ...f, maxTeachingDays: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full max-w-[200px] px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  <option value="">Tidak dibatasi</option>
                  {[1, 2, 3, 4, 5, 6].map(d => (
                    <option key={d} value={d}>{d} hari</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-100 dark:border-[#222]" />

              {/* Min/Max Lessons Per Day */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min / Maks Jumlah Pelajaran per Hari</label>
                <p className="text-[10px] text-gray-400">Number of lessons per day must be in this interval.</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 max-w-[120px] space-y-1">
                    <span className="text-[10px] text-gray-400 font-medium">Min</span>
                    <input
                      type="number"
                      value={pembatasanForm.minLessonsPerDay ?? ''}
                      onChange={e => setPembatasanForm(f => ({ ...f, minLessonsPerDay: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="0"
                      className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                  <span className="text-gray-400 text-sm mt-5">—</span>
                  <div className="flex-1 max-w-[120px] space-y-1">
                    <span className="text-[10px] text-gray-400 font-medium">Maks</span>
                    <input
                      type="number"
                      value={pembatasanForm.maxLessonsPerDay ?? ''}
                      onChange={e => setPembatasanForm(f => ({ ...f, maxLessonsPerDay: e.target.value ? Number(e.target.value) : null }))}
                      placeholder={String(maxJam)}
                      className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-[#222]" />

              {/* Max Consecutive Lessons */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah Batas Pelajaran Berurutan</label>
                <p className="text-[10px] text-gray-400">Parameter ini membatasi jumlah JP guru mengajar secara berurutan.</p>
                <input
                  type="number"
                  value={pembatasanForm.maxConsecutiveLessons ?? ''}
                  onChange={e => setPembatasanForm(f => ({ ...f, maxConsecutiveLessons: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Kosongkan = tidak dibatasi"
                  className="w-full max-w-[200px] px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div className="border-t border-gray-100 dark:border-[#222] pt-3">
                <button
                  onClick={handleSavePembatasan}
                  disabled={pembatasanSaving}
                  className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold rounded-lg bg-violet-500 text-white hover:bg-violet-600 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {pembatasanSaving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> Simpan Pembatasan</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-[12px]">
              <ShieldAlert size={28} className="mx-auto mb-2 opacity-30" />
              <p>Pilih guru untuk mengatur pembatasan</p>
            </div>
          )}
        </div>
      )}

      {/* â•â•â• Panel: Konfigurasi Scheduler â•â•â• */}
      {activePanel === 'config' && config && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-amber-500" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Konfigurasi Scheduler</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-gray-400">Threshold JP Harian (guru dengan JP &gt; ini kena batas)</label>
              <input type="number" value={config.maxDailyJpThreshold || 20}
                onChange={e => setConfig({ ...config, maxDailyJpThreshold: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-gray-400">Maks JP per Hari (untuk guru di atas threshold)</label>
              <input type="number" value={config.maxDailyJpLimit || 6}
                onChange={e => setConfig({ ...config, maxDailyJpLimit: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-gray-400">Jam Siang Dimulai (mapel berat tidak boleh &ge; jam ini)</label>
              <input type="number" value={config.afternoonStartJam || 7}
                onChange={e => setConfig({ ...config, afternoonStartJam: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold text-gray-400">Jumat dikecualikan dari aturan siang?</label>
              <button
                onClick={() => setConfig({ ...config, afternoonExcludeFriday: !config.afternoonExcludeFriday })}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${config.afternoonExcludeFriday ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-[#222] text-gray-500'}`}
              >{config.afternoonExcludeFriday ? 'Ya, Jumat Dikecualikan' : 'Tidak, Semua Hari'}</button>
            </div>
            <div className="md:col-span-2">
              <button onClick={handleSaveConfig} disabled={saving}
                className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Panel: Aturan Jadwal ═══ */}
      {activePanel === 'aturan' && <AturanJadwalPanel
        rules={rules}
        setRules={setRules}
        rulesLoading={rulesLoading}
        setRulesLoading={setRulesLoading}
        showRuleForm={showRuleForm}
        setShowRuleForm={setShowRuleForm}
        editingRule={editingRule}
        setEditingRule={setEditingRule}
        ruleForm={ruleForm}
        setRuleForm={setRuleForm}
        ruleSaving={ruleSaving}
        setRuleSaving={setRuleSaving}
        subjectList={subjectList}
        setSubjectList={setSubjectList}
        classList={classList}
        setClassList={setClassList}
      />}
    </div>
  );
};


// ═══ Aturan Jadwal Panel (Scheduling Rules) ═══════════════════════════════════

const RULE_TYPES: Record<string, { label: string; description: string; needsTwo: boolean }> = {
  'not_same_day': { label: 'Tidak boleh di hari yang sama', description: 'Dua mapel tidak boleh dijadwalkan pada hari yang sama', needsTwo: true },
  'must_consecutive': { label: 'Harus berurutan', description: 'Dua mapel harus dijadwalkan berurutan (back-to-back)', needsTwo: true },
  'must_first_or_last': { label: 'Harus di jam pertama atau terakhir', description: 'Mapel harus dijadwalkan di jam pertama atau terakhir', needsTwo: false },
  'same_period_daily': { label: 'Jam yang sama setiap hari', description: 'Mapel harus selalu dijadwalkan di jam (period) yang sama setiap hari', needsTwo: false },
};

interface AturanJadwalPanelProps {
  rules: any[]; setRules: (r: any[]) => void;
  rulesLoading: boolean; setRulesLoading: (b: boolean) => void;
  showRuleForm: boolean; setShowRuleForm: (b: boolean) => void;
  editingRule: any; setEditingRule: (r: any) => void;
  ruleForm: any; setRuleForm: (f: any) => void;
  ruleSaving: boolean; setRuleSaving: (b: boolean) => void;
  subjectList: any[]; setSubjectList: (s: any[]) => void;
  classList: any[]; setClassList: (c: any[]) => void;
}

const AturanJadwalPanel = ({
  rules, setRules, rulesLoading, setRulesLoading,
  showRuleForm, setShowRuleForm, editingRule, setEditingRule,
  ruleForm, setRuleForm, ruleSaving, setRuleSaving,
  subjectList, setSubjectList, classList, setClassList,
}: AturanJadwalPanelProps) => {
  const loadRules = () => {
    setRulesLoading(true);
    apiClient<any[]>('/kbm/scheduling-rules').then(setRules).catch(() => setRules([])).finally(() => setRulesLoading(false));
  };

  useEffect(() => {
    loadRules();
    Promise.all([
      apiClient<any[]>('/kbm/subjects').catch(() => []),
      apiClient<any[]>('/classes').catch(() => []),
    ]).then(([s, c]) => {
      setSubjectList(Array.isArray(s) ? s : []);
      setClassList(Array.isArray(c) ? c : []);
    });
  }, []);

  const resetForm = () => {
    setRuleForm({ ruleType: 'not_same_day', subjectIds: [], classScope: 'all', classIds: [], params: {}, priority: 'normal', notes: '' });
    setEditingRule(null);
    setShowRuleForm(false);
  };

  const openEdit = (rule: any) => {
    setRuleForm({
      ruleType: rule.ruleType, subjectIds: rule.subjectIds || [],
      classScope: rule.classScope || 'all', classIds: rule.classIds || [],
      params: rule.params || {}, priority: rule.priority || 'normal', notes: rule.notes || '',
    });
    setEditingRule(rule);
    setShowRuleForm(true);
  };

  const handleSaveRule = async () => {
    if (ruleForm.subjectIds.length === 0) return toast.error('Pilih minimal 1 mata pelajaran');
    if (RULE_TYPES[ruleForm.ruleType]?.needsTwo && ruleForm.subjectIds.length < 2) return toast.error('Aturan ini memerlukan minimal 2 mata pelajaran');
    setRuleSaving(true);
    try {
      const payload = { ...ruleForm, classIds: ruleForm.classScope === 'all' ? null : ruleForm.classIds };
      if (editingRule) {
        await apiClient(`/kbm/scheduling-rules/${editingRule.id}`, { method: 'PUT', data: payload });
        toast.success('Aturan diperbarui');
      } else {
        await apiClient('/kbm/scheduling-rules', { method: 'POST', data: payload });
        toast.success('Aturan ditambahkan');
      }
      resetForm(); loadRules();
    } catch (err: any) { toast.error(err.message || 'Gagal menyimpan'); }
    finally { setRuleSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus aturan ini?')) return;
    try { await apiClient(`/kbm/scheduling-rules/${id}`, { method: 'DELETE' }); toast.success('Aturan dihapus'); loadRules(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (id: string) => {
    try { await apiClient(`/kbm/scheduling-rules/${id}/toggle`, { method: 'PUT' }); loadRules(); }
    catch (err: any) { toast.error(err.message); }
  };

  const toggleSubject = (sid: string) => setRuleForm((f: any) => ({ ...f, subjectIds: f.subjectIds.includes(sid) ? f.subjectIds.filter((x: string) => x !== sid) : [...f.subjectIds, sid] }));
  const toggleClass = (cid: string) => setRuleForm((f: any) => ({ ...f, classIds: f.classIds.includes(cid) ? f.classIds.filter((x: string) => x !== cid) : [...f.classIds, cid] }));
  const getSubjectName = (id: string) => subjectList.find((s: any) => s.id === id)?.name || id.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <ListChecks size={14} className="text-blue-500" /> Aturan Jadwal
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Atur relasi antar mata pelajaran — kapan boleh/tidak boleh dijadwalkan bersamaan.</p>
        </div>
        <button onClick={() => { resetForm(); setShowRuleForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all">
          <Plus size={12} /> Tambah Aturan
        </button>
      </div>

      {/* Form */}
      {showRuleForm && (
        <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-blue-200 dark:border-blue-500/30 p-4 md:p-5 space-y-4 shadow-sm">
          <h4 className="text-[12px] font-bold text-gray-700 dark:text-gray-200">{editingRule ? 'Edit Aturan' : 'Tambah Aturan Baru'}</h4>

          {/* Rule Type */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Tipe Aturan</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(RULE_TYPES).map(([key, cfg]) => (
                <button key={key} onClick={() => setRuleForm((f: any) => ({ ...f, ruleType: key }))}
                  className={`text-left p-2.5 rounded-lg border transition-all text-[11px] ${ruleForm.ruleType === key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-[#333] hover:border-gray-300 text-gray-600 dark:text-gray-400'}`}>
                  <div className="font-semibold">{cfg.label}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{cfg.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Pilih Mata Pelajaran {RULE_TYPES[ruleForm.ruleType]?.needsTwo ? '(minimal 2)' : '(minimal 1)'}
            </label>
            <div className="max-h-[160px] overflow-y-auto rounded-lg border border-gray-200 dark:border-[#333] p-2 space-y-1">
              {subjectList.map((s: any) => (
                <label key={s.id} className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-[11px] transition-all ${
                  ruleForm.subjectIds.includes(s.id) ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-[#111] text-gray-600 dark:text-gray-400'}`}>
                  <input type="checkbox" checked={ruleForm.subjectIds.includes(s.id)} onChange={() => toggleSubject(s.id)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                  {s.name}
                </label>
              ))}
              {subjectList.length === 0 && <p className="text-[10px] text-gray-400 text-center py-2">Belum ada mapel</p>}
            </div>
            {ruleForm.subjectIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ruleForm.subjectIds.map((id: string) => (
                  <span key={id} className="px-2 py-0.5 text-[9px] font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full">{getSubjectName(id)}</span>
                ))}
              </div>
            )}
          </div>

          {/* Class Scope */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Berlaku untuk Kelas</label>
            <div className="flex gap-2">
              <button onClick={() => setRuleForm((f: any) => ({ ...f, classScope: 'all' }))}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${ruleForm.classScope === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-[#222] text-gray-500'}`}>Semua Kelas</button>
              <button onClick={() => setRuleForm((f: any) => ({ ...f, classScope: 'selected' }))}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${ruleForm.classScope === 'selected' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-[#222] text-gray-500'}`}>Kelas Tertentu</button>
            </div>
            {ruleForm.classScope === 'selected' && (
              <div className="max-h-[120px] overflow-y-auto rounded-lg border border-gray-200 dark:border-[#333] p-2 space-y-1">
                {classList.map((c: any) => (
                  <label key={c.id} className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-[11px] transition-all ${
                    ruleForm.classIds.includes(c.id) ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-[#111] text-gray-600 dark:text-gray-400'}`}>
                    <input type="checkbox" checked={ruleForm.classIds.includes(c.id)} onChange={() => toggleClass(c.id)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Position param for must_first_or_last */}
          {ruleForm.ruleType === 'must_first_or_last' && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Posisi</label>
              <select value={ruleForm.params?.position || 'first_or_last'}
                onChange={e => setRuleForm((f: any) => ({ ...f, params: { ...f.params, position: e.target.value } }))}
                className="px-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none">
                <option value="first_or_last">Jam Pertama atau Terakhir</option>
                <option value="first">Jam Pertama saja</option>
                <option value="last">Jam Terakhir saja</option>
              </select>
            </div>
          )}

          {/* Priority + Notes */}
          <div className="flex gap-3">
            <div className="space-y-1 w-32">
              <label className="text-[10px] font-semibold text-gray-400">Prioritas</label>
              <select value={ruleForm.priority} onChange={e => setRuleForm((f: any) => ({ ...f, priority: e.target.value }))}
                className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none">
                <option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option>
              </select>
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-semibold text-gray-400">Catatan (opsional)</label>
              <input type="text" value={ruleForm.notes} onChange={e => setRuleForm((f: any) => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan tambahan..." className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none" />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222]">
            <button onClick={resetForm} className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-gray-100 dark:bg-[#222] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#333] transition-all">Batal</button>
            <button onClick={handleSaveRule} disabled={ruleSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 active:scale-95 disabled:opacity-50 transition-all">
              {ruleSaving ? <><Loader2 size={12} className="animate-spin" /> Menyimpan...</> : <><Save size={12} /> {editingRule ? 'Perbarui' : 'Simpan'}</>}
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {rulesLoading ? (
        <div className="py-10 text-center"><div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-blue-500 border-t-transparent" /></div>
      ) : rules.length === 0 ? (
        <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-[12px]">
          <ListChecks size={28} className="mx-auto mb-2 opacity-30" />
          <p>Belum ada aturan jadwal. Klik "Tambah Aturan" untuk memulai.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule: any) => {
            const cfg = RULE_TYPES[rule.ruleType] || { label: rule.ruleType };
            const subjectNames = (rule.subjectIds || []).map((id: string) => getSubjectName(id));
            const pColors: Record<string, string> = {
              low: 'bg-gray-100 dark:bg-gray-500/20 text-gray-500',
              normal: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
              high: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
            };
            return (
              <div key={rule.id} className={`group bg-white dark:bg-[#0a0a0a] rounded-xl border p-3 transition-all ${rule.isActive ? 'border-gray-200 dark:border-[#222]' : 'border-gray-100 dark:border-[#1a1a1a] opacity-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{cfg.label}</span>
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded ${pColors[rule.priority] || pColors.normal}`}>
                        {rule.priority === 'high' ? 'Tinggi' : rule.priority === 'low' ? 'Rendah' : 'Normal'}
                      </span>
                      {!rule.isActive && <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300">Nonaktif</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {subjectNames.map((n: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-[9px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-500/30">{n}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-400">{rule.classScope === 'all' ? 'Semua Kelas' : `${(rule.classIds || []).length} kelas terpilih`}</span>
                      {rule.notes && <span className="text-[9px] text-gray-400 italic">• {rule.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleToggle(rule.id)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] transition-colors" title={rule.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                      {rule.isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} className="text-gray-400" />}
                    </button>
                    <button onClick={() => openEdit(rule)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-blue-500 transition-colors" title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(rule.id)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-red-500 transition-colors" title="Hapus"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

