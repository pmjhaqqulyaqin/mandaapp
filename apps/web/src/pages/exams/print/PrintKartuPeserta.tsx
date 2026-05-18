import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr || '-';
  }
}

/**
 * QR Code rendered as a pre-generated data URL image (much faster than per-component canvas).
 * The data URL is computed once and reused across duplicate card renders.
 */
const QrCodeImg = ({ dataUrl, size = 44 }: { dataUrl: string; size?: number }) => (
  <img
    src={dataUrl}
    alt="QR"
    width={size}
    height={size}
    style={{ width: size, height: size, imageRendering: 'pixelated' }}
    className="mix-blend-multiply"
  />
);

export const PrintKartuPeserta = () => {
  const { ujianId } = useParams();
  const [searchParams] = useSearchParams();
  const ruangId = searchParams.get('ruangId');
  
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [qrMap, setQrMap] = useState<Map<string, string>>(new Map());
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, dRes, sRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(`/exams/${ujianId}/distribusi`),
          apiClient('/settings').catch(() => null)
        ]);
        setUjian(uRes);
        
        let dist = dRes as any[];
        if (ruangId && ruangId !== 'ALL') {
          dist = dist.filter((x: any) => x.ruangId === ruangId);
        }
        
        // assign urutan per ruang
        const counts: Record<string, number> = {};
        dist = dist.map((x: any) => {
           const rId = x.ruangId || 'unknown';
           counts[rId] = (counts[rId] || 0) + 1;
           return { ...x, urutRuang: counts[rId] };
        });
        
        setDistribusi(dist);
        // Parse settings array into key-value map
        const settingsArr = Array.isArray((sRes as any)?.data || sRes) ? ((sRes as any)?.data || sRes) : [];
        const settingsMap: Record<string, string> = {};
        for (const s of settingsArr) { if (s.key && s.value) settingsMap[s.key] = s.value; }
        setGlobalSettings(settingsMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId, ruangId]);

  // ── Batch QR Code Generation ──
  // Generate all QR codes in a single batch pass using toDataURL (no DOM canvases needed).
  // This runs once after data is loaded, producing a Map<key, dataUrl>.
  useEffect(() => {
    if (loading || !ujian || distribusi.length === 0) return;

    const tahunAjaran = ujian.tahunAjaran || new Date().getFullYear().toString();
    const lastYearStr = tahunAjaran.length >= 2 ? tahunAjaran.slice(-2) : '00';
    const semesterLower = (ujian?.semester || '').toLowerCase();
    const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';

    const generateAll = async () => {
      const map = new Map<string, string>();
      // Process in chunks of 20 to avoid blocking the main thread
      const chunkSize = 20;
      for (let i = 0; i < distribusi.length; i += chunkSize) {
        const chunk = distribusi.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (item) => {
          const s = item.siswa || {};
          const ruang = item.ruang?.namaRuang || item.ruangId || '-';
          
          const kelasStr = (s.fullClassName || s.className || '').toUpperCase();
          let gradeCode = '00';
          if (kelasStr.includes('XII') || kelasStr.includes('12')) gradeCode = '12';
          else if (kelasStr.includes('XI') || kelasStr.includes('11')) gradeCode = '11';
          else if (kelasStr.includes('X') || kelasStr.includes('10')) gradeCode = '10';
          
          const ruangMatch = ruang.match(/\d+/);
          const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
          const ruangCode = ruangNumber.toString().padStart(2, '0');
          const urutCode = (item.urutRuang || 1).toString().padStart(3, '0');
          const nomorPeserta = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;

          const qrData = `Nama: ${s.fullName}\nNo. Peserta: ${nomorPeserta}\nNIS: ${s.nis}\nNISN: ${s.nisn}\nKelas: ${s.fullClassName || s.className}\nRuang: ${ruang}`;
          
          try {
            const url = await QRCode.toDataURL(qrData, {
              width: 88, // 44 * 2 for retina
              margin: 0,
              errorCorrectionLevel: 'L', // L is fastest, still reliable
            });
            map.set(item.id || `${i}-${s.id}`, url);
          } catch {
            // Skip failed QR
          }
        }));
        // Yield to main thread between chunks
        if (i + chunkSize < distribusi.length) {
          await new Promise(r => setTimeout(r, 0));
        }
      }
      setQrMap(map);
      setQrReady(true);
    };

    generateAll();
  }, [loading, ujian, distribusi]);

  // Auto-print after QR codes are ready
  useEffect(() => {
    if (!qrReady || !ujian || searchParams.get('preview') === 'true') return;
    const timer = setTimeout(() => {
       window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, [qrReady, ujian, searchParams]);

  if (loading || !qrReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-3">
        <Loader2 className="animate-spin text-violet-500" size={32} />
        <p className="text-sm text-gray-500">
          {loading ? 'Memuat data...' : `Generating QR Code (${qrMap.size}/${distribusi.length})...`}
        </p>
      </div>
    );
  }

  if (!ujian) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data Ujian Tidak Ditemukan</div>;
  }

  // Determine Settings
  const ttdMaster = ujian.pengaturan?.ttd || {};
  const ttdDist = ujian.pengaturan?.distribusiTtd || {};
  const config = ujian.pengaturan?.kartuPeserta || {};

  const logoKiri = globalSettings?.kemenag_logo_url || config.logoKiri || '';
  const logoKanan = globalSettings?.logo_url || config.logoKanan || '';
  const tempat = config.tempat || ttdDist.tempat || ttdMaster.tempat || 'Tempat';
  const tanggal = config.tanggal || ttdDist.tanggal || ttdMaster.tanggal || new Date().toISOString();
  const jabatan = config.jabatan || ttdDist.jabatan || ttdMaster.jabatan || 'Ketua Panitia';
  const nama = config.nama || ttdDist.nama || ttdMaster.nama || 'Nama Terang';
  const nip = config.nip || ttdDist.nip || ttdMaster.nip || '-';
  const signatureUrl = config.signatureUrl || '';

  // Nama ujian mengikuti field namaUjian di master ujian
  const namaUjian = (ujian.namaUjian || ujian.jenisUjian || ujian.title || 'UJIAN SEKOLAH').toUpperCase();
  // Tahun Ajaran mengikuti field tahunAjaran di master ujian
  const tahunAjaran = ujian.tahunAjaran || new Date().getFullYear().toString();

  // Membagi peserta per halaman (5 baris x 2 kartu = 10 kartu)
  const studentsPerPage = 5;
  const pages: any[][] = [];
  for (let i = 0; i < distribusi.length; i += studentsPerPage) {
    pages.push(distribusi.slice(i, i + studentsPerPage));
  }

  const Kartu = ({ item }: { item: any }) => {
    const s = item.siswa || {};
    const ruang = item.ruang?.namaRuang || item.ruangId || '-';
    
    // PEMBUATAN NOMOR PESERTA KUSTOM
    const lastYearStr = tahunAjaran.length >= 2 ? tahunAjaran.slice(-2) : '00';
    const semesterLower = (ujian?.semester || '').toLowerCase();
    const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
    
    const kelasStr = (s.fullClassName || s.className || '').toUpperCase();
    let gradeCode = '00';
    if (kelasStr.includes('XII') || kelasStr.includes('12')) gradeCode = '12';
    else if (kelasStr.includes('XI') || kelasStr.includes('11')) gradeCode = '11';
    else if (kelasStr.includes('X') || kelasStr.includes('10')) gradeCode = '10';
    
    const ruangMatch = ruang.match(/\d+/);
    const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
    const ruangCode = ruangNumber.toString().padStart(2, '0');
    
    const urutCode = (item.urutRuang || 1).toString().padStart(3, '0');
    const nomorPesertaKustom = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;

    // Get pre-generated QR data URL
    const qrDataUrl = qrMap.get(item.id || `${item.id}-${s.id}`) || '';

    // Penentuan foto avatar
    let photoSrc = s.photoUrl;
    if (!photoSrc) {
       const genderLower = (s.gender || '').toLowerCase();
       const isFemale = genderLower === 'p' || genderLower === 'perempuan';
       photoSrc = isFemale ? '/avatar-female.png' : '/avatar-male.png';
    }

    return (
      <div className="relative border-[1.5px] border-black p-1.5 flex flex-col font-sans box-border overflow-hidden bg-white" style={{ width: '86mm', height: '54mm' }}>
        
        {/* HEADER */}
        <div className="flex items-start gap-1 mb-1 border-b-[1.5px] border-black pb-1 text-center">
          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
             {logoKiri ? (
               <img src={logoKiri} alt="Logo Kiri" className="max-w-full max-h-full object-contain" />
             ) : (
               <div className="w-7 h-7" />
             )}
          </div>
          <div className="flex-1 px-0.5 flex flex-col justify-center min-h-[28px]">
            <h1 className="text-[9px] font-bold leading-tight m-0">KARTU PESERTA</h1>
            <h2 className="text-[9px] font-bold leading-tight m-0">{namaUjian}</h2>
            <h3 className="text-[8px] font-bold leading-tight m-0">TAHUN AJARAN {tahunAjaran}</h3>
          </div>
          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
             {logoKanan ? <img src={logoKanan} alt="Logo Kanan" className="max-w-full max-h-full object-contain" /> : <div className="w-7 h-7" />}
          </div>
        </div>

        {/* IDENTITY BODY */}
        <div className="flex-1 flex flex-col">
          <table className="w-full text-[8.5px] font-semibold tracking-tight text-left mb-0.5">
            <tbody>
              <tr>
                <td className="w-[58px] py-[0.3px] align-top">Nomor Peserta</td>
                <td className="w-1.5 py-[0.3px] align-top">:</td>
                <td className="py-[0.3px] font-bold uppercase">{nomorPesertaKustom}</td>
              </tr>
              <tr>
                <td className="py-[0.3px] align-top">Nama Peserta</td>
                <td className="py-[0.3px] align-top">:</td>
                <td className="py-[0.3px] font-bold uppercase">{s.fullName || '-'}</td>
              </tr>
              <tr>
                <td className="py-[0.3px] align-top">TTL</td>
                <td className="py-[0.3px] align-top">:</td>
                <td className="py-[0.3px] uppercase">{s.birthPlace || '-'}, {formatDate(s.birthDate)}</td>
              </tr>
              <tr>
                <td className="py-[0.3px] align-top">Kelas</td>
                <td className="py-[0.3px] align-top">:</td>
                <td className="py-[0.3px] uppercase">{s.fullClassName || s.className || '-'}</td>
              </tr>
              <tr>
                <td className="py-[0.3px] align-top">Ruang Ujian</td>
                <td className="py-[0.3px] align-top">:</td>
                <td className="py-[0.3px] font-bold uppercase">{ruang}</td>
              </tr>
            </tbody>
          </table>

          {/* BOTTOM SECTION: PHOTO & TTD & QR */}
          <div className="mt-auto flex justify-between h-[56px]">
            {/* PHOTO */}
            <div className="w-[42px] h-full border-[1.5px] border-black flex items-center justify-center bg-gray-100 flex-shrink-0 overflow-hidden">
               <img src={photoSrc} alt="Foto Peserta" className="w-full h-full object-cover" />
            </div>

            {/* TTD BLOCK */}
            <div className="flex-1 flex flex-col justify-end pl-1.5 pr-0.5 h-full">
              <div className="flex flex-col text-[7.5px] ml-1.5">
                <span>{tempat}, {formatDate(tanggal)}</span>
                <span>{jabatan},</span>
                <div className="h-5 my-0.5 relative flex items-center">
                   {signatureUrl ? (
                      <img src={signatureUrl} alt="TTD" className="h-[180%] w-auto max-w-[70px] object-contain mix-blend-multiply" style={{ marginTop: '-2px', marginLeft: '-8px' }} />
                   ) : (
                     <div className="w-full h-full" />
                   )}
                </div>
                <span className="font-bold uppercase underline underline-offset-2">{nama}</span>
                <span>NIP. {nip}</span>
              </div>
            </div>
              
            {/* QR CODE */}
            <div className="flex flex-col justify-start items-end w-[36px] h-full flex-shrink-0">
               <div className="border border-gray-200 overflow-hidden" style={{ width: 36, height: 36 }}>
                  {qrDataUrl && <QrCodeImg dataUrl={qrDataUrl} size={36} />}
               </div>
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
          margin: 7mm 8mm;
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
          padding: 7mm 8mm;
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        @media print {
          .page-container {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: auto;
            min-height: 0;
            height: auto;
          }
        }
      `}} />

      <div className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white print:min-h-0">
        {pages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className={`page-container ${pageIdx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
             
             <div className="grid grid-cols-2 gap-x-2 gap-y-[3mm]">
                {pageStudents.map((item: any, idx: number) => (
                  <React.Fragment key={`${item.id}-${idx}`}>
                    <Kartu item={item} />
                    <Kartu item={item} />
                  </React.Fragment>
                ))}
             </div>
             
          </div>
        ))}
        {pages.length === 0 && (
          <div className="page-container flex items-center justify-center text-gray-500 print:hidden shadow-lg">
            Belum ada peserta yang didistribusikan pada ujian/ruang ini.
          </div>
        )}
      </div>
    </>
  );
};
