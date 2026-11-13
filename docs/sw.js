// Offline cache for Shut Up and Get Structured. Written by build.py; the version changes with every build.
const CACHE = 'sugs-02631347e4', FILES = ['./', './index.html', './amphiphile-assembly-lab.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './icon.svg', './apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// the cached copy first (works with no internet); a new version is picked up on the next build's install
self.addEventListener('fetch', (e) => { const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then((hit) => hit || fetch(r).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); return res; }))); });
