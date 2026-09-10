import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import {
  Search, Download, Save, Sparkles, Upload, Filter,
  ChevronRight, X, Edit3, Check, Info, AlertTriangle,
  TrendingUp, Users, Target, Award, Loader2, Lock, Settings
} from 'lucide-react';
import { MetrikRingkasan } from '../components/MetrikRingkasan';
import { StudentDrawer } from '../components/StudentDrawer';

interface Props {
  academicYearId: string;
  semester: string;
  classId: string;
  subjectId: string;
  subjectList: any[];
  classList: any[];
}

interface TpDef {
  id: string;
  nomorTp: number;
  judul: string;
  deskripsi?: string;
}

interface StudentRow {
  no: number;
  studentId: string;
  fullName: string;
  nisn: string;
  nis: string;
  className: string;
  gradeId: string | null;
  nilaiTp: Record<string, number>;
  nilaiSas: number | null;
  rerataTp: string | null;
  nilaiAkhir: string | null;
  predikat: string | null;
  catatanFormatif: string | null;
  deskripsiCapaian: string | null;
  isLocked: boolean;
}

interface RaporConfig {
  bobotTp: number;
  bobotSas: number;
  kktp: number;
}

export const InputNilaiTab = ({ academicYearId, semester, classId, subjectId, subjectList, classList }: Props) => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [tpList, setTpList] = useState<TpDef[]>([]);
  const [config, setConfig] = useState<RaporConfig>({ bobotTp: 60, bobotSas: 40, kktp: 75 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TUNTAS' | 'REMEDIAL'>('ALL');
  const [drawerStudent, setDrawerStudent] = useState<StudentRow | null>(null);
  const [drawerIndex, setDrawerIndex] = useState<number>(-1);

  // ── Load Data ──
  const loadData = useCallback(() => {
    if (!academicYearId || !classId || !subjectId) return;
    setLoading(true);
    apiClient<any>(`/rapor/nilai?academicYearId=${academicYearId}&semester=${semester}&classId=${classId}&subjectId=${subjectId}`)
      .then(data => {
        setStudents(data.students || []);
        setTpList(data.tpList || []);
        setConfig(data.config || { bobotTp: 60, bobotSas: 40, kktp: 75 });
      })
      .catch(err => {
        console.error('[Rapor] loadData error:', err);
        // Don't show toast on initial empty load
      })
      .finally(() => setLoading(false));
  }, [academicYearId, semester, classId, subjectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Client-side calculation ──
  const recalculate = useCallback((rows: StudentRow[], cfg: RaporConfig) => {
    return rows.map(s => {
      const tpValues = Object.values(s.nilaiTp).filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
      const rerataTp = tpValues.length > 0 ? tpValues.reduce((a, b) => a + Number(b), 0) / tpValues.length : 0;
      const nilaiAkhir = s.nilaiSas !== null
        ? (rerataTp * (cfg.bobotTp / 100)) + ((s.nilaiSas || 0) * (cfg.bobotSas / 100))
        : rerataTp;

      let predikat = 'Perlu Bimbingan';
      if (nilaiAkhir >= 90) predikat = 'Sangat Baik';
      else if (nilaiAkhir >= 80) predikat = 'Baik';
      else if (nilaiAkhir >= cfg.kktp) predikat = 'Cukup';

      return {
        ...s,
        rerataTp: rerataTp > 0 ? rerataTp.toFixed(1) : null,
        nilaiAkhir: (tpValues.length > 0 || s.nilaiSas !== null) ? nilaiAkhir.toFixed(1) : null,
        predikat: (tpValues.length > 0 || s.nilaiSas !== null) ? predikat : null,
      };
    });
  }, []);

  // ── Update score ──
  const updateScore = useCallback((index: number, field: string, value: string) => {
    setStudents(prev => {
      const next = [...prev];
      const student = { ...next[index] };
      let val = parseFloat(value);
      if (isNaN(val)) val = 0;
      if (val > 100) val = 100;
      if (val < 0) val = 0;

      if (field === 'sas') {
        student.nilaiSas = value === '' ? null : val;
      } else {
        // TP field like "tp-1", "tp-2", etc.
        const tpNum = field.replace('tp-', '');
        student.nilaiTp = { ...student.nilaiTp, [tpNum]: val };
      }

      next[index] = student;
      return recalculate(next, config);
    });
  }, [config, recalculate]);

  // ── Weight change (client-side live) ──
  const updateBobotTp = useCallback((val: number) => {
    const newConfig = { ...config, bobotTp: val, bobotSas: 100 - val };
    setConfig(newConfig);
    setStudents(prev => recalculate(prev, newConfig));
  }, [config, recalculate]);

  // ── Filter & Search ──
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q || s.fullName.toLowerCase().includes(q) || (s.nisn || '').includes(q) || (s.nis || '').includes(q);
      let matchFilter = true;
      const na = parseFloat(s.nilaiAkhir || '0');
      if (activeFilter === 'TUNTAS') matchFilter = na >= config.kktp;
      if (activeFilter === 'REMEDIAL') matchFilter = na < config.kktp && (s.nilaiAkhir !== null);
      return matchSearch && matchFilter;
    });
  }, [students, searchTerm, activeFilter, config.kktp]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = students.length;
    const withGrades = students.filter(s => s.nilaiAkhir !== null);
    const tuntasCount = withGrades.filter(s => parseFloat(s.nilaiAkhir || '0') >= config.kktp).length;
    const remedialCount = withGrades.length - tuntasCount;
    const avgScore = withGrades.length > 0
      ? (withGrades.reduce((acc, s) => acc + parseFloat(s.nilaiAkhir || '0'), 0) / withGrades.length).toFixed(1)
      : '-';
    const tuntasPct = withGrades.length > 0 ? ((tuntasCount / withGrades.length) * 100).toFixed(1) + '%' : '-';
    return { total, tuntasCount, remedialCount, avgScore, tuntasPct };
  }, [students, config.kktp]);

  // ── Save ──
  const handleSave = async () => {
    if (!academicYearId || !classId || !subjectId) return;
    setSaving(true);
    try {
      await apiClient('/rapor/nilai/save', {
        method: 'POST',
        data: {
          academicYearId, semester, classId, subjectId,
          bobotTp: config.bobotTp,
          bobotSas: config.bobotSas,
          kktp: config.kktp,
          rows: students.map(s => ({
            studentId: s.studentId,
            gradeId: s.gradeId,
            nilaiTp: s.nilaiTp,
            nilaiSas: s.nilaiSas,
            catatanFormatif: s.catatanFormatif,
            deskripsiCapaian: s.deskripsiCapaian,
          })),
        },
      });
      toast.success('Nilai berhasil disimpan!');
      loadData(); // Reload to get grade IDs
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan nilai');
    } finally {
      setSaving(false);
    }
  };

  // ── Generate Descriptions ──
  const handleGenerateDesc = async () => {
    if (!academicYearId || !classId || !subjectId) return;
    // Save first, then generate
    await handleSave();
    try {
      const result = await apiClient<any>('/rapor/nilai/generate-desc', {
        method: 'POST',
        data: { academicYearId, semester, classId, subjectId, kktp: config.kktp },
      });
      toast.success(`Deskripsi capaian untuk ${result.updatedCount} santri berhasil digenerate!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal generate deskripsi');
    }
  };

  // ── Export CSV ──
  const handleExport = () => {
    if (!academicYearId || !classId || !subjectId) return;
    window.open(`/api/rapor/nilai/export?academicYearId=${academicYearId}&semester=${semester}&classId=${classId}&subjectId=${subjectId}`, '_blank');
  };

  // ── Drawer ──
  const openDrawer = (student: StudentRow, index: number) => {
    setDrawerStudent(student);
    setDrawerIndex(index);
  };

  const closeDrawer = () => {
    setDrawerStudent(null);
    setDrawerIndex(-1);
  };

  const saveDrawerData = (updatedStudent: StudentRow) => {
    if (drawerIndex >= 0) {
      setStudents(prev => {
        const next = [...prev];
        next[drawerIndex] = updatedStudent;
        return next;
      });
    }
    closeDrawer();
  };

  // Subject & Class names
  const subjectName = subjectList.find(s => s.id === subjectId)?.nama || '';
  const className = classList.find(c => c.id === classId)?.name || '';

  // ── No selection state ──
  if (!academicYearId || !classId || !subjectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
          <Target size={28} className="text-emerald-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pilih Kelas & Mata Pelajaran</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
          Silakan pilih Tahun Ajaran, Kelas, dan Mata Pelajaran di bagian atas halaman untuk mulai input nilai sumatif.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-500 mb-3" />
        <p className="text-xs text-gray-500">Memuat data nilai...</p>
      </div>
    );
  }

  // Badge color helper
  const predikatColor = (predikat: string | null) => {
    switch (predikat) {
      case 'Sangat Baik': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Baik': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Cukup': return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Perlu Bimbingan': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const naColor = (na: string | null) => {
    const val = parseFloat(na || '0');
    if (val >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (val >= 80) return 'text-amber-600 dark:text-amber-400';
    if (val >= config.kktp) return 'text-orange-600 dark:text-orange-400';
    if (val > 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-4">
      {/* ── Banner KMA 450/2024 ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Award size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold">Standar Penilaian Kurikulum Merdeka</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/15 uppercase tracking-wider">
                KMA 450/2024 • Permendikbudristek No. 12/2024
              </span>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              <strong className="text-white">Prinsip Asesmen:</strong> Asesmen formatif berfungsi sebagai pemantauan proses belajar dan{' '}
              <strong className="text-white">TIDAK dirata-rata ke dalam nilai akhir rapor</strong>. NA murni dikalkulasi dari Sumatif Lingkup Materi & SAS.
            </p>
          </div>
        </div>
      </div>

      {/* ── Metrik Ringkasan + Config Bobot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Metrik */}
        <div className="lg:col-span-8">
          <MetrikRingkasan
            subjectName={subjectName}
            className={className}
            stats={stats}
            kktp={config.kktp}
          />
        </div>

        {/* Config Bobot */}
        <div className="lg:col-span-4 bg-gray-50 dark:bg-[#0d0d0d] rounded-xl p-4 border border-gray-200 dark:border-[#222]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Konfigurasi Bobot</span>
            <Settings size={16} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Bobot Rerata Sumatif Materi (TP)</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{config.bobotTp}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={90}
                step={5}
                value={config.bobotTp}
                onChange={e => updateBobotTp(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Bobot Sumatif Akhir Semester (SAS)</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{config.bobotSas}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-[#222] h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full transition-all" style={{ width: `${config.bobotSas}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-3 p-2.5 bg-white dark:bg-[#111] rounded-lg border border-gray-100 dark:border-[#222] flex items-start gap-2">
            <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Formula: NA = (Rerata TP × {config.bobotTp}%) + (SAS × {config.bobotSas}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── TP Legend ── */}
      {tpList.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 bg-gray-50 dark:bg-[#0d0d0d] p-3 rounded-xl border border-gray-200 dark:border-[#222]">
          {tpList.map(tp => (
            <div key={tp.id} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {tp.nomorTp}
              </span>
              <span className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-1" title={tp.judul}>
                <strong>TP {tp.nomorTp}:</strong> {tp.judul}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#111] rounded-xl p-3 border border-gray-200 dark:border-[#222] shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari santri, NISN..."
              className="w-full bg-gray-50 dark:bg-[#0d0d0d] rounded-lg pl-8 pr-3 py-2 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:bg-white dark:focus:bg-[#111] focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-gray-200 dark:border-[#333]"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center bg-gray-100 dark:bg-[#0d0d0d] rounded-lg p-0.5">
            {[
              { key: 'ALL' as const, label: `Semua (${stats.total})` },
              { key: 'TUNTAS' as const, label: `Tuntas (${stats.tuntasCount})` },
              { key: 'REMEDIAL' as const, label: `Remidi (${stats.remedialCount})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                  activeFilter === f.key
                    ? 'bg-white dark:bg-[#222] text-gray-800 dark:text-gray-200 shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition whitespace-nowrap disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Menyimpan...' : 'Simpan Nilai'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#222] text-gray-700 dark:text-gray-300 transition whitespace-nowrap"
          >
            <Download size={14} />
            Unduh Ledger
          </button>
          <button
            onClick={handleGenerateDesc}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition whitespace-nowrap"
          >
            <Sparkles size={14} />
            Generate Deskripsi
          </button>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-20 bg-gray-800 dark:bg-[#1a1a1a] text-white text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-2 text-center w-10 sticky left-0 z-30 bg-gray-800 dark:bg-[#1a1a1a]">No</th>
                <th className="py-2.5 px-2 bg-gray-800 dark:bg-[#1a1a1a] min-w-[120px] max-w-[140px]">Identitas Santri</th>
                {tpList.map(tp => (
                  <th key={tp.id} className="py-2.5 px-1.5 text-center w-14" title={tp.judul}>TP {tp.nomorTp}</th>
                ))}
                <th className="py-2.5 px-2 text-center w-16 bg-gray-700/50">Rerata TP</th>
                <th className="py-2.5 px-1.5 text-center w-14">SAS</th>
                <th className="py-2.5 px-2 text-center w-16 bg-emerald-700/50 font-bold">NA Rapor</th>
                <th className="py-2.5 px-2 text-center w-24">Predikat</th>
                <th className="py-2.5 px-3 min-w-[220px]">Deskripsi Capaian</th>
                <th className="py-2.5 px-2 text-center w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222] text-xs text-gray-700 dark:text-gray-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={99} className="py-12 text-center text-gray-400">
                    {students.length === 0 ? 'Tidak ada siswa di kelas ini' : 'Tidak ada data yang cocok dengan filter'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  // Find actual index in students array
                  const realIdx = students.findIndex(s => s.studentId === student.studentId);
                  const initials = student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('');

                  return (
                    <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-[#0d0d0d] transition-colors group">
                      <td className="py-2 px-2 text-center sticky left-0 z-10 bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#0d0d0d] font-medium text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-400 font-bold flex items-center justify-center text-[9px] shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate text-xs" title={student.fullName}>
                              {student.fullName}
                            </span>
                            <span className="text-[10px] text-gray-400">{student.nisn ? `NISN: ${student.nisn}` : student.nis ? `NIS: ${student.nis}` : ''}</span>
                          </div>
                        </div>
                      </td>

                      {/* TP inputs */}
                      {tpList.map(tp => {
                        const val = student.nilaiTp?.[String(tp.nomorTp)] ?? '';
                        const isLow = Number(val) > 0 && Number(val) < config.kktp;
                        return (
                          <td key={tp.id} className="py-1 px-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={val}
                              onChange={e => updateScore(realIdx, `tp-${tp.nomorTp}`, e.target.value)}
                              className={`w-11 h-8 text-center text-xs rounded border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0d0d0d] focus:bg-white dark:focus:bg-[#111] focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isLow ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'
                              }`}
                              disabled={student.isLocked}
                            />
                          </td>
                        );
                      })}

                      {/* Rerata TP */}
                      <td className="py-2 px-2 text-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-[#0a0a0a]">
                        {student.rerataTp || '-'}
                      </td>

                      {/* SAS */}
                      <td className="py-1 px-1.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={student.nilaiSas ?? ''}
                          onChange={e => updateScore(realIdx, 'sas', e.target.value)}
                          className={`w-11 h-8 text-center text-xs rounded border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0d0d0d] focus:bg-white dark:focus:bg-[#111] focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            student.nilaiSas !== null && student.nilaiSas < config.kktp ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'
                          }`}
                          disabled={student.isLocked}
                        />
                      </td>

                      {/* NA */}
                      <td className={`py-2 px-2 text-center font-bold text-sm ${naColor(student.nilaiAkhir)}`}>
                        {student.nilaiAkhir || '-'}
                      </td>

                      {/* Predikat */}
                      <td className="py-2 px-2 text-center">
                        {student.predikat && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${predikatColor(student.predikat)}`}>
                            {student.predikat}
                          </span>
                        )}
                      </td>

                      {/* Deskripsi */}
                      <td className="py-2 px-3">
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {student.deskripsiCapaian || <span className="italic text-gray-300">Belum ada deskripsi</span>}
                        </p>
                      </td>

                      {/* Aksi */}
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => openDrawer(student, realIdx)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-400 hover:text-gray-600 transition"
                          title="Detail & Edit Narasi"
                        >
                          <Edit3 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="bg-gray-50 dark:bg-[#0d0d0d] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500 border-t border-gray-200 dark:border-[#222]">
          <div className="flex items-center gap-3">
            <span>Menampilkan <strong className="text-gray-700 dark:text-gray-300">{filteredStudents.length}</strong> dari {students.length} Santri</span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-100 inline-block" /> ≥90 Sangat Baik</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-100 inline-block" /> 80-89 Baik</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-100 inline-block" /> {config.kktp}-79 Cukup</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-100 inline-block" /> &lt;{config.kktp} Intervensi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check size={14} className="text-emerald-500" />
            <span>KKTP: {config.kktp} • Bobot TP {config.bobotTp}% + SAS {config.bobotSas}%</span>
          </div>
        </div>
      </div>

      {/* ── Student Drawer ── */}
      {drawerStudent && (
        <StudentDrawer
          student={drawerStudent}
          tpList={tpList}
          config={config}
          onClose={closeDrawer}
          onSave={saveDrawerData}
        />
      )}
    </div>
  );
};
