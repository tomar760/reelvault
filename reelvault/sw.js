/* ReelVault — Service Worker (PWA offline shell) */
const CACHE = "reelvault-v5-1";
const ASSETS = [
  "./", "index.html", "library.html", "vault.html", "analytics.html", "activity.html", "settings.html",
  "css/style.css",
  "js/data.js", "js/bg.js", "js/ui.js", "js/dashboard.js", "js/library.js", "js/vault.js", "js/analytics.js", "js/activity.js", "js/settings.js",
  "js/vendor/chart.umd.min.js", "js/vendor/xlsx.full.min.js",
  "assets/logo.png", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/apple-touch-icon.png", "assets/icons/favicon-32.png",
  "assets/thumbs/tech.jpg", "assets/thumbs/ai.jpg", "assets/thumbs/business.jpg", "assets/thumbs/finance.jpg", "assets/thumbs/fitness.jpg", "assets/thumbs/misc.jpg",
  "manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("index.html"))
    )
  );
});
