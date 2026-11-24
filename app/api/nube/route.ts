import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COOKIE_SESION, sesionValida } from "@/lib/sesion";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import {
  aFilas,
  codigoRecuperacion,
  codigoValido,
  conservarCamposDeServidor,
  fusionarSalud,
} from "@/lib/nube-mapeo";
import { cargar } from "@/lib/nube-datos";
import { esCrossSite, origen } from "@/lib/origen";
import { crearFreno } from "@/lib/freno";
import type { Datos } from "@/lib/store";

/**
 * La nube por dentro: de aquí sale y entra todo.
 *
 * Estas direcciones están cubiertas por el proxy de autenticación, así que antes de nada
 * piden la clave de la app. Aun así se vuelve a comprobar aquí, por si algún
 * día se cambia la lista de direcciones protegidas.
 */
async function estaDentro(peticion: NextRequest): Promise<boolean> {
  return sesionValida(peticion.cookies.get(COOKIE_SESION)?.value);
}

function sinNube() {
  return NextResponse.json(
    { hay: false, motivo: "Sin nube configurada: la app sigue solo en el móvil." },
    { status: 503 },
  );
}

function mal(motivo: string, estado = 400) {
  return NextResponse.json({ hay: false, motivo }, { status: estado });
}

/**
 * Mensaje fijo cuando algo falla por dentro.
 *
 * El detalle (tabla, error de Postgres) se queda en el registro del servidor:
 * a la persona no le dice nada y a quien curiosee le da pistas de por casa.
 */
const FALLO_NUBE = "No se ha podido conectar con la nube. Inténtalo de nuevo.";

// ---------------------------------------------------------------
// Freno de los códigos de 6 letras en PUT (reclamar la cuenta).
// ---------------------------------------------------------------
const MAX_FALLOS = 10;
const CASTIGO_MS = 5 * 60 * 1000;
const RETARDO_MS = 700;

const frenoReclamar = crearFreno({
  maxFallos: MAX_FALLOS,
  castigoMs: CASTIGO_MS,
  retardoMs: RETARDO_MS,
});

// Freno general de sincronización para prevenir abusos y ataques DDoS
const frenoSync = crearFreno({
  maxFallos: 25,
  castigoMs: 2 * 60 * 1000,
  retardoMs: 300,
});

/**
 * Sube una tabla entera de forma aditiva y atómica.
 *
 * Se realiza upsert con onConflict sobre la clave primaria para sincronizar
 * todas las filas añadidas o actualizadas por este dispositivo sin riesgo
 * de borrar filas recién agregadas concurrentemente por otro móvil.
 * Además se asegura de forma estricta que todas las filas pertenecen a personaId.
 */
async function subirTabla(
  supabase: SupabaseClient,
  tabla: string,
  filas: Record<string, unknown>[],
  columnaClave: string,
  personaId: string,
): Promise<void> {
  if (filas.length === 0) return;
  for (const fila of filas) {
    fila.persona_id = personaId;
  }
  const { error } = await supabase
    .from(tabla)
    .upsert(filas, { onConflict: `persona_id,${columnaClave}` });
  if (error) throw new Error(`${tabla}: ${error.message}`);
}

/** Busca la persona de un móvil, y si no la tiene la crea con su código. */
async function personaDelDispositivo(
  supabase: SupabaseClient,
  dispositivo: string,
  nombre: string,
): Promise<{ id: string; codigo: string }> {
  const existente = await supabase
    .from("dispositivos")
    .select("persona_id")
    .eq("id", dispositivo)
    .maybeSingle();
  if (existente.error) throw new Error(`dispositivos/leer: ${existente.error.message}`);

  const personaId = (existente.data as { persona_id: string | null } | null)?.persona_id;
  if (personaId) {
    const p = await supabase.from("personas").select("codigo").eq("id", personaId).maybeSingle();
    if (p.error) throw new Error(`personas/leer: ${p.error.message}`);
    return { id: personaId, codigo: (p.data as { codigo: string | null } | null)?.codigo ?? "" };
  }

  let nueva: { id: string; codigo: string } | null = null;
  let ultimoError = "";
  for (let intento = 0; intento < 5; intento++) {
    const creada = await supabase
      .from("personas")
      .insert({ nombre: nombre || "Sin nombre", codigo: codigoRecuperacion() })
      .select("id,codigo")
      .single();
    if (!creada.error && creada.data) {
      nueva = creada.data as unknown as { id: string; codigo: string };
      break;
    }
    ultimoError = creada.error?.message ?? "sin respuesta";
    // Si no fue colisión de código único (23505), no tiene sentido reintentar.
    if (creada.error?.code && creada.error.code !== "23505") break;
  }
  if (!nueva) throw new Error(`personas: ${ultimoError}`);

  const enlazado = await supabase
    .from("dispositivos")
    .upsert({ id: dispositivo, persona_id: nueva.id }, { onConflict: "id" });
  if (enlazado.error) throw new Error(`dispositivos: ${enlazado.error.message}`);

  return nueva;
}

