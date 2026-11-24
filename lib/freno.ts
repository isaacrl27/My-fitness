import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Freno de intentos y tope de envíos, en la memoria del servidor.
 *
 * Vive aquí, fuera de las rutas, para poder probarlo sin arrancar Next. Es la
 * misma idea que ya usan `/api/nube` y `/api/widget`: tras varios fallos
 * seguidos desde el mismo sitio se contesta con retraso y, si insiste, se le
 * deja fuera unos minutos. El retraso no impide adivinar un código, pero lo
 * hace tan lento que no sale a cuenta.
 *
 * Ojo: la cuenta vive en la memoria de cada instancia del servidor. En Vercel
 * puede haber varias, así que esto frena a quien insiste, no es un candado
 * perfecto. Para eso haría falta una tabla en la base de datos.
 */

export type EstadoFreno = { fallos: number; hasta: number };

/**
 * Cuántas direcciones se recuerdan como mucho.
 *
 * Sin tope, un escáner que cambie de IP en cada intento llenaba la memoria del
 * servidor poco a poco. Al pasar del tope se tiran primero las cuentas ya
 * caducadas; si aun así sobran (todo el mundo castigado), se vacía: es
 * preferible perder la cuenta que dejar crecer el mapa sin fin.
 */
const MAXIMO_CLAVES = 5000;

export type Freno = {
  /** ¿Está este sitio castigado ahora mismo? */
  castigada: (clave: string, ahora?: number) => boolean;
  /** Apunta un intento fallido; al llegar al máximo, castiga. */
  anotarFallo: (clave: string, ahora?: number) => void;
  /** Borra la cuenta (por ejemplo, tras un acierto). */
  perdonar: (clave: string) => void;
  /** Espera el retraso de castigo; se usa antes de contestar un error. */
  esperar: () => Promise<void>;
  /** El retraso que se aplica, en milisegundos. */
  retardoMs: number;
};

export function crearFreno(
  opciones: { maxFallos?: number; castigoMs?: number; retardoMs?: number } = {},
): Freno {
  const maxFallos = opciones.maxFallos ?? 10;
  const castigoMs = opciones.castigoMs ?? 5 * 60 * 1000;
  const retardoMs = opciones.retardoMs ?? 700;
  const estados = new Map<string, EstadoFreno>();

  function castigada(clave: string, ahora = Date.now()): boolean {
    const estado = estados.get(clave);
    return Boolean(estado && estado.hasta > ahora);
  }

  function anotarFallo(clave: string, ahora = Date.now()): void {
    const antes = estados.get(clave);
    // Si el castigo anterior ya se cumplió, se vuelve a contar desde cero: si
    // no, un fallo suelto meses después volvería a castigar de golpe.
    const vigente = antes && (antes.hasta === 0 || antes.hasta > ahora);
    const fallos = (vigente ? antes.fallos : 0) + 1;
    estados.set(clave, { fallos, hasta: fallos >= maxFallos ? ahora + castigoMs : 0 });
    podar(ahora);
  }

  function podar(ahora: number): void {
    if (estados.size <= MAXIMO_CLAVES) return;
    for (const [clave, estado] of estados) {
      if (estado.hasta <= ahora) estados.delete(clave);
      if (estados.size <= MAXIMO_CLAVES) return;
    }
    if (estados.size > MAXIMO_CLAVES) estados.clear();
  }

  function perdonar(clave: string): void {
    estados.delete(clave);
  }

  async function esperar(): Promise<void> {
    await new Promise((seguir) => setTimeout(seguir, retardoMs));
  }

  return { castigada, anotarFallo, perdonar, esperar, retardoMs };
}

/**
 * Soporte de freno persistente sobre Supabase (tabla `secretos`).
 * En Vercel Serverless las instancias son efímeras; esto comparte los
 * bloqueos de IP entre lambdas sin penalizar la velocidad gracias a la
 * memoria local.
 */
export async function castigadaPersistente(
  frenoLocal: Freno,
  supabase: SupabaseClient | null | undefined,
  clave: string,
  prefijo = "freno",
): Promise<boolean> {
  if (frenoLocal.castigada(clave)) return true;
  if (!supabase || !clave) return false;
  try {
    const claveSecreto = `${prefijo}:${clave.slice(0, 64)}`;
    const { data } = await supabase
      .from("secretos")
      .select("valor")
      .eq("nombre", claveSecreto)
      .maybeSingle();
    if (!data?.valor) return false;
    const parseado = JSON.parse(data.valor) as { fallos?: number; hasta?: number };
    if (typeof parseado?.hasta === "number" && parseado.hasta > Date.now()) {
      frenoLocal.anotarFallo(clave);
      return true;
    }
  } catch {
    // Si falla la consulta, nos fiamos de la memoria local
  }
  return false;
}

