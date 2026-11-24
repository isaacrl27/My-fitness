"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cerrarTostada, suscribirTostadas, type NotificacionTostada } from "@/lib/tostada";
import { vibrarTap } from "@/lib/haptica";
import { sonidoTap } from "@/lib/sonido";

/**
 * Componente flotante superior de notificaciones y logros (Vídeo 6).
 *
 * Microinteracciones implementadas:
 * 1. Gooey Drop: Caída elástica tipo gota desde la parte superior UNA SOLA VEZ al entrar.
 * 2. Merge Counter: Al acumular toques repetidos, la notificación permanece en su sitio y solo
 *    hace pop elástico la insignia (+2, +3...) sin volver a caer ni reaparecer desde arriba.
 * 3. Descarte táctil: Tocar la píldora para cerrarla de inmediato.
 */
export function ContenedorTostada() {
  const [tostada, setTostada] = useState<NotificacionTostada | null>(null);
  const [visible, setVisible] = useState(false);
  const [animandoEntrada, setAnimandoEntrada] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    return suscribirTostadas((t) => {
      if (t) {
        setTostada(t);
        if (!visibleRef.current) {
          // Primera aparición: cae con Gooey Drop
          visibleRef.current = true;
          setVisible(true);
          setAnimandoEntrada(true);
          vibrarTap();
        } else {
          // Ya visible: fusión en el sitio (Merge Counter), no vuelve a caer del techo
          vibrarTap();
          sonidoTap();
        }
      } else {
        visibleRef.current = false;
        setVisible(false);
        setAnimandoEntrada(false);
        setTimeout(() => {
          setTostada(null);
        }, 300);
      }
    });
  }, []);

  if (!tostada && !visible) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] z-[95] flex flex-col items-center px-4"
    >
      {/* Tallo elástico de gota líquida superior (Gooey Drop) */}
      <div
        aria-hidden="true"
        className={`w-6 h-1 rounded-full bg-emerald-400/50 blur-[0.5px] transition-all duration-300 ${
          visible ? "opacity-100 scale-100 mb-1" : "opacity-0 scale-50 mb-0"
        }`}
      />

      {/* Píldora principal interactiva con Gooey Drop y Merge Counter */}
      <div
        onClick={() => {
          vibrarTap();
          cerrarTostada();
        }}
        onAnimationEnd={(e) => {
          // Al terminar la caída inicial, desactivamos la animación de entrada para fijarla
          if (e.animationName === "gooey-drop") {
            setAnimandoEntrada(false);
          }
        }}
        className={[
          "pointer-events-auto cursor-pointer flex max-w-[390px] items-center gap-2.5 rounded-full px-4 py-2.5 shadow-xl backdrop-blur-xl transition-all duration-200 select-none",
          "border border-emerald-500/35 bg-zinc-950/90 text-zinc-100 shadow-[0_12px_28px_rgba(0,0,0,0.5),0_0_15px_rgba(16,185,129,0.15)]",
          visible
            ? animandoEntrada
              ? "anim-gooey-drop opacity-100"
              : "translate-y-0 opacity-100 scale-100"
            : "-translate-y-4 opacity-0 scale-95 pointer-events-none",
        ].join(" ")}
      >
        <span className="text-xl shrink-0 filter drop-shadow-sm" aria-hidden="true">
          {tostada?.icono || "✨"}
        </span>

        <span className="text-xs font-semibold leading-snug tracking-tight text-white/95">
          {tostada?.mensaje}
        </span>

        {/* Insignia animada de Merge Counter (+2, +3, +4...) */}
        {tostada && tostada.cuenta > 1 ? (
          <span
            key={tostada.cuenta}
            className="anim-merge-pop ml-1 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 font-black text-[11px] px-2 py-0.5 tracking-tight shadow-md shadow-emerald-500/30 border border-emerald-300"
          >
            +{tostada.cuenta}
          </span>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
