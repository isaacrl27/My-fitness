/**
 * Pruebas de los cálculos. Se ejecutan con:  node pruebas/calculos.prueba.ts
 * Comprueban números concretos hechos a mano, para que un cambio no rompa el
 * plan sin que nos enteremos.
 */

import {
  KCAL_MINIMAS,
  aAlturaCm,
  ajusteSemanal,
  aNumero,
  aPasos,
  cambioPorSemana,
  cambioSemanalPorFechas,
  clasificacionImc,
  conComa,
  conComaSinCeros,
  ddMM,
  diasHastaObjetivo,
  edad,
  enPalabras,
  fechaUltimaPesada,
  gastoDiario,
  hoyISO,
  imc,
  kcalDeHoy,
  macrosDiarios,
  metabolismoBasal,
  objetivoCalorico,
  pesoMinimoSaludableKg,
  pesoSuavizado,
  ritmosPara,
  tendencia,
  validarPesoObjetivo,
} from "../lib/calculos.ts";

import { CATEGORIAS, PLATOS, aFechaISO, escalarDia, generarSemana, kcalDelDia, listaCompra, normalizar } from "../lib/platos.ts";

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

// --- Edad -------------------------------------------------------------
igual(edad("2000-01-01", new Date("2026-10-17T12:00:00")), 26, "edad cumplidos los años");
igual(edad("2000-12-31", new Date("2026-10-17T12:00:00")), 25, "edad si aún no ha cumplido este año");
igual(edad("", new Date("2026-10-17T12:00:00")), 0, "edad sin fecha");

// --- Gasto ------------------------------------------------------------
// 10*80 + 6,25*178 - 5*26 + 5 = 1787,5
igual(metabolismoBasal(80, 178, 26, "hombre"), 1787.5, "metabolismo basal de hombre");
igual(metabolismoBasal(80, 178, 26, "mujer"), 1621.5, "metabolismo basal de mujer");
// 1787,5 * 1,55 = 2770,625
igual(
  Math.round(gastoDiario(80, 178, 26, "hombre", "moderado")),
  2771,
  "gasto diario con actividad moderada",
);

// --- Objetivo ---------------------------------------------------------
// 2770,625 - (0,5 * 7700 / 7) = 2770,625 - 550 = 2220,625
igual(objetivoCalorico(2770.625, 0.5), 2221, "calorías para bajar 0,5 kg por semana");
igual(objetivoCalorico(1500, 0.75), 1200, "nunca baja de las 1200 kcal");

// --- Macros -----------------------------------------------------------
// proteína 160 g, grasa 64 g, resto 2221-640-576 = 1005 / 4 = 251 g
igual(
  macrosDiarios(2221, 80),
  { proteinas: 160, grasas: 64, carbohidratos: 251 },
  "reparto de macros",
);
// Con 1.200 kcal y 80 kg, proteína y grasa se recortan: los hidratos salen
// positivos (antes quedaban a 0) y el total no se pasa del plan (se pasa 2 kcal
// por el redondeo de los hidratos, 44,5 g → 45 g; de 2 kcal no se muere nadie).
const macrosPinchados = macrosDiarios(1200, 80);
igual(
  macrosPinchados.carbohidratos >= 0 &&
    macrosPinchados.proteinas * 4 +
      macrosPinchados.grasas * 9 +
      macrosPinchados.carbohidratos * 4 <=
      1210,
  true,
  "con 80 kg y 1.200 kcal los macros se recortan y no pasan del plan",
);

// --- IMC --------------------------------------------------------------
igual(Number(imc(80, 178).toFixed(2)), 25.25, "índice de masa corporal");
igual(clasificacionImc(25.25), "Algo por encima", "cómo se lee el IMC");
igual(clasificacionImc(22), "Normal", "IMC normal");

// --- Tendencia --------------------------------------------------------
igual(tendencia([80, 82, 81], 2), [80, 81, 81.5], "media móvil de 2");
igual(tendencia([80], 7), [80], "tendencia con un solo peso");
// De 80 a 81 en 7 días => +1 kg por semana
igual(
  Number(cambioPorSemana([80, 80, 80, 80, 80, 80, 80, 81], 1).toFixed(2)),
  0.14,
  "cambio semanal con un pico al final",
);

// --- Días hasta el objetivo -------------------------------------------
igual(diasHastaObjetivo(85, 78, 0.5), 98, "días que faltan al ritmo normal");
igual(diasHastaObjetivo(78, 78, 0.5), 0, "ya está en el objetivo");

// --- Texto ------------------------------------------------------------
igual(aNumero("78,4"), 78.4, "leer un peso escrito con coma");
igual(aNumero("  82 "), 82, "leer un peso con espacios");
igual(aNumero("hola"), 0, "texto que no es un número");
igual(conComa(78.44), "78,4", "escribir un número con coma");
igual(enPalabras("2026-10-17"), "Sábado, 17 de octubre", "una fecha en palabras");

