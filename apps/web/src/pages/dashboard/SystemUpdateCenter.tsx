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
  Info,
  Download
} from 'lucide-react';

export const SystemUpdateCenter = () => {
  const { getStatus, checkUpdates, uploadUpdate, rollbackUpdate, syncGithub } = useSystem();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updateStep, setUpdateStep] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStep, setSyncStep] = useState<'idle' | 'downloading' | 'processing' | 'done'>('idle');

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

    // Simulate progress for smooth UX while waiting for backend
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      setUpdateStep(prevStep => {
        currentProgress += (100 - currentProgress) * 0.15; // smooth ease out
        if (currentProgress > 95) currentProgress = 95;
        setUploadProgress(Math.round(currentProgress));
        
        // Auto transition to processing text if it takes a while
        if (currentProgress > 50 && prevStep === 'uploading') {
          return 'processing';
        }
        return prevStep;
      });
    }, 800);

    try {
      const result = await uploadUpdate.mutateAsync({ 
        file: selectedFile, 
        onProgress: (p) => {
          // Map real browser upload to 0-50%
          const mapped = Math.round(p * 0.5);
          if (mapped > currentProgress) {
            currentProgress = mapped;
            setUploadProgress(mapped);
          }
          if (p === 100) setUpdateStep('processing');
        }
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUpdateStep('done');
      toast.success(result.message || 'Sistem berhasil diperbarui!', { duration: 5000 });
      setSelectedFile(null);
      getStatus.refetch();
    } catch (e: any) {
      clearInterval(progressInterval);
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

  const executeGithubSync = async () => {
    setSyncStep('downloading');
    setSyncProgress(0);

    // Simulate progress for smooth UX while waiting for backend
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      setSyncStep(prevStep => {
        currentProgress += (100 - currentProgress) * 0.15; // smooth ease out
        if (currentProgress > 95) currentProgress = 95;
        setSyncProgress(Math.round(currentProgress));
        
        // Auto transition to processing text if it takes a while
        if (currentProgress > 60 && prevStep === 'downloading') {
          return 'processing';
        }
        return prevStep;
      });
    }, 800);

    try {
      const result = await syncGithub.mutateAsync();
      clearInterval(progressInterval);
      setSyncProgress(100);
      setSyncStep('done');
      toast.success(result.message || 'Sinkronisasi GitHub berhasil!', { duration: 5000 });
      getStatus.refetch();
      checkUpdates.refetch();
    } catch (e: any) {
      clearInterval(progressInterval);
      setSyncStep('idle');
      setSyncProgress(0);
      const errorMessage = e?.response?.data?.error || e.message || 'Gagal sinkronisasi dari GitHub.';
      toast.error(errorMessage, { duration: 6000 });
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
          <p className="text-gray-500 dark:text-gray-400">Kelola pembaruan otomatis aplikasi MandaApp (Versi Docker VPS).</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-200">
            <Activity className="w-3 h-3 mr-1" />
            Server: {getStatus.isLoading ? '...' : (getStatus.data?.environment || 'Ready')}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => getStatus.refetch()} disabled={getStatus.isRefetching}>
            <RefreshCcw className={`w-4 h-4 ${getStatus.isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Versi Saat Ini (Commit)"
          value={status?.version || 'Unknown'}
          icon={<Clock className="text-primary" />}
          trend={{ value: 'Active', isPositive: true }}
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

      <div className="max-w-4xl">
        {/* Method 1: online sync placeholder */}
        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Github className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">1-Click VPS Update (GitHub)</h3>
                <p className="text-xs text-gray-500">Sinkronisasi kode dari repositori GitHub & Rebuild Docker Otomatis.</p>
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
              syncStep === 'idle' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Pembaruan Kode Ditemukan!</span>
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">Commit #{updateInfo.latestVersion}</Badge>
                  </div>
                  <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-lg text-xs text-gray-500 border border-gray-100 dark:border-[#222]">
                    <p className="font-semibold mb-1">Release Notes:</p>
                    {updateInfo.releaseNotes}
                  </div>
                  <Button 
                     className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50" 
                     variant="primary"
                     onClick={executeGithubSync}
                     disabled={syncGithub.isPending}
                  >
                    🚀 Trigger Rebuild Server Sekarang
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-[#222] space-y-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium animate-pulse">
                      Mengeksekusi "docker compose up -d --build" pada VPS...
                    </span>
                    <span className="text-primary font-bold">{syncStep === 'done' ? '100' : syncProgress}%</span>
                  </div>
                  
                  <div className="w-full h-3 bg-gray-200 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out flex items-center justify-center"
                      style={{ width: `${syncStep === 'done' ? 100 : syncProgress}%` }}
                    >
                      <div className="w-full h-full bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs">
                    <div className={`flex items-center gap-1 ${syncProgress > 0 ? 'text-primary' : 'text-gray-400'}`}>
                      <Download className="w-3 h-3" /> git pull
                    </div>
                    <div className={`flex items-center gap-1 ${syncStep === 'processing' || syncStep === 'done' ? 'text-primary' : 'text-gray-400'}`}>
                      <RefreshCcw className={`w-3 h-3 ${syncStep === 'processing' ? 'animate-spin' : ''}`} /> docker build
                    </div>
                    <div className={`flex items-center gap-1 ${syncStep === 'done' ? 'text-emerald-500' : 'text-gray-400'}`}>
                      <CheckCircle2 className="w-3 h-3" /> Selesai
                    </div>
                  </div>
                  
                  {syncStep === 'done' && (
                     <div className="mt-4 text-center">
                       <p className="text-xs text-amber-600 mb-2">Mohon tunggu 30-60 detik selagi mesin VPS me-restart aplikasi secara paksa, lalu muat ulang halaman ini.</p>
                       <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.location.reload()}>Muat Ulang Halaman</Button>
                     </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Sistem Sangat Mutakhir</h4>
                  <p className="text-xs text-gray-500 mt-1">Commit versi {status?.version || '1.0.0'} adalah versi terbaru saat ini. VPS Anda tidak memerlukan pembaruan.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <Info className="w-3 h-3" />
            <span>Memerlukan akses socket Docker di VPS Anda (Telah disetting). Dilarang menekan update saat masa jam sibuk karena aplikasi akan down sementara (sekitar 1 menit) untuk rebuilding.</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-6 flex gap-4 max-w-4xl">
        <div className="bg-amber-100 dark:bg-amber-900/20 p-3 h-fit rounded-xl text-amber-600 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 dark:text-amber-100">Protokol Pembaruan Docker (Hati-hati!)</h4>
          <p className="text-sm text-amber-800 dark:text-amber-200/70 leading-relaxed">
            Sistem Update ini bersifat radikal dengan fitur <strong>Docker-in-Docker Socket Mounting</strong>. Ketika sinkronisasi dimulai, Admin API Anda akan memberikan instruksi *shell* ke sistem CentOS/Ubuntu VPS secara gaib untuk membunuh dan mengkompilasi ulang aplikasi ini. Tolong sediakan jeda <strong>1 Menit</strong> setelah menekan tombol jangan akses web sama sekali, hingga notifikasi 502 Bad Gateway di depan hilang.
          </p>
        </div>
      </div>
    </div>
  );
};


