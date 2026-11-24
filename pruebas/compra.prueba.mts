/**
 * Pruebas de la lista de la compra.
 * Se ejecutan con: `node pruebas/compra.prueba.mts`
 *
 * En el supermercado no se compran 440 g de huevo ni 355 g de leche: se
 * compra una docena y un brik. La unidad de compra va delante y el dato de la
 * receta detrás, separados por «·», sin repetir «gastas» en cada fila.
 *
 * Los cereales secos (arroz, avena, cuscús, pasta, quinoa) y los frutos secos
 * son de armario: van a Despensa, no a la compra semanal, porque nadie compra
 * un paquete de arroz cada semana para gastar 50 g.
 */

import { enCompra, esDespensa } from "../lib/platos.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`);
  }
}

igual(enCompra("Huevo", 440), "1 docena · usas 8 uds", "los huevos se compran por docenas");
igual(enCompra("Huevo", 55), "1 docena · usas 1 ud", "un huevo suelto sigue siendo una docena");
igual(enCompra("Clara de huevo", 99), "3 claras", "las claras también se cuentan");
igual(enCompra("Leche entera", 355), "1 brik · usas 355 ml", "la leche se compra por briks");
igual(enCompra("Leche desnatada", 1500), "2 briks · usas 1,5 L", "litro y medio son dos briks");
igual(enCompra("Manzana", 145), "1 manzana", "una manzana suelta no se pesa");
igual(enCompra("Manzana", 360), "2 manzanas", "dos manzanas se dicen en plural");
igual(enCompra("Plátano", 120), "1 plátano", "el plátano se cuenta por unidades");
igual(enCompra("Pan integral", 60), "2 rebanadas", "el pan se cuenta por rebanadas");
igual(enCompra("Yogur griego natural", 250), "2 yogures", "el yogur se cuenta por unidades");
igual(enCompra("Pechuga de pollo", 300), "2 filetes · usas 300 g", "el pollo se cuenta por filetes y dice el peso");
igual(enCompra("Pavo", 150), "1 filete · usas 150 g", "el pavo lleva los gramos al lado");
igual(enCompra("Salmón", 150), "1 filete · usas 150 g", "el pescado se cuenta por filetes y dice el peso");
igual(enCompra("Sardinas", 85), "1 lata", "las sardinas se compran por latas");
igual(enCompra("Patata", 175), "1 patata", "la patata se cuenta por unidades");
igual(enCompra("Coliflor", 575), "1 coliflor", "la coliflor se compra entera");
igual(enCompra("Ajo", 30), "1 cabeza", "el ajo se compra por cabezas");
igual(enCompra("Yogur griego", 40), "1 yogur", "por debajo de media unidad se compra la unidad entera");
igual(enCompra("Limón", 35), "1 limón", "35 g de limón son un limón, no una pesada de gramos");
igual(enCompra("Jengibre", 5), "1 trozo", "5 g de jengibre son un trozo");
igual(enCompra("Aceite de oliva", 5), "si te falta", "el aceite es de despensa, no se pide en gramos");
igual(enCompra("Vinagre", 15), "si te falta", "el vinagre es de despensa");
igual(enCompra("Mostaza", 10), "si te falta", "la mostaza es de despensa");
igual(enCompra("Sal", 2), "si te falta", "la sal es de despensa");
igual(enCompra("Queso fresco batido", 200), "1 tarrina", "el queso batido se compra por tarrinas");

// Frescos con unidad de tienda que no es un número redondo de receta: la
// bandeja es la unidad de compra y el peso va al lado.
igual(enCompra("Fresas", 105), "1 bandeja · usas 105 g", "las fresas se compran por bandeja");
igual(enCompra("Fresas", 300), "2 bandejas · usas 300 g", "dos bandejas cuando pasa de 250 g");
igual(enCompra("Gambas", 155), "150 g", "las gambas se redondean a múltiplos de 50 g");
igual(enCompra("Gambas", 150), "150 g", "150 g de gambas se quedan como están");
igual(enCompra("Gambas", 170), "150 g", "170 g de gambas también bajan a 150 g");

// Botes y paquetes: 15 g de crema de cacahuete no se pide en el súper.
igual(esDespensa("Crema de cacahuete"), true, "la crema de cacahuete es de despensa");
igual(enCompra("Crema de cacahuete", 15), "si te falta", "la crema de cacahuete va como bote de despensa");
igual(esDespensa("Tomate triturado"), true, "el tomate triturado es de despensa");
igual(enCompra("Tomate triturado", 85), "si te falta", "el tomate triturado va como bote de despensa");

// Cereales secos y frutos secos: de armario, no de compra semanal. Se miran
// por si se han acabado, y si se compran, es el paquete entero.
igual(esDespensa("Arroz blanco"), true, "el arroz es de despensa: no se compra cada semana");
igual(esDespensa("Avena en copos"), true, "la avena es de despensa");
igual(esDespensa("Nueces"), true, "las nueces son de despensa");
igual(enCompra("Arroz blanco", 500), "si te falta", "el arroz no se pide en gramos");
igual(enCompra("Arroz blanco cocido", 550), "si te falta", "el arroz cocido también es de despensa");
igual(enCompra("Avena en copos", 50), "si te falta", "la avena no se compra por 50 g");
igual(enCompra("Pasta cocida", 200), "si te falta", "la pasta es de despensa");
igual(enCompra("Cuscús", 200, "Cereales y legumbres"), "si te falta", "el cuscús es de despensa");
igual(enCompra("Quinoa", 90, "Cereales y legumbres"), "si te falta", "la quinoa es de despensa");
igual(enCompra("Arroz", 150, "Cereales y legumbres"), "si te falta", "el arroz a secas también es de despensa");
igual(enCompra("Nueces", 20), "si te falta", "las nueces son de despensa, no una bolsa semanal");
igual(enCompra("Almendras", 30), "si te falta", "las almendras también son de despensa");

// Lo que sí se compra: legumbres en bote y pan. La legumbre cruda y la harina
// siguen en paquete (regla por categoría).
igual(enCompra("Lentejas cocidas", 300), "1 bote", "las lentejas se compran en bote");
igual(
  enCompra("Pan integral", 60, "Cereales y legumbres"),
  "2 rebanadas",
  "el pan mantiene su rebanada aunque esté en la misma categoría",
);
igual(
  enCompra("Lentejas", 300, "Cereales y legumbres"),
  "1 paquete · 300 g",
  "la legumbre cruda sigue en paquete",
);

console.log(`\n${hechas} comprobaciones de la compra, ${fallos} fallos.`);
if (fallos > 0) process.exit(1);
