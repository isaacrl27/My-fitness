/**
 * Código de barras: busca el producto en la memoria propia del móvil y en
 * Open Food Facts (base abierta ODbL, la misma semilla libre con la que nació
 * el ecosistema tipo Yuka en Europa).
 *
 * Incluye:
 * - Validación GS1 Modulo-10 (EAN-8, UPC-A, EAN-13, GTIN-14) para descartar
 *   lecturas fantasma cuando la cámara aún está enfocando.
 * - Normalización de variantes (UPC-A ↔ EAN-13 con 0 inicial, GTIN-14 y
 *   bandejas de peso variable 20..29 de supermercado español).
 * - Lectura completa de nombres en español (`product_name_es`), números como
 *   texto o kJ, bebidas 0 kcal (Coca-Cola Zero, agua, infusiones), ración real
 *   del envase (125 g yogur, 330 ml lata, 35 g barrita) y unidad `ml` en bebidas.
 * - Diccionario local de envases aprendidos (`mi-peso:codigos-envase`): cuando
 *   un envase nuevo de Mercadona/marca blanca se rescata con foto de su tabla
 *   nutricional, queda aprendido en el móvil para siempre (0 ms y sin red).
 */

import type { AlimentoBase } from "./alimentos.ts";

const DIRECCION = "https://world.openfoodfacts.org/api/v2/product";
const CAMPOS_OFF = [
  "code",
  "product_name_es",
  "product_name",
  "abbreviated_product_name",
  "generic_name_es",
  "generic_name",
  "brands",
  "quantity",
  "product_quantity",
  "product_quantity_unit",
  "serving_size",
  "serving_quantity",
  "categories_tags",
  "nutriments",
].join(",");

export const CLAVE_CODIGOS_PROPIOS = "mi-peso:codigos-envase";
const MAX_CODIGOS_PROPIOS = 200;
const ESPERA_OFF_MS = 8000;

export type ProductoOFF = {
  code?: unknown;
  product_name_es?: unknown;
  product_name?: unknown;
  abbreviated_product_name?: unknown;
  generic_name_es?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  quantity?: unknown;
  product_quantity?: unknown;
  product_quantity_unit?: unknown;
  serving_size?: unknown;
  serving_quantity?: unknown;
  categories_tags?: unknown;
  nutriments?: Record<string, unknown> | null;
};

export type ResultadoCodigo =
  | { estado: "ok"; alimento: AlimentoBase; origen?: "propio" | "off" }
  | { estado: "no-esta"; codigo: string }
  | { estado: "sin-datos"; codigo: string; nombre: string }
  | { estado: "error"; mensaje: string };

/** Quita espacios, guiones y cualquier carácter no numérico. */
export function limpiarCodigo(codigo: string): string {
  return codigo.replace(/\D/g, "");
}

/** Calcula el dígito de control GS1 Modulo-10 para un prefijo numérico. */
export function calcularDigitoControlGtin(prefijoSinControl: string): number {
  let suma = 0;
  let posicionDesdeDerecha = 1;
  for (let i = prefijoSinControl.length - 1; i >= 0; i -= 1) {
    const digito = prefijoSinControl.charCodeAt(i) - 48;
    if (digito < 0 || digito > 9) return -1;
    suma += digito * (posicionDesdeDerecha % 2 === 1 ? 3 : 1);
    posicionDesdeDerecha += 1;
  }
  return (10 - (suma % 10)) % 10;
}

/**
 * Comprueba si un código de 8, 12, 13 o 14 cifras cumple el dígito de control
 * estándar GS1 (EAN-8, UPC-A, EAN-13, GTIN-14). Evita falsos positivos de cámara.
 */
export function codigoGtinValido(codigo: string): boolean {
  const limpio = limpiarCodigo(codigo);
  if (
    limpio.length !== 8 &&
    limpio.length !== 12 &&
    limpio.length !== 13 &&
    limpio.length !== 14
  ) {
    return false;
  }
  if (/^0+$/.test(limpio)) return false;
  const esperado = calcularDigitoControlGtin(limpio.slice(0, -1));
  const real = limpio.charCodeAt(limpio.length - 1) - 48;
  return esperado >= 0 && esperado === real;
}

/**
 * Extrae el peso en gramos incrustado en códigos EAN-13 de balanza (prefijos
 * españoles 23 y 24: `23PPPPPPGGGGGC`, donde `GGGGG` son gramos).
 */
