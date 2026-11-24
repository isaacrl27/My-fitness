/**
 * Pruebas del sistema reactivo de reacciones con emojis flotantes.
 *
 * Se ejecutan con: node pruebas/reacciones.prueba.mts
 */

import { lanzarReaccion, suscribirReacciones, type ParticulaReaccion } from "../lib/reacciones.ts";

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

// 1. Suscripción y emisión básica
let recibidas: ParticulaReaccion[] = [];
const cancelar = suscribirReacciones((particulas) => {
  recibidas = particulas;
});

lanzarReaccion("🔥", { x: 150, y: 300 }, 5);

igual(recibidas.length, 5, "se emiten exactamente 5 partículas de reacción");
igual(recibidas.every((p) => p.emoji === "🔥"), true, "todas las partículas llevan el emoji correcto");
igual(recibidas.every((p) => Math.abs(p.x - 150) <= 20), true, "las coordenadas X parten cerca del punto de origen");
igual(recibidas.every((p) => Math.abs(p.y - 300) <= 15), true, "las coordenadas Y parten cerca del punto de origen");
igual(recibidas.every((p) => p.duracionMs >= 1000 && p.duracionMs <= 2000), true, "duración en rango suave");
igual(recibidas.every((p) => p.escala >= 0.8 && p.escala <= 1.5), true, "escala en rango orgánico");

// Salida escalonada
const retrasos = recibidas.map((p) => p.retrasoMs);
igual(retrasos[0] < retrasos[retrasos.length - 1], true, "las partículas tienen salida escalonada en el tiempo");

// 2. Cancelar suscripción
cancelar();
recibidas = [];
lanzarReaccion("💧", { x: 100, y: 200 }, 4);
igual(recibidas.length, 0, "al cancelar la suscripción no se reciben más partículas");

// 3. Origen sin coordenadas (fallback seguro)
let recibidasFallback: ParticulaReaccion[] = [];
const cancelar2 = suscribirReacciones((particulas) => {
  recibidasFallback = particulas;
});
lanzarReaccion("⭐", undefined, 3);
igual(recibidasFallback.length, 3, "emisión con fallback funciona sin romper");
cancelar2();

console.log(`\n${hechas - fallos} de ${hechas} comprobaciones de reacciones bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
