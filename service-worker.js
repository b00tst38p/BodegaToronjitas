const CACHE_NAME = 'bodega-toronjitas-v3';
const APP_SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];
// Solo se guardan en caché la propia app, el SDK de Firebase y las fuentes.
// Las llamadas a Firestore y Authentication nunca pasan por aquí.
const CACHEABLE_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;

  const store = (response) => {
    if (response && response.status === 200) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
    }
    return response;
  };

  if (sameOrigin) {
    // La app: primero la red (para recibir actualizaciones); sin señal, la copia guardada
    event.respondWith(fetch(req).then(store).catch(() => caches.match(req).then((c) => c || caches.match('./index.html'))));
  } else {
    // SDK y fuentes: copia guardada primero
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req).then(store)));
  }
});
