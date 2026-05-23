import { useState } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { 
  Globe, Link as LinkIcon, Save, Info, Copy, Check
} from 'lucide-react';

export const AlumniSettings = () => {
  const [publicDirEnabled, setPublicDirEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const publicUrl = "https://mandualotim.sch.id/alumni-public";

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      
      {/* Direktori Publik Settings */}
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#0a0a0a]">
          <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary flex items-center gap-2">
            <Globe className="text-primary" size={18} />
            Direktori Publik Alumni
          </h2>
          <p className="text-xs text-text-secondary mt-1">Konfigurasi tampilan portal alumni untuk publik luar (Landing Page luar).</p>
        </div>
        
        <div className="p-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-text-primary dark:text-text-darkPrimary">Aktifkan Direktori Publik</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Izinkan publik mencari data alumni yang telah diverifikasi.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={publicDirEnabled} onChange={(e) => setPublicDirEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className={`transition-all duration-300 ${publicDirEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <label className="text-xs font-semibold text-text-secondary mb-1.5 block">URL Portal Alumni</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-xl px-3 h-10">
                <LinkIcon size={14} className="text-gray-400 shrink-0" />
                <input readOnly value={publicUrl} className="w-full bg-transparent text-sm text-text-primary dark:text-text-darkPrimary outline-none font-mono" />
              </div>
              <Button onClick={handleCopy} variant="outline" className="h-10 px-4 shrink-0">
                {copied ? <Check size={14} className="text-emerald-500 mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                {copied ? 'Disalin' : 'Salin URL'}
              </Button>
            </div>
            <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 flex gap-2">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                Tautkan URL ini pada menu navigasi website profil sekolah (Landing Page) Anda. Data yang ditampilkan hanya alumni dengan status kelulusan yang diverifikasi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tracer Study Settings */}
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#222]">
          <h2 className="text-base font-bold text-text-primary dark:text-text-darkPrimary">Form Tracer Study</h2>
          <p className="text-xs text-text-secondary mt-1">Pengaturan formulir untuk pengumpulan data alumni.</p>
        </div>
        
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-primary w-4 h-4 rounded" />
            <div>
              <p className="text-sm font-semibold">Tanyakan Riwayat Pekerjaan</p>
              <p className="text-[10px] text-gray-500">Mencakup nama instansi, jabatan, dan rentang gaji (opsional).</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-primary w-4 h-4 rounded" />
            <div>
              <p className="text-sm font-semibold">Tanyakan Riwayat Pendidikan Lanjut</p>
              <p className="text-[10px] text-gray-500">Mencakup nama kampus, fakultas, dan program studi.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-primary w-4 h-4 rounded" />
            <div>
              <p className="text-sm font-semibold">Izinkan Upload Bukti Kelulusan/Kerja</p>
              <p className="text-[10px] text-gray-500">Alumni dapat mengunggah file foto atau PDF sebagai bukti.</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-[#222] flex justify-end">
          <Button className="flex items-center gap-2"><Save size={16} /> Simpan Pengaturan</Button>
        </div>
      </div>

    </div>
  );
};
