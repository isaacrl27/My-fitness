/**
 * Los números de la app: gasto diario, objetivo de calorías, macros y tendencia.
 *
 * Las fórmulas son públicas (Mifflin-St Jeor para el metabolismo basal y el
 * equivalente calórico de la grasa) — no se copia nada de ninguna app.
 */

export type Sexo = "hombre" | "mujer";

export type Actividad = "sedentario" | "ligero" | "moderado" | "alto" | "muy-alto";

/**
 * Qué quiere conseguir la persona con su peso.
 *
 * «Recomposición» es perder grasa poco a poco comiendo casi lo que gastas, y
 * «volumen limpio» es subir despacio para ganar músculo sin coger grasa.
 */
export type Objetivo = "adelgazar" | "mantener" | "subir" | "recomposicion" | "volumen-limpio";

export type OpcionActividad = {
  valor: Actividad;
  etiqueta: string;
  ayuda: string;
  factor: number;
};

/** Niveles de actividad, con el multiplicador que se aplica al metabolismo basal. */
export const ACTIVIDADES: OpcionActividad[] = [
  {
    valor: "sedentario",
    etiqueta: "Sedentario",
    ayuda: "Trabajo de mesa, sin ejercicio",
    factor: 1.2,
  },
  {
    valor: "ligero",
    etiqueta: "Ligero",
    ayuda: "Ejercicio 1 o 2 días por semana",
    factor: 1.375,
  },
  {
    valor: "moderado",
    etiqueta: "Moderado",
    ayuda: "Ejercicio 3 a 5 días por semana",
    factor: 1.55,
  },
  {
    valor: "alto",
    etiqueta: "Alto",
    ayuda: "Ejercicio 6 o 7 días por semana",
    factor: 1.725,
  },
  {
    valor: "muy-alto",
    etiqueta: "Muy alto",
    ayuda: "Trabajo físico o dos entrenos al día",
    factor: 1.9,
  },
];

/**
 * La meta de pasos que se propone al crear la cuenta, según lo que se dijo
 * de moverse. Son números de andar cómodo (la franja que salen las guías de
 * salud), no de esfuerzo: 5.000 es un día de escritorio; 14.000, quien está
 * corriendo o fisgoneando todo el piso. En el cuestionario se pueden
 * cambiar con toques, y luego desde Ajustes.
 */
export function pasosSugeridos(actividad: Actividad): number {
  switch (actividad) {
    case "sedentario":
      return 5000;
    case "ligero":
      return 8000;
    case "moderado":
      return 10000;
    case "alto":
      return 12000;
    case "muy-alto":
      return 14000;
    default:
      return 8000;
  }
}

export type OpcionRitmo = { valor: number; etiqueta: string; ayuda: string };

/** Ritmos de bajada de peso. El de 1 kg o más por semana se avisa como agresivo. */
export const RITMOS: OpcionRitmo[] = [
  { valor: 0.25, etiqueta: "Suave", ayuda: "0,25 kg por semana. Casi no se nota." },
  { valor: 0.5, etiqueta: "Normal", ayuda: "0,5 kg por semana. El ritmo recomendado." },
  { valor: 0.75, etiqueta: "Rápido", ayuda: "0,75 kg por semana. Cuesta más mantenerlo." },
];

/**
 * Los ritmos que se pueden elegir según lo que quiera hacer la persona.
 *
 * Adelgazar trae los de siempre tal cual. Subir usa los mismos números, pero
 * escrito en positivo. Mantener solo trae una opción: no mover el peso.
 * Recomposición y volumen limpio tienen sus propios números, más suaves: son
 * cambios lentos, sin pasar hambre y sin coger grasa de más.
 */
export function ritmosPara(objetivo: Objetivo): OpcionRitmo[] {
  if (objetivo === "mantener") {
    return [
      { valor: 0, etiqueta: "Mantener", ayuda: "Ni subir ni bajar: comer lo que gastas." },
    ];
  }
  if (objetivo === "subir") {
    return RITMOS.map((r) => ({
      valor: r.valor,
      etiqueta: `Subir ${conComaSinCeros(r.valor)} kg por semana`,
      ayuda: `Coger peso poco a poco, ${conComaSinCeros(r.valor)} kg por semana.`,
    }));
  }
  if (objetivo === "recomposicion") {
    return [
      {
        valor: 0.25,
        etiqueta: "Suave",
        ayuda: "0,25 kg por semana. Perder grasa despacio sin perder músculo.",
      },
    ];
  }
  if (objetivo === "volumen-limpio") {
    return [
      {
        valor: 0.15,
        etiqueta: "Muy suave",
        ayuda: "0,15 kg por semana. Ganar músculo sin engordar.",
      },
      {
        valor: 0.25,
        etiqueta: "Suave",
        ayuda: "0,25 kg por semana. Ganar músculo sin engordar.",
      },
    ];
  }
  return RITMOS;
}

