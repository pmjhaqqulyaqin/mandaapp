import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  ArrowLeft, Printer, Edit2, User, Users, BookOpen, ClipboardList,
  Award, Flag, Loader2, Phone, Briefcase, MapPin, Calendar,
  Heart, GraduationCap, Activity, Star, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { AddStudentModal } from './AddStudentModal';

// Avatar
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

// Section wrapper
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

// Info row
const InfoRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex py-1.5 border-b border-gray-50 dark:border-[#1a1a1a] last:border-0">
    <span className="w-40 shrink-0 text-xs text-text-secondary font-medium">{label}</span>
    <span className="text-xs text-text-primary dark:text-text-darkPrimary font-semibold">{value || '-'}</span>
  </div>
);

// ── TAB: Identitas ──
const TabIdentitas = ({ s }: { s: any }) => (
  <div className="grid gap-4">
    <Section title="Data Pribadi" icon={User}>
      <div className="grid md:grid-cols-2 gap-x-8">
        <div>
          <InfoRow label="Nama Lengkap" value={s.fullName} />
          <InfoRow label="Jenis Kelamin" value={s.gender} />
          <InfoRow label="Tempat Lahir" value={s.birthPlace} />
          <InfoRow label="Tanggal Lahir" value={formatDate(s.birthDate)} />
          <InfoRow label="NIK" value={s.nik} />
          <InfoRow label="No. KK" value={s.noKk} />
        </div>
        <div>
          <InfoRow label="Agama" value={s.agama} />
          <InfoRow label="Kewarganegaraan" value={s.kewarganegaraan} />
          <InfoRow label="Jumlah Saudara" value={s.jumlahSaudara} />
          <InfoRow label="Bahasa Sehari-hari" value={s.bahasaSehariHari} />
          <InfoRow label="Golongan Darah" value={s.golonganDarah} />
          <InfoRow label="Jarak ke Sekolah" value={s.jarakSekolahKm ? `${s.jarakSekolahKm} km` : '-'} />
        </div>
      </div>
    </Section>
    <Section title="Alamat & Tempat Tinggal" icon={MapPin}>
      <InfoRow label="Alamat" value={s.address} />
      <InfoRow label="Tempat Tinggal" value={s.tempatTinggal} />
    </Section>
  </div>
);

// ── TAB: Orang Tua ──
const ParentCard = ({ data, title, color }: { data: any; title: string; color: string }) => {
  if (!data || !data.name) return (
    <div className="bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-dashed border-gray-200 dark:border-[#333] p-4 flex items-center justify-center">
      <p className="text-xs text-text-secondary italic">Data {title} belum diisi</p>
    </div>
  );
  return (
    <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
      <div className={`px-4 py-2.5 ${color} flex items-center gap-2`}>
        <Users size={14} className="text-white" />
        <span className="text-xs font-bold text-white">{title}</span>
      </div>
      <div className="p-4 space-y-0">
        <InfoRow label="Nama" value={data.name} />
        <InfoRow label="Tempat/Tgl Lahir" value={[data.birthPlace, formatDate(data.birthDate)].filter(Boolean).join(', ')} />
        <InfoRow label="Agama" value={data.agama} />
        <InfoRow label="Kewarganegaraan" value={data.kewarganegaraan} />
        <InfoRow label="Pendidikan" value={data.pendidikan} />
        <InfoRow label="Pekerjaan" value={data.pekerjaan} />
        <InfoRow label="No. HP" value={data.phone} />
        <InfoRow label="Alamat" value={data.address} />
      </div>
    </div>
  );
};

const TabOrangTua = ({ parents }: { parents: any[] }) => {
  const getParent = (type: string) => (parents || []).find((p: any) => p.type === type);
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ParentCard data={getParent('ayah')} title="Ayah" color="bg-blue-500" />
      <ParentCard data={getParent('ibu')} title="Ibu" color="bg-pink-500" />
      <ParentCard data={getParent('wali')} title="Wali" color="bg-amber-500" />
    </div>
  );
};

