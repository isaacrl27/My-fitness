/**
 * Motor de sonidos sintetizados nativos estilo iPhone (Apple iOS).
 *
 * Usa Web Audio API procedural:
 *  - 0 KB de ficheros MP3/WAV que descargar.
 *  - Cero latencia (1 ms).
 *  - Funciona 100 % offline.
 *  - Respeta la preferencia de silencio del usuario en Ajustes.
 */

export const CLAVE_SONIDO = "mi-peso:sonido";

let audioCtx: AudioContext | null = null;

function obtenerAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** ¿Tiene el usuario los sonidos activados en Ajustes? (Activados por defecto). */
export function sonidosActivados(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(CLAVE_SONIDO);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

/** Guarda la preferencia de sonido en Ajustes. */
export function guardarSonidosActivados(activo: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_SONIDO, String(activo));
  } catch {}
}

/**
 * 1. Tap sutil estilo teclado / switch de iPhone.
 * Pulso táctil de 12 ms, muy suave y limpio.
 */
export function sonidoTap(): void {
  if (!sonidosActivados()) return;
  const ctx = obtenerAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.012);

  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.014);
}

/**
 * 2. Gota / burbuja de agua (Water Pop).
 * Sonido orgánico y acuático de 45 ms al añadir agua.
 */
export function sonidoAgua(): void {
  if (!sonidosActivados()) return;
  const ctx = obtenerAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  // Barrido rápido ascendente (efecto burbuja de agua)
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.exponentialRampToValueAtTime(740, t + 0.045);

  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.048);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.05);
}

/**
 * 3. Checkmark táctil (Woodblock / Tock de iPhone).
 * Al tachar un hábito, un ejercicio o la lista de la compra.
 */
export function sonidoCheck(): void {
  if (!sonidosActivados()) return;
  const ctx = obtenerAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;

  // Pulso primario
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(350, t + 0.025);

  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.028);

  // Micro-resonancia aguda
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1400, t);
  gain2.gain.setValueAtTime(0.04, t);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.018);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(t);
  osc2.stop(t + 0.02);
}

/**
 * 4. Éxito / Confirmación elegante estilo Apple Pay (doble campana cristalina).
 * Al guardar comidas o registrar pesada.
 */
export function sonidoExito(): void {
  if (!sonidosActivados()) return;
  const ctx = obtenerAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;

  // Nota 1: La5 (880 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, t);
  gain1.gain.setValueAtTime(0.12, t);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(t);
  osc1.stop(t + 0.15);

  // Nota 2: Mi6 (1318.5 Hz) una quinta justa más aguda
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1318.5, t + 0.08);
  gain2.gain.setValueAtTime(0.14, t + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(t + 0.08);
  osc2.stop(t + 0.36);
}

/**
 * 5. La Gran Celebración: Apple Watch Activity Rings (arpegio mayor brillante).
 * Se dispara al completar el «Día a rajatabla» o al canjear el capricho en la tienda.
 */
export function sonidoCelebracion(): void {
  if (!sonidosActivados()) return;
  const ctx = obtenerAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const notas = [
    { freq: 523.25, offset: 0.0, dur: 0.18 }, // Do5
    { freq: 659.25, offset: 0.08, dur: 0.2 }, // Mi5
    { freq: 783.99, offset: 0.16, dur: 0.24 }, // Sol5
    { freq: 1046.5, offset: 0.24, dur: 0.55 }, // Do6 (campana triunfal)
  ];

  for (const n of notas) {
    const start = t + n.offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(n.freq, start);

    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + n.dur + 0.02);
  }
}

/**
 * 6. Registro de Báscula (tono firme de confirmación).
 */
export function sonidoBascula(): void {
  if (!sonidosActivados()) return;
  const ctx = obtenerAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(293.66, t + 0.09); // Re4

  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.13);
}
