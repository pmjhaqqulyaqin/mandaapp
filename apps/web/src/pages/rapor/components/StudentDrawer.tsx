import { useState } from 'react';
import { X, Sparkles, Save, Award, BookOpen, Star } from 'lucide-react';

interface TpDef {
  id: string;
  nomorTp: number;
  judul: string;
  deskripsi?: string;
}

interface StudentRow {
  no: number;
  studentId: string;
  fullName: string;
  nisn: string;
  nis: string;
  className: string;
  gradeId: string | null;
  nilaiTp: Record<string, number>;
  nilaiSas: number | null;
  rerataTp: string | null;
  nilaiAkhir: string | null;
  predikat: string | null;
  catatanFormatif: string | null;
  deskripsiCapaian: string | null;
  isLocked: boolean;
}

interface RaporConfig {
  bobotTp: number;
  bobotSas: number;
  kktp: number;
}

interface Props {
  student: StudentRow;
  tpList: TpDef[];
  config: RaporConfig;
  onClose: () => void;
  onSave: (updated: StudentRow) => void;
}

export const StudentDrawer = ({ student, tpList, config, onClose, onSave }: Props) => {
  const [narasi, setNarasi] = useState(student.deskripsiCapaian || '');
  const [catFormatif, setCatFormatif] = useState(student.catatanFormatif || '');

  const initials = student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('');
  const na = parseFloat(student.nilaiAkhir || '0');
  const isTuntas = na >= config.kktp;

  const predikatColor = (p: string | null) => {
    switch (p) {
      case 'Sangat Baik': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Baik': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Cukup': return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Perlu Bimbingan': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const regenerateNarasi = () => {
    const entries = Object.entries(student.nilaiTp)
      .filter(([_, v]) => v !== null && v !== undefined && !isNaN(Number(v)))
      .map(([key, score]) => {
        const tp = tpList.find(t => String(t.nomorTp) === key);
        return { key, score: Number(score), title: tp?.judul || `Tujuan Pembelajaran ${key}` };
      });

    if (entries.length === 0) return;
    entries.sort((a, b) => b.score - a.score);
    const maxTp = entries[0];
    const minTp = entries[entries.length - 1];

    if (minTp.score >= config.kktp) {
      setNarasi(`Menunjukkan penguasaan yang sangat baik dalam ${maxTp.title}, serta capaian kompetensi ${minTp.title} telah tuntas mencapai kriteria ketercapaian dengan optimal.`);
    } else {
      setNarasi(`Menunjukkan penguasaan yang baik dalam ${maxTp.title}; namun masih memerlukan bimbingan terarah dan tindak lanjut remedial dalam ${minTp.title}.`);
    }
  };

  const handleSave = () => {
    onSave({
      ...student,
      deskripsiCapaian: narasi || null,
      catatanFormatif: catFormatif || null,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#111] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
            <div>
              <h3 className="text-sm font-bold">{student.fullName}</h3>
              <p className="text-[11px] text-emerald-100">
                {student.nisn ? `NISN: ${student.nisn}` : ''} {student.nis ? `• NIS: ${student.nis}` : ''} {student.className ? `• ${student.className}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0a0a0a]">
          {/* NA Summary */}
          <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-[#222] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-medium text-gray-500 uppercase">Nilai Akhir Rapor (NA)</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">{student.nilaiAkhir || '-'}</span>
                {student.predikat && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${predikatColor(student.predikat)}`}>
                    {student.predikat}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-medium text-gray-500 uppercase">Status KKTP</span>
              <p className={`text-xs font-semibold mt-0.5 ${isTuntas ? 'text-emerald-600' : 'text-red-600'}`}>
                {isTuntas ? 'Tuntas' : 'Belum Tuntas (Remidial)'}
              </p>
            </div>
          </div>

          {/* TP Scores Detail */}
          <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-[#222]">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-emerald-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Detail Nilai per Tujuan Pembelajaran</span>
            </div>
            <div className="space-y-2">
              {tpList.map(tp => {
                const val = student.nilaiTp?.[String(tp.nomorTp)];
                const isLow = val !== undefined && val !== null && Number(val) < config.kktp;
                return (
                  <div key={tp.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-[#0d0d0d]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {tp.nomorTp}
                      </span>
                      <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate" title={tp.judul}>{tp.judul}</span>
                    </div>
                    <span className={`text-xs font-bold ${isLow ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}>
                      {val ?? '-'}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Rerata TP</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{student.rerataTp || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">SAS</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{student.nilaiSas ?? '-'}</span>
              </div>
            </div>
          </div>

          {/* Catatan Formatif */}
          <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-[#222]">
            <div className="flex items-center gap-2 mb-2">
              <Star size={14} className="text-amber-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Catatan Asesmen Formatif</span>
              <span className="text-[9px] text-gray-400 ml-auto">Non-Kuantitatif Rapor</span>
            </div>
            <textarea
              value={catFormatif}
              onChange={e => setCatFormatif(e.target.value)}
              rows={3}
              placeholder="Catatan observasi guru: keaktifan diskusi, kesiapan tugas, adab belajar..."
              className="w-full bg-gray-50 dark:bg-[#0d0d0d] rounded-lg p-2.5 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#222] focus:bg-white dark:focus:bg-[#111] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Narasi Deskripsi Rapor */}
          <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-[#222] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Naskah Deskripsi Capaian Rapor</label>
              <button
                onClick={regenerateNarasi}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Sparkles size={12} />
                Regenerasi Otomatis
              </button>
            </div>
            <textarea
              value={narasi}
              onChange={e => setNarasi(e.target.value)}
              rows={5}
              placeholder="Deskripsi naratif capaian kompetensi siswa..."
              className="w-full bg-gray-50 dark:bg-[#0d0d0d] rounded-lg p-2.5 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#222] focus:bg-white dark:focus:bg-[#111] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            <p className="text-[10px] text-gray-400">
              Format baku: menarasikan capaian tertinggi (TP dikuasai optimal) dan ruang pembinaan (TP butuh penguatan).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-[#111] border-t border-gray-200 dark:border-[#222] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#222] text-xs font-medium text-gray-700 dark:text-gray-300 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
          >
            <Save size={14} />
            Terapkan Perubahan
          </button>
        </div>
      </div>
    </>
  );
};
