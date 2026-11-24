/**
 * El motor de combinaciones: los «1000 platos» de Isaac.
 *
 * Isaac lo pidió así: no quiere una cata plato a plato ni que le preguntemos
 * qué le gusta; quiere que, con los ingredientes que no le gustan, la app se
 * invente muchísimos platos distintos. Pero una combinación libre (pollo con
 * avena y kiwi) sería un desastre. Así que el plato se monta con **piezas que
 * pegan entre sí**, como en una cocina de verdad: una proteína, un
 * acompañamiento, una verdura y un aliño.
 *
 * Cada pieza lleva sus macros y sus gramos, y el plato combinado es la suma.
 * Las listas de compatibilidad (qué acompañamiento y qué aliño van con cada
 * proteína) están escritas a mano y son listas blancas: lo que no está, no
 * sale. Nunca se combina al azar.
 *
 * Esto no sustituye al catálogo de `PLATOS`: se suma. Los 80 platos escritos
 * siguen saliendo, y las combinaciones dan la variedad que una lista corta no
 * puede dar. El plan semanal no distingue unos de otros: todos son `Plato`.
 */
import type { Ingrediente, Momento, Plato } from "./platos";

export type CategoriaPieza = "proteina" | "acompanamiento" | "verdura" | "alino";

type PiezaBase = {
  id: string;
  /** En minúscula: el plato lo pone en mayúscula al principio. */
  nombre: string;
  categoria: CategoriaPieza;
  /** En qué comidas encaja esta pieza. */
  momentos: Momento[];
  ingredientes: Ingrediente[];
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  /** Dietas que cumple: vegano, vegetariano, sin-gluten, sin-lactosa. */
  etiquetas: string[];
  /** Un paso corto para la ficha del plato combinado. */
  preparacion: string;
};

export type Pieza = PiezaBase & { kcal: number };

/**
 * Las kcal no se escriben a mano: se calculan de los macros (4/4/9). Así el
 * plato combinado siempre cuadra y no hay que repetir la cuenta en cada pieza.
 */
function pieza(p: PiezaBase): Pieza {
  return { ...p, kcal: Math.round(4 * p.proteinas + 4 * p.carbohidratos + 9 * p.grasas) };
}

const CARNE = "Carnes y pescados";
const VERDURA = "Frutas y verduras";
const CEREAL = "Cereales y legumbres";
const GRASA = "Frutos secos y grasas";
const LACTEO = "Lácteos y huevos";
const OTROS = "Otros";

// --- Proteínas -------------------------------------------------------------

