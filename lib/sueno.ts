/**
 * El sueño del móvil, contado por noches y no por muestras sueltas.
 *
 * El sistema de salud entrega trozos pequeños (media hora, una hora) y a
 * veces los da dos veces: una por el reloj y otra por el teléfono. Si se
 * suman tal cual, una noche de 8 horas puede salir como 10 o como 16.
 *
 * Aquí los trozos se pegan en sesiones: si entre uno y el siguiente hay menos
 * de hora y media, son la misma noche. La sesión cuenta entera, con el hueco
 * incluido (un hueco sin dato no es lo mismo que un rato despierto), y se
 * apunta al día en que te despiertas. Lo que sí se resta es lo que el sistema
 * marca como `awake`: si te desvelaste media hora, esa media hora no es sueño.
 *
 * Lo que no cuenta: las siestas de menos de dos horas. Y una sesión de entre
 * dos y tres horas solo vale si empezó de noche (después de las 20:00 o antes
 * de las 6:00); si empezó a media tarde, era siesta.
 */

import { hoyISO } from "./calculos.ts";

export type EtapaSueno = {
  startDate: string;
  endDate: string;
  stage?: string;
};

export type MuestraSueno = {
  /** Inicio de la muestra, en ISO. */
  startDate: string;
  /** Fin de la muestra, en ISO. */
  endDate: string;
  /** "inBed", "awake" y "outOfBed" no son sueño. */
  sleepState?: string;
  /** En Android Health Connect, una sesión envuelve sus tramos reales en `stages`. */
  stages?: EtapaSueno[];
};

/** Un hueco mayor que esto ya no es la misma noche: es otra cosa. */
const HUECO_MAX_MS = 90 * 60 * 1000;
/** Menos de dos horas es una siesta. */
const SIESTA_MS = 2 * 60 * 60 * 1000;
/** Desde dos horas hasta tres, solo vale si empezó de noche. */
const NOCHE_MS = 3 * 60 * 60 * 1000;
/** Nadie duerme 16 horas: si sale más, hay datos repetidos. */
const SUENO_MAX_H = 16;

type Sesion = { inicio: number; fin: number };
type Intervalo = { inicio: number; fin: number };

/** Despliega `stages` (Health Connect) en muestras planas con `sleepState` uniforme. */
function desplegarMuestras(muestras: MuestraSueno[]): {
  startDate: string;
  endDate: string;
  sleepState?: string;
}[] {
  const planas: { startDate: string; endDate: string; sleepState?: string }[] = [];
  for (const m of muestras) {
    if (Array.isArray(m.stages) && m.stages.length > 0) {
      for (const etapa of m.stages) {
        const estado =
          etapa.stage === "awake" || etapa.stage === "outOfBed"
            ? "awake"
            : etapa.stage === "inBed"
              ? "inBed"
              : "asleep";
        planas.push({ startDate: etapa.startDate, endDate: etapa.endDate, sleepState: estado });
      }
    } else {
      planas.push({
        startDate: m.startDate,
        endDate: m.endDate,
        sleepState: m.sleepState === "outOfBed" ? "awake" : m.sleepState,
      });
    }
  }
  return planas;
}

/** Los trozos válidos, con sus fechas ya convertidas a milisegundos. */
function intervalos(muestras: MuestraSueno[], estados: "dormido" | "despierto"): Intervalo[] {
  return desplegarMuestras(muestras)
    .filter((m) =>
      estados === "dormido"
        ? m.sleepState !== "inBed" && m.sleepState !== "awake"
        : m.sleepState === "awake",
    )
    .map((m) => ({ inicio: Date.parse(m.startDate), fin: Date.parse(m.endDate) }))
    .filter((t) => Number.isFinite(t.inicio) && Number.isFinite(t.fin) && t.fin > t.inicio)
    .sort((a, b) => a.inicio - b.inicio);
}

/** Une ratos solapados para que un despertar grabado por reloj y móvil no se reste dos veces. */
function fusionarSolapes(trozos: Intervalo[]): Intervalo[] {
  const unidos: Intervalo[] = [];
  for (const trozo of trozos) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && trozo.inicio <= ultimo.fin) {
      ultimo.fin = Math.max(ultimo.fin, trozo.fin);
    } else {
      unidos.push({ ...trozo });
    }
  }
  return unidos;
}

/** Cuánto de un rato despierto cae dentro de la noche. */
function solape(a: Sesion, b: Intervalo): number {
  return Math.max(0, Math.min(a.fin, b.fin) - Math.max(a.inicio, b.inicio));
}

/** Convierte las muestras sueltas en noches seguidas. */
export function sesionesDeSueno(muestras: MuestraSueno[]): Sesion[] {
  const trozos = intervalos(muestras, "dormido");

  const sesiones: Sesion[] = [];
  for (const trozo of trozos) {
    const ultima = sesiones[sesiones.length - 1];
    if (ultima && trozo.inicio <= ultima.fin + HUECO_MAX_MS) {
      // Misma noche: se estira el final, sin sumar dos veces lo que ya estaba.
      ultima.fin = Math.max(ultima.fin, trozo.fin);
    } else {
      sesiones.push({ ...trozo });
    }
  }
  return sesiones;
}

/** ¿Empezó de noche? Se usa para distinguir una noche corta de una siesta. */
function empiezaDeNoche(sesion: Sesion): boolean {
  const hora = new Date(sesion.inicio).getHours();
  return hora >= 20 || hora < 6;
}

/** Las horas dormidas de cada día, apuntadas al día en que te despiertas. */
export function horasDeSuenoPorDia(muestras: MuestraSueno[]): Record<string, number> {
  const acumulado: Record<string, number> = {};
  const despierto = fusionarSolapes(intervalos(muestras, "despierto"));

  for (const sesion of sesionesDeSueno(muestras)) {
    let duracion = sesion.fin - sesion.inicio;
    for (const rato of despierto) {
      duracion -= solape(sesion, rato);
    }
    duracion = Math.max(0, duracion);
    if (duracion < SIESTA_MS) continue;
    if (duracion <= NOCHE_MS && !empiezaDeNoche(sesion)) continue;

    // Se apunta al día del despertar: la noche del 20 que acaba el 21 a las
    // 06:00 es el sueño del 21. Antes se sumaban 9 horas al final, y así una
    // noche que acababa pasadas las 15:00 se colaba en el día siguiente.
    const dia = hoyISO(new Date(sesion.fin));
    acumulado[dia] = (acumulado[dia] ?? 0) + duracion / 3_600_000;
  }

  const limpio: Record<string, number> = {};
  for (const [dia, horas] of Object.entries(acumulado)) {
    const valor = Math.round(Math.min(horas, SUENO_MAX_H) * 100) / 100;
    if (valor > 0) limpio[dia] = valor;
  }
  return limpio;
}