"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatos } from "@/lib/store";
import { useBloqueoModal } from "@/lib/use-modal";

/**
 * Modal que muestra un mensaje o respuesta que Isaac ha enviado desde Telegram o la App.
 *
 * Se abre automáticamente cuando el usuario tiene un mensaje sin leer (`!leido`).
 * Si es un mensaje para todos, muestra prominentemente el distintivo «LEER IMPORTANTE»
 * y «Mensaje directo de Isaac».
 * Al pulsar «Entendido, gracias», se marca como leído tanto en local como en la nube.
 */
export function ModalMensajeIsaac() {
  const { listo, mensajesIsaac, marcarMensajeIsaacLeido } = useDatos();

  const mensajePendiente = useMemo(() => {
    if (!listo || !mensajesIsaac) return null;
    return mensajesIsaac.find((m) => !m.leido) ?? null;
  }, [listo, mensajesIsaac]);

  useBloqueoModal({
    abierto: Boolean(mensajePendiente),
    onCerrar: () => {
      if (mensajePendiente) marcarMensajeIsaacLeido(mensajePendiente.id);
    },
  });

  if (!mensajePendiente || typeof document === "undefined") return null;

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

  const esParaTodos = Boolean(mensajePendiente.paraTodos);

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 px-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-mensaje-isaac"
      onClick={(e) => {
        if (e.target === e.currentTarget) marcarMensajeIsaacLeido(mensajePendiente.id);
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col rounded-2xl bg-surface p-5 shadow-pop border border-border">
        {esParaTodos ? (
          <div className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <AlertTriangle size={14} className="shrink-0 text-amber-500" aria-hidden="true" />
            <span>LEER IMPORTANTE</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              esParaTodos
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-accent-soft text-accent"
            }`}
          >
            {esParaTodos ? (
              <AlertTriangle size={20} aria-hidden="true" />
            ) : (
              <MessageSquare size={20} aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-col">
            <h2 id="titulo-mensaje-isaac" className="text-base font-bold text-ink leading-tight">
              {esParaTodos ? "Mensaje directo de Isaac" : "Mensaje de Isaac"}
            </h2>
            <span className="text-xs text-muted">
              {formatearFecha(mensajePendiente.fecha)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto rounded-xl bg-bg p-3.5 border border-border/60">
          <p className="whitespace-pre-line text-sm text-ink leading-relaxed font-medium">
            {mensajePendiente.texto}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => marcarMensajeIsaacLeido(mensajePendiente.id)}
            className="w-full justify-center"
          >
            <Check size={16} aria-hidden="true" />
            Entendido, gracias
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
