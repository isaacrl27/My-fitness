"use client";

/**
 * Los datos de la app, guardados en el propio móvil.
 *
 * Mientras no haya base de datos, todo vive aquí (localStorage). Cuando se
 * conecte Supabase, solo hay que cambiar por dentro de este fichero: el resto
 * de la app sigue usando `useDatos()` igual.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Actividad, Objetivo, Sexo } from "./calculos";
import { hoyISO } from "./calculos";
import { cicloPorDefecto, type DatosCiclo } from "./ciclo.ts";
import { type HorasAvisos } from "./avisos.ts";
import { limpiarAvisosLocales } from "./avisos-cliente";
import { escalarAlimento, escalarPorFraccion } from "./escalar.ts";
import { esHabito, esHabitoPropio, type HabitoPropio } from "./habitos.ts";
import {
  bajarNube,
  borrarCuentaNube,
  guardarCodigo,
  leerCodigo,
  reclamarNube,
  reiniciarDispositivo,
  subirNube,
} from "./nube";
import {
  fusionar,
  fusionarBorrados,
  fusionarSalud,
  limpiarComidas,
  limpiarLapidasSuperadas,
  quitarBorrado,
} from "./nube-mapeo";

const CLAVE = "mi-peso:v1";

export type Perfil = {
  nombre: string;
  sexo: Sexo;
  fechaNacimiento: string;
  alturaCm: number;
  pesoInicialKg: number;
  pesoObjetivoKg: number;
  actividad: Actividad;
  ritmoKgSemana: number;
  /** Qué busca: adelgazar, mantenerse o subir. Falta en los perfiles viejos. */
  objetivo?: Objetivo;
  dieta: string;
  noLeGustan: string[];
  creado: string;
  /** Ajuste semanal de calorías (estilo MacroFactor), en kcal. */
  ajusteKcal?: number;
  /** Fecha (ISO) de la última revisión de las calorías. */
  fechaAjuste?: string;
  /** Peso en kg el día de la última revisión. */
  pesoEnAjuste?: number;
  /** Hábitos que esta persona quiere seguir (los de fábrica si nunca eligió). */
  habitosActivos?: string[];
  /** Hábitos que se ha inventado, con su nombre. Ninguno antes de esta versión. */
  habitosPropios?: HabitoPropio[];
  /** Pasos al día que quiere dar; cada persona lo cambia en Ajustes. */
  metaPasos?: number;
  /** Dónde sigue el plan de ejercicios: en casa o en el gimnasio. */
  ejercicioSitio?: "casa" | "gimnasio";
  /** Cuántos días de ejercicio quiere a la semana (2, 3 o 4). */
  ejercicioDias?: 2 | 3 | 4;
  /** Seguimiento del ciclo menstrual y retención de líquidos (Flo). */
  cicloMenstrual?: DatosCiclo;
  /** Horario personalizado de avisos (desayuno, comida, cena, etc.) */
  horasAvisos?: HorasAvisos;
};

export type Pesada = { fecha: string; kg: number };

export type TipoComida = "desayuno" | "comida" | "cena" | "snack";

export const TIPOS_COMIDA: { valor: TipoComida; etiqueta: string }[] = [
  { valor: "desayuno", etiqueta: "Desayuno" },
  { valor: "comida", etiqueta: "Comida" },
  { valor: "cena", etiqueta: "Cena" },
  { valor: "snack", etiqueta: "Snack" },
];

export type Alimento = {
  id: string;
  nombre: string;
  cantidad: string;
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
};

export type Comida = {
  id: string;
  fecha: string;
  tipo: TipoComida;
  alimentos: Alimento[];
  /**
   * Comida de capricho (el cheat meal de la tienda de puntos). Va aparte:
   * no suma en las calorías ni en los macros del día. Es opcional para que
   * las comidas de siempre y las que ya hay guardadas sigan valiendo.
   */
  capricho?: boolean;
};

export type Gusto = "me-gusta" | "no-me-gusta";

export type MensajeIsaac = {
  id: string;
  texto: string;
  fecha: string;
  leido: boolean;
  paraTodos?: boolean;
};

export type ElementoBorrado = {
  tipo: "comida" | "pesada" | "gusto" | "salud";
  clave: string;
  borradoEn: string;
};

/** Todo lo que guarda una persona: perfil, peso, comidas, agua y gustos. */
export type Datos = {
  perfil: Perfil | null;
  pesadas: Pesada[];
  comidas: Comida[];
  /** Litros bebidos, por día. */
  aguaLitros: Record<string, number>;
  /** Cuántos litros al día quiere beber. */
  metaAguaL: number;
  gustos: Record<string, Gusto>;
  /** Días en los que se canjeó un capricho (chill meal), en ISO (YYYY-MM-DD). */
  caprichos: string[];
  /** Hábitos marcados cada día: fecha ISO -> ids de ese día (del catálogo o propios). */
  habitosHechos?: Record<string, string[]>;
  /** Ejercicios hechos cada día: fecha ISO -> ids de ejercicio. */
  entrenosHechos?: Record<string, string[]>;
  /** Pasos y sueño que llegan del iPhone (Atajo → /api/widget), por día. */
  saludDiaria?: Record<string, { pasos?: number; suenoHoras?: number }>;
  mensajesIsaac?: MensajeIsaac[];
  borrados?: ElementoBorrado[];
};

