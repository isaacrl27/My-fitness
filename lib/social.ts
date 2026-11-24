/**
 * Módulo Social y Grupos Familiares.
 *
 * Permite:
 * 1. Grupos familiares y de amigos con código de invitación único (ej. FAM-842).
 * 2. Meta cooperativa semanal de hábitos cumplidos en familia (moneda justa para
 *    quien busca ganar músculo, perder grasa o mantener su salud sin exponer la báscula).
 * 3. Rachas, hábitos completados hoy y reacciones contextuales.
 * 4. Lista de la compra compartida en tiempo real para el hogar.
 */

export type MiembroGrupo = {
  codigo: string;
  nombre: string;
  avatar: string; // emoji ej. '🥑', '🦁', '⚡', '🌱'
  racha: number;
  habitosHoy: number;
  habitosTotal: number;
  habitosSemana?: number; // hábitos sumados en la semana actual
  kgAportados: number; // mantenido por compatibilidad con tests previos
  actualizado: string; // ISO
};

export type TipoReaccion = "cinco" | "fuego" | "aplauso" | "agua" | "animo";

export type ReaccionGrupo = {
  id: string;
  deCodigo: string;
  deNombre: string;
  paraCodigo: string;
  tipo: TipoReaccion;
  fecha: string; // ISO
};

export type ItemCompraFamiliar = {
  id: string;
  nombre: string;
  cantidad?: string;
  comprado: boolean;
  compradoPor?: string | null;
  fecha: string; // ISO
};

export type GrupoFamiliar = {
  id: string;
  codigo: string;
  nombre: string;
  creadorCodigo: string;
  metaKg: number; // mantenido por retrocompatibilidad
  metaHabitos?: number; // Meta semanal de hábitos familiares (por defecto 60)
  mes: string; // YYYY-MM
  miembros: MiembroGrupo[];
  reacciones: ReaccionGrupo[];
  compra: ItemCompraFamiliar[];
  actualizado: string; // ISO
};

export const AVATARES_DISPONIBLES = [
  "🥑", "🦁", "⚡", "🌱", "🔥", "🚀", "🦊", "👑", "🥗", "🏃", "🥊", "🍎"
];

export const CLAVE_LOCAL_GRUPO = "mi-peso:grupo-familiar";
export const CLAVE_LOCAL_GRUPOS = "mi-peso:grupos-sociales";
export const CLAVE_LOCAL_GRUPO_ACTIVO = "mi-peso:grupo-activo-id";
export const CLAVE_LOCAL_COMPRA_HOGAR = "mi-peso:compra-hogar";
export const CLAVE_LOCAL_MI_AVATAR = "mi-peso:mi-avatar";
export const META_HABITOS_SEMANA_DEFECTO = 60;

/** Despensa compartida independiente del hogar/cocina física. */
export type MiembroHogar = {
  codigo: string;
  nombre: string;
  avatar?: string;
};

export type CompraHogar = {
  id: string;
  codigo: string; // ej. HOG-842
  nombre: string;
  creadorCodigo: string;
  miembros: MiembroHogar[];
  items: ItemCompraFamiliar[];
  actualizado: string; // ISO
};

