/**
 * Pruebas del buscador de Open Food Facts (la pantalla de «no me gustan»).
 * Se ejecutan con:  node pruebas/off.prueba.mts
 *
 * Comprueban lo que de verdad tiene truco: que las marcas no cuenten como
 * resultado, que «brocoli» encuentre «Brócoli» (tildes aparte), que no se
 * repitan nombres y que sin conexión no se cuelgue.
 */

import {
  buscarEnOFF,
  sugerir,
  type RespuestaOFF,
  nombresDeTaxonomia,
  mezclarVariantes,
  buscarTaxonomia,
  partirNombre,
  buscarAlimentoOFF,
  alimentosDeOFF,
} from "../lib/off.ts";

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

/** Un hit con el nombre dado, y su descripción si se le pasa. */
function ficha(producto: string, descripcion?: string): [{ product_name: string; generic_name?: string }] {
  const hit: { product_name: string; generic_name?: string } = { product_name: producto };
  if (descripcion !== undefined) hit.generic_name = descripcion;
  return [hit];
}

// --- Menos de 3 letras: no se pregunta ni a un sitio -----------------------
let llamadas = 0;
const contarLlamadas = (async () => {
  llamadas += 1;
  return { ok: true, status: 200, json: async () => ({ hits: [] }) } as unknown as Response;
}) as unknown as typeof fetch;

igual(await buscarEnOFF("ma", { pedir: contarLlamadas }), [], "con 2 letras no se pregunta a la red");
igual(await buscarEnOFF("   ", { pedir: contarLlamadas }), [], "con solo espacios no se pregunta a la red");
igual(llamadas, 0, "con preguntas demasiado cortas el buscador se queda en casa");

// --- El filtro: solo nombres que de verdad llevan lo escrito ---------------
igual(
  sugerir(ficha("SugarBee Apple Cider"), "manzana"),
  [],
  "la marca «Manzana» no convierte la sidra en manzana: el nombre no la lleva",
);
igual(sugerir(ficha("Manzana"), "manzana"), ["Manzana"], "el nombre exacto entra");
igual(
  sugerir(ficha("Brócoli congelado"), "brocoli"),
  ["Brócoli congelado"],
  "mayúsculas y tildes no juegan: «brocoli» encuentra «Brócoli congelado»",
);
igual(
  sugerir(ficha("Bifidus", "Bebida de manzana"), "manzana"),
  ["Bebida de manzana"],
  "el nombre del producto no lleva lo escrito pero su descripción sí: vale",
);
igual(sugerir([{ product_name: 42 }, { generic_name: null }, {}], "manzana"), [], "los campos que no son texto se saltan");

igual(sugerir(ficha("  Manzana  "), "manzana"), ["Manzana"], "los nombres llegan limpios, sin espacios sobrantes");

igual(
  sugerir([...ficha("Manzana"), ...ficha("MANZANA"), ...ficha("Manzanas")], "manzana"),
  ["Manzana", "Manzanas"],
  "el mismo nombre con distinta caja no se repite",
);

// --- Ordenados de lo general a lo raro y con tope --------------------------
const muchas: RespuestaOFF["hits"] = [
  "Compota de manzana",
  "Manzana",
  "Manzanas",
  "Zumo de manzana",
  "Manzana de Reus",
  "Tarta de manzana",
  "Sidra de manzana",
  "Queso de manzana",
  "Vino de manzana",
  "Pan de manzana",
].map((p) => ({ product_name: p }));
igual(
  sugerir(muchas, "manzana"),
  [
    "Manzana",
    "Manzanas",
    "Pan de manzana",
    "Manzana de Reus",
    "Vino de manzana",
    "Zumo de manzana",
    "Queso de manzana",
    "Sidra de manzana",
  ],
  "salen primero los nombres cortos (lo general antes que lo raro) y no pasan de 8",
);

// --- La llamada de verdad: URL, señal, respuesta y fallos ------------------
let urlPedida = "";
let señalPedida: AbortSignal | null | undefined;
const pedirFalsa = (async (url: string, opciones?: RequestInit) => {
  urlPedida = url;
  señalPedida = opciones?.signal;
  const json = async () => ({ hits: [{ product_name: "Manzana" }, { product_name: "Compota de manzana" }] });
  return { ok: true, status: 200, json } as unknown as Response;
}) as unknown as typeof fetch;

