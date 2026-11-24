import { NextResponse } from "next/server";
import { headers } from "next/headers";
import webpush from "web-push";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { iguales } from "@/lib/sesion";
import {
  ahoraEnMadrid,
  avisosQueSeMandan,
  suscripcionBuena,
  textoAviso,
  MOMENTOS,
  type EnviadosHoy,
  type HorasAvisos,
  type MomentoAviso,
} from "@/lib/avisos";
import {
  HABITOS_INICIALES,
  HABITOS_MOVIMIENTO,
  faltanHabitos,
  momentoDeAviso,
  type HabitoPropio,
} from "@/lib/habitos";
import { enviarTelegram, telegramConfigurado } from "@/lib/telegram";

/**
 * Centinela de caída del servidor (Dead Man's Switch).
 * Comprueba el latido de la VM de Oracle guardado en `secretos.vm_heartbeat`.
 * Si lleva más de 20 minutos sin latido, envía una alerta directa a Telegram.
 */
async function revisarLatidoOracle(supabase: ReturnType<typeof nubeDeServidor>): Promise<void> {
  if (!supabase || !telegramConfigurado()) return;
  try {
    const { data: secretoHb } = await supabase
      .from("secretos")
      .select("valor")
      .eq("nombre", "vm_heartbeat")
      .maybeSingle();

    if (!secretoHb?.valor) return;

    let hbData: { timestamp?: number } | null = null;
    try {
      hbData = JSON.parse(secretoHb.valor);
    } catch {
      return;
    }

    const ahoraSeg = Math.floor(Date.now() / 1000);
    const ultimoHb = Number(hbData?.timestamp ?? 0);
    if (!Number.isFinite(ultimoHb) || ultimoHb <= 0) return;

    const segundosSinLatido = ahoraSeg - ultimoHb;
    const UMBRAL_CAIDA_SEG = 20 * 60; // 20 minutos

    const { data: alertaPrevia } = await supabase
      .from("secretos")
      .select("valor")
      .eq("nombre", "vm_alerta_estado")
      .maybeSingle();

    let estadoAlerta = { enAlerta: false, ultimoAviso: 0 };
    if (alertaPrevia?.valor) {
      try {
        estadoAlerta = JSON.parse(alertaPrevia.valor);
      } catch {
        // ignorar
      }
    }

    if (segundosSinLatido > UMBRAL_CAIDA_SEG) {
      const tiempoDesdeUltimoAviso = ahoraSeg - (estadoAlerta.ultimoAviso ?? 0);
      if (!estadoAlerta.enAlerta || tiempoDesdeUltimoAviso > 3 * 3600) {
        const minutosCaido = Math.round(segundosSinLatido / 60);
        await enviarTelegram(
          `🚨 *CENTINELA DE SISTEMAS — ORACLE CLOUD*\n\nEl servidor en la nube (DevBot y Panel) no responde desde hace *${minutosCaido} minutos*.\n\n⚠️ Posible caída del servicio, corte de Tailscale o congelación de la VM.`,
          { parseMode: "Markdown" },
        );
        await supabase.from("secretos").upsert({
          nombre: "vm_alerta_estado",
          valor: JSON.stringify({ enAlerta: true, ultimoAviso: ahoraSeg, minutosCaido }),
        });
      }
    } else if (estadoAlerta.enAlerta) {
      await enviarTelegram(
        `✅ *CENTINELA DE SISTEMAS — ORACLE CLOUD*\n\nEl servidor en la nube ha recuperado la conexión y vuelve a emitir latidos con normalidad.`,
        { parseMode: "Markdown" },
      );
      await supabase.from("secretos").upsert({
        nombre: "vm_alerta_estado",
        valor: JSON.stringify({ enAlerta: false, ultimoAviso: ahoraSeg, recuperado: true }),
      });
    }
  } catch (e) {
    console.error("centinela/oracle:", e);
  }
}

/**
 * La oficina de correos de los avisos.
 *
 * Esta dirección no tiene puerta de sesión: la llama el programador de
 * Supabase cada diez minutos. En su lugar pide una clave que vive guardada
 * dentro de la propia base de datos y que solo pueden leer dos sitios: este
 * servidor (con la llave de mando) y el propio programador. Nadie más.
 *
 * Y aunque alguien llegara a darle la lata, no hace nada fuera de su hora y
 * nunca repite un aviso dos veces el mismo día: es a prueba de manías.
 */

