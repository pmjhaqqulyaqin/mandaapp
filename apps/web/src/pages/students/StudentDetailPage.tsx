import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Button } from '@mandaapp/ui/src/components/Button';
import {
  ArrowLeft, Printer, Edit2, User, Users, BookOpen, ClipboardList,
  Award, Flag, Loader2, Phone, Briefcase, MapPin, Calendar,
  Heart, GraduationCap, Activity, Star, CheckCircle2, XCircle, AlertCircle, Save, X, Plus, Trash2
} from 'lucide-react';

// --- UTILS ---
const avatarColor = (name: string) => {
  const colors = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-violet-500','bg-cyan-500','bg-orange-500','bg-teal-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};
const formatDate = (d: any) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return d; }
};

type TabKey = 'identitas' | 'orang-tua' | 'nilai' | 'kehadiran' | 'ekskul-p5' | 'status';
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'identitas', label: 'Identitas', icon: User },
  { key: 'orang-tua', label: 'Orang Tua', icon: Users },
  { key: 'nilai', label: 'Nilai Rapor', icon: BookOpen },
  { key: 'kehadiran', label: 'Kehadiran', icon: ClipboardList },
  { key: 'ekskul-p5', label: 'Ekskul & P5', icon: Award },
  { key: 'status', label: 'Status Akhir', icon: Flag },
];

const semCols = [
  { sem: 1, cl: 'X', label: 'Sem 1' },
  { sem: 2, cl: 'X', label: 'Sem 2' },
  { sem: 3, cl: 'XI', label: 'Sem 3' },
  { sem: 4, cl: 'XI', label: 'Sem 4' },
  { sem: 5, cl: 'XII', label: 'Sem 5' },
  { sem: 6, cl: 'XII', label: 'Sem 6' },
];

const DEFAULT_SUBJECTS = [
  'Pendidikan Agama Islam', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika',
  'Bahasa Inggris', 'Sejarah', 'Seni Budaya', 'Pendidikan Jasmani',
  'Informatika', 'Bahasa Arab'
];

