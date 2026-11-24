/**
 * La regla del nombre.
 *
 * El nombre lo escribe cada uno en el cuestionario y se puede cambiar en
 * Ajustes. Viaja a la nube y sale en el aviso del buzón («Problema de …»), así
 * que no vale cualquier cosa: solo letras (con tildes, ñ y letras de otros
 * alfabetos), espacios y guiones entre palabras, y como mucho 20.
 *
 * La regla vive aquí para que el cuestionario y Ajustes usen exactamente la
 * misma. Los perfiles viejos con nombres raros no se tocan: esto solo se
 * aplica cuando alguien escribe un nombre nuevo.
 */

/** Letras y letras: 20 es lo que cabe sin que el saludo se parta en el móvil. */
export const NOMBRE_MAX = 20;

/**
 * Una palabra o varias, separadas por un espacio o un guion. `\p{L}` son las
 * letras de cualquier alfabeto: así entran las tildes, la ñ y los nombres de
 * fuera sin hacer una lista que siempre se queda corta.
 */
const FORMA = /^\p{L}+(?:[ -]\p{L}+)*$/u;

/** Quita los espacios de los extremos y junta los de dentro. */
export function nombreLimpio(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

export type NombreRevisado =
  | { ok: true; nombre: string }
  | { ok: false; motivo: string };

/**
 * Revisa un nombre escrito. Devuelve el nombre ya limpio si vale, o el motivo
 * en llano si no: el mismo texto se enseña debajo de la caja.
 */
export function revisarNombre(texto: string): NombreRevisado {
  const nombre = nombreLimpio(texto);
  if (!nombre) return { ok: false, motivo: "Escribe tu nombre." };
  if ([...nombre].length > NOMBRE_MAX) {
    return { ok: false, motivo: `Como mucho ${NOMBRE_MAX} letras.` };
  }
  if (!FORMA.test(nombre)) {
    return {
      ok: false,
      motivo: "Solo letras, espacios y guiones entre palabras (por ejemplo, María José).",
    };
  }
  return { ok: true, nombre };
}
