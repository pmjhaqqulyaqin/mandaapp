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
          const isNum = /^\\d+$/.test(kodeLabel);
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
              if (tugas.length > 0) p1 = getEmpDataByKodeLabel(tugas[0].kodeLabel);
              if (tugas.length > 1) p2 = getEmpDataByKodeLabel(tugas[1].kodeLabel);
              
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
  const panitiaStr = kop.panitia; // optional second line
  const alamat = kop.alamat || 'Jl. Beririjarak Kec. Wanasaba Kab. Lombok Timur NTB';

  const logoKiri = kartuSettings.logoKiri || globalSettings?.kemenagLogoUrl || globalSettings?.schoolLogoUrl || '';
  const logoKanan = kartuSettings.logoKanan || '';

  const namaUjian = (ujian.namaUjian || ujian.jenisUjian || ujian.title || 'Asesmen Sumatif Akhir Semester (ASAS)').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || new Date().getFullYear().toString();

  const BeritaAcaraPage = ({ item }: { item: any }) => {
    const { jadwal, ruang, pengawas1, pengawas2 } = item;
    
    let hariStr = '........................';
    let tglStr = '.................';
    let blnStr = '..........................';
    let thnStr = '...................................';
    let mapelStr = '...................................................';
    let ruangStr = '...................';
    let mulaiStr = '...............';
    let selesaiStr = '...............';

    if (jadwal?.tanggal) {
      const d = new Date(jadwal.tanggal);
      hariStr = HARI[d.getDay()];
      tglStr = d.getDate().toString();
      blnStr = BULAN[d.getMonth()];
      thnStr = numberToWords(d.getFullYear());
      mapelStr = jadwal.mataPelajaran || mapelStr;
      mulaiStr = jadwal.waktuMulai || mulaiStr;
      selesaiStr = jadwal.waktuSelesai || selesaiStr;
    }
    
    if (ruang?.namaRuang) {
      ruangStr = ruang.namaRuang;
    }

    return (
      <div className="relative font-serif box-border bg-white text-[15px] leading-relaxed mx-10 text-justify">
        {/* HEADER KOP SURAT */}
        <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-6 relative px-2">
          {/* Internal bottom border for double line effect */}
          <div className="absolute left-0 right-0 bottom-[-5px] h-[1px] bg-black"></div>

          <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
             {logoKiri ? <img src={logoKiri} className="max-w-full max-h-full object-contain" /> : <div className="w-24 border border-white" />}
          </div>
          
          <div className="flex-1 text-center flex flex-col justify-center px-4">
            <h1 className="font-bold text-[17px] tracking-wide leading-snug">{kementerian}</h1>
            {panitiaStr && <h2 className="font-bold text-[17px] tracking-wide leading-snug">{panitiaStr}</h2>}
            <h2 className="font-bold text-[19px] tracking-wider leading-snug">{instansi}</h2>
            <p className="text-[13px] leading-tight mt-1">{alamat}</p>
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
             Pada Hari ini <span className="font-bold border-b border-dotted border-black min-w-[100px] inline-block text-center mr-1 ml-1">{hariStr}</span>
             Tanggal <span className="font-bold border-b border-dotted border-black min-w-[40px] inline-block text-center mr-1 ml-1">{tglStr}</span>
             Bulan <span className="font-bold border-b border-dotted border-black min-w-[120px] inline-block text-center mr-1 ml-1">{blnStr}</span>
             Tahun <span className="font-bold border-b border-dotted border-black min-w-[200px] inline-block text-center mr-1 ml-1">{thnStr}</span> telah diselenggarakan {namaUjian} Tahun Pelajaran {tahunAjaran},
          </p>
          
          <div className="flex">
             <div className="w-[120px]">Mata Pelajaran</div>
             <div className="mx-2">:</div>
             <div className="flex-1 border-b border-dotted border-black font-bold uppercase">{mapelStr !== '...................................................' ? mapelStr : ''}</div>
          </div>
          <div className="flex mt-1">
             <div className="w-[120px] flex justify-between"><span>Kelas</span> <span>Ruang</span></div>
             <div className="mx-2">:</div>
             <div className="flex-none w-[150px] border-b border-dotted border-black font-bold text-center">{ruangStr !== '...................' ? ruangStr : ''}</div>
             <div className="mx-3">dari Pukul</div>
             <div className="mx-2">:</div>
             <div className="w-[80px] border-b border-dotted border-black font-bold text-center">{mulaiStr !== '...............' ? mulaiStr : ''}</div>
             <div className="mx-2">Wita s/d</div>
             <div className="w-[80px] border-b border-dotted border-black font-bold text-center">{selesaiStr !== '...............' ? selesaiStr : ''}</div>
             <div className="ml-2">Wita.</div>
          </div>
          
          <div className="flex mt-2">
             <div className="w-[130px]">Jumlah Peserta</div>
             <div className="mx-2">:</div>
             <div className="w-[60px] border-b border-dotted border-black"></div>
             <div className="ml-2">Orang</div>
          </div>
          <div className="flex mt-1">
             <div className="w-[130px]">Yang Hadir</div>
             <div className="mx-2">:</div>
             <div className="w-[60px] border-b border-dotted border-black"></div>
             <div className="ml-2">Orang,</div>
          </div>
          <div className="flex mt-1">
             <div className="w-[130px]">Yang Tidak Hadir</div>
             <div className="mx-2">:</div>
             <div className="w-[60px] border-b border-dotted border-black"></div>
             <div className="ml-2">Orang,</div>
          </div>
        </div>

        {/* TABEL */}
        <p className="font-bold italic mt-8 mb-2">Data Siswa Yang Berhalangan Hadir</p>
        <table className="w-full border-collapse border border-black mb-6 text-center text-sm font-sans mx-auto">
          <thead>
            <tr>
              <th className="border border-black p-3 uppercase w-[20%]">Nomor Peserta</th>
              <th className="border border-black p-3 uppercase w-[40%]">Nama Siswa</th>
              <th className="border border-black p-3 uppercase w-[15%]">Kelas</th>
              <th className="border border-black p-3 uppercase w-[25%]">Keterangan</th>
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
            <div className="w-full border-b border-dotted border-black"></div>
        </div>

        <p className="mt-6 mb-16">
          Demikian berita acara ini dibuat dengan sesungguhnya.
        </p>

        {/* TANDA TANGAN SECTION */}
        <div className="flex justify-between mt-4">
           {/* Kiri (Pengawas I) */}
           <div className="text-center w-[250px] flex flex-col pt-8">
             <div className="mb-[100px]">Pengawas I</div>
             <div className="font-bold uppercase border-b border-black">
                {pengawas1?.name ? pengawas1.name : '\u00A0'}
             </div>
             <div className="text-left font-bold mt-1">
                NIP. <span className="font-normal">{pengawas1?.nip || '..............................................'}</span>
             </div>
           </div>

           {/* Kanan / Center (Yang membuat) */}
           <div className="text-center w-[250px] absolute left-1/2 -translate-x-1/2">
             <div className="pb-8">Yang membuat berita acara</div>
           </div>

           {/* Kanan (Pengawas II) */}
           <div className="text-center w-[250px] flex flex-col pt-8">
             <div className="mb-[100px]">Pengawas II</div>
             <div className="font-bold uppercase border-b border-black">
               {pengawas2?.name ? pengawas2.name : '\u00A0'}
             </div>
             <div className="text-left font-bold mt-1">
                NIP. <span className="font-normal">{pengawas2?.nip || '..............................................'}</span>
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
          padding: 15mm;
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
