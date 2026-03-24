import React, { useState } from 'react';
import { useCards } from '../hooks/api/useCards';
import { PrintableStudentCard, CARD_TEMPLATES, Button } from '@mandaapp/ui';
import { Search, Printer, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/api';

export const PublicCetakKartu = () => {
  const { querySettings } = useCards();
  const settings = querySettings.data;

  const [formData, setFormData] = useState({
    fullName: '',
    birthPlace: '',
    birthDate: '',
  });

  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customOrientation, setCustomOrientation] = useState<string | null>(null);
  
  const currentOrientation = customOrientation || settings?.orientation || 'horizontal';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStudentData(null);

    if (!formData.fullName || !formData.birthPlace || !formData.birthDate) {
      setError("Semua kolom wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient<any>('/students/public-search', { data: formData });
      setStudentData(data);
    } catch (err: any) {
      if (err.message && err.message !== 'An error occurred' && err.message !== 'Not Found') {
        setError(err.message);
      } else {
        setError("Data siswa tidak ditemukan. Pastikan ejaan nama, tempat, dan tanggal lahir sudah sesuai.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Cetak Kartu Pelajar
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Silakan masukkan data diri Anda dengan benar untuk mencari dan mencetak Kartu Pelajar secara mandiri.
        </p>
      </div>

      <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden print:hidden">
        <div className="p-6 sm:p-10">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nama Lengkap (Sesuai Ijazah/Akte)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Budi Santoso"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-white p-3.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  placeholder="Misal: Jakarta"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-white p-3.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-white p-3.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  required
                />
              </div>

            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                className="w-full md:w-auto px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {loading ? 'Mencari...' : 'Cari Data Saya'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* RESULT SECTION */}
      {studentData && settings && (
        <div className="mt-12">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 print:hidden">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kartu Pelajar Ditemukan</h2>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                 <button 
                   onClick={() => setCustomOrientation('horizontal')}
                   className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentOrientation === 'horizontal' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                 >
                   Horizontal
                 </button>
                 <button 
                   onClick={() => setCustomOrientation('vertical')}
                   className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentOrientation === 'vertical' ? 'bg-white dark:bg-gray-700 shadow text-primary dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                 >
                   Vertikal
                 </button>
              </div>

              <Button onClick={handlePrint} variant={"primary" as any} className="bg-emerald-500 hover:bg-emerald-600 border-none gap-2 px-6 shadow-lg shadow-emerald-500/20 font-bold rounded-xl animate-fade-in-up">
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
                settings={settings}
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
          @page { size: auto; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          header, footer, nav, .print-hidden { display: none !important; }
          .printable-card-front, .printable-card-back {
             break-inside: avoid;
             page-break-inside: avoid;
             margin: 10mm auto;
             box-shadow: none !important;
          }
        }
      `}} />
    </div>
  );
};
