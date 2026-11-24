/**
 * Sistema reactivo de reacciones con emojis flotantes (estilo Rare UI / TikTok / iOS).
 *
 * Sin dependencias externas, ligero y con aceleración por hardware.
 */

import { vibrarTap } from "./haptica.ts";

export type ParticulaReaccion = {
  id: string;
  emoji: string;
  x: number; // Coordenada X en px
  y: number; // Coordenada Y en px
  dx: number; // Desplazamiento lateral orgánico (-35 a +35 px)
  rotacion: number; // Inclinación aleatoria (-25 a +25 grados)
  escala: number; // Escala visual (0.9 a 1.35)
  duracionMs: number; // Duración del vuelo (1200 a 1600 ms)
  retrasoMs: number; // Retraso escalonado (0 a 180 ms)
};

type Listener = (particulas: ParticulaReaccion[]) => void;
const listeners = new Set<Listener>();

export type OrigenReaccion =
  | { x?: number; y?: number }
  | React.MouseEvent<HTMLElement>
  | React.TouchEvent<HTMLElement>
  | MouseEvent
  | TouchEvent;

/**
 * Dispara una ráfaga de emojis flotantes desde un punto de origen (o el cursor/toque).
 */
export function lanzarReaccion(
  emoji: string,
  origen?: OrigenReaccion,
  cantidad = 6
): void {
  // Respeto absoluto a la accesibilidad del usuario
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    cantidad = 1;
  }

  // Extraer coordenadas exactas
  let x = typeof window !== "undefined" ? window.innerWidth / 2 : 200;
  let y = typeof window !== "undefined" ? window.innerHeight * 0.75 : 400;

  if (origen) {
    if ("clientX" in origen && typeof origen.clientX === "number") {
      x = origen.clientX;
      y = origen.clientY;
    } else if ("touches" in origen && origen.touches.length > 0) {
      x = origen.touches[0].clientX;
      y = origen.touches[0].clientY;
    } else if ("x" in origen && typeof origen.x === "number") {
      x = origen.x;
      if (typeof origen.y === "number") y = origen.y;
    }
  }

  // Pequeña respuesta háptica
  try {
    vibrarTap();
  } catch {
    // Entorno de pruebas o sin motor háptico
  }

  const nuevas: ParticulaReaccion[] = Array.from({ length: Math.max(1, cantidad) }).map((_, i) => ({
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    emoji,
    x: x + (Math.random() - 0.5) * 24, // Pequeña dispersión inicial
    y: y + (Math.random() - 0.5) * 12,
    dx: (Math.random() - 0.5) * 70, // Vaivén lateral orgánico
    rotacion: (Math.random() - 0.5) * 40,
    escala: 0.95 + Math.random() * 0.4,
    duracionMs: 1250 + Math.floor(Math.random() * 350),
    retrasoMs: i * 35, // Salida escalonada
  }));

  listeners.forEach((fn) => fn(nuevas));
}

/**
 * Suscribe un contenedor al flujo de partículas flotantes.
 */
export function suscribirReacciones(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
