"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Flame,
  Check,
  Plus,
  House,
  TrendingUp,
  CalendarDays,
  Dumbbell,
  Users,
  Settings,
  Camera,
  RefreshCw,
  ShoppingCart,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { sonidoTap, sonidoCheck } from "@/lib/sonido";
import { vibrarTap } from "@/lib/haptica";
import { VERSION_APP } from "@/lib/version";
import { useBloqueoModal } from "@/lib/use-modal";

interface ModalGuiaVideoProps {
  abierto: boolean;
  onCerrar: () => void;
  pasoInicial?: number;
}

export type CapituloGuia = {
  id: number;
  pestana: string;
  emoji: string;
  titulo: string;
  guionVoz: string;
  duracionEstimadaSeg: number;
  enlaceApp: string;
  icono: LucideIcon;
};

export const CAPITULOS: CapituloGuia[] = [
  {
    id: 1,
    pestana: "Hoy",
    emoji: "🏠",
    titulo: "Hoy · Tu día a día",
    guionVoz:
      "Mira, te lo enseño directo desde mi móvil. En Hoy no te tienes que rayar: de un vistazo ves las calorías que te quedan. Si vas a comer, le tiras una foto al plato o buscas el nombre y te lo cuenta al momento. ¿Que bebes agua? Un toque al vaso y suma. Y si cumples el día, racha encendida.",
    duracionEstimadaSeg: 25,
    enlaceApp: "/hoy",
    icono: House,
  },
  {
    id: 2,
    pestana: "Progreso",
    emoji: "📈",
    titulo: "Progreso · Gráfica y báscula",
    guionVoz:
      "En Progreso nos pesamos por la mañana. Lo mejor es que la línea verde pasa de los líquidos o la sal del día anterior: te saca la grasa que estás perdiendo de verdad para que no te agobies si un día la báscula sube un poco.",
    duracionEstimadaSeg: 22,
    enlaceApp: "/progreso",
    icono: TrendingUp,
  },
  {
    id: 3,
    pestana: "Plan",
    emoji: "📅",
    titulo: "Plan · Menú y compra",
    guionVoz:
      "En Plan tienes la comida de la semana con platos fáciles de menos de 5 ingredientes. ¿Que hoy no te apetece pollo? Le das a cambiar y te pone otra opción con las mismas calorías. Y la lista de la compra te calcula los 7 días clavados para no tirar ni un euro.",
    duracionEstimadaSeg: 24,
    enlaceApp: "/plan",
    icono: CalendarDays,
  },
  {
    id: 4,
    pestana: "Entreno",
    emoji: "🏋️",
    titulo: "Entreno · Fuerza y tono",
    guionVoz:
      "Rutinas cortas y al grano. Eliges si entrenas en el salón o en el gym: te marca las series, te avisa con un pitido cuando acaba el descanso y llevas todo apuntado sin líos.",
    duracionEstimadaSeg: 20,
    enlaceApp: "/entreno",
    icono: Dumbbell,
  },
  {
    id: 5,
    pestana: "Familia",
    emoji: "👥",
    titulo: "Familia · Reto en equipo",
    guionVoz:
      "En Familia nos unimos con un código de grupo para picarnos y sumar los kilos que bajamos juntos. Tu peso sigue privado en tu móvil, y la lista de la compra la tenemos todos a la vez.",
    duracionEstimadaSeg: 21,
    enlaceApp: "/familia",
    icono: Users,
  },
  {
    id: 6,
    pestana: "Ajustes",
    emoji: "⚙️",
    titulo: "Ajustes · Control total",
    guionVoz:
      "Y en Ajustes lo dejas a tu gusto: cambias de objetivo en un toque, pones la hora a la que sueles comer para que los avisos no te molesten, y tu copia siempre a salvo en la nube.",
    duracionEstimadaSeg: 20,
    enlaceApp: "/ajustes",
    icono: Settings,
  },
];

const PLATOS_SIMULADOS = [
  { nombre: "Arroz salteado con pollo y verduras", kcal: 610, desc: "Menos de 5 ingredientes · Listo en 15 min" },
  { nombre: "Salmón a la plancha con patatas al vapor", kcal: 610, desc: "Rico en omega 3 · Mismas calorías exactas" },
  { nombre: "Fajitas de ternera con pimientos", kcal: 610, desc: "Proteína limpia · Plato rápido" },
];