/** GET: baja lo que haya en la nube para este móvil. */
export async function GET(peticion: NextRequest) {
  const ip = origen(peticion);
  if (frenoSync.castigada(ip)) {
    await frenoSync.esperar();
    return mal("Demasiados intentos. Espera unos momentos.", 429);
  }

  if (!(await estaDentro(peticion))) {
    frenoSync.anotarFallo(ip);
    return mal("Sin sesión", 401);
  }

  const supabase = nubeDeServidor();
  if (!supabase) return sinNube();

  const dispositivo = peticion.nextUrl.searchParams.get("dispositivo")?.trim() ?? "";
  if (!dispositivo || dispositivo.length > 120 || !/^[\w-]+$/.test(dispositivo)) {
    frenoSync.anotarFallo(ip);
    return mal("Identificador de dispositivo no válido");
  }

  try {
    const enlazado = await supabase
      .from("dispositivos")
      .select("persona_id")
      .eq("id", dispositivo)
      .maybeSingle();
    if (enlazado.error) throw new Error(`dispositivos/leer: ${enlazado.error.message}`);
    const personaId = (enlazado.data as { persona_id: string | null } | null)?.persona_id;
    if (!personaId) return NextResponse.json({ hay: false });

    const datos = await cargar(supabase, personaId);
    const p = await supabase.from("personas").select("nombre,codigo").eq("id", personaId).maybeSingle();
    if (p.error) throw new Error(`personas/leer: ${p.error.message}`);
    const persona = (p.data ?? null) as { nombre: string; codigo: string | null } | null;

    frenoSync.perdonar(ip);
    return NextResponse.json({
      hay: true,
      datos,
      persona: personaId,
      nombre: persona?.nombre ?? "",
      codigo: persona?.codigo ?? "",
    });
  } catch (e) {
    console.error("nube/leer:", e);
    return mal(FALLO_NUBE, 500);
  }
}

