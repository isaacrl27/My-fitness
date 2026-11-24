/**
 * Pruebas de los puntos. Se ejecutan con:  node pruebas/puntos.prueba.mts
 * Comprueban los puntos del día a día y el saldo del capricho con números
 * hechos a mano, para que un cambio no rompa la moneda sin que nos enteremos.
 */

import {
  COSTE_CAPRICHO,
  TOPE_PUNTOS,
  esDiaARajatabla,
  kcalObjetivoDelDia,
  puntosDelDia,
  saldoPuntos,
  type DatosPuntos,
  type ObjetivosPuntos,
} from "../lib/puntos.ts";
import { fusionarSalud } from "../lib/nube-mapeo.ts";

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

// Un día sin nada hecho, con los objetivos de siempre.
const diaLimpio = {
  kcalComidas: 0,
  kcalObjetivo: 2000,
  proteinasComidas: 0,
  proteinasObjetivo: 120,
  aguaL: 0,
  metaAguaL: 2,
  sePeso: false,
  esCapricho: false,
};

// --- Día perfecto -----------------------------------------------------
const perfecto = puntosDelDia({
  ...diaLimpio,
  kcalComidas: 2000,
  proteinasComidas: 130,
  aguaL: 2,
  sePeso: true,
  habitosHechos: 5,
  habitosActivos: 5,
});
igual(perfecto.total, 125, "un día perfecto vale 125 puntos");
igual(
  perfecto.desglose,
  { comida: 40, proteina: 25, agua: 20, pesada: 15, habitos: 25, pasos: 0, sueno: 0 },
  "el desglose del día perfecto es 40+25+20+15+25",
);

// --- Día a rajatabla --------------------------------------------------
igual(
  esDiaARajatabla({
    ...diaLimpio,
    kcalComidas: 2000,
    aguaL: 2,
    habitosHechos: 4,
    habitosActivos: 4,
  }),
  true,
  "día a rajatabla cuando cuadra comida, agua y hábitos",
);
igual(
  esDiaARajatabla({
    ...diaLimpio,
    kcalComidas: 2000,
    aguaL: 1.5,
    habitosHechos: 4,
    habitosActivos: 4,
  }),
  false,
  "no es a rajatabla si falta agua",
);
igual(
  esDiaARajatabla({
    ...diaLimpio,
    kcalComidas: 100,
    aguaL: 2,
    habitosHechos: 4,
    habitosActivos: 4,
  }),
  false,
  "no es a rajatabla si falta comida",
);

// --- Anti-trampa de la comida ------------------------------------------
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 100 }).total, 0, "una manzana y nada más no da ningún punto");
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 3000 }).desglose.comida, 0, "150 % del objetivo sin capricho no da comida");
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 1699 }).desglose.comida, 0, "por debajo del 85 % no da nada");
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 1700 }).desglose.comida, 40, "justo el 85 % del objetivo ya da la comida");
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 2200 }).desglose.comida, 40, "justo el 110 % sigue dando la comida");
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 2201 }).desglose.comida, 0, "pasarse un pelo del 110 % ya no da nada");
igual(
  puntosDelDia({ ...diaLimpio, kcalComidas: 2000, kcalObjetivo: 0 }).desglose.comida,
  0,
  "sin objetivo de kcal no se gana comida",
);
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 4000, esCapricho: true }).desglose.comida, 0, "con capricho, pasarse del tope con margen (4000 > 2860) ya no da comida");
// El capricho regala margen, no es un día libre sin anotar: el rango sigue
// exigiendo tocar el 85 % del objetivo base y no pasarse del tope con margen.
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 0, esCapricho: true }).desglose.comida, 0, "un capricho sin nada anotado no da 40 de comida: hay que apuntar lo mínimo");
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 2500, esCapricho: true }).desglose.comida, 40, "con capricho, 2500 kcal sí dan la comida (dentro del 85 % del base y del tope con margen)");
igual(puntosDelDia({ ...diaLimpio, kcalComidas: 2861, esCapricho: true }).desglose.comida, 0, "pasarse un pelo del tope con margen (2860) ya no da nada");

