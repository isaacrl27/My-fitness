import { idDispositivo } from "./nube";

/**
 * El lado del móvil de los avisos.
 *
 * En el iPhone solo se puede pedir permiso desde un botón, así que aquí no
 * se intenta nada hasta que la persona le da. Una vez concedido, el móvil
 * guarda su suscripción en la nube y desde ahí la app le puede avisar aunque
 * esté cerrado.
 */

export type EstadoAvisos =
  /** Todavía no se ha pedido permiso. */
  | "sin-pedir"
  /** Permiso concedido y suscripción guardada. */
  | "activos"
  /** Permiso concedido pero sin suscripción todavía. */
  | "sin-suscripcion"
  /** La persona los ha apagado a mano: no se encienden solos. */
  | "retirados"
  /** La persona los ha apagado o el sistema no los deja usar. */
  | "apagados";

/**
 * La clave pública VAPID pasa de base64url (con o sin relleno `=`) a los bytes
 * que exige `pushManager.subscribe` en todos los navegadores y WebViews.
 */
export function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const limpio = base64.trim();
  const relleno = "=".repeat((4 - (limpio.length % 4)) % 4);
  const normalizado = (limpio + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const caja = atob(normalizado);
  const salida = new Uint8Array(new ArrayBuffer(caja.length));
  for (let i = 0; i < caja.length; i++) salida[i] = caja.charCodeAt(i);
  return salida;
}

/** ¿Este navegador sabe mandar avisos (los PWAs viejos no)? */
export function sePuede(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Lo que la persona decidió con sus avisos.
 *
 * La reparación de arriba no puede distinguir entre «el iPhone mató la
 * suscripción» y «yo los apagué a mano»: sin esta marca, cada vez que se
 * abría la app los volvía a encender aunque la persona los hubiese apagado
 * (18/10). Con la marca, lo que ella decidió manda.
 */
const CLAVE_INTENCION = "myfitness:avisos:intencion";
/** Huella `dispositivo:endpoint` de la última suscripción confirmada por la nube. */
const CLAVE_SINCRONIZADO = "myfitness:avisos:sincronizado";
const ESPERA_SW_MS = 6000;

function decidioApagar(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_INTENCION) === "apagados";
  } catch {
    return false;
  }
}

function guardarIntencion(apagados: boolean) {
  try {
    if (apagados) window.localStorage.setItem(CLAVE_INTENCION, "apagados");
    else window.localStorage.removeItem(CLAVE_INTENCION);
  } catch {
    // nada que hacer
  }
}

function huellaSuscripcion(dispositivo: string, suscripcion: PushSubscription): string {
  const json = typeof suscripcion.toJSON === "function" ? suscripcion.toJSON() : null;
  const endpoint = suscripcion.endpoint || json?.endpoint || "";
  return `${dispositivo}:${endpoint}`;
}

function guardarSincronizado(huella: string | null) {
  try {
    if (huella) window.localStorage.setItem(CLAVE_SINCRONIZADO, huella);
    else window.localStorage.removeItem(CLAVE_SINCRONIZADO);
  } catch {
    // nada que hacer
  }
}

function leerSincronizado(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_SINCRONIZADO);
  } catch {
    return null;
  }
}

/**
 * Espera al Service Worker activo sin quedarse colgado para siempre si el
 * navegador lo bloquea (p. ej. modo privado estricto o WebView sin SW).
 */
async function obtenerRegistroSW(timeoutMs = ESPERA_SW_MS): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const sw = navigator.serviceWorker;
  try {
    if (typeof sw.getRegistration === "function") {
      const actual = await sw.getRegistration();
      if (!actual && typeof sw.register === "function") {
        await sw.register("/sw.js").catch(() => null);
      }
    }
  } catch {
    // seguir con `sw.ready`
  }

  let reloj: ReturnType<typeof setTimeout> | null = null;
  try {
    const limite = new Promise<null>((resolve) => {
      reloj = setTimeout(() => resolve(null), timeoutMs);
    });
    return await Promise.race([sw.ready, limite]);
  } catch {
    return null;
  } finally {
    if (reloj !== null) clearTimeout(reloj);
  }
}

export function estado(): EstadoAvisos {
  if (!sePuede()) return "apagados";
  if (Notification.permission === "denied") return "apagados";
  if (decidioApagar()) return "retirados";
  if (Notification.permission === "default") return "sin-pedir";
  return "sin-suscripcion";
}

