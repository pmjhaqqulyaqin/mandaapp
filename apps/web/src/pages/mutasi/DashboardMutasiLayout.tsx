import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, RefreshCw, FileText, ArrowLeft } from 'lucide-react';

// Lazy loading views
const MutasiOverview = React.lazy(() => import('./views/MutasiOverview').then(m => ({ default: m.MutasiOverview })));
const DaftarSiswaMutasi = React.lazy(() => import('./views/DaftarSiswaMutasi').then(m => ({ default: m.DaftarSiswaMutasi })));
const MutasiMasuk = React.lazy(() => import('./views/MutasiMasuk').then(m => ({ default: m.MutasiMasuk })));
const MutasiKeluar = React.lazy(() => import('./views/MutasiKeluar').then(m => ({ default: m.MutasiKeluar })));
const MutasiInternal = React.lazy(() => import('./views/MutasiInternal').then(m => ({ default: m.MutasiInternal })));
const MutasiLaporan = React.lazy(() => import('./views/MutasiLaporan').then(m => ({ default: m.MutasiLaporan })));
const StudentDetailPage = React.lazy(() => import('../students/StudentDetailPage'));

const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={13} />, path: '' },
  { id: 'directory', label: 'Daftar Siswa', icon: <Users size={13} />, path: 'directory' },
  { id: 'masuk', label: 'Mutasi Masuk', icon: <ArrowDownToLine size={13} />, path: 'masuk' },
  { id: 'keluar', label: 'Mutasi Keluar', icon: <ArrowUpFromLine size={13} />, path: 'keluar' },
  { id: 'internal', label: 'Mutasi Internal', icon: <RefreshCw size={13} />, path: 'internal' },
  { id: 'laporan', label: 'Laporan', icon: <FileText size={13} />, path: 'laporan' },
];

export const DashboardMutasiLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from URL
  const segments = location.pathname.replace('/dashboard/mutasi', '').split('/').filter(Boolean);
  const activeSegment = segments[0] || '';

  return (
    <div className="flex flex-col gap-4 md:gap-5 h-full">

      {/* ── Mobile Context Navigation (md:hidden) ── */}
      <div className="md:hidden -mx-3 px-3 sticky top-0 z-10">
        <div className="bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border-light/60 dark:border-border-dark/60">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-90"
            >
              <ArrowLeft size={16} />
            </button>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.828l-6.536-6.536"/><path d="M12 13.7a4 4 0 0 1 1.172-2.828l6.536-6.536"/></svg>
            <span className="text-sm font-bold text-primary truncate">Data Mutasi</span>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar px-2 py-2 gap-1.5">
            {TAB_CONFIG.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path ? `/dashboard/mutasi/${tab.path}` : '/dashboard/mutasi')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  activeSegment === tab.path
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'bg-gray-100 dark:bg-white/5 text-text-secondary hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative">
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        }>
          <Routes>
            <Route index element={<MutasiOverview />} />
            <Route path="directory" element={<DaftarSiswaMutasi />} />
            <Route path="profile/:id" element={<StudentDetailPage />} />
            <Route path="masuk" element={<MutasiMasuk />} />
            <Route path="keluar" element={<MutasiKeluar />} />
            <Route path="internal" element={<MutasiInternal />} />
            <Route path="laporan" element={<MutasiLaporan />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </React.Suspense>
      </div>
    </div>
  );
};
