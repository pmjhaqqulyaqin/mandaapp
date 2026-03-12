import React from 'react';
import { GallerySection } from '@mandaapp/ui';
import { useGallery } from '../hooks/api/useGallery';
import { FooterWithSettings } from '../components/FooterWithSettings';
import { HeaderWithSettings } from '../components/HeaderWithSettings';

export const GalleryPage = () => {
  const { queryAll: galleryQuery } = useGallery();
  const apiGallery = galleryQuery.data || [];

  // Transform API gallery data to match GallerySectionItem format
  const galleryItems = apiGallery.map((g: any) => ({
    id: g.id,
    imageUrl: g.url,
    title: g.title,
    description: g.description || '',
    category: 'General',
  }));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#050505] transition-colors duration-300">
      <HeaderWithSettings />
      
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-white dark:bg-[#0a0a0a] border-b border-border-light dark:border-border-dark py-16 transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h1 className="text-4xl font-heading font-bold text-text-primary dark:text-text-darkPrimary mb-4">
              MANDALOTIM Gallery
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              A visual journey through our academic achievements, sports victories, artistic expressions, and vibrant campus life.
            </p>
          </div>
        </div>

        <div className="pb-12">
          {galleryQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <GallerySection items={galleryItems} />
          )}
        </div>
      </main>

      <FooterWithSettings />
    </div>
  );
};
