import { useState, useEffect } from 'react';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ujianId: string;
  ujian: any;
  onSuccess: (updated: any) => void;
}

export const PengaturanUjianModal = ({ isOpen, onClose, ujianId, ujian, onSuccess }: Props) => {
  const [form, setForm] = useState({
    kop: {
      kementerian: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
      instansi: 'MADRASAH ALIYAH NEGERI 2 LOMBOK TIMUR',
      panitia: 'PANITIA UJIAN',
      alamat: 'Jl. Beririjarak Kec. Wanasaba Kab. Lombok Timur NTB',
      logoKiriUrl: '',
      logoKananUrl: ''
    },
    ttd: {
      tempat: 'Wanasaba',
      tanggal: new Date().toISOString().split('T')[0],
      jabatan: 'Kepala Madrasah',
      nama: '',
      nip: ''
    },
    waktuSesi: {
      normal: [{ mulai: '07:30', selesai: '09:30' }, { mulai: '10:00', selesai: '12:00' }],
      jumat: [{ mulai: '07:15', selesai: '09:15' }, { mulai: '09:30', selesai: '11:30' }]
    }
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && ujian?.pengaturan) {
      setForm({
        kop: { ...form.kop, ...(ujian.pengaturan.kop || {}) },
        ttd: { ...form.ttd, ...(ujian.pengaturan.ttd || {}) },
        waktuSesi: { ...form.waktuSesi, ...(ujian.pengaturan.waktuSesi || {}) }
      });
    }
  }, [isOpen, ujian]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...ujian, pengaturan: { ...ujian.pengaturan, ...form } };
      const result = await apiClient(`/exams/${ujianId}`, { method: 'PUT', data: payload });
      onSuccess(result);
      toast.success('Pengaturan ujian berhasil disimpan');
    } catch (err: any) {
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all";
  const labelClass = "text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1 block";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan Cetak & Waktu Ujian" description="Konfigurasi kop surat, tanda tangan, dan default waktu sesi untuk generate dokumen." className="max-w-2xl">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {/* Waktu Sesi */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold border-b border-gray-100 dark:border-[#222] pb-1">1. Default Waktu Sesi</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] p-3 rounded-xl space-y-2">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Hari Senin - Kamis & Sabtu</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium w-10">Sesi 1</span>
                <input type="time" className={inputClass} value={form.waktuSesi.normal[0].mulai} onChange={e => { const w = [...form.waktuSesi.normal]; w[0].mulai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, normal: w}}) }} />
                <span className="text-[10px]">-</span>
                <input type="time" className={inputClass} value={form.waktuSesi.normal[0].selesai} onChange={e => { const w = [...form.waktuSesi.normal]; w[0].selesai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, normal: w}}) }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium w-10">Sesi 2</span>
                <input type="time" className={inputClass} value={form.waktuSesi.normal[1].mulai} onChange={e => { const w = [...form.waktuSesi.normal]; w[1].mulai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, normal: w}}) }} />
                <span className="text-[10px]">-</span>
                <input type="time" className={inputClass} value={form.waktuSesi.normal[1].selesai} onChange={e => { const w = [...form.waktuSesi.normal]; w[1].selesai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, normal: w}}) }} />
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] p-3 rounded-xl space-y-2">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Hari Jum'at</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium w-10">Sesi 1</span>
                <input type="time" className={inputClass} value={form.waktuSesi.jumat[0].mulai} onChange={e => { const w = [...form.waktuSesi.jumat]; w[0].mulai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, jumat: w}}) }} />
                <span className="text-[10px]">-</span>
                <input type="time" className={inputClass} value={form.waktuSesi.jumat[0].selesai} onChange={e => { const w = [...form.waktuSesi.jumat]; w[0].selesai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, jumat: w}}) }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium w-10">Sesi 2</span>
                <input type="time" className={inputClass} value={form.waktuSesi.jumat[1].mulai} onChange={e => { const w = [...form.waktuSesi.jumat]; w[1].mulai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, jumat: w}}) }} />
                <span className="text-[10px]">-</span>
                <input type="time" className={inputClass} value={form.waktuSesi.jumat[1].selesai} onChange={e => { const w = [...form.waktuSesi.jumat]; w[1].selesai = e.target.value; setForm({...form, waktuSesi: {...form.waktuSesi, jumat: w}}) }} />
              </div>
            </div>
          </div>
        </div>

        {/* Kop Surat */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold border-b border-gray-100 dark:border-[#222] pb-1">2. Kop Laporan Ujian</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelClass}>Nama Kementerian / Induk</label><input className={inputClass} value={form.kop.kementerian} onChange={e => setForm({...form, kop: {...form.kop, kementerian: e.target.value}})} /></div>
            <div className="col-span-2"><label className={labelClass}>Nama Satuan Pendidikan (Instansi)</label><input className={inputClass} value={form.kop.instansi} onChange={e => setForm({...form, kop: {...form.kop, instansi: e.target.value}})} /></div>
            <div className="col-span-2"><label className={labelClass}>Nama Kegiatan / Panitia</label><input className={inputClass} value={form.kop.panitia} onChange={e => setForm({...form, kop: {...form.kop, panitia: e.target.value}})} /></div>
            <div className="col-span-2"><label className={labelClass}>Alamat Lengkap</label><input className={inputClass} value={form.kop.alamat} onChange={e => setForm({...form, kop: {...form.kop, alamat: e.target.value}})} /></div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold border-b border-gray-100 dark:border-[#222] pb-1">3. Tanda Tangan Pengesah</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Tempat TTD</label><input className={inputClass} value={form.ttd.tempat} onChange={e => setForm({...form, ttd: {...form.ttd, tempat: e.target.value}})} /></div>
            <div><label className={labelClass}>Tanggal TTD</label><input type="date" className={inputClass} value={form.ttd.tanggal} onChange={e => setForm({...form, ttd: {...form.ttd, tanggal: e.target.value}})} /></div>
            <div className="col-span-2"><label className={labelClass}>Jabatan</label><input className={inputClass} value={form.ttd.jabatan} onChange={e => setForm({...form, ttd: {...form.ttd, jabatan: e.target.value}})} /></div>
            <div><label className={labelClass}>Nama Lengkap (Berta Gelar)</label><input className={inputClass} value={form.ttd.nama} onChange={e => setForm({...form, ttd: {...form.ttd, nama: e.target.value}})} /></div>
            <div><label className={labelClass}>NIP / NIK</label><input className={inputClass} value={form.ttd.nip} onChange={e => setForm({...form, ttd: {...form.ttd, nip: e.target.value}})} /></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-[#222]">
        <button onClick={onClose} className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">Batal</button>
        <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
      </div>
    </Modal>
  );
};
