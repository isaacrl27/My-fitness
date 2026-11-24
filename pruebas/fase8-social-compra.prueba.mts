/**
 * Pruebas Fase 8: Familia, Compra Compartida del Hogar, Protección de Identidad y Puntos/Tienda.
 * Se ejecutan con: `node pruebas/fase8-social-compra.prueba.mts`
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  esCodigoDeRecuperacion,
  ordenarMiembrosDeGrupo,
  ordenarMiembrosDeHogar,
  limpiarCompradosGrupo,
  anadirItemCompra,
  anadirLoteCompra,
  alternarItemCompra,
  crearGrupoInicial,
  crearCompraHogarInicial,
  anadirItemCompraHogar,
  alternarItemCompraHogar,
  borrarItemCompraHogar,
  limpiarCompradosHogar,
  type GrupoFamiliar,
  type CompraHogar,
} from "../lib/social.ts";

import {
  puntosDelDia,
  saldoPuntos,
  kcalObjetivoDelDia,
} from "../lib/puntos.ts";

import { diasDeEspera, recomendarCapricho } from "../lib/tienda.ts";

// ---------------------------------------------------------------------------
// 1. PRIVACIDAD Y PROTECCIÓN DE CÓDIGOS DE CUENTA
// ---------------------------------------------------------------------------

test("esCodigoDeRecuperacion reconoce códigos de cuenta de 6 caracteres", () => {
  assert.equal(esCodigoDeRecuperacion("BCD234"), true);
  assert.equal(esCodigoDeRecuperacion("BCD234"), true);
  assert.equal(esCodigoDeRecuperacion("999ZZZ"), true);
  assert.equal(esCodigoDeRecuperacion("bcd234"), false); // minúsculas no es recuperación estándar
  assert.equal(esCodigoDeRecuperacion("isaac_12345"), false);
  assert.equal(esCodigoDeRecuperacion("FAM-842"), false);
});

test("ordenarMiembrosDeGrupo elimina códigos de cuenta de 6 letras expuestos", () => {
  const grupoConFuga: GrupoFamiliar = {
    id: "grp_test",
    codigo: "FAM-999",
    nombre: "Familia Gómez",
    creadorCodigo: "BCD234", // Código de cuenta filtrado
    metaKg: 50,
    mes: "2026-11",
    miembros: [
      {
        codigo: "BCD234", // Mismo código secreto expuesto como miembro
        nombre: "Isaac",
        avatar: "🦁",
        racha: 4,
        habitosHoy: 3,
        habitosTotal: 5,
        kgAportados: 0,
        actualizado: "2026-11-02T10:00:00Z",
      },
      {
        codigo: "ainhoa_abc12",
        nombre: "Ainhoa",
        avatar: "🥑",
        racha: 5,
        habitosHoy: 4,
        habitosTotal: 5,
        kgAportados: 0,
        actualizado: "2026-11-02T10:00:00Z",
      },
    ],
    reacciones: [
      {
        id: "r1",
        deCodigo: "ainhoa_abc12",
        deNombre: "Ainhoa",
        paraCodigo: "BCD234",
        tipo: "cinco",
        fecha: "2026-11-02T10:05:00Z",
      },
    ],
    compra: [],
    actualizado: "2026-11-02T10:00:00Z",
  };

  const blindado = ordenarMiembrosDeGrupo(grupoConFuga);

  // Ningún miembro ni creador debe tener el código de cuenta
  assert.equal(esCodigoDeRecuperacion(blindado.creadorCodigo), false);
  const miembroIsaac = blindado.miembros.find((m) => m.nombre === "Isaac");
  assert.ok(miembroIsaac);
  assert.equal(esCodigoDeRecuperacion(miembroIsaac.codigo), false);
  assert.match(miembroIsaac.codigo, /^isaac_[a-z0-9]+$/);

  // El creador apunta al nuevo código seguro
  assert.equal(blindado.creadorCodigo, miembroIsaac.codigo);

  // Las reacciones se reescriben para apuntar al nuevo código seguro
  assert.equal(blindado.reacciones[0].paraCodigo, miembroIsaac.codigo);
});

test("ordenarMiembrosDeHogar elimina códigos de cuenta de miembros y creador", () => {
  const hogarConFuga: CompraHogar = {
    id: "hog_123",
    codigo: "HOG-777",
    nombre: "Casa Compartida",
    creadorCodigo: "CGF7U4", // Código de 6 letras expuesto
    miembros: [
      { codigo: "CGF7U4", nombre: "Yo", avatar: "🏡" },
      { codigo: "familiar_x98", nombre: "Mamá", avatar: "🥑" },
    ],
    items: [],
    actualizado: "2026-11-02T10:00:00Z",
  };

  const saneado = ordenarMiembrosDeHogar(hogarConFuga);
  assert.equal(esCodigoDeRecuperacion(saneado.creadorCodigo), false);
  assert.equal(esCodigoDeRecuperacion(saneado.miembros[0].codigo), false);
  assert.match(saneado.miembros[0].codigo, /^yo_[a-z0-9]+$/);
  assert.equal(saneado.miembros[1].codigo, "familiar_x98");
});

// ---------------------------------------------------------------------------
// 2. LISTA DE LA COMPRA COMPARTIDA EN GRUPO Y HOGAR
// ---------------------------------------------------------------------------

test("limpiarCompradosGrupo elimina atómicamente los items tachados", () => {
  let g = crearGrupoInicial("Piso", { codigo: "usr_1", nombre: "Isaac" });
  g = anadirItemCompra(g, "Plátanos", "1 kg");
  g = anadirItemCompra(g, "Pechuga de pollo", "500 g");
  assert.equal(g.compra.length, 2);

  const polloId = g.compra.find((i) => i.nombre === "Pechuga de pollo")!.id;
  g = alternarItemCompra(g, polloId, "Isaac");
  assert.equal(g.compra.find((i) => i.id === polloId)?.comprado, true);

  g = limpiarCompradosGrupo(g);
  assert.equal(g.compra.length, 1);
  assert.equal(g.compra[0].nombre, "Plátanos");
  assert.equal(g.compra[0].comprado, false);
});

test("anadirLoteCompra evita duplicados pendientes y conserva cantidades", () => {
  let g = crearGrupoInicial("Piso", { codigo: "usr_1", nombre: "Isaac" });
  g = anadirLoteCompra(g, [
    { nombre: "Huevos", cantidad: "1 docena" },
    { nombre: "Arroz", cantidad: "1 paquete" },
    { nombre: "Huevos", cantidad: "2 docenas" }, // duplicado
  ]);
  assert.equal(g.compra.length, 2);
  assert.equal(g.compra.filter((i) => i.nombre.toLowerCase() === "huevos").length, 1);
});

test("compra del hogar independiente: alternar, limpiar y borrar", () => {
  let h = crearCompraHogarInicial("Piso Centro", { codigo: "u1", nombre: "Isaac" });
  h = anadirItemCompraHogar(h, "Café en grano", "250 g");
  h = anadirItemCompraHogar(h, "Avena", "1 paquete");

  const cafeId = h.items.find((i) => i.nombre === "Café en grano")!.id;
  h = alternarItemCompraHogar(h, cafeId, "Ainhoa");
  assert.equal(h.items.find((i) => i.id === cafeId)?.comprado, true);
  assert.equal(h.items.find((i) => i.id === cafeId)?.compradoPor, "Ainhoa");

  h = limpiarCompradosHogar(h);
  assert.equal(h.items.length, 1);
  assert.equal(h.items[0].nombre, "Avena");

  const avenaId = h.items[0].id;
  h = borrarItemCompraHogar(h, avenaId);
  assert.equal(h.items.length, 0);
});

// ---------------------------------------------------------------------------
// 3. PUNTOS Y TIENDA DE CAPRICHOS (BLINDADOS ANTE DST)
// ---------------------------------------------------------------------------

test("puntos del día respetan el 85% de calorías y el margen del capricho", () => {
  const diaBase = {
    kcalComidas: 1700,
    kcalObjetivo: 2000, // 85% es 1700
    proteinasComidas: 102,
    proteinasObjetivo: 120, // 85% es 102
    aguaL: 2,
    metaAguaL: 2,
    sePeso: true,
    esCapricho: false,
    habitosHechos: 5,
    habitosActivos: 5,
  };

  const resultado85 = puntosDelDia(diaBase);
  assert.equal(resultado85.desglose.comida, 40);
  assert.equal(resultado85.desglose.proteina, 25);
  assert.equal(resultado85.total, 125);

  // Con 1699 kcal (por debajo del 85%), no gana puntos de comida
  const resultadoBajo = puntosDelDia({ ...diaBase, kcalComidas: 1699 });
  assert.equal(resultadoBajo.desglose.comida, 0);

  // Con capricho, el objetivo se amplía con MARGEN_CAPRICHO_KCAL (600 kcal)
  assert.equal(kcalObjetivoDelDia(2000, true), 2600);
  const conCapricho = puntosDelDia({
    ...diaBase,
    kcalComidas: 2700, // dentro del 110% de 2600 (tope 2860)
    esCapricho: true,
  });
  assert.equal(conCapricho.desglose.comida, 40);
});

test("diasDeEspera y recomendacion de capricho resistentes a cambio de hora (DST)", () => {
  const caprichos = ["2026-10-25"]; // Domingo de cambio de hora en España
  const hoyLunes = "2026-10-26"; // 1 día después
  const hoyMiercoles = "2026-10-28"; // 3 días después
  const hoyViernes = "2026-10-30"; // 5 días después (enfriamiento cumplido)

  assert.equal(diasDeEspera(caprichos, hoyLunes), 4);
  assert.equal(diasDeEspera(caprichos, hoyMiercoles), 2);
  assert.equal(diasDeEspera(caprichos, hoyViernes), 0);

  const perfil = {
    ejercicioSitio: "casa",
    ejercicioDias: 3,
    actividad: "ligero",
  } as never;

  const recViernes = recomendarCapricho(perfil, hoyViernes, caprichos);
  assert.ok(recViernes.texto.length > 0);
});

test("saldoPuntos respeta el tope de 750 y el descuento de 500 al canjear", () => {
  const datos = {
    comidas: [
      { fecha: "2026-11-01", kcal: 2000, proteinas: 130 },
      { fecha: "2026-11-02", kcal: 2000, proteinas: 130 },
      { fecha: "2026-11-03", kcal: 2000, proteinas: 130 },
      { fecha: "2026-11-04", kcal: 2000, proteinas: 130 },
      { fecha: "2026-11-05", kcal: 2000, proteinas: 130 },
    ],
    aguaLitros: {
      "2026-11-01": 2,
      "2026-11-02": 2,
      "2026-11-03": 2,
      "2026-11-04": 2,
      "2026-11-05": 2,
    },
    pesadas: [
      { fecha: "2026-11-01", kg: 75 },
      { fecha: "2026-11-02", kg: 75 },
      { fecha: "2026-11-03", kg: 75 },
      { fecha: "2026-11-04", kg: 75 },
      { fecha: "2026-11-05", kg: 75 },
    ],
  };

  const objetivos = { kcal: 2000, proteinas: 120, aguaL: 2, habitosActivos: 0 };
  // 5 días perfectos de 100 pts = 500 puntos
  const res = saldoPuntos(datos, objetivos, [], "2026-11-05");
  assert.equal(res.saldo, 500);
  assert.equal(res.puedeCanjear, true);

  // Canjeado el 2026-11-05: 500 - 500 = 0 puntos
  const resCanjeado = saldoPuntos(datos, objetivos, ["2026-11-05"], "2026-11-05");
  assert.equal(resCanjeado.saldo, 0);
  assert.equal(resCanjeado.puedeCanjear, false);
});

test("Detección de RPC ausente vs errores reales de Supabase", async () => {
  const { esFuncionRpcAusente } = await import("../lib/nube-mapeo.ts");
  assert.equal(esFuncionRpcAusente({ code: "PGRST202" }), true);
  assert.equal(esFuncionRpcAusente({ code: "42883" }), true);
  assert.equal(esFuncionRpcAusente({ message: "Could not find the function public.mutar_grupo" }), true);
  assert.equal(esFuncionRpcAusente({ message: "function does not exist" }), true);
  assert.equal(esFuncionRpcAusente({ code: "23505", message: "duplicate key value" }), false);
  assert.equal(esFuncionRpcAusente(null), false);
});

test("Contrato Fase 7: creación sin colisiones, persistencia fail-closed y fallback RPC seguro", async () => {
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const grupoRoute = readFileSync(path.join(raiz, "app", "api", "social", "grupo", "route.ts"), "utf-8");
  const compraRoute = readFileSync(path.join(raiz, "app", "api", "social", "compra", "route.ts"), "utf-8");

  assert.equal(grupoRoute.includes("crearGrupoSinColision"), true);
  assert.equal(grupoRoute.includes('.from("secretos").insert('), true);
  assert.equal(grupoRoute.includes('error.code !== "23505"'), true);
  assert.equal(grupoRoute.includes('{ onConflict: "nombre" }'), true);
  assert.equal(grupoRoute.includes("persistirGrupoORespuesta"), true);
  assert.equal(grupoRoute.includes("{ status: 500 }"), true);
  assert.equal(grupoRoute.includes("if (esFuncionRpcAusente(error)) return undefined;"), true);

  assert.equal(compraRoute.includes("crearHogarSinColision"), true);
  assert.equal(compraRoute.includes('.from("secretos").insert('), true);
  assert.equal(compraRoute.includes('error.code !== "23505"'), true);
});
