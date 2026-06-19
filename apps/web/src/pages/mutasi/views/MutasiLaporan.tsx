import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Download, FileText, Filter, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DataTableToolbar } from '../../../components/DataTableToolbar';

export const MutasiLaporan = () => {
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['mutations-laporan', filterType, startDate, endDate],
    queryFn: () => {
      let query = '';
      if (filterType) query += `type=${filterType}&`;
      if (startDate) query += `startDate=${startDate}&`;
      if (endDate) query += `endDate=${endDate}&`;
      return apiClient<any[]>(`/mutations?${query}`).then(res => res);
    },
  });

  const handleExportExcel = () => {
    if (records.length === 0) return;
    const data = records.map((r, i) => ({
      'No': i + 1,
      'Nama Siswa': r.student?.fullName || '-',
      'NISN': r.student?.nisn || '-',
      'Jenis Mutasi': r.type === 'masuk' ? 'Mutasi Masuk' : r.type === 'keluar' ? 'Mutasi Keluar' : 'Mutasi Internal',
      'Tanggal Efektif': r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString('id-ID') : '-',
      'Sekolah Asal': r.fromSchool || '-',
      'Sekolah Tujuan': r.toSchool || '-',
      'Kelas Asal': r.fromClass || '-',
      'Kelas Tujuan': r.toClass || '-',
      'Alasan': r.reason || '-',
      'No Surat': r.suratNumber || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Mutasi');
    XLSX.writeFile(wb, `Laporan_Mutasi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500 pb-10">
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#222] pb-4">
          <Filter size={18} className="text-primary" />
          <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Filter Laporan</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Jenis Mutasi</label>
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Semua Jenis</option>
              <option value="masuk">Mutasi Masuk</option>
              <option value="keluar">Mutasi Keluar</option>
              <option value="internal">Mutasi Internal</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Dari Tanggal</label>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Sampai Tanggal</label>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="h-11 px-4 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#222] mt-2">
          <Button onClick={handleExportExcel} disabled={records.length === 0} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download size={16} /> Export Excel
          </Button>
        </div>
      </div>

      <DataTableToolbar
        data={records}
        columns={[
          { header: 'Nama Siswa', key: 'student', transform: (v) => v?.fullName || '-' },
          { header: 'NISN', key: 'student', transform: (v) => v?.nisn || '-' },
          { header: 'Jenis Mutasi', key: 'type', transform: (v) => v === 'masuk' ? 'Mutasi Masuk' : v === 'keluar' ? 'Mutasi Keluar' : 'Mutasi Internal' },
          { header: 'Tanggal Efektif', key: 'effectiveDate', transform: (v) => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
          { header: 'Asal', key: 'fromSchool', transform: (v, row) => v || row.fromClass || '-' },
          { header: 'Tujuan', key: 'toSchool', transform: (v, row) => v || row.toClass || '-' },
        ]}
        fileName="Laporan_Mutasi"
        title="Laporan Mutasi"
        entriesPerPage={entriesPerPage}
        onEntriesPerPageChange={(n) => { setEntriesPerPage(n); setPage(1); }}
        totalEntries={records.length}
      />

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden flex flex-col h-[400px]">
        <div className="p-4 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#0a0a0a] flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <FileText size={16} className="text-primary" /> Preview Data
          </h3>
          <span className="text-xs font-semibold text-text-secondary bg-white dark:bg-[#222] px-2 py-1 rounded-md border border-gray-200 dark:border-[#333]">
            {records.length} baris
          </span>
        </div>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <FileText size={48} className="text-gray-200 dark:text-[#333] mb-3" />
              <p className="text-sm font-semibold text-text-primary dark:text-gray-400">Tidak ada data untuk filter ini</p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead className="sticky top-0 bg-gray-50 dark:bg-[#0a0a0a] shadow-sm">
                <tr className="text-[11px] uppercase tracking-wider text-text-secondary">
                  <th className="py-3 px-4 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-4 font-semibold">Jenis</th>
                  <th className="py-3 px-4 font-semibold">Tgl Efektif</th>
                  <th className="py-3 px-4 font-semibold">Asal</th>
                  <th className="py-3 px-4 font-semibold">Tujuan</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a]">
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">{r.student?.fullName || '-'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                        r.type === 'masuk' ? 'bg-emerald-50 text-emerald-600' :
                        r.type === 'keluar' ? 'bg-rose-50 text-rose-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 max-w-[150px] truncate">{r.fromSchool || r.fromClass || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 max-w-[150px] truncate">{r.toSchool || r.toClass || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
