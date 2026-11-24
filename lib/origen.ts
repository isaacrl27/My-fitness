import type { NextRequest } from "next/server";

/**
 * De dónde viene la petición, para los frenos por intentos y defensa CSRF.
 *
 * `x-forwarded-for` puede traer varias direcciones y el cliente puede escribir
 * las primeras: leer la primera entrada permitía saltarse el freno de intentos
 * cambiando esa cabecera en cada prueba. La que añade el proxy de Vercel es la
 * última, y además suele venir en `x-real-ip`. Se prefiere esa.
 */
export function origen(peticion: NextRequest): string {
  const vercel = (peticion.headers.get("x-vercel-forwarded-for") ?? "").trim();
  if (vercel) return vercel.split(",")[0].trim();

  const real = (peticion.headers.get("x-real-ip") ?? "").trim();
  if (real) return real;

  const cabecera = peticion.headers.get("x-forwarded-for") ?? "";
  const partes = cabecera
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);

  return partes[partes.length - 1] || "desconocida";
}

function limpiarHost(h: string): string {
  return h.trim().toLowerCase().replace(/:(?:80|443)$/, "");
}

function coincideConHostPropio(peticion: NextRequest, urlCabecera: string): boolean {
  let hostOrigen: string;
  try {
    hostOrigen = limpiarHost(new URL(urlCabecera).host);
  } catch {
    return false;
  }

  const fwdHost = peticion.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = peticion.headers.get("host");

  if (fwdHost && limpiarHost(fwdHost) === hostOrigen) return true;
  if (host && limpiarHost(host) === hostOrigen) return true;
  return false;
}

/**
 * Exige que la petición traiga `Origin` o `Referer` del mismo dominio y no sea
 * `Sec-Fetch-Site: cross-site`. Obligatorio en formularios HTML (`/api/entrar`,
 * `/api/salir`), donde el navegador siempre manda cabecera de origen.
 */
export function esMismoOrigen(peticion: NextRequest): boolean {
  const secSite = (peticion.headers.get("sec-fetch-site") ?? "").trim().toLowerCase();
  if (secSite === "cross-site") return false;

  const valorOrigen = peticion.headers.get("origin") || peticion.headers.get("referer");
  if (!valorOrigen) return false;

  return coincideConHostPropio(peticion, valorOrigen);
}

/**
 * Detecta si una petición a una ruta JSON viene de otro sitio web en un navegador.
 * Si el navegador marca `Sec-Fetch-Site: cross-site` o envía un `Origin`/`Referer`
 * ajeno (incluido `Origin: null`), se rechaza; si no hay cabeceras de navegador
 * (pruebas automatizadas o llamadas internas con cookie), no estorba.
 */
export function esCrossSite(peticion: NextRequest): boolean {
  const secSite = (peticion.headers.get("sec-fetch-site") ?? "").trim().toLowerCase();
  if (secSite === "cross-site") return true;

  const origin = peticion.headers.get("origin");
  if (origin !== null) {
    return !coincideConHostPropio(peticion, origin);
  }

  const referer = peticion.headers.get("referer");
  if (referer !== null) {
    return !coincideConHostPropio(peticion, referer);
  }

  return false;
}
