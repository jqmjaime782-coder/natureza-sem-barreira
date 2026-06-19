const CACHE_NAME = "nsb-cache-v1";
const URLS_TO_CACHE = ["/", "/ficha-a", "/ficha-b", "/ficha-c", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy: tenta rede, cai para cache se offline.
// Isto garante que os formulários sempre carregam (mesmo offline) e
// que a versão mais recente é usada sempre que há internet.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
