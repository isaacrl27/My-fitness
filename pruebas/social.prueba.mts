import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularKgPerdidosGrupo,
  progresoMetaGrupo,
  generarCodigoGrupo,
  normalizarCodigoGrupo,
  validarNombreGrupo,
  validarItemCompra,
  crearGrupoInicial,
  anadirMiembroAGrupo,
  anadirItemCompra,
  anadirLoteCompra,
  alternarItemCompra,
  borrarItemCompra,
  anadirReaccion,
  generarCodigoHogar,
  normalizarCodigoHogar,
  crearCompraHogarInicial,
  anadirMiembroAHogar,
  anadirItemCompraHogar,
  anadirLoteCompraHogar,
  alternarItemCompraHogar,
  borrarItemCompraHogar,
  limpiarCompradosHogar,
  migrarGruposLocales,
  contarMisHabitosSemana,
  calcularHabitosGrupo,
  baseDeMiembro,
  nuevoCodigoMiembro,
  esCodigoDeRecuperacion,
  codigoDeMiembro,
  ordenarMiembrosDeGrupo,
  type GrupoFamiliar,
  type MiembroGrupo,
} from "../lib/social.ts";

test("generar y normalizar código de grupo", () => {
  const cod = generarCodigoGrupo();
  assert.match(cod, /^FAM-[A-Z0-9]{3}$/);

  assert.equal(normalizarCodigoGrupo("fam-842"), "FAM-842");
  assert.equal(normalizarCodigoGrupo("FAM842"), "FAM-842");
  assert.equal(normalizarCodigoGrupo("842"), "FAM-842");
  assert.equal(normalizarCodigoGrupo("  FAM-ABC  "), "FAM-ABC");
  assert.equal(normalizarCodigoGrupo(""), "");
});

test("validación de nombres de grupo e items de compra", () => {
  assert.equal(validarNombreGrupo("Fam").ok, true);
  assert.equal(validarNombreGrupo("Familia Rodríguez").ok, true);
  assert.equal(validarNombreGrupo("Fa").ok, false);
  assert.equal(validarNombreGrupo("   ").ok, false);

  assert.equal(validarItemCompra("Huevos").ok, true);
  assert.equal(validarItemCompra("Pechuga de pavo").ok, true);
  assert.equal(validarItemCompra("H").ok, false);
  assert.equal(validarItemCompra("").ok, false);
});

test("cálculo de kilos perdidos del grupo y progreso", () => {
  const miembros: MiembroGrupo[] = [
    {
      codigo: "m1",
      nombre: "Isaac",
      avatar: "🦁",
      racha: 5,
      habitosHoy: 4,
      habitosTotal: 5,
      kgAportados: 2.3,
      actualizado: "2026-10-25T12:00:00Z",
    },
    {
      codigo: "m2",
      nombre: "Ainhoa",
      avatar: "🥑",
      racha: 7,
      habitosHoy: 5,
      habitosTotal: 5,
      kgAportados: 1.8,
      actualizado: "2026-10-25T12:00:00Z",
    },
  ];

  const total = calcularKgPerdidosGrupo(miembros);
  assert.equal(total, 4.1);

  const progreso = progresoMetaGrupo(total, 10);
  assert.equal(progreso, 41);

  // Casos extremos
  assert.equal(progresoMetaGrupo(15, 10), 100);
  assert.equal(progresoMetaGrupo(0, 10), 0);
  assert.equal(progresoMetaGrupo(5, 0), 0);
});

