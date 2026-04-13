import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap, User, School, BookOpen, FileUp,
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Plus, Trash2, Upload
} from 'lucide-react';
import { HeaderWithSettings } from '../../components/HeaderWithSettings';
import { FooterWithSettings } from '../../components/FooterWithSettings';
import { SEO } from '../../components/SEO';
import { apiClient, API_BASE_URL } from '../../lib/api';
import { toast } from 'sonner';

const STEPS = [
  { key: 'dataDiri', label: 'Data Diri', icon: User },
  { key: 'dataSekolah', label: 'Data Sekolah', icon: School },
  { key: 'nilai', label: 'Nilai & Prestasi', icon: BookOpen },
  { key: 'dokumen', label: 'Upload Dokumen', icon: FileUp },
];

const MAPEL = ['B. Indonesia', 'B. Inggris', 'Matematika', 'IPA', 'IPS'];
const MAPEL_KEYS = ['bIndonesia', 'bInggris', 'matematika', 'ipa', 'ips'] as const;
const SEMESTERS = [1, 2, 3, 4, 5];

const STORAGE_KEY = 'simpmb_form_data';

const defaultFormData = () => ({
  dataDiri: { nisn: '', nik: '', namaLengkap: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: '', alamat: '', namaAyah: '', pekerjaanAyah: '', namaIbu: '', pekerjaanIbu: '', noHpOrtu: '', email: '' },
  dataSekolah: { npsn: '', namaSekolah: '', statusSekolah: '', alamatSekolah: '', tahunLulus: '' },
  nilaiRaport: SEMESTERS.map(s => ({ semester: s, bIndonesia: '', bInggris: '', matematika: '', ipa: '', ips: '' })),
  prestasi: [] as any[],
  dokumen: [] as any[],
});

