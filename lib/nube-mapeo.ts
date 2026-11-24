import type { Alimento, Comida, Datos, ElementoBorrado, Gusto, MensajeIsaac, Pesada } from "./store";
import { esHabito, esHabitoPropio } from "./habitos.ts";

/**
 * Traduce entre lo que guarda la app y lo que guardan las tablas.
 *
 * Está aparte del resto para poder probarlo sin tener que tocar la nube:
 * `pruebas/nube.prueba.mts` lo prueba solo con objetos en memoria.
 *
 * Forma de las tablas (nombres en snake_case porque así trabaja Postgres):
 *
 *   personas     (id, nombre, codigo, creada, actualizada)
 *   dispositivos (id, persona_id, suscripcion, creada, ultima_vez)
 *   perfiles     (persona_id, datos, actualizada)         <- perfil + meta agua
 *   pesadas      (persona_id, fecha, kg, anotada)
 *   comidas      (persona_id, id, fecha, tipo, alimentos, anotada)
 *   agua         (persona_id, fecha, litros, anotada)
 *   gustos       (persona_id, ingrediente, valor, anotada)
 */

export type FilaPesada = { persona_id: string; fecha: string; kg: number };
export type FilaComida = {
  persona_id: string;
  id: string;
  fecha: string;
  tipo: string;
  alimentos: unknown;
};
export type FilaAgua = { persona_id: string; fecha: string; litros: number };
export type FilaGusto = { persona_id: string; ingrediente: string; valor: string };

/** Lo que se guarda en `perfiles.datos`: el perfil entero, la meta del agua,
 * los caprichos canjeados y los pasos/sueño del iPhone (todo en el mismo
 * jsonb, sin migración nueva). */
export type PerfilGuardado = {
  perfil: Datos["perfil"];
  metaAguaL: number;
  caprichos?: string[];
  /**
   * Los ids de las comidas que son de capricho. Van aquí, en el jsonb del
   * perfil, para no tener que añadir una columna a la tabla `comidas` ni
   * migrar la base: al bajar, se marcan esas comidas.
   */
  comidasCapricho?: string[];
  habitosHechos?: Record<string, string[]>;
  /** Ejercicios hechos cada día (los marca la pestaña Entreno). */
  entrenosHechos?: Record<string, string[]>;
  /** Pasos y sueño que llegan del iPhone (Atajo → /api/widget), por día. */
  saludDiaria?: Record<string, { pasos?: number; suenoHoras?: number }>;
  mensajesIsaac?: MensajeIsaac[];
  borrados?: ElementoBorrado[];
  /**
   * Cuánta IA lleva gastada la persona hoy. Los lleva el servidor en la nube:
   * el móvil no los conoce y no los manda, así que al subir hay que
   * conservarlos o se reiniciaría la cuota con cada comida anotada.
   */
  usoIA?: unknown;
  usoIAtexto?: unknown;
  usoIAfoto?: unknown;
};

const DOS_DECIMALES = (n: number) => Math.round(n * 100) / 100;

/**
 * Campos del perfil que lleva el servidor y que el móvil no conoce.
 *
 * - `usoIA*`: la cuota de la IA. Si se subiera la copia del móvil tal cual,
 *   cada comida anotada reiniciaría el consumo y la IA sería infinita.
 * - `comentarios`: los mensajes del buzón de la beta. Se escriben desde el
 *   servidor y, sin conservarlos, la siguiente subida del móvil los borraría.
 * - `comentariosLeidos`: la fecha en la que Isaac abrió la lista por última
 *   vez, para saber qué mensajes son nuevos.
 */
const CAMPOS_DEL_SERVIDOR = [
  "usoIA",
  "usoIAtexto",
  "usoIAfoto",
  "comentarios",
  "comentariosLeidos",
  "mensajesIsaac",
  "borrados",
] as const;

/**
 * Devuelve lo que sube el móvil con los campos del servidor que ya había en la
 * nube puestos encima. Lo demás que traiga la nube no se toca aquí.
 */
