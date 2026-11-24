/**
 * Analizador de mensajes entrantes del bot de Telegram.
 *
 * Pura, sin efectos secundarios ni dependencias de red: así se puede probar
 * al 100% sin tocar Telegram ni la base de datos.
 */

export type AccionTelegram =
  | { tipo: "ayuda" }
  | { tipo: "panel" }
  | { tipo: "usuarios" }
  | { tipo: "todos"; mensaje: string }
  | { tipo: "responder"; codigo: string; mensaje: string }
  | { tipo: "mantenimiento"; orden: "on" | "off" | "estado"; minutos?: number }
  | { tipo: "ignorado"; motivo: string };

/**
 * Busca un código de 6 letras en un mensaje previo (por ejemplo el aviso del buzón).
 */
export function extraerCodigoDeMensaje(texto?: string | null): string | null {
  if (!texto) return null;
  const match = texto.match(/Código:\s*([A-Za-z0-9]{6})/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Interpreta lo que Isaac ha escrito o respondido en Telegram.
 */
export function parsearMensajeTelegram(
  textoEntrante?: string | null,
  textoRespondido?: string | null,
): AccionTelegram {
  // Desde el menú de comandos o un grupo, Telegram manda «/panel@MiBot»:
  // se quita el «@MiBot» del primer comando para que se entienda igual.
  const texto = (textoEntrante ?? "").trim().replace(/^(\/[A-Za-z_]+)@[A-Za-z0-9_]+/, "$1");
  if (!texto) return { tipo: "ignorado", motivo: "Texto vacío" };

  if (texto === "/start" || texto === "/ayuda" || texto === "/help") {
    return { tipo: "ayuda" };
  }

  // Panel de control: /panel, panel, /control, panel de control, /estado, estado
  const textoMin = texto.toLowerCase();
  if (
    texto === "/panel" ||
    textoMin === "panel" ||
    textoMin === "panel de control" ||
    texto === "/control" ||
    textoMin === "control" ||
    texto === "/estado" ||
    textoMin === "estado"
  ) {
    return { tipo: "panel" };
  }

  // Listado de usuarios: /usuarios, usuarios, /familia, familia
  if (
    texto === "/usuarios" ||
    textoMin === "usuarios" ||
    texto === "/familia" ||
    textoMin === "familia"
  ) {
    return { tipo: "usuarios" };
  }

  // Control de mantenimiento: /mantenimiento [on|off|estado] [minutos] o /cortar o /abrir
  const matchMantenimiento = texto.match(
    /^\/(?:mantenimiento|cortar|abrir)(?:\s+(on|off|estado))?(?:\s+(\d+))?$/i,
  );
  if (matchMantenimiento) {
    let orden = (matchMantenimiento[1] || "").toLowerCase() as "on" | "off" | "estado";
    if (!orden) {
      if (texto.toLowerCase().startsWith("/cortar")) orden = "on";
      else if (texto.toLowerCase().startsWith("/abrir")) orden = "off";
      else orden = "estado";
    }
    const minutos = matchMantenimiento[2]
      ? Number.parseInt(matchMantenimiento[2], 10)
      : undefined;
    return { tipo: "mantenimiento", orden, minutos };
  }

  // Mensaje para todos: /todos <texto>
  const matchTodos = texto.match(/^\/(?:todos|broadcast|novedades|aviso|comunicado|importante)\s+([\s\S]+)$/i);
  if (matchTodos) {
    const mensaje = matchTodos[1].trim();
    if (!mensaje) return { tipo: "ignorado", motivo: "Mensaje vacío para todos" };
    return { tipo: "todos", mensaje };
  }

  // Comando con código explícito: /responder CODIGO <texto>
  const matchResponder = texto.match(
    /^\/(?:responder|mensaje|contestar)\s+([A-Za-z0-9]{6})\s+([\s\S]+)$/i,
  );
  if (matchResponder) {
    const codigo = matchResponder[1].toUpperCase();
    const mensaje = matchResponder[2].trim();
    if (!mensaje) return { tipo: "ignorado", motivo: "Mensaje vacío para el usuario" };
    return { tipo: "responder", codigo, mensaje };
  }

  // Respuesta nativa (swipe reply) a un mensaje que contiene "Código: XXXXXX"
  const codigoRespondido = extraerCodigoDeMensaje(textoRespondido);
  if (codigoRespondido) {
    const mensajeLimpio = texto.replace(/^\/(?:responder|mensaje|contestar)\s*/i, "").trim();
    if (!mensajeLimpio) return { tipo: "ignorado", motivo: "Mensaje vacío en respuesta" };
    return { tipo: "responder", codigo: codigoRespondido, mensaje: mensajeLimpio };
  }

  return { tipo: "ignorado", motivo: "No reconocido" };
}
