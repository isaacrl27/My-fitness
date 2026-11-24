/**
 * Pruebas de la lógica pura del contador rodante (descomponerNumero).
 *
 * Se ejecutan con: node pruebas/contador.prueba.mts
 */

import { descomponerNumero } from "../lib/contador.ts";
import { conComaSinCeros } from "../lib/calculos.ts";

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

// 1. Número entero simple
const r1 = descomponerNumero(450);
igual(r1.elementos.length, 3, "450 tiene 3 elementos");
igual(r1.elementos.every((e) => e.tipo === "digito"), true, "todos son dígitos");
igual(r1.elementos.map((e) => (e.tipo === "digito" ? e.valor : null)), [4, 5, 0], "valores 4, 5, 0");

// 2. Número con formateador personalizado (agua conComaSinCeros)
const r2 = descomponerNumero(1.25, conComaSinCeros);
igual(r2.texto, "1,25", "texto formateado es 1,25");
igual(r2.elementos[0], { clave: "ent-0", tipo: "digito", valor: 1, retrasoMs: 0 }, "primer dígito es 1 con clave ent-0");
igual(r2.elementos[1], { clave: "sym-coma", tipo: "simbolo", caracter: "," }, "segundo elemento es la coma con clave sym-coma");
igual(r2.elementos[2], { clave: "dec-0", tipo: "digito", valor: 2, retrasoMs: 50 }, "tercer dígito es 2 con retraso escalonado");
igual(r2.elementos[3], { clave: "dec-1", tipo: "digito", valor: 5, retrasoMs: 75 }, "cuarto dígito es 5 con retraso escalonado");

// 3. Número negativo (calorías de más)
const r3 = descomponerNumero(-150);
igual(r3.elementos[0], { clave: "sym-ent-0", tipo: "simbolo", caracter: "-" }, "primer elemento es el signo menos");
igual(r3.elementos[1].tipo, "digito", "segundo elemento es dígito");

// 4. Cero y valores no finitos
const r0 = descomponerNumero(0);
igual(r0.elementos, [{ clave: "ent-0", tipo: "digito", valor: 0, retrasoMs: 0 }], "cero devuelve un único dígito 0");

const rNaN = descomponerNumero(NaN);
igual(rNaN.elementos, [{ clave: "ent-0", tipo: "digito", valor: 0, retrasoMs: 0 }], "NaN se degrada con seguridad a 0");

console.log(`\n${hechas - fallos} de ${hechas} comprobaciones del contador bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
