import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { eventsService, SchoolEvent } from '../lib/services/events';
import { apiClient } from '../lib/api';

// ── Category colors ──
const CATEGORY_COLORS: Record<string, string> = {
  holiday:             '#EF4444',
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
  // Pad before first day
  for (let i = 0; i < firstDay; i++) {
    // padding
  }
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

// ── Main Print Component ──
export const PrintAcademicCalendar = () => {
  const [params] = useSearchParams();
  const academicYear = params.get('year') || '2025/2026';
  const mode = params.get('mode') || 'full'; // ganjil, genap, full

  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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

  // Auto print after load
  useEffect(() => {
    if (!loading && events !== undefined) {
      const timeout = setTimeout(() => window.print(), 800);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Parse academic year
  const [startYearNum, endYearNum] = useMemo(() => {
    const parts = academicYear.split('/').map(Number);
    return [parts[0] || 2025, parts[1] || 2026];
  }, [academicYear]);

  // Determine months to show
  const months = useMemo(() => {
    if (mode === 'ganjil') {
      // July to December of start year
      return Array.from({ length: 6 }, (_, i) => ({ year: startYearNum, month: 6 + i })); // 6=July
    }
    if (mode === 'genap') {
      // January to June of end year
      return Array.from({ length: 6 }, (_, i) => ({ year: endYearNum, month: i })); // 0=January
    }
    // Full year: July of start year to June of end year
    const m: { year: number; month: number }[] = [];
    for (let i = 6; i < 12; i++) m.push({ year: startYearNum, month: i });
    for (let i = 0; i < 6; i++) m.push({ year: endYearNum, month: i });
    return m;
  }, [mode, startYearNum, endYearNum]);

  // Map events by date for coloring
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
    return map;
  }, [events]);

  // Holiday dates set for HE calculation
  const holidayDates = useMemo(() => {
    const s = new Set<string>();
    events.forEach((ev) => {
      if (['holiday', 'semester_ganjil', 'semester_genap'].includes(ev.category)) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; }
          .no-print { display: none !important; }
        }
        .print-calendar * { font-family: 'Arial', 'Helvetica', sans-serif; }
        .mini-cal-table { border-collapse: collapse; width: 100%; }
        .mini-cal-table th, .mini-cal-table td { font-size: 7.5pt; text-align: center; padding: 1px; width: 14.28%; height: 16px; }
        .mini-cal-table th { font-weight: 700; font-size: 6.5pt; background: #166534; color: white; }
        .mini-cal-month-header { background: #fef08a; font-weight: 700; font-size: 8pt; text-align: center; padding: 2px; }
        .event-table { border-collapse: collapse; width: 100%; font-size: 7pt; }
        .event-table th { background: #166534; color: white; font-weight: 700; font-size: 7pt; padding: 2px 4px; border: 1px solid #333; }
        .event-table td { padding: 1.5px 4px; border: 1px solid #aaa; vertical-align: top; }
      `}</style>

      {/* Print/Back buttons */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          🖨️ Cetak
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium shadow-lg hover:bg-gray-700 transition-colors"
        >
          ✕ Tutup
        </button>
      </div>

      <div className="print-calendar bg-white min-h-screen" style={{ padding: '8mm' }}>
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

            // Build grid
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
