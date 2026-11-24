/**
 * Pruebas de la ventana de novedades y del versionado semántico (SemVer X.Y.Z).
 *
 * Se ejecutan con:  node pruebas/novedades.prueba.mts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NOVEDADES, VERSION, hayQueEnsenar, novedadesPendientes } from "../lib/novedades.ts";
import {
  VERSION_APP,
  VERSION_ETIQUETA,
  VERSION_MAYOR,
  VERSION_MENOR,
  VERSION_NUMERO,
  VERSION_PARCHE,
  formatearSemVer,
} from "../lib/version.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8"),
) as { version: string };

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

igual(hayQueEnsenar(null), true, "la primera vez se enseña");
igual(hayQueEnsenar(""), true, "sin marca se enseña");
igual(hayQueEnsenar(String(VERSION)), false, "ya vista esta versión, no se enseña");
igual(hayQueEnsenar(String(VERSION - 1)), true, "si la marca es de antes, se enseña lo nuevo");
igual(hayQueEnsenar(String(VERSION + 1)), false, "una marca más nueva no se pisa");
igual(hayQueEnsenar("basura"), true, "una marca rota se toma como no vista");
igual(hayQueEnsenar(` ${VERSION} `), false, "los espacios de fuera no estorban");

igual(VERSION > 0, true, "el contador interno de novedades empieza en uno o más");
igual(NOVEDADES.length > 0, true, "hay algo que contar");
igual(
  NOVEDADES.every((n) => n.titulo.trim().length > 0),
  true,
  "cada novedad tiene su frase",
);
igual(
  NOVEDADES.every((n) => (n.detalle ?? "").length < 140),
  true,
  "los detalles son cortos: se leen en el móvil",
);

// Filtrado incremental de novedades por usuario
igual(novedadesPendientes(String(VERSION)).length, 0, "si ya vio la versión actual, no hay pendientes");
igual(novedadesPendientes(String(VERSION - 1)).length, 1, "si vio la anterior, solo ve la última novedad");
igual(novedadesPendientes(String(VERSION - 1))[0].version, VERSION, "la novedad pendiente es exactamente la de esta versión");
igual(novedadesPendientes(String(VERSION - 2)).length, 2, "si vio hace 2 versiones, ve exactamente las 2 que le faltan");
igual(novedadesPendientes(null).length > 0, true, "un usuario nuevo ve las novedades recientes sin agobios");

// Versionado SemVer real de 3 cifras (X.Y.Z, nunca 'v61' ni '0.61')
igual(/^\d+\.\d+\.\d+$/.test(VERSION_APP), true, "VERSION_APP sigue formato SemVer estricto X.Y.Z");
igual(VERSION_APP.startsWith("v"), false, "VERSION_APP nunca lleva prefijo 'v'");
igual(VERSION_APP, `${VERSION_MAYOR}.${VERSION_MENOR}.${VERSION_PARCHE}`, "VERSION_APP coincide con mayor.menor.parche");
igual(VERSION_NUMERO, VERSION_APP, "VERSION_NUMERO coincide con VERSION_APP");
igual(VERSION_ETIQUETA, `Versión ${VERSION_APP}`, "VERSION_ETIQUETA usa 'Versión X.Y.Z'");
igual(pkg.version, VERSION_APP, "package.json está sincronizado con lib/version.ts");
igual(formatearSemVer(0, 1, 0), "0.1.0", "cambio gordo reinicia parche a 0 (0.1.0)");
igual(formatearSemVer(0, 0, 62), "0.0.62", "cambio ligero avanza parche (0.0.62)");

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
