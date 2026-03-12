import React, { useState, useEffect, useCallback } from 'react';

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
}

export const GallerySection = ({ items }: GallerySectionProps) => {
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
              onClick={() => openLightbox(index)}
              className="group relative overflow-hidden rounded-2xl aspect-video bg-gray-200 dark:bg-gray-800 animate-in fade-in zoom-in duration-500 cursor-pointer"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <span className="inline-block px-2.5 py-1 bg-primary/90 text-white text-xs font-semibold rounded-md mb-2 w-fit">
                  {item.category}
                </span>
                <h3 className="text-xl font-heading font-bold text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-200 line-clamp-2">
                  {item.description}
                </p>
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
