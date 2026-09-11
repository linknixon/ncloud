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

    // Check localStorage to see if user dismissed the prompt before
    const hasDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';

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
        };
      }
    }
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
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-slide-up pb-safe">
      <div className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4 max-w-md mx-auto relative overflow-hidden backdrop-blur-xl bg-opacity-95">
        
        {/* Shine effect */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

        <div className="flex items-center gap-4 z-10 flex-1">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Download size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm m-0">Install Nova Cloud</h3>
            <p className="text-slate-400 text-xs mt-0.5 leading-tight pr-2">
              {isIOS 
                ? 'Tap Share below, then "Add to Home Screen"' 
                : 'Install for a faster, app-like experience'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 z-10 shrink-0">
          {!isIOS && (
            <button
              onClick={handleInstallClick}
              className="bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* iOS Pointer if needed */}
      {isIOS && (
        <div className="flex justify-center mt-2 animate-bounce">
          <Share size={20} className="text-white/50" />
        </div>
      )}
    </div>
  );
}
