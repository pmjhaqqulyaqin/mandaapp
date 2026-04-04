import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, API_BASE_URL } from '../lib/api';
import { toast } from 'sonner';
import {
  Hash, Users, AlertCircle, Calendar, Upload, FileSpreadsheet,
  UserPlus, Search, Download, Eye, Edit2, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, ArrowUpRight, Loader2, X, RefreshCw, Trash2, AlertTriangle
} from 'lucide-react';

// ─── Types ───
interface AcademicYear {
  id: string; tahunAjaran: string; kodeTahun: string;
  tanggalMulai: string; tanggalSelesai: string;
  isActive: boolean; lastNisSequence: number;
}
interface Stats { totalStudents: number; withoutNIS: number; activeYear: AcademicYear | null; }
interface ActivityLog {
  id: string; action: string; details: string; nisValue: string;
  createdAt: string; studentName: string; userName: string;
}
interface StudentRecord {
  id: string; fullName: string; nis: string; nisn: string;
  className: string; status: string; gender: string;
  birthPlace: string; birthDate: string;
}
interface PreviewItem {
  id: string; fullName: string; nisn: string; className: string;
  currentNis: string; sequence: number; newNis: string;
}

// ─── Stat Card ───
const StatCard = ({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) => (
  <div className={`relative overflow-hidden rounded-xl bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] p-3 group hover:shadow-md transition-all duration-300`}>
    <div className={`absolute top-0 left-0 w-full h-0.5 ${color}`} />
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color} bg-opacity-10`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold text-text-primary dark:text-text-darkPrimary tracking-tight leading-tight">{value}</p>
        <p className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">{label}</p>
      </div>
      {sub && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1a1a] text-text-secondary font-medium shrink-0">{sub}</span>}
    </div>
  </div>
);

// ─── Status Badge ───
const StatusBadge = ({ status }: { status: string }) => {
  const s = (status || 'active').toLowerCase();
  const cls = s === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : s === 'mutasi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    : s === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${cls}`}>{status || 'Aktif'}</span>;
};

