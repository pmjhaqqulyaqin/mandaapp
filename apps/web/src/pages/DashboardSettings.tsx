import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/api/useSettings';
import { settingsService } from '../lib/services/settings';
import { API_BASE_URL } from '../lib/api';

type TabId = 'identity' | 'logo' | 'social' | 'map' | 'links' | 'system';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  {
    id: 'identity',
    label: 'Identitas Sekolah',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
  },
  {
    id: 'logo',
    label: 'Logo Sekolah',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
    ),
  },
  {
    id: 'social',
    label: 'Media Sosial',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M2 8c0-2.2.7-4.3 2-6"/><path d="M22 8a10 10 0 0 0-2-6"/></svg>
    ),
  },
  {
    id: 'map',
    label: 'Lokasi & Peta',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    ),
  },
  {
    id: 'links',
    label: 'Website Terkait',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    ),
  },
  {
    id: 'system',
    label: 'Pengaturan Sistem',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    ),
  },
];

// Field definitions per group
const identityFields = [
  { key: 'school_name', label: 'Nama Sekolah', placeholder: 'MAN 2 Lombok Timur' },
  { key: 'school_subtitle', label: 'Subtitle / Tagline', placeholder: 'Madrasah Aliyah Negeri 2 Lombok Timur' },
  { key: 'address', label: 'Alamat', placeholder: 'Jln. Pendidikan No. 1, Selong' },
  { key: 'postal_code', label: 'Kode Pos', placeholder: '83612' },
  { key: 'district_city', label: 'Kabupaten / Kota', placeholder: 'Lombok Timur' },
  { key: 'province', label: 'Provinsi', placeholder: 'Nusa Tenggara Barat' },
  { key: 'phone', label: 'No. Telepon', placeholder: '0376-21xxx' },
  { key: 'email', label: 'Email Sekolah', placeholder: 'info@man2lotim.sch.id', type: 'email' },
  { key: 'npsn', label: 'NPSN', placeholder: '20xxxxxx' },
  { key: 'nsm', label: 'NSM', placeholder: '131xxxxxxxxxxxxx' },
  { key: 'accreditation', label: 'Akreditasi', placeholder: 'A' },
  { key: 'year_established', label: 'Tahun Berdiri', placeholder: '1990' },
  { key: 'principal_name', label: 'Nama Kepala Sekolah', placeholder: 'Drs. H. ...' },
  { key: 'principal_nip', label: 'NIP Kepala Sekolah', placeholder: '19xxxxxxxxxx' },
];

