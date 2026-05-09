import { useState, useEffect, useRef } from 'react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { ScannerEngine } from './components/ScannerEngine';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, Search, Clock, UserCheck, AlertTriangle, Users, Grid, Settings, NotebookPen } from 'lucide-react';
import { AttendanceRecapTab } from './tabs/AttendanceRecapTab';
import { AttendanceManualInputTab } from './tabs/AttendanceManualInputTab';
import { AttendanceSettingsTab } from './tabs/AttendanceSettingsTab';

// ── Running Clock Hook ──
const useRunningClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

// ── Date formatter ──
const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatDate = (d: Date) => `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
const formatTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

// ── Unified Scan Page Component ──
const UnifiedScanPage = ({ processScan, isLoading: scanLoading }: { processScan: (code: string, method: string) => Promise<void>; isLoading: boolean }) => {
  const now = useRunningClock();
  const [nisInput, setNisInput] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [logHariIni, setLogHariIni] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const nisInputRef = useRef<HTMLInputElement>(null);

  const fetchDashboard = async () => {
    try {
      const [statsRes, logRes] = await Promise.all([
        apiClient<any>('/attendance/today/stats'),
        apiClient<any[]>('/attendance/today/log?limit=15'),
      ]);
      setStats(statsRes);
      setLogHariIni(logRes);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Refresh data after each successful scan
  const handleScan = async (code: string, method: string) => {
    await processScan(code, method);
    // Refresh stats + log after scan
    setTimeout(fetchDashboard, 500);
  };

  const handleNisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nis = nisInput.trim();
    if (!nis) return;
    handleScan(nis, 'manual_nis');
    setNisInput('');
    nisInputRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {/* ── Header: Title + Date + Running Clock ── */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark p-4 text-center">
        <h2 className="text-base font-bold text-primary tracking-wide uppercase">Presensi Siswa</h2>
        <p className="text-xs text-text-secondary mt-0.5">{formatDate(now)}</p>
        <p className="text-2xl font-mono font-bold text-text-primary dark:text-text-darkPrimary mt-1 tabular-nums tracking-widest">
          {formatTime(now)}
        </p>
      </div>

      {/* ── Scanner Area ── */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        <div className="p-3">
          <div className="text-center mb-2">
            <p className="text-[11px] text-text-secondary">
              Scan 1× = <span className="font-bold text-emerald-600">Masuk</span> • Scan 2× setelah jam pulang = <span className="font-bold text-blue-600">Pulang</span>
            </p>
          </div>
          <ScannerEngine
            isActive={true}
            onScan={(code) => handleScan(code, 'qr_scan')}
            compact
          />
        </div>
      </div>

      {/* ── NIS Manual Input ── */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark p-3">
        <p className="text-[11px] font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
          <NotebookPen size={13} /> Input NIS Manual
        </p>
        <form onSubmit={handleNisSubmit} className="flex gap-2">
          <input
            ref={nisInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={nisInput}
            onChange={(e) => setNisInput(e.target.value)}
            placeholder="Ketik NIS lalu Enter"
            className="flex-1 px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-gray-50 dark:bg-[#1a1a1a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            style={{ fontSize: '16px' }} // prevent iOS zoom
          />
          <button
            type="submit"
            disabled={!nisInput.trim() || scanLoading}
            className="px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm disabled:opacity-40 active:scale-95 transition-all shadow-sm"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* ── Compact Stats ── */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark p-2.5 text-center">
          <div className="text-lg font-bold text-emerald-600">{dataLoading ? '–' : (stats?.Hadir || 0)}</div>
          <div className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Hadir</div>
        </div>
        <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark p-2.5 text-center">
          <div className="text-lg font-bold text-amber-500">{dataLoading ? '–' : (stats?.Terlambat || 0)}</div>
          <div className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Terlambat</div>
        </div>
        <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark p-2.5 text-center">
          <div className="text-lg font-bold text-red-500">{dataLoading ? '–' : (stats?.belum_absen || 0)}</div>
          <div className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Belum</div>
        </div>
        <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark p-2.5 text-center">
          <div className="text-lg font-bold text-primary">{dataLoading ? '–' : (stats?.total_siswa || 0)}</div>
          <div className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Total</div>
        </div>
      </div>

      {/* ── Log Hari Ini ── */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-1.5">
            <Clock size={13} className="text-primary" />
            Log Hari Ini
          </h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {logHariIni.length}
          </span>
        </div>
        <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
          {logHariIni.length === 0 ? (
            <div className="p-6 text-center text-text-secondary">
              <Clock size={20} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Belum ada scan hari ini</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {logHariIni.map((log) => (
                <div key={log.id} className="flex items-center px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                    {log.nama?.charAt(0) || '?'}
                  </div>
                  <div className="ml-2 flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-text-primary dark:text-text-darkPrimary truncate">{log.nama}</p>
                    <p className="text-[9px] text-text-secondary truncate">{log.kelas}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      log.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      log.status === 'Terlambat' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {log.status}
                    </span>
                    <div className="text-[9px] font-semibold text-text-secondary mt-0.5">
                      {log.checkOut ? log.checkOut.slice(0,5) : (log.checkIn ? log.checkIn.slice(0,5) : '')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──
export const DashboardAttendance = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'wakil_kepala', 'kepala_madrasah'].includes(user?.role || '');
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'rekap' | 'settings'>('scan');
  const [isLoading, setIsLoading] = useState(false);

  // Smart NIS extractor: handles NIS-only QR (new), verbose QR (old cards), and barcode
  const extractNIS = (raw: string): string => {
    const trimmed = raw.trim();
    if (/^\d{4,20}$/.test(trimmed)) return trimmed;
    const parenMatch = trimmed.match(/\((\d{4,20})\)/);
    if (parenMatch) return parenMatch[1];
    const nisnMatch = trimmed.match(/NISN?:\s*(\d{4,20})/i);
    if (nisnMatch) return nisnMatch[1];
    return trimmed;
  };

  const processScan = async (rawCode: string, method: string) => {
    const nis = extractNIS(rawCode);
    if (!nis || nis.length < 3 || isLoading) return;
    setIsLoading(true);
    try {
      const result = await apiClient<any>('/attendance/scan', {
        method: 'POST',
        data: { nis, method }
      });
      if (result.success) {
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(100);

        const isAlpa = result.status?.includes('Alpa');
        toast.custom((t) => (
          <div className={`bg-white dark:bg-[#1a1a1a] border-l-4 ${isAlpa ? 'border-orange-500' : 'border-green-500'} rounded-lg shadow-lg p-4 flex items-start gap-3 w-80`}>
            <CheckCircle2 className={`${isAlpa ? 'text-orange-500' : 'text-green-500'} mt-0.5`} size={24} />
            <div>
              <h4 className="font-bold text-text-primary dark:text-text-darkPrimary">{result.nama}</h4>
              <p className="text-sm text-text-secondary">{result.nis} | {result.kelas}</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded ${isAlpa ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'} text-xs font-bold uppercase tracking-wider`}>
                {result.status} • {result.jam}
              </div>
              {result.note && <p className="text-[10px] text-text-secondary mt-1">{result.note}</p>}
            </div>
          </div>
        ), { duration: isAlpa ? 5000 : 3000 });
      } else {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]); // error pattern
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Non-admin: render unified page directly (no tabs)
  if (!isAdmin) {
    return (
      <div>
        <Breadcrumbs items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Presensi Siswa' }
        ]} />
        <div className="mt-3">
          <UnifiedScanPage processScan={processScan} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  // Admin: segmented tabs
  const adminTabs = [
    { key: 'scan' as const, icon: <UserCheck size={14} />, label: 'Scan' },
    { key: 'manual' as const, icon: <NotebookPen size={14} />, label: 'Manual' },
    { key: 'rekap' as const, icon: <Grid size={14} />, label: 'Rekap' },
    { key: 'settings' as const, icon: <Settings size={14} />, label: 'Setting' },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Presensi Siswa' }
      ]} />

      {/* Admin Segmented Control */}
      <div className="bg-white dark:bg-[#111] border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="p-2 border-b border-border-light dark:border-border-dark bg-gray-50/80 dark:bg-[#0d0d0d]">
          <div className="inline-flex w-full gap-1 p-0.5 bg-gray-200/70 dark:bg-[#1a1a1a] rounded-xl">
            {adminTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center justify-center gap-1.5 flex-1 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap rounded-lg transition-all duration-200 active:scale-95 ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-[#2a2a2a] text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-text-secondary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 min-h-[300px]">
          {activeTab === 'scan' && <UnifiedScanPage processScan={processScan} isLoading={isLoading} />}
          {activeTab === 'manual' && <AttendanceManualInputTab />}
          {activeTab === 'rekap' && <AttendanceRecapTab />}
          {activeTab === 'settings' && <AttendanceSettingsTab />}
        </div>
      </div>
    </div>
  );
};
