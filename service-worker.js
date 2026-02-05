// service-worker.js

const CACHE_NAME = "lloyds-one-cache-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  "./assets/styles.css",
  "./assets/app.js",
  "./assets/router.js",
  "./assets/views.js",
  "./assets/nav.js",

  "./views/onboarding.html",
  "./views/home.html",
  "./views/payments.html",
  "./views/bill-splitting.html",
  "./views/insights.html",
  "./views/budget-pots.html",
  "./views/deal-dash.html",
  "./views/money-minutes.html",
  "./views/settings.html",

  "./one-logo.png",
  "./assets/fonts/inter.ttf",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((m) => m || caches.match("./index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
