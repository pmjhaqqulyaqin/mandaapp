import { useState, useRef } from 'react';
import { Button, Input, Modal, Skeleton, DataTable } from '@mandaapp/ui';
import { useGallery } from '../hooks/api/useGallery';
import { useAuth } from '../contexts/AuthContext';
import { CameraCapture } from '../components/CameraCapture';
import { galleryService } from '../lib/services/gallery';
import { API_BASE_URL } from '../lib/api';
import { Camera, X, Loader2, Edit2, Trash2 } from 'lucide-react';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

const STAFF_ROLES = ['admin', 'kepala_madrasah', 'wakil_kepala', 'kepala_unit', 'wali_kelas', 'pembina_ekstra', 'guru', 'operator'];
const AUDIT_ROLES = ['admin', 'kepala_madrasah', 'wakil_kepala'];

export const DashboardGallery = () => {
  const { queryAll, createMutation, updateMutation, deleteMutation } = useGallery();
  const allImages: GalleryImage[] = queryAll.data || [];
  const isLoading = queryAll.isLoading;
  const [isUploading, setIsUploading] = useState(false);

  // Derive server base URL (remove /api suffix)
  const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');
  const resolveUrl = (url: string) => url.startsWith('/') ? `${SERVER_BASE}${url}` : url;

  const { user } = useAuth();
  const canManageGallery = STAFF_ROLES.includes(user?.role || '');
  const canSeeAllImages = AUDIT_ROLES.includes(user?.role || '');

  // Filter images by ownership: audit roles see all, others see only their own
  const images = canSeeAllImages
    ? allImages
    : allImages.filter(img => img.uploadedBy === user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);
  const [formData, setFormData] = useState({ url: '', title: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredImages = images.filter(img =>
    img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (img.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 10MB.');
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      url: objectUrl, // Temporary preview URL
      title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
    }));

    setIsUploading(true);
    try {
      const { url } = await galleryService.upload(file);
      setFormData(prev => ({
        ...prev,
        url, // Replace temporary URL with real server URL
      }));
    } catch (error: any) {
      alert(`Gagal mengupload gambar: ${error.message}`);
      setFormData(prev => ({ ...prev, url: '' })); // Revert on error
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl); // Clean up memory
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = () => {
    if (!formData.url || !formData.title.trim()) {
      alert('Gambar dan judul wajib diisi.');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ url: '', title: '', description: '' });
        },
        onError: (error) => alert(`Gagal memperbarui gambar: ${error.message}`),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          setIsModalOpen(false);
          setFormData({ url: '', title: '', description: '' });
        },
        onError: (error) => alert(`Gagal menambahkan gambar: ${error.message}`),
      });
    }
  };

  const handleEdit = (img: GalleryImage) => {
    setEditingId(img.id);
    setFormData({ url: img.url, title: img.title, description: img.description || '' });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus gambar ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      header: 'Preview',
      accessorKey: (row: GalleryImage) => (
        <div
          className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer border border-border-light dark:border-border-dark"
          onClick={() => setPreviewImage(row)}
        >
          <img src={resolveUrl(row.url)} alt={row.title} className="w-full h-full object-cover" />
        </div>
      ),
    },
    {
      header: 'Judul',
      accessorKey: (row: GalleryImage) => (
        <div>
          <p className="font-medium text-text-primary dark:text-text-darkPrimary">{row.title}</p>
          {row.description && (
            <p className="text-xs text-text-secondary mt-0.5 truncate max-w-xs">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Tanggal Upload',
      accessorKey: (row: GalleryImage) => (
        <span className="text-sm text-text-secondary">{formatDate(row.uploadedAt)}</span>
      ),
    },
    ...(canManageGallery ? [{
      header: '',
      accessorKey: (row: GalleryImage) => (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-500 hover:text-blue-700" 
            title="Edit Gambar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
            className="text-red-500 hover:text-red-700 disabled:opacity-50"
            title="Hapus Gambar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      className: 'text-right',
    }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
        <div>
          <h2 className="text-xl font-heading font-semibold text-text-primary dark:text-text-darkPrimary">Manajemen Galeri</h2>
          <p className="text-sm text-text-secondary mt-1">Kelola foto dan gambar yang ditampilkan di halaman galeri website.</p>
        </div>
        {canManageGallery && (
          <div className="hidden md:block">
            <Button onClick={() => { setEditingId(null); setFormData({ url: '', title: '', description: '' }); setIsModalOpen(true); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Tambah Gambar
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-background-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm flex items-center gap-4">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Cari gambar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>}
          />
        </div>
        <span className="text-sm text-text-secondary hidden sm:block">{filteredImages.length} gambar</span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        {isLoading ? (
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="w-16 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <DataTable data={filteredImages} columns={columns} keyExtractor={(item) => item.id} />
        )}
      </div>

      {/* Mobile Grid */}
      <div className="md:hidden pb-10">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">Tidak ada gambar.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredImages.map(img => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[4/5] border border-gray-200 dark:border-gray-800 shadow-sm" onClick={() => setPreviewImage(img)}>
                <img src={resolveUrl(img.url)} alt={img.title} className="w-full h-full object-cover" />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                
                {/* Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                  <h3 className="text-white font-semibold text-xs leading-tight line-clamp-2 shadow-sm">{img.title}</h3>
                  <p className="text-white/70 text-[9px] mt-1">{formatDate(img.uploadedAt)}</p>
                </div>
                
                {/* Action Buttons */}
                {canManageGallery && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-90">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(img); }}
                      className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                      className="w-7 h-7 rounded-full bg-red-500/80 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile FAB for Add Image */}
      {canManageGallery && (
        <button 
          className="md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-primary/30"
          onClick={() => { setEditingId(null); setFormData({ url: '', title: '', description: '' }); setIsModalOpen(true); }}
        >
          <Camera className="w-6 h-6" />
        </button>
      )}

      {/* Add Image Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingId(null); }} title={editingId ? 'Edit Gambar' : 'Tambah Gambar'} description={editingId ? 'Ubah gambar atau detail informasinya.' : 'Upload gambar yang ingin ditampilkan di galeri website.'}>
        <div className="space-y-4 py-2">
          {/* File Upload Area */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Gambar *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {formData.url ? (
              <div className="relative group">
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-border-light dark:border-border-dark flex items-center justify-center">
                  {/* Handle both local blob URLs (instant preview) and server URLs */}
                  <img src={formData.url.startsWith('blob:') || formData.url.startsWith('data:') ? formData.url : resolveUrl(formData.url)} alt="Preview" className="w-full h-full object-cover" />
                  {isUploading && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                     </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => { setFormData(prev => ({ ...prev, url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`w-full h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">
                    Klik atau seret gambar ke sini
                  </p>
                  <p className="text-xs text-text-secondary mt-1">PNG, JPG, WEBP (maks. 10MB)</p>
                </div>
                <div className="flex items-center gap-2 w-full px-6">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">ATAU</span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                  className="bg-white dark:bg-transparent border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary transition-all"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Gunakan Kamera
                </Button>
              </div>
            )}
            
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Judul *</label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Judul gambar" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Deskripsi</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi singkat (opsional)"
              className="w-full h-20 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-[#1a1a1a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>
          <div className="mt-6 pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border-light dark:border-border-dark">
            <button type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => setIsModalOpen(false)}>
              Batal
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending || isUploading} 
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending || isUploading) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Camera Fullscreen Overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-black w-full h-full sm:max-w-4xl sm:h-[80vh] sm:rounded-2xl sm:border sm:border-gray-800 sm:shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* On desktop, keep a prominent header. On mobile, the CameraCapture has an overlay close button. */}
            <div className="hidden sm:flex items-center justify-between p-4 bg-[#111] border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Ambil Foto
              </h3>
              <button 
                onClick={() => setShowCamera(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col bg-black min-h-0 relative">
              <CameraCapture 
                onCapture={async (base64) => {
                  setIsUploading(true);
                  try {
                    // Convert base64 to blob for upload
                    const res = await fetch(base64);
                    const blob = await res.blob();
                    const { url } = await galleryService.upload(blob);
                    setFormData(prev => ({ ...prev, url, title: prev.title || `Foto_${new Date().getTime()}` }));
                    setShowCamera(false);
                  } catch (error: any) {
                    alert(`Gagal menyimpan foto: ${error.message}`);
                  } finally {
                    setIsUploading(false);
                  }
                }}
                onClose={() => setShowCamera(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} title={previewImage?.title || ''} description={previewImage?.description || ''}>
        <div className="py-2">
          {previewImage && (
            <img src={resolveUrl(previewImage.url)} alt={previewImage.title} className="w-full rounded-xl" />
          )}
        </div>
      </Modal>
    </div>
  );
};
