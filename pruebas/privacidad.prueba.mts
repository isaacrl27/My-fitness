import { haAceptadoPrivacidad, aceptarPrivacidad, fechaAceptacionPrivacidad, CLAVE_PRIVACIDAD } from "../lib/privacidad.ts";

function afirmar(condicion: boolean, mensaje: string) {
  if (!condicion) {
    console.error(`FALLO: ${mensaje}`);
    process.exit(1);
  }
}

// Mock localStorage para node
const storage: Record<string, string> = {};
const fakeLocalStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  key: () => null,
  length: 0,
};

Object.defineProperty(globalThis, "window", {
  value: { localStorage: fakeLocalStorage },
  writable: true,
  configurable: true,
});

afirmar(!haAceptadoPrivacidad(), "al inicio no está aceptada");
afirmar(fechaAceptacionPrivacidad() === null, "fecha inicial es null");

aceptarPrivacidad();
afirmar(haAceptadoPrivacidad(), "después de aceptar devuelve true");
afirmar(typeof fechaAceptacionPrivacidad() === "string", "fecha devuelve un string ISO");
afirmar(storage[CLAVE_PRIVACIDAD] !== undefined, "se guardó en la clave correcta de localStorage");

console.log("ok     comprobaciones de privacidad completadas");
