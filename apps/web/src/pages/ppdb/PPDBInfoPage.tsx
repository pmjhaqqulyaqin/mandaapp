import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap, Trophy, ClipboardList, ChevronDown,
  ArrowRight, Users, Calendar, Target, CheckCircle, Clock, Search, Printer, X, Loader2
} from 'lucide-react';
import { HeaderWithSettings } from '../../components/HeaderWithSettings';
import { FooterWithSettings } from '../../components/FooterWithSettings';
import { SEO } from '../../components/SEO';
import { apiClient, API_BASE_URL } from '../../lib/api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================================
// Intersection Observer Hook (same as LayananPage)
// ============================================================
const useInView = (options?: IntersectionObserverInit) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(el);
      }
    }, { threshold: 0.01, rootMargin: '100px', ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
};

// ============================================================
// FAQ Data
// ============================================================
const FAQ_ITEMS = [
  { q: 'Kapan pendaftaran dibuka?', a: 'Jadwal pendaftaran disesuaikan oleh panitia PMB. Silakan cek halaman ini secara berkala atau hubungi Tata Usaha MAN 2 Lombok Timur.' },
  { q: 'Apa perbedaan jalur Prestasi dan Reguler?', a: 'Jalur Prestasi mensyaratkan sertifikat prestasi minimal tingkat kabupaten dan nilai rata-rata ≥ 80. Jalur Reguler mensyaratkan nilai rata-rata ≥ 70 dan berdomisili dalam zonasi sekolah.' },
  { q: 'Dokumen apa saja yang perlu disiapkan?', a: 'SKL/Ijazah, Kartu Keluarga, Akta Kelahiran, Pas Foto 3x4, dan Sertifikat Prestasi (untuk jalur Prestasi).' },
  { q: 'Bagaimana cara mengecek status pendaftaran?', a: 'Masukkan NISN dan Nomor Pendaftaran pada bagian "Cek Status" di halaman ini.' },
  { q: 'Apakah bisa mendaftar lebih dari satu jalur?', a: 'Tidak. Setiap calon siswa hanya bisa mendaftar pada satu jalur pendaftaran.' },
  { q: 'Bagaimana jika data yang diisi salah?', a: 'Hubungi panitia PMB melalui kontak yang tersedia untuk melakukan koreksi data.' },
];

