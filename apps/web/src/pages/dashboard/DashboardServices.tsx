import { useState } from 'react';
import { usePTSP } from '../../hooks/api/usePTSP';
import { 
  FileText, GraduationCap, UserCheck, Search as SearchIcon, 
  Megaphone, Briefcase, BookOpen, MessageSquare,
  Clock, CheckCircle, XCircle, ChevronRight, Download
} from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { id: 'surat-keterangan', label: 'Surat Keterangan', short: 'Surat Keterangan', icon: <FileText className="w-4 h-4" /> },
  { id: 'legalisir-online', label: 'Legalisir Online', short: 'Legalisir', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'izin-siswa', label: 'Izin Siswa', short: 'Izin Siswa', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'izin-penelitian', label: 'Izin Penelitian', short: 'Izin Penelitian', icon: <SearchIcon className="w-4 h-4" /> },
  { id: 'izin-sosialisasi', label: 'Izin Sosialisasi', short: 'Izin Sosialisasi', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'izin-magang', label: 'Izin Magang', short: 'Izin Magang', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'buku-tamu', label: 'Buku Tamu', short: 'Buku Tamu', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'layanan-pengaduan', label: 'Layanan Pengaduan', short: 'Pengaduan', icon: <MessageSquare className="w-4 h-4" /> },
];

