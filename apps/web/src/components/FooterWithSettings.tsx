import { Footer } from '@mandaapp/ui';
import { useSiteSettings } from '../hooks/api/useSettings';
import { API_BASE_URL } from '../lib/api';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

/** Footer pre-wired with settings from the API */
export const FooterWithSettings = () => {
  const { get, getRelatedWebsites } = useSiteSettings();
  const logoUrl = get('logo_url');
  const resolvedLogo = logoUrl ? (logoUrl.startsWith('/') ? `${SERVER_BASE}${logoUrl}` : logoUrl) : undefined;

  return (
    <Footer
      schoolName={get('school_name') || undefined}
      address={get('address') || undefined}
      phone={get('phone') || undefined}
      email={get('email') || undefined}
      logoUrl={resolvedLogo}
      facebookUrl={get('facebook_url') || undefined}
      twitterUrl={get('twitter_url') || undefined}
      instagramUrl={get('instagram_url') || undefined}
      youtubeUrl={get('youtube_url') || undefined}
      relatedWebsites={getRelatedWebsites()}
      footerCreditText={get('footer_credit_text') || undefined}
    />
  );
};