// --- Litros -----------------------------------------------------------
// Sin esto, escribir 1,25 litros se guardaba bien pero salía escrito 1,3.
igual(conComaSinCeros(1.25), "1,25", "un cuarto de litro se escribe entero");
igual(conComaSinCeros(0.25), "0,25", "un cuarto de litro desde cero");
igual(conComaSinCeros(0.5), "0,5", "medio litro sin cero de más");
igual(conComaSinCeros(2), "2", "dos litros sin decimales");
igual(conComaSinCeros(0), "0", "cero litros");
igual(conComaSinCeros(1.256), "1,26", "se redondea a dos decimales como mucho");

// --- Los platos -------------------------------------------------------
// La lista entera es contenido, pero lo que no puede moverse son sus reglas.
igual(
  PLATOS.length >= 80 && PLATOS.length <= 150,
  true,
  "el catálogo ya pasa de 80 platos, camino de los 150",
);

igual(
  PLATOS.filter(
    (p) => Math.abs(p.kcal - (4 * p.proteinas + 4 * p.carbohidratos + 9 * p.grasas)) > 15,
  ).map((p) => p.nombre),
  [],
  "las kcal de cada plato cuadran con sus macros",
);

igual(
  PLATOS.filter((p) => p.ingredientes.length > 5).map((p) => p.nombre),
  [],
  "ningún plato pasa de 5 ingredientes (Isaac no cocina)",
);

igual(
  PLATOS.filter((p) => p.pasos.length > 3).map((p) => p.nombre),
  [],
  "ningún plato pasa de 3 pasos",
);

igual(
  ["desayuno", "comida", "cena", "snack"].filter(
    (m) => PLATOS.filter((p) => p.momento === m).length < 10,
  ),
  [],
  "los cuatro momentos tienen al menos 10 platos",
);

igual(
  PLATOS.filter((p) => {
    const nombres = p.ingredientes.map((i) => i.nombre.toLowerCase());
    return new Set(nombres).size !== nombres.length;
  }).map((p) => p.nombre),
  [],
  "dentro de un plato ningún ingrediente se repite",
);

igual(
  PLATOS.filter((p) =>
    p.ingredientes.some((i) => !(CATEGORIAS as readonly string[]).includes(i.categoria)),
  ).map((p) => p.nombre),
  [],
  "todas las categorías son de la lista permitida",
);

igual(
  PLATOS.map((p) => p.nombre).filter((n, i, lista) => lista.indexOf(n) !== i),
  [],
  "los nombres de plato no se repiten",
);

igual(
  PLATOS.filter((p) => p.descripcion.trim().length === 0).map((p) => p.nombre),
  [],
  "todo plato lleva su descripción",
);

// --- Gustos y lista roja ----------------------------------------------
igual(normalizar("Tomate"), "tomate", "una mayúscula no cambia el ingrediente");
igual(normalizar("  Naranja "), "naranja", "los acentos y los espacios se ignoran");
igual(normalizar("Hígado"), "higado", "una tilde se quita al comparar");

const semanaLimpia = generarSemana([], {});
igual(semanaLimpia.length, 7, "la semana tiene siete días");
igual(
  semanaLimpia.every((d) => Object.values(d.comidas).every((p) => p !== null)),
  true,
  "sin restricciones se llenan todos los huecos del día",
);

// Un ingrediente de verdad de la lista, escrito de la peor forma posible.
const ingredienteReal = PLATOS[4].ingredientes[0].nombre;
const comoNoLoEscribeNadie = normalizar(ingredienteReal).toUpperCase();
igual(
  generarSemana([comoNoLoEscribeNadie], {}).every((d) =>
    Object.values(d.comidas).every(
      (p) => !p?.ingredientes.some((i) => normalizar(i.nombre) === normalizar(ingredienteReal)),
    ),
  ),
  true,
  "si excluyes un ingrediente, no sale ningún plato que lo lleve",
);

igual(
  generarSemana([], { [PLATOS[0].nombre]: "no-me-gusta" }).every((d) =>
    Object.values(d.comidas).every((p) => p?.nombre !== PLATOS[0].nombre),
  ),
  true,
  "un plato rechazado en la cata no vuelve a salir",
);

igual(
  generarSemana(["zzzzz"], {}).length,
  7,
  "un ingrediente que no existe no deja el plan a medias",
);

// --- Raciones que cuadran ---------------------------------------------
// Con raciones fijas la semana se quedaba 200-300 kcal por debajo del objetivo.
const objetivo = 1949;
// Fecha fija: el menú cambia de una semana a otra y con la fecha de hoy el
// test aprobaba o fallaba según el día en que se ejecutara.
const semanaDePrueba = new Date("2026-01-05T12:00:00");
const sinEscalar = generarSemana([], {}, 0, undefined, semanaDePrueba);
const escalada = generarSemana([], {}, 0, objetivo, semanaDePrueba);

