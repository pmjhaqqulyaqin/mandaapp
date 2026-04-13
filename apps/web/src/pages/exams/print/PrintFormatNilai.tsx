import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface FormatConfig {
  tipe: 'pilihan_ganda' | 'esai' | 'campuran';
  jumlahPG: number;
  jumlahEsai: number;
  bobotPG: number;
  bobotEsai: number;
  kolomRemedial: boolean;
}

const DEFAULT_FORMAT: FormatConfig = {
  tipe: 'campuran',
  jumlahPG: 40,
  jumlahEsai: 5,
  bobotPG: 60,
  bobotEsai: 40,
  kolomRemedial: false,
};

export const PrintFormatNilai = () => {
  const { ujianId } = useParams();
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, jadwalRes, ruangRes, distRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient<any[]>(`/exams/${ujianId}/jadwal`).catch(() => []),
          apiClient<any[]>(`/exams/${ujianId}/ruang`).catch(() => []),
          apiClient<any[]>(`/exams/${ujianId}/distribusi`).catch(() => []),
        ]);

        setUjian(uRes);

        const jadwalData = Array.isArray(jadwalRes) ? jadwalRes : [];
        const ruangData = Array.isArray(ruangRes) ? (ruangRes as any).data || ruangRes : [];
        const distData = Array.isArray(distRes) ? distRes : [];

        const queryParams = new URLSearchParams(window.location.search);
        const filterMapel = queryParams.get('mapel');
        const filterRuangId = queryParams.get('ruangId');

        // Get format config
        const pengaturan = (uRes as any)?.pengaturan || {};
        const formatNilai = pengaturan.formatNilai || {};
        const defaultFmt: FormatConfig = { ...DEFAULT_FORMAT, ...formatNilai.default };
        const perMapelFmt: Record<string, FormatConfig> = formatNilai.perMapel || {};

        const getFormat = (mapel: string): FormatConfig => perMapelFmt[mapel] || defaultFmt;

        // Get unique mapels
        let mapelList = Array.from(new Set(jadwalData.map(j => j.mataPelajaran).filter(Boolean)));
        if (filterMapel) {
          mapelList = mapelList.filter(m => m === filterMapel);
        }

        // Build pages: one per mapel per room
        const pagesList: any[] = [];

        for (const mapel of mapelList) {
          const jadwalForMapel = jadwalData.filter(j => j.mataPelajaran === mapel);
          const fmt = getFormat(mapel);
          const jadwalInfo = jadwalForMapel[0];

          // Determine which rooms have students
          let ruangList = ruangData;
          if (filterRuangId) {
            ruangList = ruangList.filter((r: any) => r.id === filterRuangId);
          }

          for (const room of ruangList) {
            const studentsInRoom = distData.filter((d: any) => d.ruangId === room.id);
            if (studentsInRoom.length === 0) continue;

            // Sort by name
            studentsInRoom.sort((a: any, b: any) =>
              (a.siswa?.fullName || '').localeCompare(b.siswa?.fullName || '')
            );

            // Compute nomor peserta
            let counter = 0;
            const studentsWithNomor = studentsInRoom.map((item: any) => {
              counter++;
              const u = uRes as any;
              const lastYearStr = (u?.tahunAjaran || '').length >= 2 ? (u?.tahunAjaran || '').slice(-2) : '00';
              const semesterLower = (u?.semester || '').toLowerCase();
              const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
              const kelasStr2 = (item.siswa?.fullClassName || item.siswa?.className || '').toUpperCase();
              let gradeCode = '00';
              if (kelasStr2.includes('XII') || kelasStr2.includes('12')) gradeCode = '12';
              else if (kelasStr2.includes('XI') || kelasStr2.includes('11')) gradeCode = '11';
              else if (kelasStr2.includes('X') || kelasStr2.includes('10')) gradeCode = '10';
              const ruangMatch = (room.namaRuang || '').match(/\d+/);
              const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
              const ruangCode = ruangNumber.toString().padStart(2, '0');
              const urutCode = counter.toString().padStart(3, '0');
              const nomorPeserta = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;

              return { ...item, nomorPeserta };
            });

            // Get kelas info from jadwal or from students
            const kelasFromJadwal = jadwalInfo?.kelas || '';
            const kelasFromStudents = Array.from(new Set(
              studentsInRoom.map((d: any) => d.siswa?.fullClassName || d.siswa?.className).filter(Boolean)
            )).join(', ');

            pagesList.push({
              mapel,
              format: fmt,
              jadwal: jadwalInfo,
              room,
              students: studentsWithNomor,
              kelas: kelasFromStudents || kelasFromJadwal,
            });
          }
        }

        setPages(pagesList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId]);

  // Auto-print
  useEffect(() => {
    if (!loading && ujian && pages.length > 0) {
      setTimeout(() => { window.print(); }, 1500);
    }
  }, [loading, ujian, pages]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;
  }

  if (!ujian) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data Ujian Tidak Ditemukan</div>;
  }

  const kop = ujian.pengaturan?.kop || {};
  const kartuSettings = ujian.pengaturan?.kartuPeserta || {};

  const kementerian = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
  const instansi = kop.instansi || 'MADRASAH ALIYAH NEGERI';
  const alamat = kop.alamat || 'Alamat Sekolah';

  const logoKiri = kartuSettings.logoKiri || '';
  const logoKanan = kartuSettings.logoKanan || '';

  const namaUjian = (ujian.namaUjian || 'UJIAN').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || '';

  const NilaiPage = ({ page }: { page: any }) => {
    const { mapel, format, jadwal, room, students, kelas } = page;
    const fmt: FormatConfig = format;

    let hariStr = '', tglStr = '';
    if (jadwal?.tanggal) {
      const d = new Date(jadwal.tanggal);
      hariStr = HARI[d.getDay()];
      tglStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    // Determine columns
    const showPG = fmt.tipe === 'pilihan_ganda' || fmt.tipe === 'campuran';
    const showEsai = fmt.tipe === 'esai' || fmt.tipe === 'campuran';

    return (
      <div
        className="relative box-border bg-white text-[13px] leading-relaxed px-6 py-4"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {/* KOP SURAT */}
        <div className="flex items-center justify-between border-b-[3px] border-black pb-1 mb-3 relative px-2">
          <div className="absolute left-0 right-0 bottom-[-4px] h-[1px] bg-black" />

          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
            {logoKiri ? <img src={logoKiri} className="max-w-full max-h-full object-contain" /> : <div className="w-14" />}
          </div>

          <div className="flex-1 text-center flex flex-col justify-center px-3" style={{ lineHeight: '1.15' }}>
            <div className="font-bold text-[11px] uppercase tracking-wide">{kementerian}</div>
            <div className="font-bold text-[11px] uppercase tracking-wide">PANITIA {namaUjian}</div>
            <div className="font-bold text-[11px] uppercase tracking-wide">TAHUN AJARAN {tahunAjaran}</div>
            <div className="font-bold text-[13px] uppercase tracking-wide">{instansi}</div>
            <div className="text-[9px] mt-0.5">{alamat}</div>
          </div>

          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
            {logoKanan ? <img src={logoKanan} className="max-w-full max-h-full object-contain" /> : <div className="w-14" />}
          </div>
        </div>

        {/* TITLE */}
        <h3 className="text-center font-bold text-lg tracking-widest mt-2 mb-2">DAFTAR NILAI</h3>

        {/* INFO BAR */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 mb-3 text-[12px]">
          <div className="flex">
            <span className="w-[110px] font-semibold">Mata Pelajaran</span>
            <span className="mr-1">:</span>
            <span className="font-bold uppercase">{mapel}</span>
          </div>
          <div className="flex">
            <span className="w-[110px] font-semibold">Ruang</span>
            <span className="mr-1">:</span>
            <span>{room?.namaRuang || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-[110px] font-semibold">Hari / Tanggal</span>
            <span className="mr-1">:</span>
            <span>{hariStr ? `${hariStr}, ${tglStr}` : '-'}</span>
          </div>
          <div className="flex">
            <span className="w-[110px] font-semibold">Waktu</span>
            <span className="mr-1">:</span>
            <span>{jadwal ? `${jadwal.waktuMulai} – ${jadwal.waktuSelesai} WITA` : '-'}</span>
          </div>
          <div className="flex">
            <span className="w-[110px] font-semibold">Kelas</span>
            <span className="mr-1">:</span>
            <span>{kelas || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-[110px] font-semibold">Format</span>
            <span className="mr-1">:</span>
            <span>
              {fmt.tipe === 'pilihan_ganda' ? 'Pilihan Ganda' :
               fmt.tipe === 'esai' ? 'Esai' :
               `Campuran (PG ${fmt.bobotPG}% + Esai ${fmt.bobotEsai}%)`}
            </span>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse border border-black text-[11px] mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-1.5 py-1.5 font-bold w-[30px] text-center">No</th>
              <th className="border border-black px-1.5 py-1.5 font-bold w-[130px] text-center">No. Peserta</th>
              <th className="border border-black px-1.5 py-1.5 font-bold text-left" style={{ minWidth: '180px' }}>Nama Peserta</th>
              {showPG && (
                <th className="border border-black px-1.5 py-1.5 font-bold w-[60px] text-center">PG</th>
              )}
              {showEsai && (
                <th className="border border-black px-1.5 py-1.5 font-bold w-[60px] text-center">Esai</th>
              )}
              <th className="border border-black px-1.5 py-1.5 font-bold w-[70px] text-center">Nilai Akhir</th>
              {fmt.kolomRemedial && (
                <th className="border border-black px-1.5 py-1.5 font-bold w-[60px] text-center">Remedial</th>
              )}
            </tr>
          </thead>
          <tbody>
            {students.map((s: any, idx: number) => (
              <tr key={s.id || idx}>
                <td className="border border-black px-1.5 py-1 text-center">{idx + 1}</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono text-[10px]">{s.nomorPeserta}</td>
                <td className="border border-black px-1.5 py-1">{s.siswa?.fullName || '-'}</td>
                {showPG && <td className="border border-black px-1.5 py-1 text-center">&nbsp;</td>}
                {showEsai && <td className="border border-black px-1.5 py-1 text-center">&nbsp;</td>}
                <td className="border border-black px-1.5 py-1 text-center">&nbsp;</td>
                {fmt.kolomRemedial && <td className="border border-black px-1.5 py-1 text-center">&nbsp;</td>}
              </tr>
            ))}
            {/* Add empty rows if less than 15 */}
            {students.length < 15 && Array.from({ length: 15 - students.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black px-1.5 py-1 text-center text-gray-300">{students.length + i + 1}</td>
                <td className="border border-black px-1.5 py-1">&nbsp;</td>
                <td className="border border-black px-1.5 py-1">&nbsp;</td>
                {showPG && <td className="border border-black px-1.5 py-1">&nbsp;</td>}
                {showEsai && <td className="border border-black px-1.5 py-1">&nbsp;</td>}
                <td className="border border-black px-1.5 py-1">&nbsp;</td>
                {fmt.kolomRemedial && <td className="border border-black px-1.5 py-1">&nbsp;</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {/* STATS */}
        <div className="text-[11px] mb-4">
          <div className="flex gap-6">
            <span>Jumlah Peserta: <b>{students.length}</b> Orang</span>
            {showPG && <span>Jumlah Soal PG: <b>{fmt.jumlahPG}</b></span>}
            {showEsai && <span>Jumlah Soal Esai: <b>{fmt.jumlahEsai}</b></span>}
          </div>
        </div>

        {/* TTD - Guru Mata Pelajaran */}
        <div className="flex justify-end mt-6">
          <div className="w-[280px] text-center text-[12px]">
            <div className="mb-1">Guru Mata Pelajaran</div>
            <div className="mb-[55px]">&nbsp;</div>
            <div className="border-b border-black w-[200px] mx-auto">&nbsp;</div>
            <div className="mt-1 text-[10px]">NIP. ........................................</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 landscape;
          margin: 8mm;
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
          .no-print { display: none !important; }
        }
        .page-container {
          background-color: white;
          width: 297mm;
          min-height: 210mm;
          padding: 8mm;
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

      {/* No-print toolbar */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white py-2 px-4 flex items-center justify-between text-sm">
        <span className="font-semibold">Preview: Daftar Nilai — {ujian.namaUjian}</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-xs font-semibold transition">
            🖨️ Cetak
          </button>
          <button onClick={() => window.close()} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs transition">
            ✕ Tutup
          </button>
        </div>
      </div>

      <div id="print-area" className="min-h-screen bg-gray-300 py-16 print:py-0 print:bg-white print:min-h-0">
        {pages.length === 0 ? (
          <div className="page-container flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg font-bold mb-2">Tidak ada data</p>
              <p className="text-sm">Pastikan jadwal, ruang, dan distribusi peserta sudah dikonfigurasi.</p>
            </div>
          </div>
        ) : (
          pages.map((page, idx) => (
            <div key={idx} className={`page-container ${idx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
              <NilaiPage page={page} />
            </div>
          ))
        )}
      </div>
    </>
  );
};
