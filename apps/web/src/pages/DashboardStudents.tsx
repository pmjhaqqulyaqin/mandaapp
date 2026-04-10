import { useState, useEffect, useMemo } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';
import * as XLSX from 'xlsx';
import {
  Users, Search, Settings2, RefreshCw, FileSpreadsheet, Download,
  UserPlus, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, GraduationCap, AlertCircle, UserCog, ArrowUpRight, X
} from 'lucide-react';

// Sub-components
import { ClassMajorView } from './students/ClassMajorView';
import { PullNISModal } from './students/PullNISModal';
import { ImportExcelModal } from './students/ImportExcelModal';
import { AddStudentModal } from './students/AddStudentModal';
import { UpdateStatusModal } from './students/UpdateStatusModal';
import { BulkPromotionModal } from './students/BulkPromotionModal';

type Tab = 'students' | 'classes';

// Avatar color from name hash
const avatarColor = (name: string) => {
  const colors = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-violet-500','bg-cyan-500','bg-orange-500','bg-teal-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const getGradeLevel = (name: string): string => {
  const n = (name || '').trim().toUpperCase();
  if (n.startsWith('XII')) return 'XII';
  if (n.startsWith('XI')) return 'XI';
  if (n.startsWith('X')) return 'X';
  return name;
};

// Status badge
const StatusBadge = ({ status }: { status: string }) => {
  const s = (status || 'Aktif').toLowerCase();
  const cfg = s === 'aktif' || s === 'active' ? { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Aktif' }
    : s === 'lulus' ? { dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Lulus' }
    : s === 'mutasi' ? { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Mutasi' }
    : { dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', label: status || 'Aktif' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const ITEMS_PER_PAGE = 10;

export const DashboardStudents = () => {
  useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [majorsList, setMajorsList] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('sm_search') || '');
  const [filterClass, setFilterClass] = useState(() => sessionStorage.getItem('sm_class') || '');
  const [filterMajor, setFilterMajor] = useState(() => sessionStorage.getItem('sm_major') || '');
  const [filterStatus, setFilterStatus] = useState(() => sessionStorage.getItem('sm_status') || 'Aktif');
  const [page, setPage] = useState(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modals
  const [pullNISOpen, setPullNISOpen] = useState(false);
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [statusStudent, setStatusStudent] = useState<any>(null);
  const [bulkPromotionOpen, setBulkPromotionOpen] = useState(false);

  // Persist filters
  useEffect(() => { sessionStorage.setItem('sm_search', searchQuery); }, [searchQuery]);
  useEffect(() => { sessionStorage.setItem('sm_class', filterClass); }, [filterClass]);
  useEffect(() => { sessionStorage.setItem('sm_major', filterMajor); }, [filterMajor]);
  useEffect(() => { sessionStorage.setItem('sm_status', filterStatus); }, [filterStatus]);

  // Data fetching
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, c, m, t] = await Promise.all([
        apiClient<any[]>('/students'),
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/majors'),
        apiClient<any[]>('/employees?type=Guru').catch(() => []),
      ]);
      setStudents(s); setClassesList(c); setMajorsList(m); setTeachers(t);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Filtered & paginated students
  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || (s.fullName || '').toLowerCase().includes(q) || (s.nis || '').includes(q) || (s.nisn || '').includes(q);
      const matchClass = !filterClass || (() => {
        const cls = classesList.find(c => c.id === s.classId);
        const name = cls?.name || s.className || '';
        return getGradeLevel(name) === filterClass;
      })();
      const matchMajor = !filterMajor || (() => {
        const cls = classesList.find(c => c.id === s.classId);
        return cls?.majorId === filterMajor;
      })();
      const matchStatus = filterStatus === 'Semua' || (() => {
        const status = (s.status || 'Aktif').toLowerCase();
        if (filterStatus === 'Aktif') return status === 'aktif' || status === 'active';
        return status === filterStatus.toLowerCase();
      })();
      return matchSearch && matchClass && matchMajor && matchStatus;
    });
  }, [students, searchQuery, filterClass, filterMajor, filterStatus, classesList]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  useEffect(() => { setPage(1); }, [searchQuery, filterClass, filterMajor]);

  // Stats
  const stats = useMemo(() => ({
    total: filtered.length,
    aktif: filtered.filter(s => !s.status || s.status.toLowerCase() === 'aktif' || s.status.toLowerCase() === 'active').length,
    lulus: filtered.filter(s => (s.status || '').toLowerCase() === 'lulus').length,
    mutasi: filtered.filter(s => (s.status || '').toLowerCase() === 'mutasi').length,
  }), [filtered]);

  // Handlers
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Yakin hapus data siswa "${name}"?`)) return;
    try { await apiClient(`/students/${id}`, { method: 'DELETE' }); fetchAll(); }
    catch (err: any) { alert('Gagal: ' + err.message); }
  };

  const handleEdit = (student: any) => {
    setEditStudent(student);
    setAddStudentOpen(true);
  };

  // Export Excel with active filters
  const handleExportExcel = () => {
    const data = filtered.map((s, idx) => {
      const cls = classesList.find(c => c.id === s.classId);
      const mjr = cls ? majorsList.find(m => m.id === cls.majorId)?.name : '';
      const kelasLabel = cls ? (mjr ? `${cls.name} - ${mjr}` : cls.name) : (s.className || '-');
      return {
        'No': idx + 1,
        'Nama Lengkap': s.fullName || '-',
        'NISN': s.nisn || '-',
        'NIS': s.nis || '-',
        'Kelas': kelasLabel,
        'Jurusan': mjr || '-',
        'Jenis Kelamin': s.gender || '-',
        'Tempat Lahir': s.birthPlace || '-',
        'Tanggal Lahir': s.birthDate ? new Date(s.birthDate).toLocaleDateString('id-ID') : '-',
        'Status': s.status || 'Aktif',
        'Alamat': s.address || '-',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto column width
    const colWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, ...data.map(r => String((r as any)[key]).length).slice(0, 50)) + 2 }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    const filterLabel = [filterClass && 'kelas', filterMajor && 'jurusan', searchQuery && 'search'].filter(Boolean).join('_');
    XLSX.writeFile(wb, `Data_Siswa${filterLabel ? '_' + filterLabel : ''}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Get class label
  const getClassLabel = (s: any) => {
    const cls = classesList.find(c => c.id === s.classId);
    return cls?.name || s.className || '-';
  };
  const getMajorLabel = (s: any) => {
    const cls = classesList.find(c => c.id === s.classId);
    if (!cls) return '-';
    return majorsList.find(m => m.id === cls.majorId)?.name || '-';
  };

  // Unique majors and grades for filter
  const uniqueMajorsForFilter = majorsList;
  const uniqueGradesForFilter = useMemo(() => {
    const grades = new Set<string>();
    classesList.forEach(c => {
      const grade = getGradeLevel(c.name);
      if (grade) grades.add(grade);
    });
    // Add grades from students if they don't have a matching class in classesList
    students.forEach(s => {
      if (s.className) {
        const grade = getGradeLevel(s.className);
        if (grade) grades.add(grade);
      }
    });

    const gradeOrder = ['X', 'XI', 'XII'];
    return Array.from(grades).sort((a, b) => {
      const idxA = gradeOrder.indexOf(a);
      const idxB = gradeOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [classesList, students]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[
            { label: 'Database', href: '/dashboard' },
            { label: activeTab === 'students' ? 'Data Siswa' : 'Kelas & Jurusan' },
          ]} />
          <h1 className="text-xl font-bold text-text-primary dark:text-text-darkPrimary mt-1">Manajemen Data Siswa</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs"
            onClick={() => setActiveTab(activeTab === 'students' ? 'classes' : 'students')}>
            <Settings2 size={14} /> {activeTab === 'students' ? 'Kelas & Jurusan' : 'Data Siswa'}
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs"
            onClick={() => setPullNISOpen(true)}>
            <RefreshCw size={14} /> Pull dari NIS
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs"
            onClick={() => setImportExcelOpen(true)}>
            <FileSpreadsheet size={14} /> Import Excel
          </Button>
          <Button size="sm" className="flex items-center gap-1.5 text-xs"
            onClick={() => { setEditStudent(null); setAddStudentOpen(true); }}>
            <UserPlus size={14} /> Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'students' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] px-3 py-2">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-[3] min-w-0">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-0.5 block">Cari Nama atau NIS</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Masukkan nama siswa atau nomor induk..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="flex-[2] min-w-0">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-0.5 block">Filter Tingkat Kelas</label>
                <select className="w-full h-8 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                  <option value="">Semua Tingkat</option>
                  {uniqueGradesForFilter.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="flex-[2] min-w-0">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-0.5 block">Filter Jurusan</label>
                <select className="w-full h-8 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  value={filterMajor} onChange={e => setFilterMajor(e.target.value)}>
                  <option value="">Semua Jurusan</option>
                  {uniqueMajorsForFilter.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex-[1.5] min-w-0">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-0.5 block">Filter Status</label>
                <select className="w-full h-8 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="Aktif">Aktif</option>
                  <option value="Lulus">Lulus (Alumni)</option>
                  <option value="Mutasi">Mutasi</option>
                  <option value="DO">Berhenti (DO)</option>
                  <option value="Semua">Semua Status</option>
                </select>
              </div>
              <div className="shrink-0 self-end sm:self-auto">
                <Button variant="outline" size="icon" title="Export Excel (sesuai filter aktif)"
                  onClick={handleExportExcel} className="h-8 w-8">
                  <Download size={14} className="text-emerald-600" />
                </Button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#222] text-[9.5px] uppercase tracking-wider text-text-secondary">
                    <th className="py-2.5 px-3 font-semibold w-8">
                      <input type="checkbox" className="accent-primary w-3.5 h-3.5"
                        checked={paginated.length > 0 && paginated.every(s => selectedStudentIds.includes(s.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds(prev => Array.from(new Set([...prev, ...paginated.map(s => s.id)])));
                          else setSelectedStudentIds(prev => prev.filter(id => !paginated.some(s => s.id === id)));
                        }}
                      />
                    </th>
                    <th className="py-2.5 px-3 font-semibold">NIS</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Siswa</th>
                    <th className="py-2.5 px-3 font-semibold">Kelas</th>
                    <th className="py-2.5 px-3 font-semibold">Jurusan</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(s => (
                    <tr key={s.id} className="group border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                      <td className="py-2 px-3">
                        <input type="checkbox" className="accent-primary w-3.5 h-3.5"
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedStudentIds(prev => [...prev, s.id]);
                            else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                          }}
                        />
                      </td>
                      <td className="py-2 px-3 text-[11px] font-mono text-text-secondary">{s.nis || s.nisn || '-'}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${avatarColor(s.fullName || '')} text-white text-[9px] font-bold flex items-center justify-center shrink-0`}>
                            {initials(s.fullName || '?')}
                          </div>
                          <span className="text-[12.5px] font-semibold text-text-primary dark:text-text-darkPrimary">{s.fullName || '-'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-text-primary dark:text-text-darkPrimary">{getClassLabel(s)}</td>
                      <td className="py-2 px-3 text-[11px]"><span className="text-primary font-medium">{getMajorLabel(s)}</span></td>
                      <td className="py-2 px-3"><StatusBadge status={s.status} /></td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setStatusStudent(s); setUpdateStatusOpen(true); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-400 hover:text-amber-500 transition-colors" title="Ubah Status"><UserCog size={13} /></button>
                          <button onClick={() => handleEdit(s)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-400 hover:text-blue-500 transition-colors" title="Edit"><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete(s.id, s.fullName)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-400 hover:text-red-500 transition-colors" title="Hapus"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                      {searchQuery || filterClass || filterMajor ? 'Tidak ada siswa yang sesuai filter.' : 'Belum ada data siswa.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-[#222] flex items-center justify-between">
              <p className="text-xs text-primary font-medium">
                Showing {filtered.length > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length.toLocaleString()} students
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page <= 1} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] disabled:opacity-30 text-xs font-bold">«</button>
                <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] disabled:opacity-30"><ChevronLeft size={16} /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-[#222] text-text-secondary'}`}>
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && page < totalPages - 2 && <span className="text-xs text-text-secondary px-1">...</span>}
                {totalPages > 5 && page < totalPages - 2 && (
                  <button onClick={() => setPage(totalPages)}
                    className="w-8 h-8 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-[#222] text-text-secondary">{totalPages}</button>
                )}
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] disabled:opacity-30"><ChevronRight size={16} /></button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] disabled:opacity-30 text-xs font-bold">»</button>
              </div>
            </div>
          </div>

          {/* Stat Cards Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: <Users size={16} className="text-blue-500" />, label: 'Total Siswa', value: stats.total, bg: 'bg-blue-500/10', mode: 'Semua' },
              { icon: <CheckCircle2 size={16} className="text-emerald-500" />, label: 'Aktif', value: stats.aktif, bg: 'bg-emerald-500/10', mode: 'Aktif' },
              { icon: <GraduationCap size={16} className="text-amber-500" />, label: 'Lulus', value: stats.lulus, bg: 'bg-amber-500/10', mode: 'Lulus' },
              { icon: <AlertCircle size={16} className="text-red-500" />, label: 'Mutasi', value: stats.mutasi, bg: 'bg-red-500/10', mode: 'Mutasi' },
            ].map(card => (
              <div key={card.label} onClick={() => setFilterStatus(card.mode)} 
                className={`bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-3 flex items-center gap-2.5 cursor-pointer hover:border-primary/50 transition-colors ${filterStatus === card.mode ? 'ring-1 ring-primary shadow-sm' : ''}`}>
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>{card.icon}</div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">{card.label}</p>
                  <p className="text-base font-bold text-text-primary dark:text-text-darkPrimary leading-tight">{card.value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <ClassMajorView
          classes={classesList}
          majors={majorsList}
          teachers={teachers}
          students={students}
          loading={loading}
          onRefresh={fetchAll}
          apiClient={apiClient}
          onViewDetails={(grade) => {
            setFilterClass(grade);
            setActiveTab('students');
          }}
        />
      )}

      {/* Modals */}
      <PullNISModal isOpen={pullNISOpen} onClose={() => setPullNISOpen(false)}
        classes={classesList} majors={majorsList} apiClient={apiClient} onSuccess={fetchAll} />
      <ImportExcelModal isOpen={importExcelOpen} onClose={() => setImportExcelOpen(false)}
        apiClient={apiClient} onSuccess={fetchAll} />
      <AddStudentModal isOpen={addStudentOpen} onClose={() => { setAddStudentOpen(false); setEditStudent(null); }}
        classes={classesList} majors={majorsList} apiClient={apiClient} onSuccess={fetchAll} editStudent={editStudent} />
      <UpdateStatusModal isOpen={updateStatusOpen} onClose={() => { setUpdateStatusOpen(false); setStatusStudent(null); }}
        student={statusStudent} apiClient={apiClient} onSuccess={fetchAll} />
      <BulkPromotionModal isOpen={bulkPromotionOpen} onClose={() => { setBulkPromotionOpen(false); setSelectedStudentIds([]); }}
        selectedStudents={filtered.filter(s => selectedStudentIds.includes(s.id))} classes={classesList} majors={majorsList}
        apiClient={apiClient} onSuccess={() => { fetchAll(); setSelectedStudentIds([]); }} />

      {/* Floating Action Bar */}
      {selectedStudentIds.length > 0 && activeTab === 'students' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1a1a1a] shadow-xl border border-gray-200 dark:border-[#333] px-4 py-3 rounded-full flex items-center gap-4 z-50 animate-in slide-in-from-bottom h-14">
          <div className="bg-primary/10 text-primary font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">{selectedStudentIds.length}</div>
          <span className="text-sm font-medium text-text-primary dark:text-text-darkPrimary pr-2 hidden sm:inline">Siswa Terpilih</span>
          <div className="w-px h-6 bg-gray-200 dark:bg-[#333]" />
          <Button size="sm" onClick={() => setBulkPromotionOpen(true)} className="flex items-center gap-1.5 whitespace-nowrap">
            <ArrowUpRight size={14} /> Proses Seleksi
          </Button>
          <button onClick={() => setSelectedStudentIds([])} className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors"><X size={16} className="text-text-secondary" /></button>
        </div>
      )}
    </div>
  );
};
