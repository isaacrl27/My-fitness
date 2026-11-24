/**
 * El tamaño de letra de la app: pequeño, normal, grande o gigante.
 *
 * Se guarda en localStorage y se aplica con data-tamano="..." en el <html>.
 * En CSS, se redefinen las variables de diseño (--text-xs, --text-sm, etc.)
 * para que todos los textos escalen de forma real e instantánea.
 */

export type TamanoTexto = "pequeno" | "normal" | "grande" | "gigante";

export const CLAVE_TAMANO = "mi-peso:tamano-texto";

export function normalizarTamano(valor: unknown): TamanoTexto {
  if (valor === "pequeno" || valor === "grande" || valor === "gigante") {
    return valor;
  }
  return "normal";
}

export function leerTamano(): TamanoTexto {
  if (typeof window === "undefined") return "normal";
  try {
    return normalizarTamano(window.localStorage.getItem(CLAVE_TAMANO));
  } catch {
    return "normal";
  }
}

export function aplicarTamano(tamano: TamanoTexto): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-tamano", tamano);
}

export function guardarTamano(tamano: TamanoTexto): void {
  try {
    window.localStorage.setItem(CLAVE_TAMANO, tamano);
  } catch {
    // Sin localStorage
  }
  aplicarTamano(tamano);
}

/** Script para inyectar en <head> y aplicar el tamaño sin parpadeos */
export const SCRIPT_TAMANO = `(function(){try{var t=localStorage.getItem("mi-peso:tamano-texto");if(t&&t!=="normal")document.documentElement.setAttribute("data-tamano",t);}catch(e){}})();`;