/** Energía que hay en un kilo de grasa corporal (kcal). */
export const KCAL_POR_KG = 7700;

/** Ningún plan baja de aquí sin avisar: por debajo no es seguro comer así. */
export const KCAL_MINIMAS = 1200;

/** Límites físicos y clínicos de peso (kg), altura (cm) e IMC mínimo para adelgazar. */
export const PESO_MIN_KG = 30;
export const PESO_MAX_KG = 300;
export const ALTURA_MIN_CM = 100;
export const ALTURA_MAX_CM = 250;
export const IMC_MIN_ADELGAZAR = 18.5;

/** Peso mínimo saludable (IMC 18,5 OMS) para una altura dada, redondeado a 0,1 kg hacia arriba. */
export function pesoMinimoSaludableKg(alturaCm: number): number {
  if (!Number.isFinite(alturaCm) || alturaCm <= 0) return PESO_MIN_KG;
  const metros = alturaCm / 100;
  return Math.ceil(IMC_MIN_ADELGAZAR * metros * metros * 10) / 10;
}

/**
 * Comprueba si el peso objetivo es seguro y coherente con el objetivo elegido:
 *  - Dentro de los límites físicos (`minKg`..`PESO_MAX_KG`).
 *  - Mayor que el peso actual si quiere subir; menor si quiere adelgazar.
 *  - Al adelgazar, nunca por debajo del umbral clínico de bajo peso (IMC 18,5).
 */
export function validarPesoObjetivo(op: {
  pesoActualKg: number;
  pesoObjetivoKg: number;
  alturaCm?: number;
  objetivo: Objetivo;
  minKg?: number;
}): { ok: true } | { ok: false; motivo: string } {
  const minKg = op.minKg ?? PESO_MIN_KG;
  if (
    !Number.isFinite(op.pesoObjetivoKg) ||
    op.pesoObjetivoKg < minKg ||
    op.pesoObjetivoKg > PESO_MAX_KG
  ) {
    return {
      ok: false,
      motivo: `Escribe un peso entre ${minKg} y ${PESO_MAX_KG} kg.`,
    };
  }
  const quiereSubir = op.objetivo === "subir" || op.objetivo === "volumen-limpio";
  if (quiereSubir && op.pesoObjetivoKg <= op.pesoActualKg) {
    return {
      ok: false,
      motivo: "Si quieres subir, el objetivo tiene que ser mayor que tu peso de ahora.",
    };
  }
  const quiereBajar = op.objetivo === "adelgazar" || op.objetivo === "recomposicion";
  if (quiereBajar) {
    if (op.pesoObjetivoKg >= op.pesoActualKg) {
      return {
        ok: false,
        motivo: "Para bajar grasa, el objetivo tiene que ser menor que tu peso de ahora.",
      };
    }
    if (
      op.alturaCm &&
      op.alturaCm >= ALTURA_MIN_CM &&
      imc(op.pesoObjetivoKg, op.alturaCm) < IMC_MIN_ADELGAZAR
    ) {
      const minimo = Math.max(minKg, pesoMinimoSaludableKg(op.alturaCm));
      if (op.pesoActualKg <= minimo) {
        return {
          ok: false,
          motivo: `Con tu altura ya estás cerca del límite de bajo peso (${conComa(minimo)} kg): elige Mantenerme o Subir de peso.`,
        };
      }
      return {
        ok: false,
        motivo: `Bajar hasta ahí te dejaría con bajo peso para tu altura (mínimo saludable: ${conComa(minimo)} kg).`,
      };
    }
  }
  return { ok: true };
}

