import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Loader2, BookOpen, GripVertical } from 'lucide-react';

interface Props {
  academicYearId: string;
  semester: string;
  subjectId: string;
  subjectList: any[];
}

interface TpItem {
  id?: string;
  nomorTp: number;
  judul: string;
  deskripsi: string;
}

export const TujuanPembelajaranTab = ({ academicYearId, semester, subjectId, subjectList }: Props) => {
  const [items, setItems] = useState<TpItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const subjectName = subjectList.find(s => s.id === subjectId)?.nama || '';

  const loadData = useCallback(() => {
    if (!academicYearId || !subjectId) return;
    setLoading(true);
    apiClient<any[]>(`/rapor/tp?academicYearId=${academicYearId}&semester=${semester}&subjectId=${subjectId}`)
      .then(data => {
        setItems(data.map((d: any) => ({
          id: d.id,
          nomorTp: d.nomorTp,
          judul: d.judul,
          deskripsi: d.deskripsi || '',
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [academicYearId, semester, subjectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const addItem = () => {
    const nextNo = items.length > 0 ? Math.max(...items.map(i => i.nomorTp)) + 1 : 1;
    setItems(prev => [...prev, { nomorTp: nextNo, judul: '', deskripsi: '' }]);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item.id) {
      try {
        await apiClient(`/rapor/tp/${item.id}`, { method: 'DELETE' });
        toast.success('TP berhasil dihapus');
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus');
        return;
      }
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TpItem, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    if (!academicYearId || !subjectId) return;
    if (items.some(i => !i.judul.trim())) {
      toast.error('Semua judul TP harus diisi');
      return;
    }
    setSaving(true);
    try {
      await apiClient('/rapor/tp', {
        method: 'POST',
        data: {
          academicYearId, semester, subjectId,
          items: items.map((i, idx) => ({
            id: i.id,
            nomorTp: idx + 1, // Re-number sequentially
            judul: i.judul.trim(),
            deskripsi: i.deskripsi?.trim() || null,
          })),
        },
      });
      toast.success('Tujuan Pembelajaran berhasil disimpan!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (!academicYearId || !subjectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
          <BookOpen size={28} className="text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pilih Mata Pelajaran</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
          Silakan pilih Tahun Ajaran dan Mata Pelajaran untuk mengelola Tujuan Pembelajaran (TP).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-blue-500 mb-3" />
        <p className="text-xs text-gray-500">Memuat data TP...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Tujuan Pembelajaran: {subjectName || 'Pilih Mapel'}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Jumlah TP bersifat dinamis — tambah atau kurangi sesuai kebutuhan mapel.
          </p>
        </div>
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
        >
          <Plus size={14} />
          Tambah TP
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs border-2 border-dashed border-gray-200 dark:border-[#333] rounded-xl">
          Belum ada Tujuan Pembelajaran. Klik "Tambah TP" untuk menambahkan.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <GripVertical size={14} className="text-gray-300 cursor-grab" />
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.judul}
                    onChange={e => updateItem(idx, 'judul', e.target.value)}
                    placeholder={`Judul Tujuan Pembelajaran ${idx + 1}`}
                    className="w-full px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#0d0d0d] rounded-lg border border-gray-200 dark:border-[#333] focus:bg-white dark:focus:bg-[#111] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <textarea
                    value={item.deskripsi}
                    onChange={e => updateItem(idx, 'deskripsi', e.target.value)}
                    placeholder="Deskripsi / Cakupan Materi (opsional)"
                    rows={2}
                    className="w-full px-3 py-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#0d0d0d] rounded-lg border border-gray-200 dark:border-[#333] focus:bg-white dark:focus:bg-[#111] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition"
                  title="Hapus TP"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Menyimpan...' : 'Simpan Tujuan Pembelajaran'}
          </button>
        </div>
      )}
    </div>
  );
};
