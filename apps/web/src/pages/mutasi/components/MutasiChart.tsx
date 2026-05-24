import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MutasiChartProps {
  data: any[]; // The raw mutasi records
  isLoading: boolean;
}

export const MutasiChart: React.FC<MutasiChartProps> = ({ data, isLoading }) => {
  // Process data to group by month for the last 6 months
  const chartData = useMemo(() => {
    if (!data) return [];
    
    const months = [];
    const today = new Date();
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('id-ID', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        masuk: 0,
        keluar: 0,
        internal: 0
      });
    }

    // Populate data
    data.forEach(record => {
      if (!record.effectiveDate) return;
      const date = new Date(record.effectiveDate);
      const monthIdx = months.findIndex(m => m.month === date.getMonth() && m.year === date.getFullYear());
      
      if (monthIdx !== -1) {
        if (record.type === 'masuk') months[monthIdx].masuk++;
        else if (record.type === 'keluar') months[monthIdx].keluar++;
        else if (record.type === 'internal') months[monthIdx].internal++;
      }
    });

    return months;
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm h-[350px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm flex flex-col h-[350px]">
      <div className="mb-4">
        <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Tren Mutasi Siswa</h2>
        <p className="text-xs text-text-secondary">Statistik 6 bulan terakhir</p>
      </div>
      
      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInternal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-[#333]" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
              labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '12px' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Area type="monotone" dataKey="masuk" name="Masuk" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMasuk)" />
            <Area type="monotone" dataKey="keluar" name="Keluar" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorKeluar)" />
            <Area type="monotone" dataKey="internal" name="Internal" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorInternal)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
