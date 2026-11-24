/**
 * Los puntos: la moneda que la app gana por los buenos días.
 *
 * Cada día bien hecho (comer dentro del plan, llegar a la proteína, el agua,
 * pesarse, los hábitos marcados, los pasos y el sueño del iPhone) suma puntos.
 * El saldo se canjea por un capricho (chill meal): cuesta 500 puntos, regala
 * 600 kcal de margen ese día y no se puede repetir en 5 días. El saldo nunca
 * pasa de 750, así que acumular de más no sirve de nada: hay que seguir
 * rodando y ganándolos.
 *
 * Todo es puro: ni reloj, ni red, ni navegador. Las fechas y los datos
 * entran por parámetros, para poder probarlo sin app y sin dudas.
 */

/** 40 puntos por comer dentro del rango del plan (el capricho ensancha ese rango). */
export const PUNTOS_COMIDA = 40;
/** 25 puntos por llegar a la proteína del día (85 % de la meta). */
export const PUNTOS_PROTEINA = 25;
/** 20 puntos por cumplir la meta de agua del día. */
export const PUNTOS_AGUA = 20;
/** 15 puntos por pesarse: para premiar que se sepa dónde se está. */
export const PUNTOS_PESADA = 15;
/** 5 puntos por cada hábito marcado (los hábitos aún no existen, se enchufan). */
export const PUNTOS_HABITO = 5;
/** Tope de puntos de hábitos al día: equivale a 5 marcas, ni el catálogo grande dispara la hucha. */
export const MAX_PUNTOS_HABITOS_DIA = 25;
/** 10 puntos por llegar a los pasos del día (del iPhone, vía Atajo). */
export const PUNTOS_PASOS = 10;
/** 10 puntos por dormir 7 horas o más (del iPhone, vía Atajo). */
export const PUNTOS_SUENO = 10;
/** Horas de sueño mínimas para cobrar el sueño. Entran cuando el Atajo mande
 * los datos del iPhone; sin datos no cambia nada. */
export const SUENO_MINIMO_HORAS = 7;
/** Lo que cuesta canjear un capricho (chill meal), en puntos. */
export const COSTE_CAPRICHO = 500;
/** Tope del saldo: más allá no se guarda y hay que gastar siguiendo rodando. */
export const TOPE_PUNTOS = 750;
/** Días de espera tras canjear un capricho antes de poder canjear otro. */
export const DIAS_ENFRIAMIENTO = 5;
/** kcal extra que regala el capricho ese día: un margen, no un día libre. */
export const MARGEN_CAPRICHO_KCAL = 600;
/**
 * Cuánto del objetivo hay que comer para que el día cuente.
 *
 * Estaba en el 75 % y premiaba quedarse corto (decisión de Isaac, 31/10/2026):
 * ahora es el 85 %, que es «comer lo que toca» sin exigir el número exacto.
 */
export const MINIMO_KCAL_DEL_DIA = 0.85;

/** Lo que se cuenta de un día para dar sus puntos. */
export type DiaAPuntos = {
  kcalComidas: number;
  kcalObjetivo: number;
  proteinasComidas: number;
  proteinasObjetivo: number;
  aguaL: number;
  metaAguaL: number;
  sePeso: boolean;
  esCapricho: boolean;
  habitosHechos?: number;
  habitosActivos?: number;
  pasos?: number;
  metaPasos?: number;
  suenoHoras?: number;
};

/** Desglose de puntos por apartado, para poder mostrar de dónde salió cada uno. */
export type DesglosePuntos = {
  comida: number;
  proteina: number;
  agua: number;
  pesada: number;
  habitos: number;
  pasos: number;
  sueno: number;
};

/** Los puntos de un día: el total y cómo se reparte. */
export type PuntosDelDia = { total: number; desglose: DesglosePuntos };

