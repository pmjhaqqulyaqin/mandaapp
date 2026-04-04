import { useState, useMemo, useEffect, useRef } from 'react';
import { useEvents } from '../hooks/api/useEvents';
import { useSiteSettings } from '../hooks/api/useSettings';
import { SchoolEvent } from '../lib/services/events';
import { toast } from 'sonner';

// ── Category Config ──
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

// Categories that take priority — when present on a date, other events are hidden
const HOLIDAY_CATEGORIES = new Set(['holiday', 'cuti_bersama', 'semester_ganjil', 'semester_genap']);

const CATEGORY_KEYS = Object.keys(EVENT_CATEGORIES);

function getCategoryColor(category: string, customColor?: string | null) {
  if (customColor) return customColor;
  return EVENT_CATEGORIES[category]?.color || '#6B7280';
}

// ── Date Helpers ──
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── Main Component ──
export const DashboardCalendar = () => {
  const { get } = useSiteSettings();

  // Academic year from settings
  const activeAcademicYear = get('active_academic_year', '2025/2026');
  const [selectedYear, setSelectedYear] = useState(activeAcademicYear);

  useEffect(() => {
    if (activeAcademicYear) setSelectedYear(activeAcademicYear);
  }, [activeAcademicYear]);

  const { queryAll, queryYears, createMutation, updateMutation, deleteMutation } = useEvents(selectedYear);
  const events: SchoolEvent[] = queryAll.data || [];

  // Generate year options
  const yearOptions = useMemo(() => {
    const fromDb = queryYears.data || [];
    const base = new Set([activeAcademicYear, ...fromDb]);
    // Also add a couple surrounding years
    const [startY] = activeAcademicYear.split('/').map(Number);
    if (startY) {
      base.add(`${startY - 1}/${startY}`);
      base.add(`${startY + 1}/${startY + 2}`);
    }
    return Array.from(base).filter(Boolean).sort();
  }, [activeAcademicYear, queryYears.data]);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORY_KEYS.map((k) => [k, true]))
  );

  // When academic year changes, jump to July of that year (start of tahun ajaran)
  useEffect(() => {
    const [startY] = selectedYear.split('/').map(Number);
    if (startY) {
      // If it's the active year and we're within that academic year range, stay on today
      if (selectedYear === activeAcademicYear) {
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();
        const [, endY] = selectedYear.split('/').map(Number);
        const isWithinAcademicYear =
          (todayYear === startY && todayMonth >= 6) || // Jul-Dec of start year
          (todayYear === endY && todayMonth <= 5);      // Jan-Jun of end year
        if (isWithinAcademicYear) {
          setViewYear(todayYear);
          setViewMonth(todayMonth);
          return;
        }
      }
      // Otherwise jump to July of the start year
      setViewYear(startY);
      setViewMonth(6); // July = index 6
    }
  }, [selectedYear]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    endDate: '',
    category: 'general',
  });

  // Print dropdown
  const [printDropdownOpen, setPrintDropdownOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (printRef.current && !printRef.current.contains(e.target as Node)) {
        setPrintDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter events by visible month + category
  const visibleEvents = useMemo(() => {
    return events.filter((e) => {
      if (!categoryFilters[e.category]) return false;
      return true;
    });
  }, [events, categoryFilters]);

  // Group events by date for the calendar grid
  // Holiday priority: if a date has holiday/cuti events, only show those
  const eventsByDate = useMemo(() => {
    const map = new Map<string, SchoolEvent[]>();
    visibleEvents.forEach((ev) => {
      const start = parseDate(ev.eventDate);
      const end = ev.endDate ? parseDate(ev.endDate) : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = fmt(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    });
    // Apply holiday priority: filter out non-holiday events on holiday dates
    map.forEach((dayEvents, key) => {
      const hasHoliday = dayEvents.some((e) => HOLIDAY_CATEGORIES.has(e.category));
      if (hasHoliday) {
        map.set(key, dayEvents.filter((e) => HOLIDAY_CATEGORIES.has(e.category)));
      }
    });
    return map;
  }, [visibleEvents]);

  // Upcoming events (next 5 from today)
  const upcomingEvents = useMemo(() => {
    const todayStr = fmt(today);
    return events
      .filter((e) => e.eventDate >= todayStr)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 5);
  }, [events]);

  // Navigation
  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // Open modal
  const openAddModal = (date: string) => {
    setEditingEvent(null);
    setFormData({ title: '', description: '', eventDate: date, endDate: '', category: 'general' });
    setModalOpen(true);
  };
  const openEditModal = (ev: SchoolEvent) => {
    setEditingEvent(ev);
    setFormData({
      title: ev.title,
      description: ev.description || '',
      eventDate: ev.eventDate,
      endDate: ev.endDate || '',
      category: ev.category,
    });
    setModalOpen(true);
  };

  // Save
  const handleSave = async () => {
    if (!formData.title.trim()) { toast.error('Nama kegiatan wajib diisi'); return; }
    try {
      if (editingEvent) {
        await updateMutation.mutateAsync({ id: editingEvent.id, data: { ...formData, academicYear: selectedYear } });
        toast.success('Kegiatan berhasil diperbarui');
      } else {
        await createMutation.mutateAsync({ ...formData, academicYear: selectedYear });
        toast.success('Kegiatan berhasil ditambahkan');
      }
      setModalOpen(false);
    } catch {
      toast.error('Gagal menyimpan kegiatan');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!window.confirm('Hapus kegiatan ini?')) return;
    try {
      await deleteMutation.mutateAsync(editingEvent.id);
      toast.success('Kegiatan berhasil dihapus');
      setModalOpen(false);
    } catch {
      toast.error('Gagal menghapus kegiatan');
    }
  };

  // Print navigation
  const handlePrint = (mode: 'ganjil' | 'genap' | 'full') => {
    setPrintDropdownOpen(false);
    const url = `/dashboard/print-calendar?year=${encodeURIComponent(selectedYear)}&mode=${mode}`;
    window.open(url, '_blank');
  };

  // Build calendar grid
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const todayStr = fmt(today);

  const gridCells: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  // Previous month padding
  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevDays = daysInMonth(prevYear, prevMonth);
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    gridCells.push({ date: fmt(new Date(prevYear, prevMonth, d)), day: d, isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= totalDays; d++) {
    gridCells.push({ date: fmt(new Date(viewYear, viewMonth, d)), day: d, isCurrentMonth: true });
  }
  // Next month padding
  const remaining = 7 - (gridCells.length % 7);
  if (remaining < 7) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remaining; d++) {
      gridCells.push({ date: fmt(new Date(nextYear, nextMonth, d)), day: d, isCurrentMonth: false });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary dark:text-text-darkPrimary">
            📅 Jadwal Kegiatan Madrasah
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Kelola kalender pendidikan dan kegiatan madrasah
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-sm font-medium text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>TA {y}</option>
            ))}
          </select>
          {/* Print Button */}
          <div className="relative" ref={printRef}>
            <button
              onClick={() => setPrintDropdownOpen(!printDropdownOpen)}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
              Cetak Kalender
            </button>
            {printDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-[#111] border border-border-light dark:border-border-dark rounded-lg shadow-xl z-50 py-1 overflow-hidden" style={{ animation: 'fadeIn .15s ease-out' }}>
                <button onClick={() => handlePrint('ganjil')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  Cetak Semester Ganjil (Jul–Des)
                </button>
                <button onClick={() => handlePrint('genap')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  Cetak Semester Genap (Jan–Jun)
                </button>
                <div className="h-px bg-border-light dark:bg-border-dark mx-2" />
                <button onClick={() => handlePrint('full')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-text-primary dark:text-text-darkPrimary flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  Cetak 1 Tahun Ajaran Penuh
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-heading font-bold text-text-primary dark:text-text-darkPrimary">
                  {MONTH_NAMES_ID[viewMonth]} {viewYear}
                </h2>
                <div className="flex items-center gap-1">
                  <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
                <button onClick={goToday} className="px-3 py-1 rounded-md text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                  Hari ini
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7">
              {DAY_NAMES_SHORT.map((d, i) => (
                <div key={d} className={`text-center py-2 text-xs font-bold uppercase tracking-wider border-b border-border-light dark:border-border-dark ${i === 0 ? 'text-red-500' : 'text-text-secondary'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7">
              {gridCells.map((cell, idx) => {
                const dayEvents = eventsByDate.get(cell.date) || [];
                const isToday = cell.date === todayStr;
                const isSunday = new Date(cell.date).getDay() === 0;
                return (
                  <div
                    key={idx}
                    onClick={() => cell.isCurrentMonth && openAddModal(cell.date)}
                    className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border-light dark:border-border-dark p-1 sm:p-1.5 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors relative group ${
                      !cell.isCurrentMonth ? 'opacity-30 bg-gray-50/50 dark:bg-white/[0.02]' : ''
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-primary text-white' : isSunday ? 'text-red-500' : 'text-text-primary dark:text-text-darkPrimary'
                    }`}>
                      {cell.day}
                    </div>
                    {/* Event Pills */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev, evIdx) => (
                        <button
                          key={ev.id + evIdx}
                          onClick={(e) => { e.stopPropagation(); openEditModal(ev); }}
                          className="w-full text-left text-[10px] sm:text-[11px] leading-tight font-medium px-1.5 py-0.5 rounded truncate block transition-opacity hover:opacity-80"
                          style={{ backgroundColor: getCategoryColor(ev.category, ev.color) + '22', color: getCategoryColor(ev.category, ev.color), borderLeft: `3px solid ${getCategoryColor(ev.category, ev.color)}` }}
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-text-secondary font-medium pl-1">+{dayEvents.length - 3} lainnya</span>
                      )}
                    </div>
                    {/* Hover plus icon */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-primary text-lg leading-none">+</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-72 xl:w-80 shrink-0 space-y-4">
          {/* Event Filters */}
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark p-4">
            <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Filter Kategori
            </h3>
            <div className="space-y-1.5">
              {CATEGORY_KEYS.map((key) => {
                const cat = EVENT_CATEGORIES[key];
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 dark:hover:bg-white/5 px-1.5 rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={categoryFilters[key]}
                      onChange={() => setCategoryFilters((f) => ({ ...f, [key]: !f[key] }))}
                      className="sr-only"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-colors shrink-0"
                      style={{
                        borderColor: cat.color,
                        backgroundColor: categoryFilters[key] ? cat.color : 'transparent',
                      }}
                    >
                      {categoryFilters[key] && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </span>
                    <span className="text-xs text-text-primary dark:text-text-darkPrimary">{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark p-4">
            <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary mb-3 flex items-center gap-2">
              📋 Agenda Mendatang
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-text-secondary py-2">Belum ada agenda mendatang</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const d = parseDate(ev.eventDate);
                  const cat = EVENT_CATEGORIES[ev.category] || EVENT_CATEGORIES.general;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => openEditModal(ev)}
                      className="w-full text-left flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2"
                    >
                      <div className="text-center shrink-0 w-10">
                        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                          {MONTH_NAMES_ID[d.getMonth()].slice(0, 3)}
                        </div>
                        <div className="text-lg font-bold text-text-primary dark:text-text-darkPrimary leading-tight">
                          {d.getDate()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary truncate">{ev.title}</div>
                        <div className="text-[10px] text-text-secondary">{cat.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark p-4">
            <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary mb-3">📊 Statistik TA {selectedYear}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-primary">{events.length}</div>
                <div className="text-[10px] text-text-secondary">Total Kegiatan</div>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-red-500">{events.filter((e) => e.category === 'holiday').length}</div>
                <div className="text-[10px] text-text-secondary">Hari Libur</div>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-blue-500">{events.filter((e) => e.category.startsWith('exam')).length}</div>
                <div className="text-[10px] text-text-secondary">Ujian/Asesmen</div>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-green-500">{events.filter((e) => !['holiday', 'semester_ganjil', 'semester_genap'].includes(e.category)).length}</div>
                <div className="text-[10px] text-text-secondary">Kegiatan Aktif</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-[#111] rounded-xl border border-border-light dark:border-border-dark shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="p-5">
              <h3 id="modal-title" className="text-base font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-4">
                {editingEvent ? '✏️ Edit Kegiatan' : '➕ Tambah Kegiatan'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Nama Kegiatan *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Masukkan nama kegiatan"
                    className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Keterangan</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Keterangan tambahan (opsional)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-y"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Tanggal Mulai *</label>
                    <input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData((f) => ({ ...f, eventDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  >
                    {CATEGORY_KEYS.map((k) => (
                      <option key={k} value={k}>{EVENT_CATEGORIES[k].emoji} {EVENT_CATEGORIES[k].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border-light dark:border-border-dark">
                {editingEvent ? (
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    🗑️ Hapus
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {editingEvent ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {queryAll.isLoading && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
};
