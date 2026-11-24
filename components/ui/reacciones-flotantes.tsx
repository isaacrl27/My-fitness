"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { suscribirReacciones, type ParticulaReaccion } from "@/lib/reacciones";

/**
 * Contenedor global de reacciones flotantes (Rare UI / Microinteracciones).
 *
 * Se monta una sola vez en el layout principal y proyecta las ráfagas
 * de emojis con aceleración por GPU sobre cualquier pantalla.
 */
export function ContenedorReacciones() {
  const [particulas, setParticulas] = useState<ParticulaReaccion[]>([]);

  useEffect(() => {
    return suscribirReacciones((nuevas) => {
      setParticulas((prev) => [...prev, ...nuevas]);

      const tiempoMax = Math.max(...nuevas.map((p) => p.duracionMs + p.retrasoMs)) + 120;
      const idsABorrar = new Set(nuevas.map((p) => p.id));

      setTimeout(() => {
        setParticulas((prev) => prev.filter((p) => !idsABorrar.has(p.id)));
      }, tiempoMax);
    });
  }, []);

  if (particulas.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[110] overflow-hidden select-none"
    >
      {particulas.map((p) => (
        <span
          key={p.id}
          className="anim-reaccion-flotar absolute will-change-transform text-2xl drop-shadow-sm"
          style={
            {
              left: `${p.x}px`,
              top: `${p.y}px`,
              animationDuration: `${p.duracionMs}ms`,
              animationDelay: `${p.retrasoMs}ms`,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rotacion}deg`,
              "--escala": p.escala,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>,
    document.body
  );
}
