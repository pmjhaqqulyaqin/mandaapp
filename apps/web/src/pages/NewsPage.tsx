import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Input } from '@mandaapp/ui';
import { useNews } from '../hooks/api/useNews';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { HeaderWithSettings } from '../components/HeaderWithSettings';

export const NewsPage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const { queryAll } = useNews();
  const allNews: any[] = queryAll.data || [];

  // Only show published news on the public page
  const publishedNews = allNews.filter((news: any) => news.status === 'Published');
  
  const filteredNews = publishedNews.filter((news: any) => 
    news.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    news.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadgeVariant = (category: string) => {
    switch(category) {
      case 'Academic': return 'primary';
      case 'Event': return 'success';
      case 'Alert': return 'danger';
      default: return 'default';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Strip HTML tags for preview text
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#050505] transition-colors duration-300">
      <HeaderWithSettings />
      
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-white dark:bg-[#0a0a0a] border-b border-border-light dark:border-border-dark py-16 transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h1 className="text-4xl font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-4">
              Berita & Pengumuman
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Tetap terinformasi dengan pengumuman terbaru, jadwal akademik, dan acara di MANDALOTIM.
            </p>
            
            <div className="mt-8 max-w-md mx-auto">
              <Input 
                placeholder="Cari berita..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>}
              />
            </div>
          </div>
        </div>

        {/* News Feed */}
        <div className="max-w-5xl mx-auto px-6 py-12">
          {queryAll.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-[#121212] rounded-2xl border border-border-light dark:border-border-dark p-6 animate-pulse">
                  <div className="flex justify-between mb-4">
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-heading font-medium text-text-primary dark:text-text-darkPrimary">Tidak ada berita ditemukan</h3>
              <p className="text-text-secondary mt-2">Coba sesuaikan kata kunci pencarian Anda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredNews.map((article: any) => {
                const plainText = stripHtml(article.content);
                // Extract first image from HTML content
                const imgMatch = article.content?.match(/<img[^>]+src=["']([^"']+)["']/);
                const imageUrl = imgMatch ? imgMatch[1] : null;

                return (
                  <article 
                    key={article.id} 
                    className="bg-white dark:bg-[#121212] rounded-2xl border border-border-light dark:border-border-dark overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
                  >
                    {/* Thumbnail */}
                    {imageUrl && (
                      <div className="w-full aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img src={imageUrl} alt={article.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant={getCategoryBadgeVariant(article.category) as any}>
                          {article.category}
                        </Badge>
                        <span className="text-sm text-text-secondary">{formatDate(article.publishDate)}</span>
                      </div>
                      
                      <h2 className="text-xl font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-3 line-clamp-2">
                        {article.title}
                      </h2>
                      
                      <p className="text-text-secondary line-clamp-3 mb-6 flex-1">
                        {plainText.substring(0, 200)}
                      </p>
                      
                      <div className="flex items-center justify-end mt-auto pt-4 border-t border-border-light dark:border-border-dark">
                        <Link 
                          to={`/news/${article.id}`}
                          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors inline-flex items-center gap-1"
                        >
                          Baca Selengkapnya
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <FooterWithSettings />
    </div>
  );
};
