import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, OPCIONES_COOKIE } from "@/lib/sesion";
import { esMismoOrigen } from "@/lib/origen";

/**
 * Cerrar la sesión: borra la cookie y devuelve a la pantalla de entrada.
 * Va por POST a propósito, para que no se cierre sola por pasar el ratón.
 */
export async function POST(peticion: NextRequest) {
  if (!esMismoOrigen(peticion)) {
    return new NextResponse("Acceso no permitido", { status: 403 });
  }
  const respuesta = NextResponse.redirect(new URL("/entrar", peticion.url), 303);
  respuesta.cookies.set(COOKIE_SESION, "", { ...OPCIONES_COOKIE, maxAge: 0 });
  return respuesta;
}
