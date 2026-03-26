import { useState, useEffect } from 'react';
import { apiClient, apiUpload } from '../../lib/api';
import { GenerateSuratModal } from './components/GenerateSuratModal';
import { CatatSuratMasukModal } from './components/CatatSuratMasukModal';
import { LembarDisposisiPrint } from './components/LembarDisposisiPrint';
import { PengaturanEOfficeModal } from './components/PengaturanEOfficeModal';
import { EditSuratKeluarModal } from './components/EditSuratKeluarModal';
import { EditSuratMasukModal } from './components/EditSuratMasukModal';
import { toast } from 'sonner';
import { useRef } from 'react';
import { Pencil, Trash2, Upload, Settings, Eye, Search as SearchIcon } from 'lucide-react';

export const EOfficePage = () => {
  const [activeTab, setActiveTab] = useState<'keluar' | 'masuk'>('keluar');
  const [suratKeluars, setSuratKeluars] = useState<any[]>([]);
  const [suratMasuks, setSuratMasuks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMasukModalOpen, setIsMasukModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resultNomor, setResultNomor] = useState<string | null>(null);
  
  const [isEditKeluarOpen, setIsEditKeluarOpen] = useState(false);
  const [isEditMasukOpen, setIsEditMasukOpen] = useState(false);
  const [selectedDataEdit, setSelectedDataEdit] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedSuratPrint, setSelectedSuratPrint] = useState<any>(null);
  const [uploadTarget, setUploadTarget] = useState<{ id: string, tipe: 'keluar' | 'masuk' } | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    window.open(`${import.meta.env.VITE_API_URL}${endpoint}`, '_blank');
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

  const handleDelete = async (tipe: 'keluar' | 'masuk', id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus surat ini?')) return;
    try {
      await apiClient(`/eoffice/surat-${tipe}/${id}`, { method: 'DELETE' });
      toast.success('Surat berhasil dihapus');
      tipe === 'keluar' ? fetchSuratKeluar() : fetchSuratMasuk();
    } catch (err: any) {
      toast.error('Gagal menghapus surat');
    }
  };

  const handleUploadClick = (tipe: 'keluar' | 'masuk', id: string) => {
    setUploadTarget({ tipe, id });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const currentSurat = uploadTarget.tipe === 'keluar' 
      ? suratKeluars.find(s => s.id === uploadTarget.id)
      : suratMasuks.find(s => s.id === uploadTarget.id);
    
    const isUpdate = !!currentSurat?.fileUrl;

    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading(isUpdate ? 'Memperbarui dokumen...' : 'Mengunggah dokumen...');
    try {
      setUploadProgress(1); // Start showing bar
      await apiUpload(
        `/eoffice/surat-${uploadTarget.tipe}/${uploadTarget.id}/upload`, 
        formData,
        (percent) => setUploadProgress(percent)
      );
      toast.success(isUpdate ? 'Pembaruan file berhasil!' : 'Dokumen fisik berhasil diunggah!', { id: toastId });
      uploadTarget.tipe === 'keluar' ? fetchSuratKeluar() : fetchSuratMasuk();
    } catch (err: any) {
      toast.error('Gagal mengunggah dokumen: ' + err.message, { id: toastId });
    } finally {
      setTimeout(() => setUploadProgress(0), 300); // Small delay so user sees 100%
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredSuratKeluar = suratKeluars.filter(surat => 
    surat.nomorLengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surat.perihal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surat.tujuan?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuratMasuk = suratMasuks.filter(surat => 
    surat.nomorAgenda?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surat.nomorSuratAsli?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surat.pengirim?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surat.perihal?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (tipe: 'keluar' | 'masuk', surat: any) => {
    setSelectedDataEdit(surat);
    if (tipe === 'keluar') {
      setIsEditKeluarOpen(true);
    } else {
      setIsEditMasukOpen(true);
    }
  };

  const lastSurat = suratKeluars.length > 0 ? suratKeluars[0] : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-100 dark:border-gray-800 pb-8">
        <div className="text-left flex-1">
          <h2 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Korespondensi Dinas
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-md">
            Monitoring penomoran dan pengarsipan surat resmi secara real-time
          </p>
        </div>

        {lastSurat && (
          <div className="px-6 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl shadow-lg border-2 border-white dark:border-gray-800 transform hover:scale-105 transition-transform duration-300">
            <div className="text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Nomor Terakhir</span>
              <div className="text-xl font-bold tabular-nums tracking-tight">
                {lastSurat.nomorLengkap}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="hidden md:block">
        </div>
        <div className="flex gap-3 w-full md:w-auto">
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

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-1">
        <div className="flex gap-6 px-1">
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

        {/* Search Input at far right */}
        <div className="relative group mb-3 md:mb-2 mr-2">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="Cari arsip..."
            className="pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all w-full md:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {uploadProgress > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-white dark:bg-[#1a1a1a] border-b border-emerald-100 dark:border-emerald-800/30 shadow-lg p-4 animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                Sedang Mengunggah Dokumen E-Office...
              </span>
              <span className="font-bold text-gray-700 dark:text-gray-300">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

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
                {filteredSuratKeluar.map((surat, i) => (
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
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button 
                        onClick={() => handleCopy(surat.nomorLengkap)} 
                        className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded mr-2 hover:bg-emerald-100 transition-colors font-medium text-xs"
                      >
                        Salin
                      </button>
                      <button onClick={() => handleEdit('keluar', surat)} className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleUploadClick('keluar', surat.id)} className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-amber-600 rounded-md hover:bg-amber-50 transition-colors" title="Upload Arsip PDF">
                        <Upload size={14} />
                      </button>
                      <button onClick={() => handleDelete('keluar', surat.id)} className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-rose-600 rounded-md hover:bg-rose-50 transition-colors" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                      {surat.fileUrl && (
                        <a href={surat.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors" title="Lihat Dokumen">
                          <Eye size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSuratKeluar.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">Data surat keluar tidak ditemukan.</td></tr>
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
                {filteredSuratMasuk.map((surat, i) => (
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
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button 
                        onClick={() => handlePrintDisposisi(surat)}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-xs font-medium"
                        title="Cetak Disposisi Fisik"
                      >
                        🖨️ Cetak
                      </button>
                      <button onClick={() => handleEdit('masuk', surat)} className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleUploadClick('masuk', surat.id)} className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-amber-600 rounded-md hover:bg-amber-50 transition-colors" title="Upload Arsip PDF">
                        <Upload size={14} />
                      </button>
                      <button onClick={() => handleDelete('masuk', surat.id)} className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-rose-600 rounded-md hover:bg-rose-50 transition-colors" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                      {surat.fileUrl && (
                        <a href={surat.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-100 dark:bg-[#2a2a2a] text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors" title="Lihat Dokumen">
                          <Eye size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSuratMasuk.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">Data surat masuk tidak ditemukan.</td></tr>
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

      <EditSuratKeluarModal 
        isOpen={isEditKeluarOpen}
        onClose={() => setIsEditKeluarOpen(false)}
        onSuccess={fetchSuratKeluar}
        surat={selectedDataEdit}
      />

      <EditSuratMasukModal 
        isOpen={isEditMasukOpen}
        onClose={() => setIsEditMasukOpen(false)}
        onSuccess={fetchSuratMasuk}
        surat={selectedDataEdit}
      />

      <LembarDisposisiPrint ref={printRef} surat={selectedSuratPrint} />
      
      {/* Hidden File Input for Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />
    </div>
  );
};
