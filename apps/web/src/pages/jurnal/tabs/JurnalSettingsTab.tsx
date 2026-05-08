import { useState, useEffect, useRef } from 'react';
import { useTeachingSubjects } from '../../../hooks/api/useJurnal';
import { apiClient, API_BASE_URL } from '../../../lib/api';
import { jurnalService } from '../../../lib/services/jurnal';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Download, X, Save, FileSpreadsheet, AlertTriangle, Hash, BookOpen } from 'lucide-react';

const DAYS = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const JurnalSettingsTab = () => {
  const { query, createMut, updateMut, deleteMut, bulkMut, importMut } = useTeachingSubjects();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeId: '', classId: '', subjectName: '', dayOfWeek: 1, jamKe: '', waktuMulai: '', waktuSelesai: '' });
  const [filterDay, setFilterDay] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[]; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showKodeGuru, setShowKodeGuru] = useState(false);
  const [teacherCodes, setTeacherCodes] = useState<any[]>([]);
  const [editedCodes, setEditedCodes] = useState<Record<string, string>>({});
  const [savingCodes, setSavingCodes] = useState(false);
  const [showKodeMapel, setShowKodeMapel] = useState(false);
  const [mapelCodes, setMapelCodes] = useState<any[]>([]);
  const [newMapelKode, setNewMapelKode] = useState('');
  const [newMapelName, setNewMapelName] = useState('');
  const [savingMapel, setSavingMapel] = useState(false);

  useEffect(() => {
    apiClient<any[]>('/employees').then(setEmployees).catch(() => {});
    apiClient<any[]>('/classes').then(setClasses).catch(() => {});
  }, []);

  const loadTeacherCodes = async () => {
    try {
      const data = await jurnalService.getTeacherCodes();
      setTeacherCodes(data);
      const codes: Record<string, string> = {};
      data.forEach((t: any) => { codes[t.id] = t.kodeGuru || ''; });
      setEditedCodes(codes);
    } catch { toast.error('Gagal memuat kode guru'); }
  };

  const handleSaveCodes = async () => {
    setSavingCodes(true);
    try {
      const codes = Object.entries(editedCodes).map(([employeeId, kodeGuru]) => ({ employeeId, kodeGuru }));
      await jurnalService.updateTeacherCodes(codes);
      toast.success('Kode guru tersimpan');
      await loadTeacherCodes();
    } catch { toast.error('Gagal menyimpan'); }
    setSavingCodes(false);
  };

  const loadMapelCodes = async () => {
    try {
      const data = await jurnalService.getMapelCodes();
      setMapelCodes(data);
    } catch { toast.error('Gagal memuat kode mapel'); }
  };

  const handleEditMapel = (id: string, field: 'kode' | 'subjectName', value: string) => {
    setMapelCodes(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSaveMapelCodes = async () => {
    setSavingMapel(true);
    try {
      await jurnalService.upsertMapelCodes(mapelCodes.map(m => ({ id: m.id, kode: m.kode, subjectName: m.subjectName })));
      toast.success('Kode mapel tersimpan');
      await loadMapelCodes();
    } catch { toast.error('Gagal menyimpan'); }
    setSavingMapel(false);
  };

  const handleAddMapel = async () => {
    if (!newMapelKode || !newMapelName) { toast.error('Isi kode dan nama mapel'); return; }
    setSavingMapel(true);
    try {
      await jurnalService.upsertMapelCodes([{ kode: newMapelKode.toUpperCase(), subjectName: newMapelName }]);
      setNewMapelKode(''); setNewMapelName('');
      toast.success('Mapel ditambahkan');
      await loadMapelCodes();
    } catch { toast.error('Gagal menambah'); }
    setSavingMapel(false);
  };

  const handleDeleteMapel = async (id: string) => {
    if (!confirm('Hapus kode mapel ini?')) return;
    try {
      await jurnalService.deleteMapelCode(id);
      toast.success('Dihapus');
      await loadMapelCodes();
    } catch { toast.error('Gagal menghapus'); }
  };

  const resetForm = () => { setForm({ employeeId: '', classId: '', subjectName: '', dayOfWeek: 1, jamKe: '', waktuMulai: '', waktuSelesai: '' }); setEditId(''); setShowForm(false); };

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
    setForm({ employeeId: item.employeeId, classId: item.classId, subjectName: item.subjectName, dayOfWeek: item.dayOfWeek, jamKe: item.jamKe || '', waktuMulai: item.waktuMulai || '', waktuSelesai: item.waktuSelesai || '' });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus jadwal ini?')) return;
    try { await deleteMut.mutateAsync(id); toast.success('Dihapus'); } catch { toast.error('Gagal menghapus'); }
  };

  const filtered = query.data?.filter((s: any) => !filterDay || s.dayOfWeek === filterDay) || [];

  const handleDownloadTemplate = () => {
    window.open(`${API_BASE_URL}/jurnal/teaching-subjects/template`, '_blank');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await importMut.mutateAsync(fd);
      setImportResult(result);
      if (result.imported > 0) toast.success(`${result.imported} jadwal berhasil diimpor`);
      if (result.errors?.length > 0) toast.warning(`${result.errors.length} baris bermasalah`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengimpor');
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <select value={filterDay} onChange={e => setFilterDay(Number(e.target.value))}
            className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
            <option value={0}>Semua Hari</option>
            {DAYS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-600 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-95 transition-all">
            <Download size={14} /> Template Excel
          </button>
          <label className={`flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 cursor-pointer transition-all ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={14} /> {importing ? 'Mengimpor...' : 'Import Excel'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 active:scale-95">
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      {/* Import Result Modal */}
      {importResult && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-emerald-600" /> Hasil Import
            </h3>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-[#111] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-white">{importResult.total}</p>
              <p className="text-[10px] font-semibold text-gray-500">Total Baris</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{importResult.imported}</p>
              <p className="text-[10px] font-semibold text-emerald-600">Berhasil</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-red-600">{importResult.errors.length}</p>
              <p className="text-[10px] font-semibold text-red-600">Error</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Detail Error:</p>
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-[11px] text-red-600 dark:text-red-400">• {err}</p>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Kode Guru Management */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button onClick={() => { setShowKodeGuru(!showKodeGuru); if (!showKodeGuru && teacherCodes.length === 0) loadTeacherCodes(); }}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Hash size={14} /> Kelola Kode Guru
          </span>
          <span className="text-[10px] text-gray-400">{showKodeGuru ? '▲' : '▼'}</span>
        </button>
        {showKodeGuru && (
          <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-500 py-2">Atur kode singkat guru untuk digunakan di template Excel jadwal. Kode ini akan tampil di sheet "Kode Guru".</p>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {teacherCodes.filter((t: any) => t.type === 'Guru').map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 py-1">
                  <input
                    type="text" placeholder="-" maxLength={5}
                    value={editedCodes[t.id] || ''}
                    onChange={e => setEditedCodes(c => ({ ...c, [t.id]: e.target.value }))}
                    className="w-14 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-center font-bold"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{t.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{t.nip}</span>
                </div>
              ))}
              {teacherCodes.filter((t: any) => t.type === 'Guru').length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Memuat...</p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={handleSaveCodes} disabled={savingCodes}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 active:scale-95 flex items-center gap-1 disabled:opacity-50">
                <Save size={14} /> {savingCodes ? 'Menyimpan...' : 'Simpan Kode'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kode Mapel Management */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button onClick={() => { setShowKodeMapel(!showKodeMapel); if (!showKodeMapel && mapelCodes.length === 0) loadMapelCodes(); }}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={14} /> Kelola Kode Mapel
          </span>
          <span className="text-[10px] text-gray-400">{showKodeMapel ? '▲' : '▼'}</span>
        </button>
        {showKodeMapel && (
          <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-500 py-2">Atur kode huruf untuk setiap mata pelajaran. Kode ini digunakan di template Excel jadwal (misal: A=Al-Quran Hadits).</p>
            {/* Add new */}
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="Kode" maxLength={3} value={newMapelKode}
                onChange={e => setNewMapelKode(e.target.value.toUpperCase())}
                className="w-14 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-center font-bold" />
              <input type="text" placeholder="Nama Mata Pelajaran" value={newMapelName}
                onChange={e => setNewMapelName(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs" />
              <button onClick={handleAddMapel} disabled={savingMapel}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 flex items-center gap-1 disabled:opacity-50">
                <Plus size={12} /> Tambah
              </button>
            </div>
            {/* List */}
            <div className="max-h-72 overflow-y-auto space-y-1">
              {mapelCodes.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 py-1 group">
                  <input type="text" maxLength={3} value={m.kode}
                    onChange={e => handleEditMapel(m.id, 'kode', e.target.value.toUpperCase())}
                    className="w-14 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-center font-bold" />
                  <input type="text" value={m.subjectName}
                    onChange={e => handleEditMapel(m.id, 'subjectName', e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs" />
                  <button onClick={() => handleDeleteMapel(m.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              ))}
              {mapelCodes.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Memuat...</p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={handleSaveMapelCodes} disabled={savingMapel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 flex items-center gap-1 disabled:opacity-50">
                <Save size={14} /> {savingMapel ? 'Menyimpan...' : 'Simpan Kode Mapel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
