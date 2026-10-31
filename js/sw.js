/* =====================================================================
   SW.JS — a tiny "service worker" so the game still opens when the
   mobile signal is weak.

   It always tries the internet FIRST (so players get your latest edits
   straight away) and only uses the saved copy when there's no signal.
   You normally never edit this.
   ===================================================================== */
var CACHE = 'kampung-raya-rush-v2';

var CORE = [
  './',
  'index.html',
  'css/style.css',
  'js/game.js',
  'js/game-config.js',
  'assets/logo.png'          // fine if this file doesn't exist yet
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Internet first, saved copy as a backup.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true });
    })
  );
});
