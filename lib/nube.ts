import type { Datos } from "./store";
import { prepararCargaSubida } from "./nube-subida";

/**
 * Lo que el móvil habla con la nube.
 *
 * Todo va por `/api/nube`, que está detrás de la puerta de la app: quien no
 * tenga la clave no puede ni preguntar. Si la nube no responde, la app sigue
 * funcionando con lo que tiene guardado en el móvil, que es donde vive de
 * todas formas.
 */

const CLAVE_ID = "mi-peso:dispositivo";

/**
 * La marca de este móvil.
 *
 * No es un usuario ni una contraseña: es una etiqueta aleatoria que solo
 * sirve para que el servidor sepa a qué persona le pertenecen los datos.
 * Como el móvil se registra solo, cada uno lleva la suya —Isaac y su novia
 * no se pisan—.
 */
export function idDispositivo(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(CLAVE_ID);
    if (!id) {
      id = `movil-${crypto.randomUUID()}`;
      window.localStorage.setItem(CLAVE_ID, id);
    }
    return id;
  } catch {
    return "";
  }
}

export type RespuestaNube = {
  hay: boolean;
  datos?: Datos;
  codigo?: string;
  nombre?: string;
  motivo?: string;
  /** La nube no está montada: la app sigue solo en el móvil. */
  sinConfigurar?: boolean;
  /** Reintentar no lo va a arreglar (por ejemplo, los datos no caben). */
  permanente?: boolean;
};

/**
 * Lee la respuesta sin romperse si el servidor devuelve algo que no es
 * JSON —por ejemplo, si la puerta redirige a la pantalla de entrada—.
 */
async function leer(respuesta: Response): Promise<RespuestaNube> {
  if (respuesta.status === 503) {
    return { hay: false, sinConfigurar: true };
  }
  if (respuesta.status === 401 || respuesta.redirected) {
    return { hay: false, motivo: "Sin sesión: vuelve a entrar con la clave." };
  }
  // 413 es «los datos no caben»: reintentarlo cada cinco minutos no lo
  // arregla, así que se marca como definitivo y se deja de insistir.
  if (respuesta.status === 413) {
    return {
      hay: false,
      permanente: true,
      motivo: "Los datos de este móvil no caben en la nube. Se guarda todo en el móvil.",
    };
  }
  try {
    const cuerpo = (await respuesta.json()) as RespuestaNube;
    return { ...cuerpo, hay: Boolean(cuerpo.hay) };
  } catch {
    return { hay: false, motivo: "La nube ha respondido algo que no entiendo." };
  }
}

/** ¿Hay algo guardado en la nube para este móvil? */
export async function bajarNube(): Promise<RespuestaNube> {
  const id = idDispositivo();
  if (!id) return { hay: false };
  try {
    const r = await fetch(`/api/nube?dispositivo=${encodeURIComponent(id)}`, {
      credentials: "same-origin",
    });
    return await leer(r);
  } catch {
    return { hay: false, motivo: "Sin conexión." };
  }
}

/** Tope seguro para `fetch({ keepalive: true })`: el estándar corta en 64 KiB. */
const TOPE_KEEPALIVE_BYTES = 60 * 1024;

/**
 * Sube los cambios del móvil a la nube.
 *
 * Si se conoce `base` (la última foto confirmada por el servidor), solo viajan
 * las filas que hayan cambiado desde entonces (`prepararCargaSubida`).
 */
export async function subirNube(
  datos: Datos,
  opciones?: { base?: Datos | null; alOcultar?: boolean },
): Promise<RespuestaNube> {
  // Sin perfil activo no se crea identificador nuevo, para que una cuenta recién
  // borrada no resucite vacía. Con perfil activo sí se asegura identificador,
  // permitiendo empezar una cuenta nueva tras borrar la anterior sin recargar.
  const id = datos.perfil ? idDispositivo() : dispositivoActual();
  if (!id) return { hay: false };
  try {
    const carga = prepararCargaSubida(datos, opciones?.base ?? null);
    const cuerpo = JSON.stringify({
      dispositivo: id,
      datos: carga.datos,
      comidasCapricho: carga.comidasCapricho,
      saludViva: carga.saludViva,
      diferencial: carga.diferencial,
    });
    const bytes = new TextEncoder().encode(cuerpo).byteLength;
    const r = await fetch("/api/nube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      // En navegadores y WebViews, `keepalive: true` lanza TypeError inmediato si
      // el cuerpo supera 64 KiB; solo se activa al ocultar la app y si cabe holgado.
      keepalive: Boolean(opciones?.alOcultar) && bytes <= TOPE_KEEPALIVE_BYTES,
      body: cuerpo,
    });
    return await leer(r);
  } catch {
    return { hay: false, motivo: "Sin conexión." };
  }
}

/** Enlaza este móvil con una persona que ya tenía datos, con su código. */
export async function reclamarNube(codigo: string): Promise<RespuestaNube> {
  const id = idDispositivo();
  if (!id) return { hay: false, motivo: "Este navegador no deja guardar la marca del móvil." };
  try {
    const r = await fetch("/api/nube", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ codigo: codigo.trim().toUpperCase(), dispositivo: id }),
    });
    return await leer(r);
  } catch {
    return { hay: false, motivo: "Sin conexión." };
  }
}

/** Guarda el código con el que este móvil se identifica en la nube. */
export function guardarCodigo(codigo: string) {
  try {
    if (codigo) window.localStorage.setItem("mi-peso:codigo", codigo);
  } catch {
    // nada que hacer
  }
}

/** La marca del móvil tal cual está guardada, sin crear una si no existe. */
function dispositivoActual(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CLAVE_ID) ?? "";
  } catch {
    return "";
  }
}

/**
 * Borra la cuenta entera de la nube: la persona, sus datos y sus móviles.
 *
 * Si este móvil nunca subió nada, no hay cuenta y va bien igualmente. El
 * móvil se limpia después con `reiniciarDispositivo()`.
 */
export async function borrarCuentaNube(): Promise<RespuestaNube> {
  const id = dispositivoActual();
  if (!id) return { hay: true };
  try {
    const r = await fetch(`/api/nube?dispositivo=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    return await leer(r);
  } catch {
    return { hay: false, motivo: "Sin conexión." };
  }
}

export function leerCodigo(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("mi-peso:codigo") ?? "";
  } catch {
    return "";
  }
}

/**
 * Deja este móvil como recién instalado: borra su marca y el código de
 * recuperación. Se usa al eliminar la cuenta, para que los datos borrados no
 * vuelvan a bajar de la nube al recargar.
 */
export function reiniciarDispositivo() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAVE_ID);
    window.localStorage.removeItem("mi-peso:codigo");
  } catch {
    // nada que hacer
  }
}