/** Años cumplidos a día de hoy. Devuelve 0 si la fecha no vale. */
export function edad(fechaNacimiento: string, hoy: Date = new Date()): number {
  if (!fechaNacimiento) return 0;
  const limpio = fechaNacimiento.trim();
  // Anclado al mediodía local cuando viene en YYYY-MM-DD: `new Date("1998-04-12")`
  // interpreta medianoche UTC y en husos al oeste desplazaba el cumpleaños un día.
  const nace = /^\d{4}-\d{2}-\d{2}$/.test(limpio)
    ? new Date(`${limpio}T12:00:00`)
    : new Date(limpio);
  if (Number.isNaN(nace.getTime())) return 0;
  let anios = hoy.getFullYear() - nace.getFullYear();
  const mes = hoy.getMonth() - nace.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nace.getDate())) anios -= 1;
  return Math.max(0, anios);
}

/** Metabolismo basal (Mifflin-St Jeor), en kcal al día. */
export function metabolismoBasal(
  pesoKg: number,
  alturaCm: number,
  anios: number,
  sexo: Sexo,
): number {
  if (
    !Number.isFinite(pesoKg) ||
    !Number.isFinite(alturaCm) ||
    !Number.isFinite(anios) ||
    pesoKg <= 0 ||
    alturaCm <= 0 ||
    anios < 0
  ) {
    return 0;
  }
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * anios;
  return sexo === "hombre" ? base + 5 : base - 161;
}

/** Multiplicador del nivel de actividad. */
export function factorActividad(actividad: Actividad): number {
  return ACTIVIDADES.find((a) => a.valor === actividad)?.factor ?? 1.2;
}

/** Gasto diario estimado: lo que quemas en un día normal. */
export function gastoDiario(
  pesoKg: number,
  alturaCm: number,
  anios: number,
  sexo: Sexo,
  actividad: Actividad,
): number {
  return metabolismoBasal(pesoKg, alturaCm, anios, sexo) * factorActividad(actividad);
}

/**
 * La meta de calorías se trabaja en múltiplos de 10: así el cuestionario, Hoy
 * y el Plan enseñan el mismo número, y un plato del propio plan no «se pasa»
 * por 1 kcal de redondeo. El plan de comidas ya está cuadrado a decenas.
 */
export function kcalRedondeadas(kcal: number): number {
  return Math.round(kcal / 10) * 10;
}

/**
 * Calorías al día según lo que se quiera hacer con el peso.
 *
 * Adelgazar quita energía (para bajar), subir añade (para coger peso) y
 * mantener deja el gasto tal cual. Recomposición resta, como adelgazar (se
 * pierde grasa despacio), y volumen limpio suma, como subir. El cambio sale
 * de repartir la energía de la grasa entre los 7 días. Nunca baja de las
 * calorías mínimas.
 */
export function objetivoCalorico(
  gasto: number,
  ritmoKgSemana: number,
  objetivo: Objetivo = "adelgazar",
): number {
  const cambio = (ritmoKgSemana * KCAL_POR_KG) / 7;
  // Volumen limpio suma, como subir; recomposición resta, como adelgazar.
  const suma = objetivo === "subir" || objetivo === "volumen-limpio";
  const calorias =
    suma ? gasto + cambio
    : objetivo === "mantener" ? gasto
    : gasto - cambio;
  return Math.max(KCAL_MINIMAS, Math.round(calorias));
}

export type Macros = { proteinas: number; carbohidratos: number; grasas: number };

/**
 * Reparto de macros: proteína y grasa por kilo de peso, y el resto en
 * carbohidratos. Es el reparto que recomienda la evidencia para no perder
 * músculo mientras bajas.
 *
 * Con mucho peso y pocas calorías, la proteína y la grasa se comían el plan
 * entero (110 kg y 1.500 kcal daban 1.672 kcal antes de contar hidratos, así
 * que los hidratos quedaban a cero). Cuando eso pasa, las dos se recortan en
 * la misma proporción hasta dejar libre el 15 % de las calorías: un plan sin
 * hidratos no se aguanta ni una semana.
 */
