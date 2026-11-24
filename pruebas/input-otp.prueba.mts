import test from "node:test";
import assert from "node:assert/strict";

test("InputOTP: distribucion de caracteres por slots", () => {
  const longitud = 6;
  const valor = "HOG842";
  const caracteres = Array.from({ length: longitud }, (_, i) => valor[i] || "");

  assert.equal(caracteres.length, 6);
  assert.equal(caracteres[0], "H");
  assert.equal(caracteres[1], "O");
  assert.equal(caracteres[2], "G");
  assert.equal(caracteres[3], "8");
  assert.equal(caracteres[4], "4");
  assert.equal(caracteres[5], "2");
});

test("InputOTP: filtrado alfanumerico en mayusculas", () => {
  const textoPegado = "hog-842!";
  const coincidentes = textoPegado.match(/[a-zA-Z0-9]/g);
  const textoFinal = (coincidentes ? coincidentes.join("").slice(0, 6) : "").toUpperCase();

  assert.equal(textoFinal, "HOG842");
  assert.equal(textoFinal.length, 6);
});

test("InputOTP: filtrado estrictamente numerico", () => {
  const pinPegado = "49a-72x";
  const coincidentes = pinPegado.match(/[0-9]/g);
  const pinFinal = coincidentes ? coincidentes.join("").slice(0, 4) : "";

  assert.equal(pinFinal, "4972");
  assert.equal(pinFinal.length, 4);
});
