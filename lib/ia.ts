import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { codigoValido, esFuncionRpcAusente } from "@/lib/nube-mapeo";
import { ahoraEnMadrid } from "@/lib/avisos";
import { crearFreno } from "@/lib/freno";
import {
  TOPE_FOTO,
  TOPE_GLOBAL,
  TOPE_TEXTO,
  bandaAlcanzada,
  usadasFotos,
  usadasTexto,
} from "@/lib/ia-tope";
import {
  ESQUEMA_RESPUESTA,
  PROMPT_ETIQUETA,
  PROMPT_FOTO,
  PROMPT_TEXTO,
  construirPromptFoto,
  construirPromptTexto,
  extraerTextoCandidato,
  parsearRespuestaIA,
  type AlimentoIA,
  type ModoFotoIA,
} from "@/lib/ia-alimentos";

export {
  PROMPT_ETIQUETA,
  PROMPT_FOTO,
  PROMPT_TEXTO,
  construirPromptFoto,
  construirPromptTexto,
  type AlimentoIA,
  type ModoFotoIA,
};

const frenoIA = crearFreno({ maxFallos: 10, castigoMs: 5 * 60 * 1000, retardoMs: 700 });

import {
  ESPERA_GEMINI_MS,
  ESPERA_REINTENTO_GEMINI_MS,
  MODELOS_TEXTO_IA,
  MODELOS_VISION_IA,
  URL_BASE_GEMINI,
  thinkingConfigDeModelo,
  type ProfundidadGemini,
} from "./gemini-modelos.ts";

export type ClaseIA = "texto" | "foto";

const ESPERA_REINTENTO_MS = ESPERA_REINTENTO_GEMINI_MS;
const URL_GEMINI = URL_BASE_GEMINI;
const MODELOS_FOTO = MODELOS_VISION_IA;
const MODELOS_TEXTO = MODELOS_TEXTO_IA;

/**
 * Reservas en vuelo en memoria para tapar condiciones de carrera (TOCTOU):
 * si alguien dispara 10 fotos en paralelo quedándole 1, las 9 sobrantes ven la
 * reserva activa antes de llamar a Google, y si Gemini falla la reserva se libera.
 */
const enVueloCuenta = new Map<string, number>();
let enVueloGlobal = 0;

function claveVuelo(personaId: string, clase: ClaseIA): string {
  return `${personaId}:${clase}`;
}

function leerVuelo(personaId: string, clase: ClaseIA): number {
  return enVueloCuenta.get(claveVuelo(personaId, clase)) ?? 0;
}

/** Reserva únicamente una plaza en vuelo en la banda global (para `/api/ia/salud`). */
export function reservarVueloGlobal(): () => void {
  enVueloGlobal += 1;
  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    enVueloGlobal = Math.max(0, enVueloGlobal - 1);
  };
}

function reservarVuelo(personaId: string, clase: ClaseIA): () => void {
  const clave = claveVuelo(personaId, clase);
  enVueloCuenta.set(clave, (enVueloCuenta.get(clave) ?? 0) + 1);
  const liberarGlobal = reservarVueloGlobal();
  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    const actual = (enVueloCuenta.get(clave) ?? 1) - 1;
    if (actual <= 0) enVueloCuenta.delete(clave);
    else enVueloCuenta.set(clave, actual);
    liberarGlobal();
  };
}

export async function estaDentro(peticion: NextRequest): Promise<boolean> {
  return sesionValida(peticion.cookies.get(COOKIE_SESION)?.value);
}

export function sinSesion() {
  return NextResponse.json({ ok: false, motivo: "Sin sesión" }, { status: 401 });
}

/* ------------------------------------------------------------------ */
/* Los topes del día                                                   */
/* ------------------------------------------------------------------ */

type Conteo = {
  estado: "ok" | "no_existe" | "error_nube";
  supabase: SupabaseClient | null;
  personaId: string | null;
  datosPrevios: Record<string, unknown> | null;
  texto: number;
  fotos: number;
};

const CUENTA_INEXISTENTE: Conteo = {
  estado: "no_existe",
  supabase: null,
  personaId: null,
  datosPrevios: null,
  texto: 0,
  fotos: 0,
};

const ERROR_NUBE: Conteo = {
  estado: "error_nube",
  supabase: null,
  personaId: null,
  datosPrevios: null,
  texto: 0,
  fotos: 0,
};

