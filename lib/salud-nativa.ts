/**
 * El lector de pasos y sueño del móvil — SOLO dentro de la app nativa.
 *
 * Cuando My Fitness corre embebida en el envoltorio (Capacitor, Android e
 * iPhone), aquí se trae de golpe los últimos días de pasos y sueño del
 * sistema de salud del móvil (Health Connect en Android, HealthKit en
 * iPhone). En la web normal (la PWA de siempre y las pruebas de navegador)
 * no hay puente nativo: todo devuelve «no hay nada» y no se rompe nada.
 */

import { hoyISO } from "./calculos.ts";
import { horasDeSuenoPorDia } from "./sueno.ts";
import type { HealthDataType } from "@capgo/capacitor-health";

/** Un día de pasos/sueño, tal y como lo guarda la app. */
type DiaSalud = { pasos?: number; suenoHoras?: number };
/** Varios días (`YYYY-MM-DD`) y sus valores. */
export type LoteSalud = Record<string, DiaSalud>;

export type CuboAgregadoSalud = {
  startDate: string;
  endDate?: string;
  value?: number;
  values?: { sum?: number };
};

export type TramoConsultaPasos = {
  inicio: Date;
  fin: Date;
  /** Definido cuando el tramo aísla un único día con cambio de hora (23 h o 25 h). */
  diaFijo?: string;
};

const PASOS_MAX = 100000;
const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * ¿Estamos de verdad dentro del contenedor nativo (Android/iPhone) y no en un
 * navegador web normal?
 *
 * Comprobar solo `"Capacitor" in window` da falso positivo en web si algún
 * módulo evalúa `@capacitor/core` (que define `window.Capacitor` con
 * `getPlatform() === "web"`). Aquí exigimos `isNativePlatform() === true` o
 * el puente nativo inyectado por Android WebView / WKWebView.
 */
export function esAppNativa(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      isNative?: boolean;
    };
    androidBridge?: unknown;
    webkit?: { messageHandlers?: { bridge?: unknown } };
  };
  const cap = w.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function") return Boolean(cap.isNativePlatform());
  if (typeof cap.getPlatform === "function") {
    const p = cap.getPlatform();
    return p === "android" || p === "ios";
  }
  if (typeof cap.isNative === "boolean") return cap.isNative;
  return Boolean(w.androidBridge || w.webkit?.messageHandlers?.bridge);
}

/**
 * Parte el rango de los últimos `dias` días naturales en tramos alineados con
 * la medianoche local.
 *
 * En Android, `@capgo/capacitor-health` agrupa `bucket: "day"` con
 * `Duration.ofDays(1)` (rebanadas fijas de 24 h desde `startDate`). En semanas
 * sin cambio de hora todos los días duran 24 h exactas y sale **1 solo tramo**.
 * En la semana del cambio de hora (marzo 23 h / octubre 25 h), aislar el
 * domingo de cambio evita que las rebanadas posteriores se desplacen a las
 * 23:00 o 01:00 y pisen el día equivocado.
 */
export function tramosDiasLocales(dias: number, ahora = new Date()): TramoConsultaPasos[] {
  const diasSeguros = Math.min(Math.max(Math.round(dias), 1), 60);
  const anyo = ahora.getFullYear();
  const mes = ahora.getMonth();
  const diaHoy = ahora.getDate();

  const tramos: TramoConsultaPasos[] = [];
  for (let i = 0; i < diasSeguros; i++) {
    const atras = diasSeguros - 1 - i;
    const inicioDia = new Date(anyo, mes, diaHoy - atras, 0, 0, 0, 0);
    const esHoy = i === diasSeguros - 1;
    const finDia = esHoy
      ? new Date(Math.max(ahora.getTime(), inicioDia.getTime() + 1))
      : new Date(anyo, mes, diaHoy - atras + 1, 0, 0, 0, 0);

    const cambiaOffset = inicioDia.getTimezoneOffset() !== finDia.getTimezoneOffset();
    const duracionAnomala = !esHoy && finDia.getTime() - inicioDia.getTime() !== MS_DIA;

    if (cambiaOffset || duracionAnomala) {
      tramos.push({ inicio: inicioDia, fin: finDia, diaFijo: hoyISO(inicioDia) });
      continue;
    }

    const anterior = tramos[tramos.length - 1];
    if (anterior && !anterior.diaFijo && anterior.fin.getTime() === inicioDia.getTime()) {
      anterior.fin = finDia;
    } else {
      tramos.push({ inicio: inicioDia, fin: finDia });
    }
  }
  return tramos;
}

/**
 * Vuelca los cubos agregados devueltos por Health Connect / HealthKit en `lote`.
 * Si el tramo corresponde a un único día con cambio de hora (`diaFijo`), suma
 * sus rebanadas no solapadas (p. ej. 24 h + 1 h en el domingo de 25 h de otoño).
 */