test("creación y mutaciones del grupo familiar", () => {
  let grupo = crearGrupoInicial("Los Gómez", { codigo: "gomez1", nombre: "Papá", avatar: "🥑" }, 8);
  assert.equal(grupo.nombre, "Los Gómez");
  assert.equal(grupo.metaKg, 8);
  assert.equal(grupo.miembros.length, 1);
  assert.equal(grupo.miembros[0].nombre, "Papá");

  // Añadir miembro
  grupo = anadirMiembroAGrupo(grupo, {
    codigo: "gomez2",
    nombre: "Mamá",
    avatar: "🌱",
    racha: 3,
    habitosHoy: 2,
    habitosTotal: 5,
    kgAportados: 1.5,
    actualizado: "2026-10-25T12:00:00Z",
  });
  assert.equal(grupo.miembros.length, 2);

  // Lista de compra
  grupo = anadirItemCompra(grupo, "Leche de avena", "2 bricks");
  assert.equal(grupo.compra.length, 1);
  assert.equal(grupo.compra[0].nombre, "Leche de avena");
  assert.equal(grupo.compra[0].comprado, false);

  const itemId = grupo.compra[0].id;

  // Marcar como comprado
  grupo = alternarItemCompra(grupo, itemId, "Mamá");
  assert.equal(grupo.compra[0].comprado, true);
  assert.equal(grupo.compra[0].compradoPor, "Mamá");

  // Desmarcar
  grupo = alternarItemCompra(grupo, itemId, "Papá");
  assert.equal(grupo.compra[0].comprado, false);
  assert.equal(grupo.compra[0].compradoPor, null);

  // Añadir reacción
  grupo = anadirReaccion(grupo, {
    deCodigo: "gomez1",
    deNombre: "Papá",
    paraCodigo: "gomez2",
    tipo: "cinco",
  });
  assert.equal(grupo.reacciones.length, 1);
  assert.equal(grupo.reacciones[0].tipo, "cinco");
  assert.equal(grupo.reacciones[0].deNombre, "Papá");

  // Borrar item compra
  grupo = borrarItemCompra(grupo, itemId);
  assert.equal(grupo.compra.length, 0);

  // Añadir por lote sin duplicar
  grupo = anadirLoteCompra(grupo, [
    { nombre: "Huevos", cantidad: "1 docena" },
    { nombre: "Pollo", cantidad: "500 g" },
    { nombre: "Huevos", cantidad: "otra docena" }, // duplicado ignorado
  ]);
  assert.equal(grupo.compra.length, 2);
  assert.equal(grupo.compra.some((i) => i.nombre === "Huevos"), true);
  assert.equal(grupo.compra.some((i) => i.nombre === "Pollo"), true);
});

test("código y gestión independiente de la compra del hogar", () => {
  const cod = generarCodigoHogar();
  assert.match(cod, /^HOG-[A-Z0-9]{3}$/);

  assert.equal(normalizarCodigoHogar("hog-924"), "HOG-924");
  assert.equal(normalizarCodigoHogar("HOG924"), "HOG-924");
  assert.equal(normalizarCodigoHogar("924"), "HOG-924");
  assert.equal(normalizarCodigoHogar("  HOG-XYZ  "), "HOG-XYZ");
  assert.equal(normalizarCodigoHogar(""), "");

  let hogar = crearCompraHogarInicial("Piso Isaac", { codigo: "u1", nombre: "Isaac" });
  assert.equal(hogar.nombre, "Piso Isaac");
  assert.equal(hogar.miembros.length, 1);
  assert.equal(hogar.items.length, 0);

  // Añadir miembro
  hogar = anadirMiembroAHogar(hogar, { codigo: "u2", nombre: "Mamá" });
  assert.equal(hogar.miembros.length, 2);

  // Añadir items
  hogar = anadirItemCompraHogar(hogar, "Leche entera", "2L");
  assert.equal(hogar.items.length, 1);
  assert.equal(hogar.items[0].nombre, "Leche entera");
  assert.equal(hogar.items[0].comprado, false);

  const itemId = hogar.items[0].id;

  // Marcar comprado
  hogar = alternarItemCompraHogar(hogar, itemId, "Isaac");
  assert.equal(hogar.items[0].comprado, true);
  assert.equal(hogar.items[0].compradoPor, "Isaac");

  // Añadir lote sin duplicar
  hogar = anadirLoteCompraHogar(hogar, [
    { nombre: "Huevos", cantidad: "1 docena" },
    { nombre: "Arroz", cantidad: "1 kg" },
    { nombre: "Huevos", cantidad: "2 docenas" },
  ]);
  assert.equal(hogar.items.length, 3);

  // Limpiar comprados
  hogar = limpiarCompradosHogar(hogar);
  assert.equal(hogar.items.length, 2);
  assert.equal(hogar.items.some((i) => i.id === itemId), false);

  // Borrar item individual
  const arrozId = hogar.items.find((i) => i.nombre === "Arroz")!.id;
  hogar = borrarItemCompraHogar(hogar, arrozId);
  assert.equal(hogar.items.length, 1);
  assert.equal(hogar.items[0].nombre, "Huevos");
});