const PROTEINAS: Pieza[] = [
  pieza({
    id: "pollo",
    nombre: "pollo a la plancha",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Pechuga de pollo", gramos: 150, categoria: CARNE },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 33,
    carbohidratos: 0,
    grasas: 7,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion:
      "Haz la pechuga de pollo a la plancha 4 minutos por cada lado, hasta que esté dorada y sin rosa por dentro.",
  }),
  pieza({
    id: "pavo",
    nombre: "pavo a la plancha",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Pavo", gramos: 150, categoria: CARNE },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 32,
    carbohidratos: 0,
    grasas: 6,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Haz el pavo a la plancha 3 minutos por cada lado; que no se seque.",
  }),
  pieza({
    id: "ternera",
    nombre: "ternera a la plancha",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Ternera", gramos: 150, categoria: CARNE },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 31,
    carbohidratos: 0,
    grasas: 12,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Dora la ternera 3 minutos por cada lado; dentro puede quedar un poco rosada.",
  }),
  pieza({
    id: "cerdo",
    nombre: "lomo de cerdo a la plancha",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Lomo de cerdo", gramos: 150, categoria: CARNE },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 30,
    carbohidratos: 0,
    grasas: 10,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Haz el lomo a la plancha 4 minutos por cada lado, hasta que pierda el rosa.",
  }),
  pieza({
    id: "merluza",
    nombre: "merluza al horno",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Merluza", gramos: 180, categoria: CARNE },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 30,
    carbohidratos: 0,
    grasas: 3,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Hornea la merluza 12 minutos a 200 °C con un chorrito de aceite.",
  }),
  pieza({
    id: "salmon",
    nombre: "salmón al horno",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [{ nombre: "Salmón", gramos: 150, categoria: CARNE }],
    proteinas: 30,
    carbohidratos: 0,
    grasas: 15,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Hornea el salmón 12 minutos a 200 °C, o hazlo a la plancha 3 minutos por cada lado.",
  }),
  pieza({
    id: "atun",
    nombre: "atún a la plancha",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Atún", gramos: 150, categoria: CARNE },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 33,
    carbohidratos: 0,
    grasas: 5,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Marca el atún 2 minutos por cada lado (o usa 2 latas de atún al natural bien escurridas directamente sin encender el fuego).",
  }),
  pieza({
    id: "gambas",
    nombre: "gambas al ajillo",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Gambas", gramos: 150, categoria: CARNE },
      { nombre: "Ajo", gramos: 5, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 28,
    carbohidratos: 1,
    grasas: 3,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Saltea las gambas 3 minutos con un diente de ajo, hasta que se pongan rosas.",
  }),
  pieza({
    id: "huevo",
    nombre: "tortilla de tres huevos",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Huevo", gramos: 150, categoria: LACTEO },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 19,
    carbohidratos: 1,
    grasas: 15,
    etiquetas: ["vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion:
      "Bate tres huevos y haz la tortilla (o usa 2 huevos cocidos cortados por la mitad sin encender el fuego).",
  }),
  pieza({
    id: "tofu",
    nombre: "tofu dorado",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Tofu", gramos: 200, categoria: OTROS },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 16,
    carbohidratos: 4,
    grasas: 12,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Escurre el tofu, córtalo en dados y dóralo 8 minutos en la sartén.",
  }),
  pieza({
    id: "lentejas",
    nombre: "lentejas guisadas",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Lentejas cocidas", gramos: 150, categoria: CEREAL },
      { nombre: "Ajo", gramos: 5, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 12,
    carbohidratos: 30,
    grasas: 2,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Calienta las lentejas cocidas con un sofrito de ajo y tomate.",
  }),
  pieza({
    id: "garbanzos",
    nombre: "garbanzos salteados",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Garbanzos cocidos", gramos: 150, categoria: CEREAL },
      { nombre: "Ajo", gramos: 5, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 12,
    carbohidratos: 30,
    grasas: 4,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Saltea los garbanzos cocidos 5 minutos con ajo y una pizca de pimentón.",
  }),
  pieza({
    id: "sardinas",
    nombre: "sardinas a la plancha",
    categoria: "proteina",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Sardinas", gramos: 120, categoria: CARNE },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 25,
    carbohidratos: 0,
    grasas: 12,
    etiquetas: ["sin-gluten", "sin-lactosa"],
    preparacion: "Haz las sardinas a la plancha 3 minutos por cada lado.",
  }),
];

// --- Acompañamientos -------------------------------------------------------

const ACOMPANAMIENTOS: Pieza[] = [
  pieza({
    id: "arroz",
    nombre: "arroz blanco",
    categoria: "acompanamiento",
    momentos: ["comida", "cena"],
    ingredientes: [{ nombre: "Arroz", gramos: 60, categoria: CEREAL }],
    proteinas: 4.5,
    carbohidratos: 45,
    grasas: 0.5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Cuece el arroz 18 minutos en agua con una pizca de sal y escúrrelo (60 g en crudo equivalen a unos 180 g cocido o un vasito de microondas de 1 minuto).",
  }),
  pieza({
    id: "patata",
    nombre: "patata cocida",
    categoria: "acompanamiento",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Patata", gramos: 250, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 3, categoria: GRASA },
    ],
    proteinas: 5,
    carbohidratos: 35,
    grasas: 3,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Cuece la patata en trozos 20 minutos, hasta que se pinche sin resistencia.",
  }),
  pieza({
    id: "pasta",
    nombre: "pasta integral",
    categoria: "acompanamiento",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Pasta integral", gramos: 60, categoria: CEREAL },
      { nombre: "Aceite de oliva", gramos: 3, categoria: GRASA },
    ],
    proteinas: 5,
    carbohidratos: 44,
    grasas: 2,
    // La pasta lleva gluten.
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
    preparacion: "Cuece la pasta 10 minutos (60 g en crudo equivalen a unos 140 g cocida), escúrrela y mézclala con un chorrito de aceite.",
  }),
  pieza({
    id: "couscous",
    nombre: "cuscús",
    categoria: "acompanamiento",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Cuscús", gramos: 60, categoria: CEREAL },
      { nombre: "Aceite de oliva", gramos: 3, categoria: GRASA },
    ],
    proteinas: 4,
    carbohidratos: 45,
    grasas: 2,
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
    preparacion: "Echa el cuscús en un bol con el mismo volumen de agua caliente y espera 5 minutos (60 g en crudo rinden unos 150 g cocido).",
  }),
  pieza({
    id: "quinoa",
    nombre: "quinoa",
    categoria: "acompanamiento",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Quinoa", gramos: 60, categoria: CEREAL },
      { nombre: "Aceite de oliva", gramos: 3, categoria: GRASA },
    ],
    proteinas: 6,
    carbohidratos: 40,
    grasas: 4,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Lava la quinoa y cuécela 15 minutos (60 g en crudo equivalen a unos 180 g cocida); escúrrela.",
  }),
  pieza({
    id: "pan",
    nombre: "pan integral",
    categoria: "acompanamiento",
    momentos: ["comida", "cena"],
    ingredientes: [{ nombre: "Pan integral", gramos: 60, categoria: CEREAL }],
    proteinas: 5,
    carbohidratos: 30,
    grasas: 1,
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
    preparacion: "Tuesta el pan integral y córtalo en rebanadas.",
  }),
  pieza({
    id: "boniato",
    nombre: "boniato asado",
    categoria: "acompanamiento",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Boniato", gramos: 200, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 3, categoria: GRASA },
    ],
    proteinas: 3,
    carbohidratos: 40,
    grasas: 2,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Asa el boniato en trozos 25 minutos a 200 °C.",
  }),
];

