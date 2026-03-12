import React, { useState } from 'react';

export interface StudentFormData {
  name: string;
  nisn: string;
  className: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
}

export interface StudentIdentityFormProps {
  initialData: StudentFormData;
  onSubmit: (data: StudentFormData) => void;
  mode: 'edit' | 'review';
  disabled?: boolean;
}

export const StudentIdentityForm = ({ initialData, onSubmit, mode, disabled }: StudentIdentityFormProps) => {
  const [formData, setFormData] = useState<StudentFormData>(initialData);

  const handleChange = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inputClass = `w-full px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark 
    bg-white dark:bg-[#111] text-text-primary dark:text-text-darkPrimary
    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
    disabled:opacity-50 disabled:cursor-not-allowed transition-colors`;

  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nama Lengkap</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            disabled={disabled || mode === 'review'}
            required
          />
        </div>
        <div>
          <label className={labelClass}>NISN</label>
          <input
            type="text"
            value={formData.nisn}
            onChange={(e) => handleChange('nisn', e.target.value)}
            className={inputClass}
            disabled={disabled || mode === 'review'}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Kelas</label>
          <input
            type="text"
            value={formData.className}
            onChange={(e) => handleChange('className', e.target.value)}
            className={inputClass}
            disabled={disabled || mode === 'review'}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Jenis Kelamin</label>
          <select
            value={formData.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
            className={inputClass}
            disabled={disabled || mode === 'review'}
          >
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Tempat Lahir</label>
          <input
            type="text"
            value={formData.birthPlace}
            onChange={(e) => handleChange('birthPlace', e.target.value)}
            className={inputClass}
            disabled={disabled || mode === 'review'}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Tanggal Lahir</label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            className={inputClass}
            disabled={disabled || mode === 'review'}
            required
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Alamat</label>
        <textarea
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          rows={2}
          className={inputClass + ' resize-none'}
          disabled={disabled || mode === 'review'}
          required
        />
      </div>

      {mode === 'edit' && !disabled && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Simpan Perubahan
          </button>
        </div>
      )}
    </form>
  );
};
