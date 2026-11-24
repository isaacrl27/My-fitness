"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Watch,
  Heart,
  Check,
  RefreshCw,
  Sparkles,
  Footprints,
  Moon,
  Info,
} from "lucide-react";
import { useDatos } from "@/lib/store";
import { hoyISO } from "@/lib/calculos";
import {
  esAppNativa,
  leerSaludUltimosDias,
  pedirPermisoSalud,
} from "@/lib/salud-nativa";
import { sonidoCheck, sonidoTap, sonidoExito } from "@/lib/sonido";
import { vibrarCheck, vibrarTap, vibrarExito } from "@/lib/haptica";
import { useBloqueoModal } from "@/lib/use-modal";

interface ModalRelojSaludProps {
  abierto: boolean;
  onCerrar: () => void;
  marcaInicial?: MarcaReloj;
}

type MarcaReloj = "apple" | "samsung" | "garmin" | "xiaomi" | "movil";

function formatearHorasSueno(horas: number): string {
  return (Math.round(horas * 100) / 100).toString().replace(".", ",");
}

export function ModalRelojSalud({ abierto, onCerrar, marcaInicial }: ModalRelojSaludProps) {
  const { saludDiaria, ponerSalud, ponerSaludLote } = useDatos();
  const [marca, setMarca] = useState<MarcaReloj>(() => {
    if (marcaInicial) return marcaInicial;
    if (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) return "samsung";
    return "apple";
  });
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function cerrar() {
    sonidoTap();
    vibrarTap();
    onCerrar();
  }

  useBloqueoModal({ abierto, onCerrar: cerrar });

  const hoy = hoyISO();
  const saludHoy = saludDiaria?.[hoy];
  const nativa = typeof window !== "undefined" && esAppNativa();

  if (!abierto || typeof document === "undefined") return null;

  async function sincronizarNativo() {
    sonidoTap();
    vibrarTap();
    setSincronizando(true);
    setMensaje(null);

    const permiso = await pedirPermisoSalud();
    if (!permiso) {
      setSincronizando(false);
      setMensaje("No se pudo obtener permiso de Salud del móvil.");
      return;
    }

    const lote = await leerSaludUltimosDias(7);
    const dias = Object.keys(lote).length;
    if (dias > 0) {
      sonidoExito();
      vibrarExito();
      ponerSaludLote(lote);
      setMensaje(`¡Sincronizado! Se han traído ${dias} días de pasos y sueño de tu reloj.`);
    } else {
      setMensaje("Conectado con Salud, pero no hay pasos ni sueño registrados aún en los últimos 7 días.");
    }
    setSincronizando(false);
    setTimeout(() => setMensaje(null), 4000);
  }

  function fijarPasosRapidos(pasos: number) {
    sonidoCheck();
    vibrarCheck();
    ponerSalud(hoy, { pasos });
    setMensaje(`✓ Pasos de hoy guardados: ${pasos.toLocaleString("es-ES")} pasos.`);
    setTimeout(() => setMensaje(null), 3000);
  }

  function fijarSuenoRapido(suenoHoras: number) {
    sonidoCheck();
    vibrarCheck();
    ponerSalud(hoy, { suenoHoras });
    setMensaje(`✓ Sueño de anoche guardado: ${formatearHorasSueno(suenoHoras)} horas.`);
    setTimeout(() => setMensaje(null), 3000);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-reloj"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-pop text-left">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent shadow-xs">
              <Watch size={20} />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id="titulo-reloj" className="text-base font-bold text-ink leading-tight">
                  Conectar Reloj o Pulsera
                </h2>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">
                  Pasos y Sueño
                </span>
              </div>
              <p className="text-xs text-muted">Apple Watch, Samsung, Garmin, Xiaomi y Wear OS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-full p-2 text-muted hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notificación temporal */}
        {mensaje ? (
          <div className="bg-accent text-on-accent px-4 py-2 text-xs font-bold text-center animate-in fade-in duration-200">
            {mensaje}
          </div>
        ) : null}

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Tarjeta de sincronización directa si estamos en app instalada con Capacitor */}
          {nativa ? (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart size={18} className="text-accent" />
                  <span className="text-xs font-bold text-ink">Sistema de Salud Nativo Activo</span>
                </div>
                <span className="rounded-full bg-accent text-on-accent px-2 py-0.5 text-[10px] font-bold">
                  Automático
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Tu móvil tiene acceso a Apple Health o Google Health Connect. Tu reloj vuelca los pasos y sueño directamente aquí.
              </p>
              <button
                type="button"
                onClick={sincronizarNativo}
                disabled={sincronizando}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-on-accent shadow-xs active:scale-95 transition"
              >
                <RefreshCw size={14} className={sincronizando ? "animate-spin" : ""} />
                <span>{sincronizando ? "Leyendo tu reloj…" : "Sincronizar pasos y sueño ahora"}</span>
              </button>
            </div>
          ) : null}

          {/* Estado de hoy */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-bg/50 p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border text-ink">
                <Footprints size={18} className="text-accent" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Pasos de hoy</span>
                <p className="text-base font-black text-ink leading-tight">
                  {saludHoy?.pasos ? `${saludHoy.pasos.toLocaleString("es-ES")} pasos` : "Sin anotar"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-border/80 pl-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border text-ink">
                <Moon size={18} className="text-indigo-500" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Sueño anoche</span>
                <p className="text-base font-black text-ink leading-tight">
                  {saludHoy?.suenoHoras ? `${formatearHorasSueno(saludHoy.suenoHoras)} h` : "Sin anotar"}
                </p>
              </div>
            </div>
          </div>

          {/* Atajos de 1 toque (perfecto para web/PWA) */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Anotar a 1 toque (sin escribir)
                </h3>
              </div>
              <span className="text-2xs text-muted">Suma puntos</span>
            </div>

            <div>
              <span className="mb-1.5 block text-2xs font-bold text-muted">Pasos aproximados de tu reloj:</span>
              <div className="grid grid-cols-4 gap-2">
                {[4000, 7000, 10000, 12000].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => fijarPasosRapidos(p)}
                    className="rounded-xl border border-border bg-bg/60 py-2 text-xs font-bold text-ink transition active:scale-95 hover:border-accent hover:text-accent"
                  >
                    {p >= 1000 ? `${p / 1000}k` : p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-2xs font-bold text-muted">Horas de sueño de anoche:</span>
              <div className="grid grid-cols-4 gap-2">
                {[6, 7, 7.5, 8].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => fijarSuenoRapido(h)}
                    className="rounded-xl border border-border bg-bg/60 py-2 text-xs font-bold text-ink transition active:scale-95 hover:border-accent hover:text-accent"
                  >
                    {formatearHorasSueno(h)} h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guía interactiva paso a paso según tu marca de reloj */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Info size={14} className="text-muted" />
              <span>Cómo enlaza tu reloj con el móvil</span>
            </h3>

            {/* Chips de marcas */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {[
                { id: "apple" as const, etiqueta: "Apple Watch" },
                { id: "samsung" as const, etiqueta: "Galaxy / Wear OS" },
                { id: "garmin" as const, etiqueta: "Garmin" },
                { id: "xiaomi" as const, etiqueta: "Xiaomi / Amazfit" },
                { id: "movil" as const, etiqueta: "Sin reloj (Móvil)" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    sonidoTap();
                    vibrarTap();
                    setMarca(m.id);
                  }}
                  className={[
                    "shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95",
                    marca === m.id
                      ? "bg-ink text-surface shadow-2xs"
                      : "border border-border bg-surface text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>

            {/* Explicación de la marca elegida */}
            <div className="rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-ink/90 flex flex-col gap-2.5">
              {marca === "apple" && (
                <>
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span>🍏</span>
                    <span>Apple Watch + iPhone</span>
                  </div>
                  <p>
                    Tu Apple Watch y tu iPhone cuentan tus pasos con Apple Salud. Conecta el atajo oficial para que entren solos cada día.
                  </p>
                  <a
                    href="https://www.icloud.com/shortcuts/315e8bfc4a6944aeadd440a6c19ac2dc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-on-accent shadow-xs active:scale-95 transition"
                  >
                    <span>🍏 Instalar Atajo Apple Salud (1 toque)</span>
                  </a>
                  <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2 text-2xs text-muted">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>Al pulsar, tu iPhone abre Atajos y le das a «Añadir atajo».</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>Para que vaya 100% automático: en Atajos → Automatización → nueva a las 23:00 con «Ejecutar inmediatamente».</span>
                    </div>
                  </div>
                </>
              )}

              {marca === "samsung" && (
                <>
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span>⌚</span>
                    <span>Samsung Galaxy Watch o reloj con Wear OS</span>
                  </div>
                  <p>
                    En Android, los relojes sincronizan con <strong>Health Connect de Google</strong>. Tu reloj envía los pasos a Samsung Health o Google Fit, y entran solos a My Fitness.
                  </p>
                  {!nativa && (
                    <a
                      href="/descargas/my-fitness-android.apk"
                      download
                      className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-on-accent shadow-xs active:scale-95 transition"
                    >
                      <span>🤖 Descargar app para Android (Conexión 1 toque)</span>
                    </a>
                  )}
                  <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2 text-2xs text-muted">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>Con la app instalada: tocas «Sincronizar Salud» en Ajustes y le das a Permitir.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>Abre Samsung Health &gt; Ajustes &gt; Health Connect &gt; Activar compartir datos.</span>
                    </div>
                  </div>
                </>
              )}

              {marca === "garmin" && (
                <>
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span>🏃</span>
                    <span>Garmin Connect (Forerunner, Fenix, Venu...)</span>
                  </div>
                  <p>
                    Garmin se enlaza directamente con la app Salud del móvil (Apple Salud en iPhone o Health Connect en Android).
                  </p>
                  <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2 text-2xs text-muted">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>En la app Garmin Connect: Más (...) &gt; Configuración &gt; Aplicaciones conectadas &gt; Activa Apple Salud / Health Connect.</span>
                    </div>
                  </div>
                </>
              )}

              {marca === "xiaomi" && (
                <>
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span>⚡</span>
                    <span>Xiaomi Smart Band, Redmi Watch o Amazfit</span>
                  </div>
                  <p>
                    Las pulseras de Xiaomi y Amazfit usan las apps <strong>Mi Fitness</strong> o <strong>Zepp Life</strong>. Ambas tienen un interruptor para enviar pasos y sueño al sistema de salud.
                  </p>
                  <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2 text-2xs text-muted">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>En Zepp Life / Mi Fitness: Perfil &gt; Cuentas vinculadas &gt; Activa compartir con Salud.</span>
                    </div>
                  </div>
                </>
              )}

              {marca === "movil" && (
                <>
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <span>📱</span>
                    <span>Sin reloj: Tu propio móvil</span>
                  </div>
                  <p>
                    ¡No necesitas comprarte ningún reloj! Tanto los iPhone como la gran mayoría de móviles Android tienen sensores internos (podómetro) que cuentan tus pasos con solo llevar el móvil en el bolsillo o en el bolso.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pie modal */}
        <div className="border-t border-border/80 bg-surface px-5 py-3.5 flex items-center justify-between">
          <span className="text-2xs text-muted flex items-center gap-1.5">
            <Heart size={13} className="text-accent" />
            <span>Salud 100% privada</span>
          </span>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-surface active:scale-95"
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
