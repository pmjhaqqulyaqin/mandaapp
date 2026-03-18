import { useState } from 'react';
import { Button, Badge, MetricCard, Modal } from '@mandaapp/ui';
import { useSystem } from '../../hooks/api/useSystem';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  RefreshCcw, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Github, 
  Activity, 
  Clock,
  History,
  Info
} from 'lucide-react';

export const SystemUpdateCenter = () => {
  const { getStatus, checkUpdates, uploadUpdate, rollbackUpdate } = useSystem();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updateStep, setUpdateStep] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');

  const status = getStatus.data;
  const updateInfo = checkUpdates.data;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        toast.error('Hanya file .zip yang diperbolehkan.');
        return;
      }
      setSelectedFile(file);
      setUpdateStep('idle');
      setUploadProgress(0);
    }
  };

  const executeManualUpdate = async () => {
    if (!selectedFile) return;
    setIsUpdateConfirmOpen(false);
    setUpdateStep('uploading');
    setUploadProgress(0);

    try {
      const result = await uploadUpdate.mutateAsync({ 
        file: selectedFile, 
        onProgress: (p) => {
          setUploadProgress(p);
          if (p === 100) setUpdateStep('processing');
        }
      });
      
      setUpdateStep('done');
      toast.success(result.message || 'Sistem berhasil diperbarui!', { duration: 5000 });
      setSelectedFile(null);
      getStatus.refetch();
    } catch (e: any) {
      setUpdateStep('idle');
      setUploadProgress(0);
      const errorMessage = e?.response?.data?.error || e.message || 'Gagal memasang update. Periksa koneksi atau file ZIP.';
      toast.error(errorMessage, { duration: 6000 });
      console.error('Update Manual Error:', e);
    }
  };

  const executeRollback = async () => {
    setIsRollbackConfirmOpen(false);
    const toastId = toast.loading('Sedang mengembalikan versi sistem (Rollback)...');
    try {
      const result = await rollbackUpdate.mutateAsync();
      toast.success(result.message || 'Rollback berhasil! Sistem kembali ke versi sebelumnya.', { id: toastId });
      getStatus.refetch();
    } catch (e: any) {
      toast.error(e.message || 'Gagal melakukan rollback. Backup mungkin tidak ditemukan.', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Pusat Update Sistem
            <ShieldCheck className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Kelola integritas dan pembaruan aplikasi MandaApp.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-200">
            <Activity className="w-3 h-3 mr-1" />
            Server: {getStatus.isLoading ? '...' : (getStatus.data?.writable ? 'Ready' : 'Connected')}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => getStatus.refetch()} disabled={getStatus.isRefetching}>
            <RefreshCcw className={`w-4 h-4 ${getStatus.isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Versi Saat Ini"
          value={status?.version || '1.0.0'}
          icon={<Clock className="text-primary" />}
          trend={{ value: 'Latest', isPositive: true }}
        />
        <MetricCard
          title="Lingkungan"
          value={status?.environment?.toUpperCase() || 'PRODUCTION'}
          icon={<ShieldCheck className="text-emerald-500" />}
        />
        <MetricCard
          title="Uptime Sistem"
          value={`${Math.floor((status?.uptime || 0) / 3600)} Jam`}
          icon={<Activity className="text-amber-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method 1: online sync placeholder */}
        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Online Update (GitHub)</h3>
                <p className="text-xs text-gray-500">Sinkronisasi kode dari repositori pusat.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center p-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-dashed border-gray-200 dark:border-[#222]">
            {checkUpdates.isLoading ? (
              <div className="text-center space-y-2">
                <RefreshCcw className="w-8 h-8 mx-auto text-primary animate-spin" />
                <p className="text-sm text-gray-500">Memeriksa pembaruan...</p>
              </div>
            ) : updateInfo?.hasUpdate ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Versi Baru Tersedia</span>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600">{updateInfo.latestVersion}</Badge>
                </div>
                <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-lg text-xs text-gray-500 border border-gray-100 dark:border-[#222]">
                  <p className="font-semibold mb-1">Release Notes:</p>
                  {updateInfo.releaseNotes}
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90" variant="primary">
                  Mulai Sync Sekarang
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Sistem Mutakhir</h4>
                  <p className="text-xs text-gray-500 mt-1">Versi {status?.version || '1.0.0'} adalah versi terbaru saat ini.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <Info className="w-3 h-3" />
            <span>Memerlukan akses GitHub Personal Access Token di setting server.</span>
          </div>
        </div>

        {/* Method 2: Manual ZIP Package */}
        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Manual Update (Zip)</h3>
                <p className="text-xs text-gray-500">Upload package dist.zip untuk update instan.</p>
              </div>
            </div>

            <div className="space-y-4">
              {updateStep === 'idle' ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 dark:border-[#222] rounded-xl cursor-pointer bg-gray-50 dark:bg-[#0a0a0a] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="p-3 bg-white dark:bg-[#111] rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-primary" />
                      </div>
                      <p className="mb-1 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold text-primary">Klik untuk unggah</span> paket update
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">dist.zip (Max 50MB)</p>
                    </div>
                    <input type="file" className="hidden" accept=".zip" onChange={handleFileChange} />
                  </label>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] space-y-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {updateStep === 'uploading' ? 'Mengunggah file...' : 
                       updateStep === 'processing' ? 'Mengekstrak paket...' : 'Selesai!'}
                    </span>
                    <span className="text-primary font-bold">{updateStep === 'done' ? '100' : uploadProgress}%</span>
                  </div>
                  
                  <div className="w-full h-3 bg-gray-200 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out flex items-center justify-center"
                      style={{ width: `${updateStep === 'done' ? 100 : uploadProgress}%` }}
                    >
                      <div className="w-full h-full bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs">
                    <div className={`flex items-center gap-1 ${uploadProgress > 0 ? 'text-primary' : 'text-gray-400'}`}>
                      <Upload className="w-3 h-3" /> Upload
                    </div>
                    <div className={`flex items-center gap-1 ${updateStep === 'processing' || updateStep === 'done' ? 'text-primary' : 'text-gray-400'}`}>
                      <RefreshCcw className={`w-3 h-3 ${updateStep === 'processing' ? 'animate-spin' : ''}`} /> Ekstraksi
                    </div>
                    <div className={`flex items-center gap-1 ${updateStep === 'done' ? 'text-emerald-500' : 'text-gray-400'}`}>
                      <CheckCircle2 className="w-3 h-3" /> Verifikasi
                    </div>
                  </div>
                </div>
              )}

              {selectedFile && updateStep === 'idle' && (
                <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB - Siap Kirim</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>Batal</Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => setIsUpdateConfirmOpen(true)}>
                      Mulai Update
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-100 dark:border-[#222] flex flex-col gap-3">
            {updateStep === 'done' && (
               <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                 <CheckCircle2 className="w-4 h-4" />
                 Update Berhasil! Refresh halaman untuk melihat perubahan.
                 <Button size="sm" variant="ghost" className="ml-auto" onClick={() => window.location.reload()}>Refresh</Button>
               </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Punya kendala setelah update?</span>
              </div>
              <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900/30 dark:hover:bg-amber-900/10"
                  onClick={() => setIsRollbackConfirmOpen(true)}
              >
                <RefreshCcw className="w-3 h-3 mr-2" />
                Rollback ke Backup
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-6 flex gap-4">
        <div className="bg-amber-100 dark:bg-amber-900/20 p-3 h-fit rounded-xl text-amber-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 dark:text-amber-100">Protokol Keamanan & Backup</h4>
          <p className="text-sm text-amber-800 dark:text-amber-200/70 leading-relaxed">
            Sistem Update Center menggunakan skrip bridge yang aman. Setiap pembaruan yang Anda pasang akan secara otomatis membuat cadangan (backup) di server Dewahoster. Jika terjadi kegagalan pemuatan halaman setelah update, gunakan fitur <strong>Rollback</strong> untuk mengembalikan kondisi sistem dalam sekejap.
          </p>
        </div>
      </div>

      {/* Confirmation Modals */}
      <Modal 
        isOpen={isUpdateConfirmOpen} 
        onClose={() => setIsUpdateConfirmOpen(false)}
        title="Konfirmasi Pembaruan Sistem"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-xl">
             <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                Peringatan: Proses ini akan menimpa file frontend Anda di server Dewahoster.
             </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sistem akan mengunggah file ZIP dan mengekstraknya di Dewahoster. Proses ini biasanya memakan waktu 30-60 detik tergantung besar file. Lanjutkan?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsUpdateConfirmOpen(false)}>Batal</Button>
            <Button onClick={executeManualUpdate} disabled={uploadUpdate.isPending}>
              Mulai Upload & Install
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isRollbackConfirmOpen} 
        onClose={() => setIsRollbackConfirmOpen(false)}
        title="Kembalikan Versi (Rollback)?"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl flex gap-3">
             <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
             <p className="text-sm text-red-900 dark:text-red-100 font-medium">
                Sistem akan kembali ke kondisi cadangan (*backup*) terakhir yang tersimpan.
             </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gunakan fitur ini hanya jika versi saat ini mengalami error atau tidak bisa diakses. Perubahan terbaru yang belum di-backup akan hilang.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsRollbackConfirmOpen(false)}>Batal</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={executeRollback} disabled={rollbackUpdate.isPending}>
              {rollbackUpdate.isPending ? 'Proses Rollback...' : 'Ya, Rollback Sekarang'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


