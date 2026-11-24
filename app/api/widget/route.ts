import { NextResponse, type NextRequest } from "next/server";
import {
  codigoValido,
  esFuncionRpcAusente,
  fechaSaludWidgetValida,
  fusionarSalud,
  quitarBorrado,
} from "@/lib/nube-mapeo";
import type { ElementoBorrado } from "@/lib/store";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { cargar } from "@/lib/nube-datos";
import { comidasDelDia, sumar } from "@/lib/comidas";
import { ahoraEnMadrid } from "@/lib/avisos";
import { edad, fechaUltimaPesada, gastoDiario, kcalDeHoy, pesoSuavizado } from "@/lib/calculos";
import { diasConActividad, rachaActual } from "@/lib/racha";
import {
  crearFreno,
  castigadaPersistente,
  anotarFalloPersistente,
  perdonarPersistente,
} from "@/lib/freno";
import { origen } from "@/lib/origen";

/**
 * El resumen del día, para un widget del iPhone.
 *
 * El iPhone (con Scriptable o con Atajos) pide esta dirección muchas veces al
 * día y no puede traer la cookie de la app: la única credencial que trae es el
 * código de recuperación de 6 letras que se enseña en Ajustes. Por eso aquí no
 * se pide la clave de la app, pero sí se frena a quien pruebe códigos.
 *
 * Solo se devuelve lo que cabe en un widget: ni el nombre, ni la fecha de
 * nacimiento, ni el historial.
 *
 * El POST es el otro lado: el Atajo de iOS (o el iPhone, cada noche) manda
 * aquí los pasos y las horas de sueño del día. Se guardan dentro de
 * `perfiles.datos.saludDiaria`, sin tocar nada más de la fila.
 */

/** Códigos fallidos antes de frenar. */
const MAX_FALLOS = 15;
/** Cuánto dura el freno. */
const CASTIGO_MS = 5 * 60 * 1000;
/** Respiro que se toma el servidor en cada fallo. */
const RETARDO_MS = 700;

const freno = crearFreno({ maxFallos: MAX_FALLOS, castigoMs: CASTIGO_MS, retardoMs: RETARDO_MS });

function mal(motivo: string, estado: number) {
  return NextResponse.json({ hay: false, motivo }, { status: estado });
}

export async function GET(peticion: NextRequest) {
  const ip = origen(peticion);
  const supabase = nubeDeServidor();

  if (await castigadaPersistente(freno, supabase, ip, "freno:widget")) {
    await freno.esperar();
    return mal("Demasiados intentos. Espera unos minutos.", 429);
  }

  const codigo = peticion.nextUrl.searchParams.get("codigo")?.trim().toUpperCase() ?? "";
  if (!codigoValido(codigo)) {
    await anotarFalloPersistente(freno, supabase, ip, {
      maxFallos: MAX_FALLOS,
      castigoMs: CASTIGO_MS,
      prefijo: "freno:widget",
    });
    await freno.esperar();
    return mal("Falta el código.", 400);
  }
  if (!supabase) {
    return mal("Sin nube configurada: la app sigue solo en el móvil.", 503);
  }

  try {
    const p = await supabase.from("personas").select("id").eq("codigo", codigo).maybeSingle();
    // Un fallo de Supabase no es un código erróneo: jamás se debe castigar la IP del usuario.
    if (p.error) {
      console.error("widget/persona:", p.error.message);
      return mal("No se ha podido conectar con la nube. Inténtalo de nuevo.", 500);
    }
    const personaId = (p.data as { id: string | null } | null)?.id;
    if (!personaId) {
      await anotarFalloPersistente(freno, supabase, ip, {
        maxFallos: MAX_FALLOS,
        castigoMs: CASTIGO_MS,
        prefijo: "freno:widget",
      });
      await freno.esperar();
      return mal("Ese código no corresponde a nadie.", 404);
    }

    const datos = await cargar(supabase, personaId);
    if (!datos.perfil) {
      return mal("Ese código aún no tiene datos detrás.", 409);
    }
    const perfil = datos.perfil;
    await perdonarPersistente(freno, supabase, ip, "freno:widget");

    const hoy = ahoraEnMadrid(new Date()).fecha;

    const peso = pesoSuavizado(datos.pesadas) ?? perfil.pesoInicialKg;
    const gasto = gastoDiario(
      peso,
      perfil.alturaCm,
      edad(perfil.fechaNacimiento),
      perfil.sexo,
      perfil.actividad,
    );
    const objetivo = kcalDeHoy(
      perfil,
      gasto,
      peso,
      hoy,
      fechaUltimaPesada(datos.pesadas) ?? undefined,
    );

    const deHoy = comidasDelDia(datos.comidas, hoy);
    const anotadas = Math.round(sumar(deHoy.filter((c) => !c.capricho)).kcal);

    const racha = rachaActual(
      diasConActividad({
        comidas: datos.comidas,
        pesadas: datos.pesadas,
        aguaLitros: datos.aguaLitros,
        habitosHechos: datos.habitosHechos,
      }),
      hoy,
    );

    return NextResponse.json({
      hay: true,
      fecha: hoy,
      kcal: {
        anotadas,
        objetivo,
        restantes: objetivo - anotadas,
      },
      agua: {
        litros: Math.round((datos.aguaLitros[hoy] ?? 0) * 100) / 100,
        meta: datos.metaAguaL,
      },
      comidas: deHoy.filter((c) => c.alimentos.length > 0).length,
      pesoKg: Math.round(peso * 10) / 10,
      rachaDias: racha,
    });
  } catch (e) {
    console.error("widget:", e);
    return mal("No se ha podido conectar con la nube. Inténtalo de nuevo.", 500);
  }
}

