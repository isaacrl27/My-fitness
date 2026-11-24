"use client";

import {
  FACTORES_RAPIDOS,
  calcularGramosPorFactor,
  descripcionFactorRacion,
  etiquetaFactorRacion,
} from "@/lib/cola-fotos-offline";

/**
 * Botonera compacta de 1 toque (½×, 1×, 1½×, 2×) para ajustar rápido la
 * cantidad detectada sin tener que pulsar muchas veces +/-.
 */
export function AtajosRacion({
  nombre,
  gramosBase,
  gramosActuales,
  onAplicar,
}: {
  nombre: string;
  gramosBase: number;
  gramosActuales: number;
  onAplicar: (nuevosGramos: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="text-[11px] text-muted mr-0.5">Ración:</span>
      {FACTORES_RAPIDOS.map((factor) => {
        const objetivo = calcularGramosPorFactor(gramosBase, factor);
        const activo = gramosActuales === objetivo;
        return (
          <button
            key={factor}
            type="button"
            onClick={() => onAplicar(objetivo)}
            aria-label={descripcionFactorRacion(factor, nombre)}
            aria-pressed={activo}
            className={[
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition active:scale-95",
              activo
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-muted hover:text-ink",
            ].join(" ")}
          >
            {etiquetaFactorRacion(factor)}
          </button>
        );
      })}
    </div>
  );
}
