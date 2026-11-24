import { after, NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COOKIE_SESION, iguales, sesionValida } from "@/lib/sesion";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { codigoValido } from "@/lib/nube-mapeo";
import {
  anadirComentario,
  anotarClasificacion,
  avisoDelBuzon,
  comentariosDe,
  nuevoComentario,
  ordenarDeNuevoAViejo,
  type ComentarioConNombre,
} from "@/lib/comentarios";
import { avisoSaludDelBuzon, clasificacionFinal, clasificarComentario } from "@/lib/feedback-ia";
import { enviarTelegram } from "@/lib/telegram";
import { crearFreno, crearTopeEnvios } from "@/lib/freno";
import { esCrossSite, origen } from "@/lib/origen";

/**
 * El buzón de la beta.
 *
 * - POST: cualquiera de la familia, desde Ajustes, manda un problema o una
 *   idea. Se guarda en su propio perfil (`datos.comentarios`) y le llega a
 *   Isaac por Telegram.
 * - GET: solo Isaac. Devuelve todos los mensajes y la fecha de su última
 *   visita, para poder señalar los nuevos.
 * - PUT: solo Isaac. Marca la lista como vista.
 *
 * Quién es Isaac se decide con `ADMIN_CODIGO` en Vercel: su código de 6
 * letras, el mismo que usa para recuperar la cuenta. Esa variable no está en
 * el código ni en el móvil de nadie; si falta, el buzón recoge igual los
 * mensajes y nadie puede leerlos desde la app.
 */

const FALLO = "No se ha podido guardar. Inténtalo de nuevo.";
const SOLO_ADMIN = "Esto solo lo puede ver Isaac.";
const MUCHOS = "Has probado demasiadas veces seguidas. Espera unos minutos y vuelve a intentarlo.";
const MUCHOS_ENVIOS = "Has enviado muchos mensajes seguidos. Espera unos minutos y prueba otra vez.";

/**
 * Freno contra quien prueba códigos a lo bruto y contra quien llena el buzón
 * (y el móvil de Isaac de avisos) pulsando «Enviar» sin parar. El de intentos
 * va por sitio; el de envíos, por persona.
 */
const FRENO = crearFreno();
const TOPE = crearTopeEnvios();
const TOPE_CUERPO_BYTES = 32 * 1024;

/** La misma comprobación de sesión que en `/api/nube`. */
async function estaDentro(peticion: NextRequest): Promise<boolean> {
  return sesionValida(peticion.cookies.get(COOKIE_SESION)?.value);
}

function mal(motivo: string, estado = 400) {
  return NextResponse.json({ ok: false, motivo }, { status: estado });
}

/** El código de Isaac tal como está configurado, en mayúsculas. */
function codigoAdmin(): string {
  return (process.env.ADMIN_CODIGO ?? "").trim().toUpperCase();
}

function esAdmin(codigo: string): boolean {
  const admin = codigoAdmin();
  if (!admin) return false;
  // Sin prisa y sin delatar por el tiempo: la misma comparación que la puerta.
  return iguales(codigo.trim().toUpperCase(), admin);
}

/** Busca la persona dueña de un código de recuperación. */
async function personaDeCodigo(
  supabase: SupabaseClient,
  codigo: string,
): Promise<{ id: string; nombre: string } | null> {
  const { data, error } = await supabase
    .from("personas")
    .select("id,nombre")
    .eq("codigo", codigo.trim().toUpperCase())
    .maybeSingle();
  // Un fallo de la base no es «ese código no es de nadie»: se corta aquí para
  // no castigar la wifi de casa con el freno por un parpadeo de Supabase.
  if (error) throw new Error(`personas: ${error.message}`);
  return (data as { id: string; nombre: string } | null) ?? null;
}

/**
 * Lee los datos del perfil de una persona (o `null` si aún no tiene fila).
 *
 * Si la lectura FALLA, lanza: antes se tomaba como «perfil vacío» y el
 * `upsert` de después machacaba el perfil entero de la nube con `{}`.
 */
async function datosDe(
  supabase: SupabaseClient,
  personaId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("datos")
    .eq("persona_id", personaId)
    .maybeSingle();
  if (error) throw new Error(`perfiles/leer: ${error.message}`);
  const datos = (data as { datos: unknown } | null)?.datos;
  return datos && typeof datos === "object" && !Array.isArray(datos)
    ? (datos as Record<string, unknown>)
    : null;
}

