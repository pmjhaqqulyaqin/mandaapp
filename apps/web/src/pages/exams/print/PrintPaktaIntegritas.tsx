import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatTanggal = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

export const PrintPaktaIntegritas = () => {
  const { ujianId } = useParams();
  const query = new URLSearchParams(window.location.search);
  const type = query.get('type'); // 'pengawas' | 'panitia'
  
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, empRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient('/employees')
        ]);

        setUjian(uRes);
        const employees = Array.isArray(empRes) ? empRes : [];

        let peopleData: any[] = [];

        if (type === 'panitia') {
          const panitiaRes = await apiClient(`/exams/${ujianId}/panitia`).catch(() => []);
          const panitiaList = Array.isArray(panitiaRes) ? panitiaRes : [];
          peopleData = panitiaList.map((p: any) => ({
            name: p.pegawai?.name || '',
            nip: p.pegawai?.nip || '-',
            tugas: 'Panitia Ujian'
          }));
        } else if (type === 'pengawas') {
          const groups = uRes?.pengaturan?.pengawasGroups || {};
          const group1 = groups.group1 || [];
          const group2 = groups.group2 || [];
          const uniqueIds = Array.from(new Set([...group1, ...group2]));
          
          peopleData = uniqueIds.map(id => {
            const emp = employees.find((e: any) => e.id === id);
            return emp ? {
              name: emp.name,
              nip: emp.nip || '-',
              tugas: 'Pengawas Ruang',
            } : null;
          }).filter(Boolean);
        }

        setPeople(peopleData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ujianId, type]);

  // Optionally auto-print
  // useEffect(() => {
  //   if (!loading && ujian && people.length > 0) {
  //     setTimeout(() => {
  //        window.print();
  //     }, 1000);
  //   }
  // }, [loading, ujian, people]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  }

  if (!ujian || people.length === 0) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data tidak ditemukan atau kosong.</div>;
  }

  const namaUjian = (ujian.namaUjian || ujian.jenisUjian || '').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || '';
  const tahunUjian = ujian.tanggalMulai ? new Date(ujian.tanggalMulai).getFullYear().toString() : tahunAjaran.split('/')[0];
  
  const tempat = ujian.pengaturan?.ttd?.tempat || 'Lombok Timur';
  const tanggalDate = ujian.pengaturan?.ttd?.tanggal || new Date().toISOString();
  const tanggalFormat = formatTanggal(tanggalDate);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 portrait;
          margin: 20mm;
        }
        @media print {
          html, body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break {
            page-break-after: always;
          }
          .page-container {
            page-break-inside: avoid;
          }
        }
        .page-container {
          background-color: white;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }
        @media print {
          .page-container {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: 100%;
            min-height: auto;
            height: auto;
          }
        }
      `}} />

      <div className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white text-[11pt] text-black">
        {/* Tombol cetak untuk preview */}
        <div className="max-w-[210mm] mx-auto mb-4 print:hidden flex justify-end gap-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm shadow hover:bg-indigo-700">
                Cetak PDF / Print
            </button>
        </div>

        {people.map((person, idx) => (
          <div key={idx} className={`page-container leading-relaxed text-justify ${idx < people.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
             
             {/* HEADER */}
             <div className="text-center font-bold text-[12pt] mb-12">
               <div className="mb-1">PAKTA INTEGRITAS</div>
               <div className="mb-1">PELAKSANAAN {namaUjian}</div>
               <div>TAHUN AJARAN {tahunAjaran}</div>
             </div>

             {/* CONTENT */}
             <div className="mb-6">
                Dalam rangka pelaksanaan {namaUjian} Tahun Ajaran {tahunAjaran}, saya {person.tugas === 'Panitia Ujian' ? 'Panitia' : 'Pengawas'}:
             </div>

             <table className="mb-6 ml-0">
               <tbody>
                 <tr>
                   <td className="w-36 py-1 align-top">Nama</td>
                   <td className="w-4 py-1 align-top">:</td>
                   <td className="py-1 align-top font-semibold">{person.name}</td>
                 </tr>
                 <tr>
                   <td className="py-1 align-top">NIP</td>
                   <td className="py-1 align-top">:</td>
                   <td className="py-1 align-top">{person.nip && person.nip !== '-' ? person.nip : '-'}</td>
                 </tr>
                 <tr>
                   <td className="py-1 align-top">Tugas Sebagai</td>
                   <td className="py-1 align-top">:</td>
                   <td className="py-1 align-top">{person.tugas}</td>
                 </tr>
               </tbody>
             </table>

             <div className="mb-4">
                dengan ini menyatakan bahwa:
             </div>

             <ol className="list-decimal pl-6 mb-6 space-y-2">
               <li className="pl-2">
                 Sanggup meningkatkan kualitas, kredibilitas, dan akuntabilitas pelaksanaan {namaUjian} untuk peningkatan mutu pendidikan;
               </li>
               <li className="pl-2">
                 Sanggup melaksanakan tugas sesuai Prosedur Operasi Standar penyelenggaraan {namaUjian} Tahun Ajaran {tahunAjaran};
               </li>
               <li className="pl-2">
                 Sanggup menjaga keamanan dan kerahasiaan bahan {namaUjian}; dan
               </li>
               <li className="pl-2">
                 Sanggup melaksanakan {namaUjian} secara jujur dan penuh tanggung jawab.
               </li>
             </ol>

             <div className="mb-6">
                Demikian pakta integritas ini saya buat dengan sebenar-benarnya tanpa ada unsur paksaan dari pihak manapun.
             </div>

             <div className="mb-16">
                Apabila saya melanggar hal-hal yang telah dinyatakan dalam pakta integritas ini, saya bersedia dikenakan sanksi sesuai dengan hukum dan ketentuan peraturan perundang-undangan yang berlaku.
             </div>

             {/* TANDA TANGAN */}
             <div className="flex justify-end mt-10">
                <div className="w-72 text-left">
                  <div className="mb-1">{tempat}, {tanggalFormat}</div>
                  <div className="mb-20">Yang Membuat Pakta Integritas</div>
                  <div className="font-bold underline text-[11pt]">{person.name}</div>
                  {person.nip && person.nip !== '-' && (
                    <div className="text-[11pt]">NIP. {person.nip}</div>
                  )}
                </div>
             </div>

          </div>
        ))}
      </div>
    </>
  );
};
