import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Core contexts and components that shouldn't be lazy loaded
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MaintenanceGuard } from './components/MaintenanceGuard';
import { useFavicon } from './hooks/useFavicon';
import { FloatingActionButton } from '@mandaapp/ui/src/components/FloatingActionButton';
import { ScrollToTopButton } from '@mandaapp/ui/src/components/ScrollToTopButton';
import { Toaster } from 'sonner';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

// Lazy loading all pages
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const NewsPage = React.lazy(() => import('./pages/NewsPage').then(m => ({ default: m.NewsPage })));
const NewsDetailPage = React.lazy(() => import('./pages/NewsDetailPage').then(m => ({ default: m.NewsDetailPage })));
const GalleryPage = React.lazy(() => import('./pages/GalleryPage').then(m => ({ default: m.GalleryPage })));
const DynamicPage = React.lazy(() => import('./pages/DynamicPage').then(m => ({ default: m.DynamicPage })));
const DashboardLayout = React.lazy(() => import('./layouts/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const DashboardOverview = React.lazy(() => import('./pages/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const DashboardNews = React.lazy(() => import('./pages/DashboardNews').then(m => ({ default: m.DashboardNews })));
const DashboardCalendar = React.lazy(() => import('./pages/DashboardCalendar').then(m => ({ default: m.DashboardCalendar })));
const DashboardStudentCard = React.lazy(() => import('./pages/DashboardStudentCard').then(m => ({ default: m.DashboardStudentCard })));
const DashboardGallery = React.lazy(() => import('./pages/DashboardGallery').then(m => ({ default: m.DashboardGallery })));
const DashboardContacts = React.lazy(() => import('./pages/DashboardContacts').then(m => ({ default: m.DashboardContacts })));
const DashboardSettings = React.lazy(() => import('./pages/DashboardSettings').then(m => ({ default: m.DashboardSettings })));
const DashboardUsers = React.lazy(() => import('./pages/DashboardUsers').then(m => ({ default: m.DashboardUsers })));
const DashboardPages = React.lazy(() => import('./pages/dashboard/DashboardPages').then(m => ({ default: m.DashboardPages })));
const DashboardMenus = React.lazy(() => import('./pages/dashboard/DashboardMenus').then(m => ({ default: m.DashboardMenus })));
const DashboardServices = React.lazy(() => import('./pages/dashboard/DashboardServices').then(m => ({ default: m.DashboardServices })));
const DashboardStudents = React.lazy(() => import('./pages/DashboardStudents').then(m => ({ default: m.default || (m as any).DashboardStudents })));
const DashboardAlumniLayout = React.lazy(() => import('./pages/alumni/DashboardAlumniLayout').then(m => ({ default: m.DashboardAlumniLayout })));
const DashboardMutasi = React.lazy(() => import('./pages/DashboardMutasi').then(m => ({ default: m.default })));
const StudentDetailPage = React.lazy(() => import('./pages/students/StudentDetailPage'));
const DashboardIjazah = React.lazy(() => import('./pages/ijazah/DashboardIjazah').then(m => ({ default: m.DashboardIjazah })));
const DashboardNIS = React.lazy(() => import('./pages/DashboardNIS').then(m => ({ default: m.DashboardNIS })));
const DashboardEmployees = React.lazy(() => import('./pages/DashboardEmployees').then(m => ({ default: m.DashboardEmployees })));
const SelectRolePage = React.lazy(() => import('./pages/SelectRolePage').then(m => ({ default: m.SelectRolePage })));
const ServicePageRoute = React.lazy(() => import('./pages/layanan/ServicePageRoute').then(m => ({ default: m.ServicePageRoute })));
const EOfficePage = React.lazy(() => import('./pages/eoffice/EOfficePage').then(m => ({ default: m.EOfficePage })));
const ExamManagementPage = React.lazy(() => import('./pages/exams/ExamManagementPage').then(m => ({ default: m.ExamManagementPage })));
const PPDBInfoPage = React.lazy(() => import('./pages/ppdb/PPDBInfoPage').then(m => ({ default: m.PPDBInfoPage })));
const PPDBFormPage = React.lazy(() => import('./pages/ppdb/PPDBFormPage').then(m => ({ default: m.PPDBFormPage })));
const PPDBAdminPage = React.lazy(() => import('./pages/ppdb/PPDBAdminPage').then(m => ({ default: m.PPDBAdminPage })));
const PPDBPenilaianPage = React.lazy(() => import('./pages/ppdb/PPDBPenilaianPage').then(m => ({ default: m.PPDBPenilaianPage })));
const PPDBDaftarUlangPage = React.lazy(() => import('./pages/ppdb/PPDBDaftarUlangPage').then(m => ({ default: m.PPDBDaftarUlangPage })));
const PPDBVerifikasiPage = React.lazy(() => import('./pages/ppdb/PPDBVerifikasiPage').then(m => ({ default: m.PPDBVerifikasiPage })));
const SystemUpdateCenter = React.lazy(() => import('./pages/dashboard/SystemUpdateCenter').then(m => ({ default: m.SystemUpdateCenter })));
const PublicScannerPage = React.lazy(() => import('./pages/attendance/PublicScannerPage').then(m => ({ default: m.PublicScannerPage })));
const PublicAlumniDirectory = React.lazy(() => import('./pages/alumni/PublicAlumniDirectory').then(m => ({ default: m.PublicAlumniDirectory })));
const DashboardAttendance = React.lazy(() => import('./pages/attendance/DashboardAttendance').then(m => ({ default: m.DashboardAttendance })));
const DashboardJurnal = React.lazy(() => import('./pages/jurnal/DashboardJurnal').then(m => ({ default: m.DashboardJurnal })));
const DashboardKBM = React.lazy(() => import('./pages/kbm/DashboardKBM').then(m => ({ default: m.DashboardKBM })));
const ParentPortal = React.lazy(() => import('./pages/parent/ParentPortal').then(m => ({ default: m.ParentPortal })));
const BatchPrintPage = React.lazy(() => import('./pages/BatchPrintPage').then(m => ({ default: m.BatchPrintPage })));
const PrintAcademicCalendar = React.lazy(() => import('./pages/PrintAcademicCalendar').then(m => ({ default: m.PrintAcademicCalendar })));
const PrintKartuPeserta = React.lazy(() => import('./pages/exams/print/PrintKartuPeserta').then(m => ({ default: m.PrintKartuPeserta })));
const PrintIdCardPegawai = React.lazy(() => import('./pages/exams/print/PrintIdCardPegawai').then(m => ({ default: m.PrintIdCardPegawai })));
const PrintBeritaAcaraMapel = React.lazy(() => import('./pages/exams/print/PrintBeritaAcaraMapel').then(m => ({ default: m.PrintBeritaAcaraMapel })));
const PrintBeritaAcaraSekolah = React.lazy(() => import('./pages/exams/print/PrintBeritaAcaraSekolah').then(m => ({ default: m.PrintBeritaAcaraSekolah })));
const PrintPaktaIntegritas = React.lazy(() => import('./pages/exams/print/PrintPaktaIntegritas').then(m => ({ default: m.PrintPaktaIntegritas })));
const PrintDaftarHadirPeserta = React.lazy(() => import('./pages/exams/print/PrintDaftarHadirPeserta').then(m => ({ default: m.PrintDaftarHadirPeserta })));
const PrintFormatNilai = React.lazy(() => import('./pages/exams/print/PrintFormatNilai').then(m => ({ default: m.PrintFormatNilai })));

// Loading fallback component
const PageSpinner = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50/50">
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
    </div>
  </div>
);

function App() {
  useFavicon();

  return (
    <ErrorBoundary>
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/" element={<MaintenanceGuard><LandingPage /></MaintenanceGuard>} />
            <Route path="/news" element={<MaintenanceGuard><NewsPage /></MaintenanceGuard>} />
            <Route path="/news/:id" element={<MaintenanceGuard><NewsDetailPage /></MaintenanceGuard>} />
            <Route path="/gallery" element={<MaintenanceGuard><GalleryPage /></MaintenanceGuard>} />
            <Route path="/page/:slug" element={<MaintenanceGuard><DynamicPage /></MaintenanceGuard>} />
            <Route path="/services/:slug" element={<MaintenanceGuard><ServicePageRoute /></MaintenanceGuard>} />
            
            {/* Public PPDB/PMB routes */}
            <Route path="/ppdb" element={<MaintenanceGuard><PPDBInfoPage /></MaintenanceGuard>} />
            <Route path="/ppdb/daftar/:jalurId" element={<MaintenanceGuard><PPDBFormPage /></MaintenanceGuard>} />
            <Route path="/ppdb/daftar-ulang" element={<MaintenanceGuard><PPDBDaftarUlangPage /></MaintenanceGuard>} />
            <Route path="/ppdb/verifikasi" element={<PPDBVerifikasiPage />} />
            <Route path="/attendance/scan" element={<MaintenanceGuard><PublicScannerPage /></MaintenanceGuard>} />
            
            {/* Public Alumni Route */}
            <Route path="/alumni-public" element={<MaintenanceGuard><PublicAlumniDirectory /></MaintenanceGuard>} />
            
            <Route path="/login" element={<LoginPage />} />
            <Route path="/portal-ortu" element={
              <ProtectedRoute allowedRoles={['orang_tua']}>
                <ParentPortal />
              </ProtectedRoute>
            } />
            
            <Route path="/select-role" element={
              <ProtectedRoute>
                <SelectRolePage />
              </ProtectedRoute>
            } />
            
            {/* Dedicated batch print page — OUTSIDE DashboardLayout */}
            <Route path="/dashboard/print-batch" element={
              <ProtectedRoute>
                <BatchPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-calendar" element={
              <ProtectedRoute>
                <PrintAcademicCalendar />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-kartu-peserta/:ujianId" element={
              <ProtectedRoute>
                <PrintKartuPeserta />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-id-pegawai/:ujianId" element={
              <ProtectedRoute>
                <PrintIdCardPegawai />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-ba-mapel/:ujianId" element={
              <ProtectedRoute>
                <PrintBeritaAcaraMapel />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-ba-sekolah/:ujianId" element={
              <ProtectedRoute>
                <PrintBeritaAcaraSekolah />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-pakta/:ujianId" element={
              <ProtectedRoute>
                <PrintPaktaIntegritas />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-daftar-hadir/:ujianId" element={
              <ProtectedRoute>
                <PrintDaftarHadirPeserta />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/print-format-nilai/:ujianId" element={
              <ProtectedRoute>
                <PrintFormatNilai />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['admin','kepala_madrasah','wakil_kepala','kepala_unit','wali_kelas','pembina_ekstra','guru','kepala_tu','pegawai_tu','operator']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardOverview />} />
              <Route path="news" element={<DashboardNews />} />
              <Route path="calendar" element={<DashboardCalendar />} />
              <Route path="student-card" element={<DashboardStudentCard />} />
              <Route path="gallery" element={<DashboardGallery />} />
              <Route path="contacts" element={<DashboardContacts />} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={['admin','kepala_madrasah']}><DashboardSettings /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><DashboardUsers /></ProtectedRoute>} />
              <Route path="students" element={<ProtectedRoute requireAdmin><DashboardStudents /></ProtectedRoute>} />
              <Route path="students/:id" element={<ProtectedRoute requireAdmin><StudentDetailPage /></ProtectedRoute>} />
              <Route path="alumni/*" element={<ProtectedRoute requireAdmin><DashboardAlumniLayout /></ProtectedRoute>} />
              <Route path="mutasi" element={<ProtectedRoute requireAdmin><DashboardMutasi /></ProtectedRoute>} />
              <Route path="buku-induk" element={<DashboardStudents />} />
              <Route path="ijazah" element={<DashboardIjazah />} />
              <Route path="nis" element={<DashboardNIS />} />
              <Route path="employees" element={<DashboardEmployees />} />
              <Route path="pages" element={<DashboardPages />} />
              <Route path="menus" element={<DashboardMenus />} />
              <Route path="e-office" element={<EOfficePage />} />
              <Route path="exams" element={<ExamManagementPage />} />
              <Route path="attendance" element={<DashboardAttendance />} />
              <Route path="jurnal" element={<DashboardJurnal />} />
              <Route path="kbm" element={<DashboardKBM />} />
              <Route path="updates" element={<ProtectedRoute allowedRoles={['admin']}><SystemUpdateCenter /></ProtectedRoute>} />
              <Route path="services" element={<DashboardServices />} />
              <Route path="ppdb" element={<PPDBAdminPage />} />
              <Route path="ppdb/penilaian" element={<PPDBPenilaianPage />} />
            </Route>
          </Routes>
        </Suspense>
        <FloatingActionButton />
        <ScrollToTopButton />
        <Toaster richColors position="top-center" toastOptions={{ className: 'text-sm', style: { maxWidth: '92vw' } }} />
        <PwaInstallPrompt />
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
