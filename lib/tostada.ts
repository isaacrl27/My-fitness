/**
 * Sistema de notificaciones flotantes (Toast) estilo Duolingo / iOS.
 *
 * Ligero, sin dependencias, basado en eventos.
 * Implementa Gooey Drop y Merge Counter (Vídeo 6):
 * - Fusión automática de avisos consecutivos en una sola notificación con contador acumulativo (+2, +3...).
 * - Reinicio inteligente del temporizador al acumular avisos.
 */

export type NotificacionTostada = {
  id: string;
  mensaje: string;
  icono?: string;
  cuenta: number;
  tipo?: string;
  timestamp: number;
};

type Listener = (t: NotificacionTostada | null) => void;
const listeners = new Set<Listener>();
let tostadaActiva: NotificacionTostada | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function obtenerTostadaActiva(): NotificacionTostada | null {
  return tostadaActiva;
}

export function cerrarTostada(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  tostadaActiva = null;
  listeners.forEach((fn) => fn(null));
}

export function mostrarTostada(
  mensaje: string,
  icono = "✨",
  duracionMs = 3000,
  tipo?: string
): NotificacionTostada {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  // Merge Counter: si ya hay una notificación activa en pantalla, fusionar e incrementar el contador
  let cuenta = 1;
  if (tostadaActiva) {
    cuenta = (tostadaActiva.cuenta || 1) + 1;
  }

  const tostada: NotificacionTostada = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    mensaje,
    icono,
    cuenta,
    tipo,
    timestamp: Date.now(),
  };

  tostadaActiva = tostada;
  listeners.forEach((fn) => fn(tostada));

  // Más tiempo para leer si se acumulan notificaciones (mínimo 3s, +450ms por cada aviso acumulado)
  const tiempoLectura = Math.min(6000, duracionMs + (cuenta - 1) * 450);

  timer = setTimeout(() => {
    cerrarTostada();
  }, tiempoLectura);

  return tostada;
}

export function suscribirTostadas(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
