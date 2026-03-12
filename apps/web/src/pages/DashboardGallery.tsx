import { useState, useRef } from 'react';
import { Button, Input, Modal, Skeleton, DataTable } from '@mandaapp/ui';
import { useGallery } from '../hooks/api/useGallery';
import { useAuth } from '../contexts/AuthContext';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

const STAFF_ROLES = ['admin', 'kepala_madrasah', 'wakil_kepala', 'kepala_unit', 'wali_kelas', 'pembina_ekstra', 'guru'];
const AUDIT_ROLES = ['admin', 'kepala_madrasah', 'wakil_kepala'];

export const DashboardGallery = () => {
  const { queryAll, createMutation, updateMutation, deleteMutation } = useGallery();
  const allImages: GalleryImage[] = queryAll.data || [];
  const isLoading = queryAll.isLoading;

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

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData(prev => ({
        ...prev,
        url: base64,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
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
          <img src={row.url} alt={row.title} className="w-full h-full object-cover" />
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
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
            onClick={() => handleEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 dark:hover:text-red-400"
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
          >
            Hapus
          </Button>
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
          <Button onClick={() => { setEditingId(null); setFormData({ url: '', title: '', description: '' }); setIsModalOpen(true); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Tambah Gambar
          </Button>
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

      {/* Table */}
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
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-border-light dark:border-border-dark">
                  <img src={formData.url} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
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
            <button type="button" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50">
              {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} title={previewImage?.title || ''} description={previewImage?.description || ''}>
        <div className="py-2">
          {previewImage && (
            <img src={previewImage.url} alt={previewImage.title} className="w-full rounded-xl" />
          )}
        </div>
      </Modal>
    </div>
  );
};
