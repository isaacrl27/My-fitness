import type { Alimento } from "./store.ts";

export type { Alimento };

function unDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Saca el número de una cantidad como «180 g» o «3 unidades». */
function numeroDe(cantidad: string): { valor: number; unidad: string } | null {
  const limpio = cantidad.trim();
  const m = limpio.match(/^([\d.,]+)\s*(.*)$/);
  if (!m) return null;
  const valor = aValor(m[1]);
  return valor === null ? null : { valor, unidad: m[2].trim() };
}

/**
 * Lo que escribió la persona convertido en número, como se escribe aquí.
 *
 * En España el decimal va con coma y los miles con punto: «1,5» es uno y
 * medio y «1.500» son mil quinientos. La propia app guarda los decimales con
 * punto («12.5 g»), así que cuando no hay coma un punto suelto es decimal;
 * solo si seguía el patrón «1.500» (grupos de tres) se quita como miles. Sin
 * coma, cualquier otra cosa se lee tal cual.
 */
function aValor(bruto: string): number | null {
  let texto = bruto.trim().replace(/\s/g, "");
  if (!texto) return null;
  if (texto.includes(",")) {
    // Con coma: la coma es el decimal y los puntos, si los hay, son miles.
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    // Sin coma pero con grupos de tres («1.500»): es un número grande.
    texto = texto.replace(/\./g, "");
  }
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

// Límites del factor, inclusive: por debajo de 0,01 o por encima de 1000 la
// cantidad no es creíble (un «0,0001 g» casi siempre es un cero de más).
const FACTOR_MIN = 0.01;
const FACTOR_MAX = 1000;

/**
 * Reescala un alimento ya anotado a una cantidad nueva, repartiendo las
 * calorías y macros al mismo factor. Si la cantidad nueva no trae unidad, se
 * conserva la vieja («200» sobre «180 g» = «200 g»).
 *
 * Devuelve `null` si no se puede escalar: texto sin número, ni en la cantidad
 * vieja ni en la nueva, o un factor fuera de rango.
 */
export function escalarAlimento(alimento: Alimento, cantidadNueva: string): Alimento | null {
  const viejo = numeroDe(alimento.cantidad);
  const nuevo = numeroDe(cantidadNueva);
  if (!viejo || !nuevo || viejo.valor <= 0) return null;

  const factor = nuevo.valor / viejo.valor;
  if (factor < FACTOR_MIN || factor > FACTOR_MAX) return null;

  const unidad = nuevo.unidad || viejo.unidad;
  const cantidad = unidad ? `${conPunto(nuevo.valor)} ${unidad}` : conPunto(nuevo.valor);

  return {
    ...alimento,
    cantidad,
    kcal: Math.max(1, Math.round(alimento.kcal * factor)),
    proteinas: unDecimal(alimento.proteinas * factor),
    carbohidratos: unDecimal(alimento.carbohidratos * factor),
    grasas: unDecimal(alimento.grasas * factor),
  };
}

/**
 * Reescala un alimento por una fracción directa entre 0.05 y 1.0 (ej. 0.5 para
 * la mitad, 0.75 para tres cuartos). Especial para cuando te dejas comida en
 * el plato tras haber hecho la foto o apuntado la comida.
 */
export function escalarPorFraccion(alimento: Alimento, fraccion: number): Alimento {
  const f = Math.max(0.05, Math.min(1.0, fraccion));
  const viejo = numeroDe(alimento.cantidad);
  let nuevaCantidad = alimento.cantidad;
  if (viejo && viejo.valor > 0) {
    const nuevoValor = Math.round(viejo.valor * f * 10) / 10;
    nuevaCantidad = viejo.unidad ? `${conPunto(nuevoValor)} ${viejo.unidad}` : conPunto(nuevoValor);
  } else {
    const pct = Math.round(f * 100);
    nuevaCantidad = `${alimento.cantidad} (${pct}%)`;
  }
  return {
    ...alimento,
    cantidad: nuevaCantidad,
    kcal: Math.max(1, Math.round(alimento.kcal * f)),
    proteinas: unDecimal(alimento.proteinas * f),
    carbohidratos: unDecimal(alimento.carbohidratos * f),
    grasas: unDecimal(alimento.grasas * f),
  };
}

/** 12.5 -> «12.5»; 200 -> «200». En la cantidad se guarda con punto. */
function conPunto(valor: number): string {
  return valor.toFixed(4).replace(/\.?0+$/, "");
}
