/**
 * Lógica pura de rutas y navegación para My Fitness.
 * Separada del componente visual para ser 100% testeable en Node sin dependencias de JSX.
 */

/**
 * Determina si una pestaña de la barra inferior debe iluminarse según la ruta actual.
 *
 * Reconoce tanto la ruta exacta como sub-rutas anidadas (por ejemplo `/ajustes/habitos`
 * mantiene encendida la pestaña de Ajustes, y `/tienda` mantiene encendida la pestaña
 * de Hoy donde se ganan los puntos).
 */
export function esPestanaActiva(hrefPestana: string, rutaActual: string | null): boolean {
  if (!rutaActual) return false;
  if (rutaActual === hrefPestana) return true;
  if (hrefPestana === "/hoy") {
    return rutaActual === "/tienda";
  }
  if (hrefPestana !== "/") {
    return rutaActual.startsWith(`${hrefPestana}/`);
  }
  return false;
}

/**
 * Normaliza una ruta eliminando parámetros de búsqueda (query string) y hash,
 * y retirando barras finales redundantes.
 */
export function normalizarRuta(ruta: string): string {
  if (!ruta) return "/";
  const limpia = ruta.split("?")[0].split("#")[0];
  if (limpia.length > 1 && limpia.endsWith("/")) {
    return limpia.slice(0, -1);
  }
  return limpia || "/";
}
