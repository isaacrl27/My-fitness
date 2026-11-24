"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatos } from "@/lib/store";
import {
  activar,
  desactivar,
  estado,
  estadoReal,
  reparar,
  sePuede,
  type EstadoAvisos,
} from "@/lib/avisos-cliente";
import {
  formatoHora,
  horaDeAviso,
  HORA_AVISO,
  MOMENTOS,
  parsearHora,
  type MomentoAviso,
} from "@/lib/avisos";
import { sonidoTap } from "@/lib/sonido";
import { vibrarTap } from "@/lib/haptica";

/**
 * La manecilla que repara la suscripción cada vez que se abre la app.
 */
export function RepararAvisos() {
  useEffect(() => {
    void reparar();
  }, []);
  return null;
}

function hora(momento: MomentoAviso): string {
  const h = HORA_AVISO[momento];
  return `${h.hora}:${String(h.minuto).padStart(2, "0")}`;
}

const TITULOS: Record<MomentoAviso, string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  agua: "Agua",
  andar: "Paseo / Moverte",
  cena: "Cena",
};

const ICONOS: Record<MomentoAviso, string> = {
  desayuno: "☕",
  comida: "🍽️",
  agua: "💧",
  andar: "👟",
  cena: "🌙",
};

const QUE_HACE: Record<MomentoAviso, string> = {
  desayuno: "Solo si aún no has anotado o te queda un hábito de esa hora",
  comida: "Solo si aún no has anotado o te queda un hábito de esa hora",
  cena: "Solo si aún no has anotado o te queda un hábito de esa hora",
  agua: "Solo si vas por detrás de tu meta de hidratación",
  andar: "Un empujón para salir a moverte (si ya caminaste o corriste, se calla)",
};

/**
 * El bloque de Ajustes donde se configuran los avisos y su horario personalizado.
 */
export function SeccionAvisos() {
  const { perfil, guardarPerfil } = useDatos();
  const [ahora, setAhora] = useState<EstadoAvisos>(() => estado());
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");
  const compatible = sePuede();

  useEffect(() => {
    let vivo = true;
    const refrescar = () => {
      void estadoReal().then((n) => {
        if (vivo) setAhora(n);
      });
    };
    refrescar();
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", refrescar);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", refrescar);
    };
  }, []);

  async function cambiar(accion: "activar" | "desactivar") {
    setOcupado(true);
    setFallo("");
    sonidoTap();
    vibrarTap();
    const nuevo = accion === "activar" ? await activar() : await desactivar();
    setAhora(nuevo);
    setOcupado(false);
    if (nuevo === "apagados" && accion === "activar") {
      setFallo("El móvil no ha dejado. Mira los avisos de este móvil en los ajustes del sistema.");
    } else if (nuevo !== "activos" && accion === "activar") {
      setFallo("No se ha podido guardar. Inténtalo otra vez.");
    }
  }

  function cambiarHora(m: MomentoAviso, nuevoValor: string) {
    if (!perfil) return;
    const parsed = parsearHora(nuevoValor);
    if (!parsed) return;
    sonidoTap();
    vibrarTap();
    const nuevasHoras = {
      ...(perfil.horasAvisos ?? {}),
      [m]: parsed,
    };
    guardarPerfil({
      ...perfil,
      horasAvisos: nuevasHoras,
    });
  }

  function restablecerHora(m: MomentoAviso) {
    if (!perfil || !perfil.horasAvisos) return;
    sonidoTap();
    vibrarTap();
    const nuevasHoras = { ...perfil.horasAvisos };
    delete nuevasHoras[m];
    guardarPerfil({
      ...perfil,
      horasAvisos: Object.keys(nuevasHoras).length > 0 ? nuevasHoras : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Horario personalizable y moldeable */}
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4 border border-border/70">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-base font-semibold text-ink">Horario de tus avisos</h2>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          No todos desayunan o comen a la misma hora. Elige a qué hora te viene bien cada aviso
          para que se adapte exactamente a tu ritmo de vida.
        </p>

        <div className="flex flex-col divide-y divide-border/60">
          {MOMENTOS.map((m) => {
            const hConfigurada = horaDeAviso(m, perfil?.horasAvisos);
            const personalizada = Boolean(perfil?.horasAvisos?.[m]);
            const valorInput = formatoHora(hConfigurada);

            return (
              <div key={m} className="flex flex-col gap-1 py-3 first:pt-1 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base" aria-hidden="true">
                      {ICONOS[m]}
                    </span>
                    <span className="text-sm font-semibold text-ink truncate">
                      {TITULOS[m]}
                    </span>
                    {personalizada && (
                      <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                        Personalizado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="time"
                      value={valorInput}
                      onChange={(e) => cambiarHora(m, e.target.value)}
                      aria-label={`Hora de ${TITULOS[m]}`}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1 text-sm font-semibold text-ink shadow-2xs focus:border-accent focus:outline-hidden"
                    />
                    {personalizada && (
                      <button
                        type="button"
                        onClick={() => restablecerHora(m)}
                        title={`Restablecer a ${hora(m)}`}
                        aria-label={`Restablecer ${TITULOS[m]} a ${hora(m)}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:text-ink hover:bg-bg transition active:scale-95"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted pl-6">{QUE_HACE[m]}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Estado de notificaciones en el dispositivo */}
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4 border border-border/70">
        <h2 className="text-base font-semibold text-ink">Notificaciones en este móvil</h2>

        {compatible ? (
          <>
            <div className="flex items-center justify-between">
              {ahora === "activos" ? (
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Bell size={14} aria-hidden="true" />
                  </span>
                  Avisos activados
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-500/15 text-muted">
                    <BellOff size={14} aria-hidden="true" />
                  </span>
                  Avisos apagados
                </p>
              )}

              {ahora === "activos" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={ocupado}
                  onClick={() => void cambiar("desactivar")}
                >
                  Apagar
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={ocupado}
                  onClick={() => void cambiar("activar")}
                >
                  Encender
                </Button>
              )}
            </div>

            <p className="text-xs text-muted">
              Te avisa solo cuando falta algo: si ya has anotado la comida, no vuelve a preguntarte.
            </p>

            {fallo ? <p role="alert" className="text-xs font-semibold text-danger">{fallo}</p> : null}
          </>
        ) : (
          <p className="text-xs text-muted leading-relaxed">
            Para recibir avisos directamente en la pantalla de bloqueo de tu teléfono, instala la app en tu pantalla de inicio (con el botón <em>Compartir</em> &gt; <em>Añadir a pantalla de inicio</em> en Safari o Chrome).
          </p>
        )}
      </section>
    </div>
  );
}
