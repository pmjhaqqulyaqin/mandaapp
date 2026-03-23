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
  Modal,
  DataTable,
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
import { CameraCapture } from '../components/CameraCapture';
import { galleryService } from '../lib/services/gallery';
import { Edit2, Image as ImageIcon, Camera, X, Loader2, Eye } from 'lucide-react';

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
    kemenagLogoUrl: cardSettings.kemenagLogoUrl || '',
    schoolStampUrl: cardSettings.schoolStampUrl || '',
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
        kemenagLogoUrl: cardSettingsQuery.data.kemenagLogoUrl || '',
        schoolStampUrl: cardSettingsQuery.data.schoolStampUrl || '',
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
  
  // Edit Identity Tab State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  const [mainPreviewScale, setMainPreviewScale] = useState(1);
  const [mainPreviewHeight, setMainPreviewHeight] = useState(600);
  const mainPreviewContainerRef = useRef<HTMLDivElement>(null);
  const mainPreviewInnerRef = useRef<HTMLDivElement>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Batch print state
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [unselectedIds, setUnselectedIds] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (studentList.length > 0 && !selectedStudent) {
      if (user?.role === 'student') {
        const found = studentList.find((s: StudentProfile) => s.nisn === (user as any)?.nisn) || studentList[0];
        setSelectedStudent(found);
      } else {
        setSelectedStudent(studentList[0]);
      }
    } else if (studentList.length === 0 && !isLoadingData) {
      setSelectedStudent(null);
    }
  }, [user, studentList, selectedStudent, isLoadingData]);

  useEffect(() => {
    if (isPreviewModalOpen && previewContainerRef.current) {
      const observer = new ResizeObserver((entries) => {
        const { width } = entries[0].contentRect;
        // Approximate base widths of the card
        const baseWidth = orientation === 'horizontal' ? 860 : 550;
        // Keep scale smooth, maximum 1 (100%)
        const newScale = Math.min(1, width / baseWidth);
        setPreviewScale(newScale);
      });
      observer.observe(previewContainerRef.current);
      return () => observer.disconnect();
    }
  }, [isPreviewModalOpen, orientation]);

  useEffect(() => {
    if (activeTab === 'preview') {
      let outerObserver: ResizeObserver | null = null;
      let innerObserver: ResizeObserver | null = null;
      
      if (mainPreviewContainerRef.current) {
        outerObserver = new ResizeObserver((entries) => {
          const { width } = entries[0].contentRect;
          const baseWidth = orientation === 'horizontal' ? 860 : 550;
          const newScale = Math.min(1, (width - 32) / baseWidth);
          setMainPreviewScale(newScale > 0 ? newScale : 1);
        });
        outerObserver.observe(mainPreviewContainerRef.current);
      }
      
      if (mainPreviewInnerRef.current) {
        innerObserver = new ResizeObserver((entries) => {
          setMainPreviewHeight(entries[0].contentRect.height);
        });
        innerObserver.observe(mainPreviewInnerRef.current);
      }
      
      return () => {
        outerObserver?.disconnect();
        innerObserver?.disconnect();
      };
    }
  }, [activeTab, orientation, selectedStudent, editingSettings, cardSettings]);

  const isLoading = isLoadingData || !selectedStudent;

  const template = CARD_TEMPLATES[selectedTemplate];
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'guru';
  const isStudent = user?.role === 'student';

  const uniqueClasses = Array.from(new Set(studentList.map((s: StudentProfile) => getStudentDisplayClass(s)))).sort();
  const filteredStudents = selectedClass === 'all' ? studentList : studentList.filter((s: StudentProfile) => getStudentDisplayClass(s) === selectedClass);
  const studentsToPrint = filteredStudents.filter(s => !unselectedIds.has(s.id));

  const formatTableDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const editTabColumns = [
    {
      header: 'No',
      accessorKey: (row: StudentProfile) => <span className="text-text-secondary">{filteredStudents.indexOf(row) + 1}</span>,
      className: 'w-16 text-center',
    },
    {
      header: 'Nama Lengkap',
      accessorKey: (row: StudentProfile) => <span className="font-medium text-text-primary dark:text-text-darkPrimary">{row.fullName || row.name}</span>,
    },
    {
      header: 'NISN',
      accessorKey: (row: StudentProfile) => <span className="text-text-secondary font-mono text-sm">{row.nisn}</span>,
    },
    {
      header: 'Kelas',
      accessorKey: (row: StudentProfile) => (
        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">
          {getStudentDisplayClass(row)}
        </span>
      ),
    },
    {
      header: 'Tempat Lahir',
      accessorKey: (row: StudentProfile) => <span className="text-sm text-text-secondary">{row.birthPlace || '-'}</span>,
    },
    {
      header: 'Tanggal Lahir',
      accessorKey: (row: StudentProfile) => <span className="text-sm text-text-secondary">{formatTableDate(row.birthDate)}</span>,
    },
    {
      header: 'Alamat',
      accessorKey: (row: StudentProfile) => <span className="text-sm text-text-secondary block truncate max-w-[150px]">{row.address || '-'}</span>,
    },
    {
      header: 'Aksi',
      accessorKey: (row: StudentProfile) => (
        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={() => { setEditingStudent(row); setIsEditModalOpen(true); }}
            className="text-blue-500 hover:text-blue-700 transition-colors p-1"
            title="Edit Identitas"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { 
              setEditingStudent(row); 
              setPhotoUrl(''); 
              setIsPhotoModalOpen(true); 
            }}
            className="text-emerald-500 hover:text-emerald-700 transition-colors p-1"
            title="Ubah Foto Profil"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { 
              setSelectedStudent(row); 
              setIsPreviewModalOpen(true);
            }}
            className="text-amber-500 hover:text-amber-700 transition-colors p-1"
            title="Preview Kartu Pelajar (Cepat)"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'text-center',
    },
  ];

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
            @page { size: A4 portrait; margin: 0 !important; }
            .a4-print-page {
               width: 210mm;
               height: 297mm;
               padding: 10mm 5mm;
               page-break-after: always;
               break-after: page;
               box-sizing: border-box;
               display: flex;
               flex-wrap: wrap;
               align-content: flex-start;
               justify-content: center;
               gap: 4px;
               overflow: hidden;
            }
            .a4-print-page:last-child {
               page-break-after: auto;
               break-after: auto;
            }
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
    if (!editingStudent) return;
    const toastId = toast.loading('Menyimpan perubahan identitas...');
    updateStudent.mutate({ id: editingStudent.id, data }, {
      onSuccess: () => {
        toast.success('Identitas berhasil disimpan!', { id: toastId });
        setIsEditModalOpen(false);
        studentsQuery.refetch();
        if (selectedStudent && selectedStudent.id === editingStudent.id) {
          setSelectedStudent(prev => prev ? { ...prev, ...data } : null);
        }
      },
      onError: () => toast.error('Gagal menyimpan perubahan identitas', { id: toastId })
    });
  };

  const handleSavePhoto = async () => {
    if (!editingStudent || !photoUrl) {
       toast.error('Belum ada foto baru yang dipilih.');
       return;
    }
    const toastId = toast.loading('Mengunggah dan menyimpan foto...');
    setIsUploadingPhoto(true);
    try {
      let finalUrl = photoUrl;
      // If it's a base64 string, upload it to the server
      if (photoUrl.startsWith('data:image')) {
        const res = await fetch(photoUrl);
        const blob = await res.blob();
        const uploaded = await galleryService.upload(blob);
        finalUrl = uploaded.url;
      }
      
      updateStudent.mutate({ id: editingStudent.id, data: { photoUrl: finalUrl } }, {
        onSuccess: () => {
          toast.success('Foto profil berhasil diperbarui!', { id: toastId });
          setIsPhotoModalOpen(false);
          setPhotoUrl('');
          studentsQuery.refetch();
          if (selectedStudent && selectedStudent.id === editingStudent.id) {
            setSelectedStudent(prev => prev ? { ...prev, photoUrl: finalUrl } : null);
          }
        },
        onError: () => toast.error('Gagal menyimpan foto profil', { id: toastId })
      });
    } catch (err: any) {
      toast.error(`Gagal mengunggah foto: ${err.message}`, { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveSettings = async () => {
    const toastId = toast.loading('Menyimpan pengaturan kartu...');
    
    try {
      const finalSettings = { ...editingSettings };
      const keysToUpload = ['headmasterSignatureUrl', 'kemenagLogoUrl', 'schoolStampUrl'] as const;
      
      for (const key of keysToUpload) {
        if (finalSettings[key] && finalSettings[key].startsWith('data:image')) {
          const res = await fetch(finalSettings[key]);
          const blob = await res.blob();
          const uploaded = await galleryService.upload(blob);
          if (uploaded?.url) {
            finalSettings[key] = uploaded.url;
          }
        }
      }

      updateSettingsMutation.mutate({
        ...cardSettings,
        ...finalSettings,
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
    } catch (err: any) {
      toast.error(`Gagal mengunggah gambar pengaturan: ${err.message}`, { id: toastId });
    }
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
                <div 
                  ref={mainPreviewContainerRef}
                  className="bg-gray-50 dark:bg-[#0a0a0a] p-4 sm:p-8 rounded-xl border border-border-light dark:border-border-dark w-full overflow-hidden flex justify-center custom-scrollbar"
                >
                  {/* Bounding Box wrapper to eliminate flex-centering clipping */}
                  <div 
                    style={{ 
                      width: `${(orientation === 'horizontal' ? 860 : 550) * mainPreviewScale}px`,
                      height: `${mainPreviewHeight * mainPreviewScale}px`,
                      overflow: 'hidden',
                      transition: 'height 0.2s ease-out'
                    }}
                  >
                    <div 
                      style={{ 
                        transform: `scale(${mainPreviewScale})`, 
                        transformOrigin: 'top left',
                        width: `${orientation === 'horizontal' ? 860 : 550}px`
                      }} 
                    >
                      {/* Print bounds exclude scaling! */}
                      <div ref={printRef} className="card-outer-wrapper">
                        <div 
                          ref={mainPreviewInnerRef}
                          className="card-wrapper flex flex-col items-center gap-6"
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
                                kemenagLogoUrl: getFullUrl(editingSettings.kemenagLogoUrl),
                                schoolStampUrl: getFullUrl(editingSettings.schoolStampUrl),
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

          {/* ===== EDIT IDENTITAS TAB ===== */}
          {activeTab === 'edit' && (
            <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm space-y-6">
               <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border-light dark:border-border-dark pb-4">
                 <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
                   <Edit2 className="w-4 h-4 text-primary" />
                   Manajemen Identitas Siswa
                 </h3>
                 {(isTeacher || isAdmin) && (
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
                   </div>
                 )}
               </div>

               <DataTable 
                 data={filteredStudents} 
                 columns={editTabColumns} 
                 keyExtractor={(s) => s.id} 
                 compact
                 className="max-h-[calc(100vh-280px)]"
               />
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-3">Logo Kementerian (opsional)</label>
                        <div className="w-full max-w-[200px]">
                          <PhotoUploader
                            currentPhotoUrl={getFullUrl(editingSettings.kemenagLogoUrl) || ''}
                            onPhotoChange={(url) => setEditingSettings({...editingSettings, kemenagLogoUrl: url})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-3">Tanda Tangan Kepsek (PNG Transparan)</label>
                        <div className="w-full max-w-[200px]">
                          <PhotoUploader
                            currentPhotoUrl={getFullUrl(editingSettings.headmasterSignatureUrl) || ''}
                            onPhotoChange={(url) => setEditingSettings({...editingSettings, headmasterSignatureUrl: url})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-3">Stempel Sekolah (PNG Transparan)</label>
                        <div className="w-full max-w-[200px]">
                          <PhotoUploader
                            currentPhotoUrl={getFullUrl(editingSettings.schoolStampUrl) || ''}
                            onPhotoChange={(url) => setEditingSettings({...editingSettings, schoolStampUrl: url})}
                          />
                        </div>
                      </div>
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
                {Array.from({ length: Math.ceil(studentsToPrint.length / 10) }).map((_, pageIndex) => {
                  const chunk = studentsToPrint.slice(pageIndex * 10, (pageIndex + 1) * 10);
                  return (
                    <div key={`front-page-${pageIndex}`} className="a4-print-page">
                      {chunk.map((s) => (
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
                              kemenagLogoUrl: getFullUrl(editingSettings.kemenagLogoUrl),
                              schoolStampUrl: getFullUrl(editingSettings.schoolStampUrl),
                              academicYear: cardSettings.academicYear,
                              showQrCode: cardSettings.showQrCode,
                            }}
                            orientation={orientation}
                            scale={0.5}
                            side="front"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Back Sides Grid */}
                {Array.from({ length: Math.ceil(studentsToPrint.length / 10) }).map((_, pageIndex) => {
                  const chunk = studentsToPrint.slice(pageIndex * 10, (pageIndex + 1) * 10);
                  return (
                    <div key={`back-page-${pageIndex}`} className="a4-print-page">
                      {chunk.map((s) => (
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
                              kemenagLogoUrl: getFullUrl(editingSettings.kemenagLogoUrl),
                              schoolStampUrl: getFullUrl(editingSettings.schoolStampUrl),
                              academicYear: cardSettings.academicYear,
                              showQrCode: cardSettings.showQrCode,
                            }}
                            orientation={orientation}
                            scale={0.5}
                            side="back"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- QUICK PREVIEW MODAL --- */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Preview Kartu Pelajar"
        description={`Melihat tampilan kartu depan untuk ${selectedStudent?.fullName || selectedStudent?.name}`}
        className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl"
      >
        <div 
          ref={previewContainerRef}
          className="p-4 sm:p-6 flex justify-center bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark overflow-hidden mt-2"
        >
           {/* Wrap scaling layer to kill margin clipping out of flex center */}
           <div 
             style={{ 
               width: `${(orientation === 'horizontal' ? 860 : 550) * previewScale}px`,
               height: `${(orientation === 'horizontal' ? 550 : 860) * previewScale}px`,
               overflow: 'hidden'
             }}
           >
             <div 
               style={{ 
                 transform: `scale(${previewScale})`, 
                 transformOrigin: 'top left',
                 width: `${orientation === 'horizontal' ? 860 : 550}px`,
                 height: `${orientation === 'horizontal' ? 550 : 860}px`
               }} 
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
                      photoUrl: selectedStudent.photoUrl,
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
                      headmasterSignatureUrl: getFullUrl(editingSettings.headmasterSignatureUrl || cardSettings.headmasterSignatureUrl),
                      kemenagLogoUrl: getFullUrl(editingSettings.kemenagLogoUrl || cardSettings.kemenagLogoUrl),
                      schoolStampUrl: getFullUrl(editingSettings.schoolStampUrl || cardSettings.schoolStampUrl),
                      academicYear: cardSettings.academicYear,
                      showQrCode: cardSettings.showQrCode,
                    }}
                    orientation={orientation}
                    scale={1}
                    side="front"
                  />
                )}
             </div>
           </div>
        </div>
        <div className="mt-6 flex justify-end">
           <Button type="button" onClick={() => setIsPreviewModalOpen(false)}>
             Tutup
           </Button>
        </div>
      </Modal>

      {/* --- EDIT IDENTITY MODAL --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Identitas Siswa"
        description={`Mengubah data profil untuk ${editingStudent?.fullName || editingStudent?.name}`}
      >
        <div className="py-2">
          {editingStudent && (
            <StudentIdentityForm
              initialData={{
                name: editingStudent.name,
                nisn: editingStudent.nisn,
                className: editingStudent.className,
                birthPlace: editingStudent.birthPlace,
                birthDate: editingStudent.birthDate,
                gender: editingStudent.gender,
                address: editingStudent.address || '',
              }}
              mode="edit"
              onSubmit={handleFormSubmit}
              disabled={updateStudent.isPending}
            />
          )}
        </div>
      </Modal>

      {/* --- PHOTO MODAL --- */}
      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title="Ubah Foto Profil Siswa"
        description={`Mengatur foto kartu pelajar untuk ${editingStudent?.fullName || editingStudent?.name}`}
      >
        <div className="py-4 space-y-6">
          <div className="flex justify-center">
             <PhotoUploader
               currentPhotoUrl={photoUrl || (editingStudent?.photoUrl ? getFullUrl(editingStudent.photoUrl) : '')}
               onPhotoChange={setPhotoUrl}
               disabled={isUploadingPhoto}
             />
          </div>
          <div className="flex justify-center -mt-2">
             <Button type="button" variant="outline" size="sm" onClick={() => setShowCamera(true)} disabled={isUploadingPhoto}>
               <Camera className="w-4 h-4 mr-2" /> Gunakan Kamera
             </Button>
          </div>
          <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-border-light dark:border-border-dark">
             <button type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => setIsPhotoModalOpen(false)} disabled={isUploadingPhoto}>
               Batal
             </button>
             <button
               type="button"
               onClick={handleSavePhoto}
               disabled={!photoUrl || isUploadingPhoto}
               className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
             >
               {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Foto'}
             </button>
          </div>
        </div>
      </Modal>

      {/* --- CAMERA FULLSCREEN OVERLAY --- */}
      {showCamera && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-black w-full h-full sm:max-w-4xl sm:h-[80vh] sm:rounded-2xl sm:border sm:border-gray-800 sm:shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="hidden sm:flex items-center justify-between p-4 bg-[#111] border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Ambil Foto
              </h3>
              <button onClick={() => setShowCamera(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col bg-black min-h-0 relative">
              <CameraCapture 
                onCapture={(base64) => {
                  setPhotoUrl(base64);
                  setShowCamera(false);
                }}
                onClose={() => setShowCamera(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