// ============================================================
// Jalur Card Component with 3D Tilt
// ============================================================
const JalurCard = ({
  jalur,
  index,
  isVisible,
}: {
  jalur: any;
  index: number;
  isVisible: boolean;
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const isPrestasi = jalur.namaJalur === 'PRESTASI';
  const Icon = isPrestasi ? Trophy : ClipboardList;
  const color = isPrestasi ? {
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    shadow: 'rgba(245,158,11,0.3)',
    border: 'border-amber-200',
  } : {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    shadow: 'rgba(59,130,246,0.3)',
    border: 'border-blue-200',
  };

  // Check if jalur is currently open
  const now = new Date();
  const isOpen = (!jalur.jadwalBuka || now >= new Date(jalur.jadwalBuka)) &&
                 (!jalur.jadwalTutup || now <= new Date(jalur.jadwalTutup));
  const isUpcoming = jalur.jadwalBuka && now < new Date(jalur.jadwalBuka);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    const y = ((e.clientX - centerX) / (rect.width / 2)) * 8;
    setTilt({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  const persyaratanList = jalur.persyaratan ? jalur.persyaratan.split(';').filter(Boolean) : [];

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative"
      style={{
        perspective: '800px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.15}s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.15}s`,
      }}
    >
      <div
        className="relative bg-white rounded-2xl border border-gray-100 p-7 md:p-8 overflow-hidden transition-shadow duration-500"
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
            : 'rotateX(0) rotateY(0) scale(1)',
          transition: 'transform 0.25s ease-out, box-shadow 0.4s ease',
          boxShadow: isHovered
            ? `0 25px 60px -12px rgba(0,0,0,0.15), 0 0 40px -8px ${color.shadow}`
            : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: isHovered ? 'shimmerSweep 1.5s ease-in-out' : 'none',
          }}
        />

        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-xl ${color.bg} flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1`}
          style={{
            boxShadow: isHovered ? `0 8px 25px -5px ${color.shadow}` : 'none',
            transition: 'box-shadow 0.4s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Icon className={`w-8 h-8 ${color.text}`} strokeWidth={1.8} />
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-bold text-gray-800 text-xl">{isPrestasi ? '🏆 Prestasi' : '📋 Reguler'}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isOpen ? 'bg-emerald-100 text-emerald-700' : isUpcoming ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {isOpen ? '🟢 Dibuka' : isUpcoming ? '🟡 Segera' : '⏸️ Tutup'}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{jalur.deskripsi}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Users size={14} className={color.text} />
            <span>Kuota: <strong>{jalur.kuota} Siswa</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Target size={14} className={color.text} />
            <span>Min. Nilai: <strong>{jalur.nilaiMinimum}</strong></span>
          </div>
        </div>

        {/* Jadwal */}
        {(jalur.jadwalBuka || jalur.jadwalTutup) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Calendar size={14} className={color.text} />
            <span>
              {jalur.jadwalBuka ? new Date(jalur.jadwalBuka).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '~'}
              {' — '}
              {jalur.jadwalTutup ? new Date(jalur.jadwalTutup).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '~'}
            </span>
          </div>
        )}

        {/* Persyaratan */}
        {persyaratanList.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-700 mb-2">Persyaratan:</p>
            <ul className="space-y-1">
              {persyaratanList.map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <CheckCircle size={12} className={`${color.text} mt-0.5 shrink-0`} />
                  <span>{p.trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => navigate(`/ppdb/daftar/${jalur.id}`)}
          disabled={!isOpen}
          className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95 ${
            isOpen
              ? `bg-gradient-to-r ${color.gradient} text-white shadow-md hover:shadow-lg hover:-translate-y-0.5`
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isOpen ? (
            <>
              Daftar Sekarang
              <ArrowRight size={16} />
            </>
          ) : isUpcoming ? (
            <>
              <Clock size={16} />
              Segera Dibuka
            </>
          ) : (
            'Pendaftaran Ditutup'
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// FAQ Item Component
// ============================================================
const FAQItem = ({ item }: { item: typeof FAQ_ITEMS[0] }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 px-1 text-left group hover:bg-gray-50/50 transition-colors rounded-lg"
      >
        <span className="text-sm md:text-base font-medium text-gray-700 group-hover:text-gray-900 transition-colors pr-4">
          {item.q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-400 ease-in-out"
        style={{ maxHeight: isOpen ? '200px' : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <p className="px-1 pb-5 text-sm text-gray-500 leading-relaxed">{item.a}</p>
      </div>
    </div>
  );
};

// ============================================================
// Main PPDBInfoPage Component
// ============================================================
export const PPDBInfoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const heroSection = useInView();
  const jalurSection = useInView();
  const faqSection = useInView();

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackNisn, setTrackNisn] = useState('');
  const [trackNoPendaftaran, setTrackNoPendaftaran] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleExportPDF = async () => {
    const printArea = document.getElementById('print-area-hidden');
    if (!printArea) return;
    
    try {
      setIsExporting(true);
      // Temporarily display the hidden area for html2canvas to render properly
      printArea.style.display = 'block';

      // Process Page 1
      const printPage1 = document.getElementById('print-page-1');
      const printPage2 = document.getElementById('print-page-2');
      
      if (!printPage1 || !printPage2) throw new Error('Elemen cetak tidak ditemukan');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Helper function to render a page
      const renderPageToPdf = async (element: HTMLElement, isFirstPage: boolean) => {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: element.offsetWidth,
          windowWidth: element.offsetWidth,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        let renderedHeight = pdfWidth / ratio;
        
        if (!isFirstPage) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, renderedHeight);
      };

      await renderPageToPdf(printPage1, true);
      await renderPageToPdf(printPage2, false);

      
      pdf.save(`Bukti_Pendaftaran_${successData?.noPendaftaran?.replace(/[^a-zA-Z0-9]/g, '_') || 'Siswa'}.pdf`);
      toast.success('Bukti pendaftaran berhasil diunduh sebagai PDF');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengunduh PDF');
      if (printArea) printArea.style.display = 'none';
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (location.state?.success && location.state?.noPendaftaran) {
      setSuccessData({
        noPendaftaran: location.state.noPendaftaran,
        nisn: location.state.nisn,
        nama: location.state.nama,
        formData: location.state.formData,
        jalur: location.state.jalur
      });
      setShowSuccessModal(true);
      // Automatically prefill the tracker form
      if (location.state.nisn) setTrackNisn(location.state.nisn);
      setTrackNoPendaftaran(location.state.noPendaftaran);
      
      // Clear state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await apiClient<any>('/ppdb/config');
        setConfig(data);
      } catch (err) {
        console.error('Failed to load PPDB config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackNisn.trim() || !trackNoPendaftaran.trim()) return;
    try {
      const data = await apiClient<any>(`/ppdb/status/${trackNisn.trim()}/${trackNoPendaftaran.trim()}`);
      setTrackResult(data);
      toast.success('Data pendaftaran ditemukan');
    } catch (err: any) {
      toast.error(err.message || 'Data tidak ditemukan');
      setTrackResult(null);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jalurList = config?.jalur || [];

  // Determine if we're in the announcement phase
  const now = new Date();
  const tglPengumuman = config?.tanggalPengumuman ? new Date(config.tanggalPengumuman) : null;
  const batasDaftarUlang = config?.batasDaftarUlang ? new Date(config.batasDaftarUlang) : null;
  const isAnnouncementPhase = tglPengumuman && now >= tglPengumuman && (!batasDaftarUlang || now <= batasDaftarUlang);

  return (
    <div className="min-h-screen bg-white">
      <SEO />
      <HeaderWithSettings />

      {/* ====== HERO SECTION ====== */}
      <section
        ref={heroSection.ref}
        className="relative overflow-hidden min-h-[55vh] md:min-h-[65vh] flex items-center justify-start"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#d1fae5] via-[#dbeafe] to-[#e0e7ff]" />

        {/* Geometric pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating glass shapes */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-sky-300/10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '7s' }} />

        {/* Glass panel decorations */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none hidden lg:block">
          <div className="absolute top-[10%] right-[5%] w-64 h-80 border border-white/40 rounded-3xl rotate-12 backdrop-blur-sm bg-white/5" />
          <div className="absolute top-[20%] right-[15%] w-48 h-64 border border-white/30 rounded-2xl -rotate-6 backdrop-blur-sm bg-white/5" />
          <div className="absolute bottom-[15%] right-[10%] w-40 h-52 border border-white/20 rounded-xl rotate-3 backdrop-blur-sm bg-white/5" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div
            className="max-w-2xl"
            style={{
              opacity: heroSection.isInView ? 1 : 0,
              transform: heroSection.isInView ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-full border border-white/40 mb-4">
              <GraduationCap size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">SIMPMB 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              Penerimaan{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
                Murid Baru
              </span>
            </h1>
            <p className="mt-3 text-sm sm:text-base md:text-lg text-gray-600 font-medium">
              Madrasah Aliyah Negeri 2 Lombok Timur — Tahun Ajaran {config?.tahunAjaran || '2026/2027'}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={() => scrollTo('jalur-section')}
                className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-wider"
              >
                Lihat Jalur Pendaftaran
              </button>
              <button
                onClick={() => scrollTo('tracking-section')}
                className="px-7 py-3 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 font-bold rounded-lg border border-gray-200 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-wider"
              >
                {isAnnouncementPhase ? 'Cek Status Kelulusan' : 'Cek Status Pendaftaran'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 32L48 37.3C96 43 192 53 288 53.3C384 53 480 43 576 42.7C672 43 768 53 864 58.7C960 64 1056 64 1152 58.7C1248 53 1344 43 1392 37.3L1440 32V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0V32Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ====== JALUR CARDS SECTION ====== */}
      <section id="jalur-section" ref={jalurSection.ref} className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16">
            <span
              className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full uppercase tracking-widest mb-4"
              style={{
                opacity: jalurSection.isInView ? 1 : 0,
                transform: jalurSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            >
              Jalur Pendaftaran
            </span>
            <h2
              className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight"
              style={{
                opacity: jalurSection.isInView ? 1 : 0,
                transform: jalurSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
              }}
            >
              Pilih <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">Jalur</span> Pendaftaran Anda
            </h2>
            <p
              className="mt-4 text-gray-500 text-sm md:text-base max-w-2xl mx-auto leading-relaxed"
              style={{
                opacity: jalurSection.isInView ? 1 : 0,
                transform: jalurSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
              }}
            >
              Silakan pilih jalur yang sesuai dengan prestasi dan kualifikasi Anda
            </p>
          </div>

          {/* Jalur Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : jalurList.length > 0 ? (
            <div className={`grid gap-6 md:gap-8 ${jalurList.length === 1 ? 'max-w-md mx-auto' : 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'}`}>
              {jalurList.map((jalur: any, index: number) => (
                <JalurCard key={jalur.id} jalur={jalur} index={index} isVisible={jalurSection.isInView} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <GraduationCap size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">Belum ada jalur pendaftaran yang dibuka saat ini.</p>
              <p className="text-gray-400 text-xs mt-1">Silakan cek kembali nanti atau hubungi panitia PMB.</p>
            </div>
          )}
        </div>
      </section>

      {/* ====== INFO & FAQ SECTION (2-column) ====== */}
      <section id="info-section" ref={faqSection.ref} className="py-16 md:py-24 bg-[#F8FBF8]">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <span
              className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full uppercase tracking-widest mb-4"
              style={{
                opacity: faqSection.isInView ? 1 : 0,
                transform: faqSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            >
              Informasi PMB
            </span>
            <h2
              className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight"
              style={{
                opacity: faqSection.isInView ? 1 : 0,
                transform: faqSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
              }}
            >
              FAQ &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
                Brosur PMB
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: FAQ Accordion */}
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">?</span>
                Pertanyaan Umum
              </h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y-0 px-5 md:px-6">
                {FAQ_ITEMS.map((item, index) => (
                  <FAQItem key={index} item={item} />
                ))}
              </div>
            </div>

            {/* RIGHT: Brosur & Info */}
            <div className="space-y-6">
              {/* Brosur Card */}
              {config?.brosurUrl && (
                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xs">📌</span>
                    Brosur PMB
                  </h3>
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white"
                    onClick={() => setLightboxOpen(true)}
                  >
                    <img
                      src={`${API_BASE_URL.replace('/api', '')}${config.brosurUrl}`}
                      alt="Brosur PMB 2026"
                      className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-gray-700 shadow-lg">
                        🔍 Klik untuk memperbesar
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Penting */}
              {jalurList.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-600" />
                    Timeline Penting
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    {/* Prestasi */}
                    {jalurList.find(j => j.namaJalur.toUpperCase() === 'PRESTASI') && (() => {
                      const j = jalurList.find(j => j.namaJalur.toUpperCase() === 'PRESTASI')!;
                      return (
                        <div className="relative border-l-2 border-orange-200 ml-2 space-y-4">
                          <p className="absolute -top-3 left-3 bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">Jalur PRESTASI</p>
                          <div className="relative pl-5 pt-4">
                            <div className="absolute -left-[7px] top-5 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_0_3px_white]" />
                            <p className="text-xs font-bold text-gray-700">Dibuka</p>
                            <p className="text-xs text-gray-500">{j.jadwalBuka ? new Date(j.jadwalBuka).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                          </div>
                          <div className="relative pl-5">
                            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_0_3px_white]" />
                            <p className="text-xs font-bold text-gray-700">Ditutup</p>
                            <p className="text-xs text-gray-500">{j.jadwalTutup ? new Date(j.jadwalTutup).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Reguler */}
                    {jalurList.find(j => j.namaJalur.toUpperCase() === 'REGULER') && (() => {
                      const j = jalurList.find(j => j.namaJalur.toUpperCase() === 'REGULER')!;
                      return (
                        <div className="relative border-l-2 border-blue-200 ml-2 space-y-4">
                          <p className="absolute -top-3 left-3 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">Jalur REGULER</p>
                          <div className="relative pl-5 pt-4">
                            <div className="absolute -left-[7px] top-5 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_0_3px_white]" />
                            <p className="text-xs font-bold text-gray-700">Dibuka</p>
                            <p className="text-xs text-gray-500">{j.jadwalBuka ? new Date(j.jadwalBuka).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                          </div>
                          <div className="relative pl-5">
                            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_0_3px_white]" />
                            <p className="text-xs font-bold text-gray-700">Ditutup</p>
                            <p className="text-xs text-gray-500">{j.jadwalTutup ? new Date(j.jadwalTutup).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="relative border-l-2 border-gray-200 ml-2 space-y-4 pt-2 border-t border-gray-100/50 mt-2">
                    {/* Pengumuman */}
                    {config?.tanggalPengumuman && (
                      <div className="relative pl-5 mt-2">
                        <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_0_3px_white]" />
                        <p className="text-xs font-bold text-gray-700">Pengumuman Kelulusan</p>
                        <p className="text-xs text-gray-500">{new Date(config.tanggalPengumuman).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    )}
                    {/* Batas Daftar Ulang */}
                    {config?.batasDaftarUlang && (
                      <div className="relative pl-5">
                        <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_0_3px_white]" />
                        <p className="text-xs font-bold text-gray-700">Batas Daftar Ulang</p>
                        <p className="text-xs text-gray-500">{new Date(config.batasDaftarUlang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Kontak Info */}
              <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border border-emerald-100/50 p-6">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  📞 Kontak Panitia PMB
                </h3>
                <div className="space-y-3 text-xs text-gray-600">
                  {config?.kontakPanitia?.length > 0 ? (
                    config.kontakPanitia.map((k: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-white rounded-xl shadow-sm border border-emerald-100/50 transition-transform hover:scale-[1.02]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[14px]">
                            👤
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{k.nama}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{k.noHp}</p>
                          </div>
                        </div>
                        <a 
                          href={`https://wa.me/${k.noHp.replace(/^0/, '62').replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors text-[10px]"
                        >
                          Chat WA
                        </a>
                      </div>
                    ))
                  ) : (
                    <>
                      <p className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center text-[10px]">📱</span>
                        <span>Hubungi TU MAN 2 Lombok Timur</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-[10px]">🌐</span>
                        <span>Website: mandualotim.sch.id/ppdb</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brosur Lightbox */}
      {lightboxOpen && config?.brosurUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button 
            onClick={() => setLightboxOpen(false)} 
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
          <img
            src={`${API_BASE_URL.replace('/api', '')}${config.brosurUrl}`}
            alt="Brosur PMB 2026"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ====== TRACKING SECTION ====== */}
      <section id="tracking-section" className="py-16 md:py-20 bg-gradient-to-b from-[#ecfdf5] to-[#F8FBF8]">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
            {isAnnouncementPhase ? 'Cek Status Kelulusan' : 'Cek Status Pendaftaran'}
          </h2>
          <p className="text-gray-500 text-xs mb-6 leading-relaxed max-w-lg mx-auto">
            {isAnnouncementPhase
              ? 'Cek status Kelulusan Anda dengan memasukkan NISN dan Nomor Pendaftaran.'
              : 'Cek status pendaftaran Anda dengan memasukkan NISN dan Nomor Pendaftaran.'
            }
            <br />
            <span className="italic text-xs">
              Nomor Pendaftaran didapatkan setelah berhasil mendaftar.
            </span>
          </p>

          <form onSubmit={handleTrackSubmit} className="space-y-3 max-w-md mx-auto">
            <input
              required
              type="text"
              placeholder="NISN (contoh: 0098765432)"
              value={trackNisn}
              onChange={(e) => setTrackNisn(e.target.value)}
              className="w-full px-5 py-3.5 rounded-lg border border-gray-200 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-sm transition-all bg-white"
            />
            <input
              required
              type="text"
              placeholder="Nomor Pendaftaran (contoh: PMB2026/00001)"
              value={trackNoPendaftaran}
              onChange={(e) => setTrackNoPendaftaran(e.target.value)}
              className="w-full px-5 py-3.5 rounded-lg border border-gray-200 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-sm transition-all bg-white"
            />
            <button
              type="submit"
              className="w-full px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-sm"
            >
              <Search size={16} className="inline mr-2" />
              Cek Status
            </button>
          </form>

          {/* Result */}
          {trackResult && (
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-xl text-left border border-gray-100">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800">{trackResult.dataDiri?.namaLengkap || trackResult.nisn}</h3>
                  <p className="text-xs text-gray-500">No: {trackResult.noPendaftaran} • Jalur: {trackResult.jalur?.namaJalur}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                  trackResult.status === 'diterima' ? 'bg-emerald-100 text-emerald-700' :
                  trackResult.status === 'terverifikasi' ? 'bg-blue-100 text-blue-700' :
                  trackResult.status === 'ditolak' ? 'bg-red-100 text-red-700' :
                  trackResult.status === 'cadangan' ? 'bg-amber-100 text-amber-700' :
                  trackResult.status === 'menunggu_pengumuman' ? 'bg-purple-100 text-purple-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {trackResult.status.replace('_', ' ')}
                </span>
              </div>

              {/* Status Timeline */}
              <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_0_4px_white]" />
                  <div className="font-semibold text-gray-800 text-sm">Formulir Terkirim</div>
                  <div className="text-xs text-gray-400 mt-0.5">{new Date(trackResult.tglDaftar).toLocaleString('id-ID')}</div>
                </div>
                {(trackResult.status === 'terverifikasi' || trackResult.status === 'diterima' || trackResult.status === 'menunggu_pengumuman') && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_white]" />
                    <div className="font-semibold text-gray-800 text-sm">Data Terverifikasi</div>
                    <div className="text-xs text-gray-500 mt-0.5">Data Anda telah diverifikasi oleh admin.</div>
                  </div>
                )}
                {trackResult.status === 'menunggu_pengumuman' && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-purple-500 shadow-[0_0_0_4px_white]" />
                    <div className="font-semibold text-purple-700 text-sm">Menunggu Pengumuman</div>
                    <div className="text-xs text-gray-500 mt-0.5">Status kelulusan sedang diproses. Silakan kembali pada tanggal pengumuman.</div>
                  </div>
                )}
                {trackResult.status === 'diterima' && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_white] flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="font-semibold text-emerald-700 text-sm">🎉 Selamat! Anda Diterima</div>
                    <div className="text-xs text-gray-500 mt-0.5 mb-3">Silakan lakukan registrasi ulang sesuai jadwal.</div>
                    <button
                      onClick={() => navigate(`/ppdb/daftar-ulang?no=${encodeURIComponent(trackResult.noPendaftaran)}`)}
                      className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm shadow-emerald-500/20 text-xs w-full sm:w-auto"
                    >
                      Lanjutkan ke Daftar Ulang <ArrowRight size={14} />
                    </button>
                  </div>
                )}
                {trackResult.status === 'ditolak' && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_0_4px_white]" />
                    <div className="font-semibold text-gray-800 text-sm">Tidak Lolos Seleksi</div>
                    {trackResult.catatanAdmin && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">{trackResult.catatanAdmin}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <FooterWithSettings />

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative print:shadow-none print:max-w-none print:rounded-none" id="print-area">
            
            {/* The visible part on the screen */}
            <div className="bg-emerald-500 p-6 text-center text-white print:bg-emerald-500">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold">Pendaftaran Berhasil!</h2>
              <p className="text-emerald-100 text-sm mt-1">Data Anda telah kami terima.</p>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 text-center text-sm mb-4">Harap simpan atau cetak nomor pendaftaran ini sebagai bukti pendaftaran Anda.</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center mb-6">
                <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Nomor Pendaftaran</p>
                <p className="text-2xl font-black text-gray-900 font-mono tracking-tight">{successData.noPendaftaran}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Nama Siswa</span>
                  <span className="font-semibold text-gray-800">{successData.nama || '-'}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">NISN</span>
                  <span className="font-semibold text-gray-800">{successData.nisn || '-'}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Waktu Daftar</span>
                  <span className="font-semibold text-gray-800">{new Date().toLocaleString('id-ID')}</span>
                </div>
              </div>

              <p className="print-warning text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 text-center mb-6">
                <span className="font-bold">Penting:</span> Simpan dokumen PDF ini sebagai bukti pendaftaran Anda.
              </p>

              <div className="print-action-buttons flex items-center gap-3">
                <button 
                  onClick={handleExportPDF} 
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-70 text-white rounded-xl font-bold transition-all"
                >
                  {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} 
                  {isExporting ? 'Mempersiapkan PDF...' : 'Download PDF'}
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)} 
                  disabled={isExporting}
                  className="flex items-center justify-center p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PDF Template Area (Hidden on screen) */}
            <div className="bg-white absolute left-[200vw] top-0 w-[210mm] text-black" id="print-area-hidden" style={{ display: 'none' }}>
              
              {/* PAGE 1 */}
              <div id="print-page-1" className="bg-white w-[210mm] min-h-[297mm] p-10 font-sans text-black relative box-border">
                {/* HEADER */}
                <div className="border-b-4 border-black pb-4 mb-6 flex items-center gap-6">
                  <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" />
                  <div className="text-center flex-1 pr-12">
                    <h1 className="font-bold text-xl uppercase tracking-wide">KEMENTERIAN AGAMA REPUBLIK INDONESIA</h1>
                    <h2 className="font-black text-2xl uppercase mt-1 mb-1 tracking-wider">MAN 2 LOMBOK TIMUR</h2>
                    <p className="text-[10pt]">Jl. Pendidikan No. 123, Selong, Lombok Timur, NTB 83611</p>
                    <p className="text-[10pt]">Website: mandualotim.sch.id | Email: info@mandualotim.sch.id</p>
                  </div>
                </div>

                {/* JUDUL & FOTO */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex-1 text-center mt-2">
                    <h2 className="font-black text-lg uppercase underline underline-offset-4 mb-1">BUKTI PENDAFTARAN PESERTA DIDIK BARU</h2>
                    <p className="font-bold text-[11pt]">Tahun Ajaran {config?.tahunAjaran || '2026/2027'}</p>
                    
                    {/* NO PENDAFTARAN KOTAK */}
                    <div className="border-2 border-black p-3 text-center mt-6 w-max mx-auto rounded-md shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-gray-50">
                      <div className="text-[10pt] font-bold uppercase tracking-wider mb-1">Nomor Pendaftaran</div>
                      <div className="text-2xl font-black font-mono tracking-widest">{successData.noPendaftaran}</div>
                    </div>
                  </div>
                  <div className="w-[30mm] h-[40mm] border-2 border-gray-400 flex flex-col items-center justify-center text-gray-500 font-bold ml-4 shrink-0 bg-gray-50 overflow-hidden">
                    {successData.formData?.dokumen?.find((d: any) => d.jenisDokumen === 'Pas Foto 3x4') ? (
                      <img 
                        src={`${API_BASE_URL.replace('/api', '')}${successData.formData.dokumen.find((d: any) => d.jenisDokumen === 'Pas Foto 3x4').filePath}`} 
                        alt="Pas Foto" 
                        className="w-full h-full object-cover" 
                        crossOrigin="anonymous" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <span className="text-[10pt]">PAS FOTO</span>
                        <span className="text-[10pt]">3 X 4</span>
                        <span className="text-[8pt] font-normal mt-2">(Otomatis)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* JALUR */}
                <div className="mb-6">
                  <table className="w-full text-[11pt]">
                    <tbody>
                      <tr>
                        <td className="w-[45%] py-1.5 font-bold">Jalur Pendaftaran</td>
                        <td className="w-4 py-1.5 font-bold">:</td>
                        <td className="font-bold uppercase bg-gray-100 px-2 py-1 rounded inline-block">{successData.jalur?.namaJalur || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Tanggal Pendaftaran</td>
                        <td className="py-1.5">:</td>
                        <td>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WITA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* DATA DIRI */}
                <div className="mb-6">
                  <h3 className="font-bold border-b border-black pb-1 mb-3 text-[11pt]">I. IDENTITAS CALON PESERTA DIDIK</h3>
                  <table className="w-full text-[11pt]">
                    <tbody>
                      <tr>
                        <td className="w-[45%] py-1.5">Nama Lengkap</td>
                        <td className="w-4 py-1.5">:</td>
                        <td className="font-bold">{successData.formData?.dataDiri?.namaLengkap || successData.nama || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">NIK (Nomor Induk Kependudukan)</td>
                        <td className="py-1.5">:</td>
                        <td>{successData.formData?.dataDiri?.nik || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">NISN</td>
                        <td className="py-1.5">:</td>
                        <td>{successData.formData?.dataDiri?.nisn || successData.nisn || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Tempat, Tanggal Lahir</td>
                        <td className="py-1.5">:</td>
                        <td>
                          {successData.formData?.dataDiri?.tempatLahir || '-'},{' '}
                          {successData.formData?.dataDiri?.tanggalLahir ? new Date(successData.formData.dataDiri.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Jenis Kelamin</td>
                        <td className="py-1.5">:</td>
                        <td>{successData.formData?.dataDiri?.jenisKelamin || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Sekolah Asal</td>
                        <td className="py-1.5">:</td>
                        <td>{successData.formData?.dataSekolah?.namaSekolah || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 align-top">Alamat Rumah</td>
                        <td className="py-1.5 align-top">:</td>
                        <td className="align-top leading-snug">{successData.formData?.dataDiri?.alamat || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* DATA SEKOLAH */}
                <div className="mb-6">
                  <h3 className="font-bold border-b border-black pb-1 mb-3 text-[11pt]">II. DATA SEKOLAH ASAL</h3>
                  <table className="w-full text-[11pt]">
                    <tbody>
                      <tr>
                        <td className="w-[45%] py-1.5">Sekolah Asal</td>
                        <td className="w-4 py-1.5">:</td>
                        <td className="font-bold">{successData.formData?.dataSekolah?.namaSekolah || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">NPSN</td>
                        <td className="py-1.5">:</td>
                        <td>{successData.formData?.dataSekolah?.npsn || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Tahun Lulus</td>
                        <td className="py-1.5">:</td>
                        <td>{successData.formData?.dataSekolah?.tahunLulus || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* DATA ORANG TUA */}
                <div className="mb-6">
                  <h3 className="font-bold border-b border-black pb-1 mb-3 text-[11pt]">III. DATA ORANG TUA / WALI</h3>
                  <table className="w-full text-[11pt]">
                    <tbody>
                      <tr>
                        <td className="w-[45%] py-1.5">Nama Ayah / Ibu</td>
                        <td className="w-4 py-1.5">:</td>
                        <td>{successData.formData?.dataDiri?.namaAyah || successData.formData?.dataDiri?.namaIbu || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">No. HP / Telepon</td>
                        <td className="py-1.5">:</td>
                        <td>{successData.formData?.dataDiri?.noHpOrtu || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGE 2 */}
              <div id="print-page-2" className="bg-white w-[210mm] min-h-[297mm] p-10 font-sans text-black relative box-border">
                {/* DATA NILAI & PRESTASI */}
                <div className="mb-10">
                  <h3 className="font-bold border-b border-black pb-1 mb-3 text-[11pt]">IV. DATA NILAI RAPORT & PRESTASI</h3>
                  
                  <div className="mb-6">
                    <div className="font-bold text-[10pt] mb-2">Nilai Raport:</div>
                    <table className="w-full text-[10pt] border-collapse">
                      <thead>
                        <tr>
                          <th className="border border-black px-2 py-1 text-left bg-gray-50">Semester</th>
                          <th className="border border-black px-2 py-1 text-center bg-gray-50">B. Ind</th>
                          <th className="border border-black px-2 py-1 text-center bg-gray-50">B. Ing</th>
                          <th className="border border-black px-2 py-1 text-center bg-gray-50">MTK</th>
                          <th className="border border-black px-2 py-1 text-center bg-gray-50">IPA</th>
                          <th className="border border-black px-2 py-1 text-center bg-gray-50">IPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {successData.formData?.nilaiRaport?.length > 0 ? (
                          successData.formData.nilaiRaport.map((n: any, i: number) => (
                            <tr key={i}>
                              <td className="border border-black px-2 py-1 font-medium">Semester {n.semester}</td>
                              <td className="border border-black px-2 py-1 text-center">{n.bIndonesia || '-'}</td>
                              <td className="border border-black px-2 py-1 text-center">{n.bInggris || '-'}</td>
                              <td className="border border-black px-2 py-1 text-center">{n.matematika || '-'}</td>
                              <td className="border border-black px-2 py-1 text-center">{n.ipa || '-'}</td>
                              <td className="border border-black px-2 py-1 text-center">{n.ips || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="border border-black px-2 py-3 text-center italic text-gray-500">Tidak ada data nilai raport yang diinputkan</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className="font-bold text-[10pt] mb-2">Prestasi:</div>
                    {successData.formData?.prestasi?.length > 0 ? (
                      <ul className="list-disc pl-5 text-[10pt] space-y-2">
                        {successData.formData.prestasi.map((p: any, i: number) => (
                          <li key={i}>
                            <span className="font-bold">{p.namaKegiatan}</span> - {p.peringkat} Tingkat {p.tingkat} ({p.tahun})
                            <br/>
                            <span className="text-[9pt] italic text-gray-500">Kategori: {p.jenis}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[10pt] italic text-gray-500 border border-dashed border-gray-300 p-3 rounded">Tidak ada data prestasi tambahan yang diinputkan</div>
                    )}
                  </div>
                </div>

                {/* PERNYATAAN */}
                <div className="mb-10 border-t border-dashed border-gray-400 pt-6 text-[11pt] text-justify leading-snug">
                  <div className="font-bold mb-2">V. PERNYATAAN</div>
                  Dengan mencetak bukti ini, saya menyatakan bahwa seluruh data yang diisikan di atas adalah benar dan sesuai dengan dokumen asli yang sah. Apabila di kemudian hari terbukti ada pemalsuan data, maka kami bersedia menerima sanksi sesuai dengan ketentuan yang berlaku di MAN 2 Lombok Timur.
                </div>

                {/* TANDA TANGAN */}
                <div className="flex justify-between text-[11pt] mb-16">
                  <div className="text-center w-64">
                    <br/>
                    <div className="mb-24">Tanda Tangan Orang Tua/Wali,</div>
                    <div className="font-bold border-b border-black inline-block px-8 pb-1">( _______________________ )</div>
                  </div>
                  <div className="text-center w-64">
                    <div className="mb-1">Lombok Timur, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="mb-24">Calon Peserta Didik,</div>
                    <div className="font-bold border-b border-black inline-block px-8 pb-1">( _______________________ )</div>
                  </div>
                </div>

                {/* CATATAN PANITIA */}
                <div className="border-[3px] border-black p-5 text-[11pt] rounded-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
                    <img src="/logo.png" className="w-40 h-40" />
                  </div>
                  <div className="font-black mb-4 uppercase text-[12pt] border-b-2 border-black inline-block pb-1">CATATAN PANITIA VERIFIKASI</div>
                  <div className="text-[10pt] italic text-gray-600 mb-6">(Diisi oleh panitia saat penyerahan berkas fisik di madrasah)</div>
                  <div className="mb-8 font-bold text-[12pt] flex items-center gap-10">
                    <span>Status Berkas:</span>
                    <span className="flex items-center gap-2"><div className="w-6 h-6 border-2 border-black inline-block"></div> VALID</span>
                    <span className="flex items-center gap-2"><div className="w-6 h-6 border-2 border-black inline-block"></div> TIDAK VALID</span>
                  </div>
                  <div className="flex justify-end mt-4">
                    <div className="w-64 text-center">
                      <div className="mb-24">Petugas Verifikator,</div>
                      <div className="font-bold border-b border-black inline-block px-8 pb-1">( _______________________ )</div>
                      <div className="text-left mt-2 font-bold text-[10pt]">NIP.</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Shimmer animation & Print Styles */}
      <style>{`
        @keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media print {
          body > #root > div > *:not(#print-area) {
            display: none !important;
          }
          #print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
