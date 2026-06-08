import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Settings, ExternalLink, ArrowLeft, GraduationCap } from 'lucide-react';

// Lazy loading views
const AlumniOverview = React.lazy(() => import('./views/AlumniOverview').then(m => ({ default: m.AlumniOverview })));
const AlumniDirectory = React.lazy(() => import('./views/AlumniDirectory').then(m => ({ default: m.AlumniDirectory })));
const TracerStudy = React.lazy(() => import('./views/TracerStudy').then(m => ({ default: m.TracerStudy })));
const AlumniSettings = React.lazy(() => import('./views/AlumniSettings').then(m => ({ default: m.AlumniSettings })));
const StudentDetailPage = React.lazy(() => import('../students/StudentDetailPage'));

const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={13} />, path: '' },
  { id: 'directory', label: 'Daftar Alumni', icon: <Users size={13} />, path: 'directory' },
  { id: 'tracer-study', label: 'Tracer Study', icon: <ClipboardList size={13} />, path: 'tracer-study' },
  { id: 'settings', label: 'Pengaturan', icon: <Settings size={13} />, path: 'settings' },
];

export const DashboardAlumniLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from URL
  const segments = location.pathname.replace('/dashboard/alumni', '').split('/').filter(Boolean);
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
            <GraduationCap size={16} className="text-primary shrink-0" />
            <span className="text-sm font-bold text-primary truncate">Data Alumni</span>
            <button
              onClick={() => window.open('/alumni-public', '_blank')}
              className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md"
            >
              <ExternalLink size={10} /> Publik
            </button>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar px-2 py-2 gap-1.5">
            {TAB_CONFIG.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path ? `/dashboard/alumni/${tab.path}` : '/dashboard/alumni')}
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
