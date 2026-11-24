import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nubeDeServidor } from "@/lib/supabase-servidor";
import { iguales } from "@/lib/sesion";
import {
  editarMensajeTelegram,
  enviarTelegram,
  responderCallbackQuery,
} from "@/lib/telegram";
import { parsearMensajeTelegram } from "@/lib/telegram-parser";
import { suscripcionBuena } from "@/lib/avisos";
import { VERSION_APP } from "@/lib/version";
import type { MensajeIsaac } from "@/lib/store";
import { enviarComunicadoGlobal } from "@/lib/comunicados";

/**
 * Webhook de Telegram para el bot de My Fitness y Asistente de Isaac.
 *
 * Permite a Isaac:
 * - Consultar el panel de control (/panel) con estado de app y del sistema.
 * - Conmutar modo mantenimiento interactivo o por comandos (/abrir, /cortar).
 * - Responder a mensajes del buzón de sugerencias (/responder CODIGO mensaje).
 * - Enviar mensajes globales a toda la app (/todos mensaje).
 * - Ver perfiles y miembros de la familia (/usuarios).
 */

/** Escapa los caracteres especiales de Markdown clásico de Telegram en textos libres. */
function escaparMarkdown(texto: string): string {
  return texto.replace(/([_*`\[])/g, "\\$1");
}

async function cambiarMantenimiento(
  supabase: SupabaseClient,
  activo: boolean,
  minutos?: number,
) {
  const ahora = new Date();
  // Entre 1 minuto y una semana: un «/cortar 999999999» no puede dejar la app
  // cerrada para siempre ni generar una fecha inválida.
  const acotados =
    typeof minutos === "number" && Number.isFinite(minutos)
      ? Math.min(10_080, Math.max(1, Math.round(minutos)))
      : 0;
  const hasta =
    activo && acotados
      ? new Date(ahora.getTime() + acotados * 60_000).toISOString()
      : "";
  const valor = JSON.stringify({
    activo,
    desde: ahora.toISOString(),
    hasta,
  });
  const { error } = await supabase
    .from("secretos")
    .upsert({ nombre: "mantenimiento", valor }, { onConflict: "nombre" });
  return !error;
}

async function generarPanelControl(supabase: SupabaseClient | null) {
  let activo = false;
  let hasta = "";
  let totalPersonas = 0;
  let nombresPersonas: string[] = [];

  if (supabase) {
    try {
      const { data: fila } = await supabase
        .from("secretos")
        .select("valor")
        .eq("nombre", "mantenimiento")
        .maybeSingle();
      if (fila?.valor) {
        const parsed = JSON.parse(fila.valor);
        activo = parsed?.activo === true;
        hasta = parsed?.hasta || "";
      }
    } catch {
      // Ignorar error de JSON
    }

    try {
      const { data: personas } = await supabase
        .from("personas")
        .select("nombre, codigo");
      if (personas) {
        totalPersonas = personas.length;
        nombresPersonas = personas
          .map((p) => escaparMarkdown(p.nombre?.trim() || p.codigo || ""))
          .filter(Boolean);
      }
    } catch {
      // Ignorar error de lectura de personas
    }
  }

  const estadoEmoji = activo ? "🛠 *EN MANTENIMIENTO*" : "🟢 *OPERATIVA*";
  const hastaTexto =
    activo && hasta
      ? `\n⏳ _Reapertura programada:_ ${new Date(hasta).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}`
      : "";

  const usuariosTexto =
    totalPersonas > 0
      ? `${totalPersonas} cuentas (${nombresPersonas.slice(0, 4).join(", ")}${totalPersonas > 4 ? "…" : ""})`
      : "Sin perfiles creados todavía";

  // Vercel corre en UTC: sin la zona, el panel marcaba una o dos horas menos.
  const ahora = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
  const texto =
    "🎛 *PANEL DE CONTROL · ASISTENTE & MY FITNESS*\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `📱 *Estado de la App*: ${estadoEmoji}${hastaTexto}\n` +
    `👥 *Familia / Usuarios*: ${usuariosTexto}\n` +
    `📦 *Versión*: ${VERSION_APP} (Vercel Producción)\n` +
    `🌐 *Web*: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com"}\n\n` +
    "💻 *Canal de Control*:\n" +
    `• Sesión Webhook: 🟢 Activa (${ahora})\n\n` +
    "⚡ *Acciones rápidas:* pulsa un botón para gestionar la app al instante.";

  const teclado = {
    inline_keyboard: [
      [
        {
          text: activo ? "✅ Abrir App para Todos" : "⛔ Cerrar por Mantenimiento",
          callback_data: activo ? "mantenimiento_off" : "mantenimiento_on",
        },
        { text: "🔄 Refrescar", callback_data: "panel_refresh" },
      ],
      [
        { text: "👥 Ver Familias y Códigos", callback_data: "ver_usuarios" },
        { text: "❓ Ayuda y Comandos", callback_data: "ver_ayuda" },
      ],
    ],
  };

  return { texto, teclado };
}

async function generarListaUsuarios(supabase: SupabaseClient | null) {
  if (!supabase) {
    return {
      texto: "⚠️ La base de datos no está disponible en este momento.",
      teclado: {
        inline_keyboard: [
          [{ text: "« Volver al Panel", callback_data: "panel_refresh" }],
        ],
      },
    };
  }

  const { data: personas } = await supabase
    .from("personas")
    .select("nombre, codigo, created_at")
    .order("created_at", { ascending: false });

  if (!personas || personas.length === 0) {
    return {
      texto:
        "👥 *Usuarios de My Fitness*\n\nNo hay ningún usuario registrado todavía en la nube.",
      teclado: {
        inline_keyboard: [
          [{ text: "« Volver al Panel", callback_data: "panel_refresh" }],
        ],
      },
    };
  }

  const lineas = personas.map((p, idx) => {
    const nombre = escaparMarkdown(p.nombre?.trim() || "Sin nombre");
    return `${idx + 1}. *${nombre}* — Código: \`${p.codigo}\``;
  });

  const texto =
    "👥 *Usuarios y Cuentas de la Familia*\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    lineas.join("\n") +
    "\n\n👉 Para responder a un usuario concreto usa:\n`/responder <CÓDIGO> <tu mensaje>`";

  const teclado = {
    inline_keyboard: [
      [
        { text: "🔄 Actualizar", callback_data: "ver_usuarios" },
        { text: "« Volver al Panel", callback_data: "panel_refresh" },
      ],
    ],
  };

  return { texto, teclado };
}

function generarTextoAyuda() {
  const texto =
    "📱 *Panel de Control y Comandos del Bot*\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "1️⃣ *Panel de Control*:\n" +
    "• `/panel` o pulsa el botón del Menú para ver semáforos, usuarios y estado.\n\n" +
    "2️⃣ *Modo Mantenimiento*:\n" +
    "• `/cortar [minutos]` — Cierra la app con cartel temporal\n" +
    "• `/abrir` — Vuelve a abrir la app inmediatamente\n" +
    "• `/mantenimiento estado` — Consulta cómo está\n\n" +
    "3️⃣ *Mensajes a la familia*:\n" +
    "• `/todos <mensaje>` o `/aviso <mensaje>` — Mensaje global 'LEER IMPORTANTE' con aviso push a toda la app\n" +
    "• `/usuarios` — Lista completa de perfiles y códigos\n" +
    "• `/responder <CÓDIGO> <mensaje>` — Mensaje directo a un usuario";

  const teclado = {
    inline_keyboard: [
      [
        { text: "🎛 Abrir Panel de Control", callback_data: "panel_refresh" },
        { text: "👥 Ver Usuarios", callback_data: "ver_usuarios" },
      ],
    ],
  };

  return { texto, teclado };
}

let vapidListo = false;

/** Firma VAPID bajo demanda: una clave mal puesta no rompe la carga del módulo. */
function asegurarVapid(): boolean {
  if (vapidListo) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privada = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publica || !privada) return false;
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com").trim();
    webpush.setVapidDetails(appUrl, publica, privada);
    vapidListo = true;
    return true;
  } catch {
    return false;
  }
}

/** Los mensajes de Isaac que se guardan por perfil (los más nuevos). */
const MAX_MENSAJES_ISAAC = 50;

/**
 * Manda un aviso push a cada dispositivo con suscripción buena.
 *
 * Solo a servidores oficiales de push (misma lista que los avisos diarios,
 * contra SSRF) y, si el móvil ya no existe (404/410), se le quita la
 * suscripción para no volver a intentarlo. Devuelve cuántos se entregaron.
 */
async function mandarPush(
  supabase: SupabaseClient,
  filas: { id?: unknown; suscripcion?: unknown }[],
  carga: { titulo: string; cuerpo: string; url: string },
): Promise<number> {
  if (!asegurarVapid()) return 0;
  let entregados = 0;
  for (const d of filas) {
    if (!suscripcionBuena(d.suscripcion)) continue;
    try {
      await webpush.sendNotification(
        d.suscripcion as webpush.PushSubscription,
        JSON.stringify(carga),
        { TTL: 24 * 60 * 60, urgency: "normal" },
      );
      entregados++;
    } catch (e) {
      const estado = (e as { statusCode?: number }).statusCode;
      if ((estado === 404 || estado === 410) && typeof d.id === "string") {
        await supabase.from("dispositivos").update({ suscripcion: null }).eq("id", d.id);
      }
    }
  }
  return entregados;
}

// Caché en memoria para deduplicar reintentos de Telegram en ráfaga (idempotencia)
const MAX_UPDATES_REGISTRADOS = 1000;
const updatesProcesados = new Set<number>();

function yaFueProcesado(updateId?: number): boolean {
  if (typeof updateId !== "number") return false;
  return updatesProcesados.has(updateId);
}

function marcarProcesado(updateId?: number): void {
  if (typeof updateId !== "number") return;
  updatesProcesados.add(updateId);
  if (updatesProcesados.size > MAX_UPDATES_REGISTRADOS) {
    const primero = updatesProcesados.values().next().value;
    if (primero !== undefined) updatesProcesados.delete(primero);
  }
}

export async function POST(peticion: NextRequest) {
  const secretHeader = peticion.headers.get("x-telegram-bot-api-secret-token");
  const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
  const adminChatId = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  const adminUserId = (process.env.TELEGRAM_ADMIN_USER_ID ?? "").trim();

  // Fail-closed estricto: debe haber secreto criptográfico y chat/usuario configurados
  if (!webhookSecret || (!adminChatId && !adminUserId)) {
    console.error("telegram/webhook: Ni TELEGRAM_WEBHOOK_SECRET ni usuario/chat están configurados.");
    return NextResponse.json({ ok: false, error: "Servicio no configurado" }, { status: 503 });
  }

  // Comprobación criptográfica obligatoria: rechazar si falta el encabezado o no coincide
  if (!secretHeader || !iguales(secretHeader, webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Usuario administrador autorizado (adminUserId prioritario o adminChatId)
  const idAdminEsperado = adminUserId || adminChatId;

  let cuerpo: {
    update_id?: number;
    message?: {
      chat?: { id: number | string };
      from?: { id: number | string };
      text?: string;
      reply_to_message?: { text?: string };
    };
    callback_query?: {
      id: string;
      from?: { id: number | string };
      message?: { chat?: { id: number | string }; message_id?: number };
      data?: string;
    };
  };

  try {
    const crudo = await peticion.text();
    if (crudo.length > 64 * 1024) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
    }
    cuerpo = JSON.parse(crudo) as typeof cuerpo;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }

  // Deduplicación por update_id ante reintentos de Telegram por timeout
  if (yaFueProcesado(cuerpo.update_id)) {
    return NextResponse.json({ ok: true, deduplicado: true });
  }

  const supabase = nubeDeServidor();

  // ── 1. Pulsación de Botón Interactivo (Inline Keyboard / Callback Query) ──
  if (cuerpo.callback_query) {
    const cb = cuerpo.callback_query;
    const userId = cb.from?.id ? String(cb.from.id) : "";
    const chatId = cb.message?.chat?.id ? String(cb.message.chat.id) : "";

    // Autorizar solo si el usuario que pulsó es el admin y pertenece al chat previsto
    const autorizado =
      userId === idAdminEsperado && (!adminChatId || chatId === adminChatId);

    if (!autorizado) {
      console.warn(
        `telegram/webhook: callback ignorado de usuario/chat no autorizado (user: ${userId}, chat: ${chatId})`,
      );
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    await responderCallbackQuery(cb.id);
    const data = cb.data ?? "";
    const destinoChatId = chatId || adminChatId;
    const messageId = cb.message?.message_id;

    if (data === "panel_refresh" && messageId) {
      const panel = await generarPanelControl(supabase);
      await editarMensajeTelegram(destinoChatId, messageId, panel.texto, {
        parseMode: "Markdown",
        replyMarkup: panel.teclado,
      });
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    if (data === "mantenimiento_on" && messageId && supabase) {
      if (!(await cambiarMantenimiento(supabase, true))) {
        await responderCallbackQuery(cb.id, "No se ha podido guardar en la nube.");
      }
      const panel = await generarPanelControl(supabase);
      await editarMensajeTelegram(destinoChatId, messageId, panel.texto, {
        parseMode: "Markdown",
        replyMarkup: panel.teclado,
      });
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    if (data === "mantenimiento_off" && messageId && supabase) {
      if (!(await cambiarMantenimiento(supabase, false))) {
        await responderCallbackQuery(cb.id, "No se ha podido guardar en la nube.");
      }
      const panel = await generarPanelControl(supabase);
      await editarMensajeTelegram(destinoChatId, messageId, panel.texto, {
        parseMode: "Markdown",
        replyMarkup: panel.teclado,
      });
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    if (data === "ver_usuarios" && messageId) {
      const lista = await generarListaUsuarios(supabase);
      await editarMensajeTelegram(destinoChatId, messageId, lista.texto, {
        parseMode: "Markdown",
        replyMarkup: lista.teclado,
      });
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    if (data === "ver_ayuda" && messageId) {
      const ayuda = generarTextoAyuda();
      await editarMensajeTelegram(destinoChatId, messageId, ayuda.texto, {
        parseMode: "Markdown",
        replyMarkup: ayuda.teclado,
      });
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  // ── 2. Mensaje de Texto Normal ──
  const message = cuerpo.message;
  if (!message || !message.text) {
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  // Comprobar que quien habla es el usuario administrador autorizado
  const chatId = message.chat?.id ? String(message.chat.id) : "";
  const userId = message.from?.id ? String(message.from.id) : "";
  const esAutorizado =
    userId === idAdminEsperado && (!adminChatId || chatId === adminChatId);

  if (!esAutorizado) {
    console.warn(
      `telegram/webhook: mensaje ignorado de chat/usuario no autorizado (chat: ${chatId}, user: ${userId})`,
    );
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  const accion = parsearMensajeTelegram(message.text, message.reply_to_message?.text);

  if (accion.tipo === "panel") {
    const panel = await generarPanelControl(supabase);
    await enviarTelegram(panel.texto, {
      parseMode: "Markdown",
      replyMarkup: panel.teclado,
    });
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  if (accion.tipo === "usuarios") {
    const lista = await generarListaUsuarios(supabase);
    await enviarTelegram(lista.texto, {
      parseMode: "Markdown",
      replyMarkup: lista.teclado,
    });
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  if (accion.tipo === "ayuda") {
    const ayuda = generarTextoAyuda();
    await enviarTelegram(ayuda.texto, {
      parseMode: "Markdown",
      replyMarkup: ayuda.teclado,
    });
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  if (accion.tipo === "ignorado") {
    if (message.text.startsWith("/")) {
      await enviarTelegram(
        "⚠️ Comando no reconocido.\n\n" +
          "Usa:\n" +
          "• `/panel` — Abrir panel de control interactivo\n" +
          "• `/mantenimiento` o `/cortar` — Modo mantenimiento\n" +
          "• `/todos <mensaje>` — Mensaje a toda la familia\n" +
          "• `/responder <CÓDIGO> <mensaje>` — Mensaje a un usuario",
        {
          replyMarkup: {
            inline_keyboard: [
              [{ text: "🎛 Abrir Panel de Control", callback_data: "panel_refresh" }],
            ],
          },
        },
      );
    }
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  if (!supabase) {
    await enviarTelegram("⚠️ La nube de Supabase no está configurada.");
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  if (accion.tipo === "mantenimiento") {
    if (accion.orden === "on") {
      if (!(await cambiarMantenimiento(supabase, true, accion.minutos))) {
        await enviarTelegram("❌ No se ha podido activar el mantenimiento: la nube no responde.");
        marcarProcesado(cuerpo.update_id);
        return NextResponse.json({ ok: true });
      }
      const panel = await generarPanelControl(supabase);
      await enviarTelegram(
        "🛠️ *Mantenimiento ACTIVADO*\n\n" +
          (accion.minutos
            ? `La app se ha cerrado temporalmente para todos durante *${accion.minutos} minutos* (se reabrirá sola).`
            : "La app se ha cerrado temporalmente para todos los usuarios. Cuando termines los cambios, envíame `/mantenimiento off` o `/abrir` para reabrirla.") +
          "\n\nLos usuarios verán el cartel «Estamos mejorando la app. Isaac está haciendo unos arreglos…»." +
          "\n\n" +
          panel.texto,
        { parseMode: "Markdown", replyMarkup: panel.teclado },
      );
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    if (accion.orden === "off") {
      if (!(await cambiarMantenimiento(supabase, false))) {
        await enviarTelegram("❌ No se ha podido reabrir la app: la nube no responde. Prueba otra vez.");
        marcarProcesado(cuerpo.update_id);
        return NextResponse.json({ ok: true });
      }
      const panel = await generarPanelControl(supabase);
      await enviarTelegram(
        "✅ *Mantenimiento DESACTIVADO*\n\n" +
          "La app vuelve a estar abierta con normalidad para toda la familia.\n\n" +
          panel.texto,
        { parseMode: "Markdown", replyMarkup: panel.teclado },
      );
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    // orden === "estado"
    const panel = await generarPanelControl(supabase);
    await enviarTelegram(panel.texto, {
      parseMode: "Markdown",
      replyMarkup: panel.teclado,
    });
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  if (accion.tipo === "responder") {
    const { data: persona, error: errorPersona } = await supabase
      .from("personas")
      .select("id, nombre, codigo")
      .eq("codigo", accion.codigo)
      .maybeSingle();

    if (errorPersona) {
      await enviarTelegram("❌ La nube no responde ahora mismo. Prueba otra vez en un rato.");
      marcarProcesado(cuerpo.update_id);
      return NextResponse.json({ ok: true });
    }

    if (!persona) {
      await enviarTelegram(
        `❌ No existe nadie con el código ${accion.codigo}. Comprueba las 6 letras.`,
      );
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    const { data: perfilFila, error: errorPerfil } = await supabase
      .from("perfiles")
      .select("datos")
      .eq("persona_id", persona.id)
      .maybeSingle();

    // Si la lectura falla NO se sigue: escribir encima con `{}` borraría el
    // perfil entero de esa persona en la nube.
    if (errorPerfil) {
      await enviarTelegram("❌ No he podido leer su perfil. No he tocado nada; prueba otra vez.");
      marcarProcesado(cuerpo.update_id);
      return NextResponse.json({ ok: true });
    }

    const crudoPerfil = perfilFila?.datos;
    const datosActuales =
      crudoPerfil && typeof crudoPerfil === "object" && !Array.isArray(crudoPerfil)
        ? (crudoPerfil as Record<string, unknown>)
        : {};
    const mensajesPrevios = Array.isArray(datosActuales.mensajesIsaac)
      ? (datosActuales.mensajesIsaac as MensajeIsaac[])
      : [];

    const nuevoMensaje: MensajeIsaac = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      texto: accion.mensaje,
      leido: false,
    };

    const siguientesMensajes = [...mensajesPrevios, nuevoMensaje].slice(-MAX_MENSAJES_ISAAC);
    const nuevosDatos = { ...datosActuales, mensajesIsaac: siguientesMensajes };

    const { error: errorUpsert } = await supabase
      .from("perfiles")
      .upsert(
        { persona_id: persona.id, datos: nuevosDatos, actualizada: new Date().toISOString() },
        { onConflict: "persona_id" },
      );

    if (errorUpsert) {
      await enviarTelegram(`❌ Error al guardar en Supabase: ${errorUpsert.message}`);
      marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
    }

    let pushEntregado = false;
    try {
      const { data: dispFilas } = await supabase
        .from("dispositivos")
        .select("id, suscripcion")
        .eq("persona_id", persona.id);
      pushEntregado =
        (await mandarPush(supabase, dispFilas ?? [], {
          titulo: "Mensaje de Isaac",
          cuerpo: accion.mensaje.slice(0, 180),
          url: "/hoy",
        })) > 0;
    } catch {
      // El mensaje ya está guardado: se verá al abrir la app.
    }

    const quien = escaparMarkdown(persona.nombre?.trim() || "el usuario");
    await enviarTelegram(
      `✅ Mensaje enviado a *${quien}* (${persona.codigo}) en su app.\n\n"${escaparMarkdown(accion.mensaje)}"` +
        (pushEntregado ? "\n\n🔔 Notificación push enviada al móvil." : "\n\n📱 Se mostrará al abrir la app."),
      { parseMode: "Markdown" },
    );
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  if (accion.tipo === "todos") {
    try {
      const res = await enviarComunicadoGlobal(supabase, accion.mensaje);
      await enviarTelegram(
        `📢 Mensaje global enviado a todos los usuarios (${res.perfilesActualizados} perfiles).\n` +
          (res.perfilesFallidos > 0 ? `⚠️ ${res.perfilesFallidos} perfiles no se han podido actualizar.\n` : "") +
          (res.pushEntregados > 0 ? `🔔 ${res.pushEntregados} notificaciones push entregadas.\n\n` : "\n") +
          `"${accion.mensaje}"`,
      );
    } catch {
      await enviarTelegram("❌ No he podido guardar el comunicado en los perfiles. Prueba de nuevo en unos momentos.");
    }
    marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
  }

  marcarProcesado(cuerpo.update_id);
    return NextResponse.json({ ok: true });
}
