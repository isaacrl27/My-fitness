import test from "node:test";
import assert from "node:assert/strict";
import {
  mostrarTostada,
  cerrarTostada,
  suscribirTostadas,
  obtenerTostadaActiva,
  type NotificacionTostada,
} from "../lib/tostada.ts";

test("Tostada: muestra tostada inicial con cuenta = 1", () => {
  cerrarTostada();
  let recibida: NotificacionTostada | null = null;
  const cancelar = suscribirTostadas((t) => {
    recibida = t;
  });

  const t1 = mostrarTostada("Agua registrada", "💧", 2000);
  assert.equal(t1.cuenta, 1, "La primera tostada debe tener cuenta = 1");
  assert.equal(t1.mensaje, "Agua registrada");
  assert.equal(t1.icono, "💧");
  assert.ok(recibida);
  assert.equal((recibida as NotificacionTostada).cuenta, 1);

  cancelar();
  cerrarTostada();
});

test("Tostada: Merge Counter fusiona llamadas sucesivas e incrementa cuenta", () => {
  cerrarTostada();
  const historial: (NotificacionTostada | null)[] = [];
  const cancelar = suscribirTostadas((t) => {
    historial.push(t);
  });

  // 1er aviso
  const t1 = mostrarTostada("+250 ml de agua", "💧", 2000);
  assert.equal(t1.cuenta, 1);

  // 2º aviso rápido (Merge Counter)
  const t2 = mostrarTostada("+250 ml de agua", "💧", 2000);
  assert.equal(t2.cuenta, 2, "La segunda llamada consecutiva debe fusionarse con cuenta = 2");

  // 3er aviso rápido
  const t3 = mostrarTostada("+250 ml de agua", "💧", 2000);
  assert.equal(t3.cuenta, 3, "La tercera llamada consecutiva debe tener cuenta = 3");

  assert.equal(obtenerTostadaActiva()?.cuenta, 3);

  cancelar();
  cerrarTostada();
});

test("Tostada: cerrarTostada limpia el estado y resetea la cuenta para la siguiente", () => {
  cerrarTostada();
  mostrarTostada("Primer aviso", "✨");
  assert.equal(obtenerTostadaActiva()?.cuenta, 1);

  cerrarTostada();
  assert.equal(obtenerTostadaActiva(), null);

  const nuevo = mostrarTostada("Aviso tras cierre", "🔥");
  assert.equal(nuevo.cuenta, 1, "Tras cerrar, la siguiente tostada vuelve a empezar con cuenta = 1");

  cerrarTostada();
});