export const DashboardServices = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const currentTabRawLabel = TABS.find(t => t.id === activeTab)?.short || 'Semua';
  const { queryAll, updateStatusMutation, deleteMutation } = usePTSP();
  
  // queryAll parameter based on current active tab
  const { data: requests, isLoading } = queryAll(currentTabRawLabel);

  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [statusVal, setStatusVal] = useState('processing');

  const handleOpenReq = (req: any) => {
    setSelectedReq(req);
    setStatusVal(req.status === 'pending' ? 'processing' : req.status);
    setReplyText(req.adminReply || '');
  };

  const handleSaveReply = async () => {
    if (!selectedReq) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: selectedReq.id,
        status: statusVal,
        adminReply: replyText
      });
      toast.success('Balasan berhasil disimpan & dikirim!');
      setSelectedReq(null);
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus permanen tiket ini?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Berhasil dihapus!");
      setSelectedReq(null);
    } catch (e: any) {
      toast.error("Gagal menghapus");
    }
  };

  const renderStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <span className="bg-green-100 text-green-700 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3"/> Selesai</span>;
      case 'processing': return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Diproses</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-max"><XCircle className="w-3 h-3"/> Ditolak</span>;
      default: return <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Pending</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8 pl-1">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Pusat Layanan (E-PTSP)</h1>
        <p className="text-sm text-gray-500">Kelola dan balas permintaan layanan tiket, persuratan, perizinan, dan pengaduan langsung dari sini.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Nav */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-3 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedReq(null); }}
                className={`flex justify-start items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div className={`${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-[700px]">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
              <h2 className="font-bold text-gray-700 dark:text-gray-200">Menampilkan: {TABS.find(t=>t.id === activeTab)?.label}</h2>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <span className="loader animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8"></span>
                </div>
              ) : (!requests || requests.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                     <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="font-bold text-gray-700 dark:text-gray-300">Belum Ada Permintaan</h3>
                  <p className="text-sm text-gray-400 mt-1">Antrean layanan untuk kategori ini kosong.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {requests.map((req: any) => (
                    <div key={req.id} 
                      className={`p-5 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      onClick={() => handleOpenReq(req)}
                    >
                      <div className="flex-shrink-0 mt-1">
                         {req.status === 'pending' ? <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_0_4px_#fef08a]" /> : null}
                         {req.status === 'completed' ? <div className="w-3 h-3 bg-green-500 rounded-full" /> : null}
                         {req.status === 'processing' ? <div className="w-3 h-3 bg-blue-500 rounded-full" /> : null}
                         {req.status === 'rejected' ? <div className="w-3 h-3 bg-red-500 rounded-full" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start mb-1">
                           <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate">{req.applicantName}</h4>
                           <span className="text-xs font-mono text-gray-400">{req.ticketId}</span>
                         </div>
                         <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                           {req.purpose || 'Tanpa Keterangan Keperluan'}
                         </div>
                         <div className="flex items-center gap-3">
                            {renderStatusBadge(req.status)}
                            <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString('id-ID')}</span>
                         </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 my-auto" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Side Drawer for Selected Request */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReq(null)}>
          <div 
            className="bg-white dark:bg-[#111] w-full max-w-lg h-full shadow-2xl animate-in slide-in-from-right overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-[#111] z-10">
               <div>
                 <h2 className="font-bold text-xl text-gray-800 dark:text-white">Detail Resi {selectedReq.ticketId}</h2>
                 <p className="text-sm text-gray-500">{new Date(selectedReq.createdAt).toLocaleString('id-ID')}</p>
               </div>
               <button onClick={() => setSelectedReq(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500">
                 <XCircle className="w-6 h-6" />
               </button>
            </div>

            <div className="p-6 space-y-8">
               
               {/* Detail Pemohon */}
               <section>
                 <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Informasi Pemohon</h3>
                 <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 space-y-4">
                   <div>
                     <p className="text-xs text-gray-500 mb-1">Nama Lengkap</p>
                     <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedReq.applicantName}</p>
                   </div>
                   {selectedReq.nisn && (
                     <div>
                       <p className="text-xs text-gray-500 mb-1">NISN / NIK</p>
                       <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedReq.nisn}</p>
                     </div>
                   )}
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <p className="text-xs text-gray-500 mb-1">No HP</p>
                       <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedReq.phone}</p>
                     </div>
                     <div>
                       <p className="text-xs text-gray-500 mb-1">Email</p>
                       <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedReq.email}</p>
                     </div>
                   </div>
                   <div>
                     <p className="text-xs text-gray-500 mb-1">Alamat/Tempat Tanggal Lahir</p>
                     <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedReq.address} | {selectedReq.birthPlace}, {selectedReq.birthDate}</p>
                   </div>
                 </div>
               </section>

               <section>
                 <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Keperluan / Keterangan</h3>
                 <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-blue-100 dark:border-blue-900/30 font-medium mb-4">
                   {selectedReq.purpose}
                 </div>

                 {/* Show dynamic formData if exists */}
                 {selectedReq.formData && (
                    <div className="space-y-4">
                      {Object.entries(JSON.parse(selectedReq.formData)).map(([key, value]) => {
                        const labelMap: Record<string, string> = {
                          documentType: 'Jenis Dokumen',
                          additionalNotes: 'Catatan Tambahan',
                          studentName: 'Nama Siswa/Siswi',
                          nis: 'Nomor Induk Siswa (NIS)',
                          description: 'Keterangan/Alasan Izin',
                          startDate: 'Mulai Tanggal',
                          startTime: 'Mulai Jam',
                          endDate: 'Sampai Tanggal',
                          endTime: 'Sampai Jam',
                          institution: 'Asal Lembaga',
                          major: 'Jurusan',
                          educationLevel: 'Jenjang Pendidikan',
                          respondent: 'Responden/Narasumber',
                          fileKtp: 'File KTP',
                          fileKartuMahasiswa: 'File Kartu Mahasiswa',
                          fileSuratPermohonan: 'File Surat Permohonan',
                        };
                        const strVal = value as string;
                        const isFileUrl = strVal && strVal.startsWith('/uploads/');
                        return (
                        <div key={key} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                          <p className="text-xs text-gray-500 uppercase tracking-tight mb-1">
                            {labelMap[key] || key}
                          </p>
                          {isFileUrl ? (
                            <a href={strVal} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:blue-400 rounded-lg text-sm font-semibold transition-colors">
                              <Download className="w-3.5 h-3.5" />
                              {strVal.endsWith('.pdf') ? '📄' : '🖼️'} Download Berkas
                            </a>
                          ) : (
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{strVal}</p>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                 
                 {selectedReq.attachmentUrl && (
                   <div className="mt-4">
                     <a href={selectedReq.attachmentUrl} target="_blank" rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors">
                        <Download className="w-4 h-4" /> Buka Lampiran Tiket
                     </a>
                   </div>
                 )}
               </section>

               {/* Aksi Respon */}
               <section className="pt-6 border-t border-gray-100 dark:border-gray-800">
                 <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Tindakan Admin</h3>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ubah Status</label>
                     <select 
                       value={statusVal} 
                       onChange={e => setStatusVal(e.target.value)}
                       className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                     >
                       <option value="pending">🟡 Tunggu / Pending</option>
                       <option value="processing">🔵 Sedang Diproses</option>
                       <option value="completed">🟢 Selesai / Disetujui</option>
                       <option value="rejected">🔴 Ditolak / Dibatalkan</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catatan Tambahan (Otomatis masuk Email Pemohon)</label>
                     <textarea 
                       rows={4} 
                       value={replyText}
                       onChange={e => setReplyText(e.target.value)}
                       placeholder="Contoh: 'Surat Anda telah ditandatangani, silakan ambil di TU.'"
                       className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                     />
                   </div>

                   <button 
                     onClick={handleSaveReply}
                     disabled={updateStatusMutation.isPending}
                     className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Balasan & Kirim Notifikasi'}
                   </button>
                   
                   <div className="pt-4 text-center">
                     <button onClick={() => handleDelete(selectedReq.id)} className="text-red-500 hover:text-red-600 text-sm font-medium hover:underline">
                       Hapus Tiket Permanen
                     </button>
                   </div>
                 </div>
               </section>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
