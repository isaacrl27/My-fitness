import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularTransformAbanico,
  estiloTransformAbanico,
} from "../lib/carpeta-interactiva.ts";

test("calcularTransformAbanico cuando está cerrada", () => {
  const cerrado0 = calcularTransformAbanico(0, 5, false);
  const cerrado2 = calcularTransformAbanico(2, 5, false);
  const cerrado4 = calcularTransformAbanico(4, 5, false);

  assert.equal(cerrado0.zIndex, 1);
  assert.equal(cerrado2.zIndex, 3);
  assert.equal(cerrado4.zIndex, 5);

  // Las tarjetas no deben salir disparadas arriba cuando está cerrada
  assert.ok(cerrado0.yPx <= 0 && cerrado0.yPx >= -15);
  assert.ok(cerrado4.yPx <= 0 && cerrado4.yPx >= -15);
});

test("calcularTransformAbanico cuando está abierta forma un abanico simétrico", () => {
  const total = 5;
  const t0 = calcularTransformAbanico(0, total, true);
  const t1 = calcularTransformAbanico(1, total, true);
  const t2 = calcularTransformAbanico(2, total, true);
  const t3 = calcularTransformAbanico(3, total, true);
  const t4 = calcularTransformAbanico(4, total, true);

  // La tarjeta central (t2) debe estar en x=0 y rotación 0
  assert.equal(t2.xPx, 0);
  assert.equal(t2.rotacionDeg, 0);

  // Simetría en X: t0 a la izquierda, t4 a la derecha
  assert.equal(t0.xPx, -t4.xPx);
  assert.equal(t1.xPx, -t3.xPx);

  // Simetría en rotación: t0 inclinada a la izq, t4 a la der
  assert.equal(t0.rotacionDeg, -t4.rotacionDeg);
  assert.ok(t0.rotacionDeg < 0);
  assert.ok(t4.rotacionDeg > 0);

  // El centro (t2) debe tener la máxima elevación (yPx más negativo)
  assert.ok(t2.yPx < t0.yPx);
  assert.ok(t2.yPx < t4.yPx);
});

test("calcularTransformAbanico con hover eleva la tarjeta a z-index 50 y la endereza", () => {
  const conHover = calcularTransformAbanico(1, 5, true, 1);
  assert.equal(conHover.zIndex, 50);
  assert.equal(conHover.rotacionDeg, 0);
  assert.ok(conHover.yPx < -50);
});

test("estiloTransformAbanico devuelve propiedades CSS válidas", () => {
  const transform = calcularTransformAbanico(2, 5, true);
  const estilo = estiloTransformAbanico(transform);

  assert.ok(typeof estilo.transform === "string");
  assert.ok(estilo.transform.includes("translate3d"));
  assert.ok(estilo.transform.includes("rotate(0deg)"));
  assert.equal(estilo.zIndex, transform.zIndex);
});
