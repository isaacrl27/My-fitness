/**
 * Pruebas del tope del ajuste de ración.
 * Se ejecutan con: `node pruebas/racion.prueba.mts`
 *
 * El hueco de una comida en Hoy ofrece el plato del Plan a un toque. Si el
 * plato se pasa de lo que queda del día, se puede recortar la ración... pero
 * solo si queda al menos la mitad del plato. Recortar un plato de 582 kcal a
 * 120 kcal son 30 g de pollo y una cucharada de quinoa: eso no es una comida,
 * es un error. Por debajo de la mitad se ofrece media ración.
 */

import { opcionesDeRacion } from "../lib/racion.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`);
  }
}

function tipo(previsto: number, restante: number) {
  return opcionesDeRacion(previsto, restante).tipo;
}

// No se pasa: se anota tal cual, sin ajustes.
igual(tipo(582, 600), "tal-cual", "si sobra sitio, el plato va tal cual");
igual(tipo(582, 582), "tal-cual", "clavarlo exacto no es pasarse");
// El plan y Hoy redondean a decenas: un plato de 146 kcal con 145 libres no
// debe avisar de que se pasa por 1 kcal. La tolerancia es de 5.
igual(tipo(146, 145), "tal-cual", "pasarse por 1 kcal por redondeo no es pasarse");
igual(tipo(146, 141), "tal-cual", "pasarse por 5 kcal entra en la tolerancia");
igual(tipo(146, 140), "ajustar", "pasarse por 6 kcal ya se avisa");
igual(tipo(0, 500), "tal-cual", "sin plato no hay nada que ajustar");

// No hay hueco: tampoco se ofrece ajustar ni media ración.
igual(tipo(582, 0), "tal-cual", "sin calorías libres no se ofrece recortar");
igual(tipo(582, -50), "tal-cual", "si ya se ha pasado del día, no se ajusta");

// Se pasa pero queda al menos la mitad del plato: ajustar está bien.
igual(tipo(582, 540), "ajustar", "quedan 540 de un plato de 582: ajustar tiene sentido");
igual(tipo(582, 291), "ajustar", "justo la mitad del plato todavía se ajusta");

// Se pasa y queda menos de la mitad: media ración, nunca un plato recortado.
igual(tipo(582, 290), "media-racion", "un pelo por debajo de la mitad ya es media ración");
igual(tipo(582, 120), "media-racion", "120 kcal de un plato de 582 no es ajustar");

// El factor y las calorías que se van a anotar.
const ajuste = opcionesDeRacion(582, 540);
igual(ajuste.tipo === "ajustar" ? ajuste.kcal : null, 540, "el ajuste se clava en lo que queda");
igual(
  ajuste.tipo === "ajustar" ? Math.round(ajuste.factor * 1000) / 1000 : null,
  0.928,
  "el factor del ajuste es lo que queda entre el plato",
);
const media = opcionesDeRacion(582, 120);
igual(media.tipo === "media-racion" ? media.kcal : null, 291, "la media ración son las kcal de la mitad");
igual(media.tipo === "media-racion" ? media.factor : null, 0.5, "la media ración es medio plato");
// Cuando ni la mitad cabe, la pantalla no puede pintar el botón en verde:
// quien lo pulse se pasaría igualmente. `cabe` lo dice sin mirar la UI.
igual(
  media.tipo === "media-racion" ? media.cabe : null,
  false,
  "con 120 libres, media ración de 291 no cabe",
);
const mediaJusta = opcionesDeRacion(582, 290);
igual(
  mediaJusta.tipo === "media-racion" ? mediaJusta.cabe : null,
  true,
  "con 290 libres, media ración de 291 entra en la tolerancia",
);
const ajusteCabe = opcionesDeRacion(582, 540);
igual(
  ajusteCabe.tipo === "ajustar" ? ajusteCabe.cabe : null,
  true,
  "el ajuste siempre cabe: se recorta justo a lo que queda",
);

console.log(`\n${hechas} comprobaciones de la ración, ${fallos} fallos.`);
if (fallos > 0) process.exit(1);
