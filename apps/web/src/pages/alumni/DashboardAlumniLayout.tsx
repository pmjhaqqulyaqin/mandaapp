import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Settings, ExternalLink } from 'lucide-react';

// Lazy loading views
const AlumniOverview = React.lazy(() => import('./views/AlumniOverview').then(m => ({ default: m.AlumniOverview })));
const AlumniDirectory = React.lazy(() => import('./views/AlumniDirectory').then(m => ({ default: m.AlumniDirectory })));
const TracerStudy = React.lazy(() => import('./views/TracerStudy').then(m => ({ default: m.TracerStudy })));
const AlumniSettings = React.lazy(() => import('./views/AlumniSettings').then(m => ({ default: m.AlumniSettings })));
const StudentDetailPage = React.lazy(() => import('../students/StudentDetailPage').then(m => ({ default: m.StudentDetailPage })));

export const DashboardAlumniLayout = () => {
  const location = useLocation();
  const currentTab = location.pathname.split('/').pop() || 'overview';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} />, path: '' },
    { id: 'directory', label: 'Daftar Alumni', icon: <Users size={16} />, path: 'directory' },
    { id: 'tracer-study', label: 'Tracer Study', icon: <ClipboardList size={16} />, path: 'tracer-study' },
    { id: 'settings', label: 'Pengaturan', icon: <Settings size={16} />, path: 'settings' },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-5 h-full">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] shadow-sm overflow-hidden shrink-0">
        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary dark:text-text-darkPrimary">Dashboard Alumni</h1>
            <p className="text-xs text-text-secondary mt-0.5">Kelola data alumni, tracer study, dan direktori publik.</p>
          </div>
          <button 
            onClick={() => window.open('/alumni-public', '_blank')}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-emerald-600 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
          >
            <ExternalLink size={14} /> Lihat Direktori Publik
          </button>
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
            <Route index element={<AlumniOverview />} />
            <Route path="directory" element={<AlumniDirectory />} />
            <Route path="profile/:id" element={<StudentDetailPage />} />
            <Route path="tracer-study" element={<TracerStudy />} />
            <Route path="settings" element={<AlumniSettings />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </React.Suspense>
      </div>
    </div>
  );
};
