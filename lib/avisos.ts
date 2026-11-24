/**
 * Qué avisos se mandan y cuándo.
 *
 * Regla de oro: **solo si falta algo**. Si ya has anotado la comida, no te
 * aviso de ella; si ya has bebido suficiente, el agua calla. El aviso de
 * andar se calla solo si hoy ya te has movido (marcaste correr, caminar o
 * estirar).
 *
 * Los hábitos no tienen aviso propio (tope de 5 avisos al día): van dentro de
 * estos cinco. Cada franja de comida avisa si falta anotarla **o** si queda
 * algún hábito de esa hora por marcar, y el aviso lo menciona.
 *
 * Todo lo de aquí es puro: recibe horas y datos, devuelve qué hacer. Así se
 * puede probar sin móvil ni nube.
 */

import { etiquetaDe, type HabitoPropio } from "./habitos.ts";

export type MomentoAviso = "desayuno" | "comida" | "cena" | "agua" | "andar";

/** A qué hora sale cada aviso (hora de España, hora y minuto). */
/** Horario personalizado de avisos guardado por el usuario */
export type HorasAvisos = Partial<Record<MomentoAviso, { hora: number; minuto: number }>>;

/** A qué hora sale cada aviso por defecto (hora de España, hora y minuto). */
export const HORA_AVISO: Record<MomentoAviso, { hora: number; minuto: number }> = {
  desayuno: { hora: 9, minuto: 0 },
  comida: { hora: 14, minuto: 30 },
  agua: { hora: 17, minuto: 0 },
  andar: { hora: 18, minuto: 0 },
  cena: { hora: 21, minuto: 0 },
};

/** Los momentos en orden, para la prueba y para enseñarlos en Ajustes. */
export const MOMENTOS: MomentoAviso[] = ["desayuno", "comida", "agua", "andar", "cena"];

/**
 * Devuelve la hora y minuto para un momento de aviso.
 * Si el usuario la ha personalizado, se usa la suya; si no, la de fábrica.
 */
export function horaDeAviso(
  momento: MomentoAviso,
  personalizadas?: HorasAvisos,
): { hora: number; minuto: number } {
  const p = personalizadas?.[momento];
  if (
    p &&
    typeof p.hora === "number" &&
    p.hora >= 0 &&
    p.hora <= 23 &&
    typeof p.minuto === "number" &&
    p.minuto >= 0 &&
    p.minuto <= 59
  ) {
    return { hora: p.hora, minuto: p.minuto };
  }
  return HORA_AVISO[momento];
}

/** Formatea una hora en string legible "HH:MM" (para inputs de hora o textos). */
export function formatoHora(h: { hora: number; minuto: number }): string {
  return String(h.hora).padStart(2, "0") + ":" + String(h.minuto).padStart(2, "0");
}

/** Parsea un texto "HH:MM" a objeto { hora, minuto }, o null si no es válido. */
export function parsearHora(texto: string): { hora: number; minuto: number } | null {
  const partes = texto.trim().split(":");
  if (partes.length !== 2) return null;
  const hora = Number(partes[0]);
  const minuto = Number(partes[1]);
  if (!Number.isInteger(hora) || hora < 0 || hora > 23) return null;
  if (!Number.isInteger(minuto) || minuto < 0 || minuto > 59) return null;
  return { hora, minuto };
}

/**
 * Minutos que se puede retrasar un aviso y seguir saliendo.
 *
 * El programador de la nube da una patadita cada diez minutos, así que sin
 * margen algún aviso se saldaría fuera de su ronda y no saldría nunca.
 */
export const VENTANA_MINUTOS = 60;

/**
 * Lo que manda el aviso, escrito como se lo dirías a un amigo.
 *
 * `pendientes` son los ids de hábitos de esa franja que aún no están marcados
 * (si los hay), y `yaAnotado` dice si la comida ya está apuntada: sin anotar,
 * los hábitos van detrás de la frase («Y acuérdate de: ...»); ya anotada, el
 * aviso pasa a ser solo de hábitos. Sin pendientes, el texto es el de siempre.
 */
