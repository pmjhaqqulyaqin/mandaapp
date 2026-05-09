import { useState } from 'react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { BookOpen, PenLine, List, Activity, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { JurnalInputTab } from './tabs/JurnalInputTab';
import { JurnalListTab } from './tabs/JurnalListTab';
import { JurnalMonitoringTab } from './tabs/JurnalMonitoringTab';
import { JurnalRecapTab } from './tabs/JurnalRecapTab';
import { JurnalSettingsTab } from './tabs/JurnalSettingsTab';

type TabKey = 'input' | 'list' | 'monitoring' | 'rekap' | 'settings';

export const DashboardJurnal = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const isAdmin = role === 'admin';
  const isLeadership = ['kepala_madrasah', 'wakil_kepala'].includes(role);
  const canInput = !['kepala_tu', 'pegawai_tu', 'student', 'orang_tua', ''].includes(role);

  const [activeTab, setActiveTab] = useState<TabKey>(canInput ? 'input' : isLeadership ? 'monitoring' : 'list');

  const tabs: { key: TabKey; icon: React.ReactNode; label: string; visible: boolean }[] = [
    { key: 'input', icon: <PenLine size={15} />, label: 'Input', visible: canInput },
    { key: 'list', icon: <List size={15} />, label: 'Daftar', visible: true },
    { key: 'monitoring', icon: <Activity size={15} />, label: 'Monitoring', visible: isAdmin || isLeadership },
    { key: 'rekap', icon: <BarChart3 size={15} />, label: 'Rekap', visible: isAdmin || isLeadership || role === 'wali_kelas' },
    { key: 'settings', icon: <Settings size={15} />, label: 'Jadwal', visible: isAdmin },
  ];

  const visibleTabs = tabs.filter(t => t.visible);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Jurnal Mengajar' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mt-1">
            Jurnal Mengajar
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Dokumentasi Kegiatan Belajar Mengajar
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden shadow-sm">
        {/* Segmented Control - Mobile Optimized */}
        <div className="p-2 md:p-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/80 dark:bg-[#0d0d0d]">
          <div className="flex overflow-x-auto no-scrollbar">
            <div className="inline-flex w-full md:w-auto gap-1 p-0.5 bg-gray-200/70 dark:bg-[#1a1a1a] rounded-xl">
              {visibleTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center justify-center gap-1.5 flex-1 md:flex-initial px-3 md:px-4 py-2.5 md:py-2 text-[12px] font-semibold whitespace-nowrap rounded-lg transition-all duration-200 active:scale-95 ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-[#2a2a2a] text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
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
          {activeTab === 'input' && <JurnalInputTab />}
          {activeTab === 'list' && <JurnalListTab />}
          {activeTab === 'monitoring' && <JurnalMonitoringTab />}
          {activeTab === 'rekap' && <JurnalRecapTab />}
          {activeTab === 'settings' && <JurnalSettingsTab />}
        </div>
      </div>
    </div>
  );
};
