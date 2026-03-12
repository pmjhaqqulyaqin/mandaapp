import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';

const SELECTABLE_ROLES = [
  {
    value: 'guru',
    label: 'Guru / Tenaga Pendidik',
    description: 'Akses jadwal pelajaran, input nilai, data siswa, galeri, dan berita.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    value: 'student',
    label: 'Siswa',
    description: 'Akses jadwal, kartu pelajar, dan profil pribadi.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3l10 4 10-4"/><path d="M2 3v8l10 4 10-4V3"/><path d="M12 15v6"/>
        <path d="M6 11.5V17a6 6 0 0 0 12 0v-5.5"/>
      </svg>
    ),
  },
];

export const SelectRolePage = () => {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If user already has a non-default role, skip to dashboard
  useEffect(() => {
    if (user && user.role && user.role !== 'student') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !user) return;

    setIsLoading(true);
    setError('');

    try {
      await apiClient('/users/select-role', {
        method: 'POST',
        body: JSON.stringify({ role: selectedRole }),
      });

      // Refresh session to get updated role
      await refreshSession();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan peran. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark p-4 transition-colors duration-300">
      <div className="w-full max-w-lg p-8 bg-white dark:bg-[#0A0A0A] border border-border-light dark:border-border-dark rounded-xl shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold tracking-tight text-primary mb-2">Selamat Datang!</h1>
          <p className="text-text-secondary">Anda terdaftar sebagai <strong className="text-text-primary dark:text-text-darkPrimary">{user?.name}</strong></p>
          <p className="text-text-secondary text-sm mt-1">Pilih peran Anda untuk melanjutkan.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3">
            {SELECTABLE_ROLES.map((role) => (
              <label
                key={role.value}
                className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedRole === role.value
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                    : 'border-border-light dark:border-border-dark hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="sr-only"
                />
                <div className={`flex-shrink-0 mt-0.5 ${
                  selectedRole === role.value ? 'text-primary' : 'text-text-secondary'
                }`}>
                  {role.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary dark:text-text-darkPrimary">{role.label}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{role.description}</p>
                </div>
                {selectedRole === role.value && (
                  <div className="absolute top-3 right-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>

          <p className="text-xs text-text-secondary text-center mt-2">
            💡 Guru: Admin akan mengatur role spesifik Anda nanti (Kepala Madrasah, Wali Kelas, dll.)
          </p>

          <button
            type="submit"
            disabled={!selectedRole || isLoading}
            className="w-full mt-4 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Menyimpan...' : 'Lanjutkan ke Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
