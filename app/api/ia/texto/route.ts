import { NextResponse, type NextRequest } from "next/server";
import { construirPromptTexto, estaDentro, procesarIA, sinSesion } from "@/lib/ia";
import { esCrossSite, origen } from "@/lib/origen";

/**
 * POST /api/ia/texto: la frase del usuario convertida en alimentos con sus
 * gramos y macros reconciliados físicamente.
 */

const TOPE_CUERPO_BYTES = 32 * 1024;
export const maxDuration = 60;

function mal(motivo: string, estado = 400) {
  return NextResponse.json({ ok: false, motivo }, { status: estado });
}

export async function POST(request: NextRequest) {
  if (esCrossSite(request)) return mal("Acceso no permitido.", 403);
  if (!(await estaDentro(request))) return sinSesion();

  const tamano = Number(request.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) return mal("El texto es demasiado largo.", 413);

  let cuerpo: { texto?: unknown; codigo?: unknown };
  try {
    const crudo = await request.text();
    if (crudo.length > TOPE_CUERPO_BYTES) return mal("El texto es demasiado largo.", 413);
    cuerpo = JSON.parse(crudo) as typeof cuerpo;
  } catch {
    return mal("No entiendo lo que ha llegado.");
  }

  if (typeof cuerpo.texto !== "string") return mal("Falta el texto de la comida.");
  const texto = cuerpo.texto.trim();
  if (texto.length < 3) return mal("El texto tiene que tener al menos 3 caracteres.");
  if (texto.length > 2000) return mal("El texto no puede pasar de 2000 caracteres.");

  const codigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo : "";
  const { instruccionSistema, textoUsuario } = construirPromptTexto(texto);
  const ip = origen(request);
  return procesarIA(
    codigo,
    [{ text: textoUsuario }],
    "texto",
    ip,
    { instruccionSistema, notaUsuario: texto },
  );
}