const CLAVE_SECRETO = "avisos";
const A_VENIR_MINUTOS = 120; // lo que puede tardar la suscripción en caducar

let vapidListo = false;

/**
 * Configura la firma VAPID bajo demanda para no romper la carga del módulo si
 * falta una variable de entorno o viene mal formada.
 */
function asegurarVapid(): boolean {
  if (vapidListo) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privada = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publica || !privada) return false;
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com").trim();
    webpush.setVapidDetails(appUrl, publica, privada);
    vapidListo = true;
    return true;
  } catch (e) {
    console.error("avisos/vapid:", e);
    return false;
  }
}

type FilaDispositivo = {
  id: string;
  persona_id: string | null;
  suscripcion: unknown;
  avisos: unknown;
};

/** Los hábitos de movimiento que ya cuentan como haberse movido hoy. */
const MOVIMIENTO = new Set<string>(HABITOS_MOVIMIENTO);

/**
 * Los hábitos que faltan, agrupados por la franja del aviso al que se
 * enganchan (los de movimiento no: esos apagan el aviso de andar).
 */
function pendientesPorFranja(
  activos: string[],
  hechos: string[],
  propios: readonly HabitoPropio[] = [],
): Partial<Record<MomentoAviso, string[]>> {
  const pendientes: Partial<Record<MomentoAviso, string[]>> = {};
  for (const id of faltanHabitos(activos, hechos, propios)) {
    const franja = momentoDeAviso(id, propios);
    if (franja === "andar") continue;
    (pendientes[franja] ??= []).push(id);
  }
  return pendientes;
}

/** Lo que la app le puede mandar al móvil; `pendientes` es lo de los hábitos de esa franja. */
function cuerpoAviso(
  momento: MomentoAviso,
  faltanLitros?: number,
  pendientes?: string[],
  yaAnotado?: boolean,
  propios: readonly HabitoPropio[] = [],
) {
  const t = textoAviso(momento, faltanLitros, pendientes, yaAnotado, propios);
  return JSON.stringify({ titulo: t.titulo, cuerpo: t.cuerpo, url: t.url, momento });
}

/** Los avisos ya salidos hoy, leídos del jsonb del móvil. */
function enviadosDe(guardado: unknown, fecha: string): EnviadosHoy {
  if (!guardado || typeof guardado !== "object") return {};
  const lista = (guardado as Record<string, unknown>)[fecha];
  if (!Array.isArray(lista)) return {};
  return Object.fromEntries(lista.filter((m) => typeof m === "string").map((m) => [m, true]));
}

