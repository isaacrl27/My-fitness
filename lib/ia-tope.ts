/**
 * Los topes de la IA, en números puros (sin Next ni Supabase, para que las
 * pruebas de unidad los importen sin montar el servidor).
 *
 * Hasta el 21/10/2026 todo contaba junto: un tope de 15 consultas al día por
 * persona, y la foto y el texto se pisaban. Ahora van por separado:
 *
 * - Texto: 30 consultas al día por persona (lo barato, para todo).
 * - Fotos: 10 al día por persona (un desayuno, una comida, una cena y
 *   4 snacks son 7 fotos; 10 da margen).
 * - Banda global: 250 llamadas al día para toda la clave compartida de
 *   Google (una clave gratuita para toda la familia). Es una aproximación
 *   del techo del cubo gratuito; se ajustará con datos de uso real.
 *
 * Los perfiles viejos no traen los contadores nuevos: cuentan 0 sin_backup
 * ninguna migración. El contador viejo compartido (`usoIA`) solo lo hereda
 * el texto, que es donde se llevaba gastando hasta ahora.
 */

/** Consultas de texto al día por persona. */
export const TOPE_TEXTO = 30;

/** Fotos al día por persona. */
export const TOPE_FOTO = 10;

/** Llamadas totales al día para toda la clave compartida. */
export const TOPE_GLOBAL = 250;

/** Cómo vive un contador guardado: fecha de hoy y cuántas van. */
type Contador = { fecha?: unknown; usadas?: unknown };

/** Las usadas HOY de un contador guardado (de otro día, cero). */
function usadasDe(uso: unknown, hoy: string): number {
  if (!uso || typeof uso !== "object") return 0;
  const c = uso as Contador;
  if (c.fecha !== hoy) return 0;
  return typeof c.usadas === "number" && Number.isFinite(c.usadas) && c.usadas > 0
    ? Math.floor(c.usadas)
    : 0;
}

/**
 * Cuántas consultas de TEXTO lleva hoy una persona: el contador nuevo propio
 * más el viejo compartido (que antes contaba fotos y texto juntos).
 */
export function usadasTexto(datos: unknown, hoy: string): number {
  if (!datos || typeof datos !== "object") return 0;
  const d = datos as { usoIA?: unknown; usoIAtexto?: unknown };
  return usadasDe(d.usoIA, hoy) + usadasDe(d.usoIAtexto, hoy);
}

/** Cuántas FOTOS lleva hoy una persona (sin herencia: empezamos de 0). */
export function usadasFotos(datos: unknown, hoy: string): number {
  if (!datos || typeof datos !== "object") return 0;
  return usadasDe((datos as { usoIAfoto?: unknown }).usoIAfoto, hoy);
}

/**
 * ¿La banda global del día ya está gastada? La fila vive en la tabla
 * `uso_ia_global` del servidor (una fila por fecha). Si la fila es de otro
 * día, la banda de hoy está entera.
 */
export function bandaAlcanzada(fila: unknown, hoy: string): boolean {
  return usadasDe(fila, hoy) >= TOPE_GLOBAL;
}