/** Guarda los datos del perfil, creando la fila si es la primera vez. */
async function guardarDatos(
  supabase: SupabaseClient,
  personaId: string,
  datos: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("perfiles")
    .upsert({ persona_id: personaId, datos }, { onConflict: "persona_id" });
  if (error) throw new Error(`perfiles: ${error.message}`);
}

/** POST: un miembro de la familia manda un problema o una idea. */
export async function POST(peticion: NextRequest) {
  if (esCrossSite(peticion)) return mal("Acceso no permitido.", 403);
  if (!(await estaDentro(peticion))) return mal("Sin sesión", 401);

  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > TOPE_CUERPO_BYTES) return mal("El mensaje es demasiado largo.", 413);

  const ip = origen(peticion);
  if (FRENO.castigada(ip)) {
    await FRENO.esperar();
    return mal(MUCHOS, 429);
  }

  const supabase = nubeDeServidor();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, motivo: "Sin nube configurada: el buzón no puede guardar nada." },
      { status: 503 },
    );
  }

  let cuerpo: { codigo?: string; tipo?: unknown; texto?: unknown; pantalla?: unknown };
  try {
    const crudo = await peticion.text();
    if (crudo.length > TOPE_CUERPO_BYTES) return mal("El mensaje es demasiado largo.", 413);
    cuerpo = JSON.parse(crudo) as typeof cuerpo;
  } catch {
    return mal("No entiendo lo que ha llegado");
  }

  const codigo = (cuerpo.codigo ?? "").trim();
  if (!codigoValido(codigo)) {
    FRENO.anotarFallo(ip);
    await FRENO.esperar();
    return mal("Falta tu código de la app. Vuelve a entrar y prueba otra vez.");
  }

  const resultado = nuevoComentario({
    tipo: cuerpo.tipo,
    texto: cuerpo.texto,
    pantalla: cuerpo.pantalla,
  });
  if (!resultado.ok) return mal(resultado.motivo);

  try {
    const persona = await personaDeCodigo(supabase, codigo);
    if (!persona) {
      FRENO.anotarFallo(ip);
      await FRENO.esperar();
      return mal("Ese código no es de nadie. Vuelve a entrar en la app.", 404);
    }
    FRENO.perdonar(ip);

    // Cinco mensajes cada diez minutos y persona. Si alguien insiste, se le
    // corta sin darle un aviso más a Isaac por cada intento.
    if (!TOPE.permite(codigo)) return mal(MUCHOS_ENVIOS, 429);

    const datos = (await datosDe(supabase, persona.id)) ?? {};
    await guardarDatos(supabase, persona.id, anadirComentario(datos, resultado.comentario));
    TOPE.anotar(codigo);

    // El aviso va por Telegram, no al móvil: Isaac lo pidió así el 21/10 (el
    // aviso al móvil no lo quería). Si el que escribe es él mismo, no se
    // avisa: ya lo sabe.
    //
    // Todo esto va DESPUÉS de contestar (`after`): a la persona no le espera
    // el «enviado» a que Gemini y Telegram respondan, y si algo falla el
    // mensaje sigue guardado en su perfil.
    const admin = codigoAdmin();
    const esDeIsaac = esAdmin(codigo);
    after(async () => {
      // Clasificar primero: así el aviso puede decir si hay tema de salud.
      // Si Gemini no contesta, la red de palabras de `clasificacionFinal`
      // mantiene el aviso prioritario: un tema de salud no puede perderse
      // porque la IA esté caída o sin clave.
      const clasificacion = clasificacionFinal(
        await clasificarComentario({
          texto: resultado.comentario.texto,
          pantalla: resultado.comentario.pantalla,
          tipoDeclarado: resultado.comentario.tipo,
        }),
        resultado.comentario.texto,
      );

      if (clasificacion) {
        try {
          const alDia = (await datosDe(supabase, persona.id)) ?? {};
          await guardarDatos(
            supabase,
            persona.id,
            anotarClasificacion(alDia, resultado.comentario.id, clasificacion),
          );
        } catch (e) {
          // Perder la etiqueta es barato; el mensaje ya está guardado.
          console.error("comentarios/clasificar:", e);
        }
      }

      if (!admin || esDeIsaac) return;

      const aviso = clasificacion?.alertaSalud
        ? avisoSaludDelBuzon(
            resultado.comentario.texto,
            persona.nombre,
            resultado.comentario.pantalla,
            codigo,
          )
        : avisoDelBuzon(resultado.comentario, persona.nombre, codigo);
      const codLimpio = codigo.trim().toUpperCase();
      const tecladoBuzon = codLimpio
        ? {
            inline_keyboard: [
              [{ text: "✅ Marcar hecho", callback_data: `bz_ok:${codLimpio}` }],
            ],
          }
        : undefined;
      if (!(await enviarTelegram(aviso, tecladoBuzon ? { replyMarkup: tecladoBuzon } : undefined))) {
        console.error("comentarios/telegram: no se ha podido avisar (el mensaje está guardado)");
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("comentarios/guardar:", e);
    return mal(FALLO, 500);
  }
}

/** GET: la lista completa, solo para Isaac. */
export async function GET(peticion: NextRequest) {
  if (!(await estaDentro(peticion))) return mal("Sin sesión", 401);

  const ip = origen(peticion);
  if (FRENO.castigada(ip)) {
    await FRENO.esperar();
    return mal(MUCHOS, 429);
  }

  const supabase = nubeDeServidor();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, motivo: "Sin nube configurada: el buzón está vacío." },
      { status: 503 },
    );
  }

  const codigo = (peticion.headers.get("x-codigo") ?? "").trim();
  if (!esAdmin(codigo)) {
    FRENO.anotarFallo(ip);
    await FRENO.esperar();
    return mal(SOLO_ADMIN, 403);
  }
  FRENO.perdonar(ip);

  try {
    const [perfiles, personas, admin] = await Promise.all([
      supabase.from("perfiles").select("persona_id,comentarios:datos->comentarios"),
      supabase.from("personas").select("id,nombre"),
      personaDeCodigo(supabase, codigo),
    ]);
    // Si alguna lectura falla se dice claro, no se enseña un buzón vacío.
    if (perfiles.error) throw new Error(`perfiles: ${perfiles.error.message}`);
    if (personas.error) throw new Error(`personas: ${personas.error.message}`);

    const nombres = new Map<string, string>();
    for (const p of (personas.data ?? []) as { id: string; nombre: string | null }[]) {
      nombres.set(p.id, p.nombre ?? "");
    }

    const comentarios: ComentarioConNombre[] = [];
    for (const fila of (perfiles.data ?? []) as { persona_id: string; comentarios: unknown }[]) {
      for (const c of comentariosDe({ comentarios: fila.comentarios })) {
        comentarios.push({ ...c, nombre: nombres.get(fila.persona_id) ?? "" });
      }
    }

    const datosAdmin = admin ? await datosDe(supabase, admin.id) : null;
    const leidos = datosAdmin?.comentariosLeidos;

    return NextResponse.json({
      ok: true,
      comentarios: ordenarDeNuevoAViejo(comentarios).slice(0, 300),
      leidos: typeof leidos === "string" ? leidos : "",
    });
  } catch (e) {
    console.error("comentarios/leer:", e);
    return mal("No se han podido leer los mensajes. Inténtalo de nuevo.", 500);
  }
}

