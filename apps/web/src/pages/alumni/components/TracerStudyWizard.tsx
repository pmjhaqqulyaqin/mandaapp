import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';

interface WizardProps {
  onClose: () => void;
  isOpen: boolean;
}

const STEPS = [
  'Verifikasi Identitas',
  'Status Saat Ini',
  'Detail Aktivitas',
  'Keselarasan',
  'Evaluasi & Masukan',
  'Konfirmasi'
];

export const TracerStudyWizard: React.FC<WizardProps> = ({ onClose, isOpen }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<any>(() => {
    const saved = localStorage.getItem('tracerDraft');
    return saved ? JSON.parse(saved) : {
      nisn: '', birthDate: '',
      studentId: '', fullName: '', gradYear: '', major: '', status_awal: '',
      status: '', // Bekerja, Kuliah, Wirausaha, Mencari Kerja
      
      // Detail Bekerja
      masaTunggu: '', namaPerusahaan: '', jenisIndustri: '', lokasiKerja: '', pendapatan: '',
      
      // Detail Wirausaha
      namaUsaha: '', sektorBisnis: '', skalaUsaha: '', omzet: '',
      
      // Detail Kuliah
      namaKampus: '', programStudi: '', jenjang: '', sumberDana: '',
      
      // Keselarasan
      keselarasan: '', kesesuaianPendidikan: '', jumlahSertifikasi: '0',
      
      // File
      buktiUrl: '',
      
      // Evaluasi
      kompetensiSesuai: 5, saranAlmamater: '',
      
      isVerified: false
    };
  });

  useEffect(() => {
    localStorage.setItem('tracerDraft', JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVerify = async () => {
    if (!formData.nisn || !formData.birthDate) {
      toast.error('Silakan isi NISN dan Tanggal Lahir');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await apiClient<{ id: string, fullName: string, gradYear: string, major: string, status: string }>('/students/public-verify-nisn', {
        method: 'POST',
        data: { nisn: formData.nisn, birthDate: formData.birthDate }
      });
      
      if (res.status !== 'Lulus' && res.status !== 'lulus') {
        toast.error('Mohon maaf, tracer study hanya untuk alumni yang telah Lulus.');
        setIsLoading(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        studentId: res.id,
        fullName: res.fullName,
        gradYear: res.gradYear,
        major: res.major,
        status_awal: res.status
      }));
      setStep(2);
      toast.success('Data terverifikasi! Silakan lanjutkan.');
    } catch (err: any) {
      toast.error(err.message || 'Data tidak ditemukan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }
    
    setIsLoading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      // Use standard fetch for FormData since apiClient might stringify it
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/tracer/upload-bukti`, {
        method: 'POST',
        body: formDataUpload
      });
      
      if (!response.ok) throw new Error('Gagal mengunggah file');
      const data = await response.json();
      
      setFormData(prev => ({ ...prev, buktiUrl: data.url }));
      toast.success('Bukti berhasil diunggah');
    } catch (err) {
      toast.error('Gagal mengunggah dokumen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.isVerified) {
      toast.error('Mohon centang pernyataan validitas data');
      return;
    }
    
    setIsLoading(true);
    try {
      // Assuming there's a global tracer study ID, or we pass "public"
      // For now, we will hit the endpoint and let the backend handle the default active study
      // Actually we need a studyId. For now let's just pass dummy or let backend set it.
      // We will adjust backend to accept 'public' and assign to active study.
      const payloadObj = {
        studentId: formData.studentId,
        status: formData.status,
        companyOrCampus: formData.namaPerusahaan || formData.namaUsaha || formData.namaKampus || '',
        description: formData.saranAlmamater,
        payload: formData,
        buktiUrl: formData.buktiUrl,
        isVerified: formData.isVerified
      };

      await apiClient('/tracer/public/responses', {
        method: 'POST',
        data: payloadObj
      });
      
      toast.success('Terima kasih! Kuesioner berhasil dikirim.');
      localStorage.removeItem('tracerDraft');
      onClose();
    } catch (error) {
      toast.error('Gagal mengirim kuesioner. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
      <header className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between z-10 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Kuesioner Tracer Study</h2>
          <p className="text-sm text-gray-500">Alumni MandaApp</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X size={24} className="text-gray-500" />
        </button>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col">
        {/* Progress Tracker */}
        <div className="mb-8 hidden sm:block">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full"></div>
            <div className="absolute left-0 top-1/2 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-300" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}></div>
            
            {STEPS.map((s, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                  step > idx + 1 ? 'bg-primary border-primary text-white' : 
                  step === idx + 1 ? 'bg-white border-primary text-primary' : 
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > idx + 1 ? <Check size={16} /> : idx + 1}
                </div>
                <span className={`text-[10px] font-semibold w-20 text-center ${step === idx + 1 ? 'text-primary' : 'text-gray-500'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm p-5 md:p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Verifikasi Identitas Alumni</h3>
                <p className="text-gray-500 mt-2">Silakan masukkan NISN dan Tanggal Lahir Anda untuk memuat data secara otomatis.</p>
              </div>
              
              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nomor Induk Siswa Nasional (NISN)</label>
                  <input type="text" name="nisn" value={formData.nisn} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Masukkan NISN Anda..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Lahir</label>
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" />
                </div>
                <Button className="w-full h-12 text-base mt-2" onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verifikasi Data'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-900">Status Aktivitas Saat Ini</h3>
              <p className="text-sm text-gray-500">Halo <span className="font-bold text-primary">{formData.fullName}</span>, silakan pilih aktivitas utama Anda saat ini.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Bekerja', 'Wirausaha', 'Kuliah', 'Mencari Kerja'].map(st => (
                  <label key={st} className={`cursor-pointer flex flex-col p-4 rounded-xl border-2 transition-all ${formData.status === st ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="status" value={st} checked={formData.status === st} onChange={handleChange} className="w-5 h-5 text-primary focus:ring-primary border-gray-300" />
                      <span className="font-bold text-gray-900">{st}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-900">Detail Aktivitas ({formData.status})</h3>
              
              {formData.status === 'Bekerja' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-1">Masa Tunggu (Bulan dari lulus)</label><input type="number" name="masaTunggu" value={formData.masaTunggu} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                  <div><label className="block text-sm font-semibold mb-1">Nama Perusahaan/Instansi</label><input type="text" name="namaPerusahaan" value={formData.namaPerusahaan} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                  <div><label className="block text-sm font-semibold mb-1">Jenis Industri / Sektor</label>
                    <select name="jenisIndustri" value={formData.jenisIndustri} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300">
                      <option value="">Pilih Industri...</option>
                      <option value="Teknologi/IT">Teknologi / IT</option>
                      <option value="Manufaktur">Manufaktur</option>
                      <option value="Pendidikan">Pendidikan</option>
                      <option value="Kesehatan">Kesehatan</option>
                      <option value="Jasa/Keuangan">Jasa / Keuangan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div><label className="block text-sm font-semibold mb-1">Lokasi Kota Bekerja</label><input type="text" name="lokasiKerja" value={formData.lokasiKerja} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Perkiraan Pendapatan / Bulan (Rp)</label><input type="number" name="pendapatan" value={formData.pendapatan} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                </div>
              )}

              {formData.status === 'Wirausaha' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-1">Nama Usaha/Bisnis</label><input type="text" name="namaUsaha" value={formData.namaUsaha} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                  <div><label className="block text-sm font-semibold mb-1">Sektor Bisnis</label><input type="text" name="sektorBisnis" value={formData.sektorBisnis} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                  <div><label className="block text-sm font-semibold mb-1">Skala Usaha</label>
                    <select name="skalaUsaha" value={formData.skalaUsaha} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300">
                      <option value="">Pilih Skala...</option>
                      <option value="Mikro (Perorangan)">Mikro (Perorangan)</option>
                      <option value="Kecil (1-5 Karyawan)">Kecil (1-5 Karyawan)</option>
                      <option value="Menengah">Menengah</option>
                    </select>
                  </div>
                  <div><label className="block text-sm font-semibold mb-1">Perkiraan Omzet / Bulan (Rp)</label><input type="number" name="omzet" value={formData.omzet} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                </div>
              )}

              {formData.status === 'Kuliah' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-1">Nama Kampus / Perguruan Tinggi</label><input type="text" name="namaKampus" value={formData.namaKampus} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                  <div><label className="block text-sm font-semibold mb-1">Program Studi / Jurusan</label><input type="text" name="programStudi" value={formData.programStudi} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300" /></div>
                  <div><label className="block text-sm font-semibold mb-1">Jenjang</label>
                    <select name="jenjang" value={formData.jenjang} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300">
                      <option value="">Pilih Jenjang...</option>
                      <option value="D3">D3 / Diploma</option>
                      <option value="S1">S1 / Sarjana</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div><label className="block text-sm font-semibold mb-1">Sumber Dana</label>
                    <select name="sumberDana" value={formData.sumberDana} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300">
                      <option value="">Pilih Sumber Dana...</option>
                      <option value="Mandiri">Mandiri / Orang Tua</option>
                      <option value="Beasiswa Pemerintah">Beasiswa Pemerintah (KIP dsb)</option>
                      <option value="Beasiswa Swasta">Beasiswa Swasta</option>
                    </select>
                  </div>
                </div>
              )}

              {formData.status === 'Mencari Kerja' && (
                <div className="py-8 text-center text-gray-500">
                  <p>Tidak ada detail khusus untuk status Mencari Kerja.</p>
                  <p className="text-sm mt-2">Semoga Anda segera mendapatkan pekerjaan yang sesuai!</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-900">Relevansi & Dokumen Pendukung</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tingkat Keselarasan Pekerjaan/Kuliah dengan Jurusan Sekolah</label>
                  <select name="keselarasan" value={formData.keselarasan} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-300">
                    <option value="">Pilih Keselarasan...</option>
                    <option value="Sangat Selaras">Sangat Selaras</option>
                    <option value="Selaras">Selaras</option>
                    <option value="Kurang Selaras">Kurang Selaras</option>
                    <option value="Tidak Selaras">Tidak Selaras sama sekali</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Unggah Dokumen Bukti (Opsional namun disarankan)</label>
                  <p className="text-xs text-gray-500 mb-2">Sertakan scan Surat Keterangan Kerja, KTM (Kartu Tanda Mahasiswa), atau foto usaha. Maks 2MB (.jpg, .pdf)</p>
                  
                  {formData.buktiUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                      <Check size={20} /> <span className="text-sm font-bold">Dokumen berhasil diunggah</span>
                      <Button variant="outline" size="sm" onClick={() => setFormData(p => ({...p, buktiUrl: ''}))} className="ml-auto bg-white">Hapus</Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-primary transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500"><span className="font-semibold text-primary">Klik untuk unggah</span> atau seret file</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={isLoading} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-900">Evaluasi & Masukan untuk Sekolah</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Seberapa baik kompetensi yang diajarkan di sekolah memenuhi kebutuhan riil Anda saat ini?</label>
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <span className="text-xs text-gray-500">Sangat Kurang</span>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(rating => (
                        <button 
                          key={rating} onClick={() => setFormData(p => ({...p, kompetensiSesuai: rating}))}
                          className={`w-10 h-10 rounded-full font-bold transition-all ${formData.kompetensiSesuai === rating ? 'bg-amber-400 text-white shadow-md transform scale-110' : 'bg-white border border-gray-300 text-gray-400 hover:border-amber-400'}`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">Sangat Baik</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Saran & Umpan Balik</label>
                  <textarea name="saranAlmamater" value={formData.saranAlmamater} onChange={handleChange} rows={4} className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" placeholder="Tuliskan saran Anda untuk perbaikan fasilitas, kurikulum, pelayanan, dsb..."></textarea>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-xl font-bold text-gray-900">Konfirmasi Akhir</h3>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-sm space-y-3">
                <p><strong>Nama:</strong> {formData.fullName}</p>
                <p><strong>Status Saat Ini:</strong> {formData.status}</p>
                {formData.status === 'Bekerja' && <p><strong>Perusahaan:</strong> {formData.namaPerusahaan}</p>}
                {formData.status === 'Kuliah' && <p><strong>Kampus:</strong> {formData.namaKampus}</p>}
                <p><strong>Dokumen Bukti:</strong> {formData.buktiUrl ? 'Terlampir' : 'Tidak Ada'}</p>
              </div>
              
              <label className="flex items-start gap-3 p-4 bg-blue-50 text-blue-900 rounded-xl cursor-pointer">
                <input type="checkbox" name="isVerified" checked={formData.isVerified} onChange={(e) => setFormData(p => ({...p, isVerified: e.target.checked}))} className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm">Saya menyatakan bahwa data yang saya isikan pada formulir ini adalah benar, jujur, dan dapat dipertanggungjawabkan sesuai keadaan yang sebenarnya.</span>
              </label>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} disabled={isLoading}>
            {step === 1 ? 'Batal' : <><ChevronLeft size={16} className="mr-1" /> Kembali</>}
          </Button>
          
          {step < 6 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !formData.studentId}>
              Lanjut <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading || !formData.isVerified} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <><Send size={16} className="mr-2" /> Kirim Data</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
