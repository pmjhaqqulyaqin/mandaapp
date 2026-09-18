import { useState, useEffect, useRef } from 'react';
import { Breadcrumbs } from '@mandaapp/ui/src/components/Breadcrumbs';
import { ScannerEngine } from './components/ScannerEngine';
import { apiClient } from '../../lib/api';
import { smartSend, offlineCache } from '../../lib/syncEngine';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, Search, Clock, UserCheck, Grid, Settings, NotebookPen, WifiOff } from 'lucide-react';
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
  const [filterStatus, setFilterStatus] = useState<'Hadir' | 'Terlambat' | 'Belum'>('Hadir');
  const [belumList, setBelumList] = useState<any[]>([]);
  const [belumLoading, setBelumLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const [statsRes, logRes] = await Promise.all([
        apiClient<any>('/attendance/today/stats'),
        apiClient<any[]>('/attendance/today/log?limit=500'),
      ]);
      setStats(statsRes);
      setLogHariIni(logRes);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch belum absen list when filter is 'Belum'
  const fetchBelumList = async () => {
    setBelumLoading(true);
    try {
      // Get all active students and filter out those who already scanned
      const allStudents = await apiClient<any[]>('/students?status=active&limit=1000');
      const scannedNis = new Set(logHariIni.map(l => l.nis));
      const belum = allStudents.filter(s => !scannedNis.has(s.nis));
      setBelumList(belum);
    } catch (err) {
      console.error('Failed to fetch belum list:', err);
    } finally {
      setBelumLoading(false);
    }
  };

  useEffect(() => {
    if (filterStatus === 'Belum' && belumList.length === 0 && !belumLoading) {
      fetchBelumList();
    }
  }, [filterStatus]);

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

  // Filter log based on selected stat
  const filteredLog = filterStatus === 'Belum'
    ? [] // handled separately
    : logHariIni.filter(log => log.status === filterStatus);

  const statBoxes: { key: 'Hadir' | 'Terlambat' | 'Belum'; value: number | string; color: string; ringColor: string }[] = [
    { key: 'Hadir', value: dataLoading ? '–' : (stats?.Hadir || 0), color: 'text-emerald-600', ringColor: 'ring-emerald-400' },
    { key: 'Terlambat', value: dataLoading ? '–' : (stats?.Terlambat || 0), color: 'text-amber-500', ringColor: 'ring-amber-400' },
    { key: 'Belum', value: dataLoading ? '–' : (stats?.belum_absen || 0), color: 'text-red-500', ringColor: 'ring-red-400' },
  ];

  return (
    <div className="space-y-2">
      {/* ── Header: Title + Date + Running Clock ── */}
      <div className="bg-white dark:bg-[#111] rounded-lg border border-border-light dark:border-border-dark px-3 py-2 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-bold text-primary uppercase leading-tight">Presensi Siswa</h2>
          <p className="text-[10px] text-text-secondary leading-tight">{formatDate(now)}</p>
        </div>
        <p className="text-lg font-mono font-bold text-text-primary dark:text-text-darkPrimary tabular-nums tracking-wider">
          {formatTime(now)}
        </p>
      </div>

      {/* ── Scanner Area ── */}
      <div className="bg-white dark:bg-[#111] rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
        <div className="p-2">
          <p className="text-[10px] text-text-secondary text-center mb-1.5">
            Scan 1× = <span className="font-bold text-emerald-600">Masuk</span> • Scan 2× setelah jam pulang = <span className="font-bold text-blue-600">Pulang</span>
          </p>
          <ScannerEngine
            isActive={true}
            onScan={(code) => handleScan(code, 'qr_scan')}
            compact
          />
        </div>
      </div>

      {/* ── NIS Manual Input ── */}
      <div className="bg-white dark:bg-[#111] rounded-lg border border-border-light dark:border-border-dark px-2.5 py-2">
        <form onSubmit={handleNisSubmit} className="flex gap-1.5 items-center">
          <NotebookPen size={12} className="text-text-secondary shrink-0" />
          <input
            ref={nisInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={nisInput}
            onChange={(e) => setNisInput(e.target.value)}
            placeholder="Ketik NIS lalu Enter"
            className="flex-1 px-2.5 py-1.5 rounded-md border border-border-light dark:border-border-dark bg-gray-50 dark:bg-[#1a1a1a] text-xs text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            style={{ fontSize: '16px' }} // prevent iOS zoom
          />
          <button
            type="submit"
            disabled={!nisInput.trim() || scanLoading}
            className="px-3 py-1.5 bg-primary text-white rounded-md font-semibold text-xs disabled:opacity-40 active:scale-95 transition-all shadow-sm"
          >
            <Search size={14} />
          </button>
        </form>
      </div>

      {/* ── Compact Stats — Tappable ── */}
      <div className="grid grid-cols-4 gap-2">
        {statBoxes.map(box => (
          <button
            key={box.key}
            onClick={() => setFilterStatus(box.key)}
            className={`bg-white dark:bg-[#111] rounded-xl border p-2.5 text-center transition-all active:scale-95 cursor-pointer ${
              filterStatus === box.key
                ? `ring-2 ${box.ringColor} border-transparent shadow-sm`
                : 'border-border-light dark:border-border-dark'
            }`}
          >
            <div className={`text-lg font-bold ${box.color}`}>{box.value}</div>
            <div className={`text-[9px] font-semibold uppercase tracking-wider ${
              filterStatus === box.key ? box.color : 'text-text-secondary'
            }`}>{box.key}</div>
          </button>
        ))}
        <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark p-2.5 text-center">
          <div className="text-lg font-bold text-primary">{dataLoading ? '–' : (stats?.total_siswa || 0)}</div>
          <div className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Total</div>
        </div>
      </div>

      {/* ── Filtered Student List ── */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-1.5">
            {filterStatus === 'Hadir' && <><UserCheck size={13} className="text-emerald-600" /> Siswa Hadir</>}
            {filterStatus === 'Terlambat' && <><Clock size={13} className="text-amber-500" /> Siswa Terlambat</>}
            {filterStatus === 'Belum' && <><Clock size={13} className="text-red-500" /> Belum Absen</>}
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            filterStatus === 'Hadir' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20' :
            filterStatus === 'Terlambat' ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/20' :
            'text-red-600 bg-red-100 dark:bg-red-900/20'
          }`}>
            {filterStatus === 'Belum' ? belumList.length : filteredLog.length}
          </span>
        </div>
        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
          {filterStatus === 'Belum' ? (
            belumLoading ? (
              <div className="p-6 text-center text-text-secondary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto mb-2"></div>
                <p className="text-xs">Memuat data...</p>
              </div>
            ) : belumList.length === 0 ? (
              <div className="p-6 text-center text-text-secondary">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-xs">Semua siswa sudah absen! 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-border-light dark:divide-border-dark">
                {belumList.map((stu) => (
                  <div key={stu.id} className="flex items-center px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {stu.fullName?.charAt(0) || stu.name?.charAt(0) || '?'}
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-text-primary dark:text-text-darkPrimary truncate">{stu.fullName || stu.name}</p>
                      <p className="text-[9px] text-text-secondary truncate">{stu.className || stu.nis || '-'}</p>
                    </div>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      Belum
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : filteredLog.length === 0 ? (
            <div className="p-6 text-center text-text-secondary">
              <Clock size={20} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Belum ada siswa {filterStatus.toLowerCase()}</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {filteredLog.map((log) => (
                <div key={log.id} className="flex items-center px-3 py-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    filterStatus === 'Hadir' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600'
                  }`}>
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
                      {log.checkOut ? log.checkOut.slice(0,5) : (log.checkIn ? log.checkIn.slice(0,5) : (log.createdAt ? new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''))}
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

  // Cache student list for offline NIS lookup (runs once on mount)
  useEffect(() => {
    if (!navigator.onLine) return;
    apiClient<any[]>('/students').then(students => {
      if (students?.length) {
        const mapped = students.map((s: any) => ({
          id: s.id, nis: s.nis, fullName: s.fullName,
          className: s.class?.name || s.className || '',
        }));
        offlineCache.cacheStudents(mapped).catch(() => {});
      }
    }).catch(() => {});
  }, []);

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
      const result = await smartSend('attendance_scan', {
        nis, jenis: 'masuk', method, timestamp: Date.now()
      }, `Presensi ${nis} via ${method}`);

      if (result.fromCache) {
        // Offline or server failed — show optimistic response
        if (navigator.vibrate) navigator.vibrate([50, 100]);
        // Try to look up student name from cache
        try {
          const cached = await offlineCache.lookupStudent(nis);
          toast.custom(() => (
            <div className="bg-white dark:bg-[#1a1a1a] border-l-4 border-orange-400 rounded-lg shadow-lg p-4 flex items-start gap-3 w-80">
              <WifiOff className="text-orange-500 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-text-primary dark:text-text-darkPrimary">
                  {cached?.fullName || `NIS: ${nis}`}
                </h4>
                {cached?.className && <p className="text-sm text-text-secondary">{nis} | {cached.className}</p>}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
                  📱 Tersimpan Offline
                </div>
                <p className="text-[10px] text-text-secondary mt-1">Akan disinkronkan otomatis saat online</p>
              </div>
            </div>
          ), { duration: 3000 });
        } catch {
          // Fallback toast if lookupStudent fails
          toast.custom(() => (
            <div className="bg-white dark:bg-[#1a1a1a] border-l-4 border-orange-400 rounded-lg shadow-lg p-4 flex items-start gap-3 w-80">
              <WifiOff className="text-orange-500 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-text-primary dark:text-text-darkPrimary">NIS: {nis}</h4>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
                  📱 Tersimpan Offline
                </div>
                <p className="text-[10px] text-text-secondary mt-1">Akan disinkronkan otomatis saat online</p>
              </div>
            </div>
          ), { duration: 3000 });
        }
      } else if (result.result) {
        const data = result.result;
        if (data.success) {
          if (navigator.vibrate) navigator.vibrate(100);
          const isAlpa = data.status?.includes('Alpa');
          toast.custom(() => (
            <div className={`bg-white dark:bg-[#1a1a1a] border-l-4 ${isAlpa ? 'border-orange-500' : 'border-green-500'} rounded-lg shadow-lg p-4 flex items-start gap-3 w-80`}>
              <CheckCircle2 className={`${isAlpa ? 'text-orange-500' : 'text-green-500'} mt-0.5`} size={24} />
              <div>
                <h4 className="font-bold text-text-primary dark:text-text-darkPrimary">{data.nama}</h4>
                <p className="text-sm text-text-secondary">{data.nis} | {data.kelas}</p>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded ${isAlpa ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'} text-xs font-bold uppercase tracking-wider`}>
                  {data.status} • {data.jam}
                </div>
                {data.note && <p className="text-[10px] text-text-secondary mt-1">{data.note}</p>}
              </div>
            </div>
          ), { duration: isAlpa ? 5000 : 3000 });
        } else {
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
          toast.error(data.message);
        }
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Build tabs based on role: all users get Scan + Rekap, admin adds Manual + Setting
  const tabs = [
    { key: 'scan' as const, icon: <UserCheck size={14} />, label: 'Scan' },
    ...(isAdmin ? [{ key: 'manual' as const, icon: <NotebookPen size={14} />, label: 'Manual' }] : []),
    { key: 'rekap' as const, icon: <Grid size={14} />, label: 'Rekap' },
    ...(isAdmin ? [{ key: 'settings' as const, icon: <Settings size={14} />, label: 'Setting' }] : []),
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Presensi Siswa' }
      ]} />

      {/* Segmented Control */}
      <div className="bg-white dark:bg-[#111] border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="p-2 border-b border-border-light dark:border-border-dark bg-gray-50/80 dark:bg-[#0d0d0d]">
          <div className="inline-flex w-full gap-1 p-0.5 bg-gray-200/70 dark:bg-[#1a1a1a] rounded-xl">
            {tabs.map((tab) => (
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
          {activeTab === 'manual' && isAdmin && <AttendanceManualInputTab />}
          {activeTab === 'rekap' && <AttendanceRecapTab />}
          {activeTab === 'settings' && isAdmin && <AttendanceSettingsTab />}
        </div>
      </div>
    </div>
  );
};