export function conservarCamposDeServidor(
  subida: Record<string, unknown>,
  nube: Record<string, unknown> | null | undefined,
  /**
   * Claves que este móvil tiene vivas (`pesada:2026-10-31`, `comida:id`...).
   *
   * Una lápida de la nube que apunte a algo vivo se descarta: el usuario lo
   * volvió a apuntar después de borrarlo y no puede desaparecer otra vez al
   * sincronizar. Las lápidas de lo que no está en la subida se conservan.
   */
  vivas?: ReadonlySet<string>,
): Record<string, unknown> {
  const salida: Record<string, unknown> = { ...subida };
  for (const clave of CAMPOS_DEL_SERVIDOR) {
    if (clave === "mensajesIsaac") {
      const msgsNube = Array.isArray(nube?.mensajesIsaac)
        ? (nube.mensajesIsaac as MensajeIsaac[])
        : undefined;
      const msgsSubida = Array.isArray(subida?.mensajesIsaac)
        ? (subida.mensajesIsaac as MensajeIsaac[])
        : undefined;
      if (msgsNube !== undefined || msgsSubida !== undefined) {
        salida.mensajesIsaac = fusionarMensajesIsaac(msgsSubida, msgsNube);
      }
      continue;
    }
    if (clave === "borrados") {
      const bSubida = Array.isArray(subida?.borrados)
        ? (subida.borrados as ElementoBorrado[])
        : undefined;
      const bNube = Array.isArray(nube?.borrados)
        ? (nube.borrados as ElementoBorrado[])
        : undefined;
      if (bSubida !== undefined || bNube !== undefined) {
        const fusion = fusionarBorrados(bSubida, bNube);
        salida.borrados = vivas
          ? fusion.filter((b) => !vivas.has(`${b.tipo}:${b.clave}`))
          : fusion;
      }
      continue;
    }
    const valor = nube?.[clave];
    if (valor !== undefined) salida[clave] = valor;
  }
  return salida;
}

/**
 * Mezcla los mensajes de Isaac entre local y la nube sin duplicados.
 * Si en local se ha marcado como leído, se respeta el estado leído.
 */