// ─── Activity Item ───
const ActivityItem = ({ log }: { log: ActivityLog }) => {
  const color = log.action === 'batch_generate' ? 'bg-blue-500' : log.action === 'single_assign' ? 'bg-emerald-500' : log.action === 'edit' ? 'bg-amber-500' : 'bg-red-500';
  const label = log.action === 'batch_generate' ? 'Batch Digenerate' : log.action === 'single_assign' ? 'Entri Manual' : log.action === 'edit' ? 'NIS Diedit' : log.action === 'revoke' ? 'NIS Dicabut' : log.action === 'revoke_delete' ? 'Siswa Dihapus' : log.action;
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return `${Math.floor(diff / 86400000)} hari lalu`;
  };
  return (
    <div className="flex gap-2 py-1.5">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-text-primary dark:text-text-darkPrimary leading-tight">{label}</p>
        <p className="text-[10px] text-text-secondary truncate">{log.studentName ? `${log.studentName} → ${log.nisValue}` : (log.details || '')}</p>
        <p className="text-[9px] text-text-secondary/60 mt-0.5 uppercase">{timeAgo(log.createdAt)}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export const DashboardNIS = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'records' | 'batch' | 'single'>('records');
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, withoutNIS: 0, activeYear: null });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Records state
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsTotalPages, setRecordsTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Batch state
  const [batchStep, setBatchStep] = useState(1);
  const [uploadedStudents, setUploadedStudents] = useState<any[]>([]);
  const [uploadDuplicates, setUploadDuplicates] = useState<string[]>([]);
  const [studentsWithoutNIS, setStudentsWithoutNIS] = useState<StudentRecord[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchPreview, setBatchPreview] = useState<PreviewItem[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [sourceMode, setSourceMode] = useState<'upload' | 'existing'>('existing');

  // Single state
  const [singleForm, setSingleForm] = useState({
    fullName: '', nisn: '', gender: '', birthPlace: '', birthDate: '',
    address: '', asalSekolah: '', className: '', academicYearId: ''
  });
  const [nextNisInfo, setNextNisInfo] = useState<{ nextNis: string; lastSequence: number } | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<{ open: boolean; student: StudentRecord | null }>({ open: false, student: null });
  const [editNisValue, setEditNisValue] = useState('');
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revokeConfirmName, setRevokeConfirmName] = useState('');

  // Academic Year modal
  const [yearModal, setYearModal] = useState(false);
  const [yearForm, setYearForm] = useState({ tahunAjaran: '', kodeTahun: '', tanggalMulai: '', tanggalSelesai: '', isActive: true });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch data ───
  const fetchStats = useCallback(async () => {
    try {
      const s = await apiClient<Stats>('/nis/stats');
      setStats(s);
    } catch (e) { console.error(e); }
  }, []);

  const fetchActivity = useCallback(async () => {
    try { setActivity(await apiClient<ActivityLog[]>('/nis/recent-activity')); } catch (e) { console.error(e); }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try { setAcademicYears(await apiClient<AcademicYear[]>('/nis/academic-years')); } catch (e) { console.error(e); }
  }, []);

  const fetchRecords = useCallback(async (page = 1) => {
    try {
      const res = await apiClient<any>(`/nis/records?page=${page}&limit=10&search=${searchQuery}&status=${statusFilter}&yearCode=${yearFilter}`);
      setRecords(res.records); setRecordsTotal(res.total); setRecordsTotalPages(res.totalPages); setRecordsPage(res.page);
    } catch (e) { console.error(e); }
  }, [searchQuery, statusFilter, yearFilter]);

  const fetchStudentsWithoutNIS = useCallback(async () => {
    try { setStudentsWithoutNIS(await apiClient<StudentRecord[]>('/nis/students-without-nis')); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchActivity(), fetchAcademicYears(), fetchRecords()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRecords(); }, [searchQuery, statusFilter, yearFilter]);

  // ─── Handlers ───
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await apiClient<any>('/nis/upload-batch', { method: 'POST', data: fd });
      setUploadedStudents(res.students);
      setUploadDuplicates(res.duplicates || []);
      setBatchStep(2);
      toast.success(`${res.totalRows} data siswa berhasil dibaca`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membaca file');
    }
    e.target.value = '';
  };

  const handlePreviewBatch = async () => {
    const activeYear = stats.activeYear || academicYears.find(y => y.isActive);
    if (!activeYear) { toast.error('Pilih tahun ajaran aktif terlebih dahulu'); return; }
    if (selectedStudentIds.length === 0) { toast.error('Pilih siswa terlebih dahulu'); return; }
    try {
      const res = await apiClient<any>('/nis/preview-batch', { method: 'POST', data: { studentIds: selectedStudentIds, academicYearId: activeYear.id } });
      setBatchPreview(res.preview);
      setBatchStep(3);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleGenerateBatch = async () => {
    const activeYear = stats.activeYear || academicYears.find(y => y.isActive);
    if (!activeYear) return;
    setBatchGenerating(true);
    try {
      const res = await apiClient<any>('/nis/generate-batch', { method: 'POST', data: { studentIds: selectedStudentIds, academicYearId: activeYear.id } });
      toast.success(`${res.totalGenerated} NIS berhasil di-generate!`);
      setBatchStep(1); setSelectedStudentIds([]); setBatchPreview([]);
      fetchStats(); fetchActivity(); fetchRecords(); fetchStudentsWithoutNIS();
    } catch (err: any) { toast.error(err.message); }
    finally { setBatchGenerating(false); }
  };

  const handleAssignSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeYear = stats.activeYear || academicYears.find(y => y.isActive);
    if (!activeYear) { toast.error('Pilih tahun ajaran aktif terlebih dahulu'); return; }
    setSingleLoading(true);
    try {
      const res = await apiClient<any>('/nis/assign-single', { method: 'POST', data: { ...singleForm, academicYearId: activeYear.id } });
      toast.success(`NIS ${res.nis} berhasil diberikan!`);
      setSingleForm({ fullName: '', nisn: '', gender: '', birthPlace: '', birthDate: '', address: '', asalSekolah: '', className: '', academicYearId: '' });
      setNextNisInfo(null);
      fetchStats(); fetchActivity(); fetchRecords();
    } catch (err: any) { toast.error(err.message); }
    finally { setSingleLoading(false); }
  };

  const handleEditNIS = async () => {
    if (!editModal.student) return;
    try {
      await apiClient(`/nis/records/${editModal.student.id}`, { method: 'PUT', data: { nis: editNisValue } });
      toast.success('NIS berhasil diupdate');
      setEditModal({ open: false, student: null });
      setRevokeConfirm(false); setRevokeConfirmName('');
      fetchRecords(recordsPage); fetchActivity(); fetchStats();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRevokeNIS = async (deleteProfile: boolean) => {
    if (!editModal.student) return;
    try {
      const res = await apiClient<any>(`/nis/records/${editModal.student.id}/revoke?deleteProfile=${deleteProfile}`, { method: 'DELETE' });
      const msg = deleteProfile
        ? `NIS ${res.revokedNis} dicabut dan data ${res.studentName} dihapus`
        : `NIS ${res.revokedNis} berhasil dicabut dari ${res.studentName}`;
      toast.success(msg);
      setEditModal({ open: false, student: null });
      setRevokeConfirm(false); setRevokeConfirmName('');
      fetchRecords(recordsPage); fetchActivity(); fetchStats(); fetchStudentsWithoutNIS();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/nis/academic-years', { method: 'POST', data: yearForm });
      toast.success('Tahun ajaran berhasil dibuat');
      setYearModal(false);
      setYearForm({ tahunAjaran: '', kodeTahun: '', tanggalMulai: '', tanggalSelesai: '', isActive: true });
      fetchAcademicYears(); fetchStats();
    } catch (err: any) { toast.error(err.message); }
  };

  const fetchNextSequence = async () => {
    const activeYear = stats.activeYear || academicYears.find(y => y.isActive);
    if (!activeYear) return;
    try { setNextNisInfo(await apiClient<any>(`/nis/next-sequence?academicYearId=${activeYear.id}`)); } catch (e) { console.error(e); }
  };

  useEffect(() => { if (activeTab === 'single') fetchNextSequence(); }, [activeTab, stats.activeYear]);
  useEffect(() => { if (activeTab === 'batch') fetchStudentsWithoutNIS(); }, [activeTab]);

  const tabs = [
    { key: 'records' as const, label: 'Semua Data' },
    { key: 'batch' as const, label: 'Generate Batch' },
    { key: 'single' as const, label: 'Entri Satuan' },
  ];

  const quotaPercent = stats.totalStudents > 0 ? Math.round(((stats.totalStudents - stats.withoutNIS) / stats.totalStudents) * 100) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <Hash size={18} className="text-primary" /> Manajemen NIS
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">Kelola penerbitan dan alokasi Nomor Induk Siswa</p>
        </div>
        <Button className="flex items-center gap-1.5 text-xs px-3 py-1.5 h-auto" onClick={() => setYearModal(true)}>
          <Calendar size={13} /> Kelola Tahun Ajaran
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <StatCard icon={<Users size={16} className="text-blue-600" />} label="Total Siswa" value={stats.totalStudents.toLocaleString()} color="bg-blue-500" />
        <StatCard icon={<AlertCircle size={16} className="text-amber-600" />} label="Belum Ada NIS" value={stats.withoutNIS} sub="Perlu perhatian" color="bg-amber-500" />
        <StatCard icon={<Calendar size={16} className="text-emerald-600" />} label="Tahun Ajaran Aktif" value={stats.activeYear?.tahunAjaran || '-'} color="bg-emerald-500" />
      </div>

      {/* Main Content = Tabs + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Left: Tab Content */}
        <div className="flex-1 min-w-0">
          {/* Tab Navigation */}
          <div className="flex gap-0.5 border-b border-gray-200 dark:border-[#222] mb-3">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-3 py-2 text-xs font-medium relative transition-colors ${activeTab === t.key ? 'text-primary' : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'}`}>
                {t.label}
                {activeTab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />}
              </button>
            ))}
          </div>

          {/* ─── TAB: All Records ─── */}
          {activeTab === 'records' && (
            <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-100 dark:border-[#222] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Daftar & Manajemen NIS</h3>
                <div className="flex items-center gap-2">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-md px-2 py-1.5 text-xs outline-none">
                    <option value="">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="mutasi">Mutasi</option>
                    <option value="alumni">Alumni</option>
                  </select>
                  <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                    className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-md px-2 py-1.5 text-xs outline-none">
                    <option value="">Semua Tahun Ajaran</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.kodeTahun}>{y.tahunAjaran}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Cari NIS atau nama..."
                      className="pl-8 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-md outline-none focus:ring-2 focus:ring-primary/30 w-40" />
                  </div>
                  <a href={`${API_BASE_URL}/nis/export?search=${searchQuery}&status=${statusFilter}&yearCode=${yearFilter}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                    <Download size={12} /> Ekspor Excel
                  </a>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-[#222] text-[10px] uppercase tracking-wider text-text-secondary">
                      <th className="py-2 px-3 font-semibold">NIS</th>
                      <th className="py-2 px-3 font-semibold">Nama Lengkap</th>
                      <th className="py-2 px-3 font-semibold">NISN</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                      <th className="py-2 px-3 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} className="group border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                        <td className="py-2 px-3 text-xs font-mono text-primary font-semibold">#{r.nis || '-'}</td>
                        <td className="py-2 px-3 text-xs font-medium text-text-primary dark:text-text-darkPrimary">{r.fullName || '-'}</td>
                        <td className="py-2 px-3 text-xs text-text-secondary">{r.nisn || '-'}</td>
                        <td className="py-2 px-3"><StatusBadge status={r.status} /></td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditModal({ open: true, student: r }); setEditNisValue(r.nis || ''); }}
                              className="text-blue-500 hover:text-blue-700" title="Edit NIS"><Edit2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-xs">Belum ada data NIS.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {recordsTotalPages > 1 && (
                <div className="px-3 py-2 border-t border-gray-100 dark:border-[#222] flex items-center justify-between text-xs text-text-secondary">
                  <span>Menampilkan {(recordsPage - 1) * 10 + 1}-{Math.min(recordsPage * 10, recordsTotal)} dari {recordsTotal}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => fetchRecords(recordsPage - 1)} disabled={recordsPage <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222] disabled:opacity-30"><ChevronLeft size={16} /></button>
                    {Array.from({ length: Math.min(5, recordsTotalPages) }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => fetchRecords(p)}
                        className={`w-7 h-7 rounded-md text-xs font-medium ${p === recordsPage ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-[#222]'}`}>{p}</button>
                    ))}
                    <button onClick={() => fetchRecords(recordsPage + 1)} disabled={recordsPage >= recordsTotalPages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222] disabled:opacity-30"><ChevronRight size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: Batch Generation ─── */}
          {activeTab === 'batch' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Proses Batch Baru</h3>
                  <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Langkah {batchStep} dari 3</span>
                </div>
                {/* Step indicator */}
                <div className="flex items-center gap-0 mb-5">
                  {[1, 2, 3].map(s => (
                    <React.Fragment key={s}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${s <= batchStep ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-[#222] text-gray-500'}`}>{s}</div>
                      {s < 3 && <div className={`flex-1 h-0.5 mx-1 transition-all ${s < batchStep ? 'bg-primary' : 'bg-gray-200 dark:bg-[#222]'}`} />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Step 1: Select source */}
                {batchStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex gap-3 mb-4">
                      <button onClick={() => setSourceMode('existing')} className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${sourceMode === 'existing' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-[#222]'}`}>
                        <Users size={16} className="text-primary mb-1.5" />
                        <p className="font-semibold text-xs">Pilih dari Data Siswa</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">Pilih siswa yang belum memiliki NIS</p>
                      </button>
                      <button onClick={() => setSourceMode('upload')} className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${sourceMode === 'upload' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-[#222]'}`}>
                        <Upload size={16} className="text-primary mb-1.5" />
                        <p className="font-semibold text-xs">Unggah File</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">Import dari file CSV atau XLSX</p>
                      </button>
                    </div>

                    {sourceMode === 'upload' && (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-300 dark:border-[#333] rounded-lg p-5 text-center hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}>
                          <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                          <p className="font-semibold text-xs text-text-primary dark:text-text-darkPrimary">Unggah Data Siswa</p>
                          <p className="text-[10px] text-text-secondary mt-0.5">Seret dan lepas file .CSV atau .XLSX di sini</p>
                          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                          <Button className="mt-3 text-xs px-3 py-1.5 h-auto" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Pilih File</Button>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs">
                          <span className="text-text-secondary">Belum punya template?</span>
                          <a href={`${API_BASE_URL}/students/template`} className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                            <Download size={12} /> Download Template
                          </a>
                        </div>
                      </div>
                    )}

                    {sourceMode === 'existing' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium">{studentsWithoutNIS.length} siswa belum memiliki NIS</p>
                          <button onClick={() => setSelectedStudentIds(selectedStudentIds.length === studentsWithoutNIS.length ? [] : studentsWithoutNIS.map(s => s.id))}
                            className="text-xs text-primary font-semibold hover:underline">
                            {selectedStudentIds.length === studentsWithoutNIS.length ? 'Hapus Semua' : 'Pilih Semua'}
                          </button>
                        </div>
                        <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 dark:border-[#222]">
                          {studentsWithoutNIS.map(s => (
                            <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] cursor-pointer border-b border-gray-50 dark:border-[#1a1a1a] last:border-0">
                              <input type="checkbox" checked={selectedStudentIds.includes(s.id)}
                                onChange={e => setSelectedStudentIds(e.target.checked ? [...selectedStudentIds, s.id] : selectedStudentIds.filter(id => id !== s.id))}
                                className="accent-primary w-3.5 h-3.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{s.fullName}</p>
                                <p className="text-[10px] text-text-secondary">NISN: {s.nisn} • {s.className || '-'}</p>
                              </div>
                            </label>
                          ))}
                          {studentsWithoutNIS.length === 0 && (
                            <p className="py-6 text-center text-xs text-gray-400">Semua siswa sudah memiliki NIS</p>
                          )}
                        </div>
                        {selectedStudentIds.length > 0 && (
                          <div className="mt-4 flex justify-end">
                            <Button onClick={handlePreviewBatch} className="flex items-center gap-2">
                              <Eye size={16} /> Pratinjau {selectedStudentIds.length} NIS
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Validation (upload mode) */}
                {batchStep === 2 && uploadedStudents.length > 0 && (
                  <div className="space-y-4">
                    {uploadDuplicates.length > 0 && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">{uploadDuplicates.length} duplikasi nama terdeteksi</p>
                          <p className="text-xs text-amber-700/80 dark:text-amber-400/60 mt-1">{uploadDuplicates.join(', ')}</p>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-text-secondary">{uploadedStudents.length} siswa dari file upload. Silakan lanjut ke step berikut untuk membuat profil dan generate NIS.</p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => { setBatchStep(1); setUploadedStudents([]); }}>Upload Ulang</Button>
                      <Button onClick={() => { toast.info('Gunakan mode "Pilih dari Data Siswa" untuk generate NIS existing students, atau import dulu via Data Siswa.'); }}>Lanjutkan</Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Preview */}
                {batchStep === 3 && batchPreview.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Pratinjau NIS yang akan di-generate (diurutkan berdasarkan abjad):</p>
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-[#222]">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-[#0a0a0a]">
                          <tr className="text-[11px] uppercase tracking-wider text-text-secondary">
                            <th className="py-2.5 px-4">No</th>
                            <th className="py-2.5 px-4">Nama Siswa</th>
                            <th className="py-2.5 px-4">Urut</th>
                            <th className="py-2.5 px-4">NIS Lengkap</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchPreview.map((p, i) => (
                            <tr key={p.id} className="border-t border-gray-100 dark:border-[#1a1a1a]">
                              <td className="py-2 px-4 text-text-secondary">{i + 1}</td>
                              <td className="py-2 px-4 font-medium">{p.fullName}</td>
                              <td className="py-2 px-4 font-mono text-text-secondary">{String(p.sequence).padStart(4, '0')}</td>
                              <td className="py-2 px-4 font-mono font-semibold text-primary">{p.newNis}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="ghost" onClick={() => setBatchStep(1)}>Batal</Button>
                      <Button onClick={handleGenerateBatch} disabled={batchGenerating} className="flex items-center gap-2 bg-primary">
                        {batchGenerating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Generate {batchPreview.length} NIS
                      </Button>
                    </div>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">⚠️ Aksi ini tidak dapat dibatalkan setelah konfirmasi</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB: Single Entry ─── */}
          {activeTab === 'single' && (
            <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><UserPlus size={16} className="text-primary" /></div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Entri Siswa Mutasi</h3>
                  <p className="text-xs text-text-secondary">Berikan NIS satuan untuk siswa pindahan/mutasi dari sekolah lain.</p>
                </div>
              </div>
              <form onSubmit={handleAssignSingle} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Nama Lengkap</label>
                    <Input required placeholder="Sesuai akta kelahiran" value={singleForm.fullName} onChange={e => setSingleForm({ ...singleForm, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">NISN</label>
                    <Input required placeholder="Nomor Induk Siswa Nasional" value={singleForm.nisn} onChange={e => setSingleForm({ ...singleForm, nisn: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Asal Sekolah</label>
                    <Input placeholder="Nama sekolah sebelumnya" value={singleForm.asalSekolah} onChange={e => setSingleForm({ ...singleForm, asalSekolah: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Alasan Pindah</label>
                    <Input placeholder="Contoh: Pindah domisili, Jurusan khusus" value={singleForm.address} onChange={e => setSingleForm({ ...singleForm, address: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Jenis Kelamin</label>
                    <select value={singleForm.gender} onChange={e => setSingleForm({ ...singleForm, gender: e.target.value })}
                      className="w-full h-10 rounded-md border border-gray-200 dark:border-[#333] bg-white dark:bg-[#0a0a0a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">-- Pilih --</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Tanggal Masuk</label>
                    <Input type="date" value={singleForm.birthDate} onChange={e => setSingleForm({ ...singleForm, birthDate: e.target.value })} />
                  </div>
                </div>

                {/* NIS Preview */}
                {nextNisInfo && (
                  <div className="bg-gray-50 dark:bg-[#0a0a0a] rounded-xl p-4 border border-gray-200 dark:border-[#222]">
                    <p className="text-xs text-text-secondary mb-2">NIS yang akan diberikan</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-text-secondary">Urutan Terakhir</p>
                        <p className="text-lg font-mono font-bold">{String(nextNisInfo.lastSequence).padStart(4, '0')}</p>
                      </div>
                      <ArrowUpRight size={20} className="text-primary" />
                      <div className="bg-primary/10 rounded-xl px-6 py-3">
                        <p className="text-xs text-primary font-semibold mb-1">NIS Baru</p>
                        <p className="text-2xl font-mono font-bold text-primary">{nextNisInfo.nextNis}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-[#222]">
                  <Button type="button" variant="ghost" onClick={() => setSingleForm({ fullName: '', nisn: '', gender: '', birthPlace: '', birthDate: '', address: '', asalSekolah: '', className: '', academicYearId: '' })}>Hapus Draf</Button>
                  <Button type="submit" disabled={singleLoading} className="flex items-center gap-2 bg-primary">
                    {singleLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Verifikasi & Terbitkan NIS
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2.5">
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary">Aktivitas Terbaru</h4>
              <button onClick={fetchActivity} className="text-[10px] text-primary hover:underline">Lihat Semua</button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-[#1a1a1a]">
              {activity.length > 0 ? activity.slice(0, 5).map(log => <ActivityItem key={log.id} log={log} />)
                : <p className="py-4 text-center text-xs text-gray-400">Belum ada aktivitas</p>}
            </div>
          </div>
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-3">
            <h4 className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary mb-2">Kuota Penggunaan</h4>
            <p className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">{quotaPercent}%</p>
            <div className="w-full bg-gray-200 dark:bg-[#222] rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${quotaPercent}%` }} />
            </div>
            <p className="text-[10px] text-text-secondary mt-1.5">{stats.totalStudents - stats.withoutNIS} dari {stats.totalStudents} NIS telah diterbitkan</p>
          </div>
        </div>
      </div>

      {/* ─── Edit NIS Modal ─── */}
      <Modal isOpen={editModal.open} onClose={() => { setEditModal({ open: false, student: null }); setRevokeConfirm(false); setRevokeConfirmName(''); }} title="Edit NIS">
        <div className="space-y-4">
          <p className="text-sm">Siswa: <strong>{editModal.student?.fullName}</strong></p>
          <Input value={editNisValue} onChange={e => setEditNisValue(e.target.value)} placeholder="NIS baru" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setEditModal({ open: false, student: null }); setRevokeConfirm(false); setRevokeConfirmName(''); }}>Batal</Button>
            <Button onClick={handleEditNIS}>Simpan</Button>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-gray-100 dark:border-[#222] pt-4 mt-2">
            {!revokeConfirm ? (
              <button onClick={() => setRevokeConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                <Trash2 size={13} /> Cabut NIS dari siswa ini
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg p-3 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">Cabut NIS {editModal.student?.nis}?</p>
                    <p className="text-[10px] text-red-600/80 dark:text-red-400/60 mt-0.5">Pilih salah satu aksi di bawah. Nomor urut bisa di-reclaim untuk siswa lain.</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-red-600 dark:text-red-400 mb-1">Ketik <strong>{editModal.student?.fullName}</strong> untuk konfirmasi:</p>
                  <input value={revokeConfirmName} onChange={e => setRevokeConfirmName(e.target.value)}
                    placeholder="Ketik nama siswa..."
                    className="w-full px-2.5 py-1.5 text-xs border border-red-300 dark:border-red-700 rounded-md bg-white dark:bg-[#111] outline-none focus:ring-2 focus:ring-red-300" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => handleRevokeNIS(true)}
                    disabled={revokeConfirmName !== editModal.student?.fullName}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1">
                    <Trash2 size={12} /> Cabut NIS & Hapus Data Siswa
                  </button>
                  <button onClick={() => handleRevokeNIS(false)}
                    disabled={revokeConfirmName !== editModal.student?.fullName}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1">
                    <RefreshCw size={12} /> Cabut NIS Saja (Profil Tetap)
                  </button>
                  <button onClick={() => { setRevokeConfirm(false); setRevokeConfirmName(''); }}
                    className="w-full px-2.5 py-1 text-[10px] text-text-secondary hover:text-text-primary">Batal</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ─── Academic Year Modal ─── */}
      <Modal isOpen={yearModal} onClose={() => setYearModal(false)} title="Kelola Tahun Ajaran">
        <div className="space-y-4">
          {academicYears.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-text-secondary uppercase">Daftar Tahun Ajaran</p>
              {academicYears.map(y => (
                <div key={y.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-[#222]">
                  <div>
                    <p className="text-sm font-semibold">{y.tahunAjaran} <span className="text-xs text-text-secondary">(Kode: {y.kodeTahun})</span></p>
                    <p className="text-xs text-text-secondary">Urutan terakhir: {y.lastNisSequence}</p>
                  </div>
                  {y.isActive ? <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full font-semibold">Aktif</span>
                    : <button onClick={async () => { await apiClient(`/nis/academic-years/${y.id}/activate`, { method: 'PUT' }); fetchAcademicYears(); fetchStats(); toast.success('Tahun ajaran diaktifkan'); }}
                      className="text-xs text-primary hover:underline font-semibold">Aktifkan</button>}
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 dark:border-[#222] pt-4">
            <p className="text-xs font-semibold text-text-secondary uppercase mb-3">Tambah Tahun Ajaran Baru</p>
            <form onSubmit={handleCreateYear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="2025/2026" value={yearForm.tahunAjaran} onChange={e => { const v = e.target.value; setYearForm({ ...yearForm, tahunAjaran: v, kodeTahun: v.split('/')[0]?.slice(-2) || '' }); }} required />
                <Input placeholder="Kode (25)" value={yearForm.kodeTahun} onChange={e => setYearForm({ ...yearForm, kodeTahun: e.target.value })} required />
                <Input type="date" value={yearForm.tanggalMulai} onChange={e => setYearForm({ ...yearForm, tanggalMulai: e.target.value })} required />
                <Input type="date" value={yearForm.tanggalSelesai} onChange={e => setYearForm({ ...yearForm, tanggalSelesai: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full">Tambah & Aktifkan</Button>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};
