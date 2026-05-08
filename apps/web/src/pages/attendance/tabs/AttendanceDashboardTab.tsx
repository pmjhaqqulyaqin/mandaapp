import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Clock, UserCheck, AlertTriangle, LogOut, Users } from 'lucide-react';

export const AttendanceDashboardTab = () => {
  const [stats, setStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [logHariIni, setLogHariIni] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, weeklyRes, logRes] = await Promise.all([
        apiClient<any>('/attendance/today/stats'),
        apiClient<any[]>('/attendance/weekly-stats'),
        apiClient<any[]>('/attendance/today/log?limit=10')
      ]);
      setStats(statsRes);
      
      // Reverse weekly stats so oldest is first
      setWeeklyStats(weeklyRes.reverse());
      setLogHariIni(logRes);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-gray-100 dark:border-[#222] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Hadir</h3>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats?.Hadir || 0}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Siswa tepat waktu</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-gray-100 dark:border-[#222] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Terlambat</h3>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats?.Terlambat || 0}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Melebihi batas waktu</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-gray-100 dark:border-[#222] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sudah Pulang</h3>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <LogOut size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats?.pulang || 0}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Telah absen pulang</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 border border-gray-100 dark:border-[#222] shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Belum Absen</h3>
            <div className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
              <Users size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats?.belum_absen || 0}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Dari total {stats?.total_siswa || 0} siswa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-gray-100 dark:border-[#222] shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-6">Statistik 7 Hari Terakhir</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Hadir" name="Hadir" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Terlambat" name="Terlambat" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Izin" name="Izin/Sakit" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Alpa" name="Alpa/Bolos" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Log */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock size={14} className="text-indigo-500" />
              Log Terakhir
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 max-h-[320px] custom-scrollbar">
            {logHariIni.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                <Clock size={20} className="mb-2 opacity-50" />
                <p className="text-xs">Belum ada scan hari ini</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logHariIni.map((log) => (
                  <div key={log.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-[#222] rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {log.nama.charAt(0)}
                    </div>
                    <div className="ml-2.5 flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{log.nama}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{log.kelas}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        log.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        log.status === 'Terlambat' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {log.status}
                      </span>
                      <div className="text-[10px] font-semibold text-gray-500 mt-0.5">
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
    </div>
  );
};
