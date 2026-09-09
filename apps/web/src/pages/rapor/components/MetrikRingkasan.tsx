import { Users, Target, AlertTriangle, TrendingUp } from 'lucide-react';

interface Props {
  subjectName: string;
  className: string;
  stats: {
    total: number;
    tuntasCount: number;
    remedialCount: number;
    avgScore: string;
    tuntasPct: string;
  };
  kktp: number;
}

export const MetrikRingkasan = ({ subjectName, className, stats, kktp }: Props) => {
  return (
    <div className="bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-200 dark:border-[#222] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center text-gray-600 dark:text-gray-400 shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                Buku Ledger Nilai Digital: {subjectName || 'Pilih Mapel'}
              </h2>
              {className && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                  {className}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] text-[11px] font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <Target size={12} />
            KKTP: <strong className="text-gray-800 dark:text-gray-200">{kktp}</strong>
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total Peserta Didik"
          value={String(stats.total)}
          suffix="Santri"
          icon={<Users size={16} className="text-blue-500" />}
          color="text-gray-800 dark:text-gray-200"
        />
        <MetricCard
          label="Ketuntasan KKTP"
          value={stats.tuntasPct}
          suffix={`(${stats.tuntasCount} Tuntas)`}
          icon={<Target size={16} className="text-emerald-500" />}
          color="text-emerald-600 dark:text-emerald-400"
          suffixColor="text-emerald-500"
        />
        <MetricCard
          label="Perlu Intervensi/Remidi"
          value={String(stats.remedialCount)}
          suffix={`Santri (<${kktp})`}
          icon={<AlertTriangle size={16} className="text-red-500" />}
          color="text-red-600 dark:text-red-400"
          suffixColor="text-red-500"
        />
        <MetricCard
          label="Rerata Nilai Rapor"
          value={stats.avgScore}
          suffix="Skala 100"
          icon={<TrendingUp size={16} className="text-amber-500" />}
          color="text-gray-800 dark:text-gray-200"
        />
      </div>
    </div>
  );
};

function MetricCard({ label, value, suffix, icon, color, suffixColor }: {
  label: string;
  value: string;
  suffix: string;
  icon: React.ReactNode;
  color: string;
  suffixColor?: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-[#0d0d0d] p-3 rounded-lg border border-gray-100 dark:border-[#1a1a1a]">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={`text-xl font-bold ${color}`}>{value}</span>
        <span className={`text-[10px] ${suffixColor || 'text-gray-400'}`}>{suffix}</span>
      </div>
    </div>
  );
}