// --- Proteína y agua ----------------------------------------------------
igual(puntosDelDia({ ...diaLimpio, proteinasComidas: 130 }).desglose.proteina, 25, "pasar de la proteína da 25 puntos");
igual(puntosDelDia({ ...diaLimpio, proteinasComidas: 103 }).desglose.proteina, 25, "ligeramente por encima del 85 % ya vale");
igual(puntosDelDia({ ...diaLimpio, proteinasComidas: 101 }).desglose.proteina, 0, "por debajo del 85 % no vale nada");
igual(puntosDelDia({ ...diaLimpio, proteinasComidas: 120, proteinasObjetivo: 0 }).desglose.proteina, 0, "sin meta de proteína no se gana nada");
igual(puntosDelDia({ ...diaLimpio, aguaL: 2 }).desglose.agua, 20, "llegar a la meta del agua da 20 puntos");
igual(puntosDelDia({ ...diaLimpio, aguaL: 1.9 }).desglose.agua, 0, "corto del agua no da nada");
igual(puntosDelDia({ ...diaLimpio, aguaL: 2, metaAguaL: 0 }).desglose.agua, 0, "sin meta de agua no se gana nada");
igual(puntosDelDia({ ...diaLimpio, sePeso: true }).desglose.pesada, 15, "pesarse da 15 puntos");

// --- Hábitos (aún no existen, pero la cuenta ya está hecha) -------------
const tresDeCinco = puntosDelDia({ ...diaLimpio, habitosHechos: 3, habitosActivos: 5 });
igual(tresDeCinco.desglose.habitos, 15, "3 de 5 hábitos valen 15 puntos");
igual(tresDeCinco.total, 15, "sin nada más, el total son solo los hábitos");
igual(
  puntosDelDia({ ...diaLimpio, habitosHechos: 9, habitosActivos: 5, sePeso: true }).total,
  40,
  "marcar más hábitos de los activos no suma de más (5 de 5 + pesada = 40)",
);
const sinHabitos = puntosDelDia({ ...diaLimpio, habitosHechos: 3, habitosActivos: 0, sePeso: true });
igual(sinHabitos.desglose.habitos, 0, "con 0 hábitos activos no dan nada");
igual(sinHabitos.total, 15, "y no estorban al resto del día");

// --- Pasos y sueño del iPhone -------------------------------------------
igual(puntosDelDia({ ...diaLimpio, pasos: 8000, metaPasos: 7000 }).total, 10, "8000 pasos con meta de 7000 dan 10 puntos");
igual(puntosDelDia({ ...diaLimpio, pasos: 6999, metaPasos: 7000 }).desglose.pasos, 0, "corto de pasos no da nada");
igual(puntosDelDia(diaLimpio).total, 0, "sin datos de pasos ni sueño no dan nada");
igual(puntosDelDia({ ...diaLimpio, suenoHoras: 7 }).total, 10, "dormir 7 horas da 10 puntos");
igual(puntosDelDia({ ...diaLimpio, suenoHoras: 6.5 }).desglose.sueno, 0, "dormir menos de 7 no da nada");

// --- Pasos y sueño, caso a caso (entran cuando el Atajo manda datos) -----
igual(puntosDelDia({ ...diaLimpio, pasos: 9000, metaPasos: 8000 }).total, 10, "9000 pasos con meta de 8000 suman 10 puntos");
igual(puntosDelDia({ ...diaLimpio, pasos: 9000, metaPasos: 8000 }).desglose.pasos, 10, "los pasos cumplidos salen en el desglose");
igual(puntosDelDia({ ...diaLimpio, pasos: 7000, metaPasos: 8000 }).desglose.pasos, 0, "7000 pasos con meta de 8000 no dan nada");
igual(puntosDelDia({ ...diaLimpio, pasos: 9000 }).desglose.pasos, 0, "sin meta puesta en Ajustes, ni con pasos se cobra");
igual(puntosDelDia({ ...diaLimpio, suenoHoras: 7.5 }).total, 10, "dormir 7,5 horas da 10 puntos");
igual(puntosDelDia({ ...diaLimpio, suenoHoras: 6.5 }).total, 0, "dormir 6,5 horas no da nada");

// --- Un día con todo hecho, pasos y sueño incluidos ----------------------
const diaLleno = puntosDelDia({
  ...diaLimpio,
  kcalComidas: 2000,
  proteinasComidas: 130,
  aguaL: 2,
  sePeso: true,
  habitosHechos: 5,
  habitosActivos: 5,
  pasos: 9000,
  metaPasos: 8000,
  suenoHoras: 7.5,
});
igual(diaLleno.total, 145, "comida + proteína + agua + pesada + 5 hábitos + pasos + sueño = 145");

// --- El margen del capricho ---------------------------------------------
igual(kcalObjetivoDelDia(2000, true), 2600, "con capricho el objetivo sube 600 kcal");
igual(kcalObjetivoDelDia(2000, false), 2000, "sin capricho el objetivo no se mueve");
igual(kcalObjetivoDelDia(0, true), 0, "sin objetivo no hay margen que sumar");

