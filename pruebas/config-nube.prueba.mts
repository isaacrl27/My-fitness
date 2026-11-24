/**
 * Pruebas de la configuración de la nube (invitación y mantenimiento).
 *
 * Se ejecutan con:  node pruebas/config-nube.prueba.mts
 *
 * Lo que importa: que un dato raro no rompa nada, que el mantenimiento con
 * hora se apague solo, y que si Supabase no contesta la app siga abierta en
 * vez de quedarse cerrada por un fallo de la nube.
 */

import {
  CONFIG_VACIA,
  configDeFilas,
  leerConfigNube,
  mantenimientoVigente,
  olvidarConfig,
} from "../lib/config-nube.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.error(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

/* ------------------------------------------------------------------ */
/* Leer las filas de `secretos`                                        */
/* ------------------------------------------------------------------ */

igual(configDeFilas(null), CONFIG_VACIA, "sin filas, configuración vacía");
igual(configDeFilas([]), CONFIG_VACIA, "lista vacía, configuración vacía");
igual(configDeFilas("basura"), CONFIG_VACIA, "si llega basura, configuración vacía");

igual(
  configDeFilas([{ nombre: "otra_cosa", valor: "x" }]),
  CONFIG_VACIA,
  "las claves que no son nuestras se ignoran",
);

igual(
  configDeFilas([
    { nombre: "invitacion", valor: "  fam-abcdefghijklmnopqrstuvwxyz  " },
    { nombre: "mantenimiento", valor: '{"activo":true,"desde":"2026-10-25T10:00:00Z","hasta":""}' },
  ]),
  {
    invitacion: "fam-abcdefghijklmnopqrstuvwxyz",
    mantenimiento: { activo: true, desde: "2026-10-25T10:00:00Z", hasta: "" },
  },
  "la invitación se limpia de espacios y el mantenimiento se lee",
);

igual(
  configDeFilas([{ nombre: "mantenimiento", valor: "esto no es json" }]).mantenimiento,
  null,
  "un mantenimiento roto no vale, y no rompe la invitación",
);

igual(
  configDeFilas([{ nombre: "mantenimiento", valor: '{"activo":"si"}' }]).mantenimiento,
  { activo: false, desde: "", hasta: "" },
  "«activo» tiene que ser verdadero de verdad, no un texto",
);

igual(
  configDeFilas([{ nombre: "invitacion", valor: 42 }]).invitacion,
  "",
  "un valor que no es texto se ignora",
);

/* ------------------------------------------------------------------ */
/* Cuándo el mantenimiento sigue vigente                               */
/* ------------------------------------------------------------------ */

const AHORA = new Date("2026-10-25T12:00:00Z");

igual(mantenimientoVigente(null, AHORA), false, "sin mantenimiento, no hay nada que cortar");
igual(
  mantenimientoVigente({ activo: false, desde: "", hasta: "" }, AHORA),
  false,
  "apagado, la app va",
);
igual(
  mantenimientoVigente({ activo: true, desde: "", hasta: "" }, AHORA),
  true,
  "encendido sin hora, vale hasta que se apague a mano",
);
igual(
  mantenimientoVigente({ activo: true, desde: "", hasta: "2026-10-25T12:10:00Z" }, AHORA),
  true,
  "con una hora que aún no ha llegado, sigue encendido",
);
igual(
  mantenimientoVigente({ activo: true, desde: "", hasta: "2026-10-25T11:55:00Z" }, AHORA),
  false,
  "pasada la hora, se apaga solo",
);
igual(
  mantenimientoVigente({ activo: true, desde: "", hasta: "no es una fecha" }, AHORA),
  true,
  "una hora rota no deja la app abierta a medias: se trata como «sin hora»",
);

/* ------------------------------------------------------------------ */
/* Sin nube configurada                                                */
/* ------------------------------------------------------------------ */

const entorno = { ...process.env };
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
olvidarConfig();
igual(await leerConfigNube(), CONFIG_VACIA, "sin variables de Supabase, configuración vacía");

/* ------------------------------------------------------------------ */
/* Con la nube configurada                                             */
/* ------------------------------------------------------------------ */

process.env.SUPABASE_URL = "https://ejemplo.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "clave-de-prueba-que-no-vale-para-nada";

let respuesta: { ok: boolean; json: () => Promise<unknown> } | Error = {
  ok: true,
  json: async () => [{ nombre: "invitacion", valor: "fam-abcdefghijklmnopqrstuvwxyz" }],
};

// @ts-expect-error: se sustituye el fetch del entorno durante la prueba.
globalThis.fetch = async () => {
  if (respuesta instanceof Error) throw respuesta;
  return respuesta;
};

olvidarConfig();
igual(
  await leerConfigNube(1000),
  { invitacion: "fam-abcdefghijklmnopqrstuvwxyz", mantenimiento: null },
  "con la nube viva, se lee la invitación",
);

igual(
  await leerConfigNube(2000),
  { invitacion: "fam-abcdefghijklmnopqrstuvwxyz", mantenimiento: null },
  "dentro de los 10 segundos, se usa lo guardado",
);

// Se cambia la nube pero la caché sigue viva: no debe enterarse todavía.
respuesta = { ok: true, json: async () => [] };
igual(
  await leerConfigNube(5000),
  { invitacion: "fam-abcdefghijklmnopqrstuvwxyz", mantenimiento: null },
  "la caché aguanta los 10 segundos",
);

igual(await leerConfigNube(20_000), CONFIG_VACIA, "pasados los 10 segundos, se vuelve a preguntar");

// Si la nube falla, se deja pasar (configuración vacía) y no se guarda el fallo.
respuesta = new Error("sin red");
olvidarConfig();
igual(await leerConfigNube(30_000), CONFIG_VACIA, "si la nube peta, se deja pasar");

respuesta = { ok: true, json: async () => [{ nombre: "invitacion", valor: "fam-otra" }] };
igual(
  await leerConfigNube(31_000),
  { invitacion: "fam-otra", mantenimiento: null },
  "el fallo no se guarda: al siguiente intento se vuelve a preguntar",
);

if (entorno.SUPABASE_URL === undefined) delete process.env.SUPABASE_URL;
if (entorno.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
olvidarConfig();

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
