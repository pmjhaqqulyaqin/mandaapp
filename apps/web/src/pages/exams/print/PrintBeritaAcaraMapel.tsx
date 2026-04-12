import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Mengkonversi tanggal ke string teks (misal: "Dua Belas") */
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

export const PrintBeritaAcaraMapel = () => {
  const { ujianId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [data, setData] = useState<{ jadwal: any, ruang: any, pengawas1: any, pengawas2: any }[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, sRes, jadwalRes, ruangRes, pengawasRes, empRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient('/settings').catch(() => null),
          apiClient(`/exams/${ujianId}/jadwal`).catch(() => []),
          apiClient(`/exams/${ujianId}/ruang`).catch(() => []),
          apiClient(`/exams/${ujianId}/pengawas`).catch(() => []),
          apiClient('/employees').catch(() => [])
        ]);

        setUjian(uRes);
        setGlobalSettings(sRes?.data || sRes || {});

        const jadwalData = Array.isArray(jadwalRes) ? jadwalRes : [];
        const ruangData = Array.isArray(ruangRes) ? ruangRes : [];
        const pengawasData = Array.isArray(pengawasRes) ? pengawasRes : [];
        const employees = Array.isArray(empRes) ? empRes : [];

        // Helper to resolve employee from kodeLabel
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

        const pages = [];

        if (jadwalData.length === 0 || ruangData.length === 0) {
          // If no jadwal/ruang, add one blank template
          pages.push({ jadwal: null, ruang: null, pengawas1: null, pengawas2: null });
        } else {
          // Generate combination of Jadwal x Ruang
          for (const jad of jadwalData) {
            for (const rng of ruangData) {
              const tugas = pengawasData.filter((p: any) => p.jadwalId === jad.id && p.ruangId === rng.id);
              let p1 = null;
              let p2 = null;
              
              // Pengawas 1 represents Numbers, Pengawas 2 represents Letters
              for (const t of tugas) {
                if (/^\d+$/.test(t.kodeLabel)) {
                  p1 = getEmpDataByKodeLabel(t.kodeLabel);
                } else {
                  p2 = getEmpDataByKodeLabel(t.kodeLabel);
                }
              }
              
              pages.push({ jadwal: jad, ruang: rng, pengawas1: p1, pengawas2: p2 });
            }
          }
        }
        setData(pages);
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
      }, 1500);
    }
  }, [loading, ujian]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-violet-500" size={32} /></div>;
  }

  if (!ujian) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data Ujian Tidak Ditemukan</div>;
  }

  const kop = ujian.pengaturan?.kop || {};
  const kartuSettings = ujian.pengaturan?.kartuPeserta || {};

  const kementerian = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
  const instansi = kop.instansi || 'MADRASAH ALIYAH NEGERI 2 LOMBOK TIMUR';
  const alamat = kop.alamat || 'Jl. Beririjarak Kec. Wanasaba Kab. Lombok Timur NTB';

  const logoKiri = kartuSettings.logoKiri || globalSettings?.kemenagLogoUrl || globalSettings?.schoolLogoUrl || '';
  const logoKanan = kartuSettings.logoKanan || '';

  const namaUjian = (ujian.namaUjian || ujian.jenisUjian || ujian.title || 'Asesmen Sumatif Akhir Semester (ASAS)').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || new Date().getFullYear().toString();

  const BeritaAcaraPage = ({ item }: { item: any }) => {
    const { jadwal, ruang, pengawas1, pengawas2 } = item;
    
    let hariStr = '';
    let tglStr = '';
    let blnStr = '';
    let thnStr = '';
    let thnWordsStr = '';
    let mapelStr = '';
    let ruangStr = '';
    let mulaiStr = '';
    let selesaiStr = '';

    if (jadwal?.tanggal) {
      const d = new Date(jadwal.tanggal);
      hariStr = HARI[d.getDay()];
      tglStr = d.getDate().toString();
      blnStr = BULAN[d.getMonth()];
      thnStr = d.getFullYear().toString();
      thnWordsStr = numberToWords(d.getFullYear());
      mapelStr = jadwal.mataPelajaran || mapelStr;
      mulaiStr = jadwal.waktuMulai || mulaiStr;
      selesaiStr = jadwal.waktuSelesai || selesaiStr;
    }
    
    if (ruang?.namaRuang) {
      ruangStr = ruang.namaRuang;
    }

    return (
      <div 
        className="relative box-border bg-white text-[15px] leading-relaxed px-5 text-justify"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {/* HEADER KOP SURAT */}
        <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-6 relative px-2">
          <div className="absolute left-0 right-0 bottom-[-5px] h-[1px] bg-black"></div>

          <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
             {logoKiri ? <img src={logoKiri} className="max-w-full max-h-full object-contain" /> : <div className="w-24 border border-white" />}
          </div>
          
          <div className="flex-1 text-center flex flex-col justify-center px-4 space-y-1">
            <h1 className="font-bold text-[16px] leading-tight m-0 uppercase tracking-wide">{kementerian}</h1>
            <h2 className="font-bold text-[16px] leading-tight m-0 uppercase tracking-wide">PANITIA {namaUjian} TAHUN AJARAN {tahunAjaran}</h2>
            <h3 className="font-bold text-[16px] leading-tight m-0 uppercase tracking-wider">{instansi}</h3>
            <p className="text-[14px] leading-tight m-0 mb-1">{alamat}</p>
          </div>

          <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
             {logoKanan ? <img src={logoKanan} className="max-w-full max-h-full object-contain" /> : <div className="w-24 border border-white" />}
          </div>
        </div>

        {/* TITLE */}
        <h3 className="text-center font-bold text-2xl tracking-widest mt-8 mb-8">BERITA ACARA</h3>

        {/* PARAGRAF 1 */}
        <div className="mb-4">
          <p className="mb-2" style={{ textIndent: '30px' }}>
             Pada Hari ini {hariStr ? <span className="italic mr-1 ml-1">{hariStr}</span> : <span className="border-b border-dotted border-black min-w-[70px] inline-block text-center mr-1 ml-1">&nbsp;</span>}
             Tanggal {tglStr ? <span className="italic mr-1 ml-1">{tglStr}</span> : <span className="border-b border-dotted border-black min-w-[30px] inline-block text-center mr-1 ml-1">&nbsp;</span>}
             Bulan {blnStr ? <span className="italic mr-1 ml-1">{blnStr}</span> : <span className="border-b border-dotted border-black min-w-[90px] inline-block text-center mr-1 ml-1">&nbsp;</span>}
             Tahun {thnStr ? <span className="italic mr-1 ml-1">{thnWordsStr}</span> : <span className="border-b border-dotted border-black min-w-[150px] inline-block text-center mr-1 ml-1">&nbsp;</span>} telah diselenggarakan {namaUjian} Tahun Ajaran {tahunAjaran},
          </p>
          
          <table className="w-full text-[15px] mt-2 border-separate" style={{ borderSpacing: '0 4px' }}>
            <tbody>
              <tr>
                <td className="w-[120px]">Mata Pelajaran</td>
                <td className="w-[10px] text-center">:</td>
                <td className={mapelStr ? 'italic uppercase pl-2' : 'border-b border-dotted border-black pl-2'} colSpan={5}>
                  {mapelStr || <span className="text-transparent">.</span>}
                </td>
              </tr>
              <tr>
                <td>Kelas Ruang</td>
                <td className="text-center">:</td>
                <td className={ruangStr ? 'italic text-center w-[150px]' : 'border-b border-dotted border-black w-[150px]'}>
                  {ruangStr || <span className="text-transparent">.</span>}
                </td>
                <td className="px-2 w-auto whitespace-nowrap">dari Pukul</td>
                <td className="w-[10px] text-center">:</td>
                <td className={mulaiStr ? 'italic text-center px-2 whitespace-nowrap' : 'border-b border-dotted border-black px-2'}>
                  {mulaiStr || <span className="inline-block w-16"></span>} {mulaiStr ? 'Wita' : 'Wita'} 
                  <span className="not-italic inline-block mx-2">s/d</span> 
                  <span className={selesaiStr ? 'italic' : ''}>{selesaiStr || <span className="inline-block w-16"></span>}</span> {selesaiStr ? 'Wita.' : 'Wita.'}
                </td>
              </tr>
            </tbody>
          </table>
          
          <table className="w-full text-[15px] mt-2 border-separate" style={{ borderSpacing: '0 4px' }}>
            <tbody>
              <tr>
                <td className="w-[120px]">Jumlah Peserta</td>
                <td className="w-[10px] text-center">:</td>
                <td className="w-[80px] border-b border-dotted border-black"></td>
                <td className="pl-2">Orang</td>
              </tr>
              <tr>
                <td>Yang Hadir</td>
                <td className="text-center">:</td>
                <td className="border-b border-dotted border-black"></td>
                <td className="pl-2">Orang,</td>
              </tr>
              <tr>
                <td>Yang Tidak Hadir</td>
                <td className="text-center">:</td>
                <td className="border-b border-dotted border-black"></td>
                <td className="pl-2">Orang,</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL */}
        <p className="font-bold italic mt-8 mb-2">Data Siswa Yang Berhalangan Hadir</p>
        <table className="w-full border-collapse border border-black mb-6 text-center text-[14px] mx-auto">
          <thead>
            <tr>
              <th className="border border-black p-3 font-bold w-[20%]">NOMOR PESERTA</th>
              <th className="border border-black p-3 font-bold w-[40%]">NAMA SISWA</th>
              <th className="border border-black p-3 font-bold w-[15%]">KELAS</th>
              <th className="border border-black p-3 font-bold w-[25%]">KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <tr key={i} className="h-8">
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PARAGRAF 2 */}
        <p className="mb-4">
           Setelah dibuka sampul Soal {namaUjian} dengan disaksikan oleh para peserta, berisikan Naskah Soal Sebanyak <span className="inline-block w-24 border-b border-dotted border-black"></span> Eksemplar, Lembar Jawaban <span className="inline-block w-24 border-b border-dotted border-black"></span> Eksemplar, Berita Acara sebanyak <span className="inline-block w-24 border-b border-dotted border-black"></span> Eksemplar, dan Daftar Hadir sebanyak <span className="inline-block w-24 border-b border-dotted border-black"></span> Eksemplar.
        </p>

        {/* CATATAN */}
        <p className="font-bold italic mt-8">Catatan:</p>
        <div className="space-y-6 mt-2">
            <div className="w-full border-b border-dotted border-black"></div>
            <div className="w-full border-b border-dotted border-black"></div>
            <div className="w-full border-b border-dotted border-black"></div>
            <div className="w-full border-b border-dotted border-black"></div>
            <div className="w-full border-b border-dotted border-black"></div>
        </div>

        <p className="mt-8 mb-16">
          Demikian berita acara ini dibuat dengan sesungguhnya.
        </p>

        {/* TANDA TANGAN SECTION */}
        <div className="flex justify-between mt-4">
           {/* Kiri (Pengawas I) */}
           <div className="w-[280px] flex flex-col pt-8">
             <div className="mb-[80px] ml-4 text-center">Pengawas I</div>
             <div className="text-center font-bold">
                 {pengawas1?.name ? (
                    <>
                       <div className="uppercase pb-1 leading-snug">{pengawas1.name}</div>
                       <div className="font-normal text-sm">NIP. {pengawas1.nip || '-'}</div>
                    </>
                 ) : (
                    <>
                       <div className="border-b border-black w-[200px] mx-auto">&nbsp;</div>
                       <div className="text-left font-bold mt-1 text-sm ml-6">NIP. <span className="font-normal">......................................</span></div>
                    </>
                 )}
             </div>
           </div>

           {/* Center Text (Yang membuat) */}
           <div className="absolute left-1/2 -translate-x-1/2 text-center w-[250px]">
             <div className="pb-8">Yang membuat berita acara</div>
           </div>

           {/* Kanan (Pengawas II) */}
           <div className="w-[280px] flex flex-col pt-8">
             <div className="mb-[80px] ml-4 text-center">Pengawas II</div>
             <div className="text-center font-bold">
                 {pengawas2?.name ? (
                    <>
                       <div className="uppercase pb-1 leading-snug">{pengawas2.name}</div>
                       <div className="font-normal text-sm">NIP. {pengawas2.nip || '-'}</div>
                    </>
                 ) : (
                    <>
                       <div className="border-b border-black w-[200px] mx-auto">&nbsp;</div>
                       <div className="text-left font-bold mt-1 text-sm ml-6">NIP. <span className="font-normal">......................................</span></div>
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
          margin: 15mm;
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
        {data.map((item, pageIdx) => (
          <div key={pageIdx} className={`page-container ${pageIdx < data.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
             <BeritaAcaraPage item={item} />
          </div>
        ))}
      </div>
    </>
  );
};