/** POST: sube todo lo del móvil. */
export async function POST(peticion: NextRequest) {
  if (esCrossSite(peticion)) return mal("Acceso no permitido", 403);
  const ip = origen(peticion);
  if (frenoSync.castigada(ip)) {
    await frenoSync.esperar();
    return mal("Demasiados intentos. Espera unos momentos.", 429);
  }

  if (!(await estaDentro(peticion))) {
    frenoSync.anotarFallo(ip);
    return mal("Sin sesión", 401);
  }

  // Protección anti-bloat / DDoS: las copias de perfil normales pesan 5-20 KB.
  // Nadie debe mandar más de 512 KB a la nube de golpe.
  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > 512 * 1024) {
    frenoSync.anotarFallo(ip);
    return mal("Los datos superan el tamaño máximo permitido (512 KB)", 413);
  }

  const supabase = nubeDeServidor();
  if (!supabase) return sinNube();

  let cuerpo: {
    dispositivo?: string;
    datos?: Datos;
    comidasCapricho?: unknown;
    saludViva?: unknown;
    diferencial?: unknown;
  };
  try {
    const texto = await peticion.text();
    if (texto.length > 512 * 1024) {
      frenoSync.anotarFallo(ip);
      return mal("Los datos superan el tamaño máximo permitido (512 KB)", 413);
    }
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    frenoSync.anotarFallo(ip);
    return mal("No entiendo lo que ha llegado");
  }

  const dispositivo = (cuerpo.dispositivo ?? "").trim();
  const datos = cuerpo.datos;
  if (!dispositivo || !datos || typeof datos !== "object") {
    frenoSync.anotarFallo(ip);
    return mal("Faltan datos");
  }

  if (dispositivo.length > 120 || !/^[\w-]+$/.test(dispositivo)) {
    frenoSync.anotarFallo(ip);
    return mal("Identificador de dispositivo no válido");
  }

  // Validación defensiva de la estructura de datos
  if (
    !Array.isArray(datos.pesadas) ||
    !Array.isArray(datos.comidas) ||
    typeof datos.aguaLitros !== "object" ||
    datos.aguaLitros === null ||
    typeof datos.gustos !== "object" ||
    datos.gustos === null
  ) {
    frenoSync.anotarFallo(ip);
    return mal("Estructura de datos incompleta o inválida");
  }

  try {
    const persona = await personaDelDispositivo(
      supabase,
      dispositivo,
      datos.perfil?.nombre ?? "",
    );
    const comidasCapricho = Array.isArray(cuerpo.comidasCapricho)
      ? cuerpo.comidasCapricho.filter((id): id is string => typeof id === "string" && id.length > 0)
      : undefined;
    const esDiferencial = cuerpo.diferencial === true;
    const saludVivaCliente = Array.isArray(cuerpo.saludViva)
      ? cuerpo.saludViva.filter((f): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f))
      : undefined;

    const filas = aFilas(datos, persona.id, { comidasCapricho });

    // Antes de subir se lee lo que ya hay en `perfiles`: si esa lectura falla,
    // abortamos en vez de asumir `{}` (lo que borraría cuotas de IA, comentarios
    // del buzón, mensajes de Isaac y pasos del Atajo).
    const yaGuardado = await supabase
      .from("perfiles")
      .select("datos")
      .eq("persona_id", persona.id)
      .maybeSingle();
    if (yaGuardado.error) {
      throw new Error(`perfiles/leer: ${yaGuardado.error.message}`);
    }

    const datosNubeRaw = ((yaGuardado.data as { datos: unknown } | null)?.datos ?? {}) as {
      saludDiaria?: Record<string, { pasos?: number; suenoHoras?: number }>;
      borrados?: Datos["borrados"];
      usoIA?: unknown;
      usoIAtexto?: unknown;
      usoIAfoto?: unknown;
    };
    // Si el Atajo escribió pasos/sueño en `saludDiaria` después de una vieja
    // lápida `salud` en la nube, esa lápida de la nube ya quedó superada.
    const borradosNubeDepurados = Array.isArray(datosNubeRaw.borrados)
      ? datosNubeRaw.borrados.filter(
          (b) => !(b.tipo === "salud" && datosNubeRaw.saludDiaria?.[b.clave] !== undefined),
        )
      : undefined;
    const datosNube = {
      ...datosNubeRaw,
      ...(borradosNubeDepurados !== undefined ? { borrados: borradosNubeDepurados } : {}),
    };

    const saludCliente = filas.perfil.datos.saludDiaria ?? {};
    const fechasSaludVivas =
      esDiferencial && saludVivaCliente !== undefined
        ? saludVivaCliente
        : Object.keys(saludCliente);

    filas.perfil.datos.saludDiaria = fusionarSalud(
      datosNube.saludDiaria,
      saludCliente,
    );

    // Conserva contadores de IA, buzón, mensajes y fusiona lápidas descartando
    // únicamente las claves que este envío trae vivas/modificadas.
    filas.perfil.datos = conservarCamposDeServidor(
      filas.perfil.datos as unknown as Record<string, unknown>,
      datosNube as Record<string, unknown>,
      new Set([
        ...filas.pesadas.map((p) => `pesada:${p.fecha}`),
        ...filas.comidas.map((c) => `comida:${c.id}`),
        ...filas.gustos.map((g) => `gusto:${g.ingrediente}`),
        ...fechasSaludVivas.map((f) => `salud:${f}`),
      ]),
    ) as unknown as typeof filas.perfil.datos;

    // Las lápidas efectivas son las ya fusionadas y filtradas contra `vivas`:
    // así `UPSERT` y `DELETE` son disjuntos y jamás compiten por la misma fila.
    const borradosEfectivos = Array.isArray(filas.perfil.datos.borrados)
      ? filas.perfil.datos.borrados
      : [];
    const setComidasBorrar = new Set(
      borradosEfectivos.filter((b) => b.tipo === "comida").map((b) => b.clave),
    );
    const setPesadasBorrar = new Set(
      borradosEfectivos.filter((b) => b.tipo === "pesada").map((b) => b.clave),
    );
    const setGustosBorrar = new Set(
      borradosEfectivos.filter((b) => b.tipo === "gusto").map((b) => b.clave),
    );
    for (const b of borradosEfectivos) {
      if (b.tipo === "salud" && filas.perfil.datos.saludDiaria) {
        delete filas.perfil.datos.saludDiaria[b.clave];
      }
    }

    const pesadasSubir = filas.pesadas.filter((p) => !setPesadasBorrar.has(p.fecha));
    const comidasSubir = filas.comidas.filter((c) => !setComidasBorrar.has(c.id));
    const gustosSubir = filas.gustos.filter((g) => !setGustosBorrar.has(g.ingrediente));

    const tareasSubida: Promise<unknown>[] = [
      Promise.resolve(
        supabase
          .from("perfiles")
          .upsert(filas.perfil as unknown as Record<string, unknown>, { onConflict: "persona_id" }),
      ),
      Promise.resolve(
        subirTabla(supabase, "pesadas", pesadasSubir as unknown as Record<string, unknown>[], "fecha", persona.id),
      ),
      Promise.resolve(
        subirTabla(supabase, "comidas", comidasSubir as unknown as Record<string, unknown>[], "id", persona.id),
      ),
      Promise.resolve(
        subirTabla(supabase, "agua", filas.agua as unknown as Record<string, unknown>[], "fecha", persona.id),
      ),
      Promise.resolve(
        subirTabla(supabase, "gustos", gustosSubir as unknown as Record<string, unknown>[], "ingrediente", persona.id),
      ),
      Promise.resolve(
        supabase.from("dispositivos").upsert(
          { id: dispositivo, persona_id: persona.id, ultima_vez: new Date().toISOString() },
          { onConflict: "id" },
        ),
      ),
      Promise.resolve(
        supabase
          .from("personas")
          .update({ nombre: datos.perfil?.nombre ?? "Sin nombre", actualizada: new Date().toISOString() })
          .eq("id", persona.id),
      ),
    ];

    // Eliminación física en Supabase a partir de las lápidas efectivas (disjuntas de los upserts)
    if (borradosEfectivos.length > 0) {
      const comidasBorrar = [...setComidasBorrar];
      const pesadasBorrar = [...setPesadasBorrar];
      const gustosBorrar = [...setGustosBorrar];

      if (comidasBorrar.length > 0) {
        tareasSubida.push(
          Promise.resolve(
            supabase.from("comidas").delete().eq("persona_id", persona.id).in("id", comidasBorrar),
          ),
        );
      }
      if (pesadasBorrar.length > 0) {
        tareasSubida.push(
          Promise.resolve(
            supabase.from("pesadas").delete().eq("persona_id", persona.id).in("fecha", pesadasBorrar),
          ),
        );
      }
      if (gustosBorrar.length > 0) {
        tareasSubida.push(
          Promise.resolve(
            supabase.from("gustos").delete().eq("persona_id", persona.id).in("ingrediente", gustosBorrar),
          ),
        );
      }
    }

    // Si alguna escritura falla, el móvil tiene que enterarse y reintentar.
    const resultados = await Promise.all(tareasSubida);
    const fallos = resultados
      .map((r) => (r as { error?: { message?: string } } | null)?.error?.message)
      .filter((m): m is string => Boolean(m));
    if (fallos.length > 0) {
      console.error("nube/subir:", fallos.join(" | "));
      return mal(FALLO_NUBE, 500);
    }

    frenoSync.perdonar(ip);
    return NextResponse.json({ hay: true, persona: persona.id, codigo: persona.codigo });
  } catch (e) {
    console.error("nube/subir:", e);
    return mal(FALLO_NUBE, 500);
  }
}

