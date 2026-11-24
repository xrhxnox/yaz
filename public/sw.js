// Service worker: notificaciones y que la app abra sin internet.
// - La app (HTML): primero la red; sin red, la última versión guardada.
// - Archivos de la app (/_next/static, íconos, letras): guardados para siempre (llevan su versión en el nombre).
// - Datos (/api/… de lectura): primero la red; sin red, lo último que llegó.
// - Fotos (links temporales de Supabase): se guardan por su ruta, sin el permiso que cambia cada pocas horas.
const VERSION = "v1";
const APP = `app-${VERSION}`;
const DATOS = `datos-${VERSION}`;
const FOTOS = `fotos-${VERSION}`;
const MAX_FOTOS = 400;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(APP)
      .then((c) => c.addAll(["/", "/manifest.webmanifest"]))
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const vigentes = [APP, DATOS, FOTOS];
      for (const k of await caches.keys()) if (!vigentes.includes(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

// La app pide borrar los datos guardados (al cerrar sesión)
self.addEventListener("message", (event) => {
  if (event.data === "borrar-datos") event.waitUntil(Promise.all([caches.delete(DATOS), caches.delete(FOTOS)]));
});

async function guardar(cache, llave, respuesta) {
  try {
    const c = await caches.open(cache);
    await c.put(llave, respuesta);
  } catch {}
}

// Deja solo las fotos más recientes para no llenar el celular
async function recortarFotos() {
  const c = await caches.open(FOTOS);
  const llaves = await c.keys();
  for (const k of llaves.slice(0, Math.max(0, llaves.length - MAX_FOTOS))) await c.delete(k);
}

async function redPrimero(request, cache, llave = request) {
  try {
    const r = await fetch(request);
    if (r.ok) guardar(cache, llave, r.clone());
    return r;
  } catch (e) {
    const guardada = await caches.match(llave, { cacheName: cache });
    if (guardada) return guardada;
    throw e;
  }
}

async function guardadoPrimero(request, cache) {
  const guardada = await caches.match(request, { cacheName: cache });
  if (guardada) return guardada;
  const r = await fetch(request);
  if (r.ok) guardar(cache, request, r.clone());
  return r;
}

async function foto(request) {
  const url = new URL(request.url);
  const llave = url.origin + url.pathname; // sin ?token=…
  const guardada = await caches.match(llave, { cacheName: FOTOS });
  if (guardada) return guardada;
  let r;
  try {
    r = await fetch(request.url, { mode: "cors", credentials: "omit" });
  } catch {
    r = await fetch(request);
  }
  if (r.ok || r.type === "opaque") {
    await guardar(FOTOS, llave, r.clone());
    recortarFotos();
  }
  return r;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // En desarrollo (localhost) no se guarda nada: los archivos cambian con cada edición
  if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") return;

  // La app misma
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(redPrimero(request, APP, "/"));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|ttf|png|svg|ico|webmanifest)$/.test(url.pathname)) {
      event.respondWith(guardadoPrimero(request, APP));
      return;
    }
    // Datos de lectura (el recordatorio automático no)
    if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/recordatorio")) {
      event.respondWith(redPrimero(request, DATOS));
    }
    return;
  }

  // Fotos privadas de Supabase
  // (los videos no: se piden por pedazos y el navegador necesita hablar directo con Supabase)
  if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/sign/") && !url.pathname.includes("/sign/videos/") && !request.headers.has("range")) {
    event.respondWith(foto(request));
  }
});

// ---------- Notificaciones ----------
self.addEventListener("push", (event) => {
  let datos = { title: "Nuevo mensaje", body: "Pensé en ti", url: "/" };
  try {
    datos = event.data ? { ...datos, ...event.data.json() } : datos;
  } catch {}

  event.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: "/icons/192",
      badge: "/icons/96",
      vibrate: [120, 60, 120],
      tag: datos.url,
      renotify: true,
      data: { url: datos.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) {
          await v.focus();
          if ("navigate" in v && v.url !== url) await v.navigate(url).catch(() => {});
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
