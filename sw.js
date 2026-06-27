// Envanter - Service Worker v1.0
const CACHE_VERSION = 'envanter-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API çağrılarını her zaman ağdan getir (Apps Script)
  if (url.hostname.includes('script.google.com')) {
    return; // Browser default
  }
  
  // Google Drive thumbnail'ları ağdan, ama hata olursa cache'den
  if (url.hostname.includes('googleusercontent.com') || url.hostname.includes('drive.google.com')) {
    event.respondWith(
      fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }
  
  // Google Fonts: cache-first
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }
  
  // Shell: cache-first, ağa fallback
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(res => {
      if (res.ok && request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
      }
      return res;
    }))
  );
});
