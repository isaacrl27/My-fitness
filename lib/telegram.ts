/**
 * Avisos por Telegram.
 *
 * Es el mismo bot que manda el briefing de las 8:00 desde el servidor de
 * casa. Las credenciales viven en Vercel como variables de entorno
 * (`TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`) y aquí no se escribe ningún
 * token: si faltan, simplemente no se manda nada.
 *
 * Nunca lanza y nunca escribe el token en los registros: el texto del error de
 * `fetch` puede llevar la dirección entera, y la dirección lleva el token
 * dentro. Por eso se traga el error y devuelve si se pudo o no.
 */

const ESPERA_MS = 8000;
const MAXIMO = 3800; // Telegram corta en 4096; se deja margen.

/**
 * Cuánto se espera antes de cada intento. Tres intentos: red que va y viene,
 * o Telegram que contesta «ocupado», no deben costar el aviso. Entre el
 * primero y el segundo pasa menos de un segundo; el último, dos.
 */
const ESPERAS_MS = [0, 800, 2000];

/**
 * Lo más que se espera a un `retry_after` de Telegram. Una función de Vercel
 * no puede quedarse colgada medio minuto: si Telegram pide más, se da por
 * perdido el aviso en vez de agotar el tiempo del servidor.
 */
const TOPE_RETRY_AFTER_MS = 5000;

function esperar(ms: number): Promise<void> {
  return new Promise((seguir) => setTimeout(seguir, ms));
}

/** ¿Hay bot configurado en este servidor? */
export function telegramConfigurado(): boolean {
  return Boolean(
    (process.env.TELEGRAM_BOT_TOKEN ?? "").trim() &&
      (process.env.TELEGRAM_CHAT_ID ?? "").trim(),
  );
}

export type OpcionesTelegram = {
  chatId?: string | number;
  parseMode?: "Markdown" | "HTML";
  replyMarkup?: Record<string, unknown>;
};

/** Lee el cuerpo de un error de Telegram sin lanzar nunca. */
async function textoDeError(respuesta: Response): Promise<string> {
  try {
    return typeof respuesta.text === "function" ? await respuesta.text() : "";
  } catch {
    return "";
  }
}

/** Los segundos que pide Telegram en un 429 (o `null` si no los dice). */
async function retryAfterMs(respuesta: Response): Promise<number | null> {
  try {
    const json = (await respuesta.json()) as { parameters?: { retry_after?: number } };
    const s = json?.parameters?.retry_after;
    return typeof s === "number" && Number.isFinite(s) && s > 0 ? s * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Una llamada a la API del bot con los reintentos de siempre:
 * - 2xx: hecho.
 * - 429: se respeta `retry_after` (hasta 5 s) y se reintenta.
 * - 400 con `parse_mode`: casi siempre es un carácter sin escapar (un `_` en
 *   un nombre); se repite UNA vez en texto plano para no perder el aviso.
 * - 400 «message is not modified» al editar: el panel ya estaba igual, vale.
 * - Otro 4xx: token o chat mal, insistir no arregla nada.
 * - 5xx o red caída: se reintenta.
 */
async function llamarBot(
  metodo: "sendMessage" | "editMessageText" | "answerCallbackQuery",
  cuerpoInicial: Record<string, unknown>,
): Promise<boolean> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) return false;

  let cuerpo = cuerpoInicial;
  let yaSinFormato = false;

  for (let intento = 0; intento < ESPERAS_MS.length; intento++) {
    const esperaMs = ESPERAS_MS[intento];
    if (esperaMs > 0) await esperar(esperaMs);

    try {
      const respuesta = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(ESPERA_MS),
      });
      if (respuesta.ok) return true;

      if (respuesta.status === 429) {
        const pedida = await retryAfterMs(respuesta);
        if (pedida !== null && pedida > TOPE_RETRY_AFTER_MS) return false;
        if (intento < ESPERAS_MS.length - 1) {
          await esperar(pedida ?? (esperaMs || 1000));
          continue;
        }
        return false;
      }

      if (respuesta.status === 400) {
        const detalle = (await textoDeError(respuesta)).toLowerCase();
        if (metodo === "editMessageText" && detalle.includes("message is not modified")) {
          return true;
        }
        if (cuerpo.parse_mode && !yaSinFormato) {
          const { parse_mode: _quitado, ...plano } = cuerpo;
          void _quitado;
          cuerpo = plano;
          yaSinFormato = true;
          intento -= 1; // el reintento en plano no gasta un intento de red
          continue;
        }
        return false;
      }

      // Token o chat mal: insistir no cambia nada.
      if (respuesta.status >= 400 && respuesta.status < 500) return false;
      // 5xx: se vuelve a probar.
      if (intento === ESPERAS_MS.length - 1) return false;
    } catch {
      // Red caída o tiempo agotado: se vuelve a probar.
      if (intento === ESPERAS_MS.length - 1) return false;
    }
  }

  return false;
}

/**
 * Manda un mensaje al chat de Isaac. Devuelve `true` si Telegram lo aceptó.
 *
 * Lo intenta hasta tres veces: un corte de red de un segundo, o un «demasiados
 * mensajes» pasajero de Telegram, no debe costar el aviso. Si Telegram dice
 * que el token o el chat están mal (un 4xx que no sea 429), no se insiste:
 * repetirlo no lo arregla.
 *
 * Quien llama ya ha guardado el mensaje del buzón antes de avisar: si esto
 * falla, se pierde el aviso, nunca el mensaje.
 */
export async function enviarTelegram(
  texto: string,
  opciones?: OpcionesTelegram,
): Promise<boolean> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const chat = String(opciones?.chatId || process.env.TELEGRAM_CHAT_ID || "").trim();
  if (!token || !chat) return false;

  const mensaje = texto.trim();
  if (!mensaje) return false;

  const cuerpo: Record<string, unknown> = {
    chat_id: chat,
    text: mensaje.slice(0, MAXIMO),
    disable_web_page_preview: true,
  };
  if (opciones?.parseMode) cuerpo.parse_mode = opciones.parseMode;
  if (opciones?.replyMarkup) cuerpo.reply_markup = opciones.replyMarkup;

  return llamarBot("sendMessage", cuerpo);
}

/**
 * Edita un mensaje de texto previo en Telegram (para paneles interactivos y teclados).
 *
 * Si el texto no ha cambiado (pulsar «Refrescar» dos veces en el mismo
 * minuto), Telegram contesta 400 «message is not modified»: se da por bueno.
 */
export async function editarMensajeTelegram(
  chatId: string | number,
  messageId: number,
  texto: string,
  opciones?: Omit<OpcionesTelegram, "chatId">,
): Promise<boolean> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token || !chatId || !messageId) return false;

  const mensaje = texto.trim();
  if (!mensaje) return false;

  const cuerpo: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text: mensaje.slice(0, MAXIMO),
    disable_web_page_preview: true,
  };
  if (opciones?.parseMode) cuerpo.parse_mode = opciones.parseMode;
  if (opciones?.replyMarkup) cuerpo.reply_markup = opciones.replyMarkup;

  return llamarBot("editMessageText", cuerpo);
}

/**
 * Responde a una pulsación de botón inline (callback_query) para quitar el reloj de carga.
 */
export async function responderCallbackQuery(
  callbackQueryId: string,
  texto?: string,
): Promise<boolean> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token || !callbackQueryId) return false;

  return llamarBot("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(texto ? { text: texto.slice(0, 200) } : {}),
  });
}