/** Genera un código de 6 caracteres legible para el grupo (ej. FAM-842). */
export function generarCodigoGrupo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let num = "";
  for (let i = 0; i < 3; i++) {
    num += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FAM-${num}`;
}

/** Limpia y normaliza el código escrito a mano. */
export function normalizarCodigoGrupo(codigo: string): string {
  if (!codigo || typeof codigo !== "string") return "";
  let limpio = codigo.trim().toUpperCase().replace(/\s+/g, "");
  if (!limpio.startsWith("FAM-") && limpio.length === 3) {
    limpio = `FAM-${limpio}`;
  }
  if (limpio.startsWith("FAM") && !limpio.startsWith("FAM-")) {
    limpio = `FAM-${limpio.slice(3)}`;
  }
  return limpio;
}

/** Valida el nombre de un grupo. */
export function validarNombreGrupo(nombre: string): { ok: boolean; error?: string } {
  const limpio = (nombre ?? "").trim();
  if (limpio.length < 3) {
    return { ok: false, error: "El nombre del grupo debe tener al menos 3 caracteres." };
  }
  if (limpio.length > 30) {
    return { ok: false, error: "El nombre del grupo no puede superar los 30 caracteres." };
  }
  return { ok: true };
}

/** Valida un producto para la lista de compra. */
export function validarItemCompra(nombre: string): { ok: boolean; error?: string } {
  const limpio = (nombre ?? "").trim();
  if (limpio.length < 2) {
    return { ok: false, error: "Escribe el nombre del producto." };
  }
  if (limpio.length > 50) {
    return { ok: false, error: "El nombre del producto es demasiado largo." };
  }
  return { ok: true };
}

/**
 * Cuenta cuántos hábitos reales ha marcado la persona desde el lunes de la
 * semana actual hasta hoy (ambos incluidos).
 */
export function contarMisHabitosSemana(
  habitosHechos: Record<string, string[]> | undefined,
  hoyIso: string,
): number {
  if (!habitosHechos || !hoyIso) return 0;
  const hoyD = new Date(`${hoyIso}T12:00:00`);
  const diaSem = hoyD.getDay(); // 0 domingo, 1 lunes...
  const diffLunes = (diaSem + 6) % 7;
  const lunes = new Date(hoyD);
  lunes.setDate(hoyD.getDate() - diffLunes);

  let total = 0;
  for (let i = 0; i <= diffLunes; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    total += habitosHechos[iso]?.length ?? 0;
  }
  return total;
}

/**
 * Suma los hábitos aportados esta semana por todos los miembros del grupo.
 * Si un cliente antiguo aún no envía `habitosSemana`, estima de forma segura
 * a partir de `habitosHoy` y los días activos de racha en la semana.
 */
export function calcularHabitosGrupo(miembros: MiembroGrupo[]): number {
  if (!Array.isArray(miembros) || miembros.length === 0) return 0;
  return miembros.reduce((acc, m) => {
    if (typeof m.habitosSemana === "number" && m.habitosSemana >= 0) {
      return acc + Math.max(m.habitosSemana, m.habitosHoy || 0);
    }
    const diasSemanaEstimados = Math.min(6, Math.max(0, (m.racha || 1) - 1));
    const baseSemana = diasSemanaEstimados * Math.min(3, Math.max(1, m.habitosHoy || 2));
    return acc + (m.habitosHoy || 0) + baseSemana;
  }, 0);
}

/** Meta de hábitos del grupo (escala según tamaño si no se fijó explícitamente). */
export function obtenerMetaHabitosGrupo(grupo: GrupoFamiliar): number {
  if (typeof grupo.metaHabitos === "number" && grupo.metaHabitos >= 10) {
    return grupo.metaHabitos;
  }
  const nMiembros = Math.max(2, grupo.miembros?.length || 3);
  return nMiembros * 18;
}

/** Suma los kilos aportados (mantenido para suites de tests existentes). */
export function calcularKgPerdidosGrupo(miembros: MiembroGrupo[]): number {
  if (!Array.isArray(miembros) || miembros.length === 0) return 0;
  const suma = miembros.reduce((acc, m) => acc + Math.max(0, m.kgAportados || 0), 0);
  return Math.round(suma * 10) / 10;
}

/** Calcula el porcentaje de avance respecto a la meta grupal (0-100%). */
export function progresoMetaGrupo(actual: number, meta: number): number {
  if (!meta || meta <= 0) return 0;
  const pct = Math.round((actual / meta) * 100);
  return Math.max(0, Math.min(100, pct));
}

/** Crea un grupo familiar inicial. */
export function crearGrupoInicial(
  nombre: string,
  creador: { codigo: string; nombre: string; avatar?: string },
  metaInput = META_HABITOS_SEMANA_DEFECTO,
  mes = new Date().toISOString().slice(0, 7)
): GrupoFamiliar {
  const ahora = new Date().toISOString();
  const metaSegura = Math.max(1, metaInput);
  return {
    id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    codigo: generarCodigoGrupo(),
    nombre: nombre.trim(),
    creadorCodigo: creador.codigo,
    metaKg: metaSegura,
    metaHabitos: metaSegura >= 15 ? metaSegura : META_HABITOS_SEMANA_DEFECTO,
    mes,
    miembros: [
      {
        codigo: creador.codigo,
        nombre: creador.nombre,
        avatar: creador.avatar ?? "🌱",
        racha: 1,
        habitosHoy: 0,
        habitosTotal: 5,
        habitosSemana: 0,
        kgAportados: 0,
        actualizado: ahora,
      },
    ],
    reacciones: [],
    compra: [],
    actualizado: ahora,
  };
}

/** Añade o actualiza un miembro en el grupo. */
export function anadirMiembroAGrupo(grupo: GrupoFamiliar, miembro: MiembroGrupo): GrupoFamiliar {
  const claveNueva = baseDeMiembro(miembro.nombre);
  const existe = grupo.miembros.some(
    (m) => m.codigo === miembro.codigo || baseDeMiembro(m.nombre) === claveNueva
  );
  const miembros = existe
    ? grupo.miembros.map((m) =>
        m.codigo === miembro.codigo || baseDeMiembro(m.nombre) === claveNueva
          ? { ...m, ...miembro }
          : m
      )
    : [...grupo.miembros, miembro];

  return {
    ...grupo,
    miembros,
    actualizado: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Quién es quién dentro del grupo                                     */
/* ------------------------------------------------------------------ */

/** El nombre en forma de trozo de identificador: «Ainhoa Pérez» → «ainhoaperez». */
export function baseDeMiembro(nombre: string): string {
  const limpio = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return limpio || "familiar";
}

/** Un identificador nuevo para esta persona. `azar` se pasa en las pruebas. */
export function nuevoCodigoMiembro(nombre: string, azar?: string): string {
  const sufijo = (azar ?? Math.random().toString(36).slice(2, 7)) || "00000";
  return `${baseDeMiembro(nombre)}_${sufijo}`;
}

/**
 * Los códigos de recuperación son seis caracteres en mayúsculas o números, sin
 * guion bajo. No valen como identificador de grupo: los ve todo el mundo en la
 * pantalla de Familia y con ellos se puede entrar en una cuenta.
 */
export function esCodigoDeRecuperacion(codigo: string): boolean {
  return /^[A-Z0-9]{6}$/.test(codigo);
}

/**
 * El identificador con el que esta persona debe aparecer en el grupo.
 *
 * - Si el móvil ya tiene uno guardado y sigue en el grupo, se respeta: cambiarlo
 *   la duplicaría.
 * - Si el guardado ya no está (porque se limpió una ficha repetida), se adopta
 *   la que quede con su mismo nombre.
 * - Si no hay ninguna, se crea uno.
 */
export function codigoDeMiembro(
  nombre: string,
  guardado: string | null | undefined,
  grupos: GrupoFamiliar[],
): string {
  const limpio = (guardado ?? "").trim();
  const todos = grupos.flatMap((g) => g.miembros);

  // Sin grupos todavía no se puede decidir: se conserva lo que haya.
  if (limpio && (todos.length === 0 || todos.some((m) => m.codigo === limpio))) {
    return limpio;
  }

  const base = baseDeMiembro(nombre);
  const candidatos = todos
    .filter((m) => baseDeMiembro(m.nombre) === base && !esCodigoDeRecuperacion(m.codigo))
    .sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado)));

  return candidatos[0]?.codigo ?? (limpio || nuevoCodigoMiembro(nombre));
}

/**
 * Deja un grupo con una sola ficha por persona y sin códigos de recuperación
 * a la vista. Se queda con la ficha más reciente de cada nombre y reescribe
 * las reacciones y el creador para que sigan apuntando a quien toca.
 *
 * Si no había nada que arreglar devuelve el mismo grupo, sin marcarlo como
 * actualizado.
 */
export function ordenarMiembrosDeGrupo(grupo: GrupoFamiliar): GrupoFamiliar {
  const elegidos = new Map<string, MiembroGrupo>();
  for (const m of grupo.miembros) {
    const clave = baseDeMiembro(m.nombre);
    const previo = elegidos.get(clave);
    if (!previo) {
      elegidos.set(clave, m);
    } else {
      const masReciente = String(m.actualizado) > String(previo.actualizado) ? m : previo;
      const masAntiguo = masReciente === m ? previo : m;
      // Si el registro más reciente trae el fallback "🌱" pero una ficha previa tenía un avatar elegido
      // (ej. Christian con "🥊" o Lola con "🥑"), se conserva el avatar elegido para que la sincronización
      // en segundo plano o el reingreso al grupo no lo sobreescriba.
      const avatarElegido =
        (masReciente.avatar && masReciente.avatar !== "🌱")
          ? masReciente.avatar
          : (masAntiguo.avatar && masAntiguo.avatar !== "🌱")
            ? masAntiguo.avatar
            : (masReciente.avatar || "🌱");

      elegidos.set(clave, { ...masReciente, avatar: avatarElegido });
    }
  }

  // De cada código viejo al que se queda, para que las reacciones no se pierdan.
  const cambios = new Map<string, string>();
  const miembros: MiembroGrupo[] = [];
  for (const [clave, m] of elegidos) {
    const codigo = esCodigoDeRecuperacion(m.codigo) ? nuevoCodigoMiembro(m.nombre) : m.codigo;
    miembros.push(codigo === m.codigo ? m : { ...m, codigo });
    for (const viejo of grupo.miembros) {
      if (baseDeMiembro(viejo.nombre) === clave) cambios.set(viejo.codigo, codigo);
    }
  }

  let cambiaronReacciones = false;
  const vistas = new Set<string>();
  const reacciones = grupo.reacciones
    .map((r) => {
      const deCodigo = cambios.get(r.deCodigo) ?? r.deCodigo;
      const paraCodigo = cambios.get(r.paraCodigo) ?? r.paraCodigo;
      if (deCodigo !== r.deCodigo || paraCodigo !== r.paraCodigo) cambiaronReacciones = true;
      return { ...r, deCodigo, paraCodigo };
    })
    .filter((r) => {
      const clave = `${r.deCodigo}|${r.paraCodigo}|${r.tipo}|${r.fecha}`;
      if (vistas.has(clave)) {
        cambiaronReacciones = true;
        return false;
      }
      vistas.add(clave);
      return true;
    });

  const creadorCodigo = cambios.get(grupo.creadorCodigo) ?? grupo.creadorCodigo;
  const hayCambio =
    miembros.length !== grupo.miembros.length ||
    miembros.some(
      (m, i) =>
        m.codigo !== grupo.miembros[i]?.codigo ||
        m.avatar !== grupo.miembros[i]?.avatar
    ) ||
    cambiaronReacciones ||
    creadorCodigo !== grupo.creadorCodigo;

  if (!hayCambio) return grupo;

  return {
    ...grupo,
    miembros,
    reacciones,
    creadorCodigo,
    actualizado: new Date().toISOString(),
  };
}

/**
 * Deja la lista de miembros de un hogar sin códigos de recuperación a la vista.
 * Si no había nada que arreglar devuelve el mismo hogar sin tocar.
 */
export function ordenarMiembrosDeHogar(hogar: CompraHogar): CompraHogar {
  let huboCambio = false;
  const miembros = hogar.miembros.map((m) => {
    if (esCodigoDeRecuperacion(m.codigo)) {
      huboCambio = true;
      return { ...m, codigo: nuevoCodigoMiembro(m.nombre) };
    }
    return m;
  });
  let creadorCodigo = hogar.creadorCodigo;
  if (esCodigoDeRecuperacion(creadorCodigo)) {
    const reemplazo = miembros.find((m) => baseDeMiembro(m.nombre) === baseDeMiembro("Yo"))?.codigo;
    creadorCodigo = reemplazo ?? nuevoCodigoMiembro("creador");
    huboCambio = true;
  }
  if (!huboCambio) return hogar;
  return {
    ...hogar,
    miembros,
    creadorCodigo,
    actualizado: new Date().toISOString(),
  };
}

/** Añade un producto a la lista de compra compartida. */
export function anadirItemCompra(
  grupo: GrupoFamiliar,
  nombre: string,
  cantidad = "1"
): GrupoFamiliar {
  const nuevo: ItemCompraFamiliar = {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nombre: nombre.trim(),
    cantidad: cantidad.trim() || "1",
    comprado: false,
    compradoPor: null,
    fecha: new Date().toISOString(),
  };

  return {
    ...grupo,
    compra: [nuevo, ...grupo.compra],
    actualizado: new Date().toISOString(),
  };
}

/** Añade un lote de productos a la lista de compra compartida evitando duplicados pendientes. */
export function anadirLoteCompra(
  grupo: GrupoFamiliar,
  items: { nombre: string; cantidad?: string }[]
): GrupoFamiliar {
  const existentes = new Set(
    grupo.compra.filter((i) => !i.comprado).map((i) => i.nombre.toLowerCase().trim())
  );
  const nuevos: ItemCompraFamiliar[] = [];
  const ahora = new Date().toISOString();
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const nom = it.nombre.trim();
    if (!nom || existentes.has(nom.toLowerCase())) continue;
    existentes.add(nom.toLowerCase());
    nuevos.push({
      id: `item_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      nombre: nom,
      cantidad: (it.cantidad ?? "1").trim() || "1",
      comprado: false,
      compradoPor: null,
      fecha: ahora,
    });
  }
  if (nuevos.length === 0) return grupo;
  return {
    ...grupo,
    compra: [...nuevos, ...grupo.compra],
    actualizado: ahora,
  };
}

