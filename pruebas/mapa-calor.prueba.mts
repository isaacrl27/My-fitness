/**
 * Pruebas de la lógica del mapa de calor de actividad estilo GitHub.
 *
 * Se ejecutan con: node pruebas/mapa-calor.prueba.mts
 */

import { generarMapaCalor, type DatosMapaCalor } from "../lib/mapa-calor.ts";

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

const hoyTest = "2026-11-04";

const datos: DatosMapaCalor = {
  comidas: [
    { fecha: "2026-11-04T14:00:00" },
    { fecha: "2026-11-04T21:00:00" },
    { fecha: "2026-11-03T14:00:00" },
    { fecha: "2026-11-02T13:00:00" },
  ],
  pesadas: [
    { fecha: "2026-11-04", kg: 76.4 },
    { fecha: "2026-11-01", kg: 76.8 },
  ],
  aguaLitros: {
    "2026-11-04": 2.0,
    "2026-11-03": 1.5,
  },
  habitosHechos: {
    "2026-11-04": ["sol", "leer", "dormir"],
  },
};

const mapa = generarMapaCalor(datos, hoyTest, 12);

// 1. Estructura de columnas y semanas
igual(mapa.columnas.length, 12, "genera exactamente 12 semanas");
igual(mapa.columnas.every((sem) => sem.length === 7), true, "cada semana contiene 7 días (Lunes a Domingo)");
igual(mapa.columnas[0][0].diaSemana, 0, "el primer día de cada semana es Lunes (0)");
igual(mapa.columnas[0][6].diaSemana, 6, "el último día de cada semana es Domingo (6)");

// 2. Detección de hoy y actividades
let diaHoy = null;
for (const col of mapa.columnas) {
  for (const d of col) {
    if (d.esHoy) diaHoy = d;
  }
}

igual(diaHoy !== null, true, "encuentra el día de hoy");
igual(diaHoy?.fechaISO, hoyTest, "la fecha de hoy coincide");
igual(diaHoy?.nivel, 4, "hoy tiene 4 actividades (comida, peso, agua y hábitos) -> nivel 4");
igual(diaHoy?.detalles.length, 4, "tiene 4 detalles explicativos");

// 3. Días pasados con actividad parcial
let diaAyer = null;
for (const col of mapa.columnas) {
  for (const d of col) {
    if (d.fechaISO === "2026-11-03") diaAyer = d;
  }
}
igual(diaAyer?.nivel, 2, "ayer tiene 2 actividades (comida y agua) -> nivel 2");

// 4. Racha y días activos
igual(mapa.diasActivos > 0, true, "contabiliza días activos correctamente");
igual(mapa.racha >= 1, true, "la racha está activa");

console.log(`\n${hechas - fallos} de ${hechas} comprobaciones del mapa de calor bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