igual(
  escalada.every((d) => Math.abs(kcalDelDia(d) - objetivo) <= 25),
  true,
  "cada día de la semana suma las calorías que tocan (±25)",
);

igual(
  escalada.every((d) => kcalDelDia(d) >= 1500 && kcalDelDia(d) <= 2500),
  true,
  "los días quedan en un razonable, ni pinchados ni inflados",
);

const kcalDeLosPlatos = PLATOS.map((p) => p.kcal);
generarSemana([], {}, 0, 1949);
igual(
  PLATOS.map((p) => p.kcal),
  kcalDeLosPlatos,
  "escalar la semana no toca la lista de platos original",
);

igual(
  escalarDia(
    { dia: "Lunes", fecha: "2026-10-12", comidas: { desayuno: null, comida: null, cena: null, snack: null } },
    1949,
  ).comidas,
  { desayuno: null, comida: null, cena: null, snack: null },
  "un día sin platos sigue sin platos",
);

igual(
  objetivo * 7 - sinEscalar.reduce((suma, d) => suma + kcalDelDia(d), 0) >= 1000,
  true,
  "sin escalar, la semana se quedaba por debajo: por eso existía el fallo",
);

// --- Ajuste semanal de calorías (estilo MacroFactor) ----------------------
const perfilAjuste = {
  ritmoKgSemana: 0.5,
  pesoInicialKg: 90,
  creado: "2026-01-01",
};

igual(
  ajusteSemanal({
    fechaAjuste: "2026-01-01",
    kcalBase: 2000,
    ajusteActual: 0,
    pesoEnAjuste: 90,
    pesoActualKg: 90,
    ritmoKgSemana: 0.5,
    hoy: "2026-01-05",
  }),
  null,
  "sin una semana entera no se toca nada",
);

igual(
  ajusteSemanal({
    fechaAjuste: "2026-01-01",
    kcalBase: 2000,
    ajusteActual: 0,
    pesoEnAjuste: 90,
    pesoActualKg: 0,
    ritmoKgSemana: 0.5,
    hoy: "2026-01-08",
  }),
  null,
  "sin báscula desde la revisión no hay nada que comparar",
);

const lento = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 90,
  // 7 días sin bajar ni un gramo, cuando tocaba 0,5 kg.
  pesoActualKg: 90,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
});
igual(
  lento !== null && lento.kcal < 2000,
  true,
  "si vas más lento de lo que toca, te bajan calorías",
);

const rapido = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 90,
  // Ha bajado 1 kg en 7 días, el doble de lo previsto.
  pesoActualKg: 89,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
});
igual(
  rapido !== null && rapido.kcal > 2000,
  true,
  "si vas más rápido de lo que toca, te suben calorías",
);

const enPunto = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 90,
  pesoActualKg: 89.5,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
});
igual(
  enPunto !== null && Math.abs(enPunto.kcal - 2000) <= 10,
  true,
  "si bajas justo lo previsto, el objetivo no se mueve",
);

const disparado = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 90,
  // Una semana entera sin comer: no se puede reflejar tal cual.
  pesoActualKg: 80,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
});
igual(
  disparado !== null && disparado.kcal <= 2300,
  true,
  "una bajada disparada no mueve el objetivo más del tope",
);

const alSuelo = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 1300,
  ajusteActual: -190,
  pesoEnAjuste: 90,
  pesoActualKg: 90,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
});
igual(
  alSuelo !== null && alSuelo.kcal >= KCAL_MINIMAS,
  true,
  "por muy lento que vayas, nunca baja de las calorías mínimas",
);

igual(
  kcalDeHoy({ ...perfilAjuste, creado: "2026-01-06" }, 2000, 90, "2026-01-07") <= 2000,
  true,
  "kcalDeHoy deja pasar la primera semana sin tocar nada",
);

igual(
  kcalDeHoy({ ...perfilAjuste, creado: "2026-01-01" }, 2000, 90, "2026-01-08") < 2000,
  true,
  "kcalDeHoy aplica el ajuste pendiente sin esperar a guardar nada",
);

const conAjuste = kcalDeHoy(
  { ...perfilAjuste, ajusteKcal: -120, creado: "2026-01-06" },
  2000,
  90,
  "2026-01-07",
);
igual(
  Math.abs(conAjuste - (objetivoCalorico(2000, 0.5) - 120)) <= 10,
  true,
  "kcalDeHoy suma el ajuste guardado al objetivo de la fórmula",
);

// Desde aquí, las pruebas nuevas: la revisión semanal ya no se hace con el
// mismo peso de la vez anterior (si no te pesas, antes se creía que no habías
// bajado nada y te recortaba calorías una semana tras otra).

