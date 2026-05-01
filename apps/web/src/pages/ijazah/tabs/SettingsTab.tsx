import React, { useState, useEffect } from 'react';
import { apiClient, API_BASE_URL } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Edit2, Check, X, Loader2, Settings, Download, Upload, BookOpen } from 'lucide-react';

type SubjectGroup = string;

interface Subject {
  id?: string;
  name: string;
  group: SubjectGroup | string;
  semester: string;
  orderNum: number;
}

const SEMESTER_TABS = [
  { key: 'sem1', label: 'Semester 1' },
  { key: 'sem2', label: 'Semester 2' },
  { key: 'sem3', label: 'Semester 3' },
  { key: 'sem4', label: 'Semester 4' },
  { key: 'sem5', label: 'Semester 5' },
  { key: 'um', label: 'Ujian Madrasah' },
];

export const SettingsTab = () => {
  const [reportWeight, setReportWeight] = useState(60);
  const [examWeight, setExamWeight] = useState(40);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]); // all sem1-5 for UM checklist
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Subject | null>(null);
  const [isUploadingSubjects, setIsUploadingSubjects] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [classNames, setClassNames] = useState<string[]>([]);

  const [activeSemTab, setActiveSemTab] = useState('sem1');
  const [umSelectedIds, setUmSelectedIds] = useState<Set<string>>(new Set());
  const [isSavingUm, setIsSavingUm] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeSemTab !== 'um') {
      fetchSubjectsForSemester(activeSemTab);
    } else {
      fetchAllForUm();
    }
  }, [activeSemTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const settingsResult = await apiClient<any>('/ijazah/settings').catch(() => null);
      if (settingsResult) {
        setReportWeight(settingsResult.reportWeight || 60);
        setExamWeight(settingsResult.examWeight || 40);
      }
      const classesResult = await apiClient<{id: string; name: string}[]>('/ijazah/classes').catch(() => []);
      setClassNames(classesResult.map(c => c.name));
      await fetchSubjectsForSemester('sem1');
    } catch (err) {
      toast.error('Gagal memuat data pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsForSemester = async (sem: string) => {
    try {
      const res = await apiClient<Subject[]>(`/ijazah/subjects?semester=${sem}`).catch(() => []);
      setSubjects(res);
    } catch { setSubjects([]); }
  };

      const fetchAllForUm = async () => {
    try {
      const unique = await apiClient<any[]>('/ijazah/subjects/unique').catch(() => []);
      setAllSubjects(unique);

      const selectedIds = new Set<string>();
      unique.forEach(s => { if (s.hasUm) selectedIds.add(s.ids[0]); });
      setUmSelectedIds(selectedIds);
    } catch { setAllSubjects([]); }
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

  const handleAddSubject = () => {
    const newSubj: Subject = {
      id: `new-${Date.now()}`, name: '', group: 'Kelompok A (Wajib)',
      semester: activeSemTab,
      orderNum: subjects.length > 0 ? Math.max(...subjects.map(s => s.orderNum)) + 1 : 1
    };
    setSubjects([...subjects, newSubj]);
    setEditingId(newSubj.id!);
    setEditForm(newSubj);
  };

  const handleSaveSubject = async () => {
    if (!editForm || !editForm.name) return toast.error('Nama mata pelajaran wajib diisi');
    try {
      const payload = { ...editForm, semester: activeSemTab };
      if (payload.id?.startsWith('new-')) delete payload.id;
      await apiClient('/ijazah/subjects', { method: 'POST', data: payload });
      toast.success('Mata pelajaran disimpan');
      setEditingId(null);
      fetchSubjectsForSemester(activeSemTab);
    } catch { toast.error('Gagal menyimpan mata pelajaran'); }
  };

  const handleDeleteSubject = async (id: string) => {
    if (id.startsWith('new-')) { setSubjects(subjects.filter(s => s.id !== id)); return; }
    if (confirm('Yakin ingin menghapus mapel ini?')) {
      try {
        await apiClient(`/ijazah/subjects/${id}`, { method: 'DELETE' });
        toast.success('Mata pelajaran dihapus');
        fetchSubjectsForSemester(activeSemTab);
      } catch { toast.error('Gagal menghapus mata pelajaran'); }
    }
  };

  const toggleUmSubject = (id: string) => {
    const next = new Set(umSelectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setUmSelectedIds(next);
  };

  const saveUmSubjects = async () => {
    setIsSavingUm(true);
    try {
      await apiClient('/ijazah/subjects/um', { method: 'POST', data: { subjectIds: Array.from(umSelectedIds) } });
      toast.success('Mapel Ujian Madrasah berhasil disimpan');
      fetchAllForUm();
    } catch { toast.error('Gagal menyimpan mapel UM'); }
    finally { setIsSavingUm(false); }
  };

  const dynamicPeminatan = classNames
    .map(name => name.replace(/^XII\s*/i, '').replace(/[-\s]*\d+$/, '').trim())
    .filter((v, i, a) => v && a.indexOf(v) === i) as string[];

  const GROUPS = [
    'Kelompok A (Wajib)', 'Kelompok B (Wajib)',
    ...dynamicPeminatan.map(p => `${p} (Peminatan)`),
    'Lintas Minat', 'Muatan Lokal',
  ];

  if (loading) {
    return (<div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>);
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
        {reportWeight + examWeight !== 100 && (
          <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
            <X size={12} /> Total bobot harus tepat 100%. Saat ini {reportWeight + examWeight}%.
          </p>
        )}
      </div>

      {/* Section 2: Manajemen Mata Pelajaran Per Semester */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Struktur Mata Pelajaran Per Semester</h3>
            <p className="text-xs text-gray-500">Set mata pelajaran berbeda untuk setiap semester. Untuk UM, pilih dari daftar mapel yang sudah ada.</p>
          </div>
          {activeSemTab !== 'um' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleAddSubject}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                <Plus size={14} /> Tambah Manual
              </button>
            </div>
          )}
        </div>

        {/* Semester Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4 bg-gray-100 dark:bg-[#1a1a1a] p-1.5 rounded-xl">
          {SEMESTER_TABS.map(tab => (
            <button key={tab.key} onClick={() => { setActiveSemTab(tab.key); setEditingId(null); }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeSemTab === tab.key
                  ? tab.key === 'um' ? 'bg-orange-500 text-white shadow-sm' : 'bg-white dark:bg-[#111] text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* UM Mode: Checklist */}
        {activeSemTab === 'um' ? (
          <div className="border border-orange-200 dark:border-orange-900/30 rounded-xl overflow-hidden bg-white dark:bg-[#111]">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30">
              <div className="flex items-start gap-3">
                <BookOpen size={18} className="text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400">Pilih Mata Pelajaran untuk Ujian Madrasah</h4>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/70 mt-1">
                    Centang mata pelajaran dari daftar yang sudah ada di semester 1-5 untuk dijadikan mapel UM.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {allSubjects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Belum ada mata pelajaran di semester 1-5. Tambahkan mapel terlebih dahulu.</p>
              ) : allSubjects.map((subj: any) => (
                <label key={subj.ids[0]} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  umSelectedIds.has(subj.ids[0])
                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-300 dark:border-orange-700'
                    : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] hover:border-orange-200'
                }`}>
                  <input type="checkbox" checked={umSelectedIds.has(subj.ids[0])} onChange={() => toggleUmSubject(subj.ids[0])}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20" />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">{subj.name}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] text-gray-500">{subj.group}</span>
                  </div>
                  <div className="flex gap-1">
                    {subj.semesters.map((sem: string) => (
                       <span key={sem} className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium border border-emerald-100 dark:border-emerald-800">
                         {sem.replace('sem', 'S')}
                       </span>
                    ))}
                  </div>
                </label>
              ))}
            </div>
            <div className="p-4 border-t border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-[#0a0a0a] flex items-center justify-between">
              <p className="text-xs text-gray-500">{umSelectedIds.size} mapel dipilih</p>
              <button onClick={saveUmSubjects} disabled={isSavingUm}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2">
                {isSavingUm ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Simpan Mapel UM
              </button>
            </div>
          </div>
        ) : (
          /* Normal semester mode: table */
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
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Belum ada mata pelajaran untuk {SEMESTER_TABS.find(t => t.key === activeSemTab)?.label}. Silakan tambahkan.
                  </td></tr>
                ) : subjects.map((subj) => {
                  const isEditing = editingId === subj.id;
                  return (
                    <tr key={subj.id} className={isEditing ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors'}>
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2">
                            <input type="number" className="w-16 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black"
                              value={editForm?.orderNum || 0} onChange={(e) => setEditForm({...editForm!, orderNum: parseInt(e.target.value) || 0})} />
                          </td>
                          <td className="px-4 py-2">
                            <select className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black"
                              value={editForm?.group || ''} onChange={(e) => setEditForm({...editForm!, group: e.target.value})}>
                              {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input type="text" placeholder="Nama Mata Pelajaran"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-black"
                              value={editForm?.name || ''} onChange={(e) => setEditForm({...editForm!, name: e.target.value})} autoFocus />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={handleSaveSubject} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"><Check size={16} /></button>
                              <button onClick={() => { if (subj.id?.startsWith('new-')) setSubjects(subjects.filter(s => s.id !== subj.id)); setEditingId(null); }}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
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
        )}
      </div>
    </div>
  );
};
