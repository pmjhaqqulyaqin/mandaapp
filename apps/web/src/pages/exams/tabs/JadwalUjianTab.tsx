import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Upload, Download, Printer, Search } from 'lucide-react';
import { DataTableToolbar } from '../../../components/DataTableToolbar';

interface Props {
  ujianId: string;
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const JadwalUjianTab = ({ ujianId }: Props) => {
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [classList, setClassList] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [ujianData, setUjianData] = useState<any>(null);
  const [form, setForm] = useState({
    tanggal: '', waktuMulai: '', waktuSelesai: '', subjectId: '', kelas: '', sesiKe: '1'
  });

  const fetchJadwal = async () => {
    setLoading(true);
    try {
      const [data, uData, cData, sData] = await Promise.all([
        apiClient<any[]>(`/exams/${ujianId}/jadwal`),
        apiClient<any>(`/exams/${ujianId}`),
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/subjects')
      ]);
      setJadwal(data);
      setUjianData(uData);
      setClassList(cData);
      setSubjects(sData);

      if (uData.tanggalMulai && uData.tanggalSelesai) {
        try {
          const hData = await apiClient<any[]>(`/events/range?start=${uData.tanggalMulai}&end=${uData.tanggalSelesai}`);
          setHolidays(hData.filter((e: any) => ['holiday', 'cuti_bersama', 'semester_ganjil', 'semester_genap'].includes(e.category)));
        } catch { }
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJadwal(); }, [ujianId]);

  const resetForm = () => {
    setForm({ tanggal: '', waktuMulai: '', waktuSelesai: '', subjectId: '', kelas: '', sesiKe: '1' });
    setEditId(null);
    setShowAdd(false);
  };

  const handleSave = async () => {
    if (!form.tanggal || !form.waktuMulai || !form.waktuSelesai || !form.subjectId) {
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
      subjectId: item.subjectId || '',
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
    toast.success('Mengunduh Laporan Jadwal Ujian...');
  };

  const handleDownloadTemplate = () => {
    window.open(`${import.meta.env.VITE_API_URL}/exams/${ujianId}/jadwal/template`, '_blank');
    toast.success('Mengunduh Template Excel...');
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
        <button onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          <Download size={14} /> Template Excel
        </button>
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 cursor-pointer transition-colors">
          <Upload size={14} /> Upload Excel
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUploadExcel} />
        </label>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-colors">
          <Printer size={14} /> Export / Cetak Jadwal
        </button>
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Cari mapel/kelas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* DataTable Toolbar */}
      <DataTableToolbar
        data={filtered}
        columns={[
          { header: 'Tanggal', key: 'tanggal', transform: (v) => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
          { header: 'Waktu Mulai', key: 'waktuMulai', transform: (v) => v || '-' },
          { header: 'Waktu Selesai', key: 'waktuSelesai', transform: (v) => v || '-' },
          { header: 'Mata Pelajaran', key: 'mataPelajaran', transform: (v) => v || '-' },
          { header: 'Kelas', key: 'kelas', transform: (v) => v || '-' },
        ]}
        fileName="Jadwal_Ujian"
        title="Jadwal Ujian"
        entriesPerPage={filtered.length}
        onEntriesPerPageChange={() => {}}
        totalEntries={filtered.length}
      />

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-indigo-600 mb-2">{editId ? '✏️ Edit Jadwal' : '✚ Tambah Jadwal Baru'}</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Tanggal</label>
              <input type="date" className={inputClass} 
                min={ujianData?.tanggalMulai}
                max={ujianData?.tanggalSelesai}
                value={form.tanggal} onChange={e => {
                  const t = e.target.value;
                  if (!t) return setForm({...form, tanggal: ''});
                  if (new Date(t).getDay() === 0) {
                    toast.error('Hari Minggu tidak diperbolehkan');
                    return setForm({...form, tanggal: ''});
                  }
                  const isHoliday = holidays.find(h => t >= h.eventDate && t <= (h.endDate || h.eventDate));
                  if (isHoliday) {
                    toast.error(`Hari libur: ${isHoliday.title}`);
                    return setForm({...form, tanggal: ''});
                  }
                  let wm = form.waktuMulai, ws = form.waktuSelesai;
                  if(t && ujianData?.pengaturan?.waktuSesi) {
                    const d = new Date(t);
                    const isJumat = d.getDay() === 5;
                    const wcfg = isJumat ? ujianData.pengaturan.waktuSesi.jumat : ujianData.pengaturan.waktuSesi.normal;
                    const sIdx = form.sesiKe === '2' ? 1 : 0;
                    if(wcfg && wcfg[sIdx]) {
                       wm = wcfg[sIdx].mulai;
                       ws = wcfg[sIdx].selesai;
                    }
                 }
                 setForm({...form, tanggal: t, waktuMulai: wm, waktuSelesai: ws});
              }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Sesi</label>
              <select className={inputClass} value={form.sesiKe} onChange={e => {
                 const sVal = e.target.value;
                 let wm = form.waktuMulai, ws = form.waktuSelesai;
                 if(form.tanggal && ujianData?.pengaturan?.waktuSesi) {
                    const d = new Date(form.tanggal);
                    const isJumat = d.getDay() === 5;
                    const wcfg = isJumat ? ujianData.pengaturan.waktuSesi.jumat : ujianData.pengaturan.waktuSesi.normal;
                    const sIdx = sVal === '2' ? 1 : 0;
                    if(wcfg && wcfg[sIdx]) {
                       wm = wcfg[sIdx].mulai;
                       ws = wcfg[sIdx].selesai;
                    }
                 }
                 setForm({...form, sesiKe: sVal, waktuMulai: wm, waktuSelesai: ws});
              }}>
                <option value="1">Sesi 1</option>
                <option value="2">Sesi 2</option>
              </select>
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
              <select className={inputClass} value={form.subjectId} onChange={e => setForm({...form, subjectId: e.target.value})}>
                <option value="">Pilih Mapel...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Kelas</label>
              <div className="flex flex-col gap-1">
                <input className={inputClass} placeholder="X-IPA-1 - IPA, X-IPA-2 - IPA" value={form.kelas} onChange={e => setForm({...form, kelas: e.target.value})} />
                <div className="flex flex-wrap gap-1 mt-1">
                  {classList.filter(c => (ujianData?.pengaturan?.kelasPeserta || []).includes(c.id)).map(c => {
                    const label = c.name;
                    const isSelected = form.kelas.includes(label);
                    return (
                      <button key={c.id} onClick={(e) => {
                        e.preventDefault();
                        const current = form.kelas.split(',').map(s => s.trim()).filter(Boolean);
                        if (current.includes(label)) {
                          setForm({...form, kelas: current.filter(s => s !== label).join(', ')});
                        } else {
                          setForm({...form, kelas: [...current, label].join(', ')});
                        }
                      }} className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${isSelected ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-indigo-300'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
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

      {/* Pivot Matrix Implementation */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#0a0a0a]">
        {(() => {
          // Discover unique classes and times
          const uniqueClasses = Array.from(new Set(filtered.flatMap(j => (j.kelas || '').split(',').map((c: string) => c.trim()).filter(Boolean)))).sort();
          if (uniqueClasses.length === 0 && filtered.length > 0) uniqueClasses.push('-');

          const dateMap = new Map();
          filtered.forEach(j => {
            if (!dateMap.has(j.tanggal)) dateMap.set(j.tanggal, { date: new Date(j.tanggal), sessions: new Map() });
            const dObj = dateMap.get(j.tanggal);
            const wKey = `${j.waktuMulai} - ${j.waktuSelesai}`;
            if (!dObj.sessions.has(wKey)) dObj.sessions.set(wKey, { waktuMulai: j.waktuMulai, waktuSelesai: j.waktuSelesai, mapels: {} });
            const sObj = dObj.sessions.get(wKey);
            const clArr = (j.kelas || '-').split(',').map((c:string) => c.trim());
            clArr.forEach((c:string) => {
              if (c) sObj.mapels[c] = j.mataPelajaran;
            });
            // Attach random id for manual editing/deletion preview (we take the first one found)
            if(!sObj.idRef) sObj.idRef = j.id; 
            if(!sObj.itemRef) sObj.itemRef = j;
          });

          const summary = Array.from(dateMap.values()).sort((a,b) => a.date.getTime() - b.date.getTime());

          return (
            <table className="w-full text-left text-xs min-w-max">
              <thead className="bg-[#f8fafc] dark:bg-[#111] text-[10px] uppercase font-bold text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-3 border-b border-r border-gray-200 dark:border-[#333] w-8 text-center" rowSpan={2}>No</th>
                  <th className="px-3 py-3 border-b border-r border-gray-200 dark:border-[#333] min-w-[120px]" rowSpan={2}>Hari / Tanggal</th>
                  <th className="px-3 py-3 border-b border-r border-gray-200 dark:border-[#333] w-[140px]" rowSpan={2}>Waktu</th>
                  {uniqueClasses.length > 0 && <th className="px-3 py-2 border-b border-gray-200 dark:border-[#333] text-center" colSpan={uniqueClasses.length}>Kelas / Jurusan</th>}
                  <th className="px-3 py-3 border-b border-l border-gray-200 dark:border-[#333] text-center" rowSpan={2}>Aksi</th>
                </tr>
                {uniqueClasses.length > 0 && (
                  <tr>
                    {uniqueClasses.map(c => <th key={c} className="px-3 py-2 border-b border-r border-gray-200 dark:border-[#333] text-center">{c}</th>)}
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                {summary.length === 0 ? (
                  <tr><td colSpan={5 + uniqueClasses.length} className="px-3 py-12 text-center text-gray-400 italic">
                    {loading ? 'Memuat data jadwal...' : 'Belum ada jadwal ujian. Silakan klik "Input Manual" atau "Template Excel".'}
                  </td></tr>
                ) : summary.map((dObj, dIdx) => {
                  const sessions = Array.from(dObj.sessions.values()).sort((a:any, b:any) => a.waktuMulai.localeCompare(b.waktuMulai));
                  return sessions.map((sess:any, sIdx: number) => (
                    <tr key={`${dIdx}-${sIdx}`} className="hover:bg-gray-50/50 dark:hover:bg-[#111]/50 group transition-colors">
                      {sIdx === 0 && (
                        <>
                          <td className="px-3 py-2 border-r border-gray-100 dark:border-[#222] align-top text-center text-gray-500" rowSpan={sessions.length}>{dIdx + 1}</td>
                          <td className="px-3 py-2 border-r border-gray-100 dark:border-[#222] align-top font-medium" rowSpan={sessions.length}>
                            {HARI[dObj.date.getDay()]}, {dObj.date.toLocaleDateString('id-ID')}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 border-r border-gray-100 dark:border-[#222] font-mono text-indigo-600 dark:text-indigo-400">
                        {sess.waktuMulai} - {sess.waktuSelesai}
                      </td>
                      {uniqueClasses.map((c:string) => (
                        <td key={c} className="px-3 py-2 border-r border-gray-100 dark:border-[#222] text-center font-semibold text-text-primary dark:text-gray-100">
                          {sess.mapels[c] || '-'}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center border-l dark:border-[#222]">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDelete(sess.idRef)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          );
        })()}
      </div>

      <p className="text-[10px] text-gray-400">
        Total: {jadwal.length} sesi ujian • Gunakan fitur "Template Excel" untuk mempermudah upload massal dengan format yang tepat.
      </p>
    </div>
  );
};
