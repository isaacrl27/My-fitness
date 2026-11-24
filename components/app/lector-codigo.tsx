"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Flashlight, Keyboard, ScanLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import {
  buscarPorCodigo,
  codigoGtinValido,
  guardarCodigoPropio,
  limpiarCodigo,
} from "@/lib/codigo-barras";
import { alimentoBaseDeIA, pedirFotoIA, prepararImagenIA } from "@/lib/foto-cliente";
import type { AlimentoBase } from "@/lib/alimentos";

type EstadoCamara = "arrancando" | "leyendo" | "sin-permiso" | "sin-camara";

interface DetectorNativo {
  detect(fuente: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
}

interface ConstructorDetectorNativo {
  new (opciones?: { formats?: string[] }): DetectorNativo;
  getSupportedFormats?: () => Promise<string[]>;
}

const FORMATOS_NATIVOS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf"];

function apagarFlujo(flujo: MediaStream | null, elemento: HTMLVideoElement | null) {
  if (flujo) {
    for (const pista of flujo.getTracks()) {
      try {
        pista.stop();
      } catch {
        // pista ya cerrada
      }
    }
  }
  if (!elemento) return;
  const actual = elemento.srcObject;
  if (actual && "getTracks" in actual && typeof actual.getTracks === "function") {
    for (const pista of actual.getTracks()) {
      try {
        pista.stop();
      } catch {
        // pista ya cerrada
      }
    }
  }
  elemento.srcObject = null;
}

async function abrirCamaraTrasera(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      throw err;
    }
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "environment" },
    });
  }
}

async function crearDetectorHardware(): Promise<DetectorNativo | null> {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) return null;
  try {
    const Ctor = (window as unknown as { BarcodeDetector: ConstructorDetectorNativo })
      .BarcodeDetector;
    if (typeof Ctor.getSupportedFormats === "function") {
      const soportados = await Ctor.getSupportedFormats();
      if (!soportados.includes("ean_13")) return null;
      const activos = FORMATOS_NATIVOS.filter((f) => soportados.includes(f));
      return new Ctor({ formats: activos });
    }
    return new Ctor({ formats: FORMATOS_NATIVOS });
  } catch {
    return null;
  }
}

/**
 * Lector de código de barras estilo Yuka:
 * - Cámara trasera en HD (1280×720) con autoenfoque continuo y linterna opcional.
 * - Motor dual: `BarcodeDetector` nativo del sistema (ML Kit) si existe, o ZXing
 *   afinado con `TRY_HARDER` exclusivamente para formatos de producto (EAN/UPC).
 * - Rescate en 1 toque: si un envase nuevo de supermercado aún no está en Open
 *   Food Facts, permite fotografiar su tabla nutricional, lo añade al plato y
 *   aprende ese código en el móvil para siempre.
 */
