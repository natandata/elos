/**
 * Service Worker do ELOS.
 *
 * Escopo deliberadamente estreito: só arquivos estáticos entram no cache.
 * Páginas HTML e chamadas de API NUNCA são guardadas — elas carregam dados de
 * um usuário logado, e num celular compartilhado uma resposta em cache poderia
 * aparecer para a pessoa errada. O que fica offline é a casca do app.
 */

const CACHE = "elos-static-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE = [OFFLINE_URL, "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: sempre rede. Sem internet, mostra a página de offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || Response.error()),
      ),
    );
    return;
  }

  // Estáticos: cache primeiro, com atualização em segundo plano.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === "basic") {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || network;
      }),
    );
  }

  // Todo o resto (dados, Server Actions, RSC) passa direto, sem cache.
});

/**
 * Notificações push (Web Push). O payload chega em JSON: { title, body, url }.
 * Aparece mesmo com o app fechado — é isso que diferencia do sino interno.
 */
self.addEventListener("push", (event) => {
  let data = { title: "ELOS", body: "Você tem uma novidade." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload não veio em JSON — mantém o texto genérico.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
