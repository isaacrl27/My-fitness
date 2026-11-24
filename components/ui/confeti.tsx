"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Particula = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  angulo: number;
  vAngulo: number;
  opacidad: number;
};

const COLORES = ["#5fd3a6", "#1c7a58", "#e7c27a", "#ffffff", "#f472b6", "#38bdf8"];

/**
 * Lluvia de confeti nativa ultra-ligera en Canvas (0 dependencias externas).
 * Dura 2,2 segundos, se desmonta sola y corre a 60 fps.
 */
export function Confeti({ onCompletado }: { onCompletado?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Si el usuario tiene reducción de movimiento activada, no mostramos partículas
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCompletado?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let ancho = (canvas.width = window.innerWidth);
    let alto = (canvas.height = window.innerHeight);

    function redimensionar() {
      if (!canvas) return;
      ancho = canvas.width = window.innerWidth;
      alto = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", redimensionar);

    // Generar 55 partículas ligeras
    const particulas: Particula[] = Array.from({ length: 55 }).map(() => ({
      x: ancho * (0.3 + Math.random() * 0.4), // Salen del centro
      y: alto * 0.45,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4, // Impulso hacia arriba
      w: Math.random() * 9 + 5,
      h: Math.random() * 5 + 4,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
      angulo: Math.random() * 360,
      vAngulo: (Math.random() - 0.5) * 10,
      opacidad: 1,
    }));

    let animId: number;
    const inicio = Date.now();
    const DURACION_MS = 2200;

    function animar() {
      if (!ctx || !canvas) return;
      const transcurrido = Date.now() - inicio;
      if (transcurrido > DURACION_MS) {
        onCompletado?.();
        return;
      }

      ctx.clearRect(0, 0, ancho, alto);

      for (const p of particulas) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // Gravedad
        p.vx *= 0.985; // Fricción del aire
        p.angulo += p.vAngulo;

        if (transcurrido > DURACION_MS * 0.6) {
          p.opacidad = Math.max(0, 1 - (transcurrido - DURACION_MS * 0.6) / (DURACION_MS * 0.4));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angulo * Math.PI) / 180);
        ctx.globalAlpha = p.opacidad;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      animId = requestAnimationFrame(animar);
    }

    animId = requestAnimationFrame(animar);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", redimensionar);
    };
  }, [onCompletado]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
      aria-hidden="true"
    />,
    document.body,
  );
}