test("migración de grupos locales a multi-grupo", () => {
  const viejo = JSON.stringify({
    codigo: "FAM-123",
    nombre: "Los Serrano",
    creadorCodigo: "u1",
    miembros: [],
    compra: [],
  });

  // Migración desde formato antiguo a array
  const migrados = migrarGruposLocales(viejo, null);
  assert.equal(migrados.length, 1);
  assert.equal(migrados[0].codigo, "FAM-123");

  // Si ya tiene el formato nuevo, no toca nada
  const nuevo = JSON.stringify([
    { codigo: "FAM-123", nombre: "Los Serrano" },
    { codigo: "FAM-456", nombre: "Gym Bro" },
  ]);
  const preservados = migrarGruposLocales(viejo, nuevo);
  assert.equal(preservados.length, 2);
  assert.equal(preservados[1].codigo, "FAM-456");
});

test("contarMisHabitosSemana y cálculo de hábitos grupales", () => {
  // Lunes 2026-10-19 a Domingo 2026-10-25
  const habitos: Record<string, string[]> = {
    "2026-10-18": ["h1"], // domingo anterior (no cuenta)
    "2026-10-19": ["h1", "h2"], // lunes
    "2026-10-20": ["h1", "h2", "h3"], // martes
    "2026-10-21": ["h1"], // miércoles
    "2026-10-22": [], // jueves
  };

  const cuentaMiercoles = contarMisHabitosSemana(habitos, "2026-10-21");
  assert.equal(cuentaMiercoles, 6); // 2 + 3 + 1 = 6

  const cuentaJueves = contarMisHabitosSemana(habitos, "2026-10-22");
  assert.equal(cuentaJueves, 6);

  // Miembros en grupo con habitosSemana
  const miembros: MiembroGrupo[] = [
    {
      codigo: "u1",
      nombre: "Isaac",
      avatar: "🥑",
      racha: 5,
      habitosHoy: 2,
      habitosTotal: 5,
      habitosSemana: 14,
      kgAportados: 1.2,
      actualizado: "2026-10-22T10:00:00.000Z",
    },
    {
      codigo: "u2",
      nombre: "Marta",
      avatar: "🦁",
      racha: 3,
      habitosHoy: 3,
      habitosTotal: 5,
      habitosSemana: 10,
      kgAportados: 0.5,
      actualizado: "2026-10-22T10:00:00.000Z",
    },
  ];

  assert.equal(calcularHabitosGrupo(miembros), 24);
});

/* ------------------------------------------------------------------ */
/* Quién es quién en el grupo: identidad y fichas repetidas            */
/* ------------------------------------------------------------------ */

function miembro(
  codigo: string,
  nombre: string,
  actualizado = "2026-10-01T10:00:00.000Z",
): MiembroGrupo {
  return {
    codigo,
    nombre,
    avatar: "🌱",
    racha: 0,
    habitosHoy: 0,
    habitosTotal: 5,
    habitosSemana: 0,
    kgAportados: 0,
    actualizado,
  };
}

function grupoDePrueba(
  miembros: MiembroGrupo[],
  creadorCodigo = miembros[0]?.codigo ?? "",
): GrupoFamiliar {
  return {
    id: "grp_prueba",
    codigo: "FAM-TST",
    nombre: "Familia de prueba",
    creadorCodigo,
    metaKg: 60,
    mes: "2026-10",
    miembros,
    reacciones: [],
    compra: [],
    actualizado: "2026-10-01T10:00:00.000Z",
  };
}

test("baseDeMiembro limpia tildes, mayúsculas y signos", () => {
  assert.equal(baseDeMiembro("Ainhoa Pérez"), "ainhoaperez");
  assert.equal(baseDeMiembro("  Isaac  "), "isaac");
  assert.equal(baseDeMiembro("Ñandú"), "nandu");
  assert.equal(baseDeMiembro(""), "familiar");
  assert.equal(baseDeMiembro("!!! "), "familiar");
});

test("nuevoCodigoMiembro lleva el nombre y no parece código de recuperación", () => {
  const codigo = nuevoCodigoMiembro("Ainhoa", "abc12");
  assert.equal(codigo, "ainhoa_abc12");
  assert.equal(esCodigoDeRecuperacion(codigo), false);
});

test("esCodigoDeRecuperacion reconoce los seis caracteres de la cuenta", () => {
  assert.equal(esCodigoDeRecuperacion("BCD234"), true);
  assert.equal(esCodigoDeRecuperacion("BCD234"), true);
  assert.equal(esCodigoDeRecuperacion("ainhoa_pdbx0"), false);
  assert.equal(esCodigoDeRecuperacion("ABC"), false);
  assert.equal(esCodigoDeRecuperacion("bcd234"), false);
});

