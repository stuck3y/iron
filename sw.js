const VERSION = 'v1';
const SHELL = 'isi-shell-' + VERSION;
const RUNTIME = 'isi-runtime-' + VERSION;

const SHELL_ASSETS = [
  '/shared/style.css',
  '/shared/app.js',
  '/shared/lang.js',
  '/shared/pwa.js',
  '/shared/logo.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL)
      .then(function (cache) { return cache.addAll(SHELL_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== RUNTIME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  var isNavigation = req.mode === 'navigate' || req.destination === 'document';
  var sameOrigin = url.origin === self.location.origin;
  var isFontHost = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isNavigation) {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') {
            var copy = res.clone();
            caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  if (isFontHost) {
    event.respondWith(
      caches.open(RUNTIME).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var network = fetch(req).then(function (res) {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(function () { return cached; });
          return cached || network;
        });
      })
    );
  }
});