// --- COMPONENTS ---
const Section = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) => (
  <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
    {title && (
      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] flex items-center gap-2">
        {Icon && <Icon size={15} className="text-primary" />}
        <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">{title}</h3>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const InfoRow = ({ label, value, isEditing, editInput }: { label: string; value: any; isEditing?: boolean; editInput?: React.ReactNode }) => (
  <div className={`flex ${isEditing ? 'flex-col gap-1 py-2' : 'py-1.5'} border-b border-gray-50 dark:border-[#1a1a1a] last:border-0`}>
    <span className={`${isEditing ? 'text-xs mb-1' : 'w-40 shrink-0 text-xs'} text-text-secondary font-medium`}>{label}</span>
    {isEditing ? editInput : <span className="text-xs text-text-primary dark:text-text-darkPrimary font-semibold">{value || '-'}</span>}
  </div>
);

// ── TAB: Identitas ──
const TabIdentitas = ({ s, isEditing, formData, onChange, classesList }: { s: any, isEditing: boolean, formData: any, onChange: (field: string, val: any) => void, classesList: any[] }) => (
  <div className="grid gap-4">
    <Section title="Data Pribadi" icon={User}>
      <div className="grid md:grid-cols-2 gap-x-8">
        <div>
          <InfoRow label="Nama Lengkap" value={s.fullName} isEditing={isEditing} 
            editInput={<Input value={formData.fullName} onChange={e => onChange('fullName', e.target.value)} />} />
          <InfoRow label="Jenis Kelamin" value={s.gender} isEditing={isEditing} 
            editInput={
              <select className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm" value={formData.gender} onChange={e => onChange('gender', e.target.value)}>
                <option value="">Pilih</option><option value="L">Laki-laki (L)</option><option value="P">Perempuan (P)</option>
              </select>
            } />
          <InfoRow label="Tempat Lahir" value={s.birthPlace} isEditing={isEditing} 
            editInput={<Input value={formData.birthPlace} onChange={e => onChange('birthPlace', e.target.value)} />} />
          <InfoRow label="Tanggal Lahir" value={formatDate(s.birthDate)} isEditing={isEditing} 
            editInput={<Input type="date" value={formData.birthDate ? formData.birthDate.split('T')[0] : ''} onChange={e => onChange('birthDate', e.target.value)} />} />
          <InfoRow label="NIK" value={s.nik} isEditing={isEditing} 
            editInput={<Input value={formData.nik} onChange={e => onChange('nik', e.target.value)} />} />
          <InfoRow label="No. KK" value={s.noKk} isEditing={isEditing} 
            editInput={<Input value={formData.noKk} onChange={e => onChange('noKk', e.target.value)} />} />
          <InfoRow label="Kelas Saat Ini" value={s.className} isEditing={isEditing} 
            editInput={
              <select className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm" value={formData.classId} onChange={e => onChange('classId', e.target.value)}>
                <option value="">Pilih Kelas</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            } />
        </div>
        <div>
          <InfoRow label="Agama" value={s.agama} isEditing={isEditing} 
            editInput={<Input value={formData.agama} onChange={e => onChange('agama', e.target.value)} />} />
          <InfoRow label="Kewarganegaraan" value={s.kewarganegaraan} isEditing={isEditing} 
            editInput={<Input value={formData.kewarganegaraan} onChange={e => onChange('kewarganegaraan', e.target.value)} />} />
          <InfoRow label="Jumlah Saudara" value={s.jumlahSaudara} isEditing={isEditing} 
            editInput={<Input type="number" value={formData.jumlahSaudara} onChange={e => onChange('jumlahSaudara', e.target.value)} />} />
          <InfoRow label="Bahasa Sehari-hari" value={s.bahasaSehariHari} isEditing={isEditing} 
            editInput={<Input value={formData.bahasaSehariHari} onChange={e => onChange('bahasaSehariHari', e.target.value)} />} />
          <InfoRow label="Golongan Darah" value={s.golonganDarah} isEditing={isEditing} 
            editInput={<Input value={formData.golonganDarah} onChange={e => onChange('golonganDarah', e.target.value)} />} />
          <InfoRow label="Jarak ke Sekolah (km)" value={s.jarakSekolahKm} isEditing={isEditing} 
            editInput={<Input type="number" step="0.1" value={formData.jarakSekolahKm} onChange={e => onChange('jarakSekolahKm', e.target.value)} />} />
        </div>
      </div>
    </Section>
    <Section title="Alamat & Tempat Tinggal" icon={MapPin}>
      <InfoRow label="Alamat Lengkap" value={s.address} isEditing={isEditing} 
        editInput={<Input value={formData.address} onChange={e => onChange('address', e.target.value)} />} />
      <InfoRow label="Tempat Tinggal" value={s.tempatTinggal} isEditing={isEditing} 
        editInput={
          <select className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm" value={formData.tempatTinggal} onChange={e => onChange('tempatTinggal', e.target.value)}>
            <option value="">Pilih</option><option value="Bersama Orang Tua">Bersama Orang Tua</option><option value="Asrama">Asrama</option><option value="Kos">Kos</option><option value="Wali">Wali</option>
          </select>
        } />
    </Section>
  </div>
);

// ── TAB: Orang Tua ──
const TabOrangTua = ({ parents, isEditing, formParents, setFormParents }: { parents: any[], isEditing: boolean, formParents: any[], setFormParents: any }) => {
  const updateParent = (index: number, field: string, val: any) => {
    const newP = [...formParents];
    newP[index] = { ...newP[index], [field]: val };
    setFormParents(newP);
  };

  const renderCard = (type: string, title: string, color: string, index: number) => {
    const p = isEditing ? formParents[index] : (parents || []).find(x => x.type === type);
    if (!isEditing && (!p || !p.name)) {
      return (
        <div className="bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-dashed border-gray-200 dark:border-[#333] p-4 flex items-center justify-center">
          <p className="text-xs text-text-secondary italic">Data {title} belum diisi</p>
        </div>
      );
    }
    return (
      <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
        <div className={`px-4 py-2.5 ${color} flex items-center gap-2`}>
          <Users size={14} className="text-white" />
          <span className="text-xs font-bold text-white">{title}</span>
        </div>
        <div className="p-4 space-y-0">
          <InfoRow label="Nama Lengkap" value={p?.name} isEditing={isEditing} 
            editInput={<Input value={p?.name || ''} onChange={e => updateParent(index, 'name', e.target.value)} placeholder={`Nama ${title}`} />} />
          {type === 'wali' && isEditing && (
             <InfoRow label="Hubungan Keluarga" value={p?.relationship} isEditing={isEditing} 
              editInput={<Input value={p?.relationship || ''} onChange={e => updateParent(index, 'relationship', e.target.value)} />} />
          )}
          <InfoRow label="Tempat Lahir" value={p?.birthPlace} isEditing={isEditing} 
            editInput={<Input value={p?.birthPlace || ''} onChange={e => updateParent(index, 'birthPlace', e.target.value)} />} />
          <InfoRow label="Tanggal Lahir" value={formatDate(p?.birthDate)} isEditing={isEditing} 
            editInput={<Input type="date" value={p?.birthDate ? p.birthDate.split('T')[0] : ''} onChange={e => updateParent(index, 'birthDate', e.target.value)} />} />
          <InfoRow label="Pendidikan" value={p?.pendidikan} isEditing={isEditing} 
            editInput={<Input value={p?.pendidikan || ''} onChange={e => updateParent(index, 'pendidikan', e.target.value)} />} />
          <InfoRow label="Pekerjaan" value={p?.pekerjaan} isEditing={isEditing} 
            editInput={<Input value={p?.pekerjaan || ''} onChange={e => updateParent(index, 'pekerjaan', e.target.value)} />} />
          <InfoRow label="No. HP" value={p?.phone} isEditing={isEditing} 
            editInput={<Input value={p?.phone || ''} onChange={e => updateParent(index, 'phone', e.target.value)} />} />
          <InfoRow label="Alamat" value={p?.address} isEditing={isEditing} 
            editInput={<Input value={p?.address || ''} onChange={e => updateParent(index, 'address', e.target.value)} />} />
        </div>
      </div>
    );
  };

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {renderCard('ayah', 'Ayah', 'bg-blue-500', 0)}
      {renderCard('ibu', 'Ibu', 'bg-pink-500', 1)}
      {renderCard('wali', 'Wali', 'bg-amber-500', 2)}
    </div>
  );
};

