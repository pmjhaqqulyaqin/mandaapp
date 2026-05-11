import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useScheduleToday, useClassStudents, useJurnalMutations } from '../../../hooks/api/useJurnal';
import { apiClient } from '../../../lib/api';
import { smartSend, offlineCache } from '../../../lib/syncEngine';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Send, Save, Check, BookOpen, Users, Camera, Link as LinkIcon, FileText, ClipboardList } from 'lucide-react';

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

export const JurnalInputTab = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [employeeId, setEmployeeId] = useState('');
  const [attendance, setAttendance] = useState<{ studentId: string; status: string; name: string }[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ materi: true, attendance: true, catatan: true });

  const { createEntry, saveAttendance, uploadAttachment, submitEntry } = useJurnalMutations();

  // Get employee ID from user
  useEffect(() => {
    if (!user?.id) return;
    apiClient<any[]>('/employees').then(emps => {
      const me = emps.find((e: any) => e.userId === user.id);
      if (me) { setEmployeeId(me.id); setForm(f => ({ ...f, teacherId: me.id })); }
    }).catch(() => {});
  }, [user?.id]);

  const schedule = useScheduleToday(employeeId);
  const classStudents = useClassStudents(form.classId, form.date);

  // Init attendance from class students
  useEffect(() => {
    if (classStudents.data && form.classId) {
      setAttendance(classStudents.data.map((s: any) => ({
        studentId: s.id, name: s.fullName || s.nis || '-',
        status: s.dailyStatus === 'Hadir' || s.dailyStatus === 'Terlambat' ? 'Hadir' : (s.dailyStatus || 'Hadir'),
      })));
      // Cache class students for offline access
      offlineCache.cacheClassStudents(form.classId, classStudents.data).catch(() => {});
    }
  }, [classStudents.data, form.classId]);

  // Cache schedule when loaded for offline access
  useEffect(() => {
    if (schedule.data && schedule.data.length > 0) {
      offlineCache.cacheScheduleToday(schedule.data).catch(() => {});
    }
  }, [schedule.data]);

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setInterval(() => {
      if (form.materiPembelajaran || form.classId) {
        localStorage.setItem('jurnal_draft', JSON.stringify(form));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [form]);

  // Load draft on mount
  useEffect(() => {
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

  const toggleSection = (key: string) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  const toggleStudentStatus = (studentId: string, newStatus: string) => {
    setAttendance(a => a.map(s => s.studentId === studentId ? { ...s, status: newStatus } : s));
  };

  const setAllHadir = () => setAttendance(a => a.map(s => ({ ...s, status: 'Hadir' })));

  const handleSave = async (andSubmit: boolean) => {
    if (!form.classId || !form.subjectName) { toast.error('Pilih jadwal terlebih dahulu'); return; }
    setSaving(true);
    try {
      const entry = await createEntry.mutateAsync({ ...form, status: 'draft' });
      if (attendance.length > 0) {
        await saveAttendance.mutateAsync({ entryId: entry.id, records: attendance.map(a => ({ studentId: a.studentId, status: a.status })) });
      }
      for (const photo of photos) {
        const fd = new FormData(); fd.append('file', photo); fd.append('jurnalEntryId', entry.id); fd.append('fileType', 'photo');
        await uploadAttachment.mutateAsync(fd);
      }
      if (andSubmit) await submitEntry.mutateAsync(entry.id);
      localStorage.removeItem('jurnal_draft');
      toast.success(andSubmit ? 'Jurnal berhasil disubmit!' : 'Draft tersimpan!');
      setForm(INITIAL); setAttendance([]); setPhotos([]); setStep(0);
    } catch (err: any) {
      // Offline fallback: save to IndexedDB queue
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        try {
          await smartSend('jurnal_create', {
            ...form,
            status: andSubmit ? 'submitted' : 'draft',
            attendance: attendance.map(a => ({ studentId: a.studentId, status: a.status })),
            // Note: photos cannot be saved offline in this simplified flow
          }, `Jurnal ${form.subjectName} - ${form.className}`);
          localStorage.removeItem('jurnal_draft');
          toast.success('📱 Jurnal tersimpan offline — akan di-sync saat online');
          setForm(INITIAL); setAttendance([]); setPhotos([]); setStep(0);
        } catch {
          toast.error('Gagal menyimpan bahkan secara offline');
        }
      } else {
        toast.error(err.message || 'Gagal menyimpan');
      }
    }
    setSaving(false);
  };

  const steps = ['Jadwal & RPP', 'Isi Jurnal', 'Upload & Submit'];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-center mb-6 px-2">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center">
            <button onClick={() => setStep(i)} className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i <= step ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              } ${i === step ? 'ring-4 ring-emerald-100 dark:ring-emerald-900/30 scale-110' : ''}`}>
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold ${i <= step ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>{label}</span>
            </button>
            {i < 2 && <div className={`w-12 sm:w-20 h-0.5 mx-1 mt-[-18px] ${i < step ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Jadwal & RPP */}
      {step === 0 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2"><BookOpen size={16} /> Jadwal Hari Ini</h3>
            {schedule.isLoading && <p className="text-xs text-gray-500">Memuat jadwal...</p>}
            {schedule.data?.length === 0 && <p className="text-xs text-gray-500">Tidak ada jadwal hari ini</p>}
            <div className="space-y-2">
              {schedule.data?.map((item: any) => (
                <button key={item.id} onClick={() => selectSchedule(item)} disabled={item.alreadyFilled}
                  className={`w-full text-left p-3 rounded-lg border transition-all active:scale-[0.98] ${
                    form.teachingSubjectId === item.id ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-500/30'
                    : item.alreadyFilled ? 'border-gray-200 bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:border-emerald-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.subjectName}</p>
                      <p className="text-xs text-gray-500">{item.className} • Jam ke {item.jamKe}</p>
                    </div>
                    {item.alreadyFilled && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">Sudah Diisi</span>}
                    {form.teachingSubjectId === item.id && <Check size={18} className="text-emerald-600" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Link RPP */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-2"><LinkIcon size={14} /> Link RPP (opsional)</label>
            <input type="url" placeholder="https://drive.google.com/..." value={form.linkRpp} onChange={e => setForm(f => ({ ...f, linkRpp: e.target.value }))}
              className="w-full bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 py-2.5 px-3 text-sm" />
          </div>
        </div>
      )}

      {/* Step 2: Isi Jurnal */}
      {step === 1 && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Info card */}
          {form.subjectName && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">{form.subjectName.charAt(0)}</div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{form.subjectName}</p>
                <p className="text-xs text-gray-500">{form.className} • Jam ke {form.jamKe} • {form.date}</p>
              </div>
            </div>
          )}

          {/* Kehadiran */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => toggleSection('attendance')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#222]">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><Users size={14} /> Kehadiran Siswa</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full">
                  {attendance.filter(a => a.status === 'Hadir').length}/{attendance.length}
                </span>
                <ChevronRight size={14} className={`text-gray-400 transition-transform ${expandedSections.attendance ? 'rotate-90' : ''}`} />
              </div>
            </button>
            {expandedSections.attendance && (
              <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between py-2">
                  <p className="text-[10px] text-gray-500">Info absen pagi ditampilkan sebagai default</p>
                  <button onClick={setAllHadir} className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700">Semua Hadir</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                  {attendance.map((s, i) => (
                    <div key={s.studentId} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-gray-400 w-5">{i + 1}</span>
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {['Hadir', 'Izin', 'Sakit', 'Alpa'].map(st => (
                          <button key={st} onClick={() => toggleStudentStatus(s.studentId, st)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all active:scale-95 ${
                              s.status === st
                                ? st === 'Hadir' ? 'bg-emerald-500 text-white' : st === 'Izin' ? 'bg-blue-500 text-white' : st === 'Sakit' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                            {st.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {attendance.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Pilih jadwal di Step 1 untuk memuat siswa</p>}
                </div>
              </div>
            )}
          </div>

          {/* Materi */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => toggleSection('materi')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#222]">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><FileText size={14} /> Materi Pembelajaran</span>
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${expandedSections.materi ? 'rotate-90' : ''}`} />
            </button>
            {expandedSections.materi && (
              <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800">
                <div className="pt-2">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Materi</label>
                  <textarea rows={4} placeholder="Deskripsikan materi pembelajaran..." value={form.materiPembelajaran}
                    onChange={e => setForm(f => ({ ...f, materiPembelajaran: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 p-3 text-sm resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Metode</label>
                  <input type="text" placeholder="Ceramah, Diskusi, Praktikum..." value={form.metode}
                    onChange={e => setForm(f => ({ ...f, metode: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 py-2.5 px-3 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Catatan & Evaluasi */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => toggleSection('catatan')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#222]">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList size={14} /> Catatan & Evaluasi</span>
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${expandedSections.catatan ? 'rotate-90' : ''}`} />
            </button>
            {expandedSections.catatan && (
              <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800">
                <div className="pt-2">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Catatan</label>
                  <textarea rows={3} placeholder="Catatan tambahan..." value={form.catatan}
                    onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 p-3 text-sm resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Evaluasi</label>
                  <textarea rows={3} placeholder="Evaluasi pembelajaran hari ini..." value={form.evaluasi}
                    onChange={e => setForm(f => ({ ...f, evaluasi: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 p-3 text-sm resize-none" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Upload & Submit */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Documentation Upload */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Camera size={14} /> Dokumentasi</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="aspect-square bg-gray-50 dark:bg-[#111] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors group">
                <Camera size={24} className="text-gray-400 group-hover:text-emerald-500 mb-1" />
                <span className="text-[10px] font-semibold text-gray-500">Ambil Foto</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) setPhotos(p => [...p, e.target.files![0]]); }} />
              </label>
              <label className="aspect-square bg-gray-50 dark:bg-[#111] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors group">
                <Camera size={24} className="text-gray-400 group-hover:text-emerald-500 mb-1" />
                <span className="text-[10px] font-semibold text-gray-500">Pilih File</span>
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => { if (e.target.files) setPhotos(p => [...p, ...Array.from(e.target.files!)]); }} />
              </label>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-400 text-center mt-2">JPG, PNG, MP4. Maks 20MB</p>
          </div>

          {/* Summary */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">Ringkasan</h3>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p><span className="font-semibold">Mapel:</span> {form.subjectName || '-'}</p>
              <p><span className="font-semibold">Kelas:</span> {form.className || '-'}</p>
              <p><span className="font-semibold">Tanggal:</span> {form.date}</p>
              <p><span className="font-semibold">Kehadiran:</span> {attendance.filter(a => a.status === 'Hadir').length} Hadir / {attendance.length} Siswa</p>
              <p><span className="font-semibold">Foto:</span> {photos.length} file</p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 mt-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg flex items-center justify-between gap-3">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2.5 text-gray-500 font-semibold text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-[#222] transition-all disabled:opacity-30 active:scale-95">
          <ChevronLeft size={16} /> Kembali
        </button>
        <div className="flex gap-2">
          {step === 2 && (
            <button onClick={() => handleSave(false)} disabled={saving}
              className="px-4 py-2.5 border border-emerald-600 text-emerald-600 font-semibold text-xs rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all active:scale-95 disabled:opacity-50">
              <Save size={14} className="inline mr-1" /> Draft
            </button>
          )}
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg shadow-md hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-1">
              Lanjut <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={() => handleSave(true)} disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg shadow-md hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50">
              Submit <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
