import { useState, useEffect, useRef } from 'react';
import { ScannerEngine } from './components/ScannerEngine';
import { apiClient } from '../../lib/api';
import { smartSend, offlineCache } from '../../lib/syncEngine';
import { toast } from 'sonner';
import { LogIn, LogOut, Keyboard, Info, CheckCircle2, XCircle, Clock, QrCode, Camera, BarChart2, List, WifiOff } from 'lucide-react';

type ScanMode = 'masuk' | 'pulang';
type InputMode = 'kamera' | 'usb_manual';

export const PublicScannerPage = () => {
  const [scanMode, setScanMode] = useState<ScanMode>('masuk');
  const [inputMode, setInputMode] = useState<InputMode>('kamera');
  const [manualNis, setManualNis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logHariIni, setLogHariIni] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<'scanner' | 'stats' | 'log'>('scanner');
  
  const usbInputRef = useRef<HTMLInputElement>(null);

  // Waktu saat ini
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('id-ID'));
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('id-ID')), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatsAndLog = async () => {
    try {
      const [statsRes, logRes] = await Promise.all([
        apiClient<any>('/attendance/today/stats'),
        apiClient<any[]>('/attendance/today/log?limit=5')
      ]);
      setStats(statsRes);
      setLogHariIni(logRes);
    } catch (err) {
      console.error('Gagal fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchStatsAndLog();
    // Auto-refresh stats every 5 mins
    const interval = setInterval(fetchStatsAndLog, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fokus input USB saat mode USB aktif
  useEffect(() => {
    if (inputMode === 'usb_manual' && usbInputRef.current) {
      usbInputRef.current.focus();
    }
  }, [inputMode]);

  const playBeep = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'square';
      o.frequency.value = type === 'success' ? 880 : 300;
      g.gain.setValueAtTime(0.5, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (type === 'success' ? 0.15 : 0.4));
      o.start();
      o.stop(audioCtx.currentTime + (type === 'success' ? 0.15 : 0.4));
    } catch (e) {
      // Ignored
    }
    
    // Vibrate if available
    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate([80, 40, 80]);
      else navigator.vibrate(400);
    }
  };

  const processScan = async (nis: string, method: string) => {
    if (!nis || nis.length < 3 || isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await smartSend('attendance_scan', {
        nis, jenis: scanMode, method, timestamp: Date.now()
      }, `Presensi ${nis} via ${method}`);

      if (result.fromCache) {
        // Offline — show optimistic response
        try {
          const cached = await offlineCache.lookupStudent(nis);
          toast.custom(() => (
            <div className="bg-white border-l-4 border-orange-400 rounded-lg shadow-lg p-4 flex items-start gap-3 w-80">
              <WifiOff className="text-orange-500 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-gray-800">{cached?.fullName || `NIS: ${nis}`}</h4>
                {cached?.className && <p className="text-sm text-gray-600">{nis} | {cached.className}</p>}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
                  📱 Tersimpan Offline
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Akan disinkronkan otomatis saat online</p>
              </div>
            </div>
          ), { duration: 3000 });
        } catch {
          // Fallback toast if lookupStudent fails (e.g. no cached student data)
          toast.custom(() => (
            <div className="bg-white border-l-4 border-orange-400 rounded-lg shadow-lg p-4 flex items-start gap-3 w-80">
              <WifiOff className="text-orange-500 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-gray-800">NIS: {nis}</h4>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
                  📱 Tersimpan Offline
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Akan disinkronkan otomatis saat online</p>
              </div>
            </div>
          ), { duration: 3000 });
        }
        playBeep('success');
      } else if (result.result) {
        const data = result.result;
        if (data.success) {
          toast.custom(() => (
            <div className="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 flex items-start gap-3 w-80">
              <CheckCircle2 className="text-green-500 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-gray-800">{data.nama}</h4>
                <p className="text-sm text-gray-600">{data.nis} | {data.kelas}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                  {data.status} • {data.jam}
                </div>
              </div>
            </div>
          ), { duration: 3000 });
          playBeep('success');
          fetchStatsAndLog(); // Refresh list
        } else {
          toast.custom(() => (
            <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 flex items-start gap-3 w-80">
              <XCircle className="text-red-500 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-red-700">Gagal</h4>
                <p className="text-sm text-gray-600">{data.message}</p>
              </div>
            </div>
          ), { duration: 3000 });
          playBeep('error');
        }
      }
    } catch (error: any) {
      console.error('[Scanner] processScan error:', error);
      toast.error('Error: ' + (error.message || 'Terjadi kesalahan'));
      playBeep('error');
    } finally {
      setIsLoading(false);
      setManualNis(''); // Reset manual input
      if (inputMode === 'usb_manual' && usbInputRef.current) {
        usbInputRef.current.focus();
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualNis) processScan(manualNis, 'manual');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
      
      {/* Left Column - Scanner */}
      <div className={`flex-1 flex-col p-3 md:p-6 md:pr-3 max-w-2xl mx-auto w-full pb-20 md:pb-6 ${mobileTab === 'scanner' ? 'flex' : 'hidden md:flex'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <QrCode className="text-indigo-600" size={24} />
              Gate Scanner
            </h1>
            <p className="text-xs text-slate-500 font-medium">Sistem Informasi Manajemen MAN 2 Lotim</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-indigo-600 font-mono tracking-tighter">{currentTime}</div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
          </div>
        </div>

        {/* Scan Mode Toggle */}
        <div className="flex p-1 bg-slate-200/70 rounded-xl mb-4 shadow-inner">
          <button
            onClick={() => setScanMode('masuk')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all duration-300 text-sm ${
              scanMode === 'masuk' 
                ? 'bg-green-500 text-white shadow shadow-green-500/30' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogIn size={16} />
            ABSEN MASUK
          </button>
          <button
            onClick={() => setScanMode('pulang')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all duration-300 text-sm ${
              scanMode === 'pulang' 
                ? 'bg-blue-500 text-white shadow shadow-blue-500/30' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogOut size={16} />
            ABSEN PULANG
          </button>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex gap-4 mb-3 border-b border-slate-200 pb-1 px-2">
          <button
            onClick={() => setInputMode('kamera')}
            className={`pb-2 font-semibold text-xs transition-colors relative ${inputMode === 'kamera' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Kamera HP/PC
            {inputMode === 'kamera' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
          <button
            onClick={() => setInputMode('usb_manual')}
            className={`pb-2 font-semibold text-xs transition-colors relative ${inputMode === 'usb_manual' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            USB Scanner / Manual
            {inputMode === 'usb_manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
          </button>
        </div>

        {/* Scanner Area */}
        <div className="bg-white p-2 md:p-3 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col min-h-[55vh] md:min-h-[300px]">
          {inputMode === 'kamera' ? (
            <ScannerEngine 
              isActive={inputMode === 'kamera'} 
              onScan={(data) => processScan(data, 'qr_scan')} 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center min-h-[250px] p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex-1">
              <Keyboard size={40} className="text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-base mb-1">Gunakan Barcode Scanner</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-[250px]">
                Arahkan kursor ke kolom di bawah ini dan scan kartu/HP siswa menggunakan alat scanner USB.
              </p>
              <form onSubmit={handleManualSubmit} className="w-full max-w-[250px]">
                <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                  <input
                    ref={usbInputRef}
                    type="text"
                    value={manualNis}
                    onChange={(e) => setManualNis(e.target.value)}
                    placeholder="Scan atau ketik NIS..."
                    className="flex-1 py-2 px-3 text-sm outline-none w-full"
                    autoFocus
                  />
                  <button 
                    type="submit" 
                    disabled={isLoading || !manualNis}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 font-bold text-xs transition disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Stats & Log */}
      <div className={`w-full md:w-80 lg:w-96 bg-white md:border-l border-slate-200 flex-col h-auto md:h-screen md:sticky top-0 pb-16 md:pb-0 ${mobileTab !== 'scanner' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 md:p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          {/* STATS SECTION */}
          <div className={`${mobileTab === 'stats' || mobileTab === 'scanner' ? 'hidden md:block' : ''}${mobileTab === 'stats' ? ' !block' : ''}`}>
            <h2 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
              <Info size={16} className="text-indigo-500" /> Statistik Hari Ini
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Hadir</div>
                <div className="text-xl font-black text-emerald-700">{stats?.Hadir || 0}</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Terlambat</div>
                <div className="text-xl font-black text-amber-700">{stats?.Terlambat || 0}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Pulang</div>
                <div className="text-xl font-black text-blue-700">{stats?.pulang || 0}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Belum</div>
                <div className="text-xl font-black text-slate-700">{stats?.belum_absen || 0}</div>
              </div>
            </div>
          </div>

          {/* LOG SECTION */}
          <div className={`${mobileTab === 'log' || mobileTab === 'scanner' ? 'hidden md:block' : ''}${mobileTab === 'log' ? ' !block' : ''}`}>
            <h2 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" /> Log Real-time
            </h2>
            <div className="space-y-2">
              {logHariIni.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">Belum ada data hari ini</div>
              ) : (
                logHariIni.map((log) => (
                  <div key={log.id} className="flex items-center p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition cursor-default">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {log.nama.charAt(0)}
                    </div>
                    <div className="ml-2.5 flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{log.nama}</p>
                      <p className="text-[10px] text-slate-500 truncate">{log.kelas} • {log.nis}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        log.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' :
                        log.status === 'Terlambat' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.status}
                      </span>
                      <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {log.checkOut ? log.checkOut.slice(0,5) : (log.checkIn ? log.checkIn.slice(0,5) : (log.createdAt ? new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="hidden md:block p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 font-medium">
          MandaApp Attendance System &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 flex items-center justify-around pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setMobileTab('scanner')} 
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${mobileTab === 'scanner' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Camera size={20} />
          <span className="text-[10px] font-bold">Scanner</span>
        </button>
        <button 
          onClick={() => setMobileTab('stats')} 
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${mobileTab === 'stats' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BarChart2 size={20} />
          <span className="text-[10px] font-bold">Statistik</span>
        </button>
        <button 
          onClick={() => setMobileTab('log')} 
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${mobileTab === 'log' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <List size={20} />
          <span className="text-[10px] font-bold">Log Absen</span>
        </button>
      </div>

    </div>
  );
};
