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

// ── SVG Illustrations ──

/** Pengawas sitting at desk (front-facing, cartoon style) */
const PengawasSvg = () => (
  <svg viewBox="0 0 120 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    {/* Desk */}
    <rect x="10" y="65" width="100" height="8" rx="2" fill="#8B7355" />
    <rect x="15" y="73" width="5" height="20" rx="1" fill="#6B5B3E" />
    <rect x="100" y="73" width="5" height="20" rx="1" fill="#6B5B3E" />
    <rect x="20" y="58" width="25" height="10" rx="2" fill="#E8E8E8" stroke="#CCC" strokeWidth="0.5" />
    <rect x="75" y="60" width="20" height="8" rx="1" fill="#F5F5DC" stroke="#CCC" strokeWidth="0.5" />
    <line x1="78" y1="62" x2="92" y2="62" stroke="#DDD" strokeWidth="0.5" />
    <line x1="78" y1="64" x2="90" y2="64" stroke="#DDD" strokeWidth="0.5" />
    <line x1="78" y1="66" x2="88" y2="66" stroke="#DDD" strokeWidth="0.5" />
    {/* Body */}
    <rect x="45" y="35" width="30" height="30" rx="4" fill="#5AAFA8" />
    {/* Head */}
    <circle cx="60" cy="24" r="14" fill="#F5D5B8" />
    {/* Hair */}
    <ellipse cx="60" cy="16" rx="14" ry="7" fill="#333" />
    {/* Eyes */}
    <circle cx="54" cy="24" r="1.8" fill="#333" />
    <circle cx="66" cy="24" r="1.8" fill="#333" />
    {/* Smile */}
    <path d="M55 29 Q60 33 65 29" fill="none" stroke="#333" strokeWidth="1" strokeLinecap="round" />
    {/* Arms */}
    <rect x="35" y="42" width="12" height="6" rx="3" fill="#F5D5B8" />
    <rect x="73" y="42" width="12" height="6" rx="3" fill="#F5D5B8" />
  </svg>
);

/** Student sitting at desk (back-facing, showing back of head with open book) */
const StudentSvg = () => (
  <svg viewBox="0 0 80 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    {/* Desk */}
    <rect x="5" y="42" width="70" height="5" rx="1.5" fill="#8B7355" />
    <rect x="8" y="47" width="4" height="14" rx="1" fill="#6B5B3E" />
    <rect x="68" y="47" width="4" height="14" rx="1" fill="#6B5B3E" />
    {/* Open book on desk */}
    <rect x="22" y="35" width="18" height="10" rx="1" fill="#FFF" stroke="#CCC" strokeWidth="0.4" />
    <rect x="40" y="35" width="18" height="10" rx="1" fill="#FFF" stroke="#CCC" strokeWidth="0.4" />
    <line x1="40" y1="35" x2="40" y2="45" stroke="#AAA" strokeWidth="0.5" />
    <line x1="25" y1="38" x2="37" y2="38" stroke="#DDD" strokeWidth="0.4" />
    <line x1="25" y1="40" x2="36" y2="40" stroke="#DDD" strokeWidth="0.4" />
    <line x1="25" y1="42" x2="34" y2="42" stroke="#DDD" strokeWidth="0.4" />
    <line x1="43" y1="38" x2="55" y2="38" stroke="#DDD" strokeWidth="0.4" />
    <line x1="43" y1="40" x2="54" y2="40" stroke="#DDD" strokeWidth="0.4" />
    {/* Body (back) */}
    <rect x="28" y="15" width="24" height="26" rx="4" fill="#5AAFA8" />
    {/* Head (back of head) */}
    <circle cx="40" cy="10" r="11" fill="#333" />
    {/* Ears */}
    <ellipse cx="29" cy="11" rx="3" ry="4" fill="#F5D5B8" />
    <ellipse cx="51" cy="11" rx="3" ry="4" fill="#F5D5B8" />
    {/* Arms reaching forward */}
    <rect x="18" y="24" width="12" height="5" rx="2.5" fill="#F5D5B8" />
    <rect x="50" y="24" width="12" height="5" rx="2.5" fill="#F5D5B8" />
  </svg>
);

