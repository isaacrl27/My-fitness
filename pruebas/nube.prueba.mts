/**
 * Pruebas de la nube. Se ejecutan con:  node pruebas/nube.prueba.mts
 *
 * Lo que se comprueba aquí es el traductor entre lo que guarda la app y lo
 * que guardan las tablas, sin tener que tocar la nube de verdad: son objetos
 * en memoria. Si esto se rompe, los datos se suben mal y se bajan peor.
 */

import {
  aFilas,
  codigoRecuperacion,
  codigoValido,
  contar,
  conservarCamposDeServidor,
  deFilas,
  fusionar,
  fusionarBorrados,
  fusionarSalud,
  limpiarComidas,
  limpiarLapidasSuperadas,
  quitarBorrado,
} from "../lib/nube-mapeo.ts";
import { prepararCargaSubida } from "../lib/nube-subida.ts";
import type { Datos } from "../lib/store.tsx";

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

const alimentos = [
  {
    id: "a1",
    nombre: "Arroz",
    cantidad: "150 g",
    kcal: 200,
    proteinas: 4,
    carbohidratos: 40,
    grasas: 1,
  },
];

const datos: Datos = {
  perfil: {
    nombre: "Isaac",
    sexo: "hombre",
    fechaNacimiento: "1998-04-12",
    alturaCm: 178,
    pesoInicialKg: 84,
    pesoObjetivoKg: 76,
    actividad: "sedentario",
    ritmoKgSemana: 0.5,
    objetivo: "adelgazar",
    dieta: "ninguna",
    noLeGustan: ["brócoli"],
    creado: "2026-10-17T10:00:00.000Z",
  },
  pesadas: [{ fecha: "2026-10-16", kg: 83.5 }],
  comidas: [{ id: "c1", fecha: "2026-10-16", tipo: "cena", alimentos }],
  aguaLitros: { "2026-10-16": 1.5 },
  metaAguaL: 2,
  gustos: { "brócoli": "no-me-gusta" },
  caprichos: ["2026-10-10"],
  habitosHechos: { "2026-10-16": ["leer", "sol"] },
  saludDiaria: { "2026-10-18": { pasos: 8420, suenoHoras: 7.5 } },
};

const filas = aFilas(datos, "persona-1");

// --- Subida -------------------------------------------------------------
igual(filas.pesadas.length, 1, "cada pesada es una fila");
igual(
  filas.pesadas[0],
  { persona_id: "persona-1", fecha: "2026-10-16", kg: 83.5 },
  "la pesada sale con su persona, su fecha y su peso",
);
igual(
  filas.comidas[0].alimentos,
  alimentos,
  "los alimentos se suben enteros, sin partirlos en trozos",
);
igual(filas.gustos[0].valor, "no-me-gusta", "el gusto se guarda tal cual lo dice la app");
igual(
  (filas.perfil.datos as { metaAguaL: number }).metaAguaL,
  2,
  "la meta del agua sube dentro del perfil",
);
igual(
  (filas.perfil.datos as { caprichos?: string[] }).caprichos,
  ["2026-10-10"],
  "los caprichos canjeados suben dentro del perfil, sin migración nueva",
);
igual(
  (filas.perfil.datos as { habitosHechos?: Record<string, string[]> }).habitosHechos,
  { "2026-10-16": ["leer", "sol"] },
  "los hábitos marcados suben dentro del perfil, en el mismo jsonb",
);
igual(
  (
    filas.perfil.datos as {
      saludDiaria?: Record<string, { pasos?: number; suenoHoras?: number }>;
    }
  ).saludDiaria,
  { "2026-10-18": { pasos: 8420, suenoHoras: 7.5 } },
  "los pasos y el sueño del iPhone suben dentro del perfil, en el mismo jsonb",
);
igual(contar(datos), 5, "cuenta perfil, pesada, comida, agua y gusto: cinco");

