"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Dumbbell,
  Check,
  Flame,
  Scale,
} from "lucide-react";
import { useDatos } from "@/lib/store";
import {
  PESO_MIN_KG,
  edad,
  gastoDiario,
  hoyISO,
  kcalRedondeadas,
  objetivoCalorico,
  macrosDiarios,
  pesoMinimoSaludableKg,
  pesoSuavizado,
  ritmosPara,
  conComa,
  conComaSinCeros,
  aNumero,
  validarPesoObjetivo,
  type Objetivo,
} from "@/lib/calculos";
import { Button } from "@/components/ui/button";
import { useBloqueoModal } from "@/lib/use-modal";
import { sonidoTap, sonidoExito } from "@/lib/sonido";
import { vibrarTap, vibrarExito } from "@/lib/haptica";

interface ModalCambiarObjetivoProps {
  abierto: boolean;
  onCerrar: () => void;
}

const OBJETIVOS_INFO: {
  id: Objetivo;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  icono: typeof Target;
  colorIcono: string;
  badge: string;
}[] = [
  {
    id: "adelgazar",
    titulo: "Adelgazar (perder grasa)",
    subtitulo: "Déficit calórico controlado",
    descripcion:
      "Comes un poco menos de lo que gastas para quemar grasa de forma constante y proteger tu masa muscular.",
    icono: TrendingDown,
    colorIcono: "text-emerald-500",
    badge: "Déficit",
  },
  {
    id: "recomposicion",
    titulo: "Ganar músculo y perder grasa",
    subtitulo: "Recomposición corporal",
    descripcion:
      "Comes prácticamente lo que gastas con un aporte alto de proteína para sustituir grasa por masa muscular tonificada.",
    icono: Dumbbell,
    colorIcono: "text-indigo-500",
    badge: "Recomposición",
  },
  {
    id: "mantener",
    titulo: "Mantenerme en mi peso",
    subtitulo: "Equilibrio calórico exacto",
    descripcion:
      "Comes exactamente lo que gastas para afianzar hábitos saludables sin subir ni bajar de la báscula.",
    icono: Minus,
    colorIcono: "text-blue-500",
    badge: "Mantenimiento",
  },
  {
    id: "volumen-limpio",
    titulo: "Ganar músculo sin grasa",
    subtitulo: "Superávit ligero y controlado",
    descripcion:
      "Comes un pequeño extra cada día con abundante proteína para construir músculo nuevo minimizando la grasa.",
    icono: Sparkles,
    colorIcono: "text-amber-500",
    badge: "Volumen limpio",
  },
  {
    id: "subir",
    titulo: "Subir de peso",
    subtitulo: "Superávit calórico",
    descripcion:
      "Comes más de lo que gastas para subir de peso con un ritmo constante y saludable.",
    icono: TrendingUp,
    colorIcono: "text-orange-500",
    badge: "Subir",
  },
];

