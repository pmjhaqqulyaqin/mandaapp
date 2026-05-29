import { useState, useEffect } from 'react';
import { CreditCard, Users, UserCheck, Download, Printer, Settings, Save, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import { PhotoUploader } from '@mandaapp/ui';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';

interface Props {
  ujianId: string;
  ujian: any;
}

export const KartuIdTab = ({ ujianId, ujian }: Props) => {
  const [showSettings, setShowSettings] = useState<'id-pegawai' | null>(null);
  const [activePreview, setActivePreview] = useState<string>('kartu-peserta');
  const [saving, setSaving] = useState(false);

  const [formConfig, setFormConfig] = useState({
    logoKiri: '',
    logoKanan: '',
    tempat: '',
    tanggal: '',
    jabatan: 'Ketua Panitia',
    nama: '',
    nip: '',
    signatureUrl: '',
    templatePanitiaUrl: '',
    templatePengawasUrl: '',
    logoPegawaiUrl: ''
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
        signatureUrl: config.signatureUrl || '',
        templatePanitiaUrl: config.templatePanitiaUrl || '',
        templatePengawasUrl: config.templatePengawasUrl || '',
        logoPegawaiUrl: config.logoPegawaiUrl || ''
      });
    }
  }, [ujian]);

  const docTypes = [
    { key: 'kartu-peserta', icon: CreditCard, label: 'Kartu Peserta Ujian', desc: 'Generate kartu peserta dari data siswa yang sudah didistribusikan ke ruang ujian', color: 'indigo' as const },
    { key: 'id-panitia', icon: Users, label: 'ID Card Panitia', desc: 'Generate ID Card untuk seluruh anggota panitia ujian', color: 'violet' as const },
    { key: 'id-pengawas', icon: UserCheck, label: 'ID Card Pengawas', desc: 'Generate ID Card untuk seluruh pengawas yang sudah ditugaskan', color: 'blue' as const },
    { key: 'denah-duduk', icon: LayoutGrid, label: 'Denah Tempat Duduk', desc: 'Generate denah tempat duduk peserta ujian per ruang lengkap dengan ilustrasi pengawas', color: 'emerald' as const },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800/30',
    violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 border-violet-100 dark:border-violet-800/30',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-800/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800/30',
  };

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [denahCols, setDenahCols] = useState<number>(4);

  useEffect(() => {
    if (ujianId) {
      apiClient(`/exams/${ujianId}/ruang`).then(res => setRooms(res.data || res)).catch(console.error);
    }
  }, [ujianId]);

  const handleCetak = (key: string) => {
    if (key === 'kartu-peserta') {
      let url = `/dashboard/print-kartu-peserta/${ujianId}`;
      if (selectedRoomId !== 'ALL') url += `?ruangId=${selectedRoomId}`;
      window.open(url, '_blank');
    } else if (key === 'id-panitia') {
      window.open(`/dashboard/print-id-pegawai/${ujianId}?type=panitia`, '_blank');
    } else if (key === 'id-pengawas') {
      window.open(`/dashboard/print-id-pegawai/${ujianId}?type=pengawas`, '_blank');
    } else if (key === 'denah-duduk') {
      let url = `/dashboard/print-denah-duduk/${ujianId}?cols=${denahCols}`;
      if (selectedRoomId !== 'ALL') url += `&ruangId=${selectedRoomId}`;
      window.open(url, '_blank');
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {docTypes.map(doc => {
          const Icon = doc.icon;
          return (
            <div 
              key={doc.key} 
              onClick={() => setActivePreview(doc.key)}
              className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-all ${
                activePreview === doc.key 
                  ? `${colorMap[doc.color]} ring-2 ring-${doc.color}-500 shadow-sm` 
                  : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
              }`}
            >
              <div className={`flex items-center gap-2 ${activePreview === doc.key ? `text-${doc.color}-700 dark:text-${doc.color}-400` : 'text-gray-700 dark:text-gray-300'}`}>
                <Icon size={20} />
                <h4 className="text-sm font-semibold">{doc.label}</h4>
              </div>
              <p className="text-[11px] opacity-80 text-gray-500">{doc.desc}</p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {doc.key === 'kartu-peserta' && (
                  <select 
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    className="h-7 cursor-pointer text-[10px] font-semibold rounded-lg bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary focus:ring-1 focus:ring-violet-500 outline-none"
                  >
                    <option value="ALL">Semua Ruang</option>
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.namaRuang}</option>
                    ))}
                  </select>
                )}
                
                <button className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleCetak(doc.key); }}>
                  <Printer size={12} /> Cetak PDF
                </button>
                {doc.key === 'denah-duduk' && (
                  <>
                    <select 
                      value={selectedRoomId}
                      onChange={e => setSelectedRoomId(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="h-7 cursor-pointer text-[10px] font-semibold rounded-lg bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      <option value="ALL">Semua Ruang</option>
                      {rooms.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.namaRuang}</option>
                      ))}
                    </select>
                    <select
                      value={denahCols}
                      onChange={e => setDenahCols(parseInt(e.target.value, 10))}
                      onClick={e => e.stopPropagation()}
                      className="h-7 cursor-pointer text-[10px] font-semibold rounded-lg bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      <option value={4}>4 Baris</option>
                      <option value={5}>5 Baris</option>
                    </select>
                  </>
                )}
                {doc.key === 'id-panitia' && (
                  <button className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-medium bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                    onClick={(e) => { e.stopPropagation(); setShowSettings(showSettings === 'id-pegawai' ? null : 'id-pegawai'); }}>
                    <Settings size={12} /> Pengaturan ID Card
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showSettings && (
        <div className="bg-gray-50/80 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#222] rounded-xl p-4 mt-2 space-y-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#222] pb-3">
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
              <Settings size={16} className="text-violet-500" /> 
              Pengaturan ID Card Panitia & Pengawas
            </h4>
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-10 justify-start items-start">
              
              <div className="flex flex-col items-center gap-2">
                <label className="text-[10px] font-bold text-gray-500 mb-1.5 block text-center uppercase tracking-wide">
                  Logo Atas
                </label>
                <div className="origin-top w-20 h-20">
                  <PhotoUploader 
                    currentPhotoUrl={formConfig.logoPegawaiUrl} 
                    onPhotoChange={url => setFormConfig({...formConfig, logoPegawaiUrl: url})} 
                  />
                </div>
                <p className="text-[9px] text-gray-400 max-w-[120px] text-center">
                  Digunakan eksklusif untuk Panitia & Pengawas
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <label className="text-[10px] font-bold text-gray-500 mb-1.5 block text-center uppercase tracking-wide">
                  Template Panitia
                </label>
                <div className="origin-top w-24 h-36">
                  <PhotoUploader 
                    currentPhotoUrl={formConfig.templatePanitiaUrl} 
                    onPhotoChange={url => setFormConfig({...formConfig, templatePanitiaUrl: url})} 
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <label className="text-[10px] font-bold text-gray-500 mb-1.5 block text-center uppercase tracking-wide">
                  Template Pengawas
                </label>
                <div className="origin-top w-24 h-36">
                  <PhotoUploader 
                    currentPhotoUrl={formConfig.templatePengawasUrl} 
                    onPhotoChange={url => setFormConfig({...formConfig, templatePengawasUrl: url})} 
                  />
                </div>
              </div>

            </div>
            <p className="text-[10px] text-gray-400 max-w-[400px]">
              * Pastikan template ID berformat rasio portrait (.PNG/JPG). Jika dikosongkan, desain otomatis menggunakan tata letak bawaan.
            </p>
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

      {/* Preview Section via Iframe */}
      <div className="mt-6 flex flex-col space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">
            Preview {docTypes.find(d => d.key === activePreview)?.label}
          </h3>
        </div>
        <div className="w-full h-[600px] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
          {activePreview === 'kartu-peserta' && (
            <iframe 
              src={`/dashboard/print-kartu-peserta/${ujianId}?preview=true${selectedRoomId !== 'ALL' ? `&ruangId=${selectedRoomId}` : ''}`}
              className="w-full h-full"
            />
          )}
          {activePreview === 'id-panitia' && (
            <iframe 
              src={`/dashboard/print-id-pegawai/${ujianId}?type=panitia`}
              className="w-full h-full"
            />
          )}
          {activePreview === 'id-pengawas' && (
            <iframe 
              src={`/dashboard/print-id-pegawai/${ujianId}?type=pengawas`}
              className="w-full h-full"
            />
          )}
          {activePreview === 'denah-duduk' && (
            <iframe 
              src={`/dashboard/print-denah-duduk/${ujianId}?preview=true&cols=${denahCols}${selectedRoomId !== 'ALL' ? `&ruangId=${selectedRoomId}` : ''}`}
              className="w-full h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};
