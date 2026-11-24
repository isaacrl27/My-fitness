/**
 * El buzón de la beta: problemas e ideas de la familia.
 *
 * Los mensajes se guardan dentro del perfil de cada persona, en
 * `datos.comentarios`, en vez de en una tabla nueva. Motivo: así no hace falta
 * que nadie entre a Supabase a pegar SQL para que la beta funcione. El coste
 * es que hay que conservar ese campo cuando el móvil sube sus datos (lo hace
 * `conservarCamposDeServidor` en `lib/nube-mapeo.ts`).
 *
 * Aquí no hay nada de red ni de React: solo qué es válido, cómo se guarda y
 * cómo se decide qué es nuevo. Así se puede probar entero con `node`.
 */

import type { CategoriaFeedback } from "./feedback-categorias.ts";
import type { Clasificacion } from "./feedback-ia.ts";

export type TipoComentario = "problema" | "mejora";

export type Comentario = {
  id: string;
  tipo: TipoComentario;
  texto: string;
  /** Dónde estaba la persona cuando lo escribió, para situarlo. */
  pantalla: string;
  /** Fecha ISO completa. */
  creado: string;
  /** Etiqueta del clasificador. Falta en mensajes viejos o si la IA falló. */
  categoria?: CategoriaFeedback;
  /** El clasificador vio algo que suena a tema médico. */
  alertaSalud?: boolean;
};

/** Un comentario con el nombre de quien lo escribió, para la lista de Isaac. */
export type ComentarioConNombre = Comentario & { nombre: string };

/** Menos de esto no dice nada y solo hace perder el tiempo. */
export const TEXTO_MINIMO = 5;

/** Más de esto ya no se lee; se corta en vez de rechazarlo. */
export const TEXTO_MAXIMO = 1000;

/** Tope por persona: si alguien se pone a escribir sin parar, no crece sin fin. */
export const MAX_COMENTARIOS = 200;

/** Dónde se escribe si el móvil no manda la pantalla. */
export const PANTALLA_POR_DEFECTO = "/ajustes";

export const MOTIVO_TIPO = "Dinos si es un problema o una idea.";
export const MOTIVO_CORTO = "Cuéntalo con un poco más de detalle.";

/** Devuelve el tipo si es uno de los dos válidos, o `null`. */
export function tipoDe(valor: unknown): TipoComentario | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toLowerCase();
  if (limpio === "problema") return "problema";
  if (limpio === "mejora") return "mejora";
  return null;
}

/**
 * Deja el texto en una sola línea legible: sin espacios de más, sin saltos
 * repetidos y con un tope. Nunca lanza.
 */
export function limpiarTexto(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/\s+/g, " ").trim().slice(0, TEXTO_MAXIMO);
}

/** Deja la pantalla en algo corto y con forma de ruta interna. */
function limpiarPantalla(valor: unknown): string {
  if (typeof valor !== "string") return PANTALLA_POR_DEFECTO;
  const limpia = valor.trim().slice(0, 80);
  if (!limpia.startsWith("/")) return PANTALLA_POR_DEFECTO;
  return limpia;
}

export type ResultadoComentario =
  | { ok: true; comentario: Comentario }
  | { ok: false; motivo: string };

/**
 * El texto que se manda a Telegram cuando alguien escribe en el buzón.
 *
 * Va en llano y con el texto tal cual: lo primero que se ve en el móvil es
 * quién escribe y desde qué pantalla, para saber si hay que mirarlo corriendo.
 */
export function avisoDelBuzon(
  comentario: Comentario,
  nombre: string,
  codigo?: string,
): string {
  const que = comentario.tipo === "problema" ? "⚠️ Problema" : "💡 Idea";
  const quien = nombre.trim() || "la familia";
  const donde = comentario.pantalla ? ` (${comentario.pantalla})` : "";
  if (!codigo) {
    return `${comentario.tipo === "problema" ? "Problema" : "Idea"} de ${quien}${donde}\n\n${comentario.texto}`;
  }
  const codLimpio = codigo.trim().toUpperCase();
  return `${que} de ${quien}${donde}\nCódigo: ${codLimpio}\n\n"${comentario.texto}"\n\n━━━━━━━━━━━━━━━━━━━━\n👉 Para responderle a su app, responde a este mensaje o envía:\n/responder ${codLimpio} <tu respuesta>`;
}

