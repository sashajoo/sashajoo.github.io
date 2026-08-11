/* Eviction worker: replaces the old cache-first worker at this path.
   It keeps no cache and handles no fetches, so everything goes to the network.
   On activation it wipes the old caches, unregisters itself, and reloads any
   open window, which lands on the handover page that moves the data across. */
self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    const wins = await self.clients.matchAll({ type: "window" });
    wins.forEach(function (c) { try { c.navigate(c.url); } catch (err) {} });
  })());
});
