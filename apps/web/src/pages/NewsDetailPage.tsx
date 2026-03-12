import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@mandaapp/ui';
import { useNews } from '../hooks/api/useNews';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { HeaderWithSettings } from '../components/HeaderWithSettings';

export const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { queryAll } = useNews();
  const newsList: any[] = queryAll.data || [];
  const article = newsList.find((n: any) => n.id === id);

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
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

  // Extract first image from HTML content
  const imageUrl = useMemo(() => {
    if (!article?.content) return null;
    const imgMatch = article.content.match(/<img[^>]+src=["']([^"']+)["']/);
    return imgMatch ? imgMatch[1] : null;
  }, [article?.content]);

  // Clean content to remove the first image if it's the exact one we extracted
  // so we don't duplicate it in the hero and the body, but for simplicity we can just leave it 
  // or use CSS to hide the first image in prose.

  // Estimate reading time
  const readingTime = useMemo(() => {
    if (!article?.content) return 1;
    const text = article.content.replace(/<[^>]*>?/gm, '');
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [article?.content]);

  // Get unique categories and their counts
  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    newsList.forEach(n => {
      cats[n.category] = (cats[n.category] || 0) + 1;
    });
    return Object.entries(cats).map(([name, count]) => ({ name, count }));
  }, [newsList]);

  // Get recent/popular news (just taking 3 other random or latest news)
  const recentNews = useMemo(() => {
    return newsList.filter(n => n.id !== id).slice(0, 3);
  }, [newsList, id]);

  // Get random news
  const randomNews = useMemo(() => {
    const otherNews = newsList.filter(n => n.id !== id);
    // Shuffle the array
    for (let i = otherNews.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherNews[i], otherNews[j]] = [otherNews[j], otherNews[i]];
    }
    return otherNews.slice(0, 3);
  }, [newsList, id]);

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = article?.title || 'Berita Terkini';
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent('Cek berita ini: ' + url)}`;
        break;
      case 'instagram':
        // Web does not have a native URL scheme for posting to Instagram feed/story directly with a URL.
        // The best modern approach on mobile devices is to use the Web Share API, which opens the native OS share sheet.
        // If the user has Instagram installed, they will see it as an option there.
        if (navigator.share) {
          try {
            await navigator.share({
              title: text,
              text: 'Cek berita menarik ini dari MAN 2 Lombok Timur!',
              url: url,
            });
          } catch (error) {
            console.log('Error sharing:', error);
          }
        } else {
          // Fallback if Web Share API is not supported (e.g., desktop browsers without support)
          navigator.clipboard.writeText(url);
          alert('Tautan disalin! Perangkat Anda tidak mendukung fitur berbagi langsung. Silakan buka aplikasi Instagram untuk membagikan tautan ini.');
        }
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Tautan disalin ke clipboard!');
        break;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#050505] transition-colors duration-300">
      <HeaderWithSettings />

      <main className="flex-1 w-full relative">
        {/* Dynamic Hero Section */}
        <div className="relative w-full h-[40vh] min-h-[300px] bg-gradient-to-r from-primary-900 to-primary-800 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center overflow-hidden">
          {imageUrl && (
            <>
              <div className="absolute inset-0 bg-black/50 z-10" />
              <img src={imageUrl} alt="Hero" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-60 transform scale-105" />
            </>
          )}
          <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
            {article && (
              <Badge variant={getCategoryBadgeVariant(article.category) as any} className="mb-4 text-sm px-3 py-1 bg-white/10 text-white border-white/20 backdrop-blur-md">
                {article.category}
              </Badge>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
              {article ? article.title : 'Memuat Berita...'}
            </h1>
            {article && (
              <div className="flex items-center justify-center gap-4 text-white/80 text-sm font-medium">
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {formatDate(article.publishDate)}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {readingTime} menit baca
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Breadcrumb / Back */}
          <Link
            to="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors mb-8"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Kembali ke Berita
          </Link>

          {queryAll.isLoading ? (
            <div className="flex gap-8">
              <div className="flex-1 space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded mt-8" />
              </div>
              <div className="hidden lg:block w-80 space-y-4 animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ) : !article ? (
            <div className="text-center py-20 bg-white dark:bg-[#121212] rounded-3xl shadow-sm border border-border-light dark:border-border-dark">
              <h2 className="text-2xl font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-2">
                Berita Tidak Ditemukan
              </h2>
              <p className="text-text-secondary mb-6">Artikel yang Anda cari tidak tersedia atau telah dihapus.</p>
              <Link to="/news" className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors">
                Lihat Semua Berita
              </Link>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-10 items-start">
              {/* Main Content Area */}
              <article className="flex-1 min-w-0 bg-white dark:bg-[#121212] rounded-3xl p-6 sm:p-10 shadow-sm border border-border-light dark:border-border-dark">
                {/* Removed the duplicate top hero image block to avoid double images */}
                
                <div
                  className="prose prose-lg dark:prose-invert max-w-none
                    prose-headings:font-heading prose-headings:text-text-primary dark:prose-headings:text-text-darkPrimary prose-headings:font-bold
                    prose-p:text-text-secondary prose-p:leading-relaxed prose-p:text-[17px]
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-2xl prose-img:shadow-md prose-img:mx-auto prose-img:mt-8 prose-img:max-h-[500px] prose-img:w-auto prose-img:object-contain
                    prose-blockquote:border-l-primary prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </article>

              {/* Sidebar Area */}
              <aside className="w-full lg:w-[320px] lg:shrink-0 space-y-5 sticky top-24">
                
                {/* Author Block */}
                <div className="bg-white dark:bg-[#121212] rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-focus flex items-center justify-center text-white text-lg font-bold shadow-md">
                      M2
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-text-primary dark:text-text-darkPrimary text-lg">Admin MAN 2</h3>
                      <p className="text-sm text-text-secondary">Penulis Berita</p>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Bagian Humas dan Publikasi MAN 2 Lombok Timur. Mengabarkan informasi terkini, prestasi, dan kegiatan madrasah.
                  </p>
                </div>

                {/* Share Widget */}
                <div className="bg-white dark:bg-[#121212] rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
                  <h3 className="font-heading font-bold text-text-primary dark:text-text-darkPrimary text-base mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    Bagikan Berita
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleShare('facebook')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 rounded-xl transition-colors text-sm font-medium">
                      Facebook
                    </button>
                    <button onClick={() => handleShare('twitter')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 rounded-xl transition-colors text-sm font-medium">
                      Twitter
                    </button>
                    <button onClick={() => handleShare('instagram')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/20 rounded-xl transition-colors text-sm font-medium">
                      Instagram
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => handleShare('linkedin')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20 rounded-xl transition-colors text-sm font-medium">
                      LinkedIn
                    </button>
                    <button onClick={() => handleShare('whatsapp')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl transition-colors text-sm font-medium">
                      WhatsApp
                    </button>
                    <button onClick={() => handleShare('email')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20 rounded-xl transition-colors text-sm font-medium">
                      Email
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <button onClick={() => handleShare('copy')} className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">
                      Salin Link
                    </button>
                  </div>
                </div>

                {/* Categories Widget */}
                <div className="bg-white dark:bg-[#121212] rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
                  <h3 className="font-heading font-bold text-text-primary dark:text-text-darkPrimary text-base mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    Kategori Berita
                  </h3>
                  <ul className="space-y-1.5">
                    {categories.map(cat => (
                      <li key={cat.name}>
                        <Link to={`/news?search=${cat.name}`} className="flex items-center justify-between group py-1">
                          <span className="text-sm text-text-secondary group-hover:text-primary transition-colors">{cat.name}</span>
                          <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] px-2 py-0.5 rounded-full">{cat.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent News Widget */}
                {recentNews.length > 0 && (
                  <div className="bg-white dark:bg-[#121212] rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-heading font-bold text-text-primary dark:text-text-darkPrimary text-base mb-3 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      Berita Terpopuler
                    </h3>
                    <div className="space-y-3">
                      {recentNews.map(n => {
                        const imgMatch = n.content.match(/<img[^>]+src=["']([^"']+)["']/);
                        const nImg = imgMatch ? imgMatch[1] : null;

                        return (
                          <Link key={n.id} to={`/news/${n.id}`} className="flex gap-3 group items-center">
                            {nImg && (
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                                <img src={nImg} alt={n.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className="font-heading font-semibold text-text-primary dark:text-text-darkPrimary text-[13px] line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                {n.title}
                              </h4>
                              <span className="text-[11px] text-text-secondary mt-0.5">{formatDate(n.publishDate)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Random News Widget */}
                {randomNews.length > 0 && (
                  <div className="bg-white dark:bg-[#121212] rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
                    <h3 className="font-heading font-bold text-text-primary dark:text-text-darkPrimary text-base mb-3 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.5 4h5v5"/><path d="m3 14 5-5 4 4 8-8"/></svg>
                      Berita Pilihan
                    </h3>
                    <div className="space-y-3">
                      {randomNews.map(n => {
                        const imgMatch = n.content.match(/<img[^>]+src=["']([^"']+)["']/);
                        const nImg = imgMatch ? imgMatch[1] : null;

                        return (
                          <Link key={n.id} to={`/news/${n.id}`} className="flex gap-3 group items-center">
                            {nImg && (
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                                <img src={nImg} alt={n.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className="font-heading font-semibold text-text-primary dark:text-text-darkPrimary text-[13px] line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                {n.title}
                              </h4>
                              <span className="text-[11px] text-text-secondary mt-0.5">{formatDate(n.publishDate)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interesting Links (Tautan Menarik) Widget */}
                <div className="bg-gradient-to-br from-primary/10 to-primary-focus/5 rounded-2xl p-5 border border-primary/20">
                  <h3 className="font-heading font-bold text-primary dark:text-primary-light text-base mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 13 8-8"/><path d="m21.8 13.9-3.4 3.4c-2.4 2.4-6.3 2.4-8.8 0L2 9.6"/></svg>
                    Tautan Menarik
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="#" className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm text-sm font-medium text-text-primary dark:text-text-darkPrimary">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">🎓</div>
                        Portal Akademik
                      </a>
                    </li>
                    <li>
                      <a href="#" className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm text-sm font-medium text-text-primary dark:text-text-darkPrimary">
                        <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center text-success text-xs">🏆</div>
                        Prestasi Siswa
                      </a>
                    </li>
                    <li>
                      <a href="#" className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm text-sm font-medium text-text-primary dark:text-text-darkPrimary">
                        <div className="w-7 h-7 rounded-full bg-warning/20 flex items-center justify-center text-warning text-xs">📚</div>
                        E-Library Madrasah
                      </a>
                    </li>
                  </ul>
                </div>

              </aside>
            </div>
          )}
        </div>
      </main>

      <FooterWithSettings />
    </div>
  );
};
