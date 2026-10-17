import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, Clock, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { useAttendanceSound, type VoiceType } from '../../../hooks/useAttendanceSound';

export const AttendanceSettingsTab = () => {
  const [settings, setSettings] = useState({
    checkInTime: '06:30',
    lateTime: '07:30',
    checkOutTime: '13:00'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { voiceType, setVoiceType, playTest } = useAttendanceSound();
  const [isTestPlaying, setIsTestPlaying] = useState(false);

  useEffect(() => {
    apiClient<any>('/attendance/settings')
      .then(data => {
        if (data) {
          setSettings({
            checkInTime: data.checkInTime || '06:30',
            lateTime: data.lateTime || '07:30',
            checkOutTime: data.checkOutTime || '13:00'
          });
        }
      })
      .catch(() => toast.error('Gagal mengambil pengaturan waktu'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiClient<any>('/attendance/settings', {
        method: 'PUT',
        data: settings
      });
      if (res && !res.error) {
        toast.success('Pengaturan waktu absensi berhasil disimpan');
      } else {
        toast.error(res.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceChange = (type: VoiceType) => {
    setVoiceType(type);
    if (type !== 'off') {
      toast.success(`Suara feedback diubah ke: ${type === 'pria' ? 'Pria' : 'Wanita'}`);
    } else {
      toast.success('Suara feedback dinonaktifkan');
    }
  };

  const handleTestPlay = () => {
    if (voiceType === 'off') {
      toast.error('Suara feedback sedang nonaktif. Pilih suara pria/wanita terlebih dahulu.');
      return;
    }
    setIsTestPlaying(true);
    playTest(voiceType as 'pria' | 'wanita');
    setTimeout(() => setIsTestPlaying(false), 1500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ── Pengaturan Waktu Absensi ── */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-100 dark:border-[#222] bg-slate-50 dark:bg-black/20">
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
            Pengaturan Waktu Absensi
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Konfigurasi batas waktu absensi masuk dan pulang bagi seluruh siswa.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex p-3 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Informasi Aturan Waktu:</strong>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Siswa yang absensi antara jam 00:00 s.d <strong className="font-semibold">Batas Terlambat</strong> akan berstatus <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Hadir</span>.</li>
                <li>Siswa yang absensi setelah <strong className="font-semibold">Batas Terlambat</strong> akan berstatus <span className="text-amber-600 dark:text-amber-400 font-semibold">Terlambat</span>.</li>
                <li>Absensi kedua yang dilakukan setelah <strong className="font-semibold">Batas Pulang</strong> akan terhitung <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Pulang</span>.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Jam Masuk (Mulai Buka Gerbang)
              </label>
              <input 
                type="time" 
                name="checkInTime"
                value={settings.checkInTime}
                onChange={handleChange}
                className="w-full max-w-[200px] px-2 py-1.5 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">Waktu dimulainya sistem absensi masuk.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                Batas Terlambat
              </label>
              <input 
                type="time" 
                name="lateTime"
                value={settings.lateTime}
                onChange={handleChange}
                className="w-full max-w-[200px] px-2 py-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">Melebihi jam ini otomatis "Terlambat".</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Jam Pulang (Batas Check-Out)
              </label>
              <input 
                type="time" 
                name="checkOutTime"
                value={settings.checkOutTime}
                onChange={handleChange}
                className="w-full max-w-[200px] px-2 py-1.5 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">Scan setelah jam ini terhitung "Pulang".</p>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-black/10 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            Simpan Pengaturan
          </button>
        </div>
      </div>

      {/* ── Pengaturan Suara Feedback ── */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-100 dark:border-[#222] bg-slate-50 dark:bg-black/20">
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Volume2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            Suara Feedback Scan
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Pilih jenis suara "Terima Kasih" yang diputar saat scan presensi berhasil. Pengaturan ini tersimpan per-perangkat.
          </p>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex p-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs items-start gap-2">
            <Volume2 size={14} className="shrink-0 mt-0.5" />
            <span>Suara akan diputar otomatis setelah scan barcode/QR berhasil, sehingga siswa <strong className="font-semibold">tidak perlu melihat layar</strong> untuk mengetahui presensinya terekam.</span>
          </div>

          <div className="space-y-2">
            {/* Suara Wanita */}
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                voiceType === 'wanita'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
              }`}
            >
              <input
                type="radio"
                name="voiceType"
                value="wanita"
                checked={voiceType === 'wanita'}
                onChange={() => handleVoiceChange('wanita')}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">👩 Suara Wanita</span>
                <p className="text-[10px] text-gray-500 mt-0.5">Suara wanita mengucapkan "Terima Kasih"</p>
              </div>
              {voiceType === 'wanita' && (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Aktif</span>
              )}
            </label>

            {/* Suara Pria */}
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                voiceType === 'pria'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
              }`}
            >
              <input
                type="radio"
                name="voiceType"
                value="pria"
                checked={voiceType === 'pria'}
                onChange={() => handleVoiceChange('pria')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">👨 Suara Pria</span>
                <p className="text-[10px] text-gray-500 mt-0.5">Suara pria mengucapkan "Terima Kasih"</p>
              </div>
              {voiceType === 'pria' && (
                <span className="text-[9px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Aktif</span>
              )}
            </label>

            {/* Nonaktif */}
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                voiceType === 'off'
                  ? 'border-gray-500 bg-gray-50 dark:bg-gray-800'
                  : 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
              }`}
            >
              <input
                type="radio"
                name="voiceType"
                value="off"
                checked={voiceType === 'off'}
                onChange={() => handleVoiceChange('off')}
                className="w-4 h-4 text-gray-600 focus:ring-gray-500"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <VolumeX size={14} className="text-gray-400" /> Nonaktif
                </span>
                <p className="text-[10px] text-gray-500 mt-0.5">Tidak ada suara saat scan berhasil</p>
              </div>
              {voiceType === 'off' && (
                <span className="text-[9px] font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Off</span>
              )}
            </label>
          </div>

          {/* Test Suara Button */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#222]">
            <button
              onClick={handleTestPlay}
              disabled={isTestPlaying}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] ${
                voiceType === 'off'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : isTestPlaying
                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
            >
              {isTestPlaying ? (
                <>
                  <div className="flex gap-0.5 items-end h-4">
                    <div className="w-1 bg-emerald-500 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                    <div className="w-1 bg-emerald-500 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                    <div className="w-1 bg-emerald-500 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '300ms' }} />
                    <div className="w-1 bg-emerald-500 rounded-full animate-bounce" style={{ height: '80%', animationDelay: '450ms' }} />
                  </div>
                  Memutar suara...
                </>
              ) : (
                <>
                  <Volume2 size={14} />
                  {voiceType === 'off' ? 'Aktifkan suara untuk test' : `🔊 Test Suara ${voiceType === 'pria' ? 'Pria' : 'Wanita'}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
