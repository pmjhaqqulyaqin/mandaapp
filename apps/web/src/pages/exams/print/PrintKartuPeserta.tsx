import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [distribusi, setDistribusi] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, dRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(`/exams/${ujianId}/distribusi`),
        ]);
        setUjian(uRes);
        setDistribusi(dRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId]);

  useEffect(() => {
    if (!loading && ujian) {
      setTimeout(() => {
         window.print();
      }, 1000);
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

  const logoKiri = config.logoKiri || 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lambang_Kementerian_Agama.svg/300px-Lambang_Kementerian_Agama.svg.png';
  const logoKanan = config.logoKanan || '';
  const tempat = config.tempat || ttdDist.tempat || ttdMaster.tempat || 'Tempat';
  const tanggal = config.tanggal || ttdDist.tanggal || ttdMaster.tanggal || new Date().toISOString();
  const jabatan = config.jabatan || ttdDist.jabatan || ttdMaster.jabatan || 'Ketua Panitia';
  const nama = config.nama || ttdDist.nama || ttdMaster.nama || 'Nama Terang';
  const nip = config.nip || ttdDist.nip || ttdMaster.nip || '-';
  const signatureUrl = config.signatureUrl || '';

  const title = ujian.title?.toUpperCase() || 'UJIAN SEKOLAH';
  const academicYear = ujian.academicYear || new Date().getFullYear().toString();

  // Membagi peserta per halaman (3 siswa per halaman = 3 baris x 2 kartu)
  const studentsPerPage = 3;
  const pages: any[][] = [];
  for (let i = 0; i < distribusi.length; i += studentsPerPage) {
    pages.push(distribusi.slice(i, i + studentsPerPage));
  }

  const Kartu = ({ item, type }: { item: any; type: 'PANITIA' | 'PESERTA' }) => {
    const s = item.siswa || {};
    const ruang = item.ruang?.namaRuang || item.ruangId || '-';
    
    // QR Code
    const qrData = `Nama: ${s.fullName}\nNIS: ${s.nis}\nNISN: ${s.nisn}\nKelas: ${s.fullClassName || s.className}\nRuang: ${ruang}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(qrData)}`;

    return (
      <div className="relative border-2 border-black p-3 h-[96mm] flex flex-col font-sans box-border overflow-hidden bg-white">
        
        {/* Lable Panitia / Peserta di Kanan Atas */}
        <div className="absolute top-2.5 right-2.5 border border-black px-1.5 py-0.5 text-[9px] font-bold">
          {type}
        </div>

        {/* HEADER */}
        <div className="flex items-start gap-2 mb-3 border-b-2 border-black pb-2 text-center relative pt-1">
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
          <table className="w-full text-[10px] sm:text-[11px] font-semibold tracking-tight text-left mb-3">
            <tbody>
              <tr>
                <td className="w-28 py-0.5 align-top">Nomor Peserta</td>
                <td className="w-3 py-0.5 align-top">:</td>
                <td className="py-0.5 font-bold uppercase">{s.nis || s.nisn || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Nama Peserta</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-bold uppercase">{s.fullName || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Tmp & Tanggal Lahir</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 uppercase">{s.birthPlace || '-'}, {formatDate(s.birthDate)}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Kelas</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 uppercase">{s.fullClassName || s.className || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">Ruang Ujian</td>
                <td className="py-0.5 align-top">:</td>
                <td className="py-0.5 font-bold uppercase">{ruang}</td>
              </tr>
            </tbody>
          </table>

          {/* BOTTOM SECTION: PHOTO & TTD & QR */}
          <div className="mt-auto flex items-end justify-between pt-1">
            {/* PHOTO */}
            <div className="w-20 h-[105px] border-2 border-black flex items-center justify-center bg-gray-100 flex-shrink-0 overflow-hidden">
               {s.photoUrl ? (
                 <img src={s.photoUrl} alt="Foto Peserta" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-3xl font-bold text-gray-300">{s.fullName?.charAt(0) || '-'}</span>
               )}
            </div>

            {/* TTD BLOCK */}
            <div className="flex-1 flex justify-between pl-3 pr-2 items-end">
              <div className="flex flex-col text-[10px] ml-4">
                <span>{tempat}, {formatDate(tanggal)}</span>
                <span>{jabatan},</span>
                <div className="h-10 my-1 relative flex items-center">
                   {signatureUrl ? (
                      <img src={signatureUrl} alt="TTD" className="h-full object-contain mix-blend-multiply" />
                   ) : (
                     <div className="w-full h-full" /> // Placeholder empty space
                   )}
                </div>
                <span className="font-bold uppercase underline underline-offset-2">{nama}</span>
                <span>NIP. {nip}</span>
              </div>
              
              {/* QR CODE */}
              <div className="w-[50px] h-[50px] pb-1 border-gray-400">
                 <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
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
        }
        @media print {
          .page-container {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: 100%;
          }
        }
      `}} />

      <div className="min-h-screen bg-gray-100 py-10 print:py-0 print:bg-white print:min-h-0">
        {pages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className={`page-container ${pageIdx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
             
             {/* Header Dokumen (hanya muncul jika dibutuhkan, tapi gambar pengguna tidak memiliki ini. Saya akan hilangkan agar persis) 
                 Wait, the user's image has a global header ON THE PAGE:
                 "KARTU PESERTA TES KEMAMPUAN AKADEMIK SMA/MA\nMAN 2 LOMBOK TIMUR\nTAHUN PELAJARAN 2025" 
                 We can add this to the top of each page.
             */}
             <div className="text-center font-bold text-[12px] leading-snug mb-3">
               <div>KARTU PESERTA {title}</div>
               <div className="uppercase">{ujian.pengaturan?.kop?.namaSekolah || 'MADRASAH ALIYAH NEGERI'}</div>
               <div className="uppercase">TAHUN PELAJARAN {academicYear}</div>
             </div>

             <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {pageStudents.map((item: any, idx: number) => (
                  <React.Fragment key={`${item.id}-${idx}`}>
                    <Kartu item={item} type="PANITIA" />
                    <Kartu item={item} type="PESERTA" />
                  </React.Fragment>
                ))}
             </div>
          </div>
        ))}
        {pages.length === 0 && (
          <div className="page-container flex items-center justify-center text-gray-500 print:hidden">
            Belum ada peserta yang didistribusikan pada ujian ini.
          </div>
        )}
      </div>
    </>
  );
};
