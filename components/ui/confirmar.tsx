"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useBloqueoModal } from "@/lib/use-modal";

/**
 * Una pregunta de sí o no antes de un botón que no se puede deshacer.
 *
 * Se usa para vaciar agua, pasos y sueño, para cambiar los platos de la semana
 * y para canjear el capricho: son acciones que cuestan datos o puntos y no
 * tienen vuelta atrás.
 *
 * La pila global (`useBloqueoModal` -> `pila-modales.ts`) mantiene el foco
 * atrapado dentro, cierra solo esta capa al pulsar Escape y devuelve el foco
 * al botón original al cerrarse, incluso si se abrió encima de otro diálogo.
 */
export function Confirmar({
  abierto,
  titulo,
  cuerpo,
  confirmar,
  cancelar = "Cancelar",
  peligro = false,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  cuerpo: string;
  confirmar: string;
  cancelar?: string;
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const idCuerpo = useId();

  useBloqueoModal({ abierto, onCerrar: onCancelar });

  if (!abierto || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-6 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-label={titulo}
      aria-describedby={idCuerpo}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-pop">
        <h2 className="text-lg text-ink">{titulo}</h2>
        <p id={idCuerpo} className="pt-2 text-sm text-muted">
          {cuerpo}
        </p>
        <div className="flex justify-end gap-2 pt-5">
          <Button variant="secondary" onClick={onCancelar} autoFocus>
            {cancelar}
          </Button>
          <Button variant={peligro ? "danger" : "primary"} onClick={onConfirmar}>
            {confirmar}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
