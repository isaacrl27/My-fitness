/**
 * Pruebas del tema de la app (claro / oscuro / como el móvil).
 * Se ejecutan con: `node pruebas/tema.prueba.mts`
 *
 * Comprueba la lógica pura, el oyente en vivo del esquema del sistema y la
 * ejecución real de `SCRIPT_TEMA` cuando el móvil cambia entre día y noche.
 */

import {
  aplicarTema,
  CLAVE_TEMA,
  COLOR_TEMA_CLARO,
  COLOR_TEMA_OSCURO,
  escucharCambioTemaSistema,
  esOscuro,
  guardarTema,
  normalizarTema,
  SCRIPT_TEMA,
} from "../lib/tema.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(
      `FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`,
    );
  }
}

/* 1. Lo guardado solo puede ser tres cosas; lo demás cae en «como el móvil». */
igual(normalizarTema("claro"), "claro", "claro se respeta");
igual(normalizarTema("oscuro"), "oscuro", "oscuro se respeta");
igual(normalizarTema("sistema"), "sistema", "sistema se respeta");
igual(normalizarTema(""), "sistema", "vacío cae en sistema");
igual(normalizarTema("morado"), "sistema", "un invento cae en sistema");
igual(normalizarTema(null), "sistema", "sin nada guardado, sistema");

/* 2. Cuándo se ve oscuro: elección directa o «sistema» con el móvil en oscuro. */
igual(esOscuro("oscuro", false), true, "eligió oscuro aunque el móvil esté claro");
igual(esOscuro("claro", true), false, "eligió claro aunque el móvil esté oscuro");
igual(esOscuro("sistema", true), true, "sistema sigue al móvil oscuro");
igual(esOscuro("sistema", false), false, "sistema sigue al móvil claro");

/* 3. El script de antes de pintar: sin dependencias y con seguimiento en vivo. */
igual(SCRIPT_TEMA.includes(CLAVE_TEMA), true, "el script usa la misma clave");
igual(SCRIPT_TEMA.includes('"oscuro"'), true, "el script sabe pintar oscuro");
igual(SCRIPT_TEMA.includes("prefers-color-scheme: dark"), true, "el script mira el móvil");
igual(SCRIPT_TEMA.includes("addEventListener"), true, "el script escucha cambios del móvil en vivo");

/* 4. Simulación DOM completa: cambio en vivo de sistema con app abierta. */
const almacen: Record<string, string> = {};
let sistemaOscuro = true;
const oyentesMedia = new Set<() => void>();
const attrsRaiz: Record<string, string> = {};
const metaAttrs: Record<string, string> = { media: "(prefers-color-scheme: light)", content: "#ffffff" };

const fakeStorage = {
  getItem: (k: string) => almacen[k] ?? null,
  setItem: (k: string, v: string) => {
    almacen[k] = String(v);
  },
  removeItem: (k: string) => {
    delete almacen[k];
  },
};

const fakeMeta = {
  removeAttribute: (k: string) => {
    delete metaAttrs[k];
  },
  setAttribute: (k: string, v: string) => {
    metaAttrs[k] = v;
  },
};

const fakeDoc = {
  documentElement: {
    style: { colorScheme: "", backgroundColor: "" },
    setAttribute: (k: string, v: string) => {
      attrsRaiz[k] = v;
    },
    getAttribute: (k: string) => attrsRaiz[k] ?? null,
  },
  body: {
    style: { backgroundColor: "" },
  },
  querySelectorAll: (sel: string) => (sel === 'meta[name="theme-color"]' ? [fakeMeta] : []),
};

const fakeWindow = {
  localStorage: fakeStorage,
  matchMedia: () => ({
    get matches() {
      return sistemaOscuro;
    },
    addEventListener: (_ev: string, fn: () => void) => {
      oyentesMedia.add(fn);
    },
    removeEventListener: (_ev: string, fn: () => void) => {
      oyentesMedia.delete(fn);
    },
  }),
};

Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true, writable: true });
Object.defineProperty(globalThis, "localStorage", { value: fakeStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, "document", { value: fakeDoc, configurable: true, writable: true });

// Ejecutamos SCRIPT_TEMA tal cual corre en <head> con el móvil en oscuro y sin preferencia guardada
new Function(SCRIPT_TEMA)();
igual(attrsRaiz["data-tema"], "oscuro", "SCRIPT_TEMA arranca en oscuro si el móvil está en oscuro");
igual(fakeDoc.body.style.backgroundColor, COLOR_TEMA_OSCURO, "SCRIPT_TEMA pinta el body oscuro");
igual(metaAttrs.content, COLOR_TEMA_OSCURO, "SCRIPT_TEMA actualiza theme-color a oscuro");
igual("media" in metaAttrs, false, "SCRIPT_TEMA limpia atributo media del meta theme-color");

// Ahora el móvil cambia a claro con la app abierta (como page.emulateMedia({ colorScheme: 'light' }))
sistemaOscuro = false;
oyentesMedia.forEach((fn) => fn());
igual(attrsRaiz["data-tema"], "claro", "cambio del móvil a claro en vivo actualiza data-tema a claro");
igual(fakeDoc.body.style.backgroundColor, "#ffffff", "cambio del móvil a claro en vivo actualiza body a blanco");
igual(metaAttrs.content, COLOR_TEMA_CLARO, "cambio del móvil a claro restaura verde de marca en theme-color");

// Si el usuario fuerza «Oscuro», un cambio del móvil a claro NO debe pisar su elección
guardarTema("oscuro");
igual(attrsRaiz["data-tema"], "oscuro", "guardarTema('oscuro') fija oscuro");
sistemaOscuro = false;
oyentesMedia.forEach((fn) => fn());
igual(attrsRaiz["data-tema"], "oscuro", "el cambio del sistema no pisa la elección manual «oscuro»");

// Y escucharCambioTemaSistema limpia su suscripción al desmontar
oyentesMedia.clear();
guardarTema("sistema");
sistemaOscuro = false;
aplicarTema("sistema");
const desuscribir = escucharCambioTemaSistema();
igual(oyentesMedia.size, 1, "escucharCambioTemaSistema registra 1 oyente");
sistemaOscuro = true;
oyentesMedia.forEach((fn) => fn());
igual(attrsRaiz["data-tema"], "oscuro", "escucharCambioTemaSistema cambia a oscuro en vivo");
desuscribir();
igual(oyentesMedia.size, 0, "desuscribir retira el oyente limpiamente");

console.log(
  fallos === 0
    ? `\nOK: ${hechas} comprobaciones del tema.`
    : `\n${fallos} fallos de ${hechas}.`,
);
process.exit(fallos === 0 ? 0 : 1);
