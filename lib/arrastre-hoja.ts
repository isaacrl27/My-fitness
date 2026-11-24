/**
 * Arrastrar una hoja inferior (como la de anotar comida) hacia abajo para
 * cerrarla, igual que una hoja del iPhone.
 *
 * Aquí vive solo la decisión (qué distancia o qué velocidad bastan para
 * cerrar), separada del componente para poder probarla sin navegador.
 */

/** Con tanto recorrido hacia abajo, la hoja se cierra aunque se suelte despacio. */
export const UMBRAL_CIERRE_PX = 110;

/** Un empujón rápido cierra con menos recorrido, pero no con un roce. */
export const UMBRAL_EMPUJON_PX = 40;

/** Velocidad (píxeles por milisegundo) que cuenta como empujón. */
export const UMBRAL_VELOCIDAD = 0.5;

/** Lo que hay que mover el dedo antes de que cuente como arrastre (y no como toque). */
export const ZONA_MUERTA_PX = 6;

/** Hacia arriba no hay recorrido (la hoja ya está al tope): solo se baja. */
export function desplazamientoVisible(dy: number): number {
  return dy > 0 ? dy : 0;
}

/** Al soltar: ¿se cierra o vuelve a su sitio? */
export function debeCerrarAlSoltar(dy: number, milisegundos: number): boolean {
  if (dy > UMBRAL_CIERRE_PX) return true;
  const velocidad = dy / Math.max(1, milisegundos);
  return dy > UMBRAL_EMPUJON_PX && velocidad > UMBRAL_VELOCIDAD;
}
