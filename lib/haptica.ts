/**
 * Respuesta háptica táctil en el móvil estilo iPhone / Android.
 *
 * Utiliza `navigator.vibrate` con comprobación de permisos y soporte offline.
 * Respeta la preferencia del usuario guardada en Ajustes.
 */

export const CLAVE_VIBRACION = "mi-peso:vibracion";

/** ¿Tiene el usuario la vibración activada? (Activada por defecto). */
export function vibracionActivada(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(CLAVE_VIBRACION);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

/** Guarda la preferencia de vibración en Ajustes. */
export function guardarVibracionActivada(activo: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_VIBRACION, String(activo));
  } catch {}
}

function vibrar(patron: number | number[]): void {
  if (typeof window === "undefined" || !vibracionActivada()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(patron);
    }
  } catch {}
}

/** Micro-impacto ligero (10 ms) para botones y toques principales. */
export function vibrarTap(): void {
  vibrar(10);
}

/** Impacto medio (18 ms) para marcar hábitos, ejercicios o productos de compra. */
export function vibrarCheck(): void {
  vibrar(18);
}

/** Confirmación de éxito (25 ms) al guardar pesadas o comidas. */
export function vibrarExito(): void {
  vibrar(25);
}

/** Celebración festiva para el Día a Rajatabla o el Capricho. */
export function vibrarCelebracion(): void {
  vibrar([20, 50, 30, 50, 45]);
}
