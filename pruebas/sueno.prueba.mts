/**
 * Pruebas del sueño por sesiones. Se ejecutan con:
 *   node pruebas/sueno.prueba.mts
 *
 * Comprueban los casos que rompían antes: noche troceada, reloj y móvil a la
 * vez, siestas y sesiones cortas de la tarde.
 */

import { horasDeSuenoPorDia, sesionesDeSueno } from "../lib/sueno.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.log(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

/** Trocea una noche en muestras de media hora, como hace el móvil. */
function trozos(desde: string, hasta: string, minutos = 30) {
  const salida: { startDate: string; endDate: string; sleepState: string }[] = [];
  let inicio = Date.parse(desde);
  const fin = Date.parse(hasta);
  while (inicio < fin) {
    const siguiente = Math.min(inicio + minutos * 60_000, fin);
    salida.push({
      startDate: new Date(inicio).toISOString(),
      endDate: new Date(siguiente).toISOString(),
      sleepState: "asleep",
    });
    inicio = siguiente;
  }
  return salida;
}

// --- Una noche normal, troceada ---------------------------------------------
igual(
  horasDeSuenoPorDia(trozos("2026-10-20T22:00:00", "2026-10-21T06:00:00")),
  { "2026-10-21": 8 },
  "una noche de 8 horas en trozos de media hora cuenta 8, no 16 trozos",
);

// --- El reloj y el móvil graban la misma noche ------------------------------
igual(
  horasDeSuenoPorDia([
    ...trozos("2026-10-20T22:00:00", "2026-10-21T06:00:00"),
    ...trozos("2026-10-20T22:10:00", "2026-10-21T05:50:00"),
  ]),
  { "2026-10-21": 8 },
  "si el reloj y el móvil graban la misma noche, no se suma dos veces",
);

// --- Un hueco corto (un despertar) no parte la noche ------------------------
igual(
  horasDeSuenoPorDia([
    ...trozos("2026-10-20T22:00:00", "2026-10-21T02:00:00"),
    ...trozos("2026-10-21T02:30:00", "2026-10-21T06:00:00"),
  ]),
  { "2026-10-21": 8 },
  "un despertar de media hora dentro de la noche no la parte en dos",
);

// --- Las siestas no son la noche --------------------------------------------
igual(
  horasDeSuenoPorDia(trozos("2026-10-21T15:00:00", "2026-10-21T16:00:00")),
  {},
  "una siesta de una hora no cuenta como sueño nocturno",
);
igual(
  horasDeSuenoPorDia(trozos("2026-10-21T15:00:00", "2026-10-21T17:30:00")),
  {},
  "una siesta larga de la tarde tampoco cuenta",
);
igual(
  horasDeSuenoPorDia(trozos("2026-10-20T23:00:00", "2026-10-21T01:30:00")),
  { "2026-10-21": 2.5 },
  "una noche corta que empieza a las 23:00 sí cuenta",
);

// --- Lo que no es dormir se ignora ------------------------------------------
igual(
  horasDeSuenoPorDia([
    { startDate: "2026-10-20T22:00:00", endDate: "2026-10-21T06:00:00", sleepState: "inBed" },
    { startDate: "2026-10-21T00:00:00", endDate: "2026-10-21T00:30:00", sleepState: "awake" },
  ]),
  {},
  "estar en la cama o despierto no es dormir",
);

// --- Lo que el sistema marca como despierto no es sueño ---------------------
igual(
  horasDeSuenoPorDia([
    ...trozos("2026-10-20T22:00:00", "2026-10-21T06:00:00"),
    { startDate: "2026-10-21T02:00:00", endDate: "2026-10-21T02:30:00", sleepState: "awake" },
  ]),
  { "2026-10-21": 7.5 },
  "media hora despierto dentro de la noche se resta de las horas dormidas",
);

// --- El día al que se apunta la noche es el del despertar -------------------
igual(
  horasDeSuenoPorDia(trozos("2026-10-21T08:00:00", "2026-10-21T16:00:00")),
  { "2026-10-21": 8 },
  "una noche que acaba a las 16:00 sigue siendo del mismo día, no del siguiente",
);

igual(
  horasDeSuenoPorDia(trozos("2026-10-21T14:00:00", "2026-10-21T17:00:00")),
  {},
  "una siesta de tres horas justas de la tarde no cuenta",
);

// --- Las sesiones se pegan, no se suman -------------------------------------
igual(
  sesionesDeSueno(trozos("2026-10-20T22:00:00", "2026-10-21T06:00:00")).length,
  1,
  "la noche entera es una sola sesión",
);

// --- Un despertar grabado por reloj y móvil no se resta dos veces -----------
igual(
  horasDeSuenoPorDia([
    ...trozos("2026-10-20T22:00:00", "2026-10-21T06:00:00"),
    { startDate: "2026-10-21T02:00:00", endDate: "2026-10-21T02:30:00", sleepState: "awake" },
    { startDate: "2026-10-21T02:05:00", endDate: "2026-10-21T02:30:00", sleepState: "awake" },
  ]),
  { "2026-10-21": 7.5 },
  "si reloj y móvil graban el mismo rato despierto, solo se resta una vez",
);

// --- Sesiones con stages[] al estilo Android Health Connect -----------------
igual(
  horasDeSuenoPorDia([
    {
      startDate: "2026-10-20T22:30:00",
      endDate: "2026-10-21T06:30:00",
      sleepState: "inBed",
      stages: [
        { startDate: "2026-10-20T22:30:00", endDate: "2026-10-20T23:00:00", stage: "inBed" },
        { startDate: "2026-10-20T23:00:00", endDate: "2026-10-21T02:00:00", stage: "deep" },
        { startDate: "2026-10-21T02:00:00", endDate: "2026-10-21T02:30:00", stage: "awake" },
        { startDate: "2026-10-21T02:30:00", endDate: "2026-10-21T06:30:00", stage: "rem" },
      ],
    },
  ]),
  { "2026-10-21": 7 },
  "Health Connect con stages[] cuenta las etapas de sueño reales y descarta inBed y awake",
);

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}