// --- Verduras --------------------------------------------------------------

const VERDURAS: Pieza[] = [
  pieza({
    id: "brocoli",
    nombre: "brócoli al vapor",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Brócoli", gramos: 200, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 5,
    carbohidratos: 8,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Cuece el brócoli 6 minutos al vapor; que quede verde y firme.",
  }),
  pieza({
    id: "judias",
    nombre: "judías verdes",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Judías verdes", gramos: 200, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 3,
    carbohidratos: 7,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Cuece las judías verdes 8 minutos y escúrrelas.",
  }),
  pieza({
    id: "espinacas",
    nombre: "espinacas salteadas",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Espinacas", gramos: 150, categoria: VERDURA },
      { nombre: "Ajo", gramos: 3, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 4,
    carbohidratos: 4,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Saltea las espinacas 3 minutos con un diente de ajo.",
  }),
  pieza({
    id: "calabacin",
    nombre: "calabacín a la plancha",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Calabacín", gramos: 200, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 2,
    carbohidratos: 5,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Haz el calabacín a la plancha en rodajas, 3 minutos por cada lado.",
  }),
  pieza({
    id: "pimientos",
    nombre: "pimientos asados",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Pimiento rojo", gramos: 150, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 1,
    carbohidratos: 7,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Asa el pimiento 15 minutos a 200 °C y pélalo, o cómpralo ya asado.",
  }),
  pieza({
    id: "ensalada",
    nombre: "ensalada mixta",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Lechuga", gramos: 100, categoria: VERDURA },
      { nombre: "Tomate", gramos: 50, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 1.5,
    carbohidratos: 5,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Lava la lechuga y el tomate y aliña con aceite y vinagre.",
  }),
  pieza({
    id: "tomate",
    nombre: "tomate en rodajas",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Tomate", gramos: 150, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 3, categoria: GRASA },
    ],
    proteinas: 1.5,
    carbohidratos: 5,
    grasas: 3,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Corta el tomate en rodajas y échale una pizca de sal.",
  }),
  pieza({
    id: "coliflor",
    nombre: "coliflor al vapor",
    categoria: "verdura",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Coliflor", gramos: 200, categoria: VERDURA },
      { nombre: "Ajo", gramos: 3, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 4,
    carbohidratos: 7,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Cuece la coliflor en ramilletes 8 minutos al vapor.",
  }),
];

// --- Aliños ----------------------------------------------------------------

const ALINOS: Pieza[] = [
  pieza({
    id: "limon",
    nombre: "limón",
    categoria: "alino",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Limón", gramos: 20, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 0.2,
    carbohidratos: 1,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Mezcla el zumo de medio limón con una cucharada de aceite y un poco de sal.",
  }),
  pieza({
    id: "yogur",
    nombre: "salsa de yogur",
    categoria: "alino",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Yogur griego", gramos: 60, categoria: LACTEO },
      { nombre: "Ajo", gramos: 3, categoria: VERDURA },
      { nombre: "Limón", gramos: 10, categoria: VERDURA },
    ],
    proteinas: 4,
    carbohidratos: 4,
    grasas: 6,
    etiquetas: ["vegetariano"],
    preparacion: "Mezcla el yogur griego con ajo picado, unas gotas de limón y sal.",
  }),
  pieza({
    id: "soja",
    nombre: "salsa de soja",
    categoria: "alino",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Salsa de soja", gramos: 15, categoria: OTROS },
      { nombre: "Jengibre", gramos: 5, categoria: VERDURA },
    ],
    proteinas: 1,
    carbohidratos: 3,
    grasas: 0,
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
    preparacion: "Mezcla la salsa de soja con jengibre rallado.",
  }),
  pieza({
    id: "mostaza",
    nombre: "mostaza",
    categoria: "alino",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Mostaza", gramos: 10, categoria: OTROS },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
      { nombre: "Limón", gramos: 5, categoria: VERDURA },
    ],
    proteinas: 0.3,
    carbohidratos: 1.5,
    grasas: 5.5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Mezcla una cucharada de mostaza con aceite y unas gotas de limón.",
  }),
  pieza({
    id: "salsaTomate",
    nombre: "salsa de tomate",
    categoria: "alino",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Tomate triturado", gramos: 100, categoria: OTROS },
      { nombre: "Ajo", gramos: 5, categoria: VERDURA },
      { nombre: "Aceite de oliva", gramos: 5, categoria: GRASA },
    ],
    proteinas: 2,
    carbohidratos: 8,
    grasas: 5,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Calienta el tomate triturado con ajo y una cucharada de aceite, 5 minutos.",
  }),
  pieza({
    id: "vinagreta",
    nombre: "vinagreta",
    categoria: "alino",
    momentos: ["comida", "cena"],
    ingredientes: [
      { nombre: "Aceite de oliva", gramos: 10, categoria: GRASA },
      { nombre: "Vinagre", gramos: 5, categoria: OTROS },
    ],
    proteinas: 0,
    carbohidratos: 1,
    grasas: 10,
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
    preparacion: "Mezcla aceite, vinagre y sal en un bol pequeño.",
  }),
];