const señalUno = new AbortController().signal;
igual(
  await buscarEnOFF("manzana", { pedir: pedirFalsa, senal: señalUno }),
  ["Manzana", "Compota de manzana"],
  "con la red, pregunta y devuelve lo que encaja",
);
igual(
  urlPedida,
  "https://search.openfoodfacts.org/search?q=manzana&lang=es&page_size=20&fields=product_name,generic_name",
  "la dirección lleva la pregunta bien codificada y pide solo los dos campos de nombre",
);
const señalDos = new AbortController().signal;
await buscarEnOFF("tomate", { pedir: pedirFalsa, senal: señalDos });
igual(señalPedida, señalDos, "la señal de cancelación llega de veras a la llamada");

const pedirRota = (async () => ({
  ok: false,
  status: 500,
  json: async () => ({}),
})) as unknown as typeof fetch;
let aviso1 = "";
try {
  await buscarEnOFF("manzana", { pedir: pedirRota });
} catch (e) {
  aviso1 = (e as Error).message;
}
igual(aviso1, "No he podido preguntar a Open Food Facts", "una respuesta mala salta con un aviso claro");

const pedirCaida = (async () => {
  throw new TypeError("fetch failed");
}) as unknown as typeof fetch;
let aviso2 = "";
try {
  await buscarEnOFF("manzana", { pedir: pedirCaida });
} catch (e) {
  aviso2 = (e as Error).message;
}
igual(aviso2, "No he podido preguntar a Open Food Facts", "sin conexión también salta con el aviso claro");

// --- Respuesta sin resultados (lista vacía) no es error --------------------
const pedirVacia = (async () => {
  const json = async () => ({ hits: null });
  return { ok: true, status: 200, json } as unknown as Response;
}) as unknown as typeof fetch;
igual(
  await buscarEnOFF("manzana", { pedir: pedirVacia }),
  [],
  "una respuesta sin nada devuelve la lista vacía sin pelearse",
);

// ---------------------------------------------------------------------------
// Las variantes clicables: la taxonomía de ingredientes + los productos
// ---------------------------------------------------------------------------

igual(
  nombresDeTaxonomia(
    {
      suggestions: [
        "leche",
        "leche entera",
        "leche de cabra",
        "E528",
        "E100",
        "bebida de soja",
        "leche entera de cabra",
      ],
    },
    "leche",
  ),
  // Los códigos de aditivos no son comida y «bebida de soja» no lleva lo escrito.
  ["leche", "leche entera", "leche de cabra", "leche entera de cabra"],
  "la taxonomía deja los códigos E y lo que no lleva la consulta fuera",
);

igual(
  nombresDeTaxonomia({ suggestions: ["cúrcuma", "aroma natural de cúrcuma"] }, "curcuma"),
  // Escrito sin tilde, encontrado con tilde: los acentos no cuentan.
  ["cúrcuma", "aroma natural de cúrcuma"],
  "la taxonomía entiende lo escrito sin tilde",
);

igual(nombresDeTaxonomia(null, "leche"), [], "una respuesta torcida no rompe nada");

igual(
  mezclarVariantes(
    ["leche entera", "leche de cabra"],
    ["Leche de cabra", "Leche semidesnatada", "Dulce de leche marca rara"],
    "leche",
  ),
  // La taxonomía va primero y lo mismo no se repite dos veces (la de cabra
  // sale una sola); lo de productos que también encaja, detrás.
  ["leche entera", "leche de cabra", "Leche semidesnatada", "Dulce de leche marca rara"],
  "las dos fuentes se juntan sin nombres repetidos",
);

igual(mezclarVariantes([], [], "leche"), [], "sin nada de nadie no hay variantes");

// --- La llamada a la taxonomía ----------------------------------------------
const pedirTaxonomia = (async (url: string, opciones?: RequestInit) => {
  urlPedida = url;
  señalPedida = opciones?.signal;
  const json = async () => ({ status: "success", suggestions: ["brocoli", "brocoli fresco"] });
  return { ok: true, status: 200, json } as unknown as Response;
}) as unknown as typeof fetch;

igual(
  await buscarTaxonomia("brocoli", { pedir: pedirTaxonomia, senal: señalUno }),
  ["brocoli", "brocoli fresco"],
  "la taxonomía pregunta y devuelve los nombres",
);
igual(
  urlPedida,
  "https://world.openfoodfacts.org/api/v3/taxonomy_suggestions?tagtype=ingredients&lc=es&string=brocoli&limit=12",
  "la dirección de la taxonomía lleva la lengua española y el límite",
);

