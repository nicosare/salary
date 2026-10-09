/* Salary PWA Service Worker */
const CACHE_NAME = 'salary-pwa-v2';
const BASE_URL = self.registration.scope;
const CORE_ASSETS = [
  BASE_URL,
  BASE_URL + 'index.html',
  BASE_URL + 'manifest.webmanifest',
  BASE_URL + 'icons/icon-192.svg',
  BASE_URL + 'icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('salary-pwa-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).protocol === 'chrome-extension:') return;

  // Always try the network first for page navigations, falling back to the cached app offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(BASE_URL) || caches.match(BASE_URL + 'index.html');
        })
    );
    return;
  }

  // Serve cached resources immediately; cache successful network responses for offline use.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(request));
    })
  );
});
