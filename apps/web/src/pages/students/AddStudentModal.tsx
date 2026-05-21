import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Input } from '@mandaapp/ui/src/components/Input';
import { User, GraduationCap, MapPin, Info, Loader2, Users, BookOpen, Activity, Plus, Trash2, Award, ClipboardList } from 'lucide-react';
import type { ClassItem } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  apiClient: any;
  onSuccess: () => void;
  editStudent?: any;
}

const INITIAL_STUDENT = {
  fullName: '', nisn: '', nis: '', gender: '', birthPlace: '', birthDate: '', classId: '', className: '', address: '',
  agama: '', kewarganegaraan: '', anakKe: '', jumlahSaudara: '', bahasaSehariHari: '', golonganDarah: '', tempatTinggal: '', jarakSekolahKm: '', nik: '', noKk: ''
};

const INITIAL_PARENTS = [
  { type: 'ayah', name: '', occupation: '', educationLevel: '', phone: '' },
  { type: 'ibu', name: '', occupation: '', educationLevel: '', phone: '' },
  { type: 'wali', name: '', relationship: '', occupation: '', educationLevel: '', phone: '' },
];

const INITIAL_EDUCATION = [
  { previousSchoolName: '', sttbDate: '', sttbNumber: '', transferFromSchool: '', transferFromClass: '', transferAcceptDate: '' }
];

const INITIAL_PHYSICAL = [
  { semester: 1, heightCm: '', weightKg: '', hearingCondition: '', visionCondition: '', dentalCondition: '' }
];

const INITIAL_FINAL_STATUS = {
  statusType: '', graduationYear: '', ijazahNumber: '', continueTo: '', leaveClass: '', destinationSchool: '', destinationClass: '', leaveReason: '', leaveDate: ''
};

const DEFAULT_SUBJECTS = [
  'Pendidikan Agama Islam', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika',
  'Bahasa Inggris', 'Sejarah', 'Seni Budaya', 'Pendidikan Jasmani',
  'Informatika', 'Bahasa Arab'
];

// Semester columns for 3 years: X (sem1,2), XI (sem1,2), XII (sem1,2)
const SEMESTER_COLS = [
  { semester: 1, classLevel: 'X', label: 'X/1' },
  { semester: 2, classLevel: 'X', label: 'X/2' },
  { semester: 3, classLevel: 'XI', label: 'XI/1' },
  { semester: 4, classLevel: 'XI', label: 'XI/2' },
  { semester: 5, classLevel: 'XII', label: 'XII/1' },
  { semester: 6, classLevel: 'XII', label: 'XII/2' },
];

type TabId = 'pribadi' | 'ortu' | 'pendidikan' | 'jasmani' | 'akademik' | 'nonakademik' | 'status_akhir';