export const PPDBFormPage = () => {
  const { jalurId } = useParams<{ jalurId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [jalur, setJalur] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load saved form data from sessionStorage
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultFormData();
    } catch { return defaultFormData(); }
  });

  // Save to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  // Fetch jalur info
  useEffect(() => {
    const fetchJalur = async () => {
      try {
        const jalurList = await apiClient<any[]>('/ppdb/jalur');
        const found = jalurList.find((j: any) => j.id === jalurId);
        if (!found) {
          toast.error('Jalur pendaftaran tidak ditemukan');
          navigate('/ppdb');
          return;
        }
        setJalur(found);
      } catch (err) {
        toast.error('Gagal memuat data jalur');
        navigate('/ppdb');
      } finally {
        setLoading(false);
      }
    };
    fetchJalur();
  }, [jalurId]);

  const updateField = useCallback((section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
    setErrors(prev => ({ ...prev, [`${section}.${field}`]: '' }));
  }, []);

  const updateNilai = useCallback((semIndex: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const updated = [...prev.nilaiRaport];
      updated[semIndex] = { ...updated[semIndex], [field]: value };
      return { ...prev, nilaiRaport: updated };
    });
  }, []);

  // Prestasi management
  const addPrestasi = () => {
    setFormData((prev: any) => ({
      ...prev,
      prestasi: [...prev.prestasi, { jenis: 'Akademik', tingkat: 'Kabupaten', namaKegiatan: '', peringkat: '', tahun: '', fileSertifikat: '' }],
    }));
  };

  const removePrestasi = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      prestasi: prev.prestasi.filter((_: any, i: number) => i !== index),
    }));
  };

  const updatePrestasi = (index: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const updated = [...prev.prestasi];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, prestasi: updated };
    });
  };

  // Calculate averages
  const calculateAverage = (semester: any) => {
    const vals = MAPEL_KEYS.map(k => Number(semester[k])).filter(v => !isNaN(v) && v > 0);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-';
  };

  const calculateFinalAverage = () => {
    const avgs = formData.nilaiRaport
      .map((s: any) => {
        const vals = MAPEL_KEYS.map(k => Number(s[k])).filter(v => !isNaN(v) && v > 0);
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      })
      .filter((v: number) => v > 0);
    return avgs.length > 0 ? (avgs.reduce((a: number, b: number) => a + b, 0) / avgs.length).toFixed(2) : '-';
  };

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.dataDiri.nisn) newErrors['dataDiri.nisn'] = 'NISN wajib diisi';
      if (!formData.dataDiri.nik) newErrors['dataDiri.nik'] = 'NIK wajib diisi';
      if (!formData.dataDiri.namaLengkap) newErrors['dataDiri.namaLengkap'] = 'Nama wajib diisi';
      if (!formData.dataDiri.tempatLahir) newErrors['dataDiri.tempatLahir'] = 'Tempat lahir wajib diisi';
      if (!formData.dataDiri.tanggalLahir) newErrors['dataDiri.tanggalLahir'] = 'Tanggal lahir wajib diisi';
      if (!formData.dataDiri.jenisKelamin) newErrors['dataDiri.jenisKelamin'] = 'Jenis kelamin wajib diisi';
      if (!formData.dataDiri.alamat) newErrors['dataDiri.alamat'] = 'Alamat wajib diisi';
      if (!formData.dataDiri.noHpOrtu) newErrors['dataDiri.noHpOrtu'] = 'No HP Ortu wajib diisi';
    }
    if (step === 1) {
      if (!formData.dataSekolah.namaSekolah) newErrors['dataSekolah.namaSekolah'] = 'Nama sekolah wajib diisi';
      if (!formData.dataSekolah.statusSekolah) newErrors['dataSekolah.statusSekolah'] = 'Status sekolah wajib diisi';
      if (!formData.dataSekolah.tahunLulus) newErrors['dataSekolah.tahunLulus'] = 'Tahun lulus wajib diisi';
    }
    if (step === 2) {
      // Check at least 3 semesters filled
      const filledSemesters = formData.nilaiRaport.filter((s: any) => MAPEL_KEYS.some(k => Number(s[k]) > 0));
      if (filledSemesters.length < 3) newErrors['nilai'] = 'Minimal 3 semester wajib diisi';
      if (jalur?.requiresPrestasi && formData.prestasi.length === 0) {
        newErrors['prestasi'] = 'Jalur Prestasi memerlukan minimal 1 sertifikat prestasi';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setSubmitting(true);
    try {
      const result = await apiClient<any>('/ppdb/daftar', {
        data: {
          jalurId,
          dataDiri: formData.dataDiri,
          dataSekolah: { ...formData.dataSekolah, tahunLulus: Number(formData.dataSekolah.tahunLulus) },
          nilaiRaport: formData.nilaiRaport.filter((s: any) => MAPEL_KEYS.some(k => Number(s[k]) > 0)),
          prestasi: formData.prestasi.filter((p: any) => p.namaKegiatan),
          dokumen: formData.dokumen,
        },
      });
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success(`Pendaftaran berhasil! No: ${result.noPendaftaran}`);
      navigate('/ppdb', { state: { success: true, noPendaftaran: result.noPendaftaran } });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim pendaftaran');
    } finally {
      setSubmitting(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, jenisDokumen: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const result = await apiClient<any>(`/ppdb/upload?type=${jenisDokumen}`, {
        method: 'POST',
        body: fd,
        headers: {}, // Let browser set content-type for FormData
      });
      setFormData((prev: any) => ({
        ...prev,
        dokumen: [...prev.dokumen.filter((d: any) => d.jenisDokumen !== jenisDokumen), { jenisDokumen, filePath: result.filePath }],
      }));
      toast.success(`${jenisDokumen} berhasil diupload`);
    } catch (err: any) {
      toast.error(`Gagal upload ${jenisDokumen}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  const isPrestasi = jalur?.namaJalur === 'PRESTASI';
  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-sm transition-all bg-white dark:bg-[#111] dark:border-[#333] dark:text-white";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <SEO />
      <HeaderWithSettings />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/ppdb')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 transition-colors mb-3">
            <ArrowLeft size={14} /> Kembali
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPrestasi ? 'bg-amber-50' : 'bg-blue-50'}`}>
              <GraduationCap size={20} className={isPrestasi ? 'text-amber-600' : 'text-blue-600'} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Formulir Pendaftaran</h1>
              <p className="text-xs text-gray-500">Jalur {isPrestasi ? '🏆 Prestasi' : '📋 Reguler'} • SIMPMB 2026</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            </div>
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isComplete ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                    isCurrent ? 'bg-gradient-to-br from-emerald-500 to-blue-500 text-white shadow-lg shadow-emerald-500/30 scale-110' :
                    'bg-white text-gray-400 border-2 border-gray-200'
                  }`}>
                    {isComplete ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className={`mt-2 text-[10px] font-semibold hidden sm:block ${isCurrent ? 'text-emerald-600' : isComplete ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-1">
            Step {currentStep + 1}: {STEPS[currentStep].label}
          </h2>
          <p className="text-xs text-gray-400 mb-6">Lengkapi data berikut dengan benar</p>

          {/* STEP 1: Data Diri */}
          {currentStep === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>NISN *</label>
                  <input type="text" maxLength={10} value={formData.dataDiri.nisn} onChange={e => updateField('dataDiri', 'nisn', e.target.value)} className={inputClass} placeholder="0098765432" />
                  {errors['dataDiri.nisn'] && <p className={errorClass}>{errors['dataDiri.nisn']}</p>}
                </div>
                <div>
                  <label className={labelClass}>NIK *</label>
                  <input type="text" maxLength={16} value={formData.dataDiri.nik} onChange={e => updateField('dataDiri', 'nik', e.target.value)} className={inputClass} placeholder="5201010509110001" />
                  {errors['dataDiri.nik'] && <p className={errorClass}>{errors['dataDiri.nik']}</p>}
                </div>
                <div>
                  <label className={labelClass}>Nama Lengkap *</label>
                  <input type="text" value={formData.dataDiri.namaLengkap} onChange={e => updateField('dataDiri', 'namaLengkap', e.target.value)} className={inputClass} placeholder="Ahmad Fauzi" />
                  {errors['dataDiri.namaLengkap'] && <p className={errorClass}>{errors['dataDiri.namaLengkap']}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Tempat Lahir *</label>
                  <input type="text" value={formData.dataDiri.tempatLahir} onChange={e => updateField('dataDiri', 'tempatLahir', e.target.value)} className={inputClass} placeholder="Mataram" />
                  {errors['dataDiri.tempatLahir'] && <p className={errorClass}>{errors['dataDiri.tempatLahir']}</p>}
                </div>
                <div>
                  <label className={labelClass}>Tanggal Lahir *</label>
                  <input type="date" value={formData.dataDiri.tanggalLahir} onChange={e => updateField('dataDiri', 'tanggalLahir', e.target.value)} className={inputClass} />
                  {errors['dataDiri.tanggalLahir'] && <p className={errorClass}>{errors['dataDiri.tanggalLahir']}</p>}
                </div>
                <div>
                  <label className={labelClass}>Jenis Kelamin *</label>
                  <select value={formData.dataDiri.jenisKelamin} onChange={e => updateField('dataDiri', 'jenisKelamin', e.target.value)} className={inputClass}>
                    <option value="">Pilih...</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                  {errors['dataDiri.jenisKelamin'] && <p className={errorClass}>{errors['dataDiri.jenisKelamin']}</p>}
                </div>
              </div>
              <div>
                <label className={labelClass}>Alamat Lengkap (Sesuai KK) *</label>
                <textarea rows={2} value={formData.dataDiri.alamat} onChange={e => updateField('dataDiri', 'alamat', e.target.value)} className={inputClass} placeholder="Desa, Kecamatan, Kabupaten" />
                {errors['dataDiri.alamat'] && <p className={errorClass}>{errors['dataDiri.alamat']}</p>}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-700 mb-3">Data Orang Tua / Wali</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className={labelClass}>Nama Ayah</label>
                    <input type="text" value={formData.dataDiri.namaAyah} onChange={e => updateField('dataDiri', 'namaAyah', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Pekerjaan Ayah</label>
                    <input type="text" value={formData.dataDiri.pekerjaanAyah} onChange={e => updateField('dataDiri', 'pekerjaanAyah', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>No. HP Orang Tua *</label>
                    <input type="tel" value={formData.dataDiri.noHpOrtu} onChange={e => updateField('dataDiri', 'noHpOrtu', e.target.value)} className={inputClass} placeholder="08123456789" />
                    {errors['dataDiri.noHpOrtu'] && <p className={errorClass}>{errors['dataDiri.noHpOrtu']}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Nama Ibu</label>
                    <input type="text" value={formData.dataDiri.namaIbu} onChange={e => updateField('dataDiri', 'namaIbu', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Pekerjaan Ibu</label>
                    <input type="text" value={formData.dataDiri.pekerjaanIbu} onChange={e => updateField('dataDiri', 'pekerjaanIbu', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email (Opsional)</label>
                    <input type="email" value={formData.dataDiri.email} onChange={e => updateField('dataDiri', 'email', e.target.value)} className={inputClass} placeholder="email@contoh.com" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Data Sekolah */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nama Sekolah Asal *</label>
                  <input type="text" value={formData.dataSekolah.namaSekolah} onChange={e => updateField('dataSekolah', 'namaSekolah', e.target.value)} className={inputClass} placeholder="SMPN 1 Selong" />
                  {errors['dataSekolah.namaSekolah'] && <p className={errorClass}>{errors['dataSekolah.namaSekolah']}</p>}
                </div>
                <div>
                  <label className={labelClass}>NPSN</label>
                  <input type="text" value={formData.dataSekolah.npsn} onChange={e => updateField('dataSekolah', 'npsn', e.target.value)} className={inputClass} placeholder="20501234" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Status Sekolah *</label>
                  <select value={formData.dataSekolah.statusSekolah} onChange={e => updateField('dataSekolah', 'statusSekolah', e.target.value)} className={inputClass}>
                    <option value="">Pilih...</option>
                    <option value="Negeri">Negeri</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                  {errors['dataSekolah.statusSekolah'] && <p className={errorClass}>{errors['dataSekolah.statusSekolah']}</p>}
                </div>
                <div>
                  <label className={labelClass}>Tahun Lulus *</label>
                  <select value={formData.dataSekolah.tahunLulus} onChange={e => updateField('dataSekolah', 'tahunLulus', e.target.value)} className={inputClass}>
                    <option value="">Pilih...</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                  {errors['dataSekolah.tahunLulus'] && <p className={errorClass}>{errors['dataSekolah.tahunLulus']}</p>}
                </div>
              </div>
              <div>
                <label className={labelClass}>Alamat Sekolah</label>
                <textarea rows={2} value={formData.dataSekolah.alamatSekolah} onChange={e => updateField('dataSekolah', 'alamatSekolah', e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {/* STEP 3: Nilai & Prestasi */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Nilai Raport Table */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Nilai Raport SMP/MTs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600 border border-gray-200">Mapel</th>
                        {SEMESTERS.map(s => (
                          <th key={s} className="px-3 py-2 text-center font-semibold text-gray-600 border border-gray-200 w-20">Smt {s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MAPEL.map((mapel, mi) => (
                        <tr key={mapel}>
                          <td className="px-3 py-1.5 font-medium text-gray-700 border border-gray-200 bg-gray-50">{mapel}</td>
                          {SEMESTERS.map((_, si) => (
                            <td key={si} className="px-1 py-1 border border-gray-200">
                              <input
                                type="number"
                                min="0" max="100"
                                value={formData.nilaiRaport[si][MAPEL_KEYS[mi]]}
                                onChange={e => updateNilai(si, MAPEL_KEYS[mi], e.target.value)}
                                className="w-full px-2 py-1.5 text-center text-xs rounded border-0 outline-none focus:ring-2 focus:ring-emerald-100 bg-transparent"
                                placeholder="-"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="bg-emerald-50 font-bold">
                        <td className="px-3 py-2 text-gray-700 border border-gray-200">Rata-rata</td>
                        {SEMESTERS.map((_, si) => (
                          <td key={si} className="px-3 py-2 text-center text-emerald-700 border border-gray-200">
                            {calculateAverage(formData.nilaiRaport[si])}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-700">Rata-Rata Akhir:</span>
                  <span className={`font-bold text-lg ${
                    Number(calculateFinalAverage()) >= (jalur?.nilaiMinimum || 70) ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {calculateFinalAverage()}
                  </span>
                  <span className="text-xs text-gray-400">(Min. {jalur?.nilaiMinimum || 70})</span>
                </div>
                {errors['nilai'] && <p className={errorClass}><AlertCircle size={12} className="inline mr-1" />{errors['nilai']}</p>}
              </div>

              {/* Prestasi Section */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">
                    Prestasi {jalur?.requiresPrestasi ? '(Wajib min. 1)' : '(Opsional)'}
                  </h3>
                  <button onClick={addPrestasi} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                    <Plus size={14} /> Tambah
                  </button>
                </div>
                {errors['prestasi'] && <p className={errorClass}><AlertCircle size={12} className="inline mr-1" />{errors['prestasi']}</p>}
                {formData.prestasi.map((p: any, i: number) => (
                  <div key={i} className="p-4 border border-gray-100 rounded-xl mb-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-600">Prestasi {i + 1}</span>
                      <button onClick={() => removePrestasi(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Jenis</label>
                        <select value={p.jenis} onChange={e => updatePrestasi(i, 'jenis', e.target.value)} className={inputClass}>
                          <option value="Akademik">Akademik</option>
                          <option value="Non-Akademik">Non-Akademik</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Tingkat</label>
                        <select value={p.tingkat} onChange={e => updatePrestasi(i, 'tingkat', e.target.value)} className={inputClass}>
                          <option value="Kabupaten">Kabupaten</option>
                          <option value="Provinsi">Provinsi</option>
                          <option value="Nasional">Nasional</option>
                          <option value="Internasional">Internasional</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Peringkat</label>
                        <select value={p.peringkat} onChange={e => updatePrestasi(i, 'peringkat', e.target.value)} className={inputClass}>
                          <option value="">Pilih...</option>
                          <option value="Juara 1">Juara 1</option>
                          <option value="Juara 2">Juara 2</option>
                          <option value="Juara 3">Juara 3</option>
                          <option value="Harapan">Harapan</option>
                          <option value="Peserta">Peserta</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className={labelClass}>Nama Kegiatan</label>
                        <input type="text" value={p.namaKegiatan} onChange={e => updatePrestasi(i, 'namaKegiatan', e.target.value)} className={inputClass} placeholder="Olimpiade Matematika OSK 2025" />
                      </div>
                      <div>
                        <label className={labelClass}>Tahun</label>
                        <input type="number" value={p.tahun} onChange={e => updatePrestasi(i, 'tahun', e.target.value)} className={inputClass} placeholder="2025" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Upload Dokumen */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {['SKL/Ijazah', 'Kartu Keluarga', 'Akta Kelahiran', 'Pas Foto 3x4'].map((doc) => {
                const uploaded = formData.dokumen.find((d: any) => d.jenisDokumen === doc);
                return (
                  <div key={doc} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${uploaded ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                        {uploaded ? <Check size={18} className="text-emerald-600" /> : <Upload size={18} className="text-gray-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{doc}</p>
                        <p className="text-xs text-gray-400">{uploaded ? 'Berhasil diupload ✓' : 'Belum diupload'}</p>
                      </div>
                    </div>
                    <label className="cursor-pointer px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                      {uploaded ? 'Ganti' : 'Upload'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFileUpload(e, doc)} />
                    </label>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 text-center mt-3">Format: PDF, JPG, PNG. Maksimal 5MB per file.</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft size={16} /> Kembali
            </button>
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95"
              >
                Selanjutnya <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {submitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
              </button>
            )}
          </div>
        </div>
      </div>

      <FooterWithSettings />
    </div>
  );
};
