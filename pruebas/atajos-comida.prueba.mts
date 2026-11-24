/**
 * Pruebas unitarias de las mejoras UX de Fase 9:
 * - Repetir comida de ayer y recientes en 1 toque
 * - Calorías rápidas (Quick Add)
 * - Aviso y conversión Crudo / Cocido
 * - Media semanal de calorías sin culpa
 *
 * Se ejecuta con: node pruebas/atajos-comida.prueba.mts
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  alimentoBaseDesdeGuardado,
  avisoCrudoCocido,
  comidaDeAyerParaFranja,
  crearBaseCaloriasRapidas,
  desplazarFechaISO,
  mediaSemanalCalorias,
  recientesParaFranja,
} from "../lib/atajos-comida.ts";
import type { Comida } from "../lib/store.tsx";

const COMIDAS_MUESTRA: Comida[] = [
  {
    id: "c1",
    fecha: "2026-11-22",
    tipo: "desayuno",
    alimentos: [
      { id: "a1", nombre: "Café con leche", cantidad: "200 ml", kcal: 95, proteinas: 6, carbohidratos: 9, grasas: 4 },
      { id: "a2", nombre: "Tostada con tomate y aceite", cantidad: "80 g", kcal: 240, proteinas: 6, carbohidratos: 32, grasas: 9 },
    ],
  },
  {
    id: "c2",
    fecha: "2026-11-22",
    tipo: "comida",
    alimentos: [
      { id: "a3", nombre: "Arroz blanco cocido", cantidad: "200 g", kcal: 260, proteinas: 5, carbohidratos: 56, grasas: 1 },
      { id: "a4", nombre: "Pechuga de pollo a la plancha", cantidad: "150 g", kcal: 248, proteinas: 46, carbohidratos: 0, grasas: 5 },
    ],
  },
  {
    id: "c3",
    fecha: "2026-11-21",
    tipo: "desayuno",
    alimentos: [
      { id: "a5", nombre: "Café con leche", cantidad: "200 ml", kcal: 95, proteinas: 6, carbohidratos: 9, grasas: 4 },
      { id: "a6", nombre: "Avena en copos", cantidad: "50 g", kcal: 190, proteinas: 7, carbohidratos: 31, grasas: 3.5 },
    ],
  },
  {
    id: "c4",
    fecha: "2026-11-22",
    tipo: "cena",
    capricho: true,
    alimentos: [
      { id: "a7", nombre: "Pizza entera", cantidad: "1 ración", kcal: 1200, proteinas: 40, carbohidratos: 130, grasas: 50 },
    ],
  },
  {
    id: "c5",
    fecha: "2026-11-20",
    tipo: "comida",
    alimentos: [
      { id: "a8", nombre: "Lentejas cocidas", cantidad: "250 g", kcal: 290, proteinas: 22, carbohidratos: 50, grasas: 1 },
    ],
  },
];

test("desplazarFechaISO resta y suma días calendario sin derivas UTC", () => {
  assert.equal(desplazarFechaISO("2026-11-23", -1), "2026-11-22");
  assert.equal(desplazarFechaISO("2026-03-01", -1), "2026-02-28");
  assert.equal(desplazarFechaISO("2026-11-23", -6), "2026-11-17");
  assert.equal(desplazarFechaISO("fecha-mala", -1), null);
});

test("comidaDeAyerParaFranja encuentra el desayuno de ayer e ignora caprichos", () => {
  const ayerDes = comidaDeAyerParaFranja(COMIDAS_MUESTRA, "2026-11-23", "desayuno");
  assert.ok(ayerDes);
  assert.equal(ayerDes.alimentos.length, 2);
  assert.equal(ayerDes.totalKcal, 335);
  assert.match(ayerDes.resumen, /Café con leche/);

  // La cena de ayer era capricho: no debe ofrecerse para repetir
  assert.equal(comidaDeAyerParaFranja(COMIDAS_MUESTRA, "2026-11-23", "cena"), null);
});

test("recientesParaFranja prioriza la misma franja, deduplica e ignora caprichos", () => {
  const recs = recientesParaFranja(COMIDAS_MUESTRA, "desayuno", 6);
  assert.equal(recs[0].alimento.nombre, "Café con leche");
  assert.equal(recs[0].mismaFranja, true);
  // Deduplicado: Café con leche (200 ml) aparece solo una vez
  const cafes = recs.filter((r) => r.alimento.nombre === "Café con leche");
  assert.equal(cafes.length, 1);
  // Caprichos fuera
  assert.equal(recs.some((r) => r.alimento.nombre === "Pizza entera"), false);
});

test("alimentoBaseDesdeGuardado conserva calorías y categoría Bebidas para ml", () => {
  const cafe = alimentoBaseDesdeGuardado(COMIDAS_MUESTRA[0].alimentos[0]);
  assert.equal(cafe.gramos, 200);
  assert.equal(cafe.base.categoria, "Bebidas");
  assert.equal(Math.round((cafe.base.kcal100 * cafe.gramos) / 100), 95);
});

test("crearBaseCaloriasRapidas valida rango y aplica nombre y proteína opcionales", () => {
  assert.equal(crearBaseCaloriasRapidas({ kcal: 0 }), null);
  assert.equal(crearBaseCaloriasRapidas({ kcal: 9999 }), null);
  const rapido = crearBaseCaloriasRapidas({ kcal: 650, nombre: "Menú del día", proteinas: 32 });
  assert.ok(rapido);
  assert.equal(rapido.base.nombre, "Menú del día");
  assert.equal(rapido.base.kcal100, 650);
  assert.equal(rapido.base.p100, 32);

  const sinNombre = crearBaseCaloriasRapidas({ kcal: 420 });
  assert.equal(sinNombre?.base.nombre, "Comida rápida");
});

test("avisoCrudoCocido detecta arroz/pasta/legumbres/pollo cocido y avena en seco", () => {
  const arroz = avisoCrudoCocido("Arroz blanco cocido");
  assert.equal(arroz?.tipo, "cocido");
  assert.equal(arroz?.factorDesdeCrudo, 2.7);

  const pasta = avisoCrudoCocido("Pasta integral cocida");
  assert.equal(pasta?.factorDesdeCrudo, 2.3);

  const lentejas = avisoCrudoCocido("Lentejas cocidas");
  assert.equal(lentejas?.factorDesdeCrudo, 2.5);

  const pollo = avisoCrudoCocido("Pechuga de pollo a la plancha");
  assert.equal(pollo?.factorDesdeCrudo, 0.75);

  const avena = avisoCrudoCocido("Avena en copos");
  assert.equal(avena?.tipo, "seco");
  assert.equal(avena?.factorDesdeCrudo, undefined);

  assert.equal(avisoCrudoCocido("Plátano"), null);
});

test("mediaSemanalCalorias promedia solo días con registro e ignora caprichos", () => {
  // 2026-11-22: 335 + 508 = 843; 2026-11-21: 285; 2026-11-20: 290 -> media 3 días = 473
  const media = mediaSemanalCalorias(COMIDAS_MUESTRA, "2026-11-23", 500);
  assert.ok(media);
  assert.equal(media.diasConDatos, 3);
  assert.equal(media.mediaKcal, 473);
  assert.equal(media.estado, "en_rango");

  // Con un solo día con registro no muestra ruido
  const soloUno = mediaSemanalCalorias([COMIDAS_MUESTRA[0]], "2026-11-23", 1800);
  assert.equal(soloUno, null);
});
