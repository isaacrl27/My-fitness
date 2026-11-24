/**
 * Pruebas de la puerta: a dónde se vuelve después de poner la clave, y si el
 * enlace de invitación vale o no.
 *
 * Se ejecutan con:  node pruebas/sesion.prueba.mts
 */

import { hayClave, invitacionCorrecta, rutaInterna, sesionValida, valorSesion } from "../lib/sesion.ts";

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

// --- Volver a donde se iba ------------------------------------------------
igual(rutaInterna("/instalar"), "/instalar", "vuelve a /instalar, que es lo que pedía el enlace");
igual(rutaInterna("/hoy"), "/hoy", "vuelve a /hoy");
igual(rutaInterna("/hoy?dia=2026-10-21"), "/hoy?dia=2026-10-21", "conserva lo que iba detrás de la interrogación");
igual(rutaInterna(""), "/", "sin destino, a la raíz");
igual(rutaInterna(null), "/", "sin nada, a la raíz");
igual(rutaInterna("//evil.com"), "/", "no se sale a otro sitio con doble barra");
igual(rutaInterna("https://evil.com"), "/", "no se sale a otro sitio con dirección entera");
igual(rutaInterna("/\\evil.com"), "/", "no se cuela una barra invertida");
igual(rutaInterna("javascript:alert(1)"), "/", "no se cuela un javascript:");
igual(rutaInterna("/instalar\nevil.com"), "/", "no cuela un salto de línea");
igual(rutaInterna("/instalar\revil.com"), "/", "no cuela un retorno de carro");
igual(rutaInterna("/instalar\0evil.com"), "/", "no cuela un byte nulo");
igual(rutaInterna("/instalar\x1f"), "/", "no cuela un carácter de control");
igual(rutaInterna("/instalar\x7f"), "/", "no cuela el carácter DEL");
igual(rutaInterna("///evil.com"), "/", "no cuela triple barra");

// --- La invitación ---------------------------------------------------------
// La buena llega de la nube (tabla `secretos`), no de una variable de entorno.
igual(invitacionCorrecta("lo-que-sea", ""), false, "sin invitación en la nube no vale ninguna");
igual(invitacionCorrecta("", "corta"), false, "una invitación corta no se acepta");
igual(invitacionCorrecta("corta", "corta"), false, "aunque llegue igual: es demasiado corta");

const BUENA = "invitacion-familiar-2026-de-isaac";
igual(invitacionCorrecta(BUENA, BUENA), true, "la buena vale");
igual(invitacionCorrecta(` ${BUENA} `, BUENA), true, "los espacios de fuera no estorban");
igual(invitacionCorrecta(BUENA, ` ${BUENA} `), true, "los espacios de la nube tampoco");
igual(invitacionCorrecta("otra-cosa", BUENA), false, "otra no vale");
igual(invitacionCorrecta("", BUENA), false, "vacía no vale");
igual(invitacionCorrecta(null, BUENA), false, "sin nada no vale");
igual(invitacionCorrecta(undefined, BUENA), false, "sin valor tampoco");
igual(invitacionCorrecta(BUENA.toUpperCase(), BUENA), false, "las mayúsculas son otra cosa");

// --- Sin clave, la puerta está cerrada (fail-closed) -----------------------
// Antes, si faltaba CLAVE_APP la app se abría a cualquiera con el enlace.
const claveAntes = process.env.CLAVE_APP;
try {
  delete process.env.CLAVE_APP;
  igual(hayClave(), false, "sin CLAVE_APP la app se cierra");
  let lanzoSinClave = false;
  try {
    await valorSesion();
  } catch {
    lanzoSinClave = true;
  }
  igual(lanzoSinClave, true, "sin CLAVE_APP no se firma ninguna cookie de sesión");
  igual(await sesionValida("cualquier-cosa"), false, "sin CLAVE_APP ninguna cookie vale");

  process.env.CLAVE_APP = "   ";
  igual(hayClave(), false, "una clave en blanco tampoco vale");
  process.env.CLAVE_APP = "corta";
  igual(hayClave(), false, "una clave demasiado corta no cuenta como puesta");
  process.env.CLAVE_APP = "clave-larga-de-verdad-123";
  igual(hayClave(), true, "con una clave larga de verdad la puerta se puede abrir");
  const firma = await valorSesion();
  igual(await sesionValida(firma), true, "la cookie recién firmada es válida");
  igual(await sesionValida("cookie-inventada"), false, "una cookie inventada se rechaza");
  igual(await sesionValida(""), false, "una cookie vacía se rechaza");
} finally {
  if (claveAntes === undefined) delete process.env.CLAVE_APP;
  else process.env.CLAVE_APP = claveAntes;
}

console.log(`\n${hechas - fallos} de ${hechas} bien.`);
if (fallos > 0) {
  process.exitCode = 1;
}