export function ModalGuiaVideo({
  abierto,
  onCerrar,
  pasoInicial = 1,
}: ModalGuiaVideoProps) {
  const [capituloActual, setCapituloActual] = useState(pasoInicial);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [segundoCapitulo, setSegundoCapitulo] = useState(0);
  const [conVoz, setConVoz] = useState(true);
  const [conSubtitulos, setConSubtitulos] = useState(true);
  const [velocidad, setVelocidad] = useState<number>(1);

  // Estados visuales dinámicos de la pantalla simulada
  const [hojaFotoAbierta, setHojaFotoAbierta] = useState(false);
  const [fotoAnalizada, setFotoAnalizada] = useState(false);
  const [platoAnotadoHoy, setPlatoAnotadoHoy] = useState(false);
  const [aguaSimulada, setAguaSimulada] = useState(1.5);
  const [rachaBrillando, setRachaBrillando] = useState(false);
  const [indicePlatoPlan, setIndicePlatoPlan] = useState(0);
  const [segundosDescanso, setSegundosDescanso] = useState(45);
  const [ejercicio2Hecho, setEjercicio2Hecho] = useState(false);
  const [horarioAvisoEditado, setHorarioAvisoEditado] = useState(false);

  // Estado del puntero táctil interactivo (círculo nativo de screen recording, sin etiquetas falsas)
  const [puntero, setPuntero] = useState<{ x: number; y: number; visible: boolean; pulsando: boolean }>({
    x: 50,
    y: 50,
    visible: false,
    pulsando: false,
  });

  const timerCapituloRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const irACapituloRef = useRef<((id: number, autoPlay?: boolean) => void) | null>(null);
  const avanzandoRef = useRef(false);

  const capitulo = CAPITULOS.find((c) => c.id === capituloActual) ?? CAPITULOS[0];
  const duracionTotal = CAPITULOS.reduce((acc, c) => acc + c.duracionEstimadaSeg, 0);

  const capituloActualRef = useRef(capituloActual);
  const segundoCapituloRef = useRef(segundoCapitulo);
  const conVozRef = useRef(conVoz);
  const duracionCapituloRef = useRef(capitulo.duracionEstimadaSeg);

  useEffect(() => {
    capituloActualRef.current = capituloActual;
    segundoCapituloRef.current = segundoCapitulo;
    conVozRef.current = conVoz;
    duracionCapituloRef.current = capitulo.duracionEstimadaSeg;
  });

  const duracionCapituloActual = capitulo.duracionEstimadaSeg;
  const segundoCapituloAjustado = Math.min(duracionCapituloActual, segundoCapitulo);
  const tiempoGlobalActual = CAPITULOS.slice(0, capituloActual - 1).reduce(
    (acc, c) => acc + c.duracionEstimadaSeg,
    0,
  ) + segundoCapituloAjustado;

  // Reseteo completo del estado de simulación para evitar dirty state al saltar entre capítulos
  const resetearSimulacion = useCallback(() => {
    setHojaFotoAbierta(false);
    setFotoAnalizada(false);
    setPlatoAnotadoHoy(false);
    setAguaSimulada(1.5);
    setRachaBrillando(false);
    setIndicePlatoPlan(0);
    setSegundosDescanso(45);
    setEjercicio2Hecho(false);
    setHorarioAvisoEditado(false);
    setPuntero({ x: 50, y: 50, visible: false, pulsando: false });
  }, []);

  // Detener voz limpio cancelando listeners antes de cancel() para evitar saltos fantasma
  const detenerVoz = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (uttRef.current) {
        uttRef.current.onend = null;
        uttRef.current.onerror = null;
        uttRef.current = null;
      }
      window.speechSynthesis.cancel();
    }
  }, []);

  // Avance ordenado al siguiente capítulo con candado de exclusión mutua
  const avanzarOSalir = useCallback((capId: number) => {
    if (avanzandoRef.current) return;
    avanzandoRef.current = true;
    if (capId < CAPITULOS.length) {
      irACapituloRef.current?.(capId + 1, true);
    } else {
      setReproduciendo(false);
      setPuntero((p) => ({ ...p, visible: false }));
    }
  }, []);

  // Hablar capítulo con soporte para mute/unmute sin closures obsoletos y heartbeat no-iOS
  const hablar = useCallback(
    (cap: CapituloGuia, vel: number, vozActiva = conVoz) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      detenerVoz();
      if (!vozActiva) return;

      const utt = new SpeechSynthesisUtterance(cap.guionVoz);
      utt.lang = "es-ES";
      utt.rate = vel;
      utt.pitch = 1.0;

      const voces = window.speechSynthesis.getVoices();
      const vozEs =
        voces.find(
          (v) =>
            v.lang.startsWith("es") &&
            (v.name.includes("Natural") ||
              v.name.includes("Google") ||
              v.name.includes("Alvaro") ||
              v.name.includes("Pablo") ||
              v.name.includes("Jorge")),
        ) || voces.find((v) => v.lang.startsWith("es"));

      if (vozEs) utt.voice = vozEs;

      utt.onend = () => {
        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
        avanzarOSalir(cap.id);
      };

      utt.onerror = () => {
        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      };

      // Heartbeat solo fuera de iOS (en WebKit móvil pause/resume congela el audio)
      const esIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!esIOS) {
        keepAliveRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      }

      uttRef.current = utt;
      window.speechSynthesis.speak(utt);
    },
    [conVoz, detenerVoz, avanzarOSalir],
  );

  // Cambiar de capítulo con reseteo completo de estados de simulación
  const irACapitulo = useCallback(
    (id: number, autoPlay?: boolean) => {
      avanzandoRef.current = false;
      sonidoTap();
      vibrarTap();
      detenerVoz();
      setCapituloActual(id);
      setSegundoCapitulo(0);
      segundoCapituloRef.current = 0;
      resetearSimulacion();

      const nuevoCap = CAPITULOS.find((c) => c.id === id) ?? CAPITULOS[0];
      const deberiaReproducir = autoPlay !== undefined ? autoPlay : reproduciendo;
      if (deberiaReproducir) {
        setReproduciendo(true);
        hablar(nuevoCap, velocidad);
      }
    },
    [reproduciendo, detenerVoz, resetearSimulacion, hablar, velocidad],
  );

  // Sincronizar la referencia para evitar circularidad
  useEffect(() => {
    irACapituloRef.current = irACapitulo;
  }, [irACapitulo]);

  // Play / Pausa
  const alternarPlay = () => {
    sonidoTap();
    vibrarTap();
    if (reproduciendo) {
      setReproduciendo(false);
      detenerVoz();
      if (timerCapituloRef.current) clearInterval(timerCapituloRef.current);
    } else {
      setReproduciendo(true);
      hablar(capitulo, velocidad);
    }
  };

  // Función de despacho del timeline con coordenadas táctiles alineadas al milímetro
  const despacharTimeline = useCallback((capId: number, seg: number) => {
    // --- ACCIONES EN CAPÍTULO 1: HOY (22s) ---
    if (capId === 1) {
      if (seg === 2) {
        setPuntero({ x: 50, y: 39, visible: true, pulsando: false });
      } else if (seg === 3) {
        setPuntero((p) => ({ ...p, pulsando: true }));
        sonidoTap();
        setHojaFotoAbierta(true);
      } else if (seg === 5) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
        setFotoAnalizada(true);
        sonidoCheck();
      } else if (seg === 7) {
        setHojaFotoAbierta(false);
        setPlatoAnotadoHoy(true);
      } else if (seg === 10) {
        // Coordenada calibrada al centro exacto del botón +0,25 L (y: 77%)
        setPuntero({ x: 72, y: 77, visible: true, pulsando: false });
      } else if (seg === 11) {
        setPuntero((p) => ({ ...p, pulsando: true }));
        sonidoTap();
        setAguaSimulada((a) => Number((a + 0.25).toFixed(2)));
      } else if (seg === 13) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      } else if (seg === 15) {
        setPuntero({ x: 70, y: 7, visible: true, pulsando: true });
        setRachaBrillando(true);
      } else if (seg === 17) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      } else if (seg === 19) {
        setPuntero({ x: 50, y: 31, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 21) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      }
    }

    // --- ACCIONES EN CAPÍTULO 2: PROGRESO (19s) ---
    if (capId === 2) {
      if (seg === 2) {
        setPuntero({ x: 50, y: 19, visible: true, pulsando: false });
      } else if (seg === 3) {
        setPuntero((p) => ({ ...p, pulsando: true }));
        sonidoTap();
      } else if (seg === 6) {
        setPuntero({ x: 55, y: 38, visible: true, pulsando: false });
      } else if (seg === 8) {
        setPuntero((p) => ({ ...p, pulsando: true }));
        sonidoTap();
      } else if (seg === 11) {
        setPuntero({ x: 78, y: 19, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 14) {
        setPuntero({ x: 82, y: 44, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 17) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      }
    }

    // --- ACCIONES EN CAPÍTULO 3: PLAN (21s) ---
    if (capId === 3) {
      if (seg === 3) {
        setPuntero({ x: 35, y: 35, visible: true, pulsando: false });
      } else if (seg === 4) {
        setPuntero((p) => ({ ...p, pulsando: true }));
        sonidoTap();
        setIndicePlatoPlan(1);
      } else if (seg === 5) {
        setPuntero((p) => ({ ...p, pulsando: false }));
      } else if (seg === 7) {
        setPuntero((p) => ({ ...p, pulsando: true }));
        sonidoTap();
        setIndicePlatoPlan(2);
      } else if (seg === 8) {
        setPuntero((p) => ({ ...p, pulsando: false }));
      } else if (seg === 11) {
        setPuntero({ x: 50, y: 46, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 14) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      } else if (seg === 16) {
        setPuntero({ x: 85, y: 46, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 19) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      }
    }

    // --- ACCIONES EN CAPÍTULO 4: ENTRENO (17s) ---
    if (capId === 4) {
      if (seg === 3) {
        setPuntero({ x: 88, y: 28, visible: true, pulsando: false });
      } else if (seg === 4) {
        setPuntero((p) => ({ ...p, pulsando: true }));
        sonidoCheck();
        setEjercicio2Hecho(true);
      } else if (seg === 6) {
        setPuntero({ x: 50, y: 38, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg >= 7 && seg <= 15) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
        setSegundosDescanso((s) => Math.max(0, s - 1));
      }
    }

    // --- ACCIONES EN CAPÍTULO 5: FAMILIA (18s) ---
    if (capId === 5) {
      if (seg === 3) {
        setPuntero({ x: 50, y: 20, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 6) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      } else if (seg === 8) {
        setPuntero({ x: 80, y: 8, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 11) {
        setPuntero({ x: 50, y: 34, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 15) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      }
    }

    // --- ACCIONES EN CAPÍTULO 6: AJUSTES (17s) ---
    if (capId === 6) {
      if (seg === 3) {
        setPuntero({ x: 50, y: 15, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 5) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      } else if (seg === 7) {
        setPuntero({ x: 50, y: 30, visible: true, pulsando: true });
        sonidoTap();
        setHorarioAvisoEditado(true);
      } else if (seg === 10) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      } else if (seg === 12) {
        setPuntero({ x: 50, y: 44, visible: true, pulsando: true });
        sonidoTap();
      } else if (seg === 15) {
        setPuntero((p) => ({ ...p, visible: false, pulsando: false }));
      }
    }
  }, []);

  // Reloj y despacho del timeline mediante timer asíncrono limpio
  useEffect(() => {
    if (!reproduciendo) return;
    timerCapituloRef.current = setInterval(() => {
      const siguienteSeg = segundoCapituloRef.current + 1;
      segundoCapituloRef.current = siguienteSeg;
      setSegundoCapitulo(siguienteSeg);
      despacharTimeline(capituloActualRef.current, siguienteSeg);

      // Si la voz está apagada (Mute) o no hay síntesis, el timer comanda el avance al llegar a la duración.
      // Si la voz está activa, utt.onend se encarga de avanzar con exclusión mutua (avanzandoRef).
      // Watchdog de 4s extra por si el motor de voz se cuelga silenciosamente sin disparar onend.
      const vozApagadaOSinSoporte =
        !conVozRef.current ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window);

      if (vozApagadaOSinSoporte && siguienteSeg >= duracionCapituloRef.current) {
        avanzarOSalir(capituloActualRef.current);
      } else if (conVozRef.current && siguienteSeg >= duracionCapituloRef.current + 4) {
        avanzarOSalir(capituloActualRef.current);
      }
    }, 1000 / velocidad);

    return () => {
      if (timerCapituloRef.current) clearInterval(timerCapituloRef.current);
    };
  }, [reproduciendo, velocidad, despacharTimeline, avanzarOSalir]);

  // Al desmontar o cerrar, limpiar recursos
  useEffect(() => {
    if (!abierto) {
      detenerVoz();
    }
  }, [abierto, detenerVoz]);

  const cerrar = () => {
    sonidoTap();
    detenerVoz();
    setReproduciendo(false);
    onCerrar();
  };

  useBloqueoModal({ abierto, onCerrar: cerrar });

  if (!abierto || typeof document === "undefined") return null;

  const progresoGlobalPorcentaje = Math.min(100, (tiempoGlobalActual / duracionTotal) * 100);

  const formatoMinutos = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = Math.round(seg % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Frases de subtítulos troceadas dinámicamente para acompañar la voz sin tapar la pantalla
  const frasesSubtitulos =
    capitulo.guionVoz.match(/[^.?!]+[.?!]+(?:\s+|$)|[^.?!]+$/g)?.map((f) => f.trim()).filter(Boolean) ?? [
      capitulo.guionVoz,
    ];
  const fraccionCapitulo = capitulo.duracionEstimadaSeg > 0 ? segundoCapitulo / capitulo.duracionEstimadaSeg : 0;
  const indiceFrase = Math.min(
    frasesSubtitulos.length - 1,
    Math.floor(fraccionCapitulo * frasesSubtitulos.length),
  );
  const fraseSubtituloActual = frasesSubtitulos[indiceFrase] ?? capitulo.guionVoz;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-guia"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* CONTENEDOR PRINCIPAL CON PROPORCIÓN DE MÓVIL Y ALTURA EN DVH */}
      <div className="relative flex flex-col w-full max-w-[390px] h-[90dvh] max-h-[760px] rounded-[36px] bg-neutral-950 text-white shadow-2xl overflow-hidden border-2 border-white/20">
        
        {/* CABECERA SUPERIOR LIMPIA CON INDICADOR Y BOTÓN CERRAR */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <div className="flex items-center gap-1.5">
              <span id="titulo-guia" className="text-xs font-bold text-white tracking-wide">
                Isaac te enseña la app
              </span>
              <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-400">
                VÍDEO GUÍA
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Cerrar vídeo"
          >
            <X size={18} />
          </button>
        </div>

        {/* PANTALLA DEL SMARTPHONE (CHASIS MODERNO CON NOTCH Y PANTALLA REAL) */}
        <div className="relative flex-1 bg-bg flex flex-col overflow-hidden select-none text-ink">
          
          {/* Dynamic Island / Notch superior con píldora roja iOS de grabación activa */}
          <div className="relative z-30 flex items-center justify-between px-5 pt-1.5 pb-1 text-[11px] font-semibold text-muted bg-bg shrink-0">
            <span className="font-mono text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 tracking-tight">
              09:41
            </span>
            {/* Dynamic Island */}
            <div className="flex h-4 w-20 items-center justify-center rounded-full bg-black shadow-xs">
              <span className="h-2 w-2 rounded-full bg-neutral-800" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted font-medium">
              <span>5G</span>
              <span>100% 🔋</span>
            </div>
          </div>

          {/* CUERPO INTERNO CON RENDERIZADO PIXEL-PERFECT DE CADA PESTAÑA */}
          <div className="relative flex-1 overflow-y-auto px-3.5 py-2 flex flex-col gap-2.5 text-xs bg-bg">
            
            {/* --- PESTAÑA 1: HOY --- */}
            {capitulo.id === 1 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
                {/* Cabecera */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted">Lunes, 26 de octubre</p>
                    <h3 className="text-sm font-bold text-ink">¡Hola Isaac! 👋</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={[
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition duration-300",
                        rachaBrillando
                          ? "bg-amber-500 text-white shadow-md scale-105"
                          : "bg-amber-500/15 text-amber-600",
                      ].join(" ")}
                    >
                      <Flame size={13} className="fill-current" /> 3 días
                    </span>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                      ⭐ 45 pts
                    </span>
                  </div>
                </div>

                {/* Anillo de Calorías con aritmética exacta: 1.250 + 420 = 1.670 kcal */}
                <div className="flex flex-col items-center justify-center rounded-2xl bg-surface p-3 border border-border shadow-2xs">
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-border"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-accent transition-all duration-700"
                        strokeDasharray={platoAnotadoHoy ? "90, 100" : "68, 100"}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                      <span className="text-base font-extrabold text-ink leading-none">
                        {platoAnotadoHoy ? "1.670" : "1.250"}
                      </span>
                      <span className="text-[9px] text-muted font-medium">/ 1.850 kcal</span>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-ink">
                    Te quedan <strong>{platoAnotadoHoy ? "180" : "600"} kcal</strong> para hoy
                  </p>
                  <span className="mt-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                    🎯 Objetivo: Adelgazar
                  </span>
                </div>

                {/* Botón Anotar Comida */}
                <div
                  className={[
                    "flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-on-accent shadow-xs transition duration-200",
                    puntero.pulsando && puntero.y < 60 ? "scale-95 bg-accent/90" : "",
                  ].join(" ")}
                >
                  <Plus size={15} />
                  <span>Anotar comida · Foto IA o texto</span>
                  <Camera size={13} className="ml-0.5 opacity-80" />
                </div>

                {/* Hoja desplegable simulada de Foto IA */}
                {hojaFotoAbierta && (
                  <div className="absolute inset-x-2 bottom-12 z-40 rounded-2xl bg-surface p-3.5 shadow-2xl border-2 border-accent animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border">
                      <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <Camera size={14} className="text-accent" /> Cámara IA de comida
                      </span>
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-bold text-accent">
                        {fotoAnalizada ? "✓ Identificado" : "Analizando plato..."}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 py-2">
                      <div className="h-12 w-14 rounded-xl bg-neutral-800 flex items-center justify-center text-lg text-white border border-white/20 shrink-0">
                        🍛
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-ink">Pechuga con arroz y verduras</p>
                        <p className="text-[10px] text-emerald-600 font-bold">+420 kcal · 38g Proteína</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-accent py-1 text-center text-[10px] font-bold text-on-accent">
                      Añadiendo a Comida de hoy...
                    </div>
                  </div>
                )}

                {/* Comidas anotadas con coherencia matemática exacta */}
                <div className="flex flex-col gap-1 rounded-xl bg-surface p-2 border border-border">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-ink">Comidas de hoy</span>
                    <span className="text-muted text-[10px] font-semibold">
                      {platoAnotadoHoy ? "1.670 kcal" : "1.250 kcal"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted bg-bg p-1.5 rounded-lg">
                    <span>☕ Desayuno · Tostada con pavo</span>
                    <span className="text-emerald-600 font-bold">380 kcal</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted bg-bg p-1.5 rounded-lg">
                    <span>🥗 Comida · Lentejas con arroz</span>
                    <span className="text-emerald-600 font-bold">870 kcal</span>
                  </div>
                  {platoAnotadoHoy && (
                    <div className="flex items-center justify-between text-[10px] text-ink font-semibold bg-accent-soft p-1.5 rounded-lg animate-in fade-in duration-300">
                      <span>🍛 Cena · Pechuga con arroz</span>
                      <span className="text-accent font-bold">+420 kcal</span>
                    </div>
                  )}
                </div>

                {/* Registro de agua idéntico al de producción */}
                <div className="flex flex-col gap-1.5 rounded-xl bg-surface p-2.5 border border-border">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-ink text-[11px]">Agua</span>
                    <span className="text-[10px] text-muted font-medium">
                      {aguaSimulada.toFixed(2).replace(".", ",")} L de 2,5 L
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${Math.min(100, (aguaSimulada / 2.5) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[9px] text-muted">Suma lo que bebas:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-lg bg-bg px-2 py-0.5 text-[9px] font-bold text-muted border border-border">
                        −0,25 L
                      </span>
                      <span
                        className={[
                          "rounded-lg px-2 py-0.5 text-[9px] font-bold transition duration-200 border",
                          puntero.pulsando && puntero.y > 60 && puntero.y < 70
                            ? "bg-accent text-on-accent border-accent scale-95"
                            : "bg-bg text-ink border-border",
                        ].join(" ")}
                      >
                        +0,25 L
                      </span>
                      <span className="rounded-lg bg-bg px-2 py-0.5 text-[9px] font-bold text-muted border border-border">
                        +0,5 L
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- PESTAÑA 2: PROGRESO --- */}
            {capitulo.id === 2 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted">Báscula y grasa real</p>
                    <h3 className="text-sm font-bold text-ink">Progreso de peso</h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    📉 -0,5 kg / sem
                  </span>
                </div>

                {/* Tarjeta de peso actual */}
                <div className="flex items-center justify-between rounded-2xl bg-surface p-3 border border-border">
                  <div>
                    <span className="text-[10px] text-muted">Báscula en ayunas hoy</span>
                    <p className="text-xl font-black text-ink">74,2 <span className="text-xs font-normal">kg</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted">Ritmo semanal</span>
                    <p className="text-xs font-bold text-emerald-600">-500 g de grasa</p>
                  </div>
                </div>

                {/* Gráfica con tendencia suavizada continua */}
                <div className="flex flex-col gap-1 rounded-2xl bg-surface p-3 border border-border">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-ink">Tendencia suavizada</span>
                    <span className="text-emerald-500 font-bold">Línea continua</span>
                  </div>
                  <div className="relative h-24 w-full bg-bg rounded-xl p-2 flex items-end justify-between overflow-hidden border border-border">
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 50">
                      <path
                        d="M 5,12 Q 30,22 55,28 T 95,40"
                        fill="none"
                        stroke="rgb(16, 185, 129)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Puntos diarios de pesadas */}
                    <span className="z-10 h-2 w-2 rounded-full bg-neutral-400 mb-9 ml-1" />
                    <span className="z-10 h-2 w-2 rounded-full bg-neutral-400 mb-6" />
                    <span className="z-10 h-2 w-2 rounded-full bg-neutral-400 mb-8" />
                    <span className="z-10 h-2 w-2 rounded-full bg-neutral-400 mb-4" />
                    <span className="z-10 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300 mb-2 mr-1" />
                  </div>
                  <p className="text-[10px] text-muted italic mt-1 leading-tight">
                    💡 La línea verde filtra los líquidos del día anterior y te enseña la grasa que bajas de verdad.
                  </p>
                </div>
              </div>
            )}

            {/* --- PESTAÑA 3: PLAN --- */}
            {capitulo.id === 3 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted">Menú semanal fácil</p>
                    <h3 className="text-sm font-bold text-ink">Plan de Comidas</h3>
                  </div>
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    7 días listos
                  </span>
                </div>

                {/* Días L M X J V S D */}
                <div className="flex justify-between gap-1">
                  {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                    <span
                      key={d}
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold",
                        i === 0 ? "bg-accent text-on-accent" : "bg-surface text-muted border border-border",
                      ].join(" ")}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Plato interactivo que cambia al tocar */}
                <div className="flex flex-col gap-1.5 rounded-2xl bg-surface p-3 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-accent">Almuerzo de hoy</span>
                    <span className="text-[10px] text-muted">{PLATOS_SIMULADOS[indicePlatoPlan].kcal} kcal</span>
                  </div>
                  <p className="text-xs font-bold text-ink leading-tight transition-all duration-200">
                    {PLATOS_SIMULADOS[indicePlatoPlan].nombre}
                  </p>
                  <p className="text-[10px] text-muted">{PLATOS_SIMULADOS[indicePlatoPlan].desc}</p>
                  
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <button
                      type="button"
                      className={[
                        "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition duration-150 border",
                        puntero.pulsando && puntero.y < 65
                          ? "bg-accent text-on-accent border-accent scale-95"
                          : "bg-bg text-ink border-border",
                      ].join(" ")}
                    >
                      <RefreshCw size={11} className={puntero.pulsando ? "animate-spin" : ""} />
                      <span>Cambiar por otro plato</span>
                    </button>
                    <span className="text-[9px] text-emerald-600 font-bold">Mismas kcal</span>
                  </div>
                </div>

                {/* Lista de la compra */}
                <div className="flex items-center justify-between rounded-xl bg-surface p-2.5 border border-border">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={15} className="text-blue-500" />
                    <div>
                      <p className="text-[11px] font-bold text-ink">Lista de la compra</p>
                      <p className="text-[9px] text-muted">Ingredientes exactos de la semana</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                    Sync casa ✓
                  </span>
                </div>
              </div>
            )}

            {/* --- PESTAÑA 4: ENTRENO --- */}
            {capitulo.id === 4 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted">Fuerza y tono</p>
                    <h3 className="text-sm font-bold text-ink">Rutina de hoy</h3>
                  </div>
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                    Día 1 de 3
                  </span>
                </div>

                {/* Selector Casa / Gimnasio */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 border border-border text-center text-[10px] font-bold">
                  <span className="rounded-lg bg-accent text-on-accent py-1">🏠 En casa</span>
                  <span className="py-1 text-muted">🏋️ En gimnasio</span>
                </div>

                {/* Ejercicios */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between rounded-xl bg-surface p-2 border border-border">
                    <div>
                      <p className="text-[11px] font-bold text-ink">1. Sentadillas con rebote</p>
                      <p className="text-[10px] text-muted">3 series × 12 reps</p>
                    </div>
                    <span className="rounded-full bg-emerald-500 text-white p-1">
                      <Check size={11} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-surface p-2 border border-border">
                    <div>
                      <p className="text-[11px] font-bold text-ink">2. Flexiones en suelo</p>
                      <p className="text-[10px] text-muted">3 series × 10 reps</p>
                    </div>
                    <span
                      className={[
                        "rounded-full p-1 transition duration-200",
                        ejercicio2Hecho ? "bg-emerald-500 text-white" : "bg-bg border border-border text-muted",
                      ].join(" ")}
                    >
                      {ejercicio2Hecho ? <Check size={11} /> : <Plus size={11} />}
                    </span>
                  </div>
                </div>

                {/* Cronómetro que solo descuenta al completar el ejercicio */}
                <div className="flex items-center justify-between rounded-xl bg-rose-500/10 p-2.5 border border-rose-500/20 text-rose-900 dark:text-rose-200">
                  <div className="flex items-center gap-1.5">
                    <Timer size={14} className={ejercicio2Hecho ? "text-rose-500 animate-spin" : "text-rose-400"} />
                    <span className="font-bold text-[11px]">
                      {ejercicio2Hecho ? `Descanso automático: ${segundosDescanso}s` : "Descanso preparado: 45s"}
                    </span>
                  </div>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-300">
                    {ejercicio2Hecho ? "En curso ⏱️" : "Listo"}
                  </span>
                </div>
              </div>
            )}

            {/* --- PESTAÑA 5: FAMILIA --- */}
            {capitulo.id === 5 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted">Reto conjunto</p>
                    <h3 className="text-sm font-bold text-ink">Familia Ruiz</h3>
                  </div>
                  <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                    Código: CASA24
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 rounded-2xl bg-surface p-3 border border-border">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-ink">Kilos bajados juntos</span>
                    <span className="font-black text-purple-600">14,2 kg / 20 kg</span>
                  </div>
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full w-[71%]" />
                  </div>
                  <p className="text-[9px] text-muted">🔒 Tu peso diario sigue privado: el grupo solo suma el total.</p>
                </div>

                <div className="flex flex-col gap-1 rounded-xl bg-surface p-2 border border-border text-[10px]">
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span className="font-bold text-ink">Isaac (Tú)</span>
                    <span className="text-amber-500 font-bold">🔥 3 días</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-bold text-ink">Ainhoa</span>
                    <span className="text-amber-500 font-bold">🔥 5 días</span>
                  </div>
                </div>
              </div>
            )}

            {/* --- PESTAÑA 6: AJUSTES --- */}
            {capitulo.id === 6 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted">Preferencias</p>
                    <h3 className="text-sm font-bold text-ink">Ajustes</h3>
                  </div>
                  <span className="rounded-full bg-neutral-500/15 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                    {VERSION_APP}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface p-2.5 border border-border">
                  <div>
                    <span className="text-[10px] text-muted">Objetivo actual</span>
                    <p className="text-xs font-bold text-ink">🎯 Adelgazar (-0,5 kg/sem)</p>
                  </div>
                  <span className="text-[10px] text-accent font-bold">Cambiar</span>
                </div>

                <div className="flex flex-col gap-1.5 rounded-xl bg-surface p-2.5 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink">Tus horas de comida (avisos)</span>
                    <span className="text-[9px] text-emerald-600 font-bold">
                      {horarioAvisoEditado ? "✓ Actualizado" : "✓ Activo"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                    <div className="rounded bg-bg p-1 border border-border">
                      <span className="text-[9px] text-muted block">Desayuno</span>
                      <strong className="text-ink">08:30</strong>
                    </div>
                    <div
                      className={[
                        "rounded p-1 border transition duration-200",
                        horarioAvisoEditado
                          ? "bg-accent-soft border-accent text-accent"
                          : "bg-bg border-border text-ink",
                      ].join(" ")}
                    >
                      <span className="text-[9px] text-muted block">Comida</span>
                      <strong className="text-ink">14:00</strong>
                    </div>
                    <div className="rounded bg-bg p-1 border border-border">
                      <span className="text-[9px] text-muted block">Cena</span>
                      <strong className="text-ink">21:00</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface p-2 border border-border text-[10px]">
                  <span className="text-muted">Copia de seguridad en la nube</span>
                  <span className="text-emerald-600 font-bold">Sincronizado ✓</span>
                </div>
              </div>
            )}
          </div>

          {/* PUNTERO TÁCTIL FLUIDO CON RIPPLE DE UN SOLO PULSO */}
          {puntero.visible && (
            <div
              className="pointer-events-none absolute z-50 flex items-center gap-1.5 transition-all duration-500 ease-out"
              style={{
                left: `${puntero.x}%`,
                top: `${puntero.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="relative flex items-center justify-center">
                {puntero.pulsando && (
                  <span className="absolute h-10 w-10 rounded-full bg-accent/40 animate-ping duration-500" />
                )}
                <div
                  className={[
                    "h-7 w-7 rounded-full border-2 border-white bg-white/70 shadow-xl backdrop-blur-xs flex items-center justify-center transition-transform duration-200",
                    puntero.pulsando ? "scale-75 bg-accent/80" : "scale-100",
                  ].join(" ")}
                >
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>
              </div>
            </div>
          )}

          {/* BARRA INFERIOR DE PESTAÑAS IDÉNTICA A LA APP */}
          <nav className="border-t border-border bg-bg px-1 py-1 shrink-0">
            <div className="flex items-stretch justify-around">
              {CAPITULOS.map((item) => {
                const activa = item.id === capituloActual;
                const IconoNav = item.icono;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => irACapitulo(item.id, reproduciendo)}
                    className={[
                      "flex flex-1 flex-col items-center gap-0.5 py-0.5 text-[10px] transition-all",
                      activa ? "text-accent font-bold" : "text-muted opacity-70 hover:opacity-100",
                    ].join(" ")}
                  >
                    <IconoNav size={16} strokeWidth={activa ? 2.5 : 1.8} className={activa ? "-translate-y-0.5" : ""} />
                    <span>{item.pestana}</span>
                  </button>
                );
              })}
            </div>
            {/* Home indicator bar (iPhone / Android) */}
            <div className="mt-1 h-1 w-24 rounded-full bg-ink/20 mx-auto" />
          </nav>

          {/* OVERLAY PLAY CENTRAL SI ESTÁ PAUSADO */}
          {!reproduciendo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] z-30">
              <button
                type="button"
                onClick={alternarPlay}
                className="group/btn flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl transition duration-200 hover:scale-110 active:scale-95"
                aria-label="Darle al Play"
              >
                <Play size={28} className="fill-current ml-1" />
              </button>
              <p className="mt-2.5 text-xs font-bold text-white shadow-md bg-black/60 px-3 py-1 rounded-full border border-white/10">
                Dale al Play para escuchar a Isaac
              </p>
            </div>
          )}

          {/* SUBTÍTULOS OVERLAY FLOTANTE DINÁMICO TIPO REEL/TIKTOK */}
          {conSubtitulos && (
            <div className="absolute inset-x-3 bottom-12 z-20 rounded-xl bg-black/85 px-3 py-1.5 text-center text-[11px] font-medium text-white shadow-lg border border-white/15 backdrop-blur-md transition-all duration-300">
              <span className="text-red-400 mr-1.5 font-bold">[{capitulo.pestana}]</span>
              {reproduciendo ? fraseSubtituloActual : "Pulsa Play para que Isaac te enseñe su app"}
            </div>
          )}
        </div>

        {/* CONTROLES YOUTUBE INFERIORES COMPACTOS */}
        <div className="relative z-30 flex flex-col bg-neutral-950 px-3 pt-2 pb-2 border-t border-white/10 shrink-0">
          {/* Scrubber rojo */}
          <div
            className="relative mb-2 flex h-2 w-full cursor-pointer items-center rounded-full bg-white/20"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              const targetTime = pos * duracionTotal;
              let acum = 0;
              for (const c of CAPITULOS) {
                if (targetTime <= acum + c.duracionEstimadaSeg) {
                  irACapitulo(c.id, reproduciendo);
                  break;
                }
                acum += c.duracionEstimadaSeg;
              }
            }}
          >
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-200 relative"
              style={{ width: `${progresoGlobalPorcentaje}%` }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-xs" />
            </div>
          </div>

          {/* Controles de reproducción */}
          <div className="flex items-center justify-between text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={alternarPlay}
                className="rounded-md p-1 hover:text-white transition active:scale-95 text-white"
                aria-label={reproduciendo ? "Pausar" : "Reproducir"}
              >
                {reproduciendo ? <Pause size={17} className="fill-current" /> : <Play size={17} className="fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  sonidoTap();
                  if (capituloActual > 1) irACapitulo(capituloActual - 1, reproduciendo);
                }}
                disabled={capituloActual === 1}
                className="rounded-md p-1 hover:text-white transition active:scale-95 disabled:opacity-30 text-[11px] font-bold"
              >
                -Ant
              </button>
              <button
                type="button"
                onClick={() => {
                  sonidoTap();
                  if (capituloActual < CAPITULOS.length) irACapitulo(capituloActual + 1, reproduciendo);
                }}
                disabled={capituloActual === CAPITULOS.length}
                className="rounded-md p-1 hover:text-white transition active:scale-95 disabled:opacity-30 text-[11px] font-bold"
              >
                +Sig
              </button>
              <span className="text-[11px] text-neutral-400 font-mono ml-1">
                {formatoMinutos(tiempoGlobalActual)} / {formatoMinutos(duracionTotal)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Voz silenciar */}
              <button
                type="button"
                onClick={() => {
                  sonidoTap();
                  const nuevo = !conVoz;
                  setConVoz(nuevo);
                  if (!nuevo) detenerVoz();
                  else if (reproduciendo) hablar(capitulo, velocidad, nuevo);
                }}
                className={`rounded-md p-1 transition ${conVoz ? "text-white" : "text-neutral-500"}`}
                title={conVoz ? "Silenciar voz" : "Activar voz"}
              >
                {conVoz ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Subtítulos */}
              <button
                type="button"
                onClick={() => setConSubtitulos(!conSubtitulos)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${conSubtitulos ? "border-red-500 text-red-400 bg-red-500/10" : "border-white/20 text-neutral-400"}`}
              >
                CC
              </button>

              {/* Velocidad */}
              <button
                type="button"
                onClick={() => {
                  sonidoTap();
                  const n = velocidad === 1 ? 1.25 : 1;
                  setVelocidad(n);
                  if (reproduciendo) hablar(capitulo, n);
                }}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold border border-white/20 text-neutral-300 hover:text-white"
              >
                {velocidad}x
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body,
  );
}