test("codigoDeMiembro respeta el guardado y adopta la ficha que ya existe", () => {
  // Lo que el móvil ya tiene guardado manda: cambiarlo duplicaría la ficha.
  assert.equal(codigoDeMiembro("Ainhoa", "ainhoa_vieja", []), "ainhoa_vieja");

  const grupos = [
    grupoDePrueba([
      miembro("ainhoa_1", "Ainhoa", "2026-10-01T10:00:00.000Z"),
      miembro("ainhoa_2", "Ainhoa", "2026-10-20T10:00:00.000Z"),
      miembro("CGF7U4", "Ainhoa", "2026-10-25T10:00:00.000Z"),
    ]),
    grupoDePrueba([miembro("isaac_1", "Isaac")]),
  ];

  // Sin nada guardado se queda con la ficha más reciente con su nombre, y
  // nunca con un código de recuperación (ese abre la cuenta).
  assert.equal(codigoDeMiembro("Ainhoa", null, grupos), "ainhoa_2");
  assert.equal(codigoDeMiembro("AINHOA", "", grupos), "ainhoa_2");
  assert.equal(codigoDeMiembro("Isaac", null, grupos), "isaac_1");

  // Si el código guardado ya no está en el grupo (se limpió una ficha
  // repetida), adopta la que quede con su nombre en vez de crear otra.
  assert.equal(codigoDeMiembro("Ainhoa", "ainhoa_borrada", grupos), "ainhoa_2");
  // Y si sigue estando, se respeta aunque haya otra más reciente.
  assert.equal(codigoDeMiembro("Ainhoa", "ainhoa_1", grupos), "ainhoa_1");
});

test("codigoDeMiembro inventa uno nuevo cuando no hay nada que adoptar", () => {
  const codigo = codigoDeMiembro("Naiara", null, []);
  assert.match(codigo, /^naiara_[a-z0-9]+$/);
  assert.equal(esCodigoDeRecuperacion(codigo), false);
});

test("ordenarMiembrosDeGrupo deja una ficha por persona y arregla reacciones", () => {
  const grupo = grupoDePrueba(
    [
      miembro("BCD234", "Isaac", "2026-10-29T21:05:00.000Z"),
      miembro("familiar_di9xr", "Isaac", "2026-10-31T17:40:00.000Z"),
      miembro("isaac", "Isaac", "2026-10-31T16:47:00.000Z"),
      miembro("CGF7U4", "Ainhoa", "2026-10-30T07:52:00.000Z"),
      miembro("ainhoa_pdbx0", "Ainhoa", "2026-11-02T08:45:00.000Z"),
      miembro("ainhoa", "Ainhoa", "2026-11-02T09:00:00.000Z"),
    ],
    "BCD234",
  );
  grupo.reacciones = [
    {
      id: "r1",
      deCodigo: "CGF7U4",
      deNombre: "Ainhoa",
      paraCodigo: "BCD234",
      tipo: "cinco",
      fecha: "2026-10-26T10:00:00.000Z",
    },
    {
      id: "r2",
      deCodigo: "ainhoa",
      deNombre: "Ainhoa",
      paraCodigo: "isaac",
      tipo: "cinco",
      fecha: "2026-10-26T10:00:00.000Z",
    },
    {
      id: "r3",
      deCodigo: "CGF7U4",
      deNombre: "Ainhoa",
      paraCodigo: "BCD234",
      tipo: "animo",
      fecha: "2026-10-27T10:00:00.000Z",
    },
  ];

  const limpio = ordenarMiembrosDeGrupo(grupo);

  assert.equal(limpio.miembros.length, 2);
  assert.deepEqual(
    limpio.miembros.map((m) => m.nombre).sort(),
    ["Ainhoa", "Isaac"],
  );

  // Se queda con la ficha más reciente de cada uno.
  const isaac = limpio.miembros.find((m) => m.nombre === "Isaac");
  const ainhoa = limpio.miembros.find((m) => m.nombre === "Ainhoa");
  assert.equal(isaac?.codigo, "familiar_di9xr");
  assert.equal(ainhoa?.codigo, "ainhoa");

  // El creador y las reacciones apuntan a la ficha que se queda, y las dos
  // reacciones que acababan en lo mismo se quedan en una.
  assert.equal(limpio.creadorCodigo, "familiar_di9xr");
  assert.equal(limpio.reacciones.length, 2);
  for (const r of limpio.reacciones) {
    assert.equal(r.deCodigo, "ainhoa");
    assert.equal(r.paraCodigo, "familiar_di9xr");
  }
});

