import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { BarChart3, BookOpen, ClipboardList, Settings, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import { SemesterSelector } from './components/SemesterSelector';
import { KBMDashboardTab } from './tabs/KBMDashboardTab';
import { DistribusiJamTab } from './tabs/DistribusiJamTab';
import { TugasTambahanTab } from './tabs/TugasTambahanTab';
import { KBMSettingsTab } from './tabs/KBMSettingsTab';

type TabKey = 'dashboard' | 'distribusi' | 'tugas' | 'settings';

export const DashboardKBM = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const isAdmin = role === 'admin';
  const isLeadership = ['kepala_madrasah', 'wakil_kepala'].includes(role);
  const canEdit = isAdmin || isLeadership || role === 'kepala_tu' || role === 'pegawai_tu';

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [academicYearId, setAcademicYearId] = useState('');
  const [semester, setSemester] = useState('genap');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [semesterLabel, setSemesterLabel] = useState('');

  // Load academic years
  useEffect(() => {
    apiClient<any[]>('/events/academic-years').then(data => {
      setAcademicYears(data);
      const active = data.find((a: any) => a.isActive);
      if (active) {
        setAcademicYearId(active.id);
        setSemesterLabel(`${semester === 'ganjil' ? 'Ganjil' : 'Genap'} ${active.tahunAjaran}`);
      }
    }).catch(() => {});
  }, []);

  const handleSemesterChange = (ayId: string, sem: string) => {
    setAcademicYearId(ayId);
    setSemester(sem);
    const ay = academicYears.find(a => a.id === ayId);
    setSemesterLabel(`${sem === 'ganjil' ? 'Ganjil' : 'Genap'} ${ay?.tahunAjaran || ''}`);
  };

  const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: 'dashboard', icon: <BarChart3 size={15} />, label: 'Dashboard' },
    { key: 'distribusi', icon: <BookOpen size={15} />, label: 'Distribusi Jam' },
    { key: 'tugas', icon: <Users size={15} />, label: 'Tugas Tambahan' },
    ...(canEdit ? [{ key: 'settings' as TabKey, icon: <Settings size={15} />, label: 'Pengaturan' }] : []),
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pembagian Tugas KBM' }]} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
            Pembagian Tugas KBM
          </h1>
          <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manajemen Distribusi Jam Mengajar & Tugas Tambahan Guru
          </p>
        </div>
        <SemesterSelector
          academicYears={academicYears}
          academicYearId={academicYearId}
          semester={semester}
          onChange={handleSemesterChange}
        />
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden shadow-sm">
        <div className="p-2 md:p-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/80 dark:bg-[#0d0d0d]">
          <div className="flex overflow-x-auto no-scrollbar">
            <div className="inline-flex w-full md:w-auto gap-1 p-0.5 bg-gray-200/70 dark:bg-[#1a1a1a] rounded-xl">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center justify-center gap-1.5 flex-1 md:flex-initial px-3 md:px-4 py-2.5 md:py-2 text-[12px] font-semibold whitespace-nowrap rounded-lg transition-all duration-200 active:scale-95 ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-[#2a2a2a] text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 md:p-4 bg-white dark:bg-[#111] min-h-[400px]">
          {activeTab === 'dashboard' && (
            <KBMDashboardTab
              academicYearId={academicYearId}
              semester={semester}
              semesterLabel={semesterLabel}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'distribusi' && (
            <DistribusiJamTab
              academicYearId={academicYearId}
              semester={semester}
              canEdit={canEdit}
            />
          )}
          {activeTab === 'tugas' && (
            <TugasTambahanTab
              academicYearId={academicYearId}
              semester={semester}
              canEdit={canEdit}
            />
          )}
          {activeTab === 'settings' && canEdit && (
            <KBMSettingsTab
              academicYearId={academicYearId}
              semester={semester}
              academicYears={academicYears}
            />
          )}
        </div>
      </div>
    </div>
  );
};
