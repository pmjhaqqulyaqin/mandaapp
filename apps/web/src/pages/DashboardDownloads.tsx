import { useState, useCallback } from 'react';
import { useDownloads, DownloadItem } from '../hooks/api/useDownloads';
import { toast } from 'sonner';
import {
  Upload,
  Search,
  Filter,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Shield,
  HardDrive,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Smartphone,
  Presentation,
} from 'lucide-react';

// ── Helpers ──
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return { Icon: FileText, bg: 'bg-red-50', text: 'text-red-600' };
    case 'docx':
      return { Icon: FileText, bg: 'bg-green-50', text: 'text-green-600' };
    case 'xlsx':
      return { Icon: FileSpreadsheet, bg: 'bg-blue-50', text: 'text-blue-600' };
    case 'pptx':
      return { Icon: Presentation, bg: 'bg-orange-50', text: 'text-orange-600' };
    case 'zip':
      return { Icon: FileArchive, bg: 'bg-purple-50', text: 'text-purple-600' };
    case 'img':
      return { Icon: FileImage, bg: 'bg-pink-50', text: 'text-pink-600' };
    case 'apk':
      return { Icon: Smartphone, bg: 'bg-green-50', text: 'text-green-700' };
    default:
      return { Icon: File, bg: 'bg-gray-50', text: 'text-gray-600' };
  }
}

