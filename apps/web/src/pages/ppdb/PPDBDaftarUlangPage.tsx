import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, ArrowLeft, UploadCloud, Printer, FileText, 
  Send, Loader2, ArrowRight, BookOpen, AlertCircle 
} from 'lucide-react';
import { apiClient, API_BASE_URL } from '../../lib/api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

export const PPDBDaftarUlangPage = () => {
  const [searchParams] = useSearchParams();
  const noPendaftaran = searchParams.get('no') || '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exportingKelulusan, setExportingKelulusan] = useState(false);
  const [exportingDraft, setExportingDraft] = useState(false);

  // Student Data from daftar ulang endpoint
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [studentDetail, setStudentDetail] = useState<{
    namaLengkap: string;
    nisn: string;
    noPendaftaran: string;
    sekolahAsal: string;
    jalurSeleksi: string;
    validationCode: string | null;
  } | null>(null);

  // Form Data
  const [buktiPembayaranUrl, setBuktiPembayaranUrl] = useState('');
  const [ijazahUrl, setIjazahUrl] = useState('');
  const [kkUrl, setKkUrl] = useState('');
  const [kipUrl, setKipUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [ukuranBaju, setUkuranBaju] = useState('');
  const [ukuranCelana, setUkuranCelana] = useState('');

  // Track upload status
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [noPendaftaran]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [conf, settingsRes] = await Promise.all([
        apiClient<any>('/ppdb/config'),
        apiClient<any>('/settings').catch(() => null),
      ]);
      setConfig(conf);

      // Parse settings array into key-value map
      const arr = Array.isArray(settingsRes?.data || settingsRes) ? (settingsRes?.data || settingsRes) : [];
      const map: Record<string, string> = {};
      for (const s of arr) { if (s.key && s.value) map[s.key] = s.value; }
      setSiteSettings(map);

      // Fetch daftar ulang info (now includes student detail + validationCode)
      const existingDraft = await apiClient<any>(`/ppdb/daftar-ulang/${noPendaftaran}`);
      if (existingDraft) {
        setBuktiPembayaranUrl(existingDraft.buktiPembayaranUrl || '');
        setIjazahUrl(existingDraft.ijazahUrl || '');
        setKkUrl(existingDraft.kkUrl || '');
        setKipUrl(existingDraft.kipUrl || '');
        setPhotoUrl(existingDraft.photoUrl || '');
        setUkuranBaju(existingDraft.ukuranBaju || '');
        setUkuranCelana(existingDraft.ukuranCelana || '');

        // Store student detail for PDF generation
        setStudentDetail({
          namaLengkap: existingDraft.namaLengkap || '',
          nisn: existingDraft.nisn || '',
          noPendaftaran: existingDraft.noPendaftaran || noPendaftaran,
          sekolahAsal: existingDraft.sekolahAsal || '',
          jalurSeleksi: existingDraft.jalurSeleksi || '',
          validationCode: existingDraft.validationCode || null,
        });
      }

    } catch (error) {
      toast.error('Gagal memuat data pendaftaran ulang.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    setUploading(prev => ({ ...prev, [field]: true }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/ppdb/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Gagal unggah');
      const data = await response.json();
      
      const uploadedUrl = data.url || data.filePath;
      if (field === 'buktiPembayaranUrl') setBuktiPembayaranUrl(uploadedUrl);
      else if (field === 'ijazahUrl') setIjazahUrl(uploadedUrl);
      else if (field === 'kkUrl') setKkUrl(uploadedUrl);
      else if (field === 'kipUrl') setKipUrl(uploadedUrl);
      else if (field === 'photoUrl') setPhotoUrl(uploadedUrl);

      toast.success('File berhasil diunggah');
    } catch (err: any) {
      toast.error('Gagal mengunggah dokumen.');
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!buktiPembayaranUrl || !ijazahUrl || !kkUrl || !photoUrl || !ukuranBaju || !ukuranCelana) {
      toast.error('Harap lengkapi semua isian wajib sebelum mengirim.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient(`/ppdb/daftar-ulang/${noPendaftaran}`, {
        method: 'POST',
        data: {
          buktiPembayaranUrl,
          ijazahUrl,
          kkUrl,
          kipUrl,
          photoUrl,
          ukuranBaju,
          ukuranCelana
        }
      });
      toast.success('Daftar Ulang berhasil dikirim dan menunggu validasi.');
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan formulir.');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePDFBuktiKelulusan = async () => {
    try {
      setExportingKelulusan(true);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth(); // 210
      const pageH = doc.internal.pageSize.getHeight(); // 297
      const marginX = 20;
      const contentW = pageW - marginX * 2;

      // --- Helper: convert image URL to base64 ---
      const toBase64 = async (url: string): Promise<string> => {
        if (!url) return '';
        if (url.startsWith('data:')) return url;
        try {
          const isRelative = url.startsWith('/');
          const fullUrl = isRelative ? `${API_BASE_URL.replace(/\/api$/, '')}${url}` : url;
          const response = await fetch(fullUrl, { mode: 'cors' });
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          });
        } catch {
          return '';
        }
      };

      // --- Background: subtle double border frame ---
      doc.setDrawColor(200, 215, 225);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, pageW - 20, pageH - 20);
      doc.setDrawColor(180, 200, 210);
      doc.setLineWidth(0.2);
      doc.rect(12, 12, pageW - 24, pageH - 24);

      let y = 22;

      // ========== HEADER: Logo + School Name ==========
      const logoUrl = siteSettings.logo_url || '';
      const schoolName = siteSettings.school_name || 'Madrasah';

      if (logoUrl) {
        try {
          const logoB64 = await toBase64(logoUrl);
          if (logoB64) {
            const logoSize = 16;
            doc.addImage(logoB64, 'PNG', (pageW - logoSize) / 2, y, logoSize, logoSize);
            y += logoSize + 2;
          }
        } catch { /* ignore */ }
      }

      // School Name below logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 77, 56);
      doc.text(schoolName.toUpperCase(), pageW / 2, y + 4, { align: 'center' });
      y += 10;

      // ========== TITLE ==========
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(20, 30, 40);
      doc.text('PENGUMUMAN KELULUSAN', pageW / 2, y + 5, { align: 'center' });
      y += 9;

      // Underline decoration
      doc.setDrawColor(15, 77, 56);
      doc.setLineWidth(0.7);
      doc.line(pageW / 2 - 35, y, pageW / 2 + 35, y);
      doc.setLineWidth(0.3);
      doc.line(pageW / 2 - 33, y + 1.2, pageW / 2 + 33, y + 1.2);
      y += 8;

      // ========== SK PARAGRAPH ==========
      const nomorSk = config?.nomorSk || 'PP.00.6/045/2026';
      const namaSk = config?.namaSk || 'Penetapan Hasil Seleksi Penerimaan Murid Baru (PMB) Tahun Ajaran 2026/2027';
      const skText = `Berdasarkan SK Kepala ${schoolName} Nomor: ${nomorSk} tentang ${namaSk}, dengan ini menerangkan bahwa peserta didik dengan identitas tersebut di bawah ini:`;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 55, 60);
      const skLines = doc.splitTextToSize(skText, contentW);
      doc.text(skLines, marginX, y);
      y += skLines.length * 4 + 5;

      // ========== STUDENT INFO TABLE (compact) ==========
      const detail = studentDetail;
      const noPend = detail?.noPendaftaran || noPendaftaran;

      const tableData = [
        ['NOMOR PENDAFTARAN', noPend],
        ['NAMA LENGKAP', detail?.namaLengkap || '-'],
        ['NISN', detail?.nisn || '-'],
        ['SEKOLAH ASAL', detail?.sekolahAsal || '-'],
        ['JALUR SELEKSI', `Jalur ${detail?.jalurSeleksi || '-'}`],
      ];

      const rowH = 8;
      const tableH = tableData.length * rowH + 4;
      doc.setFillColor(245, 250, 248);
      doc.setDrawColor(200, 220, 215);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, y, contentW, tableH, 2, 2, 'FD');

      let tableY = y + rowH - 1;
      tableData.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(80, 90, 100);
        doc.text(label, marginX + 5, tableY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(20, 30, 40);
        doc.text(`: ${value}`, marginX + 50, tableY);
        tableY += rowH;
      });
      y += tableH + 6;

      // ========== DECLARATION TEXT ==========
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 55, 60);
      const declText = 'Setelah melalui serangkaian tahapan seleksi administrasi, akademik, dan wawancara, yang bersangkutan dinyatakan:';
      const declLines = doc.splitTextToSize(declText, contentW);
      doc.text(declLines, pageW / 2, y, { align: 'center', maxWidth: contentW });
      y += declLines.length * 4 + 6;

      // ========== LULUS BADGE ==========
      const badgeW = 50;
      const badgeH = 22;
      const badgeX = (pageW - badgeW) / 2;
      doc.setFillColor(15, 77, 56);
      doc.roundedRect(badgeX, y, badgeW, badgeH, 3, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(180, 220, 200);
      doc.text('STATUS AKHIR', pageW / 2, y + 6, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('LULUS', pageW / 2, y + 17, { align: 'center' });
      y += badgeH + 8;

      // ========== DIGITAL DOCUMENT NOTICE ==========
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 60, 60);
      const noticeText = 'Surat keterangan ini merupakan dokumen digital resmi yang diterbitkan secara elektronik dan tidak memerlukan tanda tangan basah.';
      const noticeLines = doc.splitTextToSize(noticeText, contentW - 10);
      doc.text(noticeLines, pageW / 2, y, { align: 'center', maxWidth: contentW - 10 });
      y += noticeLines.length * 3.5 + 8;

      // ========== QR CODE (compact) ==========
      const validationCode = detail?.validationCode || 'AUTH-VLD-2026-M2LT-0000000000-0000';
      const verificationUrl = `https://mandualotim.sch.id/ppdb/verifikasi?code=${validationCode}`;

      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 180,
        margin: 1,
        color: { dark: '#1a3a2a', light: '#f0f8f4' },
      });

      const qrSize = 30;
      const qrContainerW = 38;
      const qrContainerH = 42;
      const qrContainerX = (pageW - qrContainerW) / 2;

      doc.setFillColor(240, 248, 244);
      doc.setDrawColor(200, 220, 210);
      doc.setLineWidth(0.3);
      doc.roundedRect(qrContainerX, y, qrContainerW, qrContainerH, 2, 2, 'FD');

      const qrX = (pageW - qrSize) / 2;
      doc.addImage(qrDataUrl, 'PNG', qrX, y + 2, qrSize, qrSize);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 130, 115);
      doc.text('Pindai untuk verifikasi', pageW / 2, y + qrSize + 6, { align: 'center' });
      y += qrContainerH + 6;

      // ========== REF ID ==========
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(140, 150, 160);
      doc.text(`Ref ID: ${validationCode}`, pageW / 2, y, { align: 'center' });
      y += 5;

      // ========== ISSUE DATE ==========
      const now = new Date();
      const tanggal = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const issuedLocation = siteSettings.address || '';
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 110, 120);
      const issueDateText = issuedLocation
        ? `Diterbitkan pada tanggal ${tanggal} di ${issuedLocation}`
        : `Diterbitkan pada tanggal ${tanggal}`;
      doc.text(issueDateText, pageW / 2, y, { align: 'center', maxWidth: contentW });

      // Save
      doc.save(`Surat_Kelulusan_${noPendaftaran?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      toast.success('Surat kelulusan berhasil diunduh');
    } catch(err) {
      console.error('PDF generation error:', err);
      toast.error('Gagal membuat PDF Kelulusan');
    } finally {
      setExportingKelulusan(false);
    }
  };

  const generatePDFDraft = async () => {
    const draft = document.getElementById('daftar-ulang-form');
    if (!draft) return;
    try {
      setExportingDraft(true);
      // Prevent sidebars/buttons from printing
      const noPrints = draft.querySelectorAll('.no-print');
      noPrints.forEach(el => (el as HTMLElement).style.display = 'none');

      // Tampilkan temp footer
      const tmpFooter = document.getElementById('temp-footer');
      if (tmpFooter) tmpFooter.style.display = 'block';

      const canvas = await html2canvas(draft, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      
      noPrints.forEach(el => (el as HTMLElement).style.display = '');
      if (tmpFooter) tmpFooter.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 20);
      pdf.save(`Form_Daftar_Ulang_${noPendaftaran?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      toast.success('Form berhasil diunduh');
    } catch(err) {
      toast.error('Gagal membuat PDF Form');
    } finally {
      setExportingDraft(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-16">
      {/* 1. Header Sukses */}
      <div className="bg-[#0f4d38] text-white pt-10 pb-16 px-4" id="kelulusan-banner">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/ppdb')} className="no-print flex items-center gap-1.5 text-emerald-100 hover:text-white transition-colors mb-6 text-sm">
            <ArrowLeft size={16} /> Kembali ke Info PPDB
          </button>
          
          <h1 className="text-3xl md:text-5xl font-serif font-black mb-4 leading-tight">
            Selamat, Calon Murid Anda<br className="hidden md:block"/> Telah Dinyatakan <span className="text-yellow-400">LULUS!</span>
          </h1>
          <p className="text-emerald-100 mb-8 max-w-2xl text-sm md:text-base">
            Anda telah dinyatakan lulus seleksi masuk MAN 2 Lombok Timur. Silakan lengkapi formulir daftar ulang di bawah ini untuk mengamankan kursi Anda.
          </p>
          
          <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-[#155d45] p-6 rounded-xl border border-[#237055]">
            <div className="w-full flex gap-10">
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider mb-1">Nomor Registrasi</p>
                <p className="text-xl font-bold font-mono text-white">{noPendaftaran}</p>
              </div>
              <div className="no-print">
                <p className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider mb-1">Status</p>
                <p className="text-sm font-bold text-white bg-emerald-700 px-3 py-1 rounded inline-block">DITERIMA</p>
              </div>
            </div>
            
            <button 
              onClick={generatePDFBuktiKelulusan}
              disabled={exportingKelulusan}
              className="no-print w-full md:w-auto flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold py-3 px-6 rounded-lg whitespace-nowrap transition-colors disabled:opacity-75"
            >
              {exportingKelulusan ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
              {exportingKelulusan ? 'Sedang membuat PDF...' : 'Download Bukti Kelulusan'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Layout (Form & Sidebar) */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 relative z-10 flex flex-col lg:flex-row gap-6">
        
        {/* Formulir Daftar Ulang Container */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8" id="daftar-ulang-form">
          <div className="mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">1</span> 
              Konfirmasi Pembayaran
            </h2>
          </div>
          <div className="bg-[#f8fafc] border border-gray-200 p-5 rounded-xl mb-10 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Instruksi Transfer</p>
              <p className="text-sm text-gray-700 mb-4">Silakan transfer biaya daftar ulang sebesar <strong className="text-gray-900 text-base">Rp 1.250.000,-</strong> ke rekening resmi sekolah:</p>
              <div className="bg-white border border-gray-200 p-4 rounded-lg flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center font-bold text-gray-400">BANK</div>
                <div>
                  <p className="text-xs text-gray-500 font-bold">Bank Syariah Indonesia (BSI)</p>
                  <p className="text-lg font-black tracking-widest text-[#00a39d]">710-223-9982</p>
                  <p className="text-[10px] text-gray-400">A.N. PANITIA PPDB MAN 2 LOTIM</p>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full flex flex-col items-center justify-center">
              <label className="text-xs font-bold text-gray-600 mb-2 no-print">Unggah Bukti Transfer *</label>
              <div className="border-2 border-dashed border-gray-300 w-full rounded-xl p-6 flex flex-col items-center justify-center text-center bg-white relative overflow-hidden group hover:border-emerald-400 transition-colors cursor-pointer">
                <input type="file" onChange={(e) => handleFileUpload(e, 'buktiPembayaranUrl')} className="absolute inset-0 opacity-0 cursor-pointer z-10 no-print" />
                {uploading.buktiPembayaranUrl ? (
                  <div className="flex flex-col items-center"><Loader2 className="animate-spin text-emerald-500 mb-2" size={24}/><span className="text-xs">Mengunggah...</span></div>
                ) : buktiPembayaranUrl ? (
                  <div className="flex flex-col items-center text-emerald-600">
                    <CheckCircle className="w-8 h-8 mb-2" />
                    <span className="text-xs font-bold text-emerald-700 underline no-print pointer-events-none z-20">Lihat / Ubah File</span>
                    <span className="text-xs mt-1 text-gray-500 hidden print:block">Bukti transfer terlampir.</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-gray-400 mb-2 group-hover:text-emerald-500 transition-colors" />
                    <p className="text-xs text-gray-500"><span className="text-emerald-600 font-semibold underline">Klik untuk unggah</span> bukti sini</p>
                    <p className="text-[10px] text-gray-400 mt-1">Format: JPG, PNG, PDF (Maks. 2MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 pb-4 border-b border-gray-100 mt-8">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">2</span> 
              Verifikasi Dokumen Akhir
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-9">Mohon unggah pindaian (scan) resolusi tinggi dokumen asli untuk pelaporan EMIS.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <DocumentUploadField 
              label="Ijazah / SKL Asli *" 
              tag="ijazahUrl" 
              url={ijazahUrl} 
              uploading={uploading.ijazahUrl} 
              onUpload={handleFileUpload} 
              hint="Scan halaman depan" 
            />
            <DocumentUploadField 
              label="Kartu Keluarga (KK) *" 
              tag="kkUrl" 
              url={kkUrl} 
              uploading={uploading.kkUrl} 
              onUpload={handleFileUpload} 
              hint="KK terbaru barcode/stempel" 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <DocumentUploadField 
              label="Kartu PIP / PKH / KPS" 
              tag="kipUrl" 
              url={kipUrl} 
              uploading={uploading.kipUrl} 
              onUpload={handleFileUpload} 
              hint="(Opsional) Jika memiliki" 
            />
            <DocumentUploadField 
              label="Pas Foto Terbaru *" 
              tag="photoUrl" 
              url={photoUrl} 
              uploading={uploading.photoUrl} 
              onUpload={handleFileUpload} 
              hint="Latar belakang merah/biru" 
            />
          </div>

          <div className="mb-6 pb-4 border-b border-gray-100 mt-8">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">3</span> 
              Detail Ukuran Seragam
            </h2>
          </div>
          <div className="bg-[#f8fafc] border border-gray-200 p-6 rounded-xl flex flex-col md:flex-row gap-8 items-center">
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-600 mb-2">Ukuran Baju Almamater & Batik *</label>
                <div className="flex gap-2 mb-6">
                  {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <button 
                      key={size}
                      onClick={() => setUkuranBaju(size)}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors ${ukuranBaju === size ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-gray-300 text-gray-600 hover:border-emerald-400'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-gray-600 mb-2">Ukuran Celana / Rok *</label>
                <select 
                  value={ukuranCelana} 
                  onChange={e => setUkuranCelana(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Pilih Ukuran (Sesuai Pinggang)...</option>
                  <option value="S (27-28)">S (Ukuran 27-28)</option>
                  <option value="M (29-30)">M (Ukuran 29-30)</option>
                  <option value="L (31-32)">L (Ukuran 31-32)</option>
                  <option value="XL (33-34)">XL (Ukuran 33-34)</option>
                  <option value="XXL (35+)">XXL (Ukuran 35+)</option>
                </select>
             </div>
             <div className="w-full md:w-48 p-4 bg-gray-100 rounded-lg text-center hidden md:block border border-gray-200">
                <BookOpen size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                  Pastikan ukuran yang dipilih benar. Perubahan ukuran setelah divalidasi tidak direkomendasikan.
                </p>
             </div>
          </div>
          
          {/* Temporary string print-only for signature */}
          <div id="temp-footer" className="mt-16 hidden">
            <p className="text-xs text-justify text-gray-600 mb-8 border border-gray-300 p-4 rounded bg-gray-50">
              Dengan menandatangani form ini, kami menyatakan bahwa seluruh data dan dokumen yang diserahkan adalah benar. Kami bersedia tunduk pada aturan Madrasah.
            </p>
            <div className="flex justify-between px-10 text-center">
              <div>
                <p className="text-sm mb-16 font-semibold">Orang Tua / Wali</p>
                <p className="font-bold underline">_________________</p>
              </div>
              <div>
                <p className="text-sm mb-16 font-semibold">Calon Siswa</p>
                <p className="font-bold underline">_________________</p>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-80 space-y-6 no-print">
           
           <div className="bg-[#e2e8f0] rounded-2xl p-6 border border-[#cbd5e1] shadow-sm">
             <h3 className="font-bold text-gray-800 border-b border-gray-300 pb-3 mb-4">Ringkasan & Aksi</h3>
             
             <div className="space-y-3 mb-6">
               <div className="flex justify-between text-xs">
                 <span className="text-gray-500">Status Form</span>
                 <span className="font-bold text-blue-700">Draft Pengisian</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-gray-500">Kelengkapan</span>
                 <span className="font-bold text-gray-800">
                    {[buktiPembayaranUrl, ijazahUrl, kkUrl, photoUrl, ukuranBaju, ukuranCelana].filter(Boolean).length} / 6
                 </span>
               </div>
             </div>

             <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider mb-0.5 flex items-center gap-1"><AlertCircle size={12}/> Batas Waktu Daftar Ulang:</p>
                <p className="text-sm font-black text-red-600">{config?.batasDaftarUlang ? new Date(config.batasDaftarUlang).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric'}) : 'TBD'}</p>
             </div>

             <div className="space-y-3">
               <button 
                 onClick={handleSubmit} 
                 disabled={submitting}
                 className="w-full flex items-center justify-center gap-2 bg-[#0f4d38] hover:bg-[#0c3e2d] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
               >
                 {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                 {submitting ? 'Menyimpan...' : 'Simpan & Kirim'}
               </button>
               <button 
                 onClick={generatePDFDraft} 
                 disabled={exportingDraft}
                 className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 text-sm"
               >
                 {exportingDraft ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                 {exportingDraft ? 'Membuat PDF...' : 'Cetak Form (PDF)'}
               </button>
             </div>
           </div>

           <div className="bg-[#fff7ed] rounded-2xl p-6 border border-[#fed7aa]">
             <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">🤔 Butuh Bantuan?</h3>
             <p className="text-xs text-amber-800 mb-4 leading-relaxed">
               Hubungi Sekretariat PPDB jika Anda mengalami kendala saat mengunggah dokumen.
             </p>
             <button className="text-xs font-bold text-amber-800 underline hover:text-amber-600">WhatsApp Admin MAN 2</button>
           </div>

        </div>
      </div>
    </div>
  );
};

// Component helper for uploading documents
const DocumentUploadField = ({ 
  label, 
  hint,
  tag, 
  url, 
  uploading, 
  onUpload 
}: { 
  label: string;
  hint?: string;
  tag: string; 
  url: string; 
  uploading: boolean; 
  onUpload: (e: any, tag: string) => void;
}) => {
  return (
    <div className="border border-gray-200 bg-white p-4 rounded-xl">
      <div className="flex justify-between items-start mb-2">
        <div>
          <label className="text-xs font-bold text-gray-700 block">{label}</label>
          {hint && <span className="text-[10px] text-gray-400 no-print">{hint}</span>}
        </div>
      </div>
      
      <div className="relative mt-2">
        <label className={`block w-full border ${url ? 'border-solid border-emerald-300 bg-emerald-50' : 'border-dashed border-gray-300 hover:border-emerald-400'} rounded-lg p-3 text-center cursor-pointer transition-colors group`}>
          <input type="file" onChange={(e) => onUpload(e, tag)} className="hidden no-print" />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-emerald-500 pointer-events-none">
              <Loader2 size={14} className="animate-spin" /><span className="text-xs font-semibold">Mengunggah...</span>
            </div>
          ) : url ? (
            <div className="flex items-center justify-center gap-2 text-emerald-700 pointer-events-none">
              <CheckCircle size={16} />
              <span className="text-xs font-bold underline">Ubah File Terunggah</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-emerald-500 pointer-events-none transition-colors">
              <UploadCloud size={16} />
              <span className="text-xs font-bold">UNGGAH FILE</span>
            </div>
          )}
        </label>
      </div>
    </div>
  )
}
