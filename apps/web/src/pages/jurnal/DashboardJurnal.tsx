import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { Activity, ArrowLeft, BarChart3, Settings, Clock, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { JurnalHome } from './JurnalHome';
import { JurnalInputTab } from './tabs/JurnalInputTab';
import { JurnalListTab } from './tabs/JurnalListTab';
import { JurnalRecapTab } from './tabs/JurnalRecapTab';
import { JurnalMonitoringTab } from './tabs/JurnalMonitoringTab';
import { JurnalSettingsTab } from './tabs/JurnalSettingsTab';

type GuruView = 'home' | 'create' | 'history' | 'stats' | 'settings';
type AdminTab = 'monitoring' | 'rekap' | 'settings' | 'pengaturan';

// ── Jurnal Deadline Settings Panel ────────────────────────────────
const JurnalDeadlineSettings = () => {
  const [mode, setMode] = useState('waktu_tertentu');
  const [time, setTime] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load current settings
  useEffect(() => {
    apiClient<any[]>('/settings').then(data => {
      const settings = Array.isArray(data) ? data : [];
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { if (s.key && s.value) map[s.key] = s.value; });
      if (map['jurnal_deadline_mode']) setMode(map['jurnal_deadline_mode']);
      if (map['jurnal_deadline_time']) setTime(map['jurnal_deadline_time']);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient('/settings', {
        method: 'PUT',
        data: {
          settings: [
            { key: 'jurnal_deadline_mode', value: mode, group: 'jurnal' },
            { key: 'jurnal_deadline_time', value: time, group: 'jurnal' },
          ]
        }
      });
      toast.success('Pengaturan batas jurnal berhasil disimpan');
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + (err.message || 'Unknown error'));
    }
    setSaving(false);
  };

  if (!loaded) return <div className="text-xs text-gray-400 py-8 text-center">Memuat pengaturan...</div>;

  return (
    <div className="space-y-6">
      {/* Deadline Mode */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-emerald-500" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Batas Waktu Pengisian Jurnal</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Atur kapan guru diperbolehkan mengisi jurnal mengajar. Jadwal yang belum memasuki waktu pelajaran akan terkunci otomatis.
        </p>

        <div className="space-y-3">
          {/* Option 1 */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            mode === 'sesuai_waktu_belajar'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}>
            <input
              type="radio"
              name="deadlineMode"
              value="sesuai_waktu_belajar"
              checked={mode === 'sesuai_waktu_belajar'}
              onChange={() => setMode('sesuai_waktu_belajar')}
              className="mt-0.5 accent-emerald-600"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Sesuai Waktu Belajar</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Jurnal hanya bisa diisi mulai dari jam pelajaran dimulai hingga akhir jam pelajaran terakhir guru pada hari tersebut.
              </p>
            </div>
          </label>

          {/* Option 2 */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            mode === 'waktu_tertentu'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}>
            <input
              type="radio"
              name="deadlineMode"
              value="waktu_tertentu"
              checked={mode === 'waktu_tertentu'}
              onChange={() => setMode('waktu_tertentu')}
              className="mt-0.5 accent-emerald-600"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Batas Waktu Tertentu</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Jurnal bisa diisi mulai dari jam pelajaran dimulai hingga batas waktu yang ditentukan.
              </p>
              {mode === 'waktu_tertentu' && (
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Batas Waktu:</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#111] text-sm font-mono text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500/30 outline-none"
                  />
                  <span className="text-xs text-gray-400">WITA</span>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <strong>ℹ️ Catatan:</strong> Jadwal yang belum memasuki waktu pelajaran akan otomatis terkunci (tidak bisa diklik oleh guru).
            Jadwal yang sudah melewati batas waktu juga akan terkunci. Jika ada guru yang terlambat mengisi, admin dapat mengisi jurnal melalui menu <strong>Jurnal Baru</strong>.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
    setView('settings');
  };

  return (
    <div className="min-h-[60vh]">
      {view === 'home' && (
        <JurnalHome
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
          onAdminSettings={handleAdminSettings}
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
      {view === 'settings' && (
        <div className="pb-4 -mx-3 md:mx-0">
          <div className="bg-white dark:bg-[#111] px-4 pt-3 pb-3 sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95">
                <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white">Kelola Jadwal</h1>
            </div>
          </div>
          <div className="px-4 py-4">
            <JurnalSettingsTab />
          </div>
        </div>
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
    { key: 'pengaturan', icon: <Clock size={15} />, label: 'Pengaturan' },
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
          {activeTab === 'pengaturan' && <JurnalDeadlineSettings />}
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
