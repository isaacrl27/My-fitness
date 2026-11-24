"use client";

import { useRef } from "react";
import { Check } from "lucide-react";

export type Opcion = { valor: string; etiqueta: string; ayuda?: string };

/** Lista de opciones grandes, para elegir con el dedo o con flechas de teclado. */
export function ChoiceList({
  opciones,
  valor,
  onChange,
  label,
}: {
  opciones: Opcion[];
  valor: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const indiceActivo = opciones.findIndex((o) => o.valor === valor);

  function mover(desde: number, delta: number) {
    if (opciones.length === 0) return;
    const siguiente = (desde + delta + opciones.length) % opciones.length;
    onChange(opciones[siguiente].valor);
    refs.current[siguiente]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {opciones.map((o, i) => {
        const activa = o.valor === valor;
        const tabulable = activa || (indiceActivo === -1 && i === 0);
        return (
          <button
            key={o.valor}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={activa}
            tabIndex={tabulable ? 0 : -1}
            onClick={() => onChange(o.valor)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                mover(i, 1);
              } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                mover(i, -1);
              }
            }}
            className={[
              "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left",
              "transition duration-150 ease-app",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              activa ? "border-accent bg-accent-soft" : "border-border bg-bg hover:bg-surface",
            ].join(" ")}
          >
            <span className="flex flex-col">
              <span className="text-base font-semibold text-ink">{o.etiqueta}</span>
              {o.ayuda ? <span className="text-sm text-muted">{o.ayuda}</span> : null}
            </span>
            <span
              aria-hidden="true"
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border",
                activa ? "border-accent bg-accent text-on-accent" : "border-border-input bg-bg",
              ].join(" ")}
            >
              {activa ? <Check size={14} strokeWidth={3} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
