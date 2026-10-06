import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the user is on iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    // Check if the app is already installed/running in standalone mode
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isRunningStandalone);

    // Check localStorage to see if user dismissed the prompt in the last 24 hours
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed_time');
    const hasDismissed = dismissedTime && (Date.now() - Number(dismissedTime) < 24 * 60 * 60 * 1000);

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    if (!isRunningStandalone && !hasDismissed) {
      if (isIosDevice) {
        // iOS doesn't support beforeinstallprompt, so we just show the prompt
        setShowPrompt(true);
      } else {
        // Android/Desktop Chrome support beforeinstallprompt
        const handleBeforeInstallPrompt = (e) => {
          e.preventDefault();
          setDeferredPrompt(e);
          setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed_time', String(Date.now()));
  };

  const isAdminPath = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/admin') || 
    window.location.search.includes('tab=') ||
    window.location.hash.includes('admin')
  );

  if (isAdminPath || !showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '18px',
      left: '16px',
      right: '16px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        pointerEvents: 'auto',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)'
          }}>
            <Download size={22} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>Install Nova Cloud</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0', lineHeight: '1.3' }}>
              {isIOS 
                ? 'Tap Share below, then "Add to Home Screen"' 
                : 'Install for a faster, app-like experience'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {!isIOS && (
            <button
              onClick={handleInstallClick}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* iOS Pointer */}
      {isIOS && (
        <div style={{ marginTop: '6px', opacity: 0.7, pointerEvents: 'auto' }}>
          <Share size={20} color="#ffffff" />
        </div>
      )}
    </div>
  );
}
