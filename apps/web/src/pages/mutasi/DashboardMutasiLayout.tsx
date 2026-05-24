import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, RefreshCw, FileText } from 'lucide-react';

// Lazy loading views
const MutasiOverview = React.lazy(() => import('./views/MutasiOverview').then(m => ({ default: m.MutasiOverview })));
const DaftarSiswaMutasi = React.lazy(() => import('./views/DaftarSiswaMutasi').then(m => ({ default: m.DaftarSiswaMutasi })));
const MutasiMasuk = React.lazy(() => import('./views/MutasiMasuk').then(m => ({ default: m.MutasiMasuk })));
const MutasiKeluar = React.lazy(() => import('./views/MutasiKeluar').then(m => ({ default: m.MutasiKeluar })));
const MutasiInternal = React.lazy(() => import('./views/MutasiInternal').then(m => ({ default: m.MutasiInternal })));
const MutasiLaporan = React.lazy(() => import('./views/MutasiLaporan').then(m => ({ default: m.MutasiLaporan })));
const StudentDetailPage = React.lazy(() => import('../students/StudentDetailPage'));

export const DashboardMutasiLayout = () => {
  const location = useLocation();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} />, path: '' },
    { id: 'directory', label: 'Daftar Siswa', icon: <Users size={16} />, path: 'directory' },
    { id: 'masuk', label: 'Mutasi Masuk', icon: <ArrowDownToLine size={16} />, path: 'masuk' },
    { id: 'keluar', label: 'Mutasi Keluar', icon: <ArrowUpFromLine size={16} />, path: 'keluar' },
    { id: 'internal', label: 'Mutasi Internal', icon: <RefreshCw size={16} />, path: 'internal' },
    { id: 'laporan', label: 'Laporan', icon: <FileText size={16} />, path: 'laporan' },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-5 h-full">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] shadow-sm overflow-hidden shrink-0">
        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary dark:text-text-darkPrimary">📁 Data Mutasi</h1>
            <p className="text-xs text-text-secondary mt-0.5">Kelola rekam jejak mutasi siswa masuk, keluar, dan internal sekolah.</p>
          </div>
        </div>
        
        {/* Navigation Tabs (Scrollable on mobile) */}
        <div className="flex overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.path}
              end={tab.path === ''}
              className={({ isActive }) => `
                flex items-center gap-2 px-5 py-3 text-[13px] font-semibold transition-colors whitespace-nowrap border-b-2
                ${(isActive || (location.pathname.includes('/profile/') && tab.id === 'directory'))
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-transparent text-text-secondary hover:text-text-primary dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          ))}
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
