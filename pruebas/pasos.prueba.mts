/**
 * Pruebas de los pasos al día que se proponen en el cuestionario.
 * Se ejecutan con: `node pruebas/pasos.prueba.mts`
 *
 * La meta no se inventa: sale de lo que dijo moverse cada semana. Son números
 * conservadores (los de la OMS cuentan unos 8.000 para lo normal) y en el
 * cuestionario se pueden cambiar con toques.
 */

import { pasosSugeridos, conMiles } from "../lib/calculos.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`);
  }
}

igual(pasosSugeridos("sedentario"), 5000, "poco movimiento, 5.000");
igual(pasosSugeridos("ligero"), 8000, "algo de ejercicio, 8.000");
igual(pasosSugeridos("moderado"), 10000, "3-5 días, 10.000");
igual(pasosSugeridos("alto"), 12000, "casi cada día, 12.000");
igual(pasosSugeridos("muy-alto"), 14000, "todos los días, 14.000");

/* Aunque el cambio esté mal escrito, no rompe: cae en lo normal. */
igual(pasosSugeridos("inventado" as never), 8000, "actividad desconocida, lo normal");

/* El formateo de miles. */
igual(conMiles(8000), "8.000", "ocho mil");
igual(conMiles(7500), "7.500", "siete mil quinientos");
igual(conMiles(125), "125", "menos de mil, tal cual");

console.log(
  fallos === 0
    ? `\nOK: ${hechas} comprobaciones de pasos.`
    : `\n${fallos} fallos de ${hechas}.`,
);
process.exit(fallos === 0 ? 0 : 1);
