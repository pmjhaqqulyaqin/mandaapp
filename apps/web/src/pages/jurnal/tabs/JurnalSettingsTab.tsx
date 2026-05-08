import { useState, useEffect } from 'react';
import { useTeachingSubjects } from '../../../hooks/api/useJurnal';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Download, X, Save } from 'lucide-react';

const DAYS = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const JurnalSettingsTab = () => {
  const { query, createMut, updateMut, deleteMut, bulkMut } = useTeachingSubjects();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeId: '', classId: '', subjectName: '', dayOfWeek: 1, jamKe: '', waktuMulai: '', waktuSelesai: '', semester: 'ganjil', tahunAjaran: '2025/2026' });
  const [filterDay, setFilterDay] = useState(0);

  useEffect(() => {
    apiClient<any[]>('/employees').then(setEmployees).catch(() => {});
    apiClient<any[]>('/classes').then(setClasses).catch(() => {});
  }, []);

  const resetForm = () => { setForm({ employeeId: '', classId: '', subjectName: '', dayOfWeek: 1, jamKe: '', waktuMulai: '', waktuSelesai: '', semester: 'ganjil', tahunAjaran: '2025/2026' }); setEditId(''); setShowForm(false); };

  const handleSave = async () => {
    if (!form.employeeId || !form.classId || !form.subjectName) { toast.error('Lengkapi data wajib'); return; }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: form });
        toast.success('Jadwal diperbarui');
      } else {
        await createMut.mutateAsync(form);
        toast.success('Jadwal ditambahkan');
      }
      resetForm();
    } catch (err: any) { toast.error(err.message || 'Gagal menyimpan'); }
  };

  const handleEdit = (item: any) => {
    setForm({ employeeId: item.employeeId, classId: item.classId, subjectName: item.subjectName, dayOfWeek: item.dayOfWeek, jamKe: item.jamKe || '', waktuMulai: item.waktuMulai || '', waktuSelesai: item.waktuSelesai || '', semester: item.semester || 'ganjil', tahunAjaran: item.tahunAjaran || '2025/2026' });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus jadwal ini?')) return;
    try { await deleteMut.mutateAsync(id); toast.success('Dihapus'); } catch { toast.error('Gagal menghapus'); }
  };

  const filtered = query.data?.filter((s: any) => !filterDay || s.dayOfWeek === filterDay) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <select value={filterDay} onChange={e => setFilterDay(Number(e.target.value))}
            className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
            <option value={0}>Semua Hari</option>
            {DAYS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
          </select>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 active:scale-95">
          <Plus size={14} /> Tambah Jadwal
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">{editId ? 'Edit' : 'Tambah'} Jadwal Mengajar</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Guru *</label>
              <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs">
                <option value="">Pilih Guru</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Kelas *</label>
              <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs">
                <option value="">Pilih Kelas</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Mata Pelajaran *</label>
              <input type="text" placeholder="Matematika" value={form.subjectName} onChange={e => setForm(f => ({ ...f, subjectName: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Hari *</label>
              <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs">
                {DAYS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Jam Ke</label>
              <input type="text" placeholder="1-2" value={form.jamKe} onChange={e => setForm(f => ({ ...f, jamKe: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Semester</label>
              <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs">
                <option value="ganjil">Ganjil</option>
                <option value="genap">Genap</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:hover:bg-[#222]">Batal</button>
            <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 active:scale-95 flex items-center gap-1 disabled:opacity-50">
              <Save size={14} /> Simpan
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {query.isLoading && <p className="text-xs text-gray-500 text-center py-8">Memuat...</p>}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-[#0d0d0d]">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Guru</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Mapel</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Kelas</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Hari</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Jam</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-[#222]">
                  <td className="px-3 py-2 font-medium">{s.employeeName}</td>
                  <td className="px-3 py-2">{s.subjectName}</td>
                  <td className="px-3 py-2">{s.className}</td>
                  <td className="px-3 py-2 text-center">{DAYS[s.dayOfWeek]}</td>
                  <td className="px-3 py-2 text-center">{s.jamKe || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(s)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#333] rounded"><Pencil size={12} className="text-blue-500" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={12} className="text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !query.isLoading && <p className="text-xs text-gray-400 text-center py-8">Belum ada jadwal mengajar</p>}
        </div>
      </div>
    </div>
  );
};
