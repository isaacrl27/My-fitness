import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";
import { crearFreno } from "@/lib/freno";
import { esCrossSite, origen } from "@/lib/origen";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import {
  crearCompraHogarInicial,
  esCodigoDeRecuperacion,
  generarCodigoHogar,
  normalizarCodigoHogar,
  nuevoCodigoMiembro,
  ordenarMiembrosDeHogar,
  validarItemCompra,
  type CompraHogar,
} from "@/lib/social";

const frenoHogar = crearFreno({ maxFallos: 10, castigoMs: 5 * 60 * 1000, retardoMs: 700 });
const TOPE_CUERPO_BYTES = 64 * 1024;
const TOPE_LOTE_ITEMS = 100;
const REGEX_CODIGO_HOGAR = /^[A-Z0-9-]{3,20}$/i;

const CABECERAS_NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function esCodigoHogarValido(codigo: string): boolean {
  return typeof codigo === "string" && REGEX_CODIGO_HOGAR.test(codigo);
}

function claveSecretoHogar(codigo: string): string {
  return `hogar:${normalizarCodigoHogar(codigo)}`;
}

/**
 * Sanitiza identificadores de usuario para que jamás un código de cuenta de 6 letras
 * sea expuesto como identificador público dentro de una lista de compra familiar.
 */
function asegurarIdentificadorAnonimo(codigo: string, nombre: string): string {
  const limpio = (codigo || "").trim().slice(0, 80);
  if (!limpio || esCodigoDeRecuperacion(limpio)) {
    return nuevoCodigoMiembro(nombre);
  }
  return limpio;
}

/**
 * Mutación 100% atómica mediante la función RPC PostgreSQL con FOR UPDATE.
 * Falla de forma cerrada (throw) si la RPC no está disponible o falla,
 * impidiendo escrituras no atómicas concurrentes.
 */
async function mutarHogarAtomicoRPC(
  codigo: string,
  accion: string,
  payload: Record<string, unknown>,
): Promise<CompraHogar | null> {
  const supabase = nubeDeServidor();
  if (!supabase) throw new Error("La mutación atómica del hogar no está disponible: sin conexión de servidor.");

  const { data, error } = await supabase.rpc("operar_grupo_familiar", {
    p_clave: claveSecretoHogar(codigo),
    p_accion: accion,
    p_payload: payload,
  });
  if (error) throw new Error(`RPC del hogar (${accion}): ${error.message}`);
  if (!data) return null;
  const obj = (typeof data === "string" ? JSON.parse(data) : data) as CompraHogar;
  return ordenarMiembrosDeHogar(obj);
}

async function leerHogarDeNube(codigo: string): Promise<CompraHogar | null> {
  const supabase = nubeDeServidor();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("secretos")
      .select("valor")
      .eq("nombre", claveSecretoHogar(codigo))
      .maybeSingle();

    if (error || !data || !data.valor) return null;
    const crudo = JSON.parse(data.valor) as CompraHogar;
    return ordenarMiembrosDeHogar(crudo);
  } catch {
    return null;
  }
}

/**
 * Inserta una lista de hogar nueva rechazando colisiones de código existente
 * (error Postgres 23505) y reintentando con otro código aleatorio.
 */
async function crearHogarSinColision(hogarInicial: CompraHogar): Promise<CompraHogar | null> {
  const supabase = nubeDeServidor();
  if (!supabase) return null;

  let candidato = ordenarMiembrosDeHogar(hogarInicial);
  for (let intento = 0; intento < 8; intento += 1) {
    const { error } = await supabase.from("secretos").insert({
      nombre: claveSecretoHogar(candidato.codigo),
      valor: JSON.stringify(candidato),
    });
    if (!error) return candidato;
    if (error.code !== "23505") return null;
    candidato = { ...candidato, codigo: generarCodigoHogar() };
  }
  return null;
}

async function hogarNoEncontrado(ip: string, mensaje = "Hogar no encontrado.") {
  frenoHogar.anotarFallo(ip);
  await frenoHogar.esperar();
  return NextResponse.json({ ok: false, error: mensaje }, { status: 404 });
}

