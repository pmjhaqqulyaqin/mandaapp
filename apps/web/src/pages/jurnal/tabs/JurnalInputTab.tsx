import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useScheduleToday, useClassStudents, useTeachingMethodsList } from '../../../hooks/api/useJurnal';
import { apiClient } from '../../../lib/api';
import { smartSend, offlineCache } from '../../../lib/syncEngine';
import { compressImage } from '../../../lib/imageCompressor';
import { toast } from 'sonner';
import { ArrowLeft, Check, BookOpen, Users, Camera, Link as LinkIcon, FileText, Plus, ChevronDown, ChevronUp, Lock, Zap } from 'lucide-react';

/** Parse "HH:mm" time string to minutes since midnight */
function timeToMinutes(time: string): number {
  if (!time) return -1;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Get current time as minutes since midnight */
function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

type ScheduleStatus = 'belum_waktunya' | 'sedang_berlangsung' | 'bisa_diisi' | 'lewat_batas' | 'tersimpan';

/** Determine the status of a schedule item based on current time */
function getScheduleStatus(
  item: any,
  currentMinutes: number,
  deadlineMode: string,
  deadlineTime: string,
  allItems: any[]
): ScheduleStatus {
  if (item.alreadyFilled) return 'tersimpan';

  const start = timeToMinutes(item.waktuMulai);
  const end = timeToMinutes(item.waktuSelesai);

  // If no time data, always allow (fallback for legacy data)
  if (start < 0 || end < 0) return 'bisa_diisi';

  // Before class starts
  if (currentMinutes < start) return 'belum_waktunya';

  // During class
  if (currentMinutes >= start && currentMinutes <= end) return 'sedang_berlangsung';

  // After class — check deadline
  let deadlineMinutes: number;
  if (deadlineMode === 'sesuai_waktu_belajar') {
    const lastEnd = Math.max(...allItems.map(i => timeToMinutes(i.waktuSelesai)).filter(t => t >= 0));
    deadlineMinutes = lastEnd >= 0 ? lastEnd : end;
  } else {
    deadlineMinutes = timeToMinutes(deadlineTime);
  }

  if (currentMinutes <= deadlineMinutes) return 'bisa_diisi';
  return 'lewat_batas';
}

const STATUS_BADGE: Record<ScheduleStatus, {
  badge: string;
  badgeClass: string;
  disabled: boolean;
  icon?: any;
}> = {
  belum_waktunya: {
    badge: 'Belum Waktunya',
    badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    disabled: true,
    icon: Lock,
  },
  sedang_berlangsung: {
    badge: 'Sedang Berlangsung',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 animate-pulse',
    disabled: false,
    icon: Zap,
  },
  bisa_diisi: {
    badge: 'Belum Dijurnal',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    disabled: false,
  },
  lewat_batas: {
    badge: 'Lewat Batas',
    badgeClass: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    disabled: true,
    icon: Lock,
  },
  tersimpan: {
    badge: 'Sudah Diisi',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    disabled: true,
  },
};

interface FormData {
  teachingSubjectId: string; teacherId: string; classId: string; subjectName: string; className: string;
  date: string; jamKe: string; waktuMulai: string; waktuSelesai: string; linkRpp: string;
  materiPembelajaran: string; metode: string; capaianPembelajaran: string; kendalaDanSolusi: string;
  catatan: string; evaluasi: string; status: string;
}

const INITIAL: FormData = {
  teachingSubjectId: '', teacherId: '', classId: '', subjectName: '', className: '',
  date: new Date().toLocaleDateString('sv-SE'), jamKe: '', waktuMulai: '', waktuSelesai: '', linkRpp: '',
  materiPembelajaran: '', metode: '', capaianPembelajaran: '', kendalaDanSolusi: '',
  catatan: '', evaluasi: '', status: 'draft',
};

interface Props {
  onBack: () => void;
  selectedSchedule?: any;
}

export const JurnalInputTab = ({ onBack, selectedSchedule }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [employeeId, setEmployeeId] = useState('');
  const [attendance, setAttendance] = useState<{ studentId: string; status: string; name: string }[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [attendanceExpanded, setAttendanceExpanded] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  const methods = useTeachingMethodsList();

  // Get employee ID
  useEffect(() => {
    if (!user?.id) return;
    apiClient<any>('/employees/me').then(emp => {
      if (emp) { setEmployeeId(emp.id); setForm(f => ({ ...f, teacherId: emp.id })); }
    }).catch(() => {});
  }, [user?.id]);

  // Auto-fill from selected schedule
  useEffect(() => {
    if (selectedSchedule) {
      setForm(f => ({
        ...f,
        teachingSubjectId: selectedSchedule.id,
        classId: selectedSchedule.classId,
        subjectName: selectedSchedule.subjectName,
        className: selectedSchedule.className || '',
        jamKe: selectedSchedule.jamKe || '',
        waktuMulai: selectedSchedule.waktuMulai || '',
        waktuSelesai: selectedSchedule.waktuSelesai || '',
      }));
    }
  }, [selectedSchedule]);

  const schedule = useScheduleToday(employeeId);
  // Parse new response format: { schedule: [...], deadlineMode, deadlineTime } (backward compatible with plain array)
  const scheduleData = schedule.data as any;
  const scheduleItems: any[] = Array.isArray(scheduleData) ? scheduleData : (scheduleData?.schedule || []);
  const deadlineMode = scheduleData?.deadlineMode || 'waktu_tertentu';
  const deadlineTime = scheduleData?.deadlineTime || '17:00';
  const [currentTime, setCurrentTime] = useState(() => nowMinutes());

  // Auto-refresh time every 30 seconds to update status indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(nowMinutes()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const classStudents = useClassStudents(form.classId, form.date);

  // Init attendance from class students
  useEffect(() => {
    if (classStudents.data && form.classId) {
      setAttendance(classStudents.data.map((s: any) => ({
        studentId: s.id, name: s.fullName || s.nis || '-',
        status: s.dailyStatus === 'Hadir' || s.dailyStatus === 'Terlambat' ? 'Hadir' : (s.dailyStatus || 'Hadir'),
      })));
      offlineCache.cacheClassStudents(form.classId, classStudents.data).catch(() => {});
    }
  }, [classStudents.data, form.classId]);

  useEffect(() => {
    if (scheduleItems.length > 0) {
      offlineCache.cacheScheduleToday(scheduleItems).catch(() => {});
    }
  }, [scheduleItems]);

  // Auto-save draft
  useEffect(() => {
    const timer = setInterval(() => {
      if (form.materiPembelajaran || form.classId) {
        localStorage.setItem('jurnal_draft', JSON.stringify(form));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [form]);

  // Load draft
  useEffect(() => {
    if (selectedSchedule) return; // Don't load draft if navigating from schedule
    const draft = localStorage.getItem('jurnal_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.date === new Date().toISOString().split('T')[0]) setForm(parsed);
      } catch {}
    }
  }, []);

  const selectSchedule = (item: any) => {
    setForm(f => ({
      ...f, teachingSubjectId: item.id, classId: item.classId,
      subjectName: item.subjectName, className: item.className || '',
      jamKe: item.jamKe || '', waktuMulai: item.waktuMulai || '', waktuSelesai: item.waktuSelesai || '',
    }));
  };

  const toggleStudentStatus = (studentId: string, newStatus: string) => {
    setAttendance(a => a.map(s => s.studentId === studentId ? { ...s, status: newStatus } : s));
  };

  const setAllHadir = () => setAttendance(a => a.map(s => ({ ...s, status: 'Hadir' })));

  const toggleMethod = (name: string) => {
    setSelectedMethods(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  const handleAddMethod = () => {
    const name = prompt('Nama metode pembelajaran baru:');
    if (name?.trim()) {
      methods.createMut.mutate(name.trim(), {
        onSuccess: (data: any) => {
          setSelectedMethods(prev => [...prev, data.name]);
          toast.success(`Metode "${data.name}" ditambahkan`);
        },
        onError: () => toast.error('Gagal menambah metode. Mungkin sudah ada.'),
      });
    }
  };

  // Sync selectedMethods to form.metode
  useEffect(() => {
    setForm(f => ({ ...f, metode: selectedMethods.join(', ') }));
  }, [selectedMethods]);

  const handleSave = async (andSubmit: boolean) => {
    if (!form.classId || !form.subjectName) { toast.error('Pilih jadwal terlebih dahulu'); return; }
    setSaving(true);

    const payload = {
      ...form,
      status: andSubmit ? 'submitted' : 'draft',
      attendance: attendance.length > 0 ? attendance.map(a => ({ studentId: a.studentId, status: a.status })) : undefined,
    };

    try {
      // ━━ OFFLINE-FIRST: If offline, go straight to smartSend ━━
      if (!navigator.onLine) {
        await smartSend('jurnal_create', payload, `Jurnal ${form.subjectName} - ${form.className}`);
        localStorage.removeItem('jurnal_draft');
        // Invalidate schedule & entries cache so status updates on return
        await queryClient.invalidateQueries({ queryKey: ['jurnal-schedule-today'] });
        await queryClient.invalidateQueries({ queryKey: ['jurnal-entries'] });
        toast.success('📱 Jurnal tersimpan offline — akan dikirim saat online');
        onBack();
        return;
      }

      // ━━ ONLINE: Try direct API for immediate server response ━━
      const entry = await apiClient<any>('/jurnal/entries', { method: 'POST', data: payload });

      // Upload photos (only when online)
      if (photos.length > 0) {
        const compressed = await Promise.all(photos.map(p => compressImage(p, { maxWidth: 1280, quality: 0.7 })));
        await Promise.all(compressed.map(photo => {
          const fd = new FormData();
          fd.append('file', photo);
          fd.append('jurnalEntryId', entry.id);
          fd.append('fileType', 'photo');
          return apiClient<any>('/jurnal/attachments', { method: 'POST', data: fd });
        }));
      }

      localStorage.removeItem('jurnal_draft');
      // Invalidate schedule & entries cache so JurnalHome shows updated status immediately
      await queryClient.invalidateQueries({ queryKey: ['jurnal-schedule-today'] });
      await queryClient.invalidateQueries({ queryKey: ['jurnal-entries'] });
      toast.success(andSubmit ? 'Jurnal berhasil disubmit!' : 'Draft tersimpan!');
      onBack();
    } catch (err: any) {
      // Online but server failed → queue for later sync
      const msg = (err.message || '').toLowerCase();
      const isNetErr = msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('abort');

      if (isNetErr) {
        try {
          await smartSend('jurnal_create', payload, `Jurnal ${form.subjectName} - ${form.className}`);
          localStorage.removeItem('jurnal_draft');
          // Invalidate schedule & entries cache so status updates on return
          await queryClient.invalidateQueries({ queryKey: ['jurnal-schedule-today'] });
          await queryClient.invalidateQueries({ queryKey: ['jurnal-entries'] });
          toast.success('📱 Jurnal tersimpan offline — akan dikirim saat online');
          onBack();
        } catch {
          toast.error('Gagal menyimpan bahkan secara offline');
        }
      } else {
        toast.error(err.message || 'Gagal menyimpan');
      }
    }
    setSaving(false);
  };

  // Attendance summary
  const attSummary = {
    hadir: attendance.filter(a => a.status === 'Hadir').length,
    sakit: attendance.filter(a => a.status === 'Sakit').length,
    izin: attendance.filter(a => a.status === 'Izin').length,
    alpa: attendance.filter(a => a.status === 'Alpa').length,
  };

  const statusColors: Record<string, string> = {
    Hadir: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    Sakit: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    Izin: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    Alpa: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="jurnal-input-accessible pb-4 -mx-3 md:mx-0">
      {/* ── Sticky Header ── */}
      <div className="bg-white dark:bg-[#111] px-5 sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 md:rounded-t-xl"
        style={{ height: '56px', display: 'flex', alignItems: 'center' }}>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform">
              <ArrowLeft size={22} className="text-emerald-700 dark:text-emerald-400" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Jurnal Baru</h1>
          </div>
          <button onClick={() => handleSave(true)} disabled={saving || !form.classId}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-40 active:scale-95 transition-all">
            <Check size={20} />
          </button>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-8">
        {/* ══════════════════════════════════════════════════
           Section 1: Pilih Jadwal
           ══════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">1</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pilih Jadwal</h2>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl jurnal-card-shadow border border-gray-200/60 dark:border-gray-700">
            {schedule.isLoading && <p className="text-base text-gray-400 italic text-center py-4">Memuat jadwal...</p>}
            {!schedule.isLoading && scheduleItems.length === 0 && (
              <p className="text-base text-gray-400 dark:text-gray-500 italic text-center py-4">Tidak ada jadwal hari ini</p>
            )}
            <div className="space-y-3">
              {scheduleItems.map((item: any) => {
                const status = getScheduleStatus(item, currentTime, deadlineMode, deadlineTime, scheduleItems);
                const config = STATUS_BADGE[status];
                const isDisabled = config.disabled;
                const StatusIcon = config.icon;
                const isSelected = form.teachingSubjectId === item.id;

                return (
                  <button key={item.id} onClick={() => !isDisabled && selectSchedule(item)} disabled={isDisabled}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                      isSelected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500/30'
                      : isDisabled ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#222] hover:border-emerald-300'
                    }`}
                    style={{ minHeight: '56px' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-semibold mb-0.5 ${
                          status === 'sedang_berlangsung' ? 'text-emerald-600 dark:text-emerald-400' :
                          status === 'bisa_diisi' ? 'text-amber-600 dark:text-amber-400' :
                          'text-gray-400 dark:text-gray-500'
                        }`}>
                          {item.waktuMulai || '--:--'} - {item.waktuSelesai || '--:--'}
                        </p>
                        <p className={`font-bold text-base ${isDisabled && status !== 'tersimpan' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{item.subjectName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.className} • Jam ke {item.jamKe || '-'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${config.badgeClass}`}>
                          {StatusIcon && <StatusIcon size={12} />}
                          {config.badge}
                        </span>
                        {isSelected && <Check size={22} className="text-emerald-600" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Link RPP */}
            <div className="mt-6 space-y-2">
              <label className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <LinkIcon size={18} className="text-emerald-600" />
                Link RPP (opsional)
              </label>
              <input type="url" placeholder="https://drive.google.com/..."
                value={form.linkRpp} onChange={e => setForm(f => ({ ...f, linkRpp: e.target.value }))}
                className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#111] text-base text-gray-900 dark:text-white placeholder-gray-400" />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
           Section 2: Materi & Kegiatan
           ══════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">2</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Materi & Kegiatan</h2>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl jurnal-card-shadow border border-gray-200/60 dark:border-gray-700 space-y-6">
            {/* Materi Pokok */}
            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 dark:text-gray-200">
                Materi Pokok <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="Contoh: Perubahan Wujud Benda"
                value={form.materiPembelajaran} onChange={e => setForm(f => ({ ...f, materiPembelajaran: e.target.value }))}
                className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#111] text-base text-gray-900 dark:text-white placeholder-gray-400" />
            </div>

            {/* Tujuan Pembelajaran */}
            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 dark:text-gray-200">Tujuan Pembelajaran</label>
              <textarea rows={4} placeholder="Siswa dapat menjelaskan..."
                value={form.capaianPembelajaran} onChange={e => setForm(f => ({ ...f, capaianPembelajaran: e.target.value }))}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#111] text-base text-gray-900 dark:text-white placeholder-gray-400 resize-none" />
            </div>

            {/* Metode Pembelajaran */}
            <div className="space-y-3">
              <label className="text-base font-semibold text-gray-800 dark:text-gray-200">Metode Pembelajaran</label>
              <div className="flex flex-wrap gap-2">
                {methods.query.data?.map((m: any) => (
                  <button key={m.id} onClick={() => toggleMethod(m.name)}
                    className={`h-12 px-6 rounded-full text-base font-semibold transition-all active:scale-95 ${
                      selectedMethods.includes(m.name)
                        ? 'jurnal-chip-active shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>{m.name}</button>
                ))}
                <button onClick={handleAddMethod}
                  className="h-12 px-6 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 rounded-full hover:border-emerald-400 hover:text-emerald-500 transition-colors flex items-center gap-2 text-base font-semibold active:scale-95">
                  <Plus size={16} /> Lainnya
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
           Section 3: Absensi Siswa
           ══════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">3</span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Absensi Siswa</h2>
            </div>
            <button onClick={() => setAttendanceExpanded(!attendanceExpanded)}
              className="text-emerald-700 dark:text-emerald-400 font-semibold text-base flex items-center gap-1 active:scale-95 transition-transform"
              style={{ minHeight: '48px' }}>
              {attendanceExpanded ? 'Tutup' : 'Isi Absensi'}
              {attendanceExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {/* 2×2 Attendance Summary Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-green-100 dark:border-emerald-800 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-green-800 dark:text-emerald-400">{attSummary.hadir}</span>
              <span className="text-base font-semibold text-green-700 dark:text-emerald-400 mt-1">Hadir</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-red-800 dark:text-red-400">{attSummary.sakit}</span>
              <span className="text-base font-semibold text-red-700 dark:text-red-400 mt-1">Sakit</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-blue-800 dark:text-blue-400">{attSummary.izin}</span>
              <span className="text-base font-semibold text-blue-700 dark:text-blue-400 mt-1">Izin</span>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-orange-800 dark:text-orange-400">{attSummary.alpa}</span>
              <span className="text-base font-semibold text-orange-700 dark:text-orange-400 mt-1">Alpa</span>
            </div>
          </div>

          {/* Expanded: Student list */}
          {attendanceExpanded && (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200/60 dark:border-gray-700 overflow-hidden jurnal-card-shadow">
              <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Tap untuk ubah status</p>
                <button onClick={setAllHadir}
                  className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full active:scale-95"
                  style={{ minHeight: '40px' }}>
                  Semua Hadir
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto px-5 py-3 space-y-2">
                {attendance.map((s, i) => (
                  <div key={s.studentId} className="flex items-center gap-3 bg-white dark:bg-[#222] rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-words whitespace-normal">{s.name}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {['Hadir', 'Sakit', 'Izin', 'Alpa'].map(st => (
                        <button key={st} onClick={() => toggleStudentStatus(s.studentId, st)}
                          className={`w-9 h-9 rounded-full text-sm font-bold transition-all active:scale-90 flex items-center justify-center ${
                            s.status === st ? statusColors[st] : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                          }`}>{st.charAt(0)}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {attendance.length === 0 && (
                  <p className="text-base text-gray-400 text-center py-6">Pilih jadwal di atas untuk memuat data siswa</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════
           Section 4: Evaluasi & Lampiran
           ══════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">4</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Evaluasi & Lampiran</h2>
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl jurnal-card-shadow border border-gray-200/60 dark:border-gray-700 space-y-6">
            {/* Catatan Guru */}
            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 dark:text-gray-200">Catatan Guru</label>
              <textarea rows={3} placeholder="Kendala, perilaku khusus siswa, atau hal penting..."
                value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#111] text-base text-gray-900 dark:text-white placeholder-gray-400 resize-none" />
            </div>

            {/* Foto Kegiatan */}
            <div className="space-y-2">
              <label className="text-base font-semibold text-gray-800 dark:text-gray-200">Foto Kegiatan</label>
              <div className="flex gap-3 flex-wrap">
                <label className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 cursor-pointer hover:border-emerald-400 hover:text-emerald-500 transition-colors active:scale-95 bg-gray-50 dark:bg-[#111]"
                  style={{ minHeight: '128px' }}>
                  <Camera size={32} />
                  <span className="text-base font-semibold">Tambah Foto</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setPhotos(p => [...p, e.target.files![0]]); }} />
                </label>
                {photos.length > 0 && (
                  <div className="flex gap-3 flex-wrap w-full">
                    {photos.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center leading-none active:scale-90">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
           Action Buttons
           ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4 pt-4 pb-4">
          <button onClick={() => handleSave(false)} disabled={saving || !form.classId}
            className="h-14 rounded-full border-2 border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400 text-lg font-bold disabled:opacity-40 active:scale-95 transition-all">
            Simpan Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !form.classId}
            className="h-14 rounded-full bg-emerald-700 text-white text-lg font-bold shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 disabled:opacity-40 active:scale-95 transition-all">
            {saving ? 'Menyimpan...' : 'Simpan Jurnal'}
          </button>
        </div>
      </div>
    </div>
  );
};
