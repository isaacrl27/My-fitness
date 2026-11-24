/**
 * Lista de alimentos con sus valores por 100 g.
 *
 * Datos nutricionales de dominio público (equivalentes a los de USDA FoodData
 * Central y BEDCA, CC0).
 */

export type AlimentoBase = {
  nombre: string;
  /** Cómo se cuenta normalmente: "1 unidad mediana", "1 rebanada"… */
  porcion: string;
  /** Gramos de esa porción. */
  gramos: number;
  kcal100: number;
  p100: number;
  c100: number;
  g100: number;
  categoria: string;
  /** Sinónimos, nombres populares, marcas y plurales para encontrarlos siempre. */
  alias?: string[];
};

export const ALIMENTOS: AlimentoBase[] = [
  // Cereales y harinas
  {
    nombre: "Avena en copos",
    porcion: "1 ración",
    gramos: 40,
    kcal100: 380,
    p100: 13,
    c100: 60,
    g100: 7,
    categoria: "Cereales",
    alias: ["copos de avena", "porridge", "avena suave", "oats"],
  },
  {
    nombre: "Arroz blanco cocido",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 130,
    p100: 2.7,
    c100: 28,
    g100: 0.3,
    categoria: "Cereales",
    alias: ["arroz hervido", "arroz redondo", "arroz basmati", "arroz jazmin"],
  },
  {
    nombre: "Arroz integral cocido",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 123,
    p100: 2.7,
    c100: 26,
    g100: 1,
    categoria: "Cereales",
    alias: ["arroz moreno", "arroz completo"],
  },
  {
    nombre: "Pasta cocida",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 131,
    p100: 5,
    c100: 25,
    g100: 1.1,
    categoria: "Cereales",
    alias: ["macarrones", "espaguetis", "fideos", "pasta hervida", "tallarines", "plumas"],
  },
  {
    nombre: "Pasta integral cocida",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 124,
    p100: 5.3,
    c100: 23,
    g100: 1.2,
    categoria: "Cereales",
    alias: ["macarrones integrales", "espaguetis integrales"],
  },
  {
    nombre: "Pan integral",
    porcion: "1 rebanada",
    gramos: 30,
    kcal100: 247,
    p100: 13,
    c100: 41,
    g100: 3.4,
    categoria: "Cereales",
    alias: ["pan de molde integral", "pan centeno", "rebanada integral"],
  },
  {
    nombre: "Pan blanco",
    porcion: "1 rebanada",
    gramos: 30,
    kcal100: 265,
    p100: 9,
    c100: 49,
    g100: 3.2,
    categoria: "Cereales",
    alias: ["barra de pan", "baguette", "pan de molde", "pistola"],
  },
  {
    nombre: "Tostada de pan / Pan tostado",
    porcion: "2 tostadas",
    gramos: 40,
    kcal100: 388,
    p100: 11,
    c100: 72,
    g100: 5,
    categoria: "Cereales",
    alias: ["tostadas", "tostada", "pan tostado", "biscote", "biscotes", "tosta", "tostas", "pan tostar", "picatostes"],
  },
  {
    nombre: "Tortitas de maíz",
    porcion: "1 tortita",
    gramos: 8,
    kcal100: 387,
    p100: 8,
    c100: 78,
    g100: 3,
    categoria: "Cereales",
    alias: ["tortita de maiz", "tortitas maiz"],
  },
  {
    nombre: "Tortitas de arroz",
    porcion: "2 tortitas",
    gramos: 18,
    kcal100: 385,
    p100: 8,
    c100: 82,
    g100: 2,
    categoria: "Cereales",
    alias: ["tortita de arroz", "tortitas arroz"],
  },
  {
    nombre: "Copos de maíz (Corn Flakes)",
    porcion: "1 bol",
    gramos: 40,
    kcal100: 378,
    p100: 7.5,
    c100: 84,
    g100: 0.9,
    categoria: "Cereales",
    alias: ["cereales", "corn flakes", "copos maiz", "special k", "cereales desayuno"],
  },
  {
    nombre: "Muesli o Granola",
    porcion: "1 bol",
    gramos: 45,
    kcal100: 420,
    p100: 10,
    c100: 64,
    g100: 12,
    categoria: "Cereales",
    alias: ["granola", "muesli con frutas", "cereales crujientes"],
  },

  // Frutas
  {
    nombre: "Plátano",
    porcion: "1 mediano",
    gramos: 120,
    kcal100: 89,
    p100: 1.1,
    c100: 23,
    g100: 0.3,
    categoria: "Frutas",
    alias: ["platano", "platanos", "banana", "bananas", "platano de canarias"],
  },
  {
    nombre: "Manzana",
    porcion: "1 mediana",
    gramos: 180,
    kcal100: 52,
    p100: 0.3,
    c100: 14,
    g100: 0.2,
    categoria: "Frutas",
    alias: ["manzanas", "manzana golden", "manzana fuji", "manzana verde", "reineta"],
  },
  {
    nombre: "Naranja",
    porcion: "1 mediana",
    gramos: 180,
    kcal100: 47,
    p100: 0.9,
    c100: 12,
    g100: 0.1,
    categoria: "Frutas",
    alias: ["naranjas", "naranja de mesa"],
  },
  {
    nombre: "Mandarina",
    porcion: "2 unidades",
    gramos: 120,
    kcal100: 45,
    p100: 0.8,
    c100: 11,
    g100: 0.2,
    categoria: "Frutas",
    alias: ["mandarinas", "clementina", "clementinas"],
  },
  {
    nombre: "Fresas",
    porcion: "1 bol",
    gramos: 150,
    kcal100: 32,
    p100: 0.7,
    c100: 7.7,
    g100: 0.3,
    categoria: "Frutas",
    alias: ["fresa", "fresones", "freson", "frutillas"],
  },
  {
    nombre: "Arándanos",
    porcion: "1 puñado",
    gramos: 80,
    kcal100: 57,
    p100: 0.7,
    c100: 14,
    g100: 0.3,
    categoria: "Frutas",
    alias: ["arandano", "arandanos", "blueberries", "frutos rojos"],
  },
  {
    nombre: "Pera",
    porcion: "1 mediana",
    gramos: 170,
    kcal100: 57,
    p100: 0.4,
    c100: 15,
    g100: 0.1,
    categoria: "Frutas",
    alias: ["peras", "pera conferencia", "pera de agua"],
  },
  {
    nombre: "Kiwi",
    porcion: "1 unidad",
    gramos: 80,
    kcal100: 61,
    p100: 1.1,
    c100: 15,
    g100: 0.5,
    categoria: "Frutas",
    alias: ["kiwis", "kiwi verde", "kiwi gold"],
  },
  {
    nombre: "Sandía",
    porcion: "1 tajada",
    gramos: 200,
    kcal100: 30,
    p100: 0.6,
    c100: 7.6,
    g100: 0.2,
    categoria: "Frutas",
    alias: ["sandia", "sandias"],
  },
  {
    nombre: "Melón",
    porcion: "1 tajada",
    gramos: 200,
    kcal100: 34,
    p100: 0.8,
    c100: 8.2,
    g100: 0.2,
    categoria: "Frutas",
    alias: ["melon", "melones", "melon piel de sapo"],
  },
  {
    nombre: "Uvas",
    porcion: "1 racimo pequeño",
    gramos: 120,
    kcal100: 67,
    p100: 0.6,
    c100: 17,
    g100: 0.4,
    categoria: "Frutas",
    alias: ["uva", "uvas blancas", "uvas negras", "uvas sin semillas"],
  },
  {
    nombre: "Melocotón",
    porcion: "1 unidad",
    gramos: 150,
    kcal100: 39,
    p100: 0.9,
    c100: 9.5,
    g100: 0.3,
    categoria: "Frutas",
    alias: ["melocoton", "melocotones", "nectarina", "paraguayo"],
  },

  // Verduras y hortalizas
  {
    nombre: "Tomate",
    porcion: "1 unidad",
    gramos: 150,
    kcal100: 18,
    p100: 0.9,
    c100: 3.9,
    g100: 0.2,
    categoria: "Verduras",
    alias: ["tomates", "tomate ensalada", "tomates cherry", "tomate cherry"],
  },
  {
    nombre: "Lechuga",
    porcion: "1 bol",
    gramos: 100,
    kcal100: 15,
    p100: 1.4,
    c100: 2.9,
    g100: 0.2,
    categoria: "Verduras",
    alias: ["ensalada", "canónigos", "canonigos", "rúcula", "rucula", "iceberg", "cogollos"],
  },
  {
    nombre: "Zanahoria",
    porcion: "1 unidad",
    gramos: 80,
    kcal100: 41,
    p100: 0.9,
    c100: 10,
    g100: 0.2,
    categoria: "Verduras",
    alias: ["zanahorias"],
  },
  {
    nombre: "Brócoli",
    porcion: "1 ración",
    gramos: 150,
    kcal100: 34,
    p100: 2.8,
    c100: 7,
    g100: 0.4,
    categoria: "Verduras",
    alias: ["brocoli", "brocolis"],
  },
  {
    nombre: "Espinacas",
    porcion: "1 ración",
    gramos: 100,
    kcal100: 23,
    p100: 2.9,
    c100: 3.6,
    g100: 0.4,
    categoria: "Verduras",
    alias: ["espinaca", "espinacas hervidas", "espinacas frescas"],
  },
  {
    nombre: "Pimiento rojo",
    porcion: "1 unidad",
    gramos: 120,
    kcal100: 31,
    p100: 1,
    c100: 6,
    g100: 0.3,
    categoria: "Verduras",
    alias: ["pimiento", "pimientos", "pimiento verde", "pimientos asados"],
  },
  {
    nombre: "Cebolla",
    porcion: "1 unidad",
    gramos: 100,
    kcal100: 40,
    p100: 1.1,
    c100: 9,
    g100: 0.1,
    categoria: "Verduras",
    alias: ["cebollas", "cebolla morada", "cebolleta"],
  },
  {
    nombre: "Calabacín",
    porcion: "1 unidad",
    gramos: 200,
    kcal100: 17,
    p100: 1.2,
    c100: 3.1,
    g100: 0.3,
    categoria: "Verduras",
    alias: ["calabacin", "calabacines"],
  },
  {
    nombre: "Champiñones",
    porcion: "1 ración",
    gramos: 100,
    kcal100: 22,
    p100: 3.1,
    c100: 3.3,
    g100: 0.3,
    categoria: "Verduras",
    alias: ["champinones", "champiñón", "champinon", "setas", "boletus"],
  },
  {
    nombre: "Patata cocida",
    porcion: "1 unidad",
    gramos: 150,
    kcal100: 87,
    p100: 1.9,
    c100: 20,
    g100: 0.1,
    categoria: "Verduras",
    alias: ["patatas cocidas", "patata hervida", "papas cocidas", "patatas", "patata"],
  },
  {
    nombre: "Puré de patatas",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 83,
    p100: 2,
    c100: 15,
    g100: 1.5,
    categoria: "Verduras",
    alias: ["pure de patatas", "pure de patata", "pure"],
  },
  {
    nombre: "Boniato",
    porcion: "1 unidad",
    gramos: 150,
    kcal100: 86,
    p100: 1.6,
    c100: 20,
    g100: 0.1,
    categoria: "Verduras",
    alias: ["boniatos", "batata", "batatas", "camote"],
  },
  {
    nombre: "Gazpacho tradicional",
    porcion: "1 vaso",
    gramos: 200,
    kcal100: 44,
    p100: 0.8,
    c100: 4.2,
    g100: 2.6,
    categoria: "Verduras",
    alias: ["gazpacho andaluz", "salmorejo", "sopa fria"],
  },

  // Carnes y aves
  {
    nombre: "Pechuga de pollo a la plancha",
    porcion: "1 filete",
    gramos: 150,
    kcal100: 165,
    p100: 31,
    c100: 0,
    g100: 3.6,
    categoria: "Carnes",
    alias: ["pechuga de pollo", "pollo", "pollo plancha", "filete de pollo", "pechugas de pollo"],
  },
  {
    nombre: "Muslo de pollo",
    porcion: "1 unidad",
    gramos: 120,
    kcal100: 209,
    p100: 26,
    c100: 0,
    g100: 10.9,
    categoria: "Carnes",
    alias: ["muslo pollo", "contramuslo", "alitas de pollo", "alitas"],
  },
  {
    nombre: "Pechuga de pavo a la plancha",
    porcion: "1 filete",
    gramos: 150,
    kcal100: 135,
    p100: 29,
    c100: 0,
    g100: 1.5,
    categoria: "Carnes",
    alias: ["pechuga de pavo", "pavo", "pavo plancha", "filete de pavo", "solomillo de pavo"],
  },
  {
    nombre: "Fiambre de pechuga de pavo",
    porcion: "3 lonchas",
    gramos: 60,
    kcal100: 85,
    p100: 17,
    c100: 1.2,
    g100: 1.5,
    categoria: "Carnes",
    alias: ["pavo lonchas", "pechuga de pavo lonchas", "embutido de pavo"],
  },
  {
    nombre: "Jamón cocido / York",
    porcion: "3 lonchas",
    gramos: 60,
    kcal100: 105,
    p100: 18,
    c100: 1.5,
    g100: 3,
    categoria: "Carnes",
    alias: ["jamon york", "jamon dulce", "jamon cocido extra", "york lonchas"],
  },
  {
    nombre: "Jamón serrano",
    porcion: "3 lonchas",
    gramos: 40,
    kcal100: 241,
    p100: 31,
    c100: 0.3,
    g100: 13,
    categoria: "Carnes",
    alias: ["jamon", "jamon iberico", "prosciutto", "jamon curado", "paleta serrana"],
  },
  {
    nombre: "Lomo embuchado",
    porcion: "4 lonchas",
    gramos: 40,
    kcal100: 195,
    p100: 38,
    c100: 0.5,
    g100: 4.5,
    categoria: "Carnes",
    alias: ["lomo embuchado", "cana de lomo", "lomo curado"],
  },
  {
    nombre: "Filete de ternera",
    porcion: "1 filete",
    gramos: 150,
    kcal100: 158,
    p100: 26,
    c100: 0,
    g100: 6,
    categoria: "Carnes",
    alias: ["ternera", "filete ternera", "bistec", "entrecot", "solomillo ternera"],
  },
  {
    nombre: "Carne picada de ternera",
    porcion: "1 ración",
    gramos: 150,
    kcal100: 137,
    p100: 21,
    c100: 0,
    g100: 5,
    categoria: "Carnes",
    alias: ["carne picada", "hamburguesa de ternera", "picada ternera"],
  },
  {
    nombre: "Lomo de cerdo",
    porcion: "1 filete",
    gramos: 130,
    kcal100: 143,
    p100: 21,
    c100: 0,
    g100: 6,
    categoria: "Carnes",
    alias: ["cinta de lomo", "solomillo de cerdo", "chuleta de cerdo"],
  },

  // Huevos
  {
    nombre: "Huevo",
    porcion: "1 unidad",
    gramos: 55,
    kcal100: 143,
    p100: 12.6,
    c100: 0.7,
    g100: 9.5,
    categoria: "Huevos",
    alias: ["huevos", "huevo cocido", "huevo duro", "huevo pasado por agua"],
  },
  {
    nombre: "Huevo frito o a la plancha",
    porcion: "1 unidad",
    gramos: 60,
    kcal100: 185,
    p100: 13,
    c100: 0.7,
    g100: 14.5,
    categoria: "Huevos",
    alias: ["huevo frito", "huevos fritos", "huevo plancha"],
  },
  {
    nombre: "Huevos revueltos",
    porcion: "2 huevos",
    gramos: 110,
    kcal100: 160,
    p100: 11,
    c100: 1,
    g100: 12,
    categoria: "Huevos",
    alias: ["revuelto de huevos", "huevos revueltos", "scrambled eggs"],
  },
  {
    nombre: "Clara de huevo",
    porcion: "1 unidad",
    gramos: 33,
    kcal100: 52,
    p100: 11,
    c100: 0.7,
    g100: 0.2,
    categoria: "Huevos",
    alias: ["claras", "claras de huevo", "bote de claras"],
  },
  {
    nombre: "Tortilla francesa",
    porcion: "2 huevos",
    gramos: 110,
    kcal100: 154,
    p100: 11,
    c100: 0.6,
    g100: 12,
    categoria: "Huevos",
    alias: ["tortilla", "omelette", "tortilla de 2 huevos", "tortilla sencilla"],
  },
  {
    nombre: "Tortilla de patatas",
    porcion: "1 porción",
    gramos: 150,
    kcal100: 154,
    p100: 6,
    c100: 12,
    g100: 9,
    categoria: "Huevos",
    alias: ["tortilla espanola", "tortilla de patata", "pincho de tortilla"],
  },

  // Pescados y mariscos
  {
    nombre: "Salmón",
    porcion: "1 filete",
    gramos: 150,
    kcal100: 208,
    p100: 20,
    c100: 0,
    g100: 13,
    categoria: "Pescados",
    alias: ["salmon", "salmon plancha", "lomo de salmon"],
  },
  {
    nombre: "Salmón ahumado",
    porcion: "2 lonchas",
    gramos: 50,
    kcal100: 177,
    p100: 21,
    c100: 0,
    g100: 10.5,
    categoria: "Pescados",
    alias: ["salmon ahumado", "tostada de salmon", "smoked salmon"],
  },
  {
    nombre: "Merluza",
    porcion: "1 filete",
    gramos: 150,
    kcal100: 86,
    p100: 17,
    c100: 0,
    g100: 1.8,
    categoria: "Pescados",
    alias: ["merluza plancha", "lomo de merluza", "pescadilla"],
  },
  {
    nombre: "Atún al natural",
    porcion: "1 lata",
    gramos: 60,
    kcal100: 116,
    p100: 26,
    c100: 0,
    g100: 0.8,
    categoria: "Pescados",
    alias: ["atun natural", "lata de atun", "bonito al natural"],
  },
  {
    nombre: "Atún en aceite de oliva",
    porcion: "1 lata escurrida",
    gramos: 60,
    kcal100: 198,
    p100: 25,
    c100: 0,
    g100: 11,
    categoria: "Pescados",
    alias: ["atun con aceite", "bonito del norte", "atun claro"],
  },
  {
    nombre: "Sardinas en aceite",
    porcion: "1 lata",
    gramos: 80,
    kcal100: 208,
    p100: 25,
    c100: 0,
    g100: 11,
    categoria: "Pescados",
    alias: ["sardinillas", "sardina", "sardinas en lata"],
  },
  {
    nombre: "Gambas o langostinos",
    porcion: "1 ración",
    gramos: 100,
    kcal100: 99,
    p100: 24,
    c100: 0.2,
    g100: 0.3,
    categoria: "Pescados",
    alias: ["gambas", "gamba", "langostinos", "camarones", "marisco"],
  },
  {
    nombre: "Sepia o calamar a la plancha",
    porcion: "1 ración",
    gramos: 150,
    kcal100: 80,
    p100: 16,
    c100: 1,
    g100: 1.4,
    categoria: "Pescados",
    alias: ["sepia", "calamar", "chipirones", "pota", "choco"],
  },

  // Legumbres
  {
    nombre: "Lentejas cocidas",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 116,
    p100: 9,
    c100: 20,
    g100: 0.4,
    categoria: "Legumbres",
    alias: ["lentejas", "lenteja", "plato de lentejas", "lentejas de bote"],
  },
  {
    nombre: "Garbanzos cocidos",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 164,
    p100: 8.9,
    c100: 27,
    g100: 2.6,
    categoria: "Legumbres",
    alias: ["garbanzos", "garbanzo", "garbanzos de bote", "cocido"],
  },
  {
    nombre: "Alubias cocidas",
    porcion: "1 plato",
    gramos: 200,
    kcal100: 127,
    p100: 8.7,
    c100: 23,
    g100: 0.5,
    categoria: "Legumbres",
    alias: ["alubias", "alubia", "judias blancas", "frijoles", "fabes"],
  },
  {
    nombre: "Guisantes",
    porcion: "1 ración",
    gramos: 120,
    kcal100: 81,
    p100: 5.4,
    c100: 14,
    g100: 0.4,
    categoria: "Legumbres",
    alias: ["guisante", "arvejas"],
  },
  {
    nombre: "Hummus de garbanzos",
    porcion: "2 cucharadas",
    gramos: 40,
    kcal100: 166,
    p100: 8,
    c100: 14,
    g100: 9.6,
    categoria: "Legumbres",
    alias: ["hummus", "pure de garbanzos", "pate de garbanzos"],
  },

  // Lácteos
  {
    nombre: "Leche entera",
    porcion: "1 vaso",
    gramos: 250,
    kcal100: 61,
    p100: 3.2,
    c100: 4.8,
    g100: 3.3,
    categoria: "Lácteos",
    alias: ["leche", "vaso de leche"],
  },
  {
    nombre: "Leche desnatada",
    porcion: "1 vaso",
    gramos: 250,
    kcal100: 34,
    p100: 3.4,
    c100: 5,
    g100: 0.1,
    categoria: "Lácteos",
    alias: ["leche desnatada", "leche descremada", "leche 0%"],
  },
  {
    nombre: "Leche semidesnatada",
    porcion: "1 vaso",
    gramos: 250,
    kcal100: 46,
    p100: 3.3,
    c100: 4.9,
    g100: 1.6,
    categoria: "Lácteos",
    alias: ["leche semi"],
  },
  {
    nombre: "Yogur natural",
    porcion: "1 unidad",
    gramos: 125,
    kcal100: 61,
    p100: 3.5,
    c100: 4.7,
    g100: 3.3,
    categoria: "Lácteos",
    alias: ["yogur", "yogures", "yogurt", "yogurts", "yogurth", "danone", "yogur natural sin azucar"],
  },
  {
    nombre: "Yogur griego natural",
    porcion: "1 unidad",
    gramos: 125,
    kcal100: 97,
    p100: 9,
    c100: 3.6,
    g100: 5,
    categoria: "Lácteos",
    alias: ["griego", "yogur griego", "yogurt griego", "yogurt", "yogurts"],
  },
  {
    nombre: "Queso fresco batido 0%",
    porcion: "1 tarrina pequeña",
    gramos: 150,
    kcal100: 46,
    p100: 8.5,
    c100: 3.5,
    g100: 0.1,
    categoria: "Lácteos",
    alias: ["queso batido", "queso fresco batido", "fromage blanc", "quark"],
  },
  {
    nombre: "Yogur de proteínas",
    porcion: "1 vaso",
    gramos: 150,
    kcal100: 64,
    p100: 10,
    c100: 4.5,
    g100: 0.2,
    categoria: "Lácteos",
    alias: ["pudin de proteinas", "yogur proteico", "yogurt de proteinas", "yogurt proteico", "+proteinas mercadona", "yogur de proteina"],
  },
  {
    nombre: "Queso curado",
    porcion: "2 lonchas",
    gramos: 30,
    kcal100: 402,
    p100: 25,
    c100: 1.4,
    g100: 33,
    categoria: "Lácteos",
    alias: ["queso manchego", "queso semicurado", "cunita de queso", "queso"],
  },
  {
    nombre: "Queso fresco / Burgos",
    porcion: "1 porción",
    gramos: 60,
    kcal100: 174,
    p100: 12,
    c100: 4,
    g100: 12,
    categoria: "Lácteos",
    alias: ["queso burgos", "queso de burgos", "queso blanco"],
  },
  {
    nombre: "Queso mozzarella",
    porcion: "1 bola",
    gramos: 125,
    kcal100: 280,
    p100: 22,
    c100: 2,
    g100: 21,
    categoria: "Lácteos",
    alias: ["mozzarella", "queso de pizza"],
  },
  {
    nombre: "Requesón o Cottage",
    porcion: "1 porción",
    gramos: 100,
    kcal100: 98,
    p100: 11,
    c100: 3.4,
    g100: 4.3,
    categoria: "Lácteos",
    alias: ["requeson", "ricotta", "cottage", "queso cottage"],
  },
  {
    nombre: "Queso rallado",
    porcion: "1 puñadito",
    gramos: 20,
    kcal100: 395,
    p100: 27,
    c100: 1.3,
    g100: 32,
    categoria: "Lácteos",
    alias: ["parmesano", "grana padano", "queso pasta", "emmental rallado"],
  },

  // Frutos secos y grasas
  {
    nombre: "Almendras",
    porcion: "1 puñado",
    gramos: 25,
    kcal100: 579,
    p100: 21,
    c100: 22,
    g100: 50,
    categoria: "Frutos secos",
    alias: ["almendra", "almendras tostadas", "almendras crudas"],
  },
  {
    nombre: "Nueces",
    porcion: "1 puñado",
    gramos: 25,
    kcal100: 654,
    p100: 15,
    c100: 14,
    g100: 65,
    categoria: "Frutos secos",
    alias: ["nuez", "nueces peladas", "nueces de california"],
  },
  {
    nombre: "Cacahuetes",
    porcion: "1 puñado",
    gramos: 25,
    kcal100: 567,
    p100: 26,
    c100: 16,
    g100: 49,
    categoria: "Frutos secos",
    alias: ["cacahuete", "mani", "cacahuetes tostados"],
  },
  {
    nombre: "Pistachos",
    porcion: "1 puñado con cáscara",
    gramos: 30,
    kcal100: 562,
    p100: 20,
    c100: 28,
    g100: 45,
    categoria: "Frutos secos",
    alias: ["pistacho", "pistachos tostados"],
  },
  {
    nombre: "Crema de cacahuete",
    porcion: "1 cucharada",
    gramos: 15,
    kcal100: 588,
    p100: 25,
    c100: 20,
    g100: 50,
    categoria: "Frutos secos",
    alias: ["mantequilla de cacahuete", "peanut butter"],
  },
  {
    nombre: "Aguacate",
    porcion: "medio aguacate",
    gramos: 100,
    kcal100: 160,
    p100: 2,
    c100: 9,
    g100: 15,
    categoria: "Frutos secos",
    alias: ["palta", "guacamole", "aguacates"],
  },
  {
    nombre: "Aceite de oliva virgen extra",
    porcion: "1 cucharada",
    gramos: 10,
    kcal100: 884,
    p100: 0,
    c100: 0,
    g100: 100,
    categoria: "Grasas",
    alias: ["aceite", "aove", "aceite de oliva", "cucharada de aceite", "chorrito de aceite"],
  },
  {
    nombre: "Mantequilla",
    porcion: "1 porción",
    gramos: 10,
    kcal100: 717,
    p100: 0.9,
    c100: 0.1,
    g100: 81,
    categoria: "Grasas",
    alias: ["mantequilla con sal", "mantequilla sin sal", "margarina"],
  },
  {
    nombre: "Mayonesa",
    porcion: "1 cucharada",
    gramos: 15,
    kcal100: 680,
    p100: 1,
    c100: 0.6,
    g100: 75,
    categoria: "Grasas",
    alias: ["mahonesa", "mayo", "salsa mayonesa"],
  },
  {
    nombre: "Aceitunas verdes",
    porcion: "10 aceitunas",
    gramos: 35,
    kcal100: 145,
    p100: 1,
    c100: 3.8,
    g100: 15,
    categoria: "Aperitivos",
    alias: ["olivas", "aceituna", "aceitunas manzanilla", "aceitunas negras"],
  },

  // Snacks y aperitivos
  {
    nombre: "Patatas chips de bolsa",
    porcion: "1 bolsa pequeña",
    gramos: 40,
    kcal100: 536,
    p100: 7,
    c100: 53,
    g100: 34,
    categoria: "Snacks",
    alias: [
      "patatas chips",
      "chips",
      "patatas fritas de bolsa",
      "papas fritas",
      "papas",
      "lays",
      "ruffles",
      "doritos",
      "aperitivos",
      "patatillas",
    ],
  },
  {
    nombre: "Barrita de proteínas",
    porcion: "1 barrita",
    gramos: 50,
    kcal100: 360,
    p100: 30,
    c100: 35,
    g100: 11,
    categoria: "Snacks",
    alias: ["barrita proteica", "barrita proteina", "protein bar"],
  },

  // Bebidas
  {
    nombre: "Café con leche",
    porcion: "1 taza",
    gramos: 200,
    kcal100: 55,
    p100: 3,
    c100: 5,
    g100: 2.4,
    categoria: "Bebidas",
    alias: ["cafe con leche", "cortado", "cafe cortado", "latte", "cappuccino"],
  },
  {
    nombre: "Café solo / espresso",
    porcion: "1 taza",
    gramos: 50,
    kcal100: 2,
    p100: 0.2,
    c100: 0.3,
    g100: 0,
    categoria: "Bebidas",
    alias: ["cafe solo", "cafe negro", "espresso", "americano"],
  },
  {
    nombre: "Bebida de avena",
    porcion: "1 vaso",
    gramos: 250,
    kcal100: 45,
    p100: 1,
    c100: 7,
    g100: 1.5,
    categoria: "Bebidas",
    alias: ["leche de avena"],
  },
  {
    nombre: "Bebida de soja",
    porcion: "1 vaso",
    gramos: 250,
    kcal100: 38,
    p100: 3.3,
    c100: 1.8,
    g100: 1.8,
    categoria: "Bebidas",
    alias: ["leche de soja"],
  },
  {
    nombre: "Zumo de naranja",
    porcion: "1 vaso",
    gramos: 200,
    kcal100: 45,
    p100: 0.7,
    c100: 10.4,
    g100: 0.2,
    categoria: "Bebidas",
    alias: ["zumo naranja", "jugo de naranja", "zumo natural"],
  },
  {
    nombre: "Refresco de cola",
    porcion: "1 lata",
    gramos: 330,
    kcal100: 42,
    p100: 0,
    c100: 10.6,
    g100: 0,
    categoria: "Bebidas",
    alias: ["coca cola", "pepsi", "refresco"],
  },
  {
    nombre: "Refresco Zero o Light (0 kcal)",
    porcion: "1 lata",
    gramos: 330,
    kcal100: 1,
    p100: 0,
    c100: 0,
    g100: 0,
    categoria: "Bebidas",
    alias: ["coca cola zero", "pepsi zero", "refresco zero", "coca cola light", "fanta zero"],
  },
  {
    nombre: "Cerveza",
    porcion: "1 caña",
    gramos: 330,
    kcal100: 43,
    p100: 0.5,
    c100: 3.6,
    g100: 0,
    categoria: "Bebidas",
    alias: ["cana", "cerveza rubia", "botellin", "birra"],
  },
  {
    nombre: "Vino tinto",
    porcion: "1 copa",
    gramos: 150,
    kcal100: 85,
    p100: 0.1,
    c100: 2.6,
    g100: 0,
    categoria: "Bebidas",
    alias: ["vino blanco", "copa de vino", "tinto"],
  },
  {
    nombre: "Batido de proteína de suero",
    porcion: "1 batido (30g polvo)",
    gramos: 250,
    kcal100: 48,
    p100: 9.6,
    c100: 1.2,
    g100: 0.6,
    categoria: "Bebidas",
    alias: ["whey protein", "batido proteinas", "batido proteina", "proteina en polvo", "whey"],
  },

  // Dulces y procesados
  {
    nombre: "Chocolate negro 85%",
    porcion: "2 onzas",
    gramos: 20,
    kcal100: 592,
    p100: 10,
    c100: 22,
    g100: 52,
    categoria: "Dulces",
    alias: ["chocolate negro", "chocolate 85%", "chocolate puro", "onzas de chocolate"],
  },
  {
    nombre: "Galletas María",
    porcion: "5 galletas",
    gramos: 25,
    kcal100: 436,
    p100: 7,
    c100: 74,
    g100: 13,
    categoria: "Dulces",
    alias: ["galletas", "galleta", "galletas maria", "fontaneda", "galletas tostadas"],
  },
  {
    nombre: "Croissant",
    porcion: "1 unidad",
    gramos: 60,
    kcal100: 406,
    p100: 8,
    c100: 45,
    g100: 21,
    categoria: "Dulces",
    alias: ["cruasan", "croissants", "bolleria"],
  },
  {
    nombre: "Helado de vainilla",
    porcion: "1 bola",
    gramos: 60,
    kcal100: 207,
    p100: 3.5,
    c100: 24,
    g100: 11,
    categoria: "Dulces",
    alias: ["helado", "helados", "polo"],
  },
  {
    nombre: "Miel",
    porcion: "1 cucharada",
    gramos: 20,
    kcal100: 304,
    p100: 0.3,
    c100: 82,
    g100: 0,
    categoria: "Dulces",
    alias: ["cucharada de miel", "miel de abeja"],
  },
  {
    nombre: "Cola Cao / Cacao en polvo",
    porcion: "2 cucharadas",
    gramos: 20,
    kcal100: 375,
    p100: 6.8,
    c100: 78,
    g100: 2.5,
    categoria: "Dulces",
    alias: ["colacao", "nesquik", "cacao soluble", "cacao puro"],
  },
  {
    nombre: "Pizza margarita",
    porcion: "1 porción",
    gramos: 200,
    kcal100: 266,
    p100: 11,
    c100: 33,
    g100: 10,
    categoria: "Procesados",
    alias: ["pizza", "porcion de pizza", "pizza queso"],
  },
  {
    nombre: "Salsa de tomate",
    porcion: "1 cucharada",
    gramos: 30,
    kcal100: 29,
    p100: 1.6,
    c100: 5.4,
    g100: 0.4,
    categoria: "Procesados",
    alias: ["tomate frito", "tomate triturado", "solis", "orlando"],
  },
  {
    nombre: "Chorizo",
    porcion: "3 lonchas",
    gramos: 40,
    kcal100: 455,
    p100: 24,
    c100: 2,
    g100: 38,
    categoria: "Procesados",
    alias: ["embutido", "chorizo dulce", "chorizo picante"],
  },
  {
    nombre: "Salchichas",
    porcion: "2 unidades",
    gramos: 80,
    kcal100: 301,
    p100: 12,
    c100: 2,
    g100: 27,
    categoria: "Procesados",
    alias: ["salchicha", "frankfurt", "salchichas pavo"],
  },
];

