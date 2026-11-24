/**
 * Pruebas Fase 9: Planes de Nutrición, Ejercicios, Escalar Raciones y Recetas.
 * Se ejecutan con: `node pruebas/fase9-plan-recetas-ejercicios.prueba.mts`
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PLATOS,
  descartado,
  escalarDia,
  generarSemana,
  kcalDelDia,
  listaCompra,
  esDespensa,
  type DiaPlan,
  type Plato,
} from "../lib/platos.ts";

import { recetaDe } from "../lib/recetas.ts";

import {
  EJERCICIOS,
  diasSugeridos,
  proximoEntrenamiento,
  semanaDeEntrenamiento,
  sesionesDe,
  sitioDeEntrenamiento,
} from "../lib/ejercicios.ts";

// ---------------------------------------------------------------------------
// 1. GENERACIÓN Y ESCALADO DEL MENÚ SEMANAL
// ---------------------------------------------------------------------------

test("generarSemana genera 7 días y escala exactamente al objetivo calórico", () => {
  const objetivo = 1800;
  const semana = generarSemana([], {}, 0, objetivo, new Date("2026-11-02T12:00:00"));
  assert.equal(semana.length, 7);

  for (const dia of semana) {
    const kcal = kcalDelDia(dia);
    // Cada día debe quedar a menos de 30 kcal del objetivo
    assert.ok(
      Math.abs(kcal - objetivo) <= 30,
      `Día ${dia.dia} suma ${kcal} kcal, se aleja de ${objetivo}`,
    );
  }
});

test("cambiar una comida y re-escalar el día mantiene el total calórico cuadrado", () => {
  const objetivo = 2000;
  const semana = generarSemana([], {}, 0, objetivo, new Date("2026-11-02T12:00:00"));
  const diaLunes = semana[0];

  // Buscamos un plato alternativo diferente
  const comidaAlternativa: Plato = {
    nombre: "Arroz con ternera y verduras",
    descripcion: "Plato de ternera y arroz",
    momento: "comida",
    kcal: 750,
    proteinas: 45,
    carbohidratos: 80,
    grasas: 22,
    etiquetas: [],
    ingredientes: [
      { nombre: "Arroz blanco", gramos: 90, categoria: "Cereales y legumbres" },
      { nombre: "Filete de ternera", gramos: 150, categoria: "Carnes" },
    ],
    pasos: ["Cocer", "Saltear"],
  };

  // Sustituimos la comida del lunes
  const diaMutado: DiaPlan = {
    ...diaLunes,
    comidas: {
      ...diaLunes.comidas,
      comida: comidaAlternativa,
    },
  };

  // Re-escalado del día completo
  const diaAjustado = escalarDia(diaMutado, objetivo);
  const kcalFinal = kcalDelDia(diaAjustado);

  assert.ok(
    Math.abs(kcalFinal - objetivo) <= 30,
    `El día re-escalado suma ${kcalFinal} kcal, objetivo ${objetivo}`,
  );
});

test("escalarDia maneja valores límite sin NaN y respeta múltiplos de 5g", () => {
  const platoConRaros: Plato = {
    nombre: "Plato de prueba límite",
    descripcion: "Plato de prueba para límites",
    momento: "comida",
    kcal: 500,
    proteinas: 30,
    carbohidratos: 50,
    grasas: 15,
    etiquetas: [],
    ingredientes: [
      { nombre: "Pollo", gramos: 0, categoria: "Carnes" }, // 0 gramos
      { nombre: "Sal", gramos: 1, categoria: "Despensa" },
    ],
    pasos: ["Mezclar"],
  };

  const dia: DiaPlan = {
    dia: "Lunes",
    fecha: "2026-11-02",
    comidas: {
      desayuno: null,
      comida: platoConRaros,
      cena: null,
      snack: null,
    },
  };

  const escalado = escalarDia(dia, 600);
  const comida = escalado.comidas.comida;
  assert.ok(comida);
  assert.equal(Number.isFinite(comida.kcal), true);
  for (const ing of comida.ingredientes) {
    assert.equal(Number.isFinite(ing.gramos), true);
    assert.ok(ing.gramos >= 5);
    assert.equal(ing.gramos % 5, 0); // múltiplo de 5
  }
});

// ---------------------------------------------------------------------------
// 2. EXCLUSIÓN DE INGREDIENTES Y DIETAS
// ---------------------------------------------------------------------------

test("descartado veta platos por ingredientes normales y por piezas combinadas", () => {
  const platoCombinado: Plato = {
    nombre: "Comida saludable",
    descripcion: "Combinado de merluza",
    momento: "comida",
    kcal: 500,
    proteinas: 35,
    carbohidratos: 40,
    grasas: 12,
    etiquetas: [],
    piezas: ["merluza", "patata", "espinacas"],
    ingredientes: [{ nombre: "Pescado blanco", gramos: 150, categoria: "Pescados" }],
    pasos: ["Cocinar"],
  };

  // Si a la persona no le gusta la merluza (que está en piezas)
  assert.equal(descartado(platoCombinado, ["merluza"], {}), true);
  // Si no hay veto, no se descarta
  assert.equal(descartado(platoCombinado, ["pollo"], {}), false);
});

test("tofu vetado automáticamente para dieta estándar/ninguna", () => {
  const platoConTofu: Plato = {
    nombre: "Salteado con tofu",
    descripcion: "Tofu salteado",
    momento: "cena",
    kcal: 400,
    proteinas: 25,
    carbohidratos: 30,
    grasas: 15,
    etiquetas: ["vegetariano"],
    ingredientes: [{ nombre: "Tofu firme", gramos: 120, categoria: "Legumbres" }],
    pasos: ["Dorar"],
  };

  assert.equal(descartado(platoConTofu, [], {}, "ninguna"), true);
  assert.equal(descartado(platoConTofu, [], {}, "vegetariano"), false);
});

// ---------------------------------------------------------------------------
// 3. RECETAS E INTEGRACIÓN CON LISTA DE LA COMPRA
// ---------------------------------------------------------------------------

test("recetas del catálogo son completas y consistentes con PLATOS", () => {
  const platos = PLATOS.slice(0, 10);
  for (const p of platos) {
    const receta = recetaDe(p.nombre);
    if (receta) {
      assert.ok(receta.tiempoMin >= 1);
      assert.ok(receta.pasos.length >= 3);
      assert.ok(receta.truco.length > 5);
      assert.ok(receta.antes.length > 5);
    }
  }
  // Platos inexistentes devuelven null
  assert.equal(recetaDe("Inexistente total"), null);
});

test("listaCompra agrupa por categorías y clasifica Despensa vs Frescos", () => {
  const semana = generarSemana([], {}, 0, 2000, new Date("2026-11-02T12:00:00"));
  const compra = listaCompra(semana);

  assert.ok(compra["Despensa"].length > 0);
  assert.ok(compra["Frutas y verduras"].length > 0);

  // Verificamos que los artículos de despensa son identificados como tal
  for (const art of compra["Despensa"]) {
    assert.equal(esDespensa(art.nombre), true);
  }
});

// ---------------------------------------------------------------------------
// 4. PLAN DE ENTRENAMIENTO Y EJERCICIOS
// ---------------------------------------------------------------------------

test("entrenamiento respeta sitio casa vs gimnasio y frecuencias de 2, 3 y 4 días", () => {
  for (const sitio of ["casa", "gimnasio"] as const) {
    for (const dias of [2, 3, 4] as const) {
      const sesiones = sesionesDe(sitio, dias);
      assert.equal(sesiones.length, dias);

      const sem = semanaDeEntrenamiento(sitio, dias, "2026-11-02");
      assert.equal(sem.length, 7);
      const diasActivos = sem.filter((d) => d.entrena);
      assert.equal(diasActivos.length, dias);

      // Todos los ejercicios de las sesiones pertenecen al sitio indicado
      for (const sesion of sesiones) {
        for (const bloque of sesion.bloques) {
          for (const ejId of bloque) {
            const ej = EJERCICIOS.find((e) => e.id === ejId);
            assert.ok(ej, `Ejercicio ${ejId} debe existir`);
            assert.equal(ej.sitio, sitio);
            assert.match(ej.video, /^[A-Za-z0-9_-]{11}$/);
          }
        }
      }
    }
  }
});

test("sitioDeEntrenamiento y diasSugeridos según actividad de perfil", () => {
  assert.equal(sitioDeEntrenamiento("casa"), "casa");
  assert.equal(sitioDeEntrenamiento("gimnasio"), "gimnasio");
  assert.equal(sitioDeEntrenamiento(undefined), "casa");

  assert.equal(diasSugeridos("sedentario"), 2);
  assert.equal(diasSugeridos("ligero"), 2);
  assert.equal(diasSugeridos("moderado"), 3);
  assert.equal(diasSugeridos("alto"), 4);

  // proximoEntrenamiento encuentra el próximo día activo
  const prox = proximoEntrenamiento("casa", 3, "2026-11-02"); // Lunes
  assert.equal(prox.fecha, "2026-11-02");
  assert.equal(prox.dia, "Lunes");
});
