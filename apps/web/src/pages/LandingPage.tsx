import React, { Suspense, useEffect } from 'react';
import { HeroSection } from '@mandaapp/ui/src/components/HeroSection';
import type { NewsItem as UINewsItem } from '@mandaapp/ui/src/components/NewsSection';

// Lazy loading below-the-fold components for Mobile Performance
const NewsSection = React.lazy(() => import('@mandaapp/ui/src/components/NewsSection').then(m => ({ default: m.NewsSection })));
const GallerySection = React.lazy(() => import('@mandaapp/ui/src/components/GallerySection').then(m => ({ default: m.GallerySection })));
const ContactSection = React.lazy(() => import('@mandaapp/ui/src/components/ContactSection').then(m => ({ default: m.ContactSection })));
const QuickLinksSection = React.lazy(() => import('@mandaapp/ui/src/components/QuickLinksSection').then(m => ({ default: m.QuickLinksSection })));

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { newsService } from '../lib/services/news';
import { apiClient } from '../lib/api';
import { useSiteSettings } from '../hooks/api/useSettings';
import { contactsService } from '../lib/services/contacts';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { HeaderWithSettings } from '../components/HeaderWithSettings';
import { API_BASE_URL } from '../lib/api';
import { SEO } from '../components/SEO';
import { PPDBPopupModal } from './ppdb/components/PPDBPopupModal';
import { useAuth } from '../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const LandingPage = () => {
  const navigate = useNavigate();
  const { get } = useSiteSettings();
  const { isAuthenticated, user, isLoading } = useAuth();

  // ━━ AUTO-REDIRECT for logged-in users in PWA/standalone/native mode ━━
  const isNative = Capacitor.isNativePlatform();
  const isStandalone = isNative
    || window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;
  const shouldRedirect = isStandalone && !isLoading && isAuthenticated && user;
  const willRedirect = isStandalone && (isLoading || (isAuthenticated && user));

  useEffect(() => {
    if (shouldRedirect && user) {
      const dest = user.role === 'orang_tua' ? '/portal-ortu' : '/dashboard';
      navigate(dest, { replace: true });
    }
  }, [shouldRedirect, user, navigate]);

  // ━━ DATA HOOKS — must be called before any early return (React Rules of Hooks) ━━
  // Disable fetching when we're about to redirect (native/PWA auto-login)
  const { data: newsSummary = [] } = useQuery({
    queryKey: ['news', 'summary'],
    queryFn: () => newsService.getSummary(6),
    enabled: !willRedirect,
  });

  const { data: galleryData = [] } = useQuery({
    queryKey: ['gallery', 'landing'],
    queryFn: () => apiClient<any[]>('/gallery?limit=6'),
    enabled: !willRedirect,
  });

  // News summary already comes pre-processed from the API
  const newsItems: UINewsItem[] = newsSummary.map((n: any) => ({
    id: n.id,
    title: n.title,
    excerpt: n.excerpt || '',
    imageUrl: n.imageUrl || '',
  }));

  // Gallery items
  const galleryItems = galleryData.map((g: any) => ({
    id: g.id,
    imageUrl: g.url,
    title: g.title,
    description: g.description || '',
    category: 'General',
  }));

  // While redirect is pending, show a clean branded spinner (not the landing page)
  if (willRedirect) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f9fafb',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid #e5e7eb', borderTopColor: '#16a34a',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Build address with district for contact section
  const fullAddress = [get('address'), get('district_city')].filter(Boolean).join(', ') || undefined;

  // Build logo URL
  const logoRaw = get('logo_url');
  const resolvedLogo = logoRaw ? (logoRaw.startsWith('/') ? `${SERVER_BASE}${logoRaw}` : logoRaw) : undefined;

  // Social links for Gallery
  const socialLinks = {
    facebook: get('facebook_url'),
    instagram: get('instagram_url'),
    twitter: get('twitter_url'),
    youtube: get('youtube_url'),
    tiktok: get('tiktok_url'),
  };

  // Hero Section Settings
  const heroMode = get('hero_animation_enabled') === 'false' ? 'slider' : 'animation';
  const heroSliderDuration = parseInt(get('hero_slider_duration') || '8', 10);
  const rawHeroImages = [
    get('hero_image_1'),
    get('hero_image_2'),
    get('hero_image_3'),
    get('hero_image_4'),
  ].filter(Boolean) as string[];
  const resolvedHeroImages = rawHeroImages.map(img => img.startsWith('/') ? `${SERVER_BASE}${img}` : img);

  return (
    <div className="flex flex-col min-h-screen">
      <SEO />
      <HeaderWithSettings />
      <main className="flex-1">
        <PPDBPopupModal />
        <HeroSection 
          logoUrl={resolvedLogo} 
          schoolName={get('school_name') || 'MAN 2 LOMBOK TIMUR'} 
          mode={heroMode}
          sliderDuration={heroSliderDuration}
          sliderImages={resolvedHeroImages}
        />
        <Suspense fallback={<div className="h-[400px] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div></div>}>
          <NewsSection items={newsItems} onReadMore={(id) => navigate(`/news/${id}`)} />
          <QuickLinksSection />
          <GallerySection items={galleryItems} socialLinks={socialLinks} />
          <ContactSection
            onSubmit={(data) => contactsService.submit(data)}
            schoolName={get('school_name') || undefined}
            address={fullAddress}
            phone={get('phone') || undefined}
            email={get('email') || undefined}
            mapEmbedUrl={get('map_embed_url') || undefined}
            logoUrl={resolvedLogo}
          />
        </Suspense>
      </main>
      <FooterWithSettings />
    </div>
  );
};
