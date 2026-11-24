import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";
import { crearFreno } from "@/lib/freno";
import { esCrossSite, origen } from "@/lib/origen";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { esFuncionRpcAusente } from "@/lib/nube-mapeo";
import { enviarPushPorCodigo } from "@/lib/push";
import {
  anadirItemCompra,
  anadirLoteCompra,
  anadirMiembroAGrupo,
  anadirReaccion,
  alternarItemCompra,
  borrarItemCompra,
  crearGrupoInicial,
  esCodigoDeRecuperacion,
  generarCodigoGrupo,
  limpiarCompradosGrupo,
  META_HABITOS_SEMANA_DEFECTO,
  normalizarCodigoGrupo,
  nuevoCodigoMiembro,
  ordenarMiembrosDeGrupo,
  baseDeMiembro,
  validarItemCompra,
  validarNombreGrupo,
  type GrupoFamiliar,
  type MiembroGrupo,
  type TipoReaccion,
} from "@/lib/social";

const frenoSocial = crearFreno({ maxFallos: 10, castigoMs: 5 * 60 * 1000, retardoMs: 700 });
const TOPE_CUERPO_BYTES = 64 * 1024;
const TOPE_LOTE_ITEMS = 100;
const REGEX_CODIGO_GRUPO = /^[A-Z0-9-]{3,20}$/i;

const CABECERAS_NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function acotarEntero(valor: unknown, min: number, max: number, defecto: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n)) return defecto;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function esCodigoGrupoValido(codigo: string): boolean {
  return typeof codigo === "string" && REGEX_CODIGO_GRUPO.test(codigo);
}

function claveSecreto(codigo: string): string {
  return `grupo:${normalizarCodigoGrupo(codigo)}`;
}

/**
 * Sanitiza identificadores de usuario para que jamás un código de cuenta de 6 letras
 * sea expuesto como identificador público dentro de un grupo familiar.
 */
function asegurarIdentificadorAnonimo(codigo: string, nombre: string): string {
  const limpio = (codigo || "").trim().slice(0, 80);
  if (!limpio || esCodigoDeRecuperacion(limpio)) {
    return nuevoCodigoMiembro(nombre);
  }
  return limpio;
}

async function leerGrupoDeNube(codigo: string): Promise<GrupoFamiliar | null> {
  const supabase = nubeDeServidor();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("secretos")
      .select("valor")
      .eq("nombre", claveSecreto(codigo))
      .maybeSingle();

    if (error || !data || !data.valor) return null;
    const crudo = JSON.parse(data.valor) as GrupoFamiliar;
    return ordenarMiembrosDeGrupo(crudo);
  } catch {
    return null;
  }
}