// ── TAB: Nilai Rapor ──
const TabNilai = ({ grades, isEditing, matrix, setMatrix, subjects, setSubjects }: { grades: any[], isEditing: boolean, matrix: any, setMatrix: any, subjects: string[], setSubjects: any }) => {
  if (!isEditing && (!grades || grades.length === 0)) return (
    <Section title="Nilai Rapor" icon={BookOpen}>
      <p className="text-xs text-text-secondary italic text-center py-8">Belum ada data nilai yang dimasukkan.</p>
    </Section>
  );

  const displaySubjects = isEditing ? subjects : Object.keys(matrix).sort();
  const [newSubj, setNewSubj] = useState('');

  return (
    <Section title="Rekapitulasi Nilai Rapor" icon={BookOpen}>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-[#333]">
              <th className="text-left py-2 px-2 font-semibold text-text-secondary">Mata Pelajaran</th>
              {semCols.map(c => (
                <th key={c.sem} className="text-center py-2 px-2 font-semibold text-text-secondary w-16">
                  <div className="text-[9px] text-primary font-bold">{c.cl}</div>
                  <div>{c.label}</div>
                </th>
              ))}
              {isEditing && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {displaySubjects.map((subj, i) => (
              <tr key={subj} className={`border-b border-gray-50 dark:border-[#1a1a1a] ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-[#0a0a0a]'}`}>
                <td className="py-2 px-2 font-medium text-text-primary dark:text-text-darkPrimary">{subj}</td>
                {semCols.map(c => {
                  const val = matrix[subj]?.[c.sem];
                  return (
                    <td key={c.sem} className="text-center py-1 px-1">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-14 h-8 text-center border border-gray-300 dark:border-gray-700 rounded text-xs"
                          value={val || ''}
                          onChange={(e) => {
                            const newM = { ...matrix };
                            if (!newM[subj]) newM[subj] = {};
                            newM[subj][c.sem] = e.target.value;
                            setMatrix(newM);
                          }}
                        />
                      ) : (
                        val ? (
                          <span className={`inline-block w-8 h-6 leading-6 rounded text-xs font-bold ${
                            Number(val) >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            Number(val) >= 70 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            Number(val) >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>{val}</span>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  );
                })}
                {isEditing && (
                  <td className="text-center">
                    <button onClick={() => setSubjects(subjects.filter(s => s !== subj))} className="text-red-500 hover:text-red-700">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {isEditing && (
              <tr>
                <td className="py-2 px-2">
                  <div className="flex gap-2">
                    <Input placeholder="Tambah Mapel Baru..." value={newSubj} onChange={e => setNewSubj(e.target.value)} />
                    <button type="button" onClick={() => { if(newSubj) { setSubjects([...subjects, newSubj]); setNewSubj(''); } }}
                      className="bg-primary text-white p-2 rounded-lg"><Plus size={16}/></button>
                  </div>
                </td>
                <td colSpan={semCols.length + 1}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
};

// ── TAB: Kehadiran ──
const TabKehadiran = ({ attendance, isEditing, formAtt, setFormAtt }: { attendance: any[], isEditing: boolean, formAtt: any[], setFormAtt: any }) => {
  if (!isEditing && (!attendance || attendance.length === 0)) return (
    <Section title="Rekap Ketidakhadiran" icon={ClipboardList}>
      <p className="text-xs text-text-secondary italic text-center py-8">Belum ada data kehadiran yang dimasukkan.</p>
    </Section>
  );

  return (
    <Section title="Rekap Ketidakhadiran Per Semester" icon={ClipboardList}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {semCols.map((col, idx) => {
          const viewAtt = attendance.find((a: any) => a.semester === col.sem);
          const editAtt = formAtt[idx];
          
          if (!isEditing && !viewAtt) return (
            <div key={col.sem} className="bg-gray-50 dark:bg-[#0a0a0a] rounded-lg border border-dashed border-gray-200 dark:border-[#333] p-3">
              <p className="text-[10px] font-bold text-text-secondary mb-1">Kelas {col.cl} — {col.label}</p>
              <p className="text-[10px] text-gray-400 italic">Belum ada data</p>
            </div>
          );

          const att = isEditing ? editAtt : viewAtt;
          
          return (
            <div key={col.sem} className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
              <p className="text-[10px] font-bold text-primary mb-2">Kelas {col.cl} — {col.label}</p>
              
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-10 text-amber-600">Sakit</span>
                    <Input type="number" className="h-7 text-xs w-full" value={att.sick} onChange={e => {
                      const newA = [...formAtt]; newA[idx].sick = e.target.value; setFormAtt(newA);
                    }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-10 text-blue-600">Izin</span>
                    <Input type="number" className="h-7 text-xs w-full" value={att.excused} onChange={e => {
                      const newA = [...formAtt]; newA[idx].excused = e.target.value; setFormAtt(newA);
                    }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-10 text-red-600">Alpa</span>
                    <Input type="number" className="h-7 text-xs w-full" value={att.unexcused} onChange={e => {
                      const newA = [...formAtt]; newA[idx].unexcused = e.target.value; setFormAtt(newA);
                    }} />
                  </div>
                  <select className="flex h-7 w-full rounded border border-gray-200 text-xs px-1" value={att.promotionStatus} onChange={e => {
                    const newA = [...formAtt]; newA[idx].promotionStatus = e.target.value; setFormAtt(newA);
                  }}>
                    <option value="">Status Akhir Sem...</option>
                    <option value="Naik Kelas">Naik Kelas</option>
                    <option value="Tidak Naik">Tidak Naik</option>
                    <option value="Lulus">Lulus</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Sakit', val: att.sick || 0, color: 'bg-amber-500' },
                      { label: 'Izin', val: att.excused || 0, color: 'bg-blue-500' },
                      { label: 'Alpa', val: att.unexcused || 0, color: 'bg-red-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-[10px] w-10 text-text-secondary">{item.label}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-[#222] rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${Math.min(item.val * 5, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold w-6 text-right text-text-primary dark:text-text-darkPrimary">{item.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#222]">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      att.promotionStatus === 'Naik Kelas' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      att.promotionStatus === 'Tidak Naik' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {att.promotionStatus === 'Naik Kelas' ? <CheckCircle2 size={10} /> : att.promotionStatus === 'Tidak Naik' ? <XCircle size={10} /> : <AlertCircle size={10} />}
                      {att.promotionStatus || 'Belum ditentukan'}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
};

// ── TAB: Ekskul & P5 ──
const TabEkskulP5 = ({ extracurriculars, p5, isEditing, formEkskul, setFormEkskul, formP5, setFormP5 }: { extracurriculars: any[], p5: any[], isEditing: boolean, formEkskul: any[], setFormEkskul: any, formP5: any[], setFormP5: any }) => (
  <div className="grid gap-4">
    <Section title="Kegiatan Ekstrakurikuler" icon={Activity}>
      {!isEditing && (!extracurriculars || extracurriculars.length === 0) ? (
        <p className="text-xs text-text-secondary italic text-center py-6">Belum ada data ekstrakurikuler.</p>
      ) : (
        <div className="space-y-3">
          {(isEditing ? formEkskul : extracurriculars).map((e: any, i: number) => (
            isEditing ? (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Nama Kegiatan" value={e.activityName} onChange={ev => { const n = [...formEkskul]; n[i].activityName = ev.target.value; setFormEkskul(n); }} />
                <Input placeholder="Semester" className="w-24" value={e.semester} onChange={ev => { const n = [...formEkskul]; n[i].semester = ev.target.value; setFormEkskul(n); }} />
                <Input placeholder="Nilai" className="w-24" value={e.assessment} onChange={ev => { const n = [...formEkskul]; n[i].assessment = ev.target.value; setFormEkskul(n); }} />
                <button onClick={() => setFormEkskul(formEkskul.filter((_, idx) => idx !== i))} className="p-2 text-red-500"><Trash2 size={16}/></button>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-lg p-3 border border-gray-100 dark:border-[#222]">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0"><Star size={14} className="text-violet-600" /></div>
                <div>
                  <p className="text-xs font-semibold">{e.name || e.activityName}</p>
                  <p className="text-[10px] text-text-secondary">Semester {e.semester} • {e.score || e.assessment || '-'}</p>
                </div>
              </div>
            )
          ))}
          {isEditing && (
            <Button variant="outline" size="sm" onClick={() => setFormEkskul([...formEkskul, { activityName: '', semester: '', assessment: '' }])}>
              <Plus size={14} className="mr-1"/> Tambah Ekskul
            </Button>
          )}
        </div>
      )}
    </Section>
    <Section title="P5 / Projek Penguatan Profil Pelajar Pancasila" icon={GraduationCap}>
      {!isEditing && (!p5 || p5.length === 0) ? (
        <p className="text-xs text-text-secondary italic text-center py-6">Belum ada data P5.</p>
      ) : (
        <div className="space-y-3">
          {(isEditing ? formP5 : p5).map((item: any, i: number) => (
            isEditing ? (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Tema/Projek" value={item.projectName} onChange={ev => { const n = [...formP5]; n[i].projectName = ev.target.value; setFormP5(n); }} />
                <Input placeholder="Semester" className="w-24" value={item.semester} onChange={ev => { const n = [...formP5]; n[i].semester = ev.target.value; setFormP5(n); }} />
                <Input placeholder="Nilai" className="w-32" value={item.score} onChange={ev => { const n = [...formP5]; n[i].score = ev.target.value; setFormP5(n); }} />
                <button onClick={() => setFormP5(formP5.filter((_, idx) => idx !== i))} className="p-2 text-red-500"><Trash2 size={16}/></button>
              </div>
            ) : (
              <div key={i} className="bg-gray-50 dark:bg-[#0a0a0a] rounded-lg p-3 border border-gray-100 dark:border-[#222]">
                <p className="text-xs font-semibold">{item.projectName || item.dimensionName || 'P5'}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Semester {item.semester}</p>
                <div className="mt-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{item.score || '-'}</span></div>
              </div>
            )
          ))}
          {isEditing && (
            <Button variant="outline" size="sm" onClick={() => setFormP5([...formP5, { projectName: '', semester: '', score: '' }])}>
              <Plus size={14} className="mr-1"/> Tambah P5
            </Button>
          )}
        </div>
      )}
    </Section>
  </div>
);

// ── TAB: Status Akhir ──
const TabStatus = ({ finalStatus, student, isEditing, formData, onChange }: { finalStatus: any[], student: any, isEditing: boolean, formData: any, onChange: (f: string, v: any) => void }) => {
  const fs = finalStatus && finalStatus.length > 0 ? finalStatus[0] : null;
  const statusLower = (student.status || 'aktif').toLowerCase();

  if (!isEditing && !fs && (statusLower === 'aktif' || statusLower === 'active')) {
    return (
      <Section title="Status Akhir Siswa" icon={Flag}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><CheckCircle2 size={24} className="text-emerald-500" /></div>
            <p className="text-sm font-bold text-emerald-600">Siswa Masih Aktif</p>
          </div>
        </div>
      </Section>
    );
  }

  if (isEditing) {
    return (
      <Section title="Status Akhir Siswa" icon={Flag}>
        <div className="grid gap-3">
          <InfoRow label="Status" value="" isEditing={true} editInput={
            <select className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm" value={formData.statusType} onChange={e => onChange('statusType', e.target.value)}>
              <option value="">(Kosong / Masih Aktif)</option><option value="Lulus">Lulus</option><option value="Pindah">Pindah</option><option value="Keluar">Keluar / DO</option>
            </select>
          } />
          {formData.statusType === 'Lulus' && (
            <>
              <InfoRow label="Tahun Lulus" value="" isEditing={true} editInput={<Input value={formData.graduationYear} onChange={e => onChange('graduationYear', e.target.value)} />} />
              <InfoRow label="No. Ijazah" value="" isEditing={true} editInput={<Input value={formData.ijazahNumber} onChange={e => onChange('ijazahNumber', e.target.value)} />} />
              <InfoRow label="Melanjutkan Ke" value="" isEditing={true} editInput={<Input value={formData.continueTo} onChange={e => onChange('continueTo', e.target.value)} />} />
            </>
          )}
          {(formData.statusType === 'Pindah' || formData.statusType === 'Keluar') && (
            <>
              <InfoRow label="Tanggal Keluar" value="" isEditing={true} editInput={<Input type="date" value={formData.leaveDate} onChange={e => onChange('leaveDate', e.target.value)} />} />
              <InfoRow label="Alasan" value="" isEditing={true} editInput={<Input value={formData.leaveReason} onChange={e => onChange('leaveReason', e.target.value)} />} />
            </>
          )}
        </div>
      </Section>
    );
  }

  const isLulus = fs?.statusType === 'Lulus' || statusLower === 'lulus';
  const isPindah = fs?.statusType === 'Pindah' || statusLower === 'pindah';
  return (
    <Section title="Status Akhir Siswa" icon={Flag}>
      <div className={`rounded-xl p-4 border-2 ${isLulus ? 'bg-blue-50 border-blue-200' : isPindah ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm font-bold ${isLulus ? 'text-blue-700' : isPindah ? 'text-amber-700' : 'text-red-700'}`}>
            {isLulus ? '🎓 Tamat Belajar / Lulus' : isPindah ? '🔄 Pindah Sekolah' : '⚠️ Keluar / DO'}
          </span>
        </div>
        {fs && (
          <div className="space-y-0 bg-white/60 rounded-lg p-3">
            {fs.tanggalKeluar && <InfoRow label="Tanggal" value={formatDate(fs.tanggalKeluar)} />}
            {fs.alasan && <InfoRow label="Alasan" value={fs.alasan} />}
            {fs.noIjazah && <InfoRow label="No. Ijazah" value={fs.noIjazah} />}
            {fs.tujuanPindah && <InfoRow label="Tujuan Pindah" value={fs.tujuanPindah} />}
            {fs.tujuanSetelahLulus && <InfoRow label="Tujuan Setelah Lulus" value={fs.tujuanSetelahLulus} />}
          </div>
        )}
      </div>
    </Section>
  );
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('identitas');
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [studentForm, setStudentForm] = useState<any>({});
  const [parentsForm, setParentsForm] = useState<any[]>([]);
  const [gradesMatrix, setGradesMatrix] = useState<any>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [extracurriculars, setExtracurriculars] = useState<any[]>([]);
  const [p5Data, setP5Data] = useState<any[]>([]);
  const [finalStatusForm, setFinalStatusForm] = useState<any>({});
  const [classMapels, setClassMapels] = useState<string[]>(DEFAULT_SUBJECTS);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [result, classesRes] = await Promise.all([
        apiClient<any>(`/students/${id}?complete=true`),
        apiClient<any>('/classes').catch(() => [])
      ]);
      setData(result);
      setClassesList(classesRes);

      if (result.classId) {
        try {
          const m = await apiClient<any>(`/students/class-mapels/${result.classId}`);
          if (m && m.mapels && m.mapels.length > 0) {
            setClassMapels(m.mapels);
          } else {
            setClassMapels(DEFAULT_SUBJECTS);
          }
        } catch {
          setClassMapels(DEFAULT_SUBJECTS);
        }
      } else {
        setClassMapels(DEFAULT_SUBJECTS);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const toggleEditMode = () => {
    if (!isEditing && data) {
      // Initialize form states
      setStudentForm({ ...data });
      setParentsForm([
        (data.parents || []).find((p:any) => p.type === 'ayah') || { type: 'ayah', name: '' },
        (data.parents || []).find((p:any) => p.type === 'ibu') || { type: 'ibu', name: '' },
        (data.parents || []).find((p:any) => p.type === 'wali') || { type: 'wali', name: '' }
      ]);
      
      const matrix: any = {};
      const subs = new Set<string>();
      (data.grades || []).forEach((g: any) => {
        if (!matrix[g.subjectName]) matrix[g.subjectName] = {};
        matrix[g.subjectName][g.semester] = g.score;
        subs.add(g.subjectName);
      });
      classMapels.forEach(s => subs.add(s));
      setGradesMatrix(matrix);
      setSubjects(Array.from(subs));

      const attMap = semCols.map(col => {
        const found = (data.attendance || []).find((a: any) => a.semester === col.sem);
        return found || { semester: col.sem, classLevel: col.cl, sick: '', excused: '', unexcused: '', promotionStatus: '' };
      });
      setAttendanceData(attMap);
      setExtracurriculars(data.extracurriculars || []);
      setP5Data(data.p5 || []);
      
      const fs = data.finalStatus && data.finalStatus.length > 0 ? data.finalStatus[0] : {};
      setFinalStatusForm({
        statusType: fs.statusType || '', graduationYear: fs.graduationYear || '',
        ijazahNumber: fs.ijazahNumber || '', continueTo: fs.continueTo || '',
        leaveReason: fs.leaveReason || '', leaveDate: fs.leaveDate ? fs.leaveDate.split('T')[0] : ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setSaving(true);
    // Flatten grades
    const gradesArray: any[] = [];
    Object.entries(gradesMatrix).forEach(([subjectName, semesters]: [string, any]) => {
      Object.entries(semesters).forEach(([sem, score]) => {
        if (score && String(score).trim() !== '') {
          const col = semCols.find(c => c.sem === Number(sem));
          gradesArray.push({ subjectName, semester: Number(sem), classLevel: col?.cl || '', score: String(score) });
        }
      });
    });

    const payload = {
      student: studentForm,
      parents: parentsForm.filter(p => p.name?.trim() !== ''),
      grades: gradesArray,
      attendance: attendanceData.filter(a => a.sick || a.excused || a.unexcused || a.promotionStatus),
      extracurriculars: extracurriculars.filter(e => e.activityName?.trim()),
      p5: p5Data.filter(p => p.projectName?.trim()),
      finalStatus: finalStatusForm.statusType ? [finalStatusForm] : []
    };

    try {
      await apiClient.put(`/students/${id}`, payload);
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      alert("Gagal menyimpan data: " + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!data) return <div className="flex flex-col items-center justify-center h-64 gap-3"><p>Data siswa tidak ditemukan.</p><button onClick={() => navigate('/dashboard/students')} className="text-xs text-primary">← Kembali</button></div>;

  const statusLower = (data.status || 'aktif').toLowerCase();
  const statusConfig = statusLower === 'lulus' ? { bg: 'bg-blue-500', text: 'Lulus' }
    : statusLower === 'pindah' || statusLower === 'keluar' ? { bg: 'bg-red-500', text: data.status }
    : { bg: 'bg-emerald-500', text: 'Aktif' };

  return (
    <div className="flex flex-col gap-4 md:gap-5 relative pb-20">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline w-fit">
        <ArrowLeft size={14} /> Kembali ke Daftar Siswa
      </button>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        {/* SIDEBAR */}
        <div className="md:w-72 lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
            <div className="h-20 bg-gradient-to-br from-primary/80 via-primary to-primary/60 relative">
              <div className="absolute -bottom-8 left-4">
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt={data.fullName} className="w-16 h-16 rounded-xl object-cover border-4 border-white shadow-lg" />
                ) : (
                  <div className={`w-16 h-16 rounded-xl ${avatarColor(data.fullName || '')} text-white text-lg font-bold flex items-center justify-center border-4 border-white shadow-lg`}>
                    {initials(data.fullName || '?')}
                  </div>
                )}
              </div>
            </div>
            <div className="pt-10 px-4 pb-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-text-primary truncate">{data.fullName}</h2>
                  <p className="text-[11px] text-text-secondary font-mono mt-0.5">NIS: {data.nis || '-'} • NISN: {data.nisn || '-'}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${statusConfig.bg}`}>{statusConfig.text}</span>
              </div>
              <div className="mt-4 space-y-2">
                {data.className && <div className="flex items-center gap-2 text-xs text-text-secondary"><GraduationCap size={13} className="text-primary shrink-0" /><span>Kelas {data.className}</span></div>}
                {data.birthPlace && <div className="flex items-center gap-2 text-xs text-text-secondary"><Calendar size={13} className="text-primary shrink-0" /><span>{data.birthPlace}, {formatDate(data.birthDate)}</span></div>}
                {data.address && <div className="flex items-center gap-2 text-xs text-text-secondary"><MapPin size={13} className="text-primary shrink-0" /><span className="line-clamp-2">{data.address}</span></div>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-primary text-white rounded-lg text-xs font-semibold"><Printer size={13} /> Cetak PDF</button>
                {!isEditing && (
                  <button onClick={toggleEditMode} className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-gray-100 text-text-primary rounded-lg text-xs font-semibold hover:bg-gray-200"><Edit2 size={13} /> Edit Data</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 -mx-1 px-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-white text-text-secondary hover:bg-gray-50 border border-gray-200'}`}>
                    <Icon size={13} /><span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="animate-in fade-in duration-200">
            {activeTab === 'identitas' && <TabIdentitas s={isEditing ? studentForm : data} isEditing={isEditing} formData={studentForm} onChange={(f,v) => setStudentForm({...studentForm, [f]: v})} classesList={classesList} />}
            {activeTab === 'orang-tua' && <TabOrangTua parents={data.parents} isEditing={isEditing} formParents={parentsForm} setFormParents={setParentsForm} />}
            {activeTab === 'nilai' && <TabNilai grades={data.grades} isEditing={isEditing} matrix={gradesMatrix} setMatrix={setGradesMatrix} subjects={subjects} setSubjects={setSubjects} />}
            {activeTab === 'kehadiran' && <TabKehadiran attendance={data.attendance} isEditing={isEditing} formAtt={attendanceData} setFormAtt={setAttendanceData} />}
            {activeTab === 'ekskul-p5' && <TabEkskulP5 extracurriculars={data.extracurriculars} p5={data.p5} isEditing={isEditing} formEkskul={extracurriculars} setFormEkskul={setExtracurriculars} formP5={p5Data} setFormP5={setP5Data} />}
            {activeTab === 'status' && <TabStatus finalStatus={data.finalStatus} student={data} isEditing={isEditing} formData={finalStatusForm} onChange={(f,v) => setFinalStatusForm({...finalStatusForm, [f]: v})} />}
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BAR FOR EDIT MODE */}
      {isEditing && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-2xl rounded-full p-2 flex items-center gap-2 animate-in slide-in-from-bottom-10">
          <Button onClick={toggleEditMode} variant="outline" className="rounded-full px-4 h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
            <X size={16} className="mr-1.5" /> Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-full px-6 h-10 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            {saving ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <Save size={16} className="mr-1.5" />}
            Simpan Perubahan
          </Button>
        </div>
      )}
    </div>
  );
}
