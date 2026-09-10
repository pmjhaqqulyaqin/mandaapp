import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { BookOpen, Settings, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMyEmployee } from '../../hooks/api/useEmployeeProfile';
import { apiClient } from '../../lib/api';
import { InputNilaiTab } from './tabs/InputNilaiTab';
import { TujuanPembelajaranTab } from './tabs/TujuanPembelajaranTab';
import { KonfigurasiTab } from './tabs/KonfigurasiTab';

type TabKey = 'input-nilai' | 'tp' | 'config';

export const DashboardRapor = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role || '';
  const isAdmin = role === 'admin';

  const { data: myEmployee, isLoading: empLoading } = useMyEmployee();
  const employeeId = myEmployee?.id || '';

  const tabSegment = location.pathname.split('/').filter(Boolean).pop();
  const activeTab: TabKey = (['tp', 'config'].includes(tabSegment || ''))
    ? tabSegment as TabKey
    : 'input-nilai';

  const handleTabChange = (tab: TabKey) => {
    navigate(tab === 'input-nilai' ? '/dashboard/rapor' : `/dashboard/rapor/${tab}`);
  };

  // State
  const [academicYearId, setAcademicYearId] = useState('');
  const [semester, setSemester] = useState('ganjil');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Data
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mySubjects, setMySubjects] = useState<any[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);

  // Load academic years
  useEffect(() => {
    apiClient<any[]>('/nis/academic-years').then(data => {
      setAcademicYears(data);
      const active = data.find((a: any) => a.isActive);
      if (active) setAcademicYearId(active.id);
    }).catch(() => {});
  }, []);

  // Load teaching assignments (guru) or all data (admin)
  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/kbm/subjects?active=true'),
      ]).then(([cls, subj]) => {
        setAllClasses(cls.sort((a: any, b: any) => a.name.localeCompare(b.name)));
        setAllSubjects(subj.sort((a: any, b: any) => a.nama.localeCompare(b.nama)));
      }).catch(() => {});
      return;
    }

    // Guru: wait for employeeId
    if (!employeeId) return;

    setLoadingAssignments(true);
    apiClient<any>(`/rapor/my-assignments?employeeId=${employeeId}&semester=${semester}`)
      .then(data => {
        const asgn = data.assignments || [];
        const subjs = data.subjects || [];
        setAssignments(asgn);
        setMySubjects(subjs);
        // Auto-select if only 1 subject
        if (subjs.length === 1) {
          setSubjectId(subjs[0].id);
        } else {
          setSubjectId('');
        }
        setClassId('');
      })
      .catch((err) => {
        console.error('[Rapor] Failed to load assignments:', err);
      })
      .finally(() => setLoadingAssignments(false));
  }, [employeeId, semester, isAdmin]);

  // When subject changes → filter classes
  useEffect(() => {
    if (isAdmin) {
      setFilteredClasses(allClasses);
      return;
    }
    if (!subjectId || assignments.length === 0) {
      setFilteredClasses([]);
      return;
    }
    const classIdsForSubject = new Set(
      assignments.filter(a => a.subjectId === subjectId).map(a => a.classId)
    );
    const classes: any[] = [];
    const seen = new Set<string>();
    for (const a of assignments) {
      if (classIdsForSubject.has(a.classId) && !seen.has(a.classId)) {
        seen.add(a.classId);
        classes.push({ id: a.classId, name: a.className });
      }
    }
    classes.sort((a, b) => a.name.localeCompare(b.name));
    setFilteredClasses(classes);
    if (classId && !classIdsForSubject.has(classId)) {
      setClassId('');
    }
  }, [subjectId, assignments, isAdmin, allClasses]);

  const subjectOptions = isAdmin ? allSubjects : mySubjects;
  const classOptions = isAdmin ? allClasses : filteredClasses;
  const selectedSubjectName = subjectOptions.find(s => s.id === subjectId)?.nama || '';

  const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: 'input-nilai', icon: <FileSpreadsheet size={15} />, label: 'Input Nilai Sumatif' },
    { key: 'tp', icon: <BookOpen size={15} />, label: 'Tujuan Pembelajaran (TP)' },
    { key: 'config', icon: <Settings size={15} />, label: 'Konfigurasi Bobot' },
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'e-Rapor / Input Nilai' }]} />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            e-Rapor / Input Nilai
          </h1>
          <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Input Nilai Sumatif Kurikulum Merdeka — KMA 450/2024
          </p>
        </div>

        {/* Selectors: TA → Semester → Mapel → Kelas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tahun Ajaran */}
          <select
            value={academicYearId}
            onChange={e => setAcademicYearId(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Tahun Ajaran</option>
            {academicYears.map((ay: any) => (
              <option key={ay.id} value={ay.id}>
                {ay.tahunAjaran} {ay.isActive ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          {/* Semester */}
          <select
            value={semester}
            onChange={e => setSemester(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ganjil">Ganjil</option>
            <option value="genap">Genap</option>
          </select>

          {/* Mata Pelajaran */}
          {loadingAssignments ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" /> Memuat mapel...
            </div>
          ) : !isAdmin && mySubjects.length === 1 ? (
            // Hanya 1 mapel: tampil sebagai label, otomatis terpilih
            <div className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
              {mySubjects[0].kode ? `${mySubjects[0].kode} — ` : ''}{mySubjects[0].nama}
            </div>
          ) : (
            // Multiple mapel atau admin: tampil dropdown
            <select
              value={subjectId}
              onChange={e => { setSubjectId(e.target.value); setClassId(''); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Pilih Mata Pelajaran</option>
              {subjectOptions.map((s: any) => (
                <option key={s.id} value={s.id}>{s.kode ? `${s.kode} — ` : ''}{s.nama}</option>
              ))}
            </select>
          )}

          {/* Kelas */}
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            disabled={!subjectId && !isAdmin}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">{!subjectId && !isAdmin ? 'Pilih Mapel dulu' : 'Pilih Kelas'}</option>
            {classOptions.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Container */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-1 px-3 pt-3 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-3 md:p-4 min-h-[400px]">
          {activeTab === 'input-nilai' && (
            <InputNilaiTab
              academicYearId={academicYearId}
              semester={semester}
              classId={classId}
              subjectId={subjectId}
              subjectList={subjectOptions}
              classList={classOptions}
            />
          )}
          {activeTab === 'tp' && (
            <TujuanPembelajaranTab
              academicYearId={academicYearId}
              semester={semester}
              subjectId={subjectId}
              subjectList={subjectOptions}
            />
          )}
          {activeTab === 'config' && (
            <KonfigurasiTab
              academicYearId={academicYearId}
              semester={semester}
              classId={classId}
              subjectId={subjectId}
            />
          )}
        </div>
      </div>
    </div>
  );
};
