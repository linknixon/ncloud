// A simple service worker to make the app installable as a PWA
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // We just let the browser handle everything normally
});
