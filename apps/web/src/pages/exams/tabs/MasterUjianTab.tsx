import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { CreateUjianModal } from '../components/CreateUjianModal';
import { Edit2, Trash2, Plus, UserPlus, Users, Settings } from 'lucide-react';
import { PengaturanUjianModal } from '../components/PengaturanUjianModal';

interface Props {
  ujian: any;
  onRefresh: () => void;
}

export const MasterUjianTab = ({ ujian, onRefresh }: Props) => {
  const [editOpen, setEditOpen] = useState(false);
  const [pengaturanOpen, setPengaturanOpen] = useState(false);
  const [panitia, setPanitia] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [addPanitiaOpen, setAddPanitiaOpen] = useState(false);
  const [panitiaForm, setPanitiaForm] = useState({ pegawaiId: '', jabatan: '', urutan: 0 });

  const fetchPanitia = async () => {
    try {
      const data = await apiClient<any[]>(`/exams/${ujian.id}/panitia`);
      setPanitia(data);
    } catch { }
  };

  useEffect(() => {
    if (ujian?.id) {
      fetchPanitia();
      apiClient<any[]>('/employees').then(setEmployees).catch(() => {});
    }
  }, [ujian?.id]);

  const handleDeleteUjian = async () => {
    if (!confirm('Yakin hapus ujian ini beserta seluruh datanya (jadwal, ruang, distribusi, dll)?')) return;
    try {
      await apiClient(`/exams/${ujian.id}`, { method: 'DELETE' });
      toast.success('Ujian berhasil dihapus');
      onRefresh();
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const handleAddPanitia = async () => {
    if (!panitiaForm.pegawaiId || !panitiaForm.jabatan) {
      toast.error('Pilih pegawai dan jabatan');
      return;
    }
    try {
      await apiClient(`/exams/${ujian.id}/panitia`, { data: panitiaForm });
      toast.success('Panitia ditambahkan');
      fetchPanitia();
      setAddPanitiaOpen(false);
      setPanitiaForm({ pegawaiId: '', jabatan: '', urutan: panitia.length });
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleDeletePanitia = async (id: string) => {
    if (!confirm('Hapus anggota panitia ini?')) return;
    try {
      await apiClient(`/exams/panitia/${id}`, { method: 'DELETE' });
      fetchPanitia();
    } catch { }
  };

  const inputClass = "w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-xs outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="space-y-5">
      {/* Exam Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
            Informasi Ujian
          </h3>
          <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 space-y-2 text-xs">
            {[
              ['Nama Ujian', ujian.namaUjian],
              ['Jenis', ujian.jenis],
              ['Tahun Ajaran', ujian.tahunAjaran],
              ['Semester', ujian.semester],
              ['Periode', `${new Date(ujian.tanggalMulai).toLocaleDateString('id-ID')} — ${new Date(ujian.tanggalSelesai).toLocaleDateString('id-ID')}`],
              ['Ketua Panitia', ujian.ketuaPanitia?.name || '-'],
              ['Status', ujian.status],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-text-primary dark:text-text-darkPrimary text-right">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 transition-colors">
              <Edit2 size={12} /> Edit Ujian
            </button>
            <button onClick={() => setPengaturanOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 hover:bg-cyan-100 transition-colors">
              <Settings size={12} /> Pengaturan Cetak & Waktu
            </button>
            <button onClick={handleDeleteUjian}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
              <Trash2 size={12} /> Hapus
            </button>
          </div>
        </div>

        {/* Panitia Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
              <div className="w-1 h-4 bg-violet-500 rounded-full" />
              Susunan Panitia
            </h3>
            <button onClick={() => { setAddPanitiaOpen(!addPanitiaOpen); setPanitiaForm({...panitiaForm, urutan: panitia.length}); }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:bg-violet-100 transition-colors">
              <UserPlus size={11} /> Tambah
            </button>
          </div>

          {addPanitiaOpen && (
            <div className="bg-violet-50/50 dark:bg-violet-900/10 rounded-lg p-3 space-y-2 border border-violet-100 dark:border-violet-800/30">
              <select className={inputClass} value={panitiaForm.pegawaiId}
                onChange={e => setPanitiaForm({...panitiaForm, pegawaiId: e.target.value})}>
                <option value="">— Pilih Pegawai —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select className={inputClass} value={panitiaForm.jabatan}
                onChange={e => setPanitiaForm({...panitiaForm, jabatan: e.target.value})}>
                <option value="">— Pilih Jabatan —</option>
                {['Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Anggota'].map(j =>
                  <option key={j} value={j}>{j}</option>
                )}
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAddPanitiaOpen(false)}
                  className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                  Batal
                </button>
                <button onClick={handleAddPanitia}
                  className="px-3 py-1.5 text-[10px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700">
                  Simpan
                </button>
              </div>
            </div>
          )}

          {panitia.length === 0 ? (
            <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-6 text-center">
              <Users size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Belum ada panitia terdaftar</p>
            </div>
          ) : (
            <div className="space-y-1">
              {panitia.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-black/20 rounded-lg group">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 text-[9px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-text-primary dark:text-text-darkPrimary">{p.pegawai?.name || '-'}</p>
                      <p className="text-[10px] text-indigo-500 font-semibold">{p.jabatan}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeletePanitia(p.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateUjianModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh(); toast.success('Ujian diperbarui'); }}
        editData={ujian}
      />

      <PengaturanUjianModal
        isOpen={pengaturanOpen}
        onClose={() => setPengaturanOpen(false)}
        ujianId={ujian.id}
        ujian={ujian}
        onSuccess={() => { setPengaturanOpen(false); onRefresh(); }}
      />
    </div>
  );
};