export function textoAviso(
  momento: MomentoAviso,
  faltanLitros?: number,
  pendientes?: string[],
  yaAnotado?: boolean,
  propios: readonly HabitoPropio[] = [],
): { titulo: string; cuerpo: string; url: string } {
  switch (momento) {
    case "desayuno":
      return conHabitos(
        { titulo: "¿Qué has desayunado?", cuerpo: "Dímelo y ya lo tienes apuntado.", url: "/hoy" },
        pendientes,
        yaAnotado,
        propios,
      );
    case "comida":
      return conHabitos(
        { titulo: "¿Qué has comido?", cuerpo: "Un minuto y pasa a la lista.", url: "/hoy" },
        pendientes,
        yaAnotado,
        propios,
      );
    case "cena":
      return conHabitos(
        { titulo: "¿Qué has cenado?", cuerpo: "La cena también cuenta.", url: "/hoy" },
        pendientes,
        yaAnotado,
        propios,
      );
    case "agua":
      return {
        titulo: "Te falta agua",
        cuerpo:
          faltanLitros === undefined || faltanLitros <= 0
            ? "Vas justo: te queda el resto del día."
            : `Te quedan ${formatearLitros(faltanLitros)} para llegar a tu meta.`,
        url: "/hoy",
      };
    case "andar":
      return {
        titulo: "Toca moverse",
        cuerpo: "Un paseo ahora te viene bien. Sal un rato.",
        url: "/hoy",
      };
  }
}

/**
 * Mezcla los hábitos pendientes con el aviso de una comida.
 *
 * Si la comida aún no está anotada, los hábitos van detrás de la frase
 * («Y acuérdate de: ...»); si ya está anotada, el aviso habla solo de
 * hábitos. Sin pendientes, el texto se queda exactamente como estaba.
 * Como mucho se enseñan tres etiquetas y, si hay más, acaba en «…».
 */
function conHabitos(
  aviso: { titulo: string; cuerpo: string; url: string },
  pendientes: string[] | undefined,
  yaAnotado: boolean | undefined,
  propios: readonly HabitoPropio[] = [],
): { titulo: string; cuerpo: string; url: string } {
  const ids = pendientes ?? [];
  if (ids.length === 0) return aviso;
  const lista = juntarEtiquetas(ids.slice(0, 3).map((id) => etiquetaDe(id, propios)));
  const deMas = ids.length > 3;
  if (yaAnotado) {
    return {
      titulo: "Tus hábitos de hoy",
      cuerpo: `¿Ya has hecho: ${lista}${deMas ? "…" : ""}? Márcalo en un toque.`,
      url: "/hoy",
    };
  }
  return { ...aviso, cuerpo: `${aviso.cuerpo} Y acuérdate de: ${lista}${deMas ? "…" : "."}` };
}

/** Junta etiquetas cortas: "A", "A y B", "A, B y C". */
function juntarEtiquetas(etiquetas: string[]): string {
  if (etiquetas.length < 2) return etiquetas.join("");
  return `${etiquetas.slice(0, -1).join(", ")} y ${etiquetas[etiquetas.length - 1]}`;
}

/** 1.25 → "1,25 litros"; 2 → "2 litros". */
export function formatearLitros(litros: number): string {
  const redondeado = Math.round(litros * 100) / 100;
  return `${redondeado.toLocaleString("es-ES", { maximumFractionDigits: 2 })} litros`;
}

/** La hora de España en el momento dado, con la fecha del día. */
export function ahoraEnMadrid(ahora: Date): { fecha: string; hora: number; minuto: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(ahora);

  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";
  const hora = Number(get("hour")) % 24; // algunas máquinas devuelven 24 a medianoche
  return {
    fecha: `${get("year")}-${get("month")}-${get("day")}`,
    hora,
    minuto: Number(get("minute")),
  };
}

/** Minutos transcurridos desde la medianoche. */
function desdeMedianoche(hora: number, minuto: number): number {
  return hora * 60 + minuto;
}

/**
 * Qué avisos tocan ahora mismo.
 *
 * Un aviso toca cuando su hora ya pasó y hace menos de `ventana` minutos,
 * es decir: se puede retrasar, pero no adelantar.
 */
