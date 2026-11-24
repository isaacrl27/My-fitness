import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * El cliente de Supabase, solo para el servidor.
 *
 * Usa la clave de mando (`SUPABASE_SERVICE_ROLE_KEY`), que vive en Vercel y
 * nunca llega al móvil. Esa clave escribe y lee todo, y por eso solo puede
 * usarse detrás de la puerta: todas las rutas que la usan están cubiertas por
 * el proxy de autenticación, que pide la clave de la app antes de dejar pasar.
 *
 * Si las variables de entorno no están puestas o no son válidas, devuelve `null`
 * y la app se queda funcionando solo en el móvil de forma segura.
 */
let clienteCache: SupabaseClient | null = null;
let ultimaUrl = "";
let ultimaClave = "";

export function nubeDeServidor(): SupabaseClient | null {
  if ((process.env.DESACTIVAR_NUBE_E2E ?? "").trim() === "1") {
    return null;
  }
  const url = (process.env.SUPABASE_URL ?? "").trim();
  const clave = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  // En producción se exige HTTPS sin excepciones
  if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
    return null;
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return null;
  }
  if (clave.length < 20) {
    return null;
  }

  // Reutilizar cliente si la configuración no ha cambiado
  if (clienteCache && url === ultimaUrl && clave === ultimaClave) {
    return clienteCache;
  }

  ultimaUrl = url;
  ultimaClave = clave;
  clienteCache = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return clienteCache;
}

/** ¿Está la nube montada, o seguimos solo en el móvil? */
export function hayNube(): boolean {
  return nubeDeServidor() !== null;
}
