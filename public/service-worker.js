const CACHE_NAME = "robotics-erp-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
];

// Install Event: Cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for navigation/HTML, Cache-first for static assets
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Do NOT intercept non-GET requests, non-http(s) schemas, or server function / API calls
  if (
    request.method !== "GET" ||
    !url.protocol.startsWith("http") ||
    url.pathname.startsWith("/_server") ||
    url.pathname.startsWith("/api")
  ) {
    return;
  }

  // 2. For navigation requests (HTML page loads), use network-first with cache fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          try {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) return cachedResponse;
            const rootCache = await caches.match("/");
            if (rootCache) return rootCache;
          } catch {}
          return fetch(request);
        }
      })()
    );
    return;
  }

  // 3. For all other GET requests (static assets: js, css, images, fonts, icons)
  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          fetch(request)
            .then((netRes) => {
              if (netRes && netRes.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, netRes)).catch(() => {});
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        try {
          const res = await fetch(request);
          if (res) return res;
        } catch {}
        return new Response("Network error", { status: 503, statusText: "Service Unavailable" });
      }
    })()
  );
});
