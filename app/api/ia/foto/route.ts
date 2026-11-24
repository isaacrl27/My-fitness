import { NextResponse, type NextRequest } from "next/server";
import { construirPromptFoto, estaDentro, procesarIA, sinSesion, type ModoFotoIA } from "@/lib/ia";
import { esCrossSite, origen } from "@/lib/origen";

/**
 * POST /api/ia/foto: convierte la foto de un plato (con la nota/cantidades del
 * usuario) o de una tabla nutricional (`modo: "etiqueta"`) en alimentos exactos.
 *
 * Admite fotos nativas de iPhone (HEIC) y Android/cámaras (JPEG, PNG, WebP)
 * hasta 4 MB en base64 (dentro de los 4.5 MB de límite de función en Vercel).
 */

const TOPE_CUERPO_BYTES = 4_500_000;
const TOPE_IMAGEN = 4_000_000;
export const maxDuration = 60;
const FORMA_BASE64 = /^[A-Za-z0-9+/=\r\n]+$/;
const MIMES_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function mal(motivo: string, estado = 400) {
  return NextResponse.json({ ok: false, motivo }, { status: estado });
}

export async function POST(request: NextRequest) {
  if (esCrossSite(request)) return mal("Acceso no permitido.", 403);
  if (!(await estaDentro(request))) return sinSesion();

  const tamano = Number(request.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) {
    return mal("La imagen pesa demasiado: mándala más pequeña.", 413);
  }

  let cuerpo: {
    imagen?: unknown;
    mime?: unknown;
    codigo?: unknown;
    comentario?: unknown;
    nota?: unknown;
    modo?: unknown;
  };
  try {
    const texto = await request.text();
    if (texto.length > TOPE_CUERPO_BYTES) {
      return mal("La imagen pesa demasiado: mándala más pequeña.", 413);
    }
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    return mal("No entiendo lo que ha llegado.");
  }

  if (typeof cuerpo.imagen !== "string" || cuerpo.imagen.trim() === "") {
    return mal("Falta la imagen.");
  }
  const imagen = cuerpo.imagen.trim().replace(/^data:[^,]*,/, "").trim();
  if (imagen === "") return mal("Falta la imagen.");
  if (imagen.length > TOPE_IMAGEN) {
    return mal("La imagen pesa demasiado: mándala más pequeña.", 413);
  }
  if (!FORMA_BASE64.test(imagen)) return mal("El formato de la imagen no es válido.");

  let mime = "image/jpeg";
  if (typeof cuerpo.mime === "string" && cuerpo.mime.trim() !== "") {
    let candidato = cuerpo.mime.trim().toLowerCase();
    if (candidato === "image/jpg") candidato = "image/jpeg";
    if (candidato === "image/heif") candidato = "image/heic";
    if (!MIMES_PERMITIDOS.has(candidato)) {
      return mal("Formato de imagen no soportado. Usa JPEG, PNG, WebP o HEIC.");
    }
    mime = candidato;
  }

  const codigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo : "";
  const modo: ModoFotoIA = cuerpo.modo === "etiqueta" ? "etiqueta" : "plato";

  const comentarioRaw =
    typeof cuerpo.comentario === "string"
      ? cuerpo.comentario
      : typeof cuerpo.nota === "string"
        ? cuerpo.nota
        : "";
  const comentario = comentarioRaw.trim().slice(0, 500);
  const { instruccionSistema, textoUsuario } = construirPromptFoto(comentario, modo);

  const ip = origen(request);
  return procesarIA(
    codigo,
    [
      { inlineData: { mimeType: mime, data: imagen } },
      { text: textoUsuario },
    ],
    "foto",
    ip,
    {
      instruccionSistema,
      notaUsuario: modo === "plato" ? comentario : undefined,
      profundidad: modo === "etiqueta" ? "baja" : "minima",
    },
  );
}
