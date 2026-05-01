import React, { useState, useEffect, useRef } from 'react';
import { apiClient, API_BASE_URL } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Edit2, Check, X, Loader2, Settings, Download, Upload, Map as MapIcon, Database } from 'lucide-react';

interface Subject {
  id?: string;
  name: string;
  group: string;
  orderNum: number;
}

interface Mapping {
  id?: string;
  subjectId: string;
  classIds: string[];
  sem1: boolean;
  sem2: boolean;
  sem3: boolean;
  sem4: boolean;
  sem5: boolean;
  um: boolean;
}

interface ClassData {
  id: string;
  name: string;
}

const GROUPS = [
  'Kelompok A',
  'Kelompok B',
  'Muatan Lokal',
  'Mapel Pilihan',
];

export const SettingsTab = () => {
  const [reportWeight, setReportWeight] = useState(60);
  const [examWeight, setExamWeight] = useState(40);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'master' | 'mapping'>('master');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);

  // Master Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Subject | null>(null);

  // Mapping Edit State
  const [mappingEditId, setMappingEditId] = useState<string | null>(null);
  const [mappingForm, setMappingForm] = useState<Mapping | null>(null);

  const [isUploadingSubjects, setIsUploadingSubjects] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const settingsResult = await apiClient<any>('/ijazah/settings').catch(() => null);
      if (settingsResult) {
        setReportWeight(settingsResult.reportWeight || 60);
        setExamWeight(settingsResult.examWeight || 40);
      }
      
      const [classesRes, subjectsRes, mappingsRes] = await Promise.all([
        apiClient<ClassData[]>('/ijazah/classes').catch(() => []),
        apiClient<Subject[]>('/ijazah/subjects').catch(() => []),
        apiClient<Mapping[]>('/ijazah/mappings').catch(() => [])
      ]);
      
      setClasses(classesRes);
      setSubjects(subjectsRes);
      setMappings(mappingsRes);
    } catch (err) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const reloadMapelData = async () => {
    try {
      const [subjectsRes, mappingsRes] = await Promise.all([
        apiClient<Subject[]>('/ijazah/subjects').catch(() => []),
        apiClient<Mapping[]>('/ijazah/mappings').catch(() => [])
      ]);
      setSubjects(subjectsRes);
      setMappings(mappingsRes);
    } catch {}
  };

  const saveSettings = async () => {
    if (reportWeight + examWeight !== 100) return toast.error('Total persentase bobot harus 100%');
    setIsSavingSettings(true);
    try {
      await apiClient('/ijazah/settings', { method: 'POST', data: { reportWeight, examWeight } });
      toast.success('Pengaturan bobot berhasil disimpan');
    } catch { toast.error('Gagal menyimpan bobot'); }
    finally { setIsSavingSettings(false); }
  };

  // --- MASTER MAPEL ACTIONS ---
  const handleAddSubject = () => {
    const newSubj: Subject = {
      id: `new-${Date.now()}`, name: '', group: 'Kelompok A',
      orderNum: subjects.length > 0 ? Math.max(...subjects.map(s => s.orderNum || 0)) + 1 : 1
    };
    setSubjects([...subjects, newSubj]);
    setEditingId(newSubj.id!);
    setEditForm(newSubj);
  };

  const handleSaveSubject = async () => {
    if (!editForm || !editForm.name) return toast.error('Nama mata pelajaran wajib diisi');
    try {
      const payload = { ...editForm };
      if (payload.id?.startsWith('new-')) delete payload.id;
      await apiClient('/ijazah/subjects', { method: 'POST', data: payload });
      toast.success('Mata pelajaran disimpan');
      setEditingId(null);
      reloadMapelData();
    } catch { toast.error('Gagal menyimpan mata pelajaran'); }
  };

  const handleDeleteSubject = async (id: string) => {
    if (id.startsWith('new-')) { setSubjects(subjects.filter(s => s.id !== id)); return; }
    if (confirm('Yakin ingin menghapus mapel ini? Semua mapping & nilai terkait bisa terpengaruh.')) {
      try {
        await apiClient(`/ijazah/subjects/${id}`, { method: 'DELETE' });
        toast.success('Mata pelajaran dihapus');
        reloadMapelData();
      } catch { toast.error('Gagal menghapus mata pelajaran'); }
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ijazah/subjects/template`, { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Master_Mapel.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch { toast.error('Gagal mengunduh template'); }
    finally { setIsDownloadingTemplate(false); }
  };

  const handleUploadSubjects = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingSubjects(true);
    try {
      await apiClient('/ijazah/subjects/upload', { method: 'POST', data: formData, isFormData: true });
      toast.success('Mata pelajaran berhasil diimpor');
      reloadMapelData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal mengimpor mata pelajaran');
    } finally {
      setIsUploadingSubjects(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- MAPPING ACTIONS ---
  const handleEditMapping = (subjectId: string) => {
    const existing = mappings.find(m => m.subjectId === subjectId);
    if (existing) {
      setMappingForm(existing);
    } else {
      setMappingForm({
        subjectId,
        classIds: [],
        sem1: false, sem2: false, sem3: false, sem4: false, sem5: false, um: false
      });
    }
    setMappingEditId(subjectId);
  };

  const handleSaveMapping = async () => {
    if (!mappingForm) return;
    try {
      await apiClient('/ijazah/mappings', { method: 'POST', data: mappingForm });
      toast.success('Pemetaan mapel berhasil disimpan');
      setMappingEditId(null);
      reloadMapelData();
    } catch { toast.error('Gagal menyimpan pemetaan'); }
  };

  const setGlobalMapping = async (subjectId: string) => {
    try {
      const payload = {
        subjectId, classIds: [],
        sem1: true, sem2: true, sem3: true, sem4: true, sem5: true, um: true
      };
      await apiClient('/ijazah/mappings', { method: 'POST', data: payload });
      toast.success('Diset Global ke Semua Semester');
      reloadMapelData();
    } catch { toast.error('Gagal menset global'); }
  };

  const toggleClass = (classId: string) => {
    if (!mappingForm) return;
    const current = mappingForm.classIds || [];
    if (current.includes(classId)) {
      setMappingForm({ ...mappingForm, classIds: current.filter(id => id !== classId) });
    } else {
      setMappingForm({ ...mappingForm, classIds: [...current, classId] });
    }
  };

  if (loading) {
    return (<div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Pengaturan Bobot */}
      <div className="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-[#333]">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-text-primary dark:text-text-darkPrimary">
          <Settings size={16} className="text-emerald-500" />
          Pengaturan Bobot Penilaian
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Bobot Rata-rata Raport (Sem 1-5)</label>
            <div className="relative">
              <input type="number" min="0" max="100" value={reportWeight}
                onChange={(e) => { const val = parseInt(e.target.value) || 0; setReportWeight(val); setExamWeight(100 - val); }}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-[#444] rounded-lg bg-white dark:bg-[#1a1a1a] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Bobot Ujian Madrasah / AM</label>
            <div className="relative">
              <input type="number" min="0" max="100" value={examWeight}
                onChange={(e) => { const val = parseInt(e.target.value) || 0; setExamWeight(val); setReportWeight(100 - val); }}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-[#444] rounded-lg bg-white dark:bg-[#1a1a1a] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">%</span>
            </div>
          </div>
          <div>
            <button onClick={saveSettings} disabled={isSavingSettings}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
              {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Bobot
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Layout for Subjects */}
      <div>
        <div className="flex border-b border-gray-200 dark:border-[#333] mb-6">
          <button onClick={() => setActiveTab('master')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'master' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Database size={16} /> Data Master Mapel
          </button>
          <button onClick={() => setActiveTab('mapping')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'mapping' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <MapIcon size={16} /> Pemetaan Kurikulum
          </button>
        </div>

        {activeTab === 'master' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Daftar Mata Pelajaran Murni</h3>
                <p className="text-xs text-gray-500">Input semua mapel sekolah. Jangan duplikasi nama mapel untuk semester berbeda.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownloadTemplate} disabled={isDownloadingTemplate}
                  className="px-3 py-1.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#222] text-xs font-semibold rounded flex items-center gap-1.5">
                  {isDownloadingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Template
                </button>
                <div className="relative">
                  <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleUploadSubjects} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingSubjects}
                    className="px-3 py-1.5 bg-violet-50 text-violet-600 dark:bg-violet-900/10 dark:text-violet-400 text-xs font-semibold rounded flex items-center gap-1.5">
                    {isUploadingSubjects ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import
                  </button>
                </div>
                <button onClick={handleAddSubject}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-semibold rounded flex items-center gap-1.5">
                  <Plus size={14} /> Tambah
                </button>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#111]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-[#333]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-16 text-center">Urut</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-1/3">Kelompok</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500">Nama Mapel</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500 w-24 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {subjects.map((subj) => {
                    const isEditing = editingId === subj.id;
                    return (
                      <tr key={subj.id} className={isEditing ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'}>
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2"><input type="number" className="w-16 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black" value={editForm?.orderNum || 0} onChange={(e) => setEditForm({...editForm!, orderNum: parseInt(e.target.value) || 0})} /></td>
                            <td className="px-4 py-2">
                              <select className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black" value={editForm?.group || ''} onChange={(e) => setEditForm({...editForm!, group: e.target.value})}>
                                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2"><input type="text" placeholder="Nama Mata Pelajaran" className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black" value={editForm?.name || ''} onChange={(e) => setEditForm({...editForm!, name: e.target.value})} autoFocus /></td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={handleSaveSubject} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded"><Check size={16} /></button>
                                <button onClick={() => { if (subj.id?.startsWith('new-')) setSubjects(subjects.filter(s => s.id !== subj.id)); setEditingId(null); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X size={16} /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-center text-gray-500">{subj.orderNum}</td>
                            <td className="px-4 py-3 font-medium"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-[#222] dark:text-gray-300">{subj.group}</span></td>
                            <td className="px-4 py-3 font-semibold text-text-primary dark:text-text-darkPrimary">{subj.name}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingId(subj.id!); setEditForm(subj); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                <button onClick={() => handleDeleteSubject(subj.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
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
        )}

        {activeTab === 'mapping' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Distribusi Mata Pelajaran</h3>
              <p className="text-xs text-gray-500">Tentukan mapel ini diajarkan di kelas mana saja dan semester berapa.</p>
            </div>
            
            <div className="border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#111]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-[#333]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500">Mata Pelajaran</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500">Berlaku Untuk Kelas</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500">Semester Aktif</th>
                    <th className="px-4 py-3 font-semibold text-xs text-gray-500 text-right">Pemetaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {subjects.map(subj => {
                    const map = mappings.find(m => m.subjectId === subj.id);
                    const isGlobal = !map || !map.classIds || map.classIds.length === 0;
                    const semActive = [
                      map?.sem1 && 'S1', map?.sem2 && 'S2', map?.sem3 && 'S3',
                      map?.sem4 && 'S4', map?.sem5 && 'S5', map?.um && 'UM'
                    ].filter(Boolean);

                    return (
                      <tr key={subj.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-text-primary dark:text-text-darkPrimary">{subj.name}</div>
                          <div className="text-[10px] text-gray-400">{subj.group}</div>
                        </td>
                        <td className="px-4 py-3">
                          {isGlobal ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-[10px] font-bold rounded">SEMUA KELAS (GLOBAL)</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {map.classIds.map(cid => {
                                const cName = classes.find(c => c.id === cid)?.name || cid;
                                return <span key={cid} className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 text-[10px] rounded">{cName}</span>
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {semActive.length > 0 ? (
                            <div className="flex gap-1">
                              {semActive.map(s => <span key={s} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold rounded">{s}</span>)}
                            </div>
                          ) : <span className="text-xs text-gray-400 italic">Belum diset</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setGlobalMapping(subj.id!)} className="px-2 py-1 text-[10px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded">Set Global</button>
                            <button onClick={() => handleEditMapping(subj.id!)} className="px-2 py-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded flex items-center gap-1"><Edit2 size={12}/> Edit</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Mapping Edit Modal */}
      {mappingEditId && mappingForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-[#222] flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a]">
              <h3 className="font-bold text-text-primary dark:text-text-darkPrimary">Edit Pemetaan Mapel</h3>
              <button onClick={() => setMappingEditId(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Berlaku Untuk Kelas</label>
                <p className="text-[10px] text-gray-500 mb-2">Biarkan kosong jika mapel ini berlaku untuk SEMUA kelas.</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 border border-gray-200 dark:border-[#333] rounded-lg">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] p-1 rounded">
                      <input type="checkbox" checked={(mappingForm.classIds || []).includes(c.id)} onChange={() => toggleClass(c.id)}
                        className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Aktif di Semester</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'sem1', label: 'Semester 1' }, { key: 'sem2', label: 'Semester 2' },
                    { key: 'sem3', label: 'Semester 3' }, { key: 'sem4', label: 'Semester 4' },
                    { key: 'sem5', label: 'Semester 5' }, { key: 'um', label: 'Ujian Madrasah' }
                  ].map(sem => (
                    <label key={sem.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={mappingForm[sem.key as keyof Mapping] as boolean} 
                        onChange={(e) => setMappingForm({ ...mappingForm, [sem.key]: e.target.checked })}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                      {sem.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#0a0a0a] flex justify-end gap-2">
              <button onClick={() => setMappingEditId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveMapping} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Simpan Pemetaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
