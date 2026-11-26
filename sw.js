// Offline-Cache. VERSION erhöhen, wenn sich die Dateiliste ändert (Inhalte kommen dank "Netz zuerst" ohnehin frisch).
const VERSION = 'schaufelheld-0.23.0';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'src/main.js', 'src/game.js', 'src/levels.js', 'src/themes.js', 'src/gear.js', 'src/render.js', 'src/sprites.js', 'src/audio.js', 'src/input.js', 'src/ghost.js', 'src/save.js', 'src/online.js', 'src/config.js', 'src/weapons.js', 'src/heroart.js', 'src/progress.js', 'src/ui-skin.js', 'src/cheats.js', 'src/loot.js', 'src/treasury.js', 'src/gen.js', 'src/atmo.js', 'src/daily.js', 'src/names.js', 'src/core.js', 'src/foes.js', 'art/nahtmutter.webp', 'art/nullfuerst.webp', 'src/legend-art.js', 'src/legend-duels.js', 'src/duels.js', 'src/duel-combat.js', 'src/hunts.js', 'src/hunters.js', 'src/roamers.js', 'src/roster.js', 'src/hunt-art.js', 'src/replay.js', 'src/armor.js', 'src/arena.js', 'src/arena-ui.js', 'src/live.js', 'src/sets.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Netz zuerst: Online kommt immer der neueste Stand (mit Zwischenspeicher-Prüfung per ETag),
// offline springt der Cache ein. So muss niemand mehr manuell aktualisieren.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
