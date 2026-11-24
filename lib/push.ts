import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { suscripcionBuena } from "./avisos.ts";

/**
 * Mandar un aviso suelto al móvil de una persona.
 *
 * Comparte la configuración con los avisos de las 21:30, pero vive aparte
 * porque allí el envío va por franjas y aquí es un mensaje de uno en uno: el
 * buzón de la beta tiene que avisar a Isaac en el momento en que alguien
 * escribe.
 *
 * Nunca lanza: si el aviso no sale, el comentario ya está guardado. Perder la
 * notificación es molesto; perder el mensaje, no tiene perdón.
 */

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com").trim();
  webpush.setVapidDetails(appUrl, publica, privada);
  configurado = true;
  return true;
}

export type Aviso = {
  titulo: string;
  cuerpo: string;
  url?: string;
  /** Etiqueta para que dos avisos iguales no se apilen. */
  momento?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function enviarPushA(
  supabase: SupabaseClient,
  personaId: string,
  aviso: Aviso,
): Promise<number> {
  if (!personaId || !configurar()) return 0;

  try {
    const { data } = await supabase
      .from("dispositivos")
      .select("id,suscripcion")
      .eq("persona_id", personaId)
      .not("suscripcion", "is", null);

    const filas = (data ?? []) as { id: string; suscripcion: unknown }[];
    let mandados = 0;

    for (const fila of filas) {
      // Defensa en profundidad anti-SSRF también al enviar desde el buzón o reacciones.
      if (!suscripcionBuena(fila.suscripcion)) continue;
      try {
        await webpush.sendNotification(
          fila.suscripcion as webpush.PushSubscription,
          JSON.stringify({
            titulo: aviso.titulo,
            cuerpo: aviso.cuerpo,
            url: aviso.url ?? "/ajustes",
            momento: aviso.momento ?? "comentarios",
          }),
          { TTL: 60 * 60, urgency: "normal" },
        );
        mandados += 1;
      } catch (e) {
        const estado = (e as { statusCode?: number }).statusCode;
        // El móvil ya no quiere recibir avisos: se le quita para no repetir.
        if (estado === 404 || estado === 410) {
          await supabase.from("dispositivos").update({ suscripcion: null }).eq("id", fila.id);
        }
      }
    }

    return mandados;
  } catch {
    return 0;
  }
}

/**
 * Manda un aviso push buscando el destinatario por su código de recuperación (ej. BCD234),
 * por su ID de persona, o por su ID de dispositivo.
 */
export async function enviarPushPorCodigo(
  supabase: SupabaseClient,
  codigoOId: string,
  aviso: Aviso,
): Promise<number> {
  if (!codigoOId || !configurar()) return 0;

  try {
    const limpio = codigoOId.trim();

    // 1. Buscar persona por código de 6 letras en mayúsculas (ej. BCD234)
    const { data: porCodigo } = await supabase
      .from("personas")
      .select("id")
      .eq("codigo", limpio.toUpperCase())
      .maybeSingle();

    if (porCodigo?.id) {
      return await enviarPushA(supabase, porCodigo.id, aviso);
    }

    // 2. Si tiene formato UUID, probar por id de persona (evita que Postgres corte el paso 3 con error de tipo)
    if (UUID_RE.test(limpio)) {
      const { data: porId } = await supabase
        .from("personas")
        .select("id")
        .eq("id", limpio)
        .maybeSingle();

      if (porId?.id) {
        return await enviarPushA(supabase, porId.id, aviso);
      }
    }

    // 3. Si no, probar si coincide con un id de dispositivo
    const { data: disp } = await supabase
      .from("dispositivos")
      .select("persona_id")
      .eq("id", limpio)
      .maybeSingle();

    if (disp?.persona_id) {
      return await enviarPushA(supabase, disp.persona_id, aviso);
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * Manda un aviso push a todos los dispositivos registrados en la nube.
 *
 * Utilizado para comunicados importantes y avisos globales del administrador.
 */
export async function enviarPushATodos(
  supabase: SupabaseClient,
  aviso: Aviso,
): Promise<number> {
  if (!configurar()) return 0;

  try {
    const { data } = await supabase
      .from("dispositivos")
      .select("id,suscripcion")
      .not("suscripcion", "is", null);

    const filas = (data ?? []) as { id: string; suscripcion: unknown }[];
    let mandados = 0;

    for (const fila of filas) {
      if (!suscripcionBuena(fila.suscripcion)) continue;
      try {
        await webpush.sendNotification(
          fila.suscripcion as webpush.PushSubscription,
          JSON.stringify({
            titulo: aviso.titulo,
            cuerpo: aviso.cuerpo,
            url: aviso.url ?? "/hoy",
            momento: aviso.momento ?? "comunicado-global",
          }),
          { TTL: 24 * 60 * 60, urgency: "normal" },
        );
        mandados += 1;
      } catch (e) {
        const estado = (e as { statusCode?: number }).statusCode;
        if ((estado === 404 || estado === 410) && typeof fila.id === "string") {
          await supabase.from("dispositivos").update({ suscripcion: null }).eq("id", fila.id);
        }
      }
    }

    return mandados;
  } catch {
    return 0;
  }
}