export function fusionarMensajesIsaac(
  local?: MensajeIsaac[],
  nube?: MensajeIsaac[],
): MensajeIsaac[] {
  const mapa = new Map<string, MensajeIsaac>();
  for (const m of nube ?? []) {
    if (m && typeof m.id === "string") mapa.set(m.id, m);
  }
  for (const m of local ?? []) {
    if (m && typeof m.id === "string") {
      const previo = mapa.get(m.id);
      if (previo) {
        mapa.set(m.id, { ...previo, ...m, leido: previo.leido || m.leido });
      } else {
        mapa.set(m.id, m);
      }
    }
  }
  return [...mapa.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}
const TIPOS_BORRADO_OK = new Set(["comida", "pesada", "gusto", "salud"]);

/**
 * Une marcas de borrado (tombstones) de dos dispositivos.
 * Se purgan las que tengan más de 30 días, se conserva siempre la marca más
 * reciente de cada clave y se acota a 200 entradas para no engordar el perfil.
 */
export function fusionarBorrados(
  a?: ElementoBorrado[],
  b?: ElementoBorrado[],
): ElementoBorrado[] {
  const mapa = new Map<string, ElementoBorrado>();
  const limite = Date.now() - 30 * 24 * 3600 * 1000;
  for (const item of [...(b ?? []), ...(a ?? [])]) {
    if (
      !item ||
      typeof item.tipo !== "string" ||
      !TIPOS_BORRADO_OK.has(item.tipo) ||
      typeof item.clave !== "string" ||
      item.clave === "" ||
      typeof item.borradoEn !== "string"
    ) {
      continue;
    }
    const t = Date.parse(item.borradoEn);
    if (!Number.isNaN(t) && t < limite) continue;
    const llave = `${item.tipo}:${item.clave}`;
    const previo = mapa.get(llave);
    if (!previo || item.borradoEn > previo.borradoEn) {
      mapa.set(llave, item);
    }
  }
  return [...mapa.values()]
    .sort((x, y) => x.borradoEn.localeCompare(y.borradoEn))
    .slice(-200);
}

/**
 * Retira la marca de borrado de algo que se ha vuelto a apuntar.
 *
 * Si la marca se queda, la siguiente fusión la ve y lo borra otra vez: pasaba
 * al quitar una pesada y volver a apuntarla ese mismo día, o al dejar de
 * valorar un plato y volver a valorarlo. Devuelve la misma lista si no había
 * nada que quitar, para no crear estados nuevos sin motivo.
 */
export function quitarBorrado(
  borrados: ElementoBorrado[] | undefined,
  tipo: ElementoBorrado["tipo"],
  clave: string,
): ElementoBorrado[] | undefined {
  if (!borrados || borrados.length === 0) return borrados;
  const siguientes = borrados.filter((b) => !(b.tipo === tipo && b.clave === clave));
  return siguientes.length === borrados.length ? borrados : siguientes;
}

/**
 * Los datos de la app convertidos en filas para subir.
 *
 * `alimentos` va como objeto normal: Postgres lo guarda como jsonb y lo
 * devuelve igual, sin que haya que parsearlo a mano.
 */
export function aFilas(
  datos: Datos,
  personaId: string,
  opciones?: { comidasCapricho?: string[] },
) {
  const comidasCapricho =
    opciones?.comidasCapricho ??
    datos.comidas.filter((c) => c.capricho === true).map((c) => c.id);
  return {
    perfil: {
      persona_id: personaId,
      datos: {
        perfil: datos.perfil,
        metaAguaL: datos.metaAguaL,
        caprichos: datos.caprichos ?? [],
        comidasCapricho,
        habitosHechos: datos.habitosHechos ?? {},
        entrenosHechos: datos.entrenosHechos ?? {},
        saludDiaria: datos.saludDiaria ?? {},
        mensajesIsaac: datos.mensajesIsaac ?? [],
        borrados: datos.borrados ?? [],
      } satisfies PerfilGuardado,
    },
    pesadas: datos.pesadas.map(
      (p): FilaPesada => ({ persona_id: personaId, fecha: p.fecha, kg: p.kg }),
    ),
    comidas: datos.comidas.map(
      (c): FilaComida => ({
        persona_id: personaId,
        id: c.id,
        fecha: c.fecha,
        tipo: c.tipo,
        alimentos: c.alimentos,
      }),
    ),
    agua: Object.entries(datos.aguaLitros).map(
      ([fecha, litros]): FilaAgua => ({
        persona_id: personaId,
        fecha,
        litros: DOS_DECIMALES(litros),
      }),
    ),
    gustos: Object.entries(datos.gustos).map(
      ([ingrediente, valor]): FilaGusto => ({ persona_id: personaId, ingrediente, valor }),
    ),
  };
}

/** Las fechas y horas en las que la app espera ISO de calendario real (YYYY-MM-DD). */
function fechaBuena(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!m) return null;
  const anyo = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const utc = new Date(Date.UTC(anyo, mes - 1, dia));
  if (
    utc.getUTCFullYear() !== anyo ||
    utc.getUTCMonth() + 1 !== mes ||
    utc.getUTCDate() !== dia
  ) {
    return null;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Valida la fecha enviada por el Atajo/Widget (`YYYY-MM-DD` exacta, día real
 * de calendario entre 2020-01-01 y como mucho mañana respecto a `hoyMadrid`
 * por margen de huso horario al viajar hacia el este).
 */
export function fechaSaludWidgetValida(valor: unknown, hoyMadrid: string): string | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const limpia = fechaBuena(valor);
  if (!limpia || limpia < "2020-01-01") return null;
  const baseHoy = fechaBuena(hoyMadrid);
  if (!baseHoy) return null;
  const [a, m, d] = baseHoy.split("-").map(Number);
  const mananaUtc = new Date(Date.UTC(a, m - 1, d + 1));
  const tope = mananaUtc.toISOString().slice(0, 10);
  if (limpia > tope) return null;
  return limpia;
}

/**
 * Distingue el error de «función RPC aún no pegada en Supabase» (`PGRST202` /
 * `42883`) de fallos transitorios reales de base de datos o red.
 */
export function esFuncionRpcAusente(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "PGRST202" || error.code === "42883") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("could not find the function") || msg.includes("does not exist");
}