// --- Bajada: lo que sube tiene que volver igual -------------------------
const vuelta = deFilas(
  filas.perfil,
  filas.pesadas,
  filas.comidas,
  filas.agua,
  filas.gustos,
);
igual(vuelta.perfil?.nombre, "Isaac", "el perfil vuelve entero");
igual(vuelta.perfil?.objetivo, "adelgazar", "el objetivo vuelve igual");
igual(vuelta.pesadas, datos.pesadas, "las pesadas vuelven igual que subieron");
igual(vuelta.comidas, datos.comidas, "las comidas vuelven con sus alimentos y sus macros");
igual(vuelta.aguaLitros, datos.aguaLitros, "el agua vuelve igual");
igual(vuelta.gustos, datos.gustos, "los gustos vuelven igual");
igual(vuelta.metaAguaL, 2, "la meta del agua vuelve igual");
igual(vuelta.caprichos, ["2026-10-10"], "los caprichos vuelven igual que subieron");
igual(
  vuelta.habitosHechos,
  datos.habitosHechos,
  "los hábitos marcados vuelven igual que subieron",
);
igual(vuelta.saludDiaria, datos.saludDiaria, "los pasos y el sueño del iPhone vuelven igual que subieron");

// --- Bajada: lo que no se pueda leer se tira, no rompe ------------------
const sucio = deFilas(
  {
    datos: {
      perfil: null,
      metaAguaL: 0,
      caprichos: ["no-es-fecha", 42],
      habitosHechos: { "ayer": ["leer"], "2026-10-16": ["leer", "no-existe"] },
      saludDiaria: { "ayer": { pasos: 100 }, "2026-10-16": { pasos: 999999, suenoHoras: 30 } },
    },
  },
  [
    { fecha: "ayer", kg: 80 },
    { fecha: "2026-10-16", kg: Number("x") },
    { fecha: "2026-10-15", kg: 81 },
  ],
  [{ id: 9, fecha: "2026-10-15", tipo: "cena", alimentos: null }],
  [{ fecha: "2026-10-15", litros: "no" }],
  [{ ingrediente: "   ", valor: "me-gusta" }],
);
igual(sucio.pesadas, [{ fecha: "2026-10-15", kg: 81 }], "una pesada sin fecha valida o sin numero se tira");
igual(sucio.comidas, [], "una comida sin id de texto se tira");

