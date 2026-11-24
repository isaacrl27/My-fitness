/**
 * Pruebas unitarias para la microinteracción Push Back (Vídeo 7).
 *
 * Verifica el sistema de suscripción reactiva a la pila de modales
 * (`lib/pila-modales.ts`), la detección de estado abierto/cerrado para
 * profundidad 3D y la desconexión limpia sin fugas de memoria.
 *
 * Ejecutar con: `node pruebas/push-back.prueba.mts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  apilarModal,
  cantidadModalesAbiertos,
  hayModalAbierto,
  reiniciarPilaModalesParaTests,
  suscribirPilaModales,
} from "../lib/pila-modales.ts";

test("Push Back: la suscripción recibe el estado inicial y notifica en cada apertura/cierre", () => {
  reiniciarPilaModalesParaTests();

  const historial: number[] = [];
  const desuscribir = suscribirPilaModales((n) => {
    historial.push(n);
  });

  // Estado inicial reportado de inmediato
  assert.equal(historial.length, 1);
  assert.equal(historial[0], 0);
  assert.equal(hayModalAbierto(), false);

  // Apertura de modal 1 (ej. HojaAnadir)
  const m1 = apilarModal({ onCerrar: () => {} });
  assert.equal(cantidadModalesAbiertos(), 1);
  assert.equal(hayModalAbierto(), true);
  assert.equal(historial[historial.length - 1], 1);

  // Apertura de modal 2 encima (ej. Confirmar)
  const m2 = apilarModal({ onCerrar: () => {} });
  assert.equal(cantidadModalesAbiertos(), 2);
  assert.equal(hayModalAbierto(), true);
  assert.equal(historial[historial.length - 1], 2);

  // Cierre de modal superior (m2)
  m2.desapilar();
  assert.equal(cantidadModalesAbiertos(), 1);
  assert.equal(hayModalAbierto(), true);
  assert.equal(historial[historial.length - 1], 1);

  // Cierre del modal base (m1) -> regresa a reposo (0)
  m1.desapilar();
  assert.equal(cantidadModalesAbiertos(), 0);
  assert.equal(hayModalAbierto(), false);
  assert.equal(historial[historial.length - 1], 0);

  // Desuscripción: no debe recibir más eventos tras desuscribirse
  desuscribir();
  const m3 = apilarModal({ onCerrar: () => {} });
  assert.equal(historial[historial.length - 1], 0); // No recibió el nuevo evento
  m3.desapilar();

  reiniciarPilaModalesParaTests();
});

test("Push Back: reiniciarPilaModalesParaTests limpia y notifica a 0", () => {
  reiniciarPilaModalesParaTests();

  let ultimoValor = -1;
  const desuscribir = suscribirPilaModales((n) => {
    ultimoValor = n;
  });

  apilarModal({ onCerrar: () => {} });
  apilarModal({ onCerrar: () => {} });
  assert.equal(ultimoValor, 2);

  reiniciarPilaModalesParaTests();
  assert.equal(ultimoValor, 0);
  assert.equal(hayModalAbierto(), false);

  desuscribir();
});
