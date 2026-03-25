import { Helmet } from 'react-helmet-async';
import { useSiteSettings } from '../hooks/api/useSettings';
import { API_BASE_URL } from '../lib/api';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  imageUrl?: string;
  isArticle?: boolean;
}

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const SEO = ({ title, description, keywords, url, imageUrl, isArticle = false }: SEOProps) => {
  const { get } = useSiteSettings();
  
  const siteName = get('school_name') || 'MAN 2 Lombok Timur';
  const defaultTitle = `${siteName} - Madrasah Berprestasi`;
  const finalTitle = title ? `${title} - ${siteName}` : defaultTitle;
  
  const defaultDesc = `Website resmi ${siteName}, madrasah berprestasi di bawah naungan Kantor Kementerian Agama Lombok Timur. Berlokasi strategis di Wanasaba, Beririjarak.`;
  const finalDesc = description || defaultDesc;
  
  const defaultKeywords = "man 2 lombok timur, man 2 lotim, manda, Madrasah di lombok timur, Kantor kementerian agama lombok timur, sekolah lombok timur, madrasah berprestasi, Lombok Timur, Wanasaba, Beririjarak";
  const finalKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;
  
  const finalUrl = url || typeof window !== 'undefined' ? window.location.href : 'https://mandalotim.sch.id';
  const logoUrlRaw = get('logo_url');
  const resolvedLogo = logoUrlRaw ? (logoUrlRaw.startsWith('/') ? `${SERVER_BASE}${logoUrlRaw}` : logoUrlRaw) : '';
  const finalImage = imageUrl || resolvedLogo || '/hero-bg.png';
  const address = get('address') || 'Wanasaba, Beririjarak';

  // Schema Markup (JSON-LD)
  const schemaOrgJSONLD = isArticle ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title || finalTitle,
    "image": [
      finalImage
    ],
    "author": [{
        "@type": "Person",
        "name": "Admin MAN 2"
    }],
    "publisher": {
      "@type": "EducationalOrganization",
      "name": siteName,
      "logo": {
        "@type": "ImageObject",
        "url": resolvedLogo
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": finalUrl
    }
  } : {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": siteName,
    "url": "https://mandalotim.sch.id",
    "logo": resolvedLogo,
    "description": finalDesc,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": address,
      "addressLocality": "Wanasaba",
      "addressRegion": "Lombok Timur",
      "addressCountry": "ID"
    },
    "sameAs": [
      get('facebook_url') || '',
      get('instagram_url') || '',
      get('twitter_url') || '',
      get('youtube_url') || '',
      get('tiktok_url') || ''
    ].filter(Boolean)
  };

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="keywords" content={finalKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={isArticle ? "article" : "website"} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={finalUrl} />
      <meta property="twitter:title" content={finalTitle} />
      <meta property="twitter:description" content={finalDesc} />
      <meta property="twitter:image" content={finalImage} />

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(schemaOrgJSONLD)}
      </script>
    </Helmet>
  );
};
