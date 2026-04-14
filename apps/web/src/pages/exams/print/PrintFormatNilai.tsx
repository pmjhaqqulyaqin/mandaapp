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
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, jadwalRes, ruangRes, distRes, sRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient<any[]>(`/exams/${ujianId}/jadwal`).catch(() => []),
          apiClient<any[]>(`/exams/${ujianId}/ruang`).catch(() => []),
          apiClient<any[]>(`/exams/${ujianId}/distribusi`).catch(() => []),
          apiClient('/settings').catch(() => null),
        ]);

        setUjian(uRes);

        // Parse settings array into key-value map
        const settingsArr = Array.isArray(sRes?.data || sRes) ? (sRes?.data || sRes) : [];
        const settingsMap: Record<string, string> = {};
        for (const s of settingsArr) { if (s.key && s.value) settingsMap[s.key] = s.value; }
        setGlobalSettings(settingsMap);

        const jadwalData = Array.isArray(jadwalRes) ? jadwalRes : [];
        const ruangData = Array.isArray(ruangRes) ? (ruangRes as any).data || ruangRes : [];
        const distData = Array.isArray(distRes) ? distRes : [];

        const queryParams = new URLSearchParams(window.location.search);
        const filterMapel = queryParams.get('mapel');
        const filterRuangId = queryParams.get('ruangId');
        // Accept format override from query params (for unsaved configs)
        const qTipe = queryParams.get('tipe') as FormatConfig['tipe'] | null;

        // Get format config from saved pengaturan
        const pengaturan = (uRes as any)?.pengaturan || {};
        const formatNilai = pengaturan.formatNilai || {};
        const savedDefault: FormatConfig = { ...DEFAULT_FORMAT, ...formatNilai.default };
        const perMapelFmt: Record<string, FormatConfig> = formatNilai.perMapel || {};

        const getFormat = (mapel: string): FormatConfig => {
          // Priority: per-mapel saved > query param override > saved default > DEFAULT
          const base = perMapelFmt[mapel] || savedDefault;
          // If tipe is passed via query param, override the tipe
          if (qTipe && ['pilihan_ganda', 'esai', 'campuran'].includes(qTipe)) {
            return { ...base, tipe: qTipe };
          }
          return base;
        };

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

  const logoKiri = globalSettings.kemenag_logo_url || kartuSettings.logoKiri || '';
  const logoKanan = globalSettings.logo_url || kartuSettings.logoKanan || '';

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

    // Determine columns based on tipe
    const showPG = fmt.tipe === 'pilihan_ganda' || fmt.tipe === 'campuran';
    const showEsai = fmt.tipe === 'esai' || fmt.tipe === 'campuran';

    // Dynamic sizing to fit 1 page portrait (like PrintDaftarHadirPeserta)
    const count = students.length;
    let fontSize = '9pt';
    let rowPy = 'py-[3px]';
    let kopSize = 'text-[11px]';
    let kopInstSize = 'text-[13px]';
    let titleSize = 'text-base';
    let infoSize = 'text-[11px]';
    let ttdMb = 'mb-[40px]';
    let ttdMt = 'mt-4';
    let logoSize = 'w-12 h-12';
    let kopMb = 'mb-2';
    let titleMb = 'mb-1';
    let infoMb = 'mb-2';
    let statsMb = 'mb-2';

    if (count <= 15) {
      fontSize = '11pt';
      rowPy = 'py-[4px]';
      ttdMb = 'mb-[55px]';
      ttdMt = 'mt-6';
    } else if (count <= 25) {
      fontSize = '10pt';
      rowPy = 'py-[3px]';
      ttdMb = 'mb-[45px]';
      ttdMt = 'mt-4';
    } else if (count <= 35) {
      fontSize = '9pt';
      rowPy = 'py-[2px]';
      kopSize = 'text-[10px]';
      kopInstSize = 'text-[12px]';
      titleSize = 'text-sm';
      infoSize = 'text-[10px]';
      ttdMb = 'mb-[35px]';
      ttdMt = 'mt-3';
      logoSize = 'w-10 h-10';
      kopMb = 'mb-1';
      titleMb = 'mb-1';
      infoMb = 'mb-1';
      statsMb = 'mb-1';
    } else {
      fontSize = '8pt';
      rowPy = 'py-[1.5px]';
      kopSize = 'text-[9px]';
      kopInstSize = 'text-[11px]';
      titleSize = 'text-xs';
      infoSize = 'text-[9px]';
      ttdMb = 'mb-[25px]';
      ttdMt = 'mt-2';
      logoSize = 'w-9 h-9';
      kopMb = 'mb-1';
      titleMb = 'mb-0.5';
      infoMb = 'mb-1';
      statsMb = 'mb-1';
    }

    return (
      <div
        className="relative box-border bg-white text-black px-3"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize }}
      >
        {/* KOP SURAT */}
        <div className={`flex items-center justify-between border-b-[3px] border-black pb-1 ${kopMb} relative px-1`}>
          <div className="absolute left-0 right-0 bottom-[-4px] h-[1px] bg-black" />

          <div className={`${logoSize} flex-shrink-0 flex items-center justify-center`}>
            {logoKiri ? <img src={logoKiri} className="max-w-full max-h-full object-contain" /> : <div className={logoSize} />}
          </div>

          <div className="flex-1 text-center flex flex-col justify-center px-2" style={{ lineHeight: '1.15' }}>
            <div className={`font-bold ${kopSize} uppercase tracking-wide`}>{kementerian}</div>
            <div className={`font-bold ${kopSize} uppercase tracking-wide`}>PANITIA {namaUjian}</div>
            <div className={`font-bold ${kopSize} uppercase tracking-wide`}>TAHUN AJARAN {tahunAjaran}</div>
            <div className={`font-bold ${kopInstSize} uppercase tracking-wide`}>{instansi}</div>
            <div className="text-[8px] mt-0.5">{alamat}</div>
          </div>

          <div className={`${logoSize} flex-shrink-0 flex items-center justify-center`}>
            {logoKanan ? <img src={logoKanan} className="max-w-full max-h-full object-contain" /> : <div className={logoSize} />}
          </div>
        </div>

        {/* TITLE */}
        <div className={`text-center font-bold ${titleSize} tracking-widest ${titleMb}`}>DAFTAR NILAI</div>

        {/* INFO BAR */}
        <div className={`${infoMb} ${infoSize}`}>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">
              <span>Mata Pelajaran</span>
              <span className="mx-1">:</span>
              <span className="font-bold uppercase">{mapel}</span>
            </div>
            <div>
              <span>Ruang</span>
              <span className="mx-1">:</span>
              <span className="font-semibold">{room?.namaRuang || '-'}</span>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">
              <span>Hari / Tanggal</span>
              <span className="mx-1">:</span>
              <span className="font-semibold">{hariStr ? `${hariStr}, ${tglStr}` : '-'}</span>
            </div>
            <div>
              <span>Waktu</span>
              <span className="mx-1">:</span>
              <span className="font-semibold">{jadwal ? `${jadwal.waktuMulai} – ${jadwal.waktuSelesai} WITA` : '-'}</span>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">
              <span>Kelas</span>
              <span className="mx-1">:</span>
              <span className="font-semibold">{kelas || '-'}</span>
            </div>
            <div>
              <span>Format</span>
              <span className="mx-1">:</span>
              <span className="font-semibold">
                {fmt.tipe === 'pilihan_ganda' ? 'Pilihan Ganda' :
                 fmt.tipe === 'esai' ? 'Esai' :
                 `Campuran (PG ${fmt.bobotPG}% + Esai ${fmt.bobotEsai}%)`}
              </span>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse border border-black text-center" style={{ fontSize }}>
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-bold w-[30px]">No</th>
              <th className="border border-black px-1 py-1 font-bold w-[22%]">No. Peserta</th>
              <th className="border border-black px-1 py-1 font-bold text-left">Nama Peserta</th>
              {showPG && (
                <th className="border border-black px-1 py-1 font-bold w-[10%]">PG</th>
              )}
              {showEsai && (
                <th className="border border-black px-1 py-1 font-bold w-[10%]">Esai</th>
              )}
              <th className="border border-black px-1 py-1 font-bold w-[12%]">Nilai Akhir</th>
              {fmt.kolomRemedial && (
                <th className="border border-black px-1 py-1 font-bold w-[10%]">Remedial</th>
              )}
            </tr>
          </thead>
          <tbody>
            {students.map((s: any, idx: number) => (
              <tr key={s.id || idx}>
                <td className={`border border-black px-1 ${rowPy}`}>{idx + 1}</td>
                <td className={`border border-black px-1 ${rowPy} text-left`} style={{ fontFamily: 'monospace', fontSize: count > 30 ? '7pt' : '8pt' }}>{s.nomorPeserta}</td>
                <td className={`border border-black px-1 ${rowPy} text-left`}>{s.siswa?.fullName || '-'}</td>
                {showPG && <td className={`border border-black px-1 ${rowPy}`}>&nbsp;</td>}
                {showEsai && <td className={`border border-black px-1 ${rowPy}`}>&nbsp;</td>}
                <td className={`border border-black px-1 ${rowPy}`}>&nbsp;</td>
                {fmt.kolomRemedial && <td className={`border border-black px-1 ${rowPy}`}>&nbsp;</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {/* STATS */}
        <div className={`${statsMb} ${infoSize} mt-1`}>
          <div className="flex gap-4">
            <span>Jumlah Peserta: <b>{students.length}</b> Orang</span>
            {showPG && <span>Jumlah Soal PG: <b>{fmt.jumlahPG}</b></span>}
            {showEsai && <span>Jumlah Soal Esai: <b>{fmt.jumlahEsai}</b></span>}
          </div>
        </div>

        {/* TTD - Guru Mata Pelajaran */}
        <div className={`flex justify-end ${ttdMt}`}>
          <div className="w-[250px] text-center" style={{ fontSize }}>
            <div className="mb-1">Guru Mata Pelajaran</div>
            <div className={ttdMb}>&nbsp;</div>
            <div className="border-b border-black w-[180px] mx-auto">&nbsp;</div>
            <div className="mt-0.5" style={{ fontSize: '8pt' }}>NIP. ........................................</div>
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
          .no-print { display: none !important; }
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