/** Último día que tiene sentido: nadie da 100.000 pasos ni duerme 24 horas. */
const MAX_PASOS = 100000;

/**
 * El Atajo de iOS manda aquí los pasos y el sueño del día.
 *
 * Trae el mismo código de recuperación que el GET y pasa por el mismo freno de
 * IP. Lo que se guarda cae dentro de `perfiles.datos.saludDiaria`, con la
 * fecha como llave. Primero usa la función atómica de
 * `sql/contadores-perfil.sql`, que cambia solo ese día; solo si todavía no está
 * instalada en Supabase cae al camino antiguo de leer la fila y volver a escribirla.
 */
export async function POST(peticion: NextRequest) {
  const ip = origen(peticion);
  const supabase = nubeDeServidor();

  if (await castigadaPersistente(freno, supabase, ip, "freno:widget")) {
    await freno.esperar();
    return mal("Demasiados intentos. Espera unos minutos.", 429);
  }

  const fallar = async (motivo: string, estadoHttp: number) => {
    await anotarFalloPersistente(freno, supabase, ip, {
      maxFallos: MAX_FALLOS,
      castigoMs: CASTIGO_MS,
      prefijo: "freno:widget",
    });
    await freno.esperar();
    return mal(motivo, estadoHttp);
  };

  const tamano = Number(peticion.headers.get("content-length") ?? 0);
  if (tamano > 16 * 1024) {
    return fallar("Petición demasiado grande.", 413);
  }

  let cuerpo: { codigo?: unknown; fecha?: unknown; pasos?: unknown; suenoHoras?: unknown };
  try {
    const texto = await peticion.text();
    if (texto.length > 16 * 1024) {
      return fallar("Petición demasiado grande.", 413);
    }
    cuerpo = JSON.parse(texto) as typeof cuerpo;
  } catch {
    return fallar("No entiendo lo que ha llegado.", 400);
  }
  if (!cuerpo || typeof cuerpo !== "object") {
    return fallar("No entiendo lo que ha llegado.", 400);
  }

  const codigo =
    typeof cuerpo.codigo === "string" ? cuerpo.codigo.trim().toUpperCase() : "";
  if (!codigoValido(codigo)) {
    return fallar("Falta el código.", 400);
  }

  const traePasos = cuerpo.pasos !== undefined && cuerpo.pasos !== null;
  const traeSueno = cuerpo.suenoHoras !== undefined && cuerpo.suenoHoras !== null;
  if (!traePasos && !traeSueno) {
    return fallar("No llega ni pasos ni horas de sueño.", 400);
  }

  let pasos: number | undefined;
  if (traePasos) {
    if (
      typeof cuerpo.pasos !== "number" ||
      !Number.isInteger(cuerpo.pasos) ||
      cuerpo.pasos < 0 ||
      cuerpo.pasos > MAX_PASOS
    ) {
      return fallar("Los pasos no son un número entero normal.", 400);
    }
    pasos = cuerpo.pasos;
  }

  let suenoHoras: number | undefined;
  if (traeSueno) {
    if (
      typeof cuerpo.suenoHoras !== "number" ||
      !Number.isFinite(cuerpo.suenoHoras) ||
      cuerpo.suenoHoras < 0 ||
      cuerpo.suenoHoras > 24
    ) {
      return fallar("Las horas de sueño no están entre 0 y 24.", 400);
    }
    suenoHoras = Math.round(cuerpo.suenoHoras * 100) / 100;
  }

  // La fecha es opcional: si no viene, la de hoy en Madrid. Si viene, tiene
  // que ser una fecha real del calendario y no una fecha arbitraria en el futuro.
  const hoyMadrid = ahoraEnMadrid(new Date()).fecha;
  let fecha = hoyMadrid;
  if (cuerpo.fecha !== undefined && cuerpo.fecha !== null) {
    const validada = fechaSaludWidgetValida(cuerpo.fecha, hoyMadrid);
    if (!validada) {
      return fallar("La fecha no es válida o está en el futuro.", 400);
    }
    fecha = validada;
  }

  if (!supabase) {
    return mal("Sin nube configurada: la app sigue solo en el móvil.", 503);
  }

  try {
    const p = await supabase.from("personas").select("id").eq("codigo", codigo).maybeSingle();
    if (p.error) {
      console.error("widget/persona:", p.error.message);
      return mal("No se ha podido conectar con la nube. Inténtalo de nuevo.", 500);
    }
    const personaId = (p.data as { id: string | null } | null)?.id;
    if (!personaId) {
      return fallar("Ese código no corresponde a nadie.", 404);
    }

    await perdonarPersistente(freno, supabase, ip, "freno:widget");

    const { data: diaGuardado, error: errorRpc } = await supabase.rpc("fusionar_salud_widget", {
      p_persona_id: personaId,
      p_fecha: fecha,
      p_pasos: pasos ?? null,
      p_sueno: suenoHoras ?? null,
    });
    if (!errorRpc && diaGuardado && typeof diaGuardado === "object") {
      const dia = diaGuardado as { pasos?: number; suenoHoras?: number };
      return NextResponse.json({
        ok: true,
        fecha,
        pasos: dia.pasos ?? null,
        suenoHoras:
          typeof dia.suenoHoras === "number" ? Math.round(dia.suenoHoras * 100) / 100 : null,
      });
    }

    // Solo caemos al camino no atómico si la función RPC aún no existe en Supabase.
    if (errorRpc && !esFuncionRpcAusente(errorRpc)) {
      console.error("widget/rpc:", errorRpc.message);
      return mal("No se ha podido conectar con la nube. Inténtalo de nuevo.", 500);
    }

    const fila = await supabase
      .from("perfiles")
      .select("datos")
      .eq("persona_id", personaId)
      .maybeSingle();
    if (fila.error) {
      console.error("widget/leer:", fila.error);
      return mal("No se ha podido conectar con la nube. Inténtalo de nuevo.", 500);
    }

    const guardado = ((fila.data as { datos: unknown } | null)?.datos ?? {}) as Record<
      string,
      unknown
    >;
    const saludDiaria = fusionarSalud(
      guardado.saludDiaria as Record<string, { pasos?: number; suenoHoras?: number }> | undefined,
      {
        [fecha]: {
          ...(pasos !== undefined ? { pasos } : {}),
          ...(suenoHoras !== undefined ? { suenoHoras } : {}),
        },
      },
    );

    const borradosPrevios = Array.isArray(guardado.borrados)
      ? (guardado.borrados as ElementoBorrado[])
      : undefined;
    const borradosSinDia = quitarBorrado(borradosPrevios, "salud", fecha);
    const filas = {
      persona_id: personaId,
      datos: {
        ...guardado,
        saludDiaria,
        ...(borradosSinDia !== undefined ? { borrados: borradosSinDia } : {}),
      },
    };
    const subida = await supabase
      .from("perfiles")
      .upsert(filas as unknown as Record<string, unknown>, { onConflict: "persona_id" });
    if (subida.error) {
      console.error("widget/guardar:", subida.error);
      return mal("No se ha podido conectar con la nube. Inténtalo de nuevo.", 500);
    }

    const finales = saludDiaria[fecha];
    return NextResponse.json({
      ok: true,
      fecha,
      pasos: finales.pasos ?? null,
      suenoHoras: finales.suenoHoras ?? null,
    });
  } catch (e) {
    console.error("widget:", e);
    return mal("No se ha podido conectar con la nube. Inténtalo de nuevo.", 500);
  }
}
