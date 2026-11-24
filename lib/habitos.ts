/**
 * Los hábitos: la lista grande de la que cada persona elige los suyos.
 *
 * Catálogo fijo en español (25), cada uno con su etiqueta y una ayuda de una
 * línea. En Ajustes se encienden y se apagan; en Hoy se marcan con un toque.
 * Los puntos que dan los cuenta lib/puntos.ts (tope de 5 marcas al día).
 *
 * Los hábitos no tienen aviso propio (tope de 5 al día): cada uno dice a cuál
 * de los cinco avisos de lib/avisos.ts se engancha, y van dentro de ese aviso.
 *
 * Puro a propósito: ni reloj ni red, para poder probarlo con node tal cual.
 */

export type IdHabito =
  | "sol"
  | "vitaminas"
  | "leer"
  | "dormir"
  | "correr"
  | "caminar"
  | "luz-manana"
  | "meditar"
  | "estiramientos"
  | "sin-picar"
  | "verdura"
  | "fruta"
  | "proteina"
  | "desayunar"
  | "sin-movil-mesa"
  | "paseo-comer"
  | "postura"
  | "desconectar"
  | "respirar"
  | "sin-refrescos"
  | "cafe-medida"
  | "vaso-mas"
  | "acostarse-hora"
  | "cena-ligera"
  | "ordenar-un-rato";

export type Habito = {
  id: IdHabito;
  etiqueta: string;
  ayuda: string;
  /** A cuál de los avisos se engancha: ese aviso lo menciona si falta por marcar. */
  momentoAviso: "desayuno" | "comida" | "andar" | "cena";
};

/** El catálogo entero. El orden es el que se enseña en Ajustes. */
export const CATALOGO_HABITOS: Habito[] = [
  { id: "sol", etiqueta: "Tomar el sol", ayuda: "15 min de luz natural", momentoAviso: "comida" },
  { id: "vitaminas", etiqueta: "Vitaminas", ayuda: "La suplementación del día", momentoAviso: "desayuno" },
  { id: "leer", etiqueta: "Leer", ayuda: "15-20 minutos", momentoAviso: "cena" },
  { id: "dormir", etiqueta: "Dormir 7-8 h", ayuda: "Descanso completo anoche", momentoAviso: "cena" },
  { id: "correr", etiqueta: "Correr o entrenar", ayuda: "La sesión del día", momentoAviso: "andar" },
  { id: "caminar", etiqueta: "Caminar 30 min", ayuda: "Un paseo sin prisa", momentoAviso: "andar" },
  {
    id: "luz-manana",
    etiqueta: "Luz al despertar",
    ayuda: "Un rato de luz nada más levantarse",
    momentoAviso: "desayuno",
  },
  { id: "meditar", etiqueta: "Meditar", ayuda: "5 minutos de calma", momentoAviso: "cena" },
  { id: "estiramientos", etiqueta: "Estirar", ayuda: "5-10 min de estiramientos", momentoAviso: "andar" },
  { id: "sin-picar", etiqueta: "No picar entre horas", ayuda: "Respetar las comidas", momentoAviso: "comida" },
  { id: "verdura", etiqueta: "Verdura", ayuda: "Al menos una ración", momentoAviso: "comida" },
  { id: "fruta", etiqueta: "Fruta", ayuda: "Al menos una pieza", momentoAviso: "comida" },
  { id: "proteina", etiqueta: "Proteína en las comidas", ayuda: "Un puñito por comida", momentoAviso: "comida" },
  { id: "desayunar", etiqueta: "Desayunar", ayuda: "Sin saltárselo", momentoAviso: "desayuno" },
  { id: "sin-movil-mesa", etiqueta: "Comer sin móvil", ayuda: "La comida, sin pantallas", momentoAviso: "comida" },
  { id: "paseo-comer", etiqueta: "Paseo después de comer", ayuda: "10-15 min andando", momentoAviso: "comida" },
  { id: "postura", etiqueta: "Cuidar la postura", ayuda: "Espalda recta al estar sentado", momentoAviso: "cena" },
  { id: "desconectar", etiqueta: "Desconectar el móvil", ayuda: "Una hora sin notificaciones", momentoAviso: "cena" },
  { id: "respirar", etiqueta: "Respirar despacio", ayuda: "Algunas respiraciones profundas", momentoAviso: "cena" },
  { id: "sin-refrescos", etiqueta: "Sin refrescos", ayuda: "Agua en su lugar", momentoAviso: "comida" },
  { id: "cafe-medida", etiqueta: "Café con medida", ayuda: "Sin pasarse hoy", momentoAviso: "comida" },
  { id: "vaso-mas", etiqueta: "Un vaso más de agua", ayuda: "Uno fuera de tu meta", momentoAviso: "cena" },
  { id: "acostarse-hora", etiqueta: "Acostarse a hora fija", ayuda: "La de siempre +/- 30 min", momentoAviso: "cena" },
  { id: "cena-ligera", etiqueta: "Cena sin pasarme", ayuda: "Ligero y sin ahogarse", momentoAviso: "cena" },
  { id: "ordenar-un-rato", etiqueta: "Ordenar un rato", ayuda: "10 min de casa o escritorio", momentoAviso: "cena" },
];

