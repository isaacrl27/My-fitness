/**
 * Los topes de la IA por separado: texto, fotos y la banda global del día.
 * Se ejecutan con:  node pruebas/ia-tope.prueba.mts
 *
 * Antes todo contaba junto (15 consultas al día, fotos y texto pisándose).
 * Ahora: texto 30, fotos 10, y una banda global para toda la clave de Google.
 */

import {
  TOPE_FOTO,
  TOPE_GLOBAL,
  TOPE_TEXTO,
  bandaAlcanzada,
  usadasFotos,
  usadasTexto,
} from "../lib/ia-tope.ts";
import {
  ESPERA_GEMINI_MS,
  MODELOS_TEXTO_IA,
  MODELOS_VISION_IA,
  thinkingConfigDeModelo,
} from "../lib/gemini-modelos.ts";

const HOY = "2026-10-21";

let fallos = 0;
let hechas = 0;
function igual(valor: unknown, esperado: unknown, prueba: string): void {
  hechas += 1;
  const bien = JSON.stringify(valor) === JSON.stringify(esperado);
  if (!bien) {
    fallos += 1;
    console.error(
      `✗ ${prueba}\n   salió: ${JSON.stringify(valor)}\n   valía: ${JSON.stringify(esperado)}`,
    );
  }
}

igual(TOPE_TEXTO, 30, "texto: 30 consultas al día por persona");
igual(TOPE_FOTO, 10, "fotos: 10 al día por persona (7 comidas y algo de margen)");
igual(TOPE_GLOBAL, 250, "banda global: 250 al día para toda la clave compartida");

igual(
  usadasTexto({ usoIA: { fecha: HOY, usadas: 4 }, usoIAtexto: { fecha: HOY, usadas: 5 } }, HOY),
  9,
  "el texto suma el contador viejo compartido y el nuevo propio",
);
igual(
  usadasTexto({ usoIA: { fecha: "2026-10-20", usadas: 99 }, usoIAtexto: { fecha: HOY, usadas: 5 } }, HOY),
  5,
  "el contador viejo de otra fecha no cuenta",
);
igual(usadasTexto({}, HOY), 0, "sin nada escrito, cero");

igual(usadasFotos({ usoIAfoto: { fecha: HOY, usadas: 3 } }, HOY), 3, "las fotos llevan su cuenta propia");
igual(usadasFotos({}, HOY), 0, "sin fotos, cero");
igual(
  usadasFotos({ usoIAfoto: { fecha: "2026-10-20", usadas: 99 } }, HOY),
  0,
  "las fotos de ayer no cuentan hoy",
);

igual(bandaAlcanzada({ fecha: HOY, usadas: 250 }, HOY), true, "la banda cerrada del día corta");
igual(bandaAlcanzada({ fecha: HOY, usadas: 249 }, HOY), false, "un poco antes de la banda, aire");
igual(
  bandaAlcanzada({ fecha: "2026-10-20", usadas: 9999 }, HOY),
  false,
  "la banda de ayer no corta hoy",
);

