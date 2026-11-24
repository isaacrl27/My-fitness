/**
 * Pruebas de escalarAlimento (lib/escalar.ts). Se ejecutan con:
 *   node pruebas/editar.prueba.mts
 *
 * Escala un alimento ya anotado a una cantidad nueva. Si esto se rompe, al
 * corregir una cantidad se anotan macros falsos o la línea se queda a medias.
 */

import { escalarAlimento, escalarPorFraccion, type Alimento } from "../lib/escalar.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.error(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

const pollo: Alimento = {
  id: "a1",
  nombre: "Pollo",
  cantidad: "180 g",
  kcal: 200,
  proteinas: 40,
  carbohidratos: 0,
  grasas: 5,
};

// (a) Escala macroscópica: 180 g -> 200 g (factor 200/180).
igual(
  escalarAlimento(pollo, "200 g"),
  {
    id: "a1",
    nombre: "Pollo",
    cantidad: "200 g",
    kcal: Math.max(1, Math.round((200 * 200) / 180)),
    proteinas: Math.round(((40 * 200) / 180) * 10) / 10,
    carbohidratos: Math.round(((0 * 200) / 180) * 10) / 10,
    grasas: Math.round(((5 * 200) / 180) * 10) / 10,
  },
  "180 g a 200 g escala macros y kcal",
);

// (b) Otra unidad: 3 unidades -> 6 unidades (factor 2).
const huevos: Alimento = {
  id: "a2",
  nombre: "Huevos",
  cantidad: "3 unidades",
  kcal: 210,
  proteinas: 18,
  carbohidratos: 2,
  grasas: 14,
};
igual(
  escalarAlimento(huevos, "6 unidades"),
  {
    id: "a2",
    nombre: "Huevos",
    cantidad: "6 unidades",
    kcal: 420,
    proteinas: 36,
    carbohidratos: 4,
    grasas: 28,
  },
  "3 unidades a 6 unidades dobla",
);

// (c) Coma decimal: «12,5» sobre «25 g» -> factor 0,5.
const arroz: Alimento = {
  id: "a3",
  nombre: "Arroz",
  cantidad: "25 g",
  kcal: 90,
  proteinas: 2,
  carbohidratos: 20,
  grasas: 0,
};
igual(
  escalarAlimento(arroz, "12,5"),
  {
    id: "a3",
    nombre: "Arroz",
    cantidad: "12.5 g",
    kcal: 45,
    proteinas: 1,
    carbohidratos: 10,
    grasas: 0,
  },
  "12,5 sobre 25 g aplica factor 0,5 y conserva la unidad",
);

// (d) Basura: sin número -> null.
igual(escalarAlimento(pollo, "abc"), null, "texto sin número devuelve null");
igual(escalarAlimento(pollo, ""), null, "texto vacío devuelve null");

// (e) Sin letras: «200» sobre «180 g» conserva la unidad.
igual(escalarAlimento(pollo, "200")?.cantidad, "200 g", "sin unidad nueva se conserva la vieja");

// (f) Factor fuera de rango -> null. Los límites son INCLUSIVOS.
const cinco: Alimento = {
  id: "a4",
  nombre: "Nueces",
  cantidad: "2 g",
  kcal: 10,
  proteinas: 1,
  carbohidratos: 1,
  grasas: 1,
};
igual(escalarAlimento(cinco, "0,01")?.cantidad.startsWith("0.01"), undefined, "texto sin dígito delante del decimal no escala");
igual(
  escalarAlimento({ ...cinco, cantidad: "1 g" }, "0,01")?.cantidad,
  "0.01 g",
  "factor 0,01 (límite mínimo) es válido",
);
igual(
  escalarAlimento({ ...cinco, cantidad: "1 g" }, "0,005"),
  null,
  "factor 0,005 queda por debajo del mínimo",
);
igual(escalarAlimento({ ...cinco, cantidad: "1 g" }, "1000")?.cantidad, "1000 g", "factor 1000 (límite máximo) es válido");
igual(escalarAlimento({ ...cinco, cantidad: "1 g" }, "2000"), null, "factor 2000 pasa del máximo");

// Sin número en la cantidad vieja no se puede escalar.
igual(escalarAlimento({ ...pollo, cantidad: "un poco" }, "200 g"), null, "sin número en la cantidad vieja no escala");

// Números «a la española»: los puntos de miles no son decimales.
// «1.500» sobre «300 g» tiene que ser mil quinientos, no punto cinco.
igual(
  escalarAlimento({ ...cinco, cantidad: "300 g" }, "1.500")?.cantidad,
  "1500 g",
  "1.500 con punto de miles se lee como 1.500",
);
// Y con coma decimal sigue pasando lo de siempre.
igual(
  escalarAlimento({ ...cinco, cantidad: "100 g" }, "1,5")?.cantidad,
  "1.5 g",
  "1,5 con coma decimal se lee como 1,5",
);
// Sin coma y con un punto suelto (como los que guarda la propia app) es decimal.
igual(
  escalarAlimento({ ...cinco, cantidad: "100 g" }, "1.5")?.cantidad,
  "1.5 g",
  "1.5 con punto decimal se lee como 1,5",
);
// Miles con coma intercalada rara: «1,500». En España la coma es decimal, pero
// si el número trae un grupo de tres detrás se entiende como miles de otro
// esquema y no hay que fabricar 1,5 gramos de nada.
igual(
  escalarAlimento({ ...cinco, cantidad: "300 g" }, "1.000,5")?.cantidad,
  "1000.5 g",
  "1.000,5 son mil y medio",
);

// --- Ajuste rápido de sobras (escalarPorFraccion) ---
const platoPollo: Alimento = {
  id: "sobra-1",
  nombre: "Pechuga de pollo",
  cantidad: "180 g",
  kcal: 200,
  proteinas: 40,
  carbohidratos: 0,
  grasas: 4,
};

// 1. Dejarse la mitad (factor 0.5)
const mitad = escalarPorFraccion(platoPollo, 0.5);
igual(mitad.cantidad, "90 g", "la mitad de 180 g son 90 g");
igual(mitad.kcal, 100, "la mitad de 200 kcal son 100 kcal");
igual(mitad.proteinas, 20, "la mitad de 40 g proteína son 20 g");
igual(mitad.grasas, 2, "la mitad de 4 g grasa son 2 g");

// 2. Dejarse un poco (tres cuartos, factor 0.75)
const tresCuartos = escalarPorFraccion(platoPollo, 0.75);
igual(tresCuartos.cantidad, "135 g", "3/4 de 180 g son 135 g");
igual(tresCuartos.kcal, 150, "3/4 de 200 kcal son 150 kcal");

// 3. Dejarse un tercio (comí un tercio, factor 0.33)
const unTercio = escalarPorFraccion(platoPollo, 0.33);
igual(unTercio.cantidad, "59.4 g", "1/3 de 180 g con decimal redondeado");
igual(unTercio.kcal, 66, "1/3 de 200 kcal son 66 kcal");

// 4. Alimento sin número en cantidad (ej. "1 ración")
const racionLibre: Alimento = {
  id: "sobra-2",
  nombre: "Guiso casero",
  cantidad: "1 ración",
  kcal: 350,
  proteinas: 15,
  carbohidratos: 45,
  grasas: 10,
};
const mitadRacion = escalarPorFraccion(racionLibre, 0.5);
igual(mitadRacion.cantidad, "0.5 ración", "ración sin gramos escala a media ración");
igual(mitadRacion.kcal, 175, "mitad de calorías en ración libre");

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
