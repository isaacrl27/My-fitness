/**
 * Cola persistente en IndexedDB para fotos de comidas hechas sin cobertura y
 * utilidades puras para ajustar raciones con multiplicadores rápidos.
 */

export type TipoComidaCola = "desayuno" | "comida" | "cena" | "snack";

export type FotoPendiente = {
  id: string;
  imagen: string;
  mime: string;
  comentario: string;
  tipo: TipoComidaCola;
  fecha: string;
  esCapricho: boolean;
  creadaEn: number;
};

export interface AlmacenColaFotos {
  leer(): Promise<FotoPendiente[]>;
  guardar(lista: FotoPendiente[]): Promise<void>;
}

export const MAX_FOTOS_PENDIENTES = 6;

const NOMBRE_BD = "mi-peso-offline";
const VERSION_BD = 1;
const NOMBRE_TIENDA = "fotos_pendientes";
const CLAVE_LOCAL_RESPALDO = "mi-peso:fotos-pendientes-v1";

/** Factores rápidos de 1 toque para ajustar una ración recién detectada. */
export const FACTORES_RAPIDOS = [0.5, 1, 1.5, 2] as const;

export function etiquetaFactorRacion(factor: number): string {
  if (factor === 0.5) return "½×";
  if (factor === 1.5) return "1½×";
  return `${factor}×`;
}

export function descripcionFactorRacion(factor: number, nombre: string): string {
  if (factor === 0.5) return `Media ración de ${nombre}`;
  if (factor === 1) return `Ración normal de ${nombre}`;
  if (factor === 1.5) return `Ración y media de ${nombre}`;
  return `Doble ración de ${nombre}`;
}

/** Calcula gramos enteros al aplicar un multiplicador manteniendo [1, 3000]. */
export function calcularGramosPorFactor(baseGramos: number, factor: number): number {
  const base = Number.isFinite(baseGramos) && baseGramos > 0 ? baseGramos : 100;
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return Math.max(1, Math.min(3000, Math.round(base * f)));
}

/** Almacén en memoria pensado para pruebas unitarias sin navegador. */
export function crearAlmacenMemoria(inicial: FotoPendiente[] = []): AlmacenColaFotos {
  let datos = [...inicial];
  return {
    async leer() {
      return [...datos];
    },
    async guardar(lista) {
      datos = [...lista];
    },
  };
}

let secuenciaId = 0;
function generarIdFoto(): string {
  secuenciaId += 1;
  return `foto-${Date.now()}-${secuenciaId}-${Math.random().toString(36).slice(2, 7)}`;
}

function ordenarPorFechaDesc(lista: FotoPendiente[]): FotoPendiente[] {
  return [...lista].sort((a, b) => b.creadaEn - a.creadaEn);
}

function leerLocalRespaldo(): FotoPendiente[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const crudo = window.localStorage.getItem(CLAVE_LOCAL_RESPALDO);
    if (!crudo) return [];
    const parsed = JSON.parse(crudo);
    return Array.isArray(parsed) ? (parsed as FotoPendiente[]) : [];
  } catch {
    return [];
  }
}

function guardarLocalRespaldo(lista: FotoPendiente[]): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(CLAVE_LOCAL_RESPALDO, JSON.stringify(lista));
  } catch {
    // Cuota llena o modo privado estricto: ignorar en silencio.
  }
}

function abrirBaseDatos(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const req = indexedDB.open(NOMBRE_BD, VERSION_BD);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOMBRE_TIENDA)) {
        db.createObjectStore(NOMBRE_TIENDA, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolver(req.result);
    req.onerror = () => rechazar(req.error ?? new Error("No se pudo abrir IndexedDB"));
  });
}

async function leerIndexedDB(): Promise<FotoPendiente[]> {
  const db = await abrirBaseDatos();
  try {
    return await new Promise<FotoPendiente[]>((resolver, rechazar) => {
      const tx = db.transaction(NOMBRE_TIENDA, "readonly");
      const tienda = tx.objectStore(NOMBRE_TIENDA);
      const req = tienda.getAll();
      req.onsuccess = () => {
        const res = Array.isArray(req.result) ? (req.result as FotoPendiente[]) : [];
        resolver(ordenarPorFechaDesc(res));
      };
      req.onerror = () => rechazar(req.error ?? new Error("Error leyendo cola offline"));
    });
  } finally {
    db.close();
  }
}

async function guardarIndexedDB(lista: FotoPendiente[]): Promise<void> {
  const db = await abrirBaseDatos();
  try {
    await new Promise<void>((resolver, rechazar) => {
      const tx = db.transaction(NOMBRE_TIENDA, "readwrite");
      const tienda = tx.objectStore(NOMBRE_TIENDA);
      tienda.clear();
      for (const item of lista) {
        tienda.put(item);
      }
      tx.oncomplete = () => resolver();
      tx.onerror = () => rechazar(tx.error ?? new Error("Error guardando cola offline"));
    });
  } finally {
    db.close();
  }
}

const almacenNavegador: AlmacenColaFotos = {
  async leer() {
    if (typeof indexedDB !== "undefined") {
      try {
        return await leerIndexedDB();
      } catch {
        // Fallback seguro en modos privados o entornos sin IndexedDB operativo.
      }
    }
    return ordenarPorFechaDesc(leerLocalRespaldo());
  },
  async guardar(lista) {
    if (typeof indexedDB !== "undefined") {
      try {
        await guardarIndexedDB(lista);
        return;
      } catch {
        // Fallback a localStorage si IndexedDB rechaza escritura.
      }
    }
    guardarLocalRespaldo(lista);
  },
};

export async function listarFotosPendientes(
  almacen: AlmacenColaFotos = almacenNavegador,
): Promise<FotoPendiente[]> {
  return ordenarPorFechaDesc(await almacen.leer());
}

export async function encolarFotoPendiente(
  entrada: Omit<FotoPendiente, "id" | "creadaEn">,
  almacen: AlmacenColaFotos = almacenNavegador,
): Promise<FotoPendiente> {
  const actuales = ordenarPorFechaDesc(await almacen.leer());
  const existente = actuales.find(
    (f) =>
      f.imagen === entrada.imagen &&
      f.comentario === entrada.comentario &&
      f.tipo === entrada.tipo &&
      f.fecha === entrada.fecha &&
      f.esCapricho === entrada.esCapricho,
  );
  if (existente) return existente;

  const nueva: FotoPendiente = {
    ...entrada,
    id: generarIdFoto(),
    creadaEn: Date.now(),
  };
  const acotada = [nueva, ...actuales].slice(0, MAX_FOTOS_PENDIENTES);
  await almacen.guardar(acotada);
  return nueva;
}

export async function eliminarFotoPendiente(
  id: string,
  almacen: AlmacenColaFotos = almacenNavegador,
): Promise<void> {
  const actuales = await almacen.leer();
  const filtrada = actuales.filter((f) => f.id !== id);
  await almacen.guardar(ordenarPorFechaDesc(filtrada));
}

export async function limpiarColaFotosOffline(
  almacen: AlmacenColaFotos = almacenNavegador,
): Promise<void> {
  await almacen.guardar([]);
}
