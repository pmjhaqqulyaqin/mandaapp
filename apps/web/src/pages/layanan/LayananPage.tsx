import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Globe,
  BookOpen,
  Search as SearchIcon,
  Users,
  Briefcase,
  BookUser,
  MessageSquareWarning,
  ClipboardCheck,
  ChevronDown,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Service Card Data
// ============================================================
const SERVICE_CARDS = [
  {
    name: 'Surat Keterangan',
    description: 'Layanan pembuatan Surat Keterangan Aktif, Keterangan Berkelakuan Baik, dan lainnya.',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    slug: 'izin-pembuatan-surat-keterangan',
  },
  {
    name: 'Legalisir Online',
    description: 'Layanan legalisir Ijazah, Rapot, SKHUN, SKHUAM dan dokumen resmi madrasah lainnya.',
    icon: Globe,
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    slug: 'legalisir-online',
  },
  {
    name: 'Izin Siswa',
    description: 'Permohonan izin tidak masuk sekolah bagi Siswa/Siswi MAN 2 Lombok Timur.',
    icon: BookOpen,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
    slug: 'izin-siswa',
  },
  {
    name: 'Izin Penelitian',
    description: 'Layanan izin untuk melakukan observasi dan penelitian di lingkungan Madrasah.',
    icon: SearchIcon,
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
    slug: 'izin-penelitian',
  },
  {
    name: 'Izin Sosialisasi',
    description: 'Layanan izin penyuluhan, sosialisasi, atau kunjungan edukatif ke Madrasah.',
    icon: Users,
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
    slug: 'izin-sosialisasi',
  },
  {
    name: 'Izin Magang',
    description: 'Layanan permohonan untuk kegiatan Magang / Observasi / PKL dan lainnya.',
    icon: Briefcase,
    color: 'from-cyan-500 to-sky-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    slug: 'izin-magang',
  },
  {
    name: 'Buku Tamu',
    description: 'Layanan tamu yang akan berkunjung ke Madrasah baik Perorangan ataupun dari Instansi.',
    icon: BookUser,
    color: 'from-indigo-500 to-blue-700',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    slug: 'buku-tamu',
  },
  {
    name: 'Layanan Pengaduan',
    description: 'Layanan Pengaduan Masyarakat terkait pelayanan madrasah, siswa, dan lainnya.',
    icon: MessageSquareWarning,
    color: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-50',
    textColor: 'text-red-600',
    slug: 'layanan-pengaduan',
  },
  {
    name: 'Survey Pelayanan',
    description: 'Survei kepuasan masyarakat terhadap kualitas pelayanan pada sistem SALAM MANDA.',
    icon: ClipboardCheck,
    color: 'from-teal-500 to-emerald-600',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-600',
    slug: 'survey-layanan',
  },
];

// ============================================================
// FAQ Data
// ============================================================
const FAQ_ITEMS = [
  { q: 'Bagaimana Standar Operasional Prosedur permohonan Legalisir Dokumen secara Online?', a: 'Informasi lengkap mengenai SOP Legalisir Online akan segera tersedia. Silakan hubungi bagian Tata Usaha untuk informasi lebih lanjut.' },
  { q: 'Bagaimana Standar Operasional Prosedur permohonan Izin Penelitian?', a: 'Informasi lengkap mengenai SOP Izin Penelitian akan segera tersedia. Silakan hubungi bagian Tata Usaha untuk informasi lebih lanjut.' },
  { q: 'Bagaimana Standar Operasional Prosedur permohonan Izin Magang/PPL/PKL?', a: 'Informasi lengkap mengenai SOP Izin Magang akan segera tersedia. Silakan hubungi bagian Tata Usaha untuk informasi lebih lanjut.' },
  { q: 'Bagaimana Standar Operasional Prosedur permohonan Izin Sosialisasi?', a: 'Informasi lengkap mengenai SOP Izin Sosialisasi akan segera tersedia. Silakan hubungi bagian Tata Usaha untuk informasi lebih lanjut.' },
  { q: 'Bagaimana Standar Operasional Prosedur permohonan Pembuatan Surat Keterangan?', a: 'Informasi lengkap mengenai SOP Pembuatan Surat Keterangan akan segera tersedia. Silakan hubungi bagian Tata Usaha untuk informasi lebih lanjut.' },
  { q: 'Bagaimana Standar Operasional Prosedur Pengaduan Masyarakat?', a: 'Informasi lengkap mengenai SOP Pengaduan Masyarakat akan segera tersedia. Silakan hubungi bagian Tata Usaha untuk informasi lebih lanjut.' },
  { q: 'Bagaimana cara mengecek status permohonan?', a: 'Anda dapat mengecek status permohonan pada bagian "Cek Status Ajuan" di bawah halaman ini. Masukkan nomor resi yang Anda terima setelah berhasil mengirim form permohonan.' },
];

// ============================================================
// Intersection Observer Hook
// ============================================================
const useInView = (options?: IntersectionObserverInit) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(el);
      }
    }, { threshold: 0.15, ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
};

