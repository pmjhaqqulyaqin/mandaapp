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
  Users,
  UserSquare2,
  Hash,
  ChevronDown,
  User as UserIcon,
  LogOut,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react';
import { ProfileModal } from '../components/modals/ProfileModal';

// All menu items definition with their route paths and icons
const ALL_MENU_ITEMS = [
  {
    key: 'overview',
    label: 'Overview',
    href: '/dashboard',
    exact: true,
    icon: <Home size={16} />,
    group: 'main',
  },
  {
    key: 'news',
    label: 'Manajemen Berita',
    href: '/dashboard/news',
    icon: <Newspaper size={16} />,
    group: 'main',
  },
  {
    key: 'gallery',
    label: 'Galeri Sekolah',
    href: '/dashboard/gallery',
    icon: <ImageIcon size={16} />,
    group: 'main',
  },
  {
    key: 'calendar',
    label: 'Jadwal Kegiatan Madrasah',
    href: '/dashboard/calendar',
    icon: <Calendar size={16} />,
    group: 'main',
  },
  {
    key: 'student-card',
    label: 'Kartu Pelajar',
    href: '/dashboard/student-card',
    icon: <CreditCard size={16} />,
    group: 'main',
  },
  {
    key: 'employees',
    label: 'Data Pegawai',
    href: '/dashboard/employees',
    icon: <UserSquare2 size={16} />,
    group: 'main',
  },
  {
    key: 'nis',
    label: 'Manajemen NIS',
    href: '/dashboard/nis',
    icon: <Hash size={16} />,
    group: 'main',
  },
  {
    key: 'students',
    label: 'Manajemen Siswa',
    href: '/dashboard/students',
    icon: <Users size={16} />,
    group: 'main',
  },
  {
    key: 'e-office',
    label: 'Korespondensi Dinas',
    href: '/dashboard/e-office',
    icon: <FileText size={16} />,
    group: 'main',
  },
  {
    key: 'exams',
    label: 'Manajemen Ujian',
    href: '/dashboard/exams',
    icon: <ClipboardCheck size={16} />,
    group: 'main',
  },
  {
    key: 'ppdb',
    label: 'PMB / SIMPMB',
    href: '/dashboard/ppdb',
    icon: <GraduationCap size={16} />,
    group: 'main',
  },
  {
    key: 'ptsp',
    label: 'Pusat Layanan',
    href: '/dashboard/services',
    icon: <MessageSquare size={16} />,
    group: 'main',
  },
  {
    key: 'contacts',
    label: 'Pesan Kontak',
    href: '/dashboard/contacts',
    icon: <MessageSquare size={16} />,
    group: 'main',
  },
  {
    key: 'pages',
    label: 'Manajemen Halaman',
    href: '/dashboard/pages',
    icon: <FileText size={16} />,
    group: 'system',
  },
  {
    key: 'menus',
    label: 'Manajemen Menu',
    href: '/dashboard/menus',
    icon: <ListTree size={16} />,
    group: 'system',
  },
  {
    key: 'settings',
    label: 'Pengaturan Sistem',
    href: '/dashboard/settings',
    icon: <SettingsIcon size={16} />,
    group: 'system',
  },
  {
    key: 'users',
    label: 'Manajemen Users',
    href: '/dashboard/users',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    group: 'system',
  },
  {
    key: 'updates',
    label: 'Pusat Update',
    href: '/dashboard/updates',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
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
  'services': 'ptsp',
  'menus': 'menus',
  'e-office': 'e-office',
  'settings': 'settings',
  'users': 'users',
  'updates': 'updates',
  'students': 'students',
  'nis': 'nis',
  'employees': 'employees',
  'exams': 'exams',
  'ppdb': 'ppdb',
};

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { get } = useSiteSettings();
  // Start with all menu keys visible so sidebar never flashes empty
  const [allowedMenus, setAllowedMenus] = useState<string[]>(ALL_MENU_ITEMS.map((i) => i.key));
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('#profile-dropdown-container')) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabel = user?.role === 'admin' ? 'System Administrator'
      : user?.role === 'kepala_madrasah' ? 'Kepala Madrasah'
      : user?.role === 'wakil_kepala' ? 'Wakil Kepala'
      : user?.role === 'kepala_unit' ? 'Kepala Unit'
      : user?.role === 'wali_kelas' ? 'Wali Kelas'
      : user?.role === 'pembina_ekstra' ? 'Pembina Ekstra'
      : user?.role === 'kepala_tu' ? 'Kepala TU'
      : user?.role === 'pegawai_tu' ? 'Pegawai TU'
      : user?.role === 'guru' ? 'Guru'
      : 'Siswa';

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
    <div className="flex h-[100dvh] print:h-auto print:min-h-0 w-screen print:w-full overflow-hidden print:overflow-visible print:block bg-gray-50 dark:bg-[#050505] relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-56 border-r border-border-light dark:border-border-dark bg-white dark:bg-background-dark flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 print:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-3 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-7 h-7 object-contain" />
            )}
            <h1 className="text-base font-heading font-bold text-primary">MANDALOTIM</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        


        <nav className="flex-1 px-3 py-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1 px-2.5">Main Menu</div>
          {mainMenuItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.exact}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `sidebar-link px-2.5 py-[7px] rounded-md text-[13px] font-medium flex items-center gap-2.5 ${isActive ? 'sidebar-link-active bg-primary/10 text-primary dark:bg-primary/20' : 'text-text-secondary'}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {systemMenuItems.length > 0 && (
            <>
              <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mt-4 mb-1 px-2.5">System</div>
              {systemMenuItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-link px-2.5 py-[7px] rounded-md text-[13px] font-medium flex items-center gap-2.5 ${isActive ? 'sidebar-link-active bg-primary/10 text-primary dark:bg-primary/20' : 'text-text-secondary'}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        

      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden print:overflow-visible print:block">
        <header className="h-12 border-b border-border-light dark:border-border-dark bg-white dark:bg-background-dark flex items-center justify-between px-4 sm:px-5 shrink-0 z-30 print:hidden relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold uppercase shrink-0">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-text-primary dark:text-text-darkPrimary truncate leading-tight">{user?.name}</h3>
                <p className="text-[11px] font-medium text-primary truncate leading-tight">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div id="profile-dropdown-container" className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center text-text-secondary hover:text-primary transition-colors border border-border-light dark:border-border-dark"
              >
                <ChevronDown size={14} />
              </button>
              
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111111] border border-border-light dark:border-border-dark rounded-lg shadow-lg py-1 z-50 overflow-hidden">
                  <button 
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] flex items-center gap-2.5 transition-colors"
                  >
                    <UserIcon size={14} className="text-text-secondary" />
                    <span>Profil</span>
                  </button>
                  <div className="h-px bg-border-light dark:bg-border-dark my-1" />
                  <button 
                    onClick={handleLogout} 
                    className="w-full text-left px-4 py-2.5 text-[13px] text-error hover:bg-error/10 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-5 print:p-0 overflow-auto print:overflow-visible print:block custom-scrollbar">
          <Outlet />
        </div>
      </main>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

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
