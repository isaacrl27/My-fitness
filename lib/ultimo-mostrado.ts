/**
 * Lo último que se pintó de un número animado (el anillo, los puntos de hoy).
 *
 * Vive en una variable de módulo a propósito: sobrevive a cambiar de pestaña,
 * porque el layout no se recarga, pero se pone a cero cuando se recarga la app.
 * Así la animación de entrada ocurre una sola vez al abrir, no cada vez que se
 * vuelve a Hoy desde Progreso o Entreno.
 *
 * No se usa `sessionStorage` para el anillo: el primer render del servidor no
 * tiene navegador, y leerlo en el cliente antes de hidratar haría que el número
 * del HTML y el del móvil no coincidieran.
 */
const ultimos = new Map<string, number>();

/** El último valor pintado con esa clave, o `undefined` si es la primera vez. */
export function ultimoMostrado(clave: string): number | undefined {
  return ultimos.get(clave);
}

/** Guarda el valor para que la próxima vez no vuelva a contar desde cero. */
export function guardarMostrado(clave: string, valor: number): void {
  ultimos.set(clave, valor);
}
