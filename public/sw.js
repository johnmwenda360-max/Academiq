/**
 * Service worker — hand-rolled (no Workbox build dependency) so the
 * caching strategy is explicit and easy to reason about.
 *
 * Three tiers, matching the offline-first strategy in the architecture doc:
 *  1. APP_SHELL   — CacheFirst.        Static assets, precached on install.
 *  2. REFERENCE   — StaleWhileRevalidate. Subjects/classes/staff lists.
 *  3. TRANSACTIONAL — NetworkOnly, never cached. Writes go through the
 *     IndexedDB outbox in lib/sync/queue.js instead of this file.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const REFERENCE_CACHE = `reference-data-${CACHE_VERSION}`;

const APP_SHELL_URLS = [
  "/",
  "/manifest.json",
  "/offline.html",
];

const REFERENCE_ROUTE_PATTERNS = [
  /\/api\/subjects/,
  /\/api\/classes/,
  /\/api\/staff\/list/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== REFERENCE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return; // writes never touch the SW cache

  const isReference = REFERENCE_ROUTE_PATTERNS.some((p) => p.test(url.pathname));

  if (isReference) {
    event.respondWith(staleWhileRevalidate(request, REFERENCE_CACHE));
    return;
  }

  if (APP_SHELL_URLS.includes(url.pathname) || url.pathname.startsWith("/_next/static")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Everything else: try network, fall back to the offline page for
  // navigations so a lost connection doesn't show a broken chrome error.
  event.respondWith(
    fetch(request).catch(() => {
      if (request.mode === "navigate") return caches.match("/offline.html");
      return caches.match(request);
    })
  );
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

// --- Background Sync ------------------------------------------------
// Fired when the browser regains connectivity after a queued sync was
// registered from lib/sync/queue.js via
// `registration.sync.register('drain-outbox')`.
// iOS Safari has no Background Sync API — the client-side 'online'
// listener in app/register-sw.js covers that case instead.
self.addEventListener("sync", (event) => {
  if (event.tag === "drain-outbox") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "DRAIN_OUTBOX" }));
      })
    );
  }
});
