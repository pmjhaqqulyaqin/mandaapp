import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authClient } from '../../lib/auth-client';
import { useMyEmployee, useLookupNip, useLinkNip, useUploadProfilePhoto } from '../../hooks/api/useEmployeeProfile';
import { compressImage } from '../../lib/imageCompressor';
import { API_BASE_URL } from '../../lib/api';
import { X, ChevronRight, ChevronLeft, Camera, User as UserIcon, Link2, Lock, LogOut, ShieldAlert, Check, Loader2, Mail, BadgeCheck, Briefcase } from 'lucide-react';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

type View = 'main' | 'photo' | 'info' | 'link-nip' | 'password';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Administrator', kepala_madrasah: 'Kepala Madrasah',
  wakil_kepala: 'Wakil Kepala', kepala_unit: 'Kepala Unit',
  wali_kelas: 'Wali Kelas', pembina_ekstra: 'Pembina Ekstra',
  kepala_tu: 'Kepala TU', pegawai_tu: 'Pegawai TU',
  guru: 'Guru', student: 'Siswa', orang_tua: 'Orang Tua',
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onLogout }) => {
  const { user, refreshSession } = useAuth();
  const [view, setView] = useState<View>('main');
  const { data: employee, refetch: refetchEmployee } = useMyEmployee();

  useEffect(() => { if (isOpen) setView('main'); }, [isOpen]);

  if (!isOpen || !user) return null;

  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const avatarUrl = employee?.photoUrl
    ? `${SERVER_BASE}${employee.photoUrl}`
    : user.image
      ? (user.image.startsWith('http') ? user.image : `${SERVER_BASE}${user.image}`)
      : null;

  const goBack = () => setView('main');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Sliding container */}
        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out h-full"
            style={{ width: '200%', transform: view === 'main' ? 'translateX(0)' : 'translateX(-50%)' }}
          >
            {/* LEFT: Main View */}
            <div className="w-1/2 flex flex-col overflow-y-auto">
              <MainView
                user={user} roleLabel={roleLabel} avatarUrl={avatarUrl}
                employee={employee} onClose={onClose} onLogout={onLogout}
                onNavigate={setView}
              />
            </div>
            {/* RIGHT: Sub View */}
            <div className="w-1/2 flex flex-col overflow-y-auto">
              {view === 'photo' && <PhotoView user={user} avatarUrl={avatarUrl} employee={employee} goBack={goBack} onDone={() => { refetchEmployee(); refreshSession(); }} />}
              {view === 'info' && <InfoView user={user} roleLabel={roleLabel} employee={employee} goBack={goBack} />}
              {view === 'link-nip' && <LinkNipView user={user} employee={employee} goBack={goBack} onLinked={() => { refetchEmployee(); refreshSession(); goBack(); }} />}
              {view === 'password' && <PasswordView goBack={goBack} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ━━━━━━━━ MAIN VIEW ━━━━━━━━ */
function MainView({ user, roleLabel, avatarUrl, employee, onClose, onLogout, onNavigate }: any) {
  return (
    <>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3.5">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-500/30" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg font-bold uppercase">
              {user.name?.charAt(0) || '?'}
            </div>
          )}
          <button onClick={() => onNavigate('photo')} className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#111]">
            <Camera size={11} className="text-white" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">{user.name}</h2>
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{roleLabel}</p>
          {employee?.nip && <p className="text-[10px] text-gray-400 mt-0.5">NIP: {employee.nip}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={18} /></button>
      </div>

      {/* Menu Items */}
      <div className="px-3 pb-2 space-y-0.5">
        <MenuItem icon={<Camera size={16} />} label="Foto Profil" desc="Unggah atau ganti foto" onClick={() => onNavigate('photo')} color="text-blue-500" />
        <MenuItem icon={<UserIcon size={16} />} label="Informasi Akun" desc="Lihat data akun & pegawai" onClick={() => onNavigate('info')} color="text-emerald-500" />
        <MenuItem
          icon={<Link2 size={16} />}
          label={employee ? 'Data Pegawai Terhubung' : 'Hubungkan Data Pegawai'}
          desc={employee ? `${employee.name} · ${employee.nip}` : 'Masukkan NIP untuk menghubungkan'}
          onClick={() => onNavigate('link-nip')}
          color="text-orange-500"
          badge={employee ? '✓' : undefined}
        />
        <MenuItem icon={<Lock size={16} />} label="Ubah Password" desc="Perbarui kata sandi Anda" onClick={() => onNavigate('password')} color="text-purple-500" />
      </div>

      {/* Logout */}
      {onLogout && (
        <div className="px-3 pb-3 pt-1 mt-auto">
          <button onClick={onLogout} className="w-full py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98]">
            <LogOut size={15} /> Keluar dari Akun
          </button>
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, label, desc, onClick, color, badge }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void; color: string; badge?: string }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors active:scale-[0.98] text-left">
      <div className={`w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${color} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{label}</p>
        <p className="text-[11px] text-gray-400 truncate">{desc}</p>
      </div>
      {badge ? (
        <span className="text-emerald-500 text-xs font-bold">{badge}</span>
      ) : (
        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
      )}
    </button>
  );
}

/* ━━━━━━━━ SUB-VIEW HEADER ━━━━━━━━ */
function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95">
        <ChevronLeft size={20} className="text-gray-500" />
      </button>
      <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">{title}</h3>
    </div>
  );
}

/* ━━━━━━━━ PHOTO VIEW ━━━━━━━━ */
function PhotoView({ user, avatarUrl, employee, goBack, onDone }: any) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadProfilePhoto();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImage(f, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await uploadMut.mutateAsync(file);
      onDone();
      goBack();
    } catch {}
  };

  const displayUrl = preview || avatarUrl;

  return (
    <>
      <SubHeader title="Foto Profil" onBack={goBack} />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-5">
        <div className="relative">
          {displayUrl ? (
            <img src={displayUrl} alt="" className="w-32 h-32 rounded-full object-cover ring-4 ring-emerald-500/20 shadow-lg" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-4xl font-bold uppercase shadow-lg">
              {user.name?.charAt(0) || '?'}
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <button onClick={() => fileRef.current?.click()} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 active:scale-[0.98]">
          <Camera size={16} /> Ambil Foto / Pilih dari Galeri
        </button>

        <p className="text-[11px] text-gray-400 text-center">Foto akan digunakan sebagai avatar akun{employee ? ' dan foto profil pegawai' : ''}.</p>

        {file && (
          <button onClick={handleUpload} disabled={uploadMut.isPending} className="w-full max-w-[200px] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]">
            {uploadMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Mengunggah...</> : <><Check size={14} /> Simpan Foto</>}
          </button>
        )}
        {uploadMut.isError && <p className="text-[12px] text-red-500">Gagal mengunggah foto. Coba lagi.</p>}
      </div>
    </>
  );
}

/* ━━━━━━━━ INFO VIEW ━━━━━━━━ */
function InfoView({ user, roleLabel, employee, goBack }: any) {
  return (
    <>
      <SubHeader title="Informasi Akun" onBack={goBack} />
      <div className="px-4 py-4 space-y-4">
        <InfoSection title="AKUN">
          <InfoRow icon={<UserIcon size={14} />} label="Nama" value={user.name} />
          <InfoRow icon={<Mail size={14} />} label="Email" value={user.email} />
          <InfoRow icon={<BadgeCheck size={14} />} label="Role" value={roleLabel} />
        </InfoSection>

        {employee && (
          <InfoSection title="DATA PEGAWAI TERHUBUNG">
            <InfoRow icon={<Briefcase size={14} />} label="Nama" value={employee.name} />
            <InfoRow label="NIP" value={employee.nip} />
            <InfoRow label="Jenis" value={employee.type} />
            {employee.rank && <InfoRow label="Pangkat" value={employee.rank} />}
            {employee.grade && <InfoRow label="Golongan" value={employee.grade} />}
            {employee.position && <InfoRow label="Jabatan" value={employee.position} />}
            {employee.task && <InfoRow label="Tugas" value={employee.task} />}
            {employee.gender && <InfoRow label="Jenis Kelamin" value={employee.gender} />}
          </InfoSection>
        )}

        {!employee && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-[11px] text-amber-700 dark:text-amber-400">Akun Anda belum terhubung dengan data pegawai. Gunakan menu "Hubungkan Data Pegawai" dan masukkan NIP Anda.</p>
          </div>
        )}
      </div>
    </>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{title}</p>
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center px-3.5 py-2.5">
      {icon && <span className="text-gray-400 mr-2.5 shrink-0">{icon}</span>}
      <span className="text-[12px] text-gray-500 w-20 shrink-0">{label}</span>
      <span className="text-[12px] font-medium text-gray-900 dark:text-white flex-1 text-right truncate">{value || '—'}</span>
    </div>
  );
}

/* ━━━━━━━━ LINK NIP VIEW ━━━━━━━━ */
function LinkNipView({ user, employee, goBack, onLinked }: any) {
  const [nip, setNip] = useState('');
  const { data: lookup, isFetching, isTyping, error: lookupError } = useLookupNip(nip);
  const linkMut = useLinkNip();
  const [msg, setMsg] = useState('');

  const isSearching = isFetching || isTyping;
  const trimmedNip = nip.trim();

  // If already linked, show current link info
  if (employee) {
    return (
      <>
        <SubHeader title="Data Pegawai" onBack={goBack} />
        <div className="px-4 py-6 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Check size={28} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold text-gray-900 dark:text-white">{employee.name}</p>
            <p className="text-[12px] text-gray-500 mt-1">NIP: {employee.nip}</p>
            <p className="text-[12px] text-gray-500">{employee.type} · {employee.grade || ''}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl w-full">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 text-center">✅ Akun Anda sudah terhubung dengan data pegawai ini.</p>
          </div>
        </div>
      </>
    );
  }

  const handleLink = async () => {
    if (!trimmedNip) return;
    setMsg('');
    try {
      await linkMut.mutateAsync(trimmedNip);
      setMsg('✅ Berhasil terhubung!');
      setTimeout(onLinked, 1000);
    } catch (err: any) {
      setMsg(err.message || 'Gagal menghubungkan');
    }
  };

  const canLink = lookup && !lookup.isLinked && !lookup.isLinkedToCurrentUser;

  return (
    <>
      <SubHeader title="Hubungkan Data Pegawai" onBack={goBack} />
      <div className="px-4 py-4 space-y-4">
        <p className="text-[12px] text-gray-500 leading-relaxed">
          Masukkan NIP/NUPTK Anda untuk menghubungkan akun ini dengan data pegawai yang ada di sistem.
        </p>

        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">NIP / NUPTK</label>
          <div className="relative">
            <input
              type="text" inputMode="numeric" value={nip}
              onChange={e => { setNip(e.target.value); setMsg(''); }}
              placeholder="Contoh: 198001012005011001"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
            {isSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
          </div>
        </div>

        {/* Lookup result: NIP not found */}
        {trimmedNip.length >= 5 && !isSearching && lookup === null && !lookupError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-[12px] text-red-600 dark:text-red-400">❌ NIP tidak ditemukan dalam data pegawai.</p>
          </div>
        )}

        {/* Lookup error */}
        {lookupError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-[12px] text-red-600 dark:text-red-400">❌ Gagal mencari NIP: {(lookupError as Error).message || 'Terjadi kesalahan'}</p>
          </div>
        )}

        {lookup && lookup.isLinked && !lookup.isLinkedToCurrentUser && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-[12px] text-amber-700 dark:text-amber-400">⚠️ NIP ini sudah terhubung dengan akun lain. Hubungi admin jika ini kesalahan.</p>
          </div>
        )}

        {canLink && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
            <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-semibold">✅ Ditemukan:</p>
            <div className="text-[12px] text-emerald-800 dark:text-emerald-300 space-y-0.5">
              <p><strong>{lookup.name}</strong></p>
              <p>{lookup.type}{lookup.grade ? ` · ${lookup.grade}` : ''}{lookup.position ? ` · ${lookup.position}` : ''}</p>
            </div>
          </div>
        )}

        {msg && <p className={`text-[12px] text-center font-medium ${msg.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}

        <button
          onClick={handleLink}
          disabled={!canLink || linkMut.isPending}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {linkMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Menghubungkan...</> : <><Link2 size={14} /> Hubungkan Akun Ini</>}
        </button>

        <p className="text-[10px] text-gray-400 text-center">NIP hanya bisa dihubungkan satu kali per akun.</p>
      </div>
    </>
  );
}

/* ━━━━━━━━ PASSWORD VIEW ━━━━━━━━ */
function PasswordView({ goBack }: { goBack: () => void }) {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirm) { setMsg('Konfirmasi password tidak cocok'); setIsError(true); return; }
    if (newPw.length < 8) { setMsg('Password minimal 8 karakter'); setIsError(true); return; }

    setLoading(true); setMsg(''); setIsError(false);
    try {
      const { error } = await authClient.changePassword({ newPassword: newPw, currentPassword: current, revokeOtherSessions: true });
      if (error) throw new Error(error.message);
      setMsg('✅ Password berhasil diperbarui!'); setIsError(false);
      setCurrent(''); setNewPw(''); setConfirm('');
    } catch (err: any) {
      setMsg(err.message || 'Gagal memperbarui password'); setIsError(true);
    } finally { setLoading(false); }
  };

  return (
    <>
      <SubHeader title="Ubah Password" onBack={goBack} />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {msg && (
          <div className={`p-3 rounded-xl text-[12px] font-medium text-center ${isError ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600' : 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 text-emerald-600'}`}>
            {msg}
          </div>
        )}

        <PwField label="Password Saat Ini" value={current} onChange={setCurrent} />
        <PwField label="Password Baru" value={newPw} onChange={setNewPw} />
        <PwField label="Konfirmasi Password" value={confirm} onChange={setConfirm} />

        <button type="submit" disabled={loading || !current || !newPw || !confirm}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Memperbarui...</> : 'Perbarui Password'}
        </button>
      </form>
    </>
  );
}

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={14} className="text-gray-400" /></div>
        <input type="password" value={value} onChange={e => onChange(e.target.value)} required minLength={8}
          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        />
      </div>
    </div>
  );
}
