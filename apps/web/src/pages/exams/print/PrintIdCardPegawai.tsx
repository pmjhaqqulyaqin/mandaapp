import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

export const PrintIdCardPegawai = () => {
  const { ujianId } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'panitia'; // 'panitia' | 'pengawas'
  
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState<string>('MAN 2 LOMBOK TIMUR');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [kemenagLogoUrl, setKemenagLogoUrl] = useState<string>('');
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, dataRes, settingsRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          type === 'panitia' ? apiClient(`/exams/${ujianId}/panitia`) : apiClient('/employees'),
          apiClient('/settings')
        ]);
        
        setUjian(uRes);
        
        if (type === 'panitia') {
          setPegawaiList(dataRes.data || dataRes);
        } else {
          const allEmp = dataRes.data || dataRes;
          const g1 = uRes.pengaturan?.pengawasGroups?.group1 || [];
          const g2 = uRes.pengaturan?.pengawasGroups?.group2 || [];
          
          const pengawasPegawai: any[] = [];
          
          g1.forEach((id: string, i: number) => {
            const emp = allEmp.find((e: any) => e.id === id);
            if (emp) pengawasPegawai.push({ pegawai: emp, kodeLabel: i + 1 });
          });
          
          g2.forEach((id: string, i: number) => {
            const alpha = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : '');
            const emp = allEmp.find((e: any) => e.id === id);
            if (emp) pengawasPegawai.push({ pegawai: emp, kodeLabel: alpha });
          });
          
          setPegawaiList(pengawasPegawai);
        }
        
        const settingsArr = Array.isArray(settingsRes?.data || settingsRes) ? (settingsRes?.data || settingsRes) : [];
        const settingsMap: Record<string, string> = {};
        for (const s of settingsArr) { if (s.key && s.value) settingsMap[s.key] = s.value; }
        
        if (settingsMap.school_name) setSchoolName(settingsMap.school_name);
        if (settingsMap.logo_url) setLogoUrl(settingsMap.logo_url);
        if (settingsMap.kemenag_logo_url) setKemenagLogoUrl(settingsMap.kemenag_logo_url);
      } catch (error) {
        console.error('Failed to load ID card data', error);
      } finally {
        setLoading(false);
      }
    };
    if (ujianId) fetchData();
  }, [ujianId, type]);

  // Pre-load images
  useEffect(() => {
    if (loading || !ujian) return;

    const config = ujian.pengaturan?.kartuPeserta || {};
    const templateUrl = type === 'panitia' ? config.templatePanitiaUrl : config.templatePengawasUrl;
    
    const imagesToLoad: string[] = [];
    if (templateUrl) imagesToLoad.push(templateUrl);
    if (config.logoPegawaiUrl) imagesToLoad.push(config.logoPegawaiUrl);
    if (logoUrl) imagesToLoad.push(logoUrl);
    if (kemenagLogoUrl) imagesToLoad.push(kemenagLogoUrl);

    const photoUrls = new Set<string>();
    pegawaiList.forEach(item => {
      const p = item.pegawai || item;
      if (p.photoUrl) photoUrls.add(p.photoUrl);
    });
    photoUrls.forEach(url => imagesToLoad.push(url));

    if (imagesToLoad.length === 0) {
      setImagesReady(true);
      return;
    }

    let loaded = 0;
    const total = imagesToLoad.length;
    const onDone = () => { loaded++; if (loaded >= total) setImagesReady(true); };
    const timeout = setTimeout(() => setImagesReady(true), 5000);

    imagesToLoad.forEach(url => {
      const img = new Image();
      img.onload = onDone;
      img.onerror = onDone;
      img.src = url;
    });

    return () => clearTimeout(timeout);
  }, [loading, ujian, pegawaiList, type, logoUrl, kemenagLogoUrl]);

  // Auto-print
  useEffect(() => {
    if (!imagesReady || !ujian || searchParams.get('preview') === 'true') return;
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, [imagesReady, ujian, searchParams]);

  if (loading || !imagesReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-3">
        <Loader2 className="animate-spin text-violet-500" size={32} />
        <p className="text-sm text-gray-500">
          {loading ? 'Memuat data...' : 'Memuat gambar...'}
        </p>
      </div>
    );
  }
  if (!ujian) return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Data Ujian Tidak Ditemukan</div>;

  const config = ujian.pengaturan?.kartuPeserta || {};
  const templateUrl = type === 'panitia' ? config.templatePanitiaUrl : config.templatePengawasUrl;
  const namaUjian = (ujian.namaUjian || ujian.jenisUjian || ujian.title || 'UJIAN SEKOLAH').toUpperCase();
  const tahunAjaran = ujian.tahunAjaran || new Date().getFullYear().toString();

  // Use same logos as kartu peserta
  const headerLogoKiri = kemenagLogoUrl || config.logoKiri || '';
  const headerLogoKanan = logoUrl || config.logoKanan || '';

  // Page layout: 3 columns × 3 rows = 9 cards per page
  // Card size: 65mm wide × 93mm tall (kartu peserta dimensions rotated to vertical)
  const cardsPerPage = 9;
  const pages: any[][] = [];
  for (let i = 0; i < pegawaiList.length; i += cardsPerPage) {
    pages.push(pegawaiList.slice(i, i + cardsPerPage));
  }

  const IdCard = ({ item }: { item: any }) => {
    const p = item.pegawai || item;
    const roleTitle = type === 'panitia' ? 'PANITIA' : 'PENGAWAS';
    
    let photoSrc = p.photoUrl;
    if (!photoSrc) {
      const genderLower = (p.gender || '').toLowerCase();
      const isFemale = genderLower === 'p' || genderLower === 'perempuan';
      photoSrc = isFemale ? '/avatar-pegawai-female.svg' : '/avatar-pegawai-male.svg';
    }

    return (
      <div
        className="relative border-[1.5px] border-black flex flex-col font-sans box-border overflow-hidden bg-white"
        style={{ width: '65mm', height: '93mm' }}
      >
        {/* Background template layer */}
        {templateUrl && (
          <img src={templateUrl} className="absolute inset-0 w-full h-full object-cover z-0" alt="" loading="eager" />
        )}

        {/* Content layer */}
        <div className="relative z-10 w-full h-full flex flex-col items-center px-2 pt-2 pb-1.5">
          
          {/* HEADER — same style as kartu peserta */}
          <div className="flex items-start gap-1 w-full border-b-[1.5px] border-black pb-1.5 mb-1.5 text-center">
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
              {headerLogoKiri ? (
                <img src={headerLogoKiri} alt="" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>
            <div className="flex-1 px-0.5 flex flex-col justify-center min-h-[32px]">
              <h1 className="text-[8px] font-bold leading-tight m-0">KARTU {roleTitle}</h1>
              <h2 className="text-[7.5px] font-bold leading-tight m-0">{namaUjian}</h2>
              <h3 className="text-[7px] font-bold leading-tight m-0">TAHUN AJARAN {tahunAjaran}</h3>
            </div>
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
              {headerLogoKanan ? (
                <img src={headerLogoKanan} alt="" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>
          </div>

          {/* SCHOOL NAME */}
          <div className="text-[6.5px] font-bold text-gray-700 tracking-wider uppercase text-center w-full mb-1">{schoolName}</div>

          {/* PHOTO */}
          <div className="w-[24mm] h-[32mm] bg-gray-200 rounded-[4px] overflow-hidden border-[2px] border-gray-400 flex-shrink-0 mb-1.5">
            <img src={photoSrc} className="w-full h-full object-cover" alt="" loading="eager" />
          </div>

          {/* IDENTITY */}
          <table className="w-full text-[7.5px] font-semibold text-left mb-auto">
            <tbody>
              <tr>
                <td className="w-[38px] py-[1px] align-top">Nama</td>
                <td className="w-1.5 py-[1px] align-top">:</td>
                <td className="py-[1px] font-bold uppercase leading-tight">{p.name || '-'}</td>
              </tr>
              {p.nip && (
                <tr>
                  <td className="py-[1px] align-top">NIP</td>
                  <td className="py-[1px] align-top">:</td>
                  <td className="py-[1px]">{p.nip}</td>
                </tr>
              )}
              {p.position && (
                <tr>
                  <td className="py-[1px] align-top">Jabatan</td>
                  <td className="py-[1px] align-top">:</td>
                  <td className="py-[1px]">{p.position}</td>
                </tr>
              )}
              {item.kodeLabel && (
                <tr>
                  <td className="py-[1px] align-top">Kode</td>
                  <td className="py-[1px] align-top">:</td>
                  <td className="py-[1px] font-bold">{item.kodeLabel}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ROLE BADGE */}
          <div className="w-[90%] py-1 mt-1 bg-gray-900 text-white font-black text-[9px] text-center tracking-widest uppercase rounded-sm">
            {roleTitle} {item.kodeLabel ? `(${item.kodeLabel})` : ''}
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
        {pages.map((pageItems, pageIdx) => (
          <div key={pageIdx} className={`page-container ${pageIdx < pages.length - 1 ? 'page-break mb-10 print:mb-0' : ''}`}>
            <div className="grid grid-cols-3 gap-x-[2mm] gap-y-[2mm] justify-items-center">
              {pageItems.map((item: any, idx: number) => (
                <IdCard key={idx} item={item} />
              ))}
            </div>
          </div>
        ))}
        {pages.length === 0 && (
          <div className="page-container flex items-center justify-center text-gray-500 print:hidden shadow-lg">
            Belum ada pegawai ditugaskan.
          </div>
        )}
      </div>
    </>
  );
};
