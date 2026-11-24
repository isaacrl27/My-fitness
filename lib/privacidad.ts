/**
 * Gestión del consentimiento de privacidad y cookies de My Fitness.
 *
 * Se almacena en localStorage para que la persona solo tenga que aceptarlo una vez.
 */

export const CLAVE_PRIVACIDAD = "mi-peso:privacidad-aceptada";

export function haAceptadoPrivacidad(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(CLAVE_PRIVACIDAD));
  } catch {
    return false;
  }
}

export function aceptarPrivacidad(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_PRIVACIDAD, new Date().toISOString());
  } catch {
    // Sin localStorage (modo privado estricto)
  }
}

export function fechaAceptacionPrivacidad(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLAVE_PRIVACIDAD);
  } catch {
    return null;
  }
}
