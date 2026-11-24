/**
 * Pruebas unitarias para los Skeletons de Carga Reactivos (Vídeo 6).
 *
 * Verifica la existencia, semántica accesible (role="status", aria-hidden="true")
 * y estilos anti-fogonazo de los esqueletos de carga.
 *
 * Ejecutar con: `node pruebas/esqueleto.prueba.mts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

test("EsqueletoHoy: componente exportado con accesibilidad y clases de pulso", () => {
  const rutaEsqueleto = path.join(ROOT, "components", "app", "esqueleto-hoy.tsx");
  assert.equal(fs.existsSync(rutaEsqueleto), true, "esqueleto-hoy.tsx debe existir");

  const contenido = fs.readFileSync(rutaEsqueleto, "utf8");
  assert.equal(contenido.includes("export function EsqueletoHoy"), true, "Debe exportar EsqueletoHoy");
  assert.equal(contenido.includes('role="status"'), true, 'Debe incluir role="status" para lectores de pantalla');
  assert.equal(contenido.includes('aria-hidden="true"'), true, 'Debe ocultar siluetas visuales con aria-hidden');
  assert.equal(contenido.includes("animate-pulse"), true, "Debe tener animación fluida de pulso (animate-pulse)");
  assert.equal(contenido.includes("h-28 w-28 rounded-full"), true, "Debe simular el anillo de calorías");
});

test("Cargando: componente fallback mejorado con silueta de esqueleto", () => {
  const rutaOnboarding = path.join(ROOT, "components", "app", "onboarding.tsx");
  const contenido = fs.readFileSync(rutaOnboarding, "utf8");

  assert.equal(contenido.includes("export function Cargando"), true, "Debe existir Cargando");
  assert.equal(contenido.includes("animate-pulse"), true, "Cargando debe usar animate-pulse en lugar de texto estático");
  assert.equal(contenido.includes("Un momento…"), false, "No debe mostrar el texto plano antiguo 'Un momento…'");
});

test("Hoy: integra EsqueletoHoy en su guardia de carga", () => {
  const rutaHoy = path.join(ROOT, "app", "(app)", "hoy", "page.tsx");
  const contenido = fs.readFileSync(rutaHoy, "utf8");

  assert.equal(contenido.includes("EsqueletoHoy"), true, "Hoy debe importar o usar EsqueletoHoy");
  assert.equal(
    contenido.includes("return <EsqueletoHoy />"),
    true,
    "Hoy debe renderizar <EsqueletoHoy /> mientras espera los datos",
  );
});