export function pesoDeCodigoBascula(codigo: string): number | null {
  const limpio = limpiarCodigo(codigo);
  if (limpio.length !== 13 || !/^2[34]/.test(limpio)) return null;
  if (!codigoGtinValido(limpio)) return null;
  const gramos = Number.parseInt(limpio.slice(7, 12), 10);
  return Number.isFinite(gramos) && gramos >= 10 && gramos <= 5000 ? gramos : null;
}

/**
 * Variantes equivalentes de búsqueda para un código de barras:
 * - Código tal cual
 * - Conversión UPC-A (12) ↔ EAN-13 con `0` delante (13) y GTIN-14 (`0` delante)
 * - Bandejas de supermercado de peso/precio variable (`20..29`): código maestro
 *   con las 5 o 4 cifras variables puestas a cero y dígito de control recalculado.
 */
export function variantesCodigo(codigo: string): string[] {
  const limpio = limpiarCodigo(codigo);
  if (limpio.length < 6) return [];

  const lista: string[] = [];
  const meter = (c: string) => {
    if (c.length >= 6 && !lista.includes(c)) lista.push(c);
  };

  meter(limpio);

  if (limpio.length === 12) {
    meter(`0${limpio}`);
  } else if (limpio.length === 13 && limpio.startsWith("0")) {
    meter(limpio.slice(1));
  } else if (limpio.length === 14 && limpio.startsWith("0")) {
    const ean13 = limpio.slice(1);
    meter(ean13);
    if (ean13.startsWith("0")) meter(ean13.slice(1));
  }

  if (limpio.length === 13 && /^2[0-9]/.test(limpio)) {
    const base7 = `${limpio.slice(0, 7)}00000`;
    const d7 = calcularDigitoControlGtin(base7);
    if (d7 >= 0) meter(`${base7}${d7}`);

    const base8 = `${limpio.slice(0, 8)}0000`;
    const d8 = calcularDigitoControlGtin(base8);
    if (d8 >= 0) meter(`${base8}${d8}`);
  }

  return lista;
}

/* ------------------------------------------------------------------ */
/* Diccionario local de envases aprendidos en el móvil                */
/* ------------------------------------------------------------------ */

type MapaCodigosPropios = Record<string, AlimentoBase>;

function esAlimentoGuardado(valor: unknown): valor is AlimentoBase {
  if (!valor || typeof valor !== "object") return false;
  const a = valor as Record<string, unknown>;
  return (
    typeof a.nombre === "string" &&
    a.nombre.trim() !== "" &&
    typeof a.porcion === "string" &&
    typeof a.gramos === "number" &&
    Number.isFinite(a.gramos) &&
    a.gramos > 0 &&
    typeof a.kcal100 === "number" &&
    Number.isFinite(a.kcal100) &&
    a.kcal100 >= 0 &&
    typeof a.p100 === "number" &&
    typeof a.c100 === "number" &&
    typeof a.g100 === "number" &&
    typeof a.categoria === "string"
  );
}

function leerMapaPropio(): MapaCodigosPropios {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const crudo = window.localStorage.getItem(CLAVE_CODIGOS_PROPIOS);
    if (!crudo) return {};
    const json = JSON.parse(crudo) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) return {};
    const limpio: MapaCodigosPropios = {};
    for (const [clave, valor] of Object.entries(json as Record<string, unknown>)) {
      if (/^\d{6,14}$/.test(clave) && esAlimentoGuardado(valor)) {
        limpio[clave] = valor;
      }
    }
    return limpio;
  } catch {
    return {};
  }
}

/** Busca un código (o sus variantes GTIN) en los envases aprendidos del móvil. */
export function leerCodigoPropio(codigo: string): AlimentoBase | null {
  const variantes = variantesCodigo(codigo);
  if (variantes.length === 0) return null;
  const mapa = leerMapaPropio();
  for (const v of variantes) {
    if (mapa[v]) return mapa[v];
  }
  return null;
}

