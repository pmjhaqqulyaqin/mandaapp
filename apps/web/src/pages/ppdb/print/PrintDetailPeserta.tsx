import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const PrintDetailPeserta = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, sRes] = await Promise.all([
          apiClient(`/ppdb/admin/pendaftar/${id}`),
          apiClient('/settings').catch(() => null)
        ]);
        
        setData(res);
        
        const settingsArr = Array.isArray((sRes as any)?.data || sRes) ? ((sRes as any)?.data || sRes) : [];
        const settingsMap: Record<string, string> = {};
        for (const s of settingsArr) { if (s.key && s.value) settingsMap[s.key] = s.value; }
        setSettings(settingsMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && data && searchParams.get('preview') !== 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, data, searchParams]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-3 bg-gray-100">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
        <p className="text-sm text-gray-500">Memuat data pendaftar...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data pendaftar tidak ditemukan</div>;
  }

  const namaSekolah = settings?.school_name || 'Sekolah';
  const alamatSekolah = settings?.school_address || '';
  const logoUrl = settings?.logo_url || '';

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
        }
        .page-container {
          background-color: white;
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
          font-family: Arial, sans-serif;
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
        .table-data td { padding: 4px 0; }
        .table-data td:first-child { width: 180px; font-weight: bold; }
        .table-data td:nth-child(2) { width: 20px; }
      `}} />

      <div className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white print:min-h-0 text-gray-800 text-[13px]">
        <div className="page-container relative">
          
          {/* HEADER */}
          <div className="flex items-center gap-4 border-b-[3px] border-black pb-4 mb-6">
            <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <div className="w-20 h-20 bg-gray-200" />}
            </div>
            <div className="flex-1 text-center flex flex-col justify-center">
              <h1 className="text-xl font-bold uppercase tracking-wide m-0">FORMULIR PENDAFTARAN PESERTA DIDIK BARU</h1>
              <h2 className="text-2xl font-black uppercase tracking-wider mt-1 mb-1">{namaSekolah}</h2>
              <p className="text-xs m-0">{alamatSekolah}</p>
            </div>
            <div className="w-20 h-20 flex-shrink-0" />
          </div>

          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-sm"><b>No. Pendaftaran:</b> {data.noPendaftaran}</p>
              <p className="text-sm"><b>Jalur:</b> {data.jalur?.namaJalur || '-'}</p>
              <p className="text-sm"><b>Tanggal Daftar:</b> {formatDate(data.createdAt)}</p>
            </div>
            <div className="text-right">
              <div className="inline-block border-2 border-black px-4 py-2 font-bold uppercase text-lg">
                {data.status}
              </div>
            </div>
          </div>

          {/* DATA DIRI */}
          <div className="mb-6">
            <h3 className="font-bold border-b border-gray-400 pb-1 mb-3 uppercase text-sm">A. DATA DIRI PESERTA</h3>
            <table className="w-full table-data">
              <tbody>
                <tr><td>Nama Lengkap</td><td>:</td><td className="uppercase">{data.dataDiri?.namaLengkap || '-'}</td></tr>
                <tr><td>NISN / NIK</td><td>:</td><td>{data.nisn || '-'} / {data.dataDiri?.nik || '-'}</td></tr>
                <tr><td>Jenis Kelamin</td><td>:</td><td>{data.dataDiri?.jenisKelamin || '-'}</td></tr>
                <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>{data.dataDiri?.tempatLahir || '-'}, {formatDate(data.dataDiri?.tanggalLahir)}</td></tr>
                <tr><td>Agama</td><td>:</td><td>{data.dataDiri?.agama || '-'}</td></tr>
                <tr><td>Alamat Lengkap</td><td>:</td><td>{data.dataDiri?.alamat || '-'}</td></tr>
                <tr><td>Anak Ke</td><td>:</td><td>{data.dataDiri?.anakKe || '-'} dari {data.dataDiri?.jumlahSaudara || '-'} saudara</td></tr>
                <tr><td>No. Telepon / HP Ortu</td><td>:</td><td>{data.dataDiri?.noHpOrtu || '-'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* DATA SEKOLAH ASAL */}
          <div className="mb-6">
            <h3 className="font-bold border-b border-gray-400 pb-1 mb-3 uppercase text-sm">B. DATA SEKOLAH ASAL</h3>
            <table className="w-full table-data">
              <tbody>
                <tr><td>Nama Sekolah Asal</td><td>:</td><td className="uppercase">{data.dataSekolah?.namaSekolah || '-'}</td></tr>
                <tr><td>NPSN</td><td>:</td><td>{data.dataSekolah?.npsn || '-'}</td></tr>
                <tr><td>Status Sekolah</td><td>:</td><td>{data.dataSekolah?.statusSekolah || '-'}</td></tr>
                <tr><td>Tahun Lulus</td><td>:</td><td>{data.dataSekolah?.tahunLulus || '-'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* DATA ORANG TUA */}
          <div className="mb-6">
            <h3 className="font-bold border-b border-gray-400 pb-1 mb-3 uppercase text-sm">C. DATA ORANG TUA / WALI</h3>
            <table className="w-full table-data">
              <tbody>
                <tr><td>Nama Ayah</td><td>:</td><td className="uppercase">{data.dataDiri?.namaAyah || '-'}</td></tr>
                <tr><td>Pekerjaan Ayah</td><td>:</td><td>{data.dataDiri?.pekerjaanAyah || '-'}</td></tr>
                <tr><td>Nama Ibu</td><td>:</td><td className="uppercase">{data.dataDiri?.namaIbu || '-'}</td></tr>
                <tr><td>Pekerjaan Ibu</td><td>:</td><td>{data.dataDiri?.pekerjaanIbu || '-'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* NILAI RAPORT (If Any) */}
          {data.nilaiRaport?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold border-b border-gray-400 pb-1 mb-3 uppercase text-sm">D. REKAP NILAI RAPORT</h3>
              <table className="w-full border-collapse border border-gray-400 text-center text-[12px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 p-1">Semester</th>
                    <th className="border border-gray-400 p-1">B. Indonesia</th>
                    <th className="border border-gray-400 p-1">B. Inggris</th>
                    <th className="border border-gray-400 p-1">Matematika</th>
                    <th className="border border-gray-400 p-1">IPA</th>
                    <th className="border border-gray-400 p-1">IPS</th>
                    <th className="border border-gray-400 p-1">Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nilaiRaport.map((n: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-gray-400 p-1">{n.semester}</td>
                      <td className="border border-gray-400 p-1">{n.bIndonesia || '-'}</td>
                      <td className="border border-gray-400 p-1">{n.bInggris || '-'}</td>
                      <td className="border border-gray-400 p-1">{n.matematika || '-'}</td>
                      <td className="border border-gray-400 p-1">{n.ipa || '-'}</td>
                      <td className="border border-gray-400 p-1">{n.ips || '-'}</td>
                      <td className="border border-gray-400 p-1 font-bold">{n.rataRata || '-'}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="border border-gray-400 p-1" colSpan={6}>NILAI AKHIR</td>
                    <td className="border border-gray-400 p-1">{data.nilaiAkhir || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* PRESTASI (If Any) */}
          {data.prestasi?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold border-b border-gray-400 pb-1 mb-3 uppercase text-sm">E. PRESTASI</h3>
              <ul className="list-disc list-inside space-y-1">
                {data.prestasi.map((p: any, i: number) => (
                  <li key={i}>{p.namaKegiatan} - {p.peringkat} ({p.tingkat}, {p.tahun})</li>
                ))}
              </ul>
            </div>
          )}

          {/* TTD Pendaftar & Panitia */}
          <div className="mt-12 flex justify-between">
            <div className="text-center w-48">
              <p>Mengetahui,</p>
              <p>Panitia PPDB,</p>
              <br /><br /><br /><br />
              <p className="underline font-bold">.......................................</p>
            </div>
            <div className="text-center w-48">
              <p>Tanggal Cetak:</p>
              <p>{formatDate(new Date().toISOString())}</p>
              <br /><br /><br /><br />
              <p className="underline font-bold uppercase">{data.dataDiri?.namaLengkap || 'CALON PESERTA DIDIK'}</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
