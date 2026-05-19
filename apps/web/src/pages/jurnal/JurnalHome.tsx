import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useScheduleToday, useJurnalEntries } from '../../hooks/api/useJurnal';
import { apiClient } from '../../lib/api';
import { Clock, CheckCircle2, AlertCircle, PenLine, History, BarChart3, Settings, Plus, BookOpen, Lock, Zap } from 'lucide-react';

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

const QUOTES = [
  '"Pendidikan adalah senjata paling ampuh untuk mengubah dunia." — Nelson Mandela',
  '"Guru yang biasa-biasa saja memberitahu. Guru yang baik menjelaskan. Guru yang hebat menginspirasi." — William Arthur Ward',
  '"Belajar tidak dicapai secara kebetulan, harus dicari dengan semangat." — Abigail Adams',
  '"Mengajar adalah seni tertinggi, karena mediator adalah pikiran dan jiwa manusia." — John Adams',
  '"Siapa pun yang berhenti belajar adalah orang tua. Siapa pun yang terus belajar tetap muda." — Henry Ford',
];

type ScheduleStatus = 'belum_waktunya' | 'sedang_berlangsung' | 'bisa_diisi' | 'lewat_batas' | 'tersimpan';

interface Props {
  onNavigate: (view: 'create' | 'history' | 'stats', scheduleItem?: any) => void;
  isAdmin?: boolean;
  onAdminSettings?: () => void;
}

// Compute week date range once (for filtering entries to current week only)
function getWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toLocaleDateString('sv-SE'),
    to: sunday.toLocaleDateString('sv-SE'),
  };
}

