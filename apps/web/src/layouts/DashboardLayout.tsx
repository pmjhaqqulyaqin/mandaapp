import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@mandaapp/ui';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, API_BASE_URL } from '../lib/api';
import { useSiteSettings } from '../hooks/api/useSettings';
import {
  Home,
  Newspaper,
  Calendar,
  CreditCard,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  ListTree,
  Settings as SettingsIcon,
} from 'lucide-react';

// All menu items definition with their route paths and icons
const ALL_MENU_ITEMS = [
  {
    key: 'overview',
    label: 'Overview',
    href: '/dashboard',
    exact: true,
    icon: <Home size={18} />,
    group: 'main',
  },
  {
    key: 'news',
    label: 'Manajemen Berita',
    href: '/dashboard/news',
    icon: <Newspaper size={18} />,
    group: 'main',
  },
  {
    key: 'calendar',
    label: 'Jadwal Pelajaran',
    href: '/dashboard/calendar',
    icon: <Calendar size={18} />,
    group: 'main',
  },
  {
    key: 'student-card',
    label: 'Kartu Pelajar',
    href: '/dashboard/student-card',
    icon: <CreditCard size={18} />,
    group: 'main',
  },
  {
    key: 'gallery',
    label: 'Galeri Sekolah',
    href: '/dashboard/gallery',
    icon: <ImageIcon size={18} />,
    group: 'main',
  },
  {
    key: 'contacts',
    label: 'Pesan Kontak',
    href: '/dashboard/contacts',
    icon: <MessageSquare size={18} />,
    group: 'main',
  },
  {
    key: 'pages',
    label: 'Manajemen Halaman',
    href: '/dashboard/pages',
    icon: <FileText size={18} />,
    group: 'system',
  },
  {
    key: 'menus',
    label: 'Manajemen Menu',
    href: '/dashboard/menus',
    icon: <ListTree size={18} />,
    group: 'system',
  },
  {
    key: 'settings',
    label: 'Pengaturan Sistem',
    href: '/dashboard/settings',
    icon: <SettingsIcon size={18} />,
    group: 'system',
  },
  {
    key: 'users',
    label: 'Manajemen Users',
    href: '/dashboard/users',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    group: 'system',
  },
  {
    key: 'updates',
    label: 'Pusat Update',
    href: '/dashboard/updates',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
    group: 'system',
  },
];

// Map route segments to menu keys for route protection
const ROUTE_TO_MENU_KEY: Record<string, string> = {
  '': 'overview',
  'news': 'news',
  'calendar': 'calendar',
  'student-card': 'student-card',
  'gallery': 'gallery',
  'contacts': 'contacts',
  'pages': 'pages',
  'menus': 'menus',
  'settings': 'settings',
  'users': 'users',
  'updates': 'updates',
};

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { get } = useSiteSettings();
  // Start with all menu keys visible so sidebar never flashes empty
  const [allowedMenus, setAllowedMenus] = useState<string[]>(ALL_MENU_ITEMS.map((i) => i.key));
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Resolve logo URL from system settings
  const logoRaw = get('logo_url');
  const logoUrl = logoRaw ? (logoRaw.startsWith('/') ? `${SERVER_BASE}${logoRaw}` : logoRaw) : undefined;

  // Fetch role permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const result = await apiClient<{ permissions: Record<string, string[]>; allMenus: string[] }>('/users/role-permissions');
        const role = user?.role || 'student';
        if (role === 'admin') {
          setAllowedMenus(result.allMenus);
        } else {
          setAllowedMenus(result.permissions[role] || ['overview']);
        }
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
        if (user?.role === 'admin') {
          setAllowedMenus(ALL_MENU_ITEMS.map((i) => i.key));
        } else {
          setAllowedMenus(['overview']);
        }
      } finally {
        setPermissionsLoaded(true);
      }
    };
    if (user) fetchPermissions();
  }, [user?.id, user?.role]);

  // Route protection: redirect only after permissions have actually loaded
  useEffect(() => {
    if (!permissionsLoaded || !user) return;
    const pathSegment = location.pathname.replace('/dashboard', '').replace(/^\//, '').split('/')[0] || '';
    const menuKey = ROUTE_TO_MENU_KEY[pathSegment];
    if (menuKey && !allowedMenus.includes(menuKey)) {
      navigate('/dashboard', { replace: true });
    }
  }, [permissionsLoaded, allowedMenus, location.pathname, navigate, user]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  // Filter menu items based on permissions
  const mainMenuItems = ALL_MENU_ITEMS.filter((item) => item.group === 'main' && allowedMenus.includes(item.key));
  const systemMenuItems = ALL_MENU_ITEMS.filter((item) => item.group === 'system' && allowedMenus.includes(item.key));

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#050505] relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border-light dark:border-border-dark bg-white dark:bg-background-dark flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            )}
            <h1 className="text-xl font-heading font-bold text-primary">MANDALOTIM</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        {/* Widget Profile */}
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-center">
          <div className="bg-primary/10 w-full p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold uppercase">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary dark:text-text-darkPrimary">{user?.name}</h3>
              <p className="text-xs font-medium text-primary">
                {user?.role === 'admin' ? 'System Administrator'
                  : user?.role === 'kepala_madrasah' ? 'Kepala Madrasah'
                  : user?.role === 'wakil_kepala' ? 'Wakil Kepala'
                  : user?.role === 'kepala_unit' ? 'Kepala Unit'
                  : user?.role === 'wali_kelas' ? 'Wali Kelas'
                  : user?.role === 'pembina_ekstra' ? 'Pembina Ekstra'
                  : user?.role === 'guru' ? 'Guru'
                  : 'Siswa'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-3">Main Menu</div>
          {mainMenuItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.exact}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `sidebar-link px-3 py-2.5 rounded-lg font-medium flex items-center gap-3 ${isActive ? 'sidebar-link-active bg-primary/10 text-primary dark:bg-primary/20' : 'text-text-secondary'}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {systemMenuItems.length > 0 && (
            <>
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mt-6 mb-2 px-3">System</div>
              {systemMenuItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-link px-3 py-2.5 rounded-lg font-medium flex items-center gap-3 ${isActive ? 'sidebar-link-active bg-primary/10 text-primary dark:bg-primary/20' : 'text-text-secondary'}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-border-light dark:border-border-dark shrink-0">
          <button 
            onClick={handleLogout} 
            className="w-full text-text-secondary hover:text-error text-sm flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-error/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Logout
          </button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <header className="h-16 border-b border-border-light dark:border-border-dark bg-white dark:bg-background-dark flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div className="text-text-secondary text-sm font-medium hidden sm:block">Dashboard Overview</div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button className="h-9 w-9 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center text-text-secondary hover:text-primary transition-colors border border-border-light dark:border-border-dark">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
          </div>
        </header>
        <div className="p-6 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* CSS for sidebar hover — transitions ONLY on hover, not on active state change */}
      <style>{`
        .sidebar-link:not(.sidebar-link-active):hover {
          background-color: rgba(0,0,0,0.04);
        }
        .dark .sidebar-link:not(.sidebar-link-active):hover {
          background-color: rgba(255,255,255,0.04);
        }
      `}</style>
    </div>
  );
};
