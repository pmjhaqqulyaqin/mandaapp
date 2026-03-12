import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { GalleryPage } from './pages/GalleryPage';
import { DynamicPage } from './pages/DynamicPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardOverview } from './pages/DashboardOverview';
import { DashboardNews } from './pages/DashboardNews';
import { DashboardCalendar } from './pages/DashboardCalendar';
import { DashboardStudentCard } from './pages/DashboardStudentCard';
import { DashboardGallery } from './pages/DashboardGallery';
import { DashboardContacts } from './pages/DashboardContacts';
import { DashboardSettings } from './pages/DashboardSettings';
import { DashboardUsers } from './pages/DashboardUsers';
import { DashboardPages } from './pages/dashboard/DashboardPages';
import { DashboardMenus } from './pages/dashboard/DashboardMenus';
import { SelectRolePage } from './pages/SelectRolePage';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useFavicon } from './hooks/useFavicon';
import { SystemUpdateCenter } from './pages/dashboard/SystemUpdateCenter';
import { FloatingActionButton, ScrollToTopButton } from '@mandaapp/ui';

function App() {
  useFavicon();

  return (
    <AuthProvider>
      <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/page/:slug" element={<DynamicPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-role" element={
          <ProtectedRoute>
            <SelectRolePage />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardOverview />} />
          <Route path="news" element={<DashboardNews />} />
          <Route path="calendar" element={<DashboardCalendar />} />
          <Route path="student-card" element={<DashboardStudentCard />} />
          <Route path="gallery" element={<DashboardGallery />} />
          <Route path="contacts" element={<DashboardContacts />} />
          <Route path="settings" element={<DashboardSettings />} />
          <Route path="users" element={<DashboardUsers />} />
          <Route path="pages" element={<DashboardPages />} />
          <Route path="menus" element={<DashboardMenus />} />
          <Route path="updates" element={<SystemUpdateCenter />} />
        </Route>
      </Routes>
      <FloatingActionButton />
      <ScrollToTopButton />
    </Router>
    </AuthProvider>
  );
}

export default App;