// El peso actual y su fecha llegan por separado. Sin pesada NUEVA desde la
// última revisión (mismo día), no hay nada que comparar: no se toca nada.
igual(
  ajusteSemanal({
    fechaAjuste: "2026-01-01",
    kcalBase: 2000,
    ajusteActual: 0,
    pesoEnAjuste: 90,
    pesoActualKg: 90,
    ritmoKgSemana: 0.5,
    hoy: "2026-01-08",
    fechaPesadaActual: "2026-01-01",
  }),
  null,
  "sin báscula nueva desde la revisión no se recorta nada",
);

// Con una pesada de después de la revisión, la lógica de siempre funciona igual.
const lentoFresh = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 90,
  pesoActualKg: 90,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
  fechaPesadaActual: "2026-01-07",
});
igual(
  lentoFresh !== null && lentoFresh.kcal < 2000,
  true,
  "con pesada nueva, ir lento sigue bajando calorías",
);

// La fecha de la última pesada se saca aunque vengan desordenadas o haya
// pesadas futuras mal puestas (se queda la mayor, que es la que vale).
igual(
  [
    fechaUltimaPesada([{ fecha: "2026-01-05", kg: 80 }]),
    fechaUltimaPesada([
      { fecha: "2026-02-02", kg: 79 },
      { fecha: "2026-01-05", kg: 80 },
      { fecha: "2026-03-01", kg: 78 },
    ]),
    fechaUltimaPesada([]),
  ],
  ["2026-01-05", "2026-03-01", null],
  "fechaUltimaPesada da la fecha más alta y null si no hay pesadas",
);

// kcalDeHoy tiene que dejar pasar la revisión cuando la última pesada es del
// día de la revisión (nada nuevo), aunque hayan pasado las semanas.
igual(
  kcalDeHoy({ ...perfilAjuste, creado: "2026-01-01" }, 2000, 90, "2026-01-08", "2026-01-01") ===
    kcalDeHoy({ ...perfilAjuste, ajusteKcal: 0, creado: "2026-01-01" }, 2000, 90, "2026-01-08", "2026-01-01"),
  true,
  "kcalDeHoy sin báscula nueva se queda donde estaba",
);

igual(
  kcalDeHoy({ ...perfilAjuste, creado: "2026-01-01" }, 2000, 90, "2026-01-08", "2026-01-07") < 2000,
  true,
  "kcalDeHoy con pesada nueva aplica el ajuste semanal",
);

// --- Altura en metros o centímetros ---------------------------------------
// La novia de Isaac escribió «1,68» en un campo que esperaba centímetros y
// se guardó como si midiera dos dedos: se arruinaban todos los cálculos.
igual(aAlturaCm("1,68"), 168, "1,68 se entiende como metros");
igual(aAlturaCm("168"), 168, "168 se entiende como centímetros");
igual(aAlturaCm("1,70"), 170, "1,70 son 170 cm");
igual(aAlturaCm(" 75 "), 0, "75 cm no es una altura de persona");
igual(aAlturaCm("abc"), 0, "letras: no se puede");
igual(aAlturaCm(""), 0, "vacío: no se puede");
igual(aAlturaCm("50"), 0, "medio metro tampoco");
igual(aAlturaCm("250"), 250, "250 cm sigue valiendo");
igual(aAlturaCm("3"), 0, "3 no son 300 cm: esa altura no existe");
igual(aAlturaCm("2,6"), 0, "2,6 m pasa del máximo y no se acepta");
igual(aAlturaCm("1"), 100, "1 m se sigue leyendo como 100 cm");

// --- La semana natural avanza sola ----------------------------------------
// Antes la semana era siempre la misma hasta que alguien tocaba un botón.
const miercoles = new Date("2026-10-14T12:00:00");
const semanaNatural = generarSemana([], {}, 0, undefined, miercoles);

igual(semanaNatural.length, 7, "la semana tiene los siete días");
igual(semanaNatural[0].dia, "Lunes", "empieza en lunes");
igual(semanaNatural[0].fecha, "2026-10-12", "el lunes de esa semana es el 12");
igual(semanaNatural[6].dia, "Domingo", "acaba en domingo");
igual(semanaNatural[6].fecha, "2026-10-18", "y ese domingo es el 18");

const semanaSiguiente = generarSemana([], {}, 0, undefined, new Date("2026-10-21T12:00:00"));
igual(
  kcalDelDia(semanaSiguiente[0]) !== kcalDelDia(semanaNatural[0]) ||
    semanaSiguiente[0].comidas.desayuno?.nombre !== semanaNatural[0].comidas.desayuno?.nombre,
  true,
  "la semana siguiente trae platos distintos sin tocar nada",
);
igual(semanaSiguiente[0].fecha, "2026-10-19", "la semana siguiente empieza el lunes 19");