function numeroSeguro(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * Los cuatro tramos del día que entiende la app. Va aquí a mano para poder
 * usarlo sin cargar el almacén (que tira de React y no entra en las pruebas).
 * Si algún día cambia `TIPOS_COMIDA` de `lib/store.tsx`, esto también.
 */
const TIPOS_OK = new Set(["desayuno", "comida", "cena", "snack"]);

/** Un alimento de una comida, con sus números en su sitio. */
function alimentoBueno(crudo: unknown): Alimento | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const a = crudo as Record<string, unknown>;
  if (typeof a.id !== "string" || a.id === "") return null;
  if (typeof a.nombre !== "string" || a.nombre.trim() === "") return null;
  if (typeof a.cantidad !== "string") return null;
  const kcal = numeroSeguro(a.kcal);
  const proteinas = numeroSeguro(a.proteinas);
  const carbohidratos = numeroSeguro(a.carbohidratos);
  const grasas = numeroSeguro(a.grasas);
  // Un número negativo o sin sentido no se admite: mejor perder la fila que
  // sumar macros inventados.
  if (
    kcal === null || proteinas === null ||
    carbohidratos === null || grasas === null ||
    kcal < 0 || proteinas < 0 || carbohidratos < 0 || grasas < 0
  ) {
    return null;
  }
  return {
    id: a.id,
    nombre: a.nombre,
    cantidad: a.cantidad,
    kcal,
    proteinas,
    carbohidratos,
    grasas,
  };
}

/**
 * Deja las comidas en estado que la app pueda abrir.
 *
 * Se usa tanto con lo que baja de la nube como con lo que se lee del móvil:
 * una comida con el tipo cambiado, con los alimentos rotos (un `null`, un
 * número donde toca texto) se quedaba tal cual y la pantalla de Hoy moría al
 * abrirla. Ahora se limpia fila a fila: lo que se entienda entra, lo que no,
 * se pierde. Una comida que se queda sin ningún alimento bueno tampoco entra.
 */
export function limpiarComidas(crudo: unknown): Comida[] {
  if (!Array.isArray(crudo)) return [];
  const limpias: Comida[] = [];
  for (const c of crudo) {
    if (typeof c !== "object" || c === null) continue;
    const fila = c as Record<string, unknown>;
    const fecha = fechaBuena(fila.fecha);
    if (fecha === null) continue;
    if (typeof fila.id !== "string" || fila.id === "") continue;
    if (typeof fila.tipo !== "string" || !TIPOS_OK.has(fila.tipo)) continue;
    if (!Array.isArray(fila.alimentos)) continue;
    const alimentos: Alimento[] = [];
    for (const a of fila.alimentos) {
      const bueno = alimentoBueno(a);
      if (bueno !== null) alimentos.push(bueno);
    }
    if (alimentos.length === 0) continue;
    limpias.push({
      id: fila.id,
      fecha,
      tipo: fila.tipo as Comida["tipo"],
      alimentos,
      // En el móvil el capricho viaja dentro de la propia comida. En la nube
      // viaja en la lista de ids del perfil; se marca más abajo.
      ...(fila.capricho === true ? { capricho: true } : {}),
    });
  }
  return limpias;
}

/**
 * Vuelta: de lo que devuelven las tablas a los datos de la app.
 *
 * Se ignora con cuidado lo que no se pueda leer (una fecha mal escrita, un
 * número vacío): mejor perder una fila suelta que dejar la app sin abrir.
 */
