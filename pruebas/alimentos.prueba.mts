import { test } from "node:test";
import assert from "node:assert/strict";
import { buscar, formasGramaticales, normalizar, porGramos } from "../lib/alimentos.ts";

test("alimentos: normalizar quita tildes, signos y mayúsculas", () => {
  assert.equal(normalizar("Plátano!"), "platano");
  assert.equal(normalizar("  Jamón   Serrano... "), "jamon serrano");
  assert.equal(normalizar("Café con leche"), "cafe con leche");
});

test("alimentos: formasGramaticales maneja plurales y singulares", () => {
  const tostadas = formasGramaticales("tostadas");
  assert.ok(tostadas.includes("tostada"), "debe incluir singular tostada");

  const nueces = formasGramaticales("nueces");
  assert.ok(nueces.includes("nuez"), "debe incluir singular nuez");

  const patata = formasGramaticales("patata");
  assert.ok(patata.includes("patatas"), "debe incluir plural patatas");

  const chips = formasGramaticales("chips");
  assert.ok(chips.includes("chip"), "debe incluir singular chip");
});

test("alimentos: buscar encuentra tostadas en plural y singular", () => {
  const resPlural = buscar("tostadas");
  assert.ok(resPlural.length > 0);
  assert.ok(resPlural.some((a) => a.nombre.toLowerCase().includes("tostada")));

  const resSingular = buscar("tostada");
  assert.ok(resSingular.length > 0);
  assert.ok(resSingular.some((a) => a.nombre.toLowerCase().includes("tostada")));
});

test("alimentos: buscar encuentra patatas chips con varios términos", () => {
  const porChips = buscar("chips");
  assert.ok(porChips.some((a) => a.nombre.includes("chips")));

  const porPatatasChips = buscar("patatas chips");
  assert.ok(porPatatasChips.some((a) => a.nombre.includes("chips")));

  const porPapas = buscar("papas");
  assert.ok(porPapas.some((a) => a.nombre.includes("chips")));

  const porLays = buscar("lays");
  assert.ok(porLays.some((a) => a.nombre.includes("chips")));
});

test("alimentos: buscar encuentra huevos en plural", () => {
  const res = buscar("huevos");
  assert.ok(res.length > 0);
  assert.ok(res.some((a) => a.nombre.toLowerCase().includes("huevo")));
});

test("alimentos: buscar con palabras en orden invertido", () => {
  const res = buscar("pollo pechuga");
  assert.ok(res.some((a) => a.nombre.includes("Pechuga de pollo")));
});

test("alimentos: buscar encuentra yogurt y yogurts", () => {
  const resSingular = buscar("yogurt");
  assert.ok(resSingular.length > 0, "debe encontrar yogurt");
  assert.ok(resSingular.some((a) => a.nombre.toLowerCase().includes("yogur")));

  const resPlural = buscar("yogurts");
  assert.ok(resPlural.length > 0, "debe encontrar yogurts");
  assert.ok(resPlural.some((a) => a.nombre.toLowerCase().includes("yogur")));
});

test("alimentos: porGramos calcula nutrientes con precisión", () => {
  const base = {
    nombre: "Prueba",
    porcion: "100 g",
    gramos: 100,
    kcal100: 200,
    p100: 20,
    c100: 10,
    g100: 5,
    categoria: "Test",
  };
  const racion50 = porGramos(base, 50);
  assert.equal(racion50.kcal, 100);
  assert.equal(racion50.proteinas, 10);
  assert.equal(racion50.carbohidratos, 5);
  assert.equal(racion50.grasas, 2.5);
  assert.equal(racion50.cantidad, "50 g");
});
