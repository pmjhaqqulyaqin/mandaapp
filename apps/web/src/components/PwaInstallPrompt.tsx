import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * PWA Install Prompt — shows a sleek bottom banner when:
 * - Android/Chrome: intercepts beforeinstallprompt → native install
 * - iOS Safari: shows manual instruction to "Add to Home Screen"
 * - Auto-hides if already running as standalone (installed)
 * - Remembers dismissal for 7 days
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    const dismissedAt = parseInt(val, 10);
    const daysPassed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysPassed < DISMISS_DAYS;
  } catch { return false; }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSafari(): boolean {
  return /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed or recently dismissed
    if (isStandalone() || isDismissed()) return;

    // --- iOS / Safari path ---
    if (isIOS() || isSafari()) {
      setIsIosDevice(true);
      // Show after 2s delay on iOS
      const timer = setTimeout(() => {
        setShow(true);
        setTimeout(() => setAnimateIn(true), 100);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // --- Chrome / Android path ---
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
      setTimeout(() => setAnimateIn(true), 100);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    const installedHandler = () => {
      setAnimateIn(false);
      setTimeout(() => setShow(false), 400);
      deferredPrompt.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      setAnimateIn(false);
      setTimeout(() => setShow(false), 400);
    }
    deferredPrompt.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch {}
    setAnimateIn(false);
    setTimeout(() => setShow(false), 400);
  }, []);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pwa-slide-down {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }
        @keyframes pwa-pulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(0,200,212,0.3); }
          50%      { box-shadow: 0 2px 20px rgba(0,200,212,0.55); }
        }
        .pwa-banner-enter { animation: pwa-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        .pwa-banner-exit  { animation: pwa-slide-down 0.35s cubic-bezier(0.7,0,0.84,0) forwards; }
        .pwa-install-btn  { animation: pwa-pulse 2s ease-in-out infinite; }
      `}</style>

      <div
        className={animateIn ? 'pwa-banner-enter' : 'pwa-banner-exit'}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          padding: '0 12px 12px',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1a2332 0%, #0f1923 100%)',
            border: '1px solid rgba(0, 200, 212, 0.35)',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 -4px 30px rgba(0,0,0,0.35), 0 0 20px rgba(0,200,212,0.08)',
          }}
        >
          {/* App Icon */}
          <img
            src="/pwa-icon-192x192.png"
            alt="MAN 2 Lotim"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              flexShrink: 0,
            }}
          />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: '#ffffff',
                lineHeight: 1.3,
              }}
            >
              Install MAN 2 Lotim
            </div>
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.4,
                marginTop: 2,
              }}
            >
              {isIosDevice ? (
                <>
                  Ketuk{' '}
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center',
                    verticalAlign: 'middle',
                    background: 'rgba(0,200,212,0.15)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    margin: '0 2px',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c8d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </span>
                  {' '}lalu <strong style={{ color: '#fff' }}>"Add to Home Screen"</strong>
                </>
              ) : (
                'Akses lebih cepat dari layar utama'
              )}
            </div>
          </div>

          {/* Install Button (Chrome) or OK (iOS) */}
          {isIosDevice ? (
            <button
              onClick={handleDismiss}
              style={{
                background: 'linear-gradient(135deg, #00c8d4, #00a5b4)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '9px 16px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              OK
            </button>
          ) : (
            <button
              onClick={handleInstall}
              className="pwa-install-btn"
              style={{
                background: 'linear-gradient(135deg, #00c8d4, #00a5b4)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '9px 18px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'transform 0.15s',
              }}
              onMouseDown={(e) => { (e.target as HTMLElement).style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
            >
              Install
            </button>
          )}

          {/* Dismiss X */}
          <button
            onClick={handleDismiss}
            aria-label="Tutup"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              padding: 4,
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
