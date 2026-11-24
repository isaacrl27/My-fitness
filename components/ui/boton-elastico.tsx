"use client";

import React, { useEffect, useState } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import { sonidoTap, sonidoExito } from "@/lib/sonido";
import { vibrarTap, vibrarExito } from "@/lib/haptica";

export interface PropsBotonElastico extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
}

/**
 * Botón con física elástica de resorte (Rare UI / Spring Animation).
 * Al pulsar se comprime elásticamente y al soltar rebota con overshoot orgánico.
 */
export function BotonElastico({
  children,
  variante = "secundario",
  className = "",
  onClick,
  ...props
}: PropsBotonElastico) {
  const estilosVariante = {
    primario: "bg-accent text-accent-contrast shadow-sm hover:brightness-105",
    secundario: "bg-surface border border-border text-ink hover:border-accent/40",
    peligro: "bg-danger text-white shadow-sm hover:brightness-110",
    fantasma: "bg-transparent text-ink hover:bg-surface-raised",
  }[variante];

  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        vibrarTap();
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold select-none cursor-pointer
        transition-all duration-200 active:scale-92 active:rotate-[-0.5deg]
        hover:scale-[1.02] active:transition-transform active:duration-75
        ${estilosVariante} ${className}`}
      style={{
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {children}
    </button>
  );
}

export interface PropsBotonBorradoElastico {
  onBorrar: () => void;
  etiquetaInicial?: string;
  etiquetaConfirmar?: string;
  variante?: "texto" | "icono" | "pildora";
  className?: string;
  tiempoEsperaMs?: number;
  ariaLabel?: string;
}

/**
 * Botón de eliminación seguro con confirmación elástica en 2 toques (Rare UI).
 * Al tocarlo por 1ª vez se deforma elásticamente preguntando «¿Borrar?»,
 * evitando borrados accidentales en el móvil sin necesidad de un modal invasivo.
 */
export function BotonBorradoElastico({
  onBorrar,
  etiquetaInicial = "Quitar",
  etiquetaConfirmar = "¿Borrar?",
  variante = "texto",
  className = "",
  tiempoEsperaMs = 3200,
  ariaLabel,
}: PropsBotonBorradoElastico) {
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!confirmando) return;
    const timer = setTimeout(() => {
      setConfirmando(false);
    }, tiempoEsperaMs);
    return () => clearTimeout(timer);
  }, [confirmando, tiempoEsperaMs]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirmando) {
      sonidoTap();
      vibrarTap();
      setConfirmando(true);
    } else {
      sonidoExito();
      vibrarExito();
      setConfirmando(false);
      onBorrar();
    }
  };

  if (variante === "icono") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={confirmando ? etiquetaConfirmar : (ariaLabel || etiquetaInicial)}
        aria-pressed={confirmando}
        className={`relative inline-flex items-center justify-center rounded-lg p-1.5 transition-all select-none cursor-pointer
          ${confirmando 
            ? "bg-danger text-white scale-110 shadow-sm animate-pulse" 
            : "text-muted hover:text-danger active:scale-90"
          } ${className}`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {confirmando ? (
          <span className="flex items-center gap-1 text-[11px] font-bold px-1">
            <AlertCircle size={13} className="shrink-0" />
            <span>{etiquetaConfirmar}</span>
          </span>
        ) : (
          <Trash2 size={16} aria-hidden="true" />
        )}
      </button>
    );
  }

  if (variante === "pildora") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={confirmando ? etiquetaConfirmar : (ariaLabel || etiquetaInicial)}
        aria-pressed={confirmando}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all select-none cursor-pointer
          ${confirmando 
            ? "bg-danger text-white scale-105 shadow-sm" 
            : "bg-surface-raised border border-border text-danger hover:border-danger/40 active:scale-92"
          } ${className}`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Trash2 size={13} className={confirmando ? "animate-bounce" : ""} />
        <span>{confirmando ? etiquetaConfirmar : etiquetaInicial}</span>
      </button>
    );
  }

  // Variante texto directo (ideal para listas como en Hoy)
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={confirmando ? etiquetaConfirmar : (ariaLabel || etiquetaInicial)}
      aria-pressed={confirmando}
      className={`inline-flex items-center justify-center font-semibold transition-all select-none cursor-pointer
        ${confirmando
          ? "rounded-md bg-danger px-2 py-0.5 text-xs text-white scale-105 shadow-2xs font-bold"
          : "text-danger hover:underline text-xs active:scale-90"
        } ${className}`}
      style={{
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {confirmando ? (
        <span className="flex items-center gap-1">
          <AlertCircle size={12} />
          {etiquetaConfirmar}
        </span>
      ) : (
        etiquetaInicial
      )}
    </button>
  );
}
