/*
 * Taiwan EcoAtlas service worker.
 *
 * What it does, and what it refuses to do:
 *  - Live feeds (/api/today, /api/hazards, /api/reservoirs, /api/observations/*)
 *    go to the network first. If the network fails, answers with an error or
 *    takes longer than WAIT_MS, the last good copy saved on this device is
 *    returned instead, with two headers added so the page can say so
 *    ("x-ecoatlas-from-cache" and "x-ecoatlas-saved-at"). A copy is only saved
 *    when the answer holds real readings: a response that says every part is
 *    unavailable never replaces a good copy.
 *  - Pages go to the network first and fall back to the copy of that page saved
 *    the last time it was opened, or to /offline.
 *  - Hashed build files (/_next/static) and the county boundaries are kept so
 *    that a saved page can still draw.
 *  - Nothing else is touched: other requests, other sites and every non-GET
 *    request go straight to the network. No personal data is stored; every
 *    saved response is public data that anyone can fetch.
 *
 * To switch the worker off for everyone, replace this file with one that calls
 * self.registration.unregister() on activate; browsers pick that up within a
 * day (this file is never cached by the browser or the CDN).
 */
const VERSION = "v1";
const STATIC = `ecoatlas-static-${VERSION}`;
const PAGES = `ecoatlas-pages-${VERSION}`;
const DATA = `ecoatlas-data-${VERSION}`;
const CURRENT = [STATIC, PAGES, DATA];
const OFFLINE_URL = "/offline";
const LIVE = /^\/api\/(today|hazards|reservoirs|observations\/(aqi|weather))$/;
const BOUNDARIES = "/data/counties.geojson";
const WAIT_MS = 8000;
const PAGE_WAIT_MS = 6000;
const MAX_PAGES = 40;
const MAX_STATIC = 200;
const KEPT = ["fresh", "stale"];

/** How a request is handled: "live", "static", "boundaries", "page", or null
 *  for everything the worker leaves alone. */
function kindOf(request) {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  const path = url.pathname;
  if (LIVE.test(path)) return "live";
  if (path.startsWith("/_next/static/")) return "static";
  if (path === BOUNDARIES) return "boundaries";
  if (request.mode === "navigate") return "page";
  return null;
}

/** The status words inside a live response, whatever its shape. */
function statusesOf(path, body) {
  const status = (part) =>
    part && typeof part === "object" ? part.status : null;
  if (path === "/api/today")
    return [status(body.air), status(body.weather), status(body.reservoirs)];
  if (path === "/api/hazards")
    return [status(body.earthquakes), status(body.typhoon)];
  return [status(body)];
}

/** A response is worth saving when at least one part holds real readings. */
function worthKeeping(path, body) {
  if (!body || typeof body !== "object") return false;
  return statusesOf(path, body).some((status) => KEPT.includes(status));
}

function withHeaders(response, extra) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function timeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("slow")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Oldest first: the cache lists entries in the order they were added.
  await Promise.all(
    keys
      .slice(0, Math.max(0, keys.length - max))
      .map((key) => cache.delete(key)),
  );
}

async function keepLive(request, response) {
  try {
    const body = await response.clone().json();
    if (!worthKeeping(new URL(request.url).pathname, body)) return;
    const cache = await caches.open(DATA);
    await cache.put(
      request,
      withHeaders(response, {
        "x-ecoatlas-saved-at": new Date().toISOString(),
      }),
    );
  } catch {
    /* Not JSON, or storage is full: keep nothing. */
  }
}

async function live(event) {
  const request = event.request;
  const cache = await caches.open(DATA);
  const network = fetch(request).then((response) => {
    // The copy keeps refreshing after the wait below has ended.
    if (response.ok) event.waitUntil(keepLive(request, response.clone()));
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  try {
    const response = await timeout(network, WAIT_MS);
    if (response.ok) return response;
    const saved = await cache.match(request);
    return saved
      ? withHeaders(saved, { "x-ecoatlas-from-cache": "1" })
      : response;
  } catch {
    const saved = await cache.match(request);
    if (saved) return withHeaders(saved, { "x-ecoatlas-from-cache": "1" });
    // Nothing saved: behave as if there were no worker.
    return network;
  }
}

/** Hashed build files never change under the same name: saved once, then
 *  served from the device. */
async function keepFirst(event) {
  const request = event.request;
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    event.waitUntil(
      cache.put(request, response.clone()).then(() => trim(STATIC, MAX_STATIC)),
    );
  }
  return response;
}

/** The county outlines: the saved copy is used at once and refreshed behind
 *  it, so a changed file arrives on the next visit. */
async function boundaries(event) {
  const request = event.request;
  const cache = await caches.open(DATA);
  const hit = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) event.waitUntil(cache.put(request, response.clone()));
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  return hit || network;
}

async function page(event) {
  const request = event.request;
  const url = new URL(request.url);
  const cache = await caches.open(PAGES);
  const network = fetch(request).then((response) => {
    const html = (response.headers.get("content-type") || "").includes(
      "text/html",
    );
    // The fallback page is kept once, at install, not once per query string.
    if (response.ok && html && url.pathname !== OFFLINE_URL) {
      // Saved even when the wait below has ended, for the next time.
      event.waitUntil(
        cache.put(request, response.clone()).then(() => trim(PAGES, MAX_PAGES)),
      );
    }
    return response;
  });
  event.waitUntil(network.catch(() => {}));
  try {
    return await timeout(network, PAGE_WAIT_MS);
  } catch {
    const copy = await cache.match(request);
    if (copy) return copy;
    const fallback = await cache.match(OFFLINE_URL, { ignoreSearch: true });
    // Neither this page nor the fallback is saved: behave as if there were no
    // worker, and keep waiting for the network.
    if (!fallback) return network;
    if (url.pathname === OFFLINE_URL) return fallback;
    // Sent there, not given the fallback's HTML under this page's address: the
    // page's scripts would otherwise try to draw this address and fail. The
    // page it was meant to be is remembered in the address.
    return Response.redirect(
      `${self.location.origin}${OFFLINE_URL}?from=${encodeURIComponent(url.pathname + url.search)}`,
      302,
    );
  }
}

/** The offline page and every build file it needs (its scripts and styles),
 *  saved at install. Without its own scripts a saved page cannot start, and the
 *  one page that must work with no connection is the one never opened before. */
async function keepOfflinePage() {
  const response = await fetch(OFFLINE_URL);
  if (!response.ok) return;
  const html = await response.clone().text();
  const pages = await caches.open(PAGES);
  await pages.put(OFFLINE_URL, response);
  const files = new Set(html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || []);
  const statics = await caches.open(STATIC);
  await Promise.all(
    [...files].map(async (file) => {
      const answer = await fetch(file);
      if (answer.ok) await statics.put(file, answer);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Without the fallback page the worker still works, so a failure here
      // does not stop the install.
      await keepOfflinePage().catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith("ecoatlas-") && !CURRENT.includes(name),
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const kind = kindOf(event.request);
  if (!kind) return;
  if (kind === "live") event.respondWith(live(event));
  else if (kind === "static") event.respondWith(keepFirst(event));
  else if (kind === "boundaries") event.respondWith(boundaries(event));
  else event.respondWith(page(event));
});

// Read by tests/service-worker.test.ts.
self.ecoatlasWorker = { kindOf, worthKeeping, OFFLINE_URL, WAIT_MS };