/** Quita tildes, mayúsculas y caracteres de puntuación para búsqueda limpia. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Variantes gramaticales para tolerar plurales y singulares en español.
 * Por ejemplo: "tostadas" -> ["tostadas", "tostada"], "patatas" -> ["patatas", "patata"], "nueces" -> ["nueces", "nuez"].
 */
export function formasGramaticales(palabra: string): string[] {
  const limpio = palabra.trim();
  if (limpio.length < 2) return [limpio];
  const formas = [limpio];

  if (limpio.endsWith("ces") && limpio.length > 3) {
    formas.push(limpio.slice(0, -3) + "z"); // nueces -> nuez
  }
  if (limpio.endsWith("ts") && limpio.length > 3) {
    formas.push(limpio.slice(0, -2)); // yogurts -> yogur
    formas.push(limpio.slice(0, -1)); // yogurts -> yogurt
  }
  if (limpio.endsWith("t") && limpio.length > 3) {
    formas.push(limpio.slice(0, -1)); // yogurt -> yogur
  }
  if (limpio.endsWith("es") && limpio.length > 3) {
    formas.push(limpio.slice(0, -2)); // tomates -> tomat (o lentejas -> lentej)
    formas.push(limpio.slice(0, -1)); // chips -> chip
  }
  if (limpio.endsWith("s") && limpio.length > 2) {
    formas.push(limpio.slice(0, -1)); // tostadas -> tostada, patatas -> patata
  }

  // Singular -> plural para buscar singular y encontrar alimentos en plural
  formas.push(limpio + "s");
  formas.push(limpio + "es");

  return Array.from(new Set(formas.filter((f) => f.length > 1)));
}

