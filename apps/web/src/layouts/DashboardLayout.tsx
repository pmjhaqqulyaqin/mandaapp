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
  Database,
  ArrowLeftRight,
  Shield,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Eye,
  Pencil,
  Printer,
  ArrowLeft,
  History,
  Palette,
  DoorOpen,
  ListChecks,
  FileSpreadsheet,
  MapPin,
  Link,
  Globe,
  Wrench,
  Monitor,
  ScrollText,
  Lock,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  BarChart3,
  Trophy,
  LayoutDashboard,
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
    key: 'identity',
    label: 'Identitas Sekolah',
    href: '/dashboard/settings',
    exact: true,
    icon: <Home size={16} />,
    group: 'master',
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
    key: 'teacher-duties',
    label: 'Jadwal Tugas Guru',
    href: '/dashboard/teacher-duties',
    icon: <ClipboardList size={16} />,
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
    key: 'subjects',
    label: 'Mata Pelajaran',
    href: '/dashboard/subjects',
    icon: <BookOpen size={16} />,
    group: 'master',
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
    subItems: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard/kbm', exact: true, icon: <BarChart3 size={16} /> },
      { key: 'distribusi', label: 'Distribusi Jam', href: '/dashboard/kbm/distribusi', icon: <BookOpen size={16} /> },
      { key: 'tugas', label: 'Tugas Tambahan', href: '/dashboard/kbm/tugas', icon: <Users size={16} /> },
      { key: 'jadwal', label: 'Jadwal', href: '/dashboard/kbm/jadwal', icon: <Calendar size={16} /> },
      { key: 'settings', label: 'Pengaturan', href: '/dashboard/kbm/settings', icon: <SettingsIcon size={16} /> },
    ],
  },
  {
    key: 'nis',
    label: 'Manajemen NIS',
    href: '/dashboard/nis',
    icon: <Hash size={16} />,
    group: 'main',
    subItems: [
      { key: 'records', label: 'Bank Data NIS', href: '/dashboard/nis', exact: true, icon: <Hash size={16} /> },
      { key: 'batch', label: 'Generate Batch', href: '/dashboard/nis/batch', icon: <Users size={16} /> },
      { key: 'single', label: 'Entri Satuan', href: '/dashboard/nis/single', icon: <UserIcon size={16} /> },
    ],
  },
  {
    key: 'students',
    label: 'Manajemen Siswa & Buku Induk',
    href: '/dashboard/students',
    icon: <Users size={16} />,
    group: 'main',
    subItems: [
      { key: 'list', label: 'Data Siswa', href: '/dashboard/students', exact: true, icon: <Users size={16} /> },
      { key: 'classes', label: 'Kelas & Rombel', href: '/dashboard/students/classes', icon: <LayoutGrid size={16} /> },
    ],
  },
  {
    key: 'alumni',
    label: 'Data Alumni',
    href: '/dashboard/alumni',
    icon: <GraduationCap size={16} />,
    group: 'main',
    subItems: [
      { key: 'overview', label: 'Overview', href: '/dashboard/alumni', exact: true, icon: <LayoutDashboard size={16} /> },
      { key: 'directory', label: 'Daftar Alumni', href: '/dashboard/alumni/directory', icon: <Users size={16} /> },
      { key: 'tracer-study', label: 'Tracer Study', href: '/dashboard/alumni/tracer-study', icon: <ClipboardList size={16} /> },
      { key: 'settings', label: 'Pengaturan', href: '/dashboard/alumni/settings', icon: <SettingsIcon size={16} /> },
    ],
  },
  {
    key: 'mutasi',
    label: 'Data Mutasi',
    href: '/dashboard/mutasi',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.828l-6.536-6.536"/><path d="M12 13.7a4 4 0 0 1 1.172-2.828l6.536-6.536"/></svg>,
    group: 'main',
    subItems: [
      { key: 'overview', label: 'Overview', href: '/dashboard/mutasi', exact: true, icon: <LayoutDashboard size={16} /> },
      { key: 'directory', label: 'Daftar Siswa', href: '/dashboard/mutasi/directory', icon: <Users size={16} /> },
      { key: 'masuk', label: 'Mutasi Masuk', href: '/dashboard/mutasi/masuk', icon: <ArrowDownToLine size={16} /> },
      { key: 'keluar', label: 'Mutasi Keluar', href: '/dashboard/mutasi/keluar', icon: <ArrowUpFromLine size={16} /> },
      { key: 'internal', label: 'Mutasi Internal', href: '/dashboard/mutasi/internal', icon: <RefreshCw size={16} /> },
      { key: 'laporan', label: 'Laporan', href: '/dashboard/mutasi/laporan', icon: <FileText size={16} /> },
    ],
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
    subItems: [
      { key: 'overview', label: 'Overview', href: '/dashboard/ppdb', exact: true, icon: <BarChart3 size={16} /> },
      { key: 'pendaftar', label: 'Data Pendaftar', href: '/dashboard/ppdb/pendaftar', icon: <Users size={16} /> },
      { key: 'daftar_ulang', label: 'Daftar Ulang', href: '/dashboard/ppdb/daftar_ulang', icon: <ClipboardList size={16} /> },
      { key: 'seleksi', label: 'Seleksi & Pengumuman', href: '/dashboard/ppdb/seleksi', icon: <Trophy size={16} /> },
      { key: 'konfigurasi', label: 'Konfigurasi', href: '/dashboard/ppdb/konfigurasi', icon: <SettingsIcon size={16} /> },
    ],
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
    subItems: [
      { key: 'students', label: 'Data Siswa XII', href: '/dashboard/ijazah', exact: true, icon: <Users size={16} /> },
      { key: 'settings', label: 'Pengaturan & Mapel', href: '/dashboard/ijazah/settings', icon: <SettingsIcon size={16} /> },
      { key: 'global', label: 'Semester 1-2', href: '/dashboard/ijazah/global', icon: <BookOpen size={16} /> },
      { key: 'rombel', label: 'Per Rombel', href: '/dashboard/ijazah/rombel', icon: <FileSpreadsheet size={16} /> },
      { key: 'export', label: 'Ekspor Leger', href: '/dashboard/ijazah/export', icon: <FileText size={16} /> },
    ],
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
    subItems: [
      { key: 'logo', label: 'Logo & Kop Dokumen', href: '/dashboard/settings/logo', icon: <ImageIcon size={16} /> },
      { key: 'social', label: 'Media Sosial', href: '/dashboard/settings/social', icon: <Globe size={16} /> },
      { key: 'map', label: 'Lokasi & Peta', href: '/dashboard/settings/map', icon: <MapPin size={16} /> },
      { key: 'links', label: 'Website Terkait', href: '/dashboard/settings/links', icon: <Link size={16} /> },
      { key: 'system', label: 'Pengaturan Sistem', href: '/dashboard/settings/system', icon: <Wrench size={16} /> },
    ],
  },
  {
    key: 'users',
    label: 'Manajemen Users',
    href: '/dashboard/users',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    group: 'system',
    subItems: [
      { key: 'list', label: 'Daftar Pengguna', href: '/dashboard/users', exact: true, icon: <Users size={16} /> },
      { key: 'permissions', label: 'Hak Akses Menu', href: '/dashboard/users/permissions', icon: <Lock size={16} /> },
      { key: 'audit', label: 'Audit Log', href: '/dashboard/users/audit', icon: <ScrollText size={16} /> },
      { key: 'sessions', label: 'Sessions Aktif', href: '/dashboard/users/sessions', icon: <Monitor size={16} /> },
    ],
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
  'subjects':      { bg: 'bg-gradient-to-br from-red-500 to-rose-600',        text: 'text-white' },
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
  // Data Master
  'identity':      { bg: 'bg-gradient-to-br from-sky-400 to-blue-500',        text: 'text-white' },
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
  'teacher-duties': 'teacher-duties',
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
  'subjects': 'subjects',
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

// ── Sidebar category system ──
type MenuCategory = 'app-master' | 'data-master' | 'mutasi-pmb' | 'alumni' | 'app-dashboard' | 'administrator';

interface SidebarCategoryDef {
  key: MenuCategory;
  label: string;
  icon: React.ReactNode;
}

const SIDEBAR_CATEGORIES: SidebarCategoryDef[] = [
  { key: 'app-master', label: 'APP MASTER', icon: <Home size={18} /> },
  { key: 'data-master', label: 'DATA MASTER', icon: <Database size={18} /> },
  { key: 'mutasi-pmb', label: 'MUTASI DAN PMB', icon: <ArrowLeftRight size={18} /> },
  { key: 'alumni', label: 'ALUMNI', icon: <GraduationCap size={18} /> },
  { key: 'app-dashboard', label: 'APP DASHBOARD', icon: <LayoutGrid size={18} /> },
  { key: 'administrator', label: 'ADMINISTRATOR', icon: <Shield size={18} /> },
];

const MENU_CATEGORY_MAP: Record<string, MenuCategory> = {
  'overview': 'app-master',
  'identity': 'data-master',
  'news': 'app-dashboard',
  'gallery': 'app-dashboard',
  'calendar': 'app-dashboard',
  'teacher-duties': 'data-master',
  'student-card': 'app-dashboard',
  'employees': 'data-master',
  'attendance': 'app-dashboard',
  'jurnal': 'app-dashboard',
  'kbm': 'data-master',
  'subjects': 'data-master',
  'nis': 'data-master',
  'students': 'data-master',
  'alumni': 'alumni',
  'mutasi': 'mutasi-pmb',
  'e-office': 'app-dashboard',
  'exams': 'app-dashboard',
  'ppdb': 'mutasi-pmb',
  'penilaian-pmb': 'mutasi-pmb',
  'ijazah': 'app-dashboard',
  'ptsp': 'app-dashboard',
  'contacts': 'app-dashboard',
  'pages': 'administrator',
  'menus': 'administrator',
  'settings': 'administrator',
  'users': 'administrator',
  'updates': 'administrator',
};

// ── Sub-App Configurations for Contextual Sidebar ──
interface SubAppItem {
  key: string;
  label: string;
  path: string;
  exact?: boolean;
  icon: React.ReactNode;
  roles?: string[];
}

interface SubAppConfig {
  label: string;
  icon: React.ReactNode;
  basePath: string;
  items: SubAppItem[];
}

const SUB_APP_CONFIGS: SubAppConfig[] = [
  {
    label: 'KARTU PELAJAR',
    icon: <CreditCard size={18} />,
    basePath: '/dashboard/student-card',
    items: [
      { key: 'preview', label: 'Preview Kartu', path: '/dashboard/student-card', exact: true, icon: <Eye size={16} /> },
      { key: 'edit', label: 'Edit Identitas', path: '/dashboard/student-card/edit', icon: <Pencil size={16} /> },
      { key: 'settings', label: 'Pengaturan Layout', path: '/dashboard/student-card/settings', icon: <SettingsIcon size={16} />, roles: ['admin'] },
      { key: 'batch', label: 'Cetak Batch', path: '/dashboard/student-card/batch', icon: <Printer size={16} />, roles: ['admin', 'guru'] },
      { key: 'history', label: 'Riwayat Cetak', path: '/dashboard/student-card/history', icon: <History size={16} />, roles: ['admin', 'guru'] },
      { key: 'templates', label: 'Template Kartu', path: '/dashboard/student-card/templates', icon: <Palette size={16} />, roles: ['admin'] },
    ],
  },
  {
    label: 'MANAJEMEN UJIAN',
    icon: <ClipboardCheck size={18} />,
    basePath: '/dashboard/exams',
    items: [
      { key: 'master', label: 'Master Ujian', path: '/dashboard/exams', exact: true, icon: <ClipboardCheck size={16} /> },
      { key: 'jadwal', label: 'Jadwal Ujian', path: '/dashboard/exams/jadwal', icon: <Calendar size={16} /> },
      { key: 'pengawas', label: 'Pengawas', path: '/dashboard/exams/pengawas', icon: <Users size={16} /> },
      { key: 'ruang', label: 'Ruang & Peserta', path: '/dashboard/exams/ruang', icon: <DoorOpen size={16} /> },
      { key: 'kartu', label: 'Kartu & ID', path: '/dashboard/exams/kartu', icon: <CreditCard size={16} /> },
      { key: 'ba', label: 'Berita Acara', path: '/dashboard/exams/ba', icon: <FileText size={16} /> },
      { key: 'dh', label: 'Daftar Hadir', path: '/dashboard/exams/dh', icon: <ListChecks size={16} /> },
      { key: 'nilai', label: 'Format Nilai', path: '/dashboard/exams/nilai', icon: <FileSpreadsheet size={16} /> },
    ],
  },
];

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

  // Sidebar collapse state (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  // Expanded sidebar groups (persisted in localStorage)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded-groups');
      return saved ? JSON.parse(saved) : ['app-master'];
    } catch { return ['app-master']; }
  });

  // Expanded sub-menu items (for items with subItems like Pengaturan Sistem)
  const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(() => {
    // Auto-expand if currently on a sub-item page
    if (location.pathname.startsWith('/dashboard/settings')) return 'settings';
    if (location.pathname.startsWith('/dashboard/users')) return 'users';
    if (location.pathname.startsWith('/dashboard/mutasi')) return 'mutasi';
    if (location.pathname.startsWith('/dashboard/ppdb')) return 'ppdb';
    if (location.pathname.startsWith('/dashboard/alumni')) return 'alumni';
    if (location.pathname.startsWith('/dashboard/kbm')) return 'kbm';
    if (location.pathname.startsWith('/dashboard/nis')) return 'nis';
    if (location.pathname.startsWith('/dashboard/students')) return 'students';
    if (location.pathname.startsWith('/dashboard/ijazah')) return 'ijazah';
    return null;
  });

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
  const schoolName = get('school_name');
  const schoolNpsn = get('npsn');

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

  // Sidebar collapse toggle
  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  // Sidebar group expand/collapse toggle
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey];
      try { localStorage.setItem('sidebar-expanded-groups', JSON.stringify(next)); } catch {}
      return next;
    });
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

  // Auto-expand sidebar group based on active route
  useEffect(() => {
    const activeItem = [...ALL_MENU_ITEMS]
      .filter(item => {
        if (item.exact) return location.pathname === item.href;
        return location.pathname === item.href || location.pathname.startsWith(item.href + '/');
      })
      .sort((a, b) => b.href.length - a.href.length)[0];

    const activeCategory = activeItem ? MENU_CATEGORY_MAP[activeItem.key] : undefined;
    if (activeCategory) {
      setExpandedGroups(prev => {
        if (prev.includes(activeCategory)) return prev;
        const next = [...prev, activeCategory];
        try { localStorage.setItem('sidebar-expanded-groups', JSON.stringify(next)); } catch {}
        return next;
      });
    }

    // Auto-expand sub-menu for items with subItems
    if (location.pathname.startsWith('/dashboard/settings')) {
      setExpandedSubMenu('settings');
    } else if (location.pathname.startsWith('/dashboard/users')) {
      setExpandedSubMenu('users');
    } else if (location.pathname.startsWith('/dashboard/mutasi')) {
      setExpandedSubMenu('mutasi');
    } else if (location.pathname.startsWith('/dashboard/ppdb')) {
      setExpandedSubMenu('ppdb');
    } else if (location.pathname.startsWith('/dashboard/alumni')) {
      setExpandedSubMenu('alumni');
    } else if (location.pathname.startsWith('/dashboard/kbm')) {
      setExpandedSubMenu('kbm');
    } else if (location.pathname.startsWith('/dashboard/nis')) {
      setExpandedSubMenu('nis');
    } else if (location.pathname.startsWith('/dashboard/students')) {
      setExpandedSubMenu('students');
    } else if (location.pathname.startsWith('/dashboard/ijazah')) {
      setExpandedSubMenu('ijazah');
    }
  }, [location.pathname]);

  // Group filtered menu items by category for desktop sidebar
  const categorizedMenuItems = SIDEBAR_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = ALL_MENU_ITEMS.filter(item =>
      MENU_CATEGORY_MAP[item.key] === cat.key &&
      finalAllowedMenusForRender.includes(item.key)
    );
    return acc;
  }, {} as Record<string, typeof ALL_MENU_ITEMS>);

  // Detect active sub-app for contextual sidebar
  const activeSubApp = SUB_APP_CONFIGS.find(config =>
    location.pathname === config.basePath || location.pathname.startsWith(config.basePath + '/')
  );
  const filteredSubAppItems = activeSubApp
    ? activeSubApp.items.filter(item => !item.roles || item.roles.includes(user?.role || ''))
    : [];

  // ── Categorized menu sections for unified grid ──
  const frequentKeys = ['jurnal', 'kbm', 'attendance', 'employees', 'e-office'];
  const infoKeys = ['news', 'gallery', 'contacts', 'calendar'];
  const siswaKeys = ['students', 'buku-induk', 'student-card', 'nis', 'alumni', 'mutasi', 'ppdb', 'penilaian-pmb'];
  const layananKeys = ['ptsp', 'exams', 'ijazah'];

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
        className={`hidden md:flex fixed inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'w-[68px]' : 'w-60'} border-r border-border-light dark:border-border-dark bg-white dark:bg-background-dark flex-col md:relative print:hidden transition-all duration-300 ease-in-out`}
      >
        {/* Sidebar Header — School Branding */}
        <div className={`border-b border-border-light dark:border-border-dark shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
          {isSidebarCollapsed ? (
            <div className="flex justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">M</div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">M</div>
              )}
              <div className="min-w-0">
                <h1 className="text-[13px] font-heading font-bold text-primary leading-tight truncate">{schoolName || 'MANDALOTIM'}</h1>
                <p className="text-[9px] text-text-secondary leading-tight truncate mt-0.5">{schoolNpsn ? `NPSN: ${schoolNpsn}` : 'Sistem Manajemen Pendidikan'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation — Grouped Categories */}
        <nav className={`flex-1 py-2 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar ${isSidebarCollapsed ? 'px-1.5' : 'px-2'}`}>
          {/* ── Contextual Sub-App Section (when inside a sub-app) ── */}
          {activeSubApp && (
            <>
              {/* Back button */}
              {!isSidebarCollapsed ? (
                <NavLink
                  to="/dashboard"
                  end
                  className="flex items-center gap-2 px-2.5 py-2 mb-1 rounded-lg text-[12px] font-medium text-text-secondary hover:text-primary hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke Dashboard</span>
                </NavLink>
              ) : (
                <NavLink
                  to="/dashboard"
                  end
                  className="w-full p-2.5 flex justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors mb-0.5"
                  title="Kembali ke Dashboard"
                >
                  <ArrowLeft size={18} />
                </NavLink>
              )}

              {/* Sub-app items */}
              {!isSidebarCollapsed ? (
                <div className="mb-1">
                  <div className="flex items-center gap-2 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/5 dark:bg-primary/10 rounded-lg">
                    <div className="[&>svg]:w-4 [&>svg]:h-4 shrink-0">{activeSubApp.icon}</div>
                    <span className="flex-1 text-left truncate">{activeSubApp.label}</span>
                  </div>
                  <div className="pl-3 flex flex-col gap-px mt-0.5">
                    {filteredSubAppItems.map(item => (
                      <NavLink
                        key={item.key}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `sidebar-link px-2.5 py-[7px] rounded-md text-[13px] font-medium flex items-center gap-2.5 transition-colors ${
                          isActive
                            ? 'sidebar-link-active bg-primary/10 text-primary dark:bg-primary/20'
                            : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative group/subapp mb-0.5">
                  <div
                    className="w-full p-2.5 flex justify-center rounded-lg transition-colors cursor-pointer bg-primary/10 text-primary"
                    title={activeSubApp.label}
                  >
                    <div className="[&>svg]:w-[18px] [&>svg]:h-[18px]">{activeSubApp.icon}</div>
                  </div>
                  <div className="absolute left-full top-0 hidden group-hover/subapp:block z-[100]">
                    <div className="pl-2">
                      <div className="bg-white dark:bg-[#111] border border-border-light dark:border-border-dark rounded-xl shadow-2xl p-1.5 min-w-[210px]">
                        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 py-1.5 mb-0.5">{activeSubApp.label}</div>
                        {filteredSubAppItems.map(item => (
                          <NavLink
                            key={item.key}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                              isActive
                                ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-text-darkPrimary'
                            }`}
                          >
                            {item.icon}
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Separator */}
              {!isSidebarCollapsed && <div className="h-px bg-border-light dark:bg-border-dark my-2 mx-2" />}
            </>
          )}

          {/* ── Normal Categories ── */}
          {(activeSubApp ? SIDEBAR_CATEGORIES.filter(c => c.key === 'app-dashboard') : SIDEBAR_CATEGORIES).map(cat => {
            const catItems = categorizedMenuItems[cat.key];
            if (!catItems || catItems.length === 0) return null;

            const isExpanded = expandedGroups.includes(cat.key);
            const hasActiveItem = catItems.some(item => {
              if (item.exact) return location.pathname === item.href;
              return location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            });

            {/* ── Collapsed Mode: Icon with flyout popup ── */}
            if (isSidebarCollapsed) {
              return (
                <div key={cat.key} className="relative group/cat mb-0.5">
                  <div
                    className={`w-full p-2.5 flex justify-center rounded-lg transition-colors cursor-pointer ${
                      hasActiveItem
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-text-darkPrimary'
                    }`}
                    title={cat.label}
                  >
                    <div className="[&>svg]:w-[18px] [&>svg]:h-[18px]">{cat.icon}</div>
                  </div>
                  {/* Flyout popup on hover */}
                  <div className="absolute left-full top-0 hidden group-hover/cat:block z-[100]">
                    <div className="pl-2">
                      <div className="bg-white dark:bg-[#111] border border-border-light dark:border-border-dark rounded-xl shadow-2xl p-1.5 min-w-[210px]">
                        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 py-1.5 mb-0.5">{cat.label}</div>
                        {catItems.map(item => {
                          const subs = (item as any).subItems;
                          if (subs && subs.length > 0) {
                            return (
                              <div key={item.href}>
                                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 py-1.5 mt-1">{item.label}</div>
                                {subs.map((sub: any) => (
                                  <NavLink
                                    key={sub.key}
                                    to={sub.href}
                                    end={sub.exact}
                                    className={({ isActive }) => `flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px] font-medium transition-colors ${
                                      isActive
                                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                        : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-text-darkPrimary'
                                    }`}
                                  >
                                    {sub.icon}
                                    {sub.label}
                                  </NavLink>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <NavLink
                              key={item.href}
                              to={item.href}
                              end={item.exact}
                              className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors ${
                                isActive
                                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                  : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-text-darkPrimary'
                              }`}
                            >
                              {item.icon}
                              {item.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            {/* ── Expanded Mode: Collapsible group ── */}
            return (
              <div key={cat.key} className="mb-0.5">
                <button
                  onClick={() => toggleGroup(cat.key)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    hasActiveItem
                      ? 'text-primary bg-primary/5 dark:bg-primary/10'
                      : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-primary dark:hover:text-text-darkPrimary'
                  }`}
                >
                  <div className="[&>svg]:w-4 [&>svg]:h-4 shrink-0">{cat.icon}</div>
                  <span className="flex-1 text-left truncate">{cat.label}</span>
                  <ChevronRight size={12} className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[600px] opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="pl-3 flex flex-col gap-px">
                    {catItems.map(item => {
                      const hasSubItems = (item as any).subItems && (item as any).subItems.length > 0;
                      const isSubExpanded = expandedSubMenu === item.key;
                      const isSubActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');

                      if (hasSubItems) {
                        const subItems = (item as any).subItems as { key: string; label: string; href: string; exact?: boolean; icon: React.ReactNode }[];
                        return (
                          <div key={item.href}>
                            <button
                              onClick={() => {
                                setExpandedSubMenu(isSubExpanded ? null : item.key);
                                if (!isSubActive) navigate(item.href);
                              }}
                              className={`w-full sidebar-link px-2.5 py-[7px] rounded-md text-[13px] font-medium flex items-center gap-2.5 transition-colors ${
                                isSubActive
                                  ? 'sidebar-link-active bg-primary/10 text-primary dark:bg-primary/20'
                                  : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'
                              }`}
                            >
                              {item.icon}
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronDown size={12} className={`transition-transform duration-200 shrink-0 ${isSubExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              isSubExpanded ? 'max-h-[400px] opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                            }`}>
                              <div className="pl-4 flex flex-col gap-px">
                                {subItems.map(sub => (
                                  <NavLink
                                    key={sub.key}
                                    to={sub.href}
                                    end={sub.exact}
                                    className={({ isActive }) => `px-2.5 py-[6px] rounded-md text-[12px] font-medium flex items-center gap-2 transition-colors ${
                                      isActive
                                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                        : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'
                                    }`}
                                  >
                                    {sub.icon}
                                    {sub.label}
                                  </NavLink>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          end={item.exact}
                          className={({ isActive }) => `sidebar-link px-2.5 py-[7px] rounded-md text-[13px] font-medium flex items-center gap-2.5 transition-colors ${
                            isActive
                              ? 'sidebar-link-active bg-primary/10 text-primary dark:bg-primary/20'
                              : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer — Toggle Collapse */}
        <div className="border-t border-border-light dark:border-border-dark shrink-0">
          <button
            onClick={toggleSidebarCollapse}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-text-secondary hover:text-primary hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            {!isSidebarCollapsed && <span className="text-[12px] font-medium">Kecilkan</span>}
          </button>
        </div>
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
            <button
              onClick={toggleSidebarCollapse}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title={isSidebarCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>
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

      {/* CSS for sidebar hover & flyout animations */}
      <style>{`
        .sidebar-link:not(.sidebar-link-active):hover {
          background-color: rgba(0,0,0,0.04);
        }
        .dark .sidebar-link:not(.sidebar-link-active):hover {
          background-color: rgba(255,255,255,0.04);
        }
        /* Flyout popup entrance animation */
        .group\/cat:hover > div:last-child > div {
          animation: sidebarFlyoutIn 0.15s ease-out;
        }
        @keyframes sidebarFlyoutIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
