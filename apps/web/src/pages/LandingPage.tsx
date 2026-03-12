import { HeroSection, NewsSection, GallerySection, ContactSection, QuickLinksSection } from '@mandaapp/ui';
import type { NewsItem as UINewsItem } from '@mandaapp/ui';
import { useNavigate } from 'react-router-dom';
import { useNews } from '../hooks/api/useNews';
import { useGallery } from '../hooks/api/useGallery';
import { useSiteSettings } from '../hooks/api/useSettings';
import { contactsService } from '../lib/services/contacts';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { HeaderWithSettings } from '../components/HeaderWithSettings';
import { API_BASE_URL } from '../lib/api';

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

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderWithSettings />
      <main className="flex-1">
        <HeroSection />
        <NewsSection items={newsItems} onReadMore={(id) => navigate(`/news/${id}`)} />
        <QuickLinksSection />
        <GallerySection items={galleryItems} />
        <ContactSection
          onSubmit={(data) => contactsService.submit(data)}
          schoolName={get('school_name') || undefined}
          address={fullAddress}
          phone={get('phone') || undefined}
          email={get('email') || undefined}
          mapEmbedUrl={get('map_embed_url') || undefined}
          logoUrl={resolvedLogo}
        />
      </main>
      <FooterWithSettings />
    </div>
  );
};
