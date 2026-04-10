import { FileText, Download, Printer } from 'lucide-react';

interface Props {
  ujianId: string;
  ujian: any;
}

export const BeritaAcaraTab = ({ ujianId, ujian }: Props) => {
  const docTypes = [
    { key: 'ba-sekolah', label: 'Berita Acara Pelaksanaan (Tingkat Sekolah)', desc: 'Berita acara keseluruhan pelaksanaan ujian di tingkat satuan pendidikan', color: 'from-indigo-500 to-violet-500' },
    { key: 'ba-mapel', label: 'Berita Acara per Mata Pelajaran', desc: 'Berita acara otomatis per mata pelajaran sesuai jadwal ujian yang sudah dibuat', color: 'from-violet-500 to-purple-500' },
    { key: 'pakta-pengawas', label: 'Pakta Integritas Pengawas', desc: 'Surat pernyataan integritas untuk seluruh pengawas ujian', color: 'from-blue-500 to-indigo-500' },
    { key: 'pakta-panitia', label: 'Pakta Integritas Panitia', desc: 'Surat pernyataan integritas untuk seluruh anggota panitia ujian', color: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Generate dokumen berita acara dan pakta integritas secara otomatis. Template dapat diedit sebelum dicetak.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {docTypes.map(doc => (
          <div key={doc.key} className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <div className={`h-1 bg-gradient-to-r ${doc.color}`} />
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <FileText size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary dark:text-text-darkPrimary">{doc.label}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{doc.desc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-95"
                  onClick={() => alert('Template cetak akan dikonfigurasikan bersama pengaturan kop ujian')}>
                  <Printer size={12} /> Cetak PDF
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => alert('Export Word akan dikonfigurasikan bersama template')}>
                  <Download size={12} /> Export Word
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          ⚙️ Pengaturan Kop Ujian diperlukan sebelum mencetak dokumen. 
          Kop ujian meliputi: logo, nama instansi, alamat, dan penandatangan. Fitur ini akan dikonfigurasi pada tahap selanjutnya.
        </p>
      </div>
    </div>
  );
};