export function deFilas(
  perfil: { datos: unknown } | null,
  pesadas: { fecha: unknown; kg: unknown }[],
  comidas: { id: unknown; fecha: unknown; tipo: unknown; alimentos: unknown }[],
  agua: { fecha: unknown; litros: unknown }[],
  gustos: { ingrediente: unknown; valor: unknown }[],
): Datos {
  const guardado =
    perfil && typeof perfil.datos === "object" && perfil.datos !== null
      ? (perfil.datos as Partial<PerfilGuardado>)
      : {};

  const borradosGuardados = Array.isArray(guardado.borrados) ? (guardado.borrados as ElementoBorrado[]) : [];
  const clavesComidasBorradas = new Set(
    borradosGuardados.filter((b) => b.tipo === "comida").map((b) => b.clave),
  );
  const clavesPesadasBorradas = new Set(
    borradosGuardados.filter((b) => b.tipo === "pesada").map((b) => b.clave),
  );
  const clavesGustosBorrados = new Set(
    borradosGuardados.filter((b) => b.tipo === "gusto").map((b) => b.clave),
  );

  const pesadasLimpias: Pesada[] = [];
  for (const p of pesadas) {
    const fecha = fechaBuena(p.fecha);
    const kg = numeroSeguro(p.kg);
    if (fecha !== null && kg !== null && kg > 0 && !clavesPesadasBorradas.has(fecha)) {
      pesadasLimpias.push({ fecha, kg });
    }
  }
  pesadasLimpias.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const comidasLimpias: Comida[] = limpiarComidas(comidas).filter(
    (c) => !clavesComidasBorradas.has(c.id),
  );
  // Los caprichos viajan como ids dentro del perfil (jsonb), no como columna
  // de la tabla: así no hace falta migrar Supabase. Se marcan aquí.
  const idsCapricho = new Set(
    Array.isArray(guardado.comidasCapricho)
      ? guardado.comidasCapricho.filter((id): id is string => typeof id === "string")
      : [],
  );
  const comidasConCapricho = comidasLimpias.map((c) =>
    idsCapricho.has(c.id) ? { ...c, capricho: true } : c,
  );

  const aguaLitros: Record<string, number> = {};
  for (const a of agua) {
    const fecha = fechaBuena(a.fecha);
    const litros = numeroSeguro(a.litros);
    if (fecha !== null && litros !== null && litros >= 0 && litros <= 15) {
      aguaLitros[fecha] = DOS_DECIMALES(litros);
    }
  }

  const gustosLimpios: Record<string, Gusto> = {};
  for (const g of gustos) {
    if (typeof g.ingrediente !== "string" || g.ingrediente.trim() === "") continue;
    if (clavesGustosBorrados.has(g.ingrediente)) continue;
    if (g.valor === "me-gusta" || g.valor === "no-me-gusta") gustosLimpios[g.ingrediente] = g.valor;
  }

  // Los hábitos marcados: solo fechas de verdad e ids del catálogo o propios;
  // un día que se quede sin ningún id válido se tira entero.
  const habitosHechosLimpios: Record<string, string[]> = {};
  const marcados = guardado.habitosHechos;
  if (marcados && typeof marcados === "object") {
    for (const [fecha, ids] of Object.entries(marcados)) {
      const dia = fechaBuena(fecha);
      if (dia === null || !Array.isArray(ids)) continue;
      const buenos = ids.filter(
        (id): id is string => typeof id === "string" && (esHabito(id) || esHabitoPropio(id)),
      );
      if (buenos.length > 0) habitosHechosLimpios[dia] = [...new Set(buenos)];
    }
  }

  // Los ejercicios hechos: mismas reglas que los hábitos, pero sin catálogo,
  // porque el id es el del ejercicio del plan.
  const entrenosHechosLimpios: Record<string, string[]> = {};
  const entrenos = guardado.entrenosHechos;
  if (entrenos && typeof entrenos === "object") {
    for (const [fecha, ids] of Object.entries(entrenos)) {
      const dia = fechaBuena(fecha);
      if (dia === null || !Array.isArray(ids)) continue;
      const buenos = ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0 && id.length < 60,
      );
      if (buenos.length > 0) entrenosHechosLimpios[dia] = [...new Set(buenos)];
    }
  }

  // Los pasos y el sueño del iPhone: solo fechas de verdad y números en rango
  // (pasos 0..100000, sueño 0..24 horas); lo que no lo sea se tira.
  const saludDiariaLimpia: Record<string, { pasos?: number; suenoHoras?: number }> = {};
  const saludCruda: unknown = (guardado as { saludDiaria?: unknown }).saludDiaria;
  if (saludCruda && typeof saludCruda === "object") {
    for (const [fecha, bruto] of Object.entries(saludCruda as Record<string, unknown>)) {
      const dia = fechaBuena(fecha);
      if (dia === null || !bruto || typeof bruto !== "object") continue;
      const { pasos, suenoHoras } = bruto as { pasos?: unknown; suenoHoras?: unknown };
      const limpio: { pasos?: number; suenoHoras?: number } = {};
      const nPasos = numeroSeguro(pasos);
      if (nPasos !== null && nPasos >= 0 && nPasos <= 100000) limpio.pasos = nPasos;
      const nSueno = numeroSeguro(suenoHoras);
      if (nSueno !== null && nSueno >= 0 && nSueno <= 24) limpio.suenoHoras = nSueno;
      // Un día sin ningún valor legible se tira entero.
      if (limpio.pasos !== undefined || limpio.suenoHoras !== undefined) saludDiariaLimpia[dia] = limpio;
    }
  }

  // Si `POST /api/widget` inyectó pasos/sueño nuevos después de que el usuario
  // vaciara ese día (por eso la fecha existe en `saludDiariaLimpia`), retiramos
  // su vieja lápida de `salud` para que la fusión del móvil no borre lo nuevo.
  const borradosLimpiados = borradosGuardados.filter(
    (b) => !(b.tipo === "salud" && saludDiariaLimpia[b.clave] !== undefined),
  );

  return {
    perfil: (guardado.perfil as Datos["perfil"]) ?? null,
    pesadas: pesadasLimpias,
    comidas: comidasConCapricho,
    aguaLitros,
    metaAguaL:
      typeof guardado.metaAguaL === "number" && guardado.metaAguaL > 0 ? guardado.metaAguaL : 2,
    gustos: gustosLimpios,
    caprichos: Array.isArray(guardado.caprichos)
      ? guardado.caprichos
          .map((f) => (typeof f === "string" ? fechaBuena(f) : null))
          .filter((f): f is string => f !== null)
      : [],
    habitosHechos: habitosHechosLimpios,
    entrenosHechos: entrenosHechosLimpios,
    saludDiaria: saludDiariaLimpia,
    mensajesIsaac: Array.isArray(guardado.mensajesIsaac) ? guardado.mensajesIsaac : [],
    borrados: borradosLimpiados,
  };
}

