import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { Button } from '@mandaapp/ui/src/components/Button';
import { 
  Search, Download, Eye, Loader2, User, Users, ArrowDownToLine, ArrowUpFromLine, GraduationCap, School
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DataTableToolbar } from '../../../components/DataTableToolbar';

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

const DEFAULT_ITEMS = 12;

export const DaftarSiswaMutasi = () => {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(DEFAULT_ITEMS);

  // Fetch only students who are mutasi/keluar/pindah/do
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ['students-mutasi-directory'],
    queryFn: () => apiClient<any[]>('/students').then(res => 
      res.filter(s => ['keluar', 'pindah', 'do', 'mutasi'].includes((s.status || '').toLowerCase()))
    )
  });

  const uniqueStatus = useMemo(() => Array.from(new Set(allStudents.map(s => s.status))).filter(Boolean).sort(), [allStudents]);

  const filtered = useMemo(() => {
    return allStudents.filter(s => {
      const matchSearch = !searchQuery || (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.nis || '').includes(searchQuery);
      const matchType = !filterType || s.status === filterType;
      return matchSearch && matchType;
    });
  }, [allStudents, searchQuery, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
  const paginated = filtered.slice((page - 1) * entriesPerPage, page * entriesPerPage);

  const handleExportExcel = () => {
    const data = filtered.map((s, idx) => ({
      'No': idx + 1,
      'Nama Lengkap': s.fullName || '-',
      'NIS/NISN': `${s.nis || '-'}/${s.nisn || '-'}`,
      'Kelas Terakhir': s.className || '-',
      'Status': s.status || '-',
      'Agama': s.religion || '-',
      'Gender': s.gender || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa Mutasi');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    import('@/lib/mobileUtils').then(m => m.downloadOrShareBlob(blob, `Siswa_Mutasi_${new Date().toISOString().split('T')[0]}.xlsx`));
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('keluar') || s === 'do') return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
    if (s.includes('pindah') || s.includes('mutasi')) return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
    return 'bg-gray-50 text-gray-600 dark:bg-[#222] dark:text-gray-300';
  };

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('keluar') || s === 'do') return <ArrowUpFromLine size={12} />;
    return <ArrowDownToLine size={12} />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500 pb-10">
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
            value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="">Semua Status</option>
            {uniqueStatus.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <Button variant="outline" className="h-10 w-10 p-0 flex items-center justify-center shrink-0 rounded-xl" onClick={handleExportExcel} title="Export Excel">
            <Download size={16} className="text-emerald-600" />
          </Button>
        </div>
      </div>

      <div className="text-sm font-semibold text-text-secondary px-1">
        Menampilkan {filtered.length} siswa mutasi
      </div>

      {/* DataTable Toolbar */}
      <DataTableToolbar
        data={filtered}
        columns={[
          { header: 'Nama Lengkap', key: 'fullName', transform: (v) => v || '-' },
          { header: 'NIS', key: 'nis', transform: (v) => v || '-' },
          { header: 'NISN', key: 'nisn', transform: (v) => v || '-' },
          { header: 'Kelas Terakhir', key: 'className', transform: (v) => v || '-' },
          { header: 'Status', key: 'status', transform: (v) => v || '-' },
          { header: 'Gender', key: 'gender', transform: (v) => v || '-' },
        ]}
        fileName="Siswa_Mutasi"
        title="Daftar Siswa Mutasi"
        entriesPerPage={entriesPerPage}
        onEntriesPerPageChange={(n) => { setEntriesPerPage(n); setPage(1); }}
        totalEntries={filtered.length}
      />

      {/* MOBILE VIEW: Card Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 md:hidden">
        {paginated.map(s => (
          <div 
            key={s.id} 
            onClick={() => navigate(`/dashboard/mutasi/profile/${s.id}`)}
            className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden group cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${avatarColor(s.fullName || '')} flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0`}>
                {initials(s.fullName || '')}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-text-primary dark:text-text-darkPrimary text-sm truncate leading-tight mb-0.5 group-hover:text-primary transition-colors">{s.fullName}</h3>
                <p className="text-xs text-text-secondary font-mono">{s.nis || s.nisn}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-1">
              <span className={`text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1 ${getStatusBadge(s.status)}`}>
                {getStatusIcon(s.status)} {s.status}
              </span>
              <span className="bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1">
                <School size={12} /> {s.className || 'Tidak ada kelas'}
              </span>
            </div>

            <div className="border-t border-gray-50 dark:border-[#222] pt-3 mt-1 flex justify-between items-center">
              <span className="text-[10px] text-text-secondary flex items-center gap-1">
                <GraduationCap size={10} /> Angkatan {s.gradYear || '-'}
              </span>
              <div className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline bg-primary/5 px-2 py-1 rounded-lg">
                Lihat Detail <Eye size={12} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP VIEW: Table Layout */}
      <div className="hidden md:block bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#222] text-[11px] uppercase tracking-wider text-text-secondary bg-gray-50/50 dark:bg-[#0a0a0a]">
              <th className="py-3 px-4 font-semibold">Profil Siswa</th>
              <th className="py-3 px-4 font-semibold">Kelas Terakhir</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(s => (
              <tr key={s.id} className="border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors group">
                <td className="py-3 px-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate(`/dashboard/mutasi/profile/${s.id}`)}
                  >
                    <div className={`w-10 h-10 rounded-full ${avatarColor(s.fullName || '')} flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0`}>
                      {initials(s.fullName || '')}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary dark:text-text-darkPrimary text-[13px] flex items-center gap-1.5 group-hover:text-primary transition-colors">
                        {s.fullName}
                      </h3>
                      <p className="text-xs text-text-secondary font-mono">{s.nis || s.nisn}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-1.5">
                    <School size={14} className="text-gray-400" /> {s.className || '-'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${getStatusBadge(s.status)}`}>
                    {getStatusIcon(s.status)}
                    {s.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <Button 
                    variant="outline" size="sm" 
                    onClick={() => navigate(`/dashboard/mutasi/profile/${s.id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 mx-auto h-8 text-xs rounded-xl"
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
          <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-semibold text-text-primary dark:text-gray-400">Tidak ada data siswa mutasi ditemukan</p>
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
