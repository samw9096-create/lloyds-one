// service-worker.js

const CACHE_NAME = "lloyds-one-cache-v45";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  "./assets/styles.css",
  "./assets/app.js",
  "./assets/router.js",
  "./assets/storage.js",
  "./assets/auth.js",
  "./assets/views.js",
  "./assets/nav.js",
  "./assets/supabase.js",
  "./assets/remote.js",
  "./assets/data/deal-dash.json",

  "./views/login.html",
  "./views/splash.html",
  "./views/onboarding.html",
  "./views/home.html",
  "./views/account.html",
  "./views/friends.html",
  "./views/shopping-list.html",
  "./views/smart-money.html",
  "./views/tutorial.html",
  "./views/learn.html",
  "./views/quizzes.html",
  "./views/quiz-video.html",
  "./views/quiz-questions.html",
  "./views/quiz-summary.html",
  "./views/transaction.html",
  "./views/add-money.html",
  "./views/scan-cheque.html",
  "./views/move-from-pot.html",
  "./views/payments.html",
  "./views/bill-splitting.html",
  "./views/insights.html",
  "./views/budget-pots.html",
  "./views/pot-house.html",
  "./views/pot-car.html",
  "./views/pot-savings.html",
  "./views/deal-dash.html",
  "./views/money-minutes.html",
  "./views/settings.html",

  "./one-logo.png",
  "./tablogo.png",
  "./v24044gl0000ctelhbfog65h4q43vj90.MP4",
  "./e54835240e704c41a3a8da0bbbb71378 2.MOV",
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

  if (req.cache === "no-store") {
    event.respondWith(fetch(req));
    return;
  }

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