/** Mezcla los pasos y el sueño de dos lados (el móvil y la nube) sin perder
 * nada: para cada día se queda con el valor mayor de cada campo. Así el
 * upsert del móvil nunca borra los pasos que metió el Atajo por su cuenta. */
export function fusionarSalud(
  a?: Record<string, { pasos?: number; suenoHoras?: number }>,
  b?: Record<string, { pasos?: number; suenoHoras?: number }>,
): Record<string, { pasos?: number; suenoHoras?: number }> {
  // Primero se limpia cada lado por separado, con las mismas reglas que la
  // bajada: fechas de verdad y números en rango. Lo que no valga se tira.
  const limpiar = (
    bruto?: Record<string, { pasos?: number; suenoHoras?: number }>,
  ): Record<string, { pasos?: number; suenoHoras?: number }> => {
    const limpio: Record<string, { pasos?: number; suenoHoras?: number }> = {};
    if (!bruto || typeof bruto !== "object") return limpio;
    for (const [fecha, dia] of Object.entries(bruto)) {
      const buena = fechaBuena(fecha);
      if (buena === null || !dia || typeof dia !== "object") continue;
      const valores: { pasos?: number; suenoHoras?: number } = {};
      const nPasos = numeroSeguro(dia.pasos);
      if (nPasos !== null && nPasos >= 0 && nPasos <= 100000) valores.pasos = nPasos;
      const nSueno = numeroSeguro(dia.suenoHoras);
      if (nSueno !== null && nSueno >= 0 && nSueno <= 24) valores.suenoHoras = nSueno;
      if (valores.pasos !== undefined || valores.suenoHoras !== undefined) limpio[buena] = valores;
    }
    return limpio;
  };

  const uno = limpiar(a);
  const dos = limpiar(b);
  const salida: Record<string, { pasos?: number; suenoHoras?: number }> = {};

  // Para cada día de cualquiera de los dos lados: el valor mayor de cada
  // campo. Si solo lo tiene uno, ese manda. Así nunca se pierde lo inyectado.
  for (const fecha of new Set([...Object.keys(uno), ...Object.keys(dos)])) {
    const daUno = uno[fecha] ?? {};
    const daDos = dos[fecha] ?? {};
    const dia: { pasos?: number; suenoHoras?: number } = {};
    const pasos = [daUno.pasos, daDos.pasos].filter((v): v is number => v !== undefined);
    if (pasos.length > 0) dia.pasos = Math.max(...pasos);
    const sueno = [daUno.suenoHoras, daDos.suenoHoras].filter((v): v is number => v !== undefined);
    if (sueno.length > 0) dia.suenoHoras = Math.max(...sueno);
    salida[fecha] = dia;
  }

  return salida;
}

