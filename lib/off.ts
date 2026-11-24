/**
 * Preguntas a Open Food Facts (gratis y abierto) para la pantalla de
 * «no me gustan»: el buscador tiene que encontrar cualquier alimento del
 * mundo, no solo los de la lista de la app.
 *
 * Devuelve NOMBRES limpios y sin marcas correspondientes a lo escrito. La
 * exclusión guarda el término como lo escribió el usuario; estos resultados
 * solo sirven de sugerencias y confirmación de que el alimento existe.
 */

import { normalizar } from "./alimentos.ts";

export type RespuestaOFF = {
  hits: Array<{ product_name?: unknown; generic_name?: unknown }> | null;
};

/** De un puñado de resultados de Open Food Facts, los nombres que sirven. */
export function sugerir(
  hits: RespuestaOFF["hits"],
  consulta: string,
  tope: number = 8,
): string[] {
  const escrita = normalizar(consulta);
  if (escrita.length < 3) return [];

  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const hit of hits ?? []) {
    if (!hit || typeof hit !== "object") continue;
    for (const campo of [hit.product_name, hit.generic_name]) {
      if (typeof campo !== "string") continue;
      const bonito = campo.trim();
      if (!bonito) continue;
      const limpio = normalizar(bonito);
      // El nombre tiene que llevar lo de verdad escrito: si solo coincide la
      // marca («Manzana» como marca de una sidra), sobra como sugerencia.
      if (!limpio.includes(escrita)) continue;
      if (vistas.has(limpio)) continue;
      vistas.add(limpio);
      salida.push(bonito);
    }
  }
  // Se ordena TODO antes de recortar: si recortara por orden de llegada, se
  // colarían productos raros y se caerían los nombres sencillos.
  // Lo general primero: los nombres cortos son el alimento, los largos son
  // productos concretos. A igual longitud, orden de diccionario español.
  return salida
    .sort((a, b) => a.length - b.length || a.localeCompare(b, "es"))
    .slice(0, tope);
}

const DIRECCION = "https://search.openfoodfacts.org/search";
const AVISO_RED = "No he podido preguntar a Open Food Facts";

/** Pregunta a Open Food Facts los alimento con ese nombre. */
export async function buscarEnOFF(
  consulta: string,
  opciones?: { senal?: AbortSignal; pedir?: typeof fetch },
): Promise<string[]> {
  if (normalizar(consulta).length < 3) return [];
  const pedir = opciones?.pedir ?? fetch;

  let respuesta: Response;
  let datos: RespuestaOFF;
  try {
    respuesta = await pedir(
      `${DIRECCION}?q=${encodeURIComponent(consulta.trim())}&lang=es&page_size=20&fields=product_name,generic_name`,
      { signal: opciones?.senal },
    );
    datos = (await respuesta.json()) as RespuestaOFF;
  } catch {
    throw new Error(AVISO_RED);
  }
  if (!respuesta.ok) throw new Error(AVISO_RED);
  return sugerir(datos?.hits ?? null, consulta);
}

// ---------------------------------------------------------------------------
// Las variantes clicables (taxonomía + productos) y lo escrito con números
// ---------------------------------------------------------------------------

/** Lo que hace falta de un alimento para montarlo a mano: números por 100 g. */
export type AlimentoOFF = {
  nombre: string;
  kcal100: number;
  p100: number;
  c100: number;
  g100: number
};

/** Un acierto de la búsqueda de productos, con su nutrición si la trae. */
export type AcertadoOFF = {
  product_name?: unknown;
  generic_name?: unknown;
  nutriments?: Record<string, unknown>;
};

const DIRECCION_TAXONOMIA = "https://world.openfoodfacts.org/api/v3/taxonomy_suggestions";

/** ¿Un nombre de producto que nunca valdría como alimento escrito a mano? */
export function esBasura(nombre: string): boolean {
  const n = nombre.trim();
  if (!n) return true;
  if (n.includes("\n")) return true;
  if (/\d/.test(n)) return true; // «BRIK 500 g», «3,2%», códigos sueltos
  if (n.toUpperCase() === n && /[a-záéíóúñ]/.test(n)) return true; // TODO mayúsculas
  return false;
}

/**
 * De la taxonomía de ingredientes (nombres canónicos, la lengua en la que se
 * escriben los platos), los que sirven para lo que ha escrito el usuario.
 */
export function nombresDeTaxonomia(crudo: unknown, consulta: string, tope = 8): string[] {
  const escrita = normalizar(consulta);
  if (escrita.length < 3) return [];
  const teclado = Array.isArray(crudo)
    ? crudo
    : ((crudo as { suggestions?: unknown } | null)?.suggestions ?? null);
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const crudo of Array.isArray(teclado) ? teclado : []) {
    if (typeof crudo !== "string") continue;
    const bonito = crudo.trim();
    if (!bonito) continue;
    if (/^E-?\d+[a-z]?$/i.test(bonito)) continue; // códigos de aditivos: no son alimentos
    if (esBasura(bonito)) continue;
    const limpio = normalizar(bonito);
    if (!limpio.includes(escrita)) continue;
    if (vistas.has(limpio)) continue;
    vistas.add(limpio);
    salida.push(bonito);
  }
  return salida
    .sort((a, b) => a.length - b.length || a.localeCompare(b, "es"))
    .slice(0, tope);
}

/** Las dos fuentes juntas: taxonomía primero, productos después, sin repetir. */
export function mezclarVariantes(
  taxonomia: string[],
  productos: string[],
  consulta: string,
  tope = 10,
): string[] {
  const escrita = normalizar(consulta);
  if (escrita.length < 3) return [];
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const nombre of [...taxonomia, ...productos]) {
    if (salida.length >= tope) break;
    const bonito = nombre?.trim();
    if (!bonito || esBasura(bonito)) continue;
    const limpio = normalizar(bonito);
    if (!limpio.includes(escrita)) continue;
    if (vistas.has(limpio)) continue;
    vistas.add(limpio);
    salida.push(bonito);
  }
  return salida;
}