/** Alterna el estado de compra de un producto. */
export function alternarItemCompra(
  grupo: GrupoFamiliar,
  itemId: string,
  personaNombre: string
): GrupoFamiliar {
  const compra = grupo.compra.map((item) => {
    if (item.id !== itemId) return item;
    const nuevoComprado = !item.comprado;
    return {
      ...item,
      comprado: nuevoComprado,
      compradoPor: nuevoComprado ? personaNombre : null,
      fecha: new Date().toISOString(),
    };
  });

  return {
    ...grupo,
    compra,
    actualizado: new Date().toISOString(),
  };
}

/** Elimina un producto de la lista de compra compartida. */
export function borrarItemCompra(grupo: GrupoFamiliar, itemId: string): GrupoFamiliar {
  return {
    ...grupo,
    compra: grupo.compra.filter((i) => i.id !== itemId),
    actualizado: new Date().toISOString(),
  };
}

/** Limpia todos los productos ya comprados del grupo familiar. */
export function limpiarCompradosGrupo(grupo: GrupoFamiliar): GrupoFamiliar {
  return {
    ...grupo,
    compra: grupo.compra.filter((i) => !i.comprado),
    actualizado: new Date().toISOString(),
  };
}

/** Añade una reacción social (chocar esos 5, fuego, aplauso, agua, ánimo). */
export function anadirReaccion(
  grupo: GrupoFamiliar,
  reaccion: Omit<ReaccionGrupo, "id" | "fecha">
): GrupoFamiliar {
  const nueva: ReaccionGrupo = {
    ...reaccion,
    id: `reac_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fecha: new Date().toISOString(),
  };

  const reacciones = [nueva, ...grupo.reacciones].slice(0, 30);

  return {
    ...grupo,
    reacciones,
    actualizado: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// MOTOR INDEPENDIENTE DE COMPRA DEL HOGAR (DESACASADO DE LOS GRUPOS SOCIALES)
// ---------------------------------------------------------------------------

/** Genera un código de 6 caracteres legible para el hogar (ej. HOG-842). */
export function generarCodigoHogar(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let num = "";
  for (let i = 0; i < 3; i++) {
    num += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HOG-${num}`;
}

/** Limpia y normaliza el código de compra de casa escrito a mano. */
export function normalizarCodigoHogar(codigo: string): string {
  if (!codigo || typeof codigo !== "string") return "";
  let limpio = codigo.trim().toUpperCase().replace(/\s+/g, "");
  if (!limpio.startsWith("HOG-") && limpio.length === 3) {
    limpio = `HOG-${limpio}`;
  }
  if (limpio.startsWith("HOG") && !limpio.startsWith("HOG-")) {
    limpio = `HOG-${limpio.slice(3)}`;
  }
  return limpio;
}

/** Crea una lista de compra de casa inicial. */
export function crearCompraHogarInicial(
  nombre: string,
  creador: { codigo: string; nombre: string; avatar?: string }
): CompraHogar {
  const ahora = new Date().toISOString();
  return {
    id: `hog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    codigo: generarCodigoHogar(),
    nombre: (nombre || "Compra de Casa").trim(),
    creadorCodigo: creador.codigo,
    miembros: [
      {
        codigo: creador.codigo,
        nombre: creador.nombre,
        avatar: creador.avatar ?? "🏡",
      },
    ],
    items: [],
    actualizado: ahora,
  };
}

/** Añade un miembro a la compra del hogar. */
export function anadirMiembroAHogar(
  hogar: CompraHogar,
  miembro: MiembroHogar
): CompraHogar {
  const existe = hogar.miembros.some((m) => m.codigo === miembro.codigo);
  const miembros = existe
    ? hogar.miembros.map((m) => (m.codigo === miembro.codigo ? { ...m, ...miembro } : m))
    : [...hogar.miembros, miembro];

  return {
    ...hogar,
    miembros,
    actualizado: new Date().toISOString(),
  };
}

/** Añade un producto a la compra del hogar. */
export function anadirItemCompraHogar(
  hogar: CompraHogar,
  nombre: string,
  cantidad = "1"
): CompraHogar {
  const nuevo: ItemCompraFamiliar = {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nombre: nombre.trim(),
    cantidad: cantidad.trim() || "1",
    comprado: false,
    compradoPor: null,
    fecha: new Date().toISOString(),
  };

  return {
    ...hogar,
    items: [nuevo, ...hogar.items],
    actualizado: new Date().toISOString(),
  };
}

/** Añade un lote de productos a la compra del hogar sin duplicar pendientes. */
export function anadirLoteCompraHogar(
  hogar: CompraHogar,
  items: { nombre: string; cantidad?: string }[]
): CompraHogar {
  const existentes = new Set(
    hogar.items.filter((i) => !i.comprado).map((i) => i.nombre.toLowerCase().trim())
  );
  const nuevos: ItemCompraFamiliar[] = [];
  const ahora = new Date().toISOString();

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const nom = it.nombre.trim();
    if (!nom || existentes.has(nom.toLowerCase())) continue;
    existentes.add(nom.toLowerCase());
    nuevos.push({
      id: `item_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      nombre: nom,
      cantidad: (it.cantidad ?? "1").trim() || "1",
      comprado: false,
      compradoPor: null,
      fecha: ahora,
    });
  }

  if (nuevos.length === 0) return hogar;
  return {
    ...hogar,
    items: [...nuevos, ...hogar.items],
    actualizado: ahora,
  };
}

