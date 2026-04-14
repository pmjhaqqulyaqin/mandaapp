import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, GraduationCap, ArrowRight, Info } from 'lucide-react';

import { apiClient } from '../../../lib/api';

interface PPDBPopupModalProps {
  onClose?: () => void;
}

export const PPDBPopupModal: React.FC<PPDBPopupModalProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [popupMode, setPopupMode] = useState<string>('pendaftaran');
  const navigate = useNavigate();

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await apiClient<any>('/ppdb/config');
        if (config && config.isActive && config.jalur && config.jalur.length > 0) {
          const now = new Date();
          let shouldShow = false;
          let viewMode = 'pendaftaran'; // 'pendaftaran' or 'pengumuman'
          
          if (config.tanggalPengumuman && now >= new Date(config.tanggalPengumuman)) {
            // Fase Pengumuman
            if (!config.batasDaftarUlang || now <= new Date(config.batasDaftarUlang)) {
              shouldShow = true;
              viewMode = 'pengumuman';
            }
          } else {
            // Fase Pendaftaran
            shouldShow = config.jalur.some((j: any) => {
              const isBuka = j.jadwalBuka ? new Date(j.jadwalBuka) <= now : true;
              const isTutup = j.jadwalTutup ? new Date(j.jadwalTutup) >= now : true;
              return isBuka && isTutup;
            });
          }

          if (shouldShow) {
            setPopupMode(viewMode);
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

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  const handleAction = (action: 'daftar' | 'info') => {
    handleDismiss();
    setTimeout(() => {
      if (action === 'daftar') {
        navigate('/ppdb');
      } else {
        navigate('/ppdb');
      }
    }, 350);
  };

  if (!isVisible) return null;

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
          <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${popupMode === 'pengumuman' ? 'text-blue-600' : 'text-emerald-600'}`}>
            {popupMode === 'pengumuman' ? 'Pengumuman Kelulusan' : 'Penerimaan Murid Baru'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight">
            {popupMode === 'pengumuman' ? 'Ujian ' : 'SIMPMB '}
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${popupMode === 'pengumuman' ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-blue-600'}`}>
              2026
            </span>
          </h2>

          {/* Divider */}
          <div className={`w-16 h-0.5 mx-auto my-4 rounded-full bg-gradient-to-r ${popupMode === 'pengumuman' ? 'from-blue-400 to-indigo-500' : 'from-emerald-400 to-blue-500'}`} />

          {/* Subtitle */}
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Madrasah Aliyah Negeri 2 Lombok Timur
          </p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto mb-6">
            {popupMode === 'pengumuman' 
              ? 'Hasil seleksi penerimaan murid baru telah resmi diumumkan. Silakan periksa status kelulusan Anda.' 
              : 'Laman untuk memfasilitasi sistem penerimaan murid baru secara daring'}
          </p>

          {/* Badges */}
          {popupMode === 'pendaftaran' && (
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                🏆 Jalur Prestasi
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                📋 Jalur Reguler
              </span>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handleAction('daftar')}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 text-white font-bold rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-sm bg-gradient-to-r ${popupMode === 'pengumuman' ? 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25 hover:shadow-blue-500/40' : 'from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 shadow-emerald-500/25 hover:shadow-emerald-500/40'}`}
            >
              {popupMode === 'pengumuman' ? '🚀 Cek Hasil Kelulusan' : '🚀 Mulai Pendaftaran'}
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