/** Quita el ruido decimal en coma flotante (p. ej. 33,1 + 33,2 + 35,7 = 101,99999999999999). */
function limpio(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

/**
 * Los puntos de un solo día.
 *
 * La comida solo da puntos si caes en el rango del plan: tocar al menos el
 * 85 % del objetivo base y no pasarse del tope del día (el 110 % normal, o
 * el 110 % del objetivo con el margen del capricho sumado). El capricho
 * ensancha el tope, pero no regala puntos por sí solo: sin nada anotado ese
 * día no da nada, porque no se gana comiendo de más ni pasando hambre.
 */
export function puntosDelDia(op: DiaAPuntos): PuntosDelDia {
  const topeKcal = limpio(kcalObjetivoDelDia(op.kcalObjetivo, op.esCapricho) * 1.1);
  const kcalComidas = limpio(op.kcalComidas);
  const enRango =
    op.kcalObjetivo > 0 &&
    kcalComidas >= limpio(MINIMO_KCAL_DEL_DIA * op.kcalObjetivo) &&
    kcalComidas <= topeKcal;
  const comida = enRango ? PUNTOS_COMIDA : 0;
  const proteina =
    op.proteinasObjetivo > 0 && limpio(op.proteinasComidas) >= limpio(0.85 * op.proteinasObjetivo)
      ? PUNTOS_PROTEINA
      : 0;
  const agua = op.metaAguaL > 0 && limpio(op.aguaL) >= limpio(op.metaAguaL) ? PUNTOS_AGUA : 0;
  const pesada = op.sePeso ? PUNTOS_PESADA : 0;
  const activos = op.habitosActivos ?? 0;
  // Con el catálogo grande (20-30) los puntos de hábitos se topan en 5 marcas:
  // elegir muchos no debe disparar el saldo ni traer el capricho cada 3 días.
  const habitos =
    activos > 0
      ? Math.min(MAX_PUNTOS_HABITOS_DIA, Math.min(op.habitosHechos ?? 0, activos) * PUNTOS_HABITO)
      : 0;
  const pasos =
    op.pasos !== undefined && (op.metaPasos ?? 0) > 0 && op.pasos >= (op.metaPasos ?? 0)
      ? PUNTOS_PASOS
      : 0;
  const sueno =
    op.suenoHoras !== undefined && limpio(op.suenoHoras) >= SUENO_MINIMO_HORAS ? PUNTOS_SUENO : 0;
  const desglose: DesglosePuntos = { comida, proteina, agua, pesada, habitos, pasos, sueno };
  const total = comida + proteina + agua + pesada + habitos + pasos + sueno;
  return { total, desglose };
}

/**
 * ¿Se ha cumplido el día «a rajatabla»?
 *
 * Exige haber cuadrado los tres pilares de hoy:
 *  1. Comida en el rango saludable del plan.
 *  2. Meta de agua cumplida.
 *  3. Todos los hábitos activos marcados.
 */
export function esDiaARajatabla(op: DiaAPuntos): boolean {
  const topeKcal = limpio(kcalObjetivoDelDia(op.kcalObjetivo, op.esCapricho) * 1.1);
  const kcalComidas = limpio(op.kcalComidas);
  const enRangoComida =
    op.kcalObjetivo > 0 &&
    kcalComidas >= limpio(MINIMO_KCAL_DEL_DIA * op.kcalObjetivo) &&
    kcalComidas <= topeKcal;

  const aguaCumplida = op.metaAguaL > 0 && limpio(op.aguaL) >= limpio(op.metaAguaL);
  const habitosActivos = op.habitosActivos ?? 0;
  const habitosHechos = op.habitosHechos ?? 0;
  const habitosCumplidos = habitosActivos > 0 ? habitosHechos >= habitosActivos : true;

  return enRangoComida && aguaCumplida && habitosCumplidos;
}

/**
 * Las calorías que tocan un día concreto.
 *
 * El capricho no es un día libre: regala un margen extra de 600 kcal ese día
 * para poder disfrutar sin pasarse. Sin objetivo no hay margen que sumar.
 */
export function kcalObjetivoDelDia(kcalObjetivo: number, esCapricho: boolean): number {
  return esCapricho && kcalObjetivo > 0 ? kcalObjetivo + MARGEN_CAPRICHO_KCAL : kcalObjetivo;
}

/** Lo que hace falta para mirar el saldo de puntos de la persona. */
export type DatosPuntos = {
  comidas: { fecha: string; kcal: number; proteinas: number }[];
  aguaLitros: Record<string, number>;
  pesadas: { fecha: string; kg: number }[];
  /** Nº de hábitos marcados cada día (los hábitos aún no existen, se enchufan). */
  habitosHechos?: Record<string, number>;
  /** Pasos y sueño que llegan del iPhone (Atajo → /api/widget), por día. */
  salud?: Record<string, { pasos?: number; suenoHoras?: number }>;
};

/** Los objetivos del día contra los que se puntúa. */
export type ObjetivosPuntos = {
  kcal: number;
  proteinas: number;
  aguaL: number;
  habitosActivos: number;
  /** Pasos al día que quiere dar (sin meta puesta, los pasos no dan puntos). */
  metaPasos?: number;
  esMantenimiento?: boolean;
};

/**
 * El saldo de puntos acumulado, cuánto se ha ganado hoy y si se puede canjear
 * un capricho.
 *
 * Se recorren en orden todos los días con actividad (más los caprichos ya
 * canjeados) y en cada día se aplica el techo de 750 al sumar y el suelo de
 * 0 al restar el capricho de ese día. Así canjar baja el saldo visible y un
 * capricho antiguo sin saldo no se traga los días siguientes. `ganadosHoy`
 * son los puntos brutos de hoy, sin restar caprichos ni aplicar techo.
 */
export function saldoPuntos(
  datos: DatosPuntos,
  objetivos: ObjetivosPuntos,
  caprichos: string[],
  hoy: string,
): { saldo: number; ganadosHoy: number; puedeCanjear: boolean } {
  // Días con actividad: la unión de todo lo anotado y de los caprichos.
  const fechas = new Set<string>();
  for (const c of datos.comidas) fechas.add(c.fecha);
  for (const [fecha, litros] of Object.entries(datos.aguaLitros)) {
    if (litros > 0) fechas.add(fecha);
  }
  for (const p of datos.pesadas) fechas.add(p.fecha);
  for (const [fecha, hechos] of Object.entries(datos.habitosHechos ?? {})) {
    if (hechos > 0) fechas.add(fecha);
  }
  // Los días con pasos o sueño del iPhone también cuentan, aunque no se
  // anotara nada más ese día.
  for (const [fecha, s] of Object.entries(datos.salud ?? {})) {
    if (s.pasos !== undefined || s.suenoHoras !== undefined) fechas.add(fecha);
  }
  for (const c of caprichos) fechas.add(c);

  let saldo = 0;
  let ganadosHoy = 0;
  for (const fecha of [...fechas].sort()) {
    let kcal = 0;
    let proteinas = 0;
    for (const comida of datos.comidas) {
      if (comida.fecha !== fecha) continue;
      kcal += comida.kcal;
      proteinas += comida.proteinas;
    }
    const delDia = puntosDelDia({
      kcalComidas: kcal,
      kcalObjetivo: objetivos.kcal,
      proteinasComidas: proteinas,
      proteinasObjetivo: objetivos.proteinas,
      aguaL: datos.aguaLitros[fecha] ?? 0,
      metaAguaL: objetivos.aguaL,
      sePeso: datos.pesadas.some((p) => p.fecha === fecha),
      esCapricho: caprichos.includes(fecha),
      habitosHechos: datos.habitosHechos?.[fecha],
      habitosActivos: objetivos.habitosActivos,
      pasos: datos.salud?.[fecha]?.pasos,
      suenoHoras: datos.salud?.[fecha]?.suenoHoras,
      metaPasos: objetivos.metaPasos,
    });
    // El techo se aplica al sumar y el suelo al restar el capricho de ese
    // mismo día: así canjar baja la hucha de verdad y un capricho antiguo
    // sin saldo no se traga los días siguientes.
    saldo = Math.min(TOPE_PUNTOS, saldo + delDia.total);
    if (caprichos.includes(fecha)) saldo = Math.max(0, saldo - COSTE_CAPRICHO);
    if (fecha === hoy) ganadosHoy = delDia.total;
  }

  // Enfriamiento: no se puede canjear si algún capricho pasado está a menos
  // de DIAS_ENFRIAMIENTO días de hoy (los del futuro no cuentan).
  const hoyDia = hoy.slice(0, 10);
  const hoyMs = Date.parse(`${hoyDia}T12:00:00Z`);
  const caprichoReciente = !objetivos.esMantenimiento && caprichos.some((c) => {
    const fechaCapricho = c.slice(0, 10);
    if (fechaCapricho > hoyDia) return false;
    const dias = Math.round((hoyMs - Date.parse(`${fechaCapricho}T12:00:00Z`)) / 86400000);
    return Number.isFinite(dias) && dias < DIAS_ENFRIAMIENTO;
  });
  const puedeCanjear = saldo >= COSTE_CAPRICHO && !caprichos.includes(hoy) && !caprichoReciente;
  return { saldo, ganadosHoy, puedeCanjear };
}
