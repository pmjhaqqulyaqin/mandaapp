import { useState, useEffect } from 'react';
import { CreditCard, Users, UserCheck, Download, Printer, Settings, Save, Image as ImageIcon } from 'lucide-react';
import { PhotoUploader } from '@mandaapp/ui';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';

interface Props {
  ujianId: string;
  ujian: any;
}

export const KartuIdTab = ({ ujianId, ujian }: Props) => {
  const [showSettings, setShowSettings] = useState<'kartu-peserta' | null>(null);
  const [saving, setSaving] = useState(false);

  const [formConfig, setFormConfig] = useState({
    logoKiri: '',
    logoKanan: '',
    tempat: '',
    tanggal: '',
    jabatan: 'Ketua Panitia',
    nama: '',
    nip: '',
    signatureUrl: ''
  });

  useEffect(() => {
    if (ujian?.pengaturan) {
      // Prioritas: pengaturan spesifik kartuPesertaTtd -> distribusiTtd -> ttd master
      const ttdMaster = ujian.pengaturan.ttd || {};
      const ttdDist = ujian.pengaturan.distribusiTtd || {};
      const config = ujian.pengaturan.kartuPeserta || {};

      setFormConfig({
        logoKiri: config.logoKiri || '',
        logoKanan: config.logoKanan || '',
        tempat: config.tempat || ttdDist.tempat || ttdMaster.tempat || '',
        tanggal: config.tanggal || ttdDist.tanggal || ttdMaster.tanggal || '',
        jabatan: config.jabatan || ttdDist.jabatan || ttdMaster.jabatan || 'Ketua Panitia',
        nama: config.nama || ttdDist.nama || ttdMaster.nama || '',
        nip: config.nip || ttdDist.nip || ttdMaster.nip || '',
        signatureUrl: config.signatureUrl || ''
      });
    }
  }, [ujian]);

  const docTypes = [
    { key: 'kartu-peserta', icon: CreditCard, label: 'Kartu Peserta Ujian', desc: 'Generate kartu peserta dari data siswa yang sudah didistribusikan ke ruang ujian', color: 'indigo' as const },
    { key: 'id-panitia', icon: Users, label: 'ID Card Panitia', desc: 'Generate ID Card untuk seluruh anggota panitia ujian', color: 'violet' as const },
    { key: 'id-pengawas', icon: UserCheck, label: 'ID Card Pengawas', desc: 'Generate ID Card untuk seluruh pengawas yang sudah ditugaskan', color: 'blue' as const },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800/30',
    violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 border-violet-100 dark:border-violet-800/30',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-800/30',
  };

  const handleCetak = (key: string) => {
    if (key === 'kartu-peserta') {
      window.open(`/dashboard/print-kartu-peserta/${ujianId}`, '_blank');
    } else {
      alert('Fitur cetak ini belum dikonfigurasikan');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiClient(`/exams/${ujianId}`, {
        method: 'PUT',
        data: { pengaturan: { kartuPeserta: formConfig } }
      });
      toast.success('Pengaturan kartu berhasil disimpan');
      setShowSettings(null);
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-8 px-3 text-xs rounded-md border border-gray-300 dark:border-[#333] bg-white dark:bg-[#111] focus:ring-1 focus:ring-violet-500 transition-colors";

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Pilih jenis kartu/ID Card yang ingin di-generate. Pastikan pengaturan kartu sudah disesuaikan.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {docTypes.map(doc => {
          const Icon = doc.icon;
          return (
            <div key={doc.key} className={`rounded-xl border p-4 space-y-3 ${colorMap[doc.color]}`}>
              <div className="flex items-center gap-2">
                <Icon size={20} />
                <h4 className="text-sm font-semibold">{doc.label}</h4>
              </div>
              <p className="text-[11px] opacity-80">{doc.desc}</p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => handleCetak(doc.key)}>
                  <Printer size={12} /> Cetak PDF
                </button>
                {doc.key === 'kartu-peserta' && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => setShowSettings(showSettings === doc.key ? null : doc.key as any)}>
                    <Settings size={12} /> Pengaturan
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showSettings === 'kartu-peserta' && (
        <div className="bg-gray-50/80 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#222] rounded-xl p-4 mt-2 space-y-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#222] pb-3">
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
              <Settings size={16} className="text-violet-500" /> Pengaturan Kartu Peserta
            </h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <h5 className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <Users size={12} /> Data Tanda Tangan
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Tempat</label>
                  <input className={inputClass} placeholder="Contoh: Lombok Timur" value={formConfig.tempat} onChange={e => setFormConfig({...formConfig, tempat: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Tanggal</label>
                  <input type="date" className={inputClass} value={formConfig.tanggal} onChange={e => setFormConfig({...formConfig, tanggal: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Jabatan</label>
                  <input className={inputClass} placeholder="Contoh: Kepala Madrasah" value={formConfig.jabatan} onChange={e => setFormConfig({...formConfig, jabatan: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Nama Penanda Tangan</label>
                  <input className={inputClass} placeholder="Nama Lengkap" value={formConfig.nama} onChange={e => setFormConfig({...formConfig, nama: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">NIP (Opsional)</label>
                  <input className={inputClass} placeholder="Contoh: 198001012000011001" value={formConfig.nip} onChange={e => setFormConfig({...formConfig, nip: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
               <h5 className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <ImageIcon size={12} /> Gambar & Logo Tambahan
              </h5>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-semibold text-gray-500 mb-1.5 block text-center">Tanda Tangan</label>
                  <div className="flex justify-center">
                    <div className="scale-75 origin-top">
                      <PhotoUploader currentPhotoUrl={formConfig.signatureUrl} onPhotoChange={url => setFormConfig({...formConfig, signatureUrl: url})} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-semibold text-gray-500 mb-1.5 block text-center">Logo Kanan (Opsional)</label>
                  <div className="flex justify-center">
                    <div className="scale-75 origin-top">
                      <PhotoUploader currentPhotoUrl={formConfig.logoKanan} onPhotoChange={url => setFormConfig({...formConfig, logoKanan: url})} />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Biarkan logo kanan kosong jika Anda belum memilikinya. Logo Kiri akan selalu menggunakan logo Kemenag.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-[#222]">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-all">
              <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
