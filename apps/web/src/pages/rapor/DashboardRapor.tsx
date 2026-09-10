import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { BookOpen, Settings, FileSpreadsheet } from 'lucide-react';
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

  // Get logged-in teacher's employee profile
  const { data: myEmployee } = useMyEmployee();
  const employeeId = myEmployee?.id || '';

  // Derive active tab from URL path segment
  const tabSegment = location.pathname.split('/').filter(Boolean).pop();
  const activeTab: TabKey = (['tp', 'config'].includes(tabSegment || ''))
    ? tabSegment as TabKey
    : 'input-nilai';

  const handleTabChange = (tab: TabKey) => {
    navigate(tab === 'input-nilai' ? '/dashboard/rapor' : `/dashboard/rapor/${tab}`);
  };

  // Shared state for selectors
  const [academicYearId, setAcademicYearId] = useState('');
  const [semester, setSemester] = useState('ganjil');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');

  // Data from teaching assignments
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mySubjects, setMySubjects] = useState<any[]>([]); // Unique subjects for this teacher
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]); // Classes filtered by selected subject

  // For admin: all classes and subjects
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
      // Admin sees all classes and subjects
      Promise.all([
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/kbm/subjects?active=true'),
      ]).then(([cls, subj]) => {
        setAllClasses(cls.sort((a: any, b: any) => a.name.localeCompare(b.name)));
        setAllSubjects(subj.sort((a: any, b: any) => a.nama.localeCompare(b.nama)));
        setAssignments([]);
      }).catch(() => {});
    } else if (employeeId) {
      // Guru/Wali Kelas: fetch their assignments from jadwal mengajar
      apiClient<any>(`/rapor/my-assignments?employeeId=${employeeId}&semester=${semester}`)
        .then(data => {
          const asgn = data.assignments || [];
          setAssignments(asgn);
          setMySubjects(data.subjects || []);
          // Auto-select if only 1 subject
          if (data.subjects?.length === 1) {
            setSubjectId(data.subjects[0].id);
          }
        })
        .catch(() => {});
    }
  }, [employeeId, semester, isAdmin]);

  // When subject changes, filter classes based on assignments
  useEffect(() => {
    if (isAdmin) {
      // Admin: show all classes, no filtering
      setFilteredClasses(allClasses);
      return;
    }
    if (!subjectId || assignments.length === 0) {
      setFilteredClasses([]);
      return;
    }
    // Get classes where this teacher teaches the selected subject
    const classIdsForSubject = new Set(
      assignments.filter(a => a.subjectId === subjectId).map(a => a.classId)
    );
    const classes = assignments
      .filter(a => classIdsForSubject.has(a.classId))
      .reduce((acc: any[], a) => {
        if (!acc.find(c => c.id === a.classId)) {
          acc.push({ id: a.classId, name: a.className });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    setFilteredClasses(classes);
    // Reset classId if no longer valid
    if (classId && !classIdsForSubject.has(classId)) {
      setClassId('');
    }
  }, [subjectId, assignments, isAdmin, allClasses]);

  // Determine which lists to use for dropdowns
  const subjectOptions = isAdmin ? allSubjects : mySubjects;
  const classOptions = isAdmin ? allClasses : filteredClasses;

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

        {/* Selectors row: TA → Semester → MAPEL dulu → Kelas */}
        <div className="flex flex-wrap items-center gap-2">
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
          <select
            value={semester}
            onChange={e => setSemester(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ganjil">Ganjil</option>
            <option value="genap">Genap</option>
          </select>
          {/* MAPEL dropdown (pilih dulu) */}
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
          {/* KELAS dropdown (filter berdasarkan mapel terpilih) */}
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
        {/* Tabs */}
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

        {/* Tab Content */}
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
