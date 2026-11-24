/**
 * Pruebas del lado del móvil de los avisos. Se ejecutan con:
 *     node pruebas/avisos-cliente.prueba.mts
 *
 * Lo que se comprueba aquí es que «Apagar los avisos» se queda apagado, que
 * `aBytes` decodifica claves VAPID base64url sin relleno `=`, que `estadoReal`
 * conserva el estado «activos» aunque no haya cobertura y detecta rotaciones de
 * endpoint, y que `limpiarAvisosLocales` limpia el dispositivo al borrar cuenta.
 */

import * as modulo from "node:module";

const { registerHooks } = modulo as unknown as {
  registerHooks: (ganchos: {
    resolve: (
      specifier: string,
      contexto: unknown,
      siguiente: (specifier: string, contexto: unknown) => unknown,
    ) => unknown;
  }) => void;
};

registerHooks({
  resolve(specifier, contexto, siguiente) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return siguiente(`${specifier}.ts`, contexto);
    }
    return siguiente(specifier, contexto);
  },
});

// ------------------------------------------------------------------
// El navegador de mentira
// ------------------------------------------------------------------

const almacen = new Map<string, string>();

function poner(nombre: string, valor: unknown) {
  Object.defineProperty(globalThis, nombre, { value: valor, configurable: true });
}

poner("window", globalThis);
poner("PushManager", {});
poner("localStorage", {
  getItem: (clave: string) => almacen.get(clave) ?? null,
  setItem: (clave: string, valor: string) => void almacen.set(clave, valor),
  removeItem: (clave: string) => void almacen.delete(clave),
});

let permiso: string = "granted";
const endpointActual = "https://push.example/abc";
let suscripcion: { endpoint: string; toJSON: () => object; unsubscribe: () => Promise<boolean> } | null = null;
let suscripcionesPedidas = 0;
let redViva = true;

function suscripcionFalsa(endpoint = endpointActual) {
  return {
    endpoint,
    toJSON: () => ({
      endpoint,
      keys: { p256dh: "x", auth: "y" },
    }),
    unsubscribe: async () => {
      suscripcion = null;
      return true;
    },
  };
}

poner("Notification", {
  get permission() {
    return permiso;
  },
  requestPermission: async () => permiso,
});

poner("navigator", {
  serviceWorker: {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: async () => suscripcion,
        subscribe: async () => {
          suscripcionesPedidas += 1;
          suscripcion = suscripcionFalsa();
          return suscripcion;
        },
      },
    }),
  },
});

const llamadas: Array<{ suscripcion: unknown }> = [];
poner("fetch", async (_url: string, init?: { body?: string }) => {
  if (!redViva) throw new Error("Sin cobertura");
  llamadas.push(JSON.parse(init?.body ?? "{}"));
  return { ok: true };
});

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "ZGV2LXBydWViYQ"; // sin relleno '=' a propósito

const {
  aBytes,
  activar,
  desactivar,
  estado,
  estadoReal,
  limpiarAvisosLocales,
  reparar,
} = await import("../lib/avisos-cliente.ts");

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

// ------------------------------------------------------------------
// Decodificación VAPID base64url sin relleno '='
// ------------------------------------------------------------------

const claveVapidReal =
  "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";
const bytesVapid = aBytes(claveVapidReal);
igual(bytesVapid.byteLength, 65, "aBytes decodifica clave VAPID P-256 de 87 letras sin '=' a 65 bytes");
igual(bytesVapid[0], 4, "el primer byte de la clave pública P-256 sin comprimir es 0x04");

// ------------------------------------------------------------------
// Encender, reabrir y apagar
// ------------------------------------------------------------------

igual(estado(), "sin-suscripcion", "con permiso y sin apuntar todavía, sale «sin-suscripción»");

igual(await activar(), "activos", "al encender, los avisos quedan activos");
igual(
  llamadas.at(-1)?.suscripcion !== null,
  true,
  "al encender, la suscripción se guarda en la nube",
);

// Sin cobertura, `estadoReal` reconoce la suscripción ya sincronizada sin decir «apagados»
const llamadasAntesOffline = llamadas.length;
redViva = false;
igual(
  await estadoReal(),
  "activos",
  "sin cobertura, estadoReal mantiene «activos» sin llamada de red ni falso apagado",
);
igual(llamadas.length, llamadasAntesOffline, "estadoReal en caché no golpea la red");
redViva = true;

// Si el navegador rota el endpoint en segundo plano, `estadoReal` lo detecta y lo sube
suscripcion = suscripcionFalsa("https://push.example/rotado-nuevo");
igual(await estadoReal(), "activos", "si el endpoint rota, estadoReal lo resincroniza con la nube");
igual(
  (llamadas.at(-1)?.suscripcion as { endpoint?: string })?.endpoint,
  "https://push.example/rotado-nuevo",
  "el nuevo endpoint rotado se envía al servidor",
);

igual(await reparar(), "activos", "al reabrir, si nadie los apagó, siguen activos");
igual(suscripcionesPedidas, 1, "y no se vuelve a apuntar el móvil si ya estaba apuntado");

igual(await desactivar(), "retirados", "al apagar, el estado es «retirados»");
igual(llamadas.at(-1)?.suscripcion, null, "al apagar, la suscripción se borra de la nube");
igual(
  almacen.get("myfitness:avisos:intencion"),
  "apagados",
  "al apagar, el móvil se guarda que fue decisión de la persona",
);

// ------------------------------------------------------------------
// Que no resuciten
// ------------------------------------------------------------------

igual(await reparar(), "retirados", "reabrir la app NO los vuelve a encender");
igual(await estadoReal(), "retirados", "estadoReal también respeta «retirados»");
igual(suscripcionesPedidas, 1, "y tampoco se vuelve a apuntar el móvil por la espalda");
igual(estado(), "retirados", "al abrir Ajustes siguen apagados");

igual(await activar(), "activos", "el botón de encender vuelve a funcionar");
igual(
  almacen.has("myfitness:avisos:intencion"),
  false,
  "al encender, se borra la marca de apagado",
);
igual(await reparar(), "activos", "y siguen activos al reabrir");

// ------------------------------------------------------------------
// Limpieza completa al eliminar cuenta
// ------------------------------------------------------------------

await limpiarAvisosLocales();
igual(suscripcion, null, "limpiarAvisosLocales da de baja la suscripción del navegador");
igual(
  almacen.has("myfitness:avisos:sincronizado"),
  false,
  "limpiarAvisosLocales borra la huella de sincronización",
);

// ------------------------------------------------------------------
// Si el sistema no deja avisar, eso es otra cosa
// ------------------------------------------------------------------

permiso = "denied";
suscripcion = null;
almacen.clear();
igual(estado(), "apagados", "si el iPhone no deja avisar, es «apagados», sin marca ninguna");
igual(await reparar(), "apagados", "y la reparación no inventa nada con el permiso denegado");

console.log("");
console.log(fallos === 0 ? `${hechas} de ${hechas} bien.` : `${fallos} FALLAS de ${hechas}.`);
if (fallos > 0) process.exit(1);
