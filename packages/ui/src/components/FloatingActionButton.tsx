import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext';

export interface FloatingActionButtonProps {
  /** URL for the developer info link (same as footer's "Pengembang Website") */
  developerUrl?: string;
}

export function FloatingActionButton({ developerUrl = '#' }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isHiddenByModal, setIsHiddenByModal] = useState(false);
  const [isDashboard, setIsDashboard] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, setTheme } = useTheme();

  // Detect dashboard route to reposition FAB to the right side
  useEffect(() => {
    const checkPath = () => {
      setIsDashboard(window.location.pathname.startsWith('/dashboard'));
    };
    checkPath();

    // Listen for navigation changes (popstate for browser back/forward)
    window.addEventListener('popstate', checkPath);

    // Also observe URL changes via MutationObserver on <title> or polling
    // We'll use a lightweight interval since React Router doesn't fire popstate
    const pathInterval = setInterval(checkPath, 500);

    return () => {
      window.removeEventListener('popstate', checkPath);
      clearInterval(pathInterval);
    };
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Listen for fab-visibility custom events (dispatched by modals/popups)
  useEffect(() => {
    const handleFabVisibility = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.hidden) {
        setIsHiddenByModal(true);
        setIsOpen(false); // Close menu if open
      } else {
        setIsHiddenByModal(false);
      }
    };
    window.addEventListener('fab-visibility', handleFabVisibility);
    return () => window.removeEventListener('fab-visibility', handleFabVisibility);
  }, []);

  // Close menu with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggleMenu = useCallback(() => setIsOpen((o) => !o), []);

  // Navigate to landing page (home)
  const goHome = useCallback(() => {
    setIsOpen(false);
    // Use window.location for full navigation since FAB is outside React Router context
    if (window.location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = '/';
    }
  }, []);

  const scrollToContact = useCallback(() => {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    setIsOpen(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setIsOpen(false);
  }, [theme, setTheme]);

  const openDeveloper = useCallback(() => {
    if (developerUrl && developerUrl !== '#') {
      window.open(developerUrl, '_blank');
    } else {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  }, [developerUrl]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fab-container')) setIsOpen(false);
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen]);

  // Hide FAB when scrolling, show when scroll stops
  useEffect(() => {
    const handleScroll = () => {
      // Don't hide while menu is open
      if (isOpen) return;
      setIsVisible(false);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        setIsVisible(true);
      }, 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [isOpen]);

  const actions = [
    {
      id: 'info',
      label: 'Pengembang Website',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
      ),
      onClick: openDeveloper,
    },
    {
      id: 'fullscreen',
      label: isFullscreen ? 'Keluar Fullscreen' : 'Mode Fullscreen',
      icon: isFullscreen ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      ),
      onClick: toggleFullscreen,
    },
    {
      id: 'home',
      label: 'Kembali ke Beranda',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      onClick: goHome,
    },
    {
      id: 'theme',
      label: theme === 'dark' ? 'Mode Terang' : 'Mode Gelap',
      icon: theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      ),
      onClick: toggleTheme,
    },
    {
      id: 'contact',
      label: 'Hubungi Kami',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      ),
      onClick: scrollToContact,
    },
  ];

  // Semi-circular arc: 5 buttons spread from -80° (top) to +80° (bottom)
  // Angle 0° = right, negative = upward, positive = downward
  const RADIUS = 70;
  const totalButtons = actions.length;
  const arcStart = -80; // degrees
  const arcEnd = 80;    // degrees
  const arcStep = (arcEnd - arcStart) / (totalButtons - 1);

  // Determine position: left for public pages, right for dashboard
  const positionStyle: React.CSSProperties = isDashboard
    ? { right: '20px', left: 'auto' }
    : { left: '20px', right: 'auto' };

  // When on right side, arc should expand to the left (flip x)
  const xMultiplier = isDashboard ? -1 : 1;

  // Completely hidden when modal is active
  if (isHiddenByModal) return null;

  return (
    <>
      {/* Dim Overlay */}
      <div
        className={`fixed inset-0 z-[9998] transition-opacity duration-300 pointer-events-none print:hidden ${isDashboard ? 'hidden md:block' : ''}`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={`fab-container fixed top-1/2 z-[9999] print:hidden ${isDashboard ? 'hidden md:block' : ''}`}
        style={{
          ...positionStyle,
          transform: isVisible
            ? 'translateY(-50%) translateX(0)'
            : `translateY(-50%) translateX(${isDashboard ? '80px' : '-80px'})`,
          transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
      {/* Main Toggle Button */}
      <button
        onClick={toggleMenu}
        aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
        className="relative w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        style={{
          background: isOpen
            ? 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
        }}
      >
        <span
          className={`transition-transform duration-300 text-white ${isOpen ? 'rotate-90' : 'rotate-0'}`}
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
            </svg>
          )}
        </span>
      </button>

      {/* Action Buttons — semi-circular arc */}
      {actions.map((action, i) => {
        const angleDeg = arcStart + i * arcStep;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = Math.cos(angleRad) * RADIUS * xMultiplier;
        const y = Math.sin(angleRad) * RADIUS;

        return (
          <div
            key={action.id}
            className="absolute group"
            style={{
              // Position relative to the center of the main button
              left: '50%',
              top: '50%',
              marginLeft: '-20px', // half of w-10 (40px)
              marginTop: '-20px',
              opacity: isOpen ? 1 : 0,
              transform: isOpen
                ? `translate(${x}px, ${y}px) scale(1)`
                : 'translate(0, 0) scale(0.3)',
              transition: `all 300ms cubic-bezier(0.34, 1.56, 0.64, 1) ${isOpen ? i * 50 : (totalButtons - i) * 30}ms`,
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          >
            <button
              onClick={action.onClick}
              aria-label={action.label}
              className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-200 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              style={{
                background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
              }}
            >
              {action.icon}
            </button>
            {/* Tooltip — direction changes based on position (left vs right) */}
            {isDashboard ? (
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
                {action.label}
                <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
              </span>
            ) : (
              <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
                {action.label}
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </span>
            )}
          </div>
        );
      })}
      </div>
    </>
  );
}
