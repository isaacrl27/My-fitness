/**
 * Pruebas del freno de intentos y del tope de envíos.
 *
 * Se ejecutan con `node pruebas/freno.prueba.mts`. Lo que se prueba es la
 * cuenta, sin servidor ni base de datos: cuántos fallos hacen falta para
 * castigar, cuándo se perdona y cuántos mensajes seguidos deja pasar.
 */

import { crearFreno, crearTopeEnvios } from "../lib/freno.ts";
import { esCrossSite, esMismoOrigen, origen } from "../lib/origen.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${b}\n  obtenido: ${a}`);
  }
}

function cierto(valor: unknown, que: string) {
  igual(Boolean(valor), true, que);
}

function falso(valor: unknown, que: string) {
  igual(Boolean(valor), false, que);
}

/* ------------------------------------------------------------------ */
/* Freno de intentos                                                   */
/* ------------------------------------------------------------------ */

const freno = crearFreno({ maxFallos: 3, castigoMs: 60_000, retardoMs: 20 });

falso(freno.castigada("ana", 0), "al principio nadie está castigado");
freno.anotarFallo("ana", 0);
freno.anotarFallo("ana", 0);
falso(freno.castigada("ana", 0), "con dos fallos todavía no se castiga");
freno.anotarFallo("ana", 0);
cierto(freno.castigada("ana", 0), "al tercer fallo se castiga");
cierto(freno.castigada("ana", 59_999), "sigue castigada justo antes de cumplir");
falso(freno.castigada("ana", 60_000), "al cumplir el castigo se le perdona");

freno.anotarFallo("ana", 60_000);
falso(freno.castigada("ana", 60_000), "después del castigo vuelve a contar desde cero");

freno.perdonar("ana");
falso(freno.castigada("ana", 60_000), "perdonar borra la cuenta");

freno.anotarFallo("luis", 0);
freno.anotarFallo("luis", 0);
freno.anotarFallo("luis", 0);
cierto(freno.castigada("luis", 0), "cada sitio lleva su cuenta");
falso(freno.castigada("ana", 0), "el castigo de uno no contagia a otro");

// El reloj del castigo se calcula desde el último fallo.
const otro = crearFreno({ maxFallos: 1, castigoMs: 1_000, retardoMs: 5 });
otro.anotarFallo("x", 500);
cierto(otro.castigada("x", 1_499), "un solo fallo puede castigar si el máximo es uno");
falso(otro.castigada("x", 1_500), "y se cumple en su momento");

const lento = Date.now();
await freno.esperar();
cierto(Date.now() - lento >= 15, "esperar hace esperar de verdad");

/* ------------------------------------------------------------------ */
/* Tope de envíos                                                      */
/* ------------------------------------------------------------------ */

const tope = crearTopeEnvios({ maximo: 2, ventanaMs: 1_000 });

cierto(tope.permite("marta", 0), "el primero pasa");
tope.anotar("marta", 0);
cierto(tope.permite("marta", 10), "el segundo pasa");
tope.anotar("marta", 10);
falso(tope.permite("marta", 20), "el tercero ya no");
falso(tope.permite("marta", 999), "ni justo antes de que se abra la ventana");
cierto(tope.permite("marta", 1_000), "al abrirse la ventana del primero, vuelve a pasar");
cierto(tope.permite("otra", 0), "cada persona lleva su cuenta");

const topeOlvido = crearTopeEnvios({ maximo: 1, ventanaMs: 10_000 });
topeOlvido.anotar("z", 0);
falso(topeOlvido.permite("z", 1), "con el tope lleno no deja");
topeOlvido.olvidar("z");
cierto(topeOlvido.permite("z", 1), "olvidar lo deja pasar otra vez");

const topeLargo = crearTopeEnvios({ maximo: 1, ventanaMs: 50 });
topeLargo.anotar("x", 0);
falso(topeLargo.permite("x", 49), "dentro de la ventana no deja");
cierto(topeLargo.permite("x", 50), "fuera de la ventana sí deja");

// Los envíos viejos se van limpiando solos al consultar: si no, el mapa
// crecería para siempre con cada persona que escribe una vez.
const topeLimpio = crearTopeEnvios({ maximo: 1, ventanaMs: 100 });
topeLimpio.anotar("y", 0);
cierto(topeLimpio.permite("y", 150), "el envío caducado ya no cuenta");

// --- De dónde viene la petición -------------------------------------------
const peticion = (cabeceras: Record<string, string>) =>
  ({ headers: new Headers(cabeceras) }) as never;

igual(
  origen(peticion({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" })),
  "9.9.9.9",
  "si el proxy manda x-real-ip, manda esa",
);
igual(
  origen(peticion({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
  "2.2.2.2",
  "sin x-real-ip se toma la última, la que añade el proxy",
);
igual(origen(peticion({})), "desconocida", "sin cabeceras no se inventa una IP");

// --- Defensa CSRF (esMismoOrigen y esCrossSite) ---------------------------
cierto(
  esMismoOrigen(peticion({ host: "example.com", origin: "https://example.com" })),
  "esMismoOrigen acepta Origin del mismo host",
);
falso(
  esMismoOrigen(peticion({ host: "example.com", origin: "https://atacante.com" })),
  "esMismoOrigen rechaza Origin externo",
);
falso(
  esMismoOrigen(peticion({ host: "example.com" })),
  "esMismoOrigen rechaza formularios sin Origin ni Referer",
);
falso(
  esMismoOrigen(
    peticion({
      host: "example.com",
      origin: "https://example.com",
      "sec-fetch-site": "cross-site",
    }),
  ),
  "esMismoOrigen rechaza sec-fetch-site cross-site",
);

falso(
  esCrossSite(peticion({ host: "localhost:3100" })),
  "esCrossSite permite llamadas internas sin cabeceras de navegador",
);
falso(
  esCrossSite(peticion({ host: "example.com", origin: "https://example.com" })),
  "esCrossSite permite peticiones del mismo origen",
);
cierto(
  esCrossSite(peticion({ host: "example.com", "sec-fetch-site": "cross-site" })),
  "esCrossSite bloquea sec-fetch-site cross-site",
);
cierto(
  esCrossSite(peticion({ host: "example.com", origin: "https://evil.com" })),
  "esCrossSite bloquea Origin de otro dominio",
);
cierto(
  esCrossSite(peticion({ host: "example.com", origin: "null" })),
  "esCrossSite bloquea Origin null de iframes aislados",
);

console.log(`\n${hechas - fallos}/${hechas} comprobaciones bien.`);
if (fallos > 0) process.exit(1);