// ── Upload Modal Component ──
function UploadModal({ isOpen, onClose, onUpload }: {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: { file: File; title: string; description: string; category: string; isPublished: boolean }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('pdf_documents');
  const [isPublished, setIsPublished] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
    }
  }, [title]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = () => {
    if (!file) return toast.error('Pilih file terlebih dahulu');
    if (!title.trim()) return toast.error('Judul tidak boleh kosong');
    onUpload({ file, title: title.trim(), description, category, isPublished });
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('pdf_documents');
    setIsPublished(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File Baru</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }`}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <Upload size={32} className={`mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            {file ? (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Seret file kesini atau klik untuk memilih</p>
                <p className="text-xs text-gray-400 mt-1">Maks 50MB • PDF, DOC, XLS, PPT, ZIP, Gambar, APK</p>
              </div>
            )}
            <input id="file-upload-input" type="file" className="hidden" onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.png,.jpg,.jpeg,.svg,.webp,.apk" />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nama dokumen yang ditampilkan..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deskripsi (opsional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Departemen atau keterangan..."
            />
          </div>

          {/* Category + Visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="pdf_documents">Dokumen PDF</option>
                <option value="project_assets">Aset Proyek</option>
                <option value="archive">Arsip (Zip)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Visibilitas</label>
              <select
                value={isPublished ? 'public' : 'private'}
                onChange={(e) => setIsPublished(e.target.value === 'public')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="public">Publik</option>
                <option value="private">Privat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 active:scale-95"
          >
            <Upload size={16} />
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal Component ──
function EditModal({ item, onClose, onSave }: {
  item: DownloadItem;
  onClose: () => void;
  onSave: (id: string, data: { title: string; description: string; category: string }) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [category, setCategory] = useState(item.category);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Dokumen</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Judul</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="pdf_documents">Dokumen PDF</option>
              <option value="project_assets">Aset Proyek</option>
              <option value="archive">Arsip (Zip)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
          <button onClick={() => { onSave(item.id, { title, description, category }); onClose(); }}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 active:scale-95">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ──
export const DashboardDownloads = () => {
  const { queryAdmin, queryStats, uploadMutation, updateMutation, deleteMutation } = useDownloads();
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('all');
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState<DownloadItem | null>(null);

  const adminQuery = queryAdmin({ search, fileType, page, limit: 20 });
  const stats = queryStats;

  const data = adminQuery.data;
  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const statsData = stats.data;

  const handleUpload = async (uploadData: { file: File; title: string; description: string; category: string; isPublished: boolean }) => {
    try {
      await uploadMutation.mutateAsync({
        file: uploadData.file,
        title: uploadData.title,
        description: uploadData.description,
        category: uploadData.category,
        isPublished: uploadData.isPublished,
      });
      toast.success('File berhasil diupload!');
    } catch (err: any) {
      toast.error(`Upload gagal: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleToggleVisibility = async (item: DownloadItem) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        data: { isPublished: !item.isPublished },
      });
      toast.success(item.isPublished ? 'Dokumen disembunyikan' : 'Dokumen dipublikasikan');
    } catch {
      toast.error('Gagal mengubah visibilitas');
    }
  };

  const handleEdit = async (id: string, editData: { title: string; description: string; category: string }) => {
    try {
      await updateMutation.mutateAsync({ id, data: editData });
      toast.success('Dokumen diperbarui');
    } catch {
      toast.error('Gagal memperbarui dokumen');
    }
  };

  const handleDelete = async (item: DownloadItem) => {
    if (!confirm(`Hapus "${item.title}"? Aksi ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success('Dokumen dihapus');
    } catch {
      toast.error('Gagal menghapus dokumen');
    }
  };

  // Storage percentage (assume 2TB plan = 2 * 1024^4 bytes)
  const maxStorage = 2 * 1024 * 1024 * 1024 * 1024; // 2TB
  const storagePercent = statsData ? Math.min(Math.round((Number(statsData.totalSize) / maxStorage) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Repositori Dokumen</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Kelola aset organisasi dan pantau distribusi</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors active:scale-95 shadow-sm"
        >
          <Upload size={16} />
          Upload File Baru
        </button>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Downloads — 2-col span */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-gray-500">Total Unduhan</span>
            <TrendingUp size={18} className="text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {statsData ? formatNumber(statsData.totalDownloads) : '—'}
          </p>
          <p className="text-xs text-green-600 font-medium mt-1">
            {statsData ? `${statsData.publicFiles} publik · ${statsData.privateFiles} privat` : ''}
          </p>
        </div>

        {/* Storage Used */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-gray-500">Penyimpanan</span>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
            {statsData ? formatFileSize(Number(statsData.totalSize)) : '—'}
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-600 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${storagePercent}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{storagePercent}% dari 2 TB</p>
        </div>

        {/* Security Check */}
        <div className="bg-blue-600 text-white p-5 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="relative z-10">
            <span className="text-xs font-mono font-medium uppercase tracking-widest opacity-80">Cek Keamanan</span>
            <p className="text-2xl font-semibold mt-2">Semua Aman</p>
            <p className="text-xs mt-2 opacity-80">Tidak ada ancaman terdeteksi dalam 24 jam terakhir.</p>
          </div>
          <div className="absolute -right-5 -bottom-5 opacity-10">
            <Shield size={120} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-blue-500 focus:ring-0 outline-none"
            placeholder="Cari berdasarkan nama file, tipe atau uploader..."
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fileType}
            onChange={(e) => { setFileType(e.target.value); setPage(1); }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3 text-sm flex-1 md:flex-none"
          >
            <option value="all">Semua Tipe</option>
            <option value="pdf">PDF</option>
            <option value="docx">Dokumen</option>
            <option value="xlsx">Spreadsheet</option>
            <option value="pptx">Presentasi</option>
            <option value="zip">Arsip</option>
            <option value="img">Gambar</option>
            <option value="apk">APK</option>
          </select>
          <button className="bg-gray-100 dark:bg-gray-700 text-gray-500 p-2 rounded-xl hover:bg-gray-200 transition-colors">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-5 py-3 text-xs font-mono font-medium text-gray-500 uppercase tracking-wider">Nama File</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Visibilitas</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Unduhan</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Ukuran</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Terakhir Diubah</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {adminQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              )}
              {!adminQuery.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">
                    Belum ada dokumen. Klik "Upload File Baru" untuk memulai.
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const fileIcon = getFileIcon(item.fileType);
                return (
                  <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors group">
                    {/* File Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${fileIcon.bg} flex items-center justify-center flex-shrink-0`}>
                          <fileIcon.Icon size={20} className={fileIcon.text} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-[300px]">{item.fileName}</p>
                          <p className="text-xs text-gray-400">{item.description || item.category}</p>
                        </div>
                      </div>
                    </td>

                    {/* Visibility */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {item.isPublished ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-gray-600">Publik</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <span className="text-xs text-gray-500">Privat</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Downloads */}
                    <td className="px-5 py-4 hidden lg:table-cell text-xs font-mono text-gray-600">
                      {formatNumber(item.downloadCount)}
                    </td>

                    {/* Size */}
                    <td className="px-5 py-4 hidden lg:table-cell text-xs text-gray-400">
                      {formatFileSize(item.fileSize)}
                    </td>

                    {/* Last Updated */}
                    <td className="px-5 py-4 hidden xl:table-cell text-xs text-gray-400">
                      {formatDate(item.updatedAt || item.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(item)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
                          title={item.isPublished ? 'Sembunyikan' : 'Publikasikan'}
                        >
                          {item.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-5 py-3 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500">
              Menampilkan {items.length} dari {total} dokumen
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-500 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-500 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30 flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} onUpload={handleUpload} />

      {/* Edit Modal */}
      {editItem && (
        <EditModal item={editItem} onClose={() => setEditItem(null)} onSave={handleEdit} />
      )}
    </div>
  );
};

export default DashboardDownloads;