const VACIO: Datos = {
  perfil: null,
  pesadas: [],
  comidas: [],
  aguaLitros: {},
  metaAguaL: 2,
  gustos: {},
  caprichos: [],
  habitosHechos: {},
  entrenosHechos: {},
  saludDiaria: {},
  mensajesIsaac: [],
  borrados: [],
};

/** Qué está pasando con la nube. */
export type EstadoNube =
  | "desconocido"
  | "sin-nube"
  | "sin-conexion"
  | "guardado"
  | "error";

type Contexto = Datos & {
  /** false hasta que se han leído los datos del móvil. */
  listo: boolean;
  /** Qué está pasando con la nube, para enseñarlo en Ajustes. */
  estadoNube: EstadoNube;
  /** El código con el que se recuperan los datos desde otro móvil. */
  codigoNube: string;
  /** Enlaza este móvil con una persona que ya tenía datos. */
  recuperar: (codigo: string) => Promise<boolean>;
  guardarPerfil: (perfil: Perfil) => void;
  anadirPesada: (pesada: Pesada) => void;
  borrarPesada: (fecha: string) => void;
  /** Canjea un chill meal por este día (coste y margen: lib/puntos.ts). */
  canjearCapricho: (fecha: string) => void;
  anadirComida: (comida: Omit<Comida, "id">) => void;
  borrarComida: (id: string) => void;
  borrarAlimento: (comidaId: string, alimentoId: string) => void;
  /** Cambia la cantidad de un alimento ya anotado y reescala sus macros. */
  editarAlimento: (comidaId: string, alimentoId: string, cantidad: string) => boolean;
  /** Ajusta las calorías y cantidad de un alimento tras dejarse comida (ej: 0.5 para la mitad). */
  ajustarSobrasAlimento: (comidaId: string, alimentoId: string, fraccion: number) => void;
  /** Corrige el nombre de un alimento (el capricho se apunta a mano). */
  renombrarAlimento: (comidaId: string, alimentoId: string, nombre: string) => void;
  ponerAgua: (fecha: string, litros: number) => void;
  ponerMetaAgua: (litros: number) => void;
  marcarGusto: (plato: string, gusto: Gusto) => void;
  alternarHabito: (fecha: string, id: string) => void;
  /** Enciende o apaga un ejercicio de un día, para irlo tachando. */
  alternarEjercicio: (fecha: string, id: string) => void;
  /** Deja como hechos todos los ejercicios de un día (botón «Entreno completado»). */
  marcarTodosEjercicios: (fecha: string, ids: string[]) => void;
  /** Anota pasos o sueño de un día; lo mismo que manda el Atajo del iPhone por la red. */
  ponerSalud: (fecha: string, valores: { pasos?: number; suenoHoras?: number }) => void;
  /** Borra los pasos y el sueño de un día (para corregir lo que llego mal del iPhone). */
  quitarSalud: (fecha: string) => void;
  /** Guarda de golpe varios días de pasos y sueño (los que trae el lector nativo al abrir la app). */
  ponerSaludLote: (lote: Record<string, { pasos?: number; suenoHoras?: number }>) => void;
  eliminarCuenta: () => Promise<string | null>;
  marcarMensajeIsaacLeido: (id: string) => void;
  /** Actualiza o registra datos del ciclo menstrual (Flo). */
  actualizarCicloMenstrual: (ciclo: Partial<DatosCiclo>) => void;
};

const Ctx = createContext<Contexto | null>(null);

