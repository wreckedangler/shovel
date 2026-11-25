// Offline-Cache. Bei jeder Veröffentlichung VERSION erhöhen.
const VERSION = 'schaufelheld-0.7.0';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'src/main.js', 'src/game.js', 'src/levels.js', 'src/themes.js', 'src/gear.js', 'src/render.js', 'src/sprites.js',
  'src/audio.js', 'src/input.js', 'src/ghost.js', 'src/save.js', 'src/online.js', 'src/config.js', 'src/weapons.js', 'src/heroart.js', 'src/progress.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.includes('/rest/v1/')) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => hit)));
});