const totalSemana = Object.values(listaCompra(semanaNatural))
  .flat()
  .reduce((suma, art) => suma + art.gramos, 0);
const totalRecortado = Object.values(listaCompra(semanaNatural, "2026-10-15"))
  .flat()
  .reduce((suma, art) => suma + art.gramos, 0);
igual(
  totalRecortado > 0 && totalRecortado < totalSemana,
  true,
  "la lista de la compra solo cubre los días que quedan",
);
igual(
  aFechaISO(new Date("2026-10-12T12:00:00")),
  "2026-10-12",
  "aFechaISO devuelve la fecha en ISO",
);

// --- Objetivo: subir o mantener -------------------------------------------
// La novia de Isaac a lo mejor quiere subir de peso, y antes todo el mundo
// recibía menos calorías de las que gastaba.
igual(
  objetivoCalorico(2000, 0.5, "subir") > 2000,
  true,
  "subir de peso da más calorías de las que gastas",
);
igual(
  objetivoCalorico(2000, 0.5, "mantener"),
  2000,
  "mantenerse da exactamente lo que gastas",
);
igual(
  objetivoCalorico(2000, 0.5, "adelgazar") < objetivoCalorico(2000, 0.5, "subir"),
  true,
  "adelgazar da menos que subir, con el mismo ritmo",
);
igual(
  objetivoCalorico(2000, 0.5),
  objetivoCalorico(2000, 0.5, "adelgazar"),
  "sin decir objetivo se comporta como adelgazar (los perfiles viejos no se rompen)",
);

// --- El ajuste trabaja en los dos sentidos --------------------------------
const subirLento = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 60,
  pesoActualKg: 60,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
  objetivo: "subir",
});
igual(
  subirLento !== null && subirLento.kcal > 2000,
  true,
  "si quieres subir y no subes, te suben las calorías",
);

const subirRapido = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 60,
  // Subió 1 kg en 7 días, el doble de lo previsto.
  pesoActualKg: 61,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
  objetivo: "subir",
});
igual(
  subirRapido !== null && subirRapido.kcal < 2000,
  true,
  "si subes más rápido de lo previsto, te bajan las calorías",
);

const mantenerSeCaga = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 60,
  pesoActualKg: 60.4,
  ritmoKgSemana: 0,
  hoy: "2026-01-08",
  objetivo: "mantener",
});
igual(
  mantenerSeCaga !== null && mantenerSeCaga.kcal < 2000,
  true,
  "si quieres mantenerte y subes, te bajan un poco",
);

const adelgazarIgual = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 90,
  pesoActualKg: 90,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
  objetivo: "adelgazar",
});
igual(
  adelgazarIgual !== null && adelgazarIgual.kcal < 2000,
  true,
  "adelgazar sigue quitando calorías, como antes",
);

igual(
  diasHastaObjetivo(60, 65, 0.5, "subir") !== null && (diasHastaObjetivo(60, 65, 0.5, "subir") ?? -1) > 0,
  true,
  "llegar subiendo de peso también cuenta días",
);

// --- Objetivo ya alcanzado --------------------------------------------------
// Antes devolvía los días del valor absoluto aunque el peso ya hubiera pasado
// el objetivo: «en unos 11 días» cuando hace una semana que llegó.
igual(diasHastaObjetivo(75.2, 76, 0.5, "adelgazar"), 0, "si ya bajó de su objetivo, faltan 0 días");
igual(diasHastaObjetivo(66, 65, 0.5, "subir"), 0, "si ya subió más de su objetivo, faltan 0 días");
igual(diasHastaObjetivo(75.2, 76, 0.5, "mantener"), 0, "mantenerse no cuenta días");
igual(
  diasHastaObjetivo(74.5, 76, 0.5, "volumen-limpio") !== null &&
    (diasHastaObjetivo(74.5, 76, 0.5, "volumen-limpio") ?? -1) > 0,
  true,
  "volumen limpio aún por subir cuenta días",
);

// --- Cambio semanal con fechas reales ---------------------------------------
// `cambioPorSemana` asume 1 día entre pesadas: dos pesadas con 14 días de
// diferencia daban 7 veces la velocidad real. Con fechas, se divide entre los
// días de verdad transcurridos.
igual(
  Number(
    cambioSemanalPorFechas([
      { fecha: "2026-10-01", kg: 84 },
      { fecha: "2026-10-15", kg: 82 },
    ]).toFixed(2),
  ),
  -1,
  "2 kg en 14 días son −1,00 kg por semana (el método viejo decía −0,50)",
);
igual(
  Number(
    cambioSemanalPorFechas([
      { fecha: "2026-10-01", kg: 80 },
      { fecha: "2026-10-04", kg: 80 },
      { fecha: "2026-10-12", kg: 80 },
      { fecha: "2026-10-20", kg: 81 },
    ]).toFixed(2),
  ),
  0.34,
  "con pesadas irregulares, la recta reparte el kilo de los últimos días",
);
igual(cambioSemanalPorFechas([{ fecha: "2026-10-01", kg: 84 }]), 0, "con una sola pesada no hay cambio");
igual(
  cambioSemanalPorFechas([
    { fecha: "2026-10-01", kg: 84 },
    { fecha: "2026-10-01", kg: 82 },
  ]),
  0,
  "dos pesadas del mismo día no inventan una velocidad",
);