// --- El saldo de los días -----------------------------------------------
const objetivos: ObjetivosPuntos = { kcal: 2000, proteinas: 120, aguaL: 2, habitosActivos: 5 };

/** Un tramo de días perfectos seguidos, empezando en `desde`. */
function diasPerfectos(desde: string, cantidad: number): DatosPuntos {
  const comidas: DatosPuntos["comidas"] = [];
  const aguaLitros: Record<string, number> = {};
  const pesadas: DatosPuntos["pesadas"] = [];
  const habitosHechos: Record<string, number> = {};
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(Date.parse(`${desde}T00:00:00Z`) + i * 86400000)
      .toISOString()
      .slice(0, 10);
    comidas.push({ fecha, kcal: 2000, proteinas: 130 });
    aguaLitros[fecha] = 2;
    pesadas.push({ fecha, kg: 80 });
    habitosHechos[fecha] = 5;
  }
  return { comidas, aguaLitros, pesadas, habitosHechos };
}

// 7 días perfectos = 875 puntos: pasa del techo.
const techo = saldoPuntos(diasPerfectos("2026-10-14", 7), objetivos, [], "2026-10-20");
igual(techo.saldo, TOPE_PUNTOS, "siete días perfectos pasan del techo: el saldo se queda en 750");
igual(techo.ganadosHoy, 125, "los puntos de hoy son los brutos del día");
igual(techo.puedeCanjear, true, "con 750 se puede canjear un capricho");

// --- Al canjear, el saldo baja y ya no se puede otra vez -----------------
const conCanje = saldoPuntos(diasPerfectos("2026-10-11", 7), objetivos, ["2026-10-14"], "2026-10-17");
igual(conCanje.saldo, 3 * 125, "el capricho se descuenta el mismo día (la hucha llegaba a 500: 500 - 500 = 0) y los 3 días siguientes la rellenan: 3 × 125 = 375");
igual(conCanje.puedeCanjear, false, "con 375 no se puede canjear otro capricho");
igual(conCanje.ganadosHoy, 125, "el capricho no toca lo ganado hoy");

const hoyCanjeado = saldoPuntos(diasPerfectos("2026-10-13", 7), objetivos, ["2026-10-19"], "2026-10-19");
igual(hoyCanjeado.puedeCanjear, false, "si hoy ya canjeaste, no se puede canjear otro hoy");

// --- El enfriamiento tras canjear ---------------------------------------
const nueve = diasPerfectos("2026-10-12", 9); // del 12 al 20 de octubre
const recien = saldoPuntos(nueve, objetivos, ["2026-10-18"], "2026-10-20");
igual(recien.saldo, 750 - COSTE_CAPRICHO + 125 + 125, "quedan 500 tras el capricho de hace 2 días: la hucha estaba llena (750 - 500) y los dos días siguientes sumaron 125 cada uno");
igual(recien.puedeCanjear, false, "hace 2 días que canjeó: aún está caliente");

const frio = saldoPuntos(nueve, objetivos, ["2026-10-14"], "2026-10-20");
igual(frio.saldo, TOPE_PUNTOS, "el enfriamiento no quita puntos: el capricho del 14 se comió la hucha entera (solo había 375) y desde el 15 se ha vuelto a llenar");
igual(frio.puedeCanjear, true, "hace 6 días que canjeó y hay saldo: ya se puede de nuevo");

const justo = saldoPuntos(nueve, objetivos, ["2026-10-15"], "2026-10-20");
igual(justo.puedeCanjear, true, "exactamente 5 días después ya se puede (la espera es de 5 días)");

// --- El suelo también es día a día ----------------------------------------
const enNegativo = saldoPuntos(diasPerfectos("2026-10-20", 1), objetivos, ["2026-10-14"], "2026-10-20");
igual(
  enNegativo.saldo,
  125,
  "un capricho sin saldo previo no se traga los días siguientes: el suelo aplica ese mismo día (0) y el día perfecto del 20 se queda entero (125)",
);

// --- Los hábitos con catálogo grande se topan en 5 marcas ----------------
igual(
  puntosDelDia({
    kcalComidas: 2000,
    kcalObjetivo: 2000,
    proteinasComidas: 150,
    proteinasObjetivo: 150,
    aguaL: 2,
    metaAguaL: 2,
    sePeso: true,
    esCapricho: false,
    habitosActivos: 25,
    habitosHechos: 25,
  }).desglose.habitos,
  25,
  "por muchos hábitos actives, los puntos de hábitos se quedan en 25 (tope de 5 marcas)",
);

