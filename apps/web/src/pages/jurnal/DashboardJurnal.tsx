import { useState } from 'react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { Activity, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { JurnalHome } from './JurnalHome';
import { JurnalInputTab } from './tabs/JurnalInputTab';
import { JurnalListTab } from './tabs/JurnalListTab';
import { JurnalRecapTab } from './tabs/JurnalRecapTab';
import { JurnalMonitoringTab } from './tabs/JurnalMonitoringTab';
import { JurnalSettingsTab } from './tabs/JurnalSettingsTab';

type GuruView = 'home' | 'create' | 'history' | 'stats';
type AdminTab = 'monitoring' | 'rekap' | 'settings';

// ── Guru Mobile-First View ──────────────────────────────────────
const JurnalGuruView = ({ isAdmin }: { isAdmin: boolean }) => {
  const [view, setView] = useState<GuruView>('home');
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

  const handleNavigate = (target: 'create' | 'history' | 'stats', schedule?: any) => {
    if (schedule) setSelectedSchedule(schedule);
    else setSelectedSchedule(null);
    setView(target);
  };

  const handleBack = () => {
    setView('home');
    setSelectedSchedule(null);
  };

  const handleAdminSettings = () => {
    // Admin can switch to settings view. We use a trick - switch to a fake
    // "create" view but with a settings flag. For simplicity, we open settings
    // in an overlay approach. But since admin has its own tab view, we just
    // expose the quick access button.
  };

  return (
    <div className="min-h-[60vh]">
      {view === 'home' && (
        <JurnalHome
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
        />
      )}
      {view === 'create' && (
        <JurnalInputTab
          onBack={handleBack}
          selectedSchedule={selectedSchedule}
        />
      )}
      {view === 'history' && (
        <JurnalListTab
          onBack={handleBack}
        />
      )}
      {view === 'stats' && (
        <JurnalRecapTab
          onBack={handleBack}
        />
      )}
    </div>
  );
};

// ── Admin/Leadership Tab View ────────────────────────────────────
const JurnalAdminView = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('monitoring');

  const tabs: { key: AdminTab; icon: React.ReactNode; label: string }[] = [
    { key: 'monitoring', icon: <Activity size={15} />, label: 'Monitoring' },
    { key: 'rekap', icon: <BarChart3 size={15} />, label: 'Rekap' },
    { key: 'settings', icon: <Settings size={15} />, label: 'Jadwal' },
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="hidden md:block">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Jurnal Mengajar' }]} />
      </div>

      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="p-2 md:p-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/80 dark:bg-[#0d0d0d]">
          <div className="flex overflow-x-auto no-scrollbar">
            <div className="inline-flex w-full md:w-auto gap-1 p-0.5 bg-gray-200/70 dark:bg-[#1a1a1a] rounded-xl">
              {tabs.map(tab => (
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
          {activeTab === 'monitoring' && <JurnalMonitoringTab />}
          {activeTab === 'rekap' && <JurnalRecapTab onBack={() => {}} />}
          {activeTab === 'settings' && <JurnalSettingsTab />}
        </div>
      </div>
    </div>
  );
};

// ── Main Entry Point ─────────────────────────────────────────────
export const DashboardJurnal = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const isAdmin = role === 'admin';
  const isLeadership = ['kepala_madrasah', 'wakil_kepala'].includes(role);

  // Admin/Leadership → tabbed view with monitoring, recap, settings
  // Everyone else (guru, wali_kelas, etc.) → mobile-first dashboard
  if (isAdmin || isLeadership) {
    return (
      <>
        {/* Mobile: show guru view for admin too (they can also teach) */}
        <div className="md:hidden">
          <JurnalGuruView isAdmin={isAdmin} />
        </div>
        {/* Desktop: show admin view */}
        <div className="hidden md:block">
          <JurnalAdminView />
        </div>
      </>
    );
  }

  return <JurnalGuruView isAdmin={false} />;
};
