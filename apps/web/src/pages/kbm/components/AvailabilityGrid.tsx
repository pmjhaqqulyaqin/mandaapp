import { useState, useCallback } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';

type SlotStatus = 'available' | 'conditional' | 'unavailable';

interface AvailabilityGridProps {
  days: { key: number; label: string; shortLabel: string }[];
  jams: number[];
  data: Map<string, SlotStatus>; // key: "day-jam"
  onChange: (day: number, jam: number, status: SlotStatus) => void;
  onBatchToggleDay?: (day: number) => void;
  onBatchToggleJam?: (jam: number) => void;
  readOnly?: boolean;
}

const STATUS_CYCLE: SlotStatus[] = ['available', 'conditional', 'unavailable'];

const statusConfig: Record<SlotStatus, { icon: React.ReactNode; bg: string; border: string; text: string; label: string }> = {
  available: {
    icon: <Check size={16} strokeWidth={3} />,
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'cocok',
  },
  conditional: {
    icon: <HelpCircle size={16} strokeWidth={2.5} />,
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    border: 'border-amber-200 dark:border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'bersyarat',
  },
  unavailable: {
    icon: <X size={16} strokeWidth={3} />,
    bg: 'bg-red-50 dark:bg-red-500/15',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-500 dark:text-red-400',
    label: 'tidak tersedia',
  },
};

export const AvailabilityGrid = ({
  days, jams, data, onChange, onBatchToggleDay, onBatchToggleJam, readOnly = false,
}: AvailabilityGridProps) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [hoveredJam, setHoveredJam] = useState<number | null>(null);

  const getStatus = useCallback((day: number, jam: number): SlotStatus => {
    return data.get(`${day}-${jam}`) || 'available';
  }, [data]);

  const handleCellClick = useCallback((day: number, jam: number) => {
    if (readOnly) return;
    const current = getStatus(day, jam);
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    onChange(day, jam, STATUS_CYCLE[nextIdx]);
  }, [readOnly, getStatus, onChange]);

  // Count stats
  const totalSlots = days.length * jams.length;
  const unavailableCount = Array.from(data.values()).filter(s => s === 'unavailable').length;
  const conditionalCount = Array.from(data.values()).filter(s => s === 'conditional').length;
  const availableCount = totalSlots - unavailableCount - conditionalCount;

  return (
    <div className="space-y-3">
      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#161616]">
              <th className="px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 w-14 border-r border-gray-200 dark:border-[#333]">
                Hari/Jam
              </th>
              {jams.map(jam => (
                <th
                  key={jam}
                  onClick={() => !readOnly && onBatchToggleJam?.(jam)}
                  onMouseEnter={() => setHoveredJam(jam)}
                  onMouseLeave={() => setHoveredJam(null)}
                  className={`px-1 py-2.5 text-center text-[11px] font-bold border-r border-gray-100 dark:border-[#222] min-w-[44px] transition-all ${
                    !readOnly ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10' : ''
                  } ${hoveredJam === jam ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''} ${
                    jam === jams[jams.length - 1] ? 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/5' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {jam}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dayIdx) => (
              <tr
                key={day.key}
                className={`border-t ${dayIdx === 0 ? 'border-gray-200 dark:border-[#333]' : 'border-gray-100 dark:border-[#1a1a1a]'}`}
              >
                <td
                  onClick={() => !readOnly && onBatchToggleDay?.(day.key)}
                  onMouseEnter={() => setHoveredDay(day.key)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`px-2 py-1.5 text-center text-[11px] font-bold border-r border-gray-200 dark:border-[#333] select-none transition-all ${
                    !readOnly ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10' : ''
                  } ${hoveredDay === day.key ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''} ${
                    day.key === 5 ? 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-500/5' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <span className="hidden sm:inline">{day.shortLabel}</span>
                  <span className="sm:hidden">{day.shortLabel.slice(0, 2)}</span>
                </td>
                {jams.map(jam => {
                  const status = getStatus(day.key, jam);
                  const config = statusConfig[status];
                  return (
                    <td
                      key={jam}
                      onClick={() => handleCellClick(day.key, jam)}
                      className={`px-0.5 py-0.5 text-center border-r border-gray-50 dark:border-[#1a1a1a] transition-all ${
                        !readOnly ? 'cursor-pointer' : ''
                      } ${hoveredDay === day.key || hoveredJam === jam ? 'bg-gray-50/80 dark:bg-[#161616]' : ''}`}
                    >
                      <div
                        className={`flex items-center justify-center w-full h-9 rounded-lg border transition-all ${config.bg} ${config.border} ${config.text} ${
                          !readOnly ? 'hover:scale-110 hover:shadow-sm active:scale-95' : ''
                        }`}
                      >
                        {config.icon}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px]">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">Bagian :</span>
          {STATUS_CYCLE.map(status => {
            const config = statusConfig[status];
            return (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`flex items-center justify-center w-5 h-5 rounded border ${config.bg} ${config.border} ${config.text}`}>
                  {config.icon}
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-medium">{config.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 ml-auto text-gray-400">
          <span>✅ {availableCount}</span>
          <span>❓ {conditionalCount}</span>
          <span>❌ {unavailableCount}</span>
        </div>
      </div>

      {!readOnly && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          💡 Klik sel untuk ubah status. Klik header hari/jam untuk toggle seluruh baris/kolom.
        </p>
      )}
    </div>
  );
};