// El sesgo que había: la media móvil del primer punto se calculaba con 1
// pesada y la del último con 7. Pesándose una vez por semana, el resultado
// salía un 43 % más suave que la realidad. Con la recta, -0,5 es -0,5.
const pesadasSemanales = [
  { fecha: "2026-08-01", kg: 84 },
  { fecha: "2026-08-08", kg: 83.5 },
  { fecha: "2026-08-15", kg: 83 },
  { fecha: "2026-08-22", kg: 82.5 },
  { fecha: "2026-08-29", kg: 82 },
  { fecha: "2026-09-05", kg: 81.5 },
  { fecha: "2026-09-12", kg: 81 },
  { fecha: "2026-09-19", kg: 80.5 },
];
igual(
  Number(cambioSemanalPorFechas(pesadasSemanales).toFixed(2)),
  -0.5,
  "pesándose una vez por semana, la recta da el descenso real y no el 57 %",
);
igual(
  cambioSemanalPorFechas([
    { fecha: "2026-10-15", kg: 82 },
    { fecha: "2026-10-01", kg: 84 },
  ]),
  cambioSemanalPorFechas([
    { fecha: "2026-10-01", kg: 84 },
    { fecha: "2026-10-15", kg: 82 },
  ]),
  "el orden en que lleguen las pesadas no importa",
);

// --- Fechas con la hora pegada (UTC) --------------------------------------
// El perfil se guarda con `creado: new Date().toISOString()`, y eso trae la
// hora pegada («...T22:30:00.000Z»). Esa hora es UTC: en España, a las 22:30
// UTC ya es de madrugada del día siguiente. Si la cuenta de días no recorta a
// la fecha a secas, la resta se come casi un día entero.
const perfilConHora = {
  ritmoKgSemana: 0.5,
  pesoInicialKg: 90,
  creado: "2026-10-18T22:30:00.000Z",
};

igual(
  kcalDeHoy(perfilConHora, 2000, 90, "2026-10-19"),
  kcalDeHoy({ ...perfilConHora, creado: "2026-10-18" }, 2000, 90, "2026-10-19"),
  "la hora pegada a la fecha no descuadra la cuenta de días (1 día, no casi 2)",
);

// La prueba que de verdad muerde: justo en la frontera de la semana. Con la
// hora pegada, la cuenta antigua daba 6 días en vez de 7 y el ajuste semanal
// no saltaba hasta una semana después.
const perfilFrontera = {
  ritmoKgSemana: 0.5,
  pesoInicialKg: 90,
  creado: "2026-10-12T22:30:00.000Z",
};
igual(
  kcalDeHoy(perfilFrontera, 2000, 90, "2026-10-19") < 2000,
  true,
  "con la hora pegada, la semana se cuenta igual y el ajuste salta cuando toca",
);
igual(
  kcalDeHoy(perfilFrontera, 2000, 90, "2026-10-19"),
  kcalDeHoy({ ...perfilFrontera, creado: "2026-10-12" }, 2000, 90, "2026-10-19"),
  "en la frontera de la semana, con hora y sin hora dan exactamente lo mismo",
);

// --- El «hoy» por defecto es el día local, no el UTC -----------------------
// `toISOString()` da UTC: de madrugada en España devolvía el día anterior y
// todos los cálculos se desplazaban. A las 00:30 locales sigue siendo el 19.
igual(
  hoyISO(new Date(2026, 9, 19, 0, 30)),
  "2026-10-19",
  "hoyISO lee el día del reloj local, no el UTC",
);

// Sin cuarto argumento, kcalDeHoy tiene que usar el mismo día local que hoyISO.
// (Se compara con la fecha de antes y de después de la llamada por si la
// prueba pilla justo el cambio de medianoche: así no falla de vez en cuando.)
const hoyLocal = hoyISO();
const sinFecha = kcalDeHoy(perfilAjuste, 2000, 90);
igual(
  sinFecha === kcalDeHoy(perfilAjuste, 2000, 90, hoyLocal) ||
    sinFecha === kcalDeHoy(perfilAjuste, 2000, 90, hoyISO()),
  true,
  "kcalDeHoy sin fecha usa el día local de hoy",
);