// ============================================================
// ServiceCard Component with 3D Tilt + Hover Effects
// ============================================================
const ServiceCard = ({
  card,
  index,
  isVisible,
}: {
  card: typeof SERVICE_CARDS[0];
  index: number;
  isVisible: boolean;
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = card.icon;

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

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/services/${card.slug}`)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-pointer"
      style={{
        perspective: '800px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.08}s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.08}s`,
      }}
    >
      <div
        className="relative bg-white rounded-2xl border border-gray-100 p-6 md:p-7 overflow-hidden transition-shadow duration-500"
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.03)`
            : 'rotateX(0) rotateY(0) scale(1)',
          transition: 'transform 0.25s ease-out, box-shadow 0.4s ease',
          boxShadow: isHovered
            ? '0 25px 60px -12px rgba(0,0,0,0.15), 0 0 40px -8px rgba(59,130,246,0.15)'
            : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Shimmer sweep on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: isHovered ? 'shimmerSweep 1.5s ease-in-out' : 'none',
          }}
        />

        {/* Gradient border glow on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${card.color.includes('blue') ? '#3b82f6' : card.color.includes('emerald') ? '#10b981' : card.color.includes('violet') ? '#8b5cf6' : card.color.includes('amber') ? '#f59e0b' : card.color.includes('pink') ? '#ec4899' : card.color.includes('cyan') ? '#06b6d4' : card.color.includes('indigo') ? '#6366f1' : card.color.includes('red') ? '#ef4444' : '#14b8a6'}, transparent)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '2px',
            borderRadius: '1rem',
          }}
        />

        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl ${card.bgLight} flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1`}
          style={{
            boxShadow: isHovered ? `0 8px 25px -5px ${card.color.includes('blue') ? 'rgba(59,130,246,0.3)' : card.color.includes('emerald') ? 'rgba(16,185,129,0.3)' : card.color.includes('violet') ? 'rgba(139,92,246,0.3)' : card.color.includes('amber') ? 'rgba(245,158,11,0.3)' : card.color.includes('pink') ? 'rgba(236,72,153,0.3)' : card.color.includes('cyan') ? 'rgba(6,182,212,0.3)' : card.color.includes('indigo') ? 'rgba(99,102,241,0.3)' : card.color.includes('red') ? 'rgba(239,68,68,0.3)' : 'rgba(20,184,166,0.3)'}` : 'none',
            transition: 'box-shadow 0.4s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Icon className={`w-7 h-7 ${card.textColor}`} strokeWidth={1.8} />
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-800 text-base mb-2 group-hover:text-gray-900 transition-colors">
          {card.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors">
          {card.description}
        </p>

        {/* Arrow indicator */}
        <div className="mt-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
          <span className={`text-xs font-semibold ${card.textColor}`}>Ajukan</span>
          <ArrowRight className={`w-3.5 h-3.5 ${card.textColor}`} />
        </div>
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
        style={{
          maxHeight: isOpen ? '200px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <p className="px-1 pb-5 text-sm text-gray-500 leading-relaxed">{item.a}</p>
      </div>
    </div>
  );
};

// ============================================================
// Main LayananPage Component
// ============================================================
export const LayananPage = () => {

  // Intersection observers for sections
  const heroSection = useInView();
  const servicesSection = useInView();
  const faqSection = useInView();

  // Tracking state
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;
    try {
      const res = await fetch(`/api/ptsp/track/${trackInput.trim()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setTrackResult(json.data);
      toast.success('Status ditemukan');
    } catch (err: any) {
      toast.error(err.message || 'Resi tidak ditemukan');
      setTrackResult(null);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ====== HERO SECTION ====== */}
      <section
        ref={heroSection.ref}
        className="relative overflow-hidden min-h-[55vh] md:min-h-[65vh] flex items-center justify-start"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#dbeafe] via-[#e0e7ff] to-[#f0f9ff]" />

        {/* Geometric pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e40af' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating glass shapes */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              Sistem Aplikasi Layanan{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Satu Pintu
              </span>
            </h1>
            <p className="mt-3 text-base md:text-lg text-gray-600 font-medium">
              MAN 2 Lombok Timur (SALAM MANDA LOTIM)
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={() => scrollTo('layanan-section')}
                className="px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-wider"
              >
                Layanan
              </button>
              <button
                onClick={() => scrollTo('tracking-section')}
                className="px-7 py-3 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 font-bold rounded-lg border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-wider"
              >
                Cek Status Ajuan
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

      {/* ====== SERVICE CARDS SECTION ====== */}
      <section id="layanan-section" ref={servicesSection.ref} className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16">
            <span
              className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest mb-4"
              style={{
                opacity: servicesSection.isInView ? 1 : 0,
                transform: servicesSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            >
              Layanan
            </span>
            <h2
              className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight"
              style={{
                opacity: servicesSection.isInView ? 1 : 0,
                transform: servicesSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
              }}
            >
              Pilih <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Layanan</span> yang Anda Butuhkan
            </h2>
            <p
              className="mt-4 text-gray-500 text-sm md:text-base max-w-2xl mx-auto leading-relaxed"
              style={{
                opacity: servicesSection.isInView ? 1 : 0,
                transform: servicesSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
              }}
            >
              Sistem Aplikasi Layanan Satu Pintu untuk pelayanan pada masyarakat / Instansi / ASN /
              Pegawai / Guru / Siswa / Alumni dan siapa saja yang punya kepentingan dengan{' '}
              <strong className="text-gray-700">MAN 2 Lombok Timur</strong>
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {SERVICE_CARDS.map((card, index) => (
              <ServiceCard
                key={card.slug}
                card={card}
                index={index}
                isVisible={servicesSection.isInView}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ====== FAQ SECTION ====== */}
      <section id="faq-section" ref={faqSection.ref} className="py-16 md:py-24 bg-[#F8FBFF]">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="text-center mb-10">
            <span
              className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-widest mb-4"
              style={{
                opacity: faqSection.isInView ? 1 : 0,
                transform: faqSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            >
              F.A.Q
            </span>
            <h2
              className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight"
              style={{
                opacity: faqSection.isInView ? 1 : 0,
                transform: faqSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
              }}
            >
              Frequently Asked{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Questions
              </span>
            </h2>
            <p
              className="mt-3 text-gray-500 text-sm"
              style={{
                opacity: faqSection.isInView ? 1 : 0,
                transform: faqSection.isInView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
              }}
            >
              Persyaratan penggunaan layanan yang sering ditanyakan.
            </p>
          </div>

          {/* FAQ Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y-0 px-5 md:px-8">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem key={index} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ====== TRACKING SECTION ====== */}
      <section id="tracking-section" className="py-16 md:py-20 bg-gradient-to-b from-[#eef5fd] to-[#F8FBFF]">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Cek Status Permohonan</h2>
          <p className="text-gray-500 text-xs mb-6 leading-relaxed max-w-lg mx-auto">
            Cek Status Permohonan yang pernah diajukan dengan memasukkan Nomor Resi Layanan.
            <br />
            <span className="italic text-xs">
              Note: Nomor Resi didapatkan setelah sukses membuat form.
            </span>
          </p>

          <form
            onSubmit={handleTrackSubmit}
            className="flex flex-col sm:flex-row gap-0 shadow-lg shadow-blue-500/10 rounded-lg overflow-hidden max-w-xl mx-auto"
          >
            <input
              required
              type="text"
              placeholder="Masukkan Nomor Resi (misal: MDT-X9B21)"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              className="flex-1 px-6 py-4 outline-none text-gray-700 border-none min-w-0 bg-white"
            />
            <button
              type="submit"
              className="bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold px-10 py-4 transition-colors"
            >
              Cek
            </button>
          </form>

          {/* Render Result Timeline */}
          {trackResult && (
            <div className="mt-10 bg-white p-8 rounded-2xl shadow-xl text-left border border-gray-100 transition-all">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Resi: {trackResult.ticketId}</h3>
                  <p className="text-sm text-gray-500">
                    {trackResult.type} • {trackResult.applicantName}
                  </p>
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize ${
                    trackResult.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : trackResult.status === 'processing'
                      ? 'bg-blue-100 text-blue-700'
                      : trackResult.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {trackResult.status === 'completed'
                    ? 'Selesai'
                    : trackResult.status === 'processing'
                    ? 'Diproses'
                    : trackResult.status === 'rejected'
                    ? 'Ditolak'
                    : 'Antrean'}
                </div>
              </div>

              <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_white]" />
                  <div className="font-semibold text-gray-800">Ajuan Diterima</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Sistem Mandaapp telah menampung berkas pengajuan Anda.
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(trackResult.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>

                {(trackResult.status === 'processing' ||
                  trackResult.status === 'completed' ||
                  trackResult.status === 'rejected') && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_white]" />
                    <div className="font-semibold text-gray-800">Tinjauan Admin</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Staff Tata Usaha sedang meninjau kelengkapan Anda.
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(trackResult.updatedAt).toLocaleString('id-ID')}
                    </div>
                  </div>
                )}

                {trackResult.status === 'completed' && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-green-500 shadow-[0_0_0_4px_white] flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="font-semibold text-gray-800">Permohonan Selesai</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Proses telah rampung! Silakan cek catatan admin:
                    </div>
                    {trackResult.adminReply && (
                      <div className="mt-3 p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800 whitespace-pre-wrap flex gap-3">
                        <FileText className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-50" />
                        {trackResult.adminReply}
                      </div>
                    )}
                  </div>
                )}

                {trackResult.status === 'rejected' && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_0_4px_white]" />
                    <div className="font-semibold text-gray-800">
                      Permohonan Ditolak / Divalidasi Ulang
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Syarat Anda kurang lengkap atau ditolak:
                    </div>
                    {trackResult.adminReply && (
                      <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800 whitespace-pre-wrap">
                        {trackResult.adminReply}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};
