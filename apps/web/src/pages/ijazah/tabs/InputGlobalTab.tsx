import React, { useState } from 'react';
import { Download, Upload, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '../../../lib/api';

export const InputGlobalTab = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [semester, setSemester] = useState('semester1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ijazah/download-template?type=sem12`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_Nilai_Global_Siswa_XII.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      toast.error('Gagal mengunduh template');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return toast.error('Pilih file terlebih dahulu');
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('semester', semester);

    try {
      const res = await apiClient<{message: string}>('/ijazah/upload-grades', {
        method: 'POST',
        body: formData,
        // Content-Type is intentionally omitted so the browser sets the boundary automatically
      });
      toast.success(res.message || 'Upload berhasil');
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah nilai');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-white dark:bg-[#111] rounded-lg shadow-sm text-emerald-500 shrink-0">
          <BookOpen size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Input Nilai Semester 1 & 2</h3>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Pada semester 1 dan 2, siswa belum dibagi ke dalam rombongan belajar / jurusan. Oleh karena itu, form input ini menarik <b>semua data siswa Kelas XII</b> secara global (keseluruhan).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Step 1: Download */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-2">
            <Download size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Langkah 1: Unduh Template</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto">Template Excel ini berisi nama seluruh siswa kelas XII beserta kolom mata pelajaran yang sudah Anda setting.</p>
          </div>
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="mt-2 px-5 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#444] hover:bg-gray-50 dark:hover:bg-[#222] text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 w-full max-w-[200px]"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Unduh Template
          </button>
        </div>

        {/* Step 2: Upload */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mb-2">
            <Upload size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Langkah 2: Unggah Nilai</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto">Pilih semester tujuan, lalu unggah file template Excel yang sudah diisi nilai.</p>
          </div>
          
          <div className="w-full max-w-[250px] mt-2 space-y-3">
            <select 
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#444] rounded-lg bg-white dark:bg-[#1a1a1a] outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="semester1">Semester 1</option>
              <option value="semester2">Semester 2</option>
            </select>
            
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/20 dark:file:text-emerald-400 cursor-pointer"
            />
            
            <button 
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-full px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Unggah & Proses Nilai
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