function limpiarHabitos(crudo: unknown): Record<string, string[]> {
  const limpio: Record<string, string[]> = {};
  if (!crudo || typeof crudo !== "object") return limpio;
  for (const [fecha, ids] of Object.entries(crudo as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    if (!Array.isArray(ids)) continue;
    const buenos = ids.filter(
      (id): id is string => typeof id === "string" && (esHabito(id) || esHabitoPropio(id)),
    );
    if (buenos.length > 0) limpio[fecha.slice(0, 10)] = [...new Set(buenos)];
  }
  return limpio;
}

export function limpiarEntrenos(crudo: unknown): Record<string, string[]> {
  const limpio: Record<string, string[]> = {};
  if (!crudo || typeof crudo !== "object") return limpio;
  for (const [fecha, ids] of Object.entries(crudo as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    if (!Array.isArray(ids)) continue;
    const buenos = ids.filter(
      (id): id is string => typeof id === "string" && id.length > 0 && id.length < 60,
    );
    if (buenos.length > 0) limpio[fecha.slice(0, 10)] = [...new Set(buenos)];
  }
  return limpio;
}

function limpiarPropios(crudo: unknown): HabitoPropio[] {
  if (!Array.isArray(crudo)) return [];
  const vistos = new Set<string>();
  const limpio: HabitoPropio[] = [];
  for (const uno of crudo) {
    if (!uno || typeof uno !== "object") continue;
    const { id, etiqueta } = uno as { id?: unknown; etiqueta?: unknown };
    if (typeof id !== "string" || !esHabitoPropio(id) || vistos.has(id)) continue;
    if (typeof etiqueta !== "string") continue;
    const nombre = etiqueta.trim();
    if (nombre.length < 1 || [...nombre].length > 30) continue;
    vistos.add(id);
    limpio.push({ id, etiqueta: nombre });
  }
  return limpio;
}

const CLAVE_PENDIENTE_NUBE = "mi-peso:pendiente-nube";

function leerMarcaPendienteNube(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(CLAVE_PENDIENTE_NUBE) === "1";
  } catch {
    return false;
  }
}

function guardarMarcaPendienteNube(activo: boolean): void {
  try {
    if (typeof window === "undefined") return;
    if (activo) window.localStorage.setItem(CLAVE_PENDIENTE_NUBE, "1");
    else window.localStorage.removeItem(CLAVE_PENDIENTE_NUBE);
  } catch {
    // modo privado o cuota llena
  }
}

function limpiarPesadasLocal(crudo: unknown): Pesada[] {
  if (!Array.isArray(crudo)) return [];
  const porFecha = new Map<string, Pesada>();
  for (const item of crudo) {
    if (!item || typeof item !== "object") continue;
    const { fecha, kg } = item as { fecha?: unknown; kg?: unknown };
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    if (typeof kg !== "number" || !Number.isFinite(kg) || kg < 30 || kg > 300) continue;
    const dia = fecha.slice(0, 10);
    porFecha.set(dia, { fecha: dia, kg: Math.round(kg * 100) / 100 });
  }
  return [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function limpiarAguaLocal(crudo: unknown): Record<string, number> {
  const limpio: Record<string, number> = {};
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return limpio;
  for (const [fecha, litros] of Object.entries(crudo as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    if (typeof litros !== "number" || !Number.isFinite(litros) || litros < 0 || litros > 15) {
      continue;
    }
    limpio[fecha.slice(0, 10)] = Math.round(litros * 100) / 100;
  }
  return limpio;
}

function limpiarGustosLocal(crudo: unknown): Record<string, Gusto> {
  const limpio: Record<string, Gusto> = {};
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return limpio;
  for (const [ingrediente, valor] of Object.entries(crudo as Record<string, unknown>)) {
    if (ingrediente.trim() === "") continue;
    if (valor === "me-gusta" || valor === "no-me-gusta") limpio[ingrediente] = valor;
  }
  return limpio;
}

function limpiarSalud(crudo: unknown): Record<string, { pasos?: number; suenoHoras?: number }> {
  const limpio: Record<string, { pasos?: number; suenoHoras?: number }> = {};
  if (!crudo || typeof crudo !== "object") return limpio;
  for (const [fecha, bruto] of Object.entries(crudo as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    if (!bruto || typeof bruto !== "object") continue;
    const { pasos, suenoHoras } = bruto as { pasos?: unknown; suenoHoras?: unknown };
    const dia: { pasos?: number; suenoHoras?: number } = {};
    if (typeof pasos === "number" && Number.isFinite(pasos) && pasos >= 0 && pasos <= 100000) {
      dia.pasos = Math.round(pasos);
    }
    if (
      typeof suenoHoras === "number" &&
      Number.isFinite(suenoHoras) &&
      suenoHoras >= 0 &&
      suenoHoras <= 24
    ) {
      dia.suenoHoras = Math.round(suenoHoras * 100) / 100;
    }
    if (dia.pasos !== undefined || dia.suenoHoras !== undefined) limpio[fecha.slice(0, 10)] = dia;
  }
  return limpio;
}

function nuevoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export function DatosProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [listo, setListo] = useState(false);
  const [estadoNube, setEstadoNube] = useState<EstadoNube>("desconocido");
  const [codigoNube, setCodigoNube] = useState("");
  // Si la nube no existe, no se vuelve a preguntar en cada cambio.
  const sinNube = useRef(false);
  // Indica si el cambio de `datos` proviene de una acción del usuario (o de datos
  // locales más nuevos que la nube) que requiere hacer POST /api/nube.
  const pendienteSubirRef = useRef(false);
  // Mutex para evitar que dos subidas compitan entre sí en paralelo
  const subiendoRef = useRef(false);
  // Contador de versión local para saber si entraron cambios mientras subíamos
  const versionLocalRef = useRef(0);
  // Contador de reintentos fallidos para aplicar backoff exponencial
  const intentosFallidosRef = useRef(0);
  // Última foto confirmada por el servidor, usada para calcular subidas diferenciales.
  const baseNubeRef = useRef<Datos | null>(null);
  // Época de cuenta: invalida respuestas en vuelo tras borrar o reclamar otra cuenta.
  const epocaCuentaRef = useRef(0);
  // Ciclo de vida real del proveedor (no se cancela en cada render de `datos`).
  const montadoRef = useRef(true);
  // Temporizador único de subida (debounce, seguimiento tras vuelo o reintento).
  const relojSubidaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Referencia siempre fresca a los últimos datos para flush al cerrar/minimizar.
  const datosRef = useRef<Datos>(VACIO);
  useEffect(() => {
    datosRef.current = datos;
  }, [datos]);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      if (relojSubidaRef.current !== null) {
        clearTimeout(relojSubidaRef.current);
        relojSubidaRef.current = null;
      }
    };
  }, []);

  const marcarPendienteSubir = useCallback((activo: boolean) => {
    pendienteSubirRef.current = activo;
    guardarMarcaPendienteNube(activo);
  }, []);

  const limpiarRelojSubida = useCallback(() => {
    if (relojSubidaRef.current !== null) {
      clearTimeout(relojSubidaRef.current);
      relojSubidaRef.current = null;
    }
  }, []);

  // Motor de subida desacoplado de los renders de `datos`: si una subida en 4G
  // tarda más de 1 segundo y el usuario toca otra cosa mientras vuela, no se
  // pierde el seguimiento ni se queda bloqueada `pendienteSubirRef`.
  const ejecutarSubida = useCallback(
    async (alOcultar = false) => {
      if (!montadoRef.current || sinNube.current || subiendoRef.current) return;
      const instantanea = datosRef.current;
      if (!instantanea.perfil || !pendienteSubirRef.current) return;

      limpiarRelojSubida();
      subiendoRef.current = true;
      const versionAlEmpezar = versionLocalRef.current;
      const epocaAlEmpezar = epocaCuentaRef.current;

      try {
        const r = await subirNube(instantanea, {
          base: baseNubeRef.current,
          alOcultar,
        });
        if (!montadoRef.current || epocaAlEmpezar !== epocaCuentaRef.current) return;

        if (r.sinConfigurar) {
          sinNube.current = true;
          setEstadoNube("sin-nube");
          marcarPendienteSubir(false);
          return;
        }
        if (r.hay) {
          baseNubeRef.current = instantanea;
          intentosFallidosRef.current = 0;
          setEstadoNube("guardado");
          if (r.codigo) {
            guardarCodigo(r.codigo);
            setCodigoNube(r.codigo);
          }
          if (versionLocalRef.current === versionAlEmpezar) {
            marcarPendienteSubir(false);
          } else {
            // Entraron cambios nuevos mientras la petición volaba: subir el diferencial restante.
            relojSubidaRef.current = setTimeout(() => {
              relojSubidaRef.current = null;
              void ejecutarSubida();
            }, 300);
          }
        } else if (r.permanente) {
          // 413 u otro rechazo definitivo: no insistir en bucle hasta el próximo cambio.
          marcarPendienteSubir(false);
          setEstadoNube("error");
        } else {
          marcarPendienteSubir(true);
          setEstadoNube("sin-conexion");
          const espera = Math.min(5000 * Math.pow(1.5, intentosFallidosRef.current), 300000);
          intentosFallidosRef.current += 1;
          relojSubidaRef.current = setTimeout(() => {
            relojSubidaRef.current = null;
            void ejecutarSubida();
          }, espera);
        }
      } finally {
        subiendoRef.current = false;
      }
    },
    [limpiarRelojSubida, marcarPendienteSubir],
  );

  const programarSubida = useCallback(
    (ms = 1000) => {
      if (sinNube.current) return;
      limpiarRelojSubida();
      relojSubidaRef.current = setTimeout(() => {
        relojSubidaRef.current = null;
        void ejecutarSubida();
      }, ms);
    },
    [ejecutarSubida, limpiarRelojSubida],
  );

  /** Aplica una mutación del usuario marcando que debe subirse a la nube si cambió algo. */
  const mutarDatos = useCallback(
    (actualizador: (prev: Datos) => Datos) => {
      setDatos((prev) => {
        const siguiente = actualizador(prev);
        if (siguiente === prev) return prev;
        datosRef.current = siguiente;
        versionLocalRef.current += 1;
        marcarPendienteSubir(true);
        return siguiente;
      });
    },
    [marcarPendienteSubir],
  );

  // Al abrir: leer lo que haya guardado en este móvil y mirar siempre en la
  // nube por si hay algo más. Lo que baja se fusiona con lo del móvil.
  useEffect(() => {
    let cancelado = false;

    async function abrir() {
      let leido: Partial<Datos> | null = null;
      try {
        const crudo = window.localStorage.getItem(CLAVE);
        if (crudo) leido = JSON.parse(crudo) as Partial<Datos>;
      } catch {
        // Si lo guardado está corrupto, se empieza de cero sin avisar.
      }

      const metaLeida = leido?.metaAguaL;
      const base: Datos = {
        perfil: leido?.perfil
          ? { ...leido.perfil, habitosPropios: limpiarPropios(leido.perfil.habitosPropios) }
          : null,
        pesadas: limpiarPesadasLocal(leido?.pesadas),
        comidas: limpiarComidas(leido?.comidas),
        aguaLitros: limpiarAguaLocal(leido?.aguaLitros),
        metaAguaL:
          typeof metaLeida === "number" &&
          Number.isFinite(metaLeida) &&
          metaLeida >= 0.5 &&
          metaLeida <= 10
            ? Math.round(metaLeida * 100) / 100
            : 2,
        gustos: limpiarGustosLocal(leido?.gustos),
        caprichos: Array.isArray(leido?.caprichos)
          ? leido.caprichos
              .filter((f): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}/.test(f))
              .map((f) => f.slice(0, 10))
          : [],
        habitosHechos: limpiarHabitos(leido?.habitosHechos),
        entrenosHechos: limpiarEntrenos(leido?.entrenosHechos),
        saludDiaria: limpiarSalud(leido?.saludDiaria),
        mensajesIsaac: Array.isArray(leido?.mensajesIsaac) ? leido.mensajesIsaac : [],
        borrados: fusionarBorrados(Array.isArray(leido?.borrados) ? leido.borrados : [], []),
      };
      const teniaPendiente = leerMarcaPendienteNube();
      if (teniaPendiente) pendienteSubirRef.current = true;
      if (cancelado) return;
      setDatos(base);
      setCodigoNube(leerCodigo());
      setListo(true);

      const epocaInicial = epocaCuentaRef.current;
      const bajado = await bajarNube();
      if (cancelado || epocaInicial !== epocaCuentaRef.current) return;
      if (bajado.sinConfigurar) {
        sinNube.current = true;
        setEstadoNube("sin-nube");
        return;
      }
      if (bajado.hay && bajado.datos) {
        const desdeLaNube = bajado.datos;
        baseNubeRef.current = desdeLaNube;
        let requiereSubida = false;
        setDatos((d) => {
          // Si este móvil ya había sincronizado todo antes de cerrarse, cualquier
          // lápida local que ya no esté en la nube mientras su dato volvió a nacer
          // (p. ej. vía Atajo o segundo móvil) quedó superada y no debe matarlo.
          const localBase = pendienteSubirRef.current
            ? d
            : limpiarLapidasSuperadas(d, desdeLaNube);
          const fusionado = fusionar(localBase, desdeLaNube);
          const jsonLocal = JSON.stringify(d);
          const jsonNube = JSON.stringify(desdeLaNube);
          const jsonFusion = JSON.stringify(fusionado);
          if (jsonFusion !== jsonNube) {
            marcarPendienteSubir(true);
            requiereSubida = true;
          } else {
            marcarPendienteSubir(false);
          }
          return jsonFusion === jsonLocal ? d : fusionado;
        });
        if (bajado.codigo) {
          guardarCodigo(bajado.codigo);
          setCodigoNube(bajado.codigo);
        }
        setEstadoNube("guardado");
        if (requiereSubida) programarSubida(1000);
      } else {
        // Solo creamos copia inicial si la nube confirmó que aún no existe ficha
        // (`!bajado.motivo`) o si quedaron cambios sin subir de una sesión offline.
        if (base.perfil && (!bajado.motivo || pendienteSubirRef.current)) {
          marcarPendienteSubir(true);
          programarSubida(1000);
        }
        setEstadoNube(bajado.motivo ? "sin-conexion" : "guardado");
      }
    }

    void abrir();
    return () => {
      cancelado = true;
    };
  }, [marcarPendienteSubir, programarSubida]);

  // Al volver a la app o recuperar cobertura, sincroniza con la nube:
  // si hay cambios pendientes los empuja de inmediato; si no, descarga novedades.
  useEffect(() => {
    if (!listo) return;
    function bajarSiLimpio() {
      if (pendienteSubirRef.current || subiendoRef.current || sinNube.current) return;
      const epocaActual = epocaCuentaRef.current;
      void bajarNube().then((bajado) => {
        if (
          !montadoRef.current ||
          epocaActual !== epocaCuentaRef.current ||
          pendienteSubirRef.current ||
          subiendoRef.current
        ) {
          return;
        }
        if (bajado.hay && bajado.datos) {
          baseNubeRef.current = bajado.datos;
          setDatos((d) => {
            const localLimpio = limpiarLapidasSuperadas(d, bajado.datos!);
            const fusionado = fusionar(localLimpio, bajado.datos!);
            return JSON.stringify(fusionado) === JSON.stringify(d) ? d : fusionado;
          });
          setEstadoNube("guardado");
        }
      });
    }
    function alCambiarVisibilidad() {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        if (pendienteSubirRef.current) {
          void ejecutarSubida(true);
        }
      } else if (document.visibilityState === "visible") {
        if (pendienteSubirRef.current) {
          programarSubida(300);
        } else {
          bajarSiLimpio();
        }
      }
    }
    function alEnfocar() {
      if (pendienteSubirRef.current) return;
      bajarSiLimpio();
    }
    function alVolverRed() {
      intentosFallidosRef.current = 0;
      if (pendienteSubirRef.current) {
        void ejecutarSubida();
      } else {
        bajarSiLimpio();
      }
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("focus", alEnfocar);
    window.addEventListener("online", alVolverRed);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("focus", alEnfocar);
      window.removeEventListener("online", alVolverRed);
    };
  }, [ejecutarSubida, listo, programarSubida]);

  // Cada cambio se guarda en localStorage tras pintar el frame.
  useEffect(() => {
    if (!listo) return;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch {
      // Sin espacio o modo privado: la app sigue funcionando en memoria.
    }
  }, [datos, listo]);

  // Agrupa rachas de toques del usuario en una ventana de 1 segundo antes de subir.
  useEffect(() => {
    if (!listo || sinNube.current) return;
    if (!datos.perfil || !pendienteSubirRef.current) return;
    if (subiendoRef.current) return;
    programarSubida(1000);
  }, [datos, listo, programarSubida]);

  /** Enlazar este móvil con una persona que ya tenía datos, con su código. */
  const recuperar = useCallback(
    async (codigo: string) => {
      epocaCuentaRef.current += 1;
      limpiarRelojSubida();
      const r = await reclamarNube(codigo);
      if (r.sinConfigurar) {
        sinNube.current = true;
        setEstadoNube("sin-nube");
        return false;
      }
      if (!r.hay || !r.datos) return false;
      const desdeLaNube = r.datos;
      baseNubeRef.current = desdeLaNube;
      versionLocalRef.current += 1;
      marcarPendienteSubir(true);
      setDatos((d) => fusionar(d, desdeLaNube, true));
      if (r.codigo) {
        guardarCodigo(r.codigo);
        setCodigoNube(r.codigo);
      }
      setEstadoNube("guardado");
      programarSubida(1000);
      return true;
    },
    [limpiarRelojSubida, marcarPendienteSubir, programarSubida],
  );

  const guardarPerfil = useCallback(
    (perfil: Perfil) => {
      mutarDatos((d) => ({
        ...d,
        perfil,
        pesadas:
          d.pesadas.length > 0 ? d.pesadas : [{ fecha: hoyISO(), kg: perfil.pesoInicialKg }],
      }));
    },
    [mutarDatos],
  );

  const anadirPesada = useCallback(
    (pesada: Pesada) => {
      if (!Number.isFinite(pesada.kg) || pesada.kg < 30 || pesada.kg > 300) return;
      const limpia: Pesada = {
        fecha: pesada.fecha.slice(0, 10),
        kg: Math.round(pesada.kg * 100) / 100,
      };
      mutarDatos((d) => ({
        ...d,
        pesadas: [...d.pesadas.filter((p) => p.fecha !== limpia.fecha), limpia].sort((a, b) =>
          a.fecha.localeCompare(b.fecha),
        ),
        // Volver a apuntar una pesada borrada retira su lápida; si no, la
        // fusión con la nube la volvería a borrar.
        borrados: quitarBorrado(d.borrados, "pesada", limpia.fecha),
      }));
    },
    [mutarDatos],
  );

  const borrarPesada = useCallback(
    (fecha: string) => {
      mutarDatos((d) =>
        d.pesadas.length <= 1
          ? d
          : {
              ...d,
              pesadas: d.pesadas.filter((p) => p.fecha !== fecha),
              borrados: [
                ...(d.borrados ?? []),
                { tipo: "pesada" as const, clave: fecha, borradoEn: new Date().toISOString() },
              ].slice(-100),
            },
      );
    },
    [mutarDatos],
  );

  const canjearCapricho = useCallback(
    (fecha: string) => {
      mutarDatos((d) =>
        d.caprichos.includes(fecha) ? d : { ...d, caprichos: [...d.caprichos, fecha] },
      );
    },
    [mutarDatos],
  );

  const anadirComida = useCallback(
    (comida: Omit<Comida, "id">) => {
      mutarDatos((d) => ({ ...d, comidas: [...d.comidas, { ...comida, id: nuevoId() }] }));
    },
    [mutarDatos],
  );

  const borrarComida = useCallback(
    (id: string) => {
      mutarDatos((d) => ({
        ...d,
        comidas: d.comidas.filter((c) => c.id !== id),
        borrados: [
          ...(d.borrados ?? []),
          { tipo: "comida" as const, clave: id, borradoEn: new Date().toISOString() },
        ].slice(-100),
      }));
    },
    [mutarDatos],
  );

  const borrarAlimento = useCallback(
    (comidaId: string, alimentoId: string) => {
      mutarDatos((d) => {
        const nuevasComidas = d.comidas
          .map((c) =>
            c.id === comidaId
              ? { ...c, alimentos: c.alimentos.filter((a) => a.id !== alimentoId) }
              : c,
          )
          .filter((c) => c.alimentos.length > 0);
        const quedoVacia = !nuevasComidas.some((c) => c.id === comidaId);
        return {
          ...d,
          comidas: nuevasComidas,
          ...(quedoVacia
            ? {
                borrados: [
                  ...(d.borrados ?? []),
                  { tipo: "comida" as const, clave: comidaId, borradoEn: new Date().toISOString() },
                ].slice(-100),
              }
            : {}),
        };
      });
    },
    [mutarDatos],
  );

  const editarAlimento = useCallback(
    (comidaId: string, alimentoId: string, cantidad: string): boolean => {
      let hecho = false;
      mutarDatos((d) => ({
        ...d,
        comidas: d.comidas.map((c) => {
          if (c.id !== comidaId) return c;
          return {
            ...c,
            alimentos: c.alimentos.map((a) => {
              if (a.id !== alimentoId) return a;
              const escalado = escalarAlimento(a, cantidad);
              if (!escalado) return a;
              hecho = true;
              return escalado;
            }),
          };
        }),
      }));
      return hecho;
    },
    [mutarDatos],
  );

  const ajustarSobrasAlimento = useCallback(
    (comidaId: string, alimentoId: string, fraccion: number) => {
      mutarDatos((d) => ({
        ...d,
        comidas: d.comidas.map((c) => {
          if (c.id !== comidaId) return c;
          return {
            ...c,
            alimentos: c.alimentos.map((a) => {
              if (a.id !== alimentoId) return a;
              return escalarPorFraccion(a, fraccion);
            }),
          };
        }),
      }));
    },
    [mutarDatos],
  );

  const renombrarAlimento = useCallback(
    (comidaId: string, alimentoId: string, nombre: string) => {
      const limpio = nombre.trim();
      if (!limpio) return;
      mutarDatos((d) => ({
        ...d,
        comidas: d.comidas.map((c) =>
          c.id === comidaId
            ? {
                ...c,
                alimentos: c.alimentos.map((a) =>
                  a.id === alimentoId ? { ...a, nombre: limpio } : a,
                ),
              }
            : c,
        ),
      }));
    },
    [mutarDatos],
  );

  const ponerAgua = useCallback(
    (fecha: string, litros: number) => {
      if (!Number.isFinite(litros)) return;
      const redondeado = Math.round(Math.min(15, Math.max(0, litros)) * 100) / 100;
      mutarDatos((d) => ({ ...d, aguaLitros: { ...d.aguaLitros, [fecha]: redondeado } }));
    },
    [mutarDatos],
  );

  const ponerMetaAgua = useCallback(
    (litros: number) => {
      if (!Number.isFinite(litros)) return;
      const redondeado = Math.round(Math.min(10, Math.max(0.5, litros)) * 100) / 100;
      mutarDatos((d) => ({ ...d, metaAguaL: redondeado }));
    },
    [mutarDatos],
  );

  const marcarGusto = useCallback(
    (plato: string, gusto: Gusto) => {
      mutarDatos((d) => {
        const gustos = { ...d.gustos };
        let borrados = d.borrados ?? [];
        if (gustos[plato] === gusto) {
          delete gustos[plato];
          borrados = [
            ...borrados,
            { tipo: "gusto" as const, clave: plato, borradoEn: new Date().toISOString() },
          ].slice(-100);
        } else {
          gustos[plato] = gusto;
          // Volver a valorar el plato retira la lápida del gusto borrado.
          borrados = quitarBorrado(borrados, "gusto", plato) ?? [];
        }
        return { ...d, gustos, borrados };
      });
    },
    [mutarDatos],
  );

  const alternarHabito = useCallback(
    (fecha: string, id: string) => {
      mutarDatos((d) => {
        const delDia = d.habitosHechos?.[fecha] ?? [];
        const nuevos = delDia.includes(id) ? delDia.filter((x) => x !== id) : [...delDia, id];
        const habitosHechos = { ...d.habitosHechos };
        if (nuevos.length === 0) delete habitosHechos[fecha];
        else habitosHechos[fecha] = nuevos;
        return { ...d, habitosHechos };
      });
    },
    [mutarDatos],
  );

  const alternarEjercicio = useCallback(
    (fecha: string, id: string) => {
      mutarDatos((d) => {
        const delDia = d.entrenosHechos?.[fecha] ?? [];
        const nuevos = delDia.includes(id) ? delDia.filter((x) => x !== id) : [...delDia, id];
        const entrenosHechos = { ...d.entrenosHechos };
        if (nuevos.length === 0) delete entrenosHechos[fecha];
        else entrenosHechos[fecha] = nuevos;
        return { ...d, entrenosHechos };
      });
    },
    [mutarDatos],
  );

  const marcarTodosEjercicios = useCallback(
    (fecha: string, ids: string[]) => {
      mutarDatos((d) => {
        const entrenosHechos = { ...d.entrenosHechos };
        const limpios = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
        if (limpios.length === 0) delete entrenosHechos[fecha];
        else entrenosHechos[fecha] = limpios;
        return { ...d, entrenosHechos };
      });
    },
    [mutarDatos],
  );

  const ponerSalud = useCallback(
    (fecha: string, valores: { pasos?: number; suenoHoras?: number }) => {
      const entrantes: { pasos?: number; suenoHoras?: number } = {};
      if (
        typeof valores.pasos === "number" &&
        Number.isFinite(valores.pasos) &&
        valores.pasos >= 0 &&
        valores.pasos <= 100000
      ) {
        entrantes.pasos = Math.round(valores.pasos);
      }
      if (
        typeof valores.suenoHoras === "number" &&
        Number.isFinite(valores.suenoHoras) &&
        valores.suenoHoras >= 0 &&
        valores.suenoHoras <= 24
      ) {
        entrantes.suenoHoras = Math.round(valores.suenoHoras * 100) / 100;
      }
      if (entrantes.pasos === undefined && entrantes.suenoHoras === undefined) return;

      const diaClave = fecha.slice(0, 10);
      mutarDatos((d) => {
        const saludDiaria = { ...d.saludDiaria };
        const dia = { ...(saludDiaria[diaClave] ?? {}), ...entrantes };
        if (dia.pasos === undefined && dia.suenoHoras === undefined) delete saludDiaria[diaClave];
        else saludDiaria[diaClave] = dia;
        return {
          ...d,
          saludDiaria,
          borrados: quitarBorrado(d.borrados, "salud", diaClave),
        };
      });
    },
    [mutarDatos],
  );

  const ponerSaludLote = useCallback(
    (lote: Record<string, { pasos?: number; suenoHoras?: number }>) => {
      if (!lote || Object.keys(lote).length === 0) return;
      mutarDatos((d) => {
        const vaciados = new Set(
          (d.borrados ?? []).filter((b) => b.tipo === "salud").map((b) => b.clave),
        );
        const filtrado: Record<string, { pasos?: number; suenoHoras?: number }> = {};
        for (const [fecha, valores] of Object.entries(lote)) {
          const dia = fecha.slice(0, 10);
          if (!vaciados.has(dia)) filtrado[dia] = valores;
        }
        if (Object.keys(filtrado).length === 0) return d;
        const fusionada = fusionarSalud(d.saludDiaria, filtrado);
        if (JSON.stringify(fusionada) === JSON.stringify(d.saludDiaria ?? {})) return d;
        return { ...d, saludDiaria: fusionada };
      });
    },
    [mutarDatos],
  );

  const quitarSalud = useCallback(
    (fecha: string) => {
      const diaClave = fecha.slice(0, 10);
      mutarDatos((d) => {
        const salud = d.saludDiaria ?? {};
        if (salud[diaClave] === undefined) return d;
        const saludDiaria = { ...salud };
        delete saludDiaria[diaClave];
        return {
          ...d,
          saludDiaria,
          borrados: [
            ...(d.borrados ?? []).filter((b) => !(b.tipo === "salud" && b.clave === diaClave)),
            { tipo: "salud" as const, clave: diaClave, borradoEn: new Date().toISOString() },
          ].slice(-100),
        };
      });
    },
    [mutarDatos],
  );

  const marcarMensajeIsaacLeido = useCallback(
    (id: string) => {
      mutarDatos((prev) => {
        const actuales = prev.mensajesIsaac ?? [];
        const actualizados = actuales.map((m) => (m.id === id ? { ...m, leido: true } : m));
        return { ...prev, mensajesIsaac: actualizados };
      });
    },
    [mutarDatos],
  );

  const actualizarCicloMenstrual = useCallback(
    (parcial: Partial<DatosCiclo>) => {
      mutarDatos((d) => {
        if (!d.perfil) return d;
        const baseCiclo: DatosCiclo = d.perfil.cicloMenstrual ?? cicloPorDefecto(hoyISO());
        const cicloActualizado: DatosCiclo = {
          ...baseCiclo,
          ...parcial,
        };
        return {
          ...d,
          perfil: {
            ...d.perfil,
            cicloMenstrual: cicloActualizado,
          },
        };
      });
    },
    [mutarDatos],
  );

  const eliminarCuenta = useCallback(async (): Promise<string | null> => {
    epocaCuentaRef.current += 1;
    limpiarRelojSubida();
    const r = await borrarCuentaNube();
    if (!r.hay && !r.sinConfigurar) {
      if (pendienteSubirRef.current) programarSubida(1500);
      return r.motivo ?? "No se ha podido borrar la cuenta de la nube. Inténtalo de nuevo.";
    }
    marcarPendienteSubir(false);
    baseNubeRef.current = null;
    intentosFallidosRef.current = 0;
    void limpiarAvisosLocales();
    reiniciarDispositivo();
    setCodigoNube("");
    setDatos(VACIO);
    try {
      window.localStorage.removeItem(CLAVE);
      window.localStorage.removeItem(CLAVE_PENDIENTE_NUBE);
      window.localStorage.removeItem("mi-peso:grupo-familiar");
      window.localStorage.removeItem("mi-peso:grupos-sociales");
      window.localStorage.removeItem("mi-peso:grupo-activo-id");
      window.localStorage.removeItem("mi-peso:mi-avatar");
      window.localStorage.removeItem("mi-peso:miembro-id");
      window.localStorage.removeItem("mi-peso:reacciones-notificadas");
      window.localStorage.removeItem("mi-peso:compra-hogar");
      window.localStorage.removeItem("mi-peso:comprados");
      window.localStorage.removeItem("mi-peso:compra-extras");
      window.localStorage.removeItem("mi-peso:cambios-sueltos");
      window.localStorage.removeItem("mi-peso:alimentos-propios");
      window.localStorage.removeItem("mi-peso:codigos-propios");
      window.localStorage.removeItem("mi-peso:ver-macros-hoy");
    } catch {
      // nada que hacer
    }
    return null;
  }, [limpiarRelojSubida, marcarPendienteSubir, programarSubida]);

  const valorContexto = useMemo<Contexto>(
    () => ({
      ...datos,
      listo,
      estadoNube,
      codigoNube,
      recuperar,
      guardarPerfil,
      anadirPesada,
      borrarPesada,
      canjearCapricho,
      anadirComida,
      borrarComida,
      borrarAlimento,
      editarAlimento,
      ajustarSobrasAlimento,
      renombrarAlimento,
      ponerAgua,
      ponerMetaAgua,
      marcarGusto,
      alternarHabito,
      alternarEjercicio,
      marcarTodosEjercicios,
      ponerSalud,
      ponerSaludLote,
      quitarSalud,
      eliminarCuenta,
      marcarMensajeIsaacLeido,
      actualizarCicloMenstrual,
    }),
    [
      datos,
      listo,
      estadoNube,
      codigoNube,
      recuperar,
      guardarPerfil,
      anadirPesada,
      borrarPesada,
      canjearCapricho,
      anadirComida,
      borrarComida,
      borrarAlimento,
      editarAlimento,
      ajustarSobrasAlimento,
      renombrarAlimento,
      ponerAgua,
      ponerMetaAgua,
      marcarGusto,
      alternarHabito,
      alternarEjercicio,
      marcarTodosEjercicios,
      ponerSalud,
      ponerSaludLote,
      quitarSalud,
      eliminarCuenta,
      marcarMensajeIsaacLeido,
      actualizarCicloMenstrual,
    ],
  );

  return <Ctx.Provider value={valorContexto}>{children}</Ctx.Provider>;
}

export function useDatos(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDatos() necesita estar dentro de <DatosProvider>.");
  return ctx;
}

export { comidasDelDia, sumar } from "./comidas";
