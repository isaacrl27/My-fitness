import test from "node:test";
import assert from "node:assert/strict";

const UMBRAL_TIRON_CORDON_PX = 18;
const LONGITUD_BASE_CORDON_PX = 32;
const TOPE_MAX_CORDON_PX = 68;

function calcularDesplazamientoCordon(dx: number, dy: number): { x: number; y: number } {
  const factorX = 1 / (1 + Math.abs(dx) / 75);
  const x = Math.max(-50, Math.min(50, dx * factorX));

  const factorY = dy > 0 ? 1 / (1 + dy / 100) : 1 / (1 + Math.abs(dy) / 40);
  const extensionY = dy * factorY;
  const y = Math.max(14, Math.min(TOPE_MAX_CORDON_PX, LONGITUD_BASE_CORDON_PX + extensionY));

  return { x, y };
}

test("CordonLuz: umbrales físicos del tirador del ventilador", () => {
  assert.equal(UMBRAL_TIRON_CORDON_PX, 18, "El umbral de disparo debe ser de 18px");
  assert.equal(LONGITUD_BASE_CORDON_PX, 32, "La longitud de reposo debe ser de 32px");
  assert.equal(TOPE_MAX_CORDON_PX, 68, "El tope máximo no debe superar 68px");
});

test("CordonLuz: libertad de movimiento 2D con resistencia elástica", () => {
  // Reposo (0, 0)
  const reposo = calcularDesplazamientoCordon(0, 0);
  assert.equal(reposo.x, 0);
  assert.equal(reposo.y, LONGITUD_BASE_CORDON_PX);

  // Arrastre horizontal (hacia la derecha)
  const haciaDerecha = calcularDesplazamientoCordon(40, 0);
  assert.ok(haciaDerecha.x > 20, "Debe desplazarse lateralmente");
  assert.ok(haciaDerecha.x < 40, "Debe amortiguar con muelle");
  assert.equal(haciaDerecha.y, LONGITUD_BASE_CORDON_PX);

  // Arrastre vertical (tirón hacia abajo de 50px)
  const tironAbajo = calcularDesplazamientoCordon(0, 50);
  assert.equal(tironAbajo.x, 0);
  assert.ok(tironAbajo.y - LONGITUD_BASE_CORDON_PX >= UMBRAL_TIRON_CORDON_PX, "Debe superar el umbral de disparo");
  assert.ok(tironAbajo.y <= TOPE_MAX_CORDON_PX, "No debe superar el tope");

  // Arrastre diagonal en 2D (45° hacia abajo a la izquierda)
  const diagonal = calcularDesplazamientoCordon(-50, 50);
  assert.ok(diagonal.x < 0, "X debe ser negativo");
  assert.ok(diagonal.y > LONGITUD_BASE_CORDON_PX, "Y debe descender");
});

test("CordonLuz: conmutación de estado de ventilador y luz", () => {
  let activo = false;

  function dispararTiron(deltaY: number) {
    if (deltaY >= UMBRAL_TIRON_CORDON_PX) {
      activo = !activo;
      return true;
    }
    return false;
  }

  // 1. Tirón suave que no llega al umbral
  assert.equal(dispararTiron(15), false);
  assert.equal(activo, false);

  // 2. Tirón firme que supera el umbral
  assert.equal(dispararTiron(40), true);
  assert.equal(activo, true);

  // 3. Segundo tirón firme apaga
  assert.equal(dispararTiron(45), true);
  assert.equal(activo, false);
});

function calcularPasoRotacionFisica(
  velocidadActual: number,
  luzEncendida: boolean,
  dtMs: number,
  maxVelocidad: number = 360 / 2400
): number {
  const dt = Math.max(0, Math.min(dtMs, 64));
  if (luzEncendida) {
    return Math.min(maxVelocidad, velocidadActual + (maxVelocidad / 700) * dt);
  }
  const arrastre = 0.0007;
  const rozamiento = 0.000035;
  return Math.max(0, velocidadActual * (1 - arrastre * dt) - rozamiento * dt);
}

test("CordonLuz: inercia y frenado suave del ventilador al apagar", () => {
  const maxVel = 360 / 2400; // 0.15 deg/ms
  // 1. Aceleración con luz encendida hasta crucero
  let v = 0;
  for (let i = 0; i < 60; i++) {
    v = calcularPasoRotacionFisica(v, true, 16.67, maxVel);
  }
  assert.ok(v > 0.14, "Debe alcanzar velocidad de crucero en ~1s");
  assert.ok(v <= maxVel, "No debe superar la velocidad máxima");

  // 2. Apagar y verificar deceleración gradual sin parada brusca
  const vCrucero = v;
  // Tras 500ms (30 pasos de 16.67ms)
  for (let i = 0; i < 30; i++) {
    v = calcularPasoRotacionFisica(v, false, 16.67, maxVel);
  }
  assert.ok(v < vCrucero, "La velocidad debe disminuir");
  assert.ok(v > 0.05, "Tras 500ms debe conservar inercia y seguir girando");

  // Tras 2000ms adicionales (120 pasos de 16.67ms)
  for (let i = 0; i < 120; i++) {
    v = calcularPasoRotacionFisica(v, false, 16.67, maxVel);
  }
  assert.equal(v, 0, "Al cabo de ~2.2s debe detenerse suavemente a 0");
});
