import type { Comida, Datos, Gusto, Pesada } from "./store";

/**
 * Preparación diferencial de la subida a la nube (`POST /api/nube`).
 *
 * Antes cada toque de agua o hábito serializaba y enviaba todas las comidas,
 * pesadas, días de agua y gustos desde el primer día que se instaló la app
 * (cientos de filas repetidas en cada sincronización, hasta chocar con el
 * límite de 64 KB de `fetch keepalive` o el de 512 KB del servidor).
 *
 * Cuando el móvil ya conoce la última foto confirmada por la nube (`base`),
 * solo viajan las filas añadidas o modificadas desde entonces, más el perfil
 * ligero (que lleva las lápidas `borrados` para eliminar lo quitado) y la
 * lista completa de ids de `comidasCapricho`.
 */

export type CargaSubida = {
  /** Datos listos para enviar (con tablas filtradas si `diferencial` es `true`). */
  datos: Datos;
  /** Todos los ids de comidas de capricho vivas en el móvil. */
  comidasCapricho: string[];
  /** Fechas de `saludDiaria` añadidas o modificadas respecto a `base`. */
  saludViva: string[];
  /** `true` si solo viajan las diferencias respecto a `base`. */
  diferencial: boolean;
};

function huellaComida(comida: Comida): string {
  return JSON.stringify({
    fecha: comida.fecha,
    tipo: comida.tipo,
    capricho: comida.capricho === true,
    alimentos: comida.alimentos,
  });
}

function huellaSaludDia(dia?: { pasos?: number; suenoHoras?: number }): string {
  if (!dia) return "";
  return `${dia.pasos ?? ""}:${dia.suenoHoras ?? ""}`;
}

/**
 * Calcula qué filas hay que subir a `/api/nube` comparando `actual` con la
 * última foto confirmada en la nube (`base`). Si `base` es `null`, envía todo.
 */
export function prepararCargaSubida(actual: Datos, base: Datos | null): CargaSubida {
  const comidasCapricho = actual.comidas.filter((c) => c.capricho === true).map((c) => c.id);

  if (!base) {
    return {
      datos: actual,
      comidasCapricho,
      saludViva: Object.keys(actual.saludDiaria ?? {}),
      diferencial: false,
    };
  }

  const pesadasBase = new Map<string, number>();
  for (const p of base.pesadas) pesadasBase.set(p.fecha, p.kg);
  const pesadas: Pesada[] = actual.pesadas.filter((p) => pesadasBase.get(p.fecha) !== p.kg);

  const comidasBase = new Map<string, string>();
  for (const c of base.comidas) comidasBase.set(c.id, huellaComida(c));
  const comidas: Comida[] = actual.comidas.filter((c) => comidasBase.get(c.id) !== huellaComida(c));

  const aguaLitros: Record<string, number> = {};
  for (const [fecha, litros] of Object.entries(actual.aguaLitros)) {
    if (base.aguaLitros[fecha] !== litros) {
      aguaLitros[fecha] = litros;
    }
  }

  const gustos: Record<string, Gusto> = {};
  for (const [ingrediente, valor] of Object.entries(actual.gustos)) {
    if (base.gustos[ingrediente] !== valor) {
      gustos[ingrediente] = valor;
    }
  }

  const saludViva: string[] = [];
  for (const [fecha, dia] of Object.entries(actual.saludDiaria ?? {})) {
    if (huellaSaludDia(base.saludDiaria?.[fecha]) !== huellaSaludDia(dia)) {
      saludViva.push(fecha);
    }
  }

  return {
    datos: {
      ...actual,
      pesadas,
      comidas,
      aguaLitros,
      gustos,
    },
    comidasCapricho,
    saludViva,
    diferencial: true,
  };
}