/**
 * Comprueba el estado real de los avisos en este móvil.
 *
 * Si la suscripción del navegador sigue viva y su huella `dispositivo:endpoint`
 * ya fue confirmada por la nube, devuelve `"activos"` al instante incluso sin
 * cobertura (sin parpadear en «Avisos apagados»). Si el endpoint rotó o aún no
 * se había subido, delega en `reparar()`.
 */
export async function estadoReal(): Promise<EstadoAvisos> {
  const base = estado();
  if (base !== "sin-suscripcion") return base;
  const dispositivo = idDispositivo();
  if (!dispositivo) return "sin-suscripcion";
  try {
    const registro = await obtenerRegistroSW();
    const existente = await registro?.pushManager.getSubscription();
    if (existente && leerSincronizado() === huellaSuscripcion(dispositivo, existente)) {
      return "activos";
    }
  } catch {
    // caer en `reparar()`
  }
  return reparar();
}

/** Le dice al sistema que guardamos la suscripción de este móvil. */
async function guardar(suscripcion: PushSubscription | null): Promise<boolean> {
  const dispositivo = idDispositivo();
  if (!dispositivo) return false;
  try {
    const r = await fetch("/api/avisos/suscripcion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        dispositivo,
        suscripcion: suscripcion ? suscripcion.toJSON() : null,
      }),
    });
    if (r.ok) {
      guardarSincronizado(suscripcion ? huellaSuscripcion(dispositivo, suscripcion) : null);
    }
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Pide permiso y guarda la suscripción.
 *
 * El permiso **tiene que venir de un toque en pantalla**, que es lo que exige
 * el iPhone; por eso esto solo se llama desde un botón.
 */
export async function activar(): Promise<EstadoAvisos> {
  if (!sePuede()) return "apagados";

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return "apagados";

  const suscripcion = await suscribir();
  if (!suscripcion) return "sin-suscripcion";

  if (await guardar(suscripcion)) {
    guardarIntencion(false);
    return "activos";
  }
  return "sin-suscripcion";
}

/** Apaga los avisos: guarda la decisión y borra la suscripción de la nube. */
export async function desactivar(): Promise<EstadoAvisos> {
  guardarIntencion(true);
  guardarSincronizado(null);
  await guardar(null);
  try {
    const registro = await obtenerRegistroSW();
    const actual = await registro?.pushManager.getSubscription();
    if (actual) await actual.unsubscribe();
  } catch {
    // nada que hacer
  }
  return "retirados";
}

/**
 * Limpia marcas locales y da de baja la suscripción del navegador al borrar la
 * cuenta, dejando el dispositivo limpio para una cuenta nueva.
 */
export async function limpiarAvisosLocales(): Promise<void> {
  guardarIntencion(false);
  guardarSincronizado(null);
  if (!sePuede()) return;
  try {
    const registro = await obtenerRegistroSW(1500);
    const actual = await registro?.pushManager.getSubscription();
    if (actual) await actual.unsubscribe();
  } catch {
    // nada que hacer
  }
}

/**
 * Se asegura de que la suscripción siga viva.
 *
 * El iPhone tira de vez en cuando la suscripción de las PWAs sin avisar.
 * Como la app no puede darse cuenta, se vuelve a montar sola cada vez que se
 * abre: si ya estaba bien, no cuesta casi nada; si se había caído, se repara
 * sin que nadie se entere. Si la persona los apagó a mano, se queda callado:
 * la reparación no puede deshacer lo que ella decidió.
 */
export async function reparar(): Promise<EstadoAvisos> {
  if (!sePuede() || Notification.permission !== "granted") return estado();
  if (decidioApagar()) return "retirados";
  const suscripcion = await suscribir();
  if (!suscripcion) return "sin-suscripcion";
  return (await guardar(suscripcion)) ? "activos" : "sin-suscripcion";
}

async function suscribir(): Promise<PushSubscription | null> {
  const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!clave) return null;
  try {
    const registro = await obtenerRegistroSW();
    if (!registro) return null;
    const existente = await registro.pushManager.getSubscription();
    if (existente) return existente;
    return await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: aBytes(clave),
    });
  } catch {
    return null;
  }
}
