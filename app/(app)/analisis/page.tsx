import { redirect } from "next/navigation";

/**
 * La pestaña Análisis se unió a Progreso en la ronda 11: tenía la misma línea
 * de peso y el mismo cambio semanal. La dirección se queda para que un enlace
 * viejo o una app ya instalada no den un 404.
 */
export default function PaginaAnalisis() {
  redirect("/progreso");
}
