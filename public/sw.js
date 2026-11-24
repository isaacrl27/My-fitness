/**
 * Deja la app guardada en el móvil para que abra aunque no haya cobertura.
 *
 * Regla: la red manda siempre (para que los cambios de Vercel lleguen al
 * momento) y la copia guardada solo se usa cuando no hay red. Lo que contesta
 * la puerta (los redireccionamientos) no se guarda nunca. Las peticiones
 * internas de vuelo RSC de Next.js nunca pisan el HTML guardado de las páginas.
 */
// La versión va en el nombre: al subirla, el service worker borra la caché
// vieja y los móviles cogen los iconos y los estáticos nuevos.
const CACHE = "mi-peso-v5";

const ACTIVOS_PRECARGA = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icono-192.png",
  "/icono-512.png",
];

self.addEventListener("install", (evento) => {
  // Precarga los recursos esenciales para modo sin conexión inmediato
  // y pasa a mandar sin esperar a que se cierren las pestañas.
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ACTIVOS_PRECARGA).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clavo) => clavo !== CACHE).map((clavo) => caches.delete(clavo))),
      )
      .then(() => self.clients.claim()),
  );
});

const PAGINA_SIN_COBERTURA = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>My Fitness — Sin cobertura</title>
    <style>
      :root {
        --bg: #ffffff;
        --surface: #f4f7f5;
        --border: #e1e6e3;
        --ink: #101614;
        --muted: #58635e;
        --accent: #1c7a58;
        --on-accent: #ffffff;
      }
      @media (prefers-color-scheme: dark) {
        :root:not([data-tema="claro"]) {
          color-scheme: dark;
          --bg: #0f1512;
          --surface: #182019;
          --border: #2b3630;
          --ink: #e9f0ec;
          --muted: #a6b5ad;
          --accent: #5fd3a6;
          --on-accent: #0a1a13;
        }
      }
      :root[data-tema="oscuro"] {
        color-scheme: dark;
        --bg: #0f1512;
        --surface: #182019;
        --border: #2b3630;
        --ink: #e9f0ec;
        --muted: #a6b5ad;
        --accent: #5fd3a6;
        --on-accent: #0a1a13;
      }
      body {
        margin: 0;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        padding: max(1.5rem, env(safe-area-inset-top, 0px)) 1rem max(1.5rem, env(safe-area-inset-bottom, 0px));
        background: var(--bg);
        color: var(--ink);
        text-align: center;
        box-sizing: border-box;
      }
      main {
        max-width: 22rem;
        padding: 1.75rem 1.5rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 1rem;
      }
      h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
      p { font-size: 0.9375rem; line-height: 1.5; color: var(--muted); margin: 0 0 1.25rem; }
      button {
        background: var(--accent);
        color: var(--on-accent);
        border: 0;
        border-radius: 999px;
        padding: 0.75rem 1.75rem;
        font-size: 0.9375rem;
        font-weight: 600;
        cursor: pointer;
      }
      button:active {
        opacity: 0.85;
      }
    </style>
    <script>
      (function () {
        try {
          var t = localStorage.getItem("mi-peso:tema");
          if (t === "oscuro" || t === "claro") {
            document.documentElement.setAttribute("data-tema", t);
          }
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <main>
      <h1>Estás sin cobertura</h1>
      <p>Esta pantalla todavía no está guardada en el móvil. En cuanto tengas señal, vuelve a entrar.</p>
      <button type="button" onclick="window.location.reload()">Reintentar</button>
    </main>
  </body>
</html>`;

function fueraDeLinea(esPagina) {
  if (esPagina) {
    return new Response(PAGINA_SIN_COBERTURA, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return new Response("", { status: 503 });
}

/**
 * Detecta peticiones internas de vuelo RSC / prefetch del App Router de Next.js.
 * Si se guardaran en `CACHE` bajo la misma URL (`/hoy`, `/progreso`...), pisarían
 * el documento HTML real con texto `text/x-component` y al abrir sin red saldría
 * código crudo en vez de la pantalla.
 */
function esPeticionRsc(request, url) {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") !== null ||
    request.headers.get("Next-Router-Segment-Prefetch") !== null ||
    url.searchParams.has("_rsc")
  );
}

/**
 * Avisos.
 *
 * El móvil está apagado, se lo manda la nube y aquí lo pintamos. El cuerpo
 * del mensaje lo decide el servidor; aquí solo se enseña.
 */
self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { titulo: "My Fitness", cuerpo: evento.data ? evento.data.text() : "" };
  }

  evento.waitUntil(
    self.registration.showNotification(datos.titulo || "My Fitness", {
      body: datos.cuerpo || "",
      icon: "/icono-192.png",
      badge: "/icono-192.png",
      // La app instalada en el iPhone no cambia de pestañas como el navegador:
      // se abre y ya está. Dejamos la dirección por si acaso.
      data: { url: rutaNotificacionSegura(datos.url) },
      tag: datos.momento || "mi-peso",
    }),
  );
});

function rutaNotificacionSegura(valor) {
  if (typeof valor !== "string") return "/hoy";
  const limpia = valor.trim();
  if (!limpia.startsWith("/") || limpia.startsWith("//") || limpia.includes("\\")) {
    return "/hoy";
  }
  return limpia;
}

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = rutaNotificacionSegura(evento.notification.data && evento.notification.data.url);

  evento.waitUntil(
    (async () => {
      const abiertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of abiertas) {
        if ("focus" in c) {
          await c.focus();
          // Si ya había una ventana abierta, se va a la pantalla que toca.
          if ("navigate" in c) await c.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  const url = new URL(request.url);

  // Al cerrar sesión o eliminar la cuenta se vacía la caché offline para no
  // dejar pantallas autenticadas guardadas en el dispositivo.
  if (
    url.origin === self.location.origin &&
    (url.pathname === "/api/salir" || (url.pathname === "/api/nube" && request.method === "DELETE"))
  ) {
    evento.waitUntil(caches.delete(CACHE));
    return;
  }

  if (request.method !== "GET") return;

  // Fuera del dominio, propio SW y llamadas de la puerta: que no toque.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/entrar") return;
  // El APK de Android no se guarda en la caché: no es una pantalla, y si se
  // cacheara el navegador se quedaría con una versión vieja para siempre.
  if (url.pathname.startsWith("/descargas/")) return;

  // Los vuelos RSC de Next.js van directo a red sin tocar la caché de HTML:
  // si no hay señal, Next cae por sí solo a navegación completa (`navigate`),
  // que sí recupera el HTML limpio guardado abajo.
  if (esPeticionRsc(request, url)) return;

  // Estáticos numerados e imágenes: cambian de nombre con cada versión.
  if (url.pathname.startsWith("/_next/static/") || request.destination === "image") {
    evento.respondWith(
      caches.match(request).then(
        (copia) =>
          copia ??
          fetch(request)
            .then((respuesta) => {
              if (respuesta.ok && !respuesta.redirected) {
                const clon = respuesta.clone();
                caches.open(CACHE).then((cache) => cache.put(request, clon));
              }
              return respuesta;
            })
            .catch(() => {
              if (request.destination === "image") {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a6b5ad" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
                  {
                    status: 200,
                    headers: { "Content-Type": "image/svg+xml" },
                  },
                );
              }
              return new Response("", { status: 503 });
            }),
      ),
    );
    return;
  }

  const esPagina = request.mode === "navigate";

  // Navegación de pantallas y otros activos públicos: primero la red; si no
  // llega, la copia guardada. En navegaciones solo se guarda HTML real sin
  // redirecciones, para no dejar la app abierta sin llave ni guardar errores.
  evento.respondWith(
    fetch(request)
      .then((respuesta) => {
        const tipo = respuesta.headers.get("content-type") || "";
        const guardable =
          respuesta.ok &&
          !respuesta.redirected &&
          (!esPagina || tipo.includes("text/html"));
        if (guardable) {
          const clon = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clon));
        }
        return respuesta;
      })
      .catch(() =>
        caches
          .match(request)
          .then((copia) => copia ?? (esPagina ? caches.match("/offline.html") : null))
          .then((copia) => copia ?? (esPagina ? caches.match("/hoy") : null))
          .then((copia) => copia ?? fueraDeLinea(esPagina)),
      ),
  );
});
