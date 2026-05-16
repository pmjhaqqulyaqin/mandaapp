import { ChevronDown } from 'lucide-react';

interface SemesterSelectorProps {
  academicYears: any[];
  academicYearId: string;
  semester: string;
  onChange: (academicYearId: string, semester: string) => void;
}

export const SemesterSelector = ({ academicYears, academicYearId, semester, onChange }: SemesterSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <select
        value={academicYearId}
        onChange={(e) => onChange(e.target.value, semester)}
        className="text-[12px] md:text-[13px] font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none appearance-none cursor-pointer min-w-[140px]"
      >
        {academicYears.length === 0 && (
          <option value="">Memuat...</option>
        )}
        {academicYears.map((ay: any) => (
          <option key={ay.id} value={ay.id}>
            {ay.tahunAjaran} {ay.isActive ? '✦' : ''}
          </option>
        ))}
      </select>
      <select
        value={semester}
        onChange={(e) => onChange(academicYearId, e.target.value)}
        className="text-[12px] md:text-[13px] font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none appearance-none cursor-pointer min-w-[90px]"
      >
        <option value="ganjil">Ganjil</option>
        <option value="genap">Genap</option>
      </select>
    </div>
  );
};
