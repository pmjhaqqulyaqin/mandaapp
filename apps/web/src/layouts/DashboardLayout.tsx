import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@mandaapp/ui';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, API_BASE_URL } from '../lib/api';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSiteSettings } from '../hooks/api/useSettings';
import { NetworkStatusBanner } from '../components/NetworkStatusBanner';
import {
  Home,
  Newspaper,
  Calendar,
  CalendarDays,
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
  QrCode,
  GraduationCap,
  Star,
  LayoutGrid,
  BookOpen,
  NotebookPen,
  ClipboardList,
  Wifi,
  WifiOff,
  Loader2,
  CloudOff,
} from 'lucide-react';
import { ProfileModal } from '../components/modals/ProfileModal';

// ── Standalone Network Status Icon ──
const NetworkStatusIcon = () => {
  const { isOnline, pendingCount, isSyncing } = useNetworkStatus();

  if (isSyncing) {
    return (
      <div className="relative" title={`Menyinkronkan ${pendingCount} data...`}>
        <Loader2 size={16} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="relative" title={`Offline — ${pendingCount} data menunggu sync`}>
        <WifiOff size={16} className="text-orange-500" />
        {pendingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-orange-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="relative" title={`Online — ${pendingCount} data menunggu sync`}>
        <CloudOff size={16} className="text-amber-500" />
        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      </div>
    );
  }

  return null;
};

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
    key: 'attendance',
    label: 'Presensi Siswa',
    href: '/dashboard/attendance',
    icon: <QrCode size={16} />,
    group: 'main',
  },
  {
    key: 'jurnal',
    label: 'Jurnal Mengajar',
    href: '/dashboard/jurnal',
    icon: <NotebookPen size={16} />,
    group: 'main',
  },
  {
    key: 'kbm',
    label: 'Pembagian Tugas KBM',
    href: '/dashboard/kbm',
    icon: <ClipboardList size={16} />,
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
    label: 'Manajemen Siswa & Buku Induk',
    href: '/dashboard/students',
    icon: <Users size={16} />,
    group: 'main',
  },
  {
    key: 'alumni',
    label: 'Data Alumni',
    href: '/dashboard/alumni',
    icon: <GraduationCap size={16} />,
    group: 'main',
  },
  {
    key: 'mutasi',
    label: 'Data Mutasi',
    href: '/dashboard/mutasi',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.828l-6.536-6.536"/><path d="M12 13.7a4 4 0 0 1 1.172-2.828l6.536-6.536"/></svg>,
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
    key: 'ijazah',
    label: 'Pengolahan Ijazah',
    href: '/dashboard/ijazah',
    icon: <BookOpen size={16} />,
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

// ── Colorful icon backgrounds for mobile bottom-sheet grid ──
const MENU_ICON_COLORS: Record<string, { bg: string; text: string }> = {
  'overview':      { bg: 'bg-gradient-to-br from-blue-500 to-blue-600',       text: 'text-white' },
  'news':          { bg: 'bg-gradient-to-br from-orange-400 to-orange-500',    text: 'text-white' },
  'gallery':       { bg: 'bg-gradient-to-br from-pink-400 to-rose-500',       text: 'text-white' },
  'calendar':      { bg: 'bg-gradient-to-br from-red-400 to-red-500',         text: 'text-white' },
  'student-card':  { bg: 'bg-gradient-to-br from-cyan-400 to-cyan-500',       text: 'text-white' },
  'employees':     { bg: 'bg-gradient-to-br from-teal-400 to-teal-500',       text: 'text-white' },
  'attendance':    { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-500', text: 'text-white' },
  'jurnal':        { bg: 'bg-gradient-to-br from-lime-500 to-green-500',      text: 'text-white' },
  'kbm':           { bg: 'bg-gradient-to-br from-amber-500 to-orange-500',    text: 'text-white' },
  'nis':           { bg: 'bg-gradient-to-br from-violet-400 to-violet-500',   text: 'text-white' },
  'students':      { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-500',   text: 'text-white' },
  'buku-induk':    { bg: 'bg-gradient-to-br from-blue-400 to-cyan-500',       text: 'text-white' },
  'e-office':      { bg: 'bg-gradient-to-br from-amber-400 to-amber-500',     text: 'text-white' },
  'exams':         { bg: 'bg-gradient-to-br from-purple-500 to-purple-600',   text: 'text-white' },
  'ppdb':          { bg: 'bg-gradient-to-br from-sky-400 to-sky-500',         text: 'text-white' },
  'penilaian-pmb': { bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',    text: 'text-white' },
  'ijazah':        { bg: 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-500', text: 'text-white' },
  'ptsp':          { bg: 'bg-gradient-to-br from-blue-400 to-indigo-500',     text: 'text-white' },
  'contacts':      { bg: 'bg-gradient-to-br from-green-400 to-emerald-500',   text: 'text-white' },
  'alumni':        { bg: 'bg-gradient-to-br from-blue-400 to-indigo-500',     text: 'text-white' },
  'mutasi':        { bg: 'bg-gradient-to-br from-rose-400 to-red-500',        text: 'text-white' },
  // System
  'pages':         { bg: 'bg-gradient-to-br from-slate-400 to-slate-500',     text: 'text-white' },
  'menus':         { bg: 'bg-gradient-to-br from-stone-400 to-stone-500',     text: 'text-white' },
  'settings':      { bg: 'bg-gradient-to-br from-gray-500 to-gray-600',       text: 'text-white' },
  'users':         { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',     text: 'text-white' },
  'updates':       { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',    text: 'text-white' },
};

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
  'buku-induk': 'buku-induk',
  'ijazah': 'ijazah',
  'nis': 'nis',
  'employees': 'employees',
  'attendance': 'attendance',
  'jurnal': 'jurnal',
  'kbm': 'kbm',
  'alumni': 'alumni',
  'mutasi': 'mutasi',
  'exams': 'exams',
  'ppdb': 'ppdb',
  'ppdb/penilaian': 'penilaian-pmb',
};

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeBottomSheet, setActiveBottomSheet] = useState<'menu' | null>(null);
  
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
      : user?.role === 'operator' ? 'Operator'
      : user?.role === 'guru' ? 'Guru'
      : 'Siswa';

  // Resolve logo URL from system settings
  const logoRaw = get('logo_url');
  const logoUrl = logoRaw ? (logoRaw.startsWith('/') ? `${SERVER_BASE}${logoRaw}` : logoRaw) : undefined;

  // Fetch role permissions + penilaian tests in PARALLEL (not sequential)
  useEffect(() => {
    if (!user) return;

    // Fire both requests simultaneously to avoid waterfall
    const fetchPermissions = apiClient<{ permissions: Record<string, string[]>; allMenus: string[] }>('/users/role-permissions')
      .then(result => {
        const role = user?.role || 'student';
        if (role === 'admin') {
          setAllowedMenus(result.allMenus);
        } else {
          const roleMenus = result.permissions[role] || [];
          // If server returns empty permissions for a valid staff role, 
          // keep all menus accessible (new user race condition)
          setAllowedMenus(roleMenus.length > 0 ? roleMenus : ALL_MENU_ITEMS.map(i => i.key));
        }
      })
      .catch(err => {
        console.error('Failed to fetch permissions:', err);
        // On error, keep ALL menus visible — don't lock users out
        setAllowedMenus(ALL_MENU_ITEMS.map((i) => i.key));
      })
      .finally(() => setPermissionsLoaded(true));

    // Penilaian tests — fire in parallel, not after permissions
    if (user.role === 'admin') {
      setHasPenilaianTests(true);
    } else {
      apiClient<any[]>('/ppdb/penguji/tes')
        .then(res => setHasPenilaianTests(res && res.length > 0))
        .catch(() => setHasPenilaianTests(false));
    }
  }, [user?.id, user?.role]);

  // Route protection: redirect only after permissions have loaded AND settled
  // Use a mount timestamp to avoid redirecting during async permission loading
  const [mountTime] = useState(() => Date.now());
  useEffect(() => {
    if (!permissionsLoaded || !user) return;
    // Don't protect until the dynamic evaluation is complete
    if (hasPenilaianTests === null && user.role !== 'admin') return;
    // Grace period: don't redirect within first 3 seconds of mount
    // This prevents premature redirects when role/permissions are still settling
    if (Date.now() - mountTime < 3000) return;
    
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
  }, [permissionsLoaded, allowedMenus, hasPenilaianTests, location.pathname, navigate, user, mountTime]);

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

  const mainMenuItems = ALL_MENU_ITEMS.filter((item) => 
    item.group === 'main' && 
    finalAllowedMenusForRender.includes(item.key)
  );
  const systemMenuItems = ALL_MENU_ITEMS.filter((item) => item.group === 'system' && finalAllowedMenusForRender.includes(item.key));

  // ── Categorized menu sections for unified grid ──
  const frequentKeys = ['jurnal', 'kbm', 'attendance', 'employees', 'e-office'];
  const infoKeys = ['news', 'gallery', 'contacts', 'calendar'];
  const siswaKeys = ['students', 'buku-induk', 'student-card', 'nis', 'ijazah', 'alumni', 'mutasi', 'ppdb', 'penilaian-pmb'];
  const layananKeys = ['ptsp', 'exams'];

  const menuSections = [
    { title: 'Sering Diakses', keys: frequentKeys },
    { title: 'Informasi', keys: infoKeys },
    { title: 'Kesiswaan', keys: siswaKeys },
    { title: 'Layanan', keys: layananKeys },
  ];

  const getMenuItemsByKeys = (keys: string[]) =>
    keys.map(k => mainMenuItems.find(i => i.key === k)).filter(Boolean) as typeof mainMenuItems;

  // Items not in any category (catch-all)
  const categorizedKeys = new Set([...frequentKeys, ...infoKeys, ...siswaKeys, ...layananKeys, 'overview']);
  const uncategorizedItems = mainMenuItems.filter(i => !categorizedKeys.has(i.key));

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
        <header className="h-14 md:h-12 border-b border-border-light dark:border-border-dark bg-white/90 dark:bg-background-dark/90 backdrop-blur-md md:bg-white md:dark:bg-background-dark flex items-center justify-between px-4 sm:px-5 shrink-0 z-50 print:hidden relative md:sticky top-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2.5 min-w-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">M</div>
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-text-primary dark:text-text-darkPrimary truncate leading-tight">
                  Halo, {user?.name?.split(' ')[0] || 'User'}! 👋
                </p>
                <p className="text-[10px] font-semibold text-primary truncate leading-tight">
                  {roleLabel}
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {user?.image ? (
                <img src={user.image.startsWith('http') ? user.image : `${SERVER_BASE}${user.image}`} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold uppercase shrink-0">
                  {user?.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-text-primary dark:text-text-darkPrimary truncate leading-tight">{user?.name}</h3>
                <p className="text-[11px] font-medium text-primary truncate leading-tight">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <NetworkStatusIcon />
            <ThemeToggle />
            {/* Mobile: Avatar button → opens ProfileModal directly */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="md:hidden w-9 h-9 rounded-full overflow-hidden shadow-sm active:scale-95 transition-transform shrink-0"
            >
              {user?.image ? (
                <img src={user.image.startsWith('http') ? user.image : `${SERVER_BASE}${user.image}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center text-sm font-bold uppercase">
                  {user?.name?.charAt(0) || '?'}
                </div>
              )}
            </button>
            {/* Desktop: Dropdown menu */}
            <div id="profile-dropdown-container" className="relative hidden md:block">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center text-text-secondary hover:text-primary transition-colors border border-border-light dark:border-border-dark"
              >
                <ChevronDown size={14} />
              </button>
              
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111111] border border-border-light dark:border-border-dark rounded-lg shadow-lg py-1 z-[100] overflow-hidden">
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
        <NetworkStatusBanner />
        <div className="flex-1 px-3 pt-1 pb-24 md:p-5 md:pb-5 print:p-0 overflow-auto print:overflow-visible print:block custom-scrollbar">
          <Outlet />
        </div>
      </main>

      {/* --- MOBILE UI COMPONENTS --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-border-light dark:border-border-dark z-50 flex items-center justify-evenly px-1 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
        
        {/* Beranda */}
        {(() => {
          const isActive = location.pathname === '/dashboard' && activeBottomSheet === null;
          return (
            <button onClick={() => { setActiveBottomSheet(null); navigate('/dashboard'); }} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
              <div className={`[&>svg]:w-[22px] [&>svg]:h-[22px] flex items-center justify-center ${isActive ? '[&>svg]:stroke-[2.5]' : ''}`}><Home /></div>
              <span className="text-[11px] font-semibold leading-none">Beranda</span>
              <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isActive ? 'bg-primary scale-100' : 'bg-transparent scale-0'}`} />
            </button>
          );
        })()}

        {/* Jurnal */}
        {(() => {
          const isActive = location.pathname.startsWith('/dashboard/jurnal') && activeBottomSheet === null;
          return (
            <button onClick={() => { setActiveBottomSheet(null); navigate('/dashboard/jurnal'); }} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
              <div className={`[&>svg]:w-[22px] [&>svg]:h-[22px] flex items-center justify-center ${isActive ? '[&>svg]:stroke-[2.5]' : ''}`}><NotebookPen /></div>
              <span className="text-[11px] font-semibold leading-none">Jurnal</span>
              <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isActive ? 'bg-primary scale-100' : 'bg-transparent scale-0'}`} />
            </button>
          );
        })()}

        {/* Center Special Menu Button (FAB style) */}
        <div className="relative flex-1 flex justify-center items-end h-full max-w-[80px]">
          <button
            onClick={() => setActiveBottomSheet(activeBottomSheet === 'menu' ? null : 'menu')}
            className={`absolute -top-5 flex flex-col items-center justify-center w-[58px] h-[58px] rounded-full transition-all duration-300 border-[4px] border-white dark:border-[#050505] shadow-lg active:scale-90 ${
              activeBottomSheet === 'menu' 
                ? 'bg-primary text-white scale-95 shadow-inner' 
                : 'bg-primary text-white shadow-primary/30'
            }`}
          >
            <div className={`[&>svg]:w-[26px] [&>svg]:h-[26px] transition-transform duration-300 ${activeBottomSheet === 'menu' ? 'rotate-90 scale-110' : 'rotate-0'}`}>
              <LayoutGrid />
            </div>
          </button>
          <span className={`text-[11px] font-bold leading-none mb-1.5 transition-colors ${activeBottomSheet === 'menu' ? 'text-primary' : 'text-text-secondary'}`}>Menu</span>
        </div>

        {/* Presensi */}
        {(() => {
          const isActive = location.pathname.startsWith('/dashboard/attendance') && activeBottomSheet === null;
          return (
            <button onClick={() => { setActiveBottomSheet(null); navigate('/dashboard/attendance'); }} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
              <div className={`[&>svg]:w-[22px] [&>svg]:h-[22px] flex items-center justify-center ${isActive ? '[&>svg]:stroke-[2.5]' : ''}`}><QrCode /></div>
              <span className="text-[11px] font-semibold leading-none">Presensi</span>
              <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isActive ? 'bg-primary scale-100' : 'bg-transparent scale-0'}`} />
            </button>
          );
        })()}

        {/* Kalender */}
        {(() => {
          const isActive = location.pathname.startsWith('/dashboard/calendar') && activeBottomSheet === null;
          return (
            <button onClick={() => { setActiveBottomSheet(null); navigate('/dashboard/calendar'); }} className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 active:scale-95 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
              <div className={`[&>svg]:w-[22px] [&>svg]:h-[22px] flex items-center justify-center ${isActive ? '[&>svg]:stroke-[2.5]' : ''}`}><CalendarDays /></div>
              <span className="text-[11px] font-semibold leading-none">Kalender</span>
              <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isActive ? 'bg-primary scale-100' : 'bg-transparent scale-0'}`} />
            </button>
          );
        })()}
        
      </nav>

      <div 
        className={`md:hidden fixed inset-x-0 bottom-16 top-14 z-40 bg-gray-50/98 dark:bg-[#050505]/98 backdrop-blur-xl transform transition-all duration-300 ease-out flex flex-col overflow-hidden ${
          activeBottomSheet ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-10">
          
          {/* UNIFIED MENU GRID */}
          {activeBottomSheet === 'menu' && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-0.5">Eksplorasi Menu</h2>
                <p className="text-xs text-text-secondary">Akses semua fitur SIMANDA</p>
              </div>
              
              {menuSections.map(section => {
                const items = getMenuItemsByKeys(section.keys);
                if (items.length === 0) return null;
                return (
                  <div key={section.title} className="mb-6">
                    <h3 className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest mb-3">{section.title}</h3>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                      {items.map(item => {
                        const colors = MENU_ICON_COLORS[item.key] || { bg: 'bg-gradient-to-br from-gray-400 to-gray-500', text: 'text-white' };
                        return (
                          <button
                            key={item.href}
                            onClick={() => { setActiveBottomSheet(null); navigate(item.href); }}
                            className="flex flex-col items-center gap-2 text-center group"
                          >
                            <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 ${colors.bg} ${colors.text} shadow-md group-active:scale-90`}>
                              <div className="[&>svg]:w-[22px] [&>svg]:h-[22px]">
                                {item.icon}
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold leading-tight line-clamp-2 px-0.5 text-text-secondary dark:text-gray-400">
                              {item.label.split(' ').slice(0, 2).join(' ')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Uncategorized items catch-all */}
              {uncategorizedItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest mb-3">Lainnya</h3>
                  <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                    {uncategorizedItems.map(item => {
                      const colors = MENU_ICON_COLORS[item.key] || { bg: 'bg-gradient-to-br from-gray-400 to-gray-500', text: 'text-white' };
                      return (
                        <button
                          key={item.href}
                          onClick={() => { setActiveBottomSheet(null); navigate(item.href); }}
                          className="flex flex-col items-center gap-2 text-center group"
                        >
                          <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 ${colors.bg} ${colors.text} shadow-md group-active:scale-90`}>
                            <div className="[&>svg]:w-[22px] [&>svg]:h-[22px]">
                              {item.icon}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold leading-tight line-clamp-2 px-0.5 text-text-secondary dark:text-gray-400">
                            {item.label.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {systemMenuItems.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest mb-3">Sistem</h3>
                  <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                    {systemMenuItems.map(item => {
                      const colors = MENU_ICON_COLORS[item.key] || { bg: 'bg-gradient-to-br from-gray-400 to-gray-500', text: 'text-white' };
                      return (
                        <button
                          key={item.href}
                          onClick={() => { setActiveBottomSheet(null); navigate(item.href); }}
                          className="flex flex-col items-center gap-2 text-center group"
                        >
                          <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 ${colors.bg} ${colors.text} shadow-md group-active:scale-90`}>
                            <div className="[&>svg]:w-[22px] [&>svg]:h-[22px]">
                              {item.icon}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold leading-tight line-clamp-2 px-0.5 text-text-secondary dark:text-gray-400">
                            {item.label.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={handleLogout}
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