/** PUT /api/nube/reclamar: enlaza este móvil con una persona por su código. */
export async function PUT(peticion: NextRequest) {
  if (esCrossSite(peticion)) return mal("Acceso no permitido", 403);
  if (!(await estaDentro(peticion))) return mal("Sin sesión", 401);
  const supabase = nubeDeServidor();
  if (!supabase) return sinNube();

  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > 16 * 1024) return mal("Petición demasiado grande", 413);

  const ip = origen(peticion);

  // Freno puesto: ni se mira el código, y se toma el mismo respiro para que la
  // respuesta no delate si el código era bueno.
  if (frenoReclamar.castigada(ip)) {
    await frenoReclamar.esperar();
    return mal("Demasiados intentos. Espera unos minutos.", 429);
  }

  let cuerpo: { codigo?: string; dispositivo?: string };
  try {
    const texto = await peticion.text();
    if (texto.length > 16 * 1024) return mal("Petición demasiado grande", 413);
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    return mal("No entiendo lo que ha llegado");
  }

  const codigo = (cuerpo.codigo ?? "").trim().toUpperCase();
  const dispositivo = (cuerpo.dispositivo ?? "").trim();
  if (!codigoValido(codigo)) {
    frenoReclamar.anotarFallo(ip);
    await frenoReclamar.esperar();
    return mal("El código tiene que tener 6 letras o números.");
  }
  if (!dispositivo || dispositivo.length > 120 || !/^[\w-]+$/.test(dispositivo)) {
    return mal("Identificador de dispositivo no válido");
  }

  try {
    const p = await supabase
      .from("personas")
      .select("id,nombre,codigo")
      .eq("codigo", codigo)
      .maybeSingle();
    if (p.error) throw new Error(`personas/reclamar: ${p.error.message}`);
    const persona = (p.data ?? null) as { id: string; nombre: string; codigo: string | null } | null;
    if (!persona) {
      // Código que no es de nadie: cuenta como fallo y se frena.
      frenoReclamar.anotarFallo(ip);
      await frenoReclamar.esperar();
      return mal("Ese código no corresponde a nadie.");
    }

    frenoReclamar.perdonar(ip);

    const enlazado = await supabase
      .from("dispositivos")
      .upsert({ id: dispositivo, persona_id: persona.id }, { onConflict: "id" });
    if (enlazado.error) throw new Error(`dispositivos: ${enlazado.error.message}`);

    const datos = await cargar(supabase, persona.id);
    return NextResponse.json({
      hay: true,
      datos,
      persona: persona.id,
      nombre: persona.nombre,
      codigo: persona.codigo ?? "",
    });
  } catch (e) {
    console.error("nube/reclamar:", e);
    return mal(FALLO_NUBE, 500);
  }
}