/**
 * Qué pega con qué. Listas blancas, escritas a mano: el acompañamiento y el
 * aliño que no estén aquí no salen con esa proteína. Las verduras pegan con
 * todas (una merluza con brócoli y una ternera con pimientos están bien).
 */
const PEGA: Record<string, { acompanamientos: string[]; alinos: string[] }> = {
  pollo: {
    acompanamientos: ["arroz", "patata", "pasta", "couscous", "quinoa", "pan", "boniato"],
    alinos: ["limon", "yogur", "mostaza", "soja", "salsaTomate"],
  },
  pavo: {
    acompanamientos: ["arroz", "patata", "pasta", "couscous", "quinoa", "pan"],
    alinos: ["limon", "mostaza", "yogur", "salsaTomate"],
  },
  ternera: {
    acompanamientos: ["patata", "arroz", "pan", "pasta", "boniato"],
    alinos: ["mostaza", "salsaTomate", "soja", "vinagreta"],
  },
  cerdo: {
    acompanamientos: ["patata", "arroz", "pan", "pasta", "boniato"],
    alinos: ["salsaTomate", "mostaza", "soja"],
  },
  merluza: {
    acompanamientos: ["patata", "arroz", "quinoa", "boniato"],
    alinos: ["limon", "salsaTomate", "vinagreta"],
  },
  salmon: {
    acompanamientos: ["arroz", "patata", "quinoa", "pan", "boniato"],
    alinos: ["limon", "yogur", "soja", "vinagreta"],
  },
  atun: {
    acompanamientos: ["arroz", "pasta", "pan", "patata"],
    alinos: ["limon", "salsaTomate", "mostaza", "vinagreta"],
  },
  gambas: {
    acompanamientos: ["arroz", "pasta", "quinoa", "couscous"],
    alinos: ["limon", "soja", "salsaTomate"],
  },
  huevo: {
    acompanamientos: ["patata", "pan", "arroz", "pasta"],
    alinos: ["salsaTomate", "limon"],
  },
  tofu: {
    acompanamientos: ["arroz", "pasta", "quinoa", "couscous"],
    alinos: ["soja", "limon", "salsaTomate"],
  },
  lentejas: {
    acompanamientos: ["arroz", "pan", "patata", "boniato"],
    alinos: ["limon", "salsaTomate", "vinagreta"],
  },
  garbanzos: {
    acompanamientos: ["arroz", "pan", "patata", "couscous", "boniato"],
    alinos: ["limon", "salsaTomate", "vinagreta"],
  },
  sardinas: {
    acompanamientos: ["pan", "patata", "arroz"],
    alinos: ["limon", "salsaTomate", "vinagreta"],
  },
};

