/**
 * Pruebas del aviso por Telegram. Se ejecutan con:
 *   node pruebas/telegram.prueba.mts
 *
 * No se llama a Telegram de verdad: se cambia `fetch` por uno de mentira y se
 * mira qué se le manda. Lo que importa: que sin credenciales no se llame, que
 * el chat y el texto vayan bien, que reintente cuando merece la pena y que no
 * insista cuando el token o el chat están mal.
 */

import { enviarTelegram, telegramConfigurado } from "../lib/telegram.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(`FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`);
  }
}

// Los reintentos esperan de verdad (800 ms y 2 s). Aquí el reloj va a escape
// para que probarlos no cueste nueve segundos de espera.
const reloj = globalThis.setTimeout;
// @ts-expect-error: se sustituye el temporizador durante la prueba.
globalThis.setTimeout = (fn: () => void) => {
  fn();
  return 0;
};

type Llamada = { url: string; cuerpo: Record<string, unknown> };

const llamadas: Llamada[] = [];
let respuesta: { ok: boolean; status: number } | Error = { ok: true, status: 200 };
let intentosLlamada = 0;

// @ts-expect-error: se sustituye el fetch del entorno durante la prueba.
globalThis.fetch = async (url: string, opciones: { body: string }) => {
  intentosLlamada += 1;
  if (respuesta instanceof Error) throw respuesta;
  llamadas.push({ url, cuerpo: JSON.parse(opciones.body) as Record<string, unknown> });
  return respuesta;
};

function limpiarEntorno() {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  llamadas.length = 0;
  intentosLlamada = 0;
  respuesta = { ok: true, status: 200 };
}

/* ------------------------------------------------------------------ */
/* Sin configurar                                                     */
/* ------------------------------------------------------------------ */

limpiarEntorno();
igual(telegramConfigurado(), false, "sin variables no está configurado");
igual(await enviarTelegram("hola"), false, "sin variables no manda nada");
igual(llamadas.length, 0, "y ni siquiera llama a Telegram");

process.env.TELEGRAM_BOT_TOKEN = "123:abc";
igual(telegramConfigurado(), false, "con token y sin chat tampoco está configurado");

/* ------------------------------------------------------------------ */
/* Configurado                                                        */
/* ------------------------------------------------------------------ */

limpiarEntorno();
process.env.TELEGRAM_BOT_TOKEN = "123:abc";
process.env.TELEGRAM_CHAT_ID = "424242";
igual(telegramConfigurado(), true, "con las dos variables está configurado");

igual(await enviarTelegram("Idea de Marta"), true, "un mensaje normal se manda");
igual(llamadas.length, 1, "solo una llamada");
igual(
  llamadas[0]?.url,
  "https://api.telegram.org/bot123:abc/sendMessage",
  "va al bot configurado",
);
igual(llamadas[0]?.cuerpo.chat_id, "424242", "al chat de Isaac");
igual(llamadas[0]?.cuerpo.text, "Idea de Marta", "con el texto tal cual");
igual(llamadas[0]?.cuerpo.disable_web_page_preview, true, "sin vista previa de enlaces");

/* Un texto larguísimo se corta antes de que Telegram lo rechace. */
llamadas.length = 0;
await enviarTelegram("x".repeat(5000));
igual((llamadas[0]?.cuerpo.text as string).length, 3800, "el texto se corta en 3800");

/* Un texto vacío no gasta una llamada. */
llamadas.length = 0;
igual(await enviarTelegram("   "), false, "vacío no se manda");
igual(llamadas.length, 0, "y no llama");

/* ------------------------------------------------------------------ */
/* Cuando algo va mal                                                 */
/* ------------------------------------------------------------------ */

/* Telegram caído (5xx): se reintenta tres veces. */
llamadas.length = 0;
respuesta = { ok: false, status: 500 };
igual(await enviarTelegram("Idea"), false, "si Telegram está caído, devuelve false");
igual(llamadas.length, 3, "lo intenta tres veces");

/* Red caída: también tres intentos, sin lanzar. */
llamadas.length = 0;
intentosLlamada = 0;
respuesta = new Error("sin red");
igual(await enviarTelegram("Idea"), false, "si la red peta, devuelve false sin lanzar");
igual(intentosLlamada, 3, "la red también se reintenta");

/* «Demasiados mensajes» (429) es pasajero: se reintenta. */
llamadas.length = 0;
respuesta = { ok: false, status: 429 };
igual(await enviarTelegram("Idea"), false, "si Telegram dice «espera», devuelve false");
igual(llamadas.length, 3, "el 429 se reintenta");

/* Token o chat mal (401, 403): insistir no arregla nada. */
llamadas.length = 0;
respuesta = { ok: false, status: 401 };
igual(await enviarTelegram("Idea"), false, "con el token mal, devuelve false");
igual(llamadas.length, 1, "y no insiste: repetirlo no lo arregla");

/* Al segundo intento va bien: el aviso no se pierde. */
llamadas.length = 0;
let intentos = 0;
// @ts-expect-error: ahora el fallo es solo del primer intento.
globalThis.fetch = async (url: string, opciones: { body: string }) => {
  intentos += 1;
  llamadas.push({ url, cuerpo: JSON.parse(opciones.body) as Record<string, unknown> });
  return intentos === 1 ? { ok: false, status: 502 } : { ok: true, status: 200 };
};
igual(await enviarTelegram("Idea"), true, "si el segundo intento va bien, se da por enviado");
igual(llamadas.length, 2, "dos llamadas: la que falló y la buena");

globalThis.setTimeout = reloj;
limpiarEntorno();

console.log(`\n${hechas - fallos}/${hechas} comprobaciones bien.`);
if (fallos > 0) process.exit(1);
