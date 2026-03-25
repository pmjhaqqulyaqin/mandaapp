import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { GenerateSuratModal } from './components/GenerateSuratModal';
import { CatatSuratMasukModal } from './components/CatatSuratMasukModal';
import { LembarDisposisiPrint } from './components/LembarDisposisiPrint';
import { PengaturanEOfficeModal } from './components/PengaturanEOfficeModal';
import { toast } from 'sonner';
import { useRef } from 'react';
import { Pencil, Trash2, Upload, Settings } from 'lucide-react';

export const EOfficePage = () => {
  const [activeTab, setActiveTab] = useState<'keluar' | 'masuk'>('keluar');
  const [suratKeluars, setSuratKeluars] = useState<any[]>([]);
  const [suratMasuks, setSuratMasuks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMasukModalOpen, setIsMasukModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resultNomor, setResultNomor] = useState<string | null>(null);
  
  const [selectedSuratPrint, setSelectedSuratPrint] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchSuratKeluar = async () => {
    try {
      const res = await apiClient<any>('/eoffice/surat-keluar', { method: 'GET' });
      setSuratKeluars(Array.isArray(res) ? res : (res.data || []));
    } catch (err: any) {
      toast.error('Gagal mengambil data surat keluar');
    }
  };

  const fetchSuratMasuk = async () => {
    try {
      const res = await apiClient<any>('/eoffice/surat-masuk', { method: 'GET' });
      setSuratMasuks(Array.isArray(res) ? res : (res.data || []));
    } catch (err: any) {
      toast.error('Gagal mengambil data surat masuk');
    }
  };

  const handleExport = () => {
    const endpoint = activeTab === 'keluar' ? '/eoffice/surat-keluar/export' : '/eoffice/surat-masuk/export';
    // Gunakan window.open atau fetch blob untuk mengunduh
    // karena API Base URL kita ada di env, bisa buat link auth sederhana jika tidak diprotect token cookie
    // Untuk cookie based auth (better-auth), window.open(URL) bekerja jika request GET membawa cookies.
    window.open(`http://localhost:3001/api${endpoint}`, '_blank');
    toast.success('Mengunduh rekap Excel...');
  };

  const handlePrintDisposisi = (surat: any) => {
    setSelectedSuratPrint(surat);
    setTimeout(() => {
      window.print();
    }, 300); // small delay to allow render
  };

  useEffect(() => {
    fetchSuratKeluar();
    fetchSuratMasuk();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Nomor berhasil disalin!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tata Usaha & E-Office</h1>
          <p className="text-gray-500 dark:text-gray-400">Pusat kontrol persuratan dan administrasi madrasah</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Settings size={16} /> Pengaturan E-Office
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            🖨️ Export Rekap (Excel)
          </button>
          <button 
            onClick={() => {
              if (activeTab === 'keluar') {
                setResultNomor(null);
                setIsModalOpen(true);
              } else {
                setIsMasukModalOpen(true);
              }
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-medium transition-all active:scale-95 flex items-center gap-2"
          >
            {activeTab === 'keluar' ? '+ Ambil Nomor Baru' : '+ Catat Surat Masuk'}
          </button>
        </div>
      </div>

      {resultNomor && (
        <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Nomor Anda Berhasil Diamankan!</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{resultNomor}</p>
          </div>
          <button 
            onClick={() => handleCopy(resultNomor)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a] shadow-sm hover:shadow-md transition-shadow text-emerald-600"
          >
            📋
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={() => setActiveTab('keluar')}
          className={`pb-4 font-medium text-sm transition-colors relative ${activeTab === 'keluar' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          Buku Ekspedisi Keluar
          {activeTab === 'keluar' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('masuk')}
          className={`pb-4 font-medium text-sm transition-colors relative ${activeTab === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          Registrasi Surat Masuk
          {activeTab === 'masuk' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></div>}
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {activeTab === 'keluar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 dark:bg-black/20 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">No. Urut</th>
                  <th className="px-6 py-4 font-medium">Nomor Lengkap</th>
                  <th className="px-6 py-4 font-medium">Perihal & Tujuan</th>
                  <th className="px-6 py-4 font-medium">Tanggal</th>
                  <th className="px-6 py-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {suratKeluars.map((surat, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">#{surat.nomorUrut}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{surat.nomorLengkap}</td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-gray-200">{surat.perihal}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{surat.tujuan || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(surat.tanggalGenerate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleCopy(surat.nomorLengkap)} className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Salin</button>
                    </td>
                  </tr>
                ))}
                {suratKeluars.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Belum ada surat keluar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'masuk' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 dark:bg-black/20 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">No. Agenda</th>
                  <th className="px-6 py-4 font-medium">Tgl Terima</th>
                  <th className="px-6 py-4 font-medium">Asal & No. Surat Asli</th>
                  <th className="px-6 py-4 font-medium">Perihal</th>
                  <th className="px-6 py-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {suratMasuks.map((surat, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{surat.nomorAgenda}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(surat.tanggalDiterima).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{surat.pengirim}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{surat.nomorSuratAsli}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-200 truncate max-w-xs">{surat.perihal}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button 
                        onClick={() => handlePrintDisposisi(surat)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-colors"
                        title="Cetak Disposisi Fisik"
                      >
                        🖨️ Cetak
                      </button>
                      <button className="p-2 bg-gray-100 dark:bg-[#2a2a2a] text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button className="p-2 bg-gray-100 dark:bg-[#2a2a2a] text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors" title="Upload Arsip">
                        <Upload size={16} />
                      </button>
                      <button className="p-2 bg-gray-100 dark:bg-[#2a2a2a] text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {suratMasuks.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Belum ada surat masuk yang tercatat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals & Print Layous */}
      <GenerateSuratModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(no) => {
          setResultNomor(no);
          fetchSuratKeluar();
        }}
      />

      <CatatSuratMasukModal 
        isOpen={isMasukModalOpen}
        onClose={() => setIsMasukModalOpen(false)}
        onSuccess={fetchSuratMasuk}
      />

      <PengaturanEOfficeModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <LembarDisposisiPrint ref={printRef} surat={selectedSuratPrint} />
    </div>
  );
};
