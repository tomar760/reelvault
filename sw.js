/* ReelVault — Service Worker (PWA offline shell)
   v5-2: NEVER touch API/cross-origin calls — only cache our own site files. */
const CACHE = "reelvault-v8.4";
const ASSETS = [
  "./", "index.html", "library.html", "vault.html", "analytics.html", "activity.html", "settings.html",
  "style.css",
  "config.js",
  "data.js", "bg.js", "ui.js", "api.js", "dashboard.js", "library.js", "vault.js", "analytics.js", "activity.js", "settings.js",
  "chart.umd.min.js", "xlsx-style.min.js",
  "logo.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon-32.png",
  "tech.jpg", "ai.jpg", "business.jpg", "finance.jpg", "fitness.jpg", "misc.jpg",
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
