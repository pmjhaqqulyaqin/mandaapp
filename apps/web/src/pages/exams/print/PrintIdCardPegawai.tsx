import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api';

export const PrintIdCardPegawai = () => {
  const { ujianId } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'panitia'; // 'panitia' | 'pengawas'
  
  const [loading, setLoading] = useState(true);
  const [ujian, setUjian] = useState<any>(null);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);

  useEffect(() => {
    // Inject print styles to hide headers and page marign
    const style = document.createElement('style');
    style.innerHTML = `
      @page { size: A4; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #root { margin: 0; padding: 0; }
      @media print {
        @page { margin: 10mm; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uRes, dataRes] = await Promise.all([
          apiClient(`/exams/${ujianId}`),
          apiClient(`/exams/${ujianId}/${type}`)
        ]);
        
        setUjian(uRes);
        setPegawaiList(dataRes.data || dataRes);
      } catch (error) {
        console.error('Failed to load ID card data', error);
      } finally {
        setLoading(false);
      }
    };
    if (ujianId) fetchData();
  }, [ujianId, type]);

  if (loading) return <div className="p-8 text-center print:hidden">Menyiapkan dokumen cetak...</div>;
  if (!ujian) return <div className="p-8 text-center text-red-500 print:hidden">Gagal memuat data ujian.</div>;

  const config = ujian.pengaturan?.kartuPeserta || {};
  const templateUrl = type === 'panitia' ? config.templatePanitiaUrl : config.templatePengawasUrl;

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
      <div className="w-[5.4cm] h-[8.6cm] border border-gray-300 relative overflow-hidden bg-white text-center break-inside-avoid shadow-sm print:shadow-none print:border-gray-200"
           style={{ boxSizing: 'border-box' }}
      >
        {/* Background Layer */}
        {templateUrl ? (
          <img src={templateUrl} className="absolute inset-0 w-full h-full object-cover z-0" alt="template" />
        ) : (
          <div className="absolute inset-0 z-0 bg-white border-2 border-gray-800">
            {/* Minimal Monochrome Fallback Decorative (matches "hitam putih" requirement if they want literal black and white, but standard fallback should be decent) */}
            <div className="absolute top-0 left-0 w-full h-[3.5cm] bg-gray-100 border-b-2 border-gray-800" />
          </div>
        )}

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full flex flex-col items-center pt-3 pb-2 px-2">
          
          {/* Header section: Always render over the template, template should be a clean background */}
          <div className="w-full flex-col items-center justify-center">
            {/* We can use the generic kemenag / left logo if configured, else default */}
            {config.logoPegawaiUrl && (
              <img src={config.logoPegawaiUrl} className="w-8 h-8 object-contain mx-auto mb-1" alt="Logo Instansi" />
            )}
            
            {!templateUrl && (
              <>
                <div className="text-[7px] font-bold mt-1 text-gray-800 tracking-wider">MAN 2 LOMBOK TIMUR</div>
                <div className="text-[10px] uppercase font-black leading-tight mt-1 text-gray-900 border-b border-gray-800 pb-1 mb-1 inline-block">
                  {ujian.namaUjian}<br/>TA {ujian.tahunAjaran}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 mt-1 mb-1"></div>

          {/* Photo Frame (3:4 ratio standard passport size equivalent) */}
          <div className="w-[2.8cm] h-[3.6cm] bg-gray-200 mt-2 mb-2 rounded-[8px] overflow-hidden border-[3px] border-white shadow-md relative z-20">
            <img src={photoSrc} className="w-full h-full object-cover" alt="Pegawai" />
          </div>

          {/* Nama Pegawai */}
          <div className="text-[10px] font-bold uppercase mt-auto mb-1 px-1 line-clamp-2 max-h-[28px] overflow-hidden leading-tight bg-white/60 rounded backdrop-blur-sm w-full">
            {p.name}
          </div>
          
          {/* Jabatan/Role Bottom Bar */}
          {templateUrl ? (
            <div className="w-[85%] mx-auto py-1.5 mt-1 rounded-full bg-[#0d47a1] text-white font-black text-[12px] shadow-sm tracking-widest text-[#FFF]">
               {roleTitle}
            </div>
          ) : (
            <div className="w-full py-1.5 mt-auto bg-gray-800 text-white font-black text-[11px] tracking-widest">
               {roleTitle}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white p-4 print:p-0">
      
      {/* Action Bar (Hidden when printing) */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm flex items-center justify-between print:hidden max-w-[21cm] mx-auto">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Preview {type === 'panitia' ? 'ID Card Panitia' : 'ID Card Pengawas'}</h2>
          <p className="text-sm text-gray-500">Terdapat {pegawaiList.length} kartu yang siap dicetak.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition"
        >
          Cetak PDF
        </button>
      </div>

      {/* A4 Sheet Viewer */}
      {/* We use an explicit width that matches A4 slightly scaled, or just auto-flow.
          For A4 grid, grid-cols-4 means 4 cards per row. 4 * 5.4cm = 21.6cm, which is exactly A4 width!
          Wait, A4 width minus margins (10mm each side) leaves 190mm = 19cm.
          19cm / 5.4cm = 3.5. So maximum 3 cards per row safely.
          Let's use grid-cols-3 and center it. */}
      <div className="w-[21cm] mx-auto bg-white print:bg-transparent shadow-md print:shadow-none p-[1cm] print:p-0">
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 justify-items-center">
          {pegawaiList.map((item, idx) => (
            <IdCard key={idx} item={item} />
          ))}
        </div>
        
        {pegawaiList.length === 0 && (
          <div className="text-center py-20 text-gray-500">Belum ada pegawai ditugaskan.</div>
        )}
      </div>
    </div>
  );
};