const socialFields = [
  { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...', icon: '📘' },
  { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...', icon: '📷' },
  { key: 'twitter_url', label: 'Twitter / X', placeholder: 'https://x.com/...', icon: '🐦' },
  { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/@...', icon: '🎬' },
  { key: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@...', icon: '🎵' },
  { key: 'whatsapp_number', label: 'WhatsApp', placeholder: '628xxxxxxxxxx', icon: '💬' },
  { key: 'telegram_url', label: 'Telegram', placeholder: 'https://t.me/...', icon: '✈️' },
];

const systemFields = [
  { key: 'active_academic_year', label: 'Tahun Ajaran Aktif', placeholder: '2025/2026' },
  { key: 'active_semester', label: 'Semester Aktif', placeholder: 'Ganjil', type: 'select', options: ['Ganjil', 'Genap'] },
  { key: 'site_description', label: 'Deskripsi Website', placeholder: 'Sistem Informasi Manajemen ...' },
  { key: 'meta_keywords', label: 'Meta Keywords (SEO)', placeholder: 'MAN 2 Lombok Timur, sekolah, madrasah' },
  { key: 'footer_credit_text', label: 'Teks Credit Footer', placeholder: 'Powered by Humas Mandalotim' },
  { key: 'footer_credit_text', label: 'Teks Credit Footer', placeholder: 'Powered by Humas Mandalotim' },
  { key: 'primary_color', label: 'Warna Primer', placeholder: '#3B82F6', type: 'color' },
  { key: 'items_per_page', label: 'Items per Page', placeholder: '10', type: 'number' },
  { key: 'maintenance_mode', label: 'Mode Maintenance', type: 'toggle' },
  { key: 'allow_guest_contact', label: 'Izinkan Kontak Tamu', type: 'toggle' },
];

interface WebsiteLink {
  label: string;
  url: string;
}

// ── Standalone components (defined outside to avoid re-mount on every render) ──

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  options?: string[];
}) => {
  if (type === 'toggle') {
    return (
      <div className="flex items-center justify-between py-3">
        <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">{label}</label>
        <button
          onClick={() => onChange(value === 'true' ? 'false' : 'true')}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
            value === 'true' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
              value === 'true' ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow"
        >
          <option value="">— Pilih —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'color') {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">{label}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value || '#3B82F6'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border-light dark:border-border-dark cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow"
      />
    </div>
  );
};

const SaveButton = ({
  status,
  onClick,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error';
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={status === 'saving'}
    className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors duration-150 flex items-center gap-2 ${
      status === 'saved'
        ? 'bg-green-500 text-white'
        : status === 'error'
        ? 'bg-red-500 text-white'
        : 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md'
    } disabled:opacity-60`}
  >
    {status === 'saving' && (
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    )}
    {status === 'saved' && (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    )}
    {status === 'saving' ? 'Menyimpan...' : status === 'saved' ? 'Tersimpan!' : status === 'error' ? 'Gagal!' : 'Simpan Perubahan'}
  </button>
);

// ── Main Component ──

// Derive server base URL (remove /api suffix)
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

export const DashboardSettings = () => {
  const { queryAll, updateMutation } = useSettings();
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [websiteLinks, setWebsiteLinks] = useState<WebsiteLink[]>([]);
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [logoUploadStatus, setLogoUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [faviconUploadStatus, setFaviconUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Load settings into form data
  useEffect(() => {
    if (queryAll.data) {
      const data: Record<string, string> = {};
      queryAll.data.forEach((s: any) => {
        data[s.key] = s.value || '';
      });
      setFormData(data);

      // Parse website links
      try {
        const links = JSON.parse(data['related_websites'] || '[]');
        setWebsiteLinks(Array.isArray(links) ? links : []);
      } catch {
        setWebsiteLinks([]);
      }
    }
  }, [queryAll.data]);

  const getValue = (key: string) => formData[key] || '';
  const setValue = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (group: string, keys: string[]) => {
    setSaveStatus((p) => ({ ...p, [group]: 'saving' }));
    try {
      const settings = keys.map((key) => ({
        key,
        value: formData[key] || null,
        group,
      }));
      await updateMutation.mutateAsync(settings);
      setSaveStatus((p) => ({ ...p, [group]: 'saved' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, [group]: 'idle' })), 2500);
    } catch {
      setSaveStatus((p) => ({ ...p, [group]: 'error' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, [group]: 'idle' })), 3000);
    }
  };

  const handleSaveLinks = async () => {
    setSaveStatus((p) => ({ ...p, links: 'saving' }));
    try {
      await updateMutation.mutateAsync([
        { key: 'related_websites', value: JSON.stringify(websiteLinks), group: 'links' },
      ]);
      setSaveStatus((p) => ({ ...p, links: 'saved' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, links: 'idle' })), 2500);
    } catch {
      setSaveStatus((p) => ({ ...p, links: 'error' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, links: 'idle' })), 3000);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB.');
      return;
    }
    setLogoUploadStatus('uploading');
    try {
      const result = await settingsService.uploadLogo(file);
      setValue('logo_url', result.url);
      await queryAll.refetch();
      setTimeout(() => setLogoUploadStatus('idle'), 2500);
    } catch {
      setLogoUploadStatus('error');
      setTimeout(() => setLogoUploadStatus('idle'), 3000);
    }
  };

  const handleFaviconUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB.');
      return;
    }
    setFaviconUploadStatus('uploading');
    try {
      const result = await settingsService.uploadFavicon(file);
      setValue('favicon_url', result.url);
      await queryAll.refetch();
      setFaviconUploadStatus('done');
      setTimeout(() => setFaviconUploadStatus('idle'), 2500);
    } catch {
      setFaviconUploadStatus('error');
      setTimeout(() => setFaviconUploadStatus('idle'), 3000);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  };

  const handleFaviconDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFaviconUpload(file);
  };

  const handleRemoveFavicon = async () => {
    setSaveStatus((p) => ({ ...p, system: 'saving' }));
    try {
      await updateMutation.mutateAsync([{ key: 'favicon_url', value: null, group: 'system' }]);
      setValue('favicon_url', '');
      setSaveStatus((p) => ({ ...p, system: 'saved' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, system: 'idle' })), 2500);
    } catch {
      setSaveStatus((p) => ({ ...p, system: 'error' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, system: 'idle' })), 3000);
    }
  };

  const handleRemoveLogo = async () => {
    setSaveStatus((p) => ({ ...p, logo: 'saving' }));
    try {
      await updateMutation.mutateAsync([{ key: 'logo_url', value: null, group: 'logo' }]);
      setValue('logo_url', '');
      setSaveStatus((p) => ({ ...p, logo: 'saved' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, logo: 'idle' })), 2500);
    } catch {
      setSaveStatus((p) => ({ ...p, logo: 'error' }));
      setTimeout(() => setSaveStatus((p) => ({ ...p, logo: 'idle' })), 3000);
    }
  };

  const handleSaveGroup = (group: string) => {
    if (group === 'identity') handleSave('identity', identityFields.map((f) => f.key));
    else if (group === 'logo') handleSave('logo', ['logo_url']);
    else if (group === 'social') handleSave('social', socialFields.map((f) => f.key));
    else if (group === 'map') handleSave('map', ['map_embed_url', 'latitude', 'longitude']);
    else if (group === 'links') handleSaveLinks();
    else if (group === 'system') handleSave('system', systemFields.map((f) => f.key));
  };

  if (queryAll.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-text-primary dark:text-text-darkPrimary">
          Pengaturan Sistem
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Kelola identitas sekolah, media sosial, lokasi, dan konfigurasi sistem website.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation - Sidebar Style */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Tab: Identitas Sekolah */}
            {activeTab === 'identity' && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">🏫 Identitas Sekolah</h2>
                <p className="text-sm text-text-secondary mb-6">Informasi dasar tentang sekolah yang ditampilkan di website.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {identityFields.map((field) => (
                    <InputField
                      key={field.key}
                      label={field.label}
                      value={getValue(field.key)}
                      onChange={(val) => setValue(field.key, val)}
                      placeholder={field.placeholder}
                      type={(field as any).type || 'text'}
                    />
                  ))}
                </div>
                <div className="mt-8 flex justify-end">
                  <SaveButton status={saveStatus['identity'] || 'idle'} onClick={() => handleSaveGroup('identity')} />
                </div>
              </div>
            )}

            {/* Tab: Logo Sekolah */}
            {activeTab === 'logo' && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">🖼️ Logo Sekolah</h2>
                <p className="text-sm text-text-secondary mb-6">Upload file gambar logo sekolah.</p>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Logo Preview */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-44 h-44 rounded-2xl border-2 border-border-light dark:border-border-dark flex items-center justify-center bg-gray-50 dark:bg-[#111] overflow-hidden shadow-sm">
                      {getValue('logo_url') ? (
                        <img
                          src={getValue('logo_url').startsWith('/') ? `${SERVER_BASE_URL}${getValue('logo_url')}` : getValue('logo_url')}
                          alt="Logo Sekolah"
                          className="w-full h-full object-contain p-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-center text-text-secondary">
                          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 opacity-40"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          <p className="text-xs opacity-60">Belum ada logo</p>
                        </div>
                      )}
                    </div>
                    {getValue('logo_url') && (
                      <button
                        onClick={handleRemoveLogo}
                        className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        Hapus Logo
                      </button>
                    )}
                  </div>
                  {/* Upload Area */}
                  <div className="flex-1 w-full">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleLogoDrop}
                      onClick={() => logoInputRef.current?.click()}
                      className={`w-full py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${
                        isDragging
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-border-light dark:border-border-dark bg-gray-50 dark:bg-[#111] hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      {logoUploadStatus === 'uploading' ? (
                        <>
                          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                          <p className="text-sm text-primary font-medium">Mengupload...</p>
                        </>
                      ) : logoUploadStatus === 'done' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
                          <p className="text-sm text-green-600 font-medium">Logo berhasil diupload!</p>
                        </>
                      ) : logoUploadStatus === 'error' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                          <p className="text-sm text-red-500 font-medium">Gagal upload. Coba lagi.</p>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary opacity-60"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <div className="text-center">
                            <p className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">
                              {isDragging ? 'Lepaskan file di sini' : 'Klik atau seret file ke sini'}
                            </p>
                            <p className="text-xs text-text-secondary mt-1">PNG, JPG, SVG, WebP — Maks 5MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Media Sosial */}
            {activeTab === 'social' && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">📱 Media Sosial</h2>
                <p className="text-sm text-text-secondary mb-6">Link akun media sosial resmi sekolah.</p>
                <div className="space-y-5">
                  {socialFields.map((field) => (
                    <div key={field.key} className="flex items-start gap-3">
                      <span className="text-2xl mt-1 w-8 text-center shrink-0">{field.icon}</span>
                      <div className="flex-1">
                        <InputField
                          label={field.label}
                          value={getValue(field.key)}
                          onChange={(val) => setValue(field.key, val)}
                          placeholder={field.placeholder}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex justify-end">
                  <SaveButton status={saveStatus['social'] || 'idle'} onClick={() => handleSaveGroup('social')} />
                </div>
              </div>
            )}

            {/* Tab: Lokasi & Peta */}
            {activeTab === 'map' && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">📍 Lokasi & Peta</h2>
                <p className="text-sm text-text-secondary mb-6">Konfigurasi peta Google Maps yang ditampilkan di halaman kontak.</p>
                <div className="space-y-5">
                  <InputField
                    label="Google Maps Embed URL"
                    value={getValue('map_embed_url')}
                    onChange={(val) => setValue('map_embed_url', val)}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                  />
                  <div className="grid grid-cols-2 gap-5">
                    <InputField
                      label="Latitude"
                      value={getValue('latitude')}
                      onChange={(val) => setValue('latitude', val)}
                      placeholder="-8.620959"
                    />
                    <InputField
                      label="Longitude"
                      value={getValue('longitude')}
                      onChange={(val) => setValue('longitude', val)}
                      placeholder="116.536034"
                    />
                  </div>

                  {/* Map Preview */}
                  {getValue('map_embed_url') && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary mb-2 block">Preview Peta</label>
                      <div className="w-full h-64 rounded-xl overflow-hidden border border-border-light dark:border-border-dark bg-gray-100 dark:bg-gray-800">
                        <iframe
                          src={getValue('map_embed_url')}
                          className="w-full h-full"
                          style={{ border: 0 }}
                          allowFullScreen={false}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Google Maps Preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-8 flex justify-end">
                  <SaveButton status={saveStatus['map'] || 'idle'} onClick={() => handleSaveGroup('map')} />
                </div>
              </div>
            )}

            {/* Tab: Website Terkait */}
            {activeTab === 'links' && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">🔗 Website Terkait</h2>
                <p className="text-sm text-text-secondary mb-6">Daftar link website yang terkait dengan sekolah.</p>
                <div className="space-y-3">
                  {websiteLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-gray-50 dark:bg-[#111]">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => {
                            const updated = [...websiteLinks];
                            updated[index].label = e.target.value;
                            setWebsiteLinks(updated);
                          }}
                          placeholder="Nama Website"
                          className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-text-primary dark:text-text-darkPrimary text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const updated = [...websiteLinks];
                            updated[index].url = e.target.value;
                            setWebsiteLinks(updated);
                          }}
                          placeholder="https://..."
                          className="px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#0a0a0a] text-text-primary dark:text-text-darkPrimary text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-shadow"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setWebsiteLinks(websiteLinks.filter((_, i) => i !== index));
                        }}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setWebsiteLinks([...websiteLinks, { label: '', url: '' }])}
                    className="w-full py-3 rounded-lg border-2 border-dashed border-border-light dark:border-border-dark text-text-secondary hover:text-primary hover:border-primary dark:hover:border-primary text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Tambah Website
                  </button>
                </div>
                <div className="mt-8 flex justify-end">
                  <SaveButton status={saveStatus['links'] || 'idle'} onClick={() => handleSaveGroup('links')} />
                </div>
              </div>
            )}

            {/* Tab: Pengaturan Sistem */}
            {activeTab === 'system' && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-text-primary dark:text-text-darkPrimary mb-1">⚙️ Pengaturan Sistem</h2>
                <p className="text-sm text-text-secondary mb-6">Konfigurasi umum dan pengaturan teknis website.</p>
                
                {/* Favicon Upload Section */}
                <div className="mb-8 p-4 rounded-xl border border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-white/5">
                  <label className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary mb-3 block">Favicon Website</label>
                  <div className="flex flex-col sm:flex-row gap-6 items-start text-center sm:text-left">
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFaviconDrop}
                      onClick={() => faviconInputRef.current?.click()}
                      className={`w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center p-2 shadow-sm shrink-0 cursor-pointer transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark bg-white dark:bg-[#111] hover:border-primary/50'
                      }`}
                    >
                      {getValue('favicon_url') ? (
                        <img 
                          src={getValue('favicon_url').startsWith('/') ? `${SERVER_BASE_URL}${getValue('favicon_url')}` : getValue('favicon_url')} 
                          alt="Favicon" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-secondary opacity-40"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept=".ico,.png,.jpg,.jpeg,.svg,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFaviconUpload(file);
                            e.target.value = '';
                          }}
                        />
                        <button
                          onClick={() => faviconInputRef.current?.click()}
                          disabled={faviconUploadStatus === 'uploading'}
                          className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                          {faviconUploadStatus === 'uploading' ? 'Mengupload...' : 'Ganti Favicon'}
                        </button>
                        {getValue('favicon_url') && (
                          <button
                            onClick={handleRemoveFavicon}
                            className="px-4 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary italic">Disarankan format .ico atau .png transparan (Maks 2MB)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {systemFields.map((field) => (
                    <InputField
                      key={field.key}
                      label={field.label}
                      value={getValue(field.key)}
                      onChange={(val) => setValue(field.key, val)}
                      placeholder={field.placeholder}
                      type={field.type || 'text'}
                      options={(field as any).options}
                    />
                  ))}
                </div>
                <div className="mt-8 flex justify-end">
                  <SaveButton status={saveStatus['system'] || 'idle'} onClick={() => handleSaveGroup('system')} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
