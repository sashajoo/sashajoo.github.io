// Offline copy of the study guide. HTML is network-first so a fixed page reaches people
// as soon as they are online; fonts and icons are cache-first. The cache name carries the
// build id, so every deploy replaces the old cache.
const CACHE = "uro-guide-0.1.0-20261011054022";
const ASSETS = ["./", "./index.html", "./card.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png",
                "./fonts/Inter.woff2", "./fonts/SourceSerif4.woff2"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.endsWith("version.json")) return;
  const isPage = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (isPage) {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
  } else {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
  }
});
