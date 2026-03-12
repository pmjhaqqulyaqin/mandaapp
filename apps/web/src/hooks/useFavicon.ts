import { useEffect } from 'react';
import { useSiteSettings } from './api/useSettings';
import { API_BASE_URL } from '../lib/api';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

/**
 * Dynamically sets the browser favicon to the school logo from system settings.
 * Falls back to the default /vite.svg if no logo is configured.
 */
export const useFavicon = () => {
  const { get, isLoading } = useSiteSettings();

  useEffect(() => {
    if (isLoading) return;

    const faviconRaw = get('favicon_url');
    const logoRaw = get('logo_url');
    const targetPath = faviconRaw || logoRaw;
    
    if (!targetPath) return;

    const finalUrl = targetPath.startsWith('/') ? `${SERVER_BASE}${targetPath}` : targetPath;

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = targetPath.endsWith('.ico') ? 'image/x-icon' : 'image/png';
    link.href = finalUrl;
  }, [get, isLoading]);
};
