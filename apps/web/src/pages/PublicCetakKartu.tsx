import React, { useState, useEffect } from 'react';
import { useCards } from '../hooks/api/useCards';
import { useSiteSettings } from '../hooks/api/useSettings';
import { PrintableStudentCard, CARD_TEMPLATES, Button } from '@mandaapp/ui';
import { Search, Printer, AlertCircle, User, Hash, CreditCard, CheckCircle2 } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../lib/api';

type SearchMode = 'identity' | 'nisn';

export const PublicCetakKartu = () => {
  const { querySettings } = useCards();
  const { get: getSiteSetting } = useSiteSettings();
  const settings = querySettings.data;

  // Global settings overrides
  const globalLogoUrl = getSiteSetting('logo_url', '');
  const globalKemenagLogoUrl = getSiteSetting('kemenag_logo_url', '');
  const globalSchoolName = getSiteSetting('school_name', '');
  const globalSchoolAddress = getSiteSetting('address', '');
  const globalSchoolPhone = getSiteSetting('phone', '');
  const globalSchoolEmail = getSiteSetting('email', '');
  const globalHeadmasterName = getSiteSetting('principal_name', '');
  const globalHeadmasterNip = getSiteSetting('principal_nip', '');

  const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
  const getFullUrl = (url?: string) => url?.startsWith('/') ? `${SERVER_BASE_URL}${url}` : (url || '');

  const [searchMode, setSearchMode] = useState<SearchMode>('identity');
  
  // Identity search fields
  const [formData, setFormData] = useState({
    fullName: '',
    birthPlace: '',
    birthDate: '',
  });

  // NISN search field
  const [nisnInput, setNisnInput] = useState('');

  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customOrientation, setCustomOrientation] = useState<string | null>(null);
  
  const currentOrientation = customOrientation || settings?.orientation || 'horizontal';

  const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';

  useEffect(() => {
    if (isPreview) {
      try {
        const storedDataStr = localStorage.getItem('batch-print-data');
        if (storedDataStr) {
          const parsed = JSON.parse(storedDataStr);
          if (parsed && parsed.students && parsed.students.length > 0) {
            const s = parsed.students[0];
            setStudentData({
               fullName: s.name || s.fullName,
               nisn: s.nisn,
               className: s.className,
               birthPlace: s.birthPlace,
               birthDate: s.birthDate,
               gender: s.gender,
               address: s.address,
               photoUrl: s.photoUrl
            });
            // Automatically trigger print dialog shortly after loading
            setTimeout(() => window.print(), 800);
          }
        }
      } catch (e) {
        console.error('Failed to parse preview data', e);
      }
    }
  }, [isPreview]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStudentData(null);

    if (searchMode === 'nisn') {
      if (!nisnInput.trim()) {
        setError("Kolom NISN wajib diisi.");
        return;
      }
    } else {
      if (!formData.fullName || !formData.birthPlace || !formData.birthDate) {
        setError("Semua kolom wajib diisi.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = searchMode === 'nisn'
        ? { nisn: nisnInput.trim(), searchMode: 'nisn' }
        : { ...formData, searchMode: 'identity' };

      const data = await apiClient<any>('/students/public-search', { data: payload });
      setStudentData(data);
    } catch (err: any) {
      if (err.message && err.message !== 'An error occurred' && err.message !== 'Not Found') {
        setError(err.message);
      } else {
        setError(
          searchMode === 'nisn'
            ? "Data siswa tidak ditemukan. Pastikan NISN yang dimasukkan sudah benar."
            : "Data siswa tidak ditemukan. Pastikan ejaan nama, tempat, dan tanggal lahir sudah sesuai."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetSearch = () => {
    setStudentData(null);
    setError(null);
    setFormData({ fullName: '', birthPlace: '', birthDate: '' });
    setNisnInput('');
  };

  const switchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setError(null);
    setStudentData(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10 print:hidden">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 mb-5">
          <CreditCard className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Cetak Kartu Pelajar
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Silakan masukkan data diri Anda dengan benar untuk mencari dan mencetak Kartu Pelajar secara mandiri.
        </p>
      </div>

      {!isPreview && !studentData && (
        <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden print:hidden">
          
          {/* Search Mode Toggle */}
          <div className="border-b border-gray-100 dark:border-gray-800">
            <div className="flex">
              <button
                type="button"
                onClick={() => switchMode('identity')}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-semibold transition-all relative ${
                  searchMode === 'identity'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <User className="w-4.5 h-4.5" />
                <span>Cari dengan Data Diri</span>
                {searchMode === 'identity' && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => switchMode('nisn')}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-semibold transition-all relative ${
                  searchMode === 'nisn'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <Hash className="w-4.5 h-4.5" />
                <span>Cari dengan NISN</span>
                {searchMode === 'nisn' && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <form onSubmit={handleSearch} className="space-y-6">
              
              {searchMode === 'identity' ? (
                /* Identity Search Mode */
                <div className="space-y-5">
                  <div className="bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl px-4 py-3 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Masukkan <strong>Nama Lengkap</strong>, <strong>Tempat Lahir</strong>, dan <strong>Tanggal Lahir</strong> sesuai data yang terdaftar di sekolah.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nama Lengkap <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Misal: Budi Santoso"
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-white p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tempat Lahir <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Misal: Jakarta"
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-white p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        value={formData.birthPlace}
                        onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tanggal Lahir <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-white p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* NISN Search Mode */
                <div className="space-y-5">
                  <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl px-4 py-3 flex items-start gap-3">
                    <Hash className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Masukkan <strong>Nomor Induk Siswa Nasional (NISN)</strong> Anda. NISN terdiri dari 10 digit angka yang tertera di rapor atau data sekolah.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      NISN (Nomor Induk Siswa Nasional) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Hash className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Misal: 0012345678"
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-white p-3.5 pl-12 text-lg font-mono tracking-wider focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        value={nisnInput}
                        onChange={(e) => {
                          // Only allow digits
                          const val = e.target.value.replace(/\D/g, '');
                          setNisnInput(val);
                        }}
                        maxLength={10}
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      NISN terdiri dari 10 digit angka. Contoh: 0012345678
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  {loading ? 'Mencari...' : (searchMode === 'nisn' ? 'Cari dengan NISN' : 'Cari Data Saya')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESULT SECTION */}
      {studentData && settings && (
        <div className="mt-12">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kartu Pelajar Ditemukan</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{studentData.fullName} — {studentData.nisn}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
              <button
                onClick={handleResetSearch}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cari Ulang
              </button>

              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                 <button 
                   onClick={() => setCustomOrientation('horizontal')}
                   className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentOrientation === 'horizontal' ? 'bg-white dark:bg-gray-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                 >
                   Horizontal
                 </button>
                 <button 
                   onClick={() => setCustomOrientation('vertical')}
                   className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentOrientation === 'vertical' ? 'bg-white dark:bg-gray-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                 >
                   Vertikal
                 </button>
              </div>

              <Button onClick={handlePrint} variant={"primary" as any} className="bg-emerald-500 hover:bg-emerald-600 border-none gap-2 px-6 shadow-lg shadow-emerald-500/20 font-bold rounded-xl">
                 <Printer className="w-4 h-4" /> Cetak Kartu
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 print:block print:w-full print:m-0">
             <PrintableStudentCard 
                student={{
                  name: studentData.fullName,
                  nisn: studentData.nisn,
                  className: studentData.className,
                  birthPlace: studentData.birthPlace,
                  birthDate: studentData.birthDate,
                  gender: studentData.gender,
                  address: studentData.address,
                  photoUrl: studentData.photoUrl
                }}
                template={CARD_TEMPLATES[(settings.selectedTemplate as keyof typeof CARD_TEMPLATES) || 'classic-blue']}
                settings={{
                  schoolName: globalSchoolName || settings.schoolName,
                  schoolSubtitle: settings.schoolSubtitle,
                  schoolAddress: globalSchoolAddress || settings.schoolAddress,
                  schoolPhone: globalSchoolPhone,
                  schoolEmail: globalSchoolEmail,
                  headmasterName: globalHeadmasterName,
                  headmasterNip: globalHeadmasterNip,
                  termsText: settings.termsText,
                  schoolLogoUrl: getFullUrl(globalLogoUrl || settings.schoolLogoUrl),
                  headmasterSignatureUrl: getFullUrl(settings.headmasterSignatureUrl),
                  kemenagLogoUrl: getFullUrl(globalKemenagLogoUrl || settings.kemenagLogoUrl),
                  schoolStampUrl: getFullUrl(settings.schoolStampUrl),
                  academicYear: settings.academicYear,
                  showQrCode: settings.showQrCode,
                }}
                orientation={currentOrientation as any}
                scale={1}
                side="both"
             />
          </div>

        </div>
      )}

      {/* PRINT STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          header, footer, nav, .print-hidden { display: none !important; }
          .printable-card-wrapper {
             margin: 10mm auto !important;
          }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}} />
    </div>
  );
};
