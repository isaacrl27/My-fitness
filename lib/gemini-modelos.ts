/**
 * Configuración compartida de modelos Gemini para My Fitness.
 *
 * Centraliza la cadena de modelos y los ajustes de razonamiento («thinking»)
 * para las rutas de comida, lectura del reloj de salud y clasificación del buzón:
 * - En visión entra primero `gemini-3-flash-preview` con `thinkingLevel: "minimal"`
 *   (o `"low"` al leer tablas nutricionales/pantallas con cifras pequeñas),
 *   seguido de `gemini-2.5-flash` (`thinkingBudget: 0`) y `gemini-3.5-flash-lite`.
 * - En texto entra primero `gemini-3.5-flash-lite` (máxima velocidad y cuota)
 *   seguido de `gemini-3-flash-preview` y `gemini-2.5-flash`.
 *
 * Evita modelos lentos o retirados (`gemini-3.8-flash`, `gemini-2.5-flash-lite`,
 * `gemini-3.1-flash-lite-preview`) que provocaban esperas de 25-45 segundos.
 */

export type ProfundidadGemini = "minima" | "baja";

export const ESPERA_GEMINI_MS = 12_000;
export const ESPERA_REINTENTO_GEMINI_MS = 600;
export const URL_BASE_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

export const MODELOS_VISION_IA = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
] as const;

export const MODELOS_TEXTO_IA = [
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
] as const;

/**
 * Devuelve `thinkingConfig` compatible con cada familia de Gemini sin gastar
 * segundos extra en tokens de razonamiento oculto ni mandar parámetros que den 400.
 */
export function thinkingConfigDeModelo(
  modelo: string,
  profundidad: ProfundidadGemini = "minima",
): Record<string, unknown> | undefined {
  if (modelo.startsWith("gemini-3") && !modelo.includes("3.5-flash-lite")) {
    return { thinkingLevel: profundidad === "baja" ? "low" : "minimal" };
  }
  if (modelo.startsWith("gemini-2.5")) {
    return { thinkingBudget: 0 };
  }
  return undefined;
}