// --- Los dos objetivos de musculación (auditoría 19/10) ----------------------
// Recomposición: bajar grasa muy despacio sin perder músculo. Volumen limpio:
// subir músculo sin engordar. Los dos van a paso lento, no al ritmo normal.

igual(
  ritmosPara("recomposicion").map((r) => r.valor),
  [0.25],
  "recomposición solo admite el ritmo suave (0,25 kg)",
);
igual(
  ritmosPara("volumen-limpio").map((r) => r.valor),
  [0.15, 0.25],
  "volumen limpio solo admite ritmos lentos (0,15 y 0,25 kg)",
);

igual(
  objetivoCalorico(2000, 0.25, "recomposicion") < 2000,
  true,
  "recomposición come un poco menos de lo que gastas (baja grasa)",
);
igual(
  objetivoCalorico(2000, 0.25, "volumen-limpio") > 2000,
  true,
  "volumen limpio come un poco más de lo que ganas (sube músculo)",
);
igual(
  objetivoCalorico(2000, 0.5, "recomposicion"),
  objetivoCalorico(2000, 0.5, "adelgazar"),
  "recomposición reparte calorías igual que adelgazar, con el mismo ritmo",
);

// Un familiar con 110 kg y un plan de 1.500 kcal: proteína y grasa se comían
// el plan entero (220 g * 4 + 88 g * 9 = 1.672 kcal) y los hidratos quedaban
// a cero. Ahora se recortan en proporción y siempre queda sitio.
const macrosPesado = macrosDiarios(1500, 110);
igual(
  macrosPesado.carbohidratos > 0,
  true,
  "con 110 kg y 1.500 kcal quedan hidratos (antes salían 0)",
);
igual(
  macrosPesado.proteinas * 4 + macrosPesado.grasas * 9 + macrosPesado.carbohidratos * 4 <= 1500,
  true,
  "los macros de un plan pinchado no pasan de las calorías del día",
);
igual(
  macrosDiarios(2000, 80),
  { proteinas: 160, grasas: 64, carbohidratos: 196 },
  "con 80 kg y 2.000 kcal el reparto sigue siendo el de siempre",
);

// --- Un pico de peso no arruina la revisión semanal -------------------------
// Una semana bajando bien (de 80 a 78,8) y el domingo el chill meal de la
// fiesta: pega un salto de 1,2 kg por el agua. La revisión usaba la última
// pesada a secas («has vuelto a 80») y le quitaba el objetivo del tope; con
// la media móvil de 7 días se ve que la tendencia sigue siendo bajar.
const pesosConPico = [80, 79.8, 79.6, 79.4, 79.2, 79, 78.8, 80];
const pesoDirecto = pesosConPico.at(-1) ?? 80;
const pesoMedia = tendencia(pesosConPico).at(-1) ?? 80;

const conPicoDirecto = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 80,
  pesoActualKg: pesoDirecto,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
});
const conPicoEnMedia = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 80,
  pesoActualKg: pesoMedia,
  ritmoKgSemana: 0.5,
  hoy: "2026-01-08",
});
igual(
  conPicoDirecto !== null && conPicoEnMedia !== null && conPicoEnMedia.kcal > conPicoDirecto.kcal,
  true,
  "el pico del sábado con la media duele menos que con la última pesada a secas",
);
igual(
  conPicoDirecto !== null && conPicoDirecto.kcal <= 2000 - 300,
  true,
  "con la última pesada a secas, el pico castigaba hasta el tope de bajada",
);
igual(
  conPicoEnMedia !== null && conPicoEnMedia.kcal > 2000,
  true,
  "con la media, el plan ve que vas bien y hasta devuelve calorías",
);

// --- Peso de referencia: la ventana se cuenta por fechas, no por filas -------
// La media se hacía sobre las últimas 7 FILAS: quien se pesa una vez por
// semana promediaba 7 semanas (80…77 salía 78,5) y enseñaba un peso que no
// era el suyo. Ahora solo entran las pesadas de los 7 días anteriores a la
// última.
const domingos = [
  { fecha: "2026-09-06", kg: 80 },
  { fecha: "2026-09-13", kg: 79.5 },
  { fecha: "2026-09-20", kg: 79 },
  { fecha: "2026-09-27", kg: 78.5 },
  { fecha: "2026-10-04", kg: 78 },
  { fecha: "2026-10-11", kg: 77.5 },
  { fecha: "2026-10-18", kg: 77 },
];
igual(
  pesoSuavizado(domingos),
  77,
  "pesadas semanales: vale la última (77), no la media de 7 semanas (78,5)",
);

// Con pesadas diarias entra la semana entera y se promedia.
const diarias = [
  { fecha: "2026-10-12", kg: 80 },
  { fecha: "2026-10-13", kg: 79 },
  { fecha: "2026-10-14", kg: 78 },
  { fecha: "2026-10-15", kg: 77 },
  { fecha: "2026-10-16", kg: 76 },
  { fecha: "2026-10-17", kg: 75 },
  { fecha: "2026-10-18", kg: 74 },
];
igual(pesoSuavizado(diarias), 77, "pesadas diarias: media de la última semana (539 / 7)");

