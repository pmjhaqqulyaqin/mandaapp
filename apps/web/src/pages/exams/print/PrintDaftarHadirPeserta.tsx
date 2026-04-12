import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const PrintDaftarHadirPeserta = () => {
  const { ujianId } = useParams();
  const query = new URLSearchParams(window.location.search);
  const filterRuangId = query.get('ruangId');

  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, jadwalRes, ruangRes, pengawasRes, empRes, distRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(`/exams/${ujianId}/jadwal`).catch(() => []),
          apiClient(`/exams/${ujianId}/ruang`).catch(() => []),
          apiClient(`/exams/${ujianId}/pengawas`).catch(() => []),
          apiClient('/employees').catch(() => []),
          apiClient(`/exams/${ujianId}/distribusi`).catch(() => []),
        ]);

        setUjian(uRes);

        const jadwalData = Array.isArray(jadwalRes) ? jadwalRes : [];
        const ruangData = Array.isArray(ruangRes) ? ruangRes : [];
        const pengawasData = Array.isArray(pengawasRes) ? pengawasRes : [];
        const employees = Array.isArray(empRes) ? empRes : [];
        const distData = Array.isArray(distRes) ? distRes : [];

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

        for (const jad of jadwalData) {
          for (const rng of ruangData) {
            if (filterRuangId && rng.id !== filterRuangId) continue;

            const studentsInRoom = distData.filter((d: any) => d.ruangId === rng.id);
            if (studentsInRoom.length === 0) continue;

            const tugas = pengawasData.filter((p: any) => p.jadwalId === jad.id && p.ruangId === rng.id);
            let p1 = null;
            let p2 = null;
            for (const t of tugas) {
              if (/^\d+$/.test(t.kodeLabel)) {
                p1 = getEmpDataByKodeLabel(t.kodeLabel);
              } else {
                p2 = getEmpDataByKodeLabel(t.kodeLabel);
              }
            }

            const classesInRoom = Array.from(new Set(studentsInRoom.map((d: any) => d.siswa?.fullClassName || d.siswa?.className).filter(Boolean)));

            // Assign urutRuang (same as PrintKartuPeserta)
            const studentsWithUrut = studentsInRoom.map((d: any, idx: number) => ({
              ...d,
              urutRuang: idx + 1,
            }));

            result.push({
              jadwal: jad,
              ruang: rng,
              pengawas1: p1,
              pengawas2: p2,
              students: studentsWithUrut,
              kelasStr: classesInRoom.join(', '),
            });
          }
        }

        setPages(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId, filterRuangId]);

  useEffect(() => {
    if (!loading && ujian && pages.length > 0) {
      setTimeout(() => window.print(), 1500);
    }
  }, [loading, ujian, pages]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-violet-500" size={32} /></div>;
  }

  if (!ujian || pages.length === 0) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data tidak ditemukan atau distribusi kosong.</div>;
  }

  const namaUjian = (ujian.namaUjian || ujian.jenisUjian || '').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || '';

  const DaftarHadirPage = ({ item }: { item: any }) => {
    const { jadwal, ruang, pengawas1, pengawas2, students, kelasStr } = item;

    let hariStr = '', tglStr = '', mapelStr = '', mulaiStr = '', selesaiStr = '';
    if (jadwal?.tanggal) {
      const d = new Date(jadwal.tanggal);
      hariStr = HARI[d.getDay()];
      tglStr = `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
      mapelStr = jadwal.mataPelajaran || '';
      mulaiStr = jadwal.waktuMulai || '';
      selesaiStr = jadwal.waktuSelesai || '';
    }

    // Determine font size based on student count to fit 1 page
    const count = students.length;
    let fontSize = '9pt';
    let rowPy = 'py-[3px]';
    let titleMb = 'mb-3';
    let identMb = 'mb-2';
    if (count <= 15) {
      fontSize = '11pt';
      rowPy = 'py-[5px]';
      titleMb = 'mb-5';
      identMb = 'mb-3';
    } else if (count <= 25) {
      fontSize = '10pt';
      rowPy = 'py-[4px]';
      titleMb = 'mb-4';
      identMb = 'mb-2';
    } else if (count > 35) {
      fontSize = '8pt';
      rowPy = 'py-[2px]';
      titleMb = 'mb-2';
      identMb = 'mb-1';
    }

    return (
      <div
        className="relative box-border bg-white text-black px-3"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize }}
      >
        {/* JUDUL */}
        <div className={`text-center font-bold ${titleMb}`} style={{ fontSize: '12pt', lineHeight: '1.3' }}>
          <div>DAFTAR HADIR SISWA</div>
          <div>PELAKSANAAN {namaUjian}</div>
          <div>TAHUN AJARAN {tahunAjaran}</div>
        </div>

        {/* IDENTITAS */}
        <div className={identMb} style={{ fontSize }}>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">
              <span>Mata Pelajaran</span>
              <span className="mx-2">:</span>
              <span className="font-semibold">{mapelStr || '_________'}</span>
            </div>
            <div>
              <span>Ruang</span>
              <span className="mx-1">:</span>
              <span className="font-semibold">{ruang?.namaRuang || '_____'}</span>
              <span className="mx-1">/</span>
              <span className="font-semibold">{kelasStr || '_____'}</span>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">
              <span>Hari / Tanggal</span>
              <span className="mx-2">:</span>
              <span className="font-semibold">{hariStr ? `${hariStr}, ${tglStr}` : '_________'}</span>
            </div>
            <div>
              <span>Jam ke/Waktu</span>
              <span className="mx-1">:</span>
              <span className="font-semibold">{mulaiStr || '____'} - {selesaiStr || '____'}</span>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse border border-black text-center" style={{ fontSize }}>
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-bold w-[30px]" rowSpan={2}>No</th>
              <th className="border border-black px-1 py-1 font-bold w-[22%]" rowSpan={2}>No. Peserta Ujian</th>
              <th className="border border-black px-1 py-1 font-bold" rowSpan={2}>Nama Peserta</th>
              <th className="border border-black px-1 py-1 font-bold" colSpan={2}>Tanda Tangan Peserta</th>
            </tr>
            <tr>
              <th className="border border-black px-1 py-0.5 font-normal w-[11%]" style={{ fontSize: '8pt' }}></th>
              <th className="border border-black px-1 py-0.5 font-normal w-[11%]" style={{ fontSize: '8pt' }}></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: any, i: number) => {
              const nomor = i + 1;

              // Generate nomor peserta kustom (sama dengan PrintKartuPeserta)
              const siswa = s.siswa || {};
              const lastYearStr = tahunAjaran.length >= 2 ? tahunAjaran.slice(-2) : '00';
              const semesterLower = (ujian?.semester || '').toLowerCase();
              const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
              const kelasStr2 = (siswa.fullClassName || siswa.className || '').toUpperCase();
              let gradeCode = '00';
              if (kelasStr2.includes('XII') || kelasStr2.includes('12')) gradeCode = '12';
              else if (kelasStr2.includes('XI') || kelasStr2.includes('11')) gradeCode = '11';
              else if (kelasStr2.includes('X') || kelasStr2.includes('10')) gradeCode = '10';
              const ruangMatch = (ruang?.namaRuang || '').match(/\d+/);
              const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
              const ruangCode = ruangNumber.toString().padStart(2, '0');
              const urutCode = (s.urutRuang || nomor).toString().padStart(3, '0');
              const nomorPeserta = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;

              return (
                <tr key={s.id || i}>
                  <td className={`border border-black px-1 ${rowPy}`}>{nomor}.</td>
                  <td className={`border border-black px-1 ${rowPy} text-left`}>{nomorPeserta}</td>
                  <td className={`border border-black px-1 ${rowPy} text-left`}>{siswa.fullName || ''}</td>
                  {/* TTD kolom ganjil */}
                  <td className={`border border-black px-1 ${rowPy}`}>
                    {nomor % 2 === 1 ? `${nomor}.` : ''}
                  </td>
                  {/* TTD kolom genap */}
                  <td className={`border border-black px-1 ${rowPy}`}>
                    {nomor % 2 === 0 ? `${nomor}.` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* PENGAWAS TANDA TANGAN */}
        <div className="flex justify-between mt-4" style={{ fontSize }}>
          <div className="w-[45%] text-center">
            <div className="font-bold mb-12">Pengawas I</div>
            <div className="font-semibold">
              {pengawas1?.name ? (
                <>
                  <div>( {pengawas1.name} )</div>
                  <div className="font-normal text-[9pt]">NIP. {pengawas1.nip || '-'}</div>
                </>
              ) : (
                <>
                  <div>(                                    )</div>
                  <div className="font-normal text-[9pt]">NIP.</div>
                </>
              )}
            </div>
          </div>
          <div className="w-[45%] text-center">
            <div className="font-bold mb-12">Pengawas II</div>
            <div className="font-semibold">
              {pengawas2?.name ? (
                <>
                  <div>( {pengawas2.name} )</div>
                  <div className="font-normal text-[9pt]">NIP. {pengawas2.nip || '-'}</div>
                </>
              ) : (
                <>
                  <div>(                                    )</div>
                  <div className="font-normal text-[9pt]">NIP.</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 portrait;
          margin: 10mm;
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
          .page-container {
            page-break-inside: avoid;
          }
        }
        .page-container {
          background-color: white;
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
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

      <div id="print-area" className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white print:min-h-0">
        {pages.map((item, pageIdx) => (
          <div key={pageIdx} className={`page-container ${pageIdx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
            <DaftarHadirPage item={item} />
          </div>
        ))}
      </div>
    </>
  );
};
