import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr || '-';
  }
}

export const PrintKartuPeserta = () => {
  const { ujianId } = useParams();
  const [searchParams] = useSearchParams();
  const ruangId = searchParams.get('ruangId');
  
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [distribusi, setDistribusi] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, dRes, sRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(`/exams/${ujianId}/distribusi`),
          apiClient('/settings').catch(() => null)
        ]);
        setUjian(uRes);
        
        let dist = dRes;
        if (ruangId && ruangId !== 'ALL') {
          dist = dist.filter((x: any) => x.ruangId === ruangId);
        }
        setDistribusi(dist);
        setGlobalSettings(sRes?.data || sRes || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId, ruangId]);

  useEffect(() => {
    if (!loading && ujian) {
      setTimeout(() => {
         window.print();
      }, 1500);
    }
  }, [loading, ujian]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-violet-500" size={32} /></div>;
  }

  if (!ujian) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data Ujian Tidak Ditemukan</div>;
  }

  // Determine Settings
  const ttdMaster = ujian.pengaturan?.ttd || {};
  const ttdDist = ujian.pengaturan?.distribusiTtd || {};
  const config = ujian.pengaturan?.kartuPeserta || {};

  const logoKiri = config.logoKiri || globalSettings?.kemenagLogoUrl || globalSettings?.schoolLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png';
  const logoKanan = config.logoKanan || '';
  const tempat = config.tempat || ttdDist.tempat || ttdMaster.tempat || 'Tempat';
  const tanggal = config.tanggal || ttdDist.tanggal || ttdMaster.tanggal || new Date().toISOString();
  const jabatan = config.jabatan || ttdDist.jabatan || ttdMaster.jabatan || 'Ketua Panitia';
  const nama = config.nama || ttdDist.nama || ttdMaster.nama || 'Nama Terang';
  const nip = config.nip || ttdDist.nip || ttdMaster.nip || '-';
  const signatureUrl = config.signatureUrl || '';

  const title = ujian.jenisUjian?.toUpperCase() || ujian.title?.toUpperCase() || 'UJIAN SEKOLAH';
  const academicYear = ujian.academicYear || new Date().getFullYear().toString();

  // Membagi peserta per halaman (3 baris x 2 kartu)
  const studentsPerPage = 3;
  const pages: any[][] = [];
  for (let i = 0; i < distribusi.length; i += studentsPerPage) {
    pages.push(distribusi.slice(i, i + studentsPerPage));
  }

  const Kartu = ({ item }: { item: any }) => {
    const s = item.siswa || {};
    const ruang = item.ruang?.namaRuang || item.ruangId || '-';
    
    // QR Code (menggunakan google charts agar lebih stabil dan tidak kena rate limit besar-besaran)
    const qrData = `Nama: ${s.fullName}\nNIS: ${s.nis}\nNISN: ${s.nisn}\nKelas: ${s.fullClassName || s.className}\nRuang: ${ruang}`;
    const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`;

    // Penentuan foto avatar
    let photoSrc = s.photoUrl;
    if (!photoSrc) {
       // Buat avatar fallback berdasarkan L/P
       const isFemale = s.gender === 'P';
       // Menggunakan avatar netral SVG dari dicebear atau UI Avatars jika tidak ada gender
       photoSrc = isFemale 
         ? `https://api.dicebear.com/7.x/notionists/svg?seed=${s.fullName || 'F'}&gender=female&backgroundColor=f1f5f9`
         : `https://api.dicebear.com/7.x/notionists/svg?seed=${s.fullName || 'M'}&gender=male&backgroundColor=f1f5f9`;
    }

    return (
      <div className="relative border-2 border-black p-3 h-[86mm] flex flex-col font-sans box-border overflow-hidden bg-white">
        
        {/* HEADER */}
        <div className="flex items-start gap-2 mb-3 border-b-2 border-black pb-2 text-center pt-1">
          <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
             <img src={logoKiri} alt="Logo Kiri" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex-1 px-1 flex flex-col justify-center min-h-[48px]">
            <h1 className="text-[12px] font-bold leading-tight m-0">KARTU PESERTA</h1>
            <h2 className="text-[12px] font-bold leading-tight m-0">{title}</h2>
            <h3 className="text-[11px] font-bold leading-tight m-0 mt-0.5 mt-0.5">TAHUN PELAJARAN {academicYear}</h3>
          </div>
          <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
             {logoKanan ? <img src={logoKanan} alt="Logo Kanan" className="max-w-full max-h-full object-contain" /> : <div className="w-12 h-12" />}
          </div>
        </div>

        {/* IDENTITY BODY */}
        <div className="flex-1 flex flex-col pl-1 pr-1">
          <table className="w-full text-[10px] sm:text-[11px] font-semibold tracking-tight text-left mb-2">
            <tbody>
              <tr>
                <td className="w-28 py-[1px] align-top">Nomor Peserta</td>
                <td className="w-3 py-[1px] align-top">:</td>
                <td className="py-[1px] font-bold uppercase">{s.nis || s.nisn || '-'}</td>
              </tr>
              <tr>
                <td className="py-[1px] align-top">Nama Peserta</td>
                <td className="py-[1px] align-top">:</td>
                <td className="py-[1px] font-bold uppercase">{s.fullName || '-'}</td>
              </tr>
              <tr>
                <td className="py-[1px] align-top">Tmp & Tanggal Lahir</td>
                <td className="py-[1px] align-top">:</td>
                <td className="py-[1px] uppercase">{s.birthPlace || '-'}, {formatDate(s.birthDate)}</td>
              </tr>
              <tr>
                <td className="py-[1px] align-top">Kelas</td>
                <td className="py-[1px] align-top">:</td>
                <td className="py-[1px] uppercase">{s.fullClassName || s.className || '-'}</td>
              </tr>
              <tr>
                <td className="py-[1px] align-top">Ruang Ujian</td>
                <td className="py-[1px] align-top">:</td>
                <td className="py-[1px] font-bold uppercase">{ruang}</td>
              </tr>
            </tbody>
          </table>

          {/* BOTTOM SECTION: PHOTO & TTD & QR */}
          <div className="mt-auto flex items-end justify-between pt-1">
            {/* PHOTO */}
            <div className="w-20 h-[105px] border-2 border-black flex items-center justify-center bg-gray-100 flex-shrink-0 overflow-hidden">
               <img src={photoSrc} alt="Foto Peserta" className="w-full h-full object-cover" />
            </div>

            {/* TTD BLOCK */}
            <div className="flex-1 flex justify-between pl-3 pr-2 items-end">
              <div className="flex flex-col text-[10px] ml-4">
                <span>{tempat}, {formatDate(tanggal)}</span>
                <span>{jabatan},</span>
                <div className="h-10 my-1 relative flex items-center">
                   {signatureUrl ? (
                      <img src={signatureUrl} alt="TTD" className="h-[200%] w-auto max-w-[120px] object-contain mix-blend-multiply" style={{ marginTop: '-4px', marginLeft: '-15px' }} />
                   ) : (
                     <div className="w-full h-full" /> // Placeholder empty space
                   )}
                </div>
                <span className="font-bold uppercase underline underline-offset-2">{nama}</span>
                <span>NIP. {nip}</span>
              </div>
              
              {/* QR CODE */}
              <div className="w-[54px] h-[54px] pb-1 border-gray-400 mix-blend-multiply">
                 <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain mix-blend-multiply" />
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
          margin: 10mm;
        }
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
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
            height: 100%;
          }
        }
      `}} />

      <div className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white print:min-h-0">
        {pages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className={`page-container ${pageIdx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
             
             <div className="grid grid-cols-2 gap-x-3 gap-y-[6mm]">
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
