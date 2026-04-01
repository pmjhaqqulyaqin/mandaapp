import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

// Define the service configuration
type ServiceType = {
  id: string;
  slug: string;
  title: string;
  shortName: string;
  description: string;
  requirements: string[];
};

export const SERVICES: ServiceType[] = [
  {
    id: 'surat-keterangan',
    slug: 'izin-pembuatan-surat-keterangan', // Handled exact user slug
    title: 'Layanan Pengajuan Pembuatan Surat Keterangan',
    shortName: 'Surat Keterangan',
    description: 'Layanan prima untuk pembuatan Surat Keterangan Aktif, Keterangan Berkelakuan Baik, dll.',
    requirements: ['Kartu Pelajar/Siswa', 'Data Diri Lengkap']
  },
  {
    id: 'legalisir-online',
    slug: 'legalisir-online',
    title: 'Layanan Pengajuan Legalisir Ijazah Online',
    shortName: 'Legalisir',
    description: 'Layanan legalisir dokumen resmi madrasah.',
    requirements: ['Scan Asli Ijazah/SKHUN (PDF/JPG)', 'Bukti Pembayaran (Bila Ada)']
  },
  {
    id: 'izin-siswa',
    slug: 'izin-siswa',
    title: 'Layanan Pengajuan Izin Siswa',
    shortName: 'Izin Siswa',
    description: 'Layanan izin tidak masuk sekolah (Sakit/Izin).',
    requirements: ['Surat Keterangan Dokter (Bila Sakit)', 'Persetujuan Wali Kelas']
  },
  {
    id: 'izin-penelitian',
    slug: 'izin-penelitian',
    title: 'Layanan Pengajuan Izin Penelitian',
    shortName: 'Izin Penelitian',
    description: 'Layanan izin observasi/penelitian untuk mahasiswa/umum.',
    requirements: ['Surat Pengantar dari Universitas/Instansi', 'Proposal Penelitian']
  },
  {
    id: 'izin-sosialisasi',
    slug: 'izin-sosialisasi',
    title: 'Layanan Pengajuan Izin Sosialisasi',
    shortName: 'Izin Sosialisasi',
    description: 'Layanan izin penyuluhan atau kunjungan edukatif.',
    requirements: ['Surat Permohonan Resmi Resmi Instansi', 'Rundown / Materi']
  },
  {
    id: 'izin-magang',
    slug: 'izin-magang',
    title: 'Layanan Pengajuan Izin Magang',
    shortName: 'Izin Magang',
    description: 'Layanan izin Praktik Kerja Industri (Prakerin) / Magang.',
    requirements: ['Surat Pengantar Magang dari Sekolah', 'Biodata Siswa Magang']
  },
  {
    id: 'buku-tamu',
    slug: 'buku-tamu',
    title: 'Buku Tamu Madrasah',
    shortName: 'Buku Tamu',
    description: 'Registrasi kedatangan tamu resmi atau wali murid.',
    requirements: ['KTP / Identitas Valid', 'Tujuan Kunjungan yang Jelas']
  },
  {
    id: 'layanan-pengaduan',
    slug: 'layanan-pengaduan',
    title: 'Layanan Pengaduan Masyarakat',
    shortName: 'Pengaduan',
    description: 'Saluran pelaporan keluhan/saran bagi warga madrasah dan masyarakat umum.',
    requirements: ['Bukti Valid Laporan', 'Identitas Jelas (Rahasia Dijaga)']
  }
];

