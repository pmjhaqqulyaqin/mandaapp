import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const numberToWords = (num: number): string => {
  const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"];
  const teens = ["Sepuluh", "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas", "Enam Belas", "Tujuh Belas", "Delapan Belas", "Sembilan Belas"];
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return units[Math.floor(num / 10)] + " Puluh" + (num % 10 !== 0 ? " " + units[num % 10] : "");
  if (num < 1000) return (num === 100 ? "Seratus" : units[Math.floor(num / 100)] + " Ratus") + (num % 100 !== 0 ? " " + numberToWords(num % 100) : "");
  if (num < 10000) return (num < 2000 ? "Seribu" : units[Math.floor(num / 1000)] + " Ribu") + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "");
  return num.toString();
};

interface KelasRow {
  kelas: string;
  lakiLaki: number;
  perempuan: number;
  jumlah: number;
}

export const PrintBeritaAcaraSekolah = () => {
  const { ujianId } = useParams();
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [jadwal, setJadwal] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [panitia, setPanitia] = useState<any[]>([]);
  const [kelasData, setKelasData] = useState<KelasRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, sRes, jadwalRes, ruangRes, distRes, panitiaRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient('/settings').catch(() => null),
          apiClient<any[]>(`/exams/${ujianId}/jadwal`).catch(() => []),
          apiClient<any[]>(`/exams/${ujianId}/ruang`).catch(() => []),
          apiClient<any[]>(`/exams/${ujianId}/distribusi`).catch(() => []),
          apiClient<any[]>(`/exams/${ujianId}/panitia`).catch(() => []),
        ]);

        setUjian(uRes);
        setGlobalSettings(sRes?.data || sRes || {});

        const jadwalData = Array.isArray(jadwalRes) ? jadwalRes : [];
        const ruangData = Array.isArray(ruangRes) ? (ruangRes as any).data || ruangRes : [];
        const distData = Array.isArray(distRes) ? distRes : [];
        const panitiaData = Array.isArray(panitiaRes) ? panitiaRes : [];

        setJadwal(jadwalData);
        setRooms(ruangData);
        setDistribusi(distData);
        setPanitia(panitiaData);

        // Build kelas summary table (aggregate by class + gender)
        const kelasMap: Record<string, { lakiLaki: number; perempuan: number }> = {};
        for (const d of distData) {
          const siswa = d.siswa || {};
          const className = siswa.fullClassName || siswa.className || 'Tidak Diketahui';
          if (!kelasMap[className]) {
            kelasMap[className] = { lakiLaki: 0, perempuan: 0 };
          }
          const gender = (siswa.gender || '').toLowerCase();
          if (gender === 'laki-laki' || gender === 'l') {
            kelasMap[className].lakiLaki++;
          } else {
            kelasMap[className].perempuan++;
          }
        }

        // Sort by class name
        const sorted = Object.entries(kelasMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([kelas, data]) => ({
            kelas,
            lakiLaki: data.lakiLaki,
            perempuan: data.perempuan,
            jumlah: data.lakiLaki + data.perempuan,
          }));
        setKelasData(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId]);

  // Helper: convert image URL to base64 data URI
  const toBase64 = (url: string): Promise<string> => {
    if (!url) return Promise.resolve('');
    if (url.startsWith('data:')) return Promise.resolve(url);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
  };

  // === BUILD WORD HTML ===
  const generateWordHtml = async () => {
    const kop = ujian.pengaturan?.kop || {};
    const kartuS = ujian.pengaturan?.kartuPeserta || {};
    const baseUrl = window.location.origin;

    const lKiri = kartuS.logoKiri || globalSettings?.kemenagLogoUrl || globalSettings?.schoolLogoUrl || '';
    const lKanan = kartuS.logoKanan || '';
    const logoKiriUrl = lKiri ? (lKiri.startsWith('http') ? lKiri : baseUrl + lKiri) : '';
    const logoKananUrl = lKanan ? (lKanan.startsWith('http') ? lKanan : baseUrl + lKanan) : '';

    const logoKiriB64 = logoKiriUrl ? await toBase64(logoKiriUrl) : '';
    const logoKananB64 = logoKananUrl ? await toBase64(logoKananUrl) : '';

    const kem = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
    const inst = kop.instansi || 'MADRASAH ALIYAH NEGERI';
    const almt = kop.alamat || 'Alamat Sekolah';
    const nUjian = (ujian.namaUjian || '').toUpperCase();
    const tAjaran = ujian.tahunAjaran || '';

    const logoKiriImg = logoKiriB64 ? `<img src="${logoKiriB64}" style="width:50px;height:50px;" />` : '';
    const logoKananImg = logoKananB64 ? `<img src="${logoKananB64}" style="width:50px;height:50px;" />` : '';

    // Date info
    const tglMulai = ujian.tanggalMulai ? new Date(ujian.tanggalMulai) : null;
    const tglSelesai = ujian.tanggalSelesai ? new Date(ujian.tanggalSelesai) : null;

    let tglMulaiStr = '...............';
    let tglSelesaiStr = '...............';
    let hariMulaiStr = '...............';
    let hariSelesaiStr = '...............';

    if (tglMulai) {
      hariMulaiStr = HARI[tglMulai.getDay()];
      tglMulaiStr = `${tglMulai.getDate()} ${BULAN[tglMulai.getMonth()]} ${tglMulai.getFullYear()}`;
    }
    if (tglSelesai) {
      hariSelesaiStr = HARI[tglSelesai.getDay()];
      tglSelesaiStr = `${tglSelesai.getDate()} ${BULAN[tglSelesai.getMonth()]} ${tglSelesai.getFullYear()}`;
    }

    const totalMapel = new Set(jadwal.map(j => j.mataPelajaran).filter(Boolean)).size;
    const totalRuang = rooms.length;
    const totalPeserta = kelasData.reduce((s, r) => s + r.jumlah, 0);

    // Kelas table rows
    let kelasRows = '';
    let totalL = 0, totalP = 0;
    kelasData.forEach((row, idx) => {
      totalL += row.lakiLaki;
      totalP += row.perempuan;
      kelasRows += `
        <tr>
          <td style="border:1px solid black;padding:3px 6px;text-align:center;">${idx + 1}</td>
          <td style="border:1px solid black;padding:3px 6px;">${row.kelas}</td>
          <td style="border:1px solid black;padding:3px 6px;text-align:center;">${row.lakiLaki}</td>
          <td style="border:1px solid black;padding:3px 6px;text-align:center;">${row.perempuan}</td>
          <td style="border:1px solid black;padding:3px 6px;text-align:center;">${row.jumlah}</td>
        </tr>`;
    });
    kelasRows += `
      <tr style="font-weight:bold;">
        <td style="border:1px solid black;padding:3px 6px;text-align:center;" colspan="2">Jumlah</td>
        <td style="border:1px solid black;padding:3px 6px;text-align:center;">${totalL}</td>
        <td style="border:1px solid black;padding:3px 6px;text-align:center;">${totalP}</td>
        <td style="border:1px solid black;padding:3px 6px;text-align:center;">${totalL + totalP}</td>
      </tr>`;

    // Panitia list
    let panitiaList = '';
    panitia.forEach((p, idx) => {
      panitiaList += `<tr>
        <td style="padding:2px 0;">${idx + 1}.</td>
        <td style="padding:2px 5px;">${p.jabatan || '-'}</td>
        <td style="padding:2px 0;">:</td>
        <td style="padding:2px 5px;font-weight:bold;">${p.pegawai?.name || p.name || '-'}</td>
      </tr>`;
    });

    // Ketua panitia
    const ketua = panitia.find((p: any) => (p.jabatan || '').toLowerCase().includes('ketua'));
    const ketuaName = ketua?.pegawai?.name || ketua?.name || '';
    const ketuaNip = ketua?.pegawai?.nip || ketua?.nip || '';

    // Kepala Madrasah from pengaturan cetak
    const ttdKepsek = ujian.pengaturan?.ttd || {};
    const kepsekName = ttdKepsek.nama || '';
    const kepsekNip = ttdKepsek.nip || '';
    const kepsekJabatan = ttdKepsek.jabatan || 'Kepala Madrasah';

    const catatanLines = [0,1,2].map(() => `<p style="border-bottom:1px dotted black;margin:8px 0;">&nbsp;</p>`).join('');

    return `
      <div style="font-family:'Times New Roman',serif;font-size:11pt;">
        <!-- KOP -->
        <table style="width:100%;border-bottom:3px solid black;margin-bottom:8px;border-collapse:collapse;">
          <tr>
            <td style="width:60px;text-align:center;vertical-align:middle;">${logoKiriImg}</td>
            <td style="text-align:center;line-height:1.15;vertical-align:middle;">
              <p style="margin:0;font-weight:bold;font-size:10pt;text-transform:uppercase;">${kem}</p>
              <p style="margin:0;font-weight:bold;font-size:10pt;text-transform:uppercase;">PANITIA ${nUjian}</p>
              <p style="margin:0;font-weight:bold;font-size:10pt;text-transform:uppercase;">TAHUN AJARAN ${tAjaran}</p>
              <p style="margin:1px 0 0 0;font-weight:bold;font-size:12pt;text-transform:uppercase;">${inst}</p>
              <p style="margin:1px 0 0 0;font-size:8pt;">${almt}</p>
            </td>
            <td style="width:60px;text-align:center;vertical-align:middle;">${logoKananImg}</td>
          </tr>
        </table>

        <!-- JUDUL -->
        <p style="text-align:center;font-weight:bold;font-size:14pt;letter-spacing:3px;margin:10px 0;">BERITA ACARA</p>
        <p style="text-align:center;font-weight:bold;font-size:11pt;margin:-5px 0 10px 0;">Pelaksanaan ${nUjian} Tahun Ajaran ${tAjaran}</p>

        <!-- PARAGRAF 1 -->
        <p style="text-indent:30px;text-align:justify;line-height:1.8;font-size:11pt;">
          Berdasarkan surat keputusan panitia pelaksanaan ujian, pada hari <i>${hariMulaiStr}</i> tanggal <i>${tglMulaiStr}</i>
          sampai dengan hari <i>${hariSelesaiStr}</i> tanggal <i>${tglSelesaiStr}</i> telah diselenggarakan
          <b>${nUjian}</b> Tahun Ajaran <b>${tAjaran}</b> bertempat di <b>${inst}</b>, dengan jumlah mata pelajaran sebanyak
          <b>${totalMapel}</b> mata pelajaran, menggunakan <b>${totalRuang}</b> ruang ujian.
        </p>

        <!-- TABEL PESERTA PER KELAS -->
        <p style="font-weight:bold;margin:10px 0 5px 0;font-size:11pt;">Data Peserta Ujian:</p>
        <table style="width:100%;border-collapse:collapse;font-size:11pt;">
          <tr>
            <th style="border:1px solid black;padding:4px;width:30px;text-align:center;font-weight:bold;">No</th>
            <th style="border:1px solid black;padding:4px;font-weight:bold;">Kelas</th>
            <th style="border:1px solid black;padding:4px;width:80px;text-align:center;font-weight:bold;">Laki-laki</th>
            <th style="border:1px solid black;padding:4px;width:80px;text-align:center;font-weight:bold;">Perempuan</th>
            <th style="border:1px solid black;padding:4px;width:80px;text-align:center;font-weight:bold;">Jumlah</th>
          </tr>
          ${kelasRows}
        </table>

        <!-- SUSUNAN PANITIA -->
        ${panitia.length > 0 ? `
          <p style="font-weight:bold;margin:10px 0 5px 0;font-size:11pt;">Susunan Panitia Pelaksanaan:</p>
          <table style="font-size:11pt;margin-left:15px;">${panitiaList}</table>
        ` : ''}

        <!-- CATATAN -->
        <p style="font-weight:bold;font-style:italic;margin:10px 0 0 0;font-size:11pt;">Catatan:</p>
        ${catatanLines}

        <p style="margin:8px 0;font-size:11pt;">Demikian berita acara ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.</p>

        <!-- TANDA TANGAN -->
        <table style="width:100%;margin-top:10px;font-size:11pt;">
          <tr>
            <td style="width:50%;text-align:center;vertical-align:top;">Ketua Panitia</td>
            <td style="width:50%;text-align:center;vertical-align:top;">${kepsekJabatan}</td>
          </tr>
          <tr style="height:50px;"><td>&nbsp;</td><td>&nbsp;</td></tr>
          <tr>
            <td style="text-align:center;font-weight:bold;">
              ${ketuaName ? `${ketuaName}<br/><span style="font-weight:normal;font-size:9pt;">NIP. ${ketuaNip}</span>` : '(......................................)<br/><span style="font-weight:normal;font-size:9pt;">NIP. ........................................</span>'}
            </td>
            <td style="text-align:center;font-weight:bold;">
              ${kepsekName ? `${kepsekName}<br/><span style="font-weight:normal;font-size:9pt;">NIP. ${kepsekNip}</span>` : '(......................................)<br/><span style="font-weight:normal;font-size:9pt;">NIP. ........................................</span>'}
            </td>
          </tr>
        </table>
      </div>
    `;
  };

  const query = new URLSearchParams(window.location.search);
  const isWordExport = query.get('export') === 'word';

  // Auto-print or Word download
  useEffect(() => {
    if (!loading && ujian) {
      setTimeout(async () => {
        if (isWordExport) {
          const wordContent = await generateWordHtml();
          const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Berita Acara Pelaksanaan</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: 'Times New Roman', serif; font-size: 11pt; }
            </style>
            </head><body>${wordContent}</body></html>`;
          const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Berita_Acara_Pelaksanaan.doc';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          window.print();
        }
      }, 1500);
    }
  }, [loading, ujian, isWordExport]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-violet-500" size={32} /></div>;
  }

  if (!ujian) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data Ujian Tidak Ditemukan</div>;
  }

  const kop = ujian.pengaturan?.kop || {};
  const kartuSettings = ujian.pengaturan?.kartuPeserta || {};

  const kementerian = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
  const instansi = kop.instansi || 'MADRASAH ALIYAH NEGERI';
  const alamat = kop.alamat || 'Alamat Sekolah';

  const logoKiri = kartuSettings.logoKiri || globalSettings?.kemenagLogoUrl || globalSettings?.schoolLogoUrl || '';
  const logoKanan = kartuSettings.logoKanan || '';

  const namaUjian = (ujian.namaUjian || 'UJIAN').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || '';

  // Dates
  const tglMulai = ujian.tanggalMulai ? new Date(ujian.tanggalMulai) : null;
  const tglSelesai = ujian.tanggalSelesai ? new Date(ujian.tanggalSelesai) : null;

  const formatTanggal = (d: Date | null) => {
    if (!d) return '...............';
    return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  };

  const totalMapel = new Set(jadwal.map(j => j.mataPelajaran).filter(Boolean)).size;
  const totalRuang = rooms.length;
  const totalL = kelasData.reduce((s, r) => s + r.lakiLaki, 0);
  const totalP = kelasData.reduce((s, r) => s + r.perempuan, 0);
  const totalPeserta = totalL + totalP;

  // Ketua panitia
  const ketua = panitia.find((p: any) => (p.jabatan || '').toLowerCase().includes('ketua'));
  const ketuaName = ketua?.pegawai?.name || ketua?.name || '';
  const ketuaNip = ketua?.pegawai?.nip || ketua?.nip || '';

  // Kepala Madrasah
  const ttdKepsek = ujian.pengaturan?.ttd || {};
  const kepsekName = ttdKepsek.nama || '';
  const kepsekNip = ttdKepsek.nip || '';
  const kepsekJabatan = ttdKepsek.jabatan || 'Kepala Madrasah';

  // Dynamic sizing based on kelas count + panitia count
  const totalItems = kelasData.length + panitia.length;
  let fontSize = '11pt';
  let rowPy = 'py-[3px]';
  let ttdMb = 'mb-[50px]';
  let sectionMt = 'mt-3';

  if (totalItems > 20) {
    fontSize = '9pt';
    rowPy = 'py-[2px]';
    ttdMb = 'mb-[30px]';
    sectionMt = 'mt-2';
  } else if (totalItems > 14) {
    fontSize = '10pt';
    rowPy = 'py-[2px]';
    ttdMb = 'mb-[35px]';
    sectionMt = 'mt-2';
  }

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
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white py-2 px-4 flex items-center justify-between text-sm">
        <span className="font-semibold">Preview: Berita Acara Pelaksanaan — {ujian.namaUjian}</span>
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
        <div className="page-container">
          <div className="relative box-border bg-white text-black px-3" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize }}>

            {/* KOP SURAT */}
            <div className="flex items-center justify-between border-b-[3px] border-black pb-1 mb-3 relative px-1">
              <div className="absolute left-0 right-0 bottom-[-4px] h-[1px] bg-black" />

              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                {logoKiri ? <img src={logoKiri} className="max-w-full max-h-full object-contain" /> : <div className="w-12" />}
              </div>

              <div className="flex-1 text-center flex flex-col justify-center px-2" style={{ lineHeight: '1.15' }}>
                <div className="font-bold text-[10px] uppercase tracking-wide">{kementerian}</div>
                <div className="font-bold text-[10px] uppercase tracking-wide">PANITIA {namaUjian}</div>
                <div className="font-bold text-[10px] uppercase tracking-wide">TAHUN AJARAN {tahunAjaran}</div>
                <div className="font-bold text-[12px] uppercase tracking-wide">{instansi}</div>
                <div className="text-[8px] mt-0.5">{alamat}</div>
              </div>

              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                {logoKanan ? <img src={logoKanan} className="max-w-full max-h-full object-contain" /> : <div className="w-12" />}
              </div>
            </div>

            {/* JUDUL */}
            <div className="text-center font-bold text-base tracking-[3px] mt-2 mb-0.5">BERITA ACARA</div>
            <div className="text-center font-bold text-[11px] mb-3">Pelaksanaan {namaUjian} Tahun Ajaran {tahunAjaran}</div>

            {/* PARAGRAF NARATIF */}
            <p className="indent-[30px] text-justify leading-[1.8]" style={{ fontSize }}>
              Berdasarkan surat keputusan panitia pelaksanaan ujian, pada hari <i>{tglMulai ? HARI[tglMulai.getDay()] : '...........'}</i> tanggal{' '}
              <i>{formatTanggal(tglMulai)}</i> sampai dengan hari{' '}
              <i>{tglSelesai ? HARI[tglSelesai.getDay()] : '...........'}</i> tanggal{' '}
              <i>{formatTanggal(tglSelesai)}</i> telah diselenggarakan{' '}
              <b>{namaUjian}</b> Tahun Ajaran <b>{tahunAjaran}</b> bertempat di{' '}
              <b>{instansi}</b>, dengan jumlah mata pelajaran sebanyak{' '}
              <b>{totalMapel}</b> mata pelajaran, menggunakan <b>{totalRuang}</b> ruang ujian.
            </p>

            {/* TABEL PESERTA PER KELAS */}
            <p className={`font-bold ${sectionMt} mb-1`} style={{ fontSize }}>Data Peserta Ujian:</p>
            <table className="w-full border-collapse border border-black text-center" style={{ fontSize }}>
              <thead>
                <tr>
                  <th className="border border-black px-1.5 py-1 font-bold w-[30px]">No</th>
                  <th className="border border-black px-1.5 py-1 font-bold text-left">Kelas</th>
                  <th className="border border-black px-1.5 py-1 font-bold w-[70px]">Laki-laki</th>
                  <th className="border border-black px-1.5 py-1 font-bold w-[70px]">Perempuan</th>
                  <th className="border border-black px-1.5 py-1 font-bold w-[70px]">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {kelasData.map((row, idx) => (
                  <tr key={idx}>
                    <td className={`border border-black px-1.5 ${rowPy}`}>{idx + 1}</td>
                    <td className={`border border-black px-1.5 ${rowPy} text-left`}>{row.kelas}</td>
                    <td className={`border border-black px-1.5 ${rowPy}`}>{row.lakiLaki}</td>
                    <td className={`border border-black px-1.5 ${rowPy}`}>{row.perempuan}</td>
                    <td className={`border border-black px-1.5 ${rowPy}`}>{row.jumlah}</td>
                  </tr>
                ))}
                {kelasData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-black px-2 py-4 text-gray-400 italic">
                      Belum ada data distribusi peserta
                    </td>
                  </tr>
                )}
                {/* Total row */}
                <tr className="font-bold">
                  <td className={`border border-black px-1.5 ${rowPy}`} colSpan={2}>Jumlah</td>
                  <td className={`border border-black px-1.5 ${rowPy}`}>{totalL}</td>
                  <td className={`border border-black px-1.5 ${rowPy}`}>{totalP}</td>
                  <td className={`border border-black px-1.5 ${rowPy}`}>{totalPeserta}</td>
                </tr>
              </tbody>
            </table>

            {/* SUSUNAN PANITIA */}
            {panitia.length > 0 && (
              <>
                <p className={`font-bold ${sectionMt} mb-1`} style={{ fontSize }}>Susunan Panitia Pelaksanaan:</p>
                <table className="ml-3" style={{ fontSize }}>
                  <tbody>
                    {panitia.map((p: any, idx: number) => (
                      <tr key={p.id || idx}>
                        <td className="pr-2 py-0.5">{idx + 1}.</td>
                        <td className="pr-2 py-0.5">{p.jabatan || '-'}</td>
                        <td className="pr-2 py-0.5">:</td>
                        <td className="py-0.5 font-bold">{p.pegawai?.name || p.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* CATATAN */}
            <p className={`font-bold italic ${sectionMt}`} style={{ fontSize }}>Catatan:</p>
            <div className="space-y-4 mt-1">
              <div className="w-full border-b border-dotted border-black" />
              <div className="w-full border-b border-dotted border-black" />
              <div className="w-full border-b border-dotted border-black" />
            </div>

            <p className="mt-3" style={{ fontSize }}>
              Demikian berita acara ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.
            </p>

            {/* TANDA TANGAN */}
            <div className="flex justify-between mt-4" style={{ fontSize }}>
              {/* Ketua Panitia */}
              <div className="w-[45%] text-center">
                <div className={`font-semibold ${ttdMb}`}>Ketua Panitia</div>
                <div className="font-bold">
                  {ketuaName ? (
                    <>
                      <div className="uppercase pb-1 leading-snug">{ketuaName}</div>
                      <div className="font-normal text-[9pt]">NIP. {ketuaNip || '-'}</div>
                    </>
                  ) : (
                    <>
                      <div className="border-b border-black w-[180px] mx-auto">&nbsp;</div>
                      <div className="font-normal mt-1 text-[9pt]">NIP. ........................................</div>
                    </>
                  )}
                </div>
              </div>

              {/* Kepala Madrasah */}
              <div className="w-[45%] text-center">
                <div className={`font-semibold ${ttdMb}`}>{kepsekJabatan}</div>
                <div className="font-bold">
                  {kepsekName ? (
                    <>
                      <div className="uppercase pb-1 leading-snug">{kepsekName}</div>
                      <div className="font-normal text-[9pt]">NIP. {kepsekNip || '-'}</div>
                    </>
                  ) : (
                    <>
                      <div className="border-b border-black w-[180px] mx-auto">&nbsp;</div>
                      <div className="font-normal mt-1 text-[9pt]">NIP. ........................................</div>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};
