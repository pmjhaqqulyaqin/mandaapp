import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Upload, Loader2, BookOpen, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '../../../lib/api';

// Inline editable cell for empty grades (siswa mutasi)
const EditableCell = ({ value, studentId, subjectId, semester, onSaved }: {
  value: number | null; studentId: string; subjectId: string; semester: string; onSaved: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value != null ? String(value) : '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalVal(value != null ? String(value) : ''); }, [value]);

  const handleSave = async () => {
    if (localVal === '' && value == null) { setEditing(false); return; }
    if (localVal !== '' && parseInt(localVal) === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await apiClient('/ijazah/grades', {
        method: 'PATCH',
        data: { studentId, subjectId, semester, value: localVal === '' ? null : parseInt(localVal) }
      });
      onSaved();
    } catch { toast.error('Gagal menyimpan nilai'); }
    finally { setSaving(false); setEditing(false); }
  };

  if (value != null && !editing) {
    return <span className="font-semibold text-text-primary dark:text-text-darkPrimary">{value}</span>;
  }

  if (editing) {
    return (
      <input ref={inputRef} type="number" min="0" max="100" value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        className="w-14 px-1 py-0.5 text-center text-xs border border-emerald-400 rounded bg-emerald-50 dark:bg-emerald-900/20 outline-none focus:ring-1 focus:ring-emerald-500"
        autoFocus disabled={saving} />
    );
  }

  // Empty cell — clickable to edit
  return (
    <button onClick={() => setEditing(true)} title="Klik untuk isi nilai (siswa mutasi)"
      className="text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer w-full">
      <span className="border-b border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400">—</span>
    </button>
  );
};

export const InputGlobalTab = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [semester, setSemester] = useState('semester1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ students: any[]; subjects: any[]; } | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-white dark:bg-[#111] rounded-lg shadow-sm text-emerald-500 shrink-0"><BookOpen size={24} /></div>
        <div>
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Input Nilai Semester 1 & 2</h3>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Pada semester 1 dan 2, siswa belum dibagi ke dalam rombongan belajar / jurusan. Template akan diisi berdasarkan mapel yang sudah diset per semester. <b>Nilai kosong bisa diedit langsung</b> di preview (untuk siswa mutasi).
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
          <select value={semester} onChange={e => setSemester(e.target.value)}
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

      {/* Live Preview with Inline Edit */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/50 dark:bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <button onClick={togglePreview}
              className={`p-2 rounded-lg transition-colors ${showPreview ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-[#222] dark:text-gray-400'}`}>
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <div>
              <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Live Preview Nilai Semester 1 & 2</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {showPreview
                  ? `${previewData?.students.length || 0} siswa • Sem 1: ${getFilledCount('semester1')} nilai • Sem 2: ${getFilledCount('semester2')} nilai • Klik sel kosong untuk isi langsung`
                  : 'Klik ikon mata untuk menampilkan preview'}
              </p>
            </div>
          </div>
          {showPreview && (
            <button onClick={loadPreview} disabled={previewLoading}
              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
              <RefreshCw size={16} className={previewLoading ? "animate-spin" : ""} />
            </button>
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
                    <th className="px-3 py-2.5 font-semibold text-gray-500 sticky left-0 bg-gray-50 dark:bg-[#151515] z-10 w-8 text-center border-r border-gray-200 dark:border-[#333]">No</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500 sticky left-[40px] bg-gray-50 dark:bg-[#151515] z-10 w-40 border-r border-gray-200 dark:border-[#333]">Nama Siswa</th>
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
                      <td className="px-3 py-2 text-center text-gray-400 sticky left-0 bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1a1a] z-10 border-r border-gray-100 dark:border-[#222]">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-text-primary dark:text-text-darkPrimary sticky left-[40px] bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1a1a] z-10 border-r border-gray-100 dark:border-[#222]">
                        <div className="truncate w-40">{student.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{student.nisn}</div>
                      </td>
                      {previewData.subjects.map((subj: any) => {
                        const grade = student.grades.find((g: any) => g.subjectId === subj.id);
                        return (
                          <td key={subj.id} className="px-2 py-2 border-r border-gray-100 dark:border-[#222]">
                            <div className="flex gap-1 justify-center">
                              {semCols.map(s => (
                                <div key={s.key} className="w-10 text-center">
                                  <EditableCell value={grade?.[s.key] ?? null} studentId={student.id}
                                    subjectId={subj.id} semester={s.key} onSaved={loadPreview} />
                                </div>
                              ))}
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
    </div>
  );
};
