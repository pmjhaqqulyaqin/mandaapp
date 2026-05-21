import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Input } from '@mandaapp/ui/src/components/Input';
import { User, GraduationCap, MapPin, Info, Loader2, Users, BookOpen, Activity } from 'lucide-react';
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

export const AddStudentModal: React.FC<Props> = ({ isOpen, onClose, classes, apiClient, onSuccess, editStudent }) => {
  const [activeTab, setActiveTab] = useState<'pribadi' | 'ortu' | 'pendidikan' | 'jasmani'>('pribadi');
  
  const [studentForm, setStudentForm] = useState(INITIAL_STUDENT);
  const [parentsForm, setParentsForm] = useState(INITIAL_PARENTS);
  const [educationForm, setEducationForm] = useState(INITIAL_EDUCATION);
  const [physicalForm, setPhysicalForm] = useState(INITIAL_PHYSICAL);
  
  const [saving, setSaving] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

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
        })
        .catch((err: any) => console.error("Failed to load complete data", err))
        .finally(() => setLoadingComplete(false));
    } else if (isOpen) {
      setStudentForm(INITIAL_STUDENT);
      setParentsForm([...INITIAL_PARENTS]);
      setEducationForm([...INITIAL_EDUCATION]);
      setPhysicalForm([...INITIAL_PHYSICAL]);
      setActiveTab('pribadi');
    }
  }, [isOpen, editStudent]);

  const isEditing = !!editStudent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Normalize payload
    const payload = {
      student: studentForm,
      parents: parentsForm.filter(p => p.name.trim() !== ''),
      education: educationForm.filter(e => e.previousSchoolName.trim() !== ''),
      physical: physicalForm.filter(p => p.heightCm || p.weightKg || p.hearingCondition)
    };

    try {
      if (isEditing) {
        await apiClient(`/students/${editStudent.id}`, { method: 'PUT', data: payload });
      } else {
        // Create student first
        const newStudent = await apiClient('/students', { method: 'POST', data: payload.student });
        // Then upsert relations via PUT to the new ID if there is any relation data
        if (payload.parents.length > 0 || payload.education.length > 0 || payload.physical.length > 0) {
          await apiClient(`/students/${newStudent.id}`, { method: 'PUT', data: payload });
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Gagal ${isEditing ? 'mengupdate' : 'menambah'} siswa: ` + err.message);
    } finally { setSaving(false); }
  };

  const classOptions = classes.map(c => {
    return { ...c, label: c.name };
  });

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
    { id: 'pribadi', label: 'Data Pribadi', icon: <User size={14} /> },
    { id: 'ortu', label: 'Orang Tua', icon: <Users size={14} /> },
    { id: 'pendidikan', label: 'Pendidikan', icon: <GraduationCap size={14} /> },
    { id: 'jasmani', label: 'Jasmani', icon: <Activity size={14} /> },
  ] as const;

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
      className="max-w-4xl"
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
