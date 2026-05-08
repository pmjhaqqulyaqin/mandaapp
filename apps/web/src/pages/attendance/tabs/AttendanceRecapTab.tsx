import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { Download, Calendar, Search } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const AttendanceRecapTab = () => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [classes, setClasses] = useState<any[]>([]);
  const [recapData, setRecapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch classes for dropdown
    apiClient<any[]>('/classes').then(data => {
      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0].id);
      }
    }).catch(err => console.error(err));
  }, []);

  const fetchRecap = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      const data = await apiClient<any[]>(`/attendance/recap/monthly?month=${selectedMonth}&year=${selectedYear}&classId=${selectedClass}`);
      setRecapData(data);
    } catch (err) {
      toast.error('Gagal mengambil data rekap');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchRecap();
    }
  }, [selectedMonth, selectedYear, selectedClass]);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map data to grid
  const studentMap = new Map<string, { nama: string; nis: string; dates: Record<number, string>; stats: Record<string, number> }>();
  
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
    const day = parseInt(record.date.split('-')[2], 10);
    stu.dates[day] = record.status;
    
    // Convert status to standard format if needed, and count
    const statusKey = record.status === 'Pulang' ? 'Hadir' : record.status; // Pulang counts as Hadir in daily rekap
    if (stu.stats[statusKey] !== undefined) {
      stu.stats[statusKey]++;
    } else if (statusKey === 'Hadir') {
      stu.stats.Hadir++; // fallback
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
    
    // Headers
    const headers = ['No', 'NIS', 'Nama Siswa', ...daysArray.map(d => String(d)), 'H', 'T', 'S', 'I', 'A', 'B'];
    wsData.push(headers);
    
    // Rows
    studentsList.forEach((stu, idx) => {
      const row = [
        idx + 1,
        stu.nis,
        stu.nama,
        ...daysArray.map(d => getStatusInitial(stu.dates[d])),
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
    XLSX.writeFile(wb, `Rekap_Presensi_${selectedClass}_${selectedYear}_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#222] p-3 flex flex-col sm:flex-row gap-3 items-end">
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
            <p>Tidak ada data absensi untuk kelas dan bulan ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#222] text-gray-500 uppercase tracking-wider">
                  <th className="p-2 font-semibold border-b border-gray-200 dark:border-[#333] sticky left-0 bg-gray-50 dark:bg-[#222] z-10 min-w-[150px]">Siswa</th>
                  {daysArray.map(d => (
                    <th key={d} className="p-1 text-[10px] font-semibold border-b border-gray-200 dark:border-[#333] text-center min-w-[24px]">{d}</th>
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
                    {daysArray.map(d => {
                      const init = getStatusInitial(stu.dates[d]);
                      return (
                        <td key={d} className="p-1 text-center">
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
