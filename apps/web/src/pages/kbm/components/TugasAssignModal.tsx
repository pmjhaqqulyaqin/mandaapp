import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';

interface Props {
  academicYearId: string;
  semester: string;
  onClose: () => void;
  onSaved: () => void;
}

export const TugasAssignModal = ({ academicYearId, semester, onClose, onSaved }: Props) => {
  const [guruList, setGuruList] = useState<any[]>([]);
  const [masterList, setMasterList] = useState<any[]>([]);
  const [guruId, setGuruId] = useState('');
  const [masterId, setMasterId] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [setaraJam, setSetaraJam] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient<any[]>('/employees?type=Guru'),
      apiClient<any[]>('/kbm/tugas-master'),
    ]).then(([guru, master]) => {
      setGuruList((guru as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)));
      setMasterList(master as any[]);
    }).catch(() => {});
  }, []);

  const handleMasterChange = (id: string) => {
    setMasterId(id);
    const master = masterList.find(m => m.id === id);
    if (master) setSetaraJam(String(master.defaultSetaraJam));
  };

  const handleSave = async () => {
    if (!guruId || !masterId) return toast.error('Pilih guru dan jenis tugas');
    setSaving(true);
    try {
      await apiClient('/kbm/tugas', {
        method: 'POST',
        data: {
          academicYearId, semester, guruId, masterId,
          keterangan: keterangan || null,
          setaraJam: Number(setaraJam) || 0,
        },
      });
      toast.success('Tugas berhasil ditambahkan');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // Group masters by kategori for the dropdown
  const kategoriGroups = [
    { label: 'Struktural', items: masterList.filter(m => m.kategori === 'struktural') },
    { label: 'Kurikulum', items: masterList.filter(m => m.kategori === 'kurikulum') },
    { label: 'Kesiswaan', items: masterList.filter(m => m.kategori === 'kesiswaan') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#161616] rounded-2xl w-full max-w-md p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Assign Tugas Tambahan</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Guru</label>
            <select
              value={guruId}
              onChange={(e) => setGuruId(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none"
            >
              <option value="">Pilih Guru...</option>
              {guruList.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Jenis Tugas</label>
            <select
              value={masterId}
              onChange={(e) => handleMasterChange(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none"
            >
              <option value="">Pilih Tugas...</option>
              {kategoriGroups.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map(m => (
                    <option key={m.id} value={m.id}>{m.namaTugas} ({m.defaultSetaraJam} jam)</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Keterangan (opsional)</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Wali Kelas X.1"
              className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Setara Jam</label>
            <input
              type="number"
              value={setaraJam}
              onChange={(e) => setSetaraJam(e.target.value)}
              min="0"
              className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-[12px] font-semibold rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[12px] font-semibold rounded-xl bg-purple-500 text-white hover:bg-purple-600 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};
