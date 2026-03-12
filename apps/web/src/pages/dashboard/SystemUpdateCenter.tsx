import { useState } from 'react';
import { Button, Badge, MetricCard } from '@mandaapp/ui';
import { useSystem } from '../../hooks/api/useSystem';
import { toast } from 'sonner';

export const SystemUpdateCenter = () => {
  const { getStatus, checkUpdates, uploadUpdate } = useSystem();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const status = getStatus.data;
  const updateInfo = checkUpdates.data;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleManualUpdate = async () => {
    if (!selectedFile) return;
    try {
      await uploadUpdate.mutateAsync(selectedFile);
      toast.success('Paket update berhasil diupload! Sistem akan segera memproses.');
      setSelectedFile(null);
    } catch (e) {
      toast.error('Gagal mengupload paket update.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pusat Update Sistem</h1>
          <p className="text-gray-500 dark:text-gray-400">Kelola pembaruan aplikasi secara online maupun manual.</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          Server Status: {getStatus.isLoading ? 'Checking...' : 'Online'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Versi Saat Ini"
          value={status?.version || '...'}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M18.4 4.6a10 10 0 1 1-12.8 0"/></svg>}
          trend={{ value: '0.1', isPositive: true }}
          trendLabel="Latest"
        />
        <MetricCard
          title="Lingkungan"
          value={status?.environment?.toUpperCase() || '...'}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>}
        />
        <MetricCard
          title="Uptime Sistem"
          value={`${Math.floor((status?.uptime || 0) / 3600)} Jam`}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method 1: GitHub Sync */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-3-7-3"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Online Update (GitHub)</h3>
              <p className="text-xs text-gray-500">Sinkronisasi otomatis dengan repository pusat.</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            {checkUpdates.isLoading ? (
              <p className="text-sm text-gray-500">Memeriksa update dari GitHub...</p>
            ) : updateInfo?.hasUpdate ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tersedia Versi Baru:</span>
                  <Badge variant="success">{updateInfo.latestVersion}</Badge>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {updateInfo.releaseNotes}
                </p>
                <Button className="w-full" disabled>
                  Update Sekarang (Otomatis)
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span className="text-sm font-medium">Sistem Anda sudah mutakhir!</span>
              </div>
            )}
          </div>
          
          <p className="text-[10px] text-gray-400">Update online memerlukan koneksi internet dan akses ke repositori GitHub MandaApp.</p>
        </div>

        {/* Method 2: Manual Package */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Manual Update (Zip)</h3>
              <p className="text-xs text-gray-500">Upload file *.zip secara manual (Offline/Private).</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-emerald-600">Klik untuk upload</span> package update
                  </p>
                  <p className="text-xs text-gray-400">ZIP (MAX. 50MB)</p>
                </div>
                <input type="file" className="hidden" accept=".zip" onChange={handleFileChange} />
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate">{selectedFile.name}</span>
                </div>
                <Button size="sm" onClick={handleManualUpdate} disabled={uploadUpdate.isPending}>
                  {uploadUpdate.isPending ? 'Mendekompresi...' : 'Pasang Update'}
                </Button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400">Versi manual sangat berguna jika server tidak memiliki akses internet langsung.</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 flex gap-4">
        <div className="bg-amber-100 dark:bg-amber-900/40 p-3 h-fit rounded-xl text-amber-600 dark:text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 dark:text-amber-100">Catatan Keamanan Sistem</h4>
          <p className="text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed">
            Pembaruan sistem melibatkan penggantian file core aplikasi. Pastikan Anda telah melakukan backup database sebelum menjalankan update besar. Jika update gagal, Anda dapat mengembalikan sistem melalui repository GitHub atau paket backup manual.
          </p>
        </div>
      </div>
    </div>
  );
};
