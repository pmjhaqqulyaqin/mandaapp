import React, { useState } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Edit2, Trash2, Plus } from 'lucide-react';
import type { ClassItem, Major } from './types';

interface Props {
  classes: ClassItem[];
  majors: Major[];
  teachers: any[];
  students: any[];
  loading: boolean;
  onRefresh: () => void;
  apiClient: any;
}

// Get grade level from class name (e.g., "X RPL 1" → "X")
const getGradeLevel = (name: string): string => {
  const n = name.trim().toUpperCase();
  if (n.startsWith('XII')) return 'XII';
  if (n.startsWith('XI')) return 'XI';
  if (n.startsWith('X')) return 'X';
  return name;
};

const GRADE_COLORS: Record<string, string> = {
  'X': 'from-blue-500 to-blue-600',
  'XI': 'from-emerald-500 to-emerald-600',
  'XII': 'from-amber-500 to-amber-600',
};

export const ClassMajorView: React.FC<Props> = ({ classes, majors, teachers, students, loading, onRefresh, apiClient }) => {
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [majorForm, setMajorForm] = useState({ id: '', name: '' });
  const [isEditingMajor, setIsEditingMajor] = useState(false);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ id: '', name: '', majorId: '', homeroomTeacherId: '' });
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [saving, setSaving] = useState(false);

  // Group classes by grade level
  const gradeGroups = classes.reduce<Record<string, ClassItem[]>>((acc, cls) => {
    const level = getGradeLevel(cls.name);
    if (!acc[level]) acc[level] = [];
    acc[level].push(cls);
    return acc;
  }, {});

  // Count students per grade & per major
  const studentCountByGrade = (grade: string) => {
    const classIds = (gradeGroups[grade] || []).map(c => c.id);
    return students.filter(s => classIds.includes(s.classId)).length;
  };

  const studentCountByMajor = (majorId: string) => {
    const classIds = classes.filter(c => c.majorId === majorId).map(c => c.id);
    return students.filter(s => classIds.includes(s.classId)).length;
  };

  const maxMajorStudents = Math.max(...majors.map(m => studentCountByMajor(m.id)), 1);

  // Handlers
  const openMajorModal = (major?: Major) => {
    if (major) { setIsEditingMajor(true); setMajorForm({ id: major.id, name: major.name }); }
    else { setIsEditingMajor(false); setMajorForm({ id: '', name: '' }); }
    setIsMajorModalOpen(true);
  };

  const submitMajor = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (isEditingMajor) await apiClient(`/majors/${majorForm.id}`, { method: 'PUT', data: { name: majorForm.name } });
      else await apiClient('/majors', { method: 'POST', data: { name: majorForm.name } });
      setIsMajorModalOpen(false); onRefresh();
    } catch (err: any) { alert('Gagal: ' + err.message); }
    finally { setSaving(false); }
  };

  const deleteMajor = async (id: string, name: string) => {
    const count = studentCountByMajor(id);
    if (count > 0) { alert(`Tidak bisa hapus "${name}" karena masih memiliki ${count} siswa aktif.`); return; }
    if (!window.confirm(`Hapus jurusan "${name}"?`)) return;
    try { await apiClient(`/majors/${id}`, { method: 'DELETE' }); onRefresh(); }
    catch (err: any) { alert('Gagal: ' + err.message); }
  };

  const openClassModal = (cls?: ClassItem) => {
    if (cls) { setIsEditingClass(true); setClassForm({ id: cls.id, name: cls.name, majorId: cls.majorId, homeroomTeacherId: cls.homeroomTeacherId || '' }); }
    else { setIsEditingClass(false); setClassForm({ id: '', name: '', majorId: '', homeroomTeacherId: '' }); }
    setIsClassModalOpen(true);
  };

  const submitClass = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const data = { ...classForm }; if (!data.homeroomTeacherId) delete (data as any).homeroomTeacherId;
    try {
      if (isEditingClass) await apiClient(`/classes/${classForm.id}`, { method: 'PUT', data });
      else await apiClient('/classes', { method: 'POST', data });
      setIsClassModalOpen(false); onRefresh();
    } catch (err: any) { alert('Gagal: ' + err.message); }
    finally { setSaving(false); }
  };

  const deleteClass = async (id: string, name: string) => {
    const count = students.filter(s => s.classId === id).length;
    if (count > 0) { alert(`Tidak bisa hapus kelas "${name}" karena masih memiliki ${count} siswa.`); return; }
    if (!window.confirm(`Hapus kelas "${name}"?`)) return;
    try { await apiClient(`/classes/${id}`, { method: 'DELETE' }); onRefresh(); }
    catch (err: any) { alert('Gagal: ' + err.message); }
  };

  const gradeOrder = ['X', 'XI', 'XII'];
  const sortedGrades = Object.keys(gradeGroups).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

  return (
    <div className="space-y-6">
      {/* Daftar Kelas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Daftar Kelas</h2>
          </div>
          <Button size="sm" className="flex items-center gap-1.5" onClick={() => openClassModal()}>
            <Plus size={14} /> Tambah Kelas
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedGrades.map(grade => {
            const classesInGrade = gradeGroups[grade];
            const count = studentCountByGrade(grade);
            const rombel = classesInGrade.length;
            const gradientClass = GRADE_COLORS[grade] || 'from-gray-500 to-gray-600';
            const labels: Record<string, string> = { 'X': 'Kelas Sepuluh', 'XI': 'Kelas Sebelas', 'XII': 'Kelas Dua Belas' };
            return (
              <div key={grade} className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-4 hover:shadow-md transition-all duration-300 group">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${gradientClass} text-white font-bold text-sm mb-3`}>
                  {grade}
                </div>
                <h3 className="font-semibold text-text-primary dark:text-text-darkPrimary text-sm">{labels[grade] || `Kelas ${grade}`}</h3>
                <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  {count} Total Siswa
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-[#222]">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{rombel} ROMBEL</span>
                  <button className="text-xs text-primary font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {}}>Detail Kelas</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daftar Jurusan */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
            <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Daftar Jurusan</h2>
          </div>
          <Button size="sm" className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => openMajorModal()}>
            <Plus size={14} /> Tambah Jurusan
          </Button>
        </div>
        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#222] text-[10px] uppercase tracking-wider text-text-secondary">
                <th className="py-3 px-4 font-semibold">Kode</th>
                <th className="py-3 px-4 font-semibold">Nama Jurusan</th>
                <th className="py-3 px-4 font-semibold">Jumlah Siswa</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {majors.map((m, idx) => {
                const count = studentCountByMajor(m.id);
                const pct = Math.round((count / maxMajorStudents) * 100);
                return (
                  <tr key={m.id} className="group border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                    <td className="py-3 px-4 text-xs text-text-secondary font-mono">J-{String(idx + 1).padStart(3, '0')}</td>
                    <td className="py-3 px-4 text-sm font-medium text-primary hover:underline cursor-pointer">{m.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-text-primary dark:text-text-darkPrimary min-w-[60px]">{count} Siswa</span>
                        <div className="flex-1 max-w-[120px] bg-gray-200 dark:bg-[#222] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openMajorModal(m)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => deleteMajor(m.id, m.name)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {majors.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-xs">Belum ada jurusan</td></tr>}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-[#222] text-xs text-text-secondary">
            Menampilkan {majors.length} dari {majors.length} Jurusan Terdaftar
          </div>
        </div>
      </div>

      {/* Major Modal */}
      <Modal isOpen={isMajorModalOpen} onClose={() => setIsMajorModalOpen(false)} title={isEditingMajor ? "Edit Jurusan" : "Tambah Jurusan Baru"}>
        <form onSubmit={submitMajor} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Jurusan*</label>
            <Input required placeholder="Rekayasa Perangkat Lunak" value={majorForm.name} onChange={e => setMajorForm({ ...majorForm, name: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
            <Button type="button" variant="ghost" onClick={() => setIsMajorModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Jurusan'}</Button>
          </div>
        </form>
      </Modal>

      {/* Class Modal */}
      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title={isEditingClass ? "Edit Kelas" : "Tambah Kelas Baru"}>
        <form onSubmit={submitClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Kelas*</label>
            <Input required placeholder="X RPL 1" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Pilih Jurusan*</label>
            <select required className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={classForm.majorId} onChange={e => setClassForm({ ...classForm, majorId: e.target.value })}>
              <option value="" disabled>Pilih Jurusan...</option>
              {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Wali Kelas (Opsional)</label>
            <select className="w-full h-10 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={classForm.homeroomTeacherId} onChange={e => setClassForm({ ...classForm, homeroomTeacherId: e.target.value })}>
              <option value="">-- Kosongkan --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#222]">
            <Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Kelas'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
