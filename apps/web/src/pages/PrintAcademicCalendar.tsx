import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { eventsService, SchoolEvent } from '../lib/services/events';
import { apiClient } from '../lib/api';

// ── Category colors ──
const CATEGORY_COLORS: Record<string, string> = {
  holiday:             '#EF4444',
  cuti_bersama:        '#F43F5E',
  semester_ganjil:     '#F97316',
  semester_genap:      '#FBBF24',
  first_day:           '#22C55E',
  orientation:         '#14B8A6',
  exam_sumatif:        '#3B82F6',
  exam_madrasah:       '#6366F1',
  exam_other:          '#8B5CF6',
  report_filling:      '#06B6D4',
  report_distribution: '#EC4899',
  general:             '#6B7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  holiday:             'Hari Libur Umum',
  cuti_bersama:        'Libur Cuti Bersama',
  semester_ganjil:     'Libur Semester Ganjil',
  semester_genap:      'Libur Semester Genap',
  first_day:           'Hari Pertama Masuk',
  orientation:         'Masa Orientasi Siswa Baru',
  exam_sumatif:        'Asesmen Sumatif',
  exam_madrasah:       'Ujian Madrasah',
  exam_other:          'Ujian Lainnya',
  report_filling:      'Pengisian Raport & Class Meeting',
  report_distribution: 'Penyerahan Raport',
  general:             'Umum',
};

const HOLIDAY_CATEGORIES = new Set(['holiday', 'cuti_bersama', 'semester_ganjil', 'semester_genap']);

// ── Date Helpers ──
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_HEADERS = ['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function fmt(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

function formatDateRange(ev: SchoolEvent): string {
  const s = ev.eventDate.split('-');
  const start = `${parseInt(s[2])} ${MONTH_SHORT[parseInt(s[1]) - 1]} ${s[0]}`;
  if (ev.endDate && ev.endDate !== ev.eventDate) {
    const e = ev.endDate.split('-');
    const end = `${parseInt(e[2])} ${MONTH_SHORT[parseInt(e[1]) - 1]} ${e[0]}`;
    return `${start} – ${end}`;
  }
  return start;
}

// Count effective days (Mon-Sat, excluding holidays) for a given month
function countEffectiveDays(year: number, month: number, holidayDates: Set<string>): number {
  const total = daysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) continue; // Skip Sundays
    const key = fmt(year, month, d);
    if (holidayDates.has(key)) continue; // Skip holidays
    count++;
  }
  return count;
}

// Count HE per week rows for mini calendar
function countWeeklyHE(year: number, month: number, holidayDates: Set<string>): number[] {
  const total = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const weeks: number[] = [];
  let weekHE = 0;
  for (let i = 0; i < firstDay; i++) { /* padding */ }
  let cellIndex = firstDay;
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    const key = fmt(year, month, d);
    if (dayOfWeek !== 0 && !holidayDates.has(key)) weekHE++;
    cellIndex++;
    if (dayOfWeek === 6 || d === total) {
      weeks.push(weekHE);
      weekHE = 0;
    }
  }
  return weeks;
}

// ── Paper Size Config ──
type PaperSize = 'a4' | 'legal' | 'folio';
type Orientation = 'landscape' | 'portrait';
type MarginSize = 'normal' | 'narrow' | 'minimal';

const PAPER_SIZES: Record<PaperSize, { label: string; desc: string; cssLandscape: string; cssPortrait: string; widthMm: number; heightMm: number }> = {
  a4:    { label: 'A4',             desc: '210 × 297 mm',     cssLandscape: 'A4 landscape',         cssPortrait: 'A4 portrait',         widthMm: 297, heightMm: 210 },
  legal: { label: 'Legal',          desc: '216 × 356 mm',     cssLandscape: 'legal landscape',      cssPortrait: 'legal portrait',      widthMm: 356, heightMm: 216 },
  folio: { label: 'Folio',          desc: '8.5 × 13 in',      cssLandscape: '13in 8.5in',           cssPortrait: '8.5in 13in',          widthMm: 330, heightMm: 216 },
};

const MARGIN_VALUES: Record<MarginSize, { label: string; value: string; mm: number }> = {
  normal:  { label: 'Normal',  value: '10mm', mm: 10 },
  narrow:  { label: 'Sempit',  value: '5mm',  mm: 5  },
  minimal: { label: 'Minimal', value: '3mm',  mm: 3  },
};