export function macrosDiarios(kcal: number, pesoKg: number): Macros {
  const kcalSeguras = Number.isFinite(kcal) ? Math.max(0, kcal) : 0;
  const pesoSeguro = Number.isFinite(pesoKg) ? Math.max(0, pesoKg) : 0;
  // Suelo estricto del 15% de hidratos para evitar fatiga/cetosis involuntaria
  const minCarbosGramos = Math.ceil((kcalSeguras * 0.15) / 4);
  const minCarbosKcal = minCarbosGramos * 4;
  const topeProteinaGrasa = Math.max(0, kcalSeguras - minCarbosKcal);

  const proteinasBase = Math.round(pesoSeguro * 2);
  const grasasBase = Math.round(pesoSeguro * 0.8);
  const kcalProteinaGrasa = proteinasBase * 4 + grasasBase * 9;

  let proteinas = proteinasBase;
  let grasas = grasasBase;

  if (kcalProteinaGrasa > topeProteinaGrasa && kcalProteinaGrasa > 0) {
    const ajuste = topeProteinaGrasa / kcalProteinaGrasa;
    proteinas = Math.floor(proteinasBase * ajuste);
    grasas = Math.floor(grasasBase * ajuste);
  }

  const sobrante = Math.max(0, kcalSeguras - proteinas * 4 - grasas * 9);
  let carbohidratos = Math.max(minCarbosGramos, Math.floor(sobrante / 4));

  if (proteinas * 4 + grasas * 9 + carbohidratos * 4 > kcalSeguras) {
    carbohidratos = Math.max(minCarbosGramos, Math.floor((kcalSeguras - proteinas * 4 - grasas * 9) / 4));
  }

  return { proteinas, grasas, carbohidratos };
}

/** Índice de masa corporal. */
export function imc(pesoKg: number, alturaCm: number): number {
  if (!Number.isFinite(pesoKg) || !Number.isFinite(alturaCm) || pesoKg <= 0 || alturaCm <= 0) {
    return 0;
  }
  const metros = alturaCm / 100;
  return pesoKg / (metros * metros);
}

/** Cómo se lee el IMC, en palabras. */
export function clasificacionImc(valor: number): string {
  if (valor <= 0) return "Sin datos";
  if (valor < 18.5) return "Por debajo de lo normal";
  if (valor < 25) return "Normal";
  if (valor < 30) return "Algo por encima";
  return "Bastante por encima";
}

/**
 * Tendencia del peso: media móvil. Suaviza los picos de un día suelto
 * (agua, sal, pesarse por la noche) para ver la dirección de verdad.
 */
export function tendencia(pesos: number[], ventana: number = 7): number[] {
  if (ventana < 1) return [...pesos];
  return pesos.map((_, i) => {
    const desde = Math.max(0, i - ventana + 1);
    const trozo = pesos.slice(desde, i + 1);
    return trozo.reduce((a, b) => a + b, 0) / trozo.length;
  });
}

/** El peso de referencia de hoy: media de las pesadas de los últimos 7 días
 * naturales contados desde la última pesada. Quien se pesa una vez por
 * semana no mezcla el peso de hoy con el de hace mes y medio. */
