import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, GraduationCap, ArrowRight, Info, Clock } from 'lucide-react';

import { apiClient } from '../../../lib/api';

interface PPDBPopupModalProps {
  onClose?: () => void;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // total ms remaining
}

const calculateTimeLeft = (target: Date): TimeLeft => {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    total: diff,
  };
};

/** Single countdown digit box */
const CountdownBox: React.FC<{ value: number; label: string; color: 'blue' | 'emerald' }> = ({ value, label, color }) => {
  const gradients = {
    blue: 'from-blue-600 to-indigo-700',
    emerald: 'from-emerald-600 to-teal-700',
  };
  return (
    <div className="flex flex-col items-center">
      <div className={`relative w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-xl bg-gradient-to-br ${gradients[color]} shadow-lg flex items-center justify-center overflow-hidden`}>
        {/* Subtle glass overlay */}
        <div className="absolute inset-0 bg-white/5 rounded-xl" />
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-xl" />
        <span className="relative text-2xl sm:text-3xl font-black text-white tabular-nums font-mono tracking-tight">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
};

/** Animated colon separator */
const ColonSeparator: React.FC = () => (
  <div className="flex flex-col items-center gap-1.5 pb-5">
    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
  </div>
);

export const PPDBPopupModal: React.FC<PPDBPopupModalProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [popupMode, setPopupMode] = useState<string>('pendaftaran');
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [countdownTarget, setCountdownTarget] = useState<Date | null>(null);
  const [countdownLabel, setCountdownLabel] = useState('');
  const [ctaDisabled, setCtaDisabled] = useState(false);
  const [activeJalurList, setActiveJalurList] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Memoized tick function
  const tick = useCallback(() => {
    if (!countdownTarget) return;
    const tl = calculateTimeLeft(countdownTarget);
    setTimeLeft(tl);
    if (tl.total <= 0) {
      // Countdown finished
      if (intervalRef.current) clearInterval(intervalRef.current);
      setCtaDisabled(false); // enable CTA when countdown ends (for pengumuman mode)
    }
  }, [countdownTarget]);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await apiClient<any>('/ppdb/config');
        if (config && config.isActive && config.jalur && config.jalur.length > 0) {
          const now = new Date();
          let shouldShow = false;
          let viewMode = 'pendaftaran'; // 'pendaftaran' or 'pengumuman'
          let cdTarget: Date | null = null;
          let cdLabel = '';
          let disableCta = false;

          const pengumumanDate = config.tanggalPengumuman ? new Date(config.tanggalPengumuman) : null;
          const batasDaftarUlang = config.batasDaftarUlang ? new Date(config.batasDaftarUlang) : null;

          if (pengumumanDate) {
            // Calculate H-2 before pengumuman
            const twoDaysBefore = new Date(pengumumanDate.getTime() - 2 * 24 * 60 * 60 * 1000);

            if (now >= pengumumanDate) {
              // Fase Pengumuman (sudah lewat tanggal pengumuman)
              if (!batasDaftarUlang || now <= batasDaftarUlang) {
                shouldShow = true;
                viewMode = 'pengumuman';
                // No countdown needed — pengumuman sudah aktif
              }
            } else if (now >= twoDaysBefore) {
              // H-2 s/d H-0: tampilkan popup pengumuman dengan countdown
              shouldShow = true;
              viewMode = 'pengumuman';
              cdTarget = pengumumanDate;
              cdLabel = 'Pengumuman dimulai dalam';
              disableCta = true; // CTA disabled until pengumuman time
            }
          }

          if (!shouldShow) {
            // Fase Pendaftaran — cek apakah ada jalur yang masih buka
            const openJalur = config.jalur.filter((j: any) => {
              const isBuka = j.jadwalBuka ? new Date(j.jadwalBuka) <= now : true;
              const isTutup = j.jadwalTutup ? new Date(j.jadwalTutup) >= now : true;
              return isBuka && isTutup;
            });

            if (openJalur.length > 0) {
              shouldShow = true;
              viewMode = 'pendaftaran';
              setActiveJalurList(openJalur);

              // Find closest jadwalTutup among open jalur
              const closingDates = openJalur
                .filter((j: any) => j.jadwalTutup)
                .map((j: any) => new Date(j.jadwalTutup));

              if (closingDates.length > 0) {
                const closestClose = new Date(Math.min(...closingDates.map((d: Date) => d.getTime())));
                
                // Show countdown if closing is within 24 hours from now
                const hoursUntilClose = (closestClose.getTime() - now.getTime()) / (1000 * 60 * 60);
                if (hoursUntilClose > 0 && hoursUntilClose <= 24) {
                  cdTarget = closestClose;
                  cdLabel = 'Pendaftaran ditutup dalam';
                }
              }
            }
          }

          if (shouldShow) {
            setPopupMode(viewMode);
            setCtaDisabled(disableCta);
            if (cdTarget) {
              setCountdownTarget(cdTarget);
              setCountdownLabel(cdLabel);
              setTimeLeft(calculateTimeLeft(cdTarget));
            }
            // Show after a brief delay for page load
            setTimeout(() => {
              setIsVisible(true);
              setTimeout(() => setIsAnimating(true), 50);
            }, 800);
          }
        }
      } catch (err) {
        console.error('Failed to load PPDB config for popup:', err);
      }
    };
    checkConfig();
  }, []);

  // Start countdown interval when target is set
  useEffect(() => {
    if (countdownTarget) {
      // Initial tick
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countdownTarget, tick]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const handleAction = (action: 'daftar' | 'info') => {
    if (ctaDisabled) return;
    handleDismiss();
    setTimeout(() => {
      if (popupMode === 'pengumuman') {
        // Navigate to the tracking/status section directly
        navigate('/ppdb#tracking-section');
        setTimeout(() => {
          document.getElementById('tracking-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      } else if (action === 'info') {
        navigate('/ppdb#info-section');
        setTimeout(() => {
          document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      } else {
        navigate('/ppdb');
      }
    }, 350);
  };

  if (!isVisible) return null;

  const isPengumuman = popupMode === 'pengumuman';
  const showCountdown = timeLeft !== null && timeLeft.total > 0;
  const countdownColor = isPengumuman ? 'blue' : 'emerald';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${
          isAnimating ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600" />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all z-10"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <GraduationCap className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${isPengumuman ? 'text-blue-600' : 'text-emerald-600'}`}>
            {isPengumuman ? 'Pengumuman Kelulusan' : 'Penerimaan Murid Baru'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight">
            {isPengumuman ? 'PMB ' : 'SIMPMB '}
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isPengumuman ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-blue-600'}`}>
              2026
            </span>
          </h2>

          {/* Divider */}
          <div className={`w-16 h-0.5 mx-auto my-4 rounded-full bg-gradient-to-r ${isPengumuman ? 'from-blue-400 to-indigo-500' : 'from-emerald-400 to-blue-500'}`} />

          {/* Subtitle */}
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Madrasah Aliyah Negeri 2 Lombok Timur
          </p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto mb-6">
            {isPengumuman 
              ? (ctaDisabled 
                  ? 'Pengumuman hasil seleksi penerimaan murid baru akan segera diumumkan. Harap tunggu hingga waktu yang ditentukan.'
                  : 'Hasil seleksi penerimaan murid baru telah resmi diumumkan. Silakan periksa status kelulusan Anda.')
              : 'Laman untuk memfasilitasi sistem penerimaan murid baru secara daring'}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {popupMode === 'pendaftaran' && activeJalurList.map((jalur, idx) => {
              const isPrestasi = jalur.namaJalur?.toLowerCase().includes('prestasi');
              const isReguler = jalur.namaJalur?.toLowerCase().includes('reguler');
              const isSingle = activeJalurList.length === 1;

              const sizeClasses = isSingle 
                ? 'px-5 py-2.5 text-sm shadow-md' 
                : 'px-3 py-1.5 text-xs';
              const iconSize = isSingle ? 'text-lg' : 'text-base';

              if (isPrestasi) {
                return (
                  <span key={idx} className={`inline-flex items-center gap-2 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200 transition-all ${sizeClasses}`}>
                    <span className={iconSize}>🏆</span> {jalur.namaJalur}
                  </span>
                );
              } else if (isReguler) {
                return (
                  <span key={idx} className={`inline-flex items-center gap-2 bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200 transition-all ${sizeClasses}`}>
                    <span className={iconSize}>📋</span> {jalur.namaJalur}
                  </span>
                );
              }
              return (
                <span key={idx} className={`inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200 transition-all ${sizeClasses}`}>
                  <span className={iconSize}>✨</span> {jalur.namaJalur || 'Jalur Aktif'}
                </span>
              );
            })}

            {isPengumuman && (
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 text-sm font-bold rounded-full border border-blue-200 shadow-md">
                <span className="text-lg">📢</span> {ctaDisabled ? 'Menunggu Pengumuman' : 'Pengumuman Kelulusan'}
              </span>
            )}
          </div>

          {/* ====== COUNTDOWN TIMER ====== */}
          {showCountdown && (
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold mb-4">
                <Clock size={12} className="animate-pulse" />
                {countdownLabel}
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <CountdownBox value={timeLeft.hours} label="Jam" color={countdownColor} />
                <ColonSeparator />
                <CountdownBox value={timeLeft.minutes} label="Menit" color={countdownColor} />
                <ColonSeparator />
                <CountdownBox value={timeLeft.seconds} label="Detik" color={countdownColor} />
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handleAction('daftar')}
              disabled={ctaDisabled}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 text-white font-bold rounded-xl shadow-lg transition-all duration-300 text-sm bg-gradient-to-r ${
                ctaDisabled 
                  ? 'from-gray-400 to-gray-500 cursor-not-allowed opacity-60 shadow-none' 
                  : isPengumuman 
                    ? 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95' 
                    : 'from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95'
              }`}
            >
              {isPengumuman ? '🚀 Cek Hasil Kelulusan' : '🚀 Mulai Pendaftaran'}
              <ArrowRight size={16} />
            </button>
            {popupMode === 'pendaftaran' && (
              <button
                onClick={() => handleAction('info')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 hover:border-blue-300 shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm"
              >
                <Info size={16} />
                Info Lengkap
              </button>
            )}
          </div>

          {/* Disabled CTA hint */}
          {ctaDisabled && (
            <p className="mt-3 text-[10px] text-gray-400 italic">
              Tombol akan aktif pada waktu pengumuman
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