export function avisosPendientes(
  hora: number,
  minuto: number,
  ventana = VENTANA_MINUTOS,
  horasPersonalizadas?: HorasAvisos,
): MomentoAviso[] {
  const ya = desdeMedianoche(hora, minuto);
  return MOMENTOS.filter((momento) => {
    const suyo = horaDeAviso(momento, horasPersonalizadas);
    const toca = desdeMedianoche(suyo.hora, suyo.minuto);
    return ya >= toca && ya < toca + ventana;
  });
}

/** Lo que hay anotado de una persona un día concreto. */
export type LoDeHoy = {
  /** Los tipos de comida ya apuntados: "desayuno", "cena"... */
  tipos: string[];
  /** Litros de agua bebidos hoy. */
  litros: number;
  /** Litros que quiere beber al día. */
  metaLitros: number;
  /** ¿Hoy ya marcó un hábito de movimiento (correr, caminar o estirar)? */
  seMovioHoy?: boolean;
  /**
   * Los hábitos activos sin marcar, agrupados por franja (solo hacen falta
   * en desayuno, comida y cena). Sin pendientes de una franja, su aviso va
   * con el texto de siempre.
   */
  habitosPendientes?: Partial<Record<MomentoAviso, string[]>>;
};

/** Los avisos de comida que ya salieron hoy, por nombre. */
export type EnviadosHoy = Record<string, true>;

/**
 * ¿Merece la pena molestar con este aviso?
 *
 * Comidas: si no está apuntada **o** si queda algún hábito de esa franja.
 * Agua: solo si va por detrás de su meta. Andar: solo si hoy todavía no se ha
 * movido (marcó correr, caminar o estirar).
 */
export function mereceAviso(
  momento: MomentoAviso,
  hoy: LoDeHoy,
  enviados: EnviadosHoy = {},
): boolean {
  if (enviados[momento]) return false;

  switch (momento) {
    case "desayuno":
    case "comida":
    case "cena":
      return (
        !hoy.tipos.includes(momento) ||
        (hoy.habitosPendientes?.[momento]?.length ?? 0) > 0
      );
    case "agua": {
      if (hoy.metaLitros <= 0) return false;
      return hoy.litros + 0.001 < hoy.metaLitros;
    }
    case "andar":
      return !hoy.seMovioHoy;
  }
}

/** Los avisos que tocan y de verdad hay que mandar. */
export function avisosQueSeMandan(
  hora: number,
  minuto: number,
  hoy: LoDeHoy,
  enviados: EnviadosHoy = {},
  horasPersonalizadas?: HorasAvisos,
): MomentoAviso[] {
  return avisosPendientes(hora, minuto, VENTANA_MINUTOS, horasPersonalizadas).filter((m) =>
    mereceAviso(m, hoy, enviados),
  );
}

/** Proveedores oficiales de Web Push que usan Safari, Chrome, Firefox, Edge y Samsung. */
const SUFIJOS_PUSH_PERMITIDOS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  ".push.googleapis.com",
  ".push.apple.com",
  ".push.services.mozilla.com",
  "updates-push.services.mozaws.net",
  ".notify.windows.com",
  ".push.samsungosp.com",
];

function hostPushPermitido(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host || host === "localhost" || /^[\d.:[\]]+$/.test(host)) return false;
  return SUFIJOS_PUSH_PERMITIDOS.some((s) =>
    s.startsWith(".") ? host.endsWith(s) : host === s,
  );
}

/**
 * Valida que una suscripción Web Push traiga llaves legítimas y apunte por HTTPS
 * a un servidor oficial de avisos del navegador (previene ataques SSRF).
 */
export function suscripcionBuena(s: unknown): boolean {
  if (!s || typeof s !== "object") return false;
  const c = s as { endpoint?: unknown; keys?: unknown };
  if (typeof c.endpoint !== "string" || c.endpoint.length > 2048) return false;

  let url: URL;
  try {
    url = new URL(c.endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port !== "" && url.port !== "443") return false;
  if (!hostPushPermitido(url.hostname)) return false;

  const llaves = c.keys as { p256dh?: unknown; auth?: unknown } | undefined;
  if (!llaves || typeof llaves !== "object") return false;
  if (typeof llaves.p256dh !== "string" || llaves.p256dh.length < 16 || llaves.p256dh.length > 256) {
    return false;
  }
  if (typeof llaves.auth !== "string" || llaves.auth.length < 8 || llaves.auth.length > 128) {
    return false;
  }
  return true;
}
