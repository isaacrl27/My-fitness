import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extraerCodigoDeMensaje,
  parsearMensajeTelegram,
} from "../lib/telegram-parser.ts";

test("extraer código de un aviso del buzón", () => {
  const aviso = `⚠️ Problema de Mamá (Ajustes)
Código: F669CT

"No se ve bien la letra"

━━━━━━━━━━━━━━━━━━━━
👉 Para responderle a su app, responde a este mensaje o envía:
/responder F669CT <tu respuesta>`;

  assert.equal(extraerCodigoDeMensaje(aviso), "F669CT");
  assert.equal(extraerCodigoDeMensaje("sin codigo"), null);
  assert.equal(extraerCodigoDeMensaje(null), null);
});

test("parsear /ayuda y /start", () => {
  assert.deepEqual(parsearMensajeTelegram("/start"), { tipo: "ayuda" });
  assert.deepEqual(parsearMensajeTelegram("/ayuda"), { tipo: "ayuda" });
  assert.deepEqual(parsearMensajeTelegram("/help"), { tipo: "ayuda" });
});

test("parsear /todos", () => {
  assert.deepEqual(
    parsearMensajeTelegram("/todos Ya está disponible la versión 1.2 con letra grande"),
    {
      tipo: "todos",
      mensaje: "Ya está disponible la versión 1.2 con letra grande",
    },
  );
  assert.deepEqual(
    parsearMensajeTelegram("/broadcast Novedades importantes"),
    {
      tipo: "todos",
      mensaje: "Novedades importantes",
    },
  );
  assert.deepEqual(
    parsearMensajeTelegram("/aviso Atención a todos los usuarios"),
    {
      tipo: "todos",
      mensaje: "Atención a todos los usuarios",
    },
  );
  assert.deepEqual(
    parsearMensajeTelegram("/comunicado Mensaje urgente de Isaac"),
    {
      tipo: "todos",
      mensaje: "Mensaje urgente de Isaac",
    },
  );
});

test("parsear /responder con código directo", () => {
  assert.deepEqual(
    parsearMensajeTelegram("/responder ABC123 Ya te he subido el tamaño de letra"),
    {
      tipo: "responder",
      codigo: "ABC123",
      mensaje: "Ya te he subido el tamaño de letra",
    },
  );
  assert.deepEqual(
    parsearMensajeTelegram("/mensaje xyz789 Hola!"),
    {
      tipo: "responder",
      codigo: "XYZ789",
      mensaje: "Hola!",
    },
  );
});

test("parsear respuesta nativa con swipe reply", () => {
  const mensajePrevio = `💡 Idea de Papá\nCódigo: K99ZZZ\n\n"Poner modo oscuro"`;

  assert.deepEqual(
    parsearMensajeTelegram("¡Buena idea, lo preparo para la semana que viene!", mensajePrevio),
    {
      tipo: "responder",
      codigo: "K99ZZZ",
      mensaje: "¡Buena idea, lo preparo para la semana que viene!",
    },
  );

  // Si además escribió /responder por costumbre dentro del reply
  assert.deepEqual(
    parsearMensajeTelegram("/responder Hecho!", mensajePrevio),
    {
      tipo: "responder",
      codigo: "K99ZZZ",
      mensaje: "Hecho!",
    },
  );
});

test("parsear comandos de mantenimiento", () => {
  assert.deepEqual(parsearMensajeTelegram("/mantenimiento on"), {
    tipo: "mantenimiento",
    orden: "on",
    minutos: undefined,
  });
  assert.deepEqual(parsearMensajeTelegram("/mantenimiento on 20"), {
    tipo: "mantenimiento",
    orden: "on",
    minutos: 20,
  });
  assert.deepEqual(parsearMensajeTelegram("/cortar 15"), {
    tipo: "mantenimiento",
    orden: "on",
    minutos: 15,
  });
  assert.deepEqual(parsearMensajeTelegram("/mantenimiento off"), {
    tipo: "mantenimiento",
    orden: "off",
    minutos: undefined,
  });
  assert.deepEqual(parsearMensajeTelegram("/abrir"), {
    tipo: "mantenimiento",
    orden: "off",
    minutos: undefined,
  });
  assert.deepEqual(parsearMensajeTelegram("/mantenimiento estado"), {
    tipo: "mantenimiento",
    orden: "estado",
    minutos: undefined,
  });
});

test("parsear comandos de panel de control", () => {
  assert.deepEqual(parsearMensajeTelegram("/panel"), { tipo: "panel" });
  assert.deepEqual(parsearMensajeTelegram("panel"), { tipo: "panel" });
  assert.deepEqual(parsearMensajeTelegram("panel de control"), { tipo: "panel" });
  assert.deepEqual(parsearMensajeTelegram("/control"), { tipo: "panel" });
  assert.deepEqual(parsearMensajeTelegram("/estado"), { tipo: "panel" });
  assert.deepEqual(parsearMensajeTelegram("estado"), { tipo: "panel" });
});

test("parsear comandos de usuarios y familia", () => {
  assert.deepEqual(parsearMensajeTelegram("/usuarios"), { tipo: "usuarios" });
  assert.deepEqual(parsearMensajeTelegram("usuarios"), { tipo: "usuarios" });
  assert.deepEqual(parsearMensajeTelegram("/familia"), { tipo: "usuarios" });
  assert.deepEqual(parsearMensajeTelegram("familia"), { tipo: "usuarios" });
});

test("ignorar textos vacíos o no reconocidos", () => {
  assert.equal(parsearMensajeTelegram("").tipo, "ignorado");
  assert.equal(parsearMensajeTelegram("hola que tal").tipo, "ignorado");
});
