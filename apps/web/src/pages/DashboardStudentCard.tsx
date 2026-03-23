import { useState, useEffect, useRef } from 'react';
import {
  Breadcrumbs,
  Skeleton,
  PrintableStudentCard,
  CARD_TEMPLATES,
  PhotoUploader,
  StudentIdentityForm,
  CardTemplateSelector,
  Button,
  type CardTemplateName,
  type CardOrientation,
  type StudentFormData,
} from '@mandaapp/ui';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, API_BASE_URL } from '../lib/api';
import { defaultCardSettings } from '../data/mockStudents';
import type { StudentProfile } from '../types/studentTypes';
import { useStudents } from '../hooks/api/useStudents';
import { useCards } from '../hooks/api/useCards';
import { useSiteSettings } from '../hooks/api/useSettings';

export const DashboardStudentCard = () => {
  const { user } = useAuth();
  const { queryAll: studentsQuery, updateMutation: updateStudent } = useStudents();
  const { querySettings: cardSettingsQuery, updateSettingsMutation } = useCards();
  const { get: getSiteSetting, isLoading: isSiteSettingsLoading } = useSiteSettings();
  
  const globalLogoUrl = getSiteSetting('logo_url', '');
  const globalSchoolName = getSiteSetting('school_name', '');
  const globalSchoolAddress = getSiteSetting('address', '');
  const globalSchoolPhone = getSiteSetting('phone', '');
  const globalSchoolEmail = getSiteSetting('email', '');
  const globalHeadmasterName = getSiteSetting('principal_name', '');
  const globalHeadmasterNip = getSiteSetting('principal_nip', '');

  const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
  const getFullUrl = (url?: string) => url?.startsWith('/') ? `${SERVER_BASE_URL}${url}` : (url || '');

  const studentList: StudentProfile[] = Array.isArray(studentsQuery.data) ? studentsQuery.data : [];
  const cardSettings = cardSettingsQuery.data || defaultCardSettings;
  const isLoadingData = studentsQuery.isLoading || cardSettingsQuery.isLoading || isSiteSettingsLoading;

  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'settings' | 'batch'>('preview');

  // Card settings state
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplateName>(cardSettings.selectedTemplate || defaultCardSettings.selectedTemplate);
  const [orientation, setOrientation] = useState<CardOrientation>(cardSettings.orientation || defaultCardSettings.orientation);
  
  // Custom text for header and terms
  const [editingSettings, setEditingSettings] = useState({
    schoolName: cardSettings.schoolName || defaultCardSettings.schoolName,
    schoolAddress: cardSettings.schoolAddress || defaultCardSettings.schoolAddress,
    schoolSubtitle: cardSettings.schoolSubtitle || defaultCardSettings.schoolSubtitle,
    termsText: cardSettings.termsText || defaultCardSettings.termsText,
    headmasterSignatureUrl: cardSettings.headmasterSignatureUrl || '',
  });

  // Keep editing state in sync if data loads later
  useEffect(() => {
    if (cardSettingsQuery.data) {
      setEditingSettings({
        schoolName: cardSettingsQuery.data.schoolName || defaultCardSettings.schoolName,
        schoolAddress: cardSettingsQuery.data.schoolAddress || defaultCardSettings.schoolAddress,
        schoolSubtitle: cardSettingsQuery.data.schoolSubtitle || defaultCardSettings.schoolSubtitle,
        termsText: cardSettingsQuery.data.termsText || defaultCardSettings.termsText,
        headmasterSignatureUrl: cardSettingsQuery.data.headmasterSignatureUrl || '',
      });
      setSelectedTemplate(cardSettingsQuery.data.selectedTemplate || defaultCardSettings.selectedTemplate);
      setOrientation(cardSettingsQuery.data.orientation || defaultCardSettings.orientation);
    }
  }, [cardSettingsQuery.data]);

  const [classesList, setClassesList] = useState<any[]>([]);
  const [majorsList, setMajorsList] = useState<any[]>([]);

  useEffect(() => {
    apiClient<any[]>('/classes').then(setClassesList).catch(() => {});
    apiClient<any[]>('/majors').then(setMajorsList).catch(() => {});
  }, [user]);

  const getStudentDisplayClass = (student: StudentProfile) => {
    if (student.classId) {
      const classObj = classesList.find(c => c.id === student.classId);
      if (classObj) {
        const majorName = majorsList.find(m => m.id === classObj.majorId)?.name || '';
        return majorName ? `${classObj.name} - ${majorName}` : classObj.name;
      }
    }
    const classObj = classesList.find(c => c.name === student.className);
    if (classObj) {
      const majorName = majorsList.find(m => m.id === classObj.majorId)?.name || '';
      return majorName ? `${student.className} - ${majorName}` : student.className;
    }
    return student.className || '-';
  };

  // Student data
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Batch print state
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [unselectedIds, setUnselectedIds] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (studentList.length > 0 && !selectedStudent) {
      if (user?.role === 'student') {
        const found = studentList.find((s: StudentProfile) => s.nisn === user?.nisn) || studentList[0];
        setSelectedStudent(found);
      } else {
        setSelectedStudent(studentList[0]);
      }
    } else if (studentList.length === 0 && !isLoadingData) {
      setSelectedStudent(null);
    }
  }, [user, studentList, selectedStudent, isLoadingData]);

  const isLoading = isLoadingData || !selectedStudent;

  const template = CARD_TEMPLATES[selectedTemplate];
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'guru';
  const isStudent = user?.role === 'student';

  const uniqueClasses = Array.from(new Set(studentList.map((s: StudentProfile) => getStudentDisplayClass(s)))).sort();
  const filteredStudents = selectedClass === 'all' ? studentList : studentList.filter((s: StudentProfile) => getStudentDisplayClass(s) === selectedClass);
  const studentsToPrint = filteredStudents.filter(s => !unselectedIds.has(s.id));

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Kartu Pelajar</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #fff; }
          .printable-card-front, .printable-card-back {
             box-shadow: none !important;
             border: none !important;
             margin: 0 !important;
          }
          .card-wrapper { 
             display: flex; 
             flex-direction: column;
             gap: 0;
          }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { size: A4 portrait; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${el.innerHTML}
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleFormSubmit = (data: StudentFormData) => {
    if (!selectedStudent) return;
    const toastId = toast.loading('Menyimpan perubahan identitas...');
    updateStudent.mutate({ id: selectedStudent.id, data }, {
      onSuccess: () => {
        toast.success('Identitas berhasil disimpan!', { id: toastId });
        setSelectedStudent((prev) => prev ? { ...prev, ...data } : null);
        studentsQuery.refetch();
      },
      onError: () => toast.error('Gagal menyimpan perubahan identitas', { id: toastId })
    });
  };

  const handleSaveSettings = () => {
    const toastId = toast.loading('Menyimpan pengaturan kartu...');
    updateSettingsMutation.mutate({
      ...cardSettings,
      ...editingSettings,
      selectedTemplate,
      orientation,
    }, {
      onSuccess: () => {
        toast.success('Pengaturan kartu berhasil disimpan!', { id: toastId });
      },
      onError: () => {
        toast.error('Gagal menyimpan pengaturan.', { id: toastId });
      }
    });
  };

  const tabs: { key: typeof activeTab; label: string; roles: string[] }[] = [
    { key: 'preview', label: 'Preview Kartu', roles: ['student', 'guru', 'admin'] },
    { key: 'edit', label: 'Edit Identitas', roles: ['student', 'guru', 'admin'] },
    { key: 'settings', label: 'Pengaturan Layout', roles: ['admin'] },
    { key: 'batch', label: 'Cetak Batch', roles: ['admin', 'guru'] },
  ];

  const visibleTabs = tabs.filter((t) => t.roles.includes(user?.role || 'student'));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Kartu Pelajar' },
        ]}
      />

      {/* Page Header */}
      <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-heading font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-3">
                  <span className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15h0M2 9h20"/>
                    </svg>
                  </span>
                  Kartu Pelajar
                </h2>
                <p className="text-text-secondary text-sm mt-1 ml-[52px]">
                  {isStudent && 'Preview, edit identitas, dan cetak kartu pelajar Anda.'}
                  {isTeacher && 'Kelola dan cetak kartu pelajar siswa.'}
                  {isAdmin && 'Kelola layout, identitas, dan cetak kartu pelajar.'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      {!isLoading && (
        <div className="flex gap-1 bg-gray-100 dark:bg-[#111] p-1 rounded-xl border border-border-light dark:border-border-dark">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-background-dark text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary dark:hover:text-text-darkPrimary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <>
          {/* ===== PREVIEW TAB ===== */}
          {activeTab === 'preview' && (
            <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm space-y-6">
              {/* Student Selector for teacher/admin */}
              {(isTeacher || isAdmin) && (
                <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-border-light dark:border-border-dark">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Filter Kelas</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary"
                    >
                      <option value="all">Semua Kelas</option>
                      {uniqueClasses.map((c) => (
                        <option key={c as string} value={c as string}>{c as string}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Pilih Siswa</label>
                    <select
                      value={selectedStudent?.id || ''}
                      onChange={(e) => {
                        const s = studentList.find((st: StudentProfile) => st.id === e.target.value);
                        if (s) setSelectedStudent(s);
                      }}
                      className="px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary min-w-[200px]"
                    >
                      {filteredStudents.map((s: StudentProfile) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName || s.name} — {getStudentDisplayClass(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Card Preview */}
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="bg-gray-50 dark:bg-[#0a0a0a] p-4 sm:p-8 rounded-xl border border-border-light dark:border-border-dark w-full overflow-hidden flex justify-center">
                  <div ref={printRef} className="max-w-full overflow-x-auto pb-6 custom-scrollbar" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div 
                      className="card-wrapper origin-top flex flex-col items-center gap-6"
                      style={{ transform: 'scale(min(1, max(0.45, calc(100vw / 800))))' }}
                    >
                      {selectedStudent && (
                        <PrintableStudentCard
                          student={{
                            name: selectedStudent.fullName || selectedStudent.name,
                            nisn: selectedStudent.nisn,
                            className: selectedStudent.className,
                            birthPlace: selectedStudent.birthPlace,
                            birthDate: selectedStudent.birthDate,
                            gender: selectedStudent.gender,
                            address: selectedStudent.address,
                            photoUrl: photoUrl || selectedStudent.photoUrl,
                          }}
                          template={template}
                          settings={{
                            schoolName: globalSchoolName || cardSettings.schoolName,
                            schoolSubtitle: editingSettings.schoolSubtitle,
                            schoolAddress: globalSchoolAddress || cardSettings.schoolAddress,
                            schoolPhone: globalSchoolPhone,
                            schoolEmail: globalSchoolEmail,
                            headmasterName: globalHeadmasterName,
                            headmasterNip: globalHeadmasterNip,
                            termsText: editingSettings.termsText,
                            schoolLogoUrl: getFullUrl(globalLogoUrl || cardSettings.schoolLogoUrl),
                            headmasterSignatureUrl: getFullUrl(editingSettings.headmasterSignatureUrl),
                            academicYear: cardSettings.academicYear,
                            showQrCode: cardSettings.showQrCode,
                          }}
                          orientation={orientation}
                          scale={1}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Orientation Quick Switch + Print */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <div className="flex gap-1 bg-gray-100 dark:bg-[#111] p-1 rounded-lg">
                    <button
                      onClick={() => setOrientation('horizontal')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 ${
                        orientation === 'horizontal'
                          ? 'bg-white dark:bg-background-dark text-primary shadow-sm'
                          : 'text-text-secondary'
                      }`}
                    >
                      Horizontal
                    </button>
                    <button
                      onClick={() => setOrientation('vertical')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 ${
                        orientation === 'vertical'
                          ? 'bg-white dark:bg-background-dark text-primary shadow-sm'
                          : 'text-text-secondary'
                      }`}
                    >
                      Vertikal
                    </button>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>
                    </svg>
                    Cetak Kartu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== EDIT TAB ===== */}
          {activeTab === 'edit' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Photo */}
              <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
                  </svg>
                  Foto Profil
                </h3>
                <PhotoUploader
                  currentPhotoUrl={photoUrl || selectedStudent?.photoUrl || ''}
                  onPhotoChange={setPhotoUrl}
                />
              </div>

              {/* Identity Form */}
              <div className="lg:col-span-2 bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                  Data Identitas
                </h3>

                {/* Student selector for teacher/admin */}
                {(isTeacher || isAdmin) && (
                  <div className="mb-4 pb-4 border-b border-border-light dark:border-border-dark">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Pilih Siswa</label>
                    <select
                      value={selectedStudent?.id || ''}
                      onChange={(e) => {
                        const s = studentList.find((st: StudentProfile) => st.id === e.target.value);
                        if (s) setSelectedStudent(s);
                      }}
                      className="px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary w-full max-w-xs"
                    >
                      {studentList.map((s: StudentProfile) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName || s.name} — {getStudentDisplayClass(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedStudent && (
                  <StudentIdentityForm
                    initialData={{
                      name: selectedStudent.name,
                      nisn: selectedStudent.nisn,
                      className: selectedStudent.className,
                      birthPlace: selectedStudent.birthPlace,
                      birthDate: selectedStudent.birthDate,
                      gender: selectedStudent.gender,
                      address: selectedStudent.address,
                    }}
                    mode="edit"
                    onSubmit={handleFormSubmit}
                  />
                )}
              </div>
            </div>
          )}

          {/* ===== SETTINGS TAB (Admin only) ===== */}
          {activeTab === 'settings' && isAdmin && (
            <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                  Teks Kop Sekolah & Ketentuan
                </h3>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 text-sm text-primary flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <div>Data Nama Sekolah, Alamat, Logo, Kontak dan Nama Kepala Sekolah terhubung otomatis dari <strong>Pengaturan Sistem</strong>. Anda dapat mengedit sisanya di bawah ini.</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Website / Kontak Alternatif (Subtitle)</label>
                    <input 
                      type="text" 
                      value={editingSettings.schoolSubtitle || ''}
                      onChange={e => setEditingSettings({...editingSettings, schoolSubtitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] focus:border-primary outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Teks Bagian Belakang (Ketentuan Penggunaan)</label>
                    <textarea 
                      rows={5}
                      value={editingSettings.termsText || ''}
                      onChange={e => setEditingSettings({...editingSettings, termsText: e.target.value})}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] focus:border-primary outline-none leading-relaxed"
                      placeholder="1. Kartu ini adalah identitas resmi..."
                    />
                  </div>
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                    <label className="block text-xs font-semibold text-text-secondary mb-3">Tanda Tangan Kepala Sekolah (PNG Transparan)</label>
                    <div className="w-48">
                      <PhotoUploader
                        currentPhotoUrl={getFullUrl(editingSettings.headmasterSignatureUrl) || ''}
                        onPhotoChange={(url) => setEditingSettings({...editingSettings, headmasterSignatureUrl: url})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border-light dark:border-border-dark">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary mb-6 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  Pengaturan Layout Kartu
                </h3>
                <CardTemplateSelector
                  selectedTemplate={selectedTemplate}
                  orientation={orientation}
                  schoolLogoUrl={getFullUrl(globalLogoUrl || cardSettings.schoolLogoUrl)}
                  onTemplateChange={setSelectedTemplate}
                  onOrientationChange={setOrientation}
                />
              </div>

              <div className="flex justify-end mt-6">
                <Button 
                   onClick={handleSaveSettings}
                   disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </div>
            </div>
          )}

          {/* ===== BATCH PRINT TAB (Admin/Teacher) ===== */}
          {activeTab === 'batch' && (isAdmin || isTeacher) && (
            <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
                  </svg>
                  Cetak Batch Kartu Pelajar
                </h3>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary"
                  >
                    <option value="all">Semua Kelas</option>
                    {uniqueClasses.map((c) => (
                      <option key={c as string} value={c as string}>{c as string}</option>
                    ))}
                  </select>
                  <button
                    onClick={handlePrint}
                    disabled={studentsToPrint.length === 0}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>
                    </svg>
                    Cetak {studentsToPrint.length} Kartu
                  </button>
                </div>
              </div>

              {/* Student Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark">
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs">No</th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs">Nama</th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs">NISN</th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs">Kelas</th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary text-xs">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-text-secondary text-xs">
                        <label className="flex items-center justify-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            checked={filteredStudents.length > 0 && unselectedIds.size === 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUnselectedIds(new Set());
                              } else {
                                setUnselectedIds(new Set(filteredStudents.map(s => s.id)));
                              }
                            }}
                          />
                        </label>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => (
                      <tr key={s.id} className={`border-b border-border-light/50 dark:border-border-dark/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${unselectedIds.has(s.id) ? 'opacity-60 bg-gray-50/50' : ''}`}>
                        <td className="py-3 px-4 text-text-secondary">{i + 1}</td>
                        <td className="py-3 px-4 text-text-primary dark:text-text-darkPrimary font-medium">{s.fullName || s.name}</td>
                        <td className="py-3 px-4 text-text-secondary font-mono text-xs">{s.nisn}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">{getStudentDisplayClass(s)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                            s.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'
                          }`}>
                            {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer m-auto"
                            checked={!unselectedIds.has(s.id)}
                            onChange={(e) => {
                              const newUnselected = new Set(unselectedIds);
                              if (e.target.checked) {
                                newUnselected.delete(s.id);
                              } else {
                                newUnselected.add(s.id);
                              }
                              setUnselectedIds(newUnselected);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Hidden print area for batch */}
              <div ref={printRef} className="hidden">
                
                {/* Front Sides Grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {studentsToPrint.map((s) => (
                    <div key={`front-${s.id}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <PrintableStudentCard
                        student={{
                          name: s.fullName || s.name,
                          nisn: s.nisn,
                          className: s.className,
                          birthPlace: s.birthPlace,
                          birthDate: s.birthDate,
                          gender: s.gender,
                          photoUrl: s.photoUrl,
                        }}
                        template={template}
                        settings={{
                          schoolName: globalSchoolName || cardSettings.schoolName,
                          schoolSubtitle: cardSettings.schoolSubtitle,
                          schoolAddress: globalSchoolAddress || cardSettings.schoolAddress,
                          schoolPhone: globalSchoolPhone,
                          schoolEmail: globalSchoolEmail,
                          headmasterName: globalHeadmasterName,
                          headmasterNip: globalHeadmasterNip,
                          termsText: cardSettings.termsText,
                          schoolLogoUrl: getFullUrl(globalLogoUrl || cardSettings.schoolLogoUrl),
                          headmasterSignatureUrl: getFullUrl(editingSettings.headmasterSignatureUrl),
                          academicYear: cardSettings.academicYear,
                          showQrCode: cardSettings.showQrCode,
                        }}
                        orientation={orientation}
                        scale={0.48}
                        side="front"
                      />
                    </div>
                  ))}
                </div>

                {/* Page Break between Fronts and Backs */}
                <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}></div>

                {/* Back Sides Grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {studentsToPrint.map((s) => (
                    <div key={`back-${s.id}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <PrintableStudentCard
                        student={{
                          name: s.fullName || s.name,
                          nisn: s.nisn,
                          className: s.className,
                          birthPlace: s.birthPlace,
                          birthDate: s.birthDate,
                          gender: s.gender,
                          photoUrl: s.photoUrl,
                        }}
                        template={template}
                        settings={{
                          schoolName: globalSchoolName || cardSettings.schoolName,
                          schoolSubtitle: cardSettings.schoolSubtitle,
                          schoolAddress: globalSchoolAddress || cardSettings.schoolAddress,
                          schoolPhone: globalSchoolPhone,
                          schoolEmail: globalSchoolEmail,
                          headmasterName: globalHeadmasterName,
                          headmasterNip: globalHeadmasterNip,
                          termsText: cardSettings.termsText,
                          schoolLogoUrl: getFullUrl(globalLogoUrl || cardSettings.schoolLogoUrl),
                          headmasterSignatureUrl: getFullUrl(editingSettings.headmasterSignatureUrl),
                          academicYear: cardSettings.academicYear,
                          showQrCode: cardSettings.showQrCode,
                        }}
                        orientation={orientation}
                        scale={0.48}
                        side="back"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