async function leerConteo(codigo: string): Promise<Conteo> {
  const limpio = codigo.trim().toUpperCase();
  if (!codigoValido(limpio)) return CUENTA_INEXISTENTE;

  const supabase = nubeDeServidor();
  if (!supabase) return ERROR_NUBE;

  try {
    const p = await supabase.from("personas").select("id").eq("codigo", limpio).maybeSingle();
    if (p.error) return ERROR_NUBE;
    const personaId = (p.data as { id: string | null } | null)?.id;
    if (!personaId) return CUENTA_INEXISTENTE;

    const f = await supabase
      .from("perfiles")
      .select("datos")
      .eq("persona_id", personaId)
      .maybeSingle();
    if (f.error) return ERROR_NUBE;
    const bruto = (f.data as { datos: unknown } | null)?.datos;
    const datos =
      bruto !== null && typeof bruto === "object" && !Array.isArray(bruto)
        ? (bruto as Record<string, unknown>)
        : null;
    const hoy = ahoraEnMadrid(new Date()).fecha;

    return {
      estado: "ok",
      supabase,
      personaId,
      datosPrevios: datos,
      texto: usadasTexto(datos, hoy),
      fotos: usadasFotos(datos, hoy),
    };
  } catch {
    return ERROR_NUBE;
  }
}

function restantesDe(conteo: Conteo, clase: ClaseIA, enVuelo: number): number {
  return clase === "texto"
    ? TOPE_TEXTO - (conteo.texto + enVuelo)
    : TOPE_FOTO - (conteo.fotos + enVuelo);
}

async function anotarUso(conteo: Conteo, clase: ClaseIA): Promise<void> {
  const { supabase, personaId } = conteo;
  if (!supabase || !personaId) return;
  try {
    const hoy = ahoraEnMadrid(new Date()).fecha;
    const { error } = await supabase.rpc("incrementar_uso_ia_perfil", {
      p_persona_id: personaId,
      p_clase: clase,
      p_fecha: hoy,
    });
    if (!error) return;
    if (!esFuncionRpcAusente(error)) return;

    // Respaldo solo si la función RPC aún no está creada en Supabase.
    const f = await supabase
      .from("perfiles")
      .select("datos")
      .eq("persona_id", personaId)
      .maybeSingle();
    if (f.error) return;
    const bruto = (f.data as { datos?: unknown } | null)?.datos;
    const datos = {
      ...(bruto !== null && typeof bruto === "object" && !Array.isArray(bruto)
        ? (bruto as Record<string, unknown>)
        : conteo.datosPrevios ?? {}),
    };

    if (clase === "texto") {
      datos.usoIAtexto = { fecha: hoy, usadas: usadasTexto(datos, hoy) + 1 };
    } else {
      datos.usoIAfoto = { fecha: hoy, usadas: usadasFotos(datos, hoy) + 1 };
    }
    await supabase
      .from("perfiles")
      .upsert(
        { persona_id: personaId, datos, actualizada: new Date().toISOString() },
        { onConflict: "persona_id" },
      );
  } catch {
    // El recuento no debe tumbar una respuesta de comida ya generada.
  }
}

/* ------------------------------------------------------------------ */
/* La banda global de la clave compartida                              */
/* ------------------------------------------------------------------ */

async function filaGlobal(supabase: SupabaseClient | null): Promise<unknown> {
  if (!supabase) return null;
  try {
    const hoy = ahoraEnMadrid(new Date()).fecha;
    const f = await supabase
      .from("uso_ia_global")
      .select("fecha, usadas")
      .eq("fecha", hoy)
      .maybeSingle();
    if (f.error) return null;
    return f.data ?? null;
  } catch {
    return null;
  }
}

/** Comprueba si toda la familia alcanzó la banda diaria compartida (con reservas en vuelo). */
export async function bandaCerrada(supabase: SupabaseClient | null): Promise<boolean> {
  if (!supabase) return false;
  const hoy = ahoraEnMadrid(new Date()).fecha;
  const fila = await filaGlobal(supabase);
  if (bandaAlcanzada(fila, hoy)) return true;
  const usadasHoy =
    fila &&
    typeof fila === "object" &&
    (fila as { fecha?: unknown }).fecha === hoy &&
    typeof (fila as { usadas?: unknown }).usadas === "number"
      ? Math.max(0, Math.floor((fila as { usadas: number }).usadas))
      : 0;
  return usadasHoy + enVueloGlobal >= TOPE_GLOBAL;
}

