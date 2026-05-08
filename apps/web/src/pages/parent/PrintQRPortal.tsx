import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Printer, X } from 'lucide-react';

interface PrintQRPortalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Array<{
    id: string;
    fullName: string;
    nis?: string;
    nisn: string;
    className?: string;
  }>;
}

export const PrintQRPortal = ({ isOpen, onClose, students }: PrintQRPortalProps) => {
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const portalBaseUrl = `${window.location.origin}/portal-ortu`;

  useEffect(() => {
    if (!isOpen || students.length === 0) return;
    generateQRCodes();
  }, [isOpen, students]);

  const generateQRCodes = async () => {
    setIsGenerating(true);
    const urls: Record<string, string> = {};
    for (const student of students) {
      try {
        // QR encodes the portal URL + instructions
        const qrText = `Portal Orang Tua MAN 2 LOTIM\nNISN: ${student.nisn}\nAkses: ${portalBaseUrl}`;
        urls[student.id] = await QRCode.toDataURL(qrText, {
          width: 200,
          margin: 1,
          color: { dark: '#1e293b', light: '#ffffff' },
        });
      } catch { }
    }
    setQrDataUrls(urls);
    setIsGenerating(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>QR Portal Orang Tua</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px; }
          .card { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; }
          .card img { width: 140px; height: 140px; margin: 8px auto; }
          .name { font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
          .info { font-size: 10px; color: #64748b; }
          .nisn { font-size: 11px; font-weight: 700; color: #6366f1; margin: 4px 0; }
          .url { font-size: 8px; color: #94a3b8; word-break: break-all; }
          .header { font-size: 9px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          @media print {
            .grid { padding: 8px; gap: 8px; }
            .card { border-width: 1px; }
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${students.map(s => `
            <div class="card">
              <div class="header">Portal Orang Tua</div>
              <div class="name">${s.fullName}</div>
              <div class="info">${s.className || '-'} • NIS: ${s.nis || '-'}</div>
              <img src="${qrDataUrls[s.id] || ''}" />
              <div class="nisn">NISN: ${s.nisn}</div>
              <div class="url">${portalBaseUrl}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-[#333] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <QrCode size={18} className="text-indigo-600" />
            Cetak QR Portal Orang Tua ({students.length} siswa)
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={isGenerating}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5">
              <Printer size={14} /> Cetak
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222]">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" ref={printRef}>
          {isGenerating ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {students.map(s => (
                <div key={s.id} className="border border-gray-200 dark:border-[#333] rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Portal Orang Tua</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{s.fullName}</p>
                  <p className="text-[10px] text-gray-500">{s.className || '-'} • NIS: {s.nis || '-'}</p>
                  {qrDataUrls[s.id] && (
                    <img src={qrDataUrls[s.id]} alt="QR" className="w-32 h-32 mx-auto my-2" />
                  )}
                  <p className="text-[11px] font-bold text-indigo-600">NISN: {s.nisn}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5 break-all">{portalBaseUrl}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.02]">
          <p className="text-[10px] text-gray-500">
            💡 Orang tua scan QR ini → buka link → login/daftar → masukkan NISN anak → terhubung
          </p>
        </div>
      </div>
    </div>
  );
};
