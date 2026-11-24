/**
 * La configuración global de la app: la invitación y el mantenimiento.
 *
 * Vive en la tabla `secretos` de Supabase, que ya existía para la clave de los
 * avisos. No hace falta tabla nueva: una fila `invitacion` y otra
 * `mantenimiento`.
 *
 * Se lee con la clave de mando, que vive en Vercel y nunca llega al móvil. Si
 * Supabase no responde, se devuelve la configuración vacía y la app sigue con
 * la clave de siempre: un fallo de la nube no deja a nadie fuera.
 */

export type Mantenimiento = {
  activo: boolean;
  desde: string;
  hasta: string;
};

export type ConfigNube = {
  invitacion: string;
  mantenimiento: Mantenimiento | null;
};

export const CONFIG_VACIA: ConfigNube = { invitacion: "", mantenimiento: null };

/** Cuánto se guarda la respuesta antes de volver a preguntar. */
const TTL_MS = 10_000;

let cache: { cuando: number; valor: ConfigNube } | null = null;

/** Para las pruebas y para el script: olvida lo que tenía guardado. */
export function olvidarConfig(): void {
  cache = null;
}

function direccion(): { url: string; clave: string } | null {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const clave = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  if (clave.length < 20) return null;
  return { url, clave };
}

/** Convierte las filas de `secretos` en la configuración, sin romperse. */
export function configDeFilas(filas: unknown): ConfigNube {
  if (!Array.isArray(filas)) return CONFIG_VACIA;

  let invitacion = "";
  let mantenimiento: Mantenimiento | null = null;

  for (const fila of filas) {
    if (!fila || typeof fila !== "object") continue;
    const { nombre, valor } = fila as { nombre?: unknown; valor?: unknown };
    if (typeof nombre !== "string" || typeof valor !== "string") continue;

    if (nombre === "invitacion") {
      invitacion = valor.trim();
      continue;
    }

    if (nombre === "mantenimiento") {
      try {
        const dato = JSON.parse(valor) as Record<string, unknown>;
        mantenimiento = {
          activo: dato.activo === true,
          desde: typeof dato.desde === "string" ? dato.desde : "",
          hasta: typeof dato.hasta === "string" ? dato.hasta : "",
        };
      } catch {
        mantenimiento = null;
      }
    }
  }

  return { invitacion, mantenimiento };
}

/** ¿El mantenimiento sigue vigente? Sin `hasta`, vale mientras esté activo. */
export function mantenimientoVigente(m: Mantenimiento | null, ahora = new Date()): boolean {
  if (!m || !m.activo) return false;
  if (!m.hasta) return true;
  const fin = Date.parse(m.hasta);
  if (Number.isNaN(fin)) return true;
  return fin > ahora.getTime();
}

/**
 * Lee la configuración de la nube. Con caché corta para no preguntar en cada
 * clic; si la nube falla, devuelve la vacía y no la guarda, para reintentar.
 */
export async function leerConfigNube(ahora = Date.now()): Promise<ConfigNube> {
  if (cache && ahora - cache.cuando < TTL_MS) return cache.valor;

  const destino = direccion();
  if (!destino) return CONFIG_VACIA;

  try {
    const respuesta = await fetch(
      `${destino.url}/rest/v1/secretos?nombre=in.(invitacion,mantenimiento)&select=nombre,valor`,
      {
        headers: {
          apikey: destino.clave,
          authorization: `Bearer ${destino.clave}`,
        },
        signal: AbortSignal.timeout(2500),
      },
    );
    if (!respuesta.ok) return CONFIG_VACIA;

    const filas: unknown = await respuesta.json();
    const valor = configDeFilas(filas);
    cache = { cuando: ahora, valor };
    return valor;
  } catch {
    return CONFIG_VACIA;
  }
}
