/* FRA — service worker (offline-first, cache-first pentru shell) */
const CACHE = "fra-v4";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/styles.css",
  "./js/config.js", "./js/vendor/supabase.js", "./js/data.js", "./js/store.js", "./js/supa.js", "./js/app.js",
  "./icons/logo.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png",
  "./assets/maps/hermes.jpg", "./assets/maps/doripesco.jpg",
  "./assets/maps/sacosu.jpg", "./assets/maps/bradeni.jpg",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // cererile cross-origin (ex. Supabase) trec direct la rețea, fără cache
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
