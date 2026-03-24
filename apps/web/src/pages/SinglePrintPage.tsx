import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrintableStudentCard, CARD_TEMPLATES } from '@mandaapp/ui';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

export const SinglePrintPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    // Read from localStorage (same as batch print flow)
    const storedDataStr = localStorage.getItem('batch-print-data');
    if (!storedDataStr) {
      navigate('/dashboard/student-card');
      return;
    }

    try {
      const parsed = JSON.parse(storedDataStr);
      setData(parsed);
    } catch {
      navigate('/dashboard/student-card');
    }
  }, [navigate]);

  useEffect(() => {
    if (data) {
      setTimeout(() => {
        window.print();
      }, 800);
    }
  }, [data]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleManualPrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
       window.print();
       setIsPrinting(false);
    }, 500);
  };

  if (!data || !data.students || data.students.length === 0) {
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
  const template = CARD_TEMPLATES[templateId as keyof typeof CARD_TEMPLATES] || CARD_TEMPLATES['elegant-gold'];
  const student = students[0]; // ONLY use the first student always

  const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
  const getFullUrl = (url?: string) => url?.startsWith('/') ? `${SERVER_BASE_URL}${url}` : (url || '');

  return (
    <>
      {/* Exact CSS from PublicCetakKartu */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background: white !important; 
          }
          .print-hidden, .print-toolbar { 
            display: none !important; 
          }
          .printable-card-wrapper {
             margin: 10mm auto !important;
          }
        }
        
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
      `}} />

      {/* Toolbar — hidden when printing */}
      <div className="print-toolbar print:hidden">
        <button className="btn-back" onClick={handleBack}>
          <ArrowLeft size={18} />
          Kembali
        </button>
        <span style={{ fontSize: '14px', opacity: 0.8 }}>
          Preview Cetak Kartu: {student.name || student.fullName}
        </span>
        <button className="btn-print" onClick={handleManualPrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
          {isPrinting ? 'Menyiapkan...' : 'Cetak'}
        </button>
      </div>

      <div className="flex flex-col items-center mt-12 mb-12">
        <div className="print-section w-full max-w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex flex-wrap justify-center gap-8 print:block print:w-full print:m-0">
             <PrintableStudentCard 
                student={{
                  name: student.fullName || student.name,
                  nisn: student.nisn,
                  className: student.className,
                  birthPlace: student.birthPlace,
                  birthDate: student.birthDate,
                  gender: student.gender,
                  address: student.address,
                  photoUrl: student.photoUrl
                }}
                template={template}
                settings={{
                  schoolName: settings.schoolName,
                  schoolSubtitle: settings.schoolSubtitle,
                  schoolAddress: settings.schoolAddress,
                  schoolPhone: settings.schoolPhone,
                  schoolEmail: settings.schoolEmail,
                  headmasterName: settings.headmasterName,
                  headmasterNip: settings.headmasterNip,
                  termsText: settings.termsText,
                  schoolLogoUrl: getFullUrl(settings.schoolLogoUrl),
                  headmasterSignatureUrl: getFullUrl(settings.headmasterSignatureUrl),
                  kemenagLogoUrl: getFullUrl(settings.kemenagLogoUrl),
                  schoolStampUrl: getFullUrl(settings.schoolStampUrl),
                  academicYear: settings.academicYear,
                  showQrCode: settings.showQrCode,
                }}
                orientation={orientation}
                scale={1}
                side="both"
             />
          </div>
        </div>
      </div>
    </>
  );
};