/** Pregunta a la taxonomía cómo se llaman los ingredientes en español. */
export async function buscarTaxonomia(
  consulta: string,
  opciones?: { senal?: AbortSignal; pedir?: typeof fetch },
): Promise<string[]> {
  if (normalizar(consulta).length < 3) return [];
  const pedir = opciones?.pedir ?? fetch;
  try {
    const respuesta = await pedir(
      `${DIRECCION_TAXONOMIA}?tagtype=ingredients&lc=es&string=${encodeURIComponent(consulta.trim())}&limit=12`,
      { signal: opciones?.senal },
    );
    if (!respuesta.ok) throw new Error(AVISO_RED);
    const datos = (await respuesta.json()) as { suggestions?: unknown } | null;
    return nombresDeTaxonomia(datos, consulta);
  } catch {
    throw new Error(AVISO_RED);
  }
}

/** «300g de pollo» → { comida: "pollo", gramos: 300, unidades: null }. */
export function partirNombre(cadena: string): {
  comida: string | null;
  gramos: number | null;
  unidades: number | null;
} {
  const texto = cadena.trim();
  const enGramos = texto.match(/^(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramos)\s+(?:de\s+)?(.+)$/i);
  if (enGramos && enGramos[2].trim()) {
    return {
      comida: enGramos[2].trim(),
      gramos: Number(enGramos[1].replace(",", ".")),
      unidades: null,
    };
  }
  const enUnidades = texto.match(/^(\d+)\s+(?:de\s+)?(.+)$/i);
  if (enUnidades && enUnidades[2].trim()) {
    return { comida: enUnidades[2].trim(), gramos: null, unidades: Number(enUnidades[1]) };
  }
  return { comida: texto || null, gramos: null, unidades: null };
}

/** El primer número finito y no negativo de la lista de campos (o 0). */
function deNutriments(nut: Record<string, unknown>, campos: string[]): number {
  for (const campo of campos) {
    const v = nut[campo];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

/**
 * Del puñado de productos con nutriments, el primero que encaje con lo escrito
 * y traiga calorías por 100 g (sin ellas no se puede anotar nada).
 */
export function alimentoDeOFF(hits: AcertadoOFF[] | null, consulta: string): AlimentoOFF | null {
  const escrita = normalizar(consulta);
  if (escrita.length < 3) return null;
  for (const hit of hits ?? []) {
    if (!hit || typeof hit !== "object") continue;
    const nombreCrudo = ([hit.product_name, hit.generic_name] as unknown[]).find(
      (c): c is string => typeof c === "string" && c.trim() !== "",
    );
    const bonito = (nombreCrudo ?? "").trim();
    if (!bonito || esBasura(bonito)) continue;
    if (!normalizar(bonito).includes(escrita)) continue;
    const nut = hit.nutriments;
    if (!nut || typeof nut !== "object") continue;
    const kcal = deNutriments(nut, ["energy-kcal_100g", "energy_kcal_100g"]);
    if (kcal <= 0) continue;
    return {
      nombre: bonito,
      kcal100: kcal,
      p100: deNutriments(nut, ["proteins_100g"]),
      c100: deNutriments(nut, ["carbohydrates_100g"]),
      g100: deNutriments(nut, ["fat_100g"]),
    };
  }
  return null;
}

/** Pregunta por el alimento escrito y devuelve el que traiga sus números. */
export async function buscarAlimentoOFF(
  consulta: string,
  opciones?: { senal?: AbortSignal; pedir?: typeof fetch },
): Promise<AlimentoOFF | null> {
  if (normalizar(consulta).length < 3) return null;
  const pedir = opciones?.pedir ?? fetch;
  try {
    const respuesta = await pedir(
      `${DIRECCION}?q=${encodeURIComponent(consulta.trim())}&lang=es&page_size=20&fields=product_name,generic_name,nutriments`,
      { signal: opciones?.senal },
    );
    if (!respuesta.ok) throw new Error(AVISO_RED);
    const datos = (await respuesta.json()) as { hits?: unknown } | null;
    return alimentoDeOFF((datos?.hits ?? null) as AcertadoOFF[] | null, consulta);
  } catch {
    throw new Error(AVISO_RED);
  }
}

/** Cada trozo de lo que faltaba, con su alimento (o nada si no se conoce). */
export type HallazgoOFF = {
  consulta: string;
  alimento: AlimentoOFF | null;
  gramos: number | null;
  unidades: number | null;
};

/** El nacho de trozos que la base abierta mira de una vez. */
const TOPE_BUSCAS = 5;

export async function alimentosDeOFF(
  faltan: string[],
  opciones?: { senal?: AbortSignal; pedir?: typeof fetch },
): Promise<HallazgoOFF[]> {
  const salida: HallazgoOFF[] = [];
  const vistas = new Set<string>();
  for (const trozo of faltan) {
    if (salida.length >= TOPE_BUSCAS) break;
    const limpio = trozo.trim();
    if (!limpio) continue;
    const { comida, gramos, unidades } = partirNombre(limpio);
    const nombre = comida?.trim() ?? "";
    const clave = normalizar(nombre);
    if (clave.length < 3 || vistas.has(clave)) continue;
    vistas.add(clave);
    try {
      salida.push({ consulta: limpio, alimento: await buscarAlimentoOFF(nombre, opciones), gramos, unidades });
    } catch {
      salida.push({ consulta: limpio, alimento: null, gramos, unidades });
    }
  }
  return salida;
}