export function ModalCambiarObjetivo({ abierto, onCerrar }: ModalCambiarObjetivoProps) {
  useBloqueoModal({ abierto, onCerrar });
  const { perfil, pesadas, guardarPerfil } = useDatos();

  const pesoActual = useMemo(() => {
    return pesoSuavizado(pesadas) ?? perfil?.pesoInicialKg ?? 70;
  }, [pesadas, perfil]);

  const [objetivoElegido, setObjetivoElegido] = useState<Objetivo>(
    perfil?.objetivo ?? "adelgazar",
  );

  const opcionesRitmo = useMemo(() => {
    return ritmosPara(objetivoElegido);
  }, [objetivoElegido]);

  const [ritmoElegido, setRitmoElegido] = useState<number>(() => {
    const suyos = ritmosPara(perfil?.objetivo ?? "adelgazar");
    const actual = perfil?.ritmoKgSemana ?? 0.5;
    return suyos.some((s) => s.valor === actual) ? actual : suyos[0].valor;
  });

  const [pesoObjetivoStr, setPesoObjetivoStr] = useState<string>(() => {
    return String(perfil?.pesoObjetivoKg ?? pesoActual);
  });

  const [guardadoConExito, setGuardadoConExito] = useState(false);

  // Gasto calórico diario
  const gasto = useMemo(() => {
    if (!perfil) return 2000;
    return gastoDiario(
      pesoActual,
      perfil.alturaCm,
      edad(perfil.fechaNacimiento),
      perfil.sexo,
      perfil.actividad,
    );
  }, [perfil, pesoActual]);

  // Calorías y macros según la simulación en tiempo real (en múltiplos de 10, igual que Hoy)
  const kcalSimuladas = useMemo(() => {
    return kcalRedondeadas(objetivoCalorico(gasto, ritmoElegido, objetivoElegido));
  }, [gasto, ritmoElegido, objetivoElegido]);

  const macrosSimulados = useMemo(() => {
    return macrosDiarios(kcalSimuladas, pesoActual);
  }, [kcalSimuladas, pesoActual]);

  if (!abierto || !perfil) return null;

  const pesoObjNum = aNumero(pesoObjetivoStr);
  const revisionObjetivo = validarPesoObjetivo({
    pesoActualKg: pesoActual,
    pesoObjetivoKg: pesoObjNum,
    alturaCm: perfil.alturaCm,
    objetivo: objetivoElegido,
  });
  const esValidoObjetivo = revisionObjetivo.ok;

  const handleSeleccionarObjetivo = (nuevo: Objetivo) => {
    sonidoTap();
    vibrarTap();
    setObjetivoElegido(nuevo);
    const nuevosRitmos = ritmosPara(nuevo);
    const nuevoRitmo = nuevosRitmos[0].valor;
    setRitmoElegido(nuevoRitmo);

    // Ajuste inteligente del peso objetivo propuesto según el nuevo rumbo
    if (nuevo === "mantener" || nuevo === "recomposicion") {
      setPesoObjetivoStr(String(Math.round(pesoActual * 10) / 10));
    } else if (nuevo === "subir" || nuevo === "volumen-limpio") {
      if (pesoObjNum <= pesoActual) {
        setPesoObjetivoStr(String(Math.round(Math.min(300, pesoActual + 3) * 10) / 10));
      }
    } else if (nuevo === "adelgazar") {
      const minSaludable = Math.max(PESO_MIN_KG, pesoMinimoSaludableKg(perfil.alturaCm));
      if (pesoObjNum >= pesoActual || pesoObjNum < minSaludable) {
        const propuesto = Math.max(minSaludable, pesoActual - 3);
        if (propuesto < pesoActual) {
          setPesoObjetivoStr(String(Math.round(propuesto * 10) / 10));
        }
      }
    }
  };

  const handleGuardar = () => {
    sonidoExito();
    vibrarExito();

    const cambioPlan =
      objetivoElegido !== (perfil.objetivo ?? "adelgazar") ||
      ritmoElegido !== perfil.ritmoKgSemana;

    guardarPerfil({
      ...perfil,
      objetivo: objetivoElegido,
      ritmoKgSemana: ritmoElegido,
      pesoObjetivoKg: pesoObjNum > 0 ? pesoObjNum : perfil.pesoObjetivoKg,
      // Al cambiar de objetivo o de ritmo, la corrección semanal antigua deja
      // de valer: se reinicia la referencia desde el peso actual.
      ...(cambioPlan
        ? { ajusteKcal: 0, fechaAjuste: hoyISO(), pesoEnAjuste: pesoActual }
        : {}),
    });

    setGuardadoConExito(true);
    setTimeout(() => {
      setGuardadoConExito(false);
      onCerrar();
    }, 1200);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-cambiar-objetivo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-2xl border border-border bg-surface text-ink shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 bg-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Target size={20} />
            </div>
            <div>
              <h2 id="titulo-cambiar-objetivo" className="text-base font-bold text-ink">
                Cambiar de objetivo
              </h2>
              <p className="text-xs text-muted">¿Qué quieres conseguir con tu peso y tu cuerpo?</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink transition"
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4 pb-6">
          {/* Tarjetas de objetivos */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Elige tu objetivo
            </label>
            <div className="flex flex-col gap-2">
              {OBJETIVOS_INFO.map((obj) => {
                const seleccionado = objetivoElegido === obj.id;
                const Icono = obj.icono;
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => handleSeleccionarObjetivo(obj.id)}
                    className={[
                      "flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition duration-150 active:scale-[0.99]",
                      seleccionado
                        ? "border-accent bg-accent-soft/40 shadow-xs ring-1 ring-accent"
                        : "border-border bg-bg hover:bg-surface/80",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icono size={17} className={obj.colorIcono} />
                        <span className="text-sm font-bold text-ink">{obj.titulo}</span>
                      </div>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          seleccionado
                            ? "bg-accent text-on-accent"
                            : "bg-surface border border-border text-muted",
                        ].join(" ")}
                      >
                        {obj.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed pl-6">{obj.descripcion}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ritmo si procede */}
          {opcionesRitmo.length > 1 ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Ritmo semanal
              </label>
              <div className="grid grid-cols-2 gap-2">
                {opcionesRitmo.map((r) => {
                  const elegido = ritmoElegido === r.valor;
                  return (
                    <button
                      key={r.valor}
                      type="button"
                      onClick={() => {
                        sonidoTap();
                        vibrarTap();
                        setRitmoElegido(r.valor);
                      }}
                      className={[
                        "flex flex-col items-center justify-center rounded-lg border py-2 px-2 text-center transition active:scale-95",
                        elegido
                          ? "border-accent bg-accent text-on-accent font-bold shadow-xs"
                          : "border-border bg-surface text-ink hover:bg-bg",
                      ].join(" ")}
                    >
                      <span className="text-xs font-semibold">{r.etiqueta}</span>
                      <span
                        className={[
                          "text-[10px]",
                          elegido ? "text-on-accent/80" : "text-muted",
                        ].join(" ")}
                      >
                        {conComaSinCeros(r.valor)} kg/sem
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Peso objetivo editable */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Scale size={14} className="text-accent" />
                Peso objetivo
              </label>
              <span className="text-xs text-muted">
                Ahora estás en <strong>{conComa(pesoActual)} kg</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={pesoObjetivoStr}
                  onChange={(e) => setPesoObjetivoStr(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-ink focus:outline-none"
                  placeholder="70"
                />
                <span className="text-xs font-bold text-muted">kg</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 px-0.5">
              <button
                type="button"
                onClick={() => {
                  sonidoTap();
                  vibrarTap();
                  setPesoObjetivoStr(String(Math.round(pesoActual * 10) / 10));
                }}
                className="text-xs font-semibold text-accent hover:underline active:scale-95 transition"
              >
                🎯 Usar mi peso de hoy ({conComa(pesoActual)} kg)
              </button>
              {objetivoElegido === "recomposicion" ? (
                <span className="text-[11px] text-muted">
                  Puedes mantener tu peso exacto
                </span>
              ) : null}
            </div>
            {objetivoElegido === "recomposicion" ? (
              <p className="rounded-lg bg-accent-soft/30 p-2 text-xs text-muted">
                💡 <strong>Ganar músculo y perder grasa</strong>: Tu meta puede ser mantener el peso actual, ya que el músculo pesa más y ocupa menos espacio que la grasa.
              </p>
            ) : null}
            {!revisionObjetivo.ok ? (
              <p role="alert" className="text-xs text-danger font-medium pt-0.5">
                {revisionObjetivo.motivo}
              </p>
            ) : null}
          </div>

          {/* Vista previa en tiempo real de calorías y macros */}
          <div className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent-soft/30 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                <Flame size={14} />
                Nuevo plan diario estimado
              </span>
              <span className="text-xs text-muted">Gastas: {Math.round(gasto)} kcal</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-bold text-ink">{kcalSimuladas}</span>
                <span className="text-xs font-medium text-muted ml-1">kcal / día</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="rounded bg-surface px-2 py-0.5 border border-border text-ink">
                  {macrosSimulados.proteinas}g Prot
                </span>
                <span className="rounded bg-surface px-2 py-0.5 border border-border text-ink">
                  {macrosSimulados.carbohidratos}g Hid
                </span>
                <span className="rounded bg-surface px-2 py-0.5 border border-border text-ink">
                  {macrosSimulados.grasas}g Gras
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de acción */}
        <div className="border-t border-border/70 bg-bg/80 px-5 py-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center"
            disabled={!esValidoObjetivo || guardadoConExito}
            onClick={handleGuardar}
          >
            {guardadoConExito ? (
              <>
                <Check size={18} className="text-on-accent" />
                ¡Objetivo actualizado!
              </>
            ) : (
              "Guardar mi nuevo objetivo"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
