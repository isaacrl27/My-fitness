/**
 * Pruebas de la racha. Se ejecutan con:
 *   node pruebas/racha.prueba.mts
 *
 * Comprueban lo que antes fallaba: que Hoy y el widget contaran lo mismo, que
 * el día en curso no rompa nada y que el comodín mensual perdone un hueco.
 */

import { diasConActividad, hayActividadHoy, rachaActual } from "../lib/racha.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.log(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

function dias(...lista: string[]): Set<string> {
  return new Set(lista);
}

// --- Qué cuenta como día activo ---------------------------------------------
igual(
  diasConActividad({
    comidas: [{ fecha: "2026-10-01" }, { fecha: "2026-10-01" }],
    pesadas: [{ fecha: "2026-10-02" }],
    aguaLitros: { "2026-10-03": 1.5, "2026-10-04": 0 },
    habitosHechos: { "2026-10-05": ["agua"], "2026-10-06": [] },
  }),
  dias("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05"),
  "comer, pesarse, beber agua o marcar un hábito dan día activo; el rato vacío no",
);

// --- Días seguidos ----------------------------------------------------------
igual(rachaActual(dias(), "2026-10-10"), 0, "sin nada anotado no hay racha");
igual(
  rachaActual(dias("2026-10-08", "2026-10-09", "2026-10-10"), "2026-10-10"),
  3,
  "tres días seguidos contando hoy",
);
igual(
  rachaActual(dias("2026-10-08", "2026-10-09"), "2026-10-10"),
  2,
  "sin nada hoy todavía, la racha no se cae: se cuenta desde ayer",
);
igual(
  rachaActual(dias("2026-10-01", "2026-10-02", "2026-10-09"), "2026-10-10"),
  1,
  "un hueco grande corta la racha en el último tramo",
);

// --- El comodín mensual -----------------------------------------------------
igual(
  rachaActual(
    dias("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06"),
    "2026-10-07",
  ),
  5,
  "un día fallado dentro del mismo mes se perdona con el comodín",
);
igual(
  rachaActual(
    dias("2026-10-01", "2026-10-02", "2026-10-04", "2026-10-06", "2026-10-07"),
    "2026-10-08",
  ),
  3,
  "con dos huecos en el mismo mes solo se perdona el primero",
);
igual(
  rachaActual(dias("2026-09-28", "2026-09-29", "2026-10-01", "2026-10-02"), "2026-10-03"),
  4,
  "el comodín se renueva cada mes: el hueco de septiembre no gasta el de octubre",
);
igual(
  rachaActual(dias("2026-09-28", "2026-09-29", "2026-10-02"), "2026-10-02"),
  1,
  "dos días seguidos sin actividad rompen la racha aunque caigan en cambio de mes (30 sep + 1 oct)",
);
igual(
  rachaActual(dias("2026-09-28", "2026-09-30"), "2026-10-02"),
  2,
  "dos huecos sueltos de un solo día en meses distintos (29 sep y 1 oct) sí usan cada uno su comodín",
);

// --- ¿Está la racha asegurada hoy? ------------------------------------------
igual(hayActividadHoy(dias("2026-10-10"), "2026-10-10"), true, "hoy hay algo anotado");
igual(hayActividadHoy(dias("2026-10-09"), "2026-10-10"), false, "hoy todavía no hay nada");

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