export async function GET(peticion: NextRequest) {
  const ip = origen(peticion);
  if (frenoHogar.castigada(ip)) {
    await frenoHogar.esperar();
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  if (!(await sesionValida(peticion.cookies.get(COOKIE_SESION)?.value))) {
    frenoHogar.anotarFallo(ip);
    return NextResponse.json({ ok: false, error: "Sin sesión." }, { status: 401 });
  }

  const { searchParams } = new URL(peticion.url);
  const rawCodigo = searchParams.get("codigo") ?? "";
  const codigo = normalizarCodigoHogar(rawCodigo);

  if (!codigo || !esCodigoHogarValido(codigo)) {
    return NextResponse.json({ ok: false, error: "Código de hogar no proporcionado o no válido." }, { status: 400 });
  }

  const hogar = await leerHogarDeNube(codigo);
  if (!hogar) {
    return hogarNoEncontrado(ip, "Lista del hogar no encontrada.");
  }

  frenoHogar.perdonar(ip);
  return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
}

export async function POST(peticion: NextRequest) {
  if (esCrossSite(peticion)) {
    return NextResponse.json({ ok: false, error: "Acceso no permitido." }, { status: 403 });
  }

  const ip = origen(peticion);
  if (frenoHogar.castigada(ip)) {
    await frenoHogar.esperar();
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  if (!(await sesionValida(peticion.cookies.get(COOKIE_SESION)?.value))) {
    frenoHogar.anotarFallo(ip);
    return NextResponse.json({ ok: false, error: "Sin sesión." }, { status: 401 });
  }

  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) {
    return NextResponse.json({ ok: false, error: "Petición demasiado grande." }, { status: 413 });
  }

  let cuerpo: Record<string, unknown> = {};
  try {
    const texto = await peticion.text();
    if (texto.length > TOPE_CUERPO_BYTES) {
      return NextResponse.json({ ok: false, error: "Petición demasiado grande." }, { status: 413 });
    }
    cuerpo = JSON.parse(texto) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Petición no válida." }, { status: 400 });
  }

  const accion = String(cuerpo.accion ?? "");

  // 1. Crear nueva compra de hogar
  if (accion === "crear") {
    const nombre = String(cuerpo.nombre ?? "Compra de Casa").trim().slice(0, 50) || "Compra de Casa";
    const creadorNombre = String(cuerpo.creadorNombre ?? "Yo").trim().slice(0, 30) || "Yo";
    const creadorCodigo = asegurarIdentificadorAnonimo(String(cuerpo.creadorCodigo ?? ""), creadorNombre);
    const creadorAvatar = String(cuerpo.creadorAvatar ?? "🏡").slice(0, 8) || "🏡";

    const hogar = crearCompraHogarInicial(nombre, {
      codigo: creadorCodigo,
      nombre: creadorNombre,
      avatar: creadorAvatar,
    });

    const hogarCreado = await crearHogarSinColision(hogar);
    if (!hogarCreado) {
      return NextResponse.json(
        { ok: false, error: "No se pudo guardar la lista del hogar en la nube." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogarCreado) }, { headers: CABECERAS_NO_CACHE });
  }

  // 2. Unirse a una compra de hogar
  if (accion === "unirse") {
    const codigo = normalizarCodigoHogar(String(cuerpo.codigo ?? ""));
    if (!codigo || !esCodigoHogarValido(codigo)) {
      return NextResponse.json({ ok: false, error: "Escribe el código del hogar." }, { status: 400 });
    }

    const miembroNombre = String(cuerpo.miembroNombre ?? "Familiar").trim().slice(0, 30) || "Familiar";
    const miembroCodigo = asegurarIdentificadorAnonimo(String(cuerpo.miembroCodigo ?? ""), miembroNombre);
    const miembroAvatar = String(cuerpo.miembroAvatar ?? "🏡").slice(0, 8) || "🏡";

    try {
      const hogar = await mutarHogarAtomicoRPC(codigo, "hogar_unirse", {
        codigo: miembroCodigo,
        nombre: miembroNombre,
        avatar: miembroAvatar,
      });
      if (!hogar) return hogarNoEncontrado(ip, "Código de hogar no encontrado.");
      frenoHogar.perdonar(ip);
      return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
    } catch (e) {
      console.error("compra/unirse RPC error:", e);
      return NextResponse.json({ ok: false, error: "Error al unirse al hogar." }, { status: 500 });
    }
  }

  // 3. Modificaciones de items de compra (atómicas)
  if (accion === "item_compra") {
    const codigo = normalizarCodigoHogar(String(cuerpo.codigo ?? ""));
    if (!codigo || !esCodigoHogarValido(codigo)) {
      return NextResponse.json({ ok: false, error: "Código de hogar no válido." }, { status: 400 });
    }
    const subAccion = String(cuerpo.subAccion ?? "");

    try {
      if (subAccion === "anadir") {
        const nombre = String(cuerpo.nombre ?? "").trim().slice(0, 60);
        const v = validarItemCompra(nombre);
        if (!v.ok) {
          return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
        }
        const cantidad = String(cuerpo.cantidad ?? "1").trim().slice(0, 30);
        const nuevoItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          nombre,
          cantidad,
          comprado: false,
          fecha: new Date().toISOString(),
        };

        const hogar = await mutarHogarAtomicoRPC(codigo, "compra_anadir", { item: nuevoItem });
        if (!hogar) return hogarNoEncontrado(ip);
        frenoHogar.perdonar(ip);
        return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
      }

      if (subAccion === "anadir_lote") {
        const itemsRaw = Array.isArray(cuerpo.items) ? cuerpo.items.slice(0, TOPE_LOTE_ITEMS) : [];
        const itemsValidos: { nombre: string; cantidad?: string }[] = [];
        for (const raw of itemsRaw) {
          const nombre = typeof raw === "string" ? raw : String(raw?.nombre ?? "");
          const cantidad = typeof raw === "object" && raw?.cantidad ? String(raw.cantidad).slice(0, 30) : "1";
          if (validarItemCompra(nombre).ok) {
            itemsValidos.push({ nombre: nombre.trim().slice(0, 60), cantidad });
          }
        }

        if (itemsValidos.length > 0) {
          const nuevos = itemsValidos.map((it) => ({
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nombre: it.nombre,
            cantidad: it.cantidad ?? "1",
            comprado: false,
            fecha: new Date().toISOString(),
          }));

          const hogar = await mutarHogarAtomicoRPC(codigo, "compra_anadir", { nuevos });
          if (!hogar) return hogarNoEncontrado(ip);
          frenoHogar.perdonar(ip);
          return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
        }

        const hogar = await leerHogarDeNube(codigo);
        if (!hogar) return hogarNoEncontrado(ip);
        frenoHogar.perdonar(ip);
        return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
      }

      if (subAccion === "alternar") {
        const itemId = String(cuerpo.itemId ?? "").slice(0, 80);
        const personaNombre = String(cuerpo.personaNombre ?? "Alguien").trim().slice(0, 30) || "Alguien";
        const hogar = await mutarHogarAtomicoRPC(codigo, "compra_alternar", { itemId, personaNombre });
        if (!hogar) return hogarNoEncontrado(ip);
        frenoHogar.perdonar(ip);
        return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
      }

      if (subAccion === "borrar") {
        const itemId = String(cuerpo.itemId ?? "").slice(0, 80);
        const hogar = await mutarHogarAtomicoRPC(codigo, "compra_borrar", { itemId });
        if (!hogar) return hogarNoEncontrado(ip);
        frenoHogar.perdonar(ip);
        return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
      }

      if (subAccion === "limpiar_comprados") {
        const hogar = await mutarHogarAtomicoRPC(codigo, "compra_limpiar", {});
        if (!hogar) return hogarNoEncontrado(ip);
        frenoHogar.perdonar(ip);
        return NextResponse.json({ ok: true, hogar: ordenarMiembrosDeHogar(hogar) }, { headers: CABECERAS_NO_CACHE });
      }
    } catch (e) {
      console.error("compra/item_compra RPC error:", e);
      return NextResponse.json({ ok: false, error: "Error al actualizar la lista de compra." }, { status: 500 });
    }
  }

  // 4. Salir o desvincularse del hogar
  if (accion === "salir") {
    const codigo = normalizarCodigoHogar(String(cuerpo.codigo ?? ""));
    const miembroCodigo = String(cuerpo.miembroCodigo ?? "").trim().slice(0, 80);
    if (!codigo || !esCodigoHogarValido(codigo) || !miembroCodigo) {
      return NextResponse.json({ ok: false, error: "Datos incompletos." }, { status: 400 });
    }

    try {
      await mutarHogarAtomicoRPC(codigo, "salir", { miembroCodigo });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("compra/salir RPC error:", e);
      return NextResponse.json({ ok: false, error: "Error al salir del hogar." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "Acción no reconocida." }, { status: 400 });
}
