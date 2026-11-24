import { NextResponse, type NextRequest } from "next/server";
import {
  anotarGlobal,
  bandaCerrada,
  bandaDelDia,
  estaDentro,
  reservarVueloGlobal,
  sinSesion,
} from "@/lib/ia";
import { extraerTextoCandidato } from "@/lib/ia-alimentos";
import { crearFreno, crearTopeEnvios } from "@/lib/freno";
import { codigoValido } from "@/lib/nube-mapeo";
import { esCrossSite, origen } from "@/lib/origen";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { ahoraEnMadrid } from "@/lib/avisos";
import {
  ESPERA_GEMINI_MS,
  MODELOS_VISION_IA,
  URL_BASE_GEMINI,
  thinkingConfigDeModelo,
} from "@/lib/gemini-modelos";

export const maxDuration = 60;

/**
 * POST /api/ia/salud: OCR Smart Snap con Gemini para extraer pasos y sueño
 * a partir de una foto directa a la pantalla del reloj o pulsera inteligente
 * (compatible con pulseras chinas de Temu/AliExpress, Da Fit, FitPro, Xiaomi, etc.).
 *
 * Va aparte de las 10 fotos de comida diarias, pero pasa por freno anti-abuso,
 * identifica la cuenta familiar cuando envía `codigo` (aplicando su propio tope
 * de cuenta) y cuenta en la banda diaria global compartida.
 */

const frenoSalud = crearFreno({ maxFallos: 12, castigoMs: 5 * 60 * 1000, retardoMs: 700 });
const topeSalud = crearTopeEnvios({ maximo: 20, ventanaMs: 10 * 60 * 1000 });
const topeSaludCuenta = crearTopeEnvios({ maximo: 20, ventanaMs: 10 * 60 * 1000 });
const topeSaludDiaCuenta = crearTopeEnvios({ maximo: 40, ventanaMs: 24 * 60 * 60 * 1000 });

type RespuestaSaludIA = {
  pasos?: number | null;
  suenoHoras?: number | null;
};

const TOPE_CUERPO_BYTES = 1_024_000;
const TOPE_IMAGEN = 700_000;
const FORMA_BASE64 = /^[A-Za-z0-9+/=\r\n]+$/;
const MIMES_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MODELOS = MODELOS_VISION_IA;

const ESQUEMA_SALUD = {
  type: "OBJECT",
  properties: {
    pasos: { type: "INTEGER", description: "Pasos caminados hoy que aparecen en la pantalla." },
    suenoHoras: { type: "NUMBER", description: "Horas de sueño totales (ej. 7.5 para 7h 30min)." },
  },
};

const INSTRUCCION_SISTEMA =
  "Eres un reconocedor óptico (OCR) inteligente para relojes y pulseras de actividad (Xiaomi, Amazfit, Da Fit, FitPro, Apple Watch, Garmin, etc.). " +
  "Tu única tarea es leer los números que aparecen en la pantalla del reloj o captura de la app. " +
  "Extrae el total de pasos de hoy y/o las horas de sueño. Si los números no aparecen o no son legibles, devuelve null en ese campo. " +
  "Responde estrictamente en JSON.";

function mal(motivo: string, estado = 400) {
  return NextResponse.json({ ok: false, motivo }, { status: estado });
}