{
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { extraerTextoCandidato } = await import("../lib/ia-alimentos.ts");

  igual(
    extraerTextoCandidato({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: "Primero analizo la esfera del reloj..." },
              { text: '{"pasos": 6200, "fcReposo": 58}' },
            ],
          },
        },
      ],
    }),
    '{"pasos": 6200, "fcReposo": 58}',
    "extraerTextoCandidato ignora bloques thought y conserva solo el JSON real",
  );

  igual(
    extraerTextoCandidato({
      candidates: [
        {
          content: {
            parts: [{ thought: true, text: "Solo pensamiento interno" }],
          },
        },
      ],
    }),
    null,
    "extraerTextoCandidato devuelve null si el modelo solo emitio pensamiento",
  );

  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const saludRuta = readFileSync(path.join(raiz, "app", "api", "ia", "salud", "route.ts"), "utf-8");
  const hoyPagina = readFileSync(path.join(raiz, "app", "(app)", "hoy", "page.tsx"), "utf-8");

  for (const [trozo, nombre] of [
    ["frenoSalud", "cooldown por IP en salud"],
    ["topeSalud", "tope horario por IP en salud"],
    ["topeSaludCuenta", "tope horario por usuario en salud"],
    ["topeSaludDiaCuenta", "tope diario por usuario en salud"],
    ["bandaCerrada", "banda ancha global en salud"],
    ["reservarVueloGlobal", "control de concurrencia global en salud"],
    ["anotarGlobal", "anotacion de gasto global en salud"],
    ["extraerTextoCandidato", "extraccion segura de respuesta sin pensamiento Gemini"],
    ["codigoValido", "validacion de codigo de usuario en salud"],
    ['if (candidato === "image/jpg") candidato = "image/jpeg";', "normalizacion JPEG en salud"],
    ['if (candidato === "image/heif") candidato = "image/heic";', "normalizacion HEIC en salud"],
  ] as const) {
    igual(saludRuta.includes(trozo), true, `salud/route.ts incluye ${nombre}`);
  }

  igual(
    hoyPagina.includes('fetch("/api/ia/salud"') && hoyPagina.includes("codigoNube"),
    true,
    "hoy/page.tsx identifica al usuario enviando codigoNube a /api/ia/salud",
  );

  // --- Modelos rápidos de Gemini + flujo 1-toque de foto en iPhone ---
  igual(MODELOS_VISION_IA[0], "gemini-3-flash-preview", "visión prioriza gemini-3-flash-preview");
  igual(MODELOS_TEXTO_IA[0], "gemini-3.5-flash-lite", "texto prioriza gemini-3.5-flash-lite");
  for (const malo of ["gemini-3.8-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite-preview"]) {
    igual(
      (MODELOS_VISION_IA as readonly string[]).includes(malo),
      false,
      `MODELOS_VISION_IA excluye el modelo lento o caído ${malo}`,
    );
    igual(
      (MODELOS_TEXTO_IA as readonly string[]).includes(malo),
      false,
      `MODELOS_TEXTO_IA excluye el modelo lento o caído ${malo}`,
    );
  }
  igual(ESPERA_GEMINI_MS <= 15_000, true, "ESPERA_GEMINI_MS acotado a <=15s para evitar esperas largas");
  igual(
    thinkingConfigDeModelo("gemini-3-flash-preview", "minima"),
    { thinkingLevel: "minimal" },
    "3-flash-preview plato usa thinkingLevel minimal",
  );
  igual(
    thinkingConfigDeModelo("gemini-3-flash-preview", "baja"),
    { thinkingLevel: "low" },
    "3-flash-preview etiqueta/salud usa thinkingLevel low",
  );
  igual(
    thinkingConfigDeModelo("gemini-2.5-flash", "minima"),
    { thinkingBudget: 0 },
    "2.5-flash fija thinkingBudget 0",
  );
  igual(
    thinkingConfigDeModelo("gemini-3.5-flash-lite", "minima"),
    undefined,
    "3.5-flash-lite no envía thinkingConfig innecesario",
  );

  const fotoRuta = readFileSync(path.join(raiz, "app", "api", "ia", "foto", "route.ts"), "utf-8");
  const textoRuta = readFileSync(path.join(raiz, "app", "api", "ia", "texto", "route.ts"), "utf-8");
  for (const [nombre, contenido] of [
    ["foto/route.ts", fotoRuta],
    ["texto/route.ts", textoRuta],
    ["salud/route.ts", saludRuta],
  ] as const) {
    igual(contenido.includes("export const maxDuration = 60"), true, `${nombre} fija maxDuration = 60`);
  }

  const hojaAnadir = readFileSync(path.join(raiz, "components", "app", "hoja-anadir.tsx"), "utf-8");
  igual(
    hojaAnadir.includes('accept="image/*,image/heic,image/heif"'),
    false,
    "hoja-anadir.tsx evita forzar HEIC crudo en el selector de iPhone",
  );
  igual(hojaAnadir.includes('accept="image/*"'), true, "hoja-anadir.tsx usa accept=\"image/*\"");
  igual(hojaAnadir.includes("autoFocus"), false, "hoja-anadir.tsx no saca el teclado automático tras hacer foto");
  igual(
    hojaAnadir.includes("recalcularFotoAnalizada"),
    true,
    "hoja-anadir.tsx analiza en 1 toque y deja recalcular con detalles después",
  );
}

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
