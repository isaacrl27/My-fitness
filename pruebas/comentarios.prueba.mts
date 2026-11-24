/**
 * Pruebas del buzón de la beta. Se ejecutan con:
 *   node pruebas/comentarios.prueba.mts
 *
 * El buzón guarda los mensajes de la familia dentro del perfil de cada uno
 * (`datos.comentarios`), para no tener que crear una tabla nueva. Lo que se
 * prueba aquí es lo que decide qué se guarda, qué se rechaza y qué se ve como
 * nuevo: si esto se rompe, o se pierden mensajes al subir a la nube, o Isaac
 * ve basura.
 */

import {
  MAX_COMENTARIOS,
  TEXTO_MAXIMO,
  anadirComentario,
  avisoDelBuzon,
  comentariosDe,
  esNuevo,
  limpiarTexto,
  nuevoComentario,
  ordenarDeNuevoAViejo,
  tipoDe,
  type Comentario,
} from "../lib/comentarios.ts";

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

const cuando = new Date("2026-10-21T10:30:00.000Z");

/* ------------------------------------------------------------------ */
/* Tipo                                                                */
/* ------------------------------------------------------------------ */

igual(tipoDe("problema"), "problema", "acepta problema");
igual(tipoDe("mejora"), "mejora", "acepta mejora");
igual(tipoDe(" PROBLEMA "), "problema", "acepta con espacios y mayúsculas");
igual(tipoDe("otra cosa"), null, "rechaza un tipo inventado");
igual(tipoDe(null), null, "rechaza vacío");

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

igual(limpiarTexto("  se   cierra  sola  "), "se cierra sola", "junta espacios y quita los de fuera");
igual(limpiarTexto("linea uno\n\nlinea dos"), "linea uno linea dos", "los saltos se vuelven espacios");
igual(limpiarTexto("x".repeat(TEXTO_MAXIMO + 50)).length, TEXTO_MAXIMO, "corta al máximo");
igual(limpiarTexto(undefined), "", "tolera lo que no es texto");
igual(limpiarTexto(42), "", "tolera números");

/* ------------------------------------------------------------------ */
/* Crear                                                               */
/* ------------------------------------------------------------------ */

const creado = nuevoComentario(
  { tipo: "problema", texto: "  No me   deja apuntar el agua  ", pantalla: "/hoy" },
  cuando,
  "c-1",
);
cierto(creado.ok, "acepta un problema normal");
if (creado.ok) {
  igual(creado.comentario, {
    id: "c-1",
    tipo: "problema",
    texto: "No me deja apuntar el agua",
    pantalla: "/hoy",
    creado: "2026-10-21T10:30:00.000Z",
  }, "normaliza el comentario");
}

const sinPantalla = nuevoComentario({ tipo: "mejora", texto: "Una idea bonita" }, cuando, "c-2");
if (sinPantalla.ok) {
  igual(sinPantalla.comentario.pantalla, "/ajustes", "la pantalla por defecto es Ajustes");
}

const corto = nuevoComentario({ tipo: "problema", texto: "   " }, cuando, "c-3");
falso(corto.ok, "rechaza texto vacío");
if (!corto.ok) igual(corto.motivo, "Cuéntalo con un poco más de detalle.", "explica por qué no vale el vacío");

const tipoRaro = nuevoComentario({ tipo: "queja", texto: "Esto no va" }, cuando, "c-4");
falso(tipoRaro.ok, "rechaza tipo inventado");
if (!tipoRaro.ok) igual(tipoRaro.motivo, "Dinos si es un problema o una idea.", "explica el tipo");

const largo = nuevoComentario(
  { tipo: "mejora", texto: "a".repeat(TEXTO_MAXIMO + 20) },
  cuando,
  "c-5",
);
if (largo.ok) igual(largo.comentario.texto.length, TEXTO_MAXIMO, "guarda como mucho el máximo");

/* ------------------------------------------------------------------ */
/* Añadir al perfil                                                    */
/* ------------------------------------------------------------------ */

const antes = { perfil: { nombre: "Ana" }, usoIAtexto: { usadas: 3 } };
const conUno = anadirComentario(antes, creado.ok ? creado.comentario : ({} as Comentario));
igual((antes as Record<string, unknown>).comentarios, undefined, "no toca el objeto original");
igual(conUno.perfil, antes.perfil, "conserva el resto de datos");
igual(conUno.usoIAtexto, antes.usoIAtexto, "conserva el uso de la IA");
igual((conUno.comentarios as Comentario[]).length, 1, "guarda el primero");