/** Suma 1 llamada en el contador diario global compartido de la clave de Google. */
export async function anotarGlobal(supabase: SupabaseClient | null): Promise<void> {
  if (!supabase) return;
  try {
    const hoy = ahoraEnMadrid(new Date()).fecha;
    const { error } = await supabase.rpc("incrementar_uso_ia_global", { p_fecha: hoy });
    if (!error) return;
    if (!esFuncionRpcAusente(error)) return;

    const f = await supabase.from("uso_ia_global").select("usadas").eq("fecha", hoy).maybeSingle();
    if (f.error) return;
    const usadas =
      typeof (f.data as { usadas?: unknown } | null)?.usadas === "number"
        ? ((f.data as { usadas: number }).usadas as number)
        : 0;
    await supabase
      .from("uso_ia_global")
      .upsert(
        { fecha: hoy, usadas: usadas + 1, actualizada: new Date().toISOString() },
        { onConflict: "fecha" },
      );
  } catch {
    // Si la tabla no está creada todavía, no bloquear.
  }
}

/* ------------------------------------------------------------------ */
/* Respuestas de error y de los topes                                  */
/* ------------------------------------------------------------------ */

function sinIa() {
  return NextResponse.json(
    { ok: false, sinConfigurar: true, motivo: "La IA aún no está configurada en el servidor." },
    { status: 503 },
  );
}

function sinCuenta() {
  return NextResponse.json(
    {
      ok: false,
      sinCuenta: true,
      motivo:
        "Para usar la IA hace falta tu cuenta. Comprueba en Ajustes que la nube está conectada.",
    },
    { status: 403 },
  );
}

function cuentaSinComprobar() {
  return NextResponse.json(
    {
      ok: false,
      motivo: "Ahora mismo no se puede comprobar tu cuenta. Inténtalo en un momento.",
    },
    { status: 503 },
  );
}

function topeTexto() {
  return NextResponse.json(
    {
      ok: false,
      topeAlcanzado: true,
      restantes: 0,
      motivo: "Hoy ya has usado tus 30 consultas escritas con IA. Mañana se recargan solas.",
    },
    { status: 429 },
  );
}

function topeFoto() {
  return NextResponse.json(
    {
      ok: false,
      topeAlcanzado: true,
      restantes: 0,
      motivo: "Hoy ya has usado tus 10 fotos con IA. Mañana tienes más.",
    },
    { status: 429 },
  );
}

export function bandaDelDia() {
  return NextResponse.json(
    {
      ok: false,
      topeAlcanzado: true,
      topeGlobalAlcanzado: true,
      restantes: 0,
      motivo:
        "La IA del día está descansando: toda la casa ha llegado al tope compartido. Vuelve mañana.",
    },
    { status: 429 },
  );
}

function congestion(restantes: number) {
  return NextResponse.json(
    {
      ok: false,
      topeAlcanzado: false,
      restantes: Math.max(0, restantes),
      motivo: "Ahora mismo hay mucha gente usando la IA; prueba en un minuto.",
    },
    { status: 429 },
  );
}

function falloIa(motivo: string) {
  return NextResponse.json({ ok: false, motivo }, { status: 502 });
}

/* ------------------------------------------------------------------ */
/* La charla con Google                                                */
/* ------------------------------------------------------------------ */