// --- El techo se aplica día a día ----------------------------------------
/** Un tramo de días buenos de 100 puntos (comida + proteína + agua + pesada). */
function diasDeCien(desde: string, cantidad: number): DatosPuntos {
  const comidas: DatosPuntos["comidas"] = [];
  const aguaLitros: Record<string, number> = {};
  const pesadas: DatosPuntos["pesadas"] = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(Date.parse(`${desde}T00:00:00Z`) + i * 86400000)
      .toISOString()
      .slice(0, 10);
    comidas.push({ fecha, kcal: 2000, proteinas: 130 });
    aguaLitros[fecha] = 2;
    pesadas.push({ fecha, kg: 80 });
  }
  return { comidas, aguaLitros, pesadas };
}

const veinte = diasDeCien("2026-10-01", 20); // del 1 al 20 de octubre
igual(
  saldoPuntos(veinte, objetivos, [], "2026-10-20").saldo,
  TOPE_PUNTOS,
  "20 días de 100 sin canjear se quedan en 750: el techo se aplica cada día, no solo al final",
);
igual(
  saldoPuntos(diasDeCien("2026-10-01", 21), objetivos, ["2026-10-20"], "2026-10-21").saldo,
  350,
  "el capricho del día 20 baja la hucha de verdad: el 21 se ve en 350, no en 750 (750 + 100 - 500)",
);

// --- El saldo suma los días del iPhone -----------------------------------
const conSalud: DatosPuntos = {
  comidas: [],
  aguaLitros: {},
  pesadas: [],
  salud: {
    "2026-10-16": { pasos: 9000, suenoHoras: 7.5 },
    "2026-10-17": { pasos: 9000, suenoHoras: 7.5 },
    "2026-10-18": { pasos: 9000, suenoHoras: 7.5 },
    "2026-10-19": { pasos: 9000, suenoHoras: 7.5 },
    "2026-10-20": { pasos: 9000, suenoHoras: 7.5 },
  },
};
igual(
  saldoPuntos(conSalud, { ...objetivos, metaPasos: 8000 }, [], "2026-10-20").saldo,
  100,
  "5 días con pasos y sueño del iPhone suman 20 al día: el saldo los incluye (100)",
);

// --- El lote que trae el lector nativo al abrir la app ----------------------
// Es lo que deja `ponerSaludLote` en el store: la mezcla «mayor por día y
// campo» de `fusionarSalud`, la misma regla que usa la nube.
const saludBaseLote: DatosPuntos["salud"] = {
  "2026-10-18": { pasos: 9000, suenoHoras: 7.5 },
};
const loteLector = {
  "2026-10-18": { pasos: 2000 }, // más bajo que lo anotado: no puede bajarlo
  "2026-10-19": { pasos: 8500, suenoHoras: 6.5 }, // pasos sí; el sueño no llega a 7 h
  "2026-10-20": { pasos: 12000, suenoHoras: 7 }, // los dos
};
igual(
  saldoPuntos(
    { ...conSalud, salud: fusionarSalud(saludBaseLote, loteLector) },
    { ...objetivos, metaPasos: 8000 },
    [],
    "2026-10-20",
  ).saldo,
  50,
  "el lote del lector puntúa como se merece: 18 (20) + 19 (10: el sueño 6,5 no llega) + 20 (20) = 50, y lo bajo del 18 no baja",
);

// --- Coma flotante IEEE-754 en sumas decimales -----------------------------
const proteinaConRuido = 33.1 + 33.2 + 35.7; // 101.99999999999999 en JS, meta 85 % de 120 = 102
const aguaConRuido = 0.7 + 0.7 + 0.6; // 1.9999999999999998 en JS, meta = 2
const diaDecimal = puntosDelDia({
  kcalComidas: 2200,
  kcalObjetivo: 2000,
  proteinasComidas: proteinaConRuido,
  proteinasObjetivo: 120,
  aguaL: aguaConRuido,
  metaAguaL: 2,
  sePeso: false,
  esCapricho: false,
});
igual(
  [diaDecimal.desglose.comida, diaDecimal.desglose.proteina, diaDecimal.desglose.agua],
  [40, 25, 20],
  "el ruido binario de coma flotante no roba los puntos de comida, proteína ni agua al clavar la meta",
);
igual(
  esDiaARajatabla({
    kcalComidas: 2200,
    kcalObjetivo: 2000,
    proteinasComidas: proteinaConRuido,
    proteinasObjetivo: 120,
    aguaL: aguaConRuido,
    metaAguaL: 2,
    sePeso: false,
    esCapricho: false,
    habitosActivos: 2,
    habitosHechos: 2,
  }),
  true,
  "esDiaARajatabla tampoco falla cuando 0,7 + 0,7 + 0,6 da 1,9999999999999998",
);

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