export const AddStudentModal: React.FC<Props> = ({ isOpen, onClose, classes, apiClient, onSuccess, editStudent }) => {
  const [activeTab, setActiveTab] = useState<TabId>('pribadi');
  
  const [studentForm, setStudentForm] = useState(INITIAL_STUDENT);
  const [parentsForm, setParentsForm] = useState(INITIAL_PARENTS);
  const [educationForm, setEducationForm] = useState(INITIAL_EDUCATION);
  const [physicalForm, setPhysicalForm] = useState(INITIAL_PHYSICAL);
  const [finalStatusForm, setFinalStatusForm] = useState(INITIAL_FINAL_STATUS);
  
  // Phase 3 state: Matrix data
  const [subjects, setSubjects] = useState<string[]>([...DEFAULT_SUBJECTS]);
  const [gradesMatrix, setGradesMatrix] = useState<Record<string, Record<number, string>>>({});
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [extracurriculars, setExtracurriculars] = useState<any[]>([]);
  const [p5Data, setP5Data] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  // Initialize gradesMatrix from subjects
  useEffect(() => {
    const matrix: Record<string, Record<number, string>> = {};
    subjects.forEach(sub => {
      if (!matrix[sub]) matrix[sub] = {};
      SEMESTER_COLS.forEach(col => {
        matrix[sub][col.semester] = gradesMatrix[sub]?.[col.semester] || '';
      });
    });
    setGradesMatrix(matrix);
  }, [subjects]);

  // Initialize attendance rows for each semester
  useEffect(() => {
    if (attendanceData.length === 0) {
      setAttendanceData(SEMESTER_COLS.map(col => ({
        semester: col.semester,
        classLevel: col.classLevel,
        academicYear: '',
        sick: '',
        excused: '',
        unexcused: '',
        promotionStatus: ''
      })));
    }
  }, []);

  useEffect(() => {
    if (isOpen && editStudent) {
      setLoadingComplete(true);
      setActiveTab('pribadi');
      apiClient(`/students/${editStudent.id}?complete=true`)
        .then((res: any) => {
          setStudentForm({
            ...INITIAL_STUDENT,
            ...res,
            birthDate: res.birthDate ? res.birthDate.split('T')[0] : '',
          });
          
          if (res.parents && res.parents.length > 0) {
            const newParents = [...INITIAL_PARENTS].map(ip => {
              const found = res.parents.find((p:any) => p.type === ip.type);
              return found ? { ...ip, ...found } : ip;
            });
            setParentsForm(newParents);
          } else {
            setParentsForm(INITIAL_PARENTS);
          }
          
          if (res.education && res.education.length > 0) {
            setEducationForm(res.education);
          } else {
            setEducationForm(INITIAL_EDUCATION);
          }
          
          if (res.physical && res.physical.length > 0) {
            setPhysicalForm(res.physical);
          } else {
            setPhysicalForm(INITIAL_PHYSICAL);
          }

          // Grades: rebuild matrix from flat array
          if (res.grades && res.grades.length > 0) {
            const uniqueSubjects = [...new Set(res.grades.map((g: any) => g.subjectName))] as string[];
            const allSubjects = [...new Set([...DEFAULT_SUBJECTS, ...uniqueSubjects])];
            setSubjects(allSubjects);
            const matrix: Record<string, Record<number, string>> = {};
            allSubjects.forEach(sub => { matrix[sub] = {}; });
            res.grades.forEach((g: any) => {
              if (!matrix[g.subjectName]) matrix[g.subjectName] = {};
              matrix[g.subjectName][g.semester] = g.score || '';
            });
            setGradesMatrix(matrix);
          }

          // Attendance
          if (res.attendance && res.attendance.length > 0) {
            const attMap = SEMESTER_COLS.map(col => {
              const found = res.attendance.find((a: any) => a.semester === col.semester);
              return found || { semester: col.semester, classLevel: col.classLevel, academicYear: '', sick: '', excused: '', unexcused: '', promotionStatus: '' };
            });
            setAttendanceData(attMap);
          }

          // Extracurriculars
          if (res.extracurriculars && res.extracurriculars.length > 0) {
            setExtracurriculars(res.extracurriculars);
          } else {
            setExtracurriculars([]);
          }

          // P5
          if (res.p5 && res.p5.length > 0) {
            setP5Data(res.p5);
          } else {
            setP5Data([]);
          }

          // Final Status
          if (res.finalStatus && res.finalStatus.length > 0) {
            const fs = res.finalStatus[0];
            setFinalStatusForm({
              statusType: fs.statusType || '',
              graduationYear: fs.graduationYear || '',
              ijazahNumber: fs.ijazahNumber || '',
              continueTo: fs.continueTo || '',
              leaveClass: fs.leaveClass || '',
              destinationSchool: fs.destinationSchool || '',
              destinationClass: fs.destinationClass || '',
              leaveReason: fs.leaveReason || '',
              leaveDate: fs.leaveDate ? fs.leaveDate.split('T')[0] : ''
            });
          } else {
            setFinalStatusForm(INITIAL_FINAL_STATUS);
          }
        })
        .catch((err: any) => console.error("Failed to load complete data", err))
        .finally(() => setLoadingComplete(false));
    } else if (isOpen) {
      setStudentForm(INITIAL_STUDENT);
      setParentsForm([...INITIAL_PARENTS]);
      setEducationForm([...INITIAL_EDUCATION]);
      setPhysicalForm([...INITIAL_PHYSICAL]);
      setSubjects([...DEFAULT_SUBJECTS]);
      setGradesMatrix({});
      setAttendanceData(SEMESTER_COLS.map(col => ({
        semester: col.semester, classLevel: col.classLevel, academicYear: '', sick: '', excused: '', unexcused: '', promotionStatus: ''
      })));
      setExtracurriculars([]);
      setP5Data([]);
      setFinalStatusForm(INITIAL_FINAL_STATUS);
      setActiveTab('pribadi');
    }
  }, [isOpen, editStudent]);

  const isEditing = !!editStudent;

  // Flatten grades matrix to array for backend
  const flattenGrades = () => {
    const result: any[] = [];
    Object.entries(gradesMatrix).forEach(([subjectName, semesters]) => {
      Object.entries(semesters).forEach(([sem, score]) => {
        if (score && String(score).trim() !== '') {
          const col = SEMESTER_COLS.find(c => c.semester === Number(sem));
          result.push({
            subjectName,
            semester: Number(sem),
            classLevel: col?.classLevel || '',
            score: String(score)
          });
        }
      });
    });
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      student: studentForm,
      parents: parentsForm.filter(p => p.name.trim() !== ''),
      education: educationForm.filter(e => e.previousSchoolName.trim() !== ''),
      physical: physicalForm.filter(p => p.heightCm || p.weightKg || p.hearingCondition),
      grades: flattenGrades(),
      attendance: attendanceData.filter(a => a.sick || a.excused || a.unexcused || a.promotionStatus),
      extracurriculars: extracurriculars.filter(e => e.activityName?.trim()),
      p5: p5Data.filter(p => p.projectName?.trim()),
      finalStatus: finalStatusForm.statusType ? [finalStatusForm] : []
    };

    try {
      if (isEditing) {
        await apiClient(`/students/${editStudent.id}`, { method: 'PUT', data: payload });
      } else {
        const newStudent = await apiClient('/students', { method: 'POST', data: payload.student });
        if (payload.parents.length > 0 || payload.education.length > 0 || payload.physical.length > 0 || payload.grades.length > 0) {
          await apiClient(`/students/${newStudent.id}`, { method: 'PUT', data: payload });
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Gagal ${isEditing ? 'mengupdate' : 'menambah'} siswa: ` + err.message);
    } finally { setSaving(false); }
  };

  const classOptions = classes.map(c => ({ ...c, label: c.name }));

  const SectionHeader = ({ icon, title, subtitle, color }: { icon: React.ReactNode; title: string; subtitle: string; color: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">{title}</h4>
        <p className="text-[11px] text-text-secondary">{subtitle}</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'pribadi' as TabId, label: 'Data Pribadi', icon: <User size={14} /> },
    { id: 'ortu' as TabId, label: 'Orang Tua', icon: <Users size={14} /> },
    { id: 'pendidikan' as TabId, label: 'Pendidikan', icon: <GraduationCap size={14} /> },
    { id: 'jasmani' as TabId, label: 'Jasmani', icon: <Activity size={14} /> },
    { id: 'akademik' as TabId, label: 'Nilai Rapor', icon: <ClipboardList size={14} /> },
    { id: 'nonakademik' as TabId, label: 'Non-Akademik', icon: <Award size={14} /> },
    { id: 'status_akhir' as TabId, label: 'Status Akhir', icon: <MapPin size={14} /> },
  ];

  const cellInputClass = "w-full h-8 text-center text-xs border-0 bg-transparent outline-none focus:bg-primary/5 dark:focus:bg-primary/10 rounded";
  const thClass = "px-2 py-1.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wide border border-gray-100 dark:border-[#333] bg-gray-50 dark:bg-[#111]";
  const tdClass = "px-1 py-0.5 border border-gray-100 dark:border-[#333]";

  if (loadingComplete) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Memuat Data..." description="Mengambil detail siswa." className="max-w-sm">
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={isEditing ? "Buku Induk: Edit Data Siswa" : "Buku Induk: Tambah Siswa Baru"}
      description={isEditing ? "Perbarui informasi lengkap data siswa." : "Pendaftaran data lengkap siswa. Pastikan semua data valid sesuai dokumen resmi."}
      className="max-w-5xl"
      isScrolled={true}
    >
      <div className="mb-6 flex space-x-1 overflow-x-auto border-b border-gray-100 dark:border-[#333] pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-[#1a1a1a]'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* TAB 1: Data Pribadi */}
        <div className={activeTab === 'pribadi' ? 'block space-y-6' : 'hidden'}>
          <div>
            <SectionHeader icon={<User size={16} className="text-primary" />} title="Identitas Pokok" subtitle="Informasi identitas dasar calon/aktif siswa." color="bg-primary/10" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Nama Lengkap Siswa *</label>
                <Input required placeholder="Sesuai akta kelahiran" value={studentForm.fullName} onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">NISN</label>
                <Input placeholder="10 digit NISN" maxLength={10} value={studentForm.nisn} onChange={e => setStudentForm({ ...studentForm, nisn: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">NIS</label>
                <Input placeholder="Input NIS/ Dihasilkan" value={studentForm.nis} onChange={e => setStudentForm({ ...studentForm, nis: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">NIK</label>
                <Input placeholder="16 digit NIK" maxLength={16} value={studentForm.nik} onChange={e => setStudentForm({ ...studentForm, nik: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">No. KK</label>
                <Input placeholder="16 digit No KK" maxLength={16} value={studentForm.noKk} onChange={e => setStudentForm({ ...studentForm, noKk: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Tempat Lahir</label>
                <Input placeholder="Kota/Kabupaten" value={studentForm.birthPlace} onChange={e => setStudentForm({ ...studentForm, birthPlace: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Tanggal Lahir</label>
                <Input type="date" value={studentForm.birthDate} onChange={e => setStudentForm({ ...studentForm, birthDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Jenis Kelamin</label>
                <div className="flex gap-4 h-10 items-center">
                  {['Laki-laki', 'Perempuan'].map(g => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="gender" value={g} checked={studentForm.gender === g} onChange={() => setStudentForm({ ...studentForm, gender: g })} className="accent-primary w-4 h-4" />
                      <span className="text-sm text-text-primary dark:text-text-darkPrimary">{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Agama</label>
                <Input placeholder="Contoh: Islam" value={studentForm.agama} onChange={e => setStudentForm({ ...studentForm, agama: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <SectionHeader icon={<MapPin size={16} className="text-violet-600" />} title="Data Tambahan Pribadi & Alamat" subtitle="Informasi domisili dan keluarga inti." color="bg-violet-500/10" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Anak Ke-</label>
                <Input type="number" placeholder="Contoh: 1" value={studentForm.anakKe} onChange={e => setStudentForm({ ...studentForm, anakKe: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Jumlah Saudara</label>
                <Input type="number" placeholder="Contoh: 2" value={studentForm.jumlahSaudara} onChange={e => setStudentForm({ ...studentForm, jumlahSaudara: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Tempat Tinggal</label>
                <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={studentForm.tempatTinggal} onChange={e => setStudentForm({ ...studentForm, tempatTinggal: e.target.value })}>
                  <option value="">Pilih...</option>
                  <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                  <option value="Asrama/Pesantren">Asrama/Pesantren</option>
                  <option value="Kost">Kost</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Jarak ke Sekolah (km)</label>
                <Input placeholder="Contoh: 5" value={studentForm.jarakSekolahKm} onChange={e => setStudentForm({ ...studentForm, jarakSekolahKm: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Alamat Lengkap</label>
                <textarea className="w-full rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] resize-none"
                  placeholder="Nama jalan, nomor rumah, RT/RW..." value={studentForm.address} onChange={e => setStudentForm({ ...studentForm, address: e.target.value })} />
              </div>
            </div>
          </div>
          
          <div>
            <SectionHeader icon={<BookOpen size={16} className="text-emerald-600" />} title="Penempatan Kelas" subtitle="Informasi kelas saat ini." color="bg-emerald-500/10" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Kelas & Jurusan *</label>
                <select required className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={studentForm.classId} onChange={e => {
                    const id = e.target.value;
                    const selectedClass = classOptions.find(c => c.id === id);
                    setStudentForm({ ...studentForm, classId: id, className: selectedClass ? selectedClass.name : '' });
                  }}>
                  <option value="">Pilih Kelas & Jurusan...</option>
                  {classOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: Orang Tua & Wali */}
        <div className={activeTab === 'ortu' ? 'block space-y-8' : 'hidden'}>
          {parentsForm.map((parent, idx) => (
            <div key={idx}>
              <SectionHeader icon={<Users size={16} className="text-amber-600" />} title={`Data ${parent.type === 'ayah' ? 'Ayah' : parent.type === 'ibu' ? 'Ibu' : 'Wali'}`} subtitle={`Informasi detail ${parent.type}`} color="bg-amber-500/10" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Nama Lengkap</label>
                  <Input placeholder="Nama lengkap" value={parent.name} onChange={e => {
                    const newP = [...parentsForm]; newP[idx].name = e.target.value; setParentsForm(newP);
                  }} />
                </div>
                {parent.type === 'wali' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">Hubungan dengan Siswa</label>
                    <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      value={parent.relationship || ''} onChange={e => {
                        const newP = [...parentsForm]; newP[idx].relationship = e.target.value; setParentsForm(newP);
                      }}>
                      <option value="">Pilih...</option>
                      <option value="Kakek/Nenek">Kakek/Nenek</option>
                      <option value="Paman/Bibi">Paman/Bibi</option>
                      <option value="Kakak">Kakak</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Pendidikan Terakhir</label>
                  <Input placeholder="SD/SMP/SMA/S1..." value={parent.educationLevel} onChange={e => {
                    const newP = [...parentsForm]; newP[idx].educationLevel = e.target.value; setParentsForm(newP);
                  }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Pekerjaan</label>
                  <Input placeholder="Pekerjaan" value={parent.occupation} onChange={e => {
                    const newP = [...parentsForm]; newP[idx].occupation = e.target.value; setParentsForm(newP);
                  }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">No. Telepon / WA</label>
                  <Input placeholder="0812xxxxxx" value={parent.phone} onChange={e => {
                    const newP = [...parentsForm]; newP[idx].phone = e.target.value; setParentsForm(newP);
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TAB 3: Pendidikan */}
        <div className={activeTab === 'pendidikan' ? 'block space-y-6' : 'hidden'}>
          <SectionHeader icon={<GraduationCap size={16} className="text-blue-600" />} title="Riwayat Pendidikan" subtitle="Informasi sekolah sebelumnya." color="bg-blue-500/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Nama Sekolah Asal</label>
              <Input placeholder="Contoh: SMP Negeri 1 Jakarta" value={educationForm[0].previousSchoolName} onChange={e => {
                const newE = [...educationForm]; newE[0].previousSchoolName = e.target.value; setEducationForm(newE);
              }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Tanggal Lulus / STTB</label>
              <Input type="date" value={educationForm[0].sttbDate ? educationForm[0].sttbDate.split('T')[0] : ''} onChange={e => {
                const newE = [...educationForm]; newE[0].sttbDate = e.target.value; setEducationForm(newE);
              }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Nomor Ijazah / STTB</label>
              <Input placeholder="Nomor seri ijazah" value={educationForm[0].sttbNumber} onChange={e => {
                const newE = [...educationForm]; newE[0].sttbNumber = e.target.value; setEducationForm(newE);
              }} />
            </div>
          </div>
        </div>

        {/* TAB 4: Jasmani */}
        <div className={activeTab === 'jasmani' ? 'block space-y-6' : 'hidden'}>
          <SectionHeader icon={<Activity size={16} className="text-rose-600" />} title="Keterangan Jasmani" subtitle="Catatan kesehatan dan perkembangan fisik siswa." color="bg-rose-500/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Tinggi Badan (cm)</label>
              <Input type="number" placeholder="Contoh: 160" value={physicalForm[0].heightCm} onChange={e => {
                const newP = [...physicalForm]; newP[0].heightCm = e.target.value; setPhysicalForm(newP);
              }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Berat Badan (kg)</label>
              <Input type="number" placeholder="Contoh: 55" value={physicalForm[0].weightKg} onChange={e => {
                const newP = [...physicalForm]; newP[0].weightKg = e.target.value; setPhysicalForm(newP);
              }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Kondisi Penglihatan (Mata)</label>
              <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={physicalForm[0].visionCondition} onChange={e => {
                    const newP = [...physicalForm]; newP[0].visionCondition = e.target.value; setPhysicalForm(newP);
                  }}>
                  <option value="">Pilih...</option>
                  <option value="Normal">Normal</option>
                  <option value="Minus/Kacamata">Minus/Kacamata</option>
                  <option value="Perlu Perhatian Khusus">Perlu Perhatian Khusus</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Kondisi Pendengaran</label>
              <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={physicalForm[0].hearingCondition} onChange={e => {
                    const newP = [...physicalForm]; newP[0].hearingCondition = e.target.value; setPhysicalForm(newP);
                  }}>
                  <option value="">Pilih...</option>
                  <option value="Normal">Normal</option>
                  <option value="Perlu Perhatian Khusus">Perlu Perhatian Khusus</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Kondisi Gigi</label>
              <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={physicalForm[0].dentalCondition} onChange={e => {
                    const newP = [...physicalForm]; newP[0].dentalCondition = e.target.value; setPhysicalForm(newP);
                  }}>
                  <option value="">Pilih...</option>
                  <option value="Normal">Normal</option>
                  <option value="Perlu Perawatan">Perlu Perawatan</option>
              </select>
            </div>
          </div>
        </div>

        {/* TAB 5: AKADEMIK - Nilai Rapor Matrix */}
        <div className={activeTab === 'akademik' ? 'block space-y-6' : 'hidden'}>
          <SectionHeader icon={<ClipboardList size={16} className="text-indigo-600" />} title="Penilaian Hasil Belajar" subtitle="Isi nilai rapor per semester dalam format tabel matriks." color="bg-indigo-500/10" />
          
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#333]">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th rowSpan={2} className={`${thClass} text-left min-w-[180px] sticky left-0 z-10 bg-gray-50 dark:bg-[#111]`}>Bidang Studi</th>
                  <th colSpan={2} className={thClass}>Kelas X</th>
                  <th colSpan={2} className={thClass}>Kelas XI</th>
                  <th colSpan={2} className={thClass}>Kelas XII</th>
                </tr>
                <tr>
                  {SEMESTER_COLS.map(col => (
                    <th key={col.semester} className={`${thClass} w-16`}>Sem {col.semester % 2 === 1 ? 'I' : 'II'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#111]/50">
                    <td className={`${tdClass} text-xs font-medium text-text-primary dark:text-text-darkPrimary sticky left-0 bg-white dark:bg-[#0d0d0d] z-10`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{sub}</span>
                        {!DEFAULT_SUBJECTS.includes(sub) && (
                          <button type="button" onClick={() => {
                            setSubjects(subjects.filter((_, i) => i !== idx));
                            const newMatrix = { ...gradesMatrix };
                            delete newMatrix[sub];
                            setGradesMatrix(newMatrix);
                          }} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={12} /></button>
                        )}
                      </div>
                    </td>
                    {SEMESTER_COLS.map(col => (
                      <td key={col.semester} className={tdClass}>
                        <input
                          type="text"
                          className={cellInputClass}
                          value={gradesMatrix[sub]?.[col.semester] || ''}
                          onChange={e => {
                            const newMatrix = { ...gradesMatrix };
                            if (!newMatrix[sub]) newMatrix[sub] = {};
                            newMatrix[sub][col.semester] = e.target.value;
                            setGradesMatrix(newMatrix);
                          }}
                          placeholder="-"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Add Subject */}
          <div className="flex items-center gap-2">
            <Input placeholder="Nama mata pelajaran baru..." value={newSubject} onChange={e => setNewSubject(e.target.value)} className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={() => {
              if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
                setSubjects([...subjects, newSubject.trim()]);
                setNewSubject('');
              }
            }} className="flex items-center gap-1 whitespace-nowrap">
              <Plus size={14} /> Tambah Mapel
            </Button>
          </div>
        </div>

        {/* TAB 6: NON-AKADEMIK - Absensi, Ekskul, P5 */}
        <div className={activeTab === 'nonakademik' ? 'block space-y-8' : 'hidden'}>
          
          {/* Ketidakhadiran */}
          <div>
            <SectionHeader icon={<ClipboardList size={16} className="text-orange-600" />} title="Ketidakhadiran per Semester" subtitle="Jumlah hari sakit, izin, dan tanpa keterangan." color="bg-orange-500/10" />
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#333]">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={`${thClass} text-left min-w-[100px]`}>Keterangan</th>
                    {SEMESTER_COLS.map(col => (
                      <th key={col.semester} className={`${thClass} w-16`}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Sakit', 'Izin', 'Tanpa Ket.'].map((label, rowIdx) => {
                    const key = rowIdx === 0 ? 'sick' : rowIdx === 1 ? 'excused' : 'unexcused';
                    return (
                      <tr key={label}>
                        <td className={`${tdClass} text-xs font-medium`}>{label}</td>
                        {attendanceData.map((att, colIdx) => (
                          <td key={colIdx} className={tdClass}>
                            <input type="number" className={cellInputClass} value={att[key] || ''} onChange={e => {
                              const newAtt = [...attendanceData];
                              newAtt[colIdx] = { ...newAtt[colIdx], [key]: e.target.value };
                              setAttendanceData(newAtt);
                            }} placeholder="-" />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr>
                    <td className={`${tdClass} text-xs font-medium`}>Naik/Tidak</td>
                    {attendanceData.map((att, colIdx) => (
                      <td key={colIdx} className={tdClass}>
                        <select className="w-full h-8 text-[10px] border-0 bg-transparent outline-none focus:bg-primary/5 rounded" value={att.promotionStatus || ''} onChange={e => {
                          const newAtt = [...attendanceData];
                          newAtt[colIdx] = { ...newAtt[colIdx], promotionStatus: e.target.value };
                          setAttendanceData(newAtt);
                        }}>
                          <option value="">-</option>
                          <option value="Naik">Naik</option>
                          <option value="Tidak Naik">Tidak</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ekstrakurikuler */}
          <div>
            <SectionHeader icon={<Award size={16} className="text-teal-600" />} title="Kegiatan Ekstrakurikuler" subtitle="Daftar kegiatan dan predikat per semester." color="bg-teal-500/10" />
            {extracurriculars.map((extra, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-3 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Nama Kegiatan</label>}
                  <Input placeholder="Pramuka, Futsal..." value={extra.activityName || ''} onChange={e => {
                    const newE = [...extracurriculars]; newE[idx].activityName = e.target.value; setExtracurriculars(newE);
                  }} />
                </div>
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Semester</label>}
                  <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-2 text-xs outline-none" value={extra.semester || ''} onChange={e => {
                    const newE = [...extracurriculars]; newE[idx].semester = Number(e.target.value); const col = SEMESTER_COLS.find(c => c.semester === Number(e.target.value)); newE[idx].classLevel = col?.classLevel || ''; setExtracurriculars(newE);
                  }}>
                    <option value="">-</option>
                    {SEMESTER_COLS.map(c => <option key={c.semester} value={c.semester}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Predikat</label>}
                  <Input placeholder="A/B/C" value={extra.predicate || ''} onChange={e => {
                    const newE = [...extracurriculars]; newE[idx].predicate = e.target.value; setExtracurriculars(newE);
                  }} />
                </div>
                <div className="col-span-4 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Keterangan</label>}
                  <Input placeholder="Keterangan singkat" value={extra.description || ''} onChange={e => {
                    const newE = [...extracurriculars]; newE[idx].description = e.target.value; setExtracurriculars(newE);
                  }} />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => setExtracurriculars(extracurriculars.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 h-10 flex items-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setExtracurriculars([...extracurriculars, { activityName: '', semester: '', classLevel: '', predicate: '', description: '' }])} className="flex items-center gap-1 mt-2">
              <Plus size={14} /> Tambah Ekskul
            </Button>
          </div>

          {/* P5 / Kokurikuler (Akhir Fase) */}
          <div>
            <SectionHeader icon={<Award size={16} className="text-purple-600" />} title="Projek P5 / Kokurikuler" subtitle="Capaian akhir fase (bukan per semester)." color="bg-purple-500/10" />
            {p5Data.map((p5, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Fase</label>}
                  <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-2 text-xs outline-none" value={p5.fase || ''} onChange={e => {
                    const newP = [...p5Data]; newP[idx].fase = e.target.value; setP5Data(newP);
                  }}>
                    <option value="">-</option>
                    <option value="E">Fase E</option>
                    <option value="F">Fase F</option>
                  </select>
                </div>
                <div className="col-span-3 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Nama Projek</label>}
                  <Input placeholder="Nama projek P5" value={p5.projectName || ''} onChange={e => {
                    const newP = [...p5Data]; newP[idx].projectName = e.target.value; setP5Data(newP);
                  }} />
                </div>
                <div className="col-span-3 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Dimensi Pancasila</label>}
                  <Input placeholder="Gotong Royong, dll" value={p5.dimension || ''} onChange={e => {
                    const newP = [...p5Data]; newP[idx].dimension = e.target.value; setP5Data(newP);
                  }} />
                </div>
                <div className="col-span-2 space-y-1">
                  {idx === 0 && <label className="text-[10px] font-medium text-text-secondary">Predikat</label>}
                  <Input placeholder="SB/B/C" value={p5.predicate || ''} onChange={e => {
                    const newP = [...p5Data]; newP[idx].predicate = e.target.value; setP5Data(newP);
                  }} />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => setP5Data(p5Data.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 h-10 flex items-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setP5Data([...p5Data, { fase: '', projectName: '', dimension: '', predicate: '', description: '' }])} className="flex items-center gap-1 mt-2">
              <Plus size={14} /> Tambah Projek P5
            </Button>
          </div>
        </div>

        {/* Tab 7: Status Akhir */}
        {activeTab === 'status_akhir' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <SectionHeader icon={<MapPin size={16} className="text-amber-600" />} title="Status Akhir Siswa" subtitle="Pencatatan kelulusan, mutasi, atau putus sekolah." color="bg-amber-500/10" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Status Akhir</label>
                <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:border-amber-500/50"
                  value={finalStatusForm.statusType} onChange={e => setFinalStatusForm({ ...finalStatusForm, statusType: e.target.value })}>
                  <option value="">(Belum Ada Status Akhir)</option>
                  <option value="Lulus">Tamat / Lulus (Alumni)</option>
                  <option value="Pindah">Pindah Sekolah (Mutasi)</option>
                  <option value="Keluar">Keluar / Putus Sekolah (DO)</option>
                </select>
              </div>
              {finalStatusForm.statusType && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Tanggal Penetapan</label>
                  <Input type="date" value={finalStatusForm.leaveDate} onChange={e => setFinalStatusForm({ ...finalStatusForm, leaveDate: e.target.value })} />
                </div>
              )}
              
              {finalStatusForm.statusType === 'Lulus' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Tahun Lulus</label>
                    <Input placeholder="Contoh: 2026" value={finalStatusForm.graduationYear} onChange={e => setFinalStatusForm({ ...finalStatusForm, graduationYear: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-secondary">Nomor Ijazah</label>
                    <Input placeholder="Nomor seri ijazah" value={finalStatusForm.ijazahNumber} onChange={e => setFinalStatusForm({ ...finalStatusForm, ijazahNumber: e.target.value })} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-text-secondary">Melanjutkan Ke / Bekerja Di</label>
                    <Input placeholder="Nama instansi/perusahaan tujuan" value={finalStatusForm.continueTo} onChange={e => setFinalStatusForm({ ...finalStatusForm, continueTo: e.target.value })} />
                  </div>
                </>
              )}

              {(finalStatusForm.statusType === 'Pindah' || finalStatusForm.statusType === 'Keluar') && (
                <>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-text-secondary">Alasan {finalStatusForm.statusType}</label>
                    <Input placeholder="Alasan mutasi / keluar" value={finalStatusForm.leaveReason} onChange={e => setFinalStatusForm({ ...finalStatusForm, leaveReason: e.target.value })} />
                  </div>
                  {finalStatusForm.statusType === 'Pindah' && (
                    <>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-text-secondary">Pindah Ke Sekolah</label>
                        <Input placeholder="Nama sekolah tujuan" value={finalStatusForm.destinationSchool} onChange={e => setFinalStatusForm({ ...finalStatusForm, destinationSchool: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-secondary">Ditinggalkan di Kelas</label>
                        <Input placeholder="Kelas saat ditinggalkan" value={finalStatusForm.leaveClass} onChange={e => setFinalStatusForm({ ...finalStatusForm, leaveClass: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-secondary">Diterima di Kelas</label>
                        <Input placeholder="Kelas di sekolah baru" value={finalStatusForm.destinationClass} onChange={e => setFinalStatusForm({ ...finalStatusForm, destinationClass: e.target.value })} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            {finalStatusForm.statusType && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-4">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Perhatian:</strong> Menyimpan status akhir ({finalStatusForm.statusType}) akan mengubah status utama siswa menjadi "{finalStatusForm.statusType}". Siswa ini tidak akan muncul lagi di tabel "Data Siswa Aktif".
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#222]">
          <p className="text-[11px] text-text-secondary flex items-center gap-1">
            <Info size={12} /> Data akan disimpan secara bersamaan (Semua Tab).
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEditing ? 'Simpan Perubahan' : 'Simpan Data Lengkap'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
