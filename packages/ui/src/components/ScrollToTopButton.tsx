import { useState, useEffect, useCallback } from 'react';

/**
 * A scroll-to-top button that appears at the bottom-right corner when the user scrolls down.
 * - Slides up into view with animation when the page is scrolled past a threshold.
 * - Smoothly scrolls to the top of the page when clicked.
 */
export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when user scrolls down past 300px
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 9990,
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a9a6f 0%, #2e9e7a 50%, #3ba17e 100%)',
        boxShadow: '0 4px 14px rgba(30, 130, 100, 0.35)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(60px)',
        transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(30, 130, 100, 0.5)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(30, 130, 100, 0.35)';
        (e.currentTarget as HTMLButtonElement).style.transform = isVisible ? 'translateY(0)' : 'translateY(60px)';
      }}
    >
      {/* Chevron Up Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