/** Cómo se dice el aliño al final del nombre del plato. */
const SUFIJO: Record<string, string> = {
  limon: " con limón",
  yogur: " con salsa de yogur",
  soja: " con salsa de soja",
  mostaza: " a la mostaza",
  salsaTomate: " con salsa de tomate",
  vinagreta: " con vinagreta",
};

const ACOMPANAMIENTOS_POR_ID = new Map(ACOMPANAMIENTOS.map((p) => [p.id, p]));
const ALINOS_POR_ID = new Map(ALINOS.map((p) => [p.id, p]));

function enMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Los ingredientes de las cuatro piezas, sumando los que se repiten (aceite, ajo...). */
function juntarIngredientes(piezas: Pieza[]): Ingrediente[] {
  const porNombre = new Map<string, Ingrediente>();
  for (const p of piezas) {
    for (const ing of p.ingredientes) {
      const ya = porNombre.get(ing.nombre);
      if (ya) ya.gramos += ing.gramos;
      else porNombre.set(ing.nombre, { ...ing });
    }
  }
  return [...porNombre.values()];
}

/** Las etiquetas que cumplen TODAS las piezas (para la dieta y los filtros). */
function etiquetasComunes(piezas: Pieza[]): string[] {
  return piezas[0].etiquetas.filter((e) => piezas.every((p) => p.etiquetas.includes(e)));
}

function redondear1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Baraja de forma determinista. La semilla es fija a propósito: el navegador y
 * el servidor tienen que ver el mismo orden, y la semana de un día concreto no
 * puede cambiar según quién abra la app.
 */
function mezclar<T>(lista: T[], semilla: number): T[] {
  const salida = [...lista];
  let s = semilla >>> 0;
  for (let i = salida.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [salida[i], salida[j]] = [salida[j], salida[i]];
  }
  return salida;
}

/**
 * Todas las combinaciones válidas, como platos normales.
 *
 * Se generan una vez al cargar el módulo y se barajan con una semilla fija para
 * que la rotación semanal no saque siete días seguidos de la misma proteína.
 * Cada combinación sale en cada momento en que encaja su proteína: el mismo
 * plato puede ser comida o cena.
 */
export function generarCombinaciones(): Plato[] {
  const salida: Plato[] = [];

  for (const proteina of PROTEINAS) {
    const regla = PEGA[proteina.id];
    if (!regla) continue;

    for (const acId of regla.acompanamientos) {
      const acompanamiento = ACOMPANAMIENTOS_POR_ID.get(acId);
      if (!acompanamiento) continue;

      for (const verdura of VERDURAS) {
        for (const alId of regla.alinos) {
          const alino = ALINOS_POR_ID.get(alId);
          if (!alino) continue;

          const nombre =
            `${enMayuscula(proteina.nombre)} con ${acompanamiento.nombre}` +
            ` y ${verdura.nombre}${SUFIJO[alino.id] ?? ""}`;
          const piezas = [proteina, acompanamiento, verdura, alino];
          const proteinas = redondear1(piezas.reduce((s, p) => s + p.proteinas, 0));
          const carbohidratos = redondear1(piezas.reduce((s, p) => s + p.carbohidratos, 0));
          const grasas = redondear1(piezas.reduce((s, p) => s + p.grasas, 0));

          for (const momento of proteina.momentos) {
            salida.push({
              nombre,
              descripcion: "Proteína, acompañamiento y verdura, en un plato de los de siempre",
              momento,
              kcal: Math.round(4 * proteinas + 4 * carbohidratos + 9 * grasas),
              proteinas,
              carbohidratos,
              grasas,
              ingredientes: juntarIngredientes(piezas),
              pasos: piezas.map((p) => p.preparacion),
              etiquetas: etiquetasComunes(piezas),
              piezas: piezas.map((p) => p.id),
            });
          }
        }
      }
    }
  }

  return mezclar(salida, 20261022);
}

/** Las piezas por id, para componer la receta detallada de un plato combinado. */
export const PIEZAS_POR_ID: Map<string, Pieza> = new Map(
  [...PROTEINAS, ...ACOMPANAMIENTOS, ...VERDURAS, ...ALINOS].map((p) => [p.id, p]),
);