export const PrintDenahDuduk = () => {
  const { ujianId } = useParams();
  const [searchParams] = useSearchParams();
  const filterRuangId = searchParams.get('ruangId');

  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, ruangRes, pengawasRes, empRes, distRes, settingsRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(`/exams/${ujianId}/ruang`).catch(() => []),
          apiClient(`/exams/${ujianId}/pengawas`).catch(() => []),
          apiClient('/employees').catch(() => []),
          apiClient(`/exams/${ujianId}/distribusi`).catch(() => []),
          apiClient('/settings').catch(() => []),
        ]);

        setUjian(uRes);

        // School name from settings
        const settingsArr = Array.isArray((settingsRes as any)?.data || settingsRes)
          ? ((settingsRes as any)?.data || settingsRes) : [];
        const sn = settingsArr.find((s: any) => s.key === 'school_name')?.value;
        if (sn) setSchoolName(sn);

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

  // Auto-print
  useEffect(() => {
    if (!loading && ujian && pages.length > 0 && searchParams.get('preview') !== 'true') {
      const timer = setTimeout(() => window.print(), 1200);
      return () => clearTimeout(timer);
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
  const COLS = 4;

  const DenahPage = ({ item }: { item: any }) => {
    const { ruang, pengawas1, pengawas2, students } = item;

    // Arrange students in grid rows (4 cols), numbers go right-to-left per row
    const rows: any[][] = [];
    for (let i = 0; i < students.length; i += COLS) {
      const row = students.slice(i, i + COLS);
      // Reverse so highest number is on left, lowest on right (matching reference image)
      rows.push([...row].reverse());
    }

    // Determine font size based on student count
    const count = students.length;
    let nameFontSize = '7pt';
    let nomorFontSize = '6.5pt';
    let studentCellHeight = '88px';
    let iconHeight = '42px';
    if (count <= 16) {
      nameFontSize = '8pt';
      nomorFontSize = '7.5pt';
      studentCellHeight = '100px';
      iconHeight = '48px';
    } else if (count > 28) {
      nameFontSize = '6pt';
      nomorFontSize = '5.5pt';
      studentCellHeight = '75px';
      iconHeight = '36px';
    }

    return (
      <div
        className="relative box-border bg-white text-black"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '3px', color: '#1a1a1a' }}>
            DENAH TEMPAT DUDUK PESERTA
          </div>
          {schoolName && (
            <div style={{ fontSize: '9pt', color: '#555', marginTop: '2px' }}>
              {schoolName}
            </div>
          )}
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
        }}>
          {/* Pengawas Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #C8E6C9' }}>
            {/* Pengawas I */}
            <div style={{ textAlign: 'center', width: '120px' }}>
              <div style={{ width: '80px', height: '65px', margin: '0 auto' }}>
                <PengawasSvg />
              </div>
              <div style={{ fontSize: '8pt', fontWeight: 'bold', marginTop: '2px', letterSpacing: '1px' }}>PENGAWAS I</div>
            </div>

            {/* Nama Ujian di tengah */}
            <div style={{ flex: 1, textAlign: 'center', paddingBottom: '4px' }}>
              <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#444' }}>
                {namaUjian}
              </div>
              <div style={{ fontSize: '7pt', color: '#666' }}>
                TA {tahunAjaran}
              </div>
            </div>

            {/* Pengawas II */}
            <div style={{ textAlign: 'center', width: '120px' }}>
              <div style={{ width: '80px', height: '65px', margin: '0 auto' }}>
                <PengawasSvg />
              </div>
              <div style={{ fontSize: '8pt', fontWeight: 'bold', marginTop: '2px', letterSpacing: '1px' }}>PENGAWAS II</div>
            </div>
          </div>

          {/* Students Grid */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((student: any, colIdx: number) => {
                    const siswa = student.siswa || {};
                    return (
                      <td
                        key={colIdx}
                        style={{
                          width: '25%',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          padding: '3px 2px',
                          height: studentCellHeight,
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
                          lineHeight: '1.2',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          maxHeight: '22px',
                          color: '#111',
                        }}>
                          {siswa.fullName || '-'}
                        </div>
                        {/* Student Icon */}
                        <div style={{ width: iconHeight, height: iconHeight, margin: '0 auto' }}>
                          <StudentSvg />
                        </div>
                      </td>
                    );
                  })}
                  {/* Fill empty cells if last row is incomplete */}
                  {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                    <td key={`empty-${i}`} style={{ width: '25%' }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '7pt', color: '#888', padding: '0 4px' }}>
          <span>Jumlah Peserta: {students.length}</span>
          <span>Pengawas I: {pengawas1?.name || '_______________'} / Pengawas II: {pengawas2?.name || '_______________'}</span>
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