/** Los hábitos de movimiento: marcar cualquiera de ellos hoy ya cuenta como
 * haberse movido, y el aviso de andar (18:00) se queda callado.
 */
export const HABITOS_MOVIMIENTO: IdHabito[] = ["correr", "caminar", "estiramientos"];

/**
 * Un hábito que se ha inventado la persona.
 *
 * El catálogo tiene 25 fijos, pero cada uno puede añadir el suyo («Beber 2
 * litros», «Sacar al perro»). Se guarda con su id (`propio:beber-2-litros`) y
 * su etiqueta, dentro del perfil, para que viaje a la nube con todo lo demás.
 */
export type HabitoPropio = { id: string; etiqueta: string };

/** Los ids de los hábitos propios empiezan así; ningún id del catálogo lo hace. */
export const PREFIJO_PROPIO = "propio:";

/** ¿Este id es de un hábito inventado? */
export function esHabitoPropio(id: string): boolean {
  return id.startsWith(PREFIJO_PROPIO);
}

/** ¿Vale este id? O está en el catálogo, o es uno de los propios de esa persona. */
export function esHabitoValido(
  valor: unknown,
  propios: readonly HabitoPropio[] = [],
): boolean {
  return (
    typeof valor === "string" &&
    (esHabito(valor) || propios.some((p) => p.id === valor))
  );
}

/** A qué aviso se engancha un hábito; los propios van al de la cena. */
export function momentoDeAviso(
  id: string,
  propios: readonly HabitoPropio[] = [],
): "desayuno" | "comida" | "andar" | "cena" {
  const delCatalogo = CATALOGO_HABITOS.find((h) => h.id === id)?.momentoAviso;
  if (delCatalogo) return delCatalogo;
  // Cualquier hábito inventado (o uno viejo que ya no esté) se recuerda por la
  // noche, que es el aviso de cerrar el día.
  void propios;
  return "cena";
}

/** Una letra o un número, sin tildes, para comparar y para hacer ids. */
function clave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type HabitoCreado =
  | { ok: true; habito: HabitoPropio }
  | { ok: false; motivo: string };

/**
 * Crea un hábito con el nombre que escriba la persona. No deja repetir uno que
 * ya exista (ni del catálogo ni suyo) y devuelve un id estable sacado del
 * nombre: así el aviso y los puntos lo reconocen siempre.
 */
export function crearHabitoPropio(
  nombre: string,
  propios: readonly HabitoPropio[] = [],
): HabitoCreado {
  const etiqueta = nombre.trim().replace(/\s+/g, " ");
  if ([...etiqueta].length < 2) {
    return { ok: false, motivo: "Escribe el hábito (dos letras o más)." };
  }
  if ([...etiqueta].length > 30) {
    return { ok: false, motivo: "Como mucho 30 letras." };
  }

  const suyo = clave(etiqueta);
  const repetido =
    CATALOGO_HABITOS.find((h) => clave(h.etiqueta) === suyo) ??
    propios.find((p) => clave(p.etiqueta) === suyo);
  if (repetido) {
    return { ok: false, motivo: `Ya lo tienes: «${repetido.etiqueta}».` };
  }

  const base = `${PREFIJO_PROPIO}${suyo.replace(/\s+/g, "-") || "habito"}`;
  let id = base;
  let numero = 2;
  while (propios.some((p) => p.id === id)) {
    id = `${base}-${numero}`;
    numero += 1;
  }
  return { ok: true, habito: { id, etiqueta } };
}

/** Los que vienen encendidos de fábrica: los5 que Isaac nombró. */
export const HABITOS_INICIALES: IdHabito[] = [
  "sol",
  "vitaminas",
  "leer",
  "dormir",
  "correr",
];

/** ¿Este valor es un hábito del catálogo? Para no dejar entradas raras. */
export function esHabito(valor: unknown): valor is IdHabito {
  return typeof valor === "string" && CATALOGO_HABITOS.some((h) => h.id === valor);
}

/** La etiqueta de un hábito; si no está en el catálogo ni es suyo, su propio id. */
export function etiquetaDe(id: string, propios: readonly HabitoPropio[] = []): string {
  return (
    CATALOGO_HABITOS.find((h) => h.id === id)?.etiqueta ??
    propios.find((p) => p.id === id)?.etiqueta ??
    id
  );
}

/**
 * Los hábitos activos que aún no están marcados, en el orden del catálogo y
 * después los suyos (en el orden en que los creó). De aquí salen los
 * pendientes que acompañan a los avisos de comida y cena.
 */
export function faltanHabitos(
  activos: readonly string[],
  hechos: readonly string[] | undefined,
  propios: readonly HabitoPropio[] = [],
): string[] {
  const puestos = new Set(hechos ?? []);
  const delCatalogo = CATALOGO_HABITOS.filter(
    (h) => activos.includes(h.id) && !puestos.has(h.id),
  ).map((h) => h.id);
  const suyos = propios
    .filter((p) => activos.includes(p.id) && !puestos.has(p.id))
    .map((p) => p.id);
  return [...delCatalogo, ...suyos];
}
