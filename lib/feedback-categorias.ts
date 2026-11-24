/**
 * Las etiquetas del buzón, sin red y sin React.
 *
 * Viven aparte del clasificador (`lib/feedback-ia.ts`) para que la pantalla de
 * Ajustes pueda enseñarlas sin arrastrar al móvil el código que habla con
 * Gemini.
 */

/** Las seis etiquetas del clasificador. */
export type CategoriaFeedback =
  | "bug_bloqueante"
  | "bug_visual"
  | "duda"
  | "sugerencia"
  | "salud_medico"
  | "spam";

/** Todas las categorías, en el orden en que se explican al modelo. */
export const CATEGORIAS: CategoriaFeedback[] = [
  "bug_bloqueante",
  "bug_visual",
  "duda",
  "sugerencia",
  "salud_medico",
  "spam",
];

/** Cómo se enseña cada etiqueta en la lista de Isaac. */
export const ETIQUETA_CATEGORIA: Record<CategoriaFeedback, string> = {
  bug_bloqueante: "Fallo que bloquea",
  bug_visual: "Fallo visual",
  duda: "Duda",
  sugerencia: "Sugerencia",
  salud_medico: "Salud (médico)",
  spam: "Spam",
};

/** Lee una categoría escrita por el modelo. Devuelve `null` si no es válida. */
export function categoriaDe(valor: unknown): CategoriaFeedback | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toLowerCase();
  return (CATEGORIAS as string[]).includes(limpio) ? (limpio as CategoriaFeedback) : null;
}