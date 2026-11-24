/**
 * Pruebas de la tienda de puntos. Se ejecutan con: node pruebas/tienda.prueba.mts
 *
 * Comprueban la recomendación de cuándo canjear y los días de espera, con
 * fechas hechas a mano (19/10/2026 es lunes) para que no dependan del día en
 * que se ejecuten.
 */

import { diasDeEspera, recomendarCapricho } from "../lib/tienda.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.error(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

function contiene(texto: string, trozo: string, que: string) {
  hechas += 1;
  if (!texto.toLowerCase().includes(trozo.toLowerCase())) {
    fallos += 1;
    console.error(`FALLA  ${que}\n       esperaba que «${texto}» contuviera «${trozo}»`);
  } else {
    console.log(`ok     ${que}`);
  }
}

// Un perfil con tres días de entreno (lunes, miércoles y viernes).
const perfil = {
  ejercicioSitio: "casa",
  ejercicioDias: 3,
  actividad: "ligero",
} as never;

const lunes = "2026-10-19";
const martes = "2026-10-20";
const sabado = "2026-10-24";

// Si hoy se entrena, la recomendación es hoy mismo.
contiene(recomendarCapricho(perfil, lunes, []).texto, "Hoy mismo", "el lunes entrena: hoy mismo");

// Si mañana se entrena, la recomendación es mañana.
contiene(
  recomendarCapricho(perfil, martes, []).texto,
  "Te conviene mañana",
  "el martes entrena mañana",
);

// Si el próximo entreno cae a dos días, se dice el día.
const perfil2d = { ejercicioSitio: "casa", ejercicioDias: 2, actividad: "ligero" } as never;
contiene(
  recomendarCapricho(perfil2d, martes, []).texto,
  "Te conviene el jueves",
  "un martes con 2 días: el próximo entreno es el jueves",
);

// El fin de semana se recomienda hoy, no esperar al lunes: un capricho cae
// en fin de semana, no entre semana.
contiene(
  recomendarCapricho(perfil, sabado, []).texto,
  "fin de semana",
  "el sábado el capricho encaja hoy",
);

// Con un capricho reciente, primero toca esperar. Ya no se queda en «te
// quedan N días»: dice cuándo se abre la veda y qué día conviene después.
const reciente1 = recomendarCapricho(perfil, lunes, ["2026-10-15"]);
contiene(reciente1.texto, "a partir del 20/10", "un capricho de hace 4 días abre el 20/10");
contiene(reciente1.texto, "miércoles", "y el día que mejor encaja es el miércoles");
const reciente2 = recomendarCapricho(perfil, lunes, ["2026-10-17"]);
contiene(reciente2.texto, "a partir del 22/10", "un capricho de hace 2 días abre el 22/10");
contiene(reciente2.texto, "viernes", "y el día que mejor encaja es el viernes");

// Los días de espera, en números.
igual(diasDeEspera([], lunes), 0, "sin caprichos no hay espera");
igual(diasDeEspera(["2026-10-14"], lunes), 0, "un capricho de hace 5 días ya no espera");
igual(diasDeEspera(["2026-10-17"], lunes), 3, "un capricho de hace 2 días deja 3 de espera");
igual(diasDeEspera(["2026-10-19"], lunes), 5, "el capricho de hoy deja los 5 días");

if (fallos > 0) {
  console.error(`\n${fallos} fallos de ${hechas} comprobaciones`);
  process.exit(1);
}
console.log(`\n${hechas} comprobaciones, todas bien`);