const SCALE_OPTIONS = [
  { label: 'Auto (Fit 1 Page)', value: 'auto' },
  { label: '100%', value: '100' },
  { label: '95%',  value: '95' },
  { label: '90%',  value: '90' },
  { label: '85%',  value: '85' },
  { label: '80%',  value: '80' },
  { label: '75%',  value: '75' },
  { label: '70%',  value: '70' },
];

// ── Main Print Component ──
export const PrintAcademicCalendar = () => {
  const [params] = useSearchParams();
  const academicYear = params.get('year') || '2025/2026';
  const mode = params.get('mode') || 'full'; // ganjil, genap, full

  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // ── Print Settings State ──
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [scaleMode, setScaleMode] = useState<string>('auto');
  const [marginSize, setMarginSize] = useState<MarginSize>('narrow');
  const [computedScale, setComputedScale] = useState(1);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evts, sets] = await Promise.all([
          eventsService.getAll(academicYear),
          apiClient<{ key: string; value: string }[]>('/settings'),
        ]);
        setEvents(evts);
        const sMap: Record<string, string> = {};
        sets.forEach((s) => { if (s.value) sMap[s.key] = s.value; });
        setSettings(sMap);
      } catch (err) {
        console.error('Failed to load print data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [academicYear]);

  // ── Compute Scale ──
  const calculateScale = useCallback(() => {
    if (scaleMode !== 'auto') {
      setComputedScale(parseInt(scaleMode) / 100);
      return;
    }

    // Auto-fit: measure content height vs available page height
    if (!contentRef.current) { setComputedScale(1); return; }

    const contentHeight = contentRef.current.scrollHeight;
    const contentWidth = contentRef.current.scrollWidth;

    const paper = PAPER_SIZES[paperSize];
    const margin = MARGIN_VALUES[marginSize];

    // Available dimensions in pixels (96 DPI for screen)
    const pxPerMm = 96 / 25.4;
    
    // Add a safety buffer for browser default print headers/footers
    const safeOffsetMm = 15; 
    
    const pageW = (orientation === 'landscape' ? paper.widthMm : paper.heightMm) - margin.mm * 2;
    const pageH = (orientation === 'landscape' ? paper.heightMm : paper.widthMm) - margin.mm * 2 - safeOffsetMm;
    const availW = pageW * pxPerMm;
    const availH = pageH * pxPerMm;

    const scaleW = availW / contentWidth;
    const scaleH = availH / contentHeight;
    const optimalScale = Math.min(scaleW, scaleH, 1); // never exceed 100%

    // Subract a tiny bit more just to be absolutely sure we don't trigger a page break overflow
    setComputedScale(Math.max(0.55, optimalScale * 0.98)); // minimum 55%
  }, [scaleMode, paperSize, orientation, marginSize]);

  // Recalculate on settings change and after data loads
  useEffect(() => {
    if (!loading) {
      // Small delay to allow DOM to update
      const timeout = setTimeout(calculateScale, 100);
      return () => clearTimeout(timeout);
    }
  }, [loading, calculateScale, paperSize, orientation, marginSize, scaleMode, events]);

  // Parse academic year
  const [startYearNum, endYearNum] = useMemo(() => {
    const parts = academicYear.split('/').map(Number);
    return [parts[0] || 2025, parts[1] || 2026];
  }, [academicYear]);

  // Determine months to show
  const months = useMemo(() => {
    if (mode === 'ganjil') {
      return Array.from({ length: 6 }, (_, i) => ({ year: startYearNum, month: 6 + i }));
    }
    if (mode === 'genap') {
      return Array.from({ length: 6 }, (_, i) => ({ year: endYearNum, month: i }));
    }
    const m: { year: number; month: number }[] = [];
    for (let i = 6; i < 12; i++) m.push({ year: startYearNum, month: i });
    for (let i = 0; i < 6; i++) m.push({ year: endYearNum, month: i });
    return m;
  }, [mode, startYearNum, endYearNum]);

  // Map events by date for coloring (with holiday priority)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, SchoolEvent[]>();
    events.forEach((ev) => {
      const [sy, sm, sd] = ev.eventDate.split('-').map(Number);
      const startD = new Date(sy, sm - 1, sd);
      const endD = ev.endDate ? (() => { const [ey, em, ed] = ev.endDate.split('-').map(Number); return new Date(ey, em - 1, ed); })() : startD;
      for (let curr = new Date(startD); curr <= endD; curr.setDate(curr.getDate() + 1)) {
        const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    });
    map.forEach((dayEvents, key) => {
      const hasHoliday = dayEvents.some((e) => HOLIDAY_CATEGORIES.has(e.category));
      if (hasHoliday) {
        map.set(key, dayEvents.filter((e) => HOLIDAY_CATEGORIES.has(e.category)));
      }
    });
    return map;
  }, [events]);

  // Holiday dates set for HE calculation
  const holidayDates = useMemo(() => {
    const s = new Set<string>();
    events.forEach((ev) => {
      if (['holiday', 'cuti_bersama', 'semester_ganjil', 'semester_genap'].includes(ev.category)) {
        const [sy, sm, sd] = ev.eventDate.split('-').map(Number);
        const startD = new Date(sy, sm - 1, sd);
        const endD = ev.endDate ? (() => { const [ey, em, ed] = ev.endDate.split('-').map(Number); return new Date(ey, em - 1, ed); })() : startD;
        for (let curr = new Date(startD); curr <= endD; curr.setDate(curr.getDate() + 1)) {
          s.add(`${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`);
        }
      }
    });
    return s;
  }, [events]);

  // Split events into semesters
  const semesterGanjilEvents = useMemo(() => {
    return events.filter((ev) => {
      const [, m] = ev.eventDate.split('-').map(Number);
      const [y] = ev.eventDate.split('-').map(Number);
      return (y === startYearNum && m >= 7) || (y === startYearNum && m === 12);
    }).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [events, startYearNum]);

  const semesterGenapEvents = useMemo(() => {
    return events.filter((ev) => {
      const [y, m] = ev.eventDate.split('-').map(Number);
      return y === endYearNum && m >= 1 && m <= 6;
    }).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [events, endYearNum]);

  const schoolName = settings['school_name'] || 'MAN 2 LOMBOK TIMUR';
  const principalName = settings['principal_name'] || '';
  const principalNip = settings['principal_nip'] || '';
  const districtCity = settings['district_city'] || 'Lombok Timur';

  const modeLabel = mode === 'ganjil' ? 'SEMESTER GANJIL' : mode === 'genap' ? 'SEMESTER GENAP' : '';
  const titleStr = `KALENDER PENDIDIKAN ${schoolName.toUpperCase()} TAHUN AJARAN ${academicYear}`;

  // ── Dynamic CSS ──
  const pageCss = useMemo(() => {
    const paper = PAPER_SIZES[paperSize];
    const margin = MARGIN_VALUES[marginSize];
    const sizeValue = orientation === 'landscape' ? paper.cssLandscape : paper.cssPortrait;

    return `
      @media print {
        @page { size: ${sizeValue}; margin: ${margin.value}; }
        html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0 !important; padding: 0 !important; }
        .no-print { display: none !important; }
        .print-container {
          zoom: ${computedScale} !important; /* The magic bullet for Chrome/Edge */
          -moz-transform: scale(${computedScale}) !important; /* Fallback for Firefox */
          -moz-transform-origin: top left !important;
          width: ${100 / computedScale}% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
      .print-calendar * { font-family: 'Arial', 'Helvetica', sans-serif; }
      .mini-cal-table { border-collapse: collapse; width: 100%; }
      .mini-cal-table th, .mini-cal-table td { font-size: 7.5pt; text-align: center; padding: 1px; width: 14.28%; height: 16px; }
      .mini-cal-table th { font-weight: 700; font-size: 6.5pt; background: #166534; color: white; }
      .mini-cal-month-header { background: #fef08a; font-weight: 700; font-size: 8pt; text-align: center; padding: 2px; }
      .event-table { border-collapse: collapse; width: 100%; font-size: 7pt; }
      .event-table th { background: #166534; color: white; font-weight: 700; font-size: 7pt; padding: 2px 4px; border: 1px solid #333; }
      .event-table td { padding: 1.5px 4px; border: 1px solid #aaa; vertical-align: top; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    `;
  }, [paperSize, orientation, marginSize, computedScale]);

  // Scale percentage for display
  const scalePercent = Math.round(computedScale * 100);

  const handlePrint = () => {
    // Recalculate before printing
    calculateScale();
    setTimeout(() => window.print(), 200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <style>{pageCss}</style>

      {/* ── Settings Bar (hidden on print) ── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg" style={{ animation: 'fadeIn .25s ease-out' }}>
        {/* Collapse toggle */}
        <button
          onClick={() => setSettingsCollapsed(!settingsCollapsed)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-green-700 to-green-800 text-white text-sm font-semibold hover:from-green-800 hover:to-green-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            📐 Pengaturan Cetak Kalender
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: settingsCollapsed ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {!settingsCollapsed && (
          <div className="px-4 py-4" style={{ animation: 'fadeIn .2s ease-out' }}>
            <div className="max-w-5xl mx-auto">
              {/* Row 1: Paper Size */}
              <div className="flex flex-wrap items-center gap-6 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ukuran Kertas</label>
                  <div className="flex gap-1.5">
                    {(Object.keys(PAPER_SIZES) as PaperSize[]).map((key) => {
                      const p = PAPER_SIZES[key];
                      const isActive = paperSize === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setPaperSize(key)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                            isActive
                              ? 'bg-green-700 text-white border-green-700 shadow-md shadow-green-700/20'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:bg-green-50'
                          }`}
                        >
                          <div>{p.label}</div>
                          <div className={`text-[9px] font-medium mt-0.5 ${isActive ? 'text-green-200' : 'text-gray-400'}`}>{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Orientasi</label>
                  <div className="flex gap-1.5">
                    {([['landscape', '↔ Landscape'], ['portrait', '↕ Portrait']] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setOrientation(key)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                          orientation === key
                            ? 'bg-green-700 text-white border-green-700 shadow-md shadow-green-700/20'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Margin</label>
                  <div className="flex gap-1.5">
                    {(Object.keys(MARGIN_VALUES) as MarginSize[]).map((key) => {
                      const m = MARGIN_VALUES[key];
                      const isActive = marginSize === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setMarginSize(key)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
                            isActive
                              ? 'bg-green-700 text-white border-green-700 shadow-md shadow-green-700/20'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:bg-green-50'
                          }`}
                        >
                          {m.label}
                          <div className={`text-[9px] font-medium mt-0.5 ${isActive ? 'text-green-200' : 'text-gray-400'}`}>{m.value}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Skala</label>
                  <select
                    value={scaleMode}
                    onChange={(e) => setScaleMode(e.target.value)}
                    className="px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer min-w-[150px]"
                  >
                    {SCALE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Info + Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {PAPER_SIZES[paperSize].label} {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
                  </span>
                  <span>•</span>
                  <span>Margin: {MARGIN_VALUES[marginSize].value}</span>
                  <span>•</span>
                  <span className={`font-bold ${scalePercent < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                    Skala: {scalePercent}%
                    {scaleMode === 'auto' && ' (Auto)'}
                  </span>
                  {scalePercent < 75 && (
                    <span className="text-amber-500 font-medium">⚠️ Teks mungkin terlalu kecil</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.close()}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    ✕ Tutup
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-6 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                    🖨️ Cetak Sekarang
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Print Content ── */}
      <div
        ref={contentRef}
        className="print-calendar print-container bg-white"
        style={{
          padding: MARGIN_VALUES[marginSize].value,
          paddingTop: settingsCollapsed ? '44px' : '180px',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: '12pt', fontWeight: 700, color: '#166534', letterSpacing: 1 }}>
            {titleStr}
          </div>
          {modeLabel && (
            <div style={{ fontSize: '10pt', fontWeight: 600, color: '#333', marginTop: 2 }}>
              {modeLabel}
            </div>
          )}
        </div>

        {/* Mini Calendars Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mode === 'full' ? 4 : 3}, 1fr)`, gap: 6, marginBottom: 10 }}>
          {months.map(({ year, month }, idx) => {
            const total = daysInMonth(year, month);
            const start = firstDayOfMonth(year, month);
            const weeklyHE = countWeeklyHE(year, month, holidayDates);
            const monthHE = countEffectiveDays(year, month, holidayDates);

            const cells: (number | null)[] = [];
            for (let i = 0; i < start; i++) cells.push(null);
            for (let d = 1; d <= total; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);

            const weeks: (number | null)[][] = [];
            for (let i = 0; i < cells.length; i += 7) {
              weeks.push(cells.slice(i, i + 7));
            }

            return (
              <div key={idx} style={{ border: '1px solid #999', borderRadius: 2, overflow: 'hidden' }}>
                <div className="mini-cal-month-header">
                  {MONTH_NAMES_ID[month]} {year}
                </div>
                <table className="mini-cal-table">
                  <thead>
                    <tr>
                      {DAY_HEADERS.map((d, i) => (
                        <th key={d} style={{ color: i === 0 ? '#fca5a5' : 'white' }}>{d}</th>
                      ))}
                      <th style={{ width: '10%', fontSize: '6pt' }}>HE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week, wIdx) => (
                      <tr key={wIdx}>
                        {week.map((day, dIdx) => {
                          if (day === null) return <td key={dIdx} />;
                          const dateStr = fmt(year, month, day);
                          const dayOfWeek = new Date(year, month, day).getDay();
                          const dayEvents = eventsByDate.get(dateStr) || [];
                          const primaryEvent = dayEvents[0];
                          const bgColor = primaryEvent
                            ? (primaryEvent.color || CATEGORY_COLORS[primaryEvent.category] || '#6B7280')
                            : dayOfWeek === 0 ? '#fee2e2' : dayOfWeek === 6 ? '#fef9c3' : 'transparent';
                          const textColor = primaryEvent
                            ? 'white'
                            : dayOfWeek === 0 ? '#dc2626' : '#333';

                          return (
                            <td
                              key={dIdx}
                              style={{
                                backgroundColor: bgColor,
                                color: textColor,
                                fontWeight: primaryEvent ? 700 : dayOfWeek === 0 || dayOfWeek === 6 ? 600 : 400,
                                borderRadius: 1,
                              }}
                              title={dayEvents.map((e) => e.title).join(', ')}
                            >
                              {day}
                            </td>
                          );
                        })}
                        <td style={{ fontSize: '6pt', fontWeight: 600, color: '#166534', background: '#f0fdf4' }}>
                          {weeklyHE[wIdx] ?? ''}
                        </td>
                      </tr>
                    ))}
                    {/* Monthly HE total */}
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'right', fontSize: '6pt', fontWeight: 700, paddingRight: 4 }}>
                        HE :
                      </td>
                      <td style={{ fontSize: '6.5pt', fontWeight: 700, color: '#166534', background: '#dcfce7' }}>
                        {monthHE}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Event Tables */}
        {mode === 'full' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* Semester Ganjil */}
            <div>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '9pt', marginBottom: 4, color: '#166534' }}>
                SEMESTER GANJIL
              </div>
              <table className="event-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>TANGGAL</th>
                    <th>KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterGanjilEvents.length === 0 ? (
                    <tr><td colSpan={2} style={{ textAlign: 'center', fontStyle: 'italic', color: '#999', padding: 8 }}>Belum ada kegiatan</td></tr>
                  ) : (
                    semesterGanjilEvents.map((ev, i) => (
                      <tr key={ev.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDateRange(ev)}</td>
                        <td>{ev.title}{ev.description ? ` — ${ev.description}` : ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Semester Genap */}
            <div>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '9pt', marginBottom: 4, color: '#166534' }}>
                SEMESTER GENAP
              </div>
              <table className="event-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>TANGGAL</th>
                    <th>KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterGenapEvents.length === 0 ? (
                    <tr><td colSpan={2} style={{ textAlign: 'center', fontStyle: 'italic', color: '#999', padding: 8 }}>Belum ada kegiatan</td></tr>
                  ) : (
                    semesterGenapEvents.map((ev, i) => (
                      <tr key={ev.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDateRange(ev)}</td>
                        <td>{ev.title}{ev.description ? ` — ${ev.description}` : ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Single semester mode
          <div style={{ marginBottom: 12 }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '9pt', marginBottom: 4, color: '#166534' }}>
              {mode === 'ganjil' ? 'SEMESTER GANJIL' : 'SEMESTER GENAP'}
            </div>
            <table className="event-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>TANGGAL</th>
                  <th>KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                {(mode === 'ganjil' ? semesterGanjilEvents : semesterGenapEvents).length === 0 ? (
                  <tr><td colSpan={2} style={{ textAlign: 'center', fontStyle: 'italic', color: '#999', padding: 8 }}>Belum ada kegiatan</td></tr>
                ) : (
                  (mode === 'ganjil' ? semesterGanjilEvents : semesterGenapEvents).map((ev, i) => (
                    <tr key={ev.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDateRange(ev)}</td>
                      <td>{ev.title}{ev.description ? ` — ${ev.description}` : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Color Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '6.5pt' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: CATEGORY_COLORS[key] }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Footer — Signature */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingRight: 40 }}>
          <div style={{ textAlign: 'center', fontSize: '8pt' }}>
            <div>{districtCity}, ____________ {startYearNum}</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>Kepala Madrasah</div>
            <div style={{ height: 50 }} />
            {principalName && (
              <>
                <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{principalName}</div>
                {principalNip && <div>NIP. {principalNip}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