test("ordenarMiembrosDeGrupo no toca un grupo que ya está limpio", () => {
  const grupo = grupoDePrueba([miembro("isaac_1", "Isaac")]);
  assert.equal(ordenarMiembrosDeGrupo(grupo), grupo);
});

test("ordenarMiembrosDeGrupo saca a la vista los códigos de recuperación", () => {
  const grupo = grupoDePrueba([miembro("FV3B6E", "Alejandro")], "FV3B6E");
  const limpio = ordenarMiembrosDeGrupo(grupo);

  assert.match(limpio.miembros[0].codigo, /^alejandro_[a-z0-9]+$/);
  assert.equal(esCodigoDeRecuperacion(limpio.miembros[0].codigo), false);
  assert.equal(limpio.creadorCodigo, limpio.miembros[0].codigo);
});

test("ordenarMiembrosDeGrupo preserva el emoticono elegido aunque entre una sincronización con fallback", () => {
  const grupo = grupoDePrueba([
    {
      ...miembro("christian_sxsgk", "Christian", "2026-10-30T10:00:00.000Z"),
      avatar: "🥊",
    },
    {
      ...miembro("christian", "Christian", "2026-11-02T15:00:00.000Z"),
      avatar: "🌱",
    },
    {
      ...miembro("lola_1", "Lola", "2026-11-01T10:00:00.000Z"),
      avatar: "🥑",
    },
  ]);

  const limpio = ordenarMiembrosDeGrupo(grupo);
  assert.equal(limpio.miembros.length, 2);

  const christian = limpio.miembros.find((m) => m.nombre === "Christian");
  const lola = limpio.miembros.find((m) => m.nombre === "Lola");

  // El guante de boxeo no se debe perder por la sincronización posterior
  assert.equal(christian?.avatar, "🥊");
  assert.equal(lola?.avatar, "🥑");
});

test("ordenarMiembrosDeGrupo respeta un cambio voluntario a un nuevo emoticono", () => {
  const grupo = grupoDePrueba([
    {
      ...miembro("isaac_1", "Isaac", "2026-10-01T10:00:00.000Z"),
      avatar: "🥑",
    },
    {
      ...miembro("isaac_1", "Isaac", "2026-11-03T10:00:00.000Z"),
      avatar: "🔥",
    },
  ]);

  const limpio = ordenarMiembrosDeGrupo(grupo);
  assert.equal(limpio.miembros.length, 1);
  assert.equal(limpio.miembros[0].avatar, "🔥");
});

test("anadirMiembroAGrupo actualiza en sitio cuando coincide el nombre para evitar duplicados", () => {
  let grupo = grupoDePrueba([
    {
      ...miembro("christian_sxsgk", "Christian", "2026-10-30T10:00:00.000Z"),
      avatar: "🥊",
    },
  ]);

  // Si entra una sincronización con otro código derivado del mismo nombre
  grupo = anadirMiembroAGrupo(grupo, {
    ...miembro("christian", "Christian", "2026-11-03T12:00:00.000Z"),
    avatar: "🥊",
    habitosHoy: 4,
  });

  assert.equal(grupo.miembros.length, 1);
  assert.equal(grupo.miembros[0].habitosHoy, 4);
  assert.equal(grupo.miembros[0].avatar, "🥊");
});

test("privacidad de avatar: cada miembro conserva su avatar y no se altera el de otros", () => {
  let grupo = grupoDePrueba([
    {
      ...miembro("isaac_1", "Isaac", "2026-11-03T10:00:00.000Z"),
      avatar: "🔥",
    },
    {
      ...miembro("ainhoa_2", "Ainhoa", "2026-11-03T10:00:00.000Z"),
      avatar: "🥑",
    },
  ]);

  // Isaac actualiza su avatar a 🦁
  grupo = anadirMiembroAGrupo(grupo, {
    ...miembro("isaac_1", "Isaac", "2026-11-03T12:00:00.000Z"),
    avatar: "🦁",
  });

  const limpio = ordenarMiembrosDeGrupo(grupo);
  const ainhoa = limpio.miembros.find((m) => m.nombre === "Ainhoa");
  const isaac = limpio.miembros.find((m) => m.nombre === "Isaac");

  assert.equal(isaac?.avatar, "🦁");
  assert.equal(ainhoa?.avatar, "🥑");
});
