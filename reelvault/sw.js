/* ReelVault — Service Worker (PWA offline shell)
   v5-2: NEVER touch API/cross-origin calls — only cache our own site files. */
const CACHE = "reelvault-v7";
const ASSETS = [
  "./", "index.html", "library.html", "vault.html", "analytics.html", "activity.html", "settings.html",
  "css/style.css",
  "js/config.js",
  "js/data.js", "js/bg.js", "js/ui.js", "js/api.js", "js/dashboard.js", "js/library.js", "js/vault.js", "js/analytics.js", "js/activity.js", "js/settings.js",
  "js/vendor/chart.umd.min.js", "js/vendor/xlsx-style.min.js",
  "assets/logo.png", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/apple-touch-icon.png", "assets/icons/favicon-32.png",
  "assets/thumbs/tech.jpg", "assets/thumbs/ai.jpg", "assets/thumbs/business.jpg", "assets/thumbs/finance.jpg", "assets/thumbs/fitness.jpg", "assets/thumbs/misc.jpg",
  "manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))) // one bad asset can't kill install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Only handle GET requests for OUR OWN origin (site files).
  // Everything else — API calls to Render, Google, fonts — goes straight to the network.
  if (e.request.method !== "GET") return;
  let url;
  try { url = new URL(e.request.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return; // ← API calls bypass the SW completely

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => (e.request.mode === "navigate" ? caches.match("index.html") : Response.error()));
    })
  );
});
