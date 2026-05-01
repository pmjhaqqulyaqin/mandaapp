import React, { useState, useEffect } from 'react';
import { Download, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '../../../lib/api';

export const InputRombelTab = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [semester, setSemester] = useState('semester3');
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await apiClient<any[]>('/ijazah/classes');
      setClasses(res);
      if (res.length > 0) setSelectedClassId(res[0].id);
    } catch (err) {
      toast.error('Gagal mengambil daftar rombel');
    }
  };

  const handleDownload = async () => {
    if (!selectedClassId) return toast.error('Pilih rombel terlebih dahulu');
    setIsDownloading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/ijazah/download-template?type=rombel&classId=${selectedClassId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_Nilai_Rombel.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      toast.error('Gagal mengunduh template rombel');
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
        data: formData
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
      
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-5 rounded-xl flex items-start gap-4">
        <div className="p-3 bg-white dark:bg-[#111] rounded-lg shadow-sm text-blue-500 shrink-0">
          <FileSpreadsheet size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400">Input Nilai Per Rombel (Sem 3-5 & UM)</h3>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1 mb-3">
            Pada semester 3 hingga 5 dan Nilai Ujian Madrasah, siswa sudah dijuruskan dan dipecah per rombongan belajar. Unduh template berdasarkan rombel di bawah ini.
          </p>
          
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-blue-800 dark:text-blue-400">Pilih Rombel:</label>
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-blue-200 dark:border-blue-800/50 rounded-lg bg-white dark:bg-[#111] outline-none min-w-[200px]"
            >
              {classes.length === 0 && <option value="">Memuat...</option>}
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Step 1: Download */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mb-2">
            <Download size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Langkah 1: Unduh Template</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto">Template akan digenerate khusus untuk siswa di rombel yang Anda pilih.</p>
          </div>
          <button 
            onClick={handleDownload}
            disabled={isDownloading || !selectedClassId}
            className="mt-2 px-5 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#444] hover:bg-gray-50 dark:hover:bg-[#222] disabled:opacity-50 text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 w-full max-w-[200px]"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Unduh Template Rombel
          </button>
        </div>

        {/* Step 2: Upload */}
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-2">
            <Upload size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary dark:text-text-darkPrimary">Langkah 2: Unggah Nilai</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto">Pilih jenis nilai, lalu unggah file template Excel yang sudah diisi.</p>
          </div>
          
          <div className="w-full max-w-[250px] mt-2 space-y-3">
            <select 
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#444] rounded-lg bg-white dark:bg-[#1a1a1a] outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="semester3">Semester 3</option>
              <option value="semester4">Semester 4</option>
              <option value="semester5">Semester 5</option>
              <option value="examScore">Nilai Ujian (UM)</option>
            </select>
            
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400 cursor-pointer"
            />
            
            <button 
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
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
