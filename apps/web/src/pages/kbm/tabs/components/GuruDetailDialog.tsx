import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, CalendarOff, ShieldAlert, Check, HelpCircle, BookOpen } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  guruId: string;
  guruName: string;
  academicYearId: string;
  semester: string;
  initialAssignedSubjects: string[];
  onClose: () => void;
  onSaved: () => void;
  onSubjectsChange: (subjectIds: string[]) => void;
}

type TabKey = 'umum' | 'ketersediaan' | 'pembatasan';
type SlotStatus = 'available' | 'conditional' | 'unavailable';

export const GuruDetailDialog = ({ guruId, guruName, academicYearId, semester, initialAssignedSubjects, onClose, onSaved, onSubjectsChange }: Props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('umum');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<Set<string>>(new Set());

  // Ketersediaan
  const [gridData, setGridData] = useState<Map<string, SlotStatus>>(new Map());
  const [maxJam, setMaxJam] = useState(8);

  // Pembatasan
  const [pembatasanForm, setPembatasanForm] = useState({
    maxGapsPerWeek: null as number | null,
    maxTeachingDays: null as number | null,
    minLessonsPerDay: null as number | null,
    maxLessonsPerDay: null as number | null,
    maxConsecutiveLessons: null as number | null,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subjRes, distRes, availRes, guruRes, tsRes] = await Promise.all([
          apiClient<any[]>('/kbm/subjects?active=true').catch(() => []),
          apiClient<any[]>(`/kbm/distribusi?academicYearId=${academicYearId}&semester=${semester}`).catch(() => []),
          apiClient<any[]>(`/kbm/guru-slot-availability?guruId=${guruId}&academicYearId=${academicYearId}&semester=${semester}`).catch(() => []),
          apiClient<any>(`/employees/${guruId}`).catch(() => null),
          apiClient<any[]>('/jurnal/time-slots').catch(() => []),
        ]);

        // Mapel
        setAllSubjects(subjRes);
        setAssignedSubjects(new Set(initialAssignedSubjects));

        // Ketersediaan
        const availMap = new Map<string, SlotStatus>();
        availRes.forEach((d: any) => {
          availMap.set(`${d.dayOfWeek}-${d.jamKe}`, d.status as SlotStatus);
        });
        setGridData(availMap);

        const allJams = tsRes.map((t: any) => t.jamKe);
        setMaxJam(allJams.length > 0 ? Math.max(...allJams) : 8);

        // Pembatasan
        if (guruRes) {
          setPembatasanForm({
            maxGapsPerWeek: guruRes.maxGapsPerWeek ?? null,
            maxTeachingDays: guruRes.maxTeachingDays ?? null,
            minLessonsPerDay: guruRes.minLessonsPerDay ?? null,
            maxLessonsPerDay: guruRes.maxLessonsPerDay ?? null,
            maxConsecutiveLessons: guruRes.maxConsecutiveLessons ?? null,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guruId, academicYearId, semester]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save Subjects to DB
      const subjectIds = Array.from(assignedSubjects);
      await apiClient('/kbm/distribusi/guru-subjects', {
        method: 'POST',
        data: { guruId, academicYearId, semester, subjectIds },
      });

      // Pass Subjects to parent for UI sync
      onSubjectsChange(subjectIds);

      // 2. Save Availability
      const slots: { dayOfWeek: number; jamKe: number; status: string }[] = [];
      for (const [key, status] of gridData) {
        const [day, jam] = key.split('-').map(Number);
        slots.push({ dayOfWeek: day, jamKe: jam, status });
      }
      await apiClient('/kbm/guru-slot-availability/bulk', {
        method: 'POST',
        data: { guruId, academicYearId, semester, slots },
      });

      // 3. Save Pembatasan
      await apiClient(`/employees/${guruId}`, {
        method: 'PUT',
        data: pembatasanForm,
      });

      toast.success('Pengaturan guru berhasil disimpan');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (id: string) => {
    setAssignedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Grid Handlers
  const handleCellChange = (day: number, jam: number, status: SlotStatus) => {
    setGridData(prev => {
      const next = new Map(prev);
      if (status === 'available') next.delete(`${day}-${jam}`);
      else next.set(`${day}-${jam}`, status);
      return next;
    });
  };

  const handleBatchToggleDay = (day: number) => {
    setGridData(prev => {
      const next = new Map(prev);
      const jams = Array.from({ length: maxJam }, (_, i) => i + 1);
      const statuses = jams.map(j => next.get(`${day}-${j}`) || 'available');
      const allAvailable = statuses.every(s => s === 'available');
      const newStatus: SlotStatus = allAvailable ? 'unavailable' : 'available';
      for (const jam of jams) {
        if (newStatus === 'available') next.delete(`${day}-${jam}`);
        else next.set(`${day}-${jam}`, newStatus);
      }
      return next;
    });
  };

  const handleBatchToggleJam = (jam: number) => {
    setGridData(prev => {
      const next = new Map(prev);
      const days = [1, 2, 3, 4, 5, 6];
      const statuses = days.map(d => next.get(`${d}-${jam}`) || 'available');
      const allAvailable = statuses.every(s => s === 'available');
      const newStatus: SlotStatus = allAvailable ? 'unavailable' : 'available';
      for (const day of days) {
        if (newStatus === 'available') next.delete(`${day}-${jam}`);
        else next.set(`${day}-${jam}`, newStatus);
      }
      return next;
    });
  };

  const handleSetAll = () => setGridData(new Map());

  const days = [
    { key: 1, label: 'Senin', shortLabel: 'Sen' },
    { key: 2, label: 'Selasa', shortLabel: 'Sel' },
    { key: 3, label: 'Rabu', shortLabel: 'Rab' },
    { key: 4, label: 'Kamis', shortLabel: 'Kam' },
    { key: 5, label: 'Jumat', shortLabel: 'Jum' },
    { key: 6, label: 'Sabtu', shortLabel: 'Sab' },
  ];
  const jams = Array.from({ length: maxJam }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#222]">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Pengaturan Guru</h2>
            <p className="text-sm text-gray-500 mt-0.5">{guruName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-6 pt-4 border-b border-gray-100 dark:border-[#222] overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('umum')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'umum' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-[#444]'
            }`}
          >
            <BookOpen size={16} /> Distribusi Mapel
          </button>
          <button
            onClick={() => setActiveTab('ketersediaan')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'ketersediaan' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-[#444]'
            }`}
          >
            <CalendarOff size={16} /> Waktu Kosong
          </button>
          <button
            onClick={() => setActiveTab('pembatasan')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'pembatasan' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-[#444]'
            }`}
          >
            <ShieldAlert size={16} /> Pembatasan
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0a0a0a]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {activeTab === 'umum' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Pilih satu atau lebih mata pelajaran yang diampu oleh {guruName}. Mata pelajaran yang dipilih akan ditambahkan ke tabel distribusi jam.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allSubjects.map(s => (
                      <div
                        key={s.id}
                        onClick={() => toggleSubject(s.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          assignedSubjects.has(s.id)
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333] hover:border-amber-500/30'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-5 h-5 rounded border ${
                          assignedSubjects.has(s.id) ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {assignedSubjects.has(s.id) && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.nama}</p>
                          <p className="text-[11px] text-gray-500">{s.kode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'ketersediaan' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-gray-500">
                      Atur ketersediaan guru per hari dan jam. Scheduler otomatis menghindari slot yang tidak tersedia.
                    </p>
                    <button
                      onClick={handleSetAll}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                    >
                      <Check size={12} className="inline mr-1" /> Set Semua Tersedia
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#161616]">
                          <th className="px-2 py-2.5 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 w-14 border-r border-gray-200 dark:border-[#333]" />
                          {jams.map(jam => (
                            <th
                              key={jam}
                              onClick={() => handleBatchToggleJam(jam)}
                              className="px-1 py-2.5 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-[#222] min-w-[44px] cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                            >
                              {jam}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day, dayIdx) => (
                          <tr key={day.key} className={`border-t ${dayIdx === 0 ? 'border-gray-200 dark:border-[#333]' : 'border-gray-100 dark:border-[#1a1a1a]'}`}>
                            <td
                              onClick={() => handleBatchToggleDay(day.key)}
                              className={`px-2 py-1.5 text-center text-[11px] font-bold border-r border-gray-200 dark:border-[#333] select-none cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all ${
                                day.key === 5 ? 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-500/5' : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {day.shortLabel}
                            </td>
                            {jams.map(jam => {
                              const status = gridData.get(`${day.key}-${jam}`) || 'available';
                              const cfg = status === 'available'
                                ? { icon: <Check size={16} strokeWidth={3} />, bg: 'bg-emerald-50 dark:bg-emerald-500/15', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' }
                                : status === 'conditional'
                                ? { icon: <HelpCircle size={16} strokeWidth={2.5} />, bg: 'bg-amber-50 dark:bg-amber-500/15', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' }
                                : { icon: <X size={16} strokeWidth={3} />, bg: 'bg-red-50 dark:bg-red-500/15', border: 'border-red-200 dark:border-red-500/30', text: 'text-red-500 dark:text-red-400' };
                              return (
                                <td
                                  key={jam}
                                  onClick={() => handleCellChange(day.key, jam,
                                    status === 'available' ? 'conditional' : status === 'conditional' ? 'unavailable' : 'available'
                                  )}
                                  className="px-0.5 py-0.5 text-center border-r border-gray-50 dark:border-[#1a1a1a] cursor-pointer"
                                >
                                  <div className={`flex items-center justify-center w-full h-9 rounded-lg border transition-all hover:scale-105 hover:shadow-sm active:scale-95 ${cfg.bg} ${cfg.border} ${cfg.text} text-sm`}>
                                    {cfg.icon}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[10px]">
                    <span className="text-gray-400">Keterangan :</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center justify-center w-5 h-5 rounded border bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><Check size={12} strokeWidth={3} /></div>
                      <span className="text-gray-500 font-medium">Tersedia</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center justify-center w-5 h-5 rounded border bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"><HelpCircle size={12} strokeWidth={2.5} /></div>
                      <span className="text-gray-500 font-medium">Bersyarat</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center justify-center w-5 h-5 rounded border bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400"><X size={12} strokeWidth={3} /></div>
                      <span className="text-gray-500 font-medium">Tidak tersedia</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pembatasan' && (
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-5 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batas Jumlah Jam Jeda per Minggu</label>
                    <p className="text-[10px] text-gray-400">Misalnya, guru memiliki 3 jam jeda jika ia mengajar di jam ke-2 dan kemudian ke-6 di hari yang sama.</p>
                    <input
                      type="number"
                      value={pembatasanForm.maxGapsPerWeek ?? ''}
                      onChange={e => setPembatasanForm(f => ({ ...f, maxGapsPerWeek: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Kosongkan = tidak dibatasi"
                      className="w-full max-w-[240px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                  <div className="border-t border-gray-100 dark:border-[#222]" />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batas Hari Mengajar</label>
                    <p className="text-[10px] text-gray-400">Batas maksimal jumlah hari guru mengajar dalam seminggu.</p>
                    <select
                      value={pembatasanForm.maxTeachingDays ?? ''}
                      onChange={e => setPembatasanForm(f => ({ ...f, maxTeachingDays: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full max-w-[240px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="">Tidak dibatasi</option>
                      {[1, 2, 3, 4, 5, 6].map(d => (
                        <option key={d} value={d}>{d} hari</option>
                      ))}
                    </select>
                  </div>
                  <div className="border-t border-gray-100 dark:border-[#222]" />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min / Maks Jumlah Pelajaran per Hari</label>
                    <p className="text-[10px] text-gray-400">Jika guru datang di hari tertentu, berapa jam pelajaran minimal/maksimal yang harus diampu.</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[120px]">
                        <input
                          type="number"
                          value={pembatasanForm.minLessonsPerDay ?? ''}
                          onChange={e => setPembatasanForm(f => ({ ...f, minLessonsPerDay: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Min (0)"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>
                      <span className="text-gray-400">—</span>
                      <div className="flex-1 max-w-[120px]">
                        <input
                          type="number"
                          value={pembatasanForm.maxLessonsPerDay ?? ''}
                          onChange={e => setPembatasanForm(f => ({ ...f, maxLessonsPerDay: e.target.value ? Number(e.target.value) : null }))}
                          placeholder={`Maks (${maxJam})`}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 dark:border-[#222]" />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah Maksimal Pelajaran Berurutan</label>
                    <p className="text-[10px] text-gray-400">Parameter ini membatasi jumlah jam mengajar guru secara terus menerus tanpa istirahat.</p>
                    <input
                      type="number"
                      value={pembatasanForm.maxConsecutiveLessons ?? ''}
                      onChange={e => setPembatasanForm(f => ({ ...f, maxConsecutiveLessons: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Kosongkan = tidak dibatasi"
                      className="w-full max-w-[240px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-[#222] bg-white dark:bg-[#111] flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Pengaturan</>}
          </button>
        </div>
      </div>
    </div>
  );
};
