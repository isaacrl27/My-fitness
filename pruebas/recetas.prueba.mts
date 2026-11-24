/**
 * Pruebas de las recetas detalladas.
 * Se ejecutan con: `node pruebas/recetas.prueba.mts`
 *
 * Las recetas son contenido, pero sus reglas no se pueden mover: cada receta
 * tiene que apuntar a un plato de verdad (por el nombre exacto), y estar
 * completa (pasos con título y texto, preparación previa y truco). Si un
 * nombre se escribe distinto en un sitio y en otro, esto lo caza.
 */

import { PLATOS } from "../lib/platos.ts";
import { RECETAS, recetaDe } from "../lib/recetas.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`);
  }
}

const nombresDePlato = new Set(PLATOS.map((p) => p.nombre));
const nombresDeReceta = Object.keys(RECETAS);

/* Ninguna receta huérfana: cada nombre tiene que ser un plato de verdad. */
igual(
  nombresDeReceta.filter((n) => !nombresDePlato.has(n)),
  [],
  "todas las recetas corresponden a un plato que existe",
);

/* Sin repetir el mismo nombre de plato en el registro (no puede pasar en un
   objeto, pero sí un plato con dos recetas mezcladas por un copy-paste). */
igual(
  nombresDeReceta.length,
  new Set(nombresDeReceta).size,
  "no hay recetas duplicadas",
);

/* Cada receta, completa y con textos de verdad. */
const incompletas = nombresDeReceta.filter((n) => {
  const r = RECETAS[n];
  if (!r) return true;
  if (!(r.tiempoMin >= 1)) return true;
  if (!["muy fácil", "fácil", "media"].includes(r.dificultad)) return true;
  if (r.utensilios.length < 1 || r.utensilios.some((u) => !u.trim())) return true;
  if (!r.antes.trim() || !r.truco.trim()) return true;
  if (r.pasos.length < 3) return true;
  return r.pasos.some((p) => !p.titulo.trim() || p.texto.trim().length < 30);
});
igual(incompletas, [], "todas las recetas están completas (pasos, antes y truco)");

/* Los pasos llevan números de verdad: un paso de receta sin decir el tiempo o
   la señal del punto no sirve «para tontos». Se comprueba que el texto de al
   menos un paso (o el truco) mencione minutos o una señal observable. */
const sinSenas = nombresDeReceta.filter((n) => {
  const r = RECETAS[n];
  const texto = [...r.pasos.map((p) => p.texto), r.truco].join(" ");
  return !/(\d+\s*(min|minuto|segundo|hora))|(pizca|chorrito|dedo|manch|color|pincha|tiembla|burbuja|vapor|hilo)/i.test(
    texto,
  );
});
igual(sinSenas, [], "cada receta dice tiempos o señales para saber el punto");

/* recetaDe(): la del plato pedido, o nada si no existe. */
const primera = nombresDeReceta[0];
igual(recetaDe(primera)?.tiempoMin, RECETAS[primera].tiempoMin, "recetaDe devuelve la receta del plato");
igual(recetaDe("Un plato que no existe"), null, "recetaDe de un plato sin receta escribe null");

/* Y una foto del avance: cuántos platos del catálogo ya tienen receta. */
const conReceta = PLATOS.filter((p) => recetaDe(p.nombre)).length;
console.log(
  `\nRecetas: ${nombresDeReceta.length} escritas, ${conReceta} de ${PLATOS.length} platos cubiertos.`,
);

console.log(
  fallos === 0
    ? `\nOK: ${hechas} comprobaciones de recetas.`
    : `\n${fallos} fallos de ${hechas}.`,
);
process.exit(fallos === 0 ? 0 : 1);
