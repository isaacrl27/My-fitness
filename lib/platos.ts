/**
 * Los platos de la app. Recetas nuestras, con los gramos puestos (que es lo
 * que de verdad se echa en falta en las apps de pago: te dicen "una ración" y
 * no cuánto es).
 */

import { generarCombinaciones } from "./combinaciones.ts";

export type Momento = "desayuno" | "comida" | "cena" | "snack";

export type Ingrediente = {
  nombre: string;
  gramos: number;
  categoria: string;
};

export type Plato = {
  nombre: string;
  descripcion: string;
  momento: Momento;
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  ingredientes: Ingrediente[];
  pasos: string[];
  etiquetas: string[];
  /**
   * Solo en los platos combinados: los ids de las piezas que lo montan
   * (proteína, acompañamiento, verdura y aliño). Sirve para componer su receta.
   */
  piezas?: string[];
};

export const CATEGORIAS = [
  "Frutas y verduras",
  "Carnes y pescados",
  "Lácteos y huevos",
  "Cereales y legumbres",
  "Frutos secos y grasas",
  "Otros",
  "Despensa",
] as const;

export const PLATOS: Plato[] = [
  // --- Desayunos ---
  {
    nombre: "Avena con plátano y nueces",
    descripcion: "Lo de siempre antes de salir de casa",
    momento: "desayuno",
    kcal: 530,
    proteinas: 17,
    carbohidratos: 75,
    grasas: 18,
    ingredientes: [
      { nombre: "Avena en copos", gramos: 60, categoria: "Cereales y legumbres" },
      { nombre: "Leche entera", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Plátano", gramos: 120, categoria: "Frutas y verduras" },
      { nombre: "Nueces", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Calienta la leche y echa la avena.",
      "Deja dos minutos removiendo.",
      "Añade el plátano en rodajas y las nueces picadas.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Tostadas con aguacate y huevo",
    descripcion: "El aguacate se unta en un momento",
    momento: "desayuno",
    kcal: 485,
    proteinas: 21,
    carbohidratos: 35,
    grasas: 29,
    ingredientes: [
      { nombre: "Pan integral", gramos: 60, categoria: "Cereales y legumbres" },
      { nombre: "Aguacate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Tuesta el pan.",
      "Machaca el aguacate con sal y úntalo.",
      "Haz los huevos a la plancha y ponlos encima.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Yogur griego con fresas y almendras",
    descripcion: "Un bol rápido, sin cocinar nada",
    momento: "desayuno",
    kcal: 374,
    proteinas: 22,
    carbohidratos: 31,
    grasas: 18,
    ingredientes: [
      { nombre: "Yogur griego natural", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Fresas", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Almendras", gramos: 15, categoria: "Frutos secos y grasas" },
      { nombre: "Miel", gramos: 10, categoria: "Otros" },
    ],
    pasos: [
      "Echa el yogur en un bol.",
      "Corta las fresas por encima.",
      "Añade las almendras y la miel.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Tortilla francesa con pan",
    descripcion: "Cinco minutos y a la mesa",
    momento: "desayuno",
    kcal: 301,
    proteinas: 18,
    carbohidratos: 19,
    grasas: 17,
    ingredientes: [
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Pan integral", gramos: 40, categoria: "Cereales y legumbres" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Bate los huevos con una pizca de sal.",
      "Cuájala en la sartén a fuego medio.",
      "Acompaña con el pan.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Sándwich de pavo y queso",
    descripcion: "Se monta en dos minutos",
    momento: "desayuno",
    kcal: 322,
    proteinas: 24,
    carbohidratos: 34,
    grasas: 10,
    ingredientes: [
      { nombre: "Pan integral", gramos: 70, categoria: "Cereales y legumbres" },
      { nombre: "Pavo en lonchas", gramos: 60, categoria: "Carnes y pescados" },
      { nombre: "Queso curado", gramos: 20, categoria: "Lácteos y huevos" },
      { nombre: "Tomate", gramos: 40, categoria: "Frutas y verduras" },
    ],
    pasos: [
      "Corta el pan por la mitad.",
      "Pon el pavo, el queso y el tomate en láminas.",
      "Ciérralo y ya está.",
    ],
    etiquetas: [],
  },
  {
    nombre: "Tostada con tomate y jamón",
    descripcion: "El clásico de bar, pero en casa",
    momento: "desayuno",
    kcal: 304,
    proteinas: 19,
    carbohidratos: 30,
    grasas: 12,
    ingredientes: [
      { nombre: "Pan integral", gramos: 60, categoria: "Cereales y legumbres" },
      { nombre: "Tomate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Jamón serrano", gramos: 40, categoria: "Carnes y pescados" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Tuesta el pan.",
      "Restriega el tomate y echa el aceite.",
      "Pon el jamón encima.",
    ],
    etiquetas: [],
  },
  {
    nombre: "Café con leche y tostada",
    descripcion: "El desayuno de toda la vida",
    momento: "desayuno",
    kcal: 363,
    proteinas: 10,
    carbohidratos: 47,
    grasas: 15,
    ingredientes: [
      { nombre: "Leche entera", gramos: 150, categoria: "Lácteos y huevos" },
      { nombre: "Café solo", gramos: 50, categoria: "Otros" },
      { nombre: "Pan integral", gramos: 60, categoria: "Cereales y legumbres" },
      { nombre: "Mantequilla", gramos: 10, categoria: "Frutos secos y grasas" },
      { nombre: "Mermelada", gramos: 20, categoria: "Otros" },
    ],
    pasos: [
      "Calienta la leche y mézclala con el café.",
      "Tuesta el pan y úntale la mantequilla.",
      "Añade la mermelada por encima.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Revuelto de huevos con queso",
    descripcion: "Remueves y ya está",
    momento: "desayuno",
    kcal: 448,
    proteinas: 29,
    carbohidratos: 20,
    grasas: 28,
    ingredientes: [
      { nombre: "Huevo", gramos: 165, categoria: "Lácteos y huevos" },
      { nombre: "Queso rallado", gramos: 20, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
      { nombre: "Pan integral", gramos: 40, categoria: "Cereales y legumbres" },
    ],
    pasos: [
      "Bate los huevos y échalos a la sartén.",
      "Añade el queso y remueve hasta que cuaje.",
      "Acompaña con el pan tostado.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Fruta con yogur y miel",
    descripcion: "Cortas la fruta y listo",
    momento: "desayuno",
    kcal: 347,
    proteinas: 9,
    carbohidratos: 62,
    grasas: 7,
    ingredientes: [
      { nombre: "Yogur natural", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Manzana", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Plátano", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Miel", gramos: 10, categoria: "Otros" },
    ],
    pasos: [
      "Echa el yogur en un bol.",
      "Corta la fruta en trozos por encima.",
      "Echa un hilo de miel.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Biscotes con queso fresco y miel",
    descripcion: "Se unta y ya está",
    momento: "desayuno",
    kcal: 358,
    proteinas: 21,
    carbohidratos: 37,
    grasas: 14,
    ingredientes: [
      { nombre: "Pan tostado", gramos: 30, categoria: "Cereales y legumbres" },
      { nombre: "Queso fresco batido", gramos: 150, categoria: "Lácteos y huevos" },
      { nombre: "Miel", gramos: 10, categoria: "Otros" },
      { nombre: "Nueces", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Unta el queso en los biscotes.",
      "Echa la miel por encima.",
      "Pica las nueces y espárcelas.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Tostadas de aguacate y tomate",
    descripcion: "Machacas el aguacate y listo",
    momento: "desayuno",
    kcal: 360,
    proteinas: 8,
    carbohidratos: 37,
    grasas: 20,
    ingredientes: [
      { nombre: "Pan integral", gramos: 60, categoria: "Cereales y legumbres" },
      { nombre: "Aguacate", gramos: 90, categoria: "Frutas y verduras" },
      { nombre: "Tomate", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Tuesta el pan.",
      "Machaca el aguacate con sal y úntalo.",
      "Pon el tomate en rodajas encima.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
  },
  {
    nombre: "Cereales de maíz con leche",
    descripcion: "Se echa y se come, sin más",
    momento: "desayuno",
    kcal: 441,
    proteinas: 13,
    carbohidratos: 77,
    grasas: 9,
    ingredientes: [
      { nombre: "Cereales de maíz", gramos: 50, categoria: "Cereales y legumbres" },
      { nombre: "Leche entera", gramos: 250, categoria: "Lácteos y huevos" },
      { nombre: "Plátano", gramos: 100, categoria: "Frutas y verduras" },
    ],
    pasos: [
      "Echa los cereales en un bol.",
      "Cubre con la leche.",
      "Añade el plátano en rodajas.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Mollete con aceite y tomate",
    descripcion: "Un mollete calentito y a mojar",
    momento: "desayuno",
    kcal: 376,
    proteinas: 16,
    carbohidratos: 42,
    grasas: 16,
    ingredientes: [
      { nombre: "Mollete", gramos: 80, categoria: "Cereales y legumbres" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
      { nombre: "Tomate", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Jamón serrano", gramos: 30, categoria: "Carnes y pescados" },
    ],
    pasos: [
      "Abre el mollete y tuéstalo un poco.",
      "Restriega el tomate y echa el aceite.",
      "Pon el jamón dentro.",
    ],
    etiquetas: [],
  },
  {
    nombre: "Tortitas de avena y plátano",
    descripcion: "Mezclas y a la sartén",
    momento: "desayuno",
    kcal: 491,
    proteinas: 22,
    carbohidratos: 58,
    grasas: 19,
    ingredientes: [
      { nombre: "Avena en copos", gramos: 50, categoria: "Cereales y legumbres" },
      { nombre: "Plátano", gramos: 120, categoria: "Frutas y verduras" },
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Machaca el plátano y mézclalo con el huevo y la avena.",
      "Echa cucharadas en la sartén.",
      "Dales la vuelta cuando cuajen.",
    ],
    etiquetas: ["vegetariano"],
  },
  // --- Comidas ---
  {
    nombre: "Pollo con arroz y brócoli",
    descripcion: "Haces el pollo, cueces el arroz y a comer",
    momento: "comida",
    kcal: 686,
    proteinas: 65,
    carbohidratos: 66,
    grasas: 18,
    ingredientes: [
      { nombre: "Pechuga de pollo", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Arroz blanco cocido", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Brócoli", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Cuece el brócoli cinco minutos.",
      "Haz el pollo a la plancha con sal y pimienta.",
      "Sirve con el arroz y un chorrito de aceite.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Lentejas estofadas",
    descripcion: "De bote, con un sofrito rápido",
    momento: "comida",
    kcal: 536,
    proteinas: 29,
    carbohidratos: 78,
    grasas: 12,
    ingredientes: [
      { nombre: "Lentejas cocidas", gramos: 300, categoria: "Cereales y legumbres" },
      { nombre: "Zanahoria", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Pimiento rojo", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pocha la cebolla, la zanahoria y el pimiento.",
      "Añade las lentejas con un poco de agua.",
      "Deja quince minutos a fuego lento.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Pasta con atún y tomate",
    descripcion: "Se hace en un momento",
    momento: "comida",
    kcal: 545,
    proteinas: 35,
    carbohidratos: 72,
    grasas: 13,
    ingredientes: [
      { nombre: "Pasta cocida", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Atún al natural", gramos: 80, categoria: "Carnes y pescados" },
      { nombre: "Salsa de tomate", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Calienta el tomate con un poco de orégano.",
      "Mezcla con la pasta y el atún escurrido.",
      "Un chorrito de aceite en crudo al final.",
    ],
    etiquetas: ["sin-lactosa"],
  },
  {
    nombre: "Ensalada de garbanzos con atún y huevo",
    descripcion: "Abres el bote y mezclas",
    momento: "comida",
    kcal: 605,
    proteinas: 46,
    carbohidratos: 58,
    grasas: 21,
    ingredientes: [
      { nombre: "Garbanzos cocidos", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Atún al natural", gramos: 80, categoria: "Carnes y pescados" },
      { nombre: "Huevo", gramos: 55, categoria: "Lácteos y huevos" },
      { nombre: "Tomate", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Cuece el huevo diez minutos.",
      "Mezcla los garbanzos con el tomate en dados.",
      "Añade el atún y el huevo y aliña.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Merluza con arroz y pimiento",
    descripcion: "Todo a la plancha, sin complicarte",
    momento: "comida",
    kcal: 478,
    proteinas: 35,
    carbohidratos: 53,
    grasas: 14,
    ingredientes: [
      { nombre: "Merluza", gramos: 170, categoria: "Carnes y pescados" },
      { nombre: "Arroz integral cocido", gramos: 180, categoria: "Cereales y legumbres" },
      { nombre: "Pimiento rojo", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Haz la merluza a la plancha con ajo.",
      "Saltea el pimiento en tiras.",
      "Sirve todo junto con el arroz.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Arroz salteado con pollo y verduras",
    descripcion: "Todo a la sartén y removiendo",
    momento: "comida",
    kcal: 661,
    proteinas: 55,
    carbohidratos: 72,
    grasas: 17,
    ingredientes: [
      { nombre: "Arroz blanco cocido", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Pechuga de pollo", gramos: 150, categoria: "Carnes y pescados" },
      { nombre: "Pimiento rojo", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Maíz dulce", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Haz el pollo en trozos a la sartén.",
      "Añade el pimiento y el maíz.",
      "Echa el arroz y remueve dos minutos.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Sándwich de atún",
    descripcion: "Se monta en dos minutos",
    momento: "comida",
    kcal: 427,
    proteinas: 34,
    carbohidratos: 39,
    grasas: 15,
    ingredientes: [
      { nombre: "Pan integral", gramos: 80, categoria: "Cereales y legumbres" },
      { nombre: "Atún al natural", gramos: 100, categoria: "Carnes y pescados" },
      { nombre: "Mayonesa", gramos: 15, categoria: "Otros" },
      { nombre: "Lechuga", gramos: 30, categoria: "Frutas y verduras" },
      { nombre: "Tomate", gramos: 50, categoria: "Frutas y verduras" },
    ],
    pasos: [
      "Mezcla el atún escurrido con la mayonesa.",
      "Abre el pan y pon la lechuga y el tomate.",
      "Echa el atún y ciérralo.",
    ],
    etiquetas: ["sin-lactosa"],
  },
  {
    nombre: "Potaje de garbanzos con espinacas",
    descripcion: "De bote, con un sofrito y ya",
    momento: "comida",
    kcal: 569,
    proteinas: 27,
    carbohidratos: 77,
    grasas: 17,
    ingredientes: [
      { nombre: "Garbanzos cocidos", gramos: 250, categoria: "Cereales y legumbres" },
      { nombre: "Espinacas", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 50, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pocha la cebolla en una olla.",
      "Añade los garbanzos y las espinacas.",
      "Deja diez minutos con un poco de pimentón.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Salmón con patata y espinacas",
    descripcion: "Al horno o a la plancha, da igual",
    momento: "comida",
    kcal: 628,
    proteinas: 40,
    carbohidratos: 45,
    grasas: 32,
    ingredientes: [
      { nombre: "Salmón", gramos: 160, categoria: "Carnes y pescados" },
      { nombre: "Patata cocida", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Espinacas", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pon el salmón en la bandeja con sal.",
      "Cuece la patata en rodajas.",
      "Saltea las espinacas con un ajo.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Pasta boloñesa rápida",
    descripcion: "Sofríes la carne y echas el tomate",
    momento: "comida",
    kcal: 590,
    proteinas: 40,
    carbohidratos: 76,
    grasas: 14,
    ingredientes: [
      { nombre: "Pasta cocida", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Carne picada de ternera", gramos: 120, categoria: "Carnes y pescados" },
      { nombre: "Salsa de tomate", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Sofríe la cebolla y la carne picada.",
      "Echa la salsa de tomate y mezcla.",
      "Añade la pasta y remueve.",
    ],
    etiquetas: ["sin-lactosa"],
  },
  {
    nombre: "Ensalada de pollo con aguacate",
    descripcion: "El pollo hecho y lo demás en crudo",
    momento: "comida",
    kcal: 510,
    proteinas: 54,
    carbohidratos: 15,
    grasas: 26,
    ingredientes: [
      { nombre: "Pechuga de pollo", gramos: 160, categoria: "Carnes y pescados" },
      { nombre: "Aguacate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Lechuga", gramos: 120, categoria: "Frutas y verduras" },
      { nombre: "Tomate", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Haz el pollo a la plancha y córtalo en tiras.",
      "Monta la ensalada con el tomate y el aguacate.",
      "Aliña con aceite, sal y limón.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Arroz a la cubana",
    descripcion: "Arroz, tomate y dos huevos fritos",
    momento: "comida",
    kcal: 554,
    proteinas: 22,
    carbohidratos: 67,
    grasas: 22,
    ingredientes: [
      { nombre: "Arroz blanco cocido", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Salsa de tomate", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Calienta el arroz y el tomate.",
      "Fríe los huevos con poco aceite.",
      "Ponlos encima del arroz.",
    ],
    etiquetas: ["vegetariano", "sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Pizza casera sencilla",
    descripcion: "Base comprada, lo demás encima y al horno",
    momento: "comida",
    kcal: 559,
    proteinas: 29,
    carbohidratos: 68,
    grasas: 19,
    ingredientes: [
      { nombre: "Base de pizza", gramos: 120, categoria: "Cereales y legumbres" },
      { nombre: "Salsa de tomate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Queso mozzarella", gramos: 60, categoria: "Lácteos y huevos" },
      { nombre: "Jamón cocido", gramos: 40, categoria: "Carnes y pescados" },
    ],
    pasos: [
      "Extiende el tomate sobre la base.",
      "Reparte el queso y el jamón.",
      "Hornea diez minutos a 220 grados.",
    ],
    etiquetas: [],
  },
  {
    nombre: "Filete de ternera con patatas",
    descripcion: "A la plancha y con guarnición",
    momento: "comida",
    kcal: 482,
    proteinas: 36,
    carbohidratos: 44,
    grasas: 18,
    ingredientes: [
      { nombre: "Filete de ternera", gramos: 150, categoria: "Carnes y pescados" },
      { nombre: "Patata cocida", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Pimiento verde", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Haz el filete a la plancha.",
      "Dora la patata en rodajas.",
      "Saltea el pimiento en tiras.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Pollo al ajillo con arroz",
    descripcion: "Dorado con ajos y arroz de acompañante",
    momento: "comida",
    kcal: 694,
    proteinas: 52,
    carbohidratos: 54,
    grasas: 30,
    ingredientes: [
      { nombre: "Muslo de pollo", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Arroz blanco cocido", gramos: 180, categoria: "Cereales y legumbres" },
      { nombre: "Ajo", gramos: 10, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Dora el pollo con los ajos en la sartén.",
      "Calienta el arroz.",
      "Sirve el pollo con su aceite por encima.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Ensalada césar con pollo",
    descripcion: "Lechuga de bolsa y pollo a la plancha",
    momento: "comida",
    kcal: 542,
    proteinas: 54,
    carbohidratos: 23,
    grasas: 26,
    ingredientes: [
      { nombre: "Pechuga de pollo", gramos: 140, categoria: "Carnes y pescados" },
      { nombre: "Lechuga", gramos: 120, categoria: "Frutas y verduras" },
      { nombre: "Pan integral", gramos: 40, categoria: "Cereales y legumbres" },
      { nombre: "Salsa césar", gramos: 30, categoria: "Otros" },
      { nombre: "Queso rallado", gramos: 15, categoria: "Lácteos y huevos" },
    ],
    pasos: [
      "Haz el pollo a la plancha y córtalo.",
      "Tuesta el pan y córtalo en cuadraditos.",
      "Mezcla todo con la salsa y el queso.",
    ],
    etiquetas: [],
  },
  // --- Cenas ---
  {
    nombre: "Tortilla de patatas con ensalada",
    descripcion: "La de casa, con cuatro cosas",
    momento: "cena",
    kcal: 441,
    proteinas: 19,
    carbohidratos: 44,
    grasas: 21,
    ingredientes: [
      { nombre: "Patata cocida", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Lechuga", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pocha la patata en láminas finas.",
      "Cuaja la tortilla con los huevos batidos.",
      "Acompaña con la ensalada aliñada.",
    ],
    etiquetas: ["vegetariano", "sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Revuelto de champiñones y gambas",
    descripcion: "Se saltea y se remueve, ya está",
    momento: "cena",
    kcal: 454,
    proteinas: 56,
    carbohidratos: 8,
    grasas: 22,
    ingredientes: [
      { nombre: "Champiñones", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Gambas", gramos: 150, categoria: "Carnes y pescados" },
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Saltea los champiñones a fuego fuerte.",
      "Añade las gambas y deja un minuto.",
      "Echa los huevos batidos y remueve hasta que cuajen.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Crema de calabacín con pollo",
    descripcion: "Cueces el calabacín y haces el pollo",
    momento: "cena",
    kcal: 408,
    proteinas: 51,
    carbohidratos: 15,
    grasas: 16,
    ingredientes: [
      { nombre: "Calabacín", gramos: 300, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Pechuga de pollo", gramos: 150, categoria: "Carnes y pescados" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Cuece el calabacín con la cebolla quince minutos.",
      "Tritura con un poco de aceite.",
      "Haz el pollo a la plancha y sírvelo en tiras.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Tortilla francesa con queso y tomate",
    descripcion: "Cinco minutos de sartén",
    momento: "cena",
    kcal: 307,
    proteinas: 21,
    carbohidratos: 4,
    grasas: 23,
    ingredientes: [
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Queso rallado", gramos: 25, categoria: "Lácteos y huevos" },
      { nombre: "Tomate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Bate los huevos y échalos a la sartén.",
      "Añade el queso y cuaja.",
      "Acompaña con el tomate en rodajas.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Sopa de fideos",
    descripcion: "Calientas el caldo y echas la pasta",
    momento: "cena",
    kcal: 322,
    proteinas: 16,
    carbohidratos: 42,
    grasas: 10,
    ingredientes: [
      { nombre: "Fideos", gramos: 50, categoria: "Cereales y legumbres" },
      { nombre: "Caldo de pollo", gramos: 400, categoria: "Otros" },
      { nombre: "Huevo", gramos: 55, categoria: "Lácteos y huevos" },
      { nombre: "Zanahoria", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 3, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Calienta el caldo con la zanahoria en trozos.",
      "Echa los fideos y deja cinco minutos.",
      "Sirve con el huevo duro picado.",
    ],
    etiquetas: [],
  },
  {
    nombre: "Ensalada de atún con tomate y maíz",
    descripcion: "Mojas el pan y ya está",
    momento: "cena",
    kcal: 294,
    proteinas: 31,
    carbohidratos: 20,
    grasas: 10,
    ingredientes: [
      { nombre: "Atún al natural", gramos: 100, categoria: "Carnes y pescados" },
      { nombre: "Lechuga", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Tomate", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Maíz dulce", gramos: 70, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Corta la lechuga y el tomate.",
      "Añade el atún escurrido y el maíz.",
      "Aliña con aceite y sal.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Merluza a la plancha con verduras",
    descripcion: "A la plancha y sin manchar nada",
    momento: "cena",
    kcal: 285,
    proteinas: 33,
    carbohidratos: 9,
    grasas: 13,
    ingredientes: [
      { nombre: "Merluza", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Calabacín", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Pimiento verde", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Haz la merluza a la plancha con ajo.",
      "Saltea el calabacín y el pimiento.",
      "Sirve todo junto.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Hamburguesa casera con ensalada",
    descripcion: "La carne a la plancha y montas",
    momento: "cena",
    kcal: 420,
    proteinas: 42,
    carbohidratos: 27,
    grasas: 16,
    ingredientes: [
      { nombre: "Carne picada de ternera", gramos: 150, categoria: "Carnes y pescados" },
      { nombre: "Pan integral", gramos: 50, categoria: "Cereales y legumbres" },
      { nombre: "Lechuga", gramos: 50, categoria: "Frutas y verduras" },
      { nombre: "Tomate", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Queso curado", gramos: 20, categoria: "Lácteos y huevos" },
    ],
    pasos: [
      "Haz la carne a la plancha con sal.",
      "Abre el pan y pon la lechuga y el tomate.",
      "Mete la carne con el queso y ciérrala.",
    ],
    etiquetas: [],
  },
  {
    nombre: "Ensalada de pasta con atún",
    descripcion: "Todo mezclado y a la nevera",
    momento: "cena",
    kcal: 485,
    proteinas: 32,
    carbohidratos: 60,
    grasas: 13,
    ingredientes: [
      { nombre: "Pasta cocida", gramos: 180, categoria: "Cereales y legumbres" },
      { nombre: "Atún al natural", gramos: 80, categoria: "Carnes y pescados" },
      { nombre: "Tomate", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Aceitunas", gramos: 20, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Mezcla la pasta con el atún y el tomate.",
      "Añade las aceitunas.",
      "Aliña con aceite y sal.",
    ],
    etiquetas: ["sin-lactosa"],
  },
  {
    nombre: "Pollo al horno con patatas",
    descripcion: "Todo en la bandeja y al horno",
    momento: "cena",
    kcal: 636,
    proteinas: 51,
    carbohidratos: 45,
    grasas: 28,
    ingredientes: [
      { nombre: "Muslo de pollo", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Patata cocida", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 50, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pon el pollo y la patata en la bandeja.",
      "Añade la cebolla en aros y el aceite.",
      "Hornea 35 minutos a 200 grados.",
    ],
    etiquetas: ["sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Crema de calabaza",
    descripcion: "Se cuece y se tritura, sin más",
    momento: "cena",
    kcal: 291,
    proteinas: 10,
    carbohidratos: 47,
    grasas: 7,
    ingredientes: [
      { nombre: "Calabaza", gramos: 300, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 50, categoria: "Frutas y verduras" },
      { nombre: "Patata cocida", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Queso fresco batido", gramos: 40, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Cuece la calabaza, la patata y la cebolla.",
      "Tritura y añade el queso batido.",
      "Un chorrito de aceite por encima.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Tortilla de espinacas y queso",
    descripcion: "Con espinacas de bolsa y ya",
    momento: "cena",
    kcal: 380,
    proteinas: 24,
    carbohidratos: 8,
    grasas: 28,
    ingredientes: [
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Espinacas", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Queso feta", gramos: 40, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Bate los huevos y añade las espinacas.",
      "Cuaja en la sartén a fuego medio.",
      "Desmiga el feta por encima.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Ensalada de queso de cabra y nueces",
    descripcion: "Fácil y sin encender el fuego",
    momento: "cena",
    kcal: 421,
    proteinas: 22,
    carbohidratos: 9,
    grasas: 33,
    ingredientes: [
      { nombre: "Queso de cabra", gramos: 60, categoria: "Lácteos y huevos" },
      { nombre: "Lechuga", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Nueces", gramos: 15, categoria: "Frutos secos y grasas" },
      { nombre: "Tomate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Monta la lechuga con el tomate.",
      "Desmiga el queso de cabra por encima.",
      "Añade las nueces y aliña.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Wrap de pollo rápido",
    descripcion: "Lo enrollas y te lo llevas",
    momento: "cena",
    kcal: 472,
    proteinas: 49,
    carbohidratos: 33,
    grasas: 16,
    ingredientes: [
      { nombre: "Tortilla de trigo", gramos: 60, categoria: "Cereales y legumbres" },
      { nombre: "Pechuga de pollo", gramos: 120, categoria: "Carnes y pescados" },
      { nombre: "Lechuga", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Queso rallado", gramos: 20, categoria: "Lácteos y huevos" },
      { nombre: "Salsa de yogur", gramos: 30, categoria: "Otros" },
    ],
    pasos: [
      "Haz el pollo a la plancha y córtalo.",
      "Calienta la tortilla y rellénala.",
      "Enróllala con la lechuga, el queso y la salsa.",
    ],
    etiquetas: [],
  },
  {
    nombre: "Calabacín relleno de carne",
    descripcion: "Se rellena y al horno un rato",
    momento: "cena",
    kcal: 346,
    proteinas: 34,
    carbohidratos: 12,
    grasas: 18,
    ingredientes: [
      { nombre: "Calabacín", gramos: 250, categoria: "Frutas y verduras" },
      { nombre: "Carne picada de ternera", gramos: 120, categoria: "Carnes y pescados" },
      { nombre: "Cebolla", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Queso rallado", gramos: 20, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Parte el calabacín y vacíalo.",
      "Sofríe la carne con la cebolla y rellena.",
      "Cubre con queso y hornea 15 minutos.",
    ],
    etiquetas: ["sin-gluten"],
  },
  {
    nombre: "Croquetas de jamón con ensalada",
    descripcion: "Del congelador al horno y listo",
    momento: "cena",
    kcal: 392,
    proteinas: 17,
    carbohidratos: 36,
    grasas: 20,
    ingredientes: [
      { nombre: "Croquetas", gramos: 150, categoria: "Otros" },
      { nombre: "Lechuga", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Tomate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Hornea las croquetas según el paquete.",
      "Aliña la lechuga con el tomate.",
      "Sírvelas juntas.",
    ],
    etiquetas: [],
  },
  // --- Snacks ---
  {
    nombre: "Yogur natural con nueces",
    descripcion: "Dos cosas y ya está",
    momento: "snack",
    kcal: 228,
    proteinas: 9,
    carbohidratos: 12,
    grasas: 16,
    ingredientes: [
      { nombre: "Yogur natural", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Nueces", gramos: 15, categoria: "Frutos secos y grasas" },
    ],
    pasos: ["Echa el yogur en un vaso.", "Pica las nueces por encima."],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Manzana y almendras",
    descripcion: "Te lo llevas en el bolsillo",
    momento: "snack",
    kcal: 230,
    proteinas: 5,
    carbohidratos: 30,
    grasas: 10,
    ingredientes: [
      { nombre: "Manzana", gramos: 180, categoria: "Frutas y verduras" },
      { nombre: "Almendras", gramos: 20, categoria: "Frutos secos y grasas" },
    ],
    pasos: ["Lávala y córtala.", "Acompaña con las almendras."],
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Tostada con crema de cacahuete",
    descripcion: "Se unta y listo",
    momento: "snack",
    kcal: 203,
    proteinas: 8,
    carbohidratos: 18,
    grasas: 11,
    ingredientes: [
      { nombre: "Pan integral", gramos: 30, categoria: "Cereales y legumbres" },
      { nombre: "Crema de cacahuete", gramos: 20, categoria: "Frutos secos y grasas" },
    ],
    pasos: ["Tuesta el pan.", "Úntale la crema de cacahuete."],
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
  },
  {
    nombre: "Naranja y plátano",
    descripcion: "Pelar y comer",
    momento: "snack",
    kcal: 229,
    proteinas: 3,
    carbohidratos: 52,
    grasas: 1,
    ingredientes: [
      { nombre: "Naranja", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Plátano", gramos: 120, categoria: "Frutas y verduras" },
    ],
    pasos: ["Pela la naranja.", "Pela el plátano y come."],
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Queso batido con miel",
    descripcion: "Un bol y listo",
    momento: "snack",
    kcal: 319,
    proteinas: 24,
    carbohidratos: 22,
    grasas: 15,
    ingredientes: [
      { nombre: "Queso fresco batido", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Miel", gramos: 15, categoria: "Otros" },
      { nombre: "Nueces", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: ["Echa el queso en un bol.", "Añade la miel.", "Pica las nueces por encima."],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Zanahoria y hummus",
    descripcion: "Cortas la zanahoria y mojas",
    momento: "snack",
    kcal: 170,
    proteinas: 6,
    carbohidratos: 23,
    grasas: 6,
    ingredientes: [
      { nombre: "Zanahoria", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Hummus", gramos: 60, categoria: "Cereales y legumbres" },
    ],
    pasos: ["Corta la zanahoria en bastones.", "Mójala en el hummus."],
    etiquetas: ["vegano", "vegetariano", "sin-gluten", "sin-lactosa"],
  },
  {
    nombre: "Huevo duro con pan",
    descripcion: "Lo cueces y lo pelas",
    momento: "snack",
    kcal: 223,
    proteinas: 17,
    carbohidratos: 14,
    grasas: 11,
    ingredientes: [
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Pan integral", gramos: 30, categoria: "Cereales y legumbres" },
    ],
    pasos: ["Cuece el huevo diez minutos.", "Pélalo y cómelo con el pan."],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Batido de plátano y leche",
    descripcion: "Todo a la batidora y a beber",
    momento: "snack",
    kcal: 314,
    proteinas: 11,
    carbohidratos: 45,
    grasas: 10,
    ingredientes: [
      { nombre: "Plátano", gramos: 120, categoria: "Frutas y verduras" },
      { nombre: "Leche entera", gramos: 250, categoria: "Lácteos y huevos" },
      { nombre: "Cacao en polvo", gramos: 10, categoria: "Otros" },
    ],
    pasos: ["Echa todo en el vaso de la batidora.", "Bate diez segundos."],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Picos con queso y pavo",
    descripcion: "Se come de pie, sin montar nada",
    momento: "snack",
    kcal: 272,
    proteinas: 19,
    carbohidratos: 22,
    grasas: 12,
    ingredientes: [
      { nombre: "Picos de pan", gramos: 30, categoria: "Cereales y legumbres" },
      { nombre: "Queso curado", gramos: 30, categoria: "Lácteos y huevos" },
      { nombre: "Pavo en lonchas", gramos: 40, categoria: "Carnes y pescados" },
    ],
    pasos: ["Corta el queso en taquitos.", "Enrolla el pavo y acompaña con los picos."],
    etiquetas: [],
  },
  {
    nombre: "Frutos secos con chocolate negro",
    descripcion: "Un puñado y ya",
    momento: "snack",
    kcal: 315,
    proteinas: 8,
    carbohidratos: 10,
    grasas: 27,
    ingredientes: [
      { nombre: "Almendras", gramos: 20, categoria: "Frutos secos y grasas" },
      { nombre: "Nueces", gramos: 15, categoria: "Frutos secos y grasas" },
      { nombre: "Chocolate negro", gramos: 15, categoria: "Frutos secos y grasas" },
    ],
    pasos: ["Echa los frutos secos en un bol.", "Parte el chocolate en trozos."],
    etiquetas: ["vegetariano", "sin-gluten"],
  },

  // --- Segunda tanda: más variedad para que «no me gusta» no roce siempre
  // los mismos (22/10). Vegetariano = sin carne ni pescado; vegano = tampoco
  // lleva nada de origen animal.
  {
    nombre: "Huevos revueltos con aguacate y pan",
    descripcion: "Desayuno de tenedor, listo en un momento",
    momento: "desayuno",
    kcal: 436,
    proteinas: 20,
    carbohidratos: 26,
    grasas: 28,
    ingredientes: [
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Aguacate", gramos: 70, categoria: "Frutas y verduras" },
      { nombre: "Pan integral", gramos: 50, categoria: "Cereales y legumbres" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Bate los huevos con una pizca de sal.",
      "Cuájalos en la sartén a fuego medio, sin dejar de remover.",
      "Acompaña con el aguacate en láminas y el pan tostado.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Yogur con kiwi y pipas",
    descripcion: "Algo fresco y distinto en un bol",
    momento: "desayuno",
    kcal: 366,
    proteinas: 22,
    carbohidratos: 29,
    grasas: 18,
    ingredientes: [
      { nombre: "Yogur griego natural", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Kiwi", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Pipas de girasol", gramos: 15, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Echa el yogur en un bol.",
      "Pela el kiwi y córtalo en trozos.",
      "Espolvorea las pipas por encima.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Tostada de queso fresco y tomate",
    descripcion: "Se unta, se corta y listo",
    momento: "desayuno",
    kcal: 275,
    proteinas: 16,
    carbohidratos: 37,
    grasas: 7,
    ingredientes: [
      { nombre: "Pan integral", gramos: 60, categoria: "Cereales y legumbres" },
      { nombre: "Queso fresco batido", gramos: 120, categoria: "Lácteos y huevos" },
      { nombre: "Tomate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Tuesta el pan.",
      "Unta el queso fresco y pon el tomate en rodajas.",
      "Echa el aceite y una pizca de sal.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Batido de fresas y avena",
    descripcion: "Se bate y se bebe, para días con prisa",
    momento: "desayuno",
    kcal: 338,
    proteinas: 12,
    carbohidratos: 50,
    grasas: 10,
    ingredientes: [
      { nombre: "Fresas", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Avena en copos", gramos: 40, categoria: "Cereales y legumbres" },
      { nombre: "Leche entera", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Miel", gramos: 10, categoria: "Otros" },
    ],
    pasos: [
      "Echa todo en el vaso de la batidora.",
      "Bate medio minuto, hasta que no queden copos enteros.",
      "Y si lo quieres frío, unos cubitos o leche de la nevera.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Revuelto de espinacas y queso",
    descripcion: "Verde y con queso, en cinco minutos",
    momento: "desayuno",
    kcal: 354,
    proteinas: 25,
    carbohidratos: 23,
    grasas: 18,
    ingredientes: [
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Espinacas", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Queso rallado", gramos: 20, categoria: "Lácteos y huevos" },
      { nombre: "Pan integral", gramos: 40, categoria: "Cereales y legumbres" },
    ],
    pasos: [
      "Saltea las espinacas un minuto en la sartén.",
      "Echa los huevos batidos y el queso, y remueve hasta que cuaje.",
      "Acompaña con el pan tostado.",
    ],
    etiquetas: ["vegetariano"],
  },
  {
    nombre: "Cereales de avena con leche y fresas",
    descripcion: "Un bol de toda la vida con sus fresas",
    momento: "desayuno",
    kcal: 335,
    proteinas: 14,
    carbohidratos: 45,
    grasas: 11,
    ingredientes: [
      { nombre: "Avena en copos", gramos: 50, categoria: "Cereales y legumbres" },
      { nombre: "Leche entera", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Fresas", gramos: 100, categoria: "Frutas y verduras" },
    ],
    pasos: [
      "Echa la avena en un bol y cubre con la leche.",
      "Deja reposar un minuto para que se ablande.",
      "Corta las fresas por encima o échalas enteras partidas por la mitad.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Curry de garbanzos con arroz",
    descripcion: "Un guiso de color, con lo que hay en la despensa",
    momento: "comida",
    kcal: 669,
    proteinas: 24,
    carbohidratos: 105,
    grasas: 17,
    ingredientes: [
      { nombre: "Garbanzos cocidos", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Tomate triturado", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Arroz blanco cocido", gramos: 150, categoria: "Cereales y legumbres" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pocha la cebolla picada en el aceite, cinco minutos.",
      "Añade el tomate, una cucharadita de curry y los garbanzos, y deja cinco minutos más.",
      "Sirve por encima del arroz caliente.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-lactosa", "sin-gluten"],
  },
  {
    nombre: "Espaguetis con verduras salteadas",
    descripcion: "La pasta de la cena, en su punto",
    momento: "comida",
    kcal: 460,
    proteinas: 14,
    carbohidratos: 74,
    grasas: 12,
    ingredientes: [
      { nombre: "Pasta cocida", gramos: 200, categoria: "Cereales y legumbres" },
      { nombre: "Calabacín", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Pimiento rojo", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Saltea la cebolla y el pimiento en el aceite, cuatro minutos.",
      "Añade el calabacín en tacos y deja tres minutos más.",
      "Echa la pasta, remueve un minuto y sirve.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
  },
  {
    nombre: "Lubina a la plancha con patatas",
    descripcion: "Pescado blanco con su guarnición de siempre",
    momento: "comida",
    kcal: 421,
    proteinas: 35,
    carbohidratos: 41,
    grasas: 13,
    ingredientes: [
      { nombre: "Lubina", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Patata cocida", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
      { nombre: "Ajo", gramos: 5, categoria: "Frutas y verduras" },
    ],
    pasos: [
      "Calienta bien la plancha con el aceite y el ajo picado.",
      "Haz la lubina tres minutos por cada lado, sin moverla.",
      "Sirve con las patatas en rodajas pasadas por la misma plancha.",
    ],
    etiquetas: ["sin-lactosa", "sin-gluten"],
  },
  {
    nombre: "Pollo con cous cous y calabacín",
    descripcion: "Cous cous de sobre y pollo a la plancha",
    momento: "comida",
    kcal: 458,
    proteinas: 41,
    carbohidratos: 42,
    grasas: 14,
    ingredientes: [
      { nombre: "Pechuga de pollo", gramos: 140, categoria: "Carnes y pescados" },
      { nombre: "Cous cous", gramos: 170, categoria: "Cereales y legumbres" },
      { nombre: "Calabacín", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Prepara el cous cous como dice el sobre (agua hirviendo y cinco minutos tapado).",
      "Haz el pollo en tiras en la sartén, cuatro minutos por cada lado.",
      "Saltea el calabacín un par de minutos y mezcla todo al final.",
    ],
    etiquetas: ["sin-lactosa"],
  },
  {
    nombre: "Ensalada de lentejas con tomate y cebolla",
    descripcion: "De bote, fresca y con más hierro que una ensalada de lechuga",
    momento: "comida",
    kcal: 409,
    proteinas: 24,
    carbohidratos: 58,
    grasas: 9,
    ingredientes: [
      { nombre: "Lentejas cocidas", gramos: 250, categoria: "Cereales y legumbres" },
      { nombre: "Tomate", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Escurre y enjuaga las lentejas con agua fría.",
      "Corta el tomate y la cebolla en trozos pequeños y mézclalos.",
      "Aliña con el aceite, sal y un chorrito de vinagre.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-lactosa", "sin-gluten"],
  },
  {
    nombre: "Estofado de ternera con patatas",
    descripcion: "De cuchara y contundente, como los de casa",
    momento: "comida",
    kcal: 533,
    proteinas: 43,
    carbohidratos: 52,
    grasas: 17,
    ingredientes: [
      { nombre: "Ternera magra", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Patata cocida", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Zanahoria", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Cebolla", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Dora la ternera en el aceite dos minutos por cada lado.",
      "Añade la cebolla y la zanahoria, cubre de agua y deja 20 minutos a fuego bajo.",
      "Echa la patata en el último tramo y deja cinco minutos más.",
    ],
    etiquetas: ["sin-lactosa", "sin-gluten"],
  },
  {
    nombre: "Macarrones con tomate y atún",
    descripcion: "El plato que le sale a todo el mundo",
    momento: "comida",
    kcal: 479,
    proteinas: 31,
    carbohidratos: 64,
    grasas: 11,
    ingredientes: [
      { nombre: "Pasta cocida", gramos: 180, categoria: "Cereales y legumbres" },
      { nombre: "Tomate triturado", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Atún al natural", gramos: 80, categoria: "Carnes y pescados" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Calienta el tomate en la sartén con el aceite, tres minutos.",
      "Añade el atún escurrido y mezcla.",
      "Echa la pasta, remueve para que se impregne y sirve.",
    ],
    etiquetas: ["sin-lactosa"],
  },
  {
    nombre: "Arroz con gambas y guisantes",
    descripcion: "Como una paella de dos, pero en media hora",
    momento: "comida",
    kcal: 496,
    proteinas: 39,
    carbohidratos: 58,
    grasas: 12,
    ingredientes: [
      { nombre: "Arroz blanco cocido", gramos: 180, categoria: "Cereales y legumbres" },
      { nombre: "Gambas peladas", gramos: 150, categoria: "Carnes y pescados" },
      { nombre: "Guisantes", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Saltea las gambas en el aceite un minuto por cada lado y resérvalas.",
      "Echa los guisantes y el arroz, y remueve dos minutos.",
      "Devuelve las gambas, mezcla y sirve.",
    ],
    etiquetas: ["sin-lactosa", "sin-gluten"],
  },
  {
    nombre: "Bacalao a la plancha con brócoli",
    descripcion: "Pescado que se deshace en lascas, con verde al lado",
    momento: "cena",
    kcal: 329,
    proteinas: 38,
    carbohidratos: 15,
    grasas: 13,
    ingredientes: [
      { nombre: "Bacalao fresco", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Brócoli", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 10, categoria: "Frutos secos y grasas" },
      { nombre: "Ajo", gramos: 5, categoria: "Frutas y verduras" },
    ],
    pasos: [
      "Cuece el brócoli cinco minutos en agua con sal y escúrrelo.",
      "Haz el bacalao en la plancha caliente, tres minutos por cada lado.",
      "Saltea el brócoli un minuto con el ajo en láminas y sirve junto.",
    ],
    etiquetas: ["sin-lactosa", "sin-gluten"],
  },
  {
    nombre: "Revuelto de calabacín y huevo",
    descripcion: "Para cenar ligero y sin manchar mucho",
    momento: "cena",
    kcal: 361,
    proteinas: 23,
    carbohidratos: 11,
    grasas: 25,
    ingredientes: [
      { nombre: "Calabacín", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Huevo", gramos: 165, categoria: "Lácteos y huevos" },
      { nombre: "Cebolla", gramos: 40, categoria: "Frutas y verduras" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pocha la cebolla y el calabacín en dados, seis minutos.",
      "Echa los huevos batidos y remueve a fuego lento.",
      "Retira cuando esté cuajado pero jugoso.",
    ],
    etiquetas: ["vegetariano", "sin-lactosa", "sin-gluten"],
  },
  {
    nombre: "Sopa de verduras con huevo",
    descripcion: "Caliente, con el huevo cuajado dentro",
    momento: "cena",
    kcal: 307,
    proteinas: 20,
    carbohidratos: 32,
    grasas: 11,
    ingredientes: [
      { nombre: "Zanahoria", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Puerro", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Calabacín", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Huevo", gramos: 110, categoria: "Lácteos y huevos" },
      { nombre: "Pan integral", gramos: 30, categoria: "Cereales y legumbres" },
    ],
    pasos: [
      "Cuece las verduras en agua con sal 15 minutos.",
      "Echa los huevos batidos en hilo mientras remueves, y apaga.",
      "Sirve con el pan en trocitos dentro.",
    ],
    etiquetas: ["vegetariano", "sin-lactosa"],
  },
  {
    nombre: "Ensalada de salmón ahumado y aguacate",
    descripcion: "Se monta en un minuto y parece de restaurante",
    momento: "cena",
    kcal: 411,
    proteinas: 24,
    carbohidratos: 18,
    grasas: 27,
    ingredientes: [
      { nombre: "Salmón ahumado", gramos: 80, categoria: "Carnes y pescados" },
      { nombre: "Aguacate", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Lechuga", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Pan integral", gramos: 30, categoria: "Cereales y legumbres" },
      { nombre: "Aceite de oliva", gramos: 5, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Haz una cama con la lechuga en tiras.",
      "Pon el aguacate en láminas y el salmón por encima.",
      "Aliña con el aceite y acompaña con el pan tostado.",
    ],
    etiquetas: ["sin-lactosa"],
  },
  {
    nombre: "Pavo a la plancha con puré de patata",
    descripcion: "La cena ligera de los días de gimnasio",
    momento: "cena",
    kcal: 471,
    proteinas: 42,
    carbohidratos: 42,
    grasas: 15,
    ingredientes: [
      { nombre: "Pechuga de pavo", gramos: 180, categoria: "Carnes y pescados" },
      { nombre: "Patata cocida", gramos: 200, categoria: "Frutas y verduras" },
      { nombre: "Leche entera", gramos: 50, categoria: "Lácteos y huevos" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Machaca la patata con la leche caliente hasta que quede crema.",
      "Haz el pavo en la plancha, tres minutos por cada lado.",
      "Sirve el puré con el pavo encima y un hilo de aceite.",
    ],
    etiquetas: ["sin-gluten"],
  },
  {
    nombre: "Gazpacho con pan",
    descripcion: "Frío, para las noches de calor",
    momento: "cena",
    kcal: 242,
    proteinas: 7,
    carbohidratos: 31,
    grasas: 10,
    ingredientes: [
      { nombre: "Tomate", gramos: 300, categoria: "Frutas y verduras" },
      { nombre: "Pepino", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Pimiento verde", gramos: 60, categoria: "Frutas y verduras" },
      { nombre: "Pan integral", gramos: 40, categoria: "Cereales y legumbres" },
      { nombre: "Aceite de oliva", gramos: 8, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Bate el tomate, el pepino pelado, el pimiento y el pan con medio vaso de agua.",
      "Añade el aceite poco a poco mientras bates, para que ligue.",
      "Prueba de sal y mételo en la nevera una hora.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-lactosa"],
  },
  {
    nombre: "Yogur con arándanos y pipas",
    descripcion: "Merendar algo que no sea galletas",
    momento: "snack",
    kcal: 236,
    proteinas: 10,
    carbohidratos: 22,
    grasas: 12,
    ingredientes: [
      { nombre: "Yogur natural", gramos: 200, categoria: "Lácteos y huevos" },
      { nombre: "Arándanos", gramos: 80, categoria: "Frutas y verduras" },
      { nombre: "Pipas de girasol", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Echa el yogur en un bol.",
      "Añade los arándanos lavados.",
      "Espolvorea las pipas y una pizca de canela si te apetece.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Fruta con queso fresco",
    descripcion: "Dulce y salado a la vez",
    momento: "snack",
    kcal: 216,
    proteinas: 12,
    carbohidratos: 42,
    grasas: 0,
    ingredientes: [
      { nombre: "Manzana", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Pera", gramos: 100, categoria: "Frutas y verduras" },
      { nombre: "Queso fresco batido", gramos: 150, categoria: "Lácteos y huevos" },
    ],
    pasos: [
      "Corta la manzana y la pera en gajos.",
      "Ponlas en un plato con el queso fresco al lado.",
      "Y a mojar, como con cualquier salsa.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Palitos de zanahoria con queso batido",
    descripcion: "Para picar entre horas sin abrir una bolsa",
    momento: "snack",
    kcal: 195,
    proteinas: 13,
    carbohidratos: 20,
    grasas: 7,
    ingredientes: [
      { nombre: "Zanahoria", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Queso fresco batido", gramos: 120, categoria: "Lácteos y huevos" },
      { nombre: "Nueces", gramos: 10, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Pela la zanahoria y córtala en palitos.",
      "Sirve el queso batido en un cuenco con las nueces picadas por encima.",
      "Moja la zanahoria y come sin prisa.",
    ],
    etiquetas: ["vegetariano", "sin-gluten"],
  },
  {
    nombre: "Plátano con crema de cacahuete",
    descripcion: "Dos cosas, cero cocina",
    momento: "snack",
    kcal: 253,
    proteinas: 6,
    carbohidratos: 37,
    grasas: 9,
    ingredientes: [
      { nombre: "Plátano", gramos: 150, categoria: "Frutas y verduras" },
      { nombre: "Crema de cacahuete", gramos: 15, categoria: "Frutos secos y grasas" },
    ],
    pasos: [
      "Corta el plátano en rodajas gorditas.",
      "Úntale la crema de cacahuete por encima.",
      "Si te sobra, medio limón por el plátano para que no se oscurezca.",
    ],
    etiquetas: ["vegano", "vegetariano", "sin-lactosa", "sin-gluten"],
  },
];

export type Gusto = "me-gusta" | "no-me-gusta";

export type DiaPlan = {
  dia: string;
  /** Fecha real del día, en formato ISO (YYYY-MM-DD). */
  fecha: string;
  comidas: Record<Momento, Plato | null>;
};

const NOMBRES_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Una fecha en formato ISO (YYYY-MM-DD), sin horas ni zona. */
export function aFechaISO(fecha: Date): string {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

/** El lunes de la semana natural (lunes a domingo) que contiene esa fecha. */
function lunesDeLaSemana(fecha: Date): Date {
  const d = new Date(fecha);
  // Mediodía: así los cambios de hora de un país no pueden mover el día.
  d.setHours(12, 0, 0, 0);
  const diaDeLaSemana = d.getDay(); // 0 es domingo
  d.setDate(d.getDate() - ((diaDeLaSemana + 6) % 7));
  return d;
}

/**
 * Quita mayúsculas y acentos para comparar comida con comida.
 *
 * «Tomate», «tomate» y «TOMATE» son lo mismo; si no, marcar «tomate» no
 * descartaría el plato que pone «Tomate».
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Todo lo que puede salir en el plan: los 80 platos escritos y las
 * combinaciones de piezas que pegan entre sí.
 *
 * Se calcula una vez, al cargar el módulo. Los combinados se filtran por si
 * alguno se llamara igual que un plato escrito (no debería, pero mejor no
 * arriesgar dos platos con el mismo nombre en el mismo momento).
 */
const CLAVES_ESCRITAS = new Set(PLATOS.map((p) => `${p.momento}|${p.nombre}`));
export const UNIVERSO: Plato[] = [
  ...PLATOS,
  ...generarCombinaciones().filter((p) => !CLAVES_ESCRITAS.has(`${p.momento}|${p.nombre}`)),
];

/** Todos los ingredientes de la lista, ordenados y sin repetirse. */
export const INGREDIENTES: string[] = [
  ...new Set(UNIVERSO.flatMap((p) => p.ingredientes.map((i) => i.nombre))),
].sort((a, b) => a.localeCompare(b, "es"));

/**
 * Un plato no entra si no cumple la dieta, lleva algo que no te gusta o lo has
 * rechazado antes.
 */
export function descartado(
  plato: Plato,
  noLeGustan: string[],
  gustos: Record<string, Gusto>,
  dieta: string = "ninguna",
): boolean {
  if (gustos[plato.nombre] === "no-me-gusta") return true;
  if (dieta && dieta !== "ninguna" && !plato.etiquetas.includes(dieta)) return true;
  // Solo alimentos habituales de Mercadona/Dia/Carrefour para dieta estándar (el tofu solo si es vegetariano/vegano)
  if (dieta !== "vegano" && dieta !== "vegetariano") {
    if (plato.piezas?.includes("tofu")) return true;
    const nombreLimpio = normalizar(plato.nombre);
    if (nombreLimpio.includes("tofu")) return true;
  }
  const texto = normalizar(
    `${plato.nombre} ${(plato.piezas ?? []).join(" ")} ${plato.ingredientes.map((i) => i.nombre).join(" ")}`,
  );
  return noLeGustan.some((n) => {
    const limpio = normalizar(n);
    return limpio.length > 2 && texto.includes(limpio);
  });
}

/** Candidatos de un momento, con los que te gustan primero. */
function candidatos(
  momento: Momento,
  noLeGustan: string[],
  gustos: Record<string, Gusto>,
  giro: number = 0,
  dieta: string = "ninguna",
): Plato[] {
  const base = UNIVERSO.filter(
    (p) => p.momento === momento && !descartado(p, noLeGustan, gustos, dieta),
  );

  // El giro de la semana va ANTES de ordenar por gustos. Si fuera después,
  // marcar «me gusta» mandaría el plato al principio de la lista y el lunes
  // dejaría de ser el que acabas de valorar: se cambia solo bajo los pies.
  const girado =
    base.length === 0
      ? base
      : [...base.slice(giro % base.length), ...base.slice(0, giro % base.length)];

  return girado.sort((a, b) => {
    const ga = gustos[a.nombre] === "me-gusta" ? 0 : 1;
    const gb = gustos[b.nombre] === "me-gusta" ? 0 : 1;
    return ga - gb;
  });
}

/**
 * La semana natural (lunes a domingo) que toca: la de la fecha que se pida,
 * por defecto la de hoy. Cada día lleva su fecha real, y los platos rotan
 * solos de una semana a otra, así que no hay que tocar nada para que salga
 * otra cosa.
 */
export function generarSemana(
  noLeGustan: string[],
  gustos: Record<string, Gusto>,
  offset: number = 0,
  kcalObjetivo?: number,
  fecha: Date = new Date(),
  dieta: string = "ninguna",
): DiaPlan[] {
  const lunes = lunesDeLaSemana(fecha);
  // Días pasados desde un día cualquiera: cambia solo al cruzar de semana,
  // y es el mismo número para toda la semana, así que los siete días salen
  // de la misma tanda.
  const semana = Math.floor(lunes.getTime() / 86400000);
  // El giro avanza siete puestos por semana, no uno: así cada semana coge
  // siete platos nuevos de verdad en vez de repetir seis de la anterior.
  const giro = semana * 7;

  const desayunos = candidatos("desayuno", noLeGustan, gustos, giro, dieta);
  const comidas = candidatos("comida", noLeGustan, gustos, giro, dieta);
  const cenas = candidatos("cena", noLeGustan, gustos, giro, dieta);
  const snacks = candidatos("snack", noLeGustan, gustos, giro, dieta);

  const coger = (lista: Plato[], i: number): Plato | null =>
    lista.length === 0 ? null : lista[(i + offset) % lista.length];

  const dias = NOMBRES_DIAS.map((nombre, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return {
      dia: nombre,
      fecha: aFechaISO(dia),
      comidas: {
        desayuno: coger(desayunos, i),
        comida: coger(comidas, i),
        cena: coger(cenas, i),
        snack: coger(snacks, i),
      },
    };
  });

  return kcalObjetivo ? dias.map((d) => escalarDia(d, kcalObjetivo)) : dias;
}

/**
 * Ajusta las raciones de un día para que sumen las calorías que tocan.
 *
 * Los platos se escribieron con raciones fijas y la semana se quedaba entre 200
 * y 300 kcal por debajo del objetivo: te mandaba comer menos de lo que decía el
 * encabezado. Se escala todo el día por el mismo factor para no desequilibrar
 * el reparto entre comidas, y las proporciones del plato no se mueven.
 */
export function escalarDia(dia: DiaPlan, kcalObjetivo: number): DiaPlan {
  const actual = kcalDelDia(dia);
  if (actual <= 0 || kcalObjetivo <= 0) return dia;

  // Ni platos diminutos ni raciones a lo bestia: como mucho un 55 % para arriba
  // (el día más flojo salía a 1.298 kcal y hacía falta) o un 30 % para abajo.
  const factor = Math.min(1.55, Math.max(0.7, kcalObjetivo / actual));
  // Si la diferencia es mínima no se toca nada. La banda es estrecha (±0,5 %)
  // porque con platos combinados el día puede caer justo en el borde y quedarse
  // 30-40 kcal fuera; con el 2 % de antes, el ajuste no se aplicaba.
  if (Math.abs(factor - 1) < 0.005) return dia;

  // Copias: los platos de PLATOS son constantes compartidas y no se tocan.
  const escalar = (p: Plato | null): Plato | null => {
    if (!p) return null;
    return {
      ...p,
      kcal: Math.round(p.kcal * factor),
      proteinas: Math.round(p.proteinas * factor * 10) / 10,
      carbohidratos: Math.round(p.carbohidratos * factor * 10) / 10,
      grasas: Math.round(p.grasas * factor * 10) / 10,
      ingredientes: p.ingredientes.map((i) => ({
        ...i,
        gramos: Number.isFinite(i.gramos) && i.gramos > 0 ? Math.max(5, Math.round((i.gramos * factor) / 5) * 5) : 5,
      })),
    };
  };

  return {
    ...dia,
    comidas: {
      desayuno: escalar(dia.comidas.desayuno),
      comida: escalar(dia.comidas.comida),
      cena: escalar(dia.comidas.cena),
      snack: escalar(dia.comidas.snack),
    },
  };
}

export type Articulo = { nombre: string; gramos: number; categoria: string };

/**
 * Lo que vive en el armario y se compra de vez en cuando.
 *
 * Sin esto, la lista pedía «5 g de aceite de oliva» o «15 g de vinagre», que
 * no es como se compra nada. Estos van a su propia sección y solo se recuerdan
 * por si se han acabado.
 */
const BASICOS_DESPENSA = new Set([
  "Aceite de oliva",
  "Vinagre",
  "Mostaza",
  "Sal",
  "Pimienta",
  "Orégano",
  "Canela",
  "Pimentón",
  "Especias",
  "Miel",
  "Salsa de soja",
  "Cacao en polvo",
  "Caldo de pollo",
  // Botes que se tienen en el armario: nadie compra 15 g de crema de
  // cacahuete ni 85 g de tomate triturado, se compra el bote y se gasta.
  "Crema de cacahuete",
  "Tomate triturado",
  // Secos de armario: nadie compra un paquete de arroz, otro de cuscús y otro
  // de quinoa cada semana para gastar 50 g de cada uno. Se miran por si se han
  // acabado y, cuando toca, se compra el paquete entero.
  "Arroz",
  "Arroz blanco",
  "Arroz integral",
  "Arroz blanco cocido",
  "Arroz integral cocido",
  "Avena en copos",
  "Cuscús",
  "Pasta",
  "Pasta integral",
  "Pasta cocida",
  "Quinoa",
  "Nueces",
  "Almendras",
  "Avellanas",
  "Cacahuetes",
  "Pistachos",
  "Anacardos",
  "Pasas",
]);

/** Si un ingrediente es de despensa (armario) y no de compra semanal. */
export function esDespensa(nombre: string): boolean {
  return BASICOS_DESPENSA.has(nombre);
}

/**
 * Suma los ingredientes de la semana y los agrupa por tipo de tienda.
 *
 * `desdeFecha` (opcional, en ISO) sirve para comprar solo lo que queda: si
 * miras el jueves, la lista es de jueves a domingo.
 */
export function listaCompra(
  semana: DiaPlan[],
  desdeFecha?: string,
): Record<string, Articulo[]> {
  const totales = new Map<string, Articulo>();
  for (const dia of semana) {
    if (desdeFecha && dia.fecha < desdeFecha) continue;
    for (const plato of Object.values(dia.comidas)) {
      if (!plato) continue;
      for (const ing of plato.ingredientes) {
        const ya = totales.get(ing.nombre);
        if (ya) ya.gramos += ing.gramos;
        else totales.set(ing.nombre, { ...ing });
      }
    }
  }
  const porCategoria: Record<string, Articulo[]> = {};
  for (const art of [...totales.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    // Los básicos de armario no se compran cada semana: van a su propia
    // sección, separados de lo que hay que coger de verdad en la tienda.
    const categoria = esDespensa(art.nombre) ? "Despensa" : art.categoria;
    porCategoria[categoria] ??= [];
    porCategoria[categoria].push(art);
  }
  return porCategoria;
}

/** "1,2 kg" o "450 g", según lo que sea. */
export function enPeso(gramos: number): string {
  if (gramos >= 1000) return `${(gramos / 1000).toFixed(1).replace(".", ",")} kg`;
  return `${Math.round(gramos)} g`;
}

/**
 * Cómo se compra de verdad cada ingrediente.
 *
 * En la receta los gramos son lo más exacto, pero en el supermercado nadie
 * pide «440 g de huevo» ni «355 g de leche». Esta tabla solo cambia la forma
 * de enseñar la lista de la compra; las recetas y los macros siguen con sus
 * gramos. Lo que no esté aquí se queda en gramos o kilos, que para el arroz,
 * la carne picada o las verduras sueltas es lo normal.
 */
type UnidadCompra = {
  singular: string;
  plural: string;
  /** Gramos que pesa una unidad, o mililitros si es volumen. */
  gramos: number;
  tipo?: "unidad" | "volumen";
};

const UNIDADES_COMPRA: Record<string, UnidadCompra> = {
  "Clara de huevo": { singular: "clara", plural: "claras", gramos: 33 },
  Manzana: { singular: "manzana", plural: "manzanas", gramos: 180 },
  Plátano: { singular: "plátano", plural: "plátanos", gramos: 120 },
  // La bandeja de fresas es la unidad de tienda; el peso va al lado porque no
  // todas pesan lo mismo (ver UNIDADES_AL_PESO).
  Fresas: { singular: "bandeja", plural: "bandejas", gramos: 250 },
  Naranja: { singular: "naranja", plural: "naranjas", gramos: 180 },
  Pera: { singular: "pera", plural: "peras", gramos: 170 },
  Kiwi: { singular: "kiwi", plural: "kiwis", gramos: 80 },
  Tomate: { singular: "tomate", plural: "tomates", gramos: 150 },
  Zanahoria: { singular: "zanahoria", plural: "zanahorias", gramos: 80 },
  "Pimiento rojo": { singular: "pimiento", plural: "pimientos", gramos: 120 },
  Cebolla: { singular: "cebolla", plural: "cebollas", gramos: 100 },
  Calabacín: { singular: "calabacín", plural: "calabacines", gramos: 200 },
  Patata: { singular: "patata", plural: "patatas", gramos: 150 },
  "Patata cocida": { singular: "patata", plural: "patatas", gramos: 150 },
  Boniato: { singular: "boniato", plural: "boniatos", gramos: 150 },
  Aguacate: { singular: "aguacate", plural: "aguacates", gramos: 200 },
  Coliflor: { singular: "coliflor", plural: "coliflores", gramos: 600 },
  Ajo: { singular: "cabeza", plural: "cabezas", gramos: 30 },
  "Yogur natural": { singular: "yogur", plural: "yogures", gramos: 125 },
  "Yogur griego": { singular: "yogur", plural: "yogures", gramos: 125 },
  "Yogur griego natural": { singular: "yogur", plural: "yogures", gramos: 125 },
  "Queso fresco batido": { singular: "tarrina", plural: "tarrinas", gramos: 200 },
  "Pan integral": { singular: "rebanada", plural: "rebanadas", gramos: 30 },
  "Pan blanco": { singular: "rebanada", plural: "rebanadas", gramos: 30 },
  "Pechuga de pollo": { singular: "filete", plural: "filetes", gramos: 150 },
  "Pechuga de pavo": { singular: "filete", plural: "filetes", gramos: 150 },
  Pavo: { singular: "filete", plural: "filetes", gramos: 150 },
  "Filete de ternera": { singular: "filete", plural: "filetes", gramos: 150 },
  "Lomo de cerdo": { singular: "filete", plural: "filetes", gramos: 130 },
  Salmón: { singular: "filete", plural: "filetes", gramos: 150 },
  Merluza: { singular: "filete", plural: "filetes", gramos: 150 },
  "Muslo de pollo": { singular: "muslo", plural: "muslos", gramos: 120 },
  "Atún al natural": { singular: "lata", plural: "latas", gramos: 60 },
  Sardinas: { singular: "lata", plural: "latas", gramos: 85 },
  "Sardinas en aceite": { singular: "lata", plural: "latas", gramos: 80 },
  Salchichas: { singular: "salchicha", plural: "salchichas", gramos: 40 },
  "Tortitas de maíz": { singular: "tortita", plural: "tortitas", gramos: 8 },
  Croissant: { singular: "croissant", plural: "croissants", gramos: 60 },
  "Queso curado": { singular: "loncha", plural: "lonchas", gramos: 15 },
  "Jamón serrano": { singular: "loncha", plural: "lonchas", gramos: 40 / 3 },
  "Galletas María": { singular: "galleta", plural: "galletas", gramos: 5 },
  "Chocolate negro 85%": { singular: "onza", plural: "onzas", gramos: 10 },
  Jengibre: { singular: "trozo", plural: "trozos", gramos: 20 },
  Limón: { singular: "limón", plural: "limones", gramos: 100 },
  Lima: { singular: "lima", plural: "limas", gramos: 80 },
  // Cereales y legumbres: en el súper se coge el paquete o el bote, no 50 g
  // sueltos. La receta sigue pesando en gramos; esto solo cambia la compra.
  // Los cereales sin apellido («Arroz», «Cuscús»...) los resuelve la regla por
  // categoría de `enCompra`, no esta tabla.
  "Lentejas cocidas": { singular: "bote", plural: "botes", gramos: 400 },
  "Garbanzos cocidos": { singular: "bote", plural: "botes", gramos: 400 },
};

/**
 * Frescos que se compran a granel y se pesan al elegirlos: la unidad de tienda
 * (la bandeja) y el dato de la receta van los dos, porque una bandeja no pesa
 * siempre lo mismo. Se pide «1 bandeja · 105 g», no «105 g» de fresas sueltas.
 */
const UNIDADES_AL_PESO = new Set(["Fresas"]);

/**
 * Frescos que la receta pesa con un número exacto que en la tienda no existe.
 * La gamba se pide en múltiplos de 50 g: 155 g son 150 g.
 */
const REDONDEAR_A_50 = new Set(["Gambas"]);

/**
 * Carnes y pescados que se compran por piezas pero cuyo peso importa: un
 * filete de pavo no siempre pesa lo mismo. Se pide «1 filete · usas 150 g».
 */
const CARNES_AL_PESO = new Set([
  "Pechuga de pollo",
  "Pechuga de pavo",
  "Pavo",
  "Filete de ternera",
  "Lomo de cerdo",
  "Salmón",
  "Merluza",
  "Muslo de pollo",
]);

/** La cantidad de la compra en la unidad que se usa en el supermercado. */
export function enCompra(nombre: string, gramos: number, categoria?: string): string {
  // Del armario no se pide una cantidad: se recuerda por si se acabó.
  if (esDespensa(nombre)) return "si te falta";

  // El huevo se compra por docenas y la leche por briks. La receta sigue
  // pesando en gramos; esto solo cambia cómo se pide en la tienda. El dato de
  // la receta va detrás con un «·», sin repetir «gastas» en cada fila.
  if (nombre === "Huevo") {
    const huevos = Math.max(1, Math.round(gramos / 55));
    const docenas = Math.max(1, Math.ceil(huevos / 12));
    return `${docenas} ${docenas === 1 ? "docena" : "docenas"} · usas ${huevos} ${
      huevos === 1 ? "ud" : "uds"
    }`;
  }
  if (nombre === "Leche entera" || nombre === "Leche desnatada") {
    const ml = Math.round(gramos);
    const briks = Math.max(1, Math.ceil(ml / 1000));
    const gasto =
      ml >= 1000 ? `${(ml / 1000).toFixed(1).replace(".", ",")} L` : `${ml} ml`;
    return `${briks} ${briks === 1 ? "brik" : "briks"} · usas ${gasto}`;
  }

  if (REDONDEAR_A_50.has(nombre)) {
    return enPeso(Math.max(50, Math.round(gramos / 50) * 50));
  }

  const unidad = UNIDADES_COMPRA[nombre];
  if (!unidad) {
    // Cereales y legumbres que no son de despensa (harina, legumbre cruda...):
    // se cogen en paquete. El pan ya tiene su rebanada y las legumbres cocidas
    // su bote, así que se resuelven antes.
    const cereal = categoria === "Cereales y legumbres" && !nombre.startsWith("Pan ");
    if (cereal) return `1 paquete · ${enPeso(gramos)}`;
    return enPeso(gramos);
  }

  if (UNIDADES_AL_PESO.has(nombre)) {
    const cuantas = Math.max(1, Math.ceil(gramos / unidad.gramos));
    return `${cuantas} ${cuantas === 1 ? unidad.singular : unidad.plural} · usas ${enPeso(gramos)}`;
  }

  if (CARNES_AL_PESO.has(nombre)) {
    const cuantas = Math.max(1, Math.round(gramos / unidad.gramos));
    return `${cuantas} ${cuantas === 1 ? unidad.singular : unidad.plural} · usas ${enPeso(gramos)}`;
  }

  if (unidad.tipo === "volumen") {
    const ml = Math.round(gramos);
    if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace(".", ",")} L`;
    return `${ml} ml`;
  }

  // Siempre al menos una unidad: 35 g de limón no son «35 g», es un limón, y
  // 55 g de yogur es un yogur. Antes, por debajo de media unidad se volvía a
  // gramos y la lista acababa pidiendo medio yogur.
  const cuantas = Math.max(1, Math.round(gramos / unidad.gramos));
  return `${cuantas} ${cuantas === 1 ? unidad.singular : unidad.plural}`;
}

/** Las kcal de un día del plan. */
export function kcalDelDia(dia: DiaPlan): number {
  return Object.values(dia.comidas).reduce((s, p) => s + (p?.kcal ?? 0), 0);
}

/**
 * Los nombres del catálogo. Sirve para saber si una comida anotada es un plato
 * nuestro: solo a esos se les puede pedir opinión al comer en Hoy. Incluye los
 * platos escritos y los combinados.
 */
export const NOMBRES_DE_PLATO: Set<string> = new Set(UNIVERSO.map((p) => p.nombre));