export function LectorCodigo({
  onEncontrado,
  codigoNube,
  onContarFoto,
}: {
  onEncontrado: (alimento: AlimentoBase) => void;
  codigoNube?: string | null;
  onContarFoto?: (restantes: number | null) => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const pistaActiva = useRef<MediaStreamTrack | null>(null);
  const leer = useRef(false);
  const avisar = useRef(onEncontrado);
  const inputEtiqueta = useRef<HTMLInputElement | null>(null);

  const [estado, setEstado] = useState<EstadoCamara>("arrancando");
  const [aMano, setAMano] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [leyendoEtiqueta, setLeyendoEtiqueta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sinFicha, setSinFicha] = useState<{ codigo: string; nombre: string } | null>(null);
  const [linternaDisponible, setLinternaDisponible] = useState(false);
  const [linternaEncendida, setLinternaEncendida] = useState(false);

  useEffect(() => {
    avisar.current = onEncontrado;
  }, [onEncontrado]);

  async function conmutarLinterna() {
    const pista = pistaActiva.current;
    if (!pista) return;
    const siguiente = !linternaEncendida;
    try {
      await pista.applyConstraints({
        advanced: [{ torch: siguiente } as MediaTrackConstraintSet],
      });
      setLinternaEncendida(siguiente);
    } catch {
      setLinternaDisponible(false);
    }
  }

  async function probar(numero: string) {
    if (buscando || leyendoEtiqueta) return;
    setBuscando(true);
    setAviso(null);
    setSinFicha(null);
    const resultado = await buscarPorCodigo(numero);
    setBuscando(false);

    if (resultado.estado === "ok") {
      avisar.current(resultado.alimento);
      return;
    }
    if (resultado.estado === "no-esta") {
      setSinFicha({ codigo: resultado.codigo, nombre: "" });
      return;
    }
    if (resultado.estado === "sin-datos") {
      setSinFicha({ codigo: resultado.codigo, nombre: resultado.nombre });
      return;
    }
    setAviso(resultado.mensaje);
  }

  async function rescatarConEtiqueta(archivo?: File) {
    if (!archivo || !sinFicha) return;
    setLeyendoEtiqueta(true);
    setAviso(null);
    try {
      const { imagen, mime } = await prepararImagenIA(archivo, { modo: "etiqueta" });
      const r = await pedirFotoIA({
        imagen,
        mime,
        modo: "etiqueta",
        ...(sinFicha.nombre ? { comentario: `Producto: ${sinFicha.nombre}` } : {}),
        ...(codigoNube ? { codigo: codigoNube } : {}),
      });
      if (!r.ok) {
        setAviso(r.motivo ?? "No he podido leer la tabla nutricional ahora mismo.");
        return;
      }
      onContarFoto?.(r.restantes);
      const primero = r.alimentos[0];
      if (!primero) {
        setAviso(
          "No se distinguían los números de la etiqueta. Acerca la cámara al cuadro de información nutricional.",
        );
        return;
      }
      const alimento = alimentoBaseDeIA(
        {
          ...primero,
          nombre:
            primero.nombre.trim() ||
            sinFicha.nombre ||
            `Envase ${sinFicha.codigo}`,
        },
        { categoriaPorDefecto: "Del envase" },
      );
      guardarCodigoPropio(sinFicha.codigo, alimento);
      avisar.current(alimento);
    } catch {
      setAviso("No he podido procesar esa foto de la etiqueta. Prueba acercándote un poco más.");
    } finally {
      setLeyendoEtiqueta(false);
    }
  }

  useEffect(() => {
    if (aMano) return;
    let vivo = true;
    let flujo: MediaStream | null = null;
    let controles: { stop: () => void } | undefined;
    let temporizadorNativo: ReturnType<typeof setInterval> | null = null;
    let lecturaPreviaDudosa = "";
    const elementoInicial = video.current;

    leer.current = false;

    const confirmarCodigoLeido = (textoCrudo: string) => {
      if (leer.current || !vivo) return;
      const limpio = limpiarCodigo(textoCrudo);
      if (limpio.length < 6 || limpio.length > 14) return;

      // Los códigos EAN/UPC reales llevan dígito de control GS1 Modulo-10.
      // Para códigos internos sin checksum exigimos 2 fotogramas idénticos seguidos.
      if (!codigoGtinValido(limpio)) {
        if (lecturaPreviaDudosa !== limpio) {
          lecturaPreviaDudosa = limpio;
          return;
        }
      }

      leer.current = true;
      if (temporizadorNativo) clearInterval(temporizadorNativo);
      controles?.stop();
      pistaActiva.current = null;
      apagarFlujo(flujo, video.current ?? elementoInicial);
      setAMano(true);
      setCodigo(limpio);
      void probar(limpio);
    };

    const alOcultar = () => {
      if (document.visibilityState === "hidden") {
        if (temporizadorNativo) clearInterval(temporizadorNativo);
        controles?.stop();
        pistaActiva.current = null;
        apagarFlujo(flujo, video.current ?? elementoInicial);
        setAMano(true);
      }
    };
    document.addEventListener("visibilitychange", alOcultar);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("sin-camara");
        return;
      }
      try {
        flujo = await abrirCamaraTrasera();
        if (!vivo) {
          apagarFlujo(flujo, video.current ?? elementoInicial);
          return;
        }

        const pista = flujo.getVideoTracks()[0] ?? null;
        pistaActiva.current = pista;
        if (pista && typeof pista.getCapabilities === "function") {
          try {
            const caps = pista.getCapabilities() as MediaTrackCapabilities & {
              focusMode?: string[];
              torch?: boolean;
            };
            if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
              await pista.applyConstraints({
                advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
              });
            }
            if (caps.torch === true && vivo) {
              setLinternaDisponible(true);
            }
          } catch {
            // El navegador no permite ajustar restricciones avanzadas: seguimos normal.
          }
        }

        const elemento = video.current;
        if (!elemento || !vivo) {
          apagarFlujo(flujo, elemento ?? elementoInicial);
          return;
        }

        // 1. Intentar motor nativo por hardware (`BarcodeDetector` / ML Kit)
        const detectorNativo = await crearDetectorHardware();
        if (!vivo) {
          apagarFlujo(flujo, elemento);
          return;
        }

        if (detectorNativo) {
          elemento.srcObject = flujo;
          await elemento.play();
          if (!vivo) {
            apagarFlujo(flujo, elemento);
            return;
          }
          setEstado("leyendo");
          let ocupado = false;
          temporizadorNativo = setInterval(async () => {
            if (!vivo || leer.current || ocupado || elemento.readyState < 2) return;
            ocupado = true;
            try {
              const codigos = await detectorNativo.detect(elemento);
              const hallado = codigos.find((c) => typeof c.rawValue === "string" && c.rawValue)?.rawValue;
              if (hallado) confirmarCodigoLeido(hallado);
            } catch {
              // Fotograma suelto ilegible
            } finally {
              ocupado = false;
            }
          }, 110);
          return;
        }

        // 2. Motor universal ZXing afinado para códigos 1D de envases con TRY_HARDER
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (!vivo) {
          apagarFlujo(flujo, elemento);
          return;
        }

        const pistas = new Map();
        pistas.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.ITF,
        ]);
        pistas.set(DecodeHintType.TRY_HARDER, true);

        const lector = new BrowserMultiFormatReader(pistas, {
          delayBetweenScanAttempts: 120,
        });

        const nuevosControles = await lector.decodeFromStream(flujo, elemento, (resultado) => {
          if (!resultado) return;
          confirmarCodigoLeido(resultado.getText());
        });

        if (!vivo) {
          nuevosControles.stop();
          apagarFlujo(flujo, elemento);
          return;
        }
        controles = nuevosControles;
        setEstado("leyendo");
      } catch (error) {
        if (!vivo) {
          apagarFlujo(flujo, video.current ?? elementoInicial);
          return;
        }
        const negado = error instanceof DOMException && error.name === "NotAllowedError";
        setEstado(negado ? "sin-permiso" : "sin-camara");
      }
    })();

    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alOcultar);
      if (temporizadorNativo) clearInterval(temporizadorNativo);
      controles?.stop();
      pistaActiva.current = null;
      apagarFlujo(flujo, elementoInicial);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aMano]);

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputEtiqueta}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (archivo) void rescatarConEtiqueta(archivo);
        }}
      />

      {aMano || estado === "sin-permiso" || estado === "sin-camara" ? null : (
        <div className="relative overflow-hidden rounded-lg border border-border bg-black/90">
          <video
            ref={video}
            className="h-56 w-full object-cover"
            muted
            playsInline
            aria-label="Vista de la cámara"
          />
          {estado === "leyendo" ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="h-24 w-60 rounded-lg border-2 border-white/85 shadow-sm" />
              <span className="rounded-pill bg-black/55 px-2.5 py-0.5 text-2xs text-white/90">
                Centra las barras a unos 15 cm
              </span>
            </div>
          ) : null}
          {linternaDisponible && estado === "leyendo" ? (
            <button
              type="button"
              onClick={() => void conmutarLinterna()}
              aria-pressed={linternaEncendida}
              aria-label={linternaEncendida ? "Apagar linterna" : "Encender linterna"}
              className={[
                "absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition",
                linternaEncendida
                  ? "bg-amber-400 text-black shadow-sm"
                  : "bg-black/60 text-white hover:bg-black/75",
              ].join(" ")}
            >
              <Flashlight size={14} aria-hidden="true" />
              <span>Luz</span>
            </button>
          ) : null}
          {estado === "arrancando" ? (
            <p className="absolute inset-x-0 bottom-2 text-center text-sm text-white/90">
              Encendiendo la cámara…
            </p>
          ) : null}
        </div>
      )}

      {estado === "sin-permiso" && !aMano ? (
        <p className="flex items-start gap-2 rounded-md bg-surface p-3 text-sm text-ink">
          <CameraOff size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          No has dado permiso para la cámara. Puedes escribir el número que viene debajo del
          código de barras.
        </p>
      ) : null}

      {estado === "sin-camara" && !aMano ? (
        <p className="flex items-start gap-2 rounded-md bg-surface p-3 text-sm text-ink">
          <CameraOff size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          Aquí no hay cámara disponible. Escribe el número que viene debajo del código de barras.
        </p>
      ) : null}

      {aMano || estado === "sin-permiso" || estado === "sin-camara" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            void probar(codigo);
          }}
        >
          <TextField
            label="Número del envase"
            hint="Los números que están debajo de las rayas del código."
            inputMode="numeric"
            autoComplete="off"
            value={codigo}
            onChange={(evento) => {
              setCodigo(evento.target.value.replace(/[^0-9]/g, ""));
              if (sinFicha) setSinFicha(null);
            }}
            placeholder="8480000107046"
          />
          <Button
            type="submit"
            disabled={buscando || leyendoEtiqueta || codigo.length < 6}
            className="w-full"
          >
            <ScanLine size={16} aria-hidden="true" />
            {buscando ? "Buscando…" : "Buscar el producto"}
          </Button>
          {estado !== "sin-permiso" && estado !== "sin-camara" ? (
            <Button
              type="button"
              variant="ghost"
              disabled={leyendoEtiqueta}
              onClick={() => {
                setAviso(null);
                setSinFicha(null);
                setLinternaDisponible(false);
                setLinternaEncendida(false);
                setEstado("arrancando");
                setAMano(false);
              }}
              className="w-full"
            >
              Volver a escanear con la cámara
            </Button>
          ) : null}
        </form>
      ) : (
        <Button variant="ghost" onClick={() => setAMano(true)} className="w-full">
          <Keyboard size={16} aria-hidden="true" />
          Escribirlo a mano
        </Button>
      )}

      {sinFicha ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent-soft/30 p-3.5"
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-ink">
              {sinFicha.nombre
                ? `«${sinFicha.nombre}» no trae calorías en la lista abierta`
                : `El código ${sinFicha.codigo} aún no está en la lista abierta`}
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Hazle una foto al cuadro de <strong>Información nutricional</strong> del envase:
              sacamos sus datos exactos y tu móvil recordará este código para la próxima vez.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            disabled={leyendoEtiqueta}
            onClick={() => {
              setAviso(null);
              inputEtiqueta.current?.click();
            }}
            className="w-full"
          >
            {leyendoEtiqueta ? (
              <>
                <Sparkles size={16} aria-hidden="true" />
                Leyendo tabla del envase…
              </>
            ) : (
              <>
                <Camera size={16} aria-hidden="true" />
                Leer tabla nutricional del envase
              </>
            )}
          </Button>
        </div>
      ) : null}

      {aviso ? (
        <p role="status" className="rounded-md bg-surface p-3 text-sm text-ink">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
