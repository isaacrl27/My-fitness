import { createHash, timingSafeEqual } from "node:crypto";

/**
 * La puerta de la app: cómo se comprueba la clave y cómo se firma la sesión.
 *
 * La clave NO vive en el código: vive en la variable de entorno `CLAVE_APP`
 * (puesta en Vercel, en el servidor). Aquí solo se compara.
 *
 * La cookie de sesión no lleva la clave dentro: lleva un resumen (SHA-256) de
 * la clave junto con una etiqueta fija. Así, aunque alguien llegara a ver la
 * cookie, de ahí no saca la clave.
 *
 * Todo esto funciona igual en el middleware (que corre en el borde de la red)
 * y en las rutas del servidor, porque `crypto.subtle` existe en los dos.
 */

export const COOKIE_SESION = "peso_sesion";

/** Etiqueta fija: cambia el resumen si algún día hay que invalidar sesiones. */
const ETIQUETA_BASE = "peso-app-sesion-v1";

/** Devuelve la etiqueta con versión/epoch opcional para revocación instantánea. */
export function etiquetaSesion(): string {
  const epoch = (process.env.SESION_EPOCH ?? "").trim();
  return epoch ? `${ETIQUETA_BASE}:${epoch}` : ETIQUETA_BASE;
}

/** Cuántos caracteres como mínimo tiene que tener la clave puesta en el servidor. */
const LARGO_MINIMO = 12;

/**
 * ¿Está puesta la clave en el servidor?
 *
 * Si no lo está, la app se cierra (decisión de Isaac, 31/10/2026): antes se
 * quedaba abierta «por si un despiste te dejaba fuera», pero eso significaba
 * que un fallo de configuración enseñaba tus datos y los de tu familia a
 * quien tuviera el enlace. Ahora, sin clave, nadie entra y sale un aviso
 * claro en `/entrar`.
 */
export function hayClave(): boolean {
  return (process.env.CLAVE_APP ?? "").trim().length >= LARGO_MINIMO;
}

/** El valor que debe llevar la cookie cuando la clave es la correcta. */
export async function valorSesion(): Promise<string> {
  if (!hayClave()) {
    throw new Error("CLAVE_APP no está configurada o no alcanza el largo mínimo.");
  }
  const clave = (process.env.CLAVE_APP ?? "").trim();
  const datos = new TextEncoder().encode(`${etiquetaSesion()}|${clave}`);
  const resumen = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(resumen))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Comprueba de forma cerrada y en tiempo constante si el valor de la cookie
 * de sesión corresponde a la clave activa del servidor.
 */
export async function sesionValida(cookie: string | null | undefined): Promise<boolean> {
  if (!hayClave() || typeof cookie !== "string" || cookie.length === 0) {
    return false;
  }
  return iguales(cookie, await valorSesion());
}

/**
 * Compara dos textos de forma timing-safe con `crypto.timingSafeEqual`.
 * Se utiliza un resumen SHA-256 sobre ambos para comparar siempre buffers de
 * exactamente 32 bytes de longitud fija, eliminando por completo cualquier fuga
 * de información por tiempo tanto del contenido como de la longitud exacta de la clave.
 */
export function iguales(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Cómo se guarda la cookie de sesión.
 *
 * `httpOnly` = el JavaScript de la página no la puede leer (así un script
 * metido a la fuerza no se lleva la sesión).
 * `secure` solo en producción, porque en casa se prueba por http y el
 * navegador rechazaría la cookie.
 * 30 días de duración: equilibrio entre seguridad y comodidad.
 */
export const OPCIONES_COOKIE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

/**
 * A dónde se vuelve después de poner la clave.
 *
 * Solo se acepta una dirección de dentro de la app. Si llega otra cosa, a la
 * raíz: así nadie usa la puerta para mandar a otra web.
 */
export function rutaInterna(valor: FormDataEntryValue | string | null | undefined): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto.startsWith("/")) return "/";
  if (texto.startsWith("//")) return "/";
  if (texto.includes("\\")) return "/";
  if (/[\x00-\x1F\x7F]/.test(texto)) return "/";

  try {
    const url = new URL(texto, "http://localhost");
    if (url.origin !== "http://localhost" || url.protocol !== "http:") {
      return "/";
    }
    const destino = url.pathname + url.search + url.hash;
    return destino.startsWith("/") && !destino.startsWith("//") ? destino : "/";
  } catch {
    return "/";
  }
}

/* ------------------------------------------------------------------ */
/* La invitación                                                       */
/* ------------------------------------------------------------------ */

/**
 * ¿La invitación que llega en la dirección es la buena?
 *
 * La buena vive en la configuración de la nube (`lib/config-nube.ts`), no en
 * el código ni en Vercel: así se puede cambiar sin publicar. Si no hay
 * invitación configurada, o es demasiado corta para ser una llave, no vale
 * ninguna.
 */
export function invitacionCorrecta(
  escrita: string | null | undefined,
  esperada: string,
): boolean {
  const buena = (esperada ?? "").trim();
  if (buena.length < 20) return false;
  const valor = (escrita ?? "").trim();
  if (valor.length === 0) return false;
  return iguales(valor, buena);
}