/** El abecedario del código de recuperación: sin letras raras ni números que se confundan. */
const ABECEDARIO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Mezcla lo que había en el móvil con lo que baja de la nube.
 *
 * Nunca se tira nada: lo que está en los dos se queda con uno de los dos
 * según de dónde venga —en general lo del móvil, que es lo último tocado—,
 * y lo que solo está en uno se añade. Así, al recuperar los datos desde un
 * móvil nuevo no se pierde lo que se hubiera anotado en él mientras tanto.
 *
 * `preferirNube` cambia quién gana en lo que se pisa. Al arrancar la app gana
 * el móvil (lo de siempre). Al recuperar la cuenta con el código gana la nube:
 * el móvil puede ser nuevo y traer un perfil y una meta de agua por defecto
 * que no deben machacar los de verdad.
 */
export function fusionar(local: Datos, nube: Datos, preferirNube = false): Datos {
  const porFecha = <T extends { fecha: string }>(a: T[], b: T[]): T[] => {
    const mapa = new Map<string, T>();
    for (const x of b) mapa.set(x.fecha, x);
    for (const x of a) mapa.set(x.fecha, x); // el primero de los dos gana
    return [...mapa.values()].sort((x, y) => x.fecha.localeCompare(y.fecha));
  };

  const porId = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const mapa = new Map<string, T>();
    for (const x of b) mapa.set(x.id, x);
    for (const x of a) mapa.set(x.id, x);
    return [...mapa.values()];
  };

  /**
   * Une dos listas guardadas por fecha (los hábitos marcados).
   *
   * Antes se quedaba el array entero del que mandaba, así que si un móvil
   * tenía «leer» y la nube «correr» el mismo día, uno de los dos desaparecía.
   * Ahora se juntan sin repetir.
   */
  const unirPorFecha = <T>(a?: Record<string, T[]>, b?: Record<string, T[]>): Record<string, T[]> => {
    const salida: Record<string, T[]> = {};
    for (const fecha of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
      salida[fecha] = [...new Set([...(a?.[fecha] ?? []), ...(b?.[fecha] ?? [])])];
    }
    return salida;
  };

  const primero = preferirNube ? nube : local;
  const segundo = preferirNube ? local : nube;

  const borrados = fusionarBorrados(local.borrados, nube.borrados);
  const clavesComidasBorradas = new Set(
    borrados.filter((b) => b.tipo === "comida").map((b) => b.clave),
  );
  const clavesPesadasBorradas = new Set(
    borrados.filter((b) => b.tipo === "pesada").map((b) => b.clave),
  );
  const clavesGustosBorrados = new Set(
    borrados.filter((b) => b.tipo === "gusto").map((b) => b.clave),
  );
  const clavesSaludBorradas = new Set(
    borrados.filter((b) => b.tipo === "salud").map((b) => b.clave),
  );

  const pesadasFusionadas = porFecha(primero.pesadas, segundo.pesadas).filter(
    (p) => !clavesPesadasBorradas.has(p.fecha),
  );
  const comidasFusionadas = porId(primero.comidas, segundo.comidas).filter(
    (c) => !clavesComidasBorradas.has(c.id),
  );
  const gustosFusionados = { ...segundo.gustos, ...primero.gustos };
  for (const plato of clavesGustosBorrados) {
    delete gustosFusionados[plato];
  }
  const saludFusionada = fusionarSalud(segundo.saludDiaria, primero.saludDiaria);
  for (const dia of clavesSaludBorradas) {
    delete saludFusionada[dia];
  }

  return {
    perfil: primero.perfil ?? segundo.perfil,
    pesadas: pesadasFusionadas,
    comidas: comidasFusionadas,
    aguaLitros: { ...segundo.aguaLitros, ...primero.aguaLitros },
    metaAguaL: primero.perfil ? primero.metaAguaL : segundo.metaAguaL,
    gustos: gustosFusionados,
    // La unión de los dos: un capricho canjeado en un móvil no se pierde.
    caprichos: [...new Set([...(primero.caprichos ?? []), ...(segundo.caprichos ?? [])])].sort(),
    // Por fecha se juntan los dos: un hábito marcado en un móvil no se pierde
    // porque el otro tenga otro hábito el mismo día.
    habitosHechos: unirPorFecha(segundo.habitosHechos, primero.habitosHechos),
    // Igual con los ejercicios tachados en Entreno.
    entrenosHechos: unirPorFecha(segundo.entrenosHechos, primero.entrenosHechos),
    // Y los pasos y el sueño se fusionan campo a campo (el mayor de cada
    // uno), respetando las lápidas de días vaciados con `quitarSalud`.
    saludDiaria: saludFusionada,
    // Los mensajes de Isaac de la nube se suman y se preserva si ya se leyeron.
    mensajesIsaac: fusionarMensajesIsaac(local.mensajesIsaac, nube.mensajesIsaac),
    borrados,
  };
}

