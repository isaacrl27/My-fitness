/**
 * Pruebas del clasificador del buzón. Se ejecutan con:
 *   node pruebas/feedback-ia.prueba.mts
 *
 * Comprueban lo que se puede probar sin red: leer la respuesta del modelo,
 * validar la categoría, forzar el aviso de salud y apuntar la etiqueta en el
 * comentario guardado. La llamada a Gemini no se prueba aquí.
 */

import {
  ESQUEMA_CLASIFICACION,
  avisoSaludDelBuzon,
  clasificacionFinal,
  leerClasificacion,
  sospechaSalud,
} from "../lib/feedback-ia.ts";
import { CATEGORIAS, categoriaDe } from "../lib/feedback-categorias.ts";
import { anotarClasificacion, comentariosDe, esAlertaSalud } from "../lib/comentarios.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.log(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

// --- Las categorías ---------------------------------------------------------
igual(CATEGORIAS.length, 6, "hay seis categorías");
igual(categoriaDe("bug_bloqueante"), "bug_bloqueante", "una categoría válida se acepta");
igual(categoriaDe("  SALUD_MEDICO "), "salud_medico", "se perdona el espacio y las mayúsculas");
igual(categoriaDe("otra_cosa"), null, "una categoría inventada no se acepta");
igual(categoriaDe(7), null, "lo que no es texto no se acepta");

// --- Leer la respuesta del modelo -------------------------------------------
igual(
  leerClasificacion('{"categoria":"duda","alertaSalud":false}'),
  { categoria: "duda", alertaSalud: false },
  "un JSON limpio se lee tal cual",
);
igual(
  leerClasificacion('```json\n{"categoria":"sugerencia","alertaSalud":false}\n```'),
  { categoria: "sugerencia", alertaSalud: false },
  "un JSON envuelto en barras también se lee",
);
igual(
  leerClasificacion('{"categoria":"salud_medico","alertaSalud":false}'),
  { categoria: "salud_medico", alertaSalud: true },
  "salud_medico siempre enciende la alerta, aunque el modelo diga que no",
);
igual(
  leerClasificacion('{"categoria":"spam"}'),
  { categoria: "spam", alertaSalud: false },
  "sin alertaSalud, se queda en falsa",
);
igual(leerClasificacion("esto no es JSON"), null, "un texto sin JSON no inventa etiqueta");
igual(leerClasificacion('{"categoria":"inventada","alertaSalud":true}'), null, "categoría falsa = sin etiqueta");
igual(leerClasificacion('{"alertaSalud":true}'), null, "sin categoría no hay clasificación");

// --- El esquema que se le exige al modelo -----------------------------------
igual(
  ESQUEMA_CLASIFICACION.properties.categoria.enum,
  CATEGORIAS,
  "el esquema solo admite las seis categorías",
);

// --- La red de seguridad de salud, sin IA -----------------------------------
igual(sospechaSalud("Me mareo al no desayunar"), true, "un mareo salta sin depender de la IA");
igual(sospechaSalud("Ayer me mareé en el trabajo"), true, "las tildes no despistan a la red de salud");
igual(sospechaSalud("La app no guarda la cena"), false, "un fallo normal no suena a salud");
igual(sospechaSalud("¿Puedo cambiar el color?"), false, "una duda de la app tampoco");
igual(
  clasificacionFinal(null, "he vomitado después de comer"),
  { categoria: "salud_medico", alertaSalud: true },
  "si Gemini falla, la red local etiqueta el tema de salud",
);
igual(clasificacionFinal(null, "no guarda la cena"), null, "si Gemini falla y no hay salud, se queda sin etiqueta");
igual(
  clasificacionFinal({ categoria: "duda", alertaSalud: false }, "me duele la cabeza al contar calorías"),
  { categoria: "duda", alertaSalud: true },
  "la sospecha local enciende la alerta aunque el modelo diga que no",
);
igual(
  clasificacionFinal({ categoria: "sugerencia", alertaSalud: false }, "poner un botón más grande"),
  { categoria: "sugerencia", alertaSalud: false },
  "sin palabras de salud, la etiqueta del modelo se respeta",
);

// --- El aviso prioritario ---------------------------------------------------
const aviso = avisoSaludDelBuzon("me mareo al no desayunar", "Marta", "/hoy");
igual(aviso.includes("POSIBLE TEMA DE SALUD"), true, "el aviso prioritario se reconoce de un vistazo");
igual(aviso.includes("me mareo al no desayunar"), true, "el aviso lleva el texto tal cual");
igual(aviso.includes("Marta"), true, "el aviso dice quién escribe");
igual(aviso.includes("no cambies metas ni calorías"), true, "el aviso recuerda no tocar las metas por su cuenta");

// --- Apuntar la etiqueta en el comentario guardado --------------------------
const datos = {
  comentarios: [
    { id: "a", tipo: "problema", texto: "no guarda", pantalla: "/hoy", creado: "2026-10-01T10:00:00.000Z" },
    { id: "b", tipo: "mejora", texto: "una idea", pantalla: "/plan", creado: "2026-10-02T10:00:00.000Z" },
  ],
};
const conEtiqueta = anotarClasificacion(datos, "a", { categoria: "bug_bloqueante", alertaSalud: false });
const lista = comentariosDe(conEtiqueta);
igual(lista[0].categoria, "bug_bloqueante", "la etiqueta se apunta en el comentario que toca");
igual(lista[1].categoria, undefined, "los demás comentarios no se tocan");
igual(esAlertaSalud(lista[0]), false, "un fallo normal no es alerta de salud");

const conSalud = anotarClasificacion(datos, "b", { categoria: "salud_medico", alertaSalud: true });
igual(esAlertaSalud(comentariosDe(conSalud)[1]), true, "salud_medico sale como alerta");
igual(
  anotarClasificacion(datos, "no-existe", { categoria: "duda", alertaSalud: false }),
  datos,
  "si el comentario ya no está, los datos se quedan como estaban",
);

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}