export async function POST() {
  const supabase = nubeDeServidor();
  if (!supabase) return NextResponse.json({ ok: false, motivo: "Sin nube." }, { status: 503 });

  // ---------------------------------------------------------------
  // 1. ¿Quién eres?
  // ---------------------------------------------------------------
  const secreto = await supabase
    .from("secretos")
    .select("valor")
    .eq("nombre", CLAVE_SECRETO)
    .maybeSingle();

  if (secreto.error) {
    console.error("avisos/secreto:", secreto.error.message);
    return NextResponse.json({ ok: false, motivo: "Error al consultar la nube." }, { status: 500 });
  }

  const guardado = (secreto.data as { valor: string | null } | null)?.valor ?? "";
  if (!guardado) {
    return NextResponse.json({ ok: false, motivo: "Falta la clave de los avisos." }, { status: 503 });
  }

  // La clave viene en la cabecera que pone el programador de Supabase.
  const traida = (await headers()).get("x-clave-avisos") ?? "";
  if (!iguales(traida, guardado)) {
    return NextResponse.json({ ok: false, motivo: "No autorizado." }, { status: 401 });
  }

  if (!asegurarVapid()) {
    return NextResponse.json({ ok: false, motivo: "Faltan las claves VAPID de avisos." }, { status: 503 });
  }

  // Comprobación centinela del estado del servidor Oracle Cloud
  await revisarLatidoOracle(supabase);

  // ---------------------------------------------------------------
  // 2. ¿Qué toca ahora?
  // ---------------------------------------------------------------
  const { fecha, hora, minuto } = ahoraEnMadrid(new Date());

  const dispositivos = await supabase
    .from("dispositivos")
    .select("id,persona_id,suscripcion,avisos")
    .not("suscripcion", "is", null)
    .not("persona_id", "is", null);

  if (dispositivos.error) {
    console.error("avisos/dispositivos:", dispositivos.error.message);
    return NextResponse.json({ ok: false, motivo: "Error al leer los dispositivos." }, { status: 500 });
  }

  const filas = (dispositivos.data ?? []) as unknown as FilaDispositivo[];
  if (filas.length === 0) {
    return NextResponse.json({ ok: true, avisos: 0, motivo: "No hay móviles apuntados." });
  }

  // ---------------------------------------------------------------
  // 3. ¿Qué ha hecho cada persona hoy?
  // ---------------------------------------------------------------
  const personas = [...new Set(filas.map((f) => f.persona_id as string))];
  const [comidas, aguas, perfiles] = await Promise.all([
    supabase.from("comidas").select("persona_id,tipo").eq("fecha", fecha).in("persona_id", personas),
    supabase.from("agua").select("persona_id,litros").eq("fecha", fecha).in("persona_id", personas),
    supabase.from("perfiles").select("persona_id,datos").in("persona_id", personas),
  ]);

  // Fallo cerrado anti-spam: si falla la lectura de comidas, agua o perfiles,
  // jamás debemos asumir `[]` y molestar a quien ya había cumplido hoy.
  if (comidas.error || aguas.error || perfiles.error) {
    console.error(
      "avisos/datos:",
      comidas.error?.message ?? aguas.error?.message ?? perfiles.error?.message,
    );
    return NextResponse.json({ ok: false, motivo: "Error al leer los datos del día." }, { status: 500 });
  }

  const tiposPor = new Map<string, string[]>();
  for (const c of (comidas.data ?? []) as unknown as { persona_id: string; tipo: string }[]) {
    const l = tiposPor.get(c.persona_id) ?? [];
    l.push(c.tipo);
    tiposPor.set(c.persona_id, l);
  }

  const aguaPor = new Map<string, number>();
  for (const a of (aguas.data ?? []) as unknown as { persona_id: string; litros: number }[]) {
    aguaPor.set(a.persona_id, (aguaPor.get(a.persona_id) ?? 0) + Number(a.litros || 0));
  }

  const metaPor = new Map<string, number>();
  const activosPor = new Map<string, string[]>();
  const hechosPor = new Map<string, string[]>();
  const propiosPor = new Map<string, HabitoPropio[]>();
  const pasosSuficientesPor = new Map<string, boolean>();
  const horasAvisosPor = new Map<string, HorasAvisos>();
  for (const p of (perfiles.data ?? []) as unknown as { persona_id: string; datos: unknown }[]) {
    const datos = p.datos as {
      metaAguaL?: unknown;
      perfil?: { habitosActivos?: unknown; habitosPropios?: unknown; metaPasos?: unknown; horasAvisos?: unknown };
      habitosActivos?: unknown;
      habitosHechos?: Record<string, unknown>;
      saludDiaria?: Record<string, { pasos?: unknown }>;
    } | null;
    const meta = datos?.metaAguaL;
    metaPor.set(p.persona_id, typeof meta === "number" && meta > 0 ? meta : 2);

    const activos = datos?.perfil?.habitosActivos ?? datos?.habitosActivos;
    activosPor.set(
      p.persona_id,
      Array.isArray(activos) ? activos.filter((h): h is string => typeof h === "string") : HABITOS_INICIALES,
    );
    const marcados = datos?.habitosHechos?.[fecha];
    hechosPor.set(
      p.persona_id,
      Array.isArray(marcados) ? marcados.filter((h): h is string => typeof h === "string") : [],
    );

    const crudos = datos?.perfil?.habitosPropios;
    propiosPor.set(
      p.persona_id,
      Array.isArray(crudos)
        ? crudos.filter(
            (h): h is HabitoPropio =>
              !!h &&
              typeof h === "object" &&
              typeof (h as HabitoPropio).id === "string" &&
              typeof (h as HabitoPropio).etiqueta === "string",
          )
        : [],
    );

    const metaPasos =
      typeof datos?.perfil?.metaPasos === "number" && datos.perfil.metaPasos > 0
        ? datos.perfil.metaPasos
        : 8000;
    const pasos = Number(datos?.saludDiaria?.[fecha]?.pasos ?? 0);
    pasosSuficientesPor.set(p.persona_id, Number.isFinite(pasos) && pasos >= metaPasos);

    const crudosAvisos = datos?.perfil?.horasAvisos as Record<string, { hora?: unknown; minuto?: unknown }> | undefined;
    const horasPers: HorasAvisos = {};
    if (crudosAvisos && typeof crudosAvisos === "object") {
      for (const m of MOMENTOS) {
        const item = crudosAvisos[m];
        if (
          item &&
          typeof item === "object" &&
          typeof item.hora === "number" &&
          item.hora >= 0 &&
          item.hora <= 23 &&
          typeof item.minuto === "number" &&
          item.minuto >= 0 &&
          item.minuto <= 59
        ) {
          horasPers[m] = { hora: item.hora, minuto: item.minuto };
        }
      }
    }
    horasAvisosPor.set(p.persona_id, horasPers);
  }

  // ---------------------------------------------------------------
  // 4. A mandar (en lotes concurrentes para escalar sin agotar la memoria ni el timeout)
  // ---------------------------------------------------------------
  let mandados = 0;
  const TAMANO_LOTE = 25;
  for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
    const trozo = filas.slice(i, i + TAMANO_LOTE);
    const resultados = await Promise.allSettled(
      trozo.map(async (f) => {
        // Defensa en profundidad anti-SSRF también al enviar, por si alguna fila
        // antigua tuviera una suscripción corrupta o no oficial.
        if (!suscripcionBuena(f.suscripcion)) {
          await supabase.from("dispositivos").update({ suscripcion: null }).eq("id", f.id);
          return 0;
        }

        const persona = f.persona_id as string;
        const activos = activosPor.get(persona) ?? HABITOS_INICIALES;
        const hechos = hechosPor.get(persona) ?? [];
        const propios = propiosPor.get(persona) ?? [];
        const hoy = {
          tipos: tiposPor.get(persona) ?? [],
          litros: aguaPor.get(persona) ?? 0,
          metaLitros: metaPor.get(persona) ?? 2,
          seMovioHoy:
            hechos.some((h) => MOVIMIENTO.has(h)) || (pasosSuficientesPor.get(persona) ?? false),
          habitosPendientes: pendientesPorFranja(activos, hechos, propios),
        };
        const ya = enviadosDe(f.avisos, fecha);

        const faltan = hoy.metaLitros - hoy.litros;
        const conQueHaya = avisosQueSeMandan(hora, minuto, hoy, ya, horasAvisosPor.get(persona));
        if (conQueHaya.length === 0) return 0;

        let cuenta = 0;
        const nuevos: string[] = [];
        for (const momento of conQueHaya) {
          try {
            await webpush.sendNotification(
              f.suscripcion as webpush.PushSubscription,
              cuerpoAviso(
                momento,
                faltan,
                hoy.habitosPendientes[momento],
                hoy.tipos.includes(momento),
                propios,
              ),
              { TTL: A_VENIR_MINUTOS * 60, urgency: "normal" },
            );
            cuenta++;
            nuevos.push(momento);
          } catch (e) {
            const estado = (e as { statusCode?: number }).statusCode;
            // 404 o 410: el móvil ya no quiere recibir avisos; se le borra y se corta el bucle.
            if (estado === 404 || estado === 410) {
              await supabase.from("dispositivos").update({ suscripcion: null }).eq("id", f.id);
              break;
            }
          }
        }

        if (nuevos.length > 0) {
          const enviadosHoy = [...new Set([...Object.keys(ya), ...nuevos])];
          await supabase
            .from("dispositivos")
            .update({ avisos: { [fecha]: enviadosHoy } })
            .eq("id", f.id);
        }
        return cuenta;
      }),
    );

    for (const r of resultados) if (r.status === "fulfilled") mandados += r.value;
  }

  return NextResponse.json({ ok: true, avisos: mandados, fecha });
}
