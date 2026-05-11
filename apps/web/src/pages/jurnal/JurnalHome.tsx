import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useScheduleToday, useJurnalEntries } from '../../hooks/api/useJurnal';
import { apiClient } from '../../lib/api';
import { Clock, CheckCircle2, AlertCircle, PenLine, History, BarChart3, Settings, Plus, BookOpen } from 'lucide-react';

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

interface Props {
  onNavigate: (view: 'create' | 'history' | 'stats', scheduleItem?: any) => void;
  isAdmin?: boolean;
  onAdminSettings?: () => void;
}

export const JurnalHome = ({ onNavigate, isAdmin, onAdminSettings }: Props) => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const today = new Date();
  const todayStr = today.toLocaleDateString('sv-SE');
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  // Resolve employee
  useEffect(() => {
    if (!user?.id) return;
    apiClient<any>('/employees/me').then(emp => {
      if (emp) { setEmployeeId(emp.id); setEmployeeName(emp.name || user.name || ''); }
    }).catch(() => setEmployeeName(user?.name || ''));
  }, [user?.id]);

  const schedule = useScheduleToday(employeeId);
  const entriesQuery = useJurnalEntries(employeeId ? { teacherId: employeeId } : undefined);

  // Compute stats
  const todaySchedule = schedule.data || [];
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
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-700 dark:to-teal-600 text-white px-5 pt-6 pb-6 md:rounded-t-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-emerald-100 text-sm">{getGreeting()},</p>
            <h1 className="text-xl font-bold">{employeeName || user?.name || 'Guru'}</h1>
            <p className="text-emerald-100 text-xs mt-0.5">{user?.role === 'guru' ? 'Guru' : user?.role === 'wali_kelas' ? 'Wali Kelas' : 'Pengajar'}</p>
          </div>
          <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm shadow-lg shrink-0">
            {initials}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-start gap-2">
          <span className="text-white/60 text-xs mt-0.5">❝</span>
          <p className="text-xs text-white/90 italic leading-relaxed">{quote}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mx-auto mb-1">
              <Clock size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{todaySchedule.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Jam Mengajar</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{filledCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Jurnal Tersimpan</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mx-auto mb-1">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{pendingCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Belum Dijurnal</p>
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
                <span className={`text-[10px] ${d.isWeekend ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>{d.dayLabel}</span>
                <span className={`text-xs w-7 h-7 flex items-center justify-center rounded-full font-medium transition-all ${
                  d.isToday ? 'bg-emerald-600 text-white shadow-sm' :
                  d.hasFilled ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                  d.isWeekend ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'
                }`}>{d.date}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Tersimpan</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Hari Ini</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" /> Libur</span>
          </div>
        </div>
      </div>

      {/* Jadwal Hari Ini */}
      <div className="px-4 mt-4">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-3">Jadwal Hari Ini</h3>
        {schedule.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-xl h-20 animate-pulse border border-gray-100 dark:border-gray-800" />)}
          </div>
        )}
        {!schedule.isLoading && todaySchedule.length === 0 && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 text-center border border-gray-100 dark:border-gray-800">
            <BookOpen size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">Tidak ada jadwal mengajar hari ini</p>
          </div>
        )}
        <div className="space-y-3">
          {todaySchedule.map((item: any) => (
            <button key={item.id} onClick={() => !item.alreadyFilled && onNavigate('create', item)}
              disabled={item.alreadyFilled}
              className={`w-full text-left bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border-l-4 transition-all active:scale-[0.98] border border-gray-100 dark:border-gray-800 ${
                item.alreadyFilled ? 'border-l-emerald-400 opacity-80' : 'border-l-amber-400 hover:shadow-md cursor-pointer'
              }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-xs font-medium ${item.alreadyFilled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {item.waktuMulai || '--:--'} - {item.waktuSelesai || '--:--'} • Jam ke {item.jamKe || '-'}
                  </p>
                  <h4 className="font-semibold text-gray-800 dark:text-white mt-0.5">{item.subjectName}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.className}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-medium rounded-full shrink-0 ${
                  item.alreadyFilled
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                }`}>{item.alreadyFilled ? 'Tersimpan' : 'Belum Dijurnal'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-4 mt-4">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-3">Akses Cepat</h3>
        <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
          <button onClick={() => onNavigate('create')}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center"><PenLine size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Jurnal Baru</span>
          </button>
          <button onClick={() => onNavigate('history')}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center"><History size={18} className="text-purple-500 dark:text-purple-400" /></div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Riwayat</span>
          </button>
          <button onClick={() => onNavigate('stats')}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center"><BarChart3 size={18} className="text-amber-500 dark:text-amber-400" /></div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Laporan</span>
          </button>
          {isAdmin && (
            <button onClick={onAdminSettings}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition border border-gray-100 dark:border-gray-800 active:scale-95">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center"><Settings size={18} className="text-gray-500 dark:text-gray-400" /></div>
              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Jadwal</span>
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
