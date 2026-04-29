import React, { useState } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Modal } from '@mandaapp/ui/src/components/Modal';
import { Edit2, Trash2, Plus } from 'lucide-react';
import type { ClassItem } from './types';

interface Props {
  classes: ClassItem[];
  teachers: any[];
  students: any[];
  loading: boolean;
  onRefresh: () => void;
  apiClient: any;
  onViewDetails?: (grade: string) => void;
}

// Get grade level from class name (e.g., "XI IPA 1" → "XI")
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

export const ClassMajorView: React.FC<Props> = ({ classes, teachers, students, onRefresh, apiClient, onViewDetails }) => {
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ id: '', name: '', homeroomTeacherId: '' });
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [saving, setSaving] = useState(false);

  // Group classes by grade level
  const gradeGroups = classes.reduce<Record<string, ClassItem[]>>((acc, cls) => {
    const level = getGradeLevel(cls.name);
    if (!acc[level]) acc[level] = [];
    acc[level].push(cls);
    return acc;
  }, {});

  // Count students per grade
  const studentCountByGrade = (grade: string) => {
    const classIds = (gradeGroups[grade] || []).map(c => c.id);
    return students.filter(s => classIds.includes(s.classId)).length;
  };

  // Count students per class
  const studentCountByClass = (classId: string) => {
    return students.filter(s => s.classId === classId).length;
  };

  // Handlers
  const openClassModal = (cls?: ClassItem) => {
    if (cls) { setIsEditingClass(true); setClassForm({ id: cls.id, name: cls.name, homeroomTeacherId: cls.homeroomTeacherId || '' }); }
    else { setIsEditingClass(false); setClassForm({ id: '', name: '', homeroomTeacherId: '' }); }
    setIsClassModalOpen(true);
  };

  const submitClass = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const data: any = { name: classForm.name };
    if (classForm.homeroomTeacherId) data.homeroomTeacherId = classForm.homeroomTeacherId;
    try {
      if (isEditingClass) await apiClient(`/classes/${classForm.id}`, { method: 'PUT', data });
      else await apiClient('/classes', { method: 'POST', data });
      setIsClassModalOpen(false); onRefresh();
    } catch (err: any) { alert('Gagal: ' + err.message); }
    finally { setSaving(false); }
  };

  const deleteClass = async (id: string, name: string) => {
    const count = studentCountByClass(id);
    if (count > 0) { alert(`Tidak bisa hapus "${name}" karena masih memiliki ${count} siswa aktif.`); return; }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedGrades.map(grade => {
            const classesInGrade = gradeGroups[grade];
            const count = studentCountByGrade(grade);
            const rombel = classesInGrade.length;
            const gradientClass = GRADE_COLORS[grade] || 'from-gray-500 to-gray-600';
            const labels: Record<string, string> = { 'X': 'Kelas Sepuluh', 'XI': 'Kelas Sebelas', 'XII': 'Kelas Dua Belas' };
            return (
              <div key={grade} className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] p-3 hover:shadow-md transition-all duration-300 group">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${gradientClass} text-white font-bold text-xs mb-2.5`}>
                  {grade}
                </div>
                <h3 className="font-semibold text-text-primary dark:text-text-darkPrimary text-[13px] leading-snug">{labels[grade] || `Kelas ${grade}`}</h3>
                <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  {count} Total Siswa
                </p>
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100 dark:border-[#222]">
                  <span className="text-[9.5px] font-semibold text-primary uppercase tracking-wider">{rombel} ROMBEL</span>
                  <button className="text-[11.5px] text-primary font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onViewDetails?.(grade)}>Detail Kelas</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Kelas List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-emerald-500 rounded-full" />
          <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Semua Kelas Terdaftar</h2>
        </div>
        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#222] text-[9.5px] uppercase tracking-wider text-text-secondary">
                <th className="py-2.5 px-3 font-semibold">No</th>
                <th className="py-2.5 px-3 font-semibold">Nama Kelas</th>
                <th className="py-2.5 px-3 font-semibold">Wali Kelas</th>
                <th className="py-2.5 px-3 font-semibold">Jumlah Siswa</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, idx) => {
                const count = studentCountByClass(cls.id);
                const maxStudents = Math.max(...classes.map(c => studentCountByClass(c.id)), 1);
                const pct = Math.round((count / maxStudents) * 100);
                return (
                  <tr key={cls.id} className="group border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50/50 dark:hover:bg-[#0a0a0a] transition-colors">
                    <td className="py-2 px-3 text-[11px] text-text-secondary font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 text-[13px] font-semibold text-primary">{cls.name}</td>
                    <td className="py-2 px-3 text-[12px] text-text-secondary">{cls.homeroomTeacherName || '-'}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-medium text-text-primary dark:text-text-darkPrimary min-w-[60px]">{count} Siswa</span>
                        <div className="flex-1 max-w-[120px] bg-gray-200 dark:bg-[#222] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openClassModal(cls)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-blue-500 transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => deleteClass(cls.id, cls.name)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {classes.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-xs">Belum ada kelas terdaftar</td></tr>}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-[#222] text-xs text-text-secondary">
            Menampilkan {classes.length} dari {classes.length} Kelas Terdaftar
          </div>
        </div>
      </div>

      {/* Class Modal */}
      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title={isEditingClass ? "Edit Kelas" : "Tambah Kelas Baru"}>
        <form onSubmit={submitClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Kelas+Jurusan *</label>
            <Input required placeholder="Contoh: XI IPA, X-4, XII IPS 1" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
            <p className="text-[10px] text-text-secondary mt-1">Tulis langsung nama kelas beserta jurusannya, misal: XI IPA, X-4, XII IPS 1</p>
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