/** Parse "HH:mm" time string to minutes since midnight */
function timeToMinutes(time: string): number {
  if (!time) return -1;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Get current time as minutes since midnight */
function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Determine the status of a schedule item based on current time */
function getScheduleStatus(
  item: any,
  currentMinutes: number,
  deadlineMode: string,
  deadlineTime: string,
  allItems: any[]
): ScheduleStatus {
  if (item.alreadyFilled) return 'tersimpan';

  const start = timeToMinutes(item.waktuMulai);
  const end = timeToMinutes(item.waktuSelesai);

  // If no time data, always allow (fallback for legacy data)
  if (start < 0 || end < 0) return 'bisa_diisi';

  // Before class starts
  if (currentMinutes < start) return 'belum_waktunya';

  // During class
  if (currentMinutes >= start && currentMinutes <= end) return 'sedang_berlangsung';

  // After class — check deadline
  let deadlineMinutes: number;
  if (deadlineMode === 'sesuai_waktu_belajar') {
    // Deadline = end of last class of the day
    const lastEnd = Math.max(...allItems.map(i => timeToMinutes(i.waktuSelesai)).filter(t => t >= 0));
    deadlineMinutes = lastEnd >= 0 ? lastEnd : end;
  } else {
    // Mode: waktu_tertentu
    deadlineMinutes = timeToMinutes(deadlineTime);
  }

  if (currentMinutes <= deadlineMinutes) return 'bisa_diisi';
  return 'lewat_batas';
}

const STATUS_CONFIG: Record<ScheduleStatus, {
  borderColor: string;
  badge: string;
  badgeClass: string;
  textClass: string;
  disabled: boolean;
  icon?: any;
}> = {
  belum_waktunya: {
    borderColor: 'border-l-gray-300',
    badge: 'Belum Waktunya',
    badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    textClass: 'text-gray-400 dark:text-gray-500',
    disabled: true,
    icon: Lock,
  },
  sedang_berlangsung: {
    borderColor: 'border-l-emerald-500',
    badge: 'Sedang Berlangsung',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 animate-pulse',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    disabled: false,
    icon: Zap,
  },
  bisa_diisi: {
    borderColor: 'border-l-amber-400',
    badge: 'Belum Dijurnal',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    textClass: 'text-amber-600 dark:text-amber-400',
    disabled: false,
  },
  lewat_batas: {
    borderColor: 'border-l-red-400',
    badge: 'Lewat Batas',
    badgeClass: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    textClass: 'text-red-500 dark:text-red-400',
    disabled: true,
    icon: Lock,
  },
  tersimpan: {
    borderColor: 'border-l-emerald-400',
    badge: 'Tersimpan',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    disabled: true,
  },
};

export const JurnalHome = ({ onNavigate, isAdmin, onAdminSettings }: Props) => {
  const { user } = useAuth();
  const today = new Date();
  const todayStr = today.toLocaleDateString('sv-SE');
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [currentTime, setCurrentTime] = useState(() => nowMinutes());

  // Auto-refresh time every 30 seconds to update status indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(nowMinutes()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Resolve employee via react-query (cached, instant on revisit)
  const empQuery = useQuery({
    queryKey: ['employee-me', user?.id],
    queryFn: () => apiClient<any>('/employees/me'),
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 min cache
  });
  const employeeId = empQuery.data?.id || '';
  const employeeName = empQuery.data?.name || user?.name || '';

  const schedule = useScheduleToday(employeeId);

  // Only fetch entries for current week, not ALL entries
  const weekRange = useMemo(() => getWeekRange(), [todayStr]);
  const entriesQuery = useJurnalEntries(
    employeeId ? { teacherId: employeeId, dateFrom: weekRange.from, dateTo: weekRange.to } : undefined
  );

  // Parse new response format (backward compatible)
  const scheduleData = schedule.data as any;
  const todaySchedule = Array.isArray(scheduleData) ? scheduleData : (scheduleData?.schedule || []);
  const deadlineMode = scheduleData?.deadlineMode || 'waktu_tertentu';
  const deadlineTime = scheduleData?.deadlineTime || '17:00';

  // Compute stats
  const todayEntries = (entriesQuery.data || []).filter((e: any) => e.date === todayStr);
  const filledCount = todaySchedule.filter((s: any) => s.alreadyFilled).length;
  const pendingCount = todaySchedule.length - filledCount;

  // Week calendar
  const weekDays = useMemo(() => {
    const d = new Date(today);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + i);
      const dateStr = dd.toLocaleDateString('sv-SE');
      const isToday = dateStr === todayStr;
      const hasFilled = (entriesQuery.data || []).some((e: any) => e.date === dateStr);
      const isWeekend = dd.getDay() === 0 || dd.getDay() === 6;
      return { date: dd.getDate(), dayLabel: DAYS_SHORT[dd.getDay()], isToday, hasFilled, isWeekend, dateStr };
    });
  }, [todayStr, entriesQuery.data]);

  const initials = (employeeName || user?.name || '?').split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();

  return (
    <div className="pb-4 -mx-3 md:mx-0">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-700 dark:to-teal-600 text-white px-5 pt-5 pb-5 md:rounded-t-xl">
        <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-start gap-2">
          <span className="text-white/60 text-sm mt-0.5">❝</span>
          <p className="text-sm text-white/90 italic leading-relaxed">{quote}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Clock size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{todaySchedule.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Jam Mengajar</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{filledCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Jurnal Tersimpan</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mx-auto mb-1">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{pendingCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Belum Dijurnal</p>
          </div>
        </div>
      </div>

      {/* Mini Calendar */}
      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
              {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex justify-between text-center">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-xs ${d.isWeekend ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>{d.dayLabel}</span>
                <span className={`text-sm w-8 h-8 flex items-center justify-center rounded-full font-medium transition-all ${
                  d.isToday ? 'bg-emerald-600 text-white shadow-sm' :
                  d.hasFilled ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                  d.isWeekend ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'
                }`}>{d.date}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Tersimpan</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> Hari Ini</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" /> Libur</span>
          </div>
        </div>
      </div>

      {/* Jadwal Hari Ini */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-white">Jadwal Hari Ini</h3>
          {deadlineMode === 'waktu_tertentu' && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              Batas: {deadlineTime} WITA
            </span>
          )}
          {deadlineMode === 'sesuai_waktu_belajar' && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              Batas: Akhir Jadwal
            </span>
          )}
        </div>
        {schedule.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-xl h-20 animate-pulse border border-gray-100 dark:border-gray-800" />)}
          </div>
        )}
        {!schedule.isLoading && todaySchedule.length === 0 && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 text-center border border-gray-100 dark:border-gray-800">
            <BookOpen size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada jadwal mengajar hari ini</p>
          </div>
        )}
        <div className="space-y-3">
          {todaySchedule.map((item: any) => {
            const status = getScheduleStatus(item, currentTime, deadlineMode, deadlineTime, todaySchedule);
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const canClick = !config.disabled;

            return (
              <button key={item.id} onClick={() => canClick && onNavigate('create', item)}
                disabled={config.disabled}
                className={`w-full text-left bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border-l-4 transition-all border border-gray-100 dark:border-gray-800 ${config.borderColor} ${
                  canClick ? 'hover:shadow-md cursor-pointer active:scale-[0.98]' : 'opacity-70 cursor-not-allowed'
                }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-xs font-medium ${config.textClass}`}>
                      {item.waktuMulai || '--:--'} - {item.waktuSelesai || '--:--'} • Jam ke {item.jamKe || '-'}
                    </p>
                    <h4 className={`font-semibold text-sm mt-0.5 ${config.disabled && status !== 'tersimpan' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                      {item.subjectName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.className}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 flex items-center gap-1 ${config.badgeClass}`}>
                    {StatusIcon && <StatusIcon size={10} />}
                    {config.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-4 mt-4">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-3">Akses Cepat</h3>
        <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
          <button onClick={() => onNavigate('create')}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center"><PenLine size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Jurnal Baru</span>
          </button>
          <button onClick={() => onNavigate('history')}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center"><History size={18} className="text-purple-500 dark:text-purple-400" /></div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Riwayat</span>
          </button>
          <button onClick={() => onNavigate('stats')}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center"><BarChart3 size={18} className="text-amber-500 dark:text-amber-400" /></div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Laporan</span>
          </button>
          {isAdmin && (
            <button onClick={onAdminSettings}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center"><Settings size={18} className="text-gray-500 dark:text-gray-400" /></div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => onNavigate('create')}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-300/50 dark:shadow-emerald-900/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40">
        <Plus size={24} />
      </button>
    </div>
  );
};
