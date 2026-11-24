/**
 * Pruebas de la regla del nombre. Se ejecutan con:
 *   node pruebas/nombre.prueba.mts
 *
 * El nombre va a la nube y sale en el aviso del buzón («Problema de …»), así
 * que la regla tiene que ser la misma en el cuestionario y en Ajustes: letras
 * (con tildes y ñ), espacios y guiones, y como mucho 20.
 */

import { NOMBRE_MAX, nombreLimpio, revisarNombre } from "../lib/nombre.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${b}\n  obtenido: ${a}`);
  }
}

function cierto(valor: unknown, que: string) {
  igual(Boolean(valor), true, que);
}

function falso(valor: unknown, que: string) {
  igual(Boolean(valor), false, que);
}

/** Un nombre que vale, y con qué queda escrito. */
function vale(texto: string, esperado: string, que: string) {
  const r = revisarNombre(texto);
  igual(r.ok ? r.nombre : "NO VALE", esperado, que);
}

/** Un nombre que no vale, y que el motivo se entienda. */
function noVale(texto: string, palabraDelMotivo: string, que: string) {
  const r = revisarNombre(texto);
  falso(r.ok, que);
  if (!r.ok) cierto(r.motivo.includes(palabraDelMotivo), `${que} (el motivo lo explica)`);
}

/* ------------------------------------------------------------------ */
/* Nombres que sí                                                     */
/* ------------------------------------------------------------------ */

vale("María José", "María José", "un nombre con tilde y dos palabras");
vale("Ana-Sofía", "Ana-Sofía", "un nombre con guion");
vale("Iñaki", "Iñaki", "la ñ se admite");
vale("ÉNGEL", "ÉNGEL", "las mayúsculas con tilde también");
vale("  Ana   Sofía  ", "Ana Sofía", "se quitan los espacios de sobra");
vale("A", "A", "una sola letra vale");
vale("Lucía del Río", "Lucía del Río", "partículas como «del»");
vale("Ng", "Ng", "nombres cortos de otras letras");

/* ------------------------------------------------------------------ */
/* Nombres que no                                                     */
/* ------------------------------------------------------------------ */

noVale("", "Escribe", "vacío no vale");
noVale("   ", "Escribe", "solo espacios no vale");
noVale("Isaac82", "letras", "los números no valen");
noVale("Ana!", "letras", "los símbolos no valen");
noVale("Ana_Belén", "letras", "el guion bajo no vale");
noVale("Ana.", "letras", "el punto no vale");
noVale("Ana-", "letras", "el guion al final no vale");
noVale("-Ana", "letras", "el guion al principio no vale");

/* Los espacios de más no son un error: se limpian solos. */
vale("Ana  Sofía", "Ana Sofía", "los espacios de más se arreglan solos");

/* ------------------------------------------------------------------ */
/* El tope                                                            */
/* ------------------------------------------------------------------ */

igual(NOMBRE_MAX, 20, "el tope son 20 letras");
vale("a".repeat(20), "a".repeat(20), "justo 20 cabe");
noVale("a".repeat(21), "20", "21 ya no cabe");
vale("María José Fernández", "María José Fernández", "20 letras con tildes caben justo");

/* Un nombre de verdad, con sus partículas, cabe. */
vale("Ana de la Fuente", "Ana de la Fuente", "un nombre con partículas cabe");

/* ------------------------------------------------------------------ */
/* La limpieza para la caja                                           */
/* ------------------------------------------------------------------ */

igual(nombreLimpio("  Ana  "), "Ana", "quita los extremos");
igual(nombreLimpio("Ana   María"), "Ana María", "junta los espacios");
igual(nombreLimpio(""), "", "vacío se queda vacío");

console.log(`\n${hechas - fallos}/${hechas} comprobaciones bien.`);
if (fallos > 0) process.exit(1);