/**
 * Cómo se mide un alimento: las bebidas en mililitros y lo demás en gramos.
 *
 * Los números guardados no cambian (para una bebida, 1 g ≈ 1 ml); solo cambia
 * lo que se lee en pantalla. Antes una cerveza pedía «gramos» y no había quien
 * lo entendiera.
 */
export function unidadDelAlimento(alimento: { categoria: string }): "ml" | "g" {
  return alimento.categoria === "Bebidas" ? "ml" : "g";
}

/**
 * Busca alimentos por nombre o alias, tolerando plurales, singulares y palabras en cualquier orden.
 */
export function buscar(texto: string, limite: number = 20): AlimentoBase[] {
  const q = normalizar(texto);
  if (!q) return ALIMENTOS.slice(0, limite);

  const tokens = q.split(" ").filter((t) => t.length > 0);

  type Candidato = {
    alimento: AlimentoBase;
    puntuacion: number;
  };

  const candidatos: Candidato[] = [];

  for (const a of ALIMENTOS) {
    const nombreNorm = normalizar(a.nombre);
    const catNorm = normalizar(a.categoria);
    const aliasNorm = (a.alias ?? []).map(normalizar);
    const corpus = [nombreNorm, catNorm, ...aliasNorm];

    // 1. Coincidencia exacta con nombre o alias (máxima puntuación)
    if (nombreNorm === q || aliasNorm.includes(q)) {
      candidatos.push({ alimento: a, puntuacion: 100 });
      continue;
    }

    // 2. Empieza exactamente por la búsqueda completa
    if (nombreNorm.startsWith(q) || aliasNorm.some((al) => al.startsWith(q))) {
      candidatos.push({ alimento: a, puntuacion: 80 });
      continue;
    }

    // 3. Contiene la frase exacta
    if (nombreNorm.includes(q) || aliasNorm.some((al) => al.includes(q))) {
      candidatos.push({ alimento: a, puntuacion: 60 });
      continue;
    }

    // 4. Cada token de la búsqueda debe encajar con alguna forma gramatical
    let todosTokensEncajan = true;
    let tokensPuntuacion = 0;

    for (const token of tokens) {
      const variantes = formasGramaticales(token);
      let match = false;

      for (const v of variantes) {
        if (corpus.some((textoCorpus) => textoCorpus.split(" ").some((pal) => pal.startsWith(v) || pal.includes(v)))) {
          match = true;
          tokensPuntuacion += v === token ? 10 : 8;
          break;
        }
      }

      if (!match) {
        todosTokensEncajan = false;
        break;
      }
    }

    if (todosTokensEncajan) {
      candidatos.push({ alimento: a, puntuacion: 30 + tokensPuntuacion });
    }
  }

  // Ordenar de mayor a menor puntuación y devolver hasta el límite
  candidatos.sort((a, b) => b.puntuacion - a.puntuacion);
  return candidatos.slice(0, limite).map((c) => c.alimento);
}

export type Racion = {
  nombre: string;
  cantidad: string;
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
};

/** Convierte gramos de un alimento en la ración que se guarda en el diario. */
export function porGramos(base: AlimentoBase, gramos: number): Racion {
  const f = gramos / 100;
  return {
    nombre: base.nombre,
    cantidad: `${Math.round(gramos)} g`,
    kcal: Math.round(base.kcal100 * f),
    proteinas: Math.round(base.p100 * f * 10) / 10,
    carbohidratos: Math.round(base.c100 * f * 10) / 10,
    grasas: Math.round(base.g100 * f * 10) / 10,
  };
}
