// GHV Estoque - Service Worker (PWA)
// HTML: network-first (sempre pega a versão nova quando online; cache é só fallback offline).
// Demais arquivos: cache-first com atualização em segundo plano.
const CACHE = 'ghv-estoque-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var isHTML = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (isHTML) {
    // network-first: tenta a rede; se falhar (offline), usa o cache
    e.respondWith(
      fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (c) { return c || caches.match('./index.html'); });
      })
    );
  } else {
    // cache-first: rápido; atualiza em segundo plano
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        var net = fetch(e.request).then(function (resp) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return resp;
        }).catch(function () { return cached; });
        return cached || net;
      })
    );
  }
});
