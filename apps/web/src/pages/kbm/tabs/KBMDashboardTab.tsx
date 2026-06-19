import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { Users, BookOpen, Clock, TrendingUp, ArrowRight, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { DataTableToolbar } from '../../../components/DataTableToolbar';

interface Props {
  academicYearId: string;
  semester: string;
  semesterLabel: string;
  onNavigate: (tab: any) => void;
}

export const KBMDashboardTab = ({ academicYearId, semester, semesterLabel, onNavigate }: Props) => {
  const [stats, setStats] = useState<any>(null);
  const [jtmSummary, setJtmSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!academicYearId) return;
    setLoading(true);
    Promise.all([
      apiClient(`/kbm/dashboard?academicYearId=${academicYearId}&semester=${semester}`),
      apiClient(`/kbm/distribusi/summary?academicYearId=${academicYearId}&semester=${semester}`),
    ]).then(([dashData, jtmData]) => {
      setStats(dashData);
      setJtmSummary(jtmData as any[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [academicYearId, semester]);

  if (!academicYearId) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-sm">Pilih Tahun Ajaran terlebih dahulu</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Guru', value: stats?.totalGuru || 0, icon: <Users size={20} />, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Kelas', value: stats?.totalKelas || 0, icon: <BookOpen size={20} />, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Jam Mengajar', value: stats?.totalJamMengajar || 0, icon: <Clock size={20} />, color: 'from-amber-500 to-orange-500' },
    { label: 'Setara Tugas', value: stats?.totalSetaraTugas || 0, icon: <TrendingUp size={20} />, color: 'from-purple-500 to-purple-600' },
  ];

  const overloadCount = jtmSummary.filter(g => g.status === 'overload').length;
  const tinggiCount = jtmSummary.filter(g => g.status === 'tinggi').length;
  const activeGuruCount = jtmSummary.filter(g => g.totalJtm > 0).length;

  return (
    <div className="space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(card => (
          <div key={card.label} className="relative overflow-hidden rounded-xl bg-white dark:bg-[#161616] border border-gray-100 dark:border-[#222] p-3.5 md:p-4">
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full bg-gradient-to-br ${card.color} opacity-10`} />
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-2.5`}>
              {card.icon}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{card.value}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{activeGuruCount} Guru Aktif</p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Sudah memiliki jam mengajar</p>
          </div>
        </div>
        {tinggiCount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{tinggiCount} Guru JTM Tinggi</p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">25-39 jam per minggu</p>
            </div>
          </div>
        )}
        {overloadCount > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">{overloadCount} Guru Overload</p>
              <p className="text-[10px] text-red-600/70 dark:text-red-400/70">Melebihi 40 jam per minggu</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onNavigate('distribusi')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[12px] font-semibold shadow-sm hover:shadow-md transition-all active:scale-95">
          <BookOpen size={14} /> Distribusi Jam <ArrowRight size={12} />
        </button>
        <button onClick={() => onNavigate('tugas')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-[12px] font-semibold shadow-sm hover:shadow-md transition-all active:scale-95">
          <Users size={14} /> Tugas Tambahan <ArrowRight size={12} />
        </button>
      </div>

      {/* JTM Table */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Rekap JTM Guru — {semesterLabel || 'Semester'}</h3>
        <DataTableToolbar
          data={jtmSummary}
          columns={[
            { header: 'Nama Guru', key: 'name' },
            { header: 'NIP', key: 'nip', transform: (v) => v || '-' },
            { header: 'Jam Mengajar', key: 'jamMengajar', transform: (v) => String(v || 0) },
            { header: 'Setara Tugas', key: 'setaraTugas', transform: (v) => String(v || 0) },
            { header: 'Total JTM', key: 'totalJtm', transform: (v) => String(v || 0) },
            { header: 'Status', key: 'status', transform: (v) => v === 'overload' ? 'Overload' : v === 'tinggi' ? 'Tinggi' : 'Normal' },
          ]}
          fileName="Rekap_JTM_Guru"
          title="Rekap JTM Guru"
          entriesPerPage={jtmSummary.length}
          onEntriesPerPageChange={() => {}}
          totalEntries={jtmSummary.length}
        />
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#161616] text-left">
                <th className="px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 w-10">No</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">Nama Guru</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 text-center hidden md:table-cell">NIP</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 text-center">Mengajar</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 text-center">Tugas</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 text-center">Total</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {jtmSummary.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-400 dark:text-gray-500">
                    Belum ada data distribusi jam
                  </td>
                </tr>
              ) : (
                jtmSummary.map((guru, i) => (
                  <tr key={guru.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161616]">
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{guru.name}</td>
                    <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 hidden md:table-cell">{guru.nip}</td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">{guru.jamMengajar}</td>
                    <td className="px-3 py-2 text-center font-semibold text-purple-600 dark:text-purple-400">{guru.setaraTugas}</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-800 dark:text-white">{guru.totalJtm}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        guru.status === 'overload'
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                          : guru.status === 'tinggi'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          : guru.totalJtm > 0
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {guru.status === 'overload' ? '🔴 Overload' : guru.status === 'tinggi' ? '⚠️ Tinggi' : guru.totalJtm > 0 ? '✅ Normal' : '— Belum'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
