// Offline copy of the study guide. HTML is network-first so a fixed page reaches people
// as soon as they are online; fonts and icons are cache-first (font files carry a content
// hash in their name, so a changed font is a new URL). The cache name carries the build id,
// so every deploy replaces the old cache. It also carries the scope, so the live notes
// (/urology-notes/) and a review preview (/urology-notes-review/) never delete each other's
// cache, and nothing else on sashajoo.github.io is touched. Pages and the install copy skip
// the browser's HTTP cache (GitHub Pages sends max-age=600), so a deploy shows at once.
const PREFIX = "uro-guide@" + new URL(self.registration.scope).pathname + "@";
const CACHE = PREFIX + "0.1.0-20261011151922";
const ASSETS = ["./", "./index.html", "./cards.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png", "./favicon.ico", "./fonts/Inter.cc390e0f18.woff2", "./fonts/SourceSerif4.c6da53156b.woff2", "./post-op-tachycardia.html", "./post-op-hypotension.html", "./obstructing-stone.html", "./torsion.html", "./priapism.html", "./fournier.html", "./tur-syndrome.html", "./low-urine-output.html", "./post-op-fever.html", "./clot-retention.html", "./difficult-foley.html", "./retention-consult.html", "./paraphimosis.html", "./ileus.html", "./three-pages.html", "./post-op-tachycardia-card.html", "./post-op-hypotension-card.html", "./obstructing-stone-card.html", "./torsion-card.html", "./priapism-card.html", "./fournier-card.html", "./tur-syndrome-card.html", "./low-urine-output-card.html", "./post-op-fever-card.html", "./clot-retention-card.html", "./difficult-foley-card.html", "./retention-consult-card.html", "./paraphimosis-card.html", "./ileus-card.html", "./three-pages-card.html"];
const TIMEOUT_MS = 3500;   // weak hospital wifi: after this, show the saved copy instead of waiting
const mine = k => k.startsWith(PREFIX) || /^uro-guide-\d/.test(k);   // second test: caches from before 0.1.1
const OFFLINE = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Offline</title><body style="font:17px/1.6 Georgia,serif;margin:0;padding:32px 24px;background:#f3efe8;color:#1d1b1a">' +
  '<p>You are offline, and this page is not saved on this device.</p><p><a href="./" style="color:#7a1f2b">Go to the study notes</a></p></body></html>';

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE && mine(k)).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

const saved = req => caches.match(req, { ignoreSearch: true });
const offline = () => new Response(OFFLINE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.endsWith("version.json")) return;
  const isPage = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (!isPage) {
    e.respondWith(saved(e.request).then(r => r || fetch(e.request)));
    return;
  }
  const net = fetch(e.request, { cache: "no-cache" }).then(r => {
    // Only a good answer replaces the saved copy; a 404 or a server error is never stored.
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  });
  e.respondWith(new Promise(resolve => {
    let done = false;
    const answer = r => { if (!done) { done = true; resolve(r); } };
    // Slow network: after TIMEOUT_MS use the saved copy if there is one; if not, keep waiting.
    const timer = setTimeout(() => saved(e.request).then(r => r && answer(r)), TIMEOUT_MS);
    net.then(r => { clearTimeout(timer); answer(r); },
             () => { clearTimeout(timer); saved(e.request).then(r => answer(r || offline())); });
  }));
});
