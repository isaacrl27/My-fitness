/**
 * Pruebas del arrastre para cerrar la hoja de anotar comida.
 * Se ejecutan con: `node pruebas/arrastre-hoja.prueba.mts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  debeCerrarAlSoltar,
  desplazamientoVisible,
  UMBRAL_CIERRE_PX,
  ZONA_MUERTA_PX,
} from "../lib/arrastre-hoja.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Arrastre de hoja: un recorrido largo cierra aunque se suelte despacio", () => {
  assert.equal(debeCerrarAlSoltar(UMBRAL_CIERRE_PX + 1, 2000), true);
  assert.equal(debeCerrarAlSoltar(300, 5000), true);
});

test("Arrastre de hoja: un recorrido corto y lento vuelve a su sitio", () => {
  assert.equal(debeCerrarAlSoltar(30, 800), false);
  assert.equal(debeCerrarAlSoltar(UMBRAL_CIERRE_PX, 3000), false);
  assert.equal(debeCerrarAlSoltar(0, 100), false);
});

test("Arrastre de hoja: un empujón rápido cierra con poco recorrido, un roce no", () => {
  assert.equal(debeCerrarAlSoltar(60, 80), true); // 0,75 px/ms
  assert.equal(debeCerrarAlSoltar(20, 10), false); // rápido pero casi sin recorrido
  assert.equal(debeCerrarAlSoltar(60, 400), false); // recorrido medio pero lento
});

test("Arrastre de hoja: arrastrar hacia arriba nunca la mueve ni la cierra", () => {
  assert.equal(desplazamientoVisible(-50), 0);
  assert.equal(desplazamientoVisible(0), 0);
  assert.equal(desplazamientoVisible(75), 75);
  assert.equal(debeCerrarAlSoltar(-200, 100), false);
});

test("Arrastre de hoja: la zona muerta evita confundir un toque con un arrastre", () => {
  assert.equal(ZONA_MUERTA_PX > 0 && ZONA_MUERTA_PX < 15, true);
});

test("HojaAnadir: la barrita y la cabecera son una zona de agarre real", () => {
  const src = fs.readFileSync(path.join(RAIZ, "components", "app", "hoja-anadir.tsx"), "utf8");
  assert.equal(src.includes('from "@/lib/arrastre-hoja"'), true, "usa la lógica de arrastre");
  assert.equal(src.includes("onPointerDown={empezarArrastre}"), true, "escucha el inicio del arrastre");
  assert.equal(src.includes("onPointerMove={moverArrastre}"), true, "escucha el movimiento");
  assert.equal(src.includes("touch-none"), true, "el navegador no secuestra el gesto");
  assert.equal(src.includes('closest("button")'), true, "los botones siguen siendo botones");
});
