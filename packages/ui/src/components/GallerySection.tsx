import React, { useState, useEffect, useCallback } from 'react';
import { Instagram, Facebook, Twitter, MessageCircle, Share2 } from 'lucide-react';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

const resolveUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${SERVER_BASE}${url}`;
  return url;
};

const galleryItems = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800',
    title: 'Science Fair 2025',
    category: 'Academic',
    description: 'Students presenting their award-winning robotics project.'
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=800',
    title: 'Basketball Championship',
    category: 'Sports',
    description: 'MANDALOTIM varsity team celebrating their regional victory.'
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    title: 'Annual Art Exhibition',
    category: 'Arts',
    description: 'A showcase of creative talents from the senior art class.'
  },
  {
    id: 4,
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
    title: 'Graduation Day',
    category: 'Event',
    description: 'The class of 2025 tossing their caps in celebration.'
  },
  {
    id: 5,
    imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800',
    title: 'Campus Life',
    category: 'General',
    description: 'Students engaging in a study group at the campus quad.'
  },
  {
    id: 6,
    imageUrl: 'https://images.unsplash.com/photo-1542840410-3092f99611a3?auto=format&fit=crop&q=80&w=800',
    title: 'Drama Club Performance',
    category: 'Arts',
    description: 'Scenes from the spectacular spring musical "The Odyssey".'
  }
];

interface GallerySectionItem {
  id: string | number;
  imageUrl: string;
  title: string;
  category?: string;
  description?: string;
}

interface GallerySectionProps {
  items?: GallerySectionItem[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}

export const GallerySection = ({ items, socialLinks }: GallerySectionProps) => {
  const [canShare, setCanShare] = useState(false);
  const [openShareId, setOpenShareId] = useState<string | number | null>(null);

  useEffect(() => {
    setCanShare(!!navigator.share);
  }, []);

  const toggleShare = useCallback((e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setOpenShareId(prev => prev === id ? null : id);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenShareId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
  const allItems = items && items.length > 0 ? items : galleryItems;
  const [filter, setFilter] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const categories = ['All', ...Array.from(new Set(allItems.map(item => item.category || 'General')))];
  
  const filteredItems = filter === 'All' 
    ? allItems 
    : allItems.filter(item => (item.category || 'General') === filter);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === 0 ? filteredItems.length - 1 : prev - 1;
    });
  }, [filteredItems.length]);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === filteredItems.length - 1 ? 0 : prev + 1;
    });
  }, [filteredItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    // Lock body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, goToPrev, goToNext]);

  const currentItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <section className="py-10 sm:py-12 lg:py-14 bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-heading font-bold tracking-tight text-text-primary dark:text-text-darkPrimary sm:text-4xl text-balance">
            Life at <span className="text-primary">MANDALOTIM</span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Explore our vibrant campus life, extracurricular activities, and memorable events that shape our students' journey.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                filter === category
                  ? 'bg-primary text-white shadow-md scale-105'
                  : 'bg-white dark:bg-[#1a1a1a] text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 border border-border-light dark:border-border-dark'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredItems.map((item, index) => (
            <div 
              key={item.id}
              className="group relative rounded-2xl aspect-video bg-gray-200 dark:bg-gray-800 animate-in fade-in zoom-in duration-500 cursor-pointer"
            >
              {/* Image & Overlay Wrapper (with overflow-hidden) */}
              <div 
                className="absolute inset-0 rounded-2xl overflow-hidden" 
                onClick={() => openLightbox(index)}
              >
                <img
                  src={resolveUrl(item.imageUrl)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <div className="flex justify-between items-end w-full gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2.5 py-1 bg-primary/90 text-white text-xs font-semibold rounded-md mb-2 w-fit">
                        {item.category}
                      </span>
                      <h3 className="text-xl font-heading font-bold text-white mb-1 truncate">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-200 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    {/* Share Button Placeholder */}
                    <div className="w-10 h-10 shrink-0"></div>
                  </div>
                </div>
              </div>

              {/* Share Menu (Outside overflow-hidden) */}
              <div className="absolute bottom-6 right-6 z-20">
                <div className="relative">
                  <button 
                    onClick={(e) => toggleShare(e, item.id)}
                    className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transition-all transform hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 invisible group-hover:visible"
                    title="Bagikan"
                  >
                    <Share2 size={20} />
                  </button>

                  {openShareId === item.id && (
                    <div 
                      className="absolute right-0 bottom-full mb-3 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 min-w-[180px] animate-in slide-in-from-bottom-2 fade-in duration-200 z-50 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => {
                            const absoluteImageUrl = resolveUrl(item.imageUrl);
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteImageUrl)}`, '_blank');
                            setOpenShareId(null);
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left w-full"
                        >
                          <Facebook size={16} className="text-[#1877F2]" />
                          Facebook
                        </button>

                        <button 
                          onClick={() => {
                            const absoluteImageUrl = resolveUrl(item.imageUrl);
                            const text = `Lihat galeri "${item.title}" di MANDALOTIM: ${absoluteImageUrl}`;
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                            setOpenShareId(null);
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left w-full"
                        >
                          <MessageCircle size={16} className="text-[#25D366]" />
                          WhatsApp
                        </button>

                        <button 
                          onClick={() => {
                            const absoluteImageUrl = resolveUrl(item.imageUrl);
                            const text = `Lihat galeri "${item.title}" di MANDALOTIM!`;
                            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(absoluteImageUrl)}&text=${encodeURIComponent(text)}`, '_blank');
                            setOpenShareId(null);
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left w-full"
                        >
                          <Twitter size={16} className="text-[#1DA1F2]" />
                          Twitter (X)
                        </button>

                        {socialLinks?.instagram && (
                          <a 
                            href={socialLinks.instagram} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <Instagram size={16} className="text-[#E4405F]" />
                            Instagram
                          </a>
                        )}

                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>

                        {canShare && (
                          <button 
                            onClick={async () => {
                              const absoluteImageUrl = resolveUrl(item.imageUrl);
                              try {
                                await navigator.share({
                                  title: item.title,
                                  text: `Lihat foto galeri "${item.title}" di MANDALOTIM!`,
                                  url: absoluteImageUrl,
                                });
                              } catch (err) {
                                console.error('Error sharing:', err);
                              }
                              setOpenShareId(null);
                            }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors text-left w-full"
                          >
                            <Share2 size={16} />
                            Opsi Berbagi Lainnya
                          </button>
                        )}

                        <button 
                          onClick={() => {
                            const absoluteImageUrl = resolveUrl(item.imageUrl);
                            navigator.clipboard.writeText(absoluteImageUrl);
                            alert('Tautan gambar berhasil disalin!');
                            setOpenShareId(null);
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left w-full"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          Salin Tautan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {currentItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={closeLightbox}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
          
          {/* Content */}
          <div 
            className="relative z-10 flex flex-col items-center w-full max-w-5xl mx-4 sm:mx-8"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.25s ease-out' }}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute -top-12 right-0 sm:right-0 text-white/80 hover:text-white transition-colors z-20"
              aria-label="Close lightbox"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Image Container */}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black">
              <img
                src={currentItem.imageUrl}
                alt={currentItem.title}
                className="w-full max-h-[75vh] object-contain"
              />
              
              {/* Image Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-16">
                {currentItem.category && (
                  <span className="inline-block px-3 py-1 bg-primary/90 text-white text-xs font-semibold rounded-md mb-2">
                    {currentItem.category}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-1">
                  {currentItem.title}
                </h3>
                {currentItem.description && (
                  <p className="text-sm sm:text-base text-gray-200 max-w-2xl">
                    {currentItem.description}
                  </p>
                )}
              </div>
            </div>

            {/* Navigation Arrows */}
            {filteredItems.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-14 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all duration-200 backdrop-blur-sm"
                  aria-label="Previous image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-14 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all duration-200 backdrop-blur-sm"
                  aria-label="Next image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="mt-4 text-white/60 text-sm font-medium">
              {lightboxIndex! + 1} / {filteredItems.length}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
};
