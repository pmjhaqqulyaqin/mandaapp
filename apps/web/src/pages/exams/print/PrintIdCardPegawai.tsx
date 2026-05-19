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
        
        const sn = (settingsRes.data || settingsRes).find((s: any) => s.key === 'school_name')?.value;
        if (sn) setSchoolName(sn);
      } catch (error) {
        console.error('Failed to load ID card data', error);
      } finally {
        setLoading(false);
      }
    };
    if (ujianId) fetchData();
  }, [ujianId, type]);

  // Pre-load critical images (template, logos) to avoid blank cards on print
  useEffect(() => {
    if (loading || !ujian) return;

    const config = ujian.pengaturan?.kartuPeserta || {};
    const templateUrl = type === 'panitia' ? config.templatePanitiaUrl : config.templatePengawasUrl;
    
    const imagesToLoad: string[] = [];
    if (templateUrl) imagesToLoad.push(templateUrl);
    if (config.logoPegawaiUrl) imagesToLoad.push(config.logoPegawaiUrl);

    // Also preload unique photo URLs (but limit to avoid overloading)
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
    const onLoad = () => {
      loaded++;
      if (loaded >= total) setImagesReady(true);
    };
    const onError = () => {
      loaded++;
      if (loaded >= total) setImagesReady(true);
    };

    // Set a maximum wait time of 5 seconds
    const timeout = setTimeout(() => setImagesReady(true), 5000);

    imagesToLoad.forEach(url => {
      const img = new Image();
      img.onload = onLoad;
      img.onerror = onError;
      img.src = url;
    });

    return () => clearTimeout(timeout);
  }, [loading, ujian, pegawaiList, type]);

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

  // Page layout: 3 columns × 3 rows = 9 cards per page
  const cardsPerPage = 9;
  const pages: any[][] = [];
  for (let i = 0; i < pegawaiList.length; i += cardsPerPage) {
    pages.push(pegawaiList.slice(i, i + cardsPerPage));
  }

  const IdCard = ({ item }: { item: any }) => {
    const p = item.pegawai || item; 
    const roleTitle = type === 'panitia' ? 'PANITIA' : 'PENGAWAS';
    
    // Choose fallback avatar
    let photoSrc = p.photoUrl;
    if (!photoSrc) {
      const genderLower = (p.gender || '').toLowerCase();
      const isFemale = genderLower === 'p' || genderLower === 'perempuan';
      photoSrc = isFemale ? '/avatar-pegawai-female.svg' : '/avatar-pegawai-male.svg';
    }

    return (
      <div className="border border-gray-300 relative overflow-hidden bg-white text-center break-inside-avoid shadow-sm print:shadow-none print:border-gray-200"
           style={{ width: '65mm', height: '93mm', boxSizing: 'border-box' }}
      >
        {/* Background Layer */}
        {templateUrl ? (
          <img src={templateUrl} className="absolute inset-0 w-full h-full object-cover z-0" alt="template" loading="eager" />
        ) : (
          <div className="absolute inset-0 z-0 bg-white border-2 border-gray-800">
            <div className="absolute top-0 left-0 w-full h-[3.8cm] bg-gray-100 border-b-2 border-gray-800" />
          </div>
        )}

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full flex flex-col items-center pt-3 pb-2 px-2.5">
          
          {/* Header section */}
          <div className="w-full flex-col items-center justify-center">
            {config.logoPegawaiUrl && (
              <img src={config.logoPegawaiUrl} className="w-10 h-10 object-contain mx-auto mb-1" alt="Logo Instansi" loading="eager" />
            )}
            
            <div className="text-[8px] font-bold mt-1 text-gray-800 tracking-wider uppercase text-center w-full bg-white/40">{schoolName}</div>
            <div className="text-[11px] uppercase font-black leading-tight mt-1 text-gray-900 border-b border-gray-800 pb-1.5 mb-1.5 inline-block text-center w-full bg-white/40">
              {ujian.namaUjian}<br/>TA {ujian.tahunAjaran}
            </div>
          </div>



          {/* Photo Frame — trick: width fills container, height auto-scales, overflow clips from bottom only → head never cropped */}
          <div className="w-[3cm] h-[4cm] bg-white mt-2 mb-2 rounded-[8px] overflow-hidden border-[3px] border-white shadow-md relative z-20 flex-shrink-0">
            <img src={photoSrc} className="block w-full" style={{ height: 'auto', minHeight: '100%' }} alt="Pegawai" loading="eager" />
          </div>

          {/* Nama Pegawai */}
          <div className="text-[11px] font-bold uppercase mt-auto mb-1.5 px-1 line-clamp-2 max-h-[32px] overflow-hidden leading-tight bg-white/90 rounded w-full">
            {p.name}
          </div>
          
          {/* Jabatan/Role Bottom Bar */}
          {templateUrl ? (
            <div className="w-[85%] mx-auto py-1.5 mt-1 rounded-full bg-[#0d47a1] text-white font-black text-[13px] shadow-sm tracking-widest">
               {roleTitle} {item.kodeLabel ? `(${item.kodeLabel})` : ''}
            </div>
          ) : (
            <div className="w-full py-1.5 mt-auto bg-gray-800 text-white font-black text-[12px] tracking-widest">
               {roleTitle} {item.kodeLabel ? `(${item.kodeLabel})` : ''}
            </div>
          )}
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
