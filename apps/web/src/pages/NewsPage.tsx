import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useNews } from '../hooks/api/useNews';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { HeaderWithSettings } from '../components/HeaderWithSettings';
import { Calendar, User, ArrowRight, Search as SearchIcon, ChevronRight } from 'lucide-react';
import { AnnouncementCategory } from '../types/news';

// ============================================================
// Intersection Observer Hook & Global Utilities
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
    }, { threshold: 0.1, ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const stripHtml = (html: string) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

const getImageUrl = (html: string) => {
  const imgMatch = html?.match(/<img[^>]+src=["']([^"']+)["']/);
  return imgMatch ? imgMatch[1] : null;
};

const getAvatarUrl = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Admin')}&background=0D8ABC&color=fff`;
};

// ============================================================
// Category Config
// ============================================================
type Category = 'Academic' | 'Event' | 'Alert' | 'General';

const CATEGORY_MAP: Record<Category, { label: string, color: string, badgeBg: string }> = {
  Academic: { label: 'Akademik', color: 'from-blue-600 to-indigo-600', badgeBg: 'bg-blue-500' },
  Event: { label: 'Kegiatan', color: 'from-emerald-500 to-teal-500', badgeBg: 'bg-emerald-500' },
  Alert: { label: 'Pengumuman', color: 'from-amber-500 to-orange-500', badgeBg: 'bg-amber-500' },
  General: { label: 'Umum', color: 'from-violet-500 to-purple-500', badgeBg: 'bg-violet-500' },
};

// ============================================================
// Filter Button Component
// ============================================================
const FilterButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex-shrink-0 ${
      active 
      ? 'bg-[#1e293b] text-white shadow-md' 
      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    {label}
  </button>
);

