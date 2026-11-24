/**
 * Pruebas del plan de ejercicios. Se ejecutan con:
 *   node pruebas/ejercicios.prueba.mts
 *
 * Lo que se comprueba es lo que pidió Isaac: que haya un plan de casa y otro
 * de gimnasio, que los días salgan del perfil pero se puedan cambiar, que la
 * rutina rote sola cada semana y que ningún bloque mande a un ejercicio que
 * no existe (o del sitio equivocado).
 */

import {
  DIAS_DE_ENTRENO,
  EJERCICIOS,
  POR_ID,
  diasDeEntrenamiento,
  diasSugeridos,
  ejerciciosDe,
  proximoEntrenamiento,
  resolverSesion,
  semanaDeEntrenamiento,
  sesionesDe,
  sitioDeEntrenamiento,
  type Dias,
  type Sitio,
} from "../lib/ejercicios.ts";

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

const SITIOS: Sitio[] = ["casa", "gimnasio"];
const CANTIDADES: Dias[] = [2, 3, 4];

// --- Catálogo --------------------------------------------------------------
const ids = EJERCICIOS.map((e) => e.id);
igual(new Set(ids).size, ids.length, "no hay dos ejercicios con el mismo id");
igual(ejerciciosDe("casa").length >= 24, true, "hay al menos 24 ejercicios de casa");
igual(ejerciciosDe("gimnasio").length >= 24, true, "hay al menos 24 ejercicios de gimnasio");
igual(
  EJERCICIOS.every((e) => e.nombre.trim().length > 2 && e.pasos.length >= 3 && e.pasos.length <= 5),
  true,
  "cada ejercicio tiene nombre y entre 3 y 5 pasos",
);
igual(
  EJERCICIOS.every((e) => e.truco.trim().length > 10),
  true,
  "cada ejercicio trae un truco útil",
);
igual(
  EJERCICIOS.every((e) => e.series >= 1 && e.reps.trim().length > 0 && e.descansoSeg >= 0),
  true,
  "cada ejercicio trae series, repeticiones y descanso",
);
igual(
  EJERCICIOS.every((e) => /^[A-Za-z0-9_-]{11}$/.test(e.video)),
  true,
  "todos los ejercicios tienen un identificador de vídeo de YouTube válido",
);
igual(
  EJERCICIOS.every((e) => e.sitio === "casa" || e.sitio === "gimnasio"),
  true,
  "cada ejercicio pertenece a casa o a gimnasio",
);
const nombresCasa = new Set(ejerciciosDe("casa").map((e) => e.nombre));
const nombresGym = new Set(ejerciciosDe("gimnasio").map((e) => e.nombre));
igual(nombresCasa.size, ejerciciosDe("casa").length, "no hay nombres repetidos en casa");
igual(nombresGym.size, ejerciciosDe("gimnasio").length, "no hay nombres repetidos en gimnasio");

// --- Rutinas ---------------------------------------------------------------
for (const sitio of SITIOS) {
  for (const dias of CANTIDADES) {
    const sesiones = sesionesDe(sitio, dias);
    igual(sesiones.length, dias, `${sitio}: la rutina de ${dias} días trae ${dias} sesiones`);
    igual(
      sesiones.every((s) => s.nombre.trim().length > 0 && s.bloques.length >= 4),
      true,
      `${sitio}: cada sesión de ${dias} días tiene nombre y al menos 4 bloques`,
    );

    const todos = sesiones.flatMap((s) => s.bloques.flat());
    igual(
      todos.every((id) => POR_ID.has(id)),
      true,
      `${sitio}: todos los ejercicios de la rutina de ${dias} días existen`,
    );
    igual(
      todos.every((id) => POR_ID.get(id)?.sitio === sitio),
      true,
      `${sitio}: la rutina de ${dias} días no manda ejercicios del otro sitio`,
    );
  }
}

// Ningún ejercicio del catálogo se queda sin salir nunca.
const usados = new Set(
  SITIOS.flatMap((sitio) =>
    CANTIDADES.flatMap((dias) => sesionesDe(sitio, dias).flatMap((s) => s.bloques.flat())),
  ),
);
igual(usados.size, EJERCICIOS.length, "todos los ejercicios del catálogo salen en alguna rutina");

// --- Rotación --------------------------------------------------------------
for (const sitio of SITIOS) {
  for (const dias of CANTIDADES) {
    const sesion = sesionesDe(sitio, dias)[0];
    const semana0 = resolverSesion(sesion, 0).ejercicios.map((e) => e.id);
    const semana1 = resolverSesion(sesion, 1).ejercicios.map((e) => e.id);
    const semana4 = resolverSesion(sesion, 4).ejercicios.map((e) => e.id);
    igual(JSON.stringify(semana0) !== JSON.stringify(semana1), true, `${sitio} ${dias} días: la rutina cambia de una semana a otra`);
    igual(JSON.stringify(semana0), JSON.stringify(semana4), `${sitio} ${dias} días: la rotación se repite cada 4 semanas`);
  }
}

