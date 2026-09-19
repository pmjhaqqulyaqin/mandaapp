import { useState, useEffect } from 'react';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface SesiItem {
  mulai: string;
  selesai: string;
}

interface SesiGroup {
  label: string;
  days: number[]; // 1=Senin, 2=Selasa, ..., 6=Sabtu
  sessions: SesiItem[];
}

interface WaktuSesiGroups {
  groups: SesiGroup[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ujianId: string;
  ujian: any;
  onSuccess: (updated: any) => void;
}

const HARI_OPTIONS = [
  { value: 1, label: 'Sen' },
  { value: 2, label: 'Sel' },
  { value: 3, label: 'Rab' },
  { value: 4, label: 'Kam' },
  { value: 5, label: 'Jum' },
  { value: 6, label: 'Sab' },
];

const MAX_SESSIONS = 5;

/** Migrate old normal/jumat format to new groups format */
function migrateWaktuSesi(raw: any): WaktuSesiGroups {
  if (raw?.groups && Array.isArray(raw.groups)) {
    return raw as WaktuSesiGroups;
  }
  // Old format: { normal: [...], jumat: [...] }
  const normal = raw?.normal || [{ mulai: '07:30', selesai: '09:30' }, { mulai: '10:00', selesai: '12:00' }];
  const jumat = raw?.jumat || [{ mulai: '07:15', selesai: '09:15' }, { mulai: '09:30', selesai: '11:30' }];
  return {
    groups: [
      { label: 'Senin - Kamis & Sabtu', days: [1, 2, 3, 4, 6], sessions: normal },
      { label: "Jum'at", days: [5], sessions: jumat },
    ]
  };
}

const defaultWaktuSesi: WaktuSesiGroups = {
  groups: [
    { label: 'Senin - Kamis & Sabtu', days: [1, 2, 3, 4, 6], sessions: [{ mulai: '07:30', selesai: '09:30' }, { mulai: '10:00', selesai: '12:00' }] },
    { label: "Jum'at", days: [5], sessions: [{ mulai: '07:15', selesai: '09:15' }, { mulai: '09:30', selesai: '11:30' }] },
  ]
};

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
    waktuSesi: defaultWaktuSesi
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && ujian?.pengaturan) {
      setForm({
        kop: { ...form.kop, ...(ujian.pengaturan.kop || {}) },
        ttd: { ...form.ttd, ...(ujian.pengaturan.ttd || {}) },
        waktuSesi: migrateWaktuSesi(ujian.pengaturan.waktuSesi)
      });
    }
  }, [isOpen, ujian]);

  // Get all days already assigned to other groups (for duplicate validation)
  const getUsedDays = (excludeGroupIndex: number): Set<number> => {
    const used = new Set<number>();
    form.waktuSesi.groups.forEach((g, i) => {
      if (i !== excludeGroupIndex) g.days.forEach(d => used.add(d));
    });
    return used;
  };

  const updateGroup = (groupIndex: number, updater: (group: SesiGroup) => SesiGroup) => {
    const newGroups = form.waktuSesi.groups.map((g, i) => i === groupIndex ? updater({ ...g }) : g);
    setForm({ ...form, waktuSesi: { groups: newGroups } });
  };

  const addGroup = () => {
    const usedDays = new Set<number>();
    form.waktuSesi.groups.forEach(g => g.days.forEach(d => usedDays.add(d)));
    const availableDays = HARI_OPTIONS.map(h => h.value).filter(d => !usedDays.has(d));
    if (availableDays.length === 0) {
      toast.error('Semua hari sudah digunakan di grup lain');
      return;
    }
    setForm({
      ...form,
      waktuSesi: {
        groups: [...form.waktuSesi.groups, {
          label: 'Grup Baru',
          days: [availableDays[0]],
          sessions: [{ mulai: '07:00', selesai: '09:00' }]
        }]
      }
    });
  };

  const removeGroup = (index: number) => {
    if (form.waktuSesi.groups.length <= 1) {
      toast.error('Minimal harus ada 1 grup hari');
      return;
    }
    setForm({
      ...form,
      waktuSesi: { groups: form.waktuSesi.groups.filter((_, i) => i !== index) }
    });
  };

  const addSession = (groupIndex: number) => {
    updateGroup(groupIndex, g => {
      if (g.sessions.length >= MAX_SESSIONS) {
        toast.error(`Maksimal ${MAX_SESSIONS} sesi per grup`);
        return g;
      }
      return { ...g, sessions: [...g.sessions, { mulai: '00:00', selesai: '00:00' }] };
    });
  };

  const removeSession = (groupIndex: number, sessionIndex: number) => {
    updateGroup(groupIndex, g => {
      if (g.sessions.length <= 1) {
        toast.error('Minimal harus ada 1 sesi');
        return g;
      }
      return { ...g, sessions: g.sessions.filter((_, i) => i !== sessionIndex) };
    });
  };

  const toggleDay = (groupIndex: number, day: number) => {
    const usedDays = getUsedDays(groupIndex);
    updateGroup(groupIndex, g => {
      if (g.days.includes(day)) {
        if (g.days.length <= 1) {
          toast.error('Minimal harus ada 1 hari per grup');
          return g;
        }
        return { ...g, days: g.days.filter(d => d !== day) };
      } else {
        if (usedDays.has(day)) {
          const otherGroup = form.waktuSesi.groups.find((og, i) => i !== groupIndex && og.days.includes(day));
          toast.error(`Hari ${HARI_OPTIONS.find(h => h.value === day)?.label} sudah digunakan di grup "${otherGroup?.label}"`);
          return g;
        }
        return { ...g, days: [...g.days, day].sort((a, b) => a - b) };
      }
    });
  };

  const updateSessionTime = (groupIndex: number, sessionIndex: number, field: 'mulai' | 'selesai', value: string) => {
    updateGroup(groupIndex, g => {
      const newSessions = g.sessions.map((s, i) => i === sessionIndex ? { ...s, [field]: value } : s);
      return { ...g, sessions: newSessions };
    });
  };

  const updateGroupLabel = (groupIndex: number, label: string) => {
    updateGroup(groupIndex, g => ({ ...g, label }));
  };

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
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222] pb-1">
            <h4 className="text-sm font-semibold">1. Default Waktu Sesi</h4>
            <button
              type="button"
              onClick={addGroup}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
            >
              <Plus size={12} /> Tambah Grup
            </button>
          </div>

          <div className="space-y-3">
            {form.waktuSesi.groups.map((group, gIdx) => {
              const usedDays = getUsedDays(gIdx);
              return (
                <div key={gIdx} className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] p-3 rounded-xl space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 h-7 px-2 rounded-md border border-gray-200 dark:border-[#333] bg-white dark:bg-[#0a0a0a] text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                      value={group.label}
                      onChange={e => updateGroupLabel(gIdx, e.target.value)}
                      placeholder="Nama grup..."
                    />
                    {form.waktuSesi.groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGroup(gIdx)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors"
                        title="Hapus grup"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Day Checkboxes */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-semibold text-gray-500 mr-1">Hari:</span>
                    {HARI_OPTIONS.map(h => {
                      const isActive = group.days.includes(h.value);
                      const isUsedElsewhere = usedDays.has(h.value);
                      return (
                        <button
                          key={h.value}
                          type="button"
                          onClick={() => toggleDay(gIdx, h.value)}
                          disabled={isUsedElsewhere && !isActive}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all border ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : isUsedElsewhere
                                ? 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-300 dark:text-gray-600 border-gray-200 dark:border-[#333] cursor-not-allowed opacity-50'
                                : 'bg-white dark:bg-[#0a0a0a] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#333] hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {h.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sessions */}
                  <div className="space-y-1.5">
                    {group.sessions.map((sesi, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2">
                        <span className="text-[10px] font-medium w-12 text-gray-500 shrink-0">Sesi {sIdx + 1}</span>
                        <input
                          type="time"
                          className={inputClass}
                          value={sesi.mulai}
                          onChange={e => updateSessionTime(gIdx, sIdx, 'mulai', e.target.value)}
                        />
                        <span className="text-[10px] text-gray-400 shrink-0">-</span>
                        <input
                          type="time"
                          className={inputClass}
                          value={sesi.selesai}
                          onChange={e => updateSessionTime(gIdx, sIdx, 'selesai', e.target.value)}
                        />
                        {group.sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSession(gIdx, sIdx)}
                            className="p-1 rounded-md text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors shrink-0"
                            title="Hapus sesi"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Session Button */}
                  {group.sessions.length < MAX_SESSIONS && (
                    <button
                      type="button"
                      onClick={() => addSession(gIdx)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    >
                      <Plus size={11} /> Tambah Sesi ({group.sessions.length}/{MAX_SESSIONS})
                    </button>
                  )}
                </div>
              );
            })}
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
