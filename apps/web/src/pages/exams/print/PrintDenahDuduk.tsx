import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

/**
 * PrintDenahDuduk — Denah Tempat Duduk Peserta Ujian
 * Renders a seating chart per room with:
 * - Title "DENAH TEMPAT DUDUK PESERTA"
 * - Room name badge
 * - Pengawas I (left) & Pengawas II (right) illustrations at top
 * - 4-column student grid, each with exam number, name, and student icon
 * - Green/teal color scheme matching the reference
 */

// ── Image paths ──
const PENGAWAS_IMG = '/pengawas.png';
const SISWA_IMG = '/siswa-duduk.png';

/** Pengawas sitting at desk image */
const PengawasImg = ({ style }: { style?: React.CSSProperties }) => (
  <img src={PENGAWAS_IMG} alt="Pengawas" style={{ width: '100%', height: '100%', objectFit: 'contain', ...style }} />
);

/** Student sitting at desk image */
const StudentImg = ({ style }: { style?: React.CSSProperties }) => (
  <img src={SISWA_IMG} alt="Siswa" style={{ width: '100%', height: '100%', objectFit: 'contain', ...style }} />
);

export const PrintDenahDuduk = () => {
  const { ujianId } = useParams();
  const [searchParams] = useSearchParams();
  const filterRuangId = searchParams.get('ruangId');

  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, ruangRes, pengawasRes, empRes, distRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(`/exams/${ujianId}/ruang`).catch(() => []),
          apiClient(`/exams/${ujianId}/pengawas`).catch(() => []),
          apiClient('/employees').catch(() => []),
          apiClient(`/exams/${ujianId}/distribusi`).catch(() => []),
        ]);

        setUjian(uRes);

        const ruangData = Array.isArray(ruangRes) ? ruangRes : [];
        const pengawasData = Array.isArray(pengawasRes) ? pengawasRes : [];
        const employees = Array.isArray(empRes) ? empRes : [];
        const distData = Array.isArray(distRes) ? distRes : [];

        // Helper: get employee data by kodeLabel from pengawasGroups
        const getEmpDataByKodeLabel = (kodeLabel: string) => {
          if (!kodeLabel || !uRes?.pengaturan?.pengawasGroups) return null;
          const isNum = /^\d+$/.test(kodeLabel);
          const groups = uRes.pengaturan.pengawasGroups;
          let empId = null;
          if (isNum) {
            const idx = parseInt(kodeLabel, 10) - 1;
            empId = groups.group1?.[idx];
          } else {
            const idx = kodeLabel.charCodeAt(0) - 65;
            empId = groups.group2?.[idx];
          }
          if (empId) return employees.find((e: any) => e.id === empId);
          return null;
        };

        const result: any[] = [];
        const tahunAjaran = uRes.tahunAjaran || '';

        for (const rng of ruangData) {
          if (filterRuangId && rng.id !== filterRuangId) continue;

          const studentsInRoom = distData.filter((d: any) => d.ruangId === rng.id);
          if (studentsInRoom.length === 0) continue;

          // Assign urut per room
          const studentsWithUrut = studentsInRoom.map((d: any, idx: number) => ({
            ...d,
            urutRuang: idx + 1,
          }));

          // Find pengawas for this room (use first jadwal's assignment or fallback)
          // Check all pengawas assignments for this room
          const tugasForRoom = pengawasData.filter((p: any) => p.ruangId === rng.id);
          let p1: any = null;
          let p2: any = null;
          for (const t of tugasForRoom) {
            if (/^\d+$/.test(t.kodeLabel)) {
              if (!p1) p1 = getEmpDataByKodeLabel(t.kodeLabel);
            } else {
              if (!p2) p2 = getEmpDataByKodeLabel(t.kodeLabel);
            }
          }

          // Generate nomor peserta for each student
          const lastYearStr = tahunAjaran.length >= 2 ? tahunAjaran.slice(-2) : '00';
          const semesterLower = (uRes?.semester || '').toLowerCase();
          const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
          const ruangMatch = (rng.namaRuang || '').match(/\d+/);
          const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
          const ruangCode = ruangNumber.toString().padStart(2, '0');

          const studentsWithNomor = studentsWithUrut.map((s: any) => {
            const siswa = s.siswa || {};
            const kelasStr = (siswa.fullClassName || siswa.className || '').toUpperCase();
            let gradeCode = '00';
            if (kelasStr.includes('XII') || kelasStr.includes('12')) gradeCode = '12';
            else if (kelasStr.includes('XI') || kelasStr.includes('11')) gradeCode = '11';
            else if (kelasStr.includes('X') || kelasStr.includes('10')) gradeCode = '10';
            const urutCode = (s.urutRuang || 1).toString().padStart(3, '0');
            const nomorPeserta = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;
            return { ...s, nomorPeserta };
          });

          result.push({
            ruang: rng,
            pengawas1: p1,
            pengawas2: p2,
            students: studentsWithNomor,
          });
        }

        setPages(result);
      } catch (err) {
        console.error('Failed to load denah data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId, filterRuangId]);

  // Auto-print: preload images first
  useEffect(() => {
    if (!loading && ujian && pages.length > 0 && searchParams.get('preview') !== 'true') {
      // Preload both images before printing
      const imgs = [PENGAWAS_IMG, SISWA_IMG].map(src => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // resolve even on error to not block print
          img.src = src;
        });
      });
      Promise.all(imgs).then(() => {
        setTimeout(() => window.print(), 500);
      });
    }
  }, [loading, ujian, pages, searchParams]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-3">
        <Loader2 className="animate-spin text-teal-500" size={32} />
        <p className="text-sm text-gray-500">Memuat data denah...</p>
      </div>
    );
  }

  if (!ujian || pages.length === 0) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data tidak ditemukan atau distribusi kosong.</div>;
  }

  const namaUjian = (ujian.namaUjian || ujian.jenisUjian || '').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || '';
  const colsParam = parseInt(searchParams.get('cols') || '4', 10);
  const COLS = colsParam === 5 ? 5 : 4;

  const DenahPage = ({ item }: { item: any }) => {
    const { ruang, pengawas1, pengawas2, students } = item;

    // Arrange students in grid rows (4 cols), numbers go right-to-left per row
    const rows: any[][] = [];
    for (let i = 0; i < students.length; i += COLS) {
      const row = students.slice(i, i + COLS);
      // Reverse so highest number is on left, lowest on right (matching reference image)
      rows.push([...row].reverse());
    }

    // Determine font size based on student count and column count
    const count = students.length;
    const is5 = COLS === 5;
    let nameFontSize = is5 ? '6pt' : '7pt';
    let nomorFontSize = is5 ? '5.5pt' : '6.5pt';
    let iconHeight = is5 ? '34px' : '42px';
    let cellPadding = is5 ? '2px 1px' : '4px 2px';
    if (!is5 && count <= 16) {
      nameFontSize = '8pt';
      nomorFontSize = '7.5pt';
      iconHeight = '48px';
      cellPadding = '5px 3px';
    } else if (is5 && count > 20) {
      nameFontSize = '5.5pt';
      nomorFontSize = '5pt';
      iconHeight = '28px';
      cellPadding = '2px 1px';
    } else if (!is5 && count > 28) {
      nameFontSize = '6pt';
      nomorFontSize = '5.5pt';
      iconHeight = '36px';
      cellPadding = '3px 2px';
    }
    const colWidth = is5 ? '20%' : '25%';

    // Calculate row height to fill the A4 page evenly
    // A4 usable content height ≈ 270mm (with some bottom margin)
    // Header (title+badge) ≈ 18mm, Pengawas row ≈ 35mm, border padding ≈ 7mm, footer ≈ 6mm
    // Available for student grid ≈ 185mm
    const availableGridHeight = 185; // mm
    const numRows = rows.length;
    const rowHeightMm = numRows > 0 ? Math.floor(availableGridHeight / numRows) : 80;

    return (
      <div
        className="relative box-border bg-white text-black"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', display: 'flex', flexDirection: 'column', height: '270mm' }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '3px', color: '#1a1a1a' }}>
            DENAH TEMPAT DUDUK PESERTA
          </div>
          <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#333', marginTop: '2px', letterSpacing: '1px' }}>
            {namaUjian}
          </div>
          <div style={{ fontSize: '9pt', color: '#555', marginTop: '1px' }}>
            TA {tahunAjaran}
          </div>
        </div>

        {/* Room Badge */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 28px',
            background: '#5AAFA8',
            color: 'white',
            fontSize: '14pt',
            fontWeight: 'bold',
            borderRadius: '4px',
            letterSpacing: '1px',
            border: '2px solid #4A9F98',
          }}>
            Ruang : {ruang.namaRuang.replace(/^R\.?\s*/i, '')}
          </span>
        </div>

        {/* Main Content Border */}
        <div style={{
          border: '2px solid #4A9F98',
          borderRadius: '4px',
          padding: '10px 12px',
          background: '#FCFFF9',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Pengawas Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', paddingBottom: '8px', borderBottom: '2px solid #C8E6C9' }}>
            {/* Pengawas I */}
            <div style={{ textAlign: 'center', width: '120px' }}>
              <div style={{ width: '80px', height: '65px', margin: '0 auto' }}>
                <PengawasImg />
              </div>
              <div style={{ fontSize: '8pt', fontWeight: 'bold', marginTop: '2px', letterSpacing: '1px' }}>PENGAWAS I</div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Pengawas II */}
            <div style={{ textAlign: 'center', width: '120px' }}>
              <div style={{ width: '80px', height: '65px', margin: '0 auto' }}>
                <PengawasImg />
              </div>
              <div style={{ fontSize: '8pt', fontWeight: 'bold', marginTop: '2px', letterSpacing: '1px' }}>PENGAWAS II</div>
            </div>
          </div>

          {/* Students Grid */}
          <table style={{ width: '100%', borderCollapse: 'collapse', flex: 1 }}>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} style={{ height: `${rowHeightMm}mm` }}>
                  {row.map((student: any, colIdx: number) => {
                    const siswa = student.siswa || {};
                    return (
                      <td
                        key={colIdx}
                        style={{
                          width: colWidth,
                          textAlign: 'center',
                          verticalAlign: 'top',
                          padding: cellPadding,
                        }}
                      >
                        {/* Nomor Peserta */}
                        <div style={{
                          fontSize: nomorFontSize,
                          fontWeight: 'normal',
                          color: '#333',
                          marginBottom: '1px',
                          letterSpacing: '0.5px',
                        }}>
                          {student.nomorPeserta}
                        </div>
                        {/* Nama */}
                        <div style={{
                          fontSize: nameFontSize,
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          lineHeight: '1.15',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          maxHeight: is5 ? '18px' : '22px',
                          color: '#111',
                          wordBreak: 'break-word',
                        }}>
                          {siswa.fullName || '-'}
                        </div>
                        {/* Student Icon */}
                        <div style={{ width: iconHeight, height: iconHeight, margin: '0 auto' }}>
                          <StudentImg />
                        </div>
                      </td>
                    );
                  })}
                  {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                    <td key={`empty-${i}`} style={{ width: colWidth }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '6px', fontSize: '7pt', color: '#888', padding: '0 4px' }}>
          <span>Jumlah Peserta: {students.length}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        @media print {
          html, body {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
        .page-container {
          background-color: white;
          width: 210mm;
          min-height: 297mm;
          padding: 8mm 10mm;
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        @media print {
          .page-container {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: 100%;
            min-height: auto;
            height: auto;
            overflow: hidden;
          }
        }
      `}} />

      <div className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white print:min-h-0">
        {pages.map((item, pageIdx) => (
          <div key={pageIdx} className={`page-container ${pageIdx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
            <DenahPage item={item} />
          </div>
        ))}
      </div>
    </>
  );
};
