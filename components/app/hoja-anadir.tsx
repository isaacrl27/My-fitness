"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";
import { Barcode, Camera, Check, Image as ImageIcon, Minus, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Button, IconButton, Spinner } from "@/components/ui/button";
import { SearchField, TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/controls";
import { TIPOS_COMIDA, useDatos, type TipoComida } from "@/lib/store";
import { buscar, porGramos, unidadDelAlimento, type AlimentoBase } from "@/lib/alimentos";
import { alimentoBaseDeIA, pedirFotoIA, pedirTextoIA, prepararImagenIA } from "@/lib/foto-cliente";
import { AtajosRacion } from "@/components/app/atajos-racion";
import { AvisoCrudoCocido, PanelAtajosComida } from "@/components/app/atajos-hoja-anadir";
import { TarjetaFotosPendientes } from "@/components/app/tarjeta-fotos-pendientes";

import {
  eliminarFotoPendiente,
  encolarFotoPendiente,
  listarFotosPendientes,
  type FotoPendiente,
} from "@/lib/cola-fotos-offline";

import { TOPE_FOTO } from "@/lib/ia-tope";

import dynamic from "next/dynamic";

const LectorCodigo = dynamic(

  () => import("@/components/app/lector-codigo").then((m) => m.LectorCodigo),
  { ssr: false },
);
import { hoyISO, enPalabras } from "@/lib/calculos";
import { sonidoExito } from "@/lib/sonido";
import { vibrarExito } from "@/lib/haptica";
import { useBloqueoModal } from "@/lib/use-modal";

import { ZONA_MUERTA_PX, debeCerrarAlSoltar, desplazamientoVisible } from "@/lib/arrastre-hoja";

type Elegido = { base: AlimentoBase; gramos: number };

/** El aviso de cuando se acaban las FOTOS del día (10). */

const AVISO_TOPE_FOTO =

  "Ya has usado tus 10 fotos con IA hoy. Mañana a las 00:00 se recargan solas; mientras tanto puedes usar el código de barras o el buscador.";

/** La clave del contador local de fotos: una por día, para no pisar las de ayer. */

function claveContador(): string {
  return `myfitness:ia:foto:${hoyISO()}`;

}

/**

 * Cuántas fotos sin código se han hecho hoy.
 *
 * El servidor solo cuenta cuando lleva el código de la nube; sin él, la
 * cuenta es del móvil y vive aquí.
 */
function leerContador(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(window.localStorage.getItem(claveContador()) ?? "0");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    // Sin localStorage (modo privado): se cuenta solo en memoria.
    return 0;
  }

}

/** Apunta una foto más en el contador local. Devuelve el total. */

function anotarContador(): number {
  const n = leerContador() + 1;
  try {
    const clave = claveContador();
    window.localStorage.setItem(clave, String(n));
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("myfitness:ia:foto:") && k !== clave) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    // Sin espacio o modo privado: el número se queda en memoria.
  }
  return n;

}

/** El aviso de cada clase de fallo, en llano. */

function avisoDeFallo(
  estado: number,
  tope: boolean,
  motivo?: string,
  esCapricho = false,
): string {
  if (motivo) return motivo;
  if (estado === 429 && tope) {
    return esCapricho
      ? "Ya has usado tus 10 fotos con IA hoy. Mañana se recargan solas; mientras tanto, escribe el nombre del capricho."
      : AVISO_TOPE_FOTO;
  }
  if (estado === 503) {
    return esCapricho
      ? "La IA no está disponible ahora mismo; escribe el nombre del capricho."
      : "La IA no está disponible ahora mismo; sigue con el buscador o el código de barras.";
  }
  return "La IA ha fallado: inténtalo otra vez.";

}

