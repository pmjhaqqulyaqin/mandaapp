import React, { useState, useEffect, useRef } from 'react';
import { apiClient, API_BASE_URL } from '../lib/api';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, Eye, EyeOff, Upload, X, Image as ImageIcon,
  Megaphone, Calendar, ExternalLink, GripVertical, Search, ToggleLeft, ToggleRight, Link as LinkIcon
} from 'lucide-react';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

interface Announcement {
  id: string;
  title: string;
  description?: string;
  type: 'image' | 'announcement';
  image_url?: string;
  link_url?: string;
  link_label?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

type AnnouncementFormData = {
  title: string;
  description: string;
  type: 'image' | 'announcement';
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  priority: number;
};

const emptyForm: AnnouncementFormData = {
  title: '',
  description: '',
  type: 'image',
  imageUrl: '',
  linkUrl: '',
  linkLabel: '',
  isActive: true,
  startDate: '',
  endDate: '',
  priority: 0,
};

function getStatusBadge(item: Announcement) {
  const now = new Date();
  if (!item.is_active) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">🔴 Nonaktif</span>;
  }
  const start = item.start_date ? new Date(item.start_date) : null;
  const end = item.end_date ? new Date(item.end_date) : null;
  if (start && now < start) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">🟡 Terjadwal</span>;
  }
  if (end && now > end) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">⚫ Kedaluwarsa</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">🟢 Aktif</span>;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toLocalDatetime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export const DashboardAnnouncements: React.FC = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await apiClient<Announcement[]>('/announcements');
      setItems(data);
    } catch (err) {
      toast.error('Gagal memuat data pengumuman');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const result = await apiClient<{ url: string }>('/announcements/upload', {
        method: 'POST',
        data: fd,
        headers: {},
      });
      setForm((prev) => ({ ...prev, imageUrl: result.url }));
      toast.success('Gambar berhasil diupload');
    } catch (err) {
      toast.error('Gagal mengupload gambar');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && /\.(jpg|jpeg|png|webp|svg)$/i.test(file.name)) {
      handleUploadImage(file);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    if (form.type === 'image' && !form.imageUrl) {
      toast.error('Gambar wajib diupload untuk tipe Gambar');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        imageUrl: form.imageUrl || null,
        linkUrl: form.linkUrl.trim() || null,
        linkLabel: form.linkLabel.trim() || null,
        isActive: form.isActive,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        priority: form.priority,
      };

      if (editingId) {
        await apiClient(`/announcements/${editingId}`, { method: 'PUT', data: payload });
        toast.success('Pengumuman berhasil diperbarui');
      } else {
        await apiClient('/announcements', { method: 'POST', data: payload });
        toast.success('Pengumuman berhasil dibuat');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchItems();
    } catch (err) {
      toast.error('Gagal menyimpan pengumuman');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Announcement) => {
    setForm({
      title: item.title,
      description: item.description || '',
      type: item.type as 'image' | 'announcement',
      imageUrl: item.image_url || '',
      linkUrl: item.link_url || '',
      linkLabel: item.link_label || '',
      isActive: item.is_active,
      startDate: toLocalDatetime(item.start_date),
      endDate: toLocalDatetime(item.end_date),
      priority: item.priority,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient(`/announcements/${id}`, { method: 'DELETE' });
      toast.success('Pengumuman berhasil dihapus');
      setDeleteConfirm(null);
      fetchItems();
    } catch (err) {
      toast.error('Gagal menghapus pengumuman');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiClient(`/announcements/${id}/toggle`, { method: 'PATCH' });
      fetchItems();
    } catch (err) {
      toast.error('Gagal mengubah status');
    }
  };

  const resolveUrl = (url?: string) => {
    if (!url) return '';
    return url.startsWith('/') ? `${SERVER_BASE}${url}` : url;
  };

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center">
              <Megaphone size={16} className="text-white" />
            </div>
            Popup Pengumuman
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola popup pengumuman yang tampil di halaman utama website
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        >
          <Plus size={16} /> Tambah Pengumuman
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari pengumuman..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Megaphone size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {searchQuery ? 'Tidak ada pengumuman yang cocok' : 'Belum ada popup pengumuman'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Klik "Tambah Pengumuman" untuk membuat popup baru
          </p>
        </div>
      ) : (
        /* Table / Card List */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Pengumuman</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Tipe</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Jadwal</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Prioritas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Title + thumbnail */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={resolveUrl(item.image_url)}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-emerald-100 flex items-center justify-center shrink-0">
                            <Megaphone size={16} className="text-emerald-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[250px]">{item.title}</p>
                          {item.link_url && (
                            <p className="text-[10px] text-blue-500 flex items-center gap-1 mt-0.5">
                              <LinkIcon size={9} /> {item.link_label || 'Link'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Type */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.type === 'image'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.type === 'image' ? '🖼️ Gambar' : '📢 Pengumuman'}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="py-3 px-3">{getStatusBadge(item)}</td>
                    {/* Schedule */}
                    <td className="py-3 px-3">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                        <div>Mulai: {formatDate(item.start_date)}</div>
                        <div>Selesai: {formatDate(item.end_date)}</div>
                      </div>
                    </td>
                    {/* Priority */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                        {item.priority}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggle(item.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            item.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {item.image_url ? (
                    <img src={resolveUrl(item.image_url)} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-emerald-100 flex items-center justify-center shrink-0">
                      <Megaphone size={18} className="text-emerald-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {getStatusBadge(item)}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.type === 'image' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.type === 'image' ? '🖼️ Gambar' : '📢 Pengumuman'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-gray-400">{formatDate(item.start_date)} — {formatDate(item.end_date)}</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(item.id)} className={`p-1.5 rounded-lg ${item.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg text-blue-600"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-lg text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== CREATE/EDIT MODAL ====== */}
      {showForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditingId(null); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Judul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Juara 1 Olimpiade Bahasa Arab"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Tipe Konten</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm({ ...form, type: 'image' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      form.type === 'image'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <ImageIcon size={16} /> Gambar / Poster
                  </button>
                  <button
                    onClick={() => setForm({ ...form, type: 'announcement' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      form.type === 'announcement'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Megaphone size={16} /> Pengumuman Teks
                  </button>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  Gambar {form.type === 'image' ? '*' : '(opsional)'}
                </label>
                {form.imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                    <img src={resolveUrl(form.imageUrl)} alt="Preview" className="w-full max-h-60 object-contain bg-gray-50 dark:bg-gray-700" />
                    <button
                      onClick={() => setForm({ ...form, imageUrl: '' })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                        <p className="text-xs text-gray-500">Mengupload...</p>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-xs text-gray-500">Klik atau drag & drop gambar di sini</p>
                        <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, WebP (maks. 10MB)</p>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>

              {/* Description (for announcement type) */}
              {form.type === 'announcement' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Deskripsi</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Tulis isi pengumuman..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>
              )}

              {/* Link URL + Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Link URL (opsional)</label>
                  <input
                    type="url"
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Label Tombol</label>
                  <input
                    type="text"
                    value={form.linkLabel}
                    onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                    placeholder="Selengkapnya"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    <Calendar size={12} className="inline mr-1" /> Tanggal Mulai
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Kosongkan = langsung aktif</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    <Calendar size={12} className="inline mr-1" /> Tanggal Selesai
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Kosongkan = tanpa batas waktu</p>
                </div>
              </div>

              {/* Priority + Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Prioritas</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Semakin tinggi = tampil duluan</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Status</label>
                  <button
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      form.isActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {form.isActive ? <><Eye size={16} /> Aktif</> : <><EyeOff size={16} /> Nonaktif</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {editingId ? 'Simpan Perubahan' : 'Buat Pengumuman'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== DELETE CONFIRMATION ====== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Hapus Pengumuman?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAnnouncements;
