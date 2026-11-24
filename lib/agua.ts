/**
 * Cuánta agua le toca al día a cada uno.
 *
 * La meta de 2 litros era igual para todos: ni una persona de 50 kg ni otra de
 * 110 necesitan lo mismo. La cuenta de partida es la de siempre —unos 33 ml por
 * kilo— y algo más (35) si lo que se busca es ganar músculo, que pide más agua.
 *
 * Sale en cuartos de litro porque es como se ajusta en Ajustes, y se queda entre
 * 1,5 y 4 litros: por debajo no tiene sentido y por encima es difícil de cumplir
 * sin pasar el día en el baño. Argon lo revisará con fuentes; cuando lo diga,
 * solo hay que cambiar estas tres constantes.
 */

import type { Objetivo } from "./calculos";

/** Mililitros por kilo de peso y día, para bajar o mantener. */
const ML_POR_KG = 33;

/** Mililitros por kilo cuando el objetivo es ganar músculo. */
const ML_POR_KG_MUSCULO = 35;

/** Litros: el suelo y el techo de la recomendación. */
const MINIMO_L = 1.5;
const MAXIMO_L = 4;

/** Los objetivos en los que se busca ganar músculo. */
function ganaMusculo(objetivo: Objetivo): boolean {
  return objetivo === "subir" || objetivo === "recomposicion" || objetivo === "volumen-limpio";
}

/**
 * Los litros al día que le tocan a alguien de este peso con este objetivo.
 * Devuelve un número en cuartos de litro (1,5 · 1,75 · 2 · 2,25 …).
 */
export function aguaRecomendadaL(pesoKg: number, objetivo: Objetivo): number {
  const porKilo = ganaMusculo(objetivo) ? ML_POR_KG_MUSCULO : ML_POR_KG;
  const bruto = (Math.max(0, pesoKg) * porKilo) / 1000;
  const cuartos = Math.round(bruto * 4) / 4;
  return Math.min(MAXIMO_L, Math.max(MINIMO_L, cuartos));
}