export async function anotarFalloPersistente(
  frenoLocal: Freno,
  supabase: SupabaseClient | null | undefined,
  clave: string,
  opciones: { maxFallos?: number; castigoMs?: number; prefijo?: string } = {},
): Promise<void> {
  frenoLocal.anotarFallo(clave);
  if (!supabase || !clave) return;
  const maxFallos = opciones.maxFallos ?? 10;
  const castigoMs = opciones.castigoMs ?? 5 * 60 * 1000;
  const prefijo = opciones.prefijo ?? "freno";
  const claveSecreto = `${prefijo}:${clave.slice(0, 64)}`;
  try {
    const { data } = await supabase
      .from("secretos")
      .select("valor")
      .eq("nombre", claveSecreto)
      .maybeSingle();
    const ahora = Date.now();
    let fallos = 1;
    let hasta = 0;
    if (data?.valor) {
      try {
        const antes = JSON.parse(data.valor) as { fallos?: number; hasta?: number };
        const vigente = Boolean(antes && (antes.hasta === 0 || (antes.hasta ?? 0) > ahora));
        fallos = (vigente ? (antes.fallos ?? 0) : 0) + 1;
      } catch {
        fallos = 1;
      }
    }
    if (fallos >= maxFallos) {
      hasta = ahora + castigoMs;
    }
    await supabase.from("secretos").upsert({
      nombre: claveSecreto,
      valor: JSON.stringify({ fallos, hasta, actualizado: ahora }),
    });
    if (Math.random() < 0.1) {
      void podarSecretosPersistentes(supabase, prefijo, 500);
    }
  } catch (e) {
    console.error("freno/anotarPersistente:", e);
  }
}

export async function podarSecretosPersistentes(
  supabase: SupabaseClient | null | undefined,
  prefijo = "freno",
  maximo = 500,
): Promise<void> {
  if (!supabase) return;
  try {
    const ahora = Date.now();
    const { data } = await supabase
      .from("secretos")
      .select("nombre, valor")
      .like("nombre", `${prefijo}:%`)
      .limit(maximo + 50);
    if (!data || data.length <= maximo) return;

    const caducados: string[] = [];
    for (const fila of data) {
      try {
        const parsed = JSON.parse(fila.valor) as { hasta?: number };
        if (typeof parsed?.hasta === "number" && parsed.hasta <= ahora) {
          caducados.push(fila.nombre);
        }
      } catch {
        caducados.push(fila.nombre);
      }
    }
    if (caducados.length > 0) {
      await supabase.from("secretos").delete().in("nombre", caducados);
    }
  } catch {
    // Si falla la poda remota, no bloquear el flujo
  }
}

export async function perdonarPersistente(
  frenoLocal: Freno,
  supabase: SupabaseClient | null | undefined,
  clave: string,
  prefijo = "freno",
): Promise<void> {
  frenoLocal.perdonar(clave);
  if (!supabase || !clave) return;
  try {
    const claveSecreto = `${prefijo}:${clave.slice(0, 64)}`;
    await supabase.from("secretos").delete().eq("nombre", claveSecreto);
  } catch {
    // ignorar
  }
}

export type TopeEnvios = {
  /** ¿Puede mandar otro mensaje ahora? Limpia de paso los envíos caducados. */
  permite: (clave: string, ahora?: number) => boolean;
  /** Apunta un envío que ha salido bien. */
  anotar: (clave: string, ahora?: number) => void;
  /** Borra la cuenta de una persona. */
  olvidar: (clave: string) => void;
};

/**
 * Como mucho `maximo` envíos por persona dentro de la ventana. Sin esto, quien
 * tenga la clave de la puerta puede llenar el buzón (y el móvil de Isaac de
 * avisos) a base de pulsar «Enviar» cien veces seguidas.
 */
export function crearTopeEnvios(
  opciones: { maximo?: number; ventanaMs?: number } = {},
): TopeEnvios {
  const maximo = opciones.maximo ?? 5;
  const ventanaMs = opciones.ventanaMs ?? 10 * 60 * 1000;
  const envios = new Map<string, number[]>();

  function recientes(clave: string, ahora: number): number[] {
    const todos = envios.get(clave) ?? [];
    const vivos = todos.filter((t) => ahora - t < ventanaMs);
    if (vivos.length === 0) envios.delete(clave);
    else envios.set(clave, vivos);
    return vivos;
  }

  function podarEnvios(ahora: number): void {
    if (envios.size <= MAXIMO_CLAVES) return;
    for (const [clave, marcas] of envios) {
      const vivos = marcas.filter((t) => ahora - t < ventanaMs);
      if (vivos.length === 0) envios.delete(clave);
      else envios.set(clave, vivos);
      if (envios.size <= MAXIMO_CLAVES) return;
    }
    if (envios.size > MAXIMO_CLAVES) envios.clear();
  }

  function permite(clave: string, ahora = Date.now()): boolean {
    return recientes(clave, ahora).length < maximo;
  }

  function anotar(clave: string, ahora = Date.now()): void {
    const vivos = recientes(clave, ahora);
    vivos.push(ahora);
    envios.set(clave, vivos);
    podarEnvios(ahora);
  }

  function olvidar(clave: string): void {
    envios.delete(clave);
  }

  return { permite, anotar, olvidar };
}