/** PUT: Isaac marca la lista como vista. */
export async function PUT(peticion: NextRequest) {
  if (esCrossSite(peticion)) return mal("Acceso no permitido.", 403);
  if (!(await estaDentro(peticion))) return mal("Sin sesión", 401);

  const ip = origen(peticion);
  if (FRENO.castigada(ip)) {
    await FRENO.esperar();
    return mal(MUCHOS, 429);
  }

  const supabase = nubeDeServidor();
  if (!supabase) return mal("Sin nube configurada.", 503);

  // El código viaja en una cabecera y no en la dirección: así no se queda
  // escrito en los registros del servidor, que son el sitio perfecto para
  // que alguien lo copie y se haga pasar por Isaac.
  const codigo = (peticion.headers.get("x-codigo") ?? "").trim();
  if (!esAdmin(codigo)) {
    FRENO.anotarFallo(ip);
    await FRENO.esperar();
    return mal(SOLO_ADMIN, 403);
  }
  FRENO.perdonar(ip);

  try {
    const admin = await personaDeCodigo(supabase, codigo);
    if (!admin) return mal("Ese código no es de nadie.", 404);

    const datos = (await datosDe(supabase, admin.id)) ?? {};
    await guardarDatos(supabase, admin.id, {
      ...datos,
      comentariosLeidos: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("comentarios/marcar:", e);
    return mal(FALLO, 500);
  }
}