async function guardarGrupoEnNube(grupo: GrupoFamiliar): Promise<boolean> {
  const supabase = nubeDeServidor();
  if (!supabase) return false;

  const limpio = ordenarMiembrosDeGrupo(grupo);
  try {
    const { error } = await supabase
      .from("secretos")
      .upsert(
        {
          nombre: claveSecreto(limpio.codigo),
          valor: JSON.stringify(limpio),
        },
        { onConflict: "nombre" },
      );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Inserta un grupo nuevo rechazando colisiones de código (error Postgres 23505)
 * y reintentando con otro código aleatorio antes de rendirse.
 */
async function crearGrupoSinColision(grupoInicial: GrupoFamiliar): Promise<GrupoFamiliar | null> {
  const supabase = nubeDeServidor();
  if (!supabase) return null;

  let candidato = ordenarMiembrosDeGrupo(grupoInicial);
  for (let intento = 0; intento < 8; intento += 1) {
    const { error } = await supabase.from("secretos").insert({
      nombre: claveSecreto(candidato.codigo),
      valor: JSON.stringify(candidato),
    });
    if (!error) return candidato;
    if (error.code !== "23505") return null;
    candidato = { ...candidato, codigo: generarCodigoGrupo() };
  }
  return null;
}

async function persistirGrupoORespuesta(grupo: GrupoFamiliar) {
  if (!(await guardarGrupoEnNube(grupo))) {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar el grupo en la nube." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { ok: true, grupo: ordenarMiembrosDeGrupo(grupo) },
    { headers: CABECERAS_NO_CACHE },
  );
}

/**
 * Intenta ejecutar la mutación atómica en Postgres con bloqueo FOR UPDATE.
 * Solo cae al fallback JS si la función RPC aún no está instalada (`PGRST202`/`42883`);
 * errores reales de red o base de datos lanzan excepción para evitar escrituras no atómicas.
 */
async function mutarGrupoAtomicoRPC(
  codigo: string,
  accion: string,
  payload: Record<string, unknown>,
): Promise<GrupoFamiliar | null | undefined> {
  const supabase = nubeDeServidor();
  if (!supabase || typeof supabase.rpc !== "function") return undefined;

  const { data, error } = await supabase.rpc("operar_grupo_familiar", {
    p_clave: claveSecreto(codigo),
    p_accion: accion,
    p_payload: payload,
  });
  if (error) {
    if (esFuncionRpcAusente(error)) return undefined;
    throw new Error(`RPC grupo (${accion}): ${error.message}`);
  }
  if (!data) return null;
  const obj = (typeof data === "string" ? JSON.parse(data) : data) as GrupoFamiliar;
  return ordenarMiembrosDeGrupo(obj);
}

const ULTIMO_PUSH_PAR = new Map<string, number>();
const COOLDOWN_PUSH_MS = 60_000;
const MAX_PARES_PUSH = 2000;

function podarParesPush(ahora: number): void {
  if (ULTIMO_PUSH_PAR.size <= MAX_PARES_PUSH) return;
  for (const [par, ts] of ULTIMO_PUSH_PAR) {
    if (ts + COOLDOWN_PUSH_MS <= ahora) ULTIMO_PUSH_PAR.delete(par);
    if (ULTIMO_PUSH_PAR.size <= MAX_PARES_PUSH) return;
  }
  if (ULTIMO_PUSH_PAR.size > MAX_PARES_PUSH) ULTIMO_PUSH_PAR.clear();
}

/** Notifica al móvil del destinatario mediante Web Push cuando un miembro del grupo reacciona. */
async function notificarDestinatarioReaccion(
  deCodigo: string,
  paraCodigo: string,
  deNombre: string,
  tipo: TipoReaccion,
): Promise<void> {
  const supabase = nubeDeServidor();
  if (!supabase || !paraCodigo || deCodigo === paraCodigo) return;

  const llavePar = `${deCodigo}->${paraCodigo}`;
  const ahora = Date.now();
  if ((ULTIMO_PUSH_PAR.get(llavePar) ?? 0) + COOLDOWN_PUSH_MS > ahora) {
    return;
  }
  ULTIMO_PUSH_PAR.set(llavePar, ahora);
  podarParesPush(ahora);

  const nombreLimpio = String(deNombre ?? "Un familiar").trim().slice(0, 30);
  let titulo = "✋ ¡" + nombreLimpio + " te ha chocado los 5!";
  let cuerpoAviso = "¡Sigue así con tus hábitos! Tu equipo está contigo.";

  if (tipo === "animo") {
    titulo = "👋 ¡" + nombreLimpio + " te envía ánimos!";
    cuerpoAviso = "¡Hoy es un gran día para cumplir tus hábitos y sumar al equipo!";
  } else if (tipo === "fuego") {
    titulo = "🔥 ¡" + nombreLimpio + " está a tope contigo!";
    cuerpoAviso = "¡Menuda racha llevas! A mantener encendido el fuego.";
  } else if (tipo === "aplauso") {
    titulo = "👏 ¡" + nombreLimpio + " te aplaude!";
    cuerpoAviso = "¡Gran trabajo cumpliendo tus objetivos de hoy!";
  } else if (tipo === "agua") {
    titulo = "💧 ¡" + nombreLimpio + " te recuerda hidratarte!";
    cuerpoAviso = "Un trago de agua fresca y a seguir sumando.";
  }

  try {
    await enviarPushPorCodigo(supabase, paraCodigo, {
      titulo,
      cuerpo: cuerpoAviso.slice(0, 120),
      url: "/familia",
      momento: `reaccion_${deCodigo}_${tipo}`,
    });
  } catch {}
}

async function grupoNoEncontrado(ip: string, mensaje = "Grupo no encontrado.") {
  frenoSocial.anotarFallo(ip);
  await frenoSocial.esperar();
  return NextResponse.json({ ok: false, error: mensaje }, { status: 404 });
}

export async function GET(peticion: NextRequest) {
  const ip = origen(peticion);
  if (frenoSocial.castigada(ip)) {
    await frenoSocial.esperar();
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  if (!(await sesionValida(peticion.cookies.get(COOKIE_SESION)?.value))) {
    frenoSocial.anotarFallo(ip);
    return NextResponse.json({ ok: false, error: "Sin sesión." }, { status: 401 });
  }

  const url = new URL(peticion.url);
  const rawCodigo = url.searchParams.get("codigo") ?? "";
  const codigo = normalizarCodigoGrupo(rawCodigo);

  if (!codigo || !esCodigoGrupoValido(codigo)) {
    return NextResponse.json({ ok: false, error: "Código de grupo no válido." }, { status: 400 });
  }

  const grupo = await leerGrupoDeNube(codigo);
  if (!grupo) {
    return grupoNoEncontrado(ip, "Grupo no encontrado o código incorrecto.");
  }

  frenoSocial.perdonar(ip);
  return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(grupo) }, { headers: CABECERAS_NO_CACHE });
}

export async function POST(peticion: NextRequest) {
  if (esCrossSite(peticion)) {
    return NextResponse.json({ ok: false, error: "Acceso no permitido." }, { status: 403 });
  }

  const ip = origen(peticion);
  if (frenoSocial.castigada(ip)) {
    await frenoSocial.esperar();
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  if (!(await sesionValida(peticion.cookies.get(COOKIE_SESION)?.value))) {
    frenoSocial.anotarFallo(ip);
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

  try {
  // 1. Crear nuevo grupo
  if (accion === "crear") {
    const nombre = String(cuerpo.nombre ?? "");
    const v = validarNombreGrupo(nombre);
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    }

    const creadorNombre = String(cuerpo.creadorNombre ?? "Yo").trim().slice(0, 30) || "Yo";
    const creadorCodigo = asegurarIdentificadorAnonimo(String(cuerpo.creadorCodigo ?? ""), creadorNombre);
    const creadorAvatar = String(cuerpo.creadorAvatar ?? "🌱").trim().slice(0, 12) || "🌱";
    const metaBruta = Number(cuerpo.metaHabitos ?? cuerpo.metaKg);
    const metaHabitos = metaBruta > 0 ? acotarEntero(metaBruta, 1, 5000, META_HABITOS_SEMANA_DEFECTO) : META_HABITOS_SEMANA_DEFECTO;

    const grupo = crearGrupoInicial(
      nombre,
      { codigo: creadorCodigo, nombre: creadorNombre, avatar: creadorAvatar },
      metaHabitos,
    );

    const grupoCreado = await crearGrupoSinColision(grupo);
    if (!grupoCreado) {
      return NextResponse.json({ ok: false, error: "No se pudo guardar el grupo en la nube." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(grupoCreado) }, { headers: CABECERAS_NO_CACHE });
  }

  // 2. Unirse a un grupo existente
  if (accion === "unirse") {
    const codigo = normalizarCodigoGrupo(String(cuerpo.codigo ?? ""));
    if (!codigo || !esCodigoGrupoValido(codigo)) {
      return NextResponse.json({ ok: false, error: "Escribe el código del grupo." }, { status: 400 });
    }

    const miembroNombre = String(cuerpo.miembroNombre ?? "Familiar").trim().slice(0, 30) || "Familiar";
    const miembroCodigo = asegurarIdentificadorAnonimo(String(cuerpo.miembroCodigo ?? ""), miembroNombre);

    const miembro: MiembroGrupo = {
      codigo: miembroCodigo,
      nombre: miembroNombre,
      avatar: String(cuerpo.miembroAvatar ?? "🥑").trim().slice(0, 12) || "🥑",
      racha: acotarEntero(cuerpo.racha, 0, 3650, 1),
      habitosHoy: acotarEntero(cuerpo.habitosHoy, 0, 500, 0),
      habitosTotal: acotarEntero(cuerpo.habitosTotal, 1, 500, 5),
      habitosSemana: acotarEntero(cuerpo.habitosSemana ?? cuerpo.habitosHoy, 0, 3500, 0),
      kgAportados: 0,
      actualizado: new Date().toISOString(),
    };

    const porRpc = await mutarGrupoAtomicoRPC(
      codigo,
      "upsertear_miembro",
      miembro as unknown as Record<string, unknown>,
    );
    if (porRpc !== undefined) {
      if (porRpc === null) {
        return grupoNoEncontrado(ip, "No existe ningún grupo con ese código. Revisa las letras.");
      }
      frenoSocial.perdonar(ip);
      return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
    }

    let grupo = await leerGrupoDeNube(codigo);
    if (!grupo) {
      return grupoNoEncontrado(ip, "No existe ningún grupo con ese código. Revisa las letras.");
    }

    frenoSocial.perdonar(ip);
    grupo = anadirMiembroAGrupo(grupo, miembro);
    return persistirGrupoORespuesta(grupo);
  }

  // 3. Sincronizar mis estadísticas con el grupo
  if (accion === "sincronizar_miembro") {
    const codigo = normalizarCodigoGrupo(String(cuerpo.codigo ?? ""));
    const miembroNombre = typeof cuerpo.miembroNombre === "string" ? cuerpo.miembroNombre.trim().slice(0, 30) || "Familiar" : "Familiar";
    const miembroCodigo = asegurarIdentificadorAnonimo(String(cuerpo.miembroCodigo ?? ""), miembroNombre);

    if (!codigo || !esCodigoGrupoValido(codigo) || !miembroCodigo) {
      return NextResponse.json({ ok: false, error: "Datos de miembro incompletos." }, { status: 400 });
    }

    const payloadParcial: Record<string, unknown> = {
      codigo: miembroCodigo,
      nombre: miembroNombre,
      ...(typeof cuerpo.miembroAvatar === "string" && cuerpo.miembroAvatar.trim().length > 0
        ? { avatar: cuerpo.miembroAvatar.trim().slice(0, 12) }
        : {}),
      ...(typeof cuerpo.racha === "number" ? { racha: acotarEntero(cuerpo.racha, 0, 3650, 1) } : {}),
      ...(typeof cuerpo.habitosHoy === "number"
        ? { habitosHoy: acotarEntero(cuerpo.habitosHoy, 0, 500, 0) }
        : {}),
      ...(typeof cuerpo.habitosTotal === "number"
        ? { habitosTotal: acotarEntero(cuerpo.habitosTotal, 1, 500, 5) }
        : {}),
      ...(typeof cuerpo.habitosSemana === "number"
        ? { habitosSemana: acotarEntero(cuerpo.habitosSemana, 0, 3500, 0) }
        : {}),
      kgAportados: 0,
      actualizado: new Date().toISOString(),
    };

    const porRpc = await mutarGrupoAtomicoRPC(codigo, "upsertear_miembro", payloadParcial);
    if (porRpc !== undefined) {
      if (porRpc === null) return grupoNoEncontrado(ip);
      frenoSocial.perdonar(ip);
      return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
    }

    let grupo = await leerGrupoDeNube(codigo);
    if (!grupo) return grupoNoEncontrado(ip);
    frenoSocial.perdonar(ip);

    const miembroExistente =
      grupo.miembros.find((m) => m.codigo === miembroCodigo) ??
      grupo.miembros.find((m) => baseDeMiembro(m.nombre) === baseDeMiembro(miembroNombre));

    const avatarFinal =
      typeof cuerpo.miembroAvatar === "string" && cuerpo.miembroAvatar.trim().length > 0
        ? cuerpo.miembroAvatar.trim().slice(0, 12)
        : miembroExistente?.avatar || "🌱";

    const miembro: MiembroGrupo = {
      codigo: miembroCodigo,
      nombre: miembroNombre || miembroExistente?.nombre || "Familiar",
      avatar: avatarFinal,
      racha:
        typeof cuerpo.racha === "number"
          ? acotarEntero(cuerpo.racha, 0, 3650, 1)
          : miembroExistente?.racha ?? 1,
      habitosHoy:
        typeof cuerpo.habitosHoy === "number"
          ? acotarEntero(cuerpo.habitosHoy, 0, 500, 0)
          : miembroExistente?.habitosHoy ?? 0,
      habitosTotal:
        typeof cuerpo.habitosTotal === "number"
          ? acotarEntero(cuerpo.habitosTotal, 1, 500, 5)
          : miembroExistente?.habitosTotal ?? 5,
      habitosSemana:
        typeof cuerpo.habitosSemana === "number"
          ? acotarEntero(cuerpo.habitosSemana, 0, 3500, 0)
          : miembroExistente?.habitosSemana ?? miembroExistente?.habitosHoy ?? 0,
      kgAportados: 0,
      actualizado: new Date().toISOString(),
    };

    grupo = anadirMiembroAGrupo(grupo, miembro);
    return persistirGrupoORespuesta(grupo);
  }

  // 3b. Cambiar avatar de un miembro del grupo
  if (accion === "cambiar_avatar") {
    const codigo = normalizarCodigoGrupo(String(cuerpo.codigo ?? ""));
    const miembroNombre = typeof cuerpo.miembroNombre === "string" ? cuerpo.miembroNombre.trim().slice(0, 30) || "Familiar" : "Familiar";
    const miembroCodigo = asegurarIdentificadorAnonimo(String(cuerpo.miembroCodigo ?? ""), miembroNombre);
    const nuevoAvatar = String(cuerpo.avatar ?? cuerpo.miembroAvatar ?? "🥑").trim().slice(0, 12) || "🥑";

    if (!codigo || !esCodigoGrupoValido(codigo) || !miembroCodigo) {
      return NextResponse.json({ ok: false, error: "Datos de miembro incompletos." }, { status: 400 });
    }

    const payloadParcial: Record<string, unknown> = {
      codigo: miembroCodigo,
      nombre: miembroNombre,
      avatar: nuevoAvatar,
      actualizado: new Date().toISOString(),
    };

    const porRpc = await mutarGrupoAtomicoRPC(codigo, "upsertear_miembro", payloadParcial);
    if (porRpc !== undefined) {
      if (porRpc === null) return grupoNoEncontrado(ip);
      frenoSocial.perdonar(ip);
      return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
    }

    let grupo = await leerGrupoDeNube(codigo);
    if (!grupo) return grupoNoEncontrado(ip);
    frenoSocial.perdonar(ip);

    const miembroExistente =
      grupo.miembros.find((m) => m.codigo === miembroCodigo) ??
      grupo.miembros.find((m) => baseDeMiembro(m.nombre) === baseDeMiembro(miembroNombre));

    const miembro: MiembroGrupo = {
      codigo: miembroCodigo,
      nombre: miembroNombre || miembroExistente?.nombre || "Familiar",
      avatar: nuevoAvatar,
      racha: miembroExistente?.racha ?? 1,
      habitosHoy: miembroExistente?.habitosHoy ?? 0,
      habitosTotal: miembroExistente?.habitosTotal ?? 5,
      habitosSemana: miembroExistente?.habitosSemana ?? 0,
      kgAportados: 0,
      actualizado: new Date().toISOString(),
    };

    grupo = anadirMiembroAGrupo(grupo, miembro);
    return persistirGrupoORespuesta(grupo);
  }

  // 4. Lista de compra compartida
  if (accion === "item_compra") {
    const codigo = normalizarCodigoGrupo(String(cuerpo.codigo ?? ""));
    if (!codigo || !esCodigoGrupoValido(codigo)) {
      return NextResponse.json({ ok: false, error: "Código de grupo no válido." }, { status: 400 });
    }
    const subAccion = String(cuerpo.subAccion ?? "anadir");

    if (subAccion === "alternar") {
      const itemId = String(cuerpo.itemId ?? "").slice(0, 80);
      const personaNombre = String(cuerpo.personaNombre ?? "Alguien").trim().slice(0, 30) || "Alguien";
      const porRpc = await mutarGrupoAtomicoRPC(codigo, "compra_alternar", { itemId, personaNombre });
      if (porRpc !== undefined) {
        if (porRpc === null) return grupoNoEncontrado(ip);
        frenoSocial.perdonar(ip);
        return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
      }

      let grupo = await leerGrupoDeNube(codigo);
      if (!grupo) return grupoNoEncontrado(ip);
      frenoSocial.perdonar(ip);
      grupo = alternarItemCompra(grupo, itemId, personaNombre);
      return persistirGrupoORespuesta(grupo);
    }

    if (subAccion === "borrar") {
      const itemId = String(cuerpo.itemId ?? "").slice(0, 80);
      const porRpc = await mutarGrupoAtomicoRPC(codigo, "compra_borrar", { itemId });
      if (porRpc !== undefined) {
        if (porRpc === null) return grupoNoEncontrado(ip);
        frenoSocial.perdonar(ip);
        return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
      }

      let grupo = await leerGrupoDeNube(codigo);
      if (!grupo) return grupoNoEncontrado(ip);
      frenoSocial.perdonar(ip);
      grupo = borrarItemCompra(grupo, itemId);
      return persistirGrupoORespuesta(grupo);
    }

    if (subAccion === "limpiar_comprados") {
      const porRpc = await mutarGrupoAtomicoRPC(codigo, "compra_limpiar", {});
      if (porRpc !== undefined) {
        if (porRpc === null) return grupoNoEncontrado(ip);
        frenoSocial.perdonar(ip);
        return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
      }

      let grupo = await leerGrupoDeNube(codigo);
      if (!grupo) return grupoNoEncontrado(ip);
      frenoSocial.perdonar(ip);
      grupo = limpiarCompradosGrupo(grupo);
      return persistirGrupoORespuesta(grupo);
    }

    if (subAccion === "anadir") {
      const nombre = String(cuerpo.nombre ?? "").slice(0, 60);
      const v = validarItemCompra(nombre);
      if (!v.ok) {
        return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
      }
      const cantidad = String(cuerpo.cantidad ?? "1").slice(0, 30);
      const porRpc = await mutarGrupoAtomicoRPC(codigo, "compra_anadir", {
        item: {
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          nombre: nombre.trim(),
          cantidad,
          comprado: false,
          fecha: new Date().toISOString(),
        },
      });
      if (porRpc !== undefined) {
        if (porRpc === null) return grupoNoEncontrado(ip);
        frenoSocial.perdonar(ip);
        return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
      }

      let grupo = await leerGrupoDeNube(codigo);
      if (!grupo) return grupoNoEncontrado(ip);
      frenoSocial.perdonar(ip);
      grupo = anadirItemCompra(grupo, nombre, cantidad);
      return persistirGrupoORespuesta(grupo);
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
        const porRpc = await mutarGrupoAtomicoRPC(codigo, "compra_anadir", { nuevos });
        if (porRpc !== undefined) {
          if (porRpc === null) return grupoNoEncontrado(ip);
          frenoSocial.perdonar(ip);
          return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(porRpc) }, { headers: CABECERAS_NO_CACHE });
        }

        let grupo = await leerGrupoDeNube(codigo);
        if (!grupo) return grupoNoEncontrado(ip);
        frenoSocial.perdonar(ip);
        grupo = anadirLoteCompra(grupo, itemsValidos);
        return persistirGrupoORespuesta(grupo);
      }

      const grupo = await leerGrupoDeNube(codigo);
      if (!grupo) return grupoNoEncontrado(ip);
      frenoSocial.perdonar(ip);
      return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(grupo) }, { headers: CABECERAS_NO_CACHE });
    }

    return NextResponse.json({ ok: false, error: "Subacción de compra no reconocida." }, { status: 400 });
  }

  // 5. Reacción social contextual
  if (accion === "reaccion") {
    const codigo = normalizarCodigoGrupo(String(cuerpo.codigo ?? ""));
    if (!codigo || !esCodigoGrupoValido(codigo)) {
      return NextResponse.json({ ok: false, error: "Código de grupo no válido." }, { status: 400 });
    }
    const tiposValidos: TipoReaccion[] = ["cinco", "fuego", "aplauso", "agua", "animo"];
    const tipo: TipoReaccion = tiposValidos.includes(cuerpo.tipo as TipoReaccion)
      ? (cuerpo.tipo as TipoReaccion)
      : "cinco";

    const deNombre = String(cuerpo.deNombre ?? "Un familiar").trim().slice(0, 30) || "Un familiar";
    const deCodigo = asegurarIdentificadorAnonimo(String(cuerpo.deCodigo ?? ""), deNombre);
    const paraCodigo = String(cuerpo.paraCodigo ?? "").trim().slice(0, 80);

    const nuevaReaccion = {
      id: `reac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      deCodigo,
      deNombre,
      paraCodigo,
      tipo,
      fecha: new Date().toISOString(),
    };

    let grupoFinal: GrupoFamiliar | null = null;
    const porRpc = await mutarGrupoAtomicoRPC(codigo, "reaccion", nuevaReaccion);
    if (porRpc !== undefined) {
      if (porRpc === null) return grupoNoEncontrado(ip);
      grupoFinal = porRpc;
    } else {
      let grupo = await leerGrupoDeNube(codigo);
      if (!grupo) return grupoNoEncontrado(ip);
      grupo = anadirReaccion(grupo, {
        deCodigo: nuevaReaccion.deCodigo,
        deNombre: nuevaReaccion.deNombre,
        paraCodigo: nuevaReaccion.paraCodigo,
        tipo,
      });
      if (!(await guardarGrupoEnNube(grupo))) {
        return NextResponse.json({ ok: false, error: "No se pudo guardar la reacción en la nube." }, { status: 500 });
      }
      grupoFinal = grupo;
    }

    frenoSocial.perdonar(ip);

    // Solo se dispara Web Push si el grupo existe y el destinatario pertenece a él:
    // impide usar la ruta como oráculo de notificaciones hacia códigos ajenos.
    if (
      nuevaReaccion.paraCodigo &&
      grupoFinal.miembros.some((m) => m.codigo === nuevaReaccion.paraCodigo)
    ) {
      void notificarDestinatarioReaccion(
        nuevaReaccion.deCodigo,
        nuevaReaccion.paraCodigo,
        nuevaReaccion.deNombre,
        tipo,
      );
    }

    return NextResponse.json({ ok: true, grupo: ordenarMiembrosDeGrupo(grupoFinal) }, { headers: CABECERAS_NO_CACHE });
  }

  // 6. Salir del grupo
  if (accion === "salir") {
    const codigo = normalizarCodigoGrupo(String(cuerpo.codigo ?? ""));
    const miembroCodigo = String(cuerpo.miembroCodigo ?? "").trim().slice(0, 80);
    if (!codigo || !esCodigoGrupoValido(codigo) || !miembroCodigo) {
      return NextResponse.json({ ok: false, error: "Datos incompletos." }, { status: 400 });
    }

    const porRpc = await mutarGrupoAtomicoRPC(codigo, "salir", { miembroCodigo });
    if (porRpc !== undefined) {
      return NextResponse.json({ ok: true });
    }

    let grupo = await leerGrupoDeNube(codigo);
    if (grupo) {
      grupo = {
        ...grupo,
        miembros: grupo.miembros.filter((m) => m.codigo !== miembroCodigo),
        actualizado: new Date().toISOString(),
      };
      if (!(await guardarGrupoEnNube(grupo))) {
        return NextResponse.json({ ok: false, error: "No se pudo actualizar el grupo en la nube." }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Acción no reconocida." }, { status: 400 });
  } catch (e) {
    console.error("social/grupo POST error:", e);
    return NextResponse.json({ ok: false, error: "Error al guardar el grupo en la nube." }, { status: 500 });
  }
}