// Pesadas separadas más de 7 días entre sí: solo entran las del hueco de
// 7 días que abre la última; las viejas se quedan fuera.
const espaciadas = [
  { fecha: "2026-01-01", kg: 84 },
  { fecha: "2026-06-01", kg: 82 },
  { fecha: "2026-10-12", kg: 81 },
  { fecha: "2026-10-16", kg: 79 },
];
igual(pesoSuavizado(espaciadas), 80, "fuera de la ventana de 7 días no entra nada (media de 81 y 79)");

igual(pesoSuavizado([]), null, "sin pesadas no hay peso de referencia");

// ---------------------------------------------------------------------------
// Pasos escritos a la española: el punto de miles no es un decimal.
// ---------------------------------------------------------------------------
igual(aPasos("8000"), 8000, "pasos sin separador");
igual(aPasos("8.000"), 8000, "pasos con punto de miles (8.000)");
igual(aPasos("8.500"), 8500, "pasos con punto de miles (8.500)");
igual(aPasos(" 9.250 "), 9250, "pasos con espacios alrededor");
igual(aPasos("8 000"), 8000, "pasos separados con un espacio");
igual(aPasos("8,5"), 0, "los pasos son enteros: 8,5 no vale");
igual(aPasos("ochocientos"), 0, "letras no son pasos");
igual(aPasos(""), 0, "vacío no son pasos");

// --- Fecha corta para los ejes de las gráficas -----------------------------
igual(ddMM("2026-10-21"), "21/10", "la fecha corta del eje");
igual(ddMM("2026-01-05"), "05/01", "el día y el mes van con dos cifras");
igual(ddMM(""), "", "sin fecha, el eje se queda sin rótulo");

// --- Límites médicos y físicos del peso objetivo (Fase 2) ------------------
igual(
  validarPesoObjetivo({
    pesoActualKg: 70,
    pesoObjetivoKg: 450,
    alturaCm: 175,
    objetivo: "subir",
  }).ok,
  false,
  "subir de peso tampoco permite objetivos por encima de 300 kg",
);
igual(
  validarPesoObjetivo({
    pesoActualKg: 62,
    pesoObjetivoKg: 50,
    alturaCm: 175,
    objetivo: "adelgazar",
  }).ok,
  false,
  "adelgazar bloquea objetivos que caen en bajo peso clínico (IMC < 18,5)",
);
igual(
  validarPesoObjetivo({
    pesoActualKg: 70,
    pesoObjetivoKg: pesoMinimoSaludableKg(175),
    alturaCm: 175,
    objetivo: "adelgazar",
  }).ok,
  true,
  "el mínimo saludable redondeado hacia arriba (56,7 kg a 175 cm) sí pasa el filtro de IMC >= 18,5",
);
igual(
  validarPesoObjetivo({
    pesoActualKg: 55,
    pesoObjetivoKg: 52,
    alturaCm: 175,
    objetivo: "adelgazar",
  }).ok,
  false,
  "si ya está en bajo peso para su altura, no permite abrir un plan de adelgazar",
);
igual(
  validarPesoObjetivo({
    pesoActualKg: 60,
    pesoObjetivoKg: 34,
    alturaCm: 160,
    objetivo: "mantener",
    minKg: 35,
  }),
  { ok: false, motivo: "Escribe un peso entre 35 y 300 kg." },
  "el cuestionario inicial mantiene el suelo de 35 kg",
);

// --- Ajuste semanal cuando se abre la app semanas después sin pesarse ------
const revisionTrasVacaciones = ajusteSemanal({
  fechaAjuste: "2026-01-01",
  kcalBase: 2000,
  ajusteActual: 0,
  pesoEnAjuste: 90,
  pesoActualKg: 89.5,
  ritmoKgSemana: 0.5,
  hoy: "2026-02-15",
  fechaPesadaActual: "2026-01-08",
});
igual(
  revisionTrasVacaciones,
  { kcal: 2000, ajusteKcal: 0, cambioKg: 0.5, esperadoKg: 0.5 },
  "abrir la app semanas después mide el ritmo entre las dos pesadas reales, sin castigar semanas sin báscula",
);

// --- Defensas frente a entradas no válidas ---------------------------------
igual(metabolismoBasal(0, 175, 25, "hombre"), 0, "metabolismoBasal con peso 0 devuelve 0");
igual(metabolismoBasal(80, -10, 25, "mujer"), 0, "metabolismoBasal con altura negativa devuelve 0");
igual(imc(Number.NaN, 175), 0, "imc con NaN devuelve 0");

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