async function llamarGemini(
  modelo: string,
  partes: unknown[],
  instruccionSistema?: string,
  profundidad: ProfundidadGemini = "minima",
): Promise<{ estado: number; texto: string | null }> {
  const thinkingConfig = thinkingConfigDeModelo(modelo, profundidad);
  const cuerpo: Record<string, unknown> = {
    contents: [{ role: "user", parts: partes }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ESQUEMA_RESPUESTA,
      temperature: 0.2,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    },
  };
  if (instruccionSistema) {
    cuerpo.systemInstruction = { parts: [{ text: instruccionSistema }] };
  }

  const respuesta = await fetch(`${URL_GEMINI}/${modelo}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": (process.env.GEMINI_API_KEY ?? "").trim(),
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(ESPERA_GEMINI_MS),
  });

  if (!respuesta.ok) return { estado: respuesta.status, texto: null };

  const json: unknown = await respuesta.json();
  const texto = extraerTextoCandidato(json);
  return texto !== null ? { estado: 200, texto } : { estado: 502, texto: null };
}

type Resultado =
  | { estado: 200; alimentos: AlimentoIA[] }
  | { estado: 429; motivo: string }
  | { estado: 502; motivo: string };

async function pedirAlimentos(
  partes: unknown[],
  clase: ClaseIA,
  opciones?: { instruccionSistema?: string; notaUsuario?: string; profundidad?: ProfundidadGemini },
): Promise<Resultado> {
  const modelos = clase === "foto" ? MODELOS_FOTO : MODELOS_TEXTO;
  let vio429 = false;

  for (let intento = 0; intento < modelos.length; intento += 1) {
    let r: { estado: number; texto: string | null };
    try {
      r = await llamarGemini(
        modelos[intento],
        partes,
        opciones?.instruccionSistema,
        opciones?.profundidad ?? "minima",
      );
    } catch {
      if (intento < modelos.length - 1) continue;
      return { estado: 502, motivo: "No he podido contactar con la IA. Inténtalo otra vez." };
    }

    // 404: modelo no habilitado en esa clave gratuita -> saltar de inmediato sin espera.
    if (r.estado === 404) continue;

    // 429 o 5xx (sobrecarga en hora punta): esperar un momento y probar el siguiente cubo.
    if (r.estado === 429 || r.estado >= 500) {
      if (r.estado === 429) vio429 = true;
      if (intento < modelos.length - 1) {
        await new Promise((seguir) => setTimeout(seguir, ESPERA_REINTENTO_MS));
        continue;
      }
      break;
    }

    if (r.estado !== 200 || r.texto === null) {
      return { estado: 502, motivo: "La IA no ha respondido bien. Inténtalo otra vez." };
    }

    const alimentos = parsearRespuestaIA(r.texto, opciones?.notaUsuario);
    if (alimentos === null) {
      if (intento < modelos.length - 1) continue;
      return {
        estado: 502,
        motivo: "La IA ha devuelto algo que no he sabido leer. Inténtalo otra vez.",
      };
    }
    return { estado: 200, alimentos };
  }

  if (vio429) {
    return {
      estado: 429,
      motivo: "Ahora mismo hay mucha gente usando la IA; prueba en un minuto.",
    };
  }
  return { estado: 502, motivo: "La IA no ha respondido bien. Inténtalo otra vez." };
}

/* ------------------------------------------------------------------ */
/* El viaje entero                                                     */
/* ------------------------------------------------------------------ */

export async function procesarIA(
  codigo: string,
  partes: unknown[],
  clase: ClaseIA,
  ip = "desconocida",
  opciones?: { instruccionSistema?: string; notaUsuario?: string; profundidad?: ProfundidadGemini },
): Promise<NextResponse> {
  if (frenoIA.castigada(ip)) {
    await frenoIA.esperar();
    return NextResponse.json(
      { ok: false, motivo: "Demasiados intentos. Espera unos minutos." },
      { status: 429 },
    );
  }

  if ((process.env.GEMINI_API_KEY ?? "").trim() === "") return sinIa();

  const limpio = codigo.trim().toUpperCase();
  if (limpio === "") {
    return sinCuenta();
  }
  if (!codigoValido(limpio)) {
    frenoIA.anotarFallo(ip);
    await frenoIA.esperar();
    return sinCuenta();
  }

  const conteo = await leerConteo(limpio);
  if (conteo.estado === "no_existe") {
    frenoIA.anotarFallo(ip);
    await frenoIA.esperar();
    return sinCuenta();
  }
  if (conteo.estado === "error_nube" || conteo.personaId === null) {
    return cuentaSinComprobar();
  }

  const vueloPrevio = leerVuelo(conteo.personaId, clase);
  const restantes = restantesDe(conteo, clase, vueloPrevio);

  if (clase === "texto" && conteo.texto + vueloPrevio >= TOPE_TEXTO) return topeTexto();
  if (clase === "foto" && conteo.fotos + vueloPrevio >= TOPE_FOTO) return topeFoto();
  if (await bandaCerrada(conteo.supabase)) return bandaDelDia();

  const liberar = reservarVuelo(conteo.personaId, clase);
  try {
    const r = await pedirAlimentos(partes, clase, opciones);
    if (r.estado === 429) return congestion(restantes);
    if (r.estado === 502) return falloIa(r.motivo);

    frenoIA.perdonar(ip);
    await anotarUso(conteo, clase);
    await anotarGlobal(conteo.supabase);
    return NextResponse.json({
      ok: true,
      alimentos: r.alimentos,
      restantes: Math.max(0, restantes - 1),
    });
  } finally {
    liberar();
  }
}
