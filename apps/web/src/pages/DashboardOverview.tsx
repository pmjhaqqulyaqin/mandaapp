import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Breadcrumbs } from '@mandaapp/ui';
import { 
  Users, GraduationCap, UserCheck, Mail, MailOpen, Ticket,
  TrendingUp, AlertTriangle, Clock, BookOpen, CalendarDays,
  CheckCircle2, XCircle, FileText, Scan, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export const DashboardOverview = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [classroom, setClassroom] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [ikm, setIkm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      const results = await Promise.allSettled([
        apiClient<any>('/analytics/summary'),
        apiClient<any[]>('/attendance/weekly-stats'),
        apiClient<any>('/attendance/today/stats'),
        apiClient<any>('/analytics/classroom-monitor'),
        apiClient<any[]>('/analytics/recent-activity?limit=10'),
        apiClient<any[]>('/analytics/upcoming-events?limit=5'),
        apiClient<any>('/analytics/ikm'),
      ]);

      if (results[0].status === 'fulfilled') setSummary(results[0].value);
      if (results[1].status === 'fulfilled') setWeeklyStats((results[1].value || []).reverse());
      if (results[2].status === 'fulfilled') setTodayStats(results[2].value);
      if (results[3].status === 'fulfilled') setClassroom(results[3].value);
      if (results[4].status === 'fulfilled') setActivities(results[4].value || []);
      if (results[5].status === 'fulfilled') setEvents(results[5].value || []);
      if (results[6].status === 'fulfilled') setIkm(results[6].value);
      setIsLoading(false);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const todayPieData = todayStats ? [
    { name: 'Hadir', value: todayStats.Hadir || 0 },
    { name: 'Terlambat', value: todayStats.Terlambat || 0 },
    { name: 'Izin/Sakit', value: (todayStats.Izin || 0) + (todayStats.Sakit || 0) },
    { name: 'Alpa', value: todayStats.Alpa || 0 },
  ].filter(d => d.value > 0) : [];

  const activityIcon = (type: string) => {
    switch(type) {
      case 'attendance': return <Scan size={14} className="text-emerald-500" />;
      case 'surat_masuk': return <MailOpen size={14} className="text-blue-500" />;
      case 'ptsp': return <Ticket size={14} className="text-violet-500" />;
      default: return <Activity size={14} className="text-gray-400" />;
    }
  };

  const getIKMGrade = (pct: number) => {
    if (pct >= 87.5) return { grade: 'A', label: 'Sangat Baik', color: '#10b981' };
    if (pct >= 62.5) return { grade: 'B', label: 'Baik', color: '#3b82f6' };
    if (pct >= 37.5) return { grade: 'C', label: 'Cukup', color: '#f59e0b' };
    return { grade: 'D', label: 'Kurang', color: '#ef4444' };
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  const ikmGrade = ikm ? getIKMGrade(ikm.indexPct || 0) : null;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-3 md:gap-5">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Overview' }]} />

      {/* Greeting */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
        <h1 className="text-xl font-bold">{getGreeting()}, {user?.name || 'Admin'}! 👋</h1>
        <p className="text-sm text-white/80 mt-1">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {classroom ? ` • ${classroom.dayName}` : ''}
        </p>
      </div>

      {/* Classroom Monitor — Top Priority */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <BookOpen size={16} className="text-violet-500" /> Monitor Kelas Real-Time
            {classroom && <span className="text-[10px] font-normal text-gray-500">({classroom.dayName})</span>}
          </h3>
          {classroom && (
            <div className="flex gap-2 text-[10px] font-bold">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full">{classroom.totalTerisi} Terisi</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full">{classroom.totalKosong} Kosong</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-full">{classroom.totalJadwal} Total</span>
            </div>
          )}
        </div>
        {/* Mobile: Card list view */}
        <div className="md:hidden p-2.5 space-y-2 max-h-[320px] overflow-y-auto">
          {!classroom || classroom.schedules.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Tidak ada jadwal hari ini</div>
          ) : (
            classroom.schedules.map((s: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                s.isFilled ? 'border-gray-100 dark:border-[#222] bg-white dark:bg-[#111]' : 'border-red-200/60 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10'
              }`}>
                <div className="text-center shrink-0 w-11">
                  <div className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300">{s.time?.slice(0, 5)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-800 dark:text-gray-200 truncate">{s.subject}</p>
                  <p className="text-[10px] text-gray-500 truncate">{s.className} • {s.teacherName || '-'}</p>
                </div>
                {s.isFilled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                    <CheckCircle2 size={10} /> Terisi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-[10px] font-bold shrink-0 animate-pulse">
                    <XCircle size={10} /> Kosong
                  </span>
                )}
              </div>
            ))
          )}
        </div>
        {/* Desktop: Table view */}
        <div className="hidden md:block overflow-x-auto max-h-[320px] overflow-y-auto">
          {!classroom || classroom.schedules.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Tidak ada jadwal hari ini</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-[#1a1a1a] sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left font-semibold text-gray-500">Jam</th>
                  <th className="p-2 text-left font-semibold text-gray-500">Kelas</th>
                  <th className="p-2 text-left font-semibold text-gray-500">Mata Pelajaran</th>
                  <th className="p-2 text-left font-semibold text-gray-500">Guru Pengajar</th>
                  <th className="p-2 text-center font-semibold text-gray-500">Status Jurnal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                {classroom.schedules.map((s: any, i: number) => (
                  <tr key={i} className={`transition-colors ${s.isFilled ? 'hover:bg-gray-50 dark:hover:bg-white/5' : 'bg-red-50/40 dark:bg-red-900/5 hover:bg-red-50 dark:hover:bg-red-900/10'}`}>
                    <td className="p-2 font-mono text-gray-600 dark:text-gray-400">{s.time?.slice(0, 5)}</td>
                    <td className="p-2 font-bold text-gray-800 dark:text-gray-200">{s.className}</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">{s.subject}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{s.teacherName || '-'}</td>
                    <td className="p-2 text-center">
                      {s.isFilled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 size={10} /> Terisi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-[10px] font-bold animate-pulse">
                          <XCircle size={10} /> Kosong
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Siswa Aktif', value: summary?.totalSiswa || 0, icon: <GraduationCap size={18} />, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'GTK', value: summary?.totalGTK || 0, icon: <Users size={18} />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Kehadiran', value: `${summary?.persenKehadiran || 0}%`, icon: <UserCheck size={18} />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Surat Masuk', value: summary?.suratMasuk || 0, icon: <MailOpen size={18} />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Surat Keluar', value: summary?.suratKeluar || 0, icon: <Mail size={18} />, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
          { label: 'Tiket Pending', value: summary?.tiketPending || 0, icon: <Ticket size={18} />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-[#111] rounded-xl p-3 border border-gray-100 dark:border-[#222] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{card.label}</span>
              <div className={`p-1.5 rounded-lg ${card.color}`}>{card.icon}</div>
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-[#222] shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" /> Statistik Kehadiran 7 Hari
          </h3>
          <div className="h-40 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStats} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Bar dataKey="Hadir" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Terlambat" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Izin" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Alpa" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Today */}
        <div className="bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-[#222] shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
            <UserCheck size={16} className="text-emerald-500" /> Hari Ini
          </h3>
          {todayPieData.length > 0 ? (
            <div className="h-40 md:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={todayPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {todayPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Belum ada data</div>
          )}
        </div>
      </div>

      {/* Row 3: Activity Feed (full width) */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.02]">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" /> Aktivitas Terbaru
          </h3>
        </div>
        <div className="overflow-y-auto max-h-[250px] p-2">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Belum ada aktivitas</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
              {activities.map((act, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="mt-0.5 shrink-0">{activityIcon(act.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] md:text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{act.title}</p>
                    <p className="text-[11px] md:text-[10px] text-gray-500 truncate">{act.detail}</p>
                  </div>
                  <span className="text-[10px] md:text-[9px] text-gray-400 whitespace-nowrap mt-0.5">
                    {act.time ? new Date(act.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: IKM + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* IKM Gauge */}
        <div className="bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-[#222] shadow-sm text-center">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center justify-center gap-2">
            <TrendingUp size={16} className="text-blue-500" /> Indeks Kepuasan (IKM)
          </h3>
          {ikm && ikm.totalResponden > 0 ? (
            <div>
              <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center mx-auto mb-3"
                style={{ borderColor: ikmGrade?.color }}>
                <span className="text-2xl font-black" style={{ color: ikmGrade?.color }}>
                  {ikmGrade?.grade}
                </span>
              </div>
              <div className="text-2xl font-black" style={{ color: ikmGrade?.color }}>
                {ikm.indexPct}%
              </div>
              <p className="text-xs text-gray-500 mt-1">{ikmGrade?.label} • {ikm.totalResponden} responden</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Skor {ikm.skorRataRata}/4.00</p>
            </div>
          ) : (
            <div className="py-6 text-gray-400 text-sm">Belum ada data survey</div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.02]">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <CalendarDays size={16} className="text-rose-500" /> Kegiatan Mendatang
            </h3>
          </div>
          <div className="p-3">
            {events.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Tidak ada kegiatan mendatang</div>
            ) : (
              <div className="space-y-2">
                {events.map((evt, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-[#222]">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold leading-none">
                        {new Date(evt.startDate).toLocaleDateString('id-ID', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black leading-none">
                        {new Date(evt.startDate).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{evt.title}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(evt.startDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {evt.endDate && evt.endDate !== evt.startDate ? ` — ${new Date(evt.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}` : ''}
                      </p>
                      {evt.category && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                          {evt.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
