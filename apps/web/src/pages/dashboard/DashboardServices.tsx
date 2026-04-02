import { useState, useMemo, useRef } from 'react';
import { usePTSP } from '../../hooks/api/usePTSP';
import { 
  FileText, GraduationCap, UserCheck, Search as SearchIcon, 
  Megaphone, Briefcase, BookOpen, MessageSquare,
  Clock, CheckCircle, XCircle, ChevronRight, Download,
  BarChart3, Users, Star, MessageCircle, FileDown, User, Calendar
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
  { id: 'survey-layanan', label: 'Survey Pelayanan', short: 'Survey', icon: <BarChart3 className="w-4 h-4" /> },
];

// Survey question labels for display
const SURVEY_QUESTIONS: Record<string, string> = {
  q1: 'Hasil Pelayanan',
  q2: 'Kemampuan Petugas',
  q3: 'Kesopanan & Keramahan',
  q4: 'Penanganan Pengaduan',
  q5: 'Sarana & Prasarana',
  q6: 'Kesesuaian Persyaratan',
  q7: 'Prosedur Pelayanan',
  q8: 'Ketepatan Waktu',
  q9: 'Kewajaran Biaya',
};

const getRatingCategory = (avg: number) => {
  if (avg >= 3.5) return { text: 'Sangat Puas', color: 'text-green-600', bg: 'bg-green-100' };
  if (avg >= 2.5) return { text: 'Puas', color: 'text-blue-600', bg: 'bg-blue-100' };
  if (avg >= 1.5) return { text: 'Kurang Puas', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  return { text: 'Tidak Puas', color: 'text-red-600', bg: 'bg-red-100' };
};

const getOverallGrade = (pct: number) => {
  if (pct >= 87.5) return { grade: 'A', label: 'Sangat Baik', color: '#10b981' };
  if (pct >= 62.5) return { grade: 'B', label: 'Baik', color: '#3b82f6' };
  if (pct >= 37.5) return { grade: 'C', label: 'Cukup', color: '#f59e0b' };
  return { grade: 'D', label: 'Kurang', color: '#ef4444' };
};

export const DashboardServices = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const { queryAll, updateStatusMutation, deleteMutation } = usePTSP();
  
  // Use activeTab id directly for the query (matches the service.id stored in DB)
  const { data: requests, isLoading } = queryAll(activeTab);

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

  const isSurveyTab = activeTab === 'survey-layanan';

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
          {isSurveyTab ? (
            <SurveyDashboard requests={requests} isLoading={isLoading} onOpenDetail={handleOpenReq} onDelete={handleDelete} />
          ) : (
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
          )}
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
                 <h2 className="font-bold text-xl text-gray-800 dark:text-white">
                   {isSurveyTab ? 'Detail Responden' : `Detail Resi ${selectedReq.ticketId}`}
                 </h2>
                 <p className="text-sm text-gray-500">{new Date(selectedReq.createdAt).toLocaleString('id-ID')}</p>
               </div>
               <button onClick={() => setSelectedReq(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500">
                 <XCircle className="w-6 h-6" />
               </button>
            </div>

            <div className="p-6 space-y-8">
               
               {/* Detail Pemohon */}
               <section>
                 <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">
                   {isSurveyTab ? 'Identitas Responden' : 'Informasi Pemohon'}
                 </h3>
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
                   {!isSurveyTab && (
                     <div>
                       <p className="text-xs text-gray-500 mb-1">Alamat/Tempat Tanggal Lahir</p>
                       <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedReq.address} | {selectedReq.birthPlace}, {selectedReq.birthDate}</p>
                     </div>
                   )}
                 </div>
               </section>

               {/* Survey-specific detail: show ratings */}
               {isSurveyTab && selectedReq.formData && (() => {
                 const fd = typeof selectedReq.formData === 'string' ? JSON.parse(selectedReq.formData) : selectedReq.formData;
                 return (
                   <>
                     <section>
                       <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Info Tambahan</h3>
                       <div className="grid grid-cols-2 gap-3">
                         {fd.gender && (
                           <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                             <p className="text-xs text-gray-500 mb-1">Jenis Kelamin</p>
                             <p className="font-semibold text-gray-800 dark:text-gray-100">{fd.gender}</p>
                           </div>
                         )}
                         {fd.age && (
                           <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                             <p className="text-xs text-gray-500 mb-1">Usia</p>
                             <p className="font-semibold text-gray-800 dark:text-gray-100">{fd.age} tahun</p>
                           </div>
                         )}
                       </div>
                       {fd.layananPtsp && (
                         <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl mt-3">
                           <p className="text-xs text-gray-500 mb-1">Layanan PTSP yang Digunakan</p>
                           <p className="font-semibold text-gray-800 dark:text-gray-100">{fd.layananPtsp}</p>
                         </div>
                       )}
                     </section>

                     <section>
                       <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Penilaian Rating</h3>
                       <div className="space-y-3">
                         {Object.entries(SURVEY_QUESTIONS).map(([key, label]) => {
                           const val = parseInt(fd[key]) || 0;
                           const cat = getRatingCategory(val);
                           return (
                             <div key={key} className="flex items-center gap-3">
                               <div className="w-40 text-sm text-gray-600 dark:text-gray-400 truncate shrink-0">{label}</div>
                               <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-3 overflow-hidden">
                                 <div 
                                   className="h-full rounded-full transition-all duration-500" 
                                   style={{ width: `${(val / 4) * 100}%`, backgroundColor: val >= 3 ? '#10b981' : val >= 2 ? '#f59e0b' : '#ef4444' }}
                                 />
                               </div>
                               <span className={`text-sm font-bold w-6 text-center ${cat.color}`}>{val}</span>
                             </div>
                           );
                         })}
                       </div>
                     </section>

                     {fd.feedback && (
                       <section>
                         <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Kritik & Saran</h3>
                         <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-blue-100 dark:border-blue-900/30">
                           {fd.feedback}
                         </div>
                       </section>
                     )}
                   </>
                 );
               })()}

               {/* Non-survey details */}
               {!isSurveyTab && (
               <section>
                 {selectedReq.purpose && (
                 <>
                 <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Keperluan / Keterangan</h3>
                 <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-blue-100 dark:border-blue-900/30 font-medium mb-4">
                   {selectedReq.purpose}
                 </div>
                 </>
                 )}

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
               )}

               {/* Aksi Respon (Hidden for Survey) */}
               {!isSurveyTab && (
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
               )}

               {/* Survey: only delete button */}
               {isSurveyTab && (
                 <div className="pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                   <button onClick={() => handleDelete(selectedReq.id)} className="text-red-500 hover:text-red-600 text-sm font-medium hover:underline">
                     Hapus Responden Ini
                   </button>
                 </div>
               )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ============================================================
// Survey Dashboard Sub-Component
// ============================================================
const SurveyDashboard = ({ 
  requests, 
  isLoading, 
  onOpenDetail,
  onDelete 
}: { 
  requests: any[] | undefined; 
  isLoading: boolean;
  onOpenDetail: (req: any) => void;
  onDelete: (id: string) => void;
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Compute statistics
  const stats = useMemo(() => {
    if (!requests || requests.length === 0) return null;

    const totalRespondents = requests.length;
    const questionKeys = Object.keys(SURVEY_QUESTIONS);
    const questionStats: Record<string, { sum: number; count: number; avg: number }> = {};

    questionKeys.forEach(k => { questionStats[k] = { sum: 0, count: 0, avg: 0 }; });

    const feedbacks: { name: string; text: string; date: string; gender?: string; layanan?: string }[] = [];

    requests.forEach((req: any) => {
      try {
        const fd = typeof req.formData === 'string' ? JSON.parse(req.formData) : req.formData;
        if (!fd) return;

        questionKeys.forEach(k => {
          const val = parseInt(fd[k]);
          if (!isNaN(val) && val >= 1 && val <= 4) {
            questionStats[k].sum += val;
            questionStats[k].count += 1;
          }
        });

        if (fd.feedback && fd.feedback.trim()) {
          feedbacks.push({
            name: req.applicantName || 'Anonim',
            text: fd.feedback,
            date: req.createdAt,
            gender: fd.gender,
            layanan: fd.layananPtsp,
          });
        }
      } catch {}
    });

    // Averages
    let overallSum = 0;
    let overallCount = 0;
    questionKeys.forEach(k => {
      if (questionStats[k].count > 0) {
        questionStats[k].avg = questionStats[k].sum / questionStats[k].count;
        overallSum += questionStats[k].avg;
        overallCount += 1;
      }
    });

    const overallAvg = overallCount > 0 ? overallSum / overallCount : 0;
    const indexPct = (overallAvg / 4) * 100;

    return { totalRespondents, questionStats, overallAvg, indexPct, feedbacks };
  }, [requests]);

  const handleExportPDF = () => {
    const el = printRef.current;
    if (!el) return;

    // Use browser's print dialog with a styled clone
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Popup diblokir browser. Izinkan popup untuk export PDF.');
      return;
    }

    const grade = stats ? getOverallGrade(stats.indexPct) : { grade: '-', label: '-', color: '#999' };

    // Build a clean printable HTML document
    let questionsHTML = '';
    if (stats) {
      Object.entries(SURVEY_QUESTIONS).forEach(([key, label], idx) => {
        const q = stats.questionStats[key];
        const avg = q.avg.toFixed(2);
        const pct = ((q.avg / 4) * 100).toFixed(1);
        const cat = getRatingCategory(q.avg);
        questionsHTML += `
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">${idx+1}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${label}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:bold">${avg}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">${pct}%</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:${cat.color.replace('text-','').includes('green') ? '#10b981' : cat.color.includes('blue') ? '#3b82f6' : cat.color.includes('yellow') ? '#f59e0b' : '#ef4444'}">${cat.text}</td>
          </tr>
        `;
      });
    }

    let feedbacksHTML = '';
    if (stats && stats.feedbacks.length > 0) {
      stats.feedbacks.forEach((fb, idx) => {
        feedbacksHTML += `
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">${idx+1}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600">${fb.name}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${fb.text}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-size:12px;color:#64748b">${new Date(fb.date).toLocaleDateString('id-ID')}</td>
          </tr>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan Hasil Survey Pelayanan - MAN 2 Lombok Timur</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 900px; margin: 0 auto; }
          h1 { font-size: 20px; text-align: center; margin-bottom: 2px; }
          .subtitle { text-align: center; font-size: 13px; color: #64748b; margin-bottom: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
          .summary-box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; }
          .summary-box .value { font-size: 28px; font-weight: 800; }
          .summary-box .label { font-size: 12px; color: #64748b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th { background: #f1f5f9; padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 700; font-size: 12px; text-transform: uppercase; }
          h2 { font-size: 15px; margin-bottom: 12px; color: #334155; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>LAPORAN HASIL SURVEY PELAYANAN</h1>
        <p class="subtitle">Aplikasi SALAM MANDA — MAN 2 Lombok Timur<br>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
        
        <div class="summary-grid">
          <div class="summary-box">
            <div class="value">${stats?.totalRespondents || 0}</div>
            <div class="label">Total Responden</div>
          </div>
          <div class="summary-box">
            <div class="value" style="color:${grade.color}">${stats?.overallAvg.toFixed(2) || '0'} / 4</div>
            <div class="label">Rata-rata Skor</div>
          </div>
          <div class="summary-box">
            <div class="value" style="color:${grade.color}">${stats?.indexPct.toFixed(1) || '0'}%</div>
            <div class="label">Indeks Kepuasan (${grade.label})</div>
          </div>
        </div>

        <h2>Detail Penilaian Per Aspek</h2>
        <table>
          <thead>
            <tr>
              <th style="width:40px">No</th>
              <th>Aspek Penilaian</th>
              <th style="width:80px;text-align:center">Rata-rata</th>
              <th style="width:80px;text-align:center">Persentase</th>
              <th style="width:110px;text-align:center">Kategori</th>
            </tr>
          </thead>
          <tbody>${questionsHTML}</tbody>
        </table>

        ${feedbacksHTML ? `
        <h2>Daftar Kritik & Saran Responden</h2>
        <table>
          <thead>
            <tr>
              <th style="width:40px">No</th>
              <th style="width:140px">Nama</th>
              <th>Kritik / Saran</th>
              <th style="width:100px;text-align:center">Tanggal</th>
            </tr>
          </thead>
          <tbody>${feedbacksHTML}</tbody>
        </table>
        ` : ''}

        <div class="footer">
          Dokumen ini digenerate otomatis oleh Sistem E-PTSP Mandaapp<br>
          © ${new Date().getFullYear()} MAN 2 Lombok Timur
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    // Give it time to render then trigger print (which allows Save as PDF)
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-[700px] flex items-center justify-center">
        <span className="loader animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8"></span>
      </div>
    );
  }

  if (!stats || !requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-[700px] flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="font-bold text-gray-700 dark:text-gray-300">Belum Ada Data Survey</h3>
        <p className="text-sm text-gray-400 mt-1">Data survey akan muncul di sini setelah responden mengisi formulir.</p>
      </div>
    );
  }

  const grade = getOverallGrade(stats.indexPct);

  return (
    <div ref={printRef} className="space-y-6">
      {/* Header + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Rangkuman Survey Pelayanan</h2>
          <p className="text-sm text-gray-500">Statistik dari {stats.totalRespondents} responden</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 text-sm"
        >
          <FileDown className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-gray-800 dark:text-gray-100">{stats.totalRespondents}</div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Total Responden</div>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-amber-500" />
          </div>
          <div className="text-3xl font-black" style={{ color: grade.color }}>{stats.overallAvg.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Rata-rata Skor (dari 4)</div>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border-4" style={{ borderColor: grade.color }}>
            <span className="text-2xl font-black" style={{ color: grade.color }}>{grade.grade}</span>
          </div>
          <div className="text-2xl font-black" style={{ color: grade.color }}>{stats.indexPct.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Indeks Kepuasan ({grade.label})</div>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Detail Penilaian Per Aspek
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(SURVEY_QUESTIONS).map(([key, label], idx) => {
            const q = stats.questionStats[key];
            const pct = (q.avg / 4) * 100;
            const cat = getRatingCategory(q.avg);
            return (
              <div key={key} className="flex items-center gap-4">
                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>{cat.text}</span>
                      <span className="text-sm font-black text-gray-800 dark:text-gray-200 w-10 text-right">{q.avg.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-out" 
                      style={{ 
                        width: `${pct}%`, 
                        background: `linear-gradient(90deg, ${pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444'}, ${pct >= 75 ? '#34d399' : pct >= 50 ? '#60a5fa' : pct >= 25 ? '#fbbf24' : '#f87171'})` 
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback / Kritik Saran */}
      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            Kritik & Saran Responden
          </h3>
          <span className="text-xs text-gray-400 font-semibold">{stats.feedbacks.length} komentar</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {stats.feedbacks.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Belum ada kritik/saran dari responden.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.feedbacks.map((fb, idx) => (
                <div key={idx} className="p-5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{fb.name}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(fb.date).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      {fb.layanan && (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mb-2">
                          {fb.layanan}
                        </span>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{fb.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Individual Respondent List */}
      <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Detail Per Responden
          </h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map((req: any) => {
              let avgScore = 0;
              try {
                const fd = typeof req.formData === 'string' ? JSON.parse(req.formData) : req.formData;
                if (fd) {
                  let sum = 0, cnt = 0;
                  Object.keys(SURVEY_QUESTIONS).forEach(k => {
                    const v = parseInt(fd[k]);
                    if (!isNaN(v)) { sum += v; cnt++; }
                  });
                  if (cnt > 0) avgScore = sum / cnt;
                }
              } catch {}
              const cat = getRatingCategory(avgScore);
              return (
                <div
                  key={req.id}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => onOpenDetail(req)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{req.applicantName}</h4>
                    <p className="text-xs text-gray-500 truncate">{req.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-black ${cat.color}`}>{avgScore.toFixed(1)}</div>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.bg} ${cat.color} mt-0.5`}>{cat.text}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
