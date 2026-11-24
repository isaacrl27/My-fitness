/**
 * Versión semántica real (SemVer) de My Fitness: MAYOR.MENOR.PARCHE (ej. 0.0.63).
 *
 * Reglas acordadas con Isaac (02/11/2026):
 * - `VERSION_MAYOR`: 0 mientras es Beta/pruebas familiares; 1 en el lanzamiento definitivo.
 * - `VERSION_MENOR`: sube cuando entra un cambio gordo o función nueva,
 *   poniendo `VERSION_PARCHE` a 0 (ej. 0.1.0, 0.2.0).
 * - `VERSION_PARCHE`: sube de 1 en 1 en cambios ligeros, retoques o arreglos
 *   (ej. 0.0.61 -> 0.0.62).
 *
 * Nota: el entero `VERSION` de `lib/novedades.ts` es un contador interno
 * monotónico exclusivo para `localStorage` (`mi-peso:novedades`), de modo que
 * cuando `0.0.x` salte a `0.1.0`, el registro de novedades vistas nunca se rompa.
 */
export const VERSION_MAYOR = 0;
export const VERSION_MENOR = 1;
export const VERSION_PARCHE = 35;

export function formatearSemVer(mayor: number, menor: number, parche: number): string {
  if (![mayor, menor, parche].every((n) => Number.isInteger(n) && n >= 0)) {
    throw new Error(`Versión SemVer inválida: ${mayor}.${menor}.${parche}`);
  }
  return `${mayor}.${menor}.${parche}`;
}

export const VERSION_NUMERO = formatearSemVer(VERSION_MAYOR, VERSION_MENOR, VERSION_PARCHE);
export const VERSION_APP = VERSION_NUMERO;
export const VERSION_NOMBRE = VERSION_NUMERO;
export const VERSION_ETIQUETA = `Versión ${VERSION_NUMERO}`;
