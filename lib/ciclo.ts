/**
 * Motor del Ciclo Menstrual (inspirado en la ciencia y diseño de Flo).
 *
 * Resuelve un problema biológico clave en salud y pérdida de peso:
 * En la fase lútea y durante la regla, los cambios de estrógeno y progesterona
 * provocan una retención de líquidos común de entre 0,5 kg y 2,5 kg, así como
 * un incremento natural del gasto energético y antojos de carbohidratos/dulce.
 *
 * Al entender su fase, las usuarias evitan la frustración con la báscula y
 * adaptan su alimentación y descanso sin culpabilidad.
 */

export type FaseCiclo = "menstruacion" | "folicular" | "ovulacion" | "lutea" | "retraso";

export type SintomaCiclo =
  | "antojos_dulce"
  | "hinchazon"
  | "colicos"
  | "cansancio"
  | "dolor_cabeza"
  | "con_energia"
  | "sensibilidad_pecho";

export type FlujoCiclo = "ninguno" | "ligero" | "medio" | "fuerte";

export type ModoCiclo = "nativo" | "flo";

export type RegistroDiaCiclo = {
  sintomas: SintomaCiclo[];
  flujo?: FlujoCiclo;
  anotado: string;
};

export type DatosCiclo = {
  /** Si la usuaria tiene encendido el seguimiento */
  activo: boolean;
  /** Si prefiere seguimiento propio en My Fitness o sincronizar con Flo */
  modo?: ModoCiclo;
  /** Duración media del ciclo en días (21 a 40, defecto 28) */
  duracionCiclo: number;
  /** Duración media del sangrado en días (3 a 10, defecto 5) */
  duracionRegla: number;
  /** Fecha ISO (YYYY-MM-DD) del primer día del último período registrado */
  fechaUltimaRegla: string;
  /** Registro diario de síntomas y flujo por fecha ISO (YYYY-MM-DD) */
  registroSintomas?: Record<string, RegistroDiaCiclo>;
};

export type EstadoCiclo = {
  diaDelCiclo: number;
  fase: FaseCiclo;
  nombreFase: string;
  colorFase: string; // Clase Tailwind para badge / acentos
  diasParaProximaRegla: number;
  esFaseRetencion: boolean;
  retencionEstimadaKg: string;
  explicacionBascula: string;
  consejoNutricion: string;
  consejoEntreno: string;
  probabilidadEmbarazo: "Baja" | "Media" | "Alta" | "Muy alta" | "No estimable";
  esRetraso?: boolean;
  diasRetraso?: number;
};

export const SINTOMAS_DISPONIBLES: {
  id: SintomaCiclo;
  etiqueta: string;
  emoji: string;
}[] = [
  { id: "antojos_dulce", etiqueta: "Antojo dulce", emoji: "🍫" },
  { id: "hinchazon", etiqueta: "Hinchazón", emoji: "🫧" },
  { id: "colicos", etiqueta: "Cólicos", emoji: "⚡" },
  { id: "cansancio", etiqueta: "Cansancio", emoji: "😴" },
  { id: "dolor_cabeza", etiqueta: "Dolor cabeza", emoji: "🤕" },
  { id: "con_energia", etiqueta: "Con energía", emoji: "✨" },
  { id: "sensibilidad_pecho", etiqueta: "Pecho sensible", emoji: "🌸" },
];

export const FLUJOS_DISPONIBLES: { id: FlujoCiclo; etiqueta: string }[] = [
  { id: "ninguno", etiqueta: "Ninguno" },
  { id: "ligero", etiqueta: "Ligero" },
  { id: "medio", etiqueta: "Medio" },
  { id: "fuerte", etiqueta: "Fuerte" },
];

/** Diferencia en días enteros entre dos fechas ISO (YYYY-MM-DD) segura frente a DST */
export function diasEntreFechas(desdeISO: string, hastaISO: string): number {
  const d1 = new Date(`${desdeISO}T12:00:00`);
  const d2 = new Date(`${hastaISO}T12:00:00`);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / 86400000);
}

