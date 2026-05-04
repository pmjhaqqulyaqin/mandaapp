import React, { useState, useEffect } from 'react';
import { Download, Upload, Loader2, BookOpen, RefreshCw, Eye, EyeOff, Edit3, X, Save, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '../../../lib/api';

export const InputGlobalTab = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [semester, setSemester] = useState('semester1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ students: any[]; subjects: any[]; } | null>(null);

  // --- BULK EDIT STATE ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftChanges, setDraftChanges] = useState<Record<string, {
    studentId: string; subjectId: string; semester: string;
    nilaiLama: number | null; nilaiBaru: string;
    studentName: string; subjectName: string;
  }>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ijazah/download-template?type=sem12&semester=${semester}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `Template_Nilai_Global_${semester}.xlsx`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); a.remove();
    } catch { toast.error('Gagal mengunduh template'); }
    finally { setIsDownloading(false); }
  };

  const handleUpload = async () => {
    if (!selectedFile) return toast.error('Pilih file terlebih dahulu');
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('semester', semester);
    try {
      const res = await apiClient<{message: string}>('/ijazah/upload-grades', { method: 'POST', data: formData });
      toast.success(res.message || 'Upload berhasil');
      setSelectedFile(null);
      if (showPreview) loadPreview();
    } catch (err: any) { toast.error(err.message || 'Gagal mengunggah nilai'); }
    finally { setIsUploading(false); }
  };

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await apiClient<any>(`/ijazah/grades-preview?type=global&semester=${semester}`);
      setPreviewData(res);
      // Reset draft when data changes
      setDraftChanges({});
      setIsEditMode(false);
    } catch { toast.error('Gagal memuat preview nilai'); }
    finally { setPreviewLoading(false); }
  };

  useEffect(() => {
    if (showPreview) loadPreview();
  }, [semester]);

  const togglePreview = () => {
    if (!showPreview && !previewData) loadPreview();
    setShowPreview(!showPreview);
  };

  const getFilledCount = (semKey: 'semester1' | 'semester2') => {
    if (!previewData) return 0;
    let count = 0;
    previewData.students.forEach(s => { s.grades.forEach((g: any) => { if (g[semKey] != null) count++; }); });
    return count;
  };

  const semCols = [{ key: semester, label: semester.replace('semester', 'S') }];

  // --- BULK EDIT HANDLERS ---
  const handleInputChange = (
    studentId: string, studentName: string, 
    subjectId: string, subjectName: string, 
    semesterKey: string, 
    nilaiLama: number | null, newValue: string
  ) => {
    const key = `${studentId}_${subjectId}_${semesterKey}`;
    
    setDraftChanges((prev) => {
      const newDraft = { ...prev };
      
      // Jika dikembalikan ke nilai semula atau kosong
      if ((newValue === '' && nilaiLama == null) || (newValue !== '' && parseInt(newValue) === nilaiLama)) {
        delete newDraft[key];
      } else {
        newDraft[key] = { 
          studentId, subjectId, semester: semesterKey, 
          nilaiLama, nilaiBaru: newValue, 
          studentName, subjectName 
        };
      }
      return newDraft;
    });
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setDraftChanges({});
  };

  const handleSimpanPermanen = async () => {
    const changes = Object.values(draftChanges);
    if (changes.length === 0) return;
    
    setIsSavingBulk(true);
    try {
      // Execute sequentially to avoid overwhelming the server (or change to Promise.all if backend can handle it)
      for (const change of changes) {
        await apiClient('/ijazah/grades', {
          method: 'PATCH',
          data: { 
            studentId: change.studentId, 
            subjectId: change.subjectId, 
            semester: change.semester, 
            value: change.nilaiBaru === '' ? null : parseInt(change.nilaiBaru) 
          }
        });
      }
      
      toast.success(`${changes.length} nilai berhasil diperbarui!`);
      setShowReviewModal(false);
      setIsEditMode(false);
      setDraftChanges({});
      loadPreview(); // Refresh data from backend
    } catch (error) {
      toast.error("Gagal menyimpan beberapa perubahan. Silakan coba lagi.");
    } finally {
      setIsSavingBulk(false);
    }
  };

  const jumlahPerubahan = Object.keys(draftChanges).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-white dark:bg-[#111] rounded-lg shadow-sm text-emerald-500 shrink-0"><BookOpen size={24} /></div>
        <div>
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Input Nilai Semester 1 & 2</h3>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Pada semester 1 dan 2, siswa belum dibagi ke dalam rombongan belajar / jurusan. Template akan diisi berdasarkan mapel yang sudah diset per semester. <b>Nilai bisa langsung diedit secara masal</b> menggunakan tombol Mode Edit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Download */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-2"><Download size={24} /></div>
          <div>
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Langkah 1: Unduh Template</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto">Pilih semester lalu unduh template. Kolom mapel disesuaikan dengan semester yang dipilih.</p>
          </div>
          <select value={semester} onChange={e => {setSemester(e.target.value); setDraftChanges({}); setIsEditMode(false);}}
            className="w-full max-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-[#444] rounded-lg bg-white dark:bg-[#1a1a1a] outline-none focus:ring-2 focus:ring-emerald-500/20">
            <option value="semester1">Semester 1</option>
            <option value="semester2">Semester 2</option>
          </select>
          <button onClick={handleDownload} disabled={isDownloading}
            className="mt-1 px-5 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#444] hover:bg-gray-50 dark:hover:bg-[#222] text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 w-full max-w-[200px]">
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Unduh Template
          </button>
        </div>

        {/* Upload */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mb-2"><Upload size={24} /></div>
          <div>
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Langkah 2: Unggah Nilai</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto">Sistem membaca NISN + nama mapel sebagai kunci. Posisi kolom tidak masalah.</p>
          </div>
          <div className="w-full max-w-[250px] mt-2 space-y-3">
            <input type="file" accept=".xlsx, .xls" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/20 dark:file:text-emerald-400 cursor-pointer" />
            <button onClick={handleUpload} disabled={isUploading || !selectedFile}
              className="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Unggah & Proses Nilai
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview with Bulk Edit */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <button onClick={togglePreview}
              className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-[#222] dark:text-gray-400'}`}>
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <div>
              <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Live Preview Nilai Semester 1 & 2</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {showPreview
                  ? `${previewData?.students.length || 0} siswa • Sem 1: ${getFilledCount('semester1')} nilai • Sem 2: ${getFilledCount('semester2')} nilai`
                  : 'Klik ikon mata untuk menampilkan preview'}
              </p>
            </div>
          </div>
          
          {showPreview && (
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <button 
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 dark:bg-[#111] dark:border-[#444] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] rounded-lg font-medium transition-colors"
                  >
                    <X size={14} /> Batal
                  </button>
                  <button 
                    onClick={() => setShowReviewModal(true)}
                    disabled={jumlahPerubahan === 0}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      jumlahPerubahan > 0 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' 
                        : 'bg-emerald-100 text-emerald-400 dark:bg-emerald-900/20 dark:text-emerald-700 cursor-not-allowed'
                    }`}
                  >
                    <Save size={14} /> 
                    Review & Simpan {jumlahPerubahan > 0 && <span className="bg-white text-emerald-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">{jumlahPerubahan}</span>}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={loadPreview} disabled={previewLoading}
                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Muat Ulang Data">
                    <RefreshCw size={16} className={previewLoading ? "animate-spin" : ""} />
                  </button>
                  <button 
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 rounded-lg font-medium transition-colors"
                  >
                    <Edit3 size={14} /> Mode Edit
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {showPreview && (
          <div className="overflow-x-auto custom-scrollbar">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                <Loader2 size={28} className="animate-spin text-emerald-500" />
                <p className="text-sm font-medium">Memuat nilai...</p>
              </div>
            ) : !previewData || previewData.students.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">Tidak ada data siswa kelas XII.</div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-[#333]">
                  <tr>
                    <th className="hidden sm:table-cell px-3 py-2.5 font-semibold text-gray-500 sticky left-0 bg-gray-50 dark:bg-[#151515] z-10 w-8 text-center border-r border-gray-200 dark:border-[#333]">No</th>
                    <th className="px-2 sm:px-3 py-2.5 font-semibold text-gray-500 sticky left-0 sm:left-[40px] bg-gray-50 dark:bg-[#151515] z-10 w-28 sm:w-40 border-r border-gray-200 dark:border-[#333]">Nama Siswa</th>
                    {previewData.subjects.map((subj: any) => (
                      <th key={subj.id} className="px-2 py-2.5 font-semibold text-gray-500 text-center border-r border-gray-200 dark:border-[#333]">
                        <div className="max-w-[80px] truncate mx-auto" title={subj.name}>{subj.name}</div>
                        <div className="flex gap-1 justify-center mt-1">
                          {semCols.map(s => (
                            <span key={s.key} className="text-[9px] font-bold text-gray-400">{s.label}</span>
                          ))}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {previewData.students.map((student: any, idx: number) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors group">
                      <td className="hidden sm:table-cell px-3 py-2 text-center text-gray-400 sticky left-0 bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1a1a] z-10 border-r border-gray-100 dark:border-[#222]">{idx + 1}</td>
                      <td className="px-2 sm:px-3 py-2 font-medium text-text-primary dark:text-text-darkPrimary sticky left-0 sm:left-[40px] bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1a1a] z-10 border-r border-gray-100 dark:border-[#222]">
                        <div className="truncate w-24 sm:w-40">{student.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{student.nisn}</div>
                      </td>
                      {previewData.subjects.map((subj: any) => {
                        const grade = student.grades.find((g: any) => g.subjectId === subj.id);
                        return (
                          <td key={subj.id} className="px-2 py-2 border-r border-gray-100 dark:border-[#222]">
                            <div className="flex gap-1 justify-center">
                              {semCols.map(s => {
                                const key = `${student.id}_${subj.id}_${s.key}`;
                                const isChanged = draftChanges[key] !== undefined;
                                const originalValue = grade?.[s.key] ?? null;
                                const displayValue = isChanged ? draftChanges[key].nilaiBaru : (originalValue ?? '');

                                return (
                                  <div key={s.key} className="w-12 text-center relative">
                                    {isEditMode ? (
                                      <input 
                                        type="number"
                                        min="0" max="100"
                                        value={displayValue}
                                        onChange={(e) => handleInputChange(student.id, student.fullName, subj.id, subj.name, s.key, originalValue, e.target.value)}
                                        className={`w-10 sm:w-12 text-center py-0.5 px-1 border rounded outline-none transition-colors text-xs ${
                                          isChanged 
                                            ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-200 focus:ring-1 focus:ring-amber-500' 
                                            : 'bg-white border-gray-200 dark:bg-[#111] dark:border-[#444] focus:ring-1 focus:ring-emerald-500'
                                        }`}
                                      />
                                    ) : (
                                      <span className="font-semibold text-text-primary dark:text-text-darkPrimary inline-block py-0.5 w-10">
                                        {originalValue ?? <span className="text-gray-300 dark:text-gray-600 font-normal">—</span>}
                                      </span>
                                    )}
                                    {isChanged && !showReviewModal && (
                                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL REVIEW & KONFIRMASI (LAPISAN KEAMANAN) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200 dark:border-[#333]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-[#222] bg-amber-50/50 dark:bg-amber-900/10 flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Konfirmasi Perubahan Nilai</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
                  Anda akan mengubah <strong>{jumlahPerubahan}</strong> data nilai. Harap periksa kembali sebelum menyimpan permanen ke sistem.
                </p>
              </div>
            </div>

            {/* Modal Body - Tabel Review */}
            <div className="p-0 overflow-y-auto max-h-[50vh] bg-gray-50 dark:bg-[#0a0a0a]">
              <table className="w-full text-sm text-left">
                <thead className="bg-white dark:bg-[#151515] sticky top-0 shadow-sm z-10">
                  <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-[#333]">
                    <th className="px-5 py-3">Siswa & Mata Pelajaran</th>
                    <th className="px-5 py-3 text-center">Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {Object.entries(draftChanges).map(([key, data]) => (
                    <tr key={key} className="bg-white dark:bg-[#111]">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{data.studentName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{data.subjectName} <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#222] rounded text-[9px] uppercase ml-1">{data.semester.replace('semester', 'S')}</span></p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-3 bg-gray-50 dark:bg-[#1a1a1a] py-1.5 px-3 rounded-lg border border-gray-100 dark:border-[#333]">
                          <span className="text-gray-500 dark:text-gray-400 line-through font-medium w-8 text-right">
                            {data.nilaiLama ?? '-'}
                          </span>
                          <ArrowRight size={14} className="text-gray-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base w-8 text-left">
                            {data.nilaiBaru || '-'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-[#222] bg-white dark:bg-[#111] flex justify-end gap-3">
              <button 
                onClick={() => setShowReviewModal(false)}
                disabled={isSavingBulk}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111] border border-gray-300 dark:border-[#444] hover:bg-gray-50 dark:hover:bg-[#222] rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
              >
                Kembali Edit
              </button>
              <button 
                onClick={handleSimpanPermanen}
                disabled={isSavingBulk}
                className="px-5 py-2.5 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 text-sm"
              >
                {isSavingBulk ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSavingBulk ? 'Menyimpan...' : 'Ya, Simpan Permanen'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