export function HojaAnadir({

  onCerrar,
  tipoInicial,
  esCapricho = false,
  fecha,
}: {
  onCerrar: () => void;
  tipoInicial?: TipoComida;
  /** El capricho de la tienda: se apunta aparte y no cuenta en el día. */
  esCapricho?: boolean;
  /** El día (ISO YYYY-MM-DD) en el que se anota la comida. Por defecto hoy. */
  fecha?: string;
}) {
  const { anadirComida, codigoNube, comidas } = useDatos();
  const fechaDestino = fecha ?? hoyISO();
  const esHoy = fechaDestino === hoyISO();
  const [metodo, setMetodo] = useState<"elegir" | "buscar" | "codigo">("elegir");
  const [consulta, setConsulta] = useState("");
  const [elegidos, setElegidos] = useState<Elegido[]>([]);
  // Lo que la IA de la foto está haciendo ahora mismo.
  const [cargando, setCargando] = useState<"" | "foto" | "texto">("");
  // Las fotos que quedan según el servidor (null: no ha contestado).
  const [restantesFotosServidor, setRestantesFotosServidor] = useState<number | null>(null);
  // Sin código de nube, la cuenta del día es del móvil: se lee al abrir la hoja.
  const [usadasFotosLocal, setUsadasFotosLocal] = useState(() => leerContador());
  const archivoCamara = useRef<HTMLInputElement | null>(null);
  const archivoGaleria = useRef<HTMLInputElement | null>(null);
  const objectUrlActivaRef = useRef<string | null>(null);

  const turnoFotoRef = useRef(0);

  const [fotoAnalizada, setFotoAnalizada] = useState<{
    previewUrl: string;
    preparada: { imagen: string; mime: string } | null;
    analizada: boolean;
    aportes: Array<{ nombre: string; gramos: number }>;
  } | null>(null);

  const [pistaFoto, setPistaFoto] = useState("");
  const [fotosPendientes, setFotosPendientes] = useState<FotoPendiente[]>([]);

  const [cargandoPendienteId, setCargandoPendienteId] = useState<string | null>(null);

  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  );

  // La parte que se desplaza (selector + opciones + resultados). Se vuelve al
  // principio al abrir y al cambiar de pantalla.
  const scrollHoja = useRef<HTMLDivElement | null>(null);
  // Si no me han dicho la comida, la deduzco de la hora (al abrir la hoja, en
  // el móvil). Se resuelve al crear el estado, no en un efecto.
  const [tipo, setTipo] = useState<TipoComida>(
    tipoInicial ??
      (() => {
        const h = new Date().getHours();
        return h < 11 ? "desayuno" : h < 16 ? "comida" : h < 21 ? "cena" : "snack";
      })(),
  );
  const [aviso, setAviso] = useState("");
  const [kcalPersonalizada, setKcalPersonalizada] = useState("180");
  const [mostrarCrearLibre, setMostrarCrearLibre] = useState(false);
  // El capricho no se pesa ni se escanea: si la foto no acierta, se escribe el
  // nombre y se guarda igual, aparte del día.

  const [nombreCapricho, setNombreCapricho] = useState("");

  // Al cerrar, la hoja SE BAJA primero (300 ms) y luego se desmonta: si se

  // desmontara al momento, la salida se vería sin animación.
  const [saliendo, setSaliendo] = useState(false);
  function cerrar() {
    if (saliendo) return;
    setSaliendo(true);

  }

  useBloqueoModal({ abierto: !saliendo, onCerrar: cerrar });

  // Arrastrar la hoja hacia abajo desde la barrita o la cabecera para cerrarla,

  // como una hoja del iPhone. Si no se llega al umbral, vuelve a su sitio.
  const [desplazY, setDesplazY] = useState(0);
  const [soltando, setSoltando] = useState(false);

  const arrastre = useRef<{ y0: number; t0: number; id: number; capturado: boolean } | null>(null);

  function empezarArrastre(e: React.PointerEvent<HTMLDivElement>) {

    if (saliendo) return;
    // Los botones (Volver, Cerrar) siguen siendo botones: no arrancan arrastre.
    if ((e.target as HTMLElement).closest("button")) return;
    arrastre.current = { y0: e.clientY, t0: performance.now(), id: e.pointerId, capturado: false };

  }

  function moverArrastre(e: React.PointerEvent<HTMLDivElement>) {

    const a = arrastre.current;
    if (!a || a.id !== e.pointerId) return;
    const dy = e.clientY - a.y0;
    if (!a.capturado) {
      if (Math.abs(dy) < ZONA_MUERTA_PX) return;
      a.capturado = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSoltando(false);
    }
    setDesplazY(desplazamientoVisible(dy));

  }

  function soltarArrastre(e: React.PointerEvent<HTMLDivElement>, cancelado = false) {

    const a = arrastre.current;
    arrastre.current = null;
    if (!a || !a.capturado) return;
    const dy = e.clientY - a.y0;
    if (!cancelado && debeCerrarAlSoltar(dy, performance.now() - a.t0)) {
      cerrar();
    } else {
      setSoltando(true);
      setDesplazY(0);
    }

  }

  // Cada pantalla de la hoja empieza arriba.

  useEffect(() => {
    scrollHoja.current?.scrollTo({ top: 0 });

  }, [metodo]);

  const resultados = useMemo(() => buscar(consulta), [consulta]);

  const raciones = elegidos.map((e) => porGramos(e.base, e.gramos));
  const totalKcal = raciones.reduce((s, r) => s + r.kcal, 0);
  // Con código de nube el número bueno es el que da el servidor; sin él, la
  // cuenta la lleva el móvil.
  const restantesFotos =
    codigoNube && restantesFotosServidor !== null
      ? restantesFotosServidor
      : Math.max(0, TOPE_FOTO - usadasFotosLocal);
  const topeFotos = restantesFotos <= 0;
  const avisoDeElegir =
    aviso ||
    (topeFotos
      ? esCapricho
        ? "Ya has usado tus 10 fotos con IA hoy. Mañana se recargan solas; mientras tanto, escribe el nombre del capricho."
        : AVISO_TOPE_FOTO

      : "");

  /**
   * Mete un lote de alimentos en los elegidos, restando antes los aportes de un
   * análisis previo de esa misma foto si se está recalculando con un detalle.
   */
  function juntar(
    nuevos: Elegido[],
    reemplazarAportes?: Array<{ nombre: string; gramos: number }>,
  ) {
    setElegidos((prev) => {
      const base = prev.map((p) => ({ ...p }));

      if (reemplazarAportes && reemplazarAportes.length > 0) {
        for (const previo of reemplazarAportes) {
          const idx = base.findIndex((p) => p.base.nombre === previo.nombre);
          if (idx < 0) continue;
          const restante = base[idx].gramos - previo.gramos;
          if (restante > 0) {
            base[idx] = { ...base[idx], gramos: restante };
          } else {
            base.splice(idx, 1);
          }
        }
      }

      // Si el alimento ya está en la lista, le sumo los gramos nuevos en vez
      // de descartarlos («200g de arroz» con arroz ya anotado → se suma).
      for (const nuevo of nuevos) {
        const ya = base.findIndex((p) => p.base.nombre === nuevo.base.nombre);
        if (ya < 0) {
          base.push(nuevo);
        } else if (Number.isFinite(nuevo.gramos) && nuevo.gramos > 0) {
          base[ya] = { ...base[ya], gramos: base[ya].gramos + nuevo.gramos };
        }
      }

      return base;
    });
  }

  /** Apunta una foto hecha: con código cuenta el servidor, sin él el móvil. */

  function contarConsulta(restantesDelServidor: number | null) {
    if (codigoNube && restantesDelServidor !== null) {
      // El número bueno es el del servidor, pero también se apunta en el
      // móvil: al cerrar y abrir la hoja, el servidor no vuelve a contestar,
      // y sin esto la app enseñaría otra vez «te quedan 10 fotos».
      const usadas = Math.max(0, TOPE_FOTO - restantesDelServidor);
      try {
        window.localStorage.setItem(claveContador(), String(usadas));
      } catch {
        // Sin espacio o modo privado: se queda solo en memoria.
      }
      setRestantesFotosServidor(restantesDelServidor);
      setUsadasFotosLocal(usadas);
      return;
    }
    setUsadasFotosLocal(anotarContador());

  }

  function revocarObjectUrlActiva() {
    if (objectUrlActivaRef.current) {
      URL.revokeObjectURL(objectUrlActivaRef.current);
      objectUrlActivaRef.current = null;
    }
  }

  // Limpiar cualquier objectURL viva solo al desmontar la hoja.
  useEffect(() => () => revocarObjectUrlActiva(), []);

  // Carga las fotos guardadas sin señal y reacciona al volver la cobertura.
  useEffect(() => {
    let activa = true;
    void listarFotosPendientes()
      .then((lista) => {
        if (activa) setFotosPendientes(lista);
      })
      .catch(() => {});

    function alVolverRed() {
      setEnLinea(true);
    }
    function alPerderRed() {
      setEnLinea(false);
    }
    window.addEventListener("online", alVolverRed);
    window.addEventListener("offline", alPerderRed);
    return () => {
      activa = false;
      window.removeEventListener("online", alVolverRed);
      window.removeEventListener("offline", alPerderRed);
    };
  }, []);

  function quitarFotoAnalizada() {
    turnoFotoRef.current += 1;
    revocarObjectUrlActiva();
    setFotoAnalizada(null);
    setPistaFoto("");
  }

  async function ejecutarAnalisisFoto(
    preparada: { imagen: string; mime: string },
    turno: number,
    comentario: string,
    aportesPrevios: Array<{ nombre: string; gramos: number }>,
    enColaId?: string,
  ) {
    const r = await pedirFotoIA({
      imagen: preparada.imagen,
      mime: preparada.mime,
      ...(comentario ? { comentario } : {}),
      ...(codigoNube ? { codigo: codigoNube } : {}),
    });

    if (turnoFotoRef.current !== turno) return;

    if (!r.ok) {
      if (r.estado === 0 && !enColaId) {
        try {
          await encolarFotoPendiente({
            imagen: preparada.imagen,
            mime: preparada.mime,
            comentario,
            tipo,
            fecha: fechaDestino,
            esCapricho,
          });
          setFotosPendientes(await listarFotosPendientes());
          setAviso(
            "Sin cobertura ahora mismo: hemos guardado la foto en tu móvil para analizarla cuando vuelva la señal.",
          );
          setFotoAnalizada((prev) => (prev ? { ...prev, analizada: true } : prev));
          return;
        } catch {
          // Si fallara IndexedDB y localStorage, caer al aviso estándar.
        }
      }
      setAviso(avisoDeFallo(r.estado, r.tope, r.motivo, esCapricho));
      setFotoAnalizada((prev) => (prev ? { ...prev, analizada: true } : prev));
      return;
    }

    if (enColaId) {
      await eliminarFotoPendiente(enColaId);
      setFotosPendientes(await listarFotosPendientes());
    }

    contarConsulta(r.restantes);

    if (r.alimentos.length === 0) {
      setAviso("No he visto comida en esa foto. Escribe abajo qué es para recalcularlo o prueba otra.");
      setFotoAnalizada((prev) => (prev ? { ...prev, analizada: true } : prev));
      return;
    }

    // Se respetan los números que calculó la IA para TU descripción
    // («sin aceite», «desnatada», «en crudo»): antes se pisaban con la
    // ficha genérica del catálogo si el nombre coincidía.
    const lotes = r.alimentos.map((a) => ({ base: alimentoBaseDeIA(a), gramos: Math.round(a.gramos) }));
    const nuevosAportes = lotes.map((l) => ({ nombre: l.base.nombre, gramos: l.gramos }));
    juntar(lotes, aportesPrevios);
    setFotoAnalizada((prev) =>
      prev ? { ...prev, analizada: true, aportes: nuevosAportes } : prev,
    );
  }

  async function analizarPendienteAhora(item: FotoPendiente) {
    if (cargando !== "" || topeFotos) return;
    const turno = turnoFotoRef.current + 1;
    turnoFotoRef.current = turno;
    revocarObjectUrlActiva();

    const preview =
      item.mime === "image/jpeg" ? `data:image/jpeg;base64,${item.imagen}` : "";
    const preparada = { imagen: item.imagen, mime: item.mime };
    setAviso("");
    setCargando("foto");
    setCargandoPendienteId(item.id);
    setPistaFoto(item.comentario);
    setFotoAnalizada({
      previewUrl: preview,
      preparada,
      analizada: false,
      aportes: [],
    });

    try {
      await ejecutarAnalisisFoto(preparada, turno, item.comentario, [], item.id);
    } catch {
      if (turnoFotoRef.current === turno) {
        setAviso("No he podido analizar la foto guardada. Inténtalo otra vez.");
      }
    } finally {
      if (turnoFotoRef.current === turno) {
        setCargando("");
        setCargandoPendienteId(null);
      }
    }
  }

  async function descartarFotoPendiente(id: string) {
    await eliminarFotoPendiente(id);
    setFotosPendientes(await listarFotosPendientes());
  }

  /**
   * Analiza la foto en cuanto sale de la cámara o de la galería (1 toque):
   * comprime en ligero (~1024 px JPEG), libera la foto cruda de memoria y
   * deja los detalles opcionales para ajustar después sin frenar.
   */
  async function seleccionarFoto(archivo?: File) {
    if (!archivo || cargando !== "" || topeFotos) return;

    const turno = turnoFotoRef.current + 1;
    turnoFotoRef.current = turno;
    revocarObjectUrlActiva();

    const objectUrl = URL.createObjectURL(archivo);
    objectUrlActivaRef.current = objectUrl;

    setAviso("");
    setPistaFoto("");
    setCargando("foto");
    setFotoAnalizada({
      previewUrl: objectUrl,
      preparada: null,
      analizada: false,
      aportes: [],
    });

    try {
      const preparada = await prepararImagenIA(archivo, { modo: "plato" });
      if (turnoFotoRef.current !== turno) return;

      // Si ya se convirtió a JPEG ligero (~150 KB), usamos esa miniatura y
      // soltamos el blob original de 48 MP de la memoria del iPhone al momento.
      const previewLigera =
        preparada.mime === "image/jpeg"
          ? `data:image/jpeg;base64,${preparada.imagen}`
          : objectUrl;
      if (previewLigera !== objectUrl) {
        revocarObjectUrlActiva();
      }

      setFotoAnalizada({
        previewUrl: previewLigera,
        preparada,
        analizada: false,
        aportes: [],
      });

      await ejecutarAnalisisFoto(preparada, turno, "", []);
    } catch {
      if (turnoFotoRef.current === turno) {
        setAviso("No he podido leer esa foto. Prueba con otra.");
        setFotoAnalizada((prev) => (prev ? { ...prev, analizada: true } : prev));
      }
    } finally {
      if (turnoFotoRef.current === turno) {
        setCargando("");
      }
    }
  }

  /** Recalcula la misma foto ya comprimida con una aclaración opcional del usuario. */
  async function recalcularFotoAnalizada() {
    if (!fotoAnalizada?.preparada || cargando !== "" || topeFotos) return;
    const turno = turnoFotoRef.current + 1;
    turnoFotoRef.current = turno;
    const preparada = fotoAnalizada.preparada;
    const aportesPrevios = fotoAnalizada.aportes;
    const comentario = pistaFoto.trim();

    setCargando("foto");
    setAviso("");
    try {
      await ejecutarAnalisisFoto(preparada, turno, comentario, aportesPrevios);
    } catch {
      if (turnoFotoRef.current === turno) {
        setAviso("No he podido recalcular esa foto. Inténtalo otra vez.");
      }
    } finally {
      if (turnoFotoRef.current === turno) {
        setCargando("");
      }
    }
  }

  /**

   * Lo escrito en el buscador que no está en la lista se calcula con la IA de
   * texto («2 tostadas con aceite», «150g de lentejas»). Solo aparece cuando
   * la búsqueda no encuentra nada: así la pantalla principal no gana botones.
   */
  async function calcularConIA() {
    const frase = consulta.trim();
    if (frase.length < 3 || cargando !== "") return;
    setCargando("texto");
    setAviso("");
    try {
      const r = await pedirTextoIA({ texto: frase, ...(codigoNube ? { codigo: codigoNube } : {}) });
      if (!r.ok) {
        setAviso(
          r.motivo ??
            (r.estado === 429 && r.tope
              ? "Ya has usado las consultas de texto con IA de hoy. Mañana se recargan solas."
              : "La IA no ha podido calcularlo ahora mismo: añádelo como comida libre."),
        );
        return;
      }
      if (r.alimentos.length === 0) {
        setAviso("No he entendido qué comida es. Prueba a escribirlo de otra forma.");
        return;
      }
      juntar(r.alimentos.map((a) => ({ base: alimentoBaseDeIA(a), gramos: Math.round(a.gramos) })));
      setConsulta("");
    } finally {
      setCargando("");
    }

  }

  function anadir(base: AlimentoBase) {

    setElegidos((prev) => {
      const ya = prev.findIndex((e) => e.base.nombre === base.nombre);
      if (ya >= 0) {
        const copia = [...prev];
        copia[ya] = { ...copia[ya], gramos: copia[ya].gramos + base.gramos };
        return copia;
      }
      return [...prev, { base, gramos: base.gramos }];
    });
    setConsulta("");

  }

  function anadirPersonalizado(nombre: string, kcalEstimadas: number = 180) {

    const limpio = nombre.trim();
    if (!limpio) return;
    const base: AlimentoBase = {
      nombre: limpio,
      porcion: "1 ración",
      gramos: 100,
      kcal100: Math.max(1, Math.round(kcalEstimadas)),
      p100: Math.round((kcalEstimadas * 0.15) / 4),
      c100: Math.round((kcalEstimadas * 0.55) / 4),
      g100: Math.round((kcalEstimadas * 0.30) / 9),
      categoria: "Personalizados",
    };
    anadir(base);

  }

  function fijarGramos(nombre: string, gramos: number) {

    const limpios = Math.max(1, Math.min(3000, Math.round(gramos) || 1));
    setElegidos((prev) =>
      prev.map((e) => (e.base.nombre === nombre ? { ...e, gramos: limpios } : e)),
    );

  }

  function cambiarGramos(nombre: string, gramos: number, sentido: "subir" | "bajar") {

    // El paso lo decide la función según donde se esté: para abajo, de 5 en 5
    // cuando el trozo es pequeño (para no atascarse en 1) y de 10 en 10 a
    // partir de 10 gramos; para arriba, de 5 en 5 hasta llegar a 10 y de 10
    // en 10 desde ahí. Así no salen cantidades raras como 11 o 21.
    let nuevos: number;
    if (sentido === "bajar") {
      const paso = gramos > 10 ? 10 : 5;
      nuevos = Math.max(1, gramos - paso);
    } else {
      nuevos = gramos < 10 ? Math.min(10, gramos + 5) : gramos + 10;
    }
    setElegidos((prev) =>
      prev.map((e) => (e.base.nombre === nombre ? { ...e, gramos: nuevos } : e)),
    );

  }

  function guardar() {

    // El capricho también se puede apuntar sin foto: basta el nombre. Se guarda
    // con 0 kcal porque sus números no se enseñan ni cuentan en el día.
    if (esCapricho && raciones.length === 0) {
      const nombre = nombreCapricho.trim();
      if (!nombre) return;
      sonidoExito();
      vibrarExito();
      anadirComida({
        fecha: fechaDestino,
        tipo,
        alimentos: [
          {
            id: `${Date.now()}-0`,
            nombre,
            cantidad: "1 ración",
            kcal: 0,
            proteinas: 0,
            carbohidratos: 0,
            grasas: 0,
          },
        ],
        capricho: true,
      });
      cerrar();
      return;
    }
    if (raciones.length === 0) return;
    sonidoExito();
    vibrarExito();
    anadirComida({
      fecha: fechaDestino,
      tipo,
      alimentos: raciones.map((r, i) => ({ ...r, id: `${Date.now()}-${i}` })),
      ...(esCapricho ? { capricho: true } : {}),
    });
    cerrar();

  }

  const titulo =

    metodo === "elegir"
      ? esCapricho
        ? "Anotar capricho"
        : "Anotar comida"
      : metodo === "buscar"
        ? "Buscar alimento"

        : "Código de barras";

  // La hoja cuelga del body, fuera del armazón de la app. Dentro de .enruta

  // (que lleva una animación con transform) el `fixed` se coloca respecto a
  // esa pantalla larga y el principio queda por encima del viewport.

  if (typeof document === "undefined") return null;

  return createPortal(

    // role="dialog" + aria-modal: para lectores de pantalla es una ventana.
    // Y Escape cierra, como en cualquier hoja de fuera.
    <div
      className={[
        "fixed inset-0 z-50 flex h-dvh flex-col justify-end overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300",
        saliendo ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div
        className="mx-auto w-full max-w-[430px]"
        style={{
          transform: desplazY === 0 && !soltando ? undefined : `translateY(${desplazY}px)`,
          transition: soltando ? "transform .25s cubic-bezier(.2,.9,.2,1)" : "none",
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget) setSoltando(false);
        }}
      >
      <div
        className={[
          "flex h-[93dvh] w-full flex-col rounded-t-[28px] border-t border-border/80 bg-bg shadow-2xl overflow-hidden",
          saliendo ? "hoja-sale" : "hoja-entra",
        ].join(" ")}
        onAnimationEnd={(e) => {
          // Solo la animación de SALIDA del propio lienzo desmonta la hoja; la
          // de entrada y las de dentro (barras, spinner) no cuentan.
          if (saliendo && e.target === e.currentTarget && e.animationName === "sale-hoja") onCerrar();
        }}
      >
        {/* Zona de agarre estilo iOS: la barrita y la cabecera se arrastran hacia abajo para cerrar */}
        <div
          className="shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
          onPointerDown={empezarArrastre}
          onPointerMove={moverArrastre}
          onPointerUp={(e) => soltarArrastre(e)}
          onPointerCancel={(e) => soltarArrastre(e, true)}
        >
        <div className="flex w-full items-center justify-center pt-3 pb-2" aria-hidden="true">
          <div className="h-1.5 w-11 rounded-full bg-muted/40" />

        </div>

        <header className="flex items-center justify-between gap-3 border-b border-border px-4 pb-3 pt-1">

          <div className="flex items-center gap-2">
            {metodo !== "elegir" ? (
              <button
                type="button"
                onClick={() => {
                  setMetodo("elegir");
                  setAviso("");
                }}
                className="text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Volver
              </button>
            ) : null}
            <h2 className="text-lg text-ink font-bold">{titulo}</h2>
          </div>
          <IconButton label="Cerrar" onClick={cerrar}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        </header>

        </div>

        <div ref={scrollHoja} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">

          {!esHoy ? (
            <div className="mb-3.5 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-ink">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>
                  Anotando en: <strong>{enPalabras(fechaDestino)}</strong>
                </span>
              </div>
            </div>

          ) : null}

          {/* El turno va arriba y se ve siempre: al abrir la hoja hay que saber

              en qué comida se va a guardar antes de elegir el plato. En el
              capricho no se pregunta: es comida libre y va aparte. */}
          {!esCapricho ? (
            <div className="mb-3.5 flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2.5">
              <span className="text-xs font-semibold text-muted px-0.5">¿En qué comida?</span>
              <SegmentedControl
                label="Comida"
                value={tipo}
                onChange={(v) => setTipo(v as TipoComida)}
                options={TIPOS_COMIDA.map((t) => ({ value: t.valor, label: t.etiqueta }))}
              />
            </div>

          ) : null}

          {esCapricho ? (

            <p className="mb-5 rounded-md bg-accent-soft px-4 py-3 text-sm text-ink">
              Este capricho va aparte: no cuenta en tus calorías ni en tus macros. El resto del día
              sigue como siempre.
            </p>

          ) : null}

          {/* Cámara de fotos directa (capture="environment"): accept="image/*" deja al iPhone convertir HEIC a JPEG rápido */}

          <input
            ref={archivoCamara}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              e.target.value = "";
              if (archivo) void seleccionarFoto(archivo);
            }}

          />

          {/* Fototeca / Galería (sin capture, abre las fotos guardadas en el carrete) */}

          <input
            ref={archivoGaleria}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              e.target.value = "";
              if (archivo) void seleccionarFoto(archivo);
            }}

          />

          {metodo === "elegir" ? (

            <div className="flex flex-col gap-2.5">
              {/* Bloque Foto de tu plato (Cámara o Fototeca + Comentario + Enviar) */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-accent/25 bg-accent-soft/30 p-3.5 transition">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                    <Sparkles size={14} aria-hidden="true" />
                    {esCapricho ? "Foto de tu capricho" : "Foto de tu plato"}
                  </span>
                  <span className="text-2xs font-medium text-muted">
                    {restantesFotos > 0
                      ? `${restantesFotos} de ${TOPE_FOTO} hoy`
                      : "0 fotos hoy"}
                  </span>

                </div>

                {!fotoAnalizada ? (
                  <p className="text-xs text-muted leading-relaxed">
                    Haz una foto o elígela de tus fotos y calculamos tu plato al instante.
                  </p>
                ) : null}

                {/* Dos botones siempre accesibles para lanzar la foto en 1 toque */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={topeFotos || cargando !== ""}
                    onClick={() => {
                      setAviso("");
                      archivoCamara.current?.click();
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-xs font-semibold text-ink shadow-2xs transition active:scale-95 hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Camera size={16} className="text-accent" aria-hidden="true" />
                    <span>Hacer foto</span>
                  </button>

                  <button
                    type="button"
                    disabled={topeFotos || cargando !== ""}
                    onClick={() => {
                      setAviso("");
                      archivoGaleria.current?.click();
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-xs font-semibold text-ink shadow-2xs transition active:scale-95 hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ImageIcon size={16} className="text-accent" aria-hidden="true" />
                    <span>De mis fotos</span>
                  </button>
                </div>

                {fotoAnalizada ? (
                  /* Estado en vivo al analizar + ajuste opcional tras ver el resultado */
                  <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-accent-soft/40 shadow-2xs">
                        <Camera size={20} className="text-accent" aria-hidden="true" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fotoAnalizada.previewUrl}
                          alt="Foto del plato"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        {cargando === "foto" || !fotoAnalizada.analizada ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-bg/65">
                            <Spinner className="text-accent" />
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col min-w-0">
                        <span className="text-xs font-bold text-ink truncate">
                          {cargando === "foto" || !fotoAnalizada.analizada
                            ? "Analizando tu plato…"
                            : fotoAnalizada.aportes.length > 0
                              ? "Plato analizado"
                              : "No se pudo leer bien"}
                        </span>
                        <span className="text-2xs text-muted">
                          {cargando === "foto" || !fotoAnalizada.analizada
                            ? "Calculando alimentos y porciones al vuelo"
                            : "¿Falta algo o solo te comiste una parte? Escríbelo aquí"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={quitarFotoAnalizada}
                        disabled={cargando === "foto"}
                        aria-label="Cerrar tarjeta de la foto"
                        className="shrink-0 rounded-lg p-1.5 text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>

                    {fotoAnalizada.analizada && fotoAnalizada.preparada ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pistaFoto}
                          onChange={(e) => setPistaFoto(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              cargando === "" &&
                              !topeFotos &&
                              (pistaFoto.trim() !== "" || fotoAnalizada.aportes.length === 0)
                            ) {
                              e.preventDefault();
                              void recalcularFotoAnalizada();
                            }
                          }}
                          enterKeyHint="send"
                          placeholder="Ej: solo la mitad, sin aceite, 150g arroz…"
                          className="min-w-0 flex-1 rounded-xl border border-border/80 bg-bg px-3 py-2 text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          maxLength={300}
                          disabled={cargando === "foto"}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={cargando === "foto"}
                          onClick={recalcularFotoAnalizada}
                          disabled={
                            cargando === "foto" ||
                            topeFotos ||
                            (pistaFoto.trim() === "" && fotoAnalizada.aportes.length > 0)
                          }
                          className="shrink-0 font-semibold"
                        >
                          {fotoAnalizada.aportes.length === 0 && pistaFoto.trim() === ""
                            ? "Reintentar"
                            : "Recalcular"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <TarjetaFotosPendientes
                  pendientes={fotosPendientes}
                  cargandoId={cargandoPendienteId}
                  deshabilitado={topeFotos || cargando !== ""}
                  sinSenal={!enLinea}
                  onAnalizar={(item) => void analizarPendienteAhora(item)}
                  onDescartar={(id) => void descartarFotoPendiente(id)}
                />

              </div>
              {!esCapricho ? (
                <>
                  <PanelAtajosComida
                    comidas={comidas}
                    fechaDestino={fechaDestino}
                    tipo={tipo}
                    onAnadirLote={(items) => juntar(items)}
                  />
                  <Opcion
                    Icono={Barcode}
                    titulo="Código de barras"
                    ayuda="Escaneas el envase y salen sus datos"
                    onClick={() => {
                      setAviso("");
                      setMetodo("codigo");
                    }}
                  />
                  <Opcion
                    Icono={Search}
                    titulo="Buscar en la lista"
                    ayuda="Buscas el alimento y pones los gramos"
                    onClick={() => setMetodo("buscar")}
                  />
                </>
              ) : null}
              {esCapricho && elegidos.length === 0 ? (
                <TextField
                  label="Nombre del plato (si no haces foto)"
                  value={nombreCapricho}
                  onChange={(e) => setNombreCapricho(e.target.value)}
                  placeholder="Ej. Pizza y cerveza"
                  hint="Si no quieres hacer foto, escribe el nombre y se guarda igual."
                />
              ) : null}
              {avisoDeElegir ? (
                <p className="rounded-md bg-surface px-4 py-3 text-sm text-muted">{avisoDeElegir}</p>
              ) : null}
            </div>

          ) : null}

          {metodo === "buscar" ? (

            <div className="flex flex-col gap-4">
              <SearchField value={consulta} onChange={setConsulta} results={resultados.length} />
              {resultados.length === 0 && consulta.trim().length > 0 ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface p-4 text-center">
                  <p className="text-sm font-semibold text-ink">
                    No encontramos «{consulta.trim()}» en la lista
                  </p>
                  {consulta.trim().length >= 3 ? (
                    <Button
                      variant="primary"
                      onClick={() => void calcularConIA()}
                      disabled={cargando !== ""}
                      className="w-full text-xs font-bold"
                    >
                      <Sparkles size={15} aria-hidden="true" />
                      {cargando === "texto"
                        ? "Calculando con IA…"
                        : `Calcular «${consulta.trim()}» con IA`}
                    </Button>
                  ) : null}
                  {aviso ? <p className="text-xs text-muted">{aviso}</p> : null}
                  <p className="text-xs text-muted leading-relaxed">
                    O añádelo como comida libre indicando las calorías aproximadas por ración:
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <div className="flex items-center gap-1 rounded-xl border border-border bg-bg px-2.5 py-1.5 shadow-2xs">
                      <input
                        type="number"
                        min="10"
                        max="2500"
                        value={kcalPersonalizada}
                        onChange={(e) => setKcalPersonalizada(e.target.value)}
                        className="w-14 text-center text-sm font-bold text-ink bg-transparent focus:outline-none"
                        aria-label="Calorías estimadas"
                      />
                      <span className="text-xs text-muted pr-1">kcal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => anadirPersonalizado(consulta, Number(kcalPersonalizada) || 180)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-xs transition active:scale-95 hover:brightness-105"
                    >
                      <Plus size={15} />
                      <span>Añadir «{consulta.trim()}»</span>
                    </button>
                  </div>
                </div>
              ) : null}
              <ul className="flex flex-col gap-2">
                {resultados.map((a) => (
                  <li key={a.nombre}>
                    <button
                      type="button"
                      onClick={() => anadir(a)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-bg px-4 py-3 text-left transition duration-150 ease-app hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="flex flex-col">
                        <span className="text-base text-ink">{a.nombre}</span>
                        <span className="text-sm text-muted">
                          {a.porcion} · {a.gramos} {unidadDelAlimento(a)} · {a.categoria}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-muted">
                        {Math.round((a.kcal100 * a.gramos) / 100)} kcal
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {resultados.length > 0 && consulta.trim().length > 1 ? (
                <div className="pt-2 text-center">
                  {mostrarCrearLibre ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-left">
                      <p className="text-xs font-semibold text-ink">
                        Añadir «{consulta.trim()}» con tus calorías estimadas:
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-border bg-bg px-2.5 py-1">
                          <input
                            type="number"
                            min="10"
                            max="2500"
                            value={kcalPersonalizada}
                            onChange={(e) => setKcalPersonalizada(e.target.value)}
                            className="w-14 text-center text-xs font-bold text-ink bg-transparent focus:outline-none"
                          />
                          <span className="text-[11px] text-muted">kcal</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            anadirPersonalizado(consulta, Number(kcalPersonalizada) || 180);
                            setMostrarCrearLibre(false);
                          }}
                          className="rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-on-accent active:scale-95"
                        >
                          Añadir comida libre
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMostrarCrearLibre(true)}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      + ¿No es ninguno de estos? Añadir «{consulta.trim()}» como comida libre
                    </button>
                  )}
                </div>
              ) : null}
            </div>

          ) : null}

          {metodo === "codigo" ? (

            <LectorCodigo
              codigoNube={codigoNube}
              onContarFoto={contarConsulta}
              onEncontrado={(alimento) => {
                anadir(alimento);
                setMetodo("elegir");
              }}
            />

          ) : null}

          {elegidos.length > 0 ? (

            <section className="mt-6 flex flex-col gap-3 border-t border-border pt-5">
              <h3 className="text-base font-semibold text-ink">Lo que vas a anotar</h3>
              <p className="text-sm text-muted">
                {esCapricho
                  ? "Se guarda aparte del día: no cuenta en las calorías ni en los macros."
                  : `Se anotará en ${
                      TIPOS_COMIDA.find((t) => t.valor === tipo)?.etiqueta ?? "la comida"
                    }.`}
              </p>
              {esCapricho ? (
                <ul className="flex flex-col rounded-lg border border-border bg-bg">
                  {elegidos.map((e) => (
                    <li
                      key={e.base.nombre}
                      className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 last:border-0"
                    >
                      <span className="text-base text-ink">{e.base.nombre}</span>
                      <IconButton
                        label={`Quitar ${e.base.nombre}`}
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setElegidos((prev) => prev.filter((p) => p.base.nombre !== e.base.nombre))
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              ) : (
                elegidos.map((e) => {
                  const r = porGramos(e.base, e.gramos);
                  return (
                    <div
                      key={e.base.nombre}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-base text-ink">{e.base.nombre}</span>
                        <span className="shrink-0 text-sm text-muted">{r.kcal} kcal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconButton
                          label={`Menos ${e.base.nombre}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => cambiarGramos(e.base.nombre, e.gramos, "bajar")}
                        >
                          <Minus size={16} aria-hidden="true" />
                        </IconButton>
                        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-0.5 shadow-2xs">
                          <input
                            type="number"
                            min="1"
                            max="3000"
                            value={e.gramos}
                            onChange={(ev) => fijarGramos(e.base.nombre, Number(ev.target.value) || 1)}
                            className="w-14 text-center text-sm font-bold text-ink bg-transparent focus:outline-none"
                            aria-label={`${unidadDelAlimento(e.base) === "ml" ? "Mililitros" : "Gramos"} de ${e.base.nombre}`}
                          />
                          <span className="text-xs text-muted pr-1">{unidadDelAlimento(e.base)}</span>
                        </div>
                        <IconButton
                          label={`Más ${e.base.nombre}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => cambiarGramos(e.base.nombre, e.gramos, "subir")}
                        >
                          <Plus size={16} aria-hidden="true" />
                        </IconButton>
                        <span className="ml-auto text-sm text-muted">
                          P {r.proteinas} · C {r.carbohidratos} · G {r.grasas}
                        </span>
                        <IconButton
                          label={`Quitar ${e.base.nombre}`}
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setElegidos((prev) => prev.filter((p) => p.base.nombre !== e.base.nombre))
                          }
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </IconButton>

                      </div>

                      <AtajosRacion
                        nombre={e.base.nombre}
                        gramosBase={e.base.gramos}
                        gramosActuales={e.gramos}
                        onAplicar={(nuevosGramos) => fijarGramos(e.base.nombre, nuevosGramos)}
                      />

                      <AvisoCrudoCocido
                        nombre={e.base.nombre}
                        gramosActuales={e.gramos}
                        onAplicar={(nuevosGramos) => fijarGramos(e.base.nombre, nuevosGramos)}
                      />

                    </div>
                  );
                })
              )}
            </section>
          ) : null}

        </div>

        {elegidos.length > 0 || esCapricho ? (

          <footer className="border-t border-border px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
            <Button
              size="lg"
              className="w-full"
              onClick={guardar}
              // El botón se ve siempre para que la hoja no termine en blanco.
              // Sin foto ni nombre no hay nada que guardar, así que va en gris.
              disabled={esCapricho && raciones.length === 0 && nombreCapricho.trim() === ""}
            >
              <Check size={18} aria-hidden="true" />
              {esCapricho ? "Anotar capricho" : `Anotar ${totalKcal} kcal`}
            </Button>
          </footer>
        ) : null}
      </div>
      </div>
    </div>,
    document.body,
  );

}

function Opcion({

  Icono,
  titulo,
  ayuda,
  etiqueta,
  deshabilitado = false,
  onClick,
}: {
  Icono: typeof Camera;
  titulo: string;
  ayuda: string;
  etiqueta?: string;
  deshabilitado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className="flex w-full items-center gap-3.5 rounded-lg border border-border bg-bg px-3.5 py-3 text-left transition duration-150 ease-app hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
        <Icono size={22} aria-hidden="true" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="flex items-center gap-2 text-base font-semibold text-ink">
          {titulo}
          {etiqueta ? (
            <span className="rounded-pill bg-surface px-2 py-0.5 text-xs font-medium text-muted">
              {etiqueta}
            </span>
          ) : null}
        </span>
        <span className="text-sm text-muted">{ayuda}</span>
      </span>
    </button>
  );

}

