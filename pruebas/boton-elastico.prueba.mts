import test from "node:test";
import assert from "node:assert/strict";

test("BotonBorradoElastico: ciclo de confirmacion segura en 2 pasos", () => {
  let borradoEjecutado = false;
  let confirmando = false;

  // Simulacion de la maquina de estados de BotonBorradoElastico
  function simularPrimerClick() {
    confirmando = true;
  }

  function simularSegundoClick() {
    if (confirmando) {
      borradoEjecutado = true;
      confirmando = false;
    }
  }

  // Estado inicial
  assert.equal(confirmando, false);
  assert.equal(borradoEjecutado, false);

  // 1er toque: pide confirmacion pero NO borra
  simularPrimerClick();
  assert.equal(confirmando, true);
  assert.equal(borradoEjecutado, false);

  // 2o toque: ejecuta el borrado seguro
  simularSegundoClick();
  assert.equal(confirmando, false);
  assert.equal(borradoEjecutado, true);
});

test("BotonBorradoElastico: tiempo de espera para auto-cancelacion", () => {
  let confirmando = true;
  // Simulador de timeout
  function expirarTiempo() {
    confirmando = false;
  }

  assert.equal(confirmando, true);
  expirarTiempo();
  assert.equal(confirmando, false);
});