// ── TAB: Nilai Rapor ──
const semCols = [
  { sem: 1, cl: 'X', label: 'Sem 1' },
  { sem: 2, cl: 'X', label: 'Sem 2' },
  { sem: 3, cl: 'XI', label: 'Sem 3' },
  { sem: 4, cl: 'XI', label: 'Sem 4' },
  { sem: 5, cl: 'XII', label: 'Sem 5' },
  { sem: 6, cl: 'XII', label: 'Sem 6' },
];

const TabNilai = ({ grades }: { grades: any[] }) => {
  if (!grades || grades.length === 0) return (
    <Section title="Nilai Rapor" icon={BookOpen}>
      <p className="text-xs text-text-secondary italic text-center py-8">Belum ada data nilai yang dimasukkan.</p>
    </Section>
  );
  // Build matrix
  const matrix: Record<string, Record<number, string>> = {};
  grades.forEach((g: any) => {
    if (!matrix[g.subjectName]) matrix[g.subjectName] = {};
    matrix[g.subjectName][g.semester] = g.score || '';
  });
  const subjects = Object.keys(matrix).sort();

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
            </tr>
          </thead>
          <tbody>
            {subjects.map((subj, i) => (
              <tr key={subj} className={`border-b border-gray-50 dark:border-[#1a1a1a] ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-[#0a0a0a]'}`}>
                <td className="py-2 px-2 font-medium text-text-primary dark:text-text-darkPrimary">{subj}</td>
                {semCols.map(c => {
                  const val = matrix[subj]?.[c.sem];
                  return (
                    <td key={c.sem} className="text-center py-2 px-2">
                      {val ? (
                        <span className={`inline-block w-8 h-6 leading-6 rounded text-xs font-bold ${
                          Number(val) >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          Number(val) >= 70 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          Number(val) >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>{val}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
};

// ── TAB: Kehadiran ──
const TabKehadiran = ({ attendance }: { attendance: any[] }) => {
  if (!attendance || attendance.length === 0) return (
    <Section title="Rekap Ketidakhadiran" icon={ClipboardList}>
      <p className="text-xs text-text-secondary italic text-center py-8">Belum ada data kehadiran yang dimasukkan.</p>
    </Section>
  );
  return (
    <Section title="Rekap Ketidakhadiran Per Semester" icon={ClipboardList}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {semCols.map(col => {
          const att = attendance.find((a: any) => a.semester === col.sem);
          if (!att) return (
            <div key={col.sem} className="bg-gray-50 dark:bg-[#0a0a0a] rounded-lg border border-dashed border-gray-200 dark:border-[#333] p-3">
              <p className="text-[10px] font-bold text-text-secondary mb-1">Kelas {col.cl} — {col.label}</p>
              <p className="text-[10px] text-gray-400 italic">Belum ada data</p>
            </div>
          );
          return (
            <div key={col.sem} className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
              <p className="text-[10px] font-bold text-primary mb-2">Kelas {col.cl} — {col.label}</p>
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
            </div>
          );
        })}
      </div>
    </Section>
  );
};

// ── TAB: Ekskul & P5 ──
const TabEkskulP5 = ({ extracurriculars, p5 }: { extracurriculars: any[]; p5: any[] }) => (
  <div className="grid gap-4">
    <Section title="Kegiatan Ekstrakurikuler" icon={Activity}>
      {(!extracurriculars || extracurriculars.length === 0) ? (
        <p className="text-xs text-text-secondary italic text-center py-6">Belum ada data ekstrakurikuler.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {extracurriculars.map((e: any, i: number) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-lg p-3 border border-gray-100 dark:border-[#222]">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <Star size={14} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary truncate">{e.name || e.activityName}</p>
                <p className="text-[10px] text-text-secondary">Semester {e.semester} • {e.score || e.assessment || '-'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
    <Section title="P5 / Projek Penguatan Profil Pelajar Pancasila" icon={GraduationCap}>
      {(!p5 || p5.length === 0) ? (
        <p className="text-xs text-text-secondary italic text-center py-6">Belum ada data P5.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {p5.map((item: any, i: number) => (
            <div key={i} className="bg-gray-50 dark:bg-[#0a0a0a] rounded-lg p-3 border border-gray-100 dark:border-[#222]">
              <p className="text-xs font-semibold text-text-primary dark:text-text-darkPrimary">{item.projectName || item.dimensionName || 'P5'}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Semester {item.semester}</p>
              <div className="mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (item.score || '').toLowerCase().includes('berkembang') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  (item.score || '').toLowerCase().includes('mulai') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>{item.score || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  </div>
);

// ── TAB: Status Akhir ──
const TabStatus = ({ finalStatus, student }: { finalStatus: any[]; student: any }) => {
  const fs = finalStatus && finalStatus.length > 0 ? finalStatus[0] : null;
  const statusLower = (student.status || 'aktif').toLowerCase();

  if (!fs && (statusLower === 'aktif' || statusLower === 'active')) {
    return (
      <Section title="Status Akhir Siswa" icon={Flag}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Siswa Masih Aktif</p>
            <p className="text-xs text-text-secondary mt-1">Belum ada catatan status akhir.</p>
          </div>
        </div>
      </Section>
    );
  }

  const isLulus = fs?.statusType === 'Lulus' || statusLower === 'lulus';
  const isPindah = fs?.statusType === 'Pindah' || statusLower === 'pindah';

  return (
    <Section title="Status Akhir Siswa" icon={Flag}>
      <div className={`rounded-xl p-4 border-2 ${
        isLulus ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' :
        isPindah ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' :
        'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm font-bold ${
            isLulus ? 'text-blue-700 dark:text-blue-400' :
            isPindah ? 'text-amber-700 dark:text-amber-400' :
            'text-red-700 dark:text-red-400'
          }`}>
            {isLulus ? '🎓 Tamat Belajar / Lulus' : isPindah ? '🔄 Pindah Sekolah' : '⚠️ Keluar / DO'}
          </span>
        </div>
        {fs && (
          <div className="space-y-0 bg-white/60 dark:bg-[#111]/60 rounded-lg p-3">
            {fs.tanggalKeluar && <InfoRow label="Tanggal" value={formatDate(fs.tanggalKeluar)} />}
            {fs.alasan && <InfoRow label="Alasan" value={fs.alasan} />}
            {fs.noIjazah && <InfoRow label="No. Ijazah" value={fs.noIjazah} />}
            {fs.tujuanPindah && <InfoRow label="Tujuan Pindah" value={fs.tujuanPindah} />}
            {fs.tujuanSetelahLulus && <InfoRow label="Tujuan Setelah Lulus" value={fs.tujuanSetelahLulus} />}
            {fs.catatan && <InfoRow label="Catatan" value={fs.catatan} />}
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
  const [activeTab, setActiveTab] = useState<TabKey>('identitas');
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [result, classesRes] = await Promise.all([
        apiClient<any>(`/students/${id}?complete=true`),
        apiClient<any>('/classes').catch(() => [])
      ]);
      setData(result);
      setClassesList(classesRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handlePrint = async () => {
    try {
      const { API_BASE_URL } = await import('../../lib/api');
      const response = await fetch(`${API_BASE_URL}/students/${id}/buku-induk/pdf`, {
        method: 'GET', credentials: 'include',
      });
      if (!response.ok) throw new Error(`Gagal: ${response.statusText}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Buku_Induk_${data?.nis || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('Gagal mencetak: ' + (error.message || 'Error'));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-sm text-text-secondary">Data siswa tidak ditemukan.</p>
      <button onClick={() => navigate('/dashboard/students')} className="text-xs text-primary font-semibold hover:underline">← Kembali</button>
    </div>
  );

  const s = data;
  const statusLower = (s.status || 'aktif').toLowerCase();
  const statusConfig = statusLower === 'lulus'
    ? { bg: 'bg-blue-500', text: 'Lulus', ring: 'ring-blue-200' }
    : statusLower === 'pindah' || statusLower === 'keluar' || statusLower === 'do'
    ? { bg: 'bg-red-500', text: s.status, ring: 'ring-red-200' }
    : { bg: 'bg-emerald-500', text: 'Aktif', ring: 'ring-emerald-200' };

  const renderTab = () => {
    switch (activeTab) {
      case 'identitas': return <TabIdentitas s={s} />;
      case 'orang-tua': return <TabOrangTua parents={s.parents || []} />;
      case 'nilai': return <TabNilai grades={s.grades || []} />;
      case 'kehadiran': return <TabKehadiran attendance={s.attendance || []} />;
      case 'ekskul-p5': return <TabEkskulP5 extracurriculars={s.extracurriculars || []} p5={s.p5 || []} />;
      case 'status': return <TabStatus finalStatus={s.finalStatus || []} student={s} />;
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline w-fit">
        <ArrowLeft size={14} /> Kembali ke Daftar Siswa
      </button>

      {/* Main layout */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-5">

        {/* ──── SIDEBAR (Desktop) / HEADER CARD (Mobile) ──── */}
        <div className="md:w-72 lg:w-80 shrink-0">
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden sticky top-4">
            {/* Gradient header */}
            <div className="h-20 bg-gradient-to-br from-primary/80 via-primary to-primary/60 relative">
              <div className="absolute -bottom-8 left-4">
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt={s.fullName} className={`w-16 h-16 rounded-xl object-cover border-4 border-white dark:border-[#111] shadow-lg ring-2 ${statusConfig.ring}`} />
                ) : (
                  <div className={`w-16 h-16 rounded-xl ${avatarColor(s.fullName || '')} text-white text-lg font-bold flex items-center justify-center border-4 border-white dark:border-[#111] shadow-lg ring-2 ${statusConfig.ring}`}>
                    {initials(s.fullName || '?')}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-10 px-4 pb-4">
              {/* Name & status */}
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary truncate">{s.fullName}</h2>
                  <p className="text-[11px] text-text-secondary font-mono mt-0.5">NIS: {s.nis || '-'} • NISN: {s.nisn || '-'}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${statusConfig.bg}`}>
                  {statusConfig.text}
                </span>
              </div>

              {/* Quick info */}
              <div className="mt-4 space-y-2">
                {s.className && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <GraduationCap size={13} className="text-primary shrink-0" />
                    <span>Kelas {s.className}</span>
                  </div>
                )}
                {s.birthPlace && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Calendar size={13} className="text-primary shrink-0" />
                    <span>{s.birthPlace}, {formatDate(s.birthDate)}</span>
                  </div>
                )}
                {s.agama && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Heart size={13} className="text-primary shrink-0" />
                    <span>{s.agama}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <MapPin size={13} className="text-primary shrink-0" />
                    <span className="line-clamp-2">{s.address}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                <button onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                  <Printer size={13} /> Cetak PDF
                </button>
                <button onClick={() => setEditOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-gray-100 dark:bg-[#222] text-text-primary dark:text-text-darkPrimary rounded-lg text-xs font-semibold hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                  <Edit2 size={13} /> Edit Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ──── CONTENT AREA ──── */}
        <div className="flex-1 min-w-0">
          {/* Tab pills */}
          <div className="mb-4 -mx-1 px-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white dark:bg-[#111] text-text-secondary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] border border-gray-200 dark:border-[#222]'
                    }`}>
                    <Icon size={13} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="animate-in fade-in duration-200">
            {renderTab()}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <AddStudentModal
          isOpen={editOpen}
          onClose={() => { setEditOpen(false); fetchData(); }}
          editStudent={s}
          classes={classesList}
          apiClient={apiClient}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  );
}