/**
 * Retira de un estado local ya sincronizado aquellas lápidas que la nube ya
 * superó (por ejemplo, cuando el Atajo del iPhone o un segundo móvil volvió a
 * escribir pasos/pesada/gusto después de un borrado anterior).
 *
 * Solo debe llamarse cuando el móvil NO tiene cambios locales pendientes de subir.
 */
export function limpiarLapidasSuperadas(local: Datos, nube: Datos): Datos {
  if (!Array.isArray(local.borrados) || local.borrados.length === 0) return local;
  const enNubeBorrados = new Set(
    (nube.borrados ?? []).map((b) => `${b.tipo}:${b.clave}`),
  );
  const pesadasNube = new Set(nube.pesadas.map((p) => p.fecha));
  const comidasNube = new Set(nube.comidas.map((c) => c.id));
  const filtrados = local.borrados.filter((b) => {
    if (enNubeBorrados.has(`${b.tipo}:${b.clave}`)) return true;
    if (b.tipo === "salud" && nube.saludDiaria?.[b.clave] !== undefined) return false;
    if (b.tipo === "pesada" && pesadasNube.has(b.clave)) return false;
    if (b.tipo === "gusto" && nube.gustos[b.clave] !== undefined) return false;
    if (b.tipo === "comida" && comidasNube.has(b.clave)) return false;
    return true;
  });
  return filtrados.length === local.borrados.length ? local : { ...local, borrados: filtrados };
}

function aleatorioSeguro(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 0x100000000;
  }
  return Math.random();
}

/**
 * Código de recuperación corto, para poder recuperar los datos desde un móvil
 * nuevo sin tener que escribir nada largo. Se enseña en Ajustes.
 */
export function codigoRecuperacion(aleatorio: () => number = aleatorioSeguro): string {
  let s = "";
  for (let i = 0; i < 6; i += 1) {
    s += ABECEDARIO[Math.floor(aleatorio() * ABECEDARIO.length)];
  }
  return s;
}

/** ¿Está bien escrito un código de recuperación? */
export function codigoValido(codigo: string): boolean {
  const l = codigo.trim().toUpperCase();
  return l.length === 6 && [...l].every((c) => ABECEDARIO.includes(c));
}

/** Cuenta cuánta cosa hay, para poder decirle a Isaac si se ha subido todo. */
export function contar(datos: Datos): number {
  return (
    datos.pesadas.length +
    datos.comidas.length +
    Object.keys(datos.aguaLitros).length +
    Object.keys(datos.gustos).length +
    (datos.perfil ? 1 : 0)
  );
}
