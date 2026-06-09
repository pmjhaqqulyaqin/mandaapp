import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { Settings, FileSpreadsheet, Download, BookOpen, Users } from 'lucide-react';
import { StudentDataTab } from './tabs/StudentDataTab';
import { SettingsTab } from './tabs/SettingsTab';
import { InputGlobalTab } from './tabs/InputGlobalTab';
import { InputRombelTab } from './tabs/InputRombelTab';
import { ExportTab } from './tabs/ExportTab';

type TabKey = 'students' | 'settings' | 'global' | 'rombel' | 'export';

const TABS: { key: TabKey; label: string; icon: any; shortLabel: string }[] = [
  { key: 'students', label: 'Data Siswa Kelas XII', icon: Users, shortLabel: 'Data Siswa' },
  { key: 'settings', label: 'Pengaturan & Mapel', icon: Settings, shortLabel: 'Pengaturan' },
  { key: 'global', label: 'Semester 1-2 (Global)', icon: BookOpen, shortLabel: 'Sem 1-2' },
  { key: 'rombel', label: 'Semester 3-5 & UM', icon: FileSpreadsheet, shortLabel: 'Per Rombel' },
  { key: 'export', label: 'Ekspor Leger & Ijazah', icon: Download, shortLabel: 'Ekspor' },
];

export const DashboardIjazah = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from URL path segment (like DashboardSettings pattern)
  const tabSegment = location.pathname.split('/').filter(Boolean).pop();
  const activeTab: TabKey = (['settings', 'global', 'rombel', 'export'].includes(tabSegment || ''))
    ? tabSegment as TabKey
    : 'students';

  const handleTabChange = (tab: TabKey) => {
    navigate(tab === 'students' ? '/dashboard/ijazah' : `/dashboard/ijazah/${tab}`);
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Pengolahan Ijazah' },
          ]} />
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mt-1">
            Pengolahan Nilai Ijazah Kelas XII
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sistem kalkulasi dan ekspor otomatis untuk nilai akhir dan ijazah.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
        


        {/* Tab Content Area */}
        <div className="p-4 sm:p-5 min-h-[500px]">
          {activeTab === 'students' && <StudentDataTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'global' && <InputGlobalTab />}
          {activeTab === 'rombel' && <InputRombelTab />}
          {activeTab === 'export' && <ExportTab />}
        </div>
        
      </div>
    </div>
  );
};