export function pesoSuavizado(pesadas: { fecha: string; kg: number }[]): number | null {
  if (pesadas.length === 0) return null;
  const ordenadas = [...pesadas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultima = ordenadas[ordenadas.length - 1];
  const recientes = ordenadas.filter((p) => diasEntre(p.fecha, ultima.fecha) <= 6);
  const suma = recientes.reduce((acc, p) => acc + p.kg, 0);
  return suma / recientes.length;
}

/** Cambio por semana, en kg, según los dos extremos de la tendencia. */
export function cambioPorSemana(pesos: number[], diasEntre: number = 1): number {
  if (pesos.length < 2) return 0;
  const t = tendencia(pesos);
  const dias = (pesos.length - 1) * diasEntre;
  if (dias <= 0) return 0;
  return ((t[t.length - 1] - t[0]) / dias) * 7;
}

/**
 * Cambio real por semana, con las fechas de las pesadas.
 *
 * Se ajusta una recta a todas las pesadas (los días como eje X y los kilos
 * como eje Y) y se lee cuánto sube o baja por semana. Antes se comparaba la
 * media móvil del primer punto con la del último, y esa media tiene tamaños
 * distintos: el primero se calcula con 1 pesada y el último con hasta 7. Eso
 * hundía el resultado hasta un 43 % cuando alguien se pesa una vez por semana
 * o menos. La recta no compara cosas distintas y da igual si te pesas a
 * diario o una vez al mes.
 *
 * Con dos pesadas el resultado es el mismo de siempre: los kilos que hay
 * entre ellas divididos por los días que pasaron.
 */
export function cambioSemanalPorFechas(pesadas: { fecha: string; kg: number }[]): number {
  if (pesadas.length < 2) return 0;
  const ordenadas = [...pesadas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const dias = ordenadas.map((p) => diasEntre(ordenadas[0].fecha, p.fecha));
  const kilos = ordenadas.map((p) => p.kg);

  const mediaDias = dias.reduce((a, b) => a + b, 0) / dias.length;
  const mediaKilos = kilos.reduce((a, b) => a + b, 0) / kilos.length;

  let cruce = 0;
  let varianza = 0;
  for (let i = 0; i < dias.length; i++) {
    const desvioDias = dias[i] - mediaDias;
    cruce += desvioDias * (kilos[i] - mediaKilos);
    varianza += desvioDias * desvioDias;
  }

  // Todas las pesadas caen en el mismo día: no hay pendiente que medir.
  if (varianza === 0) return 0;
  return (cruce / varianza) * 7;
}

/**
 * Cuántos días faltan para llegar al objetivo, al ritmo actual.
 *
 * Si el objetivo es de subir («subir» o «volumen-limpio»), ya se ha llegado
 * cuando el peso llega o supera el objetivo; si es de bajar («adelgazar» o
 * «recomposición»), cuando lo alcanza o baja de él. Antes se usaba el valor
 * absoluto y seguía contando días ya después de haber llegado (querer bajar
 * a 76 kg con 75,2 kg «en unos 11 días»).
 */
export function diasHastaObjetivo(
  pesoActual: number,
  pesoObjetivo: number,
  kgPorSemana: number,
  objetivo: Objetivo = "adelgazar",
): number | null {
  if (kgPorSemana <= 0) return null;
  if (objetivo === "mantener") return 0;
  // En los objetivos de bajar, ya se llegó al estar por debajo del objetivo.
  if ((objetivo === "adelgazar" || objetivo === "recomposicion") && pesoActual <= pesoObjetivo) {
    return 0;
  }
  // Y en los de subir, al estar por encima.
  if ((objetivo === "subir" || objetivo === "volumen-limpio") && pesoActual >= pesoObjetivo) {
    return 0;
  }
  return Math.round((Math.abs(pesoActual - pesoObjetivo) / kgPorSemana) * 7);
}

/** Fecha de hoy en formato 2026-10-17 (el que usa la app por dentro). */
export function hoyISO(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Una fecha ISO en corto: "21/10". Vacía o inválida, cadena vacía. */
export function ddMM(iso: string): string {
  const partes = iso.split("-");
  if (partes.length !== 3) return "";
  const [anyo, mes, dia] = partes;
  if (!/^\d{4}$/.test(anyo) || !/^\d{2}$/.test(mes) || !/^\d{2}$/.test(dia)) return "";
  return `${dia}/${mes}`;
}

/** Una fecha ISO en palabras: "Sábado, 17 de octubre". */
export function enPalabras(iso: string): string {
  const f = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(f.getTime())) return iso;
  const texto = f.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Número con coma decimal, como se escribe en España. */
export function conComa(valor: number, decimales: number = 1): string {
  return valor.toFixed(decimales).replace(".", ",");
}

/**
 * Igual que conComa, pero sin ceros de más: 1,25 → "1,25", 1,5 → "1,5", 2 → "2".
 *
 * Sirve para los litros, que se mueven de cuarto en cuarto: con un decimal
 * solo, 1,25 se escribiría 1,3 y se perdería lo que Isaac ha anotado.
 */
export function conComaSinCeros(valor: number, maxDecimales: number = 2): string {
  return valor.toFixed(maxDecimales).replace(".", ",").replace(/,?0+$/, "");
}

/** Convierte lo que escribe Isaac ("78,4") en número. */
export function aNumero(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Los pasos del día, que siempre son un número entero.
 *
 * En España los miles se escriben con punto: «8.000». `aNumero` lo leía como
 * 8 (y «8.500» como 8,5, que además no es entero y dejaba el botón apagado sin
 * explicar por qué). Aquí se quitan los puntos y los espacios, que en un
 * número de pasos solo pueden ser separadores de miles.
 */
export function aPasos(texto: string): number {
  const limpio = texto.trim().replace(/[.\s]/g, "");
  if (!/^\d+$/.test(limpio)) return 0;
  const n = Number(limpio);
  return Number.isSafeInteger(n) ? n : 0;
}

/**
 * Los miles como se escriben en España: si te anda 12.400, mostrar «12.400»
 * y no «12400», que da palo de leer.
 */
export function conMiles(valor: number): string {
  // A mano en vez de toLocaleString: cambia según el sistema, y lo que Isaac
  // quiere ver siempre es «8.000» con punto español.
  return String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * «1,68» (metros) y «168» (centímetros) dan lo mismo: 168 cm.
 *
 * Escribir la altura en metros en vez de centímetros arruinaba todos los
 * cálculos (1,68 cm en vez de 168 cm), así que el campo acepta las dos
 * formas y convierte solo: hasta 3 se lee como metros, de 100 a 250 como
 * centímetros, y cualquier otra cosa no es una altura.
 */
export function aAlturaCm(texto: string): number {
  const n = aNumero(texto);
  // Los metros se convierten y luego se comprueba la altura resultante: antes
  // bastaba con que el número fuera 3 o menos, así que escribir «3» colaba
  // como 300 cm y se guardaba una altura imposible.
  if (n > 0 && n < 10) {
    const cm = Math.round(n * 100);
    return cm >= 100 && cm <= 250 ? cm : 0;
  }
  if (n >= 100 && n <= 250) return Math.round(n);
  return 0;
}

function diasEntre(fechaVieja: string, fechaNueva: string): number {
  // Se ancla al mediodía para que el cambio de hora (o la zona horaria del
  // servidor) no descuadre la cuenta de días.
  const v = new Date(`${fechaVieja.slice(0, 10)}T12:00:00`).getTime();
  const n = new Date(`${fechaNueva.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((n - v) / 86400000);
}

function unDecimal(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** Lo que hace falta que lleve el perfil para poder ajustar las calorías. */
export type PerfilParaAjuste = {
  ritmoKgSemana: number;
  pesoInicialKg: number;
  creado: string;
  /** Sin esto, los perfiles viejos siguen comportándose como adelgazar. */
  objetivo?: Objetivo;
  ajusteKcal?: number;
  fechaAjuste?: string;
  pesoEnAjuste?: number;
};

/** Cuánto se puede mover el objetivo en una sola revisión (15 %). */
export const TOPE_AJUSTE = 0.15;

/** La fecha de la última pesada, aunque el array venga desordenado. */
export function fechaUltimaPesada(
  pesadas: { fecha: string; kg: number }[],
): string | null {
  let mejor: string | null = null;
  for (const p of pesadas) {
    if (mejor === null || p.fecha > mejor) mejor = p.fecha;
  }
  return mejor;
}

/**
 * Ajuste semanal de calorías, al estilo MacroFactor.
 *
 * Compara lo que has bajado de verdad desde la última revisión con lo que
 * decía el plan que ibas a bajar, y mueve el objetivo de acuerdo con la
 * diferencia: si vas más lento, te quita un poco; si vas más rápido, te
 * devuelve un poco para que no acabes comiendo de menos.
 *
 * Para poder comparar hace falta un peso NUEVO: `fechaPesadaActual` es la
 * fecha de la última pesada, y si no hay ninguna después de la última revisión
 * no se toca nada. Antes se comparaba el peso contigo mismo, y una semana sin
 * báscula se leía como «no has bajado lo que tocaba»: te recortaba calorías
 * cada semana sin que nadie se hubiese pesado.
 *
 * El movimiento nunca pasa del 15 % del objetivo, y el objetivo resultante
 * nunca baja de las calorías mínimas.
 */
export function ajusteSemanal(op: {
  fechaAjuste: string;
  kcalBase: number;
  ajusteActual: number;
  pesoEnAjuste: number;
  pesoActualKg: number;
  ritmoKgSemana: number;
  objetivo?: Objetivo;
  hoy: string;
  /** Fecha (ISO) de la última pesada. Ya no se sirve nada sin una nueva. */
  fechaPesadaActual?: string;
  /** Si la usuaria está en fase de retención hídrica (lútea/menstruación) */
  enRetencionHidrica?: boolean;
}): null | { kcal: number; ajusteKcal: number; cambioKg: number; esperadoKg: number } {
  // Aún no ha pasado una semana desde la última revisión: nada que tocar.
  const dias = diasEntre(op.fechaAjuste, op.hoy);
  if (dias < 7) return null;
  // Sin báscula desde la última revisión no hay nada que comparar.
  if (!op.pesoEnAjuste || !op.pesoActualKg) return null;
  // Y hace falta que la última pesada sea POSTERIOR a la última revisión:
  // comparar el peso que ya se usó la vez anterior fabrica una corrección
  // que no viene de ninguna pesada nueva.
  if (
    op.fechaPesadaActual !== undefined &&
    diasEntre(op.fechaAjuste, op.fechaPesadaActual) < 1
  ) {
    return null;
  }

  const objetivo = op.objetivo ?? "adelgazar";
  // Si sabemos cuándo se pesó de verdad, el cambio de peso ocurrió entre
  // `fechaAjuste` y `fechaPesadaActual`, no hasta `hoy`: abrir la app semanas
  // después sin haberse vuelto a pesar no debe fabricar semanas fantasma sin cambio.
  const diasMedidos =
    op.fechaPesadaActual !== undefined
      ? Math.max(1, diasEntre(op.fechaAjuste, op.fechaPesadaActual))
      : dias;
  // Cuánto esperaba subir de peso en ese tiempo (negativo si esperaba bajar).
  // Volumen limpio espera subir, como subir; recomposición espera bajar
  // despacio, como adelgazar.
  const esperaSubir = objetivo === "subir" || objetivo === "volumen-limpio";
  const esperadoSubida =
    esperaSubir
      ? (op.ritmoKgSemana * diasMedidos) / 7
      : objetivo === "mantener"
        ? 0
        : -(op.ritmoKgSemana * diasMedidos) / 7;
  // Cuánto ha subido de verdad (negativo si ha bajado).
  const subidaReal = op.pesoActualKg - op.pesoEnAjuste;
  // Ha subido menos de lo que toca: hay que comer más, y al revés.
  // 1 kg de grasa son unas 7.700 kcal: eso es lo que se mueve al día.
  const correccion = ((esperadoSubida - subidaReal) * KCAL_POR_KG) / diasMedidos;

  // Si la usuaria está en fase de retención hídrica (lútea/menstruación) y la báscula sube,
  // no penalizamos sus calorías por agua retenida fisiológicamente.
  const correccionSegura =
    op.enRetencionHidrica && correccion < 0 ? 0 : correccion;

  // Se devuelven en positivo = ha bajado / esperaba bajar, que es como se
  // miden en el resto de la app.
  const esperadoKg = -esperadoSubida;
  const cambioKg = -subidaReal;

  const tope = op.kcalBase * TOPE_AJUSTE;
  const ajusteKcal = Math.max(-tope, Math.min(tope, op.ajusteActual + correccionSegura));

  return {
    kcal: Math.max(KCAL_MINIMAS, Math.round((op.kcalBase + ajusteKcal) / 10) * 10),
    ajusteKcal: unDecimal(ajusteKcal),
    cambioKg: unDecimal(cambioKg),
    esperadoKg: unDecimal(esperadoKg),
  };
}

/**
 * Las calorías que tocan hoy, con el ajuste semanal ya aplicado.
 *
 * Se calcula siempre a partir de la fórmula (que sigue el peso actual) más el
 * ajuste guardado: así, aunque el objetivo base se mueva al bajar de peso, el
 * empujoncito del ajuste sigue estando donde toca.
 */
export function kcalDeHoy(
  perfil: PerfilParaAjuste,
  gasto: number,
  pesoActualKg: number,
  hoy: string = hoyISO(),
  /** Fecha de la última pesada: sin una nueva desde la revisión, el ajuste
   * semanal no entra (no hay nada nuevo que comparar). */
  fechaPesadaActual?: string,
  enRetencionHidrica?: boolean,
): number {
  const base = objetivoCalorico(gasto, perfil.ritmoKgSemana, perfil.objetivo);
  const pendiente = ajusteSemanal({
    fechaAjuste: perfil.fechaAjuste ?? perfil.creado,
    kcalBase: base,
    ajusteActual: perfil.ajusteKcal ?? 0,
    pesoEnAjuste: perfil.pesoEnAjuste ?? perfil.pesoInicialKg,
    pesoActualKg,
    ritmoKgSemana: perfil.ritmoKgSemana,
    objetivo: perfil.objetivo,
    hoy,
    ...(fechaPesadaActual !== undefined ? { fechaPesadaActual } : {}),
    ...(enRetencionHidrica !== undefined ? { enRetencionHidrica } : {}),
  });
  if (pendiente) return pendiente.kcal;
  return Math.max(
    KCAL_MINIMAS,
    Math.round((base + (perfil.ajusteKcal ?? 0)) / 10) * 10,
  );
}
