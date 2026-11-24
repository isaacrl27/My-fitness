/**
 * Pruebas de Fase 6: Móvil, PWA, Service Worker, Salud Nativa (Capacitor /
 * Health Connect), Widget iOS y manifiesto Android.
 *
 * Se ejecutan con:
 *   node pruebas/movil-pwa.prueba.mts
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  acumularCubosPasos,
  esAppNativa,
  tramosDiasLocales,
  type LoteSalud,
} from "../lib/salud-nativa.ts";
import { esFuncionRpcAusente, fechaSaludWidgetValida } from "../lib/nube-mapeo.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, "..");

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.error(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

// =========================================================================
// 1. Detección estricta de contenedor nativo Capacitor (`esAppNativa`)
// =========================================================================

const descWindowOriginal = Object.getOwnPropertyDescriptor(globalThis, "window");

function fijarWindow(valor: unknown) {
  if (valor === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      value: valor,
      configurable: true,
      writable: true,
    });
  }
}

fijarWindow(undefined);
igual(esAppNativa(), false, "sin window (SSR / Node) no es app nativa");

fijarWindow({});
igual(esAppNativa(), false, "navegador web sin Capacitor no es app nativa");

fijarWindow({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
});
igual(
  esAppNativa(),
  false,
  "navegador web con @capacitor/core cargado (platform=web) NO da falso positivo",
);

fijarWindow({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
});
igual(esAppNativa(), true, "Capacitor con isNativePlatform()=true se detecta como app nativa");

fijarWindow({
  Capacitor: { getPlatform: () => "ios" },
});
igual(esAppNativa(), true, "Capacitor iOS por getPlatform() se detecta como app nativa");

fijarWindow({
  Capacitor: { Plugins: {} },
  androidBridge: {},
});
igual(
  esAppNativa(),
  true,
  "WebView de Android con androidBridge inyectado antes de @capacitor/core es app nativa",
);

if (descWindowOriginal) {
  Object.defineProperty(globalThis, "window", descWindowOriginal);
} else {
  Reflect.deleteProperty(globalThis, "window");
}

// =========================================================================
// 2. Pasos nativos: alineación de tramos y resistencia al cambio de hora (DST)
// =========================================================================

const julioNormal = new Date(2026, 6, 15, 14, 30, 0); // 15 julio 2026, sin cambio horario
const tramosJulio = tramosDiasLocales(7, julioNormal);
igual(
  tramosJulio.length,
  1,
  "semana normal de 7 días sin cambio de hora se agrupa en 1 sola consulta",
);
igual(
  tramosJulio[0]?.diaFijo,
  undefined,
  "el tramo normal no fuerza día fijo",
);

// Simulación del cambio de hora de otoño en España (domingo 25/10/2026: día de 25 h)
const viernesTrasCambio = new Date(2026, 9, 30, 14, 30, 0); // 30 octubre 2026
const domingo25Inicio = new Date(2026, 9, 25, 0, 0, 0, 0);
const lunes26Inicio = new Date(2026, 9, 26, 0, 0, 0, 0);
const hayDstLocal = domingo25Inicio.getTimezoneOffset() !== lunes26Inicio.getTimezoneOffset();

if (hayDstLocal) {
  const tramosOctubre = tramosDiasLocales(7, viernesTrasCambio);
  const tramoDst = tramosOctubre.find((t) => t.diaFijo === "2026-10-25");
  igual(
    Boolean(tramoDst),
    true,
    "en huso con cambio de hora (Europe/Madrid), el domingo 2026-10-25 queda aislado en su propio tramo",
  );
  const tramoPostDst = tramosOctubre[tramosOctubre.length - 1];
  igual(
    tramoPostDst?.inicio.getTime(),
    lunes26Inicio.getTime(),
    "los días posteriores al cambio de hora arrancan exactamente a las 00:00 locales del lunes 26",
  );
}

// Suma de rebanadas de 24 h + 1 h en el domingo de 25 horas (`diaFijo`)
const loteDst: LoteSalud = {};
acumularCubosPasos(
  loteDst,
  [
    { startDate: "2026-10-24T22:00:00.000Z", endDate: "2026-10-25T22:00:00.000Z", values: { sum: 7800 } },
    { startDate: "2026-10-25T22:00:00.000Z", endDate: "2026-10-25T23:00:00.000Z", values: { sum: 420 } },
  ],
  "2026-10-25",
);
igual(
  loteDst["2026-10-25"]?.pasos,
  8220,
  "acumularCubosPasos suma las rebanadas 24h + 1h del día de cambio de hora sin perder la última hora",
);

// Punto medio de cubo normal y filtrado de valores imposibles
const loteNormal: LoteSalud = {};
const inicioLocal = new Date(2026, 6, 10, 0, 0, 0);
const finLocal = new Date(2026, 6, 11, 0, 0, 0);
acumularCubosPasos(loteNormal, [
  { startDate: inicioLocal.toISOString(), endDate: finLocal.toISOString(), value: 9345.6 },
  { startDate: inicioLocal.toISOString(), endDate: finLocal.toISOString(), value: 0 },
  { startDate: inicioLocal.toISOString(), endDate: finLocal.toISOString(), value: 250000 },
]);
igual(
  loteNormal["2026-07-10"]?.pasos,
  9346,
  "acumularCubosPasos redondea pasos válidos por punto medio e ignora 0 o >100.000",
);

// =========================================================================
// 3. Validación de fechas y respaldo RPC de `/api/widget`
// =========================================================================

igual(
  fechaSaludWidgetValida("2026-11-02", "2026-11-02"),
  "2026-11-02",
  "acepta la fecha de hoy en Madrid",
);
igual(
  fechaSaludWidgetValida("2026-11-03", "2026-11-02"),
  "2026-11-03",
  "acepta +1 día de margen por huso horario al viajar al este",
);
igual(
  fechaSaludWidgetValida("2024-02-29", "2026-11-02"),
  "2024-02-29",
  "acepta 29 de febrero en año bisiesto real",
);
igual(
  fechaSaludWidgetValida("2026-02-29", "2026-11-02"),
  null,
  "rechaza 29 de febrero en año no bisiesto",
);
igual(
  fechaSaludWidgetValida("2026-02-31", "2026-11-02"),
  null,
  "rechaza fecha imposible 2026-02-31",
);
igual(
  fechaSaludWidgetValida("2026-11-04", "2026-11-02"),
  null,
  "rechaza fechas futuras más allá del margen horario",
);
igual(
  fechaSaludWidgetValida("2099-01-01", "2026-11-02"),
  null,
  "rechaza fechas lejanas en el futuro (2099-01-01)",
);
igual(
  fechaSaludWidgetValida("2019-12-31", "2026-11-02"),
  null,
  "rechaza fechas anteriores a 2020",
);

igual(
  esFuncionRpcAusente({ code: "PGRST202", message: "Could not find the function" }),
  true,
  "detecta RPC ausente PGRST202 en PostgREST",
);
igual(
  esFuncionRpcAusente({ code: "42883", message: "function public.fusionar_salud_widget does not exist" }),
  true,
  "detecta RPC ausente 42883 en Postgres",
);
igual(
  esFuncionRpcAusente({ code: "57014", message: "canceling statement due to statement timeout" }),
  false,
  "no confunde un timeout real de base de datos con RPC ausente",
);

// =========================================================================
// 4. Ejecución real en sandbox del Service Worker (`public/sw.js`)
// =========================================================================

const swCodigo = fs.readFileSync(path.join(RAIZ, "public", "sw.js"), "utf-8");

type OyenteSW = (ev: Record<string, unknown>) => void;
const oyentes: Record<string, OyenteSW> = {};
const almacenamientoCaches = new Map<string, Map<string, Response>>();
const notificacionesMostradas: Array<{ titulo: string; opciones: Record<string, unknown> }> = [];

function obtenerMapaCache(nombre: string) {
  let m = almacenamientoCaches.get(nombre);
  if (!m) {
    m = new Map();
    almacenamientoCaches.set(nombre, m);
  }
  return m;
}

const cachesMock = {
  keys: async () => [...almacenamientoCaches.keys()],
  delete: async (nombre: string) => almacenamientoCaches.delete(nombre),
  open: async (nombre: string) => {
    const mapa = obtenerMapaCache(nombre);
    return {
      put: async (req: Request | string, res: Response) => {
        const url = typeof req === "string" ? req : req.url;
        mapa.set(url, res);
      },
    };
  },
  match: async (req: Request | string) => {
    const clave =
      typeof req === "string"
        ? new URL(req, "https://example.com").href
        : req.url;
    for (const mapa of almacenamientoCaches.values()) {
      const hit = mapa.get(clave);
      if (hit) return hit.clone();
    }
    return undefined;
  },
};

let redSwActiva = true;
let ultimaRespuestaRed: Response = new Response("<!doctype html><html><body>Hoy</body></html>", {
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8" },
});

const contextoSw = {
  URL,
  Response,
  Promise,
  caches: cachesMock,
  fetch: async () => {
    if (!redSwActiva) throw new TypeError("Failed to fetch");
    return ultimaRespuestaRed.clone();
  },
  self: {
    location: { origin: "https://example.com" },
    skipWaiting: () => {},
    clients: {
      claim: async () => {},
      matchAll: async () => [],
      openWindow: async () => {},
    },
    registration: {
      showNotification: async (titulo: string, opciones: Record<string, unknown>) => {
        notificacionesMostradas.push({ titulo, opciones });
      },
    },
    addEventListener: (tipo: string, fn: OyenteSW) => {
      oyentes[tipo] = fn;
    },
  },
};

vm.runInNewContext(swCodigo, contextoSw);

igual(swCodigo.includes('const CACHE = "mi-peso-v5";'), true, "Service Worker usa caché mi-peso-v5");

// 4a. Navegación HTML real a /hoy se guarda en caché
{
  let promesaRespuesta: Promise<Response> | null = null;
  const reqHoy = new Request("https://example.com/hoy");
  Object.defineProperty(reqHoy, "mode", { value: "navigate" });
  oyentes.fetch({
    request: reqHoy,
    respondWith: (p: Promise<Response>) => {
      promesaRespuesta = p;
    },
    waitUntil: () => {},
  });
  const res = await promesaRespuesta!;
  igual(await res.text(), "<!doctype html><html><body>Hoy</body></html>", "SW devuelve HTML de /hoy en línea");
  await new Promise((r) => setTimeout(r, 10));
  igual(
    almacenamientoCaches.get("mi-peso-v5")?.has("https://example.com/hoy"),
    true,
    "SW guarda el HTML limpio de /hoy en mi-peso-v5",
  );
}

// 4b. Petición de vuelo RSC de Next.js a /hoy NO es interceptada ni pisa el HTML guardado
{
  ultimaRespuestaRed = new Response('1:HL["/_next/static/chunk.js"]', {
    status: 200,
    headers: { "content-type": "text/x-component" },
  });
  let interceptada = false;
  const reqRsc = new Request("https://example.com/hoy", {
    headers: { RSC: "1" },
  });
  oyentes.fetch({
    request: reqRsc,
    respondWith: () => {
      interceptada = true;
    },
    waitUntil: () => {},
  });
  igual(interceptada, false, "SW ignora vuelos RSC (RSC: 1) para no contaminar la caché de páginas HTML");

  // Comprobar que sin red sigue saliendo el HTML de /hoy y no el RSC
  redSwActiva = false;
  let promesaOffline: Promise<Response> | null = null;
  const reqHoyOffline = new Request("https://example.com/hoy");
  Object.defineProperty(reqHoyOffline, "mode", { value: "navigate" });
  oyentes.fetch({
    request: reqHoyOffline,
    respondWith: (p: Promise<Response>) => {
      promesaOffline = p;
    },
    waitUntil: () => {},
  });
  const resOffline = await promesaOffline!;
  igual(
    await resOffline.text(),
    "<!doctype html><html><body>Hoy</body></html>",
    "sin cobertura, /hoy devuelve el documento HTML intacto y jamás texto RSC",
  );
}

// 4c. Borrar cuenta (`DELETE /api/nube`) vacía la caché igual que `/api/salir`
{
  let promesaLimpieza: Promise<unknown> | null = null;
  const reqBorrar = new Request("https://example.com/api/nube?dispositivo=movil-1", {
    method: "DELETE",
  });
  oyentes.fetch({
    request: reqBorrar,
    respondWith: () => {},
    waitUntil: (p: Promise<unknown>) => {
      promesaLimpieza = p;
    },
  });
  await promesaLimpieza;
  igual(
    almacenamientoCaches.has("mi-peso-v5"),
    false,
    "DELETE /api/nube vacía la caché offline para no dejar pantallas autenticadas tras borrar cuenta",
  );
}

// 4d. Sin caché ni cobertura, la página de respaldo incluye modo oscuro, safe-area y botón Reintentar
{
  redSwActiva = false;
  let promesaFallback: Promise<Response> | null = null;
  const reqNueva = new Request("https://example.com/progreso");
  Object.defineProperty(reqNueva, "mode", { value: "navigate" });
  oyentes.fetch({
    request: reqNueva,
    respondWith: (p: Promise<Response>) => {
      promesaFallback = p;
    },
    waitUntil: () => {},
  });
  const resFallback = await promesaFallback!;
  const htmlFallback = await resFallback.text();
  igual(resFallback.status, 503, "pantalla no cacheada sin red devuelve estado 503");
  igual(
    htmlFallback.includes("prefers-color-scheme: dark") &&
      htmlFallback.includes("viewport-fit=cover") &&
      htmlFallback.includes("Reintentar"),
    true,
    "página sin cobertura del SW soporta modo oscuro, viewport-fit=cover y botón Reintentar",
  );
}

// 4e. Evento push sanea URLs maliciosas anti-open-redirect
{
  let esperaPush: Promise<unknown> | null = null;
  oyentes.push({
    data: {
      json: () => ({ titulo: "Prueba", cuerpo: "Hola", url: "//atacante.ejemplo.com/robo" }),
    },
    waitUntil: (p: Promise<unknown>) => {
      esperaPush = p;
    },
  });
  await esperaPush;
  const ultima = notificacionesMostradas.at(-1);
  igual(
    (ultima?.opciones.data as { url?: string })?.url,
    "/hoy",
    "evento push bloquea URLs externas //atacante y redirige seguro a /hoy",
  );
}

// =========================================================================
// 5. Proxy, Next Config y AndroidManifest.xml (permisos mínimos + cámara)
// =========================================================================

const proxyTs = fs.readFileSync(path.join(RAIZ, "proxy.ts"), "utf-8");
igual(
  proxyTs.includes("sw\\\\.js$") && proxyTs.includes("offline\\\\.html$"),
  true,
  "proxy.ts deja /sw.js y /offline.html fuera de redirecciones de sesión/mantenimiento",
);

const nextConfigTs = fs.readFileSync(path.join(RAIZ, "next.config.ts"), "utf-8");
igual(
  nextConfigTs.includes('source: "/sw.js"') &&
    nextConfigTs.includes("no-cache, no-store, must-revalidate"),
  true,
  "next.config.ts sirve /sw.js sin caché HTTP para actualizar PWAs al instante",
);

const appManifestRuta = path.join(RAIZ, "android", "app", "src", "main", "AndroidManifest.xml");
if (fs.existsSync(appManifestRuta)) {
  const appManifestXml = fs.readFileSync(appManifestRuta, "utf-8");
  igual(
    appManifestXml.includes('android:allowBackup="false"'),
    true,
    "AndroidManifest mantiene allowBackup=false por privacidad",
  );
  igual(
    appManifestXml.includes('android.permission.CAMERA') &&
      appManifestXml.includes('android:name="android.hardware.camera"') &&
      appManifestXml.includes('android:required="false"'),
    true,
    "AndroidManifest declara CAMERA con hardware opcional para lector de códigos y foto de comida",
  );

  const pluginManifestRuta = path.join(
    RAIZ,
    "node_modules",
    "@capgo",
    "capacitor-health",
    "android",
    "src",
    "main",
    "AndroidManifest.xml",
  );
  if (fs.existsSync(pluginManifestRuta)) {
    const pluginXml = fs.readFileSync(pluginManifestRuta, "utf-8");
    const permisosPlugin = [
      ...pluginXml.matchAll(/android:name="(android\.permission\.health\.[A-Z0-9_]+)"/g),
    ].map((m) => m[1]);
    const permitidos = new Set([
      "android.permission.health.READ_STEPS",
      "android.permission.health.READ_SLEEP",
    ]);
    const sinPodar = permisosPlugin.filter((perm) => {
      if (permitidos.has(perm)) return false;
      const patronRemove = new RegExp(
        `android:name="${perm.replace(/\./g, "\\.")}"[^>]*tools:node="remove"`,
      );
      return !patronRemove.test(appManifestXml);
    });
    igual(
      sinPodar,
      [],
      "todos los permisos de Health Connect no usados del plugin están eliminados con tools:node=remove",
    );
  }
}

console.log("");
console.log(fallos === 0 ? `${hechas} de ${hechas} bien.` : `${fallos} FALLAS de ${hechas}.`);
if (fallos > 0) process.exit(1);
