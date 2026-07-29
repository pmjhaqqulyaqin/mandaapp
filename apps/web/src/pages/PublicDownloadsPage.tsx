import { useState, useMemo } from 'react';
import { useDownloads, DownloadItem } from '../hooks/api/useDownloads';
import { API_BASE_URL } from '../lib/api';
import { toast } from 'sonner';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

// ── File type icon helpers ──
function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return { icon: 'picture_as_pdf', bgClass: 'bg-red-50', textClass: 'text-red-600' };
    case 'docx':
      return { icon: 'description', bgClass: 'bg-blue-50', textClass: 'text-blue-600' };
    case 'xlsx':
      return { icon: 'table_chart', bgClass: 'bg-green-50', textClass: 'text-green-600' };
    case 'pptx':
      return { icon: 'slideshow', bgClass: 'bg-orange-50', textClass: 'text-orange-600' };
    case 'zip':
      return { icon: 'folder_zip', bgClass: 'bg-gray-100', textClass: 'text-gray-700' };
    case 'img':
      return { icon: 'image', bgClass: 'bg-purple-50', textClass: 'text-purple-600' };
    case 'apk':
      return { icon: 'android', bgClass: 'bg-green-50', textClass: 'text-green-700' };
    default:
      return { icon: 'insert_drive_file', bgClass: 'bg-gray-100', textClass: 'text-gray-600' };
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getTypeBadge(fileType: string): string {
  return fileType.toUpperCase();
}

type CategoryFilter = 'all' | 'pdf_documents' | 'project_assets' | 'archive';

export const PublicDownloadsPage = () => {
  const { queryPublic } = useDownloads();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const items = queryPublic.data || [];

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: items.length,
      pdf_documents: items.filter(i => i.category === 'pdf_documents').length,
      project_assets: items.filter(i => i.category === 'project_assets').length,
      archive: items.filter(i => i.category === 'archive').length,
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(i => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.fileName.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [items, activeCategory, searchQuery]);

  const handleDownload = async (item: DownloadItem) => {
    // Use the server-side endpoint that atomically counts + serves the file
    // This guarantees every download is tracked, unlike the old two-step approach
    const url = `${API_BASE_URL}/downloads/${item.id}/file`;
    const link = document.createElement('a');
    link.href = url;
    link.download = item.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async (item: DownloadItem) => {
    const url = `${SERVER_BASE}${item.filePath}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link berhasil disalin!');
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Link berhasil disalin!');
    }
  };

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'Semua File' },
    { key: 'pdf_documents', label: 'Dokumen PDF' },
    { key: 'project_assets', label: 'Aset Proyek' },
    { key: 'archive', label: 'Arsip (Zip)' },
  ];

  if (queryPublic.isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-500 text-sm">Memuat dokumen...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full bg-[#F8FAFC] dark:bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="pt-8 pb-6 px-4 sm:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Work Sans, sans-serif', letterSpacing: '-0.01em' }}>
          Arsip Publik
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-base max-w-2xl" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Akses dokumen resmi, paket aset, dan laporan yang terverifikasi. Semua file telah dipindai untuk keamanan dan integritas.
        </p>
      </section>

      {/* Mobile Search */}
      <div className="px-4 sm:hidden mb-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Cari dokumen..."
          />
        </div>
      </div>

      {/* Main Content: Sidebar + List */}
      <div className="px-4 sm:px-8 max-w-7xl mx-auto pb-24 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-5">
            {/* Categories */}
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-mono font-medium text-gray-900 mb-3 uppercase tracking-widest">Kategori</h3>
              <nav className="flex flex-col gap-1">
                {categories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium tracking-wide transition-all ${
                      activeCategory === cat.key
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="opacity-60">{categoryCounts[cat.key]}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Premium Storage Banner */}
            <div className="bg-[#131b2e] text-white p-5 rounded-2xl relative overflow-hidden shadow-lg">
              <div className="relative z-10">
                <h4 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Premium Storage</h4>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  Butuh hosting dokumen publik sendiri? Upgrade ke DocHub Pro.
                </p>
                <button className="bg-white text-gray-900 px-5 py-2 rounded-full text-xs font-mono font-medium hover:scale-105 transition-transform">
                  Selengkapnya
                </button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="material-symbols-outlined" style={{ fontSize: 120 }}>cloud_upload</span>
              </div>
            </div>
          </aside>

          {/* Document List */}
          <div className="lg:col-span-9 space-y-5">
            {/* Desktop Search */}
            <div className="hidden sm:block">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-sm pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Cari dokumen..."
                />
              </div>
            </div>

            {/* File Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Table Header */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 text-xs font-mono font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-6 md:col-span-5">Nama</div>
                <div className="hidden md:block col-span-2 text-center">Tipe</div>
                <div className="hidden md:block col-span-2 text-center">Ukuran</div>
                <div className="col-span-6 md:col-span-3 text-right">Aksi</div>
              </div>

              {/* File Rows */}
              <div className="divide-y divide-gray-100">
                {filteredItems.length === 0 && (
                  <div className="py-16 text-center">
                    <span className="material-symbols-outlined text-gray-300 mb-3" style={{ fontSize: 48 }}>search_off</span>
                    <p className="text-gray-500 text-sm">Tidak ada dokumen ditemukan.</p>
                  </div>
                )}
                {filteredItems.map((item) => {
                  const iconInfo = getFileIcon(item.fileType);
                  return (
                    <div
                      key={item.id}
                      className="group px-5 py-4 grid grid-cols-12 gap-4 items-center hover:bg-blue-50/30 transition-colors"
                    >
                      {/* File Info */}
                      <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg ${iconInfo.bgClass} flex items-center justify-center flex-shrink-0`}>
                          <span className={`material-symbols-outlined ${iconInfo.textClass}`}>{iconInfo.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                          <p className="text-xs text-gray-400">Diubah: {formatDate(item.updatedAt || item.createdAt)}</p>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className="hidden md:flex col-span-2 justify-center">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono font-medium uppercase text-gray-600">
                          {getTypeBadge(item.fileType)}
                        </span>
                      </div>

                      {/* Size */}
                      <div className="hidden md:flex col-span-2 justify-center text-xs font-mono font-medium text-gray-400">
                        {formatFileSize(item.fileSize)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-6 md:col-span-3 flex justify-end gap-2">
                        <button
                          onClick={() => handleCopyLink(item)}
                          className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all text-xs font-mono"
                          title="Salin link"
                        >
                          <span className="material-symbols-outlined text-base">link</span>
                          <span className="hidden sm:inline">Salin</span>
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          className="flex items-center gap-1 px-4 py-2 border border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white rounded-full transition-all text-xs font-mono font-medium active:scale-95"
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                          <span>Unduh</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* End of Archive */}
            <div className="py-12 px-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-gray-300 mb-3" style={{ fontSize: 48 }}>history</span>
              <p className="text-lg font-semibold text-gray-400" style={{ fontFamily: 'Work Sans, sans-serif' }}>Akhir Arsip</p>
              <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1">
                Mencari dokumen lama? Silakan hubungi kantor administrasi untuk permintaan arsip fisik.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Mesh Blur */}
      <div className="fixed inset-0 -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/50 blur-[100px] rounded-full" />
      </div>

      {/* Material Symbols font (injected inline for safety) */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
    </main>
  );
};
