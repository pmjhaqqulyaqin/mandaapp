import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface HeaderProps {
  schoolName?: string;
  logoUrl?: string;
  /** School address to display in the top info bar */
  address?: string;
  /** Phone number to display in the top info bar */
  phone?: string;
  /** Email to display in the top info bar */
  email?: string;
  /** Called when the user submits a search query */
  onSearch?: (query: string) => void;
  /** Array of nested dynamic menus fetched from the API */
  dynamicMenus?: any[];
  /** URL to open when the address is clicked */
  mapUrl?: string;
  /** Whether the header content is loading */
  isLoading?: boolean;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

const resolveUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${SERVER_BASE}${url}`;
  return url;
};

export const Header = ({
  schoolName = 'MANDALOTIM',
  logoUrl,
  address,
  phone,
  email,
  onSearch,
  dynamicMenus = [],
  mapUrl,
  isLoading = false,
}: HeaderProps) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMobileMenus, setExpandedMobileMenus] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const infoBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Hide info bar once user scrolls past its height (roughly 40px)
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    {
      label: 'Beranda',
      to: '/',
      scrollToTop: true,
      icon: (
        /* Home icon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: 'Profil',
      to: '#profil',
      icon: (
        /* User icon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      label: 'Layanan',
      to: '#layanan',
      icon: (
        /* Grid / apps icon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: 'Berita',
      to: '/news',
      icon: (
        /* Newspaper icon */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
        </svg>
      ),
    },
  ]; // Kept as fallback if needed or reference

  // Helper to render dynamic icons based on name (basic fallback)
  const renderIcon = (iconStr?: string) => {
    if (!iconStr) return null;
    
    // If it's a URL or path, render it as an image
    if (iconStr.startsWith('http') || iconStr.startsWith('/')) {
      return (
        <img 
          src={resolveUrl(iconStr)} 
          alt="Menu Ikon" 
          style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
        />
      );
    }

    // Just a generic icon if an icon name exists, since we can't dynamic import all Lucide icons easily without a map
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    );
  };


  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
      }}
    >
      {/* ======== Top Info Bar ======== */}
      <div
        ref={infoBarRef}
        style={{
          background: 'linear-gradient(135deg, #0f7b5f 0%, #1a9a6f 50%, #2aaa7a 100%)',
          color: '#fff',
          overflow: 'hidden',
          maxHeight: isScrolled ? '0px' : '44px',
          opacity: isScrolled ? 0 : 1,
          transition: 'max-height 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            height: '44px',
            fontSize: '12px',
            fontWeight: 400,
            flexWrap: 'wrap',
            whiteSpace: 'normal',
            lineHeight: '1.2',
            textAlign: 'center',
            padding: '4px 24px',
          }}
        >
          {/* Address */}
          {address && (
            <a
              href={mapUrl || `https://maps.google.com/?q=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', textDecoration: 'none' }}
              className="hover:underline flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              {address}
            </a>
          )}

          {/* Phone */}
          {phone && (
            <a
              href={`tel:${phone}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', textDecoration: 'none' }}
              className="flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              {phone}
            </a>
          )}

          {/* Email */}
          {email && (
            <a
              href={`mailto:${email}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', textDecoration: 'none' }}
              className="flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              {email}
            </a>
          )}
        </div>
      </div>

      {/* ======== Navigation Bar ======== */}
      <nav
        className="bg-white dark:bg-[#0a0a0a] border-b border-[rgba(0,0,0,0.08)] dark:border-border-dark transition-colors duration-300"
        style={{
          transition: 'box-shadow 300ms ease, background-color 300ms, border-color 300ms',
          boxShadow: isScrolled ? '0 2px 12px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '52px',
          }}
        >
          {/* Logo + School Name */}
          <Link
            to="/"
            onClick={(e) => {
              if (isHomePage) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
            ) : null}
            {isLoading ? (
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  color: '#0f7b5f',
                  letterSpacing: '-0.02em',
                }}
              >
                {schoolName}
              </span>
            )}
          </Link>

          {/* Spacer for Tablet/Mobile to keep things balanced if needed */}
          <div className="flex-1 lg:hidden"></div>

          {/* Desktop Nav Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            className="header-desktop-nav"
          >
            {dynamicMenus && dynamicMenus.length > 0 ? (
              dynamicMenus.map((menuItem) => (
                <div key={menuItem.id} className="relative group">
                  <Link
                    to={menuItem.url}
                    onClick={(e) => {
                      if (menuItem.url === '/') {
                        if (isHomePage) {
                          e.preventDefault();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      } else if (menuItem.url.startsWith('#')) {
                        // handled naturally or optionally smooth scrolled
                      }
                    }}
                    className="text-gray-700 dark:text-gray-300 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    {menuItem.icon && (
                      <span style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                        {renderIcon(menuItem.icon)}
                      </span>
                    )}
                    {menuItem.label}
                    {menuItem.children && menuItem.children.length > 0 && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:rotate-180 transition-transform duration-200">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    )}
                  </Link>
                  
                  {/* Dropdown Menu */}
                  {menuItem.children && menuItem.children.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50">
                      <div className="p-2 flex flex-col gap-1">
                        {menuItem.children.map((child: any) => (
                          <Link
                            key={child.id}
                            to={child.url}
                            className="text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                          >
                            {child.icon && (
                              <span className="opacity-70">
                                {renderIcon(child.icon)}
                              </span>
                            )}
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Fallback if no dynamic menus are loaded yet or DB is empty
              navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={item.scrollToTop ? (e: React.MouseEvent) => {
                    if (isHomePage) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  } : undefined}
                  className="text-gray-700 dark:text-gray-300 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))
            )}

            {/* Separator */}
            <div style={{ width: '1px', height: '24px', background: '#E5E7EB', margin: '0 4px' }} />

            {/* Search Button + Expandable Input */}
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div
                className="border border-transparent data-[open=true]:border-gray-300 dark:data-[open=true]:border-gray-600 bg-transparent data-[open=true]:bg-gray-100 dark:data-[open=true]:bg-gray-800 transition-all duration-300"
                data-open={searchOpen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  borderRadius: '8px',
                  transition: 'width 350ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms, border-color 200ms',
                  width: searchOpen ? '260px' : '42px',
                  height: '42px',
                }}
              >
                {/* Search input */}
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      onSearch?.(searchQuery.trim());
                      setSearchOpen(false);
                      setSearchQuery('');
                    }
                    if (e.key === 'Escape') {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }
                  }}
                  className="text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                  style={{
                    flex: searchOpen ? 1 : 'none',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    padding: searchOpen ? '0 8px 0 12px' : '0',
                    fontSize: '14px',
                    opacity: searchOpen ? 1 : 0,
                    width: searchOpen ? 'auto' : '0px',
                    transition: 'opacity 200ms ease 100ms, padding 200ms',
                  }}
                  tabIndex={searchOpen ? 0 : -1}
                />
                {/* Search / Close toggle button */}
                <button
                  aria-label={searchOpen ? 'Tutup pencarian' : 'Cari'}
                  onClick={() => {
                    if (searchOpen) {
                      // If has query, submit; otherwise close
                      if (searchQuery.trim()) {
                        onSearch?.(searchQuery.trim());
                        setSearchQuery('');
                      }
                      setSearchOpen(false);
                    } else {
                      setSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 100);
                    }
                  }}
                  style={{
                    width: '42px',
                    minWidth: '42px',
                    height: '42px',
                    minHeight: '42px',
                    borderRadius: searchOpen ? '0 7px 7px 0' : '8px',
                    border: 'none',
                    background: '#1a9a6f',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 200ms',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#0f7b5f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#1a9a6f'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, width: '22px', height: '22px' }}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Link
              to="/login"
              style={{
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 20px',
                borderRadius: '8px',
                background: '#1a9a6f',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 200ms, box-shadow 200ms',
                boxShadow: '0 1px 3px rgba(26, 154, 111, 0.3)',
                flexShrink: 0,
                minWidth: '100px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0f7b5f';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 154, 111, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1a9a6f';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(26, 154, 111, 0.3)';
              }}
            >
              Login
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="header-mobile-toggle"
            style={{
              display: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151',
            }}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div
          className="header-mobile-menu"
          style={{
            display: 'none',
            overflowY: 'auto',
            maxHeight: mobileMenuOpen ? '100vh' : '0px',
            opacity: mobileMenuOpen ? 1 : 0,
            transition: 'max-height 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease',
            borderTop: mobileMenuOpen ? '1px solid rgba(0,0,0,0.08)' : 'none',
            backgroundColor: 'inherit',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ padding: '16px 20px 24px' }} className="flex flex-col gap-2">
            {dynamicMenus && dynamicMenus.length > 0 ? (
              dynamicMenus.map((menuItem) => {
                const hasChildren = menuItem.children && menuItem.children.length > 0;
                const isExpanded = expandedMobileMenus[menuItem.id];
                
                return (
                  <div key={menuItem.id} className="flex flex-col">
                    {hasChildren ? (
                      <button
                        onClick={() => setExpandedMobileMenus(prev => ({ ...prev, [menuItem.id]: !prev[menuItem.id] }))}
                        className="hover:bg-green-50/50 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-200 outline-none"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          fontSize: '15px',
                          fontWeight: 500,
                          color: '#374151',
                          border: '1px solid transparent',
                          background: isExpanded ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {menuItem.icon && <span style={{ opacity: 0.8 }} className="text-green-600 dark:text-green-400">{renderIcon(menuItem.icon)}</span>}
                          <span className="dark:text-gray-200">{menuItem.label}</span>
                        </div>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="18" height="18" viewBox="0 0 24 24" fill="none" 
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                          className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                    ) : (
                      <Link
                        to={menuItem.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className="hover:bg-green-50/50 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-200"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          fontSize: '15px',
                          fontWeight: 500,
                          color: '#374151',
                          textDecoration: 'none',
                          border: '1px solid transparent',
                        }}
                      >
                        {menuItem.icon && <span style={{ opacity: 0.8 }} className="text-green-600 dark:text-green-400">{renderIcon(menuItem.icon)}</span>}
                        <span className="dark:text-gray-200">{menuItem.label}</span>
                      </Link>
                    )}

                    {/* Submenu Accordion */}
                    {hasChildren && (
                      <div 
                        style={{
                          overflow: 'hidden',
                          maxHeight: isExpanded ? '800px' : '0px',
                          opacity: isExpanded ? 1 : 0,
                          transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                          marginTop: isExpanded ? '4px' : '0'
                        }}
                      >
                        <div className="flex flex-col gap-1 pl-[44px] pr-2 pb-2 relative">
                          {/* Sleek left futuristic line */}
                          <div className="absolute left-[24px] top-2 bottom-4 w-[2px] bg-gradient-to-b from-green-500/40 via-green-500/10 to-transparent rounded-full"></div>
                          
                          {menuItem.children.map((child: any, index: number) => (
                            <Link
                              key={child.id}
                              to={child.url}
                              onClick={() => setMobileMenuOpen(false)}
                              className="text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50/80 dark:hover:bg-green-900/20 transition-all duration-300"
                              style={{ 
                                textDecoration: 'none',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transform: isExpanded ? 'translateX(0)' : 'translateX(-12px)',
                                transitionDelay: isExpanded ? `${Math.min(index * 30, 200)}ms` : '0ms'
                              }}
                            >
                              {child.icon ? (
                                <span className="opacity-70 scale-90">{renderIcon(child.icon)}</span>
                              ) : (
                                <div className="w-[5px] h-[5px] rounded-full bg-current opacity-40"></div>
                              )}
                              <span>{child.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:bg-green-50/50 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-200"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#374151',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ opacity: 0.8 }} className="text-green-600 dark:text-green-400">{item.icon}</span>
                  <span className="dark:text-gray-200">{item.label}</span>
                </Link>
              ))
            )}
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="active:scale-[0.98] transition-all duration-200"
              style={{
                display: 'block',
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1a9a6f 0%, #10b981 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Responsive CSS injected via style tag */}
      <style>{`
        @media (max-width: 1100px) {
          .header-desktop-nav { display: none !important; }
          .header-mobile-toggle { display: flex !important; }
          .header-mobile-menu { display: block !important; }
        }
        
        /* Mobile Search Styling Fix */
        @media (max-width: 640px) {
          .header-desktop-nav + div { margin-left: auto; }
        }
      `}</style>
    </header>
  );
};
