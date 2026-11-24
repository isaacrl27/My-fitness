import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";
import { suscripcionBuena } from "@/lib/avisos";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { crearFreno } from "@/lib/freno";
import { esCrossSite, origen } from "@/lib/origen";

/**
 * Guarda (o borra) la suscripción de avisos de un móvil.
 *
 * Está detrás de la puerta de la app, valida el identificador del móvil,
 * comprueba que la dirección del servicio Web Push pertenezca a un proveedor
 * oficial de navegadores (evitando SSRF) y no expone errores internos de la BD.
 */

const frenoSuscripcion = crearFreno({ maxFallos: 15, castigoMs: 2 * 60 * 1000, retardoMs: 300 });
const TOPE_CUERPO_BYTES = 16 * 1024;

export async function POST(peticion: NextRequest) {
  if (esCrossSite(peticion)) {
    return NextResponse.json({ hay: false, motivo: "Acceso no permitido." }, { status: 403 });
  }

  const ip = origen(peticion);
  if (frenoSuscripcion.castigada(ip)) {
    await frenoSuscripcion.esperar();
    return NextResponse.json({ hay: false, motivo: "Demasiados intentos." }, { status: 429 });
  }

  if (!(await sesionValida(peticion.cookies.get(COOKIE_SESION)?.value))) {
    frenoSuscripcion.anotarFallo(ip);
    return NextResponse.json({ hay: false }, { status: 401 });
  }

  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) {
    frenoSuscripcion.anotarFallo(ip);
    return NextResponse.json({ hay: false }, { status: 413 });
  }

  const supabase = nubeDeServidor();
  if (!supabase) {
    return NextResponse.json({ hay: false, motivo: "Sin nube configurada." }, { status: 503 });
  }

  let cuerpo: { dispositivo?: string; suscripcion?: unknown };
  try {
    const texto = await peticion.text();
    if (texto.length > TOPE_CUERPO_BYTES) {
      frenoSuscripcion.anotarFallo(ip);
      return NextResponse.json({ hay: false }, { status: 413 });
    }
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    frenoSuscripcion.anotarFallo(ip);
    return NextResponse.json({ hay: false }, { status: 400 });
  }

  const dispositivo = (cuerpo.dispositivo ?? "").trim();
  if (!dispositivo || dispositivo.length > 120 || !/^[\w-]+$/.test(dispositivo)) {
    frenoSuscripcion.anotarFallo(ip);
    return NextResponse.json({ hay: false, motivo: "Dispositivo no válido." }, { status: 400 });
  }

  const viene = cuerpo.suscripcion ?? null;
  if (viene !== null && !suscripcionBuena(viene)) {
    frenoSuscripcion.anotarFallo(ip);
    return NextResponse.json({ hay: false, motivo: "Esa suscripción no es válida." }, { status: 400 });
  }

  const { error } = await supabase
    .from("dispositivos")
    .upsert({ id: dispositivo, suscripcion: viene }, { onConflict: "id" });

  if (error) {
    console.error("avisos/suscripcion:", error.message);
    return NextResponse.json(
      { hay: false, motivo: "No se ha podido guardar la suscripción." },
      { status: 500 },
    );
  }

  frenoSuscripcion.perdonar(ip);
  return NextResponse.json({ hay: true, activo: viene !== null });
}

export async function GET() {
  return NextResponse.json({ hay: false, motivo: "Esto no se puede leer." }, { status: 405 });
}
