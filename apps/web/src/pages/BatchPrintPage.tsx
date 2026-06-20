import { useState, useEffect, useRef } from 'react';
import { PrintableStudentCard, CARD_TEMPLATES, type CardTemplateName, type CardOrientation } from '@mandaapp/ui';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';

// Types for localStorage data
interface BatchPrintData {
  students: Array<{
    id: string;
    name: string;
    nisn: string;
    className: string;
    birthPlace: string;
    birthDate: string;
    gender: string;
    address?: string;
    photoUrl?: string;
  }>;
  settings: {
    schoolName: string;
    schoolSubtitle: string;
    schoolAddress?: string;
    schoolPhone?: string;
    schoolEmail?: string;
    headmasterName?: string;
    headmasterNip?: string;
    termsText?: string;
    schoolLogoUrl?: string;
    headmasterSignatureUrl?: string;
    kemenagLogoUrl?: string;
    schoolStampUrl?: string;
    academicYear: string;
    showQrCode: boolean;
  };
  templateId: CardTemplateName;
  orientation: CardOrientation;
}

export const BatchPrintPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BatchPrintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const hasTriggeredPrint = useRef(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const rawData = localStorage.getItem('batch-print-data');
      if (!rawData) {
        setError('Data cetak tidak ditemukan. Silakan kembali ke Dashboard dan coba lagi.');
        return;
      }
      const parsed: BatchPrintData = JSON.parse(rawData);
      if (!parsed.students?.length) {
        setError('Tidak ada siswa yang dipilih untuk dicetak.');
        return;
      }
      setData(parsed);
    } catch (e) {
      setError('Data cetak tidak valid. Silakan kembali ke Dashboard dan coba lagi.');
    }
  }, []);

  // Auto-print after all content is rendered and images loaded
  useEffect(() => {
    if (!data || hasTriggeredPrint.current) return;
    hasTriggeredPrint.current = true;

    // Wait for fonts and images to load
    const timer = setTimeout(() => {
      setIsPrinting(true);
      // Small delay to ensure React has finished rendering
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          setIsPrinting(false);
        }, 500);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [data]);

  const handleManualPrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/dashboard/student-card');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Memuat data cetak...</span>
        </div>
      </div>
    );
  }

  const { students, settings, templateId, orientation } = data;
  const template = CARD_TEMPLATES[templateId] || CARD_TEMPLATES['elegant-gold'];
  const itemsPerPage = orientation === 'horizontal' ? 8 : 9;
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const isSinglePrint = students.length === 1;

  return (
    <>
      {/* Print Page CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Screen View: Make it look like a grey desk with A4 papers */
        body { background: #e5e7eb; }
        
        .print-toolbar {
          position: sticky; top: 0; z-index: 50;
          background: #1f2937; color: white;
          padding: 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .print-toolbar button {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 8px; border: none;
          cursor: pointer; font-size: 14px; font-weight: 500;
          transition: background-color 0.2s;
        }
        .print-toolbar .btn-back { background: transparent; color: white; }
        .print-toolbar .btn-back:hover { background: rgba(255,255,255,0.1); }
        .print-toolbar .btn-print { background: #3b82f6; color: white; }
        .print-toolbar .btn-print:hover { background: #2563eb; }

        .batch-print-container {
          padding: 20px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .a4-page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          padding: 10mm 5mm;
          box-sizing: border-box;
          text-align: center; /* Centers horizontal inline-block cards */
        }
        
        .single-print-page {
          background: white;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          padding: 10mm 20px 20px 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .page-label {
          text-align: center; color: #4b5563; font-weight: 600;
          font-size: 14px; margin-bottom: 12px;
          font-family: 'Inter', sans-serif;
        }

        /* The magical gap logic for inline-block cards on screen */
        .printable-card-wrapper {
          display: inline-block !important;
          vertical-align: top;
          text-align: left; /* reset text alignment inside card */
        }
        .printable-card-wrapper.orientation-horizontal {
          margin: 7mm 4mm !important;
        }
        .printable-card-wrapper.orientation-vertical {
          margin: 5mm 4mm !important;
        }

        /* ====================================================================
           PRINT MEDIA
           ==================================================================== */
        @page { 
          ${isSinglePrint ? 'margin: 0;' : 'size: A4 portrait; margin: 0;'}
        }

        @media print {
          /* 1. Base Reset */
          html, body, #root, .batch-print-container {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          
          /* 2. Hide UI elements */
          .print-toolbar, .page-label { display: none !important; }
          
          /* 3. A4 Page bounds mapping */
          .a4-page {
            width: 210mm !important;
            height: 297mm !important; /* Force exact page mapping */
            margin: 0 !important;
            padding: 10mm 5mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important; /* Crop anything that bleeds */
            text-align: center !important; /* Horizontal centering for inline-blocks */
          }
          .a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* Single Page bounds mapping */
          .single-print-page {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 10mm 0 0 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
          }
          .single-print-page:last-child {
             page-break-after: auto !important;
             break-after: auto !important;
          }

          /* 4. Let inline-block flow create an exact 2x4 grid naturally */
          .printable-card-wrapper {
             ${isSinglePrint ? `
                display: block !important;
                margin: 10mm auto !important;
             ` : `
                display: inline-block !important;
                vertical-align: top !important;
             `}
          }
          ${isSinglePrint ? '' : `
          .printable-card-wrapper.orientation-horizontal {
             margin: 8mm 4mm !important; /* Perfect fit for 4 rows of 54mm */
          }
          .printable-card-wrapper.orientation-vertical {
             margin: 5mm 4mm !important; /* Perfect fit for 3 rows of 85.6mm */
          }
          `}

          /* 5. Force graphics */
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Toolbar — hidden when printing */}
      <div className="print-toolbar">
        <button className="btn-back" onClick={handleBack}>
          <ArrowLeft size={18} />
          Kembali
        </button>
        {isSinglePrint ? (
          <span style={{ fontSize: '14px', opacity: 0.8 }}>
            Preview Cetak Kartu
          </span>
        ) : (
          <span style={{ fontSize: '14px', opacity: 0.8 }}>
            {students.length} kartu • {totalPages * 2} halaman (depan + belakang)
          </span>
        )}
        <button className="btn-print" onClick={handleManualPrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
          {isPrinting ? 'Menyiapkan...' : 'Cetak'}
        </button>
      </div>

      {/* Print Content */}
      <div className="batch-print-container">
        {isSinglePrint ? (
          <div className="single-print-page">
            <PrintableStudentCard
              student={{
                name: students[0].name,
                nisn: students[0].nisn,
                className: students[0].className,
                birthPlace: students[0].birthPlace,
                birthDate: students[0].birthDate,
                gender: students[0].gender,
                address: students[0].address,
                photoUrl: students[0].photoUrl,
              }}
              template={template}
              settings={settings}
              orientation={orientation}
              scale={1}
              side="both"
            />
          </div>
        ) : (
          <>
            {/* Front Sides */}
            {Array.from({ length: totalPages }).map((_, pageIndex) => {
              const chunk = students.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);
              return (
                <div key={`front-section-${pageIndex}`}>
                  <p className="page-label">
                    Halaman {pageIndex + 1} — Depan ({chunk.length} kartu)
                  </p>
                  <div className="a4-page">
                    {chunk.map((s) => (
                      <PrintableStudentCard
                        key={`front-${s.id}`}
                        student={{
                          name: s.name,
                          nisn: s.nisn,
                          className: s.className,
                          birthPlace: s.birthPlace,
                          birthDate: s.birthDate,
                          gender: s.gender,
                          address: s.address,
                          photoUrl: s.photoUrl,
                        }}
                        template={template}
                        settings={settings}
                        orientation={orientation}
                        scale={0.45}
                        side="front"
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Back Sides */}
            {Array.from({ length: totalPages }).map((_, pageIndex) => {
              const chunk = students.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);
              return (
                <div key={`back-section-${pageIndex}`}>
                  <p className="page-label">
                    Halaman {totalPages + pageIndex + 1} — Belakang ({chunk.length} kartu)
                  </p>
                  <div className="a4-page">
                    {chunk.map((s) => (
                      <PrintableStudentCard
                        key={`back-${s.id}`}
                        student={{
                          name: s.name,
                          nisn: s.nisn,
                          className: s.className,
                          birthPlace: s.birthPlace,
                          birthDate: s.birthDate,
                          gender: s.gender,
                          address: s.address,
                          photoUrl: s.photoUrl,
                        }}
                        template={template}
                        settings={settings}
                        orientation={orientation}
                        scale={0.45}
                        side="back"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
};
