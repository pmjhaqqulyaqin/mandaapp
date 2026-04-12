import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEvents } from '../../../hooks/api/useEvents';

const EVENT_CATEGORIES: Record<string, { label: string; color: string; emoji: string }> = {
  holiday:             { label: 'Hari Libur Umum',                    color: '#EF4444', emoji: '🔴' },
  cuti_bersama:        { label: 'Libur Cuti Bersama',                 color: '#F43F5E', emoji: '🔻' },
  semester_ganjil:     { label: 'Libur Semester Ganjil',              color: '#F97316', emoji: '🟠' },
  semester_genap:      { label: 'Libur Semester Genap',               color: '#FBBF24', emoji: '🟡' },
  first_day:           { label: 'Hari Pertama Masuk',                 color: '#22C55E', emoji: '🟢' },
  orientation:         { label: 'Masa Orientasi Siswa Baru',          color: '#14B8A6', emoji: '🩵' },
  exam_sumatif:        { label: 'Asesmen Sumatif Ganjil/Genap',       color: '#3B82F6', emoji: '🔵' },
  exam_madrasah:       { label: 'Ujian Madrasah',                     color: '#6366F1', emoji: '🟣' },
  exam_other:          { label: 'Ujian Lainnya',                      color: '#8B5CF6', emoji: '💜' },
  report_filling:      { label: 'Pengisian Raport & Class Meeting',   color: '#06B6D4', emoji: '📝' },
  report_distribution: { label: 'Penyerahan Raport',                  color: '#EC4899', emoji: '🎓' },
  general:             { label: 'Umum',                               color: '#6B7280', emoji: '⚪' },
};

const HOLIDAY_CATEGORIES = new Set(['holiday', 'cuti_bersama', 'semester_ganjil', 'semester_genap']);

function getCategoryColor(category: string, customColor?: string | null) {
  if (customColor) return customColor;
  return EVENT_CATEGORIES[category]?.color || '#6B7280';
}

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function fmt(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

interface Props {
  value: string;
  onChange: (val: string) => void;
  tahunAjaran?: string;
  placeholder?: string;
  className?: string;
}

export const EventCalendarPicker = ({ value, onChange, tahunAjaran, placeholder = 'dd/mm/yyyy', className }: Props) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { queryAll } = useEvents(tahunAjaran);
  const events = queryAll.data || [];

  const initialDate = value ? parseDate(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value, open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    events.forEach(ev => {
      const start = parseDate(ev.eventDate);
      const end = ev.endDate ? parseDate(ev.endDate) : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = fmt(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    });
    // Holiday priority
    map.forEach((dayEvents, key) => {
      const hasHoliday = dayEvents.some(e => HOLIDAY_CATEGORIES.has(e.category));
      if (hasHoliday) map.set(key, dayEvents.filter(e => HOLIDAY_CATEGORIES.has(e.category)));
    });
    return map;
  }, [events]);

  const goPrev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const goNext = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const gridCells: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  
  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevDays = daysInMonth(prevYear, prevMonth);
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    gridCells.push({ date: fmt(new Date(prevYear, prevMonth, d)), day: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= totalDays; d++) {
    gridCells.push({ date: fmt(new Date(viewYear, viewMonth, d)), day: d, isCurrentMonth: true });
  }
  const remaining = 7 - (gridCells.length % 7);
  if (remaining < 7) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remaining; d++) {
      gridCells.push({ date: fmt(new Date(nextYear, nextMonth, d)), day: d, isCurrentMonth: false });
    }
  }

  const handleSelect = (dateStr: string) => {
    onChange(dateStr);
    setOpen(false);
  };

  const formattedValue = useMemo(() => {
    if (!value) return '';
    const d = parseDate(value);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }, [value]);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between cursor-pointer ${className}`}
      >
        <span className={formattedValue ? 'text-text-primary dark:text-text-darkPrimary' : 'text-gray-400'}>
          {formattedValue || placeholder}
        </span>
        <CalendarIcon size={16} className="text-gray-400" />
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark">
            <button type="button" onClick={goPrev} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-gray-500">
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs font-bold font-heading">
              {MONTH_NAMES_ID[viewMonth]} {viewYear}
            </div>
            <button type="button" onClick={goNext} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-gray-500">
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="p-2">
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES_SHORT.map((d, i) => (
                <div key={d} className={`text-center py-1 text-[10px] font-bold uppercase ${i === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {gridCells.map((cell, idx) => {
                const dayEvents = eventsByDate.get(cell.date) || [];
                const isSelected = cell.date === value;
                const isToday = cell.date === fmt(new Date());
                const isSunday = new Date(cell.date).getDay() === 0;

                // Priority style based on events
                let boxBg = 'transparent';
                let indicatorColors: string[] = [];
                
                dayEvents.forEach(ev => {
                  const color = getCategoryColor(ev.category, ev.color);
                  if (HOLIDAY_CATEGORIES.has(ev.category)) {
                    boxBg = color + '22'; // 22 is ~13% opacity
                  }
                  if (!indicatorColors.includes(color)) indicatorColors.push(color);
                });

                if (isSelected) boxBg = '#4F46E5'; // Indigo-600 background if selected

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => cell.isCurrentMonth && handleSelect(cell.date)}
                    className={`relative w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-colors
                      ${!cell.isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-white/5'}
                      ${isSelected ? 'text-white shadow-sm' : (isToday ? 'text-indigo-600 font-bold' : (isSunday ? 'text-red-500' : 'text-text-primary dark:text-text-darkPrimary'))}
                    `}
                    style={{ backgroundColor: isSelected ? '#4F46E5' : boxBg }}
                    title={dayEvents.map(e => e.title).join(', ')}
                  >
                    <span>{cell.day}</span>
                    
                    {/* Indicators */}
                    {dayEvents.length > 0 && !isSelected && (
                      <div className="absolute bottom-0.5 flex gap-0.5 max-w-full overflow-hidden px-0.5">
                        {indicatorColors.slice(0, 3).map((c, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[#0a0a0a] border-t border-border-light dark:border-border-dark p-2 text-[9px] text-gray-500">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Hari Libur
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500" /> Ujian / Asesmen
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" /> Kegiatan Lain
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
