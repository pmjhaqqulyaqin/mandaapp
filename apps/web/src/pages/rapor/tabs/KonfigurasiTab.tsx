import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, Loader2, Settings, Info, Sliders } from 'lucide-react';

interface Props {
  academicYearId: string;
  semester: string;
  classId: string;
  subjectId: string;
}

export const KonfigurasiTab = ({ academicYearId, semester, classId, subjectId }: Props) => {
  const [bobotTp, setBobotTp] = useState(60);
  const [bobotSas, setBobotSas] = useState(40);
  const [kktp, setKktp] = useState(75);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(() => {
    if (!academicYearId) return;
    setLoading(true);
    const params = new URLSearchParams({ academicYearId, semester });
    if (classId) params.append('classId', classId);
    if (subjectId) params.append('subjectId', subjectId);

    apiClient<any>(`/rapor/config?${params.toString()}`)
      .then(data => {
        setBobotTp(data.bobotTp ?? 60);
        setBobotSas(data.bobotSas ?? 40);
        setKktp(data.kktp ?? 75);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [academicYearId, semester, classId, subjectId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleBobotChange = (val: number) => {
    setBobotTp(val);
    setBobotSas(100 - val);
  };

  const handleSave = async () => {
    if (!academicYearId) return;
    setSaving(true);
    try {
      await apiClient('/rapor/config', {
        method: 'POST',
        data: {
          academicYearId, semester,
          classId: classId || null,
          subjectId: subjectId || null,
          bobotTp, bobotSas, kktp,
        },
      });
      toast.success('Konfigurasi bobot berhasil disimpan!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  if (!academicYearId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mb-4">
          <Settings size={28} className="text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pilih Tahun Ajaran</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Pilih tahun ajaran terlebih dahulu.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-gray-400 mb-3" />
        <p className="text-xs text-gray-500">Memuat konfigurasi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Konfigurasi Bobot Penilaian</h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          KMA 450/2024 membolehkan madrasah menentukan formula NA.
          {!classId && !subjectId && ' (Konfigurasi global — berlaku untuk semua kelas & mapel)'}
          {classId && subjectId && ' (Konfigurasi khusus kelas & mapel ini)'}
        </p>
      </div>

      {/* Bobot TP */}
      <div className="bg-white dark:bg-[#111] p-5 rounded-xl border border-gray-200 dark:border-[#222] space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sliders size={16} className="text-emerald-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pembobotan Nilai Akhir</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span>Bobot Rerata Sumatif Materi (TP)</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{bobotTp}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={90}
            step={5}
            value={bobotTp}
            onChange={e => handleBobotChange(parseInt(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer h-2"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>30%</span>
            <span>90%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span>Bobot Sumatif Akhir Semester (SAS)</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{bobotSas}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-[#222] h-3 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full transition-all rounded-full" style={{ width: `${bobotSas}%` }} />
          </div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-[#0d0d0d] rounded-lg flex items-start gap-2 border border-gray-100 dark:border-[#222]">
          <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            <strong className="text-gray-700 dark:text-gray-300">Formula:</strong>{' '}
            <code className="bg-gray-100 dark:bg-[#1a1a1a] px-1.5 py-0.5 rounded text-[10px]">
              NA = (Rerata TP × {bobotTp}%) + (SAS × {bobotSas}%)
            </code>
          </div>
        </div>
      </div>

      {/* KKTP */}
      <div className="bg-white dark:bg-[#111] p-5 rounded-xl border border-gray-200 dark:border-[#222] space-y-3">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-amber-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={50}
            max={95}
            value={kktp}
            onChange={e => setKktp(Math.min(95, Math.max(50, parseInt(e.target.value) || 75)))}
            className="w-20 px-3 py-2.5 text-center text-sm font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#0d0d0d] rounded-lg border border-gray-200 dark:border-[#333] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Siswa dengan NA ≥ <strong className="text-gray-700 dark:text-gray-300">{kktp}</strong> dinyatakan <span className="text-emerald-600 font-semibold">Tuntas</span></p>
            <p>Siswa dengan NA &lt; <strong className="text-gray-700 dark:text-gray-300">{kktp}</strong> perlu <span className="text-red-600 font-semibold">Remidial/Intervensi</span></p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>
    </div>
  );
};
