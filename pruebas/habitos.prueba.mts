/**
 * Pruebas del catálogo de hábitos. Se ejecutan con:  node pruebas/habitos.prueba.mts
 *
 * El catálogo es el contrato entre Ajustes (de dónde se elige), Hoy (qué se
 * marca) y los avisos de las 21:30 (qué falta). Si esto se rompe, o alguien
 * activa algo que no existe, o el aviso enseña un nombre raro.
 */

import {
  CATALOGO_HABITOS,
  HABITOS_INICIALES,
  crearHabitoPropio,
  esHabito,
  esHabitoValido,
  etiquetaDe,
  faltanHabitos,
  momentoDeAviso,
  type HabitoPropio,
} from "../lib/habitos.ts";

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

// --- El catálogo ---------------------------------------------------------
igual(CATALOGO_HABITOS.length, 25, "el catálogo tiene 25 hábitos");
igual(
  new Set(CATALOGO_HABITOS.map((h) => h.id)).size,
  CATALOGO_HABITOS.length,
  "ningún id se repite",
);
igual(
  new Set(CATALOGO_HABITOS.map((h) => h.etiqueta)).size,
  CATALOGO_HABITOS.length,
  "ninguna etiqueta se repite",
);
igual(
  CATALOGO_HABITOS.every((h) => h.etiqueta.trim() !== "" && h.ayuda.trim() !== ""),
  true,
  "todos llevan etiqueta y ayuda",
);
igual(
  HABITOS_INICIALES.every((id) => CATALOGO_HABITOS.some((h) => h.id === id)),
  true,
  "los cinco de fábrica están todos en el catálogo",
);
igual(HABITOS_INICIALES.length, 5, "de fábrica salen los cinco que nombró Isaac");

// --- Filtros -------------------------------------------------------------
igual(esHabito("leer"), true, "un hábito del catálogo pasa el filtro");
igual(esHabito("no-existe"), false, "un id inventado no pasa");
igual(esHabito(7), false, "un número no pasa");
igual(esHabito(undefined), false, "vacío no pasa");

// --- Etiquetas -----------------------------------------------------------
igual(etiquetaDe("leer"), "Leer", "el id conocido sale con su etiqueta");
igual(etiquetaDe("fantasma"), "fantasma", "el id desconocido sale tal cual, sin romper nada");

// --- Lo que falta por marcar ---------------------------------------------
igual(
  faltanHabitos(["leer", "dormir", "sol"], ["sol"]),
  ["leer", "dormir"],
  "lo marcado desaparece y el orden es el del catálogo",
);
igual(
  faltanHabitos(["dormir", "leer"], undefined),
  ["leer", "dormir"],
  "sin registro de marcas, faltan todos los activos",
);
igual(faltanHabitos(["leer"], ["leer"]), [], "todo marcado no falta nada");
igual(
  faltanHabitos([], ["leer"]),
  [],
  "sin hábitos activos no falta nada (aunque haya marcas viejas)",
);
igual(
  faltanHabitos(["leer", "id-raro"], []),
  ["leer"],
  "un activo que no esté en el catálogo se ignora",
);

// --- Los hábitos propios -------------------------------------------------

const beber = crearHabitoPropio("Beber 2 litros");
igual(beber.ok, true, "se puede crear un hábito propio");
const propios: HabitoPropio[] = beber.ok ? [beber.habito] : [];
igual(propios[0].id, "propio:beber-2-litros", "el id sale del nombre, estable");
igual(propios[0].etiqueta, "Beber 2 litros", "la etiqueta es la que escribió");

igual(
  crearHabitoPropio("leer").ok,
  false,
  "no deja repetir uno del catálogo (aunque se escriba en minúsculas)",
);
igual(
  crearHabitoPropio("BEBER 2 LITROS", propios).ok,
  false,
  "no deja repetir uno suyo",
);
igual(crearHabitoPropio("A").ok, false, "una sola letra no vale");
igual(crearHabitoPropio("   ").ok, false, "vacío no vale");
igual(crearHabitoPropio("x".repeat(31)).ok, false, "más de 30 no vale");
igual(
  crearHabitoPropio("Leer un rato").ok,
  true,
  "un nombre que se parece a otro del catálogo sí vale",
);

const sacar = crearHabitoPropio("Sacar al perro", propios);
igual(sacar.ok, true, "un segundo hábito propio también entra");
igual(
  sacar.ok && sacar.habito.id,
  "propio:sacar-al-perro",
  "su id no pisa al primero",
);

igual(etiquetaDe("propio:beber-2-litros", propios), "Beber 2 litros", "su etiqueta se lee");
igual(etiquetaDe("propio:no-existe", propios), "propio:no-existe", "uno suyo borrado no rompe");

igual(esHabitoValido("propio:beber-2-litros", propios), true, "un id propio vale");
igual(esHabitoValido("propio:no-existe", propios), false, "uno propio inventado no vale");
igual(esHabitoValido("leer", propios), true, "los del catálogo siguen valiendo");
igual(esHabitoValido(7, propios), false, "un número no vale");

igual(momentoDeAviso("propio:beber-2-litros", propios), "cena", "los propios van al aviso de la cena");
igual(momentoDeAviso("leer", propios), "cena", "los del catálogo conservan su franja");
igual(momentoDeAviso("correr", propios), "andar", "y el de correr es el de andar");

igual(
  faltanHabitos(["leer", "propio:beber-2-litros"], ["leer"], propios),
  ["propio:beber-2-litros"],
  "los propios también cuentan como pendientes",
);
igual(
  faltanHabitos(["propio:sacar-al-perro"], ["propio:sacar-al-perro"], propios),
  [],
  "marcar uno propio lo quita de pendientes",
);

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
