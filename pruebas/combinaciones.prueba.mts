/**
 * Pruebas del motor de combinaciones. Se ejecutan con:
 *   node pruebas/combinaciones.prueba.mts
 *
 * Lo que se comprueba es lo que pidió Isaac: que haya muchísimos platos
 * distintos sin preguntarle nada, pero que ninguno sea un invento raro (una
 * merluza con pasta, un huevo con yogur). También que las cuentas cuadren y
 * que el plan semanal use de verdad las combinaciones.
 */

import { PIEZAS_POR_ID, generarCombinaciones } from "../lib/combinaciones.ts";
import { PLATOS, generarSemana, normalizar } from "../lib/platos.ts";
import { recetaDePlato } from "../lib/recetas.ts";

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

const combinaciones = generarCombinaciones();
const comidas = combinaciones.filter((c) => c.momento === "comida");
const cenas = combinaciones.filter((c) => c.momento === "cena");
const unicos = (lista: { nombre: string }[]) => new Set(lista.map((p) => p.nombre)).size;

// --- Cobertura -------------------------------------------------------------
igual(unicos(combinaciones) > 1000, true, "hay más de 1000 platos combinados distintos");
igual(comidas.length >= 300, true, "hay al menos 300 combinaciones para comer");
igual(cenas.length >= 300, true, "hay al menos 300 combinaciones para cenar");
igual(unicos(comidas), comidas.length, "no hay dos comidas con el mismo nombre");
igual(unicos(cenas), cenas.length, "no hay dos cenas con el mismo nombre");

// --- Piezas: una de cada, y en su sitio ------------------------------------
const CATEGORIAS_ESPERADAS = "acompanamiento,alino,proteina,verdura";
const categoriasDe = (piezas: string[] | undefined) =>
  (piezas ?? [])
    .map((id) => PIEZAS_POR_ID.get(id)?.categoria ?? "desconocida")
    .sort()
    .join(",");

igual(
  combinaciones.every((c) => categoriasDe(c.piezas) === CATEGORIAS_ESPERADAS),
  true,
  "cada combinación lleva proteína, acompañamiento, verdura y aliño (una de cada)",
);

// --- Pares vetados: las listas blancas se respetan -------------------------
const pares = new Set(combinaciones.map((c) => `${c.piezas?.[0]}+${c.piezas?.[1]}`));
igual(pares.has("merluza+pasta"), false, "la merluza no sale con pasta");
igual(pares.has("salmon+mostaza"), false, "el salmón no sale con mostaza");
igual(pares.has("huevo+yogur"), false, "el huevo no sale con salsa de yogur");
igual(pares.has("sardinas+quinoa"), false, "las sardinas no salen con quinoa");
igual(pares.has("ternera+yogur"), false, "la ternera no sale con salsa de yogur");
igual(pares.has("pollo+boniato"), true, "el pollo sí sale con boniato");

// --- Cuentas ---------------------------------------------------------------
igual(
  combinaciones.every((c) => Math.abs(c.kcal - (4 * c.proteinas + 4 * c.carbohidratos + 9 * c.grasas)) <= 1),
  true,
  "las kcal de cada combinación cuadran con sus macros",
);
igual(
  combinaciones.every((c) => c.ingredientes.length >= 3 && c.pasos.length === 4),
  true,
  "cada combinación lleva sus ingredientes y sus cuatro pasos",
);
igual(
  combinaciones.every((c) => c.nombre.length > 20 && c.nombre.includes(" con ")),
  true,
  "el nombre dice qué lleva el plato",
);

// --- Dieta -----------------------------------------------------------------
const ANIMALES = new Set(["pollo", "pavo", "ternera", "cerdo", "merluza", "salmon", "atun", "gambas", "sardinas", "huevo"]);
const CON_GLUTEN = new Set(["pasta", "couscous", "pan"]);
const veganas = combinaciones.filter((c) => c.etiquetas.includes("vegano"));
const sinGluten = combinaciones.filter((c) => c.etiquetas.includes("sin-gluten"));

igual(
  veganas.every((c) => !(c.piezas ?? []).some((id) => ANIMALES.has(id))),
  true,
  "las combinaciones veganas no llevan nada de origen animal",
);
igual(veganas.length > 100, true, "hay combinaciones veganas de sobra");
igual(
  sinGluten.every((c) => !(c.piezas ?? []).some((id) => CON_GLUTEN.has(id))),
  true,
  "las combinaciones sin gluten no llevan pasta, pan, cuscús ni seitán",
);
igual(sinGluten.length > 100, true, "hay combinaciones sin gluten de sobra");

// --- Nombres estables y sin choques con el catálogo ------------------------
const nombresEscritos = new Set(PLATOS.map((p) => p.nombre));
igual(
  combinaciones.some((c) => nombresEscritos.has(c.nombre)),
  false,
  "ningún combinado se llama igual que un plato escrito",
);
igual(
  combinaciones.every((c) => (c.piezas ?? []).length === 4),
  true,
  "todas las combinaciones guardan sus piezas (para poder recomponer la receta)",
);

// --- El plan semanal usa el motor -----------------------------------------
const lunes = new Date("2026-10-19T12:00:00");
const semana = generarSemana([], {}, 0, undefined, lunes);
const principales = semana
  .flatMap((d) => [d.comidas.comida, d.comidas.cena])
  .filter((p): p is NonNullable<typeof p> => p !== null);

igual(
  principales.filter((p) => (p.piezas ?? []).length === 4).length >= 10,
  true,
  "comidas y cenas de la semana salen del motor de combinaciones",
);
igual(
  new Set(semana.map((d) => d.comidas.comida?.nombre)).size,
  7,
  "los siete días de comida son platos distintos",
);
igual(
  semana.every((d) => Object.values(d.comidas).every((p) => p !== null)),
  true,
  "la semana sigue teniendo los cuatro huecos llenos",
);

const sinSalmon = generarSemana(["Salmón"], {}, 0, undefined, lunes);
igual(
  sinSalmon.every((d) =>
    Object.values(d.comidas).every(
      (p) => !p?.ingredientes.some((i) => normalizar(i.nombre) === "salmon"),
    ),
  ),
  true,
  "excluir el salmón quita también las combinaciones que lo llevan",
);

const vegetariana = generarSemana([], {}, 0, undefined, lunes, "vegetariano");
igual(
  vegetariana.every((d) =>
    Object.values(d.comidas).every((p) => p === null || p.etiquetas.includes("vegetariano")),
  ),
  true,
  "con dieta vegetariana, todo lo que sale es vegetariano",
);

// --- Receta por piezas -----------------------------------------------------
const receta = recetaDePlato(combinaciones[0]);
igual(receta !== null, true, "una combinación tiene receta montada por piezas");
igual(receta?.pasos.length, 4, "la receta de la combinación trae los cuatro pasos");
igual((receta?.tiempoMin ?? 0) >= 5, true, "la receta dice cuánto tarda");
igual((receta?.utensilios.length ?? 0) >= 2, true, "la receta dice qué cacharros hacen falta");
igual(
  recetaDePlato(PLATOS[0])?.pasos.length,
  4,
  "un plato con receta escrita a mano sigue usando la suya",
);

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
