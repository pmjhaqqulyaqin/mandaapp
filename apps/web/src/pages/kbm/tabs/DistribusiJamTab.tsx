import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../../../lib/api';
import { Download, Plus, Search, Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { DataTableToolbar } from '../../../components/DataTableToolbar';

interface Props {
  academicYearId: string;
  semester: string;
  canEdit: boolean;
}

interface DistribusiRow {
  guruId: string;
  guruName: string;
  guruNip: string;
  guruGrade: string;
  subjectId: string;
  subjectKode: string;
  subjectNama: string;
  cells: Record<string, { id?: string; jumlahJam: number }>;
  totalJam: number;
}

export const DistribusiJamTab = ({ academicYearId, semester, canEdit }: Props) => {
  const [rows, setRows] = useState<DistribusiRow[]>([]);
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addGuruId, setAddGuruId] = useState('');
  const [addSubjectId, setAddSubjectId] = useState('');
  const [guruList, setGuruList] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<any>(null);
  const pendingChanges = useRef<Map<string, any>>(new Map());

  const loadData = useCallback(() => {
    if (!academicYearId) return;
    setLoading(true);
    Promise.all([
      apiClient<any[]>(`/kbm/distribusi?academicYearId=${academicYearId}&semester=${semester}`),
      apiClient<any[]>('/classes'),
      apiClient<any[]>('/kbm/subjects?active=true'),
      apiClient<any[]>('/employees?type=Guru'),
    ]).then(([distribusi, cls, subj, guru]) => {
      setClassList((cls as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setSubjects(subj as any[]);
      setGuruList((guru as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)));

      // Build grid rows from distribusi data
      const rowMap = new Map<string, DistribusiRow>();
      for (const d of distribusi as any[]) {
        const key = `${d.guruId}::${d.subjectId}`;
        if (!rowMap.has(key)) {
          rowMap.set(key, {
            guruId: d.guruId,
            guruName: d.guruName || '',
            guruNip: d.guruNip || '',
            guruGrade: d.guruGrade || '',
            subjectId: d.subjectId,
            subjectKode: d.subjectKode || '',
            subjectNama: d.subjectNama || '',
            cells: {},
            totalJam: 0,
          });
        }
        const row = rowMap.get(key)!;
        row.cells[d.kelasId] = { id: d.id, jumlahJam: d.jumlahJam };
        row.totalJam += d.jumlahJam;
      }

      setRows(Array.from(rowMap.values()).sort((a, b) =>
        a.guruName.localeCompare(b.guruName) || a.subjectKode.localeCompare(b.subjectKode)
      ));
    }).catch(err => {
      toast.error('Gagal memuat data distribusi');
    }).finally(() => setLoading(false));
  }, [academicYearId, semester]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCellChange = (rowIdx: number, kelasId: string, value: string) => {
    const jam = parseInt(value) || 0;
    if (jam < 0 || jam > 50) return;

    setRows(prev => {
      const next = [...prev];
      const row = { ...next[rowIdx] };
      row.cells = { ...row.cells };
      row.cells[kelasId] = { ...row.cells[kelasId], jumlahJam: jam };
      row.totalJam = Object.values(row.cells).reduce((sum, c) => sum + c.jumlahJam, 0);
      next[rowIdx] = row;
      return next;
    });

    // Queue the change for debounced save
    const row = rows[rowIdx];
    const changeKey = `${row.guruId}::${kelasId}::${row.subjectId}`;
    pendingChanges.current.set(changeKey, {
      academicYearId, semester,
      guruId: row.guruId, kelasId, subjectId: row.subjectId,
      jumlahJam: jam,
    });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => flushChanges(), 800);
  };

  const flushChanges = async () => {
    if (pendingChanges.current.size === 0) return;
    setSaving(true);
    const records = Array.from(pendingChanges.current.values());
    pendingChanges.current.clear();
    try {
      await apiClient('/kbm/distribusi/bulk', { method: 'POST', data: { records } });
    } catch (err) {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = async () => {
    if (!addGuruId || !addSubjectId) return toast.error('Pilih guru dan mapel');
    const guru = guruList.find(g => g.id === addGuruId);
    const subj = subjects.find(s => s.id === addSubjectId);
    if (!guru || !subj) return;

    // Check if row already exists
    const exists = rows.some(r => r.guruId === addGuruId && r.subjectId === addSubjectId);
    if (exists) return toast.error('Guru + Mapel ini sudah ada di grid');

    setRows(prev => [...prev, {
      guruId: guru.id, guruName: guru.name, guruNip: guru.nip || '', guruGrade: guru.grade || '',
      subjectId: subj.id, subjectKode: subj.kode, subjectNama: subj.nama,
      cells: {}, totalJam: 0,
    }].sort((a, b) => a.guruName.localeCompare(b.guruName) || a.subjectKode.localeCompare(b.subjectKode)));

    setShowAddModal(false);
    setAddGuruId('');
    setAddSubjectId('');
    toast.success(`${guru.name} - ${subj.nama} ditambahkan`);
  };

  const handleExport = () => {
    import('@/lib/mobileUtils').then(m => m.downloadFileFromUrl(`/api/kbm/distribusi/export?academicYearId=${academicYearId}&semester=${semester}`, `DistribusiJam.xlsx`));
  };

  const handleDownloadTemplate = () => {
    import('@/lib/mobileUtils').then(m => m.downloadFileFromUrl(`/api/kbm/distribusi/template?academicYearId=${academicYearId}&semester=${semester}`, `Template_DistribusiJam.xlsx`));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // Reset so same file can be re-selected

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('academicYearId', academicYearId);
      formData.append('semester', semester);

      const res = await fetch('/api/kbm/distribusi/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Gagal import');
        return;
      }

      toast.success(data.message);
      if (data.errors?.length > 0) {
        data.errors.forEach((err: string) => toast.warning(err, { duration: 5000 }));
      }
      loadData(); // Refresh grid
    } catch (err: any) {
      toast.error('Gagal import file');
    } finally {
      setImporting(false);
    }
  };

  const filteredRows = searchTerm
    ? rows.filter(r => r.guruName.toLowerCase().includes(searchTerm.toLowerCase()) || r.subjectNama.toLowerCase().includes(searchTerm.toLowerCase()))
    : rows;

  // Calculate total per kelas
  const kelasTotal: Record<string, number> = {};
  classList.forEach(c => { kelasTotal[c.id] = 0; });
  filteredRows.forEach(r => {
    Object.entries(r.cells).forEach(([kelasId, cell]) => {
      kelasTotal[kelasId] = (kelasTotal[kelasId] || 0) + cell.jumlahJam;
    });
  });

  if (!academicYearId) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Pilih Tahun Ajaran terlebih dahulu</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari guru / mapel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[12px] rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
          />
        </div>
        {canEdit && (
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all">
            <Plus size={14} /> Tambah Guru/Mapel
          </button>
        )}
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] active:scale-95 transition-all">
          <Download size={14} /> Export Excel
        </button>
        <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] active:scale-95 transition-all">
          <FileSpreadsheet size={14} /> Template
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={handleImport} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {importing ? 'Importing...' : 'Import Excel'}
        </button>
        {saving && (
          <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Loader2 size={12} className="animate-spin" /> Menyimpan...
          </span>
        )}
      </div>

      {/* Info */}
      {canEdit && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          💡 Klik sel untuk mengisi jumlah jam. Perubahan tersimpan otomatis. <span className="text-red-400">Merah</span> = overload JTM.
        </p>
      )}

      {/* DataTable Toolbar */}
      <DataTableToolbar
        data={filteredRows}
        columns={[
          { header: 'Nama Guru', key: 'guruName' },
          { header: 'NIP', key: 'guruNip', transform: (v) => v || '-' },
          { header: 'Kode Mapel', key: 'subjectKode' },
          { header: 'Nama Mapel', key: 'subjectNama' },
          { header: 'Total Jam', key: 'totalJam', transform: (v) => String(v) },
        ]}
        fileName="Distribusi_Jam"
        title="Distribusi Jam Pelajaran"
        entriesPerPage={filteredRows.length}
        onEntriesPerPageChange={() => {}}
        totalEntries={filteredRows.length}
      />

      {/* Grid */}
      <div className="overflow-auto rounded-xl border border-gray-200 dark:border-[#222] max-h-[calc(100vh-320px)]">
        <table className="w-full text-[11px] md:text-[12px] border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-100 dark:bg-[#1a1a1a]">
              <th className="sticky left-0 z-30 bg-gray-100 dark:bg-[#1a1a1a] px-2 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#333] min-w-[180px] md:min-w-[240px]">
                Guru / Mapel
              </th>
              {classList.map(c => (
                <th key={c.id} className="px-1.5 py-2.5 text-center font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-[#333] min-w-[48px] whitespace-nowrap">
                  {c.name}
                </th>
              ))}
              <th className="px-2 py-2.5 text-center font-bold text-gray-600 dark:text-gray-300 min-w-[45px] bg-amber-50 dark:bg-amber-500/10">
                JML
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1a1a1a]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={classList.length + 2} className="px-3 py-10 text-center text-gray-400 dark:text-gray-500">
                  {rows.length === 0 ? 'Belum ada data. Klik "+ Tambah Guru/Mapel" untuk mulai.' : 'Tidak ada hasil pencarian'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rowIdx) => {
                const realIdx = rows.indexOf(row);
                return (
                  <tr key={`${row.guruId}-${row.subjectId}`} className="hover:bg-gray-50/50 dark:hover:bg-[#161616] group">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[#111] group-hover:bg-gray-50/50 dark:group-hover:bg-[#161616] px-2 py-1.5 border-r border-gray-200 dark:border-[#333]">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{row.guruName}</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{row.subjectKode}. {row.subjectNama}</div>
                    </td>
                    {classList.map(c => {
                      const cell = row.cells[c.id];
                      const jam = cell?.jumlahJam || 0;
                      return (
                        <td key={c.id} className="px-0.5 py-0.5 text-center border-r border-gray-100 dark:border-[#1a1a1a]">
                          {canEdit ? (
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={jam || ''}
                              onChange={(e) => handleCellChange(realIdx, c.id, e.target.value)}
                              className="w-full h-8 text-center text-[12px] font-semibold rounded-md border border-transparent focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="—"
                            />
                          ) : (
                            <span className={`font-semibold ${jam > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>
                              {jam || '—'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className={`px-2 py-1.5 text-center font-bold bg-amber-50/50 dark:bg-amber-500/5 ${
                      row.totalJam > 40 ? 'text-red-600 dark:text-red-400' :
                      row.totalJam > 24 ? 'text-amber-600 dark:text-amber-400' :
                      'text-gray-800 dark:text-white'
                    }`}>
                      {row.totalJam}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-gray-100 dark:bg-[#1a1a1a] font-bold">
                <td className="sticky left-0 z-30 bg-gray-100 dark:bg-[#1a1a1a] px-2 py-2.5 text-[11px] text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-[#333]">
                  JUMLAH JAM PELAJARAN
                </td>
                {classList.map(c => (
                  <td key={c.id} className="px-1.5 py-2.5 text-center text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-[#333] text-[11px]">
                    {kelasTotal[c.id] || 0}
                  </td>
                ))}
                <td className="px-2 py-2.5 text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 text-[11px]">
                  {Object.values(kelasTotal).reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-[#161616] rounded-2xl w-full max-w-md p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Tambah Guru & Mapel</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Guru</label>
                <select
                  value={addGuruId}
                  onChange={(e) => setAddGuruId(e.target.value)}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                >
                  <option value="">Pilih Guru...</option>
                  {guruList.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Mata Pelajaran</label>
                <select
                  value={addSubjectId}
                  onChange={(e) => setAddSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
                >
                  <option value="">Pilih Mapel...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.kode}. {s.nama}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-[12px] font-semibold rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                Batal
              </button>
              <button onClick={handleAddRow} className="px-4 py-2 text-[12px] font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all">
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
