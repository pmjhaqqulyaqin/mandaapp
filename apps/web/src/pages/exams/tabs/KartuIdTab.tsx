import { CreditCard, Users, UserCheck, Download, Printer } from 'lucide-react';

interface Props {
  ujianId: string;
  ujian: any;
}

export const KartuIdTab = ({ ujianId, ujian }: Props) => {
  const docTypes = [
    { key: 'kartu-peserta', icon: CreditCard, label: 'Kartu Peserta Ujian', desc: 'Generate kartu peserta dari data siswa yang sudah didistribusikan ke ruang ujian', color: 'indigo' },
    { key: 'id-panitia', icon: Users, label: 'ID Card Panitia', desc: 'Generate ID Card untuk seluruh anggota panitia ujian', color: 'violet' },
    { key: 'id-pengawas', icon: UserCheck, label: 'ID Card Pengawas', desc: 'Generate ID Card untuk seluruh pengawas yang sudah ditugaskan', color: 'blue' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800/30',
    violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 border-violet-100 dark:border-violet-800/30',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-800/30',
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Pilih jenis kartu/ID Card yang ingin di-generate. Format dan template desain akan dikonfigurasikan kemudian.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {docTypes.map(doc => {
          const Icon = doc.icon;
          return (
            <div key={doc.key} className={`rounded-xl border p-4 space-y-3 ${colorMap[doc.color]}`}>
              <div className="flex items-center gap-2">
                <Icon size={20} />
                <h4 className="text-sm font-semibold">{doc.label}</h4>
              </div>
              <p className="text-[11px] opacity-80">{doc.desc}</p>
              <div className="flex gap-2 pt-1">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => alert('Fitur cetak akan dikonfigurasikan setelah template disepakati')}>
                  <Printer size={12} /> Cetak PDF
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-text-primary dark:text-text-darkPrimary hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => alert('Fitur export akan dikonfigurasikan setelah template disepakati')}>
                  <Download size={12} /> Export
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          ⚙️ Pengaturan Kop Ujian & Template akan ditambahkan setelah format disepakati. 
          Data peserta, panitia, dan pengawas sudah terintegrasikan secara otomatis dari tab-tab sebelumnya.
        </p>
      </div>
    </div>
  );
};
