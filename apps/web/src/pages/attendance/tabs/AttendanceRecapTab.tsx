import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { Download, Calendar, Search, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type RecapMode = 'monthly' | 'range';

// Helper: generate array of dates between start and end
const getDatesInRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
};

// Helper: get Monday of current week
const getMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
};

export const AttendanceRecapTab = () => {
  const today = new Date();
  const [mode, setMode] = useState<RecapMode>('monthly');
  
  // Monthly mode
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  
  // Range mode
  const [startDate, setStartDate] = useState(getMonday());
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [recapData, setRecapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    apiClient<any[]>('/classes').then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].id);
    }).catch(err => console.error(err));
  }, []);

  const fetchRecap = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      let url: string;
      if (mode === 'range') {
        url = `/attendance/recap/monthly?startDate=${startDate}&endDate=${endDate}&classId=${selectedClass}`;
      } else {
        url = `/attendance/recap/monthly?month=${selectedMonth}&year=${selectedYear}&classId=${selectedClass}`;
      }
      const data = await apiClient<any[]>(url);
      setRecapData(data);
    } catch (err) {
      toast.error('Gagal mengambil data rekap');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) fetchRecap();
  }, [selectedMonth, selectedYear, selectedClass, mode, startDate, endDate]);

  // Generate date columns based on mode
  const dateColumns: { key: string; label: string }[] = [];
  if (mode === 'monthly') {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dateColumns.push({ key: dateStr, label: String(d) });
    }
  } else {
    const dates = getDatesInRange(startDate, endDate);
    dates.forEach(date => {
      const d = new Date(date);
      const dayNum = d.getDate();
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      dateColumns.push({ key: date, label: `${dayNum}\n${dayName}` });
    });
  }

  // Map data to grid
  const studentMap = new Map<string, { nama: string; nis: string; dates: Record<string, string>; stats: Record<string, number> }>();
  
  recapData.forEach(record => {
    if (!studentMap.has(record.studentId)) {
      studentMap.set(record.studentId, {
        nama: record.nama,
        nis: record.nis,
        dates: {},
        stats: { Hadir: 0, Terlambat: 0, Alpa: 0, Izin: 0, Sakit: 0, Bolos: 0 }
      });
    }
    const stu = studentMap.get(record.studentId)!;
    stu.dates[record.date] = record.status;
    const statusKey = record.status === 'Pulang' ? 'Hadir' : record.status;
    if (stu.stats[statusKey] !== undefined) {
      stu.stats[statusKey]++;
    }
  });

  const studentsList = Array.from(studentMap.values()).sort((a, b) => a.nama.localeCompare(b.nama));

  const getStatusInitial = (status: string) => {
    if (status === 'Hadir' || status === 'Pulang') return 'H';
    if (status === 'Terlambat') return 'T';
    if (status === 'Alpa') return 'A';
    if (status === 'Izin') return 'I';
    if (status === 'Sakit') return 'S';
    if (status === 'Bolos') return 'B';
    return '-';
  };

  const getStatusColor = (initial: string) => {
    switch(initial) {
      case 'H': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20';
      case 'T': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
      case 'A': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'I': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'S': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
      case 'B': return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20';
      default: return 'text-gray-300 dark:text-gray-600';
    }
  };

  const handleExport = () => {
    const wsData = [];
    const headers = ['No', 'NIS', 'Nama Siswa', ...dateColumns.map(d => d.label.replace('\n', ' ')), 'H', 'T', 'S', 'I', 'A', 'B'];
    wsData.push(headers);
    
    studentsList.forEach((stu, idx) => {
      const row = [
        idx + 1,
        stu.nis,
        stu.nama,
        ...dateColumns.map(d => getStatusInitial(stu.dates[d.key])),
        stu.stats.Hadir,
        stu.stats.Terlambat,
        stu.stats.Sakit,
        stu.stats.Izin,
        stu.stats.Alpa,
        stu.stats.Bolos
      ];
      wsData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Presensi");
    const filename = mode === 'monthly' 
      ? `Rekap_Presensi_${selectedYear}_${selectedMonth}.xlsx`
      : `Rekap_Presensi_${startDate}_${endDate}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    import('@/lib/mobileUtils').then(m => m.downloadOrShareBlob(blob, filename));
  };

  // Quick range presets
  const setThisWeek = () => {
    setStartDate(getMonday());
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  const setLastWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff - 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 5);
    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(friday.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle + Filters */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#222] p-3 space-y-3">
        {/* Mode toggle */}
        <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-[#222] rounded-lg w-fit">
          <button
            onClick={() => setMode('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
              mode === 'monthly'
                ? 'bg-white dark:bg-[#333] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar size={12} /> Bulanan
          </button>
          <button
            onClick={() => setMode('range')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
              mode === 'range'
                ? 'bg-white dark:bg-[#333] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarRange size={12} /> Rentang Tanggal
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          {/* Class selector */}
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pilih Kelas</label>
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          {mode === 'monthly' ? (
            <div className="flex gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bulan</label>
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-20 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('id-ID', { month: 'short' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tahun</label>
                <select 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-20 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dari</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Sampai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {/* Quick presets */}
              <div className="flex gap-1">
                <button onClick={setThisWeek} className="px-2 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition">
                  Minggu Ini
                </button>
                <button onClick={setLastWeek} className="px-2 py-1.5 bg-gray-100 text-gray-600 dark:bg-[#333] dark:text-gray-300 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition">
                  Minggu Lalu
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={fetchRecap}
            disabled={isLoading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Search size={14} /> Filter
          </button>
          <button 
            onClick={handleExport}
            disabled={studentsList.length === 0}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            Memuat data...
          </div>
        ) : studentsList.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Calendar size={32} className="mx-auto mb-3 opacity-50" />
            <p>Tidak ada data absensi untuk kelas dan periode ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#222] text-gray-500 uppercase tracking-wider">
                  <th className="p-2 font-semibold border-b border-gray-200 dark:border-[#333] sticky left-0 bg-gray-50 dark:bg-[#222] z-10 min-w-[150px]">Siswa</th>
                  {dateColumns.map(d => (
                    <th key={d.key} className="p-1 text-[10px] font-semibold border-b border-gray-200 dark:border-[#333] text-center min-w-[24px]">
                      {d.label.includes('\n') ? (
                        <div className="flex flex-col leading-tight">
                          <span>{d.label.split('\n')[0]}</span>
                          <span className="text-[8px] text-gray-400 font-normal">{d.label.split('\n')[1]}</span>
                        </div>
                      ) : d.label}
                    </th>
                  ))}
                  <th className="p-1 text-[10px] font-bold border-b border-gray-200 dark:border-[#333] text-center text-emerald-600">H</th>
                  <th className="p-1 text-[10px] font-bold border-b border-gray-200 dark:border-[#333] text-center text-amber-600">T</th>
                  <th className="p-1 text-[10px] font-bold border-b border-gray-200 dark:border-[#333] text-center text-purple-600">S</th>
                  <th className="p-1 text-[10px] font-bold border-b border-gray-200 dark:border-[#333] text-center text-blue-600">I</th>
                  <th className="p-1 text-[10px] font-bold border-b border-gray-200 dark:border-[#333] text-center text-red-600">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                {studentsList.map((stu) => (
                  <tr key={stu.nis} className="hover:bg-gray-50 dark:hover:bg-[#1f1f1f]">
                    <td className="p-2 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-[#1a1a1a] z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                      <div className="truncate w-36 text-xs">{stu.nama}</div>
                      <div className="text-[9px] text-gray-500 font-normal">{stu.nis}</div>
                    </td>
                    {dateColumns.map(d => {
                      const init = getStatusInitial(stu.dates[d.key]);
                      return (
                        <td key={d.key} className="p-1 text-center">
                          <div className={`w-6 h-6 flex items-center justify-center rounded-md font-bold text-[10px] mx-auto ${getStatusColor(init)}`}>
                            {init !== '-' ? init : ''}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10">{stu.stats.Hadir}</td>
                    <td className="p-2 text-center font-bold text-amber-600 bg-amber-50/50 dark:bg-amber-900/10">{stu.stats.Terlambat}</td>
                    <td className="p-2 text-center font-bold text-purple-600 bg-purple-50/50 dark:bg-purple-900/10">{stu.stats.Sakit}</td>
                    <td className="p-2 text-center font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-900/10">{stu.stats.Izin}</td>
                    <td className="p-2 text-center font-bold text-red-600 bg-red-50/50 dark:bg-red-900/10">{stu.stats.Alpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
