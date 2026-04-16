import React, { Suspense } from 'react';
import { HeroSection } from '@mandaapp/ui/src/components/HeroSection';
import type { NewsItem as UINewsItem } from '@mandaapp/ui/src/components/NewsSection';

// Lazy loading below-the-fold components for Mobile Performance
const NewsSection = React.lazy(() => import('@mandaapp/ui/src/components/NewsSection').then(m => ({ default: m.NewsSection })));
const GallerySection = React.lazy(() => import('@mandaapp/ui/src/components/GallerySection').then(m => ({ default: m.GallerySection })));
const ContactSection = React.lazy(() => import('@mandaapp/ui/src/components/ContactSection').then(m => ({ default: m.ContactSection })));
const QuickLinksSection = React.lazy(() => import('@mandaapp/ui/src/components/QuickLinksSection').then(m => ({ default: m.QuickLinksSection })));

import { useNavigate } from 'react-router-dom';
import { useNews } from '../hooks/api/useNews';
import { useGallery } from '../hooks/api/useGallery';
import { useSiteSettings } from '../hooks/api/useSettings';
import { contactsService } from '../lib/services/contacts';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { HeaderWithSettings } from '../components/HeaderWithSettings';
import { API_BASE_URL } from '../lib/api';
import { SEO } from '../components/SEO';
import { PPDBPopupModal } from './ppdb/components/PPDBPopupModal';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const LandingPage = () => {
  const navigate = useNavigate();
  const { queryAll } = useNews();
  const { queryAll: galleryQuery } = useGallery();
  const { get } = useSiteSettings();
  const apiNews = queryAll.data || [];
  const apiGallery = galleryQuery.data || [];

  // Transform API news data to the format expected by NewsSection
  // Sort by newest first, limit to 6 most recent
  const newsItems: UINewsItem[] = apiNews
    .filter((n: any) => n.status === 'Published')
    .sort((a: any, b: any) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 6)
    .map((n: any) => {
      const imgMatch = n.content?.match(/<img[^>]+src=["']([^"']+)["']/);
      const imageUrl = imgMatch ? imgMatch[1] : '';
      const plainText = n.content?.replace(/<[^>]*>?/gm, '').trim() || '';
      return {
        id: n.id,
        title: n.title,
        excerpt: plainText.substring(0, 200),
        imageUrl,
      };
    });

  // Transform API gallery data — newest first, limit to 6 thumbnails
  const galleryItems = apiGallery
    .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 6)
    .map((g: any) => ({
      id: g.id,
      imageUrl: g.url,
      title: g.title,
      description: g.description || '',
      category: 'General',
    }));

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
