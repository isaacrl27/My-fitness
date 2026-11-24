import type { AlimentoBase } from "./alimentos";
import type { Alimento, Comida, TipoComida } from "./store";

export type ComidaAyerResumen = {
  fecha: string;
  alimentos: Alimento[];
  totalKcal: number;
  resumen: string;
};

export type RecienteSugerido = {
  alimento: Alimento;
  mismaFranja: boolean;
};

export type AvisoCoccion = {
  tipo: "cocido" | "seco";
  mensaje: string;
  etiquetaBoton?: string;
  factorDesdeCrudo?: number;
};

export type MediaSemanal = {
  mediaKcal: number;
  diasConDatos: number;
  diferencia: number;
  estado: "en_rango" | "bajo" | "alto";
};

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resta `dias` días calendario a una fecha ISO YYYY-MM-DD (sin derivas UTC). */
export function desplazarFechaISO(fechaISO: string, deltaDias: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaISO.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + deltaDias);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Convierte un alimento ya guardado en el historial en `{ base, gramos }` reutilizable en HojaAnadir. */
export function alimentoBaseDesdeGuardado(a: Alimento): { base: AlimentoBase; gramos: number } {
  const m = /^([\d.,]+)\s*(g|gr|gramos?|ml)\b/i.exec((a.cantidad ?? "").trim());
  const esMl = m ? m[2].toLowerCase() === "ml" : false;
  const num = m ? Number(m[1].replace(",", ".")) : NaN;
  const gramos = Number.isFinite(num) && num >= 1 && num <= 3000 ? Math.round(num) : 100;
  const factor = 100 / gramos;

  const base: AlimentoBase = {
    nombre: a.nombre,
    categoria: esMl ? "Bebidas" : "Recientes",
    porcion: a.cantidad || "1 ración",
    gramos,
    kcal100: Math.max(0, Math.round(a.kcal * factor * 10) / 10),
    p100: Math.max(0, Math.round(a.proteinas * factor * 10) / 10),
    c100: Math.max(0, Math.round(a.carbohidratos * factor * 10) / 10),
    g100: Math.max(0, Math.round(a.grasas * factor * 10) / 10),
  };
  return { base, gramos };
}

/** Comida de ayer en la misma franja (`desayuno`, `comida`, `cena`, `snack`) para repetir en 1 toque. */
export function comidaDeAyerParaFranja(
  comidas: Comida[],
  fechaDestino: string,
  tipo: TipoComida,
): ComidaAyerResumen | null {
  const ayer = desplazarFechaISO(fechaDestino, -1);
  if (!ayer) return null;

  const delTurno = comidas.filter((c) => !c.capricho && c.fecha === ayer && c.tipo === tipo);
  const alimentos = delTurno.flatMap((c) => c.alimentos).filter((a) => a.kcal >= 0 && a.nombre.trim() !== "");
  if (alimentos.length === 0) return null;

  const totalKcal = Math.round(alimentos.reduce((s, a) => s + a.kcal, 0));
  const nombres = alimentos.map((a) => a.nombre);
  const resumen =
    nombres.length <= 2
      ? nombres.join(" + ")
      : `${nombres.slice(0, 2).join(" + ")} (+${nombres.length - 2})`;

  return { fecha: ayer, alimentos, totalKcal, resumen };
}

