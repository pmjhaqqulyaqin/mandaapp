import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Users, Loader2, Search, Filter } from 'lucide-react';
import { DataTableToolbar } from '../../../components/DataTableToolbar';

interface StudentRow {
  id: string;
  nis: string;
  nisn: string;
  fullName: string;
  gender: string;
  classId: string;
  className: string;
}

interface ClassOption {
  id: string;
  name: string;
}

export const StudentDataTab = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const res = await apiClient<ClassOption[]>('/ijazah/classes');
      setClasses(res);
    } catch (err) {
      toast.error('Gagal mengambil daftar rombel');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const endpoint = selectedClassId === 'global'
        ? '/ijazah/students'
        : `/ijazah/students?classId=${selectedClassId}`;
      const res = await apiClient<StudentRow[]>(endpoint);
      setStudents(res);
    } catch (err) {
      toast.error('Gagal mengambil data siswa');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = searchQuery
    ? students.filter(s =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students;

  // Group by class for summary
  const classSummary = classes.map(cls => ({
    ...cls,
    count: students.filter(s => s.classId === cls.id).length
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Info Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-white dark:bg-[#111] rounded-lg shadow-sm text-emerald-500 shrink-0">
          <Users size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Daftar Siswa Kelas XII</h3>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Data siswa ditarik otomatis dari modul <b>Manajemen Siswa</b>. Hanya siswa yang terdaftar di kelas XII yang akan tampil. Pastikan data siswa sudah lengkap sebelum memproses nilai ijazah.
          </p>
        </div>
      </div>

      {/* Class Summary Cards */}
      {!loading && classSummary.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedClassId('global')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
              selectedClassId === 'global'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/25'
                : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:border-emerald-300'
            }`}
          >
            <Users size={14} />
            Semua Rombel
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              selectedClassId === 'global'
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-[#222] text-gray-500'
            }`}>
              {students.length}
            </span>
          </button>
          {classSummary.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedClassId === cls.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/25'
                  : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:border-emerald-300'
              }`}
            >
              {cls.name}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedClassId === cls.id
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 dark:bg-[#222] text-gray-500'
              }`}>
                {cls.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, NIS, atau NISN siswa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-[#333] rounded-xl bg-white dark:bg-[#111] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* DataTable Toolbar */}
      <DataTableToolbar
        data={filteredStudents}
        columns={[
          { header: 'NIS', key: 'nis', transform: (v) => v || '-' },
          { header: 'NISN', key: 'nisn', transform: (v) => v || '-' },
          { header: 'Nama Siswa', key: 'fullName' },
          { header: 'Jenis Kelamin', key: 'gender', transform: (v) => v === 'L' || v === 'Laki-laki' ? 'L' : 'P' },
          { header: 'Rombel', key: 'className', transform: (v) => v || '-' },
        ]}
        fileName="Data_Siswa_Ijazah"
        title="Data Siswa Kelas XII"
        entriesPerPage={entriesPerPage}
        onEntriesPerPageChange={(n) => { setEntriesPerPage(n); setPage(1); }}
        totalEntries={filteredStudents.length}
      />

      {/* Data Table */}
      <div className="border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#111]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin text-emerald-500" />
            <p className="text-sm text-gray-500 font-medium">Memuat data siswa kelas XII...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-[#333]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-12 text-center">No</th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-32">NIS</th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-36">NISN</th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500">Nama Siswa</th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-16 text-center">JK</th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-40">Rombel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">
                      {searchQuery
                        ? `Tidak ditemukan siswa dengan kata kunci "${searchQuery}"`
                        : 'Belum ada siswa kelas XII yang terdaftar di sistem.'}
                    </td>
                  </tr>
                ) : filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-2.5 text-center text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{student.nis || '-'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{student.nisn || '-'}</td>
                    <td className="px-4 py-2.5 font-semibold text-text-primary dark:text-text-darkPrimary">{student.fullName}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold ${
                        student.gender === 'L' || student.gender === 'Laki-laki'
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400'
                      }`}>
                        {student.gender === 'Laki-laki' ? 'L' : student.gender === 'Perempuan' ? 'P' : student.gender || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-[#222] dark:text-gray-300">
                        {student.className || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        {!loading && filteredStudents.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#0a0a0a] flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Menampilkan <b className="text-text-primary dark:text-text-darkPrimary">{filteredStudents.length}</b> siswa
              {selectedClassId !== 'global' && ` dari ${classes.find(c => c.id === selectedClassId)?.name || 'rombel terpilih'}`}
              {searchQuery && ` (filter: "${searchQuery}")`}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                L: {filteredStudents.filter(s => s.gender === 'L' || s.gender === 'Laki-laki').length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400"></span>
                P: {filteredStudents.filter(s => s.gender === 'P' || s.gender === 'Perempuan').length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
