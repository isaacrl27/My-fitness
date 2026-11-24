import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, OPCIONES_COOKIE, hayClave, iguales, invitacionCorrecta, rutaInterna, valorSesion } from "@/lib/sesion";
import { leerConfigNube } from "@/lib/config-nube";
import {
  crearFreno,
  castigadaPersistente,
  anotarFalloPersistente,
  perdonarPersistente,
} from "@/lib/freno";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { esMismoOrigen, origen } from "@/lib/origen";

/**
 * Cuenta de fallos por dirección de origen.
 *
 * El contador vive en la memoria de cada instancia del servidor con tope de
 * direcciones y retardo obligatorio antes de cada error, haciendo inviable
 * probar claves por fuerza bruta.
 */
const freno = crearFreno({ maxFallos: 8, castigoMs: 5 * 60 * 1000, retardoMs: 700 });
const TOPE_CUERPO_BYTES = 16 * 1024;

export async function POST(peticion: NextRequest) {
  if (!esMismoOrigen(peticion)) {
    return new NextResponse("Acceso no permitido", { status: 403 });
  }

  // Fail-closed estricto: sin clave configurada en el servidor se bloquea con 500.
  if (!hayClave()) {
    return new NextResponse("La app no tiene clave configurada. Avisa a quien la mantiene.", {
      status: 500,
    });
  }

  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) {
    return new NextResponse("Petición demasiado grande", { status: 413 });
  }

  const ip = origen(peticion);
  const supabase = nubeDeServidor();

  // Freno comprobado ANTES de leer formData: una IP castigada no puede forzar
  // al servidor a cargar formularios pesados en memoria.
  if (await castigadaPersistente(freno, supabase, ip, "freno:entrar")) {
    await freno.esperar();
    return NextResponse.redirect(new URL("/entrar?error=1", peticion.url), 303);
  }

  let escrita = "";
  let invitacion = "";
  let siguiente = "/";
  try {
    const datos = await peticion.formData();
    escrita = String(datos.get("clave") ?? "").trim();
    invitacion = String(datos.get("invitacion") ?? "").trim();
    siguiente = rutaInterna(datos.get("siguiente"));
  } catch {
    return new NextResponse("Petición no válida", { status: 400 });
  }

  // 1. Acceso directo con enlace de invitación válido (sin pedir contraseña)
  if (invitacion) {
    const config = await leerConfigNube();
    if (invitacionCorrecta(invitacion, config.invitacion)) {
      await perdonarPersistente(freno, supabase, ip, "freno:entrar");
      const respuesta = NextResponse.redirect(new URL(siguiente, peticion.url), 303);
      respuesta.cookies.set(COOKIE_SESION, await valorSesion(), OPCIONES_COOKIE);
      return respuesta;
    }
  }

  const clave = (process.env.CLAVE_APP ?? "").trim();
  const fallo = new URL(`/entrar?error=1&siguiente=${encodeURIComponent(siguiente)}`, peticion.url);

  const acierto = clave.length > 0 && escrita.length <= 256 && iguales(escrita, clave);

  if (!acierto) {
    await anotarFalloPersistente(freno, supabase, ip, {
      maxFallos: 8,
      castigoMs: 5 * 60 * 1000,
      prefijo: "freno:entrar",
    });
    await freno.esperar();
    return NextResponse.redirect(fallo, 303);
  }

  await perdonarPersistente(freno, supabase, ip, "freno:entrar");
  const respuesta = NextResponse.redirect(new URL(siguiente, peticion.url), 303);
  respuesta.cookies.set(COOKIE_SESION, await valorSesion(), OPCIONES_COOKIE);
  return respuesta;
}
