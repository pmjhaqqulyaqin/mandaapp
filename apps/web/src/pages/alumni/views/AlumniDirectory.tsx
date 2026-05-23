import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { Button } from '@mandaapp/ui/src/components/Button';
import { 
  Search, Download, Eye, Award, GraduationCap, Building2, MapPin, Loader2, User, BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper functions
const avatarColor = (name: string) => {
  const colors = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-violet-500','bg-cyan-500','bg-orange-500','bg-teal-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (name: string) => {
  const parts = (name || '?').trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const ITEMS_PER_PAGE = 12;

export const AlumniDirectory = () => {
  const navigate = useNavigate();
  
  // States for filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [showOnlyNotable, setShowOnlyNotable] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch alumni data (status: lulus)
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ['alumni-directory'],
    queryFn: () => apiClient<any[]>('/students').then(res => res.filter(s => s.status === 'Lulus' || s.status === 'lulus'))
  });

  // Extract unique years and majors for filters
  // For mock purposes, we generate some fake graduation years and majors if not present
  const enrichedStudents = useMemo(() => {
    return allStudents.map(s => {
      // Mock data injection if missing, for visual purposes
      const gradYear = s.gradYear || (2020 + (Math.abs(s.id.charCodeAt(0)) % 5)).toString();
      const major = s.major || (Math.abs(s.id.charCodeAt(1)) % 2 === 0 ? 'IPA' : 'IPS');
      const isNotable = s.isNotable || (Math.abs(s.id.charCodeAt(2)) % 10 === 0); // 10% notable
      const jobStatus = Math.abs(s.id.charCodeAt(3)) % 2 === 0 ? 'Bekerja' : 'Kuliah';
      
      return { ...s, gradYear, major, isNotable, jobStatus };
    });
  }, [allStudents]);

  const uniqueYears = useMemo(() => Array.from(new Set(enrichedStudents.map(s => s.gradYear))).sort().reverse(), [enrichedStudents]);
  const uniqueMajors = useMemo(() => Array.from(new Set(enrichedStudents.map(s => s.major))).sort(), [enrichedStudents]);

  // Filtering
  const filtered = useMemo(() => {
    return enrichedStudents.filter(s => {
      const matchSearch = !searchQuery || (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.nis || '').includes(searchQuery);
      const matchYear = !filterYear || s.gradYear === filterYear;
      const matchMajor = !filterMajor || s.major === filterMajor;
      const matchNotable = !showOnlyNotable || s.isNotable;
      return matchSearch && matchYear && matchMajor && matchNotable;
    });
  }, [enrichedStudents, searchQuery, filterYear, filterMajor, showOnlyNotable]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Export Excel
  const handleExportExcel = () => {
    const data = filtered.map((s, idx) => ({
      'No': idx + 1,
      'Nama Lengkap': s.fullName || '-',
      'NIS/NISN': `${s.nis || '-'}/${s.nisn || '-'}`,
      'Angkatan': s.gradYear,
      'Jurusan': s.major,
      'Status': s.jobStatus,
      'Berprestasi': s.isNotable ? 'Ya' : 'Tidak'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Alumni');
    XLSX.writeFile(wb, `Data_Alumni_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      {/* Filters Area */}
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              placeholder="Cari nama atau NIS..."
              value={searchQuery} 
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} 
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select 
            className="h-10 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}
          >
            <option value="">Semua Angkatan</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          
          <select 
            className="h-10 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={filterMajor} onChange={e => { setFilterMajor(e.target.value); setPage(1); }}
          >
            <option value="">Semua Jurusan</option>
            {uniqueMajors.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <button 
            onClick={() => { setShowOnlyNotable(!showOnlyNotable); setPage(1); }}
            className={`h-10 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              showOnlyNotable 
                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800' 
                : 'border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-gray-600 dark:text-gray-300'
            }`}
          >
            <Award size={16} className={showOnlyNotable ? 'text-amber-500' : ''} />
            Alumni Berprestasi
          </button>

          <Button variant="outline" className="h-10 w-10 p-0 flex items-center justify-center shrink-0 rounded-xl" onClick={handleExportExcel} title="Export Excel">
            <Download size={16} className="text-emerald-600" />
          </Button>
        </div>
      </div>

      <div className="text-sm font-semibold text-text-secondary px-1">
        Menampilkan {filtered.length} alumni
      </div>

      {/* MOBILE VIEW: Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 md:hidden">
        {paginated.map(s => (
          <div key={s.id} className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
            {s.isNotable && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                <Award size={10} /> Berprestasi
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${avatarColor(s.fullName || '')} flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0`}>
                {initials(s.fullName || '')}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-text-primary dark:text-text-darkPrimary text-sm truncate leading-tight mb-0.5">{s.fullName}</h3>
                <p className="text-xs text-text-secondary font-mono">{s.nis || s.nisn}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1">
                <GraduationCap size={12} /> Angkatan {s.gradYear}
              </span>
              <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1">
                <Building2 size={12} /> {s.major}
              </span>
            </div>

            <div className="border-t border-gray-50 dark:border-[#222] pt-3 mt-1 flex justify-between items-center">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
                s.jobStatus === 'Bekerja' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
              }`}>
                {s.jobStatus === 'Bekerja' ? <Building2 size={10} /> : <BookOpen size={10} />}
                {s.jobStatus}
              </span>
              <button 
                onClick={() => navigate(`/dashboard/alumni/profile/${s.id}`)}
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline bg-primary/5 px-2 py-1 rounded-lg"
              >
                Lihat Detail <Eye size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP VIEW: Table Layout */}
      <div className="hidden md:block bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#222] text-[11px] uppercase tracking-wider text-text-secondary bg-gray-50/50 dark:bg-[#0a0a0a]">
              <th className="py-3 px-4 font-semibold">Profil Alumni</th>
              <th className="py-3 px-4 font-semibold">Angkatan & Jurusan</th>
              <th className="py-3 px-4 font-semibold">Status Tracer</th>
              <th className="py-3 px-4 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(s => (
              <tr key={s.id} className="border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors group">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(s.fullName || '')} flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0`}>
                      {initials(s.fullName || '')}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary dark:text-text-darkPrimary text-[13px] flex items-center gap-1.5">
                        {s.fullName}
                        {s.isNotable && <Award size={14} className="text-amber-500" title="Alumni Berprestasi" />}
                      </h3>
                      <p className="text-xs text-text-secondary font-mono">{s.nis || s.nisn}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-gray-400" /> Lulusan {s.gradYear}
                    </span>
                    <span className="text-[11px] text-text-secondary">{s.major}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
                    s.jobStatus === 'Bekerja' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10'
                  }`}>
                    {s.jobStatus === 'Bekerja' ? <Building2 size={12} /> : <BookOpen size={12} />}
                    {s.jobStatus}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <Button 
                    variant="outline" size="sm" 
                    onClick={() => navigate(`/dashboard/alumni/profile/${s.id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 mx-auto h-8 text-xs"
                  >
                    <User size={14} /> Profil Lengkap
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginated.length === 0 && (
        <div className="py-16 text-center bg-white dark:bg-[#111] rounded-2xl border border-dashed border-gray-200 dark:border-[#333]">
          <GraduationCap size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-semibold text-text-primary dark:text-gray-400">Tidak ada data alumni ditemukan</p>
          <p className="text-xs text-text-secondary mt-1">Coba sesuaikan filter pencarian Anda.</p>
        </div>
      )}

      {/* Pagination Container */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-2">
          <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] rounded-full px-2 py-1 shadow-sm flex items-center gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-text-secondary hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <div className="px-3 text-xs font-bold text-primary">
              {page} <span className="text-text-secondary font-normal mx-1">/</span> {totalPages}
            </div>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-text-secondary hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
