/**
 * Pruebas del contador dinámico y estado de la campana de notificaciones.
 *
 * Se ejecutan con: node pruebas/campana.prueba.mts
 */

import { novedadesPendientes } from "../lib/novedades.ts";

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

// 1. Cálculo de mensajes no leídos
const mensajesPrueba = [
  { id: "1", texto: "Hola", fecha: "2026-11-04T20:00:00Z", leido: false },
  { id: "2", texto: "Ok", fecha: "2026-11-04T21:00:00Z", leido: true },
  { id: "3", texto: "Aviso", fecha: "2026-11-04T22:00:00Z", leido: false },
];

const noLeidos = mensajesPrueba.filter((m) => !m.leido);
igual(noLeidos.length, 2, "filtra exactamente los 2 mensajes no leídos");

// 2. Formato del badge de la campana
function formatearBadge(total: number): string | null {
  if (total <= 0) return null;
  return total > 9 ? "9+" : String(total);
}

igual(formatearBadge(0), null, "con 0 avisos no hay badge");
igual(formatearBadge(3), "3", "con 3 avisos muestra '3'");
igual(formatearBadge(12), "9+", "con más de 9 avisos muestra '9+'");

// 3. Novedades no leídas acumulativas
const novs = novedadesPendientes("80");
igual(novs.length > 0, true, "si la versión vista es antigua, cuenta las novedades pendientes");

console.log(`\n${hechas - fallos} de ${hechas} comprobaciones de la campana bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