/** Devuelve la fecha ISO sumando N días */
export function sumarDiasISO(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  d.setDate(d.getDate() + dias);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Determina si el ciclo menstrual aplica y está activo para la persona.
 * - Para hombres: SIEMPRE false (no aplica biológicamente ni debe mostrarse en la interfaz).
 * - Para mujeres: true a menos que lo hayan desactivado explícitamente en sus ajustes.
 */
export function debeMostrarCiclo(
  sexo?: string | null,
  ciclo?: DatosCiclo | null,
): boolean {
  if (sexo !== "mujer") return false;
  return ciclo?.activo ?? true;
}

/**
 * Calcula el estado actual del ciclo según la fecha de inicio del último
 * período y los parámetros de duración.
 */
export function calcularEstadoCiclo(
  ciclo: DatosCiclo | undefined,
  fechaHoy?: string,
): EstadoCiclo | null {
  if (!ciclo || !ciclo.activo || !ciclo.fechaUltimaRegla) return null;

  const hoy = fechaHoy ?? new Date().toISOString().slice(0, 10);
  const durCiclo = Math.max(21, Math.min(45, ciclo.duracionCiclo || 28));
  const durRegla = Math.max(2, Math.min(10, ciclo.duracionRegla || 5));

  const diffDias = diasEntreFechas(ciclo.fechaUltimaRegla, hoy);
  // Si la fecha última regla es futura o inválida, normalizamos a 0
  const diasCorridos = diffDias >= 0 ? diffDias : 0;

  // Detección de retraso: si han pasado más días que la duración esperada del ciclo,
  // NO hacemos bucle infinito con módulo (error clásico que falsea la ovulación),
  // sino que marcamos retraso explícito para informar a la usuaria.
  const esRetraso = diasCorridos >= durCiclo;
  const diasRetraso = esRetraso ? diasCorridos - durCiclo + 1 : 0;
  const diaDelCiclo = diasCorridos + 1;

  // El día estimado de ovulación ocurre habitualmente 14 días antes del siguiente período
  const diaOvulacion = Math.max(durRegla + 2, durCiclo - 14);

  let fase: FaseCiclo;
  let nombreFase: string;
  let colorFase: string;
  let esFaseRetencion = false;
  let retencionEstimadaKg = "0 kg";
  let explicacionBascula: string;
  let consejoNutricion: string;
  let consejoEntreno: string;
  let probabilidadEmbarazo: "Baja" | "Media" | "Alta" | "Muy alta" | "No estimable" = "Baja";

  if (esRetraso) {
    fase = "retraso";
    nombreFase = diasRetraso === 1 ? "1 día de retraso" : `${diasRetraso} días de retraso`;
    colorFase =
      "text-amber-800 bg-amber-100 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800";
    esFaseRetencion = true;
    retencionEstimadaKg = "+0,5 a 2,0 kg";
    explicacionBascula =
      "Es habitual retener líquidos cuando el período se retrasa por estrés, cambios de rutina o alteraciones hormonales. No te agobies con la báscula.";
    consejoNutricion =
      "Mantén una hidratación abundante, descanso y comidas digestivas. Si ya te ha bajado la regla hoy, márcalo para reiniciar tu ciclo.";
    consejoEntreno =
      "Prioriza ejercicio de intensidad moderada, paseos al aire libre y descanso reparador.";
    probabilidadEmbarazo = "No estimable";
  } else if (diaDelCiclo <= durRegla) {
    fase = "menstruacion";
    nombreFase = "Menstruación";
    colorFase = "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
    esFaseRetencion = true;
    retencionEstimadaKg = "+0,5 a 1,5 kg";
    explicacionBascula =
      "Retención de líquidos fisiológica común. A partir del día 3 suele remitir. No juzgues tu progreso por el número de hoy.";
    consejoNutricion =
      "Prioriza alimentos ricos en hierro (espinacas, legumbres, carnes magras) y caldos templados para reponer minerales.";
    consejoEntreno =
      "Entrena suave: estiramientos, paseos o yoga. Escucha a tu cuerpo si sientes fatiga o cólicos.";
    probabilidadEmbarazo = "Baja";
  } else if (diaDelCiclo < diaOvulacion - 2) {
    fase = "folicular";
    nombreFase = "Fase Folicular";
    colorFase = "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
    esFaseRetencion = false;
    retencionEstimadaKg = "0 kg";
    explicacionBascula =
      "Tu peso en báscula es muy fiable ahora. La retención hídrica está en mínimos y tu sensibilidad a la insulina es óptima.";
    consejoNutricion =
      "Momento idóneo para alimentos ricos en carbohidratos complejos y proteína. El cuerpo utiliza el glucógeno con máxima eficiencia.";
    consejoEntreno =
      "Pico de energía y fuerza: excelente fase para entrenamientos intensos de fuerza y batir marcas.";
    probabilidadEmbarazo = "Media";
  } else if (diaDelCiclo <= diaOvulacion + 1) {
    fase = "ovulacion";
    nombreFase = "Ovulación";
    colorFase = "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
    esFaseRetencion = false;
    retencionEstimadaKg = "0 a +0,4 kg";
    explicacionBascula =
      "Máximo pico de estrógenos. Puede haber una ligera hinchazón pélvica pasajera de 24-48 horas.";
    consejoNutricion =
      "Mantén buena hidratación y fibra para evitar sensación de pesadez.";
    consejoEntreno =
      "Nivel de motivación y resistencia en su punto más alto. Aprovéchalo en tus rutinas de ejercicios.";
    probabilidadEmbarazo = "Muy alta";
  } else {
    fase = "lutea";
    nombreFase = "Fase Lútea";
    colorFase = "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
    esFaseRetencion = true;
    retencionEstimadaKg = "+0,8 a 2,0 kg";
    explicacionBascula =
      "La progesterona sube: el cuerpo retiene de 1 a 2 kg de agua y aumenta la temperatura basal. Tu pérdida de grasa sigue intacta aunque la báscula suba.";
    consejoNutricion =
      "Tu gasto calórico en reposo aumenta ~100-200 kcal. Es normal tener más apetito: elige snacks con proteína y fibra (yogur griego, cacao puro, frutos secos) para calmar antojos.";
    consejoEntreno =
      "Buena fase para cardio constante y fuerza moderada. Si sientes hinchazón, prioriza paseos ligeros y descanso adecuado.";
    probabilidadEmbarazo = "Baja";
  }

  const diasParaProximaRegla = esRetraso ? 0 : durCiclo - diaDelCiclo + 1;

  return {
    diaDelCiclo,
    fase,
    nombreFase,
    colorFase,
    diasParaProximaRegla: diasParaProximaRegla > 0 ? diasParaProximaRegla : 0,
    esFaseRetencion,
    retencionEstimadaKg,
    explicacionBascula,
    consejoNutricion,
    consejoEntreno,
    probabilidadEmbarazo,
    esRetraso,
    diasRetraso,
  };
}

/** Configuración por defecto para una mujer que activa Flo por primera vez */
export function cicloPorDefecto(fechaHoy?: string): DatosCiclo {
  const hoy = fechaHoy ?? new Date().toISOString().slice(0, 10);
  // Se estima por defecto el último período hace 14 días (mitad de ciclo estándar de 28)
  const hace14Dias = sumarDiasISO(hoy, -14);
  return {
    activo: true,
    duracionCiclo: 28,
    duracionRegla: 5,
    fechaUltimaRegla: hace14Dias,
    registroSintomas: {},
  };
}
