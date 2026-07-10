import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Megaphone } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../lib/api';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

interface Announcement {
  id: string;
  title: string;
  description?: string;
  type: 'image' | 'announcement';
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
}

/**
 * AnnouncementPopup — Dynamic popup that shows active announcements on the landing page.
 * Supports multiple announcements as a carousel/slider within a single modal.
 * Click outside (backdrop) to dismiss.
 */
export const AnnouncementPopup: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await apiClient<Announcement[]>('/announcements/active');
        if (data && data.length > 0) {
          setAnnouncements(data);
          // Show after brief delay for page load
          setTimeout(() => {
            setIsVisible(true);
            setTimeout(() => setIsAnimating(true), 50);
          }, 600);
        }
      } catch (err) {
        // Silently fail — popup is non-critical
        console.error('Failed to load announcements:', err);
      }
    };
    fetchAnnouncements();
  }, []);

  // Hide FAB & lock body scroll when popup is visible
  useEffect(() => {
    if (isVisible) {
      window.dispatchEvent(new CustomEvent('fab-visibility', { detail: { hidden: true } }));
      document.body.style.overflow = 'hidden';
    } else {
      window.dispatchEvent(new CustomEvent('fab-visibility', { detail: { hidden: false } }));
      document.body.style.overflow = '';
    }
    return () => {
      window.dispatchEvent(new CustomEvent('fab-visibility', { detail: { hidden: false } }));
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  const handleDismiss = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  }, [announcements.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  }, [announcements.length]);

  // Swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  if (!isVisible || announcements.length === 0) return null;

  const current = announcements[currentIndex];
  const hasMultiple = announcements.length > 1;

  const resolveUrl = (url?: string) => {
    if (!url) return '';
    return url.startsWith('/') ? `${SERVER_BASE}${url}` : url;
  };

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-popup-title"
        className={`relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${
          isAnimating ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-emerald-500 to-blue-500 shrink-0" />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Tutup popup pengumuman"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:text-white transition-all"
        >
          <X size={16} />
        </button>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {current.type === 'image' ? (
            /* ====== IMAGE TYPE ====== */
            <div className="relative">
              {current.imageUrl ? (
                <img
                  src={resolveUrl(current.imageUrl)}
                  alt={current.title}
                  className="w-full h-auto max-h-[75vh] object-contain bg-gray-100"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
                  <Megaphone className="w-16 h-16 text-emerald-300" />
                </div>
              )}
            </div>
          ) : (
            /* ====== ANNOUNCEMENT TYPE ====== */
            <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
              {/* Icon */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Megaphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
              </div>

              {/* Title */}
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] mb-1 text-emerald-600 text-center">
                Pengumuman
              </p>
              <h2
                id="announcement-popup-title"
                className="text-lg sm:text-xl font-black text-gray-900 leading-tight tracking-tight text-center mb-2"
              >
                {current.title}
              </h2>

              {/* Divider */}
              <div className="w-10 h-0.5 mx-auto my-3 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" />

              {/* Optional Image */}
              {current.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden shadow-md">
                  <img
                    src={resolveUrl(current.imageUrl)}
                    alt={current.title}
                    className="w-full h-auto max-h-[40vh] object-contain bg-gray-50"
                    loading="eager"
                  />
                </div>
              )}

              {/* Description */}
              {current.description && (
                <p className="text-sm text-gray-600 leading-relaxed text-center whitespace-pre-line">
                  {current.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer with link + nav */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gray-50 border-t border-gray-100 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Link CTA */}
            <div className="flex-1 min-w-0">
              {current.linkUrl ? (
                <a
                  href={current.linkUrl}
                  target={current.linkUrl.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  onClick={handleDismiss}
                >
                  {current.linkLabel || 'Selengkapnya'}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Tutup
                </button>
              )}
            </div>

            {/* Carousel nav (only if multiple) */}
            {hasMultiple && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={goPrev}
                  className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* Dots */}
                <div className="flex items-center gap-1">
                  {announcements.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`rounded-full transition-all duration-300 ${
                        idx === currentIndex
                          ? 'w-5 h-1.5 bg-gradient-to-r from-emerald-500 to-blue-500'
                          : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Pengumuman ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm"
                  aria-label="Berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
