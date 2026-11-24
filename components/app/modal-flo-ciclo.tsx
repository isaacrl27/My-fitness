"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBloqueoModal } from "@/lib/use-modal";
import {
  X,
  Droplets,
  Calendar,
  Sparkles,
  Info,
  Plus,
  Minus,
  Scale,
  ShieldCheck,
  Check,
  Smartphone,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import { useDatos } from "@/lib/store";
import { hoyISO } from "@/lib/calculos";
import {
  calcularEstadoCiclo,
  cicloPorDefecto,
  sumarDiasISO,
  SINTOMAS_DISPONIBLES,
  FLUJOS_DISPONIBLES,
  type SintomaCiclo,
  type FlujoCiclo,
  type DatosCiclo,
  type ModoCiclo,
} from "@/lib/ciclo";
import { sonidoCheck, sonidoTap, sonidoExito } from "@/lib/sonido";
import { vibrarCheck, vibrarTap, vibrarExito } from "@/lib/haptica";

interface ModalFloCicloProps {
  abierto: boolean;
  onCerrar: () => void;
}

type PestanaFlo = "hoy" | "bascula" | "ajustes";

export function ModalFloCiclo({ abierto, onCerrar }: ModalFloCicloProps) {
  const { perfil, actualizarCicloMenstrual } = useDatos();
  const [pestana, setPestana] = useState<PestanaFlo>("hoy");
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  const hoy = hoyISO();
  const ciclo: DatosCiclo = perfil?.cicloMenstrual ?? cicloPorDefecto(hoy);
  const estado = calcularEstadoCiclo(ciclo, hoy);

  // Si la usuaria aún no ha elegido modo (Flo vs My Fitness), mostramos el selector interactivo
  const tieneModoPrevio = Boolean(perfil?.cicloMenstrual?.modo);
  const [eligiendoModo, setEligiendoModo] = useState(!perfil?.cicloMenstrual?.modo);

  // Asistente paso a paso "para tontos" para configurar el ciclo en My Fitness
  const [asistentePaso, setAsistentePaso] = useState<number | null>(null);
  const [fechaTemp, setFechaTemp] = useState<string>(() => ciclo.fechaUltimaRegla || sumarDiasISO(hoy, -14));
  const [durCicloTemp, setDurCicloTemp] = useState<number>(() => ciclo.duracionCiclo || 28);
  const [durReglaTemp, setDurReglaTemp] = useState<number>(() => ciclo.duracionRegla || 5);

  const cerrar = useCallback(() => {
    sonidoTap();
    vibrarTap();
    onCerrar();
  }, [onCerrar]);

  useBloqueoModal({
    abierto: abierto && perfil?.sexo !== "hombre",
    onCerrar: cerrar,
  });

  if (!abierto || typeof document === "undefined" || perfil?.sexo === "hombre") return null;

  function iniciarConfiguracionNativo() {
    sonidoTap();
    vibrarTap();
    setFechaTemp(ciclo.fechaUltimaRegla || sumarDiasISO(hoy, -14));
    setDurCicloTemp(ciclo.duracionCiclo || 28);
    setDurReglaTemp(ciclo.duracionRegla || 5);
    setAsistentePaso(1);
    setEligiendoModo(false);
  }

  function cambiarPestana(p: PestanaFlo) {
    sonidoTap();
    vibrarTap();
    setPestana(p);
  }

  function seleccionarModo(modo: ModoCiclo) {
    sonidoExito();
    vibrarExito();
    actualizarCicloMenstrual({
      activo: true,
      modo,
    });
    setEligiendoModo(false);
    setMensajeGuardado(
      modo === "nativo"
        ? "🌸 Modo My Fitness activado: seguimiento 100% privado en tu móvil."
        : "📲 Modo Flo activado: cuando te baje, apunta aquí el día y ya está.",
    );
    setTimeout(() => setMensajeGuardado(null), 3500);
  }

  function marcarReglaHoy() {
    sonidoExito();
    vibrarExito();
    actualizarCicloMenstrual({
      activo: true,
      fechaUltimaRegla: hoy,
    });
    setMensajeGuardado("¡Registrado! Día 1 de tu ciclo marcado hoy.");
    setTimeout(() => setMensajeGuardado(null), 3000);
  }

  function corregirReglaNoHoy() {
    sonidoTap();
    vibrarTap();
    const fechaAjustada = sumarDiasISO(hoy, -14);
    actualizarCicloMenstrual({
      activo: true,
      fechaUltimaRegla: fechaAjustada,
    });
    setMensajeGuardado("✓ Fecha actualizada: el ciclo se ha situado a mitad de fase (Día 15, sin regla).");
    setTimeout(() => setMensajeGuardado(null), 3500);
  }

  function alternarSintoma(sintomaId: SintomaCiclo) {
    sonidoCheck();
    vibrarCheck();
    const registroActual = ciclo.registroSintomas?.[hoy];
    const sintomasPrevios = registroActual?.sintomas ?? [];
    const yaEsta = sintomasPrevios.includes(sintomaId);
    const nuevosSintomas = yaEsta
      ? sintomasPrevios.filter((s) => s !== sintomaId)
      : [...sintomasPrevios, sintomaId];

    const nuevoRegistro = {
      sintomas: nuevosSintomas,
      flujo: registroActual?.flujo ?? "ninguno",
      anotado: new Date().toISOString(),
    };

    actualizarCicloMenstrual({
      registroSintomas: {
        ...(ciclo.registroSintomas ?? {}),
        [hoy]: nuevoRegistro,
      },
    });
  }

  function cambiarFlujo(flujo: FlujoCiclo) {
    sonidoCheck();
    vibrarCheck();
    const registroActual = ciclo.registroSintomas?.[hoy];
    const nuevoRegistro = {
      sintomas: registroActual?.sintomas ?? [],
      flujo,
      anotado: new Date().toISOString(),
    };

    actualizarCicloMenstrual({
      registroSintomas: {
        ...(ciclo.registroSintomas ?? {}),
        [hoy]: nuevoRegistro,
      },
    });
  }

  function ajustarDuracionCiclo(delta: number) {
    sonidoTap();
    vibrarTap();
    const actual = ciclo.duracionCiclo || 28;
    const nueva = Math.max(21, Math.min(42, actual + delta));
    actualizarCicloMenstrual({ duracionCiclo: nueva });
  }

  function ajustarDuracionRegla(delta: number) {
    sonidoTap();
    vibrarTap();
    const actual = ciclo.duracionRegla || 5;
    const nueva = Math.max(2, Math.min(10, actual + delta));
    actualizarCicloMenstrual({ duracionRegla: nueva });
  }

  const registroHoy = ciclo.registroSintomas?.[hoy];
  const sintomasHoy = registroHoy?.sintomas ?? [];
  const flujoHoy = registroHoy?.flujo ?? "ninguno";

  // Porcentaje del ciclo recorrido para el arco SVG
  const durCiclo = ciclo.duracionCiclo || 28;
  const diaCiclo = estado?.diaDelCiclo ?? 1;
  const porcentaje = Math.min(100, Math.round((diaCiclo / durCiclo) * 100));
  const circunferencia = 2 * Math.PI * 70; // radio 70
  const dashOffset = circunferencia - (porcentaje / 100) * circunferencia;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-flo"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-pop text-left">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {eligiendoModo && tieneModoPrevio ? (
              <button
                type="button"
                onClick={() => setEligiendoModo(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg border border-border text-ink hover:bg-surface active:scale-95"
                aria-label="Volver atrás"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 shadow-xs">
                <Droplets size={20} className="fill-current" />
              </span>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id="titulo-flo" className="text-base font-bold text-ink leading-tight">
                  {eligiendoModo ? "¿Cómo prefieres tu seguimiento?" : "Ciclo Menstrual"}
                </h2>
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  {ciclo.modo === "flo" ? "Flo · A mano" : ciclo.modo === "nativo" ? "My Fitness" : "Personalizar"}
                </span>
              </div>
              <p className="text-xs text-muted">
                {eligiendoModo
                  ? "Conecta con tu app Flo o gestiona todo aquí dentro"
                  : "Nutrición, báscula y energía adaptadas a tu cuerpo"}
              </p>
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

        {/* ASISTENTE PASO A PASO: Configuración ultra fácil del ciclo en My Fitness */}
        {asistentePaso !== null ? (
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white text-xs font-black">
                  {asistentePaso}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Paso {asistentePaso} de 2 · Configuración rápida
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAsistentePaso(null);
                  if (!perfil?.cicloMenstrual?.modo) setEligiendoModo(true);
                }}
                className="text-xs text-muted hover:text-ink font-semibold"
              >
                Cancelar
              </button>
            </div>

            {asistentePaso === 1 ? (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-ink">
                    ¿Cuándo te vino tu última regla?
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    No te preocupes por el día exacto: una fecha aproximada sirve para calibrar tus fases y avisarte en la báscula.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "🩸 Hoy mismo", sub: "Estoy con la regla", fecha: hoy },
                    { label: "📅 Hace 1 semana", sub: "Hace unos 7 días", fecha: sumarDiasISO(hoy, -7) },
                    { label: "📅 Hace 2 semanas", sub: "Mitad de ciclo (~14d)", fecha: sumarDiasISO(hoy, -14) },
                    { label: "📅 Hace 3 semanas", sub: "Antes de la regla (~21d)", fecha: sumarDiasISO(hoy, -21) },
                  ].map((op) => {
                    const activa = fechaTemp === op.fecha;
                    return (
                      <button
                        key={op.label}
                        type="button"
                        onClick={() => {
                          sonidoCheck();
                          vibrarCheck();
                          setFechaTemp(op.fecha);
                        }}
                        className={[
                          "flex flex-col items-start p-3 rounded-2xl border-2 text-left transition active:scale-95",
                          activa
                            ? "border-rose-500 bg-rose-500/10 text-ink shadow-xs dark:bg-rose-950/40"
                            : "border-border bg-bg/60 text-ink hover:border-border-input",
                        ].join(" ")}
                      >
                        <span className="text-xs font-bold text-ink">{op.label}</span>
                        <span className="text-[10px] text-muted mt-0.5">{op.sub}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-3.5">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Calendar size={14} className="text-rose-500" />
                    <span>O elige el día en el calendario:</span>
                  </span>
                  <input
                    type="date"
                    value={fechaTemp}
                    max={hoy}
                    onChange={(e) => setFechaTemp(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sonidoTap();
                    vibrarTap();
                    setAsistentePaso(2);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-rose-700"
                >
                  <span>Siguiente paso</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-ink">
                    ¿Cuánto suele durarte el ciclo?
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Días entre una regla y la siguiente (habitual: 28 días). Y cuántos días sangras (habitual: 5 días).
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-ink">Duración del ciclo completo:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[21, 24, 26, 28, 30, 32, 35, 40].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          sonidoCheck();
                          vibrarCheck();
                          setDurCicloTemp(d);
                        }}
                        className={[
                          "flex-1 min-w-[42px] py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 text-center",
                          durCicloTemp === d
                            ? "border-rose-500 bg-rose-600 text-white shadow-xs"
                            : "border-border bg-bg text-ink hover:border-border-input",
                        ].join(" ")}
                      >
                        {d}d {d === 28 ? "★" : ""}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-2xs text-muted">O escribe tus días exactos:</span>
                    <input
                      type="number"
                      min="15"
                      max="60"
                      value={durCicloTemp}
                      onChange={(e) => setDurCicloTemp(Math.max(15, Math.min(60, Number(e.target.value) || 28)))}
                      className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-xs font-bold text-ink text-center focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <span className="text-2xs text-muted">días</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-ink">Días de sangrado habitual:</span>
                  <div className="flex flex-wrap gap-2">
                    {[3, 4, 5, 6, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          sonidoCheck();
                          vibrarCheck();
                          setDurReglaTemp(d);
                        }}
                        className={[
                          "flex-1 min-w-[50px] py-2 rounded-xl border text-xs font-bold transition active:scale-95 text-center",
                          durReglaTemp === d
                            ? "border-rose-500 bg-rose-600 text-white shadow-xs"
                            : "border-border bg-bg text-ink hover:border-border-input",
                        ].join(" ")}
                      >
                        {d} días
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-200/70 bg-rose-50/50 p-4 text-xs text-ink/90 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <p className="font-bold text-rose-950 dark:text-rose-200 mb-1 flex items-center gap-1.5">
                    <Scale size={15} className="text-rose-600" />
                    <span>Cómo influye en tu báscula:</span>
                  </p>
                  <p className="leading-relaxed text-muted">
                    En los días previos a la regla y durante el sangrado, tu cuerpo retiene entre <strong>0,5 kg y 2 kg de agua</strong> por la progesterona. No es grasa y baja solo al terminar. My Fitness te lo avisará para que no te asustes.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAsistentePaso(1)}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-xs font-bold text-ink hover:bg-bg active:scale-95"
                  >
                    ← Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sonidoExito();
                      vibrarExito();
                      actualizarCicloMenstrual({
                        activo: true,
                        modo: "nativo",
                        fechaUltimaRegla: fechaTemp,
                        duracionCiclo: durCicloTemp,
                        duracionRegla: durReglaTemp,
                      });
                      setAsistentePaso(null);
                      setMensajeGuardado("🌸 ¡Listo! Tu ciclo se ha configurado perfectamente.");
                      setTimeout(() => setMensajeGuardado(null), 3500);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-rose-700"
                  >
                    <Check size={16} />
                    <span>Guardar y empezar seguimiento</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : eligiendoModo ? (
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            <div className="rounded-2xl border border-rose-200/60 bg-rose-50/40 p-4 text-xs text-ink/90 dark:border-rose-900/40 dark:bg-rose-950/20">
              <p className="leading-relaxed">
                El ciclo menstrual influye directamente en la retención de agua (<strong>+0,5 a 2 kg</strong> en la báscula) y en el apetito. ¿Cómo quieres que lo gestionemos?
              </p>
            </div>

            {/* Opción A: Seguimiento en My Fitness */}
            <div
              role="button"
              tabIndex={0}
              onClick={iniciarConfiguracionNativo}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") iniciarConfiguracionNativo();
              }}
              className="group relative flex flex-col gap-3 rounded-2xl border-2 border-rose-500/40 bg-gradient-to-b from-rose-50/60 via-surface to-surface p-5 text-left transition hover:border-rose-500 hover:shadow-md cursor-pointer dark:from-rose-950/30 dark:border-rose-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
                    <Sparkles size={20} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-ink">Seguimiento en My Fitness</h3>
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-muted">Todo integrado en tu día a día</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-ink/80 leading-relaxed">
                Nosotros nos encargamos de todo: cálculo de tus fases fértiles y lúteas, predicción exacta de retención de agua en tu báscula y consejos nutricionales adaptados.
              </p>

              <div className="flex flex-col gap-1.5 border-t border-rose-200/60 pt-3 text-2xs text-ink/90 dark:border-rose-900/50">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Configuración en 2 pasos guiada para empezar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>100% privado en tu móvil (jamás se comparte)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Anticipa la báscula para que no te desmotives</span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  iniciarConfiguracionNativo();
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 group-hover:bg-rose-700"
              >
                <span>Configurar seguimiento en My Fitness</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Opción B: Conectar con la app Flo */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => seleccionarModo("flo")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") seleccionarModo("flo");
              }}
              className="group relative flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface p-5 text-left transition hover:border-border-input hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg border border-border text-ink shadow-xs">
                    <Smartphone size={20} className="text-rose-500" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-ink">Sigo usando Flo</h3>
                      <span className="rounded-full bg-border/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                        A mano
                      </span>
                    </div>
                    <p className="text-xs text-muted">Mantén tu app Flo de siempre</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-ink/80 leading-relaxed">
                Si ya usas Flo y tienes ahí todo tu historial, sigue con él. My Fitness todavía no lee Flo solo: cuando te baje, apuntas el día aquí y las cuentas se ajustan igual. La lectura automática llegará con la app de iPhone.
              </p>

              <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 text-2xs text-muted">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Conserva tu historial previo de años en Flo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Tú apuntas el día de inicio aquí, en dos toques</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>My Fitness adapta báscula y calorías con esa fecha</span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  seleccionarModo("flo");
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg/60 px-4 py-2.5 text-xs font-bold text-ink shadow-2xs transition active:scale-95 group-hover:bg-bg"
              >
                <span>Usar Flo y apuntar el día aquí</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <p className="text-center text-2xs text-muted">
              Puedes cambiar esta elección cuando quieras desde la pestaña de Ajustes del ciclo.
            </p>
          </div>
        ) : (
          <>
            {/* Pestañas superiores */}
            <div className="grid grid-cols-3 border-b border-border/60 bg-bg/50 px-2 py-1.5 text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => cambiarPestana("hoy")}
                className={[
                  "rounded-xl py-2 transition-all",
                  pestana === "hoy"
                    ? "bg-surface text-ink shadow-2xs border border-border/70"
                    : "text-muted hover:text-ink",
                ].join(" ")}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => cambiarPestana("bascula")}
                className={[
                  "rounded-xl py-2 transition-all",
                  pestana === "bascula"
                    ? "bg-surface text-ink shadow-2xs border border-border/70"
                    : "text-muted hover:text-ink",
                ].join(" ")}
              >
                Báscula
              </button>
              <button
                type="button"
                onClick={() => cambiarPestana("ajustes")}
                className={[
                  "rounded-xl py-2 transition-all",
                  pestana === "ajustes"
                    ? "bg-surface text-ink shadow-2xs border border-border/70"
                    : "text-muted hover:text-ink",
                ].join(" ")}
              >
                Ajustes
              </button>
            </div>

            {/* Notificación temporal de guardado */}
            {mensajeGuardado ? (
              <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold text-center animate-in fade-in slide-in-from-top duration-200">
                {mensajeGuardado}
              </div>
            ) : null}

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
              {pestana === "hoy" && (
                <>
                  {/* Aviso informativo si está en Modo Flo */}
                  {ciclo.modo === "flo" && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50/70 p-3 text-xs text-ink/90 border border-rose-200/70 dark:bg-rose-950/20 dark:border-rose-900/40">
                      <Smartphone size={16} className="shrink-0 text-rose-500 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-rose-900 dark:text-rose-200">
                          Lo llevas en Flo
                        </span>
                        <p className="text-2xs text-muted leading-relaxed">
                          Aquí solo se apunta el día que te baja. Si en Flo cambia, cámbialo también aquí abajo y tu báscula se recalcula al instante.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dial central del ciclo inspirado en Flo */}
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-200/50 bg-gradient-to-b from-rose-50/40 via-surface to-surface p-6 dark:border-rose-900/30 dark:from-rose-950/20">
                    <div className="relative flex h-48 w-48 items-center justify-center">
                      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          className="stroke-border/50 fill-none"
                          strokeWidth="10"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          className="stroke-rose-500 fill-none transition-all duration-700 ease-out"
                          strokeWidth="10"
                          strokeDasharray={circunferencia}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xs font-bold uppercase tracking-wider text-rose-500">
                          {estado?.esRetraso
                            ? "⚠️ Retraso"
                            : estado?.fase === "menstruacion"
                            ? "🩸 Regla"
                            : "🌸 Ciclo"}
                        </span>
                        <span className="text-3xl font-black text-ink leading-tight">
                          Día {diaCiclo}
                        </span>
                        <span className="text-xs font-bold text-muted">
                          {estado?.esRetraso ? "del ciclo actual" : `de ${durCiclo} días`}
                        </span>
                        <span className={[
                          "mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-2xs border",
                          estado?.esRetraso
                            ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
                            : "bg-surface/90 text-ink border-border",
                        ].join(" ")}>
                          {estado?.nombreFase ?? "En curso"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-1 text-center">
                      {estado?.esRetraso ? (
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          Retraso de {estado.diasRetraso} {estado.diasRetraso === 1 ? "día" : "días"} frente a tu ciclo habitual
                        </p>
                      ) : (
                        <p className="text-xs font-medium text-muted">
                          Próximo período previsto en{" "}
                          <strong className="text-ink font-bold">
                            {estado?.diasParaProximaRegla ?? 14} días
                          </strong>
                        </p>
                      )}
                      <p className="text-2xs text-muted">
                        Fertilidad estimada (calendario):{" "}
                        <span className="font-bold text-ink">
                          {estado?.probabilidadEmbarazo ?? "No estimable"}
                        </span>
                      </p>
                      <p className="text-[9.5px] text-muted/80 italic mt-0.5 max-w-xs text-center">
                        *Estimación aproximada por calendario. No utilizar como método anticonceptivo ni diagnóstico médico.
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col items-center gap-2 w-full max-w-xs">
                      {estado?.fase === "menstruacion" ? (
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            type="button"
                            onClick={corregirReglaNoHoy}
                            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-rose-300 bg-surface px-4 py-2.5 text-xs font-bold text-rose-600 shadow-2xs transition active:scale-95 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                          >
                            <span>✕ No tengo la regla hoy (quitar)</span>
                          </button>
                          <button
                            type="button"
                            onClick={marcarReglaHoy}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-rose-700"
                          >
                            <Droplets size={15} className="fill-current" />
                            <span>Confirmar que me ha bajado hoy</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={marcarReglaHoy}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-rose-700"
                        >
                          <Droplets size={16} className="fill-current" />
                          <span>Marcar que hoy me ha bajado la regla</span>
                        </button>
                      )}

                      {/* Selector directo de fecha de última regla sin rebuscar en Ajustes */}
                      <div className="flex items-center justify-between w-full rounded-xl bg-surface/90 border border-border px-3 py-2 text-2xs text-muted shadow-2xs">
                        <span className="flex items-center gap-1.5 font-medium text-ink">
                          <Calendar size={13} className="text-rose-500" />
                          <span>Último período:</span>
                        </span>
                        <input
                          type="date"
                          max={hoy}
                          value={ciclo.fechaUltimaRegla || hoy}
                          onChange={(e) => {
                            if (e.target.value) {
                              sonidoCheck();
                              vibrarCheck();
                              actualizarCicloMenstrual({ fechaUltimaRegla: e.target.value });
                              setMensajeGuardado("✓ Fecha del período guardada correctamente.");
                              setTimeout(() => setMensajeGuardado(null), 3000);
                            }
                          }}
                          className="rounded-lg border border-border bg-bg px-2 py-0.5 text-xs font-bold text-ink focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={iniciarConfiguracionNativo}
                        className="flex items-center justify-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline pt-1 transition active:scale-95"
                      >
                        <RefreshCw size={12} />
                        <span>Reconfigurar ciclo con el asistente (2 pasos)</span>
                      </button>
                    </div>
                  </div>

                  {/* Tarjeta inteligente de la báscula según la fase */}
                  {estado?.esFaseRetencion ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                      <Scale size={20} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-900 dark:text-amber-200">
                            Retención esperada: {estado.retencionEstimadaKg}
                          </span>
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            {estado.nombreFase}
                          </span>
                        </div>
                        <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                          {estado.explicacionBascula}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Registro diario de síntomas */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-rose-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                          ¿Cómo te sientes hoy?
                        </h3>
                      </div>
                      <span className="text-2xs text-muted">
                        {sintomasHoy.length} anotados
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {SINTOMAS_DISPONIBLES.map((s) => {
                        const seleccionado = sintomasHoy.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => alternarSintoma(s.id)}
                            className={[
                              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-95",
                              seleccionado
                                ? "bg-rose-500 text-white shadow-2xs"
                                : "border border-border bg-bg/50 text-ink hover:border-border-input",
                            ].join(" ")}
                          >
                            <span>{s.emoji}</span>
                            <span>{s.etiqueta}</span>
                            {seleccionado ? <Check size={12} className="ml-0.5" /> : null}
                          </button>
                        );
                      })}
                    </div>

                    {/* Flujo menstrual */}
                    <div className="mt-2 border-t border-border/60 pt-3">
                      <span className="mb-2 block text-2xs font-bold text-muted uppercase tracking-wider">
                        Flujo de hoy
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {FLUJOS_DISPONIBLES.map((f) => {
                          const activo = flujoHoy === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => cambiarFlujo(f.id)}
                              className={[
                                "rounded-xl py-1.5 text-xs font-semibold transition active:scale-95",
                                activo
                                  ? "bg-rose-600 text-white shadow-2xs"
                                  : "border border-border bg-bg/40 text-muted hover:text-ink",
                              ].join(" ")}
                            >
                              {f.etiqueta}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {pestana === "bascula" && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
                      <Info size={16} />
                      <span>Por qué cambia tu peso con el ciclo</span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed">
                      Muchas mujeres se desmotivan cuando ven que la báscula sube de repente 1 o 2 kilos
                      a pesar de haber comido perfecto. En el 95% de los casos, <strong>no es grasa</strong>,
                      sino retención de agua provocada por el baile hormonal entre estrógenos y progesterona.
                    </p>
                  </div>

                  {/* Fases del ciclo y su impacto exacto */}
                  <div className="flex flex-col gap-2.5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-rose-700 dark:text-rose-300">
                          1. Menstruación (Días 1 a {ciclo.duracionRegla || 5})
                        </span>
                        <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[10px] font-bold text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                          +0,5 a 1,5 kg de agua
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-rose-900/80 dark:text-rose-200/80 leading-relaxed">
                        Retención al inicio que va bajando a partir del día 3. Prioriza hidratación, alimentos con hierro y no juzgues tu progreso aquí.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                          2. Fase Folicular (Días 6 a 13)
                        </span>
                        <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                          0 kg (Peso real óptimo)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
                        Sensibilidad óptima a la insulina, retención mínima y máxima energía para entrenar fuerza. Tu pesada aquí es la más representativa.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5 dark:border-purple-900/50 dark:bg-purple-950/20">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-purple-700 dark:text-purple-300">
                          3. Ovulación (Días 14 a 16)
                        </span>
                        <span className="rounded-full bg-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                          0 a +0,4 kg ligero
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-purple-900/80 dark:text-purple-200/80 leading-relaxed">
                        Pico de energía y motivación. Posible hinchazón pélvica puntual de 24 horas.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-700 dark:text-amber-300">
                          4. Fase Lútea (Días 17 a {ciclo.duracionCiclo || 28})
                        </span>
                        <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                          +0,8 a 2,0 kg de agua
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                        La progesterona sube. El gasto calórico en reposo aumenta ~150 kcal (hambre biológica) y se retiene líquido. Si sube la báscula, ¡es agua, no grasa!
                      </p>
                    </div>
                  </div>

                  {/* Consejos nutricionales de tu fase actual */}
                  {estado ? (
                    <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2">
                      <span className="text-xs font-bold text-ink">
                        Consejo para hoy ({estado.nombreFase}):
                      </span>
                      <p className="text-xs text-muted leading-relaxed">
                        {estado.consejoNutricion}
                      </p>
                      <p className="text-xs text-muted leading-relaxed">
                        🏋️ {estado.consejoEntreno}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {pestana === "ajustes" && (
                <div className="flex flex-col gap-4">
                  {/* Selector rápido de Modo */}
                  <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-ink">Modo de seguimiento</h3>
                        <p className="text-2xs text-muted">
                          {ciclo.modo === "flo"
                            ? "📲 Lo llevas en Flo y lo apuntas aquí"
                            : "🌸 Seguimiento propio en My Fitness"}
                        </p>
                      </div>
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        {ciclo.modo === "flo" ? "Flo" : "My Fitness"}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      {ciclo.modo === "flo"
                        ? "My Fitness no lee Flo solo: apuntas aquí el día que te baja y el progreso se ajusta con esa fecha."
                        : "Llevas tu registro de regla, síntomas y retención de líquidos directamente en My Fitness con privacidad total."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        sonidoTap();
                        vibrarTap();
                        setEligiendoModo(true);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs font-bold text-ink transition active:scale-95 hover:bg-bg"
                    >
                      <RefreshCw size={13} className="text-rose-500" />
                      <span>Cambiar entre Flo y My Fitness</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-ink">Duración del ciclo</h3>
                        <p className="text-2xs text-muted">Días entre el inicio de una regla y la siguiente</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => ajustarDuracionCiclo(-1)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg text-ink active:scale-95"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-ink">
                          {ciclo.duracionCiclo || 28}
                        </span>
                        <button
                          type="button"
                          onClick={() => ajustarDuracionCiclo(1)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg text-ink active:scale-95"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-4">
                      <div>
                        <h3 className="text-xs font-bold text-ink">Duración del sangrado</h3>
                        <p className="text-2xs text-muted">Cuántos días suele durar tu regla</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => ajustarDuracionRegla(-1)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg text-ink active:scale-95"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-ink">
                          {ciclo.duracionRegla || 5}
                        </span>
                        <button
                          type="button"
                          onClick={() => ajustarDuracionRegla(1)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg text-ink active:scale-95"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-4">
                      <div>
                        <h3 className="text-xs font-bold text-ink">Última regla registrada</h3>
                        <p className="text-2xs text-muted">{ciclo.fechaUltimaRegla || "No registrada"}</p>
                      </div>
                      <input
                        type="date"
                        max={hoy}
                        value={ciclo.fechaUltimaRegla || hoy}
                        onChange={(e) => {
                          if (e.target.value) {
                            actualizarCicloMenstrual({ fechaUltimaRegla: e.target.value });
                          }
                        }}
                        className="rounded-xl border border-border bg-bg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  {/* Interruptor para apagar el módulo */}
                  <div className="rounded-2xl border border-border bg-bg/50 p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-ink">Seguimiento activo</h4>
                      <p className="text-2xs text-muted">Muestra avisos de retención en Hoy y Progreso</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sonidoTap();
                        vibrarTap();
                        actualizarCicloMenstrual({ activo: !ciclo.activo });
                      }}
                      className={[
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        ciclo.activo ? "bg-rose-500" : "bg-muted/40",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          ciclo.activo ? "translate-x-6" : "translate-x-1",
                        ].join(" ")}
                      />
                    </button>
                  </div>

                  <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-[10px] text-amber-900 dark:text-amber-200 border border-amber-300/40">
                    <Info size={14} className="shrink-0 text-amber-600 mt-0.5" />
                    <span className="leading-relaxed">
                      Aviso de salud: Esta estimación es puramente orientativa con fines de nutrición y bienestar deportivo. My Fitness no es un método anticonceptivo ni sustituye a un profesional sanitario.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-surface p-3 text-2xs text-muted border border-border/70">
                    <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                    <span>
                      Privacidad total: Esta información es 100% privada para ti. Jamás se comparte en el grupo familiar ni en ningún muro.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pie con botón de cierre */}
            <div className="border-t border-border/80 bg-surface px-5 py-3 flex items-center justify-between">
              <span className="text-2xs text-muted flex items-center gap-1.5">
                <Calendar size={13} className="text-rose-500" />
                <span>{ciclo.modo === "flo" ? "Flo · apuntado a mano" : "Flo para My Fitness"}</span>
              </span>
              <button
                type="button"
                onClick={cerrar}
                className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-surface active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