/** Guarda un envase aprendido para que futuros escaneos respondan al instante. */
export function guardarCodigoPropio(codigo: string, alimento: AlimentoBase): void {
  const limpio = limpiarCodigo(codigo);
  if (limpio.length < 6 || limpio.length > 14) return;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const actual = leerMapaPropio();
    // En bandejas de peso variable (pollo, fruta, charcutería al corte) cada
    // bandeja trae otro código porque lleva el peso dentro: se guarda también
    // con el código maestro (peso a cero) para reconocer la próxima bandeja.
    const claves = [limpio];
    if (pesoDeCodigoBascula(limpio) !== null) {
      const base7 = `${limpio.slice(0, 7)}00000`;
      const d7 = calcularDigitoControlGtin(base7);
      if (d7 >= 0) claves.push(`${base7}${d7}`);
    }
    for (const clave of claves) {
      delete actual[clave];
      actual[clave] = alimento;
    }
    const entradas = Object.entries(actual);
    const recortadas =
      entradas.length > MAX_CODIGOS_PROPIOS
        ? entradas.slice(entradas.length - MAX_CODIGOS_PROPIOS)
        : entradas;
    window.localStorage.setItem(
      CLAVE_CODIGOS_PROPIOS,
      JSON.stringify(Object.fromEntries(recortadas)),
    );
  } catch {
    // Modo privado o almacenamiento lleno: funciona igual en la sesión actual.
  }
}

/* ------------------------------------------------------------------ */
/* Lectura y normalización de fichas de Open Food Facts               */
/* ------------------------------------------------------------------ */

