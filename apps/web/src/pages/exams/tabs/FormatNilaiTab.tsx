import { FileSpreadsheet, Download, Printer } from 'lucide-react';

interface Props {
  ujianId: string;
  ujian: any;
}

export const FormatNilaiTab = ({ ujianId, ujian }: Props) => {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Generate lembar penilaian/jawaban per mata ujian. Format dapat dikustomisasi sesuai kebutuhan.
      </p>

      <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <FileSpreadsheet size={24} className="text-emerald-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">Format Penilaian Ujian</h4>
              <p className="text-[10px] text-gray-500">Generate lembar penilaian per mata pelajaran berdasarkan jadwal ujian</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <p>📋 Fitur yang akan tersedia:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Lembar penilaian per mata pelajaran (otomatis dari jadwal)</li>
              <li>Kustomisasi format: pilihan ganda, esai, atau campuran</li>
              <li>Header otomatis dengan kop ujian</li>
              <li>Export Excel & Cetak PDF massal</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95"
              onClick={() => alert('Fitur format penilaian akan dikonfigurasikan setelah format disepakati')}>
              <Printer size={12} /> Cetak PDF
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
              onClick={() => alert('Export Excel akan dikonfigurasikan setelah format disepakati')}>
              <Download size={12} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          ⚙️ Format penilaian dan pengaturan kop ujian akan dikonfigurasi pada tahap selanjutnya setelah template disepakati.
        </p>
      </div>
    </div>
  );
};
