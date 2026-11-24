/**
 * Pruebas de los litros de agua que le tocan a cada uno.
 * Se ejecutan con: `node pruebas/agua.prueba.mts`
 *
 * La meta ya no es 2 litros para todos: sale del peso y de lo que cada uno
 * quiere conseguir. Estos números son los que se ven en Ajustes y los que
 * puntúan en Hoy, así que tienen que ser estables.
 */

import { aguaRecomendadaL } from "../lib/agua.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`);
  }
}

/* ------------------------------------------------------------------ */
/* Los tres pesos de la petición, con los tres objetivos              */
/* ------------------------------------------------------------------ */

igual(aguaRecomendadaL(50, "adelgazar"), 1.75, "50 kg bajando");
igual(aguaRecomendadaL(50, "mantener"), 1.75, "50 kg manteniendo");
igual(aguaRecomendadaL(50, "subir"), 1.75, "50 kg subiendo");

igual(aguaRecomendadaL(70, "adelgazar"), 2.25, "70 kg bajando");
igual(aguaRecomendadaL(70, "mantener"), 2.25, "70 kg manteniendo");
igual(aguaRecomendadaL(70, "subir"), 2.5, "70 kg subiendo");

igual(aguaRecomendadaL(110, "adelgazar"), 3.75, "110 kg bajando");
igual(aguaRecomendadaL(110, "mantener"), 3.75, "110 kg manteniendo");
igual(aguaRecomendadaL(110, "subir"), 3.75, "110 kg subiendo");

/* Ganar músculo pide un poco más que bajar. */
igual(aguaRecomendadaL(70, "recomposicion"), 2.5, "recomposición cuenta como ganar músculo");
igual(aguaRecomendadaL(70, "volumen-limpio"), 2.5, "volumen limpio cuenta como ganar músculo");

/* Lo normal: más peso, más agua. */
igual(
  aguaRecomendadaL(60, "mantener") < aguaRecomendadaL(90, "mantener"),
  true,
  "a más peso, más agua",
);

/* ------------------------------------------------------------------ */
/* Los topes                                                          */
/* ------------------------------------------------------------------ */

igual(aguaRecomendadaL(30, "adelgazar"), 1.5, "nunca baja de 1,5 litros");
igual(aguaRecomendadaL(200, "subir"), 4, "nunca pasa de 4 litros");

/* Siempre en cuartos de litro, que es como se ajusta en Ajustes. */
for (const kg of [42, 55, 61, 73, 88, 97, 124]) {
  for (const objetivo of ["adelgazar", "mantener", "subir"] as const) {
    const litros = aguaRecomendadaL(kg, objetivo);
    igual(
      Math.round(litros * 4) / 4 === litros,
      true,
      `${kg} kg ${objetivo}: ${litros} L va en cuartos`,
    );
  }
}

/* Un peso imposible no rompe la cuenta: se queda en el mínimo. */
igual(aguaRecomendadaL(0, "adelgazar"), 1.5, "0 kg no rompe nada");

console.log(`\n${hechas - fallos}/${hechas} comprobaciones bien.`);
if (fallos > 0) process.exit(1);
