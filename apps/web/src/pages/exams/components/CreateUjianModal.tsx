import { useState, useEffect } from 'react';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { EventCalendarPicker } from './EventCalendarPicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ujian: any) => void;
  editData?: any;
}

const JENIS_PRESETS = ['PTS', 'PAS', 'US', 'UMBK', 'PAT', 'Sumatif Tengah Semester', 'Sumatif Akhir Semester'];

export const CreateUjianModal = ({ isOpen, onClose, onSuccess, editData }: Props) => {
  const [form, setForm] = useState({
    namaUjian: '',
    jenis: '',
    jenisCustom: '',
    tahunAjaran: '',
    semester: 'Ganjil',
    tanggalMulai: '',
    tanggalSelesai: '',
    ketuaPanitiaId: '',
    status: 'aktif',
    pengaturan: { kelasPeserta: [] as string[] }
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [useCustomJenis, setUseCustomJenis] = useState(false);

  useEffect(() => {
    if (isOpen) {
      apiClient<any[]>('/employees').then(setEmployees).catch(() => {});
      apiClient<any[]>('/classes').then(setClassList).catch(() => {});
      if (editData) {
        const isPreset = JENIS_PRESETS.includes(editData.jenis);
        setForm({
          namaUjian: editData.namaUjian || '',
          jenis: isPreset ? editData.jenis : '',
          jenisCustom: isPreset ? '' : editData.jenis || '',
          tahunAjaran: editData.tahunAjaran || '',
          semester: editData.semester || 'Ganjil',
          tanggalMulai: editData.tanggalMulai || '',
          tanggalSelesai: editData.tanggalSelesai || '',
          ketuaPanitiaId: editData.ketuaPanitiaId || '',
          status: editData.status || 'aktif',
          pengaturan: {
             ...editData.pengaturan,
             kelasPeserta: editData.pengaturan?.kelasPeserta || []
          }
        });
        setUseCustomJenis(!isPreset);
      } else {
        setForm({
          namaUjian: '',
          jenis: '',
          jenisCustom: '',
          tahunAjaran: '2025/2026',
          semester: 'Ganjil',
          tanggalMulai: '',
          tanggalSelesai: '',
          ketuaPanitiaId: '',
          status: 'aktif',
          pengaturan: { kelasPeserta: [] }
        });
        setUseCustomJenis(false);
      }
    }
  }, [isOpen, editData]);

  const handleSubmit = async () => {
    const jenis = useCustomJenis ? form.jenisCustom : form.jenis;
    if (!form.namaUjian || !jenis || !form.tahunAjaran || !form.tanggalMulai || !form.tanggalSelesai) {
      toast.error('Mohon lengkapi semua field yang wajib');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, jenis };
      let result;
      if (editData) {
        result = await apiClient(`/exams/${editData.id}`, { method: 'PUT', data: payload });
      } else {
        result = await apiClient('/exams', { data: payload });
      }
      onSuccess(result);
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all";
  const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1 block";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? 'Edit Ujian' : 'Buat Ujian Baru'}
      description="Isi informasi dasar ujian yang akan dilaksanakan"
      className="max-w-xl"
    >
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Nama Ujian *</label>
          <input className={inputClass} placeholder="Contoh: PTS Ganjil 2025/2026"
            value={form.namaUjian} onChange={e => setForm({...form, namaUjian: e.target.value})} />
        </div>

        <div>
          <label className={labelClass}>Jenis Ujian *</label>
          {!useCustomJenis ? (
            <div className="space-y-2">
              <select className={inputClass}
                value={form.jenis} onChange={e => setForm({...form, jenis: e.target.value})}>
                <option value="">— Pilih Jenis —</option>
                {JENIS_PRESETS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <button onClick={() => setUseCustomJenis(true)}
                className="text-[11px] text-indigo-500 hover:text-indigo-600 font-medium">
                + Input jenis lainnya secara manual
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input className={inputClass} placeholder="Ketik jenis ujian..."
                value={form.jenisCustom} onChange={e => setForm({...form, jenisCustom: e.target.value})} />
              <button onClick={() => setUseCustomJenis(false)}
                className="text-[11px] text-indigo-500 hover:text-indigo-600 font-medium">
                ← Pilih dari daftar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tahun Ajaran *</label>
            <input className={inputClass} placeholder="2025/2026"
              value={form.tahunAjaran} onChange={e => setForm({...form, tahunAjaran: e.target.value})} />
          </div>
          <div>
            <label className={labelClass}>Semester *</label>
            <div className="flex gap-3 h-9 items-center">
              {['Ganjil', 'Genap'].map(s => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="semester" value={s} checked={form.semester === s}
                    onChange={() => setForm({...form, semester: s})}
                    className="accent-indigo-600 w-3.5 h-3.5" />
                  <span className="text-sm text-text-primary dark:text-text-darkPrimary">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div>
            <label className={labelClass}>Tanggal Mulai *</label>
            <EventCalendarPicker 
              className={inputClass}
              value={form.tanggalMulai}
              onChange={val => setForm({...form, tanggalMulai: val})}
              tahunAjaran={form.tahunAjaran}
            />
          </div>
          <div>
            <label className={labelClass}>Tanggal Selesai *</label>
            <EventCalendarPicker 
              className={inputClass}
              value={form.tanggalSelesai}
              onChange={val => setForm({...form, tanggalSelesai: val})}
              tahunAjaran={form.tahunAjaran}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Ketua Panitia</label>
          <select className={inputClass}
            value={form.ketuaPanitiaId} onChange={e => setForm({...form, ketuaPanitiaId: e.target.value})}>
            <option value="">— Pilih Ketua Panitia —</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.position || emp.type})</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">Terintegrasi dengan data Pegawai/PTK</p>
        </div>

        <div>
          <label className={labelClass}>Status Pelaksanaan</label>
          <select className={inputClass}
            value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="aktif">Aktif</option>
            <option value="draft">Draft</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Kelas Peserta Ujian</label>
          <div className="border border-gray-200 dark:border-[#333] rounded-lg p-3 bg-white dark:bg-[#0a0a0a] max-h-32 overflow-y-auto w-full">
            <div className="grid grid-cols-3 gap-2">
              {classList.map(cls => {
                const checked = (form.pengaturan.kelasPeserta || []).includes(cls.id);
                return (
                  <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-indigo-600 rounded text-indigo-600"
                      checked={checked}
                      onChange={(e) => {
                        const newSettings = { ...form.pengaturan };
                        const prevKelasArr = newSettings.kelasPeserta || [];
                        if (e.target.checked) {
                          newSettings.kelasPeserta = [...prevKelasArr, cls.id];
                        } else {
                          newSettings.kelasPeserta = prevKelasArr.filter((id: string) => id !== cls.id);
                        }
                        setForm({ ...form, pengaturan: newSettings });
                      }} />
                    <span className="text-xs text-text-primary dark:text-text-darkPrimary">
                      {cls.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Kosongkan jika melibatkan seluruh kelas</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-[#222]">
        <button onClick={onClose}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
          Batal
        </button>
        <button onClick={handleSubmit} disabled={saving}
          className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 disabled:opacity-50 shadow-sm">
          {saving ? 'Menyimpan...' : (editData ? 'Simpan Perubahan' : 'Buat Ujian')}
        </button>
      </div>
    </Modal>
  );
};
