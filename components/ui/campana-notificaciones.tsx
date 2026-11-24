"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, CheckCheck, MessageSquare, Sparkles, X } from "lucide-react";
import { useDatos } from "@/lib/store";
import { vibrarTap } from "@/lib/haptica";
import { sonidoTap } from "@/lib/sonido";
import { CLAVE_NOVEDADES, VERSION, novedadesPendientes, type Novedad } from "@/lib/novedades";

type PropsCampana = {
  className?: string;
};

/**
 * Campana de notificaciones interactiva estilo iOS / Rare UI.
 *
 * - Balancea con vaivén físico al recibir avisos o pulsar.
 * - Contador dinámico de avisos pendientes.
 * - Ventana flotante centrada en móvil para que nunca se desborde ni se corte por la izquierda.
 * - Soporte para marcar mensajes individuales o «Marcar todo como visto» para limpiar el contador a 0.
 */
export function CampanaNotificaciones({ className = "" }: PropsCampana) {
  const { listo, mensajesIsaac, marcarMensajeIsaacLeido } = useDatos();
  const [abierto, setAbierto] = useState(false);
  const [balanceando, setBalanceando] = useState(false);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Leer novedades pendientes en local
  useEffect(() => {
    if (!listo) return;
    queueMicrotask(() => {
      try {
        const guardado = window.localStorage.getItem(CLAVE_NOVEDADES);
        setNovedades(novedadesPendientes(guardado));
      } catch {
        setNovedades([]);
      }
    });
  }, [listo]);

  // Mensajes no leídos de Isaac
  const noLeidos = useMemo(() => {
    if (!mensajesIsaac) return [];
    return mensajesIsaac.filter((m) => !m.leido);
  }, [mensajesIsaac]);

  const totalAvisos = noLeidos.length + novedades.length;

  // Activar vaivén elástico
  const dispararVaiven = () => {
    setBalanceando(true);
    setTimeout(() => setBalanceando(false), 750);
  };

  // Balanceo sutil al llegar avisos
  useEffect(() => {
    if (totalAvisos > 0) {
      const t = setTimeout(() => {
        dispararVaiven();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [totalAvisos]);

  // Cerrar al pulsar fuera o Escape
  useEffect(() => {
    if (!abierto) return;
    function clickFuera(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    function teclaEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", clickFuera);
    document.addEventListener("keydown", teclaEscape);
    return () => {
      document.removeEventListener("mousedown", clickFuera);
      document.removeEventListener("keydown", teclaEscape);
    };
  }, [abierto]);

  // Marcar todo como visto y limpiar contador a 0
  const marcarTodoComoVisto = () => {
    sonidoTap();
    vibrarTap();
    if (noLeidos.length > 0) {
      noLeidos.forEach((m) => marcarMensajeIsaacLeido(m.id));
    }
    try {
      window.localStorage.setItem(CLAVE_NOVEDADES, String(VERSION));
    } catch {
      // Ignorar fallo de almacenamiento
    }
    setNovedades([]);
  };

  function formatearFecha(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={`relative inline-block ${className}`} ref={panelRef}>
      {/* Botón de la campana interactiva */}
      <button
        type="button"
        aria-label={`Notificaciones: ${totalAvisos} aviso${totalAvisos === 1 ? "" : "s"}`}
        aria-expanded={abierto}
        onMouseEnter={dispararVaiven}
        onClick={() => {
          sonidoTap();
          vibrarTap();
          dispararVaiven();
          setAbierto((prev) => !prev);
        }}
        className={[
          "relative flex h-10 w-10 items-center justify-center rounded-full border transition duration-150 active:scale-90",
          abierto
            ? "border-accent bg-accent-soft text-accent"
            : "border-border bg-surface text-muted hover:border-border-input hover:text-ink shadow-2xs",
        ].join(" ")}
      >
        <span className={`inline-block ${balanceando ? "anim-campana" : ""}`}>
          <Bell size={17} className="fill-current/10" aria-hidden="true" />
        </span>

        {/* Badge dinámico con contador */}
        {totalAvisos > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75 duration-200"
            aria-hidden="true"
          >
            {totalAvisos > 9 ? "9+" : totalAvisos}
          </span>
        ) : null}
      </button>

      {/* Velo de fondo oscuro en móvil para evitar toques fuera accidentales */}
      {abierto ? (
        <div
          className="fixed inset-0 z-[75] bg-black/25 backdrop-blur-[2px] sm:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Desplegable de notificaciones adaptado al ancho de pantalla */}
      {abierto ? (
        <div
          role="dialog"
          aria-label="Panel de avisos y notificaciones"
          className="fixed left-4 right-4 top-16 z-[80] mx-auto max-w-sm rounded-2xl border border-border/80 bg-surface/98 p-3.5 shadow-pop backdrop-blur-md sm:absolute sm:inset-auto sm:right-0 sm:top-10 sm:w-[320px] sm:max-w-none sm:rounded-xl animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Cabecera del panel */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <span className="text-xs font-bold text-ink">Avisos y mensajes</span>
            <div className="flex items-center gap-2">
              {totalAvisos > 0 ? (
                <button
                  type="button"
                  onClick={marcarTodoComoVisto}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent-soft transition cursor-pointer"
                  title="Marcar todos los avisos como vistos"
                >
                  <CheckCheck size={13} />
                  <span>Limpiar todo</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-muted hover:text-ink p-0.5 rounded-md hover:bg-surface-raised transition cursor-pointer"
                aria-label="Cerrar panel"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="flex max-h-[340px] flex-col gap-2 overflow-y-auto py-2">
            {totalAvisos === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-6 text-center text-muted">
                <Sparkles size={20} className="text-accent" />
                <p className="text-xs font-semibold text-ink">Todo al día</p>
                <p className="text-[11px]">No tienes mensajes ni avisos pendientes.</p>
              </div>
            ) : null}

            {/* Mensajes de Isaac */}
            {noLeidos.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-1.5 rounded-lg border border-accent/40 bg-accent-soft/30 p-2.5 text-xs text-ink"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-bold text-accent text-[11px]">
                    <MessageSquare size={12} />
                    {m.paraTodos ? "Aviso para todos" : "Mensaje de Isaac"}
                  </span>
                  <span className="text-[10px] text-muted">{formatearFecha(m.fecha)}</span>
                </div>
                <p className="text-xs leading-relaxed text-ink">{m.texto}</p>
                <button
                  type="button"
                  onClick={() => {
                    sonidoTap();
                    vibrarTap();
                    marcarMensajeIsaacLeido(m.id);
                  }}
                  className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-bold text-bg transition hover:opacity-90 active:scale-95 cursor-pointer"
                >
                  <Check size={11} />
                  <span>Marcar como leído</span>
                </button>
              </div>
            ))}

            {/* Novedades pendientes */}
            {novedades.map((n, idx) => (
              <div
                key={`nov-${idx}`}
                className="flex flex-col gap-1 rounded-lg border border-border/60 bg-surface-raised p-2 text-xs"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-ink">
                  <Sparkles size={11} className="text-amber-500" />
                  <span>{n.titulo}</span>
                </div>
                {n.detalle ? (
                  <p className="text-[11px] text-muted leading-relaxed">{n.detalle}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
