/**
 * Qué se ofrece cuando el plato del Plan no cabe en lo que queda del día.
 *
 * En el hueco vacío de una comida, Hoy enseña el plato que toca hoy con sus
 * kcal y dos salidas: anotarlo tal cual o recortar la ración para clavarlo en
 * lo que queda del día. El recorte tiene sentido cuando es un apaño pequeño
 * (un 7 % menos); cuando hay que dejar el plato en un 20 %, ya no es una
 * comida, son 30 g de pollo y una cucharada de quinoa. Eso confunde.
 *
 * Regla: si queda **al menos la mitad** del plato, se ajusta; si queda menos,
 * se ofrece media ración. Vive aquí, aparte de la pantalla, para poder
 * probarla sin navegador.
 */

/**
 * El plan y Hoy redondean a decenas. Un plato de 146 kcal con 145 libres no
 * debe avisar de que te pasas por 1 kcal: es ruido del redondeo, no una
 * decisión. Cinco kcal es el margen que cabe en un día.
 */
export const TOLERANCIA_KCAL = 5;

/** Qué botón (o botones) toca enseñar en el hueco del plato del Plan. */
export type OpcionRacion =
  /** El plato cabe o no hay hueco: solo «Anotar tal cual». */
  | { tipo: "tal-cual" }
  /** Cabe al menos la mitad: «Ajustar a mis X kcal» (y «Anotar tal cual»). */
  | { tipo: "ajustar"; factor: number; kcal: number; cabe: true }
  /**
   * Queda menos de la mitad: «Anotar media ración (X kcal)» (y tal cual).
   * `cabe` en falso significa que ni la mitad entra en lo que queda: la
   * pantalla no puede pintar ese botón en verde como si arreglara el exceso.
   */
  | { tipo: "media-racion"; factor: number; kcal: number; cabe: boolean };

/** La mitad del plato: el listón por debajo del cual no se ofrece ajustar. */
export const MITAD = 0.5;

/**
 * `previstoKcal` son las kcal del plato del Plan y `restanteKcal` las que
 * quedan hoy. Un restante negativo o cero significa que ya se ha pasado el
 * día: ahí no se ofrece ni ajuste ni media ración, solo anotar tal cual.
 */
export function opcionesDeRacion(previstoKcal: number, restanteKcal: number): OpcionRacion {
  const previsto = Number.isFinite(previstoKcal) ? previstoKcal : 0;
  const restante = Number.isFinite(restanteKcal) ? restanteKcal : 0;

  if (previsto <= 0 || restante <= 0) return { tipo: "tal-cual" };
  // Dentro de la tolerancia no hay nada que avisar: el plato va tal cual.
  if (previsto <= restante + TOLERANCIA_KCAL) return { tipo: "tal-cual" };
  if (restante >= previsto * MITAD) {
    return { tipo: "ajustar", factor: restante / previsto, kcal: Math.round(restante), cabe: true };
  }
  const mitad = previsto * MITAD;
  return {
    tipo: "media-racion",
    factor: MITAD,
    kcal: Math.round(mitad),
    cabe: mitad <= restante + TOLERANCIA_KCAL,
  };
}
