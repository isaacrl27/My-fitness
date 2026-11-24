/**
 * La tienda de puntos: cuándo conviene canjear el capricho.
 *
 * No decide por la persona: solo mira su plan de entreno y le propone el día
 * que mejor encaja. Si quiere canjearlo hoy, puede; la recomendación es un
 * consejo, no un candado.
 */

import {
  diasDeEntrenamiento,
  proximoEntrenamiento,
  sitioDeEntrenamiento,
} from "./ejercicios.ts";
import { DIAS_ENFRIAMIENTO } from "./puntos.ts";
import { ddMM } from "./calculos.ts";
import type { Perfil } from "./store";

export type Recomendacion = { dia: string; texto: string };

/** El día de mañana en ISO, a partir de hoy, sin depender de la hora del móvil. */
function mananaDe(hoy: string): string {
  return new Date(Date.parse(`${hoy}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

/**
 * El día que mejor encaja para el capricho.
 *
 * La idea es sencilla: después de entrenar sienta mejor y no estropea la
 * pesada del día siguiente. Se busca el próximo día de entreno; si hoy toca,
 * hoy mismo.
 */
export function recomendarCapricho(
  perfil: Perfil,
  hoy: string,
  caprichos: string[],
): Recomendacion {
  const sitio = sitioDeEntrenamiento(perfil.ejercicioSitio);
  const dias = diasDeEntrenamiento(perfil.ejercicioDias, perfil.actividad);
  const proximo = proximoEntrenamiento(sitio, dias, hoy);

  // Si ya hay un capricho canjeado y todavía no ha pasado la espera, no se
  // recomienda hoy: se dice cuándo se abre la veda y qué día de después encaja
  // mejor. Antes solo decía «te quedan 5 días» y no ayudaba a planificar.
  const esMantenimiento = perfil.objetivo === "mantener" || perfil.objetivo === "subir";
  const ultimo = caprichos.filter((c) => c.slice(0, 10) <= hoy.slice(0, 10)).sort().at(-1);
  if (ultimo && !esMantenimiento) {
    const hoyMs = Date.parse(`${hoy.slice(0, 10)}T12:00:00Z`);
    const ultimoMs = Date.parse(`${ultimo.slice(0, 10)}T12:00:00Z`);
    const pasados = Math.round((hoyMs - ultimoMs) / 86400000);
    const faltan = DIAS_ENFRIAMIENTO - pasados;
    if (faltan > 0) {
      const finEspera = new Date(
        ultimoMs + DIAS_ENFRIAMIENTO * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      const proximoTrasEspera = proximoEntrenamiento(sitio, dias, finEspera);
      // La tarjeta «Cuándo te conviene» es el único sitio donde se dice el día
      // que mejor encaja. El aviso de abajo solo cuenta los días que faltan,
      // para no repetir el consejo con otras palabras y contradecirlo.
      const texto =
        proximoTrasEspera.fecha === finEspera
          ? `Podrás canjear otro a partir del ${ddMM(finEspera)}, después de entrenar.`
          : `Podrás canjear otro a partir del ${ddMM(finEspera)}. El día que mejor te encaja es el ${proximoTrasEspera.dia.toLowerCase()}, después de entrenar.`;
      return {
        dia: proximoTrasEspera.fecha,
        texto,
      };
    }
  }

  if (proximo.fecha === hoy) {
    return {
      dia: hoy,
      texto: "Hoy mismo: entrenas, así que el capricho cae después del entreno.",
    };
  }

  // Viernes, sábado y domingo son cuando de verdad cae un capricho en una casa.
  // Mandar al lunes por sistema hacía que el consejo sonara a robot.
  const diaSemana = new Date(`${hoy}T12:00:00`).getDay();
  if (diaSemana === 5 || diaSemana === 6 || diaSemana === 0) {
    return {
      dia: hoy,
      texto: "Es fin de semana: hoy encaja mejor que esperar al lunes. Si hoy entrenas, tómalo después; si descansas, date antes un buen paseo.",
    };
  }

  if (proximo.fecha === mananaDe(hoy)) {
    return {
      dia: proximo.fecha,
      texto: "Te conviene mañana: entrenas y el capricho cae después.",
    };
  }

  return {
    dia: proximo.fecha,
    texto: `Te conviene el ${proximo.dia.toLowerCase()}: entrenas y el capricho cae después del entreno.`,
  };
}

/** Los días que faltan para poder canjear otro capricho (0 si ya se puede). */
export function diasDeEspera(caprichos: string[], hoy: string, objetivo?: string): number {
  if (objetivo === "mantener" || objetivo === "subir") return 0;
  const hoyDia = hoy.slice(0, 10);
  const ultimo = caprichos.filter((c) => c.slice(0, 10) <= hoyDia).sort().at(-1);
  if (!ultimo) return 0;
  const hoyMs = Date.parse(`${hoyDia}T12:00:00Z`);
  const ultimoMs = Date.parse(`${ultimo.slice(0, 10)}T12:00:00Z`);
  const pasados = Math.round((hoyMs - ultimoMs) / 86400000);
  return Math.max(0, DIAS_ENFRIAMIENTO - pasados);
}
