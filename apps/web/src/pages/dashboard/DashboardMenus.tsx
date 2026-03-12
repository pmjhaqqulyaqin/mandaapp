import React, { useState } from 'react';
import { Button, Input, Modal, Badge } from '@mandaapp/ui';
import { useMenus } from '../../hooks/api/useMenus';
import { usePages } from '../../hooks/api/usePages';
import { toast } from 'sonner';

export const DashboardMenus = () => {
  const { queryAll, createMutation, updateMutation, deleteMutation } = useMenus();
  const { queryAll: queryAllPages } = usePages();
  
  const menus = queryAll.data || [];
  const pages = queryAllPages.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    label: '',
    url: '',
    parentId: '',
    icon: '',
    order: 0,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      label: '',
      url: '',
      parentId: '',
      icon: '',
      order: 0,
      isActive: true,
    });
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (menu: any) => {
    setFormData({
      label: menu.label,
      url: menu.url,
      parentId: menu.parentId || '',
      icon: menu.icon || '',
      order: menu.order,
      isActive: menu.isActive,
    });
    setEditingId(menu.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus menu ini? Submenu di bawahnya mungkin akan ikut bermasalah jika tidak diatur ulang.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Menu berhasil dihapus');
      } catch (e) {
        toast.error('Gagal menghapus menu');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        parentId: formData.parentId === '' ? null : formData.parentId,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        toast.success('Menu berhasil diupdate');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Menu berhasil dibuat');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (e) {
      toast.error('Gagal menyimpan menu');
    }
  };

  // Helper to build a tree so we can display them nested visually
  const buildMenuTree = (menuList: any[]) => {
    const map = new Map();
    const roots: any[] = [];
    menuList.forEach(m => map.set(m.id, { ...m, children: [] }));
    menuList.forEach(m => {
      if (m.parentId) {
        const parent = map.get(m.parentId);
        if (parent) parent.children.push(map.get(m.id));
      } else {
        roots.push(map.get(m.id));
      }
    });
    // Sort logic (if not sorted securely by query)
    roots.sort((a, b) => a.order - b.order);
    roots.forEach(r => r.children.sort((a: any, b: any) => a.order - b.order));
    return roots;
  };

  const menuTree = buildMenuTree(menus);
  const parentCandidates = menus.filter(m => !m.parentId && m.id !== editingId);

  const renderMenuRow = (m: any, level: number = 0) => {
    return (
      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
        <td className="p-4 text-gray-900 dark:text-gray-100 font-medium" style={{ paddingLeft: `${16 + level * 32}px` }}>
          <div className="flex items-center gap-2">
            {level > 0 && <span className="text-gray-400">↳</span>}
            {m.icon && <span className="text-gray-500 text-sm">[{m.icon}]</span>}
            {m.label}
          </div>
        </td>
        <td className="p-4 text-gray-500 dark:text-gray-400">
          {m.url}
        </td>
        <td className="p-4 text-gray-500 dark:text-gray-400">
          {m.order}
        </td>
        <td className="p-4">
          <Badge variant={m.isActive ? 'success' as any : 'warning' as any}>
            {m.isActive ? 'Aktif' : 'Non-aktif'}
          </Badge>
        </td>
        <td className="p-4 text-right space-x-2">
          <Button variant="outline" size="sm" onClick={() => openEditModal(m)}>Edit</Button>
          <Button variant="outline" color="danger" size="sm" onClick={() => handleDelete(m.id)}>Hapus</Button>
        </td>
      </tr>
    );
  };

  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map(node => (
      <React.Fragment key={node.id}>
        {renderMenuRow(node, level)}
        {node.children && node.children.length > 0 && renderTree(node.children, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Navigasi</h1>
          <p className="text-gray-500 dark:text-gray-400">Atur tata letak dinamis menu bar dan drop-down submenu website.</p>
        </div>
        <Button onClick={openCreateModal}>+ Tambah Menu</Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {queryAll.isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat menu...</div>
        ) : menus.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Belum ada menu. Klik Tambah Menu.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="font-semibold text-gray-900 dark:text-gray-100 p-4">Nama Menu</th>
                <th className="font-semibold text-gray-900 dark:text-gray-100 p-4">URL / Link</th>
                <th className="font-semibold text-gray-900 dark:text-gray-100 p-4">Urutan</th>
                <th className="font-semibold text-gray-900 dark:text-gray-100 p-4">Status</th>
                <th className="font-semibold text-gray-900 dark:text-gray-100 text-right p-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {renderTree(menuTree)}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Menu' : 'Tambah Menu Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Label Menu
            </label>
            <Input 
              value={formData.label} 
              onChange={(e) => setFormData({ ...formData, label: e.target.value })} 
              required
              placeholder="Contoh: Profil, Sejarah, Berita"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              URL Goal
            </label>
            <div className="flex gap-2 mb-2">
               <select 
                 className="w-1/2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                 onChange={(e) => {
                   if(e.target.value) {
                     setFormData({ ...formData, url: e.target.value });
                   }
                 }}
               >
                 <option value="">-- Pilih Halaman Selesai --</option>
                 {pages.map(p => (
                   <option key={p.id} value={`/page/${p.slug}`}>/page/{p.slug} ({p.title})</option>
                 ))}
                 <option value="/">/ (Beranda)</option>
                 <option value="/login">/login</option>
                 <option value="/news">/news (Berita)</option>
               </select>
            </div>
            <Input 
              value={formData.url} 
              onChange={(e) => setFormData({ ...formData, url: e.target.value })} 
              required
              placeholder="/page/sejarah (atau ketik manual)"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Induk Menu (Parent)
            </label>
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            >
              <option value="">(Tidak Ada - Ini adalah Menu Utama)</option>
              {parentCandidates.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Jika dipilih, menu ini akan menjadi dropdown di bawah Induk Menu tersebut.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ikon (Opsional)
              </label>
              <Input 
                value={formData.icon} 
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })} 
                placeholder="Contoh: Users, Book"
              />
              <p className="text-xs text-gray-500">Nama ikon Lucide (Cth: Users)</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Urutan
              </label>
              <Input 
                type="number"
                value={formData.order} 
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox" 
              id="isActiveMenu" 
              checked={formData.isActive} 
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary"
            />
            <label htmlFor="isActiveMenu" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Aktifkan Menu Ini?
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Menu'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