/**
 * DELETE: borra la cuenta entera de este móvil.
 *
 * Con la cuenta se va todo: el perfil, las pesadas, las comidas, el agua, los
 * gustos, los avisos y los móviles enlazados. Todas esas tablas cuelgan de
 * `personas` con borrado en cascada, así que basta con borrar la persona. Su
 * código de recuperación deja de valer: ya no hay nada que recuperar.
 */
export async function DELETE(peticion: NextRequest) {
  if (esCrossSite(peticion)) return mal("Acceso no permitido", 403);
  const ip = origen(peticion);
  if (frenoSync.castigada(ip)) {
    await frenoSync.esperar();
    return mal("Demasiados intentos. Espera unos momentos.", 429);
  }

  if (!(await estaDentro(peticion))) {
    frenoSync.anotarFallo(ip);
    return mal("Sin sesión", 401);
  }

  const supabase = nubeDeServidor();
  if (!supabase) return sinNube();

  const dispositivo = peticion.nextUrl.searchParams.get("dispositivo")?.trim() ?? "";
  if (!dispositivo || dispositivo.length > 120 || !/^[\w-]+$/.test(dispositivo)) {
    frenoSync.anotarFallo(ip);
    return mal("Identificador de dispositivo no válido");
  }

  try {
    const enlazado = await supabase
      .from("dispositivos")
      .select("persona_id")
      .eq("id", dispositivo)
      .maybeSingle();
    if (enlazado.error) throw new Error(`dispositivos/borrar: ${enlazado.error.message}`);
    const personaId = (enlazado.data as { persona_id: string | null } | null)?.persona_id;

    // Si este móvil nunca subió perfil pero sí tenía suscripción de avisos
    // apuntada en `dispositivos`, borramos su fila para no dejarla huérfana.
    if (!personaId) {
      await supabase.from("dispositivos").delete().eq("id", dispositivo);
      return NextResponse.json({ hay: true });
    }

    const borrado = await supabase.from("personas").delete().eq("id", personaId);
    if (borrado.error) throw new Error(`personas: ${borrado.error.message}`);

    frenoSync.perdonar(ip);
    return NextResponse.json({ hay: true });
  } catch (e) {
    console.error("nube/borrar:", e);
    return mal(FALLO_NUBE, 500);
  }
}