/**
 * Valida y prepara un comentario.
 *
 * `ahora` e `id` se pueden pasar para que la prueba sea repetible; en la app
 * se dejan por defecto.
 */
export function nuevoComentario(
  entrada: { tipo?: unknown; texto?: unknown; pantalla?: unknown },
  ahora: Date = new Date(),
  id: string = crypto.randomUUID(),
): ResultadoComentario {
  const tipo = tipoDe(entrada.tipo);
  if (!tipo) return { ok: false, motivo: MOTIVO_TIPO };

  const texto = limpiarTexto(entrada.texto);
  if (texto.length < TEXTO_MINIMO) return { ok: false, motivo: MOTIVO_CORTO };

  return {
    ok: true,
    comentario: {
      id,
      tipo,
      texto,
      pantalla: limpiarPantalla(entrada.pantalla),
      creado: ahora.toISOString(),
    },
  };
}

/** ¿Esto tiene forma de comentario guardado? Sirve para tolerar datos viejos. */
export function esComentario(valor: unknown): valor is Comentario {
  if (!valor || typeof valor !== "object") return false;
  const c = valor as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    tipoDe(c.tipo) !== null &&
    typeof c.texto === "string" &&
    c.texto.length > 0 &&
    typeof c.creado === "string" &&
    !Number.isNaN(Date.parse(c.creado))
  );
}

/** Saca los comentarios guardados de los datos de un perfil, sin romperse. */
export function comentariosDe(datos: unknown): Comentario[] {
  if (!datos || typeof datos !== "object") return [];
  const lista = (datos as Record<string, unknown>).comentarios;
  if (!Array.isArray(lista)) return [];
  return lista.filter(esComentario).map((c) => ({ ...c, pantalla: c.pantalla ?? PANTALLA_POR_DEFECTO }));
}

/**
 * Devuelve una copia de los datos con el comentario añadido al final.
 *
 * No toca el objeto que recibe: en el servidor se lee el perfil, se añade y se
 * guarda; si algo falla por el camino, lo que había sigue intacto. Si la lista
 * se pasa del tope, se tiran los más viejos.
 */
export function anadirComentario(
  datos: Record<string, unknown>,
  comentario: Comentario,
): Record<string, unknown> {
  const previos = comentariosDe(datos);
  const siguientes = [...previos, comentario].slice(-MAX_COMENTARIOS);
  return { ...datos, comentarios: siguientes };
}

/**
 * ¿Llegó después de la última vez que Isaac abrió la lista?
 *
 * `leidos` es la fecha ISO de esa última visita. Sin fecha válida se considera
 * todo nuevo, que es lo que conviene cuando alguien acaba de instalar la app.
 */
export function esNuevo(comentario: Comentario, leidos: unknown): boolean {
  if (typeof leidos !== "string" || leidos.trim() === "") return true;
  const desde = Date.parse(leidos);
  if (Number.isNaN(desde)) return true;
  const cuando = Date.parse(comentario.creado);
  if (Number.isNaN(cuando)) return false;
  return cuando > desde;
}

/** El más reciente primero, para enseñar la lista. */
export function ordenarDeNuevoAViejo<T extends Comentario>(lista: T[]): T[] {
  return [...lista].sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado));
}

/**
 * Apunta la etiqueta del clasificador en un comentario ya guardado.
 *
 * Se hace en el servidor, después de contestar al móvil. Si el comentario ya
 * no está (porque el perfil se pisó o alguien borró), devuelve los datos tal
 * cual: perder una etiqueta es barato, perder el mensaje no.
 */
export function anotarClasificacion(
  datos: Record<string, unknown>,
  id: string,
  clasificacion: Clasificacion,
): Record<string, unknown> {
  const previos = comentariosDe(datos);
  if (!previos.some((c) => c.id === id)) return datos;

  const siguientes = previos.map((c) =>
    c.id === id
      ? { ...c, categoria: clasificacion.categoria, alertaSalud: clasificacion.alertaSalud }
      : c,
  );
  return { ...datos, comentarios: siguientes };
}

/** ¿Este mensaje lleva aviso de salud? Lo usa la lista de Isaac. */
export function esAlertaSalud(comentario: Comentario): boolean {
  return comentario.alertaSalud === true || comentario.categoria === "salud_medico";
}
