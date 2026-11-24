import {
  normalizarTamano,
  leerTamano,
  guardarTamano,
  aplicarTamano,
  CLAVE_TAMANO,
  SCRIPT_TAMANO,
} from "../lib/tamano.ts";

function afirmar(condicion: boolean, mensaje: string) {
  if (!condicion) {
    console.error(`FALLO: ${mensaje}`);
    process.exit(1);
  }
}

// 1. Normalización de valores
afirmar(normalizarTamano("pequeno") === "pequeno", "pequeno se normaliza");
afirmar(normalizarTamano("normal") === "normal", "normal se normaliza");
afirmar(normalizarTamano("grande") === "grande", "grande se normaliza");
afirmar(normalizarTamano("gigante") === "gigante", "gigante se normaliza");
afirmar(normalizarTamano("otro") === "normal", "un valor desconocido cae en normal");
afirmar(normalizarTamano(null) === "normal", "null cae en normal");
afirmar(normalizarTamano(undefined) === "normal", "undefined cae en normal");

// 2. Mock de localStorage y documentElement
const storage: Record<string, string> = {};
const docAttrs: Record<string, string> = {};

const fakeStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = String(v); },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  key: () => null,
  length: 0,
};

const fakeDocElement = {
  setAttribute: (k: string, v: string) => { docAttrs[k] = String(v); },
  getAttribute: (k: string) => docAttrs[k] ?? null,
};

Object.defineProperty(globalThis, "window", {
  value: { localStorage: fakeStorage },
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "document", {
  value: { documentElement: fakeDocElement },
  writable: true,
  configurable: true,
});

// Lectura inicial
afirmar(leerTamano() === "normal", "sin valor guardado lee normal");

// Guardar y aplicar
aplicarTamano("grande");
afirmar(docAttrs["data-tamano"] === "grande", "aplicarTamano directo pone data-tamano");

guardarTamano("grande");
afirmar(storage[CLAVE_TAMANO] === "grande", "guarda grande en localStorage");
afirmar(docAttrs["data-tamano"] === "grande", "aplica data-tamano grande en documentElement");
afirmar(leerTamano() === "grande", "lee grande guardado");

guardarTamano("gigante");
afirmar(storage[CLAVE_TAMANO] === "gigante", "guarda gigante en localStorage");
afirmar(docAttrs["data-tamano"] === "gigante", "aplica data-tamano gigante en documentElement");
afirmar(leerTamano() === "gigante", "lee gigante guardado");

guardarTamano("pequeno");
afirmar(storage[CLAVE_TAMANO] === "pequeno", "guarda pequeno en localStorage");
afirmar(docAttrs["data-tamano"] === "pequeno", "aplica data-tamano pequeno en documentElement");
afirmar(leerTamano() === "pequeno", "lee pequeno guardado");

// SCRIPT_TAMANO
afirmar(typeof SCRIPT_TAMANO === "string" && SCRIPT_TAMANO.includes("mi-peso:tamano-texto"), "script de inyección presente");

console.log("ok     comprobaciones de tamaño de letra completadas");
