/**
 * useAttendanceSound — Audio feedback hook for attendance scan
 * 
 * Plays a "Terima Kasih" voice clip (male/female selectable) when a scan succeeds.
 * Voice preference is stored in localStorage (per-device setting, works offline).
 * 
 * Usage:
 *   const { playSuccess } = useAttendanceSound();
 *   // After successful scan:
 *   playSuccess();
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceType = 'pria' | 'wanita' | 'off';

const STORAGE_KEY = 'attendance_voice';
const DEFAULT_VOICE: VoiceType = 'wanita';

const AUDIO_MAP: Record<Exclude<VoiceType, 'off'>, string> = {
  pria: '/sounds/terima-kasih-pria.mp3',
  wanita: '/sounds/terima-kasih-wanita.mp3',
};

export function useAttendanceSound() {
  const [voiceType, setVoiceTypeState] = useState<VoiceType>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as VoiceType) || DEFAULT_VOICE;
    } catch {
      return DEFAULT_VOICE;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUnlockedRef = useRef(false);

  // Persist voice preference to localStorage
  const setVoiceType = useCallback((type: VoiceType) => {
    setVoiceTypeState(type);
    try {
      localStorage.setItem(STORAGE_KEY, type);
    } catch {
      // localStorage not available (private browsing, etc.)
    }
  }, []);

  // Pre-load audio whenever voiceType changes
  useEffect(() => {
    if (voiceType === 'off') {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(AUDIO_MAP[voiceType]);
    audio.preload = 'auto';
    audio.volume = 1.0;
    audioRef.current = audio;

    // Cleanup
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [voiceType]);

  // Unlock audio context on first user interaction (required by mobile browsers)
  useEffect(() => {
    if (isUnlockedRef.current) return;

    const unlock = () => {
      if (isUnlockedRef.current) return;
      isUnlockedRef.current = true;

      // Create a silent play to unlock audio context
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          audioRef.current!.volume = 1.0;
        }).catch(() => {});
      }

      // Remove listeners after unlock
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };

    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // Play success sound ("Terima Kasih")
  const playSuccess = useCallback(() => {
    if (voiceType === 'off' || !audioRef.current) return;

    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().catch((err) => {
      console.warn('[AttendanceSound] Autoplay blocked:', err.message);
    });
  }, [voiceType]);

  // Play a specific voice type (for test/preview in settings)
  const playTest = useCallback((type: Exclude<VoiceType, 'off'>) => {
    const audio = new Audio(AUDIO_MAP[type]);
    audio.volume = 1.0;
    audio.play().catch((err) => {
      console.warn('[AttendanceSound] Test play blocked:', err.message);
    });
  }, []);

  return {
    voiceType,
    setVoiceType,
    playSuccess,
    playTest,
  };
}