export const ServiceForm = ({ pageSlug }: { pageSlug: string }) => {
  const navigate = useNavigate();
  const service = SERVICES.find(s => pageSlug.includes(s.slug) || s.slug.includes(pageSlug)) || SERVICES[0];

  const [isLoading, setIsLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  
  // Track Status State
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    applicantName: '',
    nisn: '',
    birthPlace: '',
    birthDate: '',
    address: '',
    email: '',
    phone: '',
    purpose: '',
  });

  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Create FormData payload
      const payload = new FormData();
      payload.append('type', service.shortName);
      Object.entries(formData).forEach(([key, value]) => {
        if (value) payload.append(key, value);
      });
      if (file) {
        payload.append('attachment', file);
      }

      const res = await fetch('/api/ptsp/submit', {
        method: 'POST',
        // Omit headers, fetch will set auto boundary
        body: payload
      });
      
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.message || 'Gagal mengirim form');

      setTicketId(json.data.ticketId);
      toast.success('Permohonan berhasil dikirim!');
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;

    try {
      const res = await fetch(`/api/ptsp/track/${trackInput.trim()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setTrackResult(json.data);
      toast.success('Status ditemukan');
    } catch (err: any) {
      toast.error(err.message || 'Resi tidak ditemukan');
      setTrackResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FBFF] pb-20">
      
      {/* Top Header */}
      <div className="bg-white border-b sticky top-0 md:relative z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-700">{service.title}</h1>
          
          <div className="text-sm font-medium flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => navigate('/')}>Home</span>
            <span className="text-gray-400">/</span>
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => navigate('/services')}>Layanan</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500">{service.shortName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Main Form Column */}
          <div className="lg:col-span-2">
            {!ticketId ? (
              <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="font-semibold text-gray-700">Form Permohonan {service.shortName}</h2>
                  <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                    <ArrowLeft size={20} />
                  </button>
                </div>

                <div className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap Siswa / Pemohon <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.applicantName} onChange={e => setFormData({ ...formData, applicantName: e.target.value })} 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Identitas (NISN / NIK) - Opsional</label>
                      <input type="text" value={formData.nisn} onChange={e => setFormData({ ...formData, nisn: e.target.value })} 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tempat Lahir</label>
                        <input type="text" value={formData.birthPlace} onChange={e => setFormData({ ...formData, birthPlace: e.target.value })} 
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
                        <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} 
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alamat Lengkap <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail Pemohon (Email Aktif) <span className="text-red-500">*</span></label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} 
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">No Handphone (HP) <span className="text-red-500">*</span></label>
                        <input required type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hal/Keperluan Spesifik <span className="text-red-500">*</span></label>
                      <input required type="text" placeholder="Misal: Surat Keterangan Aktif untuk beasiswa" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} 
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Berkas Persyaratan (Opsional Jika Dibutuhkan)</label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white">
                         <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all outline-none text-sm" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <button disabled={isLoading} type="submit" 
                        className="px-8 py-3.5 bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'MENGIRIM...' : 'KIRIM PERMOHONAN'}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden text-center p-12">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Berhasil Terkirim!</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Permohonan Anda sedang kami proses. 
                  Silakan simpan nomor identitas tiket di bawah ini untuk melacak statusnya.
                </p>
                <div className="inline-block bg-blue-50 border-2 border-blue-200 rounded-xl px-10 py-5">
                  <span className="block text-sm text-blue-600 font-medium mb-1 uppercase tracking-wider">Nomor Resi / Tiket Lacak</span>
                  <span className="text-4xl font-black text-blue-900 tracking-widest">{ticketId}</span>
                </div>
                <div className="mt-10">
                  <button onClick={() => setTicketId(null)} className="text-blue-500 font-medium hover:underline">
                    Buat Permohonan Baru
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar Columns */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 pb-3 border-b border-gray-100 mb-4 whitespace-nowrap">Berkas Persyaratan</h3>
              <ul className="space-y-3">
                {service.requirements.map((req, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-gray-600">
                    <span className="font-bold text-gray-800">{idx + 1}.</span>
                    <span>{req.includes('Mengisi Formulir') ? <a href="#" className="text-blue-500 hover:underline">{req}</a> : req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 pb-3 border-b border-gray-100 mb-4">Survey Pelayanan</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Mohon kesediaan pengguna layanan melalui sistem ini dapat memberikan Feedback berupa saran/kritik yang membangun untuk pelayanan kami.
              </p>
              <button className="px-5 py-2.5 bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded shadow-md text-sm transition-colors">
                Isi Survey
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 pb-3 border-b border-gray-100 mb-4">Layanan Pengaduan Masyarakat</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Jika ada kendala/permasalahan terkait pelayanan sekolah yang perlu Anda sampaikan, lapor melalui tautan berikut.
              </p>
              <button className="px-5 py-2.5 bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded shadow-md text-sm transition-colors">
                Ajukan Permasalahan
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* TRACKING SECTION = BOTTOM */}
      <div className="mt-20 pt-16 bg-[#eef5fd] pb-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Cek Status Permohonan</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-lg mx-auto">
            Cek Status Permohonan yang pernah diajukan dengan memasukkan Nomor Resi Layanan.
            <br/><span className="italic text-xs">Note: Nomor Resi didapatkan setelah sukses membuat form.</span>
          </p>

          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-0 shadow-lg shadow-blue-500/10 rounded-lg overflow-hidden max-w-xl mx-auto">
            <input 
              required
              type="text" 
              placeholder="Masukkan Nomor Resi (misal: MDT-X9B21)"
              value={trackInput}
              onChange={e => setTrackInput(e.target.value)}
              className="flex-1 px-6 py-4 outline-none text-gray-700 border-none min-w-0"
            />
            <button type="submit" className="bg-[#1A73E8] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold px-10 py-4 transition-colors">
              Cek
            </button>
          </form>

          {/* Render Result Timeline */}
          {trackResult && (
             <div className="mt-10 bg-white p-8 rounded-2xl shadow-xl text-left border border-gray-100 transition-all animate-in slide-in-from-bottom-4">
               <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                 <div>
                   <h3 className="font-bold text-gray-800 text-lg">Resi: {trackResult.ticketId}</h3>
                   <p className="text-sm text-gray-500">{trackResult.type} • {trackResult.applicantName}</p>
                 </div>
                 <div className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize ${
                    trackResult.status === 'completed' ? 'bg-green-100 text-green-700' :
                    trackResult.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    trackResult.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                 }`}>
                   {trackResult.status === 'completed' ? 'Selesai' :
                    trackResult.status === 'processing' ? 'Diproses' :
                    trackResult.status === 'rejected' ? 'Ditolak' : 'Antrean'}
                 </div>
               </div>

               <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_white]"></div>
                    <div className="font-semibold text-gray-800">Ajuan Diterima</div>
                    <div className="text-sm text-gray-500 mt-1">Sistem Mandaapp telah menampung berkas pengajuan Anda.</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(trackResult.createdAt).toLocaleString('id-ID')}</div>
                  </div>

                  {(trackResult.status === 'processing' || trackResult.status === 'completed' || trackResult.status === 'rejected') && (
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_0_4px_white]"></div>
                      <div className="font-semibold text-gray-800">Tinjauan Admin</div>
                      <div className="text-sm text-gray-500 mt-1">Staff Tata Usaha sedang meninjau kelengkapan Anda.</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(trackResult.updatedAt).toLocaleString('id-ID')}</div>
                    </div>
                  )}

                  {(trackResult.status === 'completed') && (
                    <div className="relative pl-6">
                       <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-green-500 shadow-[0_0_0_4px_white] flex items-center justify-center">
                         <CheckCircle className="w-3 h-3 text-white" />
                       </div>
                       <div className="font-semibold text-gray-800">Permohonan Selesai</div>
                       <div className="text-sm text-gray-500 mt-1">Proses telah rampung! Silakan cek catatan admin:</div>
                       {trackResult.adminReply && (
                         <div className="mt-3 p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800 whitespace-pre-wrap flex gap-3">
                           <FileText className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-50" />
                           {trackResult.adminReply}
                         </div>
                       )}
                    </div>
                  )}

                  {(trackResult.status === 'rejected') && (
                    <div className="relative pl-6">
                       <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_0_4px_white]"></div>
                       <div className="font-semibold text-gray-800">Permohonan Ditolak / Divalidasi Ulang</div>
                       <div className="text-sm text-gray-500 mt-1">Syarat Anda kurang lengkap atau ditolak:</div>
                       {trackResult.adminReply && (
                         <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800 whitespace-pre-wrap">
                           {trackResult.adminReply}
                         </div>
                       )}
                    </div>
                  )}

               </div>

             </div>
          )}

        </div>
      </div>

    </div>
  );
};
