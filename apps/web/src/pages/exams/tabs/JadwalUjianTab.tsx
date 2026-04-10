import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Upload, Download, Printer, Search } from 'lucide-react';

interface Props {
  ujianId: string;
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const JadwalUjianTab = ({ ujianId }: Props) => {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    tanggal: '', waktuMulai: '', waktuSelesai: '', mataPelajaran: '', kelas: ''
  });

  const fetchJadwal = async () => {
    setLoading(true);
    try {
      const data = await apiClient<any[]>(`/exams/${ujianId}/jadwal`);
      setJadwal(data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJadwal(); }, [ujianId]);

  const resetForm = () => {
    setForm({ tanggal: '', waktuMulai: '', waktuSelesai: '', mataPelajaran: '', kelas: '' });
    setEditId(null);
    setShowAdd(false);
  };

  const handleSave = async () => {
    if (!form.tanggal || !form.waktuMulai || !form.waktuSelesai || !form.mataPelajaran) {
      toast.error('Mohon lengkapi tanggal, waktu, dan mata pelajaran');
      return;
    }
    try {
      if (editId) {
        await apiClient(`/exams/jadwal/${editId}`, { method: 'PUT', data: form });
        toast.success('Jadwal diperbarui');
      } else {
        await apiClient(`/exams/${ujianId}/jadwal`, { data: form });
        toast.success('Jadwal ditambahkan');
      }
      fetchJadwal();
      resetForm();
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus jadwal ini?')) return;
    try {
      await apiClient(`/exams/jadwal/${id}`, { method: 'DELETE' });
      fetchJadwal();
    } catch { }
  };

  const handleEdit = (item: any) => {
    setForm({
      tanggal: item.tanggal,
      waktuMulai: item.waktuMulai,
      waktuSelesai: item.waktuSelesai,
      mataPelajaran: item.mataPelajaran,
      kelas: item.kelas || ''
    });
    setEditId(item.id);
    setShowAdd(true);
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await apiClient<any>(`/exams/${ujianId}/jadwal/upload`, { data: formData });
      toast.success(`${result.imported} jadwal berhasil diimport`);
      fetchJadwal();
    } catch (err: any) {
      toast.error('Gagal import: ' + err.message);
    }
    e.target.value = '';
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL}/exams/${ujianId}/jadwal/export`, '_blank');
    toast.success('Mengunduh jadwal...');
  };

  const handlePrint = () => { window.print(); };

  const filtered = jadwal.filter(j =>
    j.mataPelajaran?.toLowerCase().includes(search.toLowerCase()) ||
    j.kelas?.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { resetForm(); setShowAdd(!showAdd); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95">
          <Plus size={14} /> Input Manual
        </button>
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer transition-colors">
          <Upload size={14} /> Upload Excel
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUploadExcel} />
        </label>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          <Download size={14} /> Export Excel
        </button>
        <button onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          <Printer size={14} /> Cetak
        </button>
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Cari mapel/kelas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-indigo-600 mb-2">{editId ? '✏️ Edit Jadwal' : '✚ Tambah Jadwal Baru'}</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Tanggal</label>
              <input type="date" className={inputClass} value={form.tanggal} onChange={e => setForm({...form, tanggal: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Waktu Mulai</label>
              <input type="time" className={inputClass} value={form.waktuMulai} onChange={e => setForm({...form, waktuMulai: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Waktu Selesai</label>
              <input type="time" className={inputClass} value={form.waktuSelesai} onChange={e => setForm({...form, waktuSelesai: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Mata Pelajaran</label>
              <input className={inputClass} placeholder="Matematika" value={form.mataPelajaran} onChange={e => setForm({...form, mataPelajaran: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Kelas</label>
              <input className={inputClass} placeholder="X-IPA-1, X-IPA-2" value={form.kelas} onChange={e => setForm({...form, kelas: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={resetForm} className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333]">Batal</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-[10px] font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
              {editId ? 'Update' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#222]">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-black/20 text-[10px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">No</th>
              <th className="px-3 py-2.5 font-semibold">Hari</th>
              <th className="px-3 py-2.5 font-semibold">Tanggal</th>
              <th className="px-3 py-2.5 font-semibold">Waktu</th>
              <th className="px-3 py-2.5 font-semibold">Mata Pelajaran</th>
              <th className="px-3 py-2.5 font-semibold">Kelas</th>
              <th className="px-3 py-2.5 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
            {filtered.map((item: any, i: number) => {
              const d = new Date(item.tanggal);
              return (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors group">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary dark:text-text-darkPrimary">{HARI[d.getDay()]}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{d.toLocaleDateString('id-ID')}</td>
                  <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{item.waktuMulai} — {item.waktuSelesai}</td>
                  <td className="px-3 py-2 font-semibold text-text-primary dark:text-text-darkPrimary">{item.mataPelajaran}</td>
                  <td className="px-3 py-2 text-gray-500">{item.kelas || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(item)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 size={12} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">
                {loading ? 'Memuat...' : 'Belum ada jadwal ujian. Tambahkan jadwal secara manual atau upload Excel.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400">
        Total: {filtered.length} jadwal • Template Excel: Tanggal | Waktu Mulai | Waktu Selesai | Mata Pelajaran | Kelas
      </p>
    </div>
  );
};
