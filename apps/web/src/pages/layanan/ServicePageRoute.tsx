import { useParams as useRouterParams, Navigate as RouterNavigate } from 'react-router-dom';
import { HeaderWithSettings } from '../../components/HeaderWithSettings';
import { FooterWithSettings } from '../../components/FooterWithSettings';
import { ServiceForm, SERVICES } from './ServiceForm';

export const ServicePageRoute = () => {
  const { slug } = useRouterParams<{ slug: string }>();

  if (!slug) return <RouterNavigate to="/" replace />;

  const isServicePage = SERVICES.some(s => slug.includes(s.slug) || s.slug.includes(slug));

  if (!isServicePage) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
        <HeaderWithSettings />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <h1 className="text-6xl font-black text-gray-200 dark:text-gray-800 mb-4">404</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md">
            Layanan PTSP yang Anda cari tidak tersedia.
          </p>
          <a href="/" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95">
            Kembali ke Beranda
          </a>
        </div>
        <FooterWithSettings />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
      <HeaderWithSettings />
      <ServiceForm pageSlug={slug} />
      <FooterWithSettings />
    </div>
  );
};