for (const sitio of SITIOS) {
  for (const dias of CANTIDADES) {
    const sesiones = sesionesDe(sitio, dias);
    for (let vuelta = 0; vuelta < 4; vuelta += 1) {
      const resueltas = sesiones.map((s) => resolverSesion(s, vuelta));
      // Repetir un movimiento en días distintos es normal (una sentadilla dos
      // veces por semana, por ejemplo). Lo que no puede pasar es que una misma
      // sesión mande dos veces el mismo ejercicio.
      igual(
        resueltas.every((s) => {
          const idsDeLaSesion = s.ejercicios.map((e) => e.id);
          return new Set(idsDeLaSesion).size === idsDeLaSesion.length;
        }),
        true,
        `${sitio} ${dias} días, semana ${vuelta}: ninguna sesión repite un ejercicio`,
      );
      igual(
        new Set(resueltas.map((s) => JSON.stringify(s.ejercicios.map((e) => e.id)))).size,
        resueltas.length,
        `${sitio} ${dias} días, semana ${vuelta}: las sesiones de la semana no son iguales`,
      );
      igual(
        resueltas.every((s) => s.ejercicios.length >= 4 && s.ejercicios.length <= 6),
        true,
        `${sitio} ${dias} días, semana ${vuelta}: cada sesión tiene entre 4 y 6 ejercicios`,
      );
    }
  }
}

// --- Semana y días ---------------------------------------------------------
const LUNES = "2026-10-19";
const JUEVES = "2026-10-22";
const DOMINGO = "2026-10-25";

for (const dias of CANTIDADES) {
  const semana = semanaDeEntrenamiento("casa", dias, JUEVES);
  igual(semana.length, 7, `la semana de ${dias} días trae los 7 días`);
  igual(semana.filter((d) => d.entrena).length, dias, `la semana de ${dias} días entrena ${dias} días`);
  igual(semana.filter((d) => d.esHoy).length, 1, `la semana de ${dias} días marca un solo día como hoy`);
  igual(semana.find((d) => d.esHoy)?.fecha, JUEVES, `la semana de ${dias} días marca el jueves como hoy`);
  const esperados = DIAS_DE_ENTRENO[dias].map((i) => semana[i].dia);
  igual(
    semana.filter((d) => d.entrena).map((d) => d.dia),
    esperados,
    `la semana de ${dias} días entrena los días que toca`,
  );
}

igual(
  semanaDeEntrenamiento("casa", 2, LUNES).find((d) => d.fecha === LUNES)?.entrena,
  true,
  "un lunes con rutina de 2 días toca entrenar",
);
igual(
  semanaDeEntrenamiento("casa", 2, "2026-10-20").find((d) => d.fecha === "2026-10-20")?.entrena,
  false,
  "un martes con rutina de 2 días toca descansar",
);

// Dos llamadas iguales dan exactamente lo mismo: la rutina no es aleatoria.
igual(
  JSON.stringify(semanaDeEntrenamiento("gimnasio", 3, JUEVES)),
  JSON.stringify(semanaDeEntrenamiento("gimnasio", 3, JUEVES)),
  "la misma fecha y el mismo sitio dan siempre la misma rutina",
);

// --- Próximo entrenamiento -------------------------------------------------
const proximo = proximoEntrenamiento("casa", 2, "2026-10-20");
igual(proximo.fecha, JUEVES, "un martes, el próximo entreno de 2 días es el jueves");
igual(proximo.sesion.nombre, "Cuerpo entero (día 2)", "el jueves toca la segunda sesión de la semana");
const trasDomingo = proximoEntrenamiento("casa", 2, DOMINGO);
igual(trasDomingo.fecha, "2026-10-26", "un domingo, el próximo entreno salta al lunes siguiente");

// --- Días según el perfil --------------------------------------------------
igual(diasSugeridos("sedentario"), 2, "a quien no se mueve se le proponen 2 días");
igual(diasSugeridos("ligero"), 2, "a quien se mueve poco se le proponen 2 días");
igual(diasSugeridos("moderado"), 3, "a quien se mueve moderadamente se le proponen 3 días");
igual(diasSugeridos("alto"), 4, "a quien entrena mucho se le proponen 4 días");
igual(diasSugeridos("muy-alto"), 4, "a quien entrena muchísimo se le proponen 4 días");
igual(diasDeEntrenamiento(3, "sedentario"), 3, "si ya eligió 3 días, se respeta");
igual(diasDeEntrenamiento(9, "alto"), 4, "un valor raro se cambia por el sugerido");
igual(sitioDeEntrenamiento("gimnasio"), "gimnasio", "el sitio guardado se respeta");
igual(sitioDeEntrenamiento("playa"), "casa", "un sitio raro cae en casa");

// --- Resumen ---------------------------------------------------------------
console.log(`\n${hechas - fallos}/${hechas} comprobaciones bien`);
if (fallos > 0) {
  console.error(`${fallos} fallos`);
  process.exit(1);
}