export async function POST(request: NextRequest) {
  if (esCrossSite(request)) return mal("Acceso no permitido.", 403);
  if (!(await estaDentro(request))) return sinSesion();

  const ip = origen(request);
  if (frenoSalud.castigada(ip)) {
    await frenoSalud.esperar();
    return mal("Demasiados intentos. Espera unos minutos.", 429);
  }
  if (!topeSalud.permite(ip)) {
    return mal("Has escaneado muchas pantallas seguidas. Espera unos minutos.", 429);
  }

  const tamano = Number(request.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) {
    frenoSalud.anotarFallo(ip);
    return mal("La imagen pesa demasiado: mándala más pequeña.", 413);
  }

  let cuerpo: { imagen?: unknown; mime?: unknown; codigo?: unknown };
  try {
    const texto = await request.text();
    if (texto.length > TOPE_CUERPO_BYTES) {
      frenoSalud.anotarFallo(ip);
      return mal("La imagen pesa demasiado: mándala más pequeña.", 413);
    }
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    frenoSalud.anotarFallo(ip);
    return mal("No entiendo lo que ha llegado.");
  }

  if (typeof cuerpo.imagen !== "string" || cuerpo.imagen.trim() === "") {
    frenoSalud.anotarFallo(ip);
    return mal("Falta la imagen.");
  }
  const imagen = cuerpo.imagen.trim().replace(/^data:[^,]*,/, "").trim();
  if (imagen === "") {
    frenoSalud.anotarFallo(ip);
    return mal("Falta la imagen.");
  }
  if (imagen.length > TOPE_IMAGEN) {
    frenoSalud.anotarFallo(ip);
    return mal("La imagen pesa demasiado: mándala más pequeña.", 413);
  }
  if (!FORMA_BASE64.test(imagen)) {
    frenoSalud.anotarFallo(ip);
    return mal("El formato de la imagen no es válido.");
  }

  let mime = "image/jpeg";
  if (typeof cuerpo.mime === "string" && cuerpo.mime.trim() !== "") {
    let candidato = cuerpo.mime.trim().toLowerCase();
    if (candidato === "image/jpg") candidato = "image/jpeg";
    if (candidato === "image/heif") candidato = "image/heic";
    if (!MIMES_PERMITIDOS.has(candidato)) {
      frenoSalud.anotarFallo(ip);
      return mal("Formato de imagen no soportado. Usa JPEG, PNG, WebP o HEIC.");
    }
    mime = candidato;
  }

  const claveGemini = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!claveGemini) {
    return mal("La IA no está configurada en el servidor.", 503);
  }

  const supabase = nubeDeServidor();
  const codigoLimpio = typeof cuerpo.codigo === "string" ? cuerpo.codigo.trim().toUpperCase() : "";
  let personaId: string | null = null;
  if (codigoLimpio !== "") {
    if (!codigoValido(codigoLimpio)) {
      frenoSalud.anotarFallo(ip);
      await frenoSalud.esperar();
      return mal("Tu cuenta no es válida.", 403);
    }
    if (!supabase) {
      return mal("Ahora mismo no se puede comprobar tu cuenta. Inténtalo en un momento.", 503);
    }
    const { data: persona, error: errorPersona } = await supabase
      .from("personas")
      .select("id")
      .eq("codigo", codigoLimpio)
      .maybeSingle();
    if (errorPersona) {
      return mal("Ahora mismo no se puede comprobar tu cuenta. Inténtalo en un momento.", 503);
    }
    personaId = (persona as { id?: string | null } | null)?.id ?? null;
    if (!personaId) {
      frenoSalud.anotarFallo(ip);
      await frenoSalud.esperar();
      return mal("Para usar el lector hace falta tu cuenta. Comprueba en Ajustes.", 403);
    }
    if (!topeSaludCuenta.permite(personaId) || !topeSaludDiaCuenta.permite(personaId)) {
      return mal("Has escaneado muchas pantallas desde tu cuenta. Prueba más tarde.", 429);
    }
  }

  if (await bandaCerrada(supabase)) {
    return bandaDelDia();
  }

  const mad = ahoraEnMadrid(new Date());
  const horaStr = `${String(mad.hora).padStart(2, "0")}:${String(mad.minuto).padStart(2, "0")}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mime, data: imagen } },
          {
            text: `Lee los pasos y horas de sueño de esta pantalla de reloj o pulsera. La foto se tomó a las ${horaStr} (hora de Madrid); NO confundas la hora del reloj (${horaStr}) con las horas de sueño ni con los pasos.`,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: INSTRUCCION_SISTEMA }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ESQUEMA_SALUD,
      temperature: 0.1,
    },
  };

  let respuestaJson: RespuestaSaludIA | null = null;
  let vio429 = false;
  const liberarGlobal = reservarVueloGlobal();

  try {
    for (const modelo of MODELOS) {
      try {
        const thinkingConfig = thinkingConfigDeModelo(modelo, "baja");
        const payloadModelo = {
          ...payload,
          generationConfig: {
            ...payload.generationConfig,
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        };
        const res = await fetch(`${URL_BASE_GEMINI}/${modelo}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": claveGemini,
          },
          body: JSON.stringify(payloadModelo),
          signal: AbortSignal.timeout(ESPERA_GEMINI_MS),
        });

        if (res.status === 429) {
          vio429 = true;
          continue;
        }
        if (res.status === 404 || res.status >= 500) continue;
        if (!res.ok) break;

        const datos = (await res.json()) as unknown;
        const textoRespuesta = extraerTextoCandidato(datos);
        if (textoRespuesta) {
          const limpio = textoRespuesta
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
          const parseado = JSON.parse(limpio) as RespuestaSaludIA;
          if (parseado && typeof parseado === "object") {
            respuestaJson = parseado;
            break;
          }
        }
      } catch {
        continue;
      }
    }
  } finally {
    liberarGlobal();
  }

  if (!respuestaJson) {
    if (vio429) {
      return mal("Ahora mismo hay mucha gente usando la IA; prueba en un minuto.", 429);
    }
    return mal("No se han podido leer los datos de la pantalla. Prueba con una foto más clara.", 502);
  }

  frenoSalud.perdonar(ip);
  topeSalud.anotar(ip);
  if (personaId) {
    topeSaludCuenta.anotar(personaId);
    topeSaludDiaCuenta.anotar(personaId);
  }
  await anotarGlobal(supabase);

  const resValida: RespuestaSaludIA = respuestaJson;
  let pasos: number | null = null;
  if (
    typeof resValida.pasos === "number" &&
    Number.isInteger(resValida.pasos) &&
    resValida.pasos >= 50 &&
    resValida.pasos <= 65_000
  ) {
    pasos = resValida.pasos;
  }

  let suenoHoras: number | null = null;
  if (
    typeof resValida.suenoHoras === "number" &&
    Number.isFinite(resValida.suenoHoras) &&
    resValida.suenoHoras >= 1.0 &&
    resValida.suenoHoras <= 16.0
  ) {
    suenoHoras = Math.round(resValida.suenoHoras * 100) / 100;
  }

  if (pasos === null && suenoHoras === null) {
    return NextResponse.json({
      ok: false,
      motivo: "No he encontrado números de pasos ni de sueño en la foto. Apúntalos con los botones rápidos o prueba con otra foto.",
    });
  }

  return NextResponse.json({
    ok: true,
    pasos,
    suenoHoras,
  });
}
