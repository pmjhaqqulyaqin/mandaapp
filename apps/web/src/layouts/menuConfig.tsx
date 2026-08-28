import React from 'react';
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
  User as UserIcon,
  ClipboardCheck,
  QrCode,
  GraduationCap,
  Star,
  LayoutGrid,
  BookOpen,
  NotebookPen,
  ClipboardList,
  Database,
  ArrowLeftRight,
  Shield,
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
  Megaphone,
  Download,
  Plug,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// MENU CONFIGURATION
// Extracted from DashboardLayout for better maintainability.
// ═══════════════════════════════════════════════════════════════

// All menu items definition with their route paths and icons
export const ALL_MENU_ITEMS = [
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
    key: 'classes',
    label: 'Kelas & Rombel',
    href: '/dashboard/students/classes',
    icon: <LayoutGrid size={16} />,
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
    exact: true,
    icon: <Users size={16} />,
    group: 'main',
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
    key: 'announcements',
    label: 'Popup Pengumuman',
    href: '/dashboard/announcements',
    icon: <Megaphone size={16} />,
    group: 'main',
  },
  {
    key: 'downloads',
    label: 'Unduhan',
    href: '/dashboard/downloads',
    icon: <Download size={16} />,
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
  {
    key: 'integrations',
    label: 'Integrasi API',
    href: '/dashboard/integrations',
    icon: <Plug size={16} />,
    group: 'system',
  },
];

// ── Colorful icon backgrounds for mobile bottom-sheet grid ──
export const MENU_ICON_COLORS: Record<string, { bg: string; text: string }> = {
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
  'classes':       { bg: 'bg-gradient-to-br from-purple-400 to-indigo-500',   text: 'text-white' },
  'e-office':      { bg: 'bg-gradient-to-br from-amber-400 to-amber-500',     text: 'text-white' },
  'exams':         { bg: 'bg-gradient-to-br from-purple-500 to-purple-600',   text: 'text-white' },
  'ppdb':          { bg: 'bg-gradient-to-br from-sky-400 to-sky-500',         text: 'text-white' },
  'penilaian-pmb': { bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',    text: 'text-white' },
  'ijazah':        { bg: 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-500', text: 'text-white' },
  'ptsp':          { bg: 'bg-gradient-to-br from-blue-400 to-indigo-500',     text: 'text-white' },
  'contacts':      { bg: 'bg-gradient-to-br from-green-400 to-emerald-500',   text: 'text-white' },
  'announcements': { bg: 'bg-gradient-to-br from-amber-400 to-orange-500',    text: 'text-white' },
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
  'downloads':     { bg: 'bg-gradient-to-br from-sky-500 to-blue-600',         text: 'text-white' },
  'integrations':  { bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',   text: 'text-white' },
};

// Map route segments to menu keys for route protection
export const ROUTE_TO_MENU_KEY: Record<string, string> = {
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
  'announcements': 'announcements',
  'downloads': 'downloads',
  'integrations': 'integrations',
};

// ── Sidebar category system ──
export type MenuCategory = 'app-master' | 'data-master' | 'mutasi-pmb' | 'alumni' | 'app-dashboard' | 'administrator';

export interface SidebarCategoryDef {
  key: MenuCategory;
  label: string;
  icon: React.ReactNode;
}

export const SIDEBAR_CATEGORIES: SidebarCategoryDef[] = [
  { key: 'app-master', label: 'APP MASTER', icon: <Home size={18} /> },
  { key: 'data-master', label: 'DATA MASTER', icon: <Database size={18} /> },
  { key: 'mutasi-pmb', label: 'MUTASI DAN PMB', icon: <ArrowLeftRight size={18} /> },
  { key: 'alumni', label: 'ALUMNI', icon: <GraduationCap size={18} /> },
  { key: 'app-dashboard', label: 'APP DASHBOARD', icon: <LayoutGrid size={18} /> },
  { key: 'administrator', label: 'ADMINISTRATOR', icon: <Shield size={18} /> },
];

export const MENU_CATEGORY_MAP: Record<string, MenuCategory> = {
  'overview': 'app-master',
  'identity': 'data-master',
  'classes': 'data-master',
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
  'announcements': 'app-dashboard',
  'pages': 'administrator',
  'menus': 'administrator',
  'settings': 'administrator',
  'users': 'administrator',
  'updates': 'administrator',
  'downloads': 'app-dashboard',
  'integrations': 'administrator',
};

// ── Sub-App Configurations for Contextual Sidebar ──
export interface SubAppItem {
  key: string;
  label: string;
  path: string;
  exact?: boolean;
  icon: React.ReactNode;
  roles?: string[];
}

export interface SubAppConfig {
  label: string;
  icon: React.ReactNode;
  basePath: string;
  items: SubAppItem[];
}

export const SUB_APP_CONFIGS: SubAppConfig[] = [
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

// ── Mobile Menu Sections for Unified Grid ──
export const MOBILE_MENU_SECTIONS = [
  { title: 'Sering Diakses', keys: ['jurnal', 'kbm', 'attendance', 'employees', 'e-office'] },
  { title: 'Informasi', keys: ['news', 'gallery', 'contacts', 'calendar'] },
  { title: 'Kesiswaan', keys: ['students', 'buku-induk', 'student-card', 'nis', 'classes', 'alumni', 'mutasi', 'ppdb', 'penilaian-pmb'] },
  { title: 'Layanan', keys: ['ptsp', 'exams', 'ijazah'] },
];
