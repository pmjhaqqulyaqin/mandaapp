import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Input } from '@mandaapp/ui/src/components/Input';
import { User, GraduationCap, MapPin, Info, Loader2 } from 'lucide-react';
import type { ClassItem, Major } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  majors: Major[];
  apiClient: any;
  onSuccess: () => void;
  editStudent?: any;
}

const INITIAL_FORM = {
  fullName: '', nisn: '', nis: '', gender: '', birthPlace: '', birthDate: '', className: '', address: ''
};

export const AddStudentModal: React.FC<Props> = ({ isOpen, onClose, classes, majors, apiClient, onSuccess, editStudent }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && editStudent) {
      setForm({
        fullName: editStudent.fullName || '',
        nisn: editStudent.nisn || '',
        nis: editStudent.nis || '',
        gender: editStudent.gender || '',
        birthPlace: editStudent.birthPlace || '',
        birthDate: editStudent.birthDate ? editStudent.birthDate.split('T')[0] : '',
        className: editStudent.className || '',
        address: editStudent.address || '',
      });
    } else if (isOpen) {
      setForm(INITIAL_FORM);
    }
  }, [isOpen, editStudent]);

  const isEditing = !!editStudent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await apiClient(`/students/${editStudent.id}`, { method: 'PUT', data: form });
      } else {
        await apiClient('/students', { method: 'POST', data: form });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Gagal ${isEditing ? 'mengupdate' : 'menambah'} siswa: ` + err.message);
    } finally { setSaving(false); }
  };

  const classOptions = classes.map(c => {
    const major = majors.find(m => m.id === c.majorId);
    return { ...c, label: major ? `${c.name} ${major.name}` : c.name };
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

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={isEditing ? "Edit Data Siswa" : "Tambah Siswa Baru"}
      description={isEditing ? "Perbarui informasi data siswa." : "Pendaftaran data diri tunggal siswa untuk registrasi baru. Pastikan semua data valid sesuai dokumen resmi."}
      className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A: Data Pribadi */}
        <div>
          <SectionHeader icon={<User size={16} className="text-primary" />} title="Data Pribadi"
            subtitle="Informasi identitas dasar calon/aktif siswa." color="bg-primary/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Nama Lengkap Siswa *</label>
              <Input required placeholder="Contoh: Muhammad Rizky Pratama" value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })} />
              <p className="text-[10px] text-text-secondary">Nama sesuai akta kelahiran/ijazah terakhir</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">NISN</label>
              <Input placeholder="10 digit NISN" maxLength={10} value={form.nisn}
                onChange={e => setForm({ ...form, nisn: e.target.value.replace(/\D/g, '') })} />
              <p className="text-[10px] text-text-secondary">Cek NISN di referensi.data.kemdikbud.go.id</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">NIS</label>
              <Input placeholder="Input NIS/ Dihasilkan" value={form.nis}
                onChange={e => setForm({ ...form, nis: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Jenis Kelamin</label>
              <div className="flex gap-4 h-10 items-center">
                {['Laki-laki', 'Perempuan'].map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value={g} checked={form.gender === g}
                      onChange={() => setForm({ ...form, gender: g })}
                      className="accent-primary w-4 h-4" />
                    <span className="text-sm text-text-primary dark:text-text-darkPrimary">{g}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Tempat Lahir</label>
              <Input placeholder="Kota/Kabupaten" value={form.birthPlace}
                onChange={e => setForm({ ...form, birthPlace: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Tanggal Lahir</label>
              <Input type="date" value={form.birthDate}
                onChange={e => setForm({ ...form, birthDate: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Section B: Data Akademik */}
        <div>
          <SectionHeader icon={<GraduationCap size={16} className="text-emerald-600" />} title="Data Akademik"
            subtitle="Informasi kelas dan jurusan." color="bg-emerald-500/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Kelas</label>
              <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.className} onChange={e => setForm({ ...form, className: e.target.value })}>
                <option value="">Pilih Tingkat Kelas</option>
                {classOptions.map(c => <option key={c.id} value={c.name}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Section C: Alamat */}
        <div>
          <SectionHeader icon={<MapPin size={16} className="text-violet-600" />} title="Alamat Tinggal"
            subtitle="Informasi alamat domisili siswa saat ini." color="bg-violet-500/10" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Alamat Lengkap</label>
            <textarea className="w-full rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none"
              placeholder="Nama jalan, nomor rumah, RT/RW..."
              value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#222]">
          <p className="text-[11px] text-text-secondary flex items-center gap-1">
            <Info size={12} /> Kolom yang ditandai (*) wajib diisi sebelum menyimpan data siswa.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEditing ? 'Simpan Perubahan' : 'Simpan Data Siswa'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