let avisoTaxonomia = "";
try {
  await buscarTaxonomia("brocoli", { pedir: pedirRota });
} catch (e) {
  avisoTaxonomia = (e as Error).message;
}
igual(
  avisoTaxonomia,
  "No he podido preguntar a Open Food Facts",
  "la taxonomía en mal estado avisa con lo de siempre",
);

// --- Lo escrito: trocear cantidades ------------------------------------------
igual(
  partirNombre("200g de pollo"),
  { comida: "pollo", gramos: 200, unidades: null },
  "los gramos van con su alimento",
);
igual(
  partirNombre("1,5 gramos de sal"),
  { comida: "sal", gramos: 1.5, unidades: null },
  "los decimales con coma se entienden",
);
igual(
  partirNombre("2 huevos"),
  { comida: "huevos", gramos: null, unidades: 2 },
  "las unidades van aparte",
);
igual(
  partirNombre("mochi de mango"),
  { comida: "mochi de mango", gramos: null, unidades: null },
  "lo que no lleva cantidad, sin cantidad",
);

// --- Lo escrito: el alimento con sus números ---------------------------------
const pedirNutrido = (async (url: string) => {
  urlPedida = url;
  const json = async () => ({
    hits: [
      // Basura de marca: números y todo mayúsculas, no vale.
      { product_name: "MOCHI DE MANGO UNIDADES 5" },
      { product_name: "Mochi de mango", nutriments: { "energy-kj_100g": 406 } }, // sin kcal no vale
      {
        product_name: "Mochi de mango",
        nutriments: {
          "energy-kcal_100g": 97,
          "proteins_100g": 1.8,
          "carbohydrates_100g": 20.5,
          "fat_100g": 1.2,
        },
      },
    ],
  });
  return { ok: true, status: 200, json } as unknown as Response;
}) as unknown as typeof fetch;

const alimento = (await buscarAlimentoOFF("mochi de mango", { pedir: pedirNutrido })) ?? null;
igual(alimento?.nombre ?? "NADA", "Mochi de mango", "cae el nombre limpio, no la basura de marca");
igual(alimento?.kcal100 ?? -1, 97, "las calorías llegan por 100 g");
igual(alimento?.p100 ?? -1, 1.8, "las proteínas llegan por 100 g");
igual(
  urlPedida,
  "https://search.openfoodfacts.org/search?q=mochi%20de%20mango&lang=es&page_size=20&fields=product_name,generic_name,nutriments",
  "la dirección pide también los nutriments",
);

igual(await buscarAlimentoOFF("mochi de mango", { pedir: pedirVacia }), null, "sin nada, sin alimento");

// --- Lo escrito: la lista entera de lo que faltaba ----------------------------
const pedirAlimentosVarios = (async (url: string) => {
  // Cada llamada pide una comida distinta: dos respuestas falsas distintas.
  if (url.includes("mochi")) {
    const json = async () => ({
      hits: [
        {
          product_name: "Mochi de mango",
          nutriments: {
            "energy-kcal_100g": 97,
            "proteins_100g": 2,
            "carbohydrates_100g": 20,
            "fat_100g": 1,
          },
        },
      ],
    });
    return { ok: true, status: 200, json } as unknown as Response;
  }
  const json = async () => ({
    hits: [
      {
        product_name: "Pimentón dulce de la Vera",
        nutriments: {
          "energy-kcal_100g": 282,
          "proteins_100g": 14,
          "carbohydrates_100g": 54,
          "fat_100g": 13,
        },
      },
    ],
  });
  return { ok: true, status: 200, json } as unknown as Response;
}) as unknown as typeof fetch;

const hallados = await alimentosDeOFF(
  ["300 g de mochi de mango", "pimentón dulce", "2 huevos de codorniz"],
  { pedir: pedirAlimentosVarios },
);
igual(hallados.length, 3, "a cada trozo le pasa algo, aunque la base no lo conozca");
igual(hallados[0]?.alimento?.nombre ?? "NADA", "Mochi de mango", "el del «300 g» lleva su alimento");
igual(hallados[0]?.gramos ?? -1, 300, "los gramos escritos acompañan al alimento");
igual(hallados[1]?.alimento?.nombre ?? "NADA", "Pimentón dulce de la Vera", "el suelto se encuentra");
igual(hallados[1]?.alimento?.kcal100 ?? -1, 282, "con sus calorías por 100 g");
igual(hallados[2]?.alimento, null, "lo que la base no conoce queda como no encontrado");

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
