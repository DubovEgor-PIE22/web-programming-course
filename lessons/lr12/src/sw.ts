/// <reference lib="webworker" />
// Собирается командой: npm run build:sw  (esbuild src/sw.ts --bundle --outfile=public/sw.js)

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "todo-pwa-v1";

// Ресурсы для предварительного кэширования (shell)
const PRECACHE_URLS = ["/", "/index.html", "/src/main.tsx"];

// ─────────────────────────────────────────────────────────────────────────────
// Install — precache app shell
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Activate — remove old caches
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Fetch — стратегии кэширования
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API запросы: Network-first (не кэшируем мутации)
  if (url.pathname.startsWith("/api/")) {
    if (request.method !== "GET") return; // мутации обрабатывает очередь в App.tsx
    event.respondWith(networkFirst(request));
    return;
  }

  // Статика: Cache-first
  event.respondWith(cacheFirst(request));
});

// ─────────────────────────────────────────────────────────────────────────────
// Стратегия: Network-first с fallback на кэш
// ─────────────────────────────────────────────────────────────────────────────
async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Стратегия: Cache-first с fallback на сеть
// ─────────────────────────────────────────────────────────────────────────────
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Fallback: offline page
    const offlinePage = await caches.match("/index.html");
    return (
      offlinePage ??
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Background Sync (опционально, если поддерживается)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-queue") {
    // Клиент сам управляет очередью через localStorage.
    // SW сигнализирует всем вкладкам, что можно синхронизировать.
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "SYNC_QUEUE" })
        );
      })
    );
  }
});