/** Alterna el estado de comprado de un producto del hogar. */
export function alternarItemCompraHogar(
  hogar: CompraHogar,
  itemId: string,
  personaNombre: string
): CompraHogar {
  const items = hogar.items.map((item) => {
    if (item.id !== itemId) return item;
    const nuevoComprado = !item.comprado;
    return {
      ...item,
      comprado: nuevoComprado,
      compradoPor: nuevoComprado ? personaNombre : null,
      fecha: new Date().toISOString(),
    };
  });

  return {
    ...hogar,
    items,
    actualizado: new Date().toISOString(),
  };
}

/** Elimina un producto de la compra del hogar. */
export function borrarItemCompraHogar(hogar: CompraHogar, itemId: string): CompraHogar {
  return {
    ...hogar,
    items: hogar.items.filter((i) => i.id !== itemId),
    actualizado: new Date().toISOString(),
  };
}

/** Limpia todos los productos ya comprados del hogar. */
export function limpiarCompradosHogar(hogar: CompraHogar): CompraHogar {
  return {
    ...hogar,
    items: hogar.items.filter((i) => !i.comprado),
    actualizado: new Date().toISOString(),
  };
}

/** Migra datos antiguos de grupo familiar único al array multi-grupo sin perder datos. */
export function migrarGruposLocales(
  grupoViejoRaw: string | null,
  gruposNuevosRaw: string | null
): GrupoFamiliar[] {
  let resultado: GrupoFamiliar[] = [];

  if (gruposNuevosRaw) {
    try {
      const parsed = JSON.parse(gruposNuevosRaw);
      if (Array.isArray(parsed)) {
        resultado = parsed;
      }
    } catch {}
  }

  if (resultado.length === 0 && grupoViejoRaw) {
    try {
      const viejo = JSON.parse(grupoViejoRaw) as GrupoFamiliar;
      if (viejo && viejo.codigo) {
        resultado = [viejo];
      }
    } catch {}
  }

  return resultado;
}
