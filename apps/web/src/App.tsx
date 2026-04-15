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
import { DashboardServices } from './pages/dashboard/DashboardServices';
import { DashboardStudents } from './pages/DashboardStudents';
import { DashboardNIS } from './pages/DashboardNIS';
import { DashboardEmployees } from './pages/DashboardEmployees';
import { SelectRolePage } from './pages/SelectRolePage';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MaintenanceGuard } from './components/MaintenanceGuard';
import { useFavicon } from './hooks/useFavicon';
import { ServicePageRoute } from './pages/layanan/ServicePageRoute';
import { EOfficePage } from './pages/eoffice/EOfficePage';
import { ExamManagementPage } from './pages/exams/ExamManagementPage';
import { PPDBInfoPage } from './pages/ppdb/PPDBInfoPage';
import { PPDBFormPage } from './pages/ppdb/PPDBFormPage';
import { PPDBAdminPage } from './pages/ppdb/PPDBAdminPage';
import { PPDBPenilaianPage } from './pages/ppdb/PPDBPenilaianPage';
import { PPDBDaftarUlangPage } from './pages/ppdb/PPDBDaftarUlangPage';
import { PPDBVerifikasiPage } from './pages/ppdb/PPDBVerifikasiPage';
import { SystemUpdateCenter } from './pages/dashboard/SystemUpdateCenter';
import { BatchPrintPage } from './pages/BatchPrintPage';
import { PrintAcademicCalendar } from './pages/PrintAcademicCalendar';
import { PrintKartuPeserta } from './pages/exams/print/PrintKartuPeserta';
import { PrintIdCardPegawai } from './pages/exams/print/PrintIdCardPegawai';
import { PrintBeritaAcaraMapel } from './pages/exams/print/PrintBeritaAcaraMapel';
import { PrintBeritaAcaraSekolah } from './pages/exams/print/PrintBeritaAcaraSekolah';
import { PrintPaktaIntegritas } from './pages/exams/print/PrintPaktaIntegritas';
import { PrintDaftarHadirPeserta } from './pages/exams/print/PrintDaftarHadirPeserta';
import { PrintFormatNilai } from './pages/exams/print/PrintFormatNilai';
import { FloatingActionButton, ScrollToTopButton } from '@mandaapp/ui';
import { Toaster } from 'sonner';

function App() {
  useFavicon();

  return (
    <AuthProvider>
      <Router>
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
        <Route path="/login" element={<LoginPage />} />
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
          <Route path="students" element={<DashboardStudents />} />
          <Route path="nis" element={<DashboardNIS />} />
          <Route path="employees" element={<DashboardEmployees />} />
          <Route path="pages" element={<DashboardPages />} />
          <Route path="menus" element={<DashboardMenus />} />
          <Route path="e-office" element={<EOfficePage />} />
          <Route path="exams" element={<ExamManagementPage />} />
          <Route path="updates" element={<SystemUpdateCenter />} />
          <Route path="services" element={<DashboardServices />} />
          <Route path="ppdb" element={<PPDBAdminPage />} />
          <Route path="ppdb/penilaian" element={<PPDBPenilaianPage />} />
        </Route>
      </Routes>
      <FloatingActionButton />
      <ScrollToTopButton />
      <Toaster richColors position="top-right" />
    </Router>
    </AuthProvider>
  );
}

export default App;