const conDos = anadirComentario(conUno, {
  id: "c-2",
  tipo: "mejora",
  texto: "Otra cosa",
  pantalla: "/hoy",
  creado: "2026-10-21T11:00:00.000Z",
});
igual((conDos.comentarios as Comentario[]).length, 2, "añade al final");

let lleno: Record<string, unknown> = {};
for (let i = 0; i < MAX_COMENTARIOS + 5; i += 1) {
  lleno = anadirComentario(lleno, {
    id: `relleno-${i}`,
    tipo: "mejora",
    texto: `Mensaje ${i}`,
    pantalla: "/ajustes",
    creado: cuando.toISOString(),
  });
}
const guardados = lleno.comentarios as Comentario[];
igual(guardados.length, MAX_COMENTARIOS, "no crece sin freno");
igual(guardados[guardados.length - 1].id, `relleno-${MAX_COMENTARIOS + 4}`, "se queda con los más nuevos");
igual(guardados[0].id, "relleno-5", "tira los más viejos");

/* ------------------------------------------------------------------ */
/* Leer del perfil, aunque venga roto                                  */
/* ------------------------------------------------------------------ */

igual(comentariosDe(null), [], "sin datos no hay comentarios");
igual(comentariosDe({}), [], "sin la clave no hay comentarios");
igual(comentariosDe({ comentarios: "basura" }), [], "tolera basura");
igual(
  comentariosDe({
    comentarios: [
      { id: "ok", tipo: "problema", texto: "Vale", pantalla: "/hoy", creado: "2026-10-21T10:00:00.000Z" },
      { id: "mal-tipo", tipo: "otra", texto: "Vale" },
      { id: "sin-texto", tipo: "mejora" },
      null,
      "texto suelto",
    ],
  }).map((c) => c.id),
  ["ok"],
  "deja pasar solo los que están completos",
);

/* ------------------------------------------------------------------ */
/* Nuevos y orden                                                      */
/* ------------------------------------------------------------------ */

const uno: Comentario = {
  id: "1",
  tipo: "problema",
  texto: "Uno",
  pantalla: "/hoy",
  creado: "2026-10-21T10:00:00.000Z",
};
cierto(esNuevo(uno, ""), "sin haber abierto nunca, todo es nuevo");
cierto(esNuevo(uno, undefined), "si nunca se ha marcado, todo es nuevo");
falso(esNuevo(uno, "2026-10-21T11:00:00.000Z"), "lo anterior a la última visita no es nuevo");
cierto(esNuevo(uno, "2026-10-21T09:00:00.000Z"), "lo posterior sí es nuevo");
cierto(esNuevo(uno, "no es una fecha"), "con la marca de leído rota, mejor que sobre a que falte");

const desordenados = [
  { ...uno, id: "viejo", creado: "2026-10-20T10:00:00.000Z" },
  { ...uno, id: "nuevo", creado: "2026-10-22T10:00:00.000Z" },
  { ...uno, id: "medio", creado: "2026-10-21T10:00:00.000Z" },
];
igual(
  ordenarDeNuevoAViejo(desordenados).map((c) => c.id),
  ["nuevo", "medio", "viejo"],
  "el más reciente primero",
);

// --- El aviso por Telegram ------------------------------------------------

const idea: Comentario = {
  id: "c1",
  tipo: "mejora",
  texto: "Poder anotar el agua en vasos",
  pantalla: "/hoy",
  creado: "2026-10-21T10:00:00.000Z",
};

igual(
  avisoDelBuzon(idea, "Marta"),
  "Idea de Marta (/hoy)\n\nPoder anotar el agua en vasos",
  "el aviso dice quién, desde dónde y el texto tal cual",
);
igual(
  avisoDelBuzon({ ...idea, tipo: "problema", pantalla: "" }, ""),
  "Problema de la familia\n\nPoder anotar el agua en vasos",
  "sin nombre ni pantalla, no quedan huecos raros",
);

console.log(`\n${hechas - fallos}/${hechas} comprobaciones bien.`);
if (fallos > 0) process.exit(1);