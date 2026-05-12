import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';
import { cacheCredentials } from '../lib/offlineAuth';
import { Eye, EyeOff, Check, Shield } from 'lucide-react';

const SELECTABLE_ROLES = [
  {
    value: 'guru',
    label: 'Guru / Tenaga Pendidik',
    description: 'Jurnal mengajar, presensi, jadwal, dan penilaian.',
    emoji: '🧑‍🏫',
  },
  {
    value: 'student',
    label: 'Siswa',
    description: 'Jadwal, kartu pelajar, dan profil pribadi.',
    emoji: '🎓',
  },
  {
    value: 'orang_tua',
    label: 'Orang Tua / Wali',
    description: 'Pantau kehadiran dan perkembangan anak.',
    emoji: '👨‍👩‍👧',
  },
];

export const SelectRolePage = () => {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If user already has a non-default role, skip to appropriate page
  useEffect(() => {
    if (user && user.role && user.role !== 'student') {
      navigate(user.role === 'orang_tua' ? '/portal-ortu' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const passwordStrength = (() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score, label: 'Lemah', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Cukup', color: 'bg-amber-500' };
    return { score, label: 'Kuat', color: 'bg-emerald-500' };
  })();

  const canSubmit = selectedRole && password.length >= 8 && password === confirmPassword && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi tidak cocok.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiClient('/users/setup-account', {
        method: 'POST',
        data: { role: selectedRole, password },
      });

      // Optimistically update user in localStorage with new role
      // so ProtectedRoute immediately sees the correct role
      const updatedUser = { ...user, role: selectedRole };
      localStorage.setItem('mandualotim_user', JSON.stringify(updatedUser));

      // ━━ Cache credentials for offline login ━━
      // This is critical for Google OAuth users who set their password here
      if (user.email) {
        cacheCredentials(user.email, password, updatedUser).catch(() => {});
      }

      // Refresh session to sync with server
      await refreshSession();
      navigate(selectedRole === 'orang_tua' ? '/portal-ortu' : '/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Gagal menyiapkan akun. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Selamat Datang!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user?.name && <><strong className="text-gray-700 dark:text-gray-300">{user.name}</strong> — </>}
            Lengkapi akun Anda untuk melanjutkan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Pilih Peran Anda</h3>
            <div className="space-y-2">
              {SELECTABLE_ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                    selectedRole === role.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <input type="radio" name="role" value={role.value}
                    checked={selectedRole === role.value}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="sr-only" />
                  <span className="text-2xl shrink-0">{role.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{role.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{role.description}</p>
                  </div>
                  {selectedRole === role.value && (
                    <Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Password Section */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">Buat Password</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
              Password ini diperlukan untuk login saat tidak ada internet.
            </p>

            <div className="space-y-3">
              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password baru (min. 8 karakter)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-[#0a0a0a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-medium ${
                    passwordStrength.score <= 1 ? 'text-red-500' :
                    passwordStrength.score <= 3 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>{passwordStrength.label}</span>
                </div>
              )}

              {/* Confirm */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Konfirmasi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-gray-50 dark:bg-[#0a0a0a] focus:ring-1 outline-none text-gray-900 dark:text-white ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : confirmPassword && confirmPassword === password
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500'
                        : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
                {confirmPassword && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {confirmPassword === password
                      ? <Check size={16} className="text-emerald-500" />
                      : <span className="text-red-400 text-xs">✗</span>
                    }
                  </span>
                )}
              </div>

              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-500">Password tidak cocok</p>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              💡 <strong>Guru:</strong> Admin akan mengatur role spesifik Anda nanti (Kepala Madrasah, Wali Kelas, dll.)
              Password ini memungkinkan Anda login tanpa internet.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Menyiapkan akun...
              </span>
            ) : 'Lanjutkan ke Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
