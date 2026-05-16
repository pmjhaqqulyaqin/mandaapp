import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useScheduleToday, useClassStudents, useTeachingMethodsList } from '../../../hooks/api/useJurnal';
import { apiClient } from '../../../lib/api';
import { smartSend, offlineCache } from '../../../lib/syncEngine';
import { compressImage } from '../../../lib/imageCompressor';
import { toast } from 'sonner';
import { ArrowLeft, Check, BookOpen, Users, Camera, Link as LinkIcon, FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react';

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
    if (schedule.data && schedule.data.length > 0) {
      offlineCache.cacheScheduleToday(schedule.data).catch(() => {});
    }
  }, [schedule.data]);

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
    <div className="pb-4 -mx-3 md:mx-0">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-[#111] px-4 pt-3 pb-3 sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 md:rounded-t-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Jurnal Baru</h1>
          </div>
          <button onClick={() => handleSave(true)} disabled={saving || !form.classId}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-40 active:scale-95 transition-all">
            <Check size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Section 1: Pilih Jadwal */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Pilih Jadwal
          </h3>
          {schedule.isLoading && <p className="text-sm text-gray-400">Memuat jadwal...</p>}
          {schedule.data?.length === 0 && <p className="text-sm text-gray-400">Tidak ada jadwal hari ini</p>}
          <div className="space-y-2">
            {schedule.data?.map((item: any) => (
              <button key={item.id} onClick={() => selectSchedule(item)} disabled={item.alreadyFilled}
                className={`w-full text-left p-3 rounded-lg border transition-all active:scale-[0.98] ${
                  form.teachingSubjectId === item.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500/30'
                  : item.alreadyFilled ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#222] hover:border-emerald-300'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.subjectName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.className} • Jam ke {item.jamKe || '-'}</p>
                  </div>
                  {item.alreadyFilled && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">Sudah Diisi</span>}
                  {form.teachingSubjectId === item.id && <Check size={18} className="text-emerald-600" />}
                </div>
              </button>
            ))}
          </div>

          {/* Link RPP */}
          <div className="mt-3">
            <label className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1"><LinkIcon size={14} /> Link RPP (opsional)</label>
            <input type="url" placeholder="https://drive.google.com/..." value={form.linkRpp} onChange={e => setForm(f => ({ ...f, linkRpp: e.target.value }))}
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-[#111] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
          </div>
        </div>

        {/* Section 2: Materi & Kegiatan */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Materi & Kegiatan
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 font-medium">Materi Pokok <span className="text-red-400">*</span></label>
              <textarea className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-[#111] focus:border-emerald-500 outline-none resize-none"
                rows={2} placeholder="Contoh: Perubahan Wujud Benda" value={form.materiPembelajaran}
                onChange={e => setForm(f => ({ ...f, materiPembelajaran: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tujuan Pembelajaran</label>
              <textarea className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-[#111] focus:border-emerald-500 outline-none resize-none"
                rows={2} placeholder="Siswa dapat menjelaskan..." value={form.capaianPembelajaran}
                onChange={e => setForm(f => ({ ...f, capaianPembelajaran: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 font-medium">Metode Pembelajaran</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {methods.query.data?.map((m: any) => (
                  <button key={m.id} onClick={() => toggleMethod(m.name)}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all active:scale-95 ${
                      selectedMethods.includes(m.name)
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>{m.name}</button>
                ))}
                <button onClick={handleAddMethod}
                  className="px-3 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 text-xs rounded-full hover:border-emerald-400 hover:text-emerald-500 transition-colors flex items-center gap-1 active:scale-95">
                  <Plus size={12} /> Lainnya
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Absensi */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
                Absensi Siswa
              </h3>
              <button onClick={() => setAttendanceExpanded(!attendanceExpanded)}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                {attendanceExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {attendanceExpanded ? 'Tutup' : 'Isi Absensi'}
              </button>
            </div>
            <div className="flex gap-3 text-center">
              <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{attSummary.hadir}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Hadir</p>
              </div>
              <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                <p className="text-xl font-bold text-red-500 dark:text-red-400">{attSummary.sakit}</p>
                <p className="text-xs text-red-500 dark:text-red-400">Sakit</p>
              </div>
              <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                <p className="text-xl font-bold text-blue-500 dark:text-blue-400">{attSummary.izin}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400">Izin</p>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <p className="text-xl font-bold text-gray-500 dark:text-gray-400">{attSummary.alpa}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Alpa</p>
              </div>
            </div>
          </div>

          {/* Expanded: Student list */}
          {attendanceExpanded && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              <div className="px-4 py-2 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">Tap untuk ubah status</p>
                <button onClick={setAllHadir} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full active:scale-95">
                  Semua Hadir
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto px-4 pb-3 space-y-1.5">
                {attendance.map((s, i) => (
                  <div key={s.studentId} className="flex items-center gap-3 bg-white dark:bg-[#222] rounded-lg p-2.5">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs shrink-0">
                      {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {['Hadir', 'Sakit', 'Izin', 'Alpa'].map(st => (
                        <button key={st} onClick={() => toggleStudentStatus(s.studentId, st)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-90 ${
                            s.status === st ? statusColors[st] : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                          }`}>{st.charAt(0)}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {attendance.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Pilih jadwal di atas untuk memuat data siswa</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Evaluasi & Lampiran */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
            Evaluasi & Lampiran
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 font-medium">Catatan Guru</label>
              <textarea className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-[#111] focus:border-emerald-500 outline-none resize-none"
                rows={3} placeholder="Kendala, perilaku khusus siswa, atau hal penting..." value={form.catatan}
                onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 font-medium">Foto Kegiatan</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                <label className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-emerald-400 hover:text-emerald-500 transition-colors shrink-0">
                  <Camera size={16} />
                  <span className="text-[9px] mt-0.5">Tambah</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setPhotos(p => [...p, e.target.files![0]]); }} />
                </label>
                {photos.map((f, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center leading-none">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 pb-2">
          <button onClick={() => handleSave(false)} disabled={saving || !form.classId}
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-all">
            Simpan Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !form.classId}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 disabled:opacity-40 active:scale-[0.98] transition-all">
            {saving ? 'Menyimpan...' : 'Simpan Jurnal'}
          </button>
        </div>
      </div>
    </div>
  );
};
