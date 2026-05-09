import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authClient } from '../../lib/auth-client';
import { X, Lock, User as UserIcon, Mail, ShieldAlert, LogOut } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onLogout }) => {
  const { user, refreshSession } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !user) return null;

  const roleLabel = user?.role === 'admin' ? 'System Administrator'
      : user?.role === 'kepala_madrasah' ? 'Kepala Madrasah'
      : user?.role === 'wakil_kepala' ? 'Wakil Kepala'
      : user?.role === 'kepala_unit' ? 'Kepala Unit'
      : user?.role === 'wali_kelas' ? 'Wali Kelas'
      : user?.role === 'pembina_ekstra' ? 'Pembina Ekstra'
      : user?.role === 'kepala_tu' ? 'Kepala TU'
      : user?.role === 'pegawai_tu' ? 'Pegawai TU'
      : user?.role === 'guru' ? 'Guru'
      : 'Siswa';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await authClient.updateUser({
        name: name,
        image: user.image, // keep existing image
      });

      if (error) throw new Error(error.message);

      // Email update if different (Note: BetterAuth generally handles email update differently and might require verification, 
      // but usually `updateUser` might take email too depending on plugins, or `changeEmail`. 
      // We will skip email update if it's the same or just rely on basic updateUser handling).
      // Let's assume updateUser handles basic profile. Email change often requires a specific flow.
      if (email !== user.email) {
        const { error: emailError } = await authClient.changeEmail({
            newEmail: email,
            callbackURL: window.location.origin
        });
        if (emailError) throw new Error(emailError.message);
      }

      await refreshSession();
      setSuccess('Profil berhasil diperbarui!');
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    if (newPassword.length < 8) {
        setError('Password minimal 8 karakter');
        return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await authClient.changePassword({
        newPassword: newPassword,
        currentPassword: currentPassword,
        revokeOtherSessions: true
      });

      if (error) throw new Error(error.message);

      setSuccess('Password berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#111111] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col border border-border-light dark:border-border-dark overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[92vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header with user info */}
        <div className="px-5 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-border-light dark:border-border-dark dark:bg-[#161616] bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center text-sm font-bold uppercase shrink-0 shadow-sm">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-text-primary dark:text-text-darkPrimary leading-tight truncate">
                {user?.name}
              </h2>
              <p className="text-[11px] font-medium text-primary leading-tight">{roleLabel}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:bg-gray-100 dark:hover:bg-[#202020] transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-light dark:border-border-dark">
            <button
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors active:scale-95 ${activeTab === 'profile' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-secondary border-b-2 border-transparent'}`}
                onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
            >
                Informasi Dasar
            </button>
            <button
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors active:scale-95 ${activeTab === 'password' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-secondary border-b-2 border-transparent'}`}
                onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); }}
            >
                Ubah Password
            </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto">
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-error mt-0.5 shrink-0" />
                    <p className="text-[13px] text-error font-medium">{error}</p>
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-[13px] text-green-600 dark:text-green-400 font-medium text-center">
                    {success}
                </div>
            )}

            {activeTab === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Nama Lengkap</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon size={16} className="text-text-secondary" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#050505] border border-border-light dark:border-border-dark rounded-xl text-[14px] text-text-primary dark:text-text-darkPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                required
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Email <span className="opacity-70 lowercase capitalize-none font-normal">(Digunakan untuk Login)</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail size={16} className="text-text-secondary" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#050505] border border-border-light dark:border-border-dark rounded-xl text-[14px] text-text-primary dark:text-text-darkPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Hak Akses / Role</label>
                        <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#161616] border border-border-light dark:border-border-dark rounded-xl text-[14px] text-text-secondary cursor-not-allowed">
                            {roleLabel}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1.5 ml-1">Role Anda hanya dapat diubah oleh Administrator Sistem.</p>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading || (!name.trim() && !email.trim())}
                            className="w-full py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Password Saat Ini</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={16} className="text-text-secondary" />
                            </div>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#050505] border border-border-light dark:border-border-dark rounded-xl text-[14px] text-text-primary dark:text-text-darkPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Password Baru</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={16} className="text-text-secondary" />
                            </div>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={8}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#050505] border border-border-light dark:border-border-dark rounded-xl text-[14px] text-text-primary dark:text-text-darkPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Konfirmasi Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={16} className="text-text-secondary" />
                            </div>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={8}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#050505] border border-border-light dark:border-border-dark rounded-xl text-[14px] text-text-primary dark:text-text-darkPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                            className="w-full py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Memperbarui...' : 'Perbarui Password'}
                        </button>
                    </div>
                </form>
            )}
        </div>

        {/* Logout button — visible on mobile for easy access */}
        {onLogout && (
          <div className="sm:hidden px-5 py-3 border-t border-border-light dark:border-border-dark">
            <button
              onClick={onLogout}
              className="w-full py-2.5 text-[14px] font-semibold text-error hover:bg-error/10 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95"
            >
              <LogOut size={16} /> Keluar dari Akun
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