/** Últimos alimentos usados por el usuario, priorizando la franja actual (`tipo`). */
export function recientesParaFranja(
  comidas: Comida[],
  tipo: TipoComida,
  tope = 8,
): RecienteSugerido[] {
  const ordenadas = comidas
    .filter((c) => !c.capricho && c.alimentos.length > 0)
    .map((c, idx) => ({ c, idx }))
    .sort((a, b) => {
      if (a.c.fecha !== b.c.fecha) return b.c.fecha.localeCompare(a.c.fecha);
      return b.idx - a.idx;
    })
    .map((x) => x.c);

  const vistos = new Set<string>();
  const misma: RecienteSugerido[] = [];
  const otras: RecienteSugerido[] = [];

  for (const comida of ordenadas) {
    const esMisma = comida.tipo === tipo;
    for (const alimento of comida.alimentos) {
      const nombreLimpio = normalizarTexto(alimento.nombre);
      if (!nombreLimpio || alimento.kcal <= 0) continue;
      const clave = `${nombreLimpio}|${normalizarTexto(alimento.cantidad || "")}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const item: RecienteSugerido = { alimento, mismaFranja: esMisma };
      if (esMisma) misma.push(item);
      else otras.push(item);
    }
  }

  return [...misma, ...otras].slice(0, Math.max(1, tope));
}

/** Construye un alimento rápido (`Quick Add`) solo con calorías y nombre/proteína opcionales. */
export function crearBaseCaloriasRapidas(entrada: {
  kcal: number;
  nombre?: string;
  proteinas?: number;
}): { base: AlimentoBase; gramos: number } | null {
  const kcal = Math.round(Number(entrada.kcal));
  if (!Number.isFinite(kcal) || kcal < 1 || kcal > 5000) return null;

  const protRaw = Number(entrada.proteinas ?? 0);
  const proteinas =
    Number.isFinite(protRaw) && protRaw > 0 ? Math.min(300, Math.round(protRaw * 10) / 10) : 0;

  const nombre = (entrada.nombre ?? "").trim().slice(0, 60) || "Comida rápida";

  return {
    base: {
      nombre,
      categoria: "Rápida",
      porcion: "1 ración",
      gramos: 100,
      kcal100: kcal,
      p100: proteinas,
      c100: 0,
      g100: 0,
    },
    gramos: 100,
  };
}

/** Detecta alimentos donde confundir peso en crudo vs cocido distorsiona mucho las calorías. */
export function avisoCrudoCocido(nombreAlimento: string): AvisoCoccion | null {
  const n = normalizarTexto(nombreAlimento);
  if (!n) return null;

  if (n.includes("arroz") && n.includes("cocid")) {
    return {
      tipo: "cocido",
      mensaje: "Medido ya cocido (100 g en crudo ≈ 270 g cocido).",
      etiquetaBoton: "Lo pesé en crudo",
      factorDesdeCrudo: 2.7,
    };
  }
  if ((n.includes("pasta") || n.includes("macarron") || n.includes("espagueti")) && n.includes("cocid")) {
    return {
      tipo: "cocido",
      mensaje: "Medido ya cocido (100 g en crudo ≈ 230 g cocida).",
      etiquetaBoton: "La pesé en crudo",
      factorDesdeCrudo: 2.3,
    };
  }
  if ((n.includes("lenteja") || n.includes("garbanzo") || n.includes("alubia") || n.includes("judia")) && n.includes("cocid")) {
    return {
      tipo: "cocido",
      mensaje: "Medido ya cocido (100 g secas ≈ 250 g cocidas).",
      etiquetaBoton: "Las pesé en seco",
      factorDesdeCrudo: 2.5,
    };
  }
  if (n.includes("quinoa") && n.includes("cocid")) {
    return {
      tipo: "cocido",
      mensaje: "Medido ya cocido (100 g en crudo ≈ 260 g cocida).",
      etiquetaBoton: "La pesé en crudo",
      factorDesdeCrudo: 2.6,
    };
  }
  if (n.includes("pechuga") && n.includes("plancha")) {
    return {
      tipo: "cocido",
      mensaje: "Medido ya cocinado a la plancha (en crudo merma un ~25 %).",
      etiquetaBoton: "Lo pesé en crudo",
      factorDesdeCrudo: 0.75,
    };
  }
  if (n.includes("avena") && n.includes("copo")) {
    return {
      tipo: "seco",
      mensaje: "Medido en seco (antes de añadir leche o agua).",
    };
  }
  return null;
}

/** Media diaria real de los últimos 7 días con registro (enfoque sin culpa, sin contar días vacíos). */
export function mediaSemanalCalorias(
  comidas: Comida[],
  fechaHasta: string,
  objetivoKcal: number,
): MediaSemanal | null {
  const inicio = desplazarFechaISO(fechaHasta, -6);
  if (!inicio || !Number.isFinite(objetivoKcal) || objetivoKcal <= 0) return null;

  const totalesPorDia = new Map<string, number>();
  for (const c of comidas) {
    if (c.capricho) continue;
    if (c.fecha < inicio || c.fecha > fechaHasta) continue;
    const sumaComida = c.alimentos.reduce((s, a) => s + a.kcal, 0);
    if (sumaComida <= 0) continue;
    totalesPorDia.set(c.fecha, (totalesPorDia.get(c.fecha) ?? 0) + sumaComida);
  }

  const dias = [...totalesPorDia.values()];
  if (dias.length < 2) return null;

  const mediaKcal = Math.round(dias.reduce((s, k) => s + k, 0) / dias.length);
  const diferencia = mediaKcal - Math.round(objetivoKcal);
  const estado: MediaSemanal["estado"] =
    Math.abs(diferencia) <= 120 ? "en_rango" : diferencia < 0 ? "bajo" : "alto";

  return { mediaKcal, diasConDatos: dias.length, diferencia, estado };
}
