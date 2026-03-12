import { Header } from '@mandaapp/ui';
import { useSiteSettings } from '../hooks/api/useSettings';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';
import { useMenus } from '../hooks/api/useMenus';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

/** Header pre-wired with settings from the API */
export const HeaderWithSettings = () => {
  const { get } = useSiteSettings();
  const { queryAll: queryAllMenus } = useMenus();
  const navigate = useNavigate();
  const logoUrl = get('logo_url');
  const resolvedLogo = logoUrl ? (logoUrl.startsWith('/') ? `${SERVER_BASE}${logoUrl}` : logoUrl) : undefined;

  // Build full address
  const fullAddress = [get('address'), get('district_city')].filter(Boolean).join(', ') || undefined;

  const menus = queryAllMenus.data || [];

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/news?search=${encodeURIComponent(query)}`);
    }
  };

  // Build the hierarchical menu tree from the flat DB menu fetch
  const buildMenuTree = (menuList: any[]) => {
    const map = new Map();
    const roots: any[] = [];
    menuList.forEach(m => map.set(m.id, { ...m, children: [] }));
    menuList.forEach(m => {
      // Only include active menus in the frontend
      if(!m.isActive) return;
      
      if (m.parentId) {
        const parent = map.get(m.parentId);
        if (parent) parent.children.push(map.get(m.id));
      } else {
        roots.push(map.get(m.id));
      }
    });
    roots.sort((a, b) => a.order - b.order);
    roots.forEach(r => r.children.sort((a: any, b: any) => a.order - b.order));
    return roots;
  };

  const dynamicMenuTree = buildMenuTree(menus);

  const lat = get('latitude');
  const lng = get('longitude');
  const schoolName = get('school_name') || 'SMK Manda App';
  
  let mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schoolName + (fullAddress ? ' ' + fullAddress : ''))}`;
  if (lat && lng) {
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  return (
    <Header
      schoolName={schoolName}
      logoUrl={resolvedLogo}
      address={fullAddress}
      phone={get('phone')}
      email={get('email')}
      onSearch={handleSearch}
      dynamicMenus={dynamicMenuTree}
      mapUrl={mapUrl}
    />
  );
};