export function acumularCubosPasos(
  lote: LoteSalud,
  muestras: readonly CuboAgregadoSalud[],
  diaFijo?: string,
): void {
  if (diaFijo) {
    let suma = 0;
    for (const cubo of muestras) {
      const total = cubo.values?.sum ?? cubo.value;
      if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) continue;
      suma += total;
    }
    const pasos = Math.round(suma);
    if (pasos > 0 && pasos <= PASOS_MAX) {
      lote[diaFijo] = { ...lote[diaFijo], pasos };
    }
    return;
  }

  for (const cubo of muestras) {
    const total = cubo.values?.sum ?? cubo.value;
    if (typeof total !== "number" || !Number.isFinite(total)) continue;
    const pasos = Math.round(total);
    if (pasos <= 0 || pasos > PASOS_MAX) continue;
    const tInicio = Date.parse(cubo.startDate);
    if (!Number.isFinite(tInicio)) continue;
    const tFin = cubo.endDate ? Date.parse(cubo.endDate) : NaN;
    const puntoMedio =
      Number.isFinite(tFin) && tFin >= tInicio ? Math.round((tInicio + tFin) / 2) : tInicio;
    const dia = hoyISO(new Date(puntoMedio));
    lote[dia] = { ...lote[dia], pasos };
  }
}

/**
 * Trae de golpe los últimos `dias` días (hoy incluido) de pasos y sueño.
 *
 * Los pasos se piden SIEMPRE **agregados por día al propio sistema**
 * (cubo de un día + suma): así, si alguien lleva reloj Y móvil en el
 * bolsillo, el sistema fusiona los solapes y no contamos el doble. Jamás
 * se suman muestras sueltas a mano.
 *
 * El sueño se lee por sesiones de verdad (dormido, REM, profundo; se
 * descarta el tiempo despierto o en la cama) y cada tramo cuenta para el
 * día en el que la persona se DESPIERTA.
 *
 * Si la app no va embebida, el sistema no está disponible o algo falla,
 * devuelve `{}`: esto no puede romper la app.
 */
export async function leerSaludUltimosDias(dias = 7): Promise<LoteSalud> {
  if (!esAppNativa()) return {};
  try {
    const { Health } = await import("@capgo/capacitor-health");
    const disponibilidad = await Health.isAvailable();
    if (!disponibilidad.available) return {};

    const ahora = new Date();
    const tramos = tramosDiasLocales(dias, ahora);
    const desde = tramos[0]?.inicio ?? ahora;
    const hasta = ahora;
    const lote: LoteSalud = {};

    // --- Pasos: total del día, agregado por el sistema ---
    try {
      for (const tramo of tramos) {
        const agregado = await Health.queryAggregated({
          dataType: "steps",
          startDate: tramo.inicio.toISOString(),
          endDate: tramo.fin.toISOString(),
          bucket: "day",
          aggregation: "sum",
        });
        acumularCubosPasos(lote, agregado.samples ?? [], tramo.diaFijo);
      }
    } catch {
      // Si el usuario no concedió pasos, no bloquea el sueño
    }

    // --- Sueño: sesiones de verdad, contadas al día del despertar ---
    try {
      const desdeSueno = new Date(desde);
      desdeSueno.setDate(desdeSueno.getDate() - 1);
      desdeSueno.setHours(19, 0, 0, 0);
      const muestras = await Health.readSamples({
        dataType: "sleep",
        startDate: desdeSueno.toISOString(),
        endDate: hasta.toISOString(),
        // El plugin corta por defecto en 100 muestras; un reloj inteligente
        // genera 30-60 tramos por noche y sin subir el límite se pierden días.
        limit: 1000,
      });
      const porDia = horasDeSuenoPorDia(muestras.samples ?? []);
      for (const [dia, suenoHoras] of Object.entries(porDia)) {
        lote[dia] = { ...lote[dia], suenoHoras };
      }
    } catch {
      // Si el usuario no concedió sueño, no bloquea los pasos
    }

    return lote;
  } catch {
    return {};
  }
}

/** Los dos datos que la app lee del móvil: pasos y sueño. */
const TIPOS_LECTURA: HealthDataType[] = ["steps", "sleep"];

function tiposConcedidos(estado: { readAuthorized?: HealthDataType[] }): HealthDataType[] {
  const concedidos = estado.readAuthorized ?? [];
  return TIPOS_LECTURA.filter((tipo) => concedidos.includes(tipo));
}

/**
 * Pide permiso para leer pasos y sueño (la ventana del propio sistema).
 * `false` si no estamos en la app nativa, si no se concede o si algo falla:
 * nunca lanza.
 */
export async function pedirPermisoSalud(): Promise<boolean> {
  if (!esAppNativa()) return false;
  try {
    const { Health } = await import("@capgo/capacitor-health");
    const estado = await Health.requestAuthorization({ read: TIPOS_LECTURA });
    return tiposConcedidos(estado).length > 0;
  } catch {
    return false;
  }
}

/**
 * Comprueba SIN PREGUNTAR si ya hay permiso de lectura: el permiso solo se
 * pide desde Ajustes, nunca a la fuerza al abrir la app.
 */
export async function hayPermisoSalud(): Promise<boolean> {
  if (!esAppNativa()) return false;
  try {
    const { Health } = await import("@capgo/capacitor-health");
    return tiposConcedidos(await Health.checkAuthorization({ read: TIPOS_LECTURA })).length > 0;
  } catch {
    return false;
  }
}
