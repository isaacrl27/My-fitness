import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, iguales, sesionValida } from "@/lib/sesion";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { esCrossSite, origen } from "@/lib/origen";
import { crearFreno } from "@/lib/freno";
import { enviarComunicadoGlobal } from "@/lib/comunicados";
import { enviarTelegram } from "@/lib/telegram";

const FRENO = crearFreno();
const TOPE_CUERPO_BYTES = 32 * 1024;
const LARGO_MINIMO = 5;
const LARGO_MAXIMO = 2000;

function mal(motivo: string, estado = 400) {
  return NextResponse.json({ ok: false, motivo }, { status: estado });
}

function esAdmin(codigo: string): boolean {
  const admin = (process.env.ADMIN_CODIGO ?? "").trim().toUpperCase();
  if (!admin) return false;
  return iguales(codigo.trim().toUpperCase(), admin);
}

export async function POST(peticion: NextRequest) {
  if (esCrossSite(peticion)) return mal("Acceso no permitido.", 403);

  const sesion = peticion.cookies.get(COOKIE_SESION)?.value;
  if (!(await sesionValida(sesion))) return mal("Sin sesión", 401);

  const ip = origen(peticion);
  if (FRENO.castigada(ip)) {
    await FRENO.esperar();
    return mal("Demasiados intentos. Espera unos minutos.", 429);
  }

  const codigoHeader = peticion.headers.get("x-codigo") ?? "";
  if (!esAdmin(codigoHeader)) {
    FRENO.anotarFallo(ip);
    await FRENO.esperar();
    return mal("Solo el administrador puede enviar comunicados globales.", 403);
  }

  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) return mal("El mensaje es demasiado largo.", 413);

  let cuerpo: { texto?: unknown };
  try {
    const crudo = await peticion.text();
    if (crudo.length > TOPE_CUERPO_BYTES) return mal("El mensaje es demasiado largo.", 413);
    cuerpo = JSON.parse(crudo) as typeof cuerpo;
  } catch {
    return mal("Petición no válida");
  }

  const texto = typeof cuerpo?.texto === "string" ? cuerpo.texto.trim() : "";
  if (texto.length < LARGO_MINIMO) {
    return mal(`El mensaje debe tener al menos ${LARGO_MINIMO} caracteres.`);
  }
  if (texto.length > LARGO_MAXIMO) {
    return mal(`El mensaje no puede superar los ${LARGO_MAXIMO} caracteres.`);
  }

  const supabase = nubeDeServidor();
  if (!supabase) {
    return mal("Servicio de base de datos no disponible.", 503);
  }

  try {
    const res = await enviarComunicadoGlobal(supabase, texto);

    // Notificar a Telegram para confirmación y registro
    await enviarTelegram(
      `📢 *Comunicado global enviado desde la App por Isaac*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👥 Perfiles actualizados: *${res.perfilesActualizados}*\n` +
        (res.perfilesFallidos > 0 ? `⚠️ Perfiles con error: *${res.perfilesFallidos}*\n` : "") +
        `🔔 Notificaciones push enviadas: *${res.pushEntregados}*\n\n` +
        `"${texto}"`,
    );

    return NextResponse.json({
      ok: true,
      perfilesActualizados: res.perfilesActualizados,
      perfilesFallidos: res.perfilesFallidos,
      pushEntregados: res.pushEntregados,
    });
  } catch (e) {
    console.error("admin/comunicado:", e);
    return mal("No se pudo enviar el comunicado. Inténtalo de nuevo.", 500);
  }
}
