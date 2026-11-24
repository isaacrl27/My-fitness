/**
 * La racha: los días seguidos con algo anotado.
 *
 * Antes estaba escrita dos veces (en la página de Hoy y en la del widget) y
 * con reglas distintas: una perdonaba el día de hoy si aún no habías anotado
 * nada y la otra no, así que por la mañana podían dar números diferentes.
 *
 * Aquí hay una sola fórmula. Cuenta como día activo haber comido, pesado,
 * bebido agua o marcado un hábito: cuidarse no es solo comer. Y hay un
 * comodín al mes para que un día suelto no tire por la borda una racha de
 * semanas (el "streak freeze" de Duolingo).
 */

import { hoyISO } from "./calculos.ts";

/** Lo mínimo que necesita la racha de los datos de la app. */
export type ActividadDeRacha = {
  comidas: { fecha: string }[];
  pesadas: { fecha: string }[];
  /** Litros bebidos por día (`YYYY-MM-DD`). */
  aguaLitros?: Record<string, number>;
  /** Claves de los hábitos marcados ese día, como los guarda la app. */
  habitosHechos?: Record<string, string[]>;
};

/** Un comodín al mes: perdona un día fallado sin romper la racha. */
export const COMODINES_POR_MES = 1;

/** Los días con algo anotado, en formato `YYYY-MM-DD`. */
export function diasConActividad(datos: ActividadDeRacha): Set<string> {
  const dias = new Set<string>();
  for (const comida of datos.comidas) dias.add(comida.fecha.slice(0, 10));
  for (const pesada of datos.pesadas) dias.add(pesada.fecha.slice(0, 10));
  for (const [fecha, litros] of Object.entries(datos.aguaLitros ?? {})) {
    if (litros > 0) dias.add(fecha.slice(0, 10));
  }
  for (const [fecha, hechos] of Object.entries(datos.habitosHechos ?? {})) {
    if (hechos.length > 0) dias.add(fecha.slice(0, 10));
  }
  return dias;
}

/** ¿Hay algo anotado hoy? Sirve para saber si la racha está asegurada. */
export function hayActividadHoy(dias: Set<string>, hoy: string): boolean {
  return dias.has(hoy.slice(0, 10));
}

/**
 * Los días seguidos que llevas.
 *
 * Si hoy todavía no has anotado nada, se empieza a contar desde ayer: a las
 * ocho de la mañana no se te puede caer una racha de veinte días por no haber
 * desayunado aún. Cuando el hueco es de un solo día, se gasta un comodín del
 * mes al que pertenece ese día; si ya no queda, la racha se corta.
 */
export function rachaActual(
  dias: Set<string>,
  hoy: string,
  comodinesPorMes: number = COMODINES_POR_MES,
): number {
  const cursor = new Date(`${hoy.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(cursor.getTime())) return 0;

  // El día de hoy en curso no rompe nada: se empieza por ayer.
  if (!dias.has(hoyISO(cursor))) cursor.setDate(cursor.getDate() - 1);

  const gastados = new Map<string, number>();
  let seguidos = 0;
  let huecoSeguidos = 0;

  for (;;) {
    if (dias.has(hoyISO(cursor))) {
      seguidos += 1;
      huecoSeguidos = 0;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    // El comodín perdona un día suelto, nunca dos días seguidos sin actividad
    // (aunque caigan justo en el cambio de mes, como 30 sep + 1 oct).
    if (huecoSeguidos >= 1) break;

    const mes = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    const usados = gastados.get(mes) ?? 0;
    if (usados >= comodinesPorMes) break;

    gastados.set(mes, usados + 1);
    huecoSeguidos += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return seguidos;
}