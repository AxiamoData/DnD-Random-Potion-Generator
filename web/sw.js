const CACHE = 'minerva-v20';
// Solo assets estáticos — las páginas HTML las gestiona el navegador directamente
// app.js se sirve siempre desde la red para que los deploys sean inmediatos
const ASSETS = [
  './auth.js',
  './feedback.js',
  './login.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './data/potion-data.js',
  './biblioteca.js',
  './taller.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(url => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first para assets estáticos propios. Navegaciones, cross-origin y app.js van directo a red.
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.mode === 'navigate') return; // El navegador gestiona las páginas HTML
  if (e.request.url.includes('/app.js')) return; // Siempre desde la red para deploys inmediatos

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      }).catch(() => {});
    })
  );
});
