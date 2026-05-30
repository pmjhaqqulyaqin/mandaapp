import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const PrintBuktiKelulusan = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, sRes, cRes] = await Promise.all([
          apiClient(`/ppdb/admin/pendaftar/${id}`),
          apiClient('/settings').catch(() => null),
          apiClient('/ppdb/config').catch(() => null) // public config
        ]);
        
        setData(res);
        
        // Parse settings
        const settingsArr = Array.isArray((sRes as any)?.data || sRes) ? ((sRes as any)?.data || sRes) : [];
        const settingsMap: Record<string, string> = {};
        for (const s of settingsArr) { if (s.key && s.value) settingsMap[s.key] = s.value; }
        setSettings(settingsMap);
        
        setConfig(cRes);

        // Generate QR Code
        if (res && res.noPendaftaran) {
          const qrUrl = await QRCode.toDataURL(
            `No. Pend: ${res.noPendaftaran}\nNama: ${res.dataDiri?.namaLengkap || '-'}\nStatus: ${res.status.toUpperCase()}`,
            { margin: 0, width: 90, errorCorrectionLevel: 'M' }
          );
          setQrCodeData(qrUrl);
        }
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
        <p className="text-sm text-gray-500">Memuat data...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data tidak ditemukan</div>;
  }

  const namaSekolah = settings?.school_name || 'MTs. Manda App';
  const alamatSekolah = settings?.school_address || 'Jl. Pendidikan No. 1, Jakarta';
  const logoUrl = settings?.logo_url || '';
  const isDiterima = data.status === 'diterima';
  const isCadangan = data.status === 'cadangan';
  const noSk = config?.nomorSk || '-';
  const tanggalSk = config?.tanggalPengumuman ? formatDate(config.tanggalPengumuman) : formatDate(new Date().toISOString());

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
          font-family: 'Times New Roman', Times, serif;
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

      <div className="min-h-screen bg-gray-300 py-10 print:py-0 print:bg-white print:min-h-0 text-gray-900">
        <div className="page-container relative">
          
          {/* KOP SURAT */}
          <div className="flex items-center gap-4 border-b-[3px] border-black pb-4 mb-1">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <div className="w-24 h-24 bg-gray-200" />}
            </div>
            <div className="flex-1 text-center flex flex-col justify-center">
              <h2 className="text-xl font-bold uppercase tracking-wider m-0">PANITIA PENERIMAAN PESERTA DIDIK BARU</h2>
              <h1 className="text-3xl font-black uppercase tracking-widest mt-1 mb-1">{namaSekolah}</h1>
              <p className="text-sm m-0">{alamatSekolah}</p>
            </div>
            <div className="w-24 h-24 flex-shrink-0" />
          </div>
          <div className="border-b-[1px] border-black mb-8" />

          {/* JUDUL */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold underline underline-offset-4 mb-1">SURAT KETERANGAN KELULUSAN</h3>
            <p className="text-sm">Nomor: {noSk}</p>
          </div>

          {/* PEMBUKA */}
          <div className="mb-6 text-justify text-base leading-relaxed">
            <p>
              Berdasarkan hasil seleksi Penerimaan Peserta Didik Baru (PPDB) {namaSekolah} Tahun Ajaran {data.jalur?.tahunAjaran || new Date().getFullYear()}, 
              serta keputusan rapat panitia pelaksana, maka dengan ini Kepala {namaSekolah} menerangkan bahwa:
            </p>
          </div>

          {/* DATA DIRI */}
          <div className="mb-8 ml-8 text-base">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-48 py-1.5 align-top font-semibold">Nomor Pendaftaran</td>
                  <td className="w-4 py-1.5 align-top">:</td>
                  <td className="py-1.5 font-bold uppercase">{data.noPendaftaran}</td>
                </tr>
                <tr>
                  <td className="py-1.5 align-top font-semibold">Nama Lengkap</td>
                  <td className="py-1.5 align-top">:</td>
                  <td className="py-1.5 uppercase font-bold">{data.dataDiri?.namaLengkap || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1.5 align-top font-semibold">NISN</td>
                  <td className="py-1.5 align-top">:</td>
                  <td className="py-1.5 uppercase">{data.nisn || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1.5 align-top font-semibold">Tempat, Tanggal Lahir</td>
                  <td className="py-1.5 align-top">:</td>
                  <td className="py-1.5 uppercase">{data.dataDiri?.tempatLahir || '-'}, {formatDate(data.dataDiri?.tanggalLahir)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 align-top font-semibold">Asal Sekolah</td>
                  <td className="py-1.5 align-top">:</td>
                  <td className="py-1.5 uppercase">{data.dataSekolah?.namaSekolah || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1.5 align-top font-semibold">Jalur Pendaftaran</td>
                  <td className="py-1.5 align-top">:</td>
                  <td className="py-1.5 uppercase">{data.jalur?.namaJalur || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* STATUS */}
          <div className="mb-8 text-justify text-base leading-relaxed">
            <p className="mb-4">Dinyatakan:</p>
            <div className="flex justify-center my-6">
              <div className="border-2 border-black px-8 py-3 bg-gray-50">
                <h2 className="text-3xl font-black uppercase tracking-widest text-center">
                  {isDiterima ? 'LULUS / DITERIMA' : isCadangan ? 'CADANGAN' : data.status.toUpperCase()}
                </h2>
              </div>
            </div>
            <p>
              Sebagai calon peserta didik baru di {namaSekolah}.
            </p>
          </div>

          {/* KETENTUAN TAMBAHAN */}
          {(isDiterima || isCadangan) && (
            <div className="mb-12 text-sm leading-relaxed border border-gray-300 p-4 bg-gray-50">
              <p className="font-bold mb-2">Catatan Penting:</p>
              <ol className="list-decimal list-outside ml-4 space-y-1">
                {isDiterima && (
                  <>
                    <li>Bagi calon peserta didik yang dinyatakan <b>LULUS</b> wajib melakukan proses <b>Daftar Ulang</b>.</li>
                    <li>Proses daftar ulang dapat dilakukan melalui sistem aplikasi ini pada menu Daftar Ulang.</li>
                    <li>Batas waktu daftar ulang adalah sampai dengan <b>{formatDate(config?.batasDaftarUlang) || '-'}</b>.</li>
                    <li>Apabila sampai batas waktu yang ditentukan tidak melakukan daftar ulang, maka calon peserta didik dianggap <b>MENGUNDURKAN DIRI</b>.</li>
                  </>
                )}
                {isCadangan && (
                  <>
                    <li>Calon peserta didik dinyatakan sebagai <b>CADANGAN</b>.</li>
                    <li>Status cadangan dapat berubah menjadi LULUS apabila terdapat kuota kosong dari peserta yang mengundurkan diri atau tidak melakukan daftar ulang.</li>
                    <li>Panitia akan menghubungi secara resmi apabila status berubah menjadi lulus.</li>
                  </>
                )}
              </ol>
            </div>
          )}

          {/* TTD SECTION */}
          <div className="flex justify-between mt-auto">
            <div className="w-32 h-32 flex flex-col justify-end">
              {qrCodeData && (
                <div className="border border-gray-200 p-1">
                  <img src={qrCodeData} alt="QR Code" className="w-full h-full mix-blend-multiply" />
                </div>
              )}
            </div>
            <div className="w-64 text-center">
              <p className="mb-1">Ditetapkan di: ............................</p>
              <p className="mb-20">Pada Tanggal: {tanggalSk}</p>
              
              <p className="font-bold underline underline-offset-2 m-0 uppercase">KETUA PANITIA PPDB</p>
              <p className="m-0">NIP. ............................</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