function sinAcentosMin(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textoLimpio(valor: unknown): string {
  return typeof valor === "string" ? valor.replace(/\s+/g, " ").trim() : "";
}

/** Convierte número o cadena numérica ("12,5" / "245") en número finito >= 0. */
function leerNumeroNoNegativo(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isFinite(valor) && valor >= 0 ? valor : null;
  }
  if (typeof valor === "string") {
    const limpio = valor.trim().replace(",", ".");
    if (limpio === "") return null;
    const n = Number(limpio);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

function primeroValido(nut: Record<string, unknown>, campos: string[]): number | null {
  for (const campo of campos) {
    if (!(campo in nut)) continue;
    const n = leerNumeroNoNegativo(nut[campo]);
    if (n !== null) return n;
  }
  return null;
}

function redondear1(valor: number | null): number {
  if (valor === null || !Number.isFinite(valor) || valor < 0) return 0;
  return Math.round(valor * 10) / 10;
}

/** Construye un nombre limpio en español sin duplicar la marca («Hacendado»). */
export function armarNombreProducto(producto: ProductoOFF): string {
  const base =
    textoLimpio(producto.product_name_es) ||
    textoLimpio(producto.product_name) ||
    textoLimpio(producto.abbreviated_product_name) ||
    textoLimpio(producto.generic_name_es) ||
    textoLimpio(producto.generic_name);

  const marcaPrincipal = textoLimpio(producto.brands)
    .split(",")[0]
    ?.trim() ?? "";

  if (!base) return marcaPrincipal;
  if (!marcaPrincipal) return base;

  if (sinAcentosMin(base).includes(sinAcentosMin(marcaPrincipal))) {
    return base;
  }
  return `${base} (${marcaPrincipal})`;
}

/** Extrae una cantidad en gramos o mililitros de textos tipo "330 ml", "1 lata (33 cl)", "125g". */
function extraerCantidadDeTexto(
  texto: string,
): { cantidad: number; esLiquido: boolean } | null {
  if (!texto) return null;
  // Si trae paréntesis con peso/volumen explícito, ej. "1 lata (330 ml)" o "2 galletas (28 g)", priorizarlo.
  const entreParentesis = texto.match(/\((\d+(?:[.,]\d+)?)\s*(ml|cl|dl|l|g|gr|gramos|kg)\)/i);
  const general =
    entreParentesis ??
    texto.match(/(?:^|[^\d.,])(\d+(?:[.,]\d+)?)\s*(ml|cl|dl|l|g|gr|gramos|kg)\b/i);
  if (!general) return null;

  const valor = Number(general[1].replace(",", "."));
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const unidad = general[2].toLowerCase();

  if (unidad === "ml") return { cantidad: Math.round(valor), esLiquido: true };
  if (unidad === "cl") return { cantidad: Math.round(valor * 10), esLiquido: true };
  if (unidad === "dl") return { cantidad: Math.round(valor * 100), esLiquido: true };
  if (unidad === "l") return { cantidad: Math.round(valor * 1000), esLiquido: true };
  if (unidad === "kg") return { cantidad: Math.round(valor * 1000), esLiquido: false };
  return { cantidad: Math.round(valor), esLiquido: false };
}

function detectarBebida(producto: ProductoOFF, unidadDetectadaLiquida: boolean): boolean {
  if (unidadDetectadaLiquida) return true;
  const unidadProd = textoLimpio(producto.product_quantity_unit).toLowerCase();
  if (unidadProd === "ml" || unidadProd === "cl" || unidadProd === "l") return true;
  if (Array.isArray(producto.categories_tags)) {
    for (const tag of producto.categories_tags) {
      if (typeof tag === "string" && /(?:beverages|bebidas|drinks|waters|sodas|milks|juices)/i.test(tag)) {
        return true;
      }
    }
  }
  return false;
}

function resolverPorcionYVolumen(
  producto: ProductoOFF,
  pesoBascula: number | null,
): { gramos: number; porcion: string; esBebida: boolean } {
  const textoServing = textoLimpio(producto.serving_size);
  const textoQuantity = textoLimpio(producto.quantity);
  const parsedServing = extraerCantidadDeTexto(textoServing);
  const parsedQuantity = extraerCantidadDeTexto(textoQuantity);
  const esBebida = detectarBebida(
    producto,
    Boolean(parsedServing?.esLiquido || parsedQuantity?.esLiquido),
  );
  const sufijo = esBebida ? "ml" : "g";

  if (pesoBascula !== null) {
    return {
      gramos: pesoBascula,
      porcion: `Envase (${pesoBascula} ${sufijo})`,
      esBebida,
    };
  }

  const numServing = leerNumeroNoNegativo(producto.serving_quantity);
  const gramosServing =
    parsedServing?.cantidad ?? (numServing && numServing > 0 ? Math.round(numServing) : null);

  if (gramosServing !== null && gramosServing >= 5 && gramosServing <= 1000) {
    const etiqueta = textoServing || `${gramosServing} ${sufijo}`;
    return {
      gramos: gramosServing,
      porcion: etiqueta.toLowerCase().includes("ración") ? etiqueta : `1 ración (${etiqueta})`,
      esBebida,
    };
  }

  const numProd = leerNumeroNoNegativo(producto.product_quantity);
  const gramosEnvase =
    parsedQuantity?.cantidad ?? (numProd && numProd > 0 ? Math.round(numProd) : null);

  // Envases individuales típicos (yogur 125 g, lata 330 ml, barrita 35 g, batido 200 ml, lata atún 80 g).
  // Los paquetes familiares de 1 kg o bricks de 1 L (1000) se quedan en 100 g/ml por defecto.
  if (gramosEnvase !== null && gramosEnvase >= 15 && gramosEnvase <= 500) {
    return {
      gramos: gramosEnvase,
      porcion: `1 envase (${gramosEnvase} ${sufijo})`,
      esBebida,
    };
  }

  return {
    gramos: 100,
    porcion: `100 ${sufijo}`,
    esBebida,
  };
}

/**
 * Convierte la ficha cruda de Open Food Facts en un `ResultadoCodigo` listo para
 * la app. Pura y determinista para pruebas unitarias exhaustivas.
 */
export function productoDeOFF(
  producto: ProductoOFF,
  codigoLimpio: string,
  pesoBascula: number | null = null,
): ResultadoCodigo {
  const nombre = armarNombreProducto(producto);
  const nut =
    producto.nutriments && typeof producto.nutriments === "object"
      ? producto.nutriments
      : {};

  const { gramos, porcion, esBebida } = resolverPorcionYVolumen(producto, pesoBascula);

  const pDirecto = primeroValido(nut, ["proteins_100g", "proteins_prepared_100g"]);
  const cDirecto = primeroValido(nut, ["carbohydrates_100g", "carbohydrates_prepared_100g"]);
  const gDirecto = primeroValido(nut, ["fat_100g", "fat_prepared_100g"]);

  // Respaldo por ración si la ficha solo trae nutrientes `_serving`
  const factorServing = gramos > 0 ? 100 / gramos : 1;
  const pServing = primeroValido(nut, ["proteins_serving"]);
  const cServing = primeroValido(nut, ["carbohydrates_serving"]);
  const gServing = primeroValido(nut, ["fat_serving"]);

  const p100 = pDirecto ?? (pServing !== null ? pServing * factorServing : null);
  const c100 = cDirecto ?? (cServing !== null ? cServing * factorServing : null);
  const g100 = gDirecto ?? (gServing !== null ? gServing * factorServing : null);

  let kcal100 = primeroValido(nut, [
    "energy-kcal_100g",
    "energy_kcal_100g",
    "energy-kcal_prepared_100g",
  ]);

  if (kcal100 === null) {
    const kj100 = primeroValido(nut, [
      "energy-kj_100g",
      "energy_kj_100g",
      "energy-kj_prepared_100g",
      "energy_100g",
      "energy_prepared_100g",
    ]);
    if (kj100 !== null) kcal100 = kj100 / 4.184;
  }

  if (kcal100 === null && gramos > 0) {
    const kcalSrv = primeroValido(nut, ["energy-kcal_serving", "energy_kcal_serving"]);
    if (kcalSrv !== null) {
      kcal100 = kcalSrv * factorServing;
    } else {
      const kjSrv = primeroValido(nut, ["energy-kj_serving", "energy_serving"]);
      if (kjSrv !== null) kcal100 = (kjSrv / 4.184) * factorServing;
    }
  }

  const hayAlgunMacro = p100 !== null || c100 !== null || g100 !== null;
  if (kcal100 === null && hayAlgunMacro) {
    const sumaMacros = (p100 ?? 0) * 4 + (c100 ?? 0) * 4 + (g100 ?? 0) * 9;
    // Solo deducir desde macros si hay nutrientes reales (> 0); si alguien subió
    // todos los macros a 0 sin calorías, puede ser una ficha a medio rellenar.
    if (sumaMacros > 0) kcal100 = sumaMacros;
  }

  if (kcal100 === null || !Number.isFinite(kcal100) || kcal100 < 0 || kcal100 > 950) {
    return {
      estado: "sin-datos",
      codigo: codigoLimpio,
      nombre: nombre || "Ese producto",
    };
  }

  return {
    estado: "ok",
    origen: "off",
    alimento: {
      nombre: nombre || `Producto ${codigoLimpio}`,
      porcion,
      gramos,
      kcal100: Math.round(kcal100),
      p100: redondear1(p100),
      c100: redondear1(c100),
      g100: redondear1(g100),
      // Las bebidas llevan categoría "Bebidas" para que toda la app muestre "ml".
      categoria: esBebida ? "Bebidas" : "Del envase",
    },
  };
}

export async function buscarPorCodigo(
  codigo: string,
  opciones?: { pedir?: typeof fetch; senal?: AbortSignal },
): Promise<ResultadoCodigo> {
  const limpio = limpiarCodigo(codigo);
  if (limpio.length < 6) {
    return { estado: "error", mensaje: "Ese código no parece el de un envase." };
  }

  // 1. Memoria instantánea del móvil (envases propios aprendidos, 0 ms y offline)
  const aprendido = leerCodigoPropio(limpio);
  if (aprendido) {
    const pesoBascula = pesoDeCodigoBascula(limpio);
    return {
      estado: "ok",
      origen: "propio",
      alimento:
        pesoBascula !== null
          ? {
              ...aprendido,
              gramos: pesoBascula,
              porcion: `Envase (${pesoBascula} ${aprendido.categoria === "Bebidas" ? "ml" : "g"})`,
            }
          : aprendido,
    };
  }

  // 2. Consulta en Open Food Facts probando variantes GTIN / UPC / balanza
  const pedir = opciones?.pedir ?? fetch;
  const variantes = variantesCodigo(limpio);
  const pesoBascula = pesoDeCodigoBascula(limpio);
  let primerSinDatos: { estado: "sin-datos"; codigo: string; nombre: string } | null = null;

  for (const variante of variantes) {
    let respuesta: Response;
    try {
      const senal = opciones?.senal ?? AbortSignal.timeout(ESPERA_OFF_MS);
      respuesta = await pedir(
        `${DIRECCION}/${variante}.json?lc=es&fields=${CAMPOS_OFF}`,
        {
          headers: { Accept: "application/json" },
          signal: senal,
        },
      );
    } catch {
      return { estado: "error", mensaje: "No he podido conectar. Mira si tienes internet." };
    }

    // En la API v2 de Open Food Facts, un producto inexistente responde HTTP 404
    // con `{ status: 0 }`: NO es caída del servidor, sino «no está en la base».
    if (respuesta.status === 404) {
      continue;
    }

    if (!respuesta.ok) {
      return {
        estado: "error",
        mensaje: "La lista de productos no ha respondido bien. Prueba otra vez.",
      };
    }

    let datos: { status?: number; product?: ProductoOFF };
    try {
      datos = (await respuesta.json()) as { status?: number; product?: ProductoOFF };
    } catch {
      return {
        estado: "error",
        mensaje: "La lista de productos no ha respondido bien. Prueba otra vez.",
      };
    }

    if (datos.status === 0 || !datos.product) {
      continue;
    }

    const convertido = productoDeOFF(datos.product, limpio, pesoBascula);
    if (convertido.estado === "ok") return convertido;
    if (convertido.estado === "sin-datos" && !primerSinDatos) {
      primerSinDatos = convertido;
    }
  }

  if (primerSinDatos) return primerSinDatos;
  return { estado: "no-esta", codigo: limpio };
}