// Una comida bien de id y fecha pero con los alimentos rotos (o un tramo mal)
// se limpia por dentro: antes entraba tal cual y la pantalla de Hoy se caía.
const comidasRaras = deFilas(
  { datos: { perfil: null, metaAguaL: 2, caprichos: [], habitosHechos: {}, saludDiaria: {} } },
  [],
  [
    { id: 9, fecha: "2026-10-15", tipo: "cena", alimentos: null },
    {
      id: "c-sin-alimentos",
      fecha: "2026-10-15",
      tipo: "almuerzo",
      alimentos: [{ id: "x", nombre: "Pollo", cantidad: "100 g", kcal: 165, proteinas: 31, carbohidratos: 0, grasas: 3.6 }],
    },
    { id: "c-vacia", fecha: "2026-10-16", tipo: "cena", alimentos: [] },
    {
      id: "c-buena",
      fecha: "2026-10-16",
      tipo: "desayuno",
      alimentos: [
        { id: "a1", nombre: "Huevos", cantidad: "3 unidades", kcal: 210, proteinas: 18, carbohidratos: 1, grasas: 15 },
        { id: "a2", nombre: "", cantidad: "", kcal: "mucho", proteinas: null, carbohidratos: 0, grasas: -4 },
      ],
    },
    {
      id: "c-solo-buena",
      fecha: "2026-10-16",
      tipo: "comida",
      alimentos: [
        { id: "a3", nombre: "Pollo", cantidad: "150 g", kcal: 248, proteinas: 46.5, carbohidratos: 0, grasas: 5.3 },
        { id: 42, nombre: "Fila rota", cantidad: "x", kcal: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
      ],
    },
  ],
  [],
  [],
);
igual(
  comidasRaras.comidas,
  [
    {
      id: "c-buena",
      fecha: "2026-10-16",
      tipo: "desayuno",
      alimentos: [
        { id: "a1", nombre: "Huevos", cantidad: "3 unidades", kcal: 210, proteinas: 18, carbohidratos: 1, grasas: 15 },
      ],
    },
    {
      id: "c-solo-buena",
      fecha: "2026-10-16",
      tipo: "comida",
      alimentos: [
        { id: "a3", nombre: "Pollo", cantidad: "150 g", kcal: 248, proteinas: 46.5, carbohidratos: 0, grasas: 5.3 },
      ],
    },
  ],
  "una comida con alimentos rotos entra limpia: el tramo malo se tira y el tipo raro se va entera",
);
igual(limpiarComidas(null), [], "limpiarComidas con nada devuelve vacío");
igual(
  limpiarComidas([{ id: "c1", fecha: "2026-10-16", tipo: "cena", alimentos: [{ id: "a1", nombre: "H", cantidad: "1", kcal: 1, proteinas: 0, carbohidratos: 0, grasas: 0 }] }, "basura"]),
  [{ id: "c1", fecha: "2026-10-16", tipo: "cena", alimentos: [{ id: "a1", nombre: "H", cantidad: "1", kcal: 1, proteinas: 0, carbohidratos: 0, grasas: 0 }] }],
  "limpiarComidas tira lo que no sea comida y se queda lo bueno",
);
igual(sucio.aguaLitros, {}, "un litro que no es número se tira");
igual(sucio.gustos, {}, "un gusto sin ingrediente se tira");
igual(sucio.metaAguaL, 2, "una meta del agua imposible vuelve al valor de siempre");
igual(sucio.caprichos, [], "un capricho que no parezca fecha se tira");
igual(
  sucio.habitosHechos,
  { "2026-10-16": ["leer"] },
  "un hábito marcado con fecha mala o con id raro se tira",
);
igual(
  sucio.saludDiaria,
  {},
  "unos pasos de 999999 o un sueño de 30 horas se tiran (y la fecha «ayer» también)",
);
igual(sucio.perfil, null, "un perfil ilegible no inventa nada");

// --- Bajada: las fechas con hora se quedan solo con el día --------------
const conHora = deFilas(null, [{ fecha: "2026-10-16T08:30:00.000Z", kg: 82 }], [], [], []);
igual(
  conHora.pesadas,
  [{ fecha: "2026-10-16", kg: 82 }],
  "una fecha con la hora encima se queda con el día, que es como las cuenta la app",
);

// --- Mezcla -------------------------------------------------------------
const otro: Datos = {
  ...datos,
  pesadas: [...datos.pesadas, { fecha: "2026-10-17", kg: 83 }],
  comidas: [],
  aguaLitros: {},
  gustos: {},
  caprichos: ["2026-10-12"],
  habitosHechos: { "2026-10-17": ["correr"] },
  saludDiaria: { "2026-10-17": { pasos: 5000, suenoHoras: 6.5 } },
};
const mezcla = fusionar(datos, otro);
igual(mezcla.pesadas.length, 2, "al mezclar no se pierde ninguna pesada");
igual(mezcla.pesadas[1].kg, 83, "la pesada que solo estaba en la nube se añade");
igual(mezcla.pesadas[0].kg, 83.5, "si los dos tienen la misma fecha, gana lo del móvil");
igual(mezcla.comidas, datos.comidas, "la comida que solo estaba en el móvil se queda");
igual(mezcla.gustos, datos.gustos, "los gustos del móvil se quedan");
igual(
  mezcla.caprichos,
  ["2026-10-10", "2026-10-12"],
  "al mezclar se unen los caprichos de los dos lados, sin repetir",
);
igual(
  mezcla.habitosHechos,
  { "2026-10-17": ["correr"], "2026-10-16": ["leer", "sol"] },
  "al mezclar se unen los hábitos marcados de los dos días",
);
igual(
  mezcla.saludDiaria,
  { "2026-10-17": { pasos: 5000, suenoHoras: 6.5 }, "2026-10-18": { pasos: 8420, suenoHoras: 7.5 } },
  "al mezclar cada lado aporta sus días de pasos y sueño",
);

// --- Ejercicios hechos (pestaña Entreno) --------------------------------
igual(
  fusionar(
    { ...datos, entrenosHechos: { "2026-10-18": ["sentadilla"] } },
    {
      ...datos,
      entrenosHechos: { "2026-10-18": ["remo-mesa"], "2026-10-17": ["plancha"] },
    },
  ).entrenosHechos,
  { "2026-10-18": ["remo-mesa", "sentadilla"], "2026-10-17": ["plancha"] },
  "los ejercicios hechos se unen por día sin repetir",
);

igual(
  aFilas({ ...datos, entrenosHechos: { "2026-10-18": ["sentadilla"] } }, "p1").perfil.datos
    .entrenosHechos,
  { "2026-10-18": ["sentadilla"] },
  "los ejercicios hechos suben dentro del jsonb del perfil",
);

igual(
  deFilas(
    {
      datos: {
        entrenosHechos: {
          "2026-10-18": ["sentadilla", 42, ""],
          ayer: ["plancha"],
          "2026-10-17": [],
        },
      },
    } as never,
    [],
    [],
    [],
    [],
  ).entrenosHechos,
  { "2026-10-18": ["sentadilla"] },
  "de la nube solo bajan ejercicios con fecha buena y id de texto",
);

// Argon, ronda 4: el mismo día con datos distintos en cada lado. Antes se
// pisaba el día entero, así que anotar el sueño en el móvil borraba los pasos
// que había subido el Atajo a la nube.
igual(
  fusionar(
    {
      ...datos,
      saludDiaria: { "2026-10-18": { suenoHoras: 7.5 } },
      habitosHechos: { "2026-10-18": ["correr"] },
    },
    {
      ...datos,
      saludDiaria: { "2026-10-18": { pasos: 8500 } },
      habitosHechos: { "2026-10-18": ["leer"] },
    },
  ).saludDiaria,
  { "2026-10-18": { pasos: 8500, suenoHoras: 7.5 } },
  "el mismo día se queda con los pasos de un lado y el sueño del otro, no con uno solo",
);
const habitosJuntos =
  fusionar(
    { ...datos, habitosHechos: { "2026-10-18": ["correr"] } },
    { ...datos, habitosHechos: { "2026-10-18": ["leer"] } },
  ).habitosHechos?.["2026-10-18"] ?? [];
igual(
  [...habitosJuntos].sort(),
  ["correr", "leer"],
  "los hábitos del mismo día se juntan en vez de pisarse (el orden da igual)",
);

const alReves = fusionar(
  { ...datos, pesadas: [], comidas: [], aguaLitros: {}, gustos: {} },
  otro,
);
igual(alReves.pesadas.length, 2, "un móvil vacío recibe todo lo de la nube");
igual(alReves.perfil?.nombre, "Isaac", "un móvil vacío recibe el perfil");

// --- Mezcla al recuperar cuenta: la nube manda --------------------------
// Quien recupera su código en un móvil nuevo llegó a pasar el cuestionario
// de mentiras para entrar; el perfil y la meta del agua reales son los de la
// nube, no los falsos del móvil.
const falsoMovil: Datos = {
  ...datos,
  perfil: { ...datos.perfil!, nombre: "Falso", dieta: "vegano" },
  pesadas: [{ fecha: "2026-10-16", kg: 99 }],
  metaAguaL: 2,
};
const nubeReal: Datos = {
  ...datos,
  pesadas: [...datos.pesadas, { fecha: "2026-10-17", kg: 83 }],
  metaAguaL: 3.5,
};

const recuperado = fusionar(falsoMovil, nubeReal, true);
igual(recuperado.perfil?.nombre, "Isaac", "al recuperar manda el perfil de la nube, no el del cuestionario falso");
igual(recuperado.perfil?.dieta, "ninguna", "la dieta de la nube también manda");
igual(recuperado.metaAguaL, 3.5, "la meta del agua de la nube no la pisa el 2 por defecto del móvil");
igual(recuperado.pesadas.length, 2, "al recuperar no se pierde ninguna pesada");
igual(recuperado.pesadas[0].kg, 83.5, "en la misma fecha gana la pesada de la nube");
igual(recuperado.comidas, datos.comidas, "lo anotado en el móvil mientras tanto se queda");

const normal = fusionar(falsoMovil, nubeReal);
igual(normal.perfil?.nombre, "Falso", "sin recuperar, el perfil del móvil sigue mandando");
igual(normal.metaAguaL, 2, "sin recuperar, la meta del agua del móvil sigue mandando");
igual(normal.pesadas[0].kg, 99, "sin recuperar, en la misma fecha gana la pesada del móvil");

// --- Fusión de pasos y sueño: lo del Atajo nunca se pierde ---------------
// El Atajo del iPhone escribe pasos y sueño directos en la nube. Este móvil
// puede subir después una copia vieja sin ellos; al fusionar, cada día se
// queda con el valor mayor, así que lo inyectado no se borra.
igual(
  fusionarSalud({ "2026-10-18": { pasos: 8500 } }, { "2026-10-18": {} }),
  { "2026-10-18": { pasos: 8500 } },
  "si el móvil sube un día sin pasos, se queda el que puso la nube",
);
igual(
  fusionarSalud({ "2026-10-18": { pasos: 8500 } }, { "2026-10-18": { pasos: 9000 } }),
  { "2026-10-18": { pasos: 9000 } },
  "entre dos pasos del mismo día gana el mayor, venga de donde venga",
);
igual(
  fusionarSalud(
    { "2026-10-17": { pasos: 7000, suenoHoras: 8 } },
    { "2026-10-18": { pasos: 9000 } },
  ),
  { "2026-10-17": { pasos: 7000, suenoHoras: 8 }, "2026-10-18": { pasos: 9000 } },
  "un día que solo está en un lado se conserva entero, y el del otro lado también",
);
igual(
  fusionarSalud(
    { "2026-10-18": { pasos: 999999, suenoHoras: 30 } },
    { "2026-10-18": { pasos: 8000, suenoHoras: 7 } },
  ),
  { "2026-10-18": { pasos: 8000, suenoHoras: 7 } },
  "un valor fuera de rango se tira y manda el bueno del otro lado",
);
igual(
  fusionarSalud(undefined, { "2026-10-18": { pasos: 5000, suenoHoras: 6 } }),
  { "2026-10-18": { pasos: 5000, suenoHoras: 6 } },
  "sin datos de un lado devuelve los del otro sin romper",
);
igual(
  fusionarSalud({ "2026-10-18": { pasos: 5000 } }, undefined),
  { "2026-10-18": { pasos: 5000 } },
  "sin datos del otro lado también devuelve los que hay",
);
igual(fusionarSalud(undefined, undefined), {}, "sin datos de ninguno de los dos no inventa nada");

// --- La cuota de IA no se borra al subir una comida ----------------------
// Los contadores los escribe el servidor en la misma fila del perfil. El móvil
// no los manda; si al subir se perdieran, cada comida reiniciaría el consumo.
igual(
  conservarCamposDeServidor(
    { perfil: { nombre: "Isaac" }, saludDiaria: {} },
    { usoIA: { fecha: "2026-10-20", usadas: 3 }, usoIAtexto: { fecha: "2026-10-20", usadas: 7 } },
  ),
  {
    perfil: { nombre: "Isaac" },
    saludDiaria: {},
    usoIA: { fecha: "2026-10-20", usadas: 3 },
    usoIAtexto: { fecha: "2026-10-20", usadas: 7 },
  },
  "al subir se conservan los contadores de IA que había en la nube",
);
igual(
  conservarCamposDeServidor({ usoIAfoto: { fecha: "2026-10-19", usadas: 10 } }, { usoIAfoto: { fecha: "2026-10-20", usadas: 4 } }),
  { usoIAfoto: { fecha: "2026-10-20", usadas: 4 } },
  "si el contador está en los dos lados manda el de la nube, que es el bueno",
);
igual(
  conservarCamposDeServidor({ perfil: {} }, null),
  { perfil: {} },
  "sin nada en la nube no inventa contadores",
);

// --- Una pesada vuelta a apuntar no se borra al sincronizar ----------------
// La nube conserva la lápida del borrado anterior. Si el móvil ya tiene la
// pesada viva, esa lápida sobra; si no se quitara, la fusión la borraría otra
// vez y la pesada desaparecería sola al rato.
const fechaLapidaReciente = new Date().toISOString();
igual(
  conservarCamposDeServidor(
    { borrados: [{ tipo: "pesada", clave: "2026-10-20", borradoEn: fechaLapidaReciente }] },
    {
      borrados: [
        { tipo: "pesada", clave: "2026-10-20", borradoEn: fechaLapidaReciente },
        { tipo: "comida", clave: "c9", borradoEn: fechaLapidaReciente },
      ],
    },
    new Set(["pesada:2026-10-20"]),
  ).borrados,
  [{ tipo: "comida", clave: "c9", borradoEn: fechaLapidaReciente }],
  "la lápida de algo vivo se descarta; las de lo demás se quedan",
);
igual(
  conservarCamposDeServidor(
    { perfil: { nombre: "Ana" } },
    {
      comentarios: [{ id: "c1", tipo: "mejora", texto: "Idea", pantalla: "/hoy", creado: "2026-10-21T10:00:00.000Z" }],
      comentariosLeidos: "2026-10-21T09:00:00.000Z",
    },
  ),
  {
    perfil: { nombre: "Ana" },
    comentarios: [{ id: "c1", tipo: "mejora", texto: "Idea", pantalla: "/hoy", creado: "2026-10-21T10:00:00.000Z" }],
    comentariosLeidos: "2026-10-21T09:00:00.000Z",
  },
  "al subir no se borran los mensajes del buzón ni la marca de leídos",
);

// --- Mensajes de Isaac: fusión entre nube y local ----------------------
const msg1 = { id: "m1", texto: "Hola!", fecha: "2026-10-25T10:00:00.000Z", leido: false };
const msg2 = { id: "m2", texto: "Novedad", fecha: "2026-10-25T11:00:00.000Z", leido: false };
const mezcladoMsgs = fusionar(
  { ...datos, mensajesIsaac: [{ ...msg1, leido: true }] },
  { ...datos, mensajesIsaac: [msg1, msg2] },
);
igual(mezcladoMsgs.mensajesIsaac?.length, 2, "los mensajes se mezclan sin perder ninguno");
igual(mezcladoMsgs.mensajesIsaac?.find((m) => m.id === "m1")?.leido, true, "si el móvil lo leyó se conserva como leído");
igual(mezcladoMsgs.mensajesIsaac?.find((m) => m.id === "m2")?.leido, false, "el nuevo de la nube entra sin leer");

// --- Efecto zombi: borrados (tombstones) eliminan elementos al fusionar ----
const comidaZombie = { id: "c_muerta", fecha: "2026-10-25", tipo: "comida" as const, alimentos };
const fusionConZombi = fusionar(
  {
    ...datos,
    comidas: [],
    borrados: [{ tipo: "comida", clave: "c_muerta", borradoEn: new Date().toISOString() }],
  },
  { ...datos, comidas: [comidaZombie] },
);
igual(fusionConZombi.comidas.some((c) => c.id === "c_muerta"), false, "una comida con marca de borrado no resucita de la nube");

// --- Volver a apuntar algo borrado retira su lápida ------------------------
const lapidaPesada = { tipo: "pesada" as const, clave: "2026-10-16", borradoEn: new Date().toISOString() };
const lapidaGusto = { tipo: "gusto" as const, clave: "brócoli", borradoEn: new Date().toISOString() };
const lapidas = [lapidaPesada, lapidaGusto];

igual(
  quitarBorrado(lapidas, "pesada", "2026-10-16"),
  [lapidaGusto],
  "volver a apuntar la pesada quita solo su lápida",
);
igual(
  quitarBorrado(lapidas, "gusto", "brócoli"),
  [lapidaPesada],
  "volver a valorar el plato quita solo la lápida del gusto",
);
igual(
  quitarBorrado(lapidas, "pesada", "2026-01-01"),
  lapidas,
  "si no había lápida de eso, la lista se queda igual",
);
igual(quitarBorrado(undefined, "pesada", "2026-10-16"), undefined, "sin lápidas no hay nada que quitar");

const sinLapida = quitarBorrado(
  [lapidaPesada],
  "pesada",
  "2026-10-16",
) ?? [];
const conPesadaRepuesta = fusionar(
  { ...datos, pesadas: [{ fecha: "2026-10-16", kg: 82.9 }], borrados: sinLapida },
  { ...datos, pesadas: [], borrados: [] },
);
igual(
  conPesadaRepuesta.pesadas.find((p) => p.fecha === "2026-10-16")?.kg,
  82.9,
  "una pesada borrada y vuelta a apuntar se queda después de fusionar",
);

// --- Códigos de recuperación --------------------------------------------
igual(codigoRecuperacion(() => 0).length, 6, "el código tiene 6 caracteres");
igual(codigoRecuperacion(() => 0), "AAAAAA", "un aleatorio siempre en cero da la primera letra");
igual(codigoValido("abc234"), true, "un código en minúsculas se acepta");
igual(codigoValido("  ABC234  "), true, "un código con espacios alrededor se acepta");
igual(codigoValido("123456"), false, "el 1 y el 0 no están en el abecedario, para no confundirse con la I y la O");
igual(codigoValido("abc"), false, "un código corto no vale");
igual(codigoValido(""), false, "un código vacío no vale");

// --- Fase 3: Subida diferencial (`prepararCargaSubida`) ------------------
const baseConfirmada: Datos = {
  ...datos,
  comidas: [
    ...datos.comidas,
    { id: "c-capricho", fecha: "2026-10-15", tipo: "comida", capricho: true, alimentos },
  ],
};
const cargaCompleta = prepararCargaSubida(baseConfirmada, null);
igual(cargaCompleta.diferencial, false, "sin base previa la subida va completa");
igual(cargaCompleta.datos.comidas.length, 2, "en subida completa viajan todas las comidas");
igual(cargaCompleta.comidasCapricho, ["c-capricho"], "se listan los ids de comidas capricho");
igual(cargaCompleta.saludViva, ["2026-10-18"], "en subida completa todas las fechas de salud constan vivas");

const soloAguaNueva: Datos = {
  ...baseConfirmada,
  aguaLitros: { ...baseConfirmada.aguaLitros, "2026-10-19": 0.5 },
};
const cargaDiferencial = prepararCargaSubida(soloAguaNueva, baseConfirmada);
igual(cargaDiferencial.diferencial, true, "con base confirmada la subida es diferencial");
igual(cargaDiferencial.datos.pesadas, [], "no reenvía pesadas antiguas sin cambios");
igual(cargaDiferencial.datos.comidas, [], "no reenvía comidas antiguas sin cambios");
igual(cargaDiferencial.datos.gustos, {}, "no reenvía gustos antiguos sin cambios");
igual(
  cargaDiferencial.datos.aguaLitros,
  { "2026-10-19": 0.5 },
  "solo viaja el día de agua que acaba de cambiar",
);
igual(cargaDiferencial.saludViva, [], "si pasos y sueño no cambiaron, saludViva va vacía");
igual(
  cargaDiferencial.comidasCapricho,
  ["c-capricho"],
  "conserva los ids de comidas capricho aunque esas comidas no viajen en el delta",
);
igual(
  (
    aFilas(cargaDiferencial.datos, "persona-1", {
      comidasCapricho: cargaDiferencial.comidasCapricho,
    }).perfil.datos as { comidasCapricho: string[] }
  ).comidasCapricho,
  ["c-capricho"],
  "aFilas respeta comidasCapricho completas en una subida diferencial",
);

const comidaEditada: Datos = {
  ...baseConfirmada,
  comidas: baseConfirmada.comidas.map((c) =>
    c.id === "c1" ? { ...c, capricho: true } : c,
  ),
  saludDiaria: {
    ...baseConfirmada.saludDiaria,
    "2026-10-19": { pasos: 4200 },
  },
};
const cargaEditada = prepararCargaSubida(comidaEditada, baseConfirmada);
igual(
  cargaEditada.datos.comidas.map((c) => c.id),
  ["c1"],
  "si una comida existente cambia (p. ej. marca capricho), viaja solo esa comida",
);
igual(cargaEditada.comidasCapricho, ["c1", "c-capricho"], "actualiza la lista total de comidasCapricho");
igual(cargaEditada.saludViva, ["2026-10-19"], "detecta exactamente la fecha nueva o editada de saludDiaria");

// --- Fase 3: Lápidas de salud (`quitarSalud`) y superación desde nube ----
const ahoraIso = new Date().toISOString();
const lapidaSalud = { tipo: "salud" as const, clave: "2026-10-18", borradoEn: ahoraIso };
const fusionSaludVaciada = fusionar(
  { ...datos, saludDiaria: {}, borrados: [lapidaSalud] },
  { ...datos, saludDiaria: { "2026-10-18": { pasos: 8420, suenoHoras: 7.5 } }, borrados: [] },
);
igual(
  fusionSaludVaciada.saludDiaria,
  {},
  "vaciar pasos/sueño de un día crea lápida salud y evita que resuciten al fusionar",
);
igual(
  quitarBorrado([lapidaSalud, lapidaGusto], "salud", "2026-10-18"),
  [lapidaGusto],
  "volver a anotar pasos o sueño retira solo la lápida salud de ese día",
);

const bajadaTrasWidget = deFilas(
  {
    datos: {
      perfil: null,
      metaAguaL: 2,
      saludDiaria: { "2026-10-18": { pasos: 6100 } },
      borrados: [lapidaSalud],
    },
  },
  [],
  [],
  [],
  [],
);
igual(
  bajadaTrasWidget.borrados,
  [],
  "deFilas retira una lápida salud superada cuando el Atajo ya inyectó datos nuevos ese día",
);

const localYaSincronizado: Datos = {
  ...datos,
  saludDiaria: {},
  pesadas: [],
  borrados: [
    lapidaSalud,
    { tipo: "pesada", clave: "2026-10-16", borradoEn: ahoraIso },
    { tipo: "comida", clave: "c-sigue-borrada", borradoEn: ahoraIso },
  ],
};
const nubeConDatoNuevo: Datos = {
  ...datos,
  saludDiaria: { "2026-10-18": { pasos: 9100 } },
  pesadas: [{ fecha: "2026-10-16", kg: 82.4 }],
  borrados: [{ tipo: "comida", clave: "c-sigue-borrada", borradoEn: ahoraIso }],
};
const reconciliado = limpiarLapidasSuperadas(localYaSincronizado, nubeConDatoNuevo);
igual(
  reconciliado.borrados,
  [{ tipo: "comida", clave: "c-sigue-borrada", borradoEn: ahoraIso }],
  "limpiarLapidasSuperadas retira lápidas locales superadas en la nube y conserva las vigentes",
);
igual(
  fusionar(reconciliado, nubeConDatoNuevo).saludDiaria,
  { "2026-10-18": { pasos: 9100 } },
  "tras limpiar lápidas superadas, los pasos nuevos del Atajo entran limpios al móvil",
);

// --- Fase 3: `fusionarBorrados` y validación estricta de calendario ------
const hace40Dias = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
const tViejo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
const tNuevo = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
const borradosFusionados = fusionarBorrados(
  [
    { tipo: "pesada", clave: "2026-10-10", borradoEn: tViejo },
    { tipo: "pesada", clave: "2026-09-01", borradoEn: hace40Dias },
    { tipo: "inventado" as "pesada", clave: "x", borradoEn: tNuevo },
  ],
  [{ tipo: "pesada", clave: "2026-10-10", borradoEn: tNuevo }],
);
igual(
  borradosFusionados,
  [{ tipo: "pesada", clave: "2026-10-10", borradoEn: tNuevo }],
  "fusionarBorrados conserva la fecha más reciente, purga >30 días y descarta tipos inválidos",
);

const fechasImposibles = deFilas(
  {
    datos: {
      perfil: null,
      metaAguaL: 2,
      caprichos: ["2026-02-31", "2026-99-99", "2026-02-28"],
      habitosHechos: { "2026-10-16": ["leer", "leer"] },
    },
  },
  [
    { fecha: "2026-02-31", kg: 80 },
    { fecha: "2026-02-28", kg: 80.5 },
  ],
  [],
  [
    { fecha: "2026-02-28", litros: 25 },
    { fecha: "2026-02-27", litros: -1 },
    { fecha: "2026-02-26", litros: 2.25 },
  ],
  [],
);
igual(
  fechasImposibles.pesadas,
  [{ fecha: "2026-02-28", kg: 80.5 }],
  "una fecha de calendario imposible como 2026-02-31 se descarta en deFilas",
);
igual(
  fechasImposibles.caprichos,
  ["2026-02-28"],
  "caprichos también exige fechas de calendario reales",
);
igual(
  fechasImposibles.aguaLitros,
  { "2026-02-26": 2.25 },
  "litros de agua negativos o mayores de 15 L se descartan al bajar de la nube",
);
igual(
  fechasImposibles.habitosHechos,
  { "2026-10-16": ["leer"] },
  "hábitos repetidos el mismo día bajan deduplicados",
);

if (fallos > 0) {
  console.error(`\n${fallos} de ${hechas} FALLAN.`);
  process.exit(1);
}
console.log(`\n${hechas - fallos} de ${hechas} bien.`);
