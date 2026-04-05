const CACHE = 'minerva-v13';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './auth.js',
  './login.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './data/potion-data.js',
  './biblioteca.html',
  './biblioteca.js',
  './taller.html',
  './taller.js',
  './pues.html',
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

// Cache-first para assets propios. Peticiones cross-origin (Supabase, CDNs) van directo a red.
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      }).catch(() => new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    })
  );
});
