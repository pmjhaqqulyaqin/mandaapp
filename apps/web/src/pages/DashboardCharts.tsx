/**
 * DashboardCharts — Lazy-loaded chart wrapper to avoid blocking initial dashboard render.
 * This file is only loaded when chart data is ready and the component is in view.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, UserCheck } from 'lucide-react';

interface Props {
  weeklyStats: any[];
  todayPieData: { name: string; value: number }[];
  colors: string[];
}

const DashboardCharts = ({ weeklyStats, todayPieData, colors }: Props) => (
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
                {todayPieData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
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
);

export default DashboardCharts;
