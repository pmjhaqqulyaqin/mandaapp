import { useParams as useRouterParams, Navigate as RouterNavigate } from 'react-router-dom';
import { usePages } from '../hooks/api/usePages';
import { 
  HeroSection, 
  FeaturesSection, 
  GallerySection, 
  NewsSection, 
  StatsSection, 
  QuickLinksSection,
  ContactSection,
} from '@mandaapp/ui';
import { HeaderWithSettings } from '../components/HeaderWithSettings';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { useNews } from '../hooks/api/useNews';
import { useGallery } from '../hooks/api/useGallery';
import { useSiteSettings } from '../hooks/api/useSettings';
import { contactsService } from '../lib/services/contacts';

interface LayoutSection {
  type: 'Hero' | 'Features' | 'Gallery' | 'News' | 'Stats' | 'QuickLinks' | 'Contact' | 'HTML';
  props?: any;
}

export const DynamicPage = () => {
  const { slug } = useRouterParams<{ slug: string }>();
  const { queryBySlug } = usePages();
  const { queryAll: newsQuery } = useNews();
  const { queryAll: galleryQuery } = useGallery();
  const { get } = useSiteSettings();

  if (!slug) return <RouterNavigate to="/" replace />;
  
  const { data: page, isLoading, error } = queryBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
        <HeaderWithSettings />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 animate-pulse">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  if (error || !page || page.status !== 'Published') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
        <HeaderWithSettings />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <h1 className="text-6xl font-black text-gray-200 dark:text-gray-800 mb-4">404</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md">
            Halaman yang Anda cari tidak tersedia atau belum dipublikasikan oleh admin.
          </p>
          <a href="/" className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  // Parse layout
  let layout: LayoutSection[] = [];
  try {
    if (page.layout) {
      layout = JSON.parse(page.layout);
    }
  } catch (e) {
    console.error('Failed to parse page layout JSON:', e);
  }

  // Default rendering if no layout is defined
  const renderDefaultContent = () => (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a]">
      {/* HERO BANNER */}
      {page.coverImage ? (
        <div className="relative w-full h-[300px] md:h-[450px] overflow-hidden flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url(${page.coverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
          <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-16">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl tracking-tight">
              {page.title}
            </h1>
            {page.metaDescription && (
              <p className="text-gray-200 text-lg md:text-2xl max-w-2xl mx-auto drop-shadow-lg font-medium opacity-90">
                {page.metaDescription}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
           <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
              {page.title}
            </h1>
            {page.metaDescription && (
              <p className="text-gray-500 dark:text-gray-400 text-xl font-medium">
                {page.metaDescription}
              </p>
            )}
           <div className="h-1.5 w-24 bg-emerald-500 rounded-full mt-8" />
        </div>
      )}

      {/* HTML CONTENT */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 pt-8">
        <article 
          className="prose prose-emerald prose-lg dark:prose-invert max-w-none 
            prose-img:rounded-3xl prose-img:shadow-2xl prose-img:mx-auto
            prose-headings:font-bold prose-headings:tracking-tight
            prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50/50 dark:prose-blockquote:bg-emerald-900/10 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </main>
  );

  // Dynamic Layout Renderer
  const renderLayout = () => (
    <main className="flex-1 w-full bg-white dark:bg-[#0a0a0a]">
      {layout.map((section, idx) => {
        const { type, props } = section;
        
        switch (type) {
          case 'Hero':
            return <HeroSection key={idx} {...props} />;
          case 'Features':
            return <FeaturesSection key={idx} {...props} />;
          case 'Gallery':
            return <GallerySection key={idx} items={galleryQuery.data || []} {...props} />;
          case 'News':
            return <NewsSection key={idx} items={newsQuery.data || []} {...props} />;
          case 'Stats':
            return <StatsSection key={idx} {...props} />;
          case 'QuickLinks':
            return <QuickLinksSection key={idx} {...props} />;
          case 'Contact':
            return (
              <ContactSection 
                key={idx} 
                onSubmit={(data) => contactsService.submit(data)}
                schoolName={get('school_name') || undefined}
                phone={get('phone') || undefined}
                email={get('email') || undefined}
                {...props} 
              />
            );
          case 'HTML':
            return (
              <div key={idx} className="w-full max-w-4xl mx-auto px-4 py-16">
                <div 
                  className="prose prose-emerald prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: props?.content || '' }}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </main>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
      <HeaderWithSettings />
      {layout.length > 0 ? renderLayout() : renderDefaultContent()}
      <FooterWithSettings />
    </div>
  );
};
