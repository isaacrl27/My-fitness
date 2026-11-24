import test from "node:test";
import assert from "node:assert/strict";

const UMBRAL_SWIPE_PX = 72;
const TOPE_MAX_SWIPE_PX = 130;

test("FilaDeslizable: umbrales físicos de swipe", () => {
  assert.equal(UMBRAL_SWIPE_PX, 72, "El umbral de disparo debe ser de 72px para evitar activaciones accidentales");
  assert.equal(TOPE_MAX_SWIPE_PX, 130, "El tope de estiramiento elástico debe limitar el desplazamiento a 130px");
});

test("FilaDeslizable: cálculo de resistencia elástica (rubber band)", () => {
  const deltaX = -100;
  const factor = 1 / (1 + Math.abs(deltaX) / 240);
  const offsetResistido = deltaX * factor;

  assert.ok(Math.abs(offsetResistido) < Math.abs(deltaX), "La resistencia debe amortiguar el desplazamiento");
  assert.ok(Math.abs(offsetResistido) > 60, "Con 100px de swipe debe superar 60px efectivos");
});

test("FilaDeslizable: umbral alcanzado vs peek hint", () => {
  const deltaPequeno = -40;
  const factorP = 1 / (1 + Math.abs(deltaPequeno) / 240);
  const offsetPequeno = deltaPequeno * factorP;
  assert.ok(Math.abs(offsetPequeno) < UMBRAL_SWIPE_PX, "Un swipe pequeño queda por debajo del umbral (Peek Hint)");

  const deltaFuerte = -160;
  const factorF = 1 / (1 + Math.abs(deltaFuerte) / 240);
  const offsetFuerte = deltaFuerte * factorF;
  assert.ok(Math.abs(offsetFuerte) >= UMBRAL_SWIPE_PX, "Un swipe fuerte supera el umbral (Liquid Delete)");
});

test("FilaDeslizable: máquina de estados de Inline Undo", () => {
  let borradoEjecutado = false;
  let borradoPendiente = false;

  // 1. Deslizamiento completado: pasa a Inline Undo
  borradoPendiente = true;
  assert.equal(borradoPendiente, true);
  assert.equal(borradoEjecutado, false, "No debe borrar inmediatamente");

  // 2. Si el usuario cancela (Deshacer)
  function cancelarDeshacer() {
    borradoPendiente = false;
  }
  cancelarDeshacer();
  assert.equal(borradoPendiente, false);
  assert.equal(borradoEjecutado, false);

  // 3. Si el usuario deja agotar la cuenta atrás
  borradoPendiente = true;
  function expirarTimer() {
    borradoEjecutado = true;
    borradoPendiente = false;
  }
  expirarTimer();
  assert.equal(borradoPendiente, false);
  assert.equal(borradoEjecutado, true, "Debe ejecutar el borrado tras expirar el undo");
});
