import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Edit2, Check, X, Loader2, Settings } from 'lucide-react';

type SubjectGroup = 'Kelompok A (Wajib)' | 'KLP B (Wajib)' | 'IPA (Peminatan)' | 'IPS (Peminatan)' | 'BAHASA (Peminatan)' | 'AGAMA (Peminatan)' | 'LM';

interface Subject {
  id?: string;
  name: string;
  group: SubjectGroup | string;
  orderNum: number;
}

export const SettingsTab = () => {
  const [reportWeight, setReportWeight] = useState(60);
  const [examWeight, setExamWeight] = useState(40);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Subject | null>(null);

  // We should ideally fetch the current active academic year ID from context/API
  // For demo, we use a placeholder or the first active year
  const activeYearId = "dummy-year-id"; 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch settings
      // We pass a dummy academicYearId for now, but in reality it should be the active one
      const settingsResult = await apiClient<any>(`/ijazah/settings?academicYearId=${activeYearId}`).catch(() => null);
      if (settingsResult) {
        setReportWeight(settingsResult.reportWeight || 60);
        setExamWeight(settingsResult.examWeight || 40);
      }

      // 2. Fetch subjects
      const subjectsResult = await apiClient<Subject[]>('/ijazah/subjects').catch(() => []);
      setSubjects(subjectsResult);
    } catch (err) {
      toast.error('Gagal memuat data pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (reportWeight + examWeight !== 100) {
      return toast.error('Total persentase bobot harus 100%');
    }
    
    setIsSavingSettings(true);
    try {
      await apiClient('/ijazah/settings', {
        method: 'POST',
        data: {
          academicYearId: activeYearId,
          reportWeight,
          examWeight
        }
      });
      toast.success('Pengaturan bobot berhasil disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan bobot');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddSubject = () => {
    const newSubj: Subject = {
      id: `new-${Date.now()}`,
      name: '',
      group: 'Kelompok A (Wajib)',
      orderNum: subjects.length > 0 ? Math.max(...subjects.map(s => s.orderNum)) + 1 : 1
    };
    setSubjects([...subjects, newSubj]);
    setEditingId(newSubj.id!);
    setEditForm(newSubj);
  };

  const handleSaveSubject = async () => {
    if (!editForm || !editForm.name) {
      return toast.error('Nama mata pelajaran wajib diisi');
    }
    
    try {
      // If it's a new unsaved row (id starts with new-), we don't send id
      const payload = { ...editForm };
      if (payload.id?.startsWith('new-')) {
        delete payload.id;
      }

      await apiClient('/ijazah/subjects', {
        method: 'POST',
        data: payload
      });
      
      toast.success('Mata pelajaran disimpan');
      setEditingId(null);
      fetchData(); // reload
    } catch (err) {
      toast.error('Gagal menyimpan mata pelajaran');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (id.startsWith('new-')) {
      setSubjects(subjects.filter(s => s.id !== id));
      return;
    }

    if (confirm('Yakin ingin menghapus mapel ini?')) {
      try {
        await apiClient(`/ijazah/subjects/${id}`, { method: 'DELETE' });
        toast.success('Mata pelajaran dihapus');
        fetchData();
      } catch (err) {
        toast.error('Gagal menghapus mata pelajaran');
      }
    }
  };

  const GROUPS = ['Kelompok A (Wajib)', 'KLP B (Wajib)', 'IPA (Peminatan)', 'IPS (Peminatan)', 'BAHASA (Peminatan)', 'AGAMA (Peminatan)', 'LM'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin text-emerald-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Section 1: Pengaturan Bobot */}
      <div className="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-[#333]">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-text-primary dark:text-text-darkPrimary">
          <Settings size={16} className="text-emerald-500" />
          Pengaturan Bobot Penilaian
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Bobot Rata-rata Raport (Sem 1-5)</label>
            <div className="relative">
              <input 
                type="number" 
                min="0" max="100"
                value={reportWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setReportWeight(val);
                  setExamWeight(100 - val);
                }}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-[#444] rounded-lg bg-white dark:bg-[#1a1a1a] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Bobot Ujian Madrasah / AM</label>
            <div className="relative">
              <input 
                type="number" 
                min="0" max="100"
                value={examWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setExamWeight(val);
                  setReportWeight(100 - val);
                }}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-[#444] rounded-lg bg-white dark:bg-[#1a1a1a] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">%</span>
            </div>
          </div>
          <div>
            <button 
              onClick={saveSettings}
              disabled={isSavingSettings}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Bobot
            </button>
          </div>
        </div>
        
        {reportWeight + examWeight !== 100 && (
          <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
            <X size={12} /> Total bobot harus tepat 100%. Saat ini {reportWeight + examWeight}%.
          </p>
        )}
      </div>

      {/* Section 2: Manajemen Mata Pelajaran */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Struktur Mata Pelajaran</h3>
            <p className="text-xs text-gray-500">Susun mata pelajaran sesuai dengan urutan pada format rapor ijazah (Permendikbud/KMA terbaru).</p>
          </div>
          <button 
            onClick={handleAddSubject}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
          >
            <Plus size={14} /> Tambah Mapel
          </button>
        </div>

        <div className="border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#111]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-[#333]">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-16 text-center">Urut</th>
                <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-1/3">Kelompok</th>
                <th className="px-4 py-3 font-semibold text-xs text-gray-500">Mata Pelajaran</th>
                <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Belum ada mata pelajaran. Silakan tambahkan.
                  </td>
                </tr>
              ) : subjects.map((subj) => {
                const isEditing = editingId === subj.id;
                
                return (
                  <tr key={subj.id} className={isEditing ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors'}>
                    {isEditing ? (
                      <>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            className="w-16 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black"
                            value={editForm?.orderNum || 0}
                            onChange={(e) => setEditForm({...editForm!, orderNum: parseInt(e.target.value) || 0})}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select 
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black"
                            value={editForm?.group || ''}
                            onChange={(e) => setEditForm({...editForm!, group: e.target.value})}
                          >
                            {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="text" 
                            placeholder="Nama Mata Pelajaran"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black"
                            value={editForm?.name || ''}
                            onChange={(e) => setEditForm({...editForm!, name: e.target.value})}
                            autoFocus
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={handleSaveSubject} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"><Check size={16} /></button>
                            <button onClick={() => {
                              if (subj.id?.startsWith('new-')) {
                                setSubjects(subjects.filter(s => s.id !== subj.id));
                              }
                              setEditingId(null);
                            }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-center text-gray-500 font-mono">{subj.orderNum}</td>
                        <td className="px-4 py-3 font-medium">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-gray-100 text-gray-600 dark:bg-[#222] dark:text-gray-300">
                            {subj.group}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-text-primary dark:text-text-darkPrimary">{subj.name}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingId(subj.id!); setEditForm(subj); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteSubject(subj.id!)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
