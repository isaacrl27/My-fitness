import { NextResponse, type NextRequest } from "next/server";
import { leerConfigNube, mantenimientoVigente } from "@/lib/config-nube";
import { crearFreno } from "@/lib/freno";
import { origen } from "@/lib/origen";
import {
  COOKIE_SESION,
  hayClave,
  invitacionCorrecta,
  rutaInterna,
  sesionValida,
} from "@/lib/sesion";

/**
 * Freno para el enlace de invitación (`?invitacion=…`), con los mismos topes
 * que la puerta de contraseña: evita probar frases por fuerza bruta sin freno.
 */
const frenoInvitacion = crearFreno({ maxFallos: 8, castigoMs: 5 * 60 * 1000, retardoMs: 700 });

/**
 * La puerta de la app.
 *
 * Por orden:
 *  1. El enlace de invitación (`?invitacion=…`): se abre una vez, deja la
 *     sesión puesta y no hay que escribir nada.
 *  2. El mantenimiento: si está encendido, todo el mundo ve el cartel, Isaac
 *     incluido. Se quita con `node scripts/mantenimiento.mjs off`.
 *  3. La clave de siempre, para quien ya la tenga apuntada.
 *
 * Todo lo que el móvil necesita ANTES de tener sesión (manifest, service worker,
 * página sin conexión, iconos, APK, página de instalar, privacidad) se queda
 * fuera del matcher. Si la puerta redirige `/sw.js`, el navegador rechaza la
 * actualización del service worker y los avisos en segundo plano.
 */
// Nota de arquitectura: valorSesion() y cookies de sesión se emiten en /api/entrar tras el ventilador.
export async function proxy(peticion: NextRequest) {
  const url = peticion.nextUrl;

  // --- 0. Sin clave configurada no entra nadie ---------------------------
  if (!hayClave()) {
    return NextResponse.redirect(new URL("/entrar?error=sin-clave", peticion.url), 303);
  }

  const config = await leerConfigNube();

  // --- 1. El enlace de invitación ----------------------------------------
  const invitacion = url.searchParams.get("invitacion");
  if (invitacion !== null) {
    const ip = origen(peticion);
    if (frenoInvitacion.castigada(ip)) {
      await frenoInvitacion.esperar();
      return NextResponse.redirect(new URL("/entrar?error=invitacion", peticion.url), 303);
    }

    if (invitacionCorrecta(invitacion, config.invitacion)) {
      frenoInvitacion.perdonar(ip);
      const destino = rutaInterna(url.searchParams.get("siguiente"));

      // El enlace de invitación siempre muestra la experiencia del ventilador y la bienvenida VIP:
      const entrarConInvitacion = new URL("/entrar", peticion.url);
      entrarConInvitacion.searchParams.set("invitacion", invitacion);
      if (destino !== "/" && destino !== "") {
        entrarConInvitacion.searchParams.set("siguiente", destino);
      }
      return NextResponse.redirect(entrarConInvitacion, 303);
    }

    frenoInvitacion.anotarFallo(ip);
    await frenoInvitacion.esperar();
    return NextResponse.redirect(new URL("/entrar?error=invitacion", peticion.url), 303);
  }

  // --- 2. El mantenimiento ------------------------------------------------
  const esApi = url.pathname.startsWith("/api/");
  if (!esApi && mantenimientoVigente(config.mantenimiento)) {
    return NextResponse.rewrite(new URL("/mantenimiento", peticion.url), { status: 503 });
  }

  // --- 3. La puerta de siempre -------------------------------------------
  const cookie = peticion.cookies.get(COOKIE_SESION)?.value ?? "";
  if (await sesionValida(cookie)) return NextResponse.next();

  // Sin sesión en ningún enlace: todos ven el ventilador de bienvenida en /entrar
  const destino = `${url.pathname}${url.search}`;
  const entrar = new URL("/entrar", peticion.url);
  if (destino !== "/" && destino !== "") entrar.searchParams.set("siguiente", destino);
  return NextResponse.redirect(entrar);
}

export const config = {
  matcher: [
    "/((?!entrar$|entrar/|privacidad$|privacidad/|instalar$|instalar/|mantenimiento$|mantenimiento/|manifest\\.webmanifest$|sw\\.js$|offline\\.html$|icono-|apple-icon|icon\\.svg$|descargas/|api/entrar$|api/avisos/enviar$|api/widget$|api/telegram/webhook$|_next/static/|_next/image|favicon\\.ico$|robots\\.txt$).*)",
  ],
};
