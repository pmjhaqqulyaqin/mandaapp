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
  Star,
  LayoutGrid,
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
    key: 'penilaian-pmb',
    label: 'Penilaian PMB',
    href: '/dashboard/ppdb/penilaian',
    icon: <Star size={16} />,
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
  'ppdb/penilaian': 'penilaian-pmb',
};

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { get } = useSiteSettings();
  // Start with all menu keys visible so sidebar never flashes empty
  const [allowedMenus, setAllowedMenus] = useState<string[]>(ALL_MENU_ITEMS.map((i) => i.key));
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [hasPenilaianTests, setHasPenilaianTests] = useState<boolean | null>(null);

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

  // Dynamically check if the user has any assigned tests to hide the menu if they don't, OR show it even if their role lacks permission (bypass)
  useEffect(() => {
    if (!permissionsLoaded || !user) return;
    
    // Admin always sees it.
    if (user.role === 'admin') {
      setHasPenilaianTests(true);
      return;
    }
    
    // Always check for assigned tests regardless of role. This implements the "IDE PAMUNGKAS":
    // If they are assigned as an examiner, show the menu even if their role normally doesn't have it.
    apiClient<any[]>('/ppdb/penguji/tes')
      .then(res => setHasPenilaianTests(res && res.length > 0))
      .catch(() => setHasPenilaianTests(false));
  }, [permissionsLoaded, user]);

  // Route protection: redirect only after permissions have actually loaded
  useEffect(() => {
    if (!permissionsLoaded || !user) return;
    // Don't protect until the dynamic evaluation is complete
    if (hasPenilaianTests === null && user.role !== 'admin') return;
    
    const pathSegment = location.pathname.replace('/dashboard', '').replace(/^\//, '').split('/')[0] || '';
    
    // Exact path matching for nested route logic
    let menuKey = ROUTE_TO_MENU_KEY[pathSegment];
    if (location.pathname.includes('/ppdb/penilaian')) {
      menuKey = 'penilaian-pmb';
    }

    const finalAllowed = [...allowedMenus];
    if (hasPenilaianTests === true && !finalAllowed.includes('penilaian-pmb')) {
      finalAllowed.push('penilaian-pmb'); // Force inject permission
    } else if (hasPenilaianTests === false) {
      const idx = finalAllowed.indexOf('penilaian-pmb');
      if (idx > -1) finalAllowed.splice(idx, 1); // Force remove permission
    }

    if (menuKey && !finalAllowed.includes(menuKey)) {
      navigate('/dashboard', { replace: true });
    }
  }, [permissionsLoaded, allowedMenus, hasPenilaianTests, location.pathname, navigate, user]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  // Filter menu items based on permissions
  const finalAllowedMenusForRender = [...allowedMenus];
  if (hasPenilaianTests === true && !finalAllowedMenusForRender.includes('penilaian-pmb')) {
    finalAllowedMenusForRender.push('penilaian-pmb'); // Force inject permission
  } else if (hasPenilaianTests === false) {
    const idx = finalAllowedMenusForRender.indexOf('penilaian-pmb');
    if (idx > -1) finalAllowedMenusForRender.splice(idx, 1); // Force remove permission
  }

  // Hide until we are sure, to prevent menu flash 
  if (hasPenilaianTests === null && user?.role !== 'admin') {
    const idx = finalAllowedMenusForRender.indexOf('penilaian-pmb');
    if (idx > -1) finalAllowedMenusForRender.splice(idx, 1);
  }

  const mainMenuItems = ALL_MENU_ITEMS.filter((item) => item.group === 'main' && finalAllowedMenusForRender.includes(item.key));
  const systemMenuItems = ALL_MENU_ITEMS.filter((item) => item.group === 'system' && finalAllowedMenusForRender.includes(item.key));

  const topMobileNavKeys = ['news', 'gallery', 'students', 'ptsp'];
  const mobileNavItemsMap = new Map(
    ALL_MENU_ITEMS
      .filter(item => topMobileNavKeys.includes(item.key) && finalAllowedMenusForRender.includes(item.key))
      .map(item => [item.key, item])
  );
  
  const leftNavItems = [mobileNavItemsMap.get('news'), mobileNavItemsMap.get('gallery')].filter(Boolean);
  const rightNavItems = [mobileNavItemsMap.get('students'), mobileNavItemsMap.get('ptsp')].filter(Boolean);

  const getMobileLabel = (key: string, originalLabel: string) => {
    if (key === 'news') return 'Berita';
    if (key === 'gallery') return 'Galeri';
    if (key === 'students') return 'Siswa';
    if (key === 'ptsp') return 'Layanan';
    return originalLabel.split(' ')[0];
  };

  return (
    <div className="flex h-[100dvh] print:h-auto print:min-h-0 w-screen print:w-full overflow-hidden print:overflow-visible print:block bg-gray-50 dark:bg-[#050505] relative">
      
      <aside 
        className="hidden md:flex fixed inset-y-0 left-0 z-50 w-56 border-r border-border-light dark:border-border-dark bg-white dark:bg-background-dark flex-col md:relative print:hidden"
      >
        <div className="px-3 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-7 h-7 object-contain" />
            )}
            <h1 className="text-base font-heading font-bold text-primary">MANDALOTIM</h1>
          </div>
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
        <header className="h-14 md:h-12 border-b border-border-light dark:border-border-dark bg-white/90 dark:bg-background-dark/90 backdrop-blur-md md:bg-white md:dark:bg-background-dark flex items-center justify-between px-4 sm:px-5 shrink-0 z-30 print:hidden relative md:sticky top-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">M</div>
              )}
              <h1 className="text-base font-heading font-bold text-primary tracking-tight">MANDALOTIM</h1>
            </div>
            <div className="hidden md:flex items-center gap-3">
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
        <div className="flex-1 p-4 sm:p-5 print:p-0 overflow-auto print:overflow-visible print:block custom-scrollbar pb-24 md:pb-5">
          <Outlet />
        </div>
      </main>

      {/* --- MOBILE UI COMPONENTS --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-border-light dark:border-border-dark z-50 flex items-center justify-evenly px-1 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
        
        {/* Left Items */}
        {leftNavItems.map(item => item && (
          <NavLink
            key={item.key}
            to={item.href}
            end={item.exact}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'}`}
          >
            <div className="[&>svg]:w-6 [&>svg]:h-6 flex items-center justify-center mb-0.5">
              {item.icon}
            </div>
            <span className="text-[10px] font-semibold leading-none">{getMobileLabel(item.key, item.label)}</span>
          </NavLink>
        ))}

        {/* Center Special Menu Button (FAB style) */}
        <div className="relative flex-1 flex justify-center items-end h-full max-w-[80px]">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`absolute -top-5 flex flex-col items-center justify-center w-[60px] h-[60px] rounded-full transition-all duration-300 border-[5px] border-white dark:border-[#050505] shadow-lg ${
              isMobileMenuOpen 
                ? 'bg-primary text-white scale-95 shadow-inner' 
                : 'bg-primary text-white hover:bg-primary/90 hover:scale-105 shadow-primary/30'
            }`}
          >
            <div className={`[&>svg]:w-7 [&>svg]:h-7 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90 scale-110' : 'rotate-0'}`}>
              <LayoutGrid />
            </div>
          </button>
          <span className={`text-[10px] font-semibold leading-none mb-1.5 transition-colors ${isMobileMenuOpen ? 'text-primary' : 'text-text-secondary'}`}>Menu</span>
        </div>

        {/* Right Items */}
        {rightNavItems.map(item => item && (
          <NavLink
            key={item.key}
            to={item.href}
            end={item.exact}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'}`}
          >
            <div className="[&>svg]:w-6 [&>svg]:h-6 flex items-center justify-center mb-0.5">
              {item.icon}
            </div>
            <span className="text-[10px] font-semibold leading-none">{getMobileLabel(item.key, item.label)}</span>
          </NavLink>
        ))}
        
      </nav>

      <div 
        className={`md:hidden fixed inset-x-0 bottom-16 top-14 z-40 bg-gray-50/98 dark:bg-[#050505]/98 backdrop-blur-xl transform transition-all duration-300 ease-out flex flex-col overflow-hidden ${
          isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">Eksplorasi Menu</h2>
            <p className="text-xs text-text-secondary">Pilih menu untuk mengakses fitur aplikasi</p>
          </div>
          
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-text-secondary/70 uppercase tracking-widest mb-4">Main Menu</h3>
            <div className="grid grid-cols-4 gap-x-3 gap-y-5">
              {mainMenuItems.map(item => (
                 <NavLink
                   key={item.href}
                   to={item.href}
                   end={item.exact}
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="flex flex-col items-center gap-2.5 text-center group"
                 >
                   {({ isActive }) => (
                     <>
                       <div className={`w-[64px] h-[64px] rounded-2xl flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-white dark:bg-[#111111] shadow-sm border border-black/5 dark:border-white/5 text-text-secondary group-active:scale-95'}`}>
                         <div className="[&>svg]:w-[26px] [&>svg]:h-[26px]">
                           {item.icon}
                         </div>
                       </div>
                       <span className={`text-[10px] font-semibold leading-tight line-clamp-2 px-1 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                         {item.label}
                       </span>
                     </>
                   )}
                 </NavLink>
              ))}
            </div>
          </div>

          {systemMenuItems.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-text-secondary/70 uppercase tracking-widest mb-4">System</h3>
              <div className="grid grid-cols-4 gap-x-3 gap-y-5">
                {systemMenuItems.map(item => (
                   <NavLink
                     key={item.href}
                     to={item.href}
                     onClick={() => setIsMobileMenuOpen(false)}
                     className="flex flex-col items-center gap-2.5 text-center group"
                   >
                     {({ isActive }) => (
                       <>
                         <div className={`w-[64px] h-[64px] rounded-2xl flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-white dark:bg-[#111111] shadow-sm border border-black/5 dark:border-white/5 text-text-secondary group-active:scale-95'}`}>
                           <div className="[&>svg]:w-[26px] [&>svg]:h-[26px]">
                             {item.icon}
                           </div>
                         </div>
                         <span className={`text-[10px] font-semibold leading-tight line-clamp-2 px-1 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                           {item.label}
                         </span>
                       </>
                     )}
                   </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
