import type { SupabaseClient } from "@supabase/supabase-js";
import type { MensajeIsaac } from "./store";
import { enviarPushATodos } from "./push";

export const MAX_MENSAJES_ISAAC = 50;

export type ResultadoComunicado = {
  ok: boolean;
  perfilesActualizados: number;
  perfilesFallidos: number;
  pushEntregados: number;
  mensajeId: string;
};

/**
 * Guarda un mensaje para todos en el perfil de cada usuario y envía
 * la notificación push con el aviso '⚠️ LEER IMPORTANTE — Mensaje de Isaac'.
 */
export async function enviarComunicadoGlobal(
  supabase: SupabaseClient,
  mensajeTexto: string,
): Promise<ResultadoComunicado> {
  const textoLimpio = mensajeTexto.trim();
  const id = crypto.randomUUID();
  const fecha = new Date().toISOString();

  const nuevoMensajeTodos: MensajeIsaac = {
    id,
    fecha,
    texto: textoLimpio,
    leido: false,
    paraTodos: true,
  };

  const { data: perfiles, error: errPerfiles } = await supabase
    .from("perfiles")
    .select("persona_id, datos");

  if (errPerfiles || !perfiles) {
    throw new Error(`perfiles: ${errPerfiles?.message ?? "Error leyendo perfiles"}`);
  }

  let count = 0;
  let fallidos = 0;

  const filasActualizadas = [];
  for (const p of perfiles) {
    if (!p.datos || typeof p.datos !== "object" || Array.isArray(p.datos)) {
      fallidos++;
      continue;
    }
    const datos = p.datos as Record<string, unknown>;
    const prev = Array.isArray(datos.mensajesIsaac)
      ? (datos.mensajesIsaac as MensajeIsaac[])
      : [];
    const nuevos = [...prev, nuevoMensajeTodos].slice(-MAX_MENSAJES_ISAAC);
    filasActualizadas.push({
      persona_id: p.persona_id,
      datos: { ...datos, mensajesIsaac: nuevos },
      actualizada: new Date().toISOString(),
    });
  }

  if (filasActualizadas.length > 0) {
    const { error } = await supabase
      .from("perfiles")
      .upsert(filasActualizadas, { onConflict: "persona_id" });
    if (error) {
      fallidos += filasActualizadas.length;
    } else {
      count = filasActualizadas.length;
    }
  }

  let pushCount = 0;
  try {
    pushCount = await enviarPushATodos(supabase, {
      titulo: "⚠️ LEER IMPORTANTE — Mensaje de Isaac",
      cuerpo: textoLimpio.slice(0, 180),
      url: "/hoy",
      momento: "comunicado-global",
    });
  } catch {
    // Si el push falla, el mensaje ya quedó registrado en los perfiles y se verá al abrir la app.
  }

  return {
    ok: true,
    perfilesActualizados: count,
    perfilesFallidos: fallidos,
    pushEntregados: pushCount,
    mensajeId: id,
  };
}
