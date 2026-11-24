import type { SupabaseClient } from "@supabase/supabase-js";
import { deFilas } from "@/lib/nube-mapeo";
import type { Datos } from "@/lib/store";

/**
 * Carga todo lo que hay guardado de una persona.
 *
 * Vive fuera de `/api/nube` porque la comparten dos direcciones: la de la
 * nube del móvil y la del widget (`/api/widget`).
 */
export async function cargar(supabase: SupabaseClient, personaId: string): Promise<Datos> {
  const [perfil, pesadas, comidas, agua, gustos] = await Promise.all([
    supabase.from("perfiles").select("datos").eq("persona_id", personaId).maybeSingle(),
    supabase
      .from("pesadas")
      .select("fecha,kg")
      .eq("persona_id", personaId)
      .order("fecha", { ascending: false })
      .limit(5000),
    supabase
      .from("comidas")
      .select("id,fecha,tipo,alimentos")
      .eq("persona_id", personaId)
      .order("fecha", { ascending: false })
      .limit(5000),
    supabase
      .from("agua")
      .select("fecha,litros")
      .eq("persona_id", personaId)
      .order("fecha", { ascending: false })
      .limit(5000),
    supabase.from("gustos").select("ingrediente,valor").eq("persona_id", personaId).limit(2000),
  ]);

  // Fallo cerrado: si una consulta de tabla falla en Supabase, jamás debemos
  // devolver listas vacías como si el usuario no tuviera datos (al recuperar
  // cuenta en otro móvil eso machacaría la nube con un estado vacío).
  const fallos = [
    perfil.error ? `perfiles: ${perfil.error.message}` : null,
    pesadas.error ? `pesadas: ${pesadas.error.message}` : null,
    comidas.error ? `comidas: ${comidas.error.message}` : null,
    agua.error ? `agua: ${agua.error.message}` : null,
    gustos.error ? `gustos: ${gustos.error.message}` : null,
  ].filter((m): m is string => m !== null);
  if (fallos.length > 0) {
    throw new Error(fallos.join(" | "));
  }

  return deFilas(
    perfil.data as { datos: unknown } | null,
    (pesadas.data ?? []) as { fecha: unknown; kg: unknown }[],
    (comidas.data ?? []) as { id: unknown; fecha: unknown; tipo: unknown; alimentos: unknown }[],
    (agua.data ?? []) as { fecha: unknown; litros: unknown }[],
    (gustos.data ?? []) as { ingrediente: unknown; valor: unknown }[],
  );
}
