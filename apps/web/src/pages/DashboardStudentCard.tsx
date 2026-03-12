import { useState, useEffect, useRef } from 'react';
import {
  Breadcrumbs,
  Skeleton,
  PrintableStudentCard,
  CARD_TEMPLATES,
  PhotoUploader,
  StudentIdentityForm,
  CardTemplateSelector,
  type CardTemplateName,
  type CardOrientation,
  type StudentFormData,
} from '@mandaapp/ui';
import { useAuth } from '../contexts/AuthContext';
import { mockStudents, defaultCardSettings } from '../data/mockStudents';
import type { StudentProfile } from '../types/studentTypes';
import { useStudents } from '../hooks/api/useStudents';
import { useCards } from '../hooks/api/useCards';

export const DashboardStudentCard = () => {
  const { user } = useAuth();
  const { queryAll: studentsQuery, updateMutation: updateStudent } = useStudents();
  const { querySettings: cardSettingsQuery } = useCards();

  const studentList: StudentProfile[] = studentsQuery.data?.length ? studentsQuery.data : mockStudents;
  const cardSettings = cardSettingsQuery.data || defaultCardSettings;
  const isLoadingData = studentsQuery.isLoading || cardSettingsQuery.isLoading;

  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'settings' | 'batch'>('preview');

  // Card settings state
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplateName>(cardSettings.selectedTemplate || defaultCardSettings.selectedTemplate);
  const [orientation, setOrientation] = useState<CardOrientation>(cardSettings.orientation || defaultCardSettings.orientation);

  // Student data
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Batch print state
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (studentList.length > 0 && !selectedStudent) {
      if (user?.role === 'student') {
        const found = studentList.find((s: StudentProfile) => s.nisn === user?.nisn) || studentList[0];
        setSelectedStudent(found);
      } else {
        setSelectedStudent(studentList[0]);
      }
    }
  }, [user, studentList, selectedStudent]);

  const isLoading = isLoadingData || !selectedStudent;

  const template = CARD_TEMPLATES[selectedTemplate];
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const uniqueClasses = Array.from(new Set(studentList.map((s: StudentProfile) => s.className))).sort();
  const filteredStudents = selectedClass === 'all' ? studentList : studentList.filter((s: StudentProfile) => s.className === selectedClass);

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { size: ${orientation === 'horizontal' ? '85.6mm 54mm' : '54mm 85.6mm'}; margin: 0; }
          }
          .card-wrapper { page-break-after: always; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card-wrapper:last-child { page-break-after: auto; }
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
    updateStudent.mutate({ id: selectedStudent.id, data }, {
      onSuccess: () => {
        setSelectedStudent((prev) => prev ? { ...prev, ...data } : null);
      }
    });
  };

  const tabs: { key: typeof activeTab; label: string; roles: string[] }[] = [
    { key: 'preview', label: 'Preview Kartu', roles: ['student', 'teacher', 'admin'] },
    { key: 'edit', label: 'Edit Identitas', roles: ['student', 'teacher', 'admin'] },
    { key: 'settings', label: 'Pengaturan Layout', roles: ['admin'] },
    { key: 'batch', label: 'Cetak Batch', roles: ['admin', 'teacher'] },
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
                        <option key={c} value={c}>{c}</option>
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
                          {s.name} — {s.className}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Card Preview */}
              <div className="flex flex-col items-center gap-6">
                <div className="bg-gray-50 dark:bg-[#0a0a0a] p-8 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-center">
                  <div ref={printRef}>
                    <div className="card-wrapper">
                      {selectedStudent && (
                        <PrintableStudentCard
                          student={{
                            name: selectedStudent.name,
                            nisn: selectedStudent.nisn,
                            className: selectedStudent.className,
                            birthPlace: selectedStudent.birthPlace,
                            birthDate: selectedStudent.birthDate,
                            gender: selectedStudent.gender,
                            photoUrl: photoUrl || selectedStudent.photoUrl,
                          }}
                          template={template}
                          settings={{
                            schoolName: cardSettings.schoolName,
                            schoolSubtitle: cardSettings.schoolSubtitle,
                            schoolLogoUrl: cardSettings.schoolLogoUrl,
                            academicYear: cardSettings.academicYear,
                            showQrCode: cardSettings.showQrCode,
                          }}
                          orientation={orientation}
                          scale={2}
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
                          {s.name} — {s.className}
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
            <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Pengaturan Layout Kartu
              </h3>
              <CardTemplateSelector
                selectedTemplate={selectedTemplate}
                orientation={orientation}
                onTemplateChange={setSelectedTemplate}
                onOrientationChange={setOrientation}
              />
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
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>
                    </svg>
                    Cetak {filteredStudents.length} Kartu
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => (
                      <tr key={s.id} className="border-b border-border-light/50 dark:border-border-dark/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-text-secondary">{i + 1}</td>
                        <td className="py-3 px-4 text-text-primary dark:text-text-darkPrimary font-medium">{s.name}</td>
                        <td className="py-3 px-4 text-text-secondary font-mono text-xs">{s.nisn}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">{s.className}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                            s.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'
                          }`}>
                            {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Hidden print area for batch */}
              <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {filteredStudents.map((s) => (
                  <div key={s.id} className="card-wrapper">
                    <PrintableStudentCard
                      student={{
                        name: s.name,
                        nisn: s.nisn,
                        className: s.className,
                        birthPlace: s.birthPlace,
                        birthDate: s.birthDate,
                        gender: s.gender,
                        photoUrl: s.photoUrl,
                      }}
                      template={template}
                      settings={{
                        schoolName: cardSettings.schoolName,
                        schoolSubtitle: cardSettings.schoolSubtitle,
                        schoolLogoUrl: cardSettings.schoolLogoUrl,
                        academicYear: cardSettings.academicYear,
                        showQrCode: cardSettings.showQrCode,
                      }}
                      orientation={orientation}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
