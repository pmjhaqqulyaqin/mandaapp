import { useState } from 'react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { ScannerEngine } from './components/ScannerEngine';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { Camera, QrCode, LogIn, LogOut, CheckCircle2, LayoutDashboard, Grid, Settings } from 'lucide-react';
import { AttendanceDashboardTab } from './tabs/AttendanceDashboardTab';
import { AttendanceRecapTab } from './tabs/AttendanceRecapTab';
import { AttendanceManualInputTab } from './tabs/AttendanceManualInputTab';
import { AttendanceSettingsTab } from './tabs/AttendanceSettingsTab';

export const DashboardAttendance = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'manual' | 'rekap' | 'settings'>('dashboard');
  const [scanMode, setScanMode] = useState<'masuk' | 'pulang'>('masuk');
  const [isLoading, setIsLoading] = useState(false);

  const processScan = async (nis: string, method: string) => {
    if (!nis || nis.length < 3 || isLoading) return;
    setIsLoading(true);
    try {
      const result = await apiClient<any>('/attendance/scan', {
        method: 'POST',
        data: { nis, jenis: scanMode, method }
      });
      if (result.success) {
        toast.custom((t) => (
          <div className="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 flex items-start gap-3 w-80">
            <CheckCircle2 className="text-green-500 mt-0.5" size={24} />
            <div>
              <h4 className="font-bold text-gray-800">{result.nama}</h4>
              <p className="text-sm text-gray-600">{result.nis} | {result.kelas}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                {result.status} • {result.jam}
              </div>
            </div>
          </div>
        ), { duration: 3000 });
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Presensi Siswa' }
      ]} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent mt-1">
            Presensi Siswa
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manajemen absensi kelas dan rekapitulasi harian
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden shadow-sm">
        {/* Segmented Control - iOS/Android Style */}
        <div className="p-2.5 md:p-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/80 dark:bg-[#0d0d0d]">
          <div className="flex overflow-x-auto no-scrollbar">
            <div className="inline-flex gap-1 p-0.5 bg-gray-200/70 dark:bg-[#1a1a1a] rounded-lg mx-auto">
              {([
                { key: 'dashboard', icon: <LayoutDashboard size={13} />, label: 'Dashboard' },
                { key: 'scanner', icon: <Camera size={13} />, label: 'Scanner' },
                { key: 'manual', icon: <QrCode size={13} />, label: 'Manual' },
                { key: 'rekap', icon: <Grid size={13} />, label: 'Rekap' },
                { key: 'settings', icon: <Settings size={13} />, label: 'Setting' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap rounded-md transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-white dark:bg-[#2a2a2a] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 md:p-4 bg-white dark:bg-[#111] min-h-[300px]">
          {activeTab === 'dashboard' && <AttendanceDashboardTab />}
          {activeTab === 'scanner' && (
            <div className="max-w-xl mx-auto bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                <button
                  onClick={() => setScanMode('masuk')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold transition-all text-sm ${
                    scanMode === 'masuk' 
                      ? 'bg-green-500 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <LogIn size={16} /> MASUK
                </button>
                <button
                  onClick={() => setScanMode('pulang')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold transition-all text-sm ${
                    scanMode === 'pulang' 
                      ? 'bg-blue-500 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <LogOut size={16} /> PULANG
                </button>
              </div>

              <ScannerEngine 
                isActive={activeTab === 'scanner'}
                onScan={(code) => processScan(code, 'qr_scan')}
              />
            </div>
          )}

          {activeTab === 'manual' && <AttendanceManualInputTab />}

          {activeTab === 'rekap' && <AttendanceRecapTab />}

          {activeTab === 'settings' && <AttendanceSettingsTab />}
        </div>
      </div>
    </div>
  );
};
