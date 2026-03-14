import { useState, useRef, useMemo, useEffect } from 'react';
import { Button, Input, Modal, Badge, SectionPicker } from '@mandaapp/ui';
import { usePages } from '../../hooks/api/usePages';
import { toast } from 'sonner';
import JoditEditor from 'jodit-react';
import { PhotoUploader } from '@mandaapp/ui';

export const DashboardPages = () => {
  const { queryAll, createMutation, updateMutation, deleteMutation } = usePages();
  const pages = queryAll.data || [];
  
  const editorRef = useRef(null);

  const SMART_ART_TEMPLATES = [
    {
      id: 'process',
      title: 'Process Graphic',
      description: 'Diagram alur proses horizontal dengan panah.',
      icon: '→',
      html: '<div class="smart-art-process"><div class="smart-art-step"><div class="smart-art-step-box">Langkah 1</div></div><div class="smart-art-arrow">→</div><div class="smart-art-step"><div class="smart-art-step-box">Langkah 2</div></div><div class="smart-art-arrow">→</div><div class="smart-art-step"><div class="smart-art-step-box">Langkah 3</div></div></div>'
    },
    {
      id: 'cycle',
      title: 'Cycle Graphic',
      description: 'Diagram siklus berputar untuk proses berkelanjutan.',
      icon: '↻',
      html: '<div class="smart-art-cycle"><div class="smart-art-cycle-item">Fase 1</div><div class="smart-art-cycle-item">Fase 2</div><div class="smart-art-cycle-item">Fase 4</div><div class="smart-art-cycle-item">Fase 3</div></div>'
    },
    {
      id: 'hierarchy',
      title: 'Hierarchy Graphic',
      description: 'Struktur organisasi atau hirarki bertingkat.',
      icon: '⊥',
      html: '<div class="smart-art-hierarchy"><div class="smart-art-node">Pimpinan Utama</div><div class="smart-art-node">Manajer Divisi</div><div class="smart-art-node">Staff Pelaksana</div></div>'
    },
    {
      id: 'relation',
      title: 'Relationship Graphic',
      description: 'Hubungan antar konsep atau entitas.',
      icon: '○',
      html: '<div class="smart-art-relation"><div class="smart-art-circle smart-art-circle-1">Konsep A</div><div class="smart-art-circle smart-art-circle-2">Konsep B</div></div>'
    }
  ];

  const handleInsertSmartArt = (html: string) => {
    if (editorRef.current) {
      // @ts-ignore
      editorRef.current.selection.insertHTML(html);
      setIsSmartArtModalOpen(false);
    }
  };

  const editorConfig = useMemo(() => ({
    readonly: false,
    height: 500,
    placeholder: 'Mulai ketikkan isi halaman Anda di sini...',
    style: {
      background: 'transparent',
      color: 'inherit',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px'
    },
    toolbarSticky: true,
    toolbarAdaptive: false,
    zIndex: 1000,
    uploader: {
      url: `${import.meta.env.VITE_API_URL}/system/upload/image`,
      format: 'json',
      path: 'data.url',
      withCredentials: true,
      headers: {
        'X-User-Id': localStorage.getItem('mandalotim_user') ? JSON.parse(localStorage.getItem('mandalotim_user')!).id : ''
      },
      insertImageAsBase64URI: false,
      process: (res: any) => {
        return {
          files: [res.data.url],
          path: res.data.url,
          baseurl: '',
          error: res.error,
          msg: res.message
        };
      },
      defaultHandlerSuccess: function(this: any, data: any) {
        this.selection.insertImage(data.files[0]);
      },
      prepareData: (formData: any) => {
        // Jodit uses 'files' by default, but our backend expects 'image'
        const file = formData.get('files[0]');
        formData.delete('files[0]');
        formData.append('image', file);
        return formData;
      }
    },
    buttons: [
      {
        name: 'font',
        list: {
          'Inter,sans-serif': 'Inter',
          'Space Grotesk,sans-serif': 'Heading',
          'Arial,Helvetica,sans-serif': 'Arial',
          'Georgia,serif': 'Georgia',
          'Courier New,Courier,monospace': 'Monospace'
        }
      },
      'fontsize', 'brush', 'paragraph', '|',
      'bold', 'italic', 'underline', 'strikethrough', 'eraser', '|',
      'ul', 'ol', '|',
      'align', 'outdent', 'indent', '|',
      'table', 'link', 'image', 'video', 'file', '|',
      {
        name: 'smartArt',
        iconURL: 'https://cdn-icons-png.flaticon.com/512/3593/3593452.png',
        tooltip: 'Insert Smart Art Graphic',
        exec: () => setIsSmartArtModalOpen(true)
      },
      'hr', 'symbols', 'fullsize', 'source', '|',
      'undo', 'redo'
    ],
  }), []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSmartArtModalOpen, setIsSmartArtModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    coverImage: '',
    layout: '',
    metaDescription: '',
    status: 'Draft',
  });

  const [visualSections, setVisualSections] = useState<any[]>([]);

  // Sync visualSections to formData.layout
  useEffect(() => {
    if (visualSections.length > 0) {
      setFormData(prev => ({ ...prev, layout: JSON.stringify(visualSections) }));
    } else {
      setFormData(prev => ({ ...prev, layout: '' }));
    }
  }, [visualSections]);

  // Sync formData.layout to visualSections when opening edit modal
  const syncLayoutToVisual = (layoutStr: string) => {
    try {
      if (layoutStr) {
        setVisualSections(JSON.parse(layoutStr));
      } else {
        setVisualSections([]);
      }
    } catch (e) {
      console.error("Failed to parse layout for visual builder", e);
      setVisualSections([]);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      coverImage: '',
      layout: '',
      metaDescription: '',
      status: 'Draft',
    });
    setVisualSections([]);
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (page: any) => {
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      coverImage: page.coverImage || '',
      layout: page.layout || '',
      metaDescription: page.metaDescription || '',
      status: page.status,
    });
    syncLayoutToVisual(page.layout);
    setEditingId(page.id);
    setIsModalOpen(true);
  };

  const handleAddSection = (type: string) => {
    setVisualSections([...visualSections, { type, props: {} }]);
    setShowSectionPicker(false);
    toast.success(`Bagian ${type} ditambahkan`);
  };

  const handleRemoveSection = (index: number) => {
    const newSections = [...visualSections];
    newSections.splice(index, 1);
    setVisualSections(newSections);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...visualSections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setVisualSections(newSections);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus halaman ini?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Halaman berhasil dihapus');
      } catch (e) {
        toast.error('Gagal menghapus halaman');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
        toast.success('Halaman berhasil diupdate');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Halaman berhasil dibuat');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (e) {
      toast.error('Gagal menyimpan halaman');
    }
  };

  const handleTitleChange = (val: string) => {
    if (!editingId) {
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData({ ...formData, title: val, slug: autoSlug });
    } else {
      setFormData({ ...formData, title: val });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Halaman</h1>
          <p className="text-gray-500 dark:text-gray-400">Buat dan kelola halaman kustom (seperti Visi Misi, Sejarah, dll).</p>
        </div>
        <Button onClick={openCreateModal}>+ Tambah Halaman</Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {queryAll.isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat halaman...</div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Belum ada halaman. Klik tombol Tambah Halaman untuk membuat halaman baru.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="font-semibold text-gray-900 dark:text-gray-100 p-4">Judul Halaman</th>
                <th className="font-semibold text-gray-900 dark:text-gray-100 p-4">Slug (URL)</th>
                <th className="font-semibold text-gray-900 dark:text-gray-100 p-4">Status</th>
                <th className="font-semibold text-gray-900 dark:text-gray-100 text-right p-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">
                    {p.title}
                  </td>
                  <td className="p-4 text-gray-500 dark:text-gray-400">
                    /page/{p.slug}
                  </td>
                  <td className="p-4">
            <Badge variant={p.status === 'Published' ? 'success' as any : 'warning' as any}>
              {p.status}
            </Badge>
          </td>
          <td className="p-4 text-right space-x-2">
            <Button variant="outline" size="sm" onClick={() => openEditModal(p)}>Edit</Button>
            <Button variant="outline" color="danger" size="sm" onClick={() => handleDelete(p.id)}>Hapus</Button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}
</div>

<Modal
isOpen={isModalOpen}
onClose={() => setIsModalOpen(false)}
title={editingId ? 'Edit Halaman' : 'Tambah Halaman Baru'}
>
<form onSubmit={handleSubmit} className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Judul Halaman
        </label>
        <Input 
          value={formData.title} 
          onChange={(e) => handleTitleChange(e.target.value)} 
          required
          placeholder="Contoh: Visi dan Misi"
        />
      </div>
              
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          URL Slug
        </label>
        <Input 
          value={formData.slug} 
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })} 
          required
          placeholder="contoh: visi-misi"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Meta Deskripsi (SEO)
        </label>
        <Input 
          value={formData.metaDescription} 
          onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })} 
          placeholder="Deskripsi singkat untuk Google..."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status Publikasi
        </label>
        <select
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="Draft">Draft (Disembunyikan)</option>
          <option value="Published">Published (Bisa diakses publik)</option>
        </select>
      </div>
    </div>

    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Cover Image (Hero Tradisional)
      </label>
      <div className="max-w-[200px]">
        <PhotoUploader 
          currentPhotoUrl={formData.coverImage}
          onPhotoChange={(url: string) => setFormData({ ...formData, coverImage: url })}
        />
      </div>
      <p className="text-[10px] text-gray-500 mt-1">Hanya digunakan jika tidak menggunakan Layout Visual.</p>
    </div>
  </div>

  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="m16.24 7.76-1.42 1.42"/><path d="m20.48 3.52-3.24 3.24"/><path d="M17.99 11.11V7.05"/><path d="M12.1 4.71h4.06"/><path d="m9.44 11.3 1.42-1.42"/><path d="m4.18 16.56 3.24-3.24"/><path d="M4.01 12.89V16.95"/><path d="M9.9 19.29H5.84"/><path d="m11.3 9.44 1.42-1.42"/><path d="m16.56 4.18 3.24-3.24"/><path d="M12.89 4.01H16.95"/><path d="M19.29 9.9V5.84"/><path d="m7.76 16.24 1.42-1.42"/><path d="m3.52 20.48 3.24-3.24"/><path d="M7.05 17.99v4.06"/><path d="M4.71 12.1v4.06"/></svg>
        Visual Section Builder
      </h3>
      <Button type="button" variant="outline" size="sm" onClick={() => setShowSectionPicker(true)}>
        + Tambah Bagian
      </Button>
    </div>

    {visualSections.length > 0 ? (
      <div className="space-y-3 mb-6">
        {visualSections.map((section, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl group transition-all hover:border-emerald-500/50">
            <div className="flex flex-col gap-1">
              <button 
                type="button" 
                onClick={() => handleMoveSection(idx, 'up')}
                disabled={idx === 0}
                className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded disabled:opacity-20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button 
                type="button" 
                onClick={() => handleMoveSection(idx, 'down')}
                disabled={idx === visualSections.length - 1}
                className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded disabled:opacity-20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{section.type}</span>
                <Badge variant="outline" className="text-[10px]">Section Block</Badge>
              </div>
              <p className="text-[10px] text-gray-500">Akan dirender menggunakan komponen sistem.</p>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              color="danger" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemoveSection(idx)}
            >
              Hapus
            </Button>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl mb-6">
        <p className="text-sm text-gray-500">Klik "+ Tambah Bagian" untuk mulai menyusun halaman visual.</p>
      </div>
    )}

    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Isi Konten Manual (Fallback)
      </label>
      <div className="text-gray-900 rounded-md overflow-hidden bg-white border border-gray-200 jodit-editor-container">
        <JoditEditor
          ref={editorRef}
          value={formData.content}
          config={editorConfig}
          onBlur={newContent => setFormData({ ...formData, content: newContent })}
        />
        <style>{`
          .jodit-container {
             overflow: visible !important;
          }
          :global(.jodit-popup-container),
          :global(.jodit-dialog__box) {
            z-index: 10001 !important;
          }
          .jodit-toolbar__box {
             background-color: #f8fafc !important;
          }
          .dark .jodit-toolbar__box {
             background-color: #1a1a1a !important;
          }
        `}</style>
      </div>
      <p className="text-[10px] text-gray-500">Hanya tampil jika tidak ada "Visual Section" di atas.</p>
    </div>
  </div>

  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
    <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
      {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Halaman'}
    </Button>
  </div>
</form>
</Modal>

<Modal
  isOpen={showSectionPicker}
  onClose={() => setShowSectionPicker(false)}
  title="Pilih Bagian Halaman"
>
  <SectionPicker onSelect={handleAddSection} />
</Modal>

<Modal
  isOpen={isSmartArtModalOpen}
  onClose={() => setIsSmartArtModalOpen(false)}
  title="Pilih Smart Art Graphic"
  description="Pilih grafik profesional untuk memvisualisasikan data Anda."
  className="max-w-2xl"
>
  <div className="grid grid-cols-2 gap-4">
    {SMART_ART_TEMPLATES.map((item) => (
      <div 
        key={item.id}
        onClick={() => handleInsertSmartArt(item.html)}
        className="group cursor-pointer border border-border-light dark:border-border-dark rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-[#262626] rounded-lg text-xl group-hover:bg-primary group-hover:text-white transition-colors">
            {item.icon}
          </div>
          <h4 className="font-semibold text-text-primary dark:text-text-darkPrimary">
            {item.title}
          </h4>
        </div>
        <p className="text-xs text-text-secondary">
          {item.description}
        </p>
      </div>
    ))}
  </div>
</Modal>
</div>
);
};
