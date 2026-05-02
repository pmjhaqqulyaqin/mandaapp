import React, { useState, useEffect, useMemo } from 'react';
import { Download, FileSpreadsheet, Loader2, RefreshCw, ChevronDown, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '../../../lib/api';

export const ExportTab = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExportingLeger, setIsExportingLeger] = useState(false);
  const [isExportingIjazah, setIsExportingIjazah] = useState(false);
  
  const [previewData, setPreviewData] = useState<{
    students: any[];
    subjects: any[];
    reportWeight: number;
    examWeight: number;
  } | null>(null);

  // Preview mode: 'leger' or 'ijazah'
  const [previewMode, setPreviewMode] = useState<'leger' | 'ijazah'>('ijazah');
  const [checklistDirty, setChecklistDirty] = useState(false);

  const [masterSubjects, setMasterSubjects] = useState<any[]>([]);
  const [masterMappings, setMasterMappings] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<{name: string, order: number}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  
  useEffect(() => {
    fetchClasses();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [subjects, mappings] = await Promise.all([
        apiClient<any[]>('/ijazah/subjects').catch(() => []),
        apiClient<any[]>('/ijazah/mappings').catch(() => [])
      ]);
      setMasterSubjects(subjects);
      setMasterMappings(mappings);
    } catch (err) {
      toast.error('Gagal memuat mata pelajaran');
    }
  };

  useEffect(() => {
    if (selectedClassId && masterSubjects.length > 0) {
      // Automatically filter subjects applicable to the selected class
      const applicable = masterSubjects.filter(subj => {
        const map = masterMappings.find(m => m.subjectId === subj.id);
        const isGlobal = !map || !map.classIds || map.classIds.length === 0;
        if (isGlobal) return true;
        return map.classIds.includes(selectedClassId);
      });

      const initialized = applicable.map((s, idx) => {
         const map = masterMappings.find(m => m.subjectId === s.id);
         return {
           name: s.name,
           order: s.orderNum || idx + 1,
           hasUm: map?.um || false,
           group: s.group,
         };
      });

      setAllSubjects(initialized);
      setSelectedSubjects(initialized.map(s => ({ name: s.name, order: s.order })));
      loadPreview(initialized.map(s => ({ name: s.name, order: s.order })));
    } else {
      setAllSubjects([]);
      setSelectedSubjects([]);
      setPreviewData(null);
    }
  }, [selectedClassId, masterSubjects, masterMappings]);

  const fetchClasses = async () => {
    try {
      const res = await apiClient<any[]>('/ijazah/classes');
      setClasses(res);
      if (res.length > 0) setSelectedClassId(res[0].id);
    } catch (err) {
      toast.error('Gagal mengambil daftar rombel');
    }
  };

  const loadPreview = async (subjectsToLoad = selectedSubjects) => {
    if (!selectedClassId) return;
    setIsPreviewLoading(true);
    try {
      const subjectNames = subjectsToLoad.map(s => s.name).join(',');
      const res = await apiClient<any>(`/ijazah/preview?classId=${selectedClassId}&subjectIds=${encodeURIComponent(subjectNames)}`);
      
      // Sort the subjects returned from backend according to the user's selected order
      if (res && res.subjects) {
          const orderMap = new Map(subjectsToLoad.map(s => [s.name, s.order]));
          res.subjects.sort((a: any, b: any) => {
              const orderA = orderMap.get(a.name) || 999;
              const orderB = orderMap.get(b.name) || 999;
              return orderA - orderB;
          });
      }
      
      setPreviewData(res);
    } catch (err) {
      toast.error('Gagal memuat preview nilai');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExport = async (type: 'leger' | 'ijazah') => {
    if (!selectedClassId) return toast.error('Pilih rombel terlebih dahulu');
    if (selectedSubjects.length === 0) return toast.error('Pilih minimal 1 mata pelajaran');
    
    if (type === 'leger') setIsExportingLeger(true);
    else setIsExportingIjazah(true);
    
    try {
      const subjectNames = selectedSubjects.map(s => s.name).join(',');
      const response = await fetch(`${API_BASE_URL}/ijazah/export?classId=${selectedClassId}&type=${type}&subjectIds=${encodeURIComponent(subjectNames)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'leger' ? 'Leger' : 'Nilai'}_Ijazah.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      toast.error(`Gagal mengekspor ${type}`);
    } finally {
      if (type === 'leger') setIsExportingLeger(false);
      else setIsExportingIjazah(false);
    }
  };
  
  const toggleSubject = (name: string) => {
      const isSelected = selectedSubjects.some(s => s.name === name);
      if (isSelected) {
          setSelectedSubjects(selectedSubjects.filter(s => s.name !== name));
      } else {
          const subj = allSubjects.find(s => s.name === name);
          setSelectedSubjects([...selectedSubjects, { name, order: subj?.order || 999 }]);
      }
      setChecklistDirty(true);
  };

  const handleOrderChange = (name: string, value: string) => {
      const numValue = parseInt(value) || 0;
      setSelectedSubjects(selectedSubjects.map(s => s.name === name ? { ...s, order: numValue } : s));
      setChecklistDirty(true);
  };

  const handleSaveChecklist = async () => {
      if (!selectedClassId) return toast.error('Pilih rombel terlebih dahulu');
      if (selectedSubjects.length === 0) return toast.error('Pilih minimal 1 mata pelajaran');
      setChecklistDirty(false);
      await loadPreview();
      toast.success('Checklist disimpan & preview diperbarui');
  };
  
  const handleProcess = async () => {
      if(!selectedClassId) return toast.error("Pilih rombel terlebih dahulu");
      setIsProcessing(true);
      await loadPreview();
      setIsProcessing(false);
      toast.success("Nilai berhasil diproses dan disinkronisasi");
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 p-5 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white dark:bg-[#111] rounded-lg shadow-sm text-violet-500 shrink-0">
            <Download size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-violet-800 dark:text-violet-400">Rekapitulasi & Ekspor Laporan</h3>
            <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-1">
              Pilih mapel yang akan dimasukkan ke ijazah, urutkan, lalu proses nilai sebelum diekspor. Mapel yang tidak ada UM-nya akan menggunakan nilai rata-rata rapot murni.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 bg-white dark:bg-[#111] p-2 rounded-lg border border-violet-100 dark:border-violet-900/30">
          <label className="text-xs font-semibold text-violet-800 dark:text-violet-400 whitespace-nowrap px-2">Pilih Rombel:</label>
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-violet-200 dark:border-violet-800/50 rounded-lg bg-white dark:bg-[#1a1a1a] outline-none min-w-[200px]"
          >
            {classes.length === 0 && <option value="">Memuat...</option>}
            <option value="">-- Pilih Rombel --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Subject Checklist Panel - Collapsible */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden">
        <button 
          type="button"
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full p-4 flex items-center justify-between bg-gray-50/50 dark:bg-[#1a1a1a] hover:bg-gray-100/50 dark:hover:bg-[#222] transition-colors text-left"
        >
            <div>
              <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
                Mata Pelajaran Ijazah & Leger
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 rounded-full">{selectedSubjects.length}/{allSubjects.length}</span>
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Centang mata pelajaran yang akan dicetak dan sesuaikan urutannya.
              </p>
            </div>
            <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${showChecklist ? 'rotate-180' : ''}`} />
        </button>
        {showChecklist && (
        <>
        <div className="p-4 border-t border-gray-100 dark:border-[#222] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
            {allSubjects.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-gray-500">Memuat mata pelajaran...</div>
            ) : (
                allSubjects.map(subj => {
                    const isSelected = selectedSubjects.some(s => s.name === subj.name);
                    const selectedObj = selectedSubjects.find(s => s.name === subj.name);
                    
                    return (
                        <div key={subj.name} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${isSelected ? 'border-violet-300 bg-violet-50/50 dark:border-violet-700/50 dark:bg-violet-900/10' : 'border-gray-200 bg-white dark:border-[#333] dark:bg-[#111]'}`}>
                            <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => toggleSubject(subj.name)}
                                className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
                            />
                            <input 
                                type="number" 
                                disabled={!isSelected}
                                value={selectedObj?.order || ''}
                                onChange={(e) => handleOrderChange(subj.name, e.target.value)}
                                className="w-12 px-1.5 py-1 text-center text-xs border border-gray-300 dark:border-[#444] rounded bg-white dark:bg-[#1a1a1a] disabled:opacity-50"
                                placeholder="Urut"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" title={subj.name}>{subj.name}</p>
                                <div className="flex gap-1 mt-0.5">
                                    <span className="text-[9px] px-1 bg-gray-100 dark:bg-[#222] rounded text-gray-500">{subj.group}</span>
                                    {subj.hasUm && <span className="text-[9px] px-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">Ada UM</span>}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
        {checklistDirty && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-[#222] pt-3 flex items-center justify-between animate-in fade-in duration-200">
            <p className="text-xs text-amber-600 dark:text-amber-400">⚠ Ada perubahan yang belum disimpan</p>
            <button
              onClick={handleSaveChecklist}
              disabled={isPreviewLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {isPreviewLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan & Terapkan
            </button>
        </div>
        )}
        </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <button 
          onClick={handleProcess}
          disabled={!selectedClassId || isProcessing || selectedSubjects.length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          Proses Nilai Ijazah
        </button>
        <button 
          onClick={() => handleExport('leger')}
          disabled={!selectedClassId || isExportingLeger || selectedSubjects.length === 0}
          className="px-5 py-2.5 bg-white dark:bg-[#111] border border-violet-200 dark:border-[#333] hover:bg-violet-50 dark:hover:bg-[#222] disabled:opacity-50 text-violet-700 dark:text-violet-400 text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isExportingLeger ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          Cetak Leger Ijazah
        </button>
        <button 
          onClick={() => handleExport('ijazah')}
          disabled={!selectedClassId || isExportingIjazah || selectedSubjects.length === 0}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
        >
          {isExportingIjazah ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Cetak Nilai Ijazah (Final)
        </button>
      </div>

      {/* Live Preview Table */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-[#1a1a1a]">
          <div>
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
              <Eye size={16} /> Live Preview Data
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Menampilkan {previewData?.students.length || 0} siswa &bull; {selectedSubjects.length} mapel terpilih &bull; Mode: {previewMode === 'leger' ? 'Leger Ijazah' : 'Nilai Ijazah Final'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-[#222] rounded-lg p-0.5">
              <button
                onClick={() => setPreviewMode('ijazah')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  previewMode === 'ijazah' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Nilai Ijazah
              </button>
              <button
                onClick={() => setPreviewMode('leger')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  previewMode === 'leger' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Leger
              </button>
            </div>
            <button 
              onClick={() => loadPreview()}
              disabled={isPreviewLoading || !selectedClassId}
              className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={isPreviewLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {isPreviewLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 size={32} className="animate-spin text-violet-500" />
              <p className="text-sm font-medium">Mengkalkulasi Nilai Gabungan...</p>
            </div>
          ) : !previewData || previewData.students.length === 0 ? (
            <div className="py-20 text-center text-gray-500 text-sm">
              Tidak ada data nilai untuk ditampilkan. Silakan pilih rombel lain.
            </div>
          ) : (() => {
            // Filter subjects: only show subjects that are in the selectedSubjects checklist
            const selectedNames = new Set(selectedSubjects.map(s => s.name));
            const orderMap = new Map(selectedSubjects.map(s => [s.name, s.order]));
            const filteredSubjects = previewData.subjects
              .filter((subj: any) => selectedNames.has(subj.name))
              .sort((a: any, b: any) => (orderMap.get(a.name) || 999) - (orderMap.get(b.name) || 999));

            if (previewMode === 'leger') {
              // LEGER MODE: show semester breakdown per subject
              return (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-emerald-50 dark:bg-emerald-900/10 border-b border-gray-200 dark:border-[#333]">
                    <tr>
                      <th className="px-3 py-3 font-semibold text-gray-500 sticky left-0 bg-emerald-50 dark:bg-[#151515] z-10 w-10 text-center border-r border-gray-200 dark:border-[#333]">No</th>
                      <th className="px-3 py-3 font-semibold text-gray-500 sticky left-[40px] bg-emerald-50 dark:bg-[#151515] z-10 w-44 border-r border-gray-200 dark:border-[#333]">Nama Siswa</th>
                      <th className="px-2 py-3 font-semibold text-gray-500 text-center border-r border-gray-200 dark:border-[#333] w-12 bg-emerald-50 dark:bg-[#151515]">Sem</th>
                      {filteredSubjects.map((subj: any) => (
                        <th key={subj.name} className="px-2 py-3 font-semibold text-gray-500 text-center border-r border-gray-200 dark:border-[#333]">
                          <div className="max-w-[80px] truncate text-[10px]" title={subj.name}>{subj.name}</div>
                        </th>
                      ))}
                      <th className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-center bg-emerald-100/50 dark:bg-emerald-900/20">Rata²</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                    {previewData.students.map((student: any, idx: number) => {
                      const semLabels = ['S1','S2','S3','S4','S5','UM','Ijazah'];
                      return semLabels.map((label, semIdx) => (
                        <tr key={`${student.id}-${label}`} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors group ${label === 'Ijazah' ? 'bg-rose-50/50 dark:bg-rose-900/5' : ''}`}>
                          {semIdx === 0 && (
                            <>
                              <td rowSpan={7} className="px-3 py-2 text-center text-gray-500 sticky left-0 bg-white dark:bg-[#111] z-10 border-r border-gray-100 dark:border-[#222] align-top font-medium">{idx + 1}</td>
                              <td rowSpan={7} className="px-3 py-2 font-medium text-text-primary dark:text-text-darkPrimary sticky left-[40px] bg-white dark:bg-[#111] z-10 border-r border-gray-100 dark:border-[#222] align-top">
                                <div className="truncate w-40">{student.fullName}</div>
                                <div className="text-[10px] text-gray-400 font-normal">{student.nisn}</div>
                              </td>
                            </>
                          )}
                          <td className={`px-2 py-1.5 text-center text-[10px] font-bold border-r border-gray-100 dark:border-[#222] ${label === 'Ijazah' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/10' : label === 'UM' ? 'text-orange-600 bg-orange-50/50 dark:bg-orange-900/10' : 'text-gray-500 bg-gray-50/50 dark:bg-[#151515]'}`}>{label}</td>
                          {filteredSubjects.map((subj: any) => {
                            const scoreData = student.subjectScores?.find((s: any) => s.subjectName === subj.name);
                            let val: any = '-';
                            if (scoreData) {
                              if (label === 'S1') val = scoreData.semester1 || '-';
                              else if (label === 'S2') val = scoreData.semester2 || '-';
                              else if (label === 'S3') val = scoreData.semester3 || '-';
                              else if (label === 'S4') val = scoreData.semester4 || '-';
                              else if (label === 'S5') val = scoreData.semester5 || '-';
                              else if (label === 'UM') val = scoreData.examScore || '-';
                              else if (label === 'Ijazah') val = scoreData.finalScore || '-';
                            }
                            return (
                              <td key={subj.name} className={`px-2 py-1.5 text-center border-r border-gray-100 dark:border-[#222] ${label === 'Ijazah' ? 'font-bold text-rose-700 dark:text-rose-400' : ''}`}>
                                <span className="text-text-primary dark:text-text-darkPrimary">{val}</span>
                              </td>
                            );
                          })}
                          <td className={`px-3 py-1.5 text-center font-bold ${label === 'Ijazah' ? 'text-rose-600 bg-rose-100/50 dark:bg-rose-900/10' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10'}`}>
                            {label === 'Ijazah' ? (student.avgFinal || '-') : '-'}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              );
            }

            // IJAZAH MODE: simple final score view
            return (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-[#333]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-500 sticky left-0 bg-gray-50 dark:bg-[#151515] z-10 w-10 text-center border-r border-gray-200 dark:border-[#333]">No</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 sticky left-[52px] bg-gray-50 dark:bg-[#151515] z-10 w-48 border-r border-gray-200 dark:border-[#333]">Nama Siswa</th>
                    {filteredSubjects.map((subj: any) => (
                      <th key={subj.name} className="px-4 py-3 font-semibold text-gray-500 text-center border-r border-gray-200 dark:border-[#333]">
                        <div className="max-w-[120px] truncate" title={subj.name}>{subj.name}</div>
                        <div className="text-[10px] font-normal opacity-70 mt-0.5">Nilai Ijazah</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-bold text-violet-600 dark:text-violet-400 text-center bg-violet-50/50 dark:bg-violet-900/10">Rata-Rata Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {previewData.students.map((student: any, idx: number) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors group">
                      <td className="px-4 py-2.5 text-center text-gray-500 sticky left-0 bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1a1a] z-10 border-r border-gray-100 dark:border-[#222]">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-text-primary dark:text-text-darkPrimary sticky left-[52px] bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1a1a] z-10 border-r border-gray-100 dark:border-[#222]">
                        <div className="truncate w-48">{student.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{student.nisn}</div>
                      </td>
                      {filteredSubjects.map((subj: any) => {
                        const scoreData = student.subjectScores?.find((s: any) => s.subjectName === subj.name);
                        return (
                          <td key={subj.name} className="px-4 py-2.5 text-center border-r border-gray-100 dark:border-[#222]">
                            <span className="font-semibold text-text-primary dark:text-text-darkPrimary">{scoreData?.finalScore || '-'}</span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-center font-bold text-violet-600 dark:text-violet-400 bg-violet-50/30 dark:bg-violet-900/10">
                        {student.avgFinal || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

    </div>
  );
};