// ============================================================
// Featured News Card (Top Section)
// ============================================================
const FeaturedCard = ({ article, isLarge = false }: { article: any, isLarge?: boolean }) => {
  const imgUrl = getImageUrl(article.content);
  const plainText = stripHtml(article.content);
  const catMode = CATEGORY_MAP[article.category as Category] || CATEGORY_MAP.General;
  
  return (
    <Link to={`/news/${article.id}`} className={`relative group overflow-hidden rounded-[24px] lg:rounded-[32px] ${isLarge ? 'h-[300px] sm:h-[400px] lg:h-full lg:min-h-[480px]' : 'h-[200px] lg:h-[230px]'} flex flex-col justify-end p-6 md:p-8 hover:shadow-2xl transition-all duration-500 block`}>
      {/* Background Image */}
      <div className="absolute inset-0 bg-gray-200">
         {imgUrl ? (
           <img src={imgUrl} alt={article.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
         ) : (
           <div className={`w-full h-full bg-gradient-to-br ${catMode.color} opacity-80`} />
         )}
      </div>

      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/95 via-[#0f172a]/40 to-transparent pointer-events-none group-hover:from-[#0f172a] transition-all duration-500" />
      
      {/* Shimmer sweep on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,1) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,1) 55%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmerSweep 1.5s ease-in-out infinite',
        }}
      />

      {/* Content */}
      <div className="relative z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-500 ease-out">
        <span className={`${catMode.badgeBg} text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block shadow-sm`}>
          {catMode.label}
        </span>
        <h2 className={`${isLarge ? 'text-2xl sm:text-3xl lg:text-[40px]' : 'text-xl lg:text-2xl'} font-black text-white leading-tight tracking-tight mb-3 group-hover:text-blue-100 transition-colors line-clamp-3 
          ${isLarge ? 'drop-shadow-lg' : 'drop-shadow-md'}`}>
          {article.title}
        </h2>
        
        {isLarge && (
          <p className="text-gray-300 text-sm sm:text-base line-clamp-2 md:line-clamp-3 mb-6 pr-4 font-medium opacity-90 group-hover:opacity-100 transition-opacity">
            {plainText.substring(0, 250)}...
          </p>
        )}

        <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs md:text-sm text-gray-300 font-bold tracking-wide">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {formatDate(article.publishDate)}
          </div>
          <span className="text-orange-400 font-black text-lg sm:text-xl leading-none">•</span>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {article.author || 'Admin'}
          </div>
        </div>
      </div>
    </Link>
  );
};

// ============================================================
// Grid News Card (3D Tilt & effects)
// ============================================================
const NewsCard = ({ article, index, isVisible }: { article: any, index: number, isVisible: boolean }) => {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  
  const imgUrl = getImageUrl(article.content);
  const plainText = stripHtml(article.content);
  const catMode = CATEGORY_MAP[article.category as Category] || CATEGORY_MAP.General;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = ((e.clientY - centerY) / (rect.height / 2)) * -6;
    const y = ((e.clientX - centerX) / (rect.width / 2)) * 6;
    setTilt({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <Link
      to={`/news/${article.id}`}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-pointer block h-full"
      style={{
        perspective: '1000px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(index, 5) * 0.1}s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(index, 5) * 0.1}s`,
      }}
    >
      <div
        className="relative bg-white rounded-[24px] border border-gray-100 overflow-hidden h-full flex flex-col transition-shadow duration-500"
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
            : 'rotateX(0) rotateY(0) scale(1)',
          transition: 'transform 0.3s ease-out, box-shadow 0.4s ease',
          boxShadow: isHovered
            ? '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 30px -5px rgba(59,130,246,0.1)'
            : '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Shimmer sweep on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: isHovered ? 'shimmerSweep 1.5s ease-in-out' : 'none',
          }}
        />

        {/* Gradient border glow */}
        <div
          className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"
          style={{
            background: `linear-gradient(135deg, ${catMode.badgeBg.replace('bg-', '')}, transparent)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '2px',
          }}
        />

        {/* Thumbnail */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video md:aspect-[4/3] overflow-hidden bg-gray-100 shrink-0">
          {imgUrl ? (
             <img src={imgUrl} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
             <div className={`w-full h-full bg-gradient-to-br ${catMode.color} opacity-20`} />
          )}
          
          {/* Badge Overlay */}
          <div className="absolute top-4 left-4 z-10 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
            <span className={`${catMode.badgeBg} text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md`}>
              {catMode.label}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-7 flex-1 flex flex-col bg-white">
          <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
            {article.title}
          </h3>
          
          <p className="text-sm text-gray-600 line-clamp-3 md:line-clamp-4 mb-6 flex-1 opacity-90 group-hover:opacity-100 transition-opacity">
            {plainText.substring(0, 150)}...
          </p>
          
          {/* Footer Card */}
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100 group-hover:border-blue-50 transition-colors">
            <div className="flex items-center gap-2.5">
              <img src={getAvatarUrl(article.author)} alt={article.author || 'Admin'} className="w-8 h-8 rounded-full shadow-sm bg-gray-50" />
              <span className="text-xs font-bold text-gray-800">{article.author || 'Admin'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-gray-400 group-hover:text-gray-500 transition-colors tracking-wide">{formatDate(article.publishDate)}</span>
              <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

// ============================================================
// Main NewsPage Component
// ============================================================
export const NewsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('kategori') || 'Semua';
  const initialSearch = searchParams.get('q') || '';
  
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [visibleCount, setVisibleCount] = useState(9); // 3 featured + 6 grid

  const { queryAll } = useNews();
  const allNews: any[] = queryAll.data || [];

  // Observers for animations
  const pageHeaderSection = useInView();
  const gridSection = useInView();

  // Filters
  const publishedNews = allNews.filter((news: any) => news.status === 'Published');
  const filteredByCategory = activeCategory === 'Semua' 
    ? publishedNews 
    : publishedNews.filter((news: any) => CATEGORY_MAP[news?.category as Category]?.label === activeCategory);
    
  // Search
  const displayNews = filteredByCategory.filter((news: any) => {
    const titleMatch = news?.title ? String(news.title).toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const contentMatch = news?.content ? stripHtml(news.content).toLowerCase().includes(searchQuery.toLowerCase()) : false;
    return titleMatch || contentMatch;
  });

  // Split Featured and Grid
  // IF we are in "Semua" without search, we show 3 featured on top
  const isDefaultView = activeCategory === 'Semua' && searchQuery === '';
  const featuredNews = isDefaultView ? displayNews.slice(0, 3) : [];
  const gridNews = isDefaultView ? displayNews.slice(3) : displayNews;

  // Render Skeleton when loading
  if (queryAll.isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F8FBFF]">
        <HeaderWithSettings />
        <div className="pt-24 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 animate-pulse mb-20">
           <div className="h-10 w-48 bg-gray-200 rounded-lg mb-8" />
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
             <div className="lg:col-span-2 h-[400px] bg-gray-200 rounded-[32px]" />
             <div className="flex flex-col gap-6">
               <div className="h-[188px] bg-gray-200 rounded-[24px]" />
               <div className="h-[188px] bg-gray-200 rounded-[24px]" />
             </div>
           </div>
        </div>
        <FooterWithSettings />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FBFF]">
      <HeaderWithSettings />
      
      <main className="flex-1 pt-6 pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          
          {/* Header Section (Featured News) */}
          <div ref={pageHeaderSection.ref} className="mb-10">

            {/* Featured News Section */}
            {featuredNews.length > 0 && (
              <div 
                className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6"
                style={{
                  opacity: pageHeaderSection.isInView ? 1 : 0,
                  transform: pageHeaderSection.isInView ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s'
                }}
              >
                <div className="lg:col-span-2">
                  <FeaturedCard article={featuredNews[0]} isLarge={true} />
                </div>
                <div className="flex flex-col gap-5 md:gap-6">
                  {featuredNews[1] && <FeaturedCard article={featuredNews[1]} />}
                  {featuredNews[2] && <FeaturedCard article={featuredNews[2]} />}
                </div>
              </div>
            )}
          </div>

          {/* Filter & Search Bar (between Featured and Grid) */}
          <div 
            className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10"
            style={{
              opacity: pageHeaderSection.isInView ? 1 : 0,
              transform: pageHeaderSection.isInView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s'
            }}
          >
            {/* Left side Filter Pills */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide">
              <FilterButton label="Semua" active={activeCategory === 'Semua'} onClick={() => { setActiveCategory('Semua'); setVisibleCount(9); }} />
              <FilterButton label="Akademik" active={activeCategory === 'Akademik'} onClick={() => { setActiveCategory('Akademik'); setVisibleCount(9); }} />
              <FilterButton label="Kegiatan" active={activeCategory === 'Kegiatan'} onClick={() => { setActiveCategory('Kegiatan'); setVisibleCount(9); }} />
              <FilterButton label="Pengumuman" active={activeCategory === 'Pengumuman'} onClick={() => { setActiveCategory('Pengumuman'); setVisibleCount(9); }} />
              <FilterButton label="Umum" active={activeCategory === 'Umum'} onClick={() => { setActiveCategory('Umum'); setVisibleCount(9); }} />
            </div>

            {/* Right side Search & Arsip */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
              <div className="relative flex-1 sm:w-64">
                <SearchIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari berita..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full bg-white shadow-sm transition-shadow hover:shadow-md"
                />
              </div>
              <Link to="/news?arsip=true" className="text-sm font-bold text-gray-600 hover:text-blue-600 flex items-center justify-end gap-1.5 transition-colors whitespace-nowrap group">
                Arsip Berita <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Grid News Section */}
          <div ref={gridSection.ref}>
            {gridNews.length === 0 && featuredNews.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[32px] border border-dashed border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchIcon className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-800">Tidak ada berita ditemukan</h3>
                <p className="text-gray-500 mt-3 font-medium">Coba sesuaikan kata kunci pencarian atau ganti kategori.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {gridNews.slice(0, visibleCount - (featuredNews.length)).map((article: any, idx: number) => (
                    <NewsCard 
                      key={article.id} 
                      article={article} 
                      index={idx} 
                      isVisible={gridSection.isInView} 
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {visibleCount < displayNews.length && (
                  <div className="mt-16 sm:mt-20 flex justify-center pb-8">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 9)}
                      className="group flex items-center justify-center gap-2 bg-[#eef5fd] text-blue-600 hover:bg-blue-600 hover:text-white px-8 md:px-10 py-3.5 md:py-4 rounded-full font-bold text-sm md:text-base transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-700">
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7"/><path d="M12 19V3"/><path d="m5 10 7 7 7-7"/>
                      </svg>
                      Muat Lebih Banyak
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </main>

      <FooterWithSettings />

      {/* Global styles for animations */}
      <style>{`
        @keyframes shimmerSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
