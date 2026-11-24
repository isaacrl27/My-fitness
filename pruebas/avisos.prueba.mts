/**
 * Pruebas de los avisos. Se ejecutan con:  node pruebas/avisos.prueba.mts
 *
 * Lo que se comprueba aquí es si el programador decide bien: qué avisos tocan
 * a cada hora y, sobre todo, si calla cuando ya no falta nada. Un aviso de más
 * es la forma más segura de que Isaac los apague todos.
 */

import {
  HORA_AVISO,
  ahoraEnMadrid,
  avisosPendientes,
  avisosQueSeMandan,
  formatearLitros,
  formatoHora,
  horaDeAviso,
  mereceAviso,
  parsearHora,
  suscripcionBuena,
  textoAviso,
  VENTANA_MINUTOS,
  type LoDeHoy,
} from "../lib/avisos.ts";

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

const VACIO: LoDeHoy = { tipos: [], litros: 0, metaLitros: 2 };
const TODO_HECHO: LoDeHoy = {
  tipos: ["desayuno", "comida", "cena"],
  litros: 2.5,
  metaLitros: 2,
};

// ------------------------------------------------------------------
// La hora de España
// ------------------------------------------------------------------

const verano = ahoraEnMadrid(new Date("2026-07-15T12:00:00Z"));
igual(verano.hora, 14, "en julio a las 12 UTC son las 14 en España");
igual(verano.fecha, "2026-07-15", "la fecha de verano se queda igual");

const invierno = ahoraEnMadrid(new Date("2026-01-15T12:00:00Z"));
igual(invierno.hora, 13, "en enero a las 12 UTC son las 13 en España");

const justoAntesDeMedianoche = ahoraEnMadrid(new Date("2026-10-17T22:30:00Z"));
igual(justoAntesDeMedianoche.hora, 0, "a las 00:00 en España devuelve 0, no 24");
igual(justoAntesDeMedianoche.fecha, "2026-10-18", "y la fecha ya es la del día siguiente");

// ------------------------------------------------------------------
// Qué toca a cada hora
// ------------------------------------------------------------------

igual(avisosPendientes(8, 59), [], "a las 8:59 no toca nada");
igual(avisosPendientes(9, 0), ["desayuno"], "a las 9:00 toca el desayuno");
igual(avisosPendientes(9, 45), ["desayuno"], "a las 9:45 todavía cabe el desayuno");
igual(avisosPendientes(10, 1), [], "a las 10:01 el desayuno ya se pasó");
igual(avisosPendientes(14, 30), ["comida"], "a las 14:30 toca la comida");
igual(avisosPendientes(17, 0), ["agua"], "a las 17:00 toca el agua");
igual(avisosPendientes(18, 0), ["andar"], "a las 18:00 toca moverse");
igual(avisosPendientes(21, 0), ["cena"], "a las 21:00 toca la cena");
igual(avisosPendientes(21, 30), ["cena"], "a las 21:30 la cena sigue a tiempo");
igual(avisosPendientes(21, 59), ["cena"], "a las 21:59 la cena se acaba justo");
igual(avisosPendientes(22, 1), [], "a las 22:01 ya no toca nada (siguen siendo 5 avisos)");

// Ningún aviso cae dentro del día dos veces ni se sale de él.
igual(
  Object.values(HORA_AVISO).every((h) => h.hora >= 0 && h.hora <= 23),
  true,
  "todas las horas están dentro del día",
);

// ------------------------------------------------------------------
// Solo si falta algo
// ------------------------------------------------------------------

igual(mereceAviso("desayuno", VACIO), true, "sin nada anotado, el desayuno se avisa");
igual(
  mereceAviso("desayuno", { ...VACIO, tipos: ["desayuno"] }),
  false,
  "ya desayunado, el desayuno no se avisa",
);
igual(mereceAviso("comida", { ...VACIO, tipos: ["cena"] }), true, "cenar no quita el aviso de comer");
igual(mereceAviso("cena", { ...VACIO, tipos: ["snack"] }), true, "merendar no tapa la cena");
igual(mereceAviso("agua", VACIO), true, "sin agua, se avisa");
igual(mereceAviso("agua", { ...VACIO, litros: 1, metaLitros: 2 }), true, "con la mitad, se avisa");
igual(mereceAviso("agua", { ...VACIO, litros: 2, metaLitros: 2 }), false, "con la meta llena, se calla");
igual(mereceAviso("agua", { ...VACIO, litros: 2.4, metaLitros: 2 }), false, "pasado de agua, se calla");
igual(mereceAviso("agua", { ...VACIO, metaLitros: 0 }), false, "sin meta puesta, no se insiste");
igual(mereceAviso("andar", TODO_HECHO), true, "andar se avisa aunque esté todo hecho");
igual(
  mereceAviso("andar", { ...TODO_HECHO, seMovioHoy: true }),
  false,
  "si hoy ya se ha movido (correr, caminar o estirar), el de andar se calla",
);

// ------------------------------------------------------------------
// Que no repita
// ------------------------------------------------------------------

igual(
  mereceAviso("desayuno", VACIO, { desayuno: true }),
  false,
  "si ya salió hoy, no vuelve a salir",
);

// ------------------------------------------------------------------
// Todo junto, como lo usa el servidor
// ------------------------------------------------------------------

// A ninguna hora tocan dos avisos a la vez: la app no pega dos toques seguidos.
igual(avisosQueSeMandan(9, 5, VACIO), ["desayuno"], "a las 9:05 con todo vacío falta el desayuno");
igual(avisosQueSeMandan(9, 5, TODO_HECHO), [], "a las 9:05 con todo hecho no se molesta a nadie");
igual(
  avisosQueSeMandan(18, 20, { ...VACIO, litros: 2 }),
  ["andar"],
  "a las 18:20 bebiendo ya toda la meta, solo queda andar",
);
igual(avisosQueSeMandan(3, 0, VACIO), [], "de madrugada la app duerme");

// ------------------------------------------------------------------
// Los textos
// ------------------------------------------------------------------

igual(formatearLitros(1.25), "1,25 litros", "los litros con coma decimal");
igual(formatearLitros(2), "2 litros", "los litros redondos no llevan ceros");

const texto = textoAviso("agua", 0.75);
igual(texto.url, "/hoy", "el aviso de agua abre la pantalla de Hoy");
igual(texto.cuerpo.includes("0,75"), true, "el aviso de agua dice cuánto falta");
igual(textoAviso("andar").url, "/hoy", "el aviso de andar abre Hoy, que es donde se marcan los hábitos y los pasos");

// ------------------------------------------------------------------
// Los hábitos viajan dentro de los 5 avisos de siempre (sin avisos nuevos)
// ------------------------------------------------------------------

igual(Object.keys(HORA_AVISO).length, 5, "siguen siendo exactamente 5 avisos al día");

const CENA_HECHA: LoDeHoy = { ...TODO_HECHO, tipos: ["desayuno", "comida", "cena"] };

// Cena ya anotada, pero queda un hábito de la noche: el aviso de las 21:00 se usa para eso.
igual(
  mereceAviso("cena", { ...CENA_HECHA, habitosPendientes: { cena: ["leer"] } }),
  true,
  "cena anotada con hábitos de la noche pendientes, el aviso toca",
);
igual(
  textoAviso("cena", undefined, ["leer"], true).titulo,
  "Tus hábitos de hoy",
  "el título pasa a ser de hábitos",
);
igual(
  textoAviso("cena", undefined, ["leer"], true).cuerpo,
  "¿Ya has hecho: Leer? Márcalo en un toque.",
  "y el cuerpo nombra al hábito que falta",
);

// Un hábito propio se dice con el nombre que escribió la persona, no con su id.
igual(
  textoAviso("cena", undefined, ["propio:sacar-al-perro"], true, [
    { id: "propio:sacar-al-perro", etiqueta: "Sacar al perro" },
  ]).cuerpo,
  "¿Ya has hecho: Sacar al perro? Márcalo en un toque.",
  "el aviso dice el nombre del hábito propio",
);

// Cena anotada y sin pendientes: nada.
igual(mereceAviso("cena", CENA_HECHA), false, "cena anotada y sin pendientes, se calla");

// Cena sin anotar + pendientes: manda la de comida y detrás los hábitos.
igual(
  mereceAviso("cena", { ...VACIO, habitosPendientes: { cena: ["leer", "dormir"] } }),
  true,
  "cena sin anotar, el aviso sale vaya o no con pendientes",
);
igual(
  textoAviso("cena", undefined, ["leer", "dormir"], false).cuerpo,
  "La cena también cuenta. Y acuérdate de: Leer y Dormir 7-8 h.",
  "sin anotar, la frase de siempre y detrás lo que falta",
);

// Los pendientes solo miran su franja: lo de la mañana no enciende la noche.
igual(
  mereceAviso("cena", { ...CENA_HECHA, habitosPendientes: { desayuno: ["vitaminas"] } }),
  false,
  "pendientes de la mañana no encienden el aviso de la noche",
);

// Máximo 3 etiquetas y «…» si hay más.
igual(
  textoAviso("cena", undefined, ["leer", "dormir", "sol", "meditar"], true).cuerpo,
  "¿Ya has hecho: Leer, Dormir 7-8 h y Tomar el sol…? Márcalo en un toque.",
  "con 4 pendientes enseña 3 y acaba en «…»",
);

// Todo junto, a la hora de la cena.
igual(
  avisosQueSeMandan(21, 45, { ...CENA_HECHA, habitosPendientes: { cena: ["leer"] } }),
  ["cena"],
  "a las 21:45 con la cena hecha y un hábito pendiente, sale el aviso de esa hora",
);
igual(
  avisosQueSeMandan(21, 45, { ...CENA_HECHA, habitosPendientes: { cena: [] } }),
  [],
  "y con todo marcado, a las 21:45 no se molesta a nadie",
);

// ------------------------------------------------------------------
// Horarios personalizados de comidas y avisos (moldeable)
// ------------------------------------------------------------------

igual(formatoHora({ hora: 9, minuto: 0 }), "09:00", "formatoHora formatea con 2 dígitos");
igual(formatoHora({ hora: 14, minuto: 30 }), "14:30", "formatoHora con minuto de 2 dígitos");
igual(parsearHora("08:15"), { hora: 8, minuto: 15 }, "parsearHora extrae hora y minuto válidos");
igual(parsearHora("23:59"), { hora: 23, minuto: 59 }, "parsearHora con fin de día");
igual(parsearHora("invalido"), null, "parsearHora devuelve null si el formato no es HH:MM");
igual(parsearHora("25:00"), null, "parsearHora rechaza horas > 23");
igual(parsearHora("12:65"), null, "parsearHora rechaza minutos > 59");

// horaDeAviso
igual(horaDeAviso("desayuno"), { hora: 9, minuto: 0 }, "sin personalizar devuelve la hora por defecto");
igual(
  horaDeAviso("desayuno", { desayuno: { hora: 8, minuto: 0 } }),
  { hora: 8, minuto: 0 },
  "personalizado devuelve la hora del usuario",
);

// avisosPendientes con horas personalizadas
const horarioUsuario = {
  desayuno: { hora: 8, minuto: 0 }, // Desayuna a las 8:00 en vez de las 9:00
  comida: { hora: 15, minuto: 0 },   // Come a las 15:00 en vez de las 14:30
  cena: { hora: 22, minuto: 0 },     // Cena a las 22:00 en vez de las 21:00
};

igual(
  avisosPendientes(8, 0, VENTANA_MINUTOS, horarioUsuario),
  ["desayuno"],
  "a las 8:00 toca el desayuno personalizado",
);
igual(
  avisosPendientes(9, 5, VENTANA_MINUTOS, horarioUsuario),
  [],
  "a las 9:05 ya no toca el desayuno porque su hora era a las 8:00 (pasó ventana de 60m)",
);
igual(
  avisosPendientes(14, 30, VENTANA_MINUTOS, horarioUsuario),
  [],
  "a las 14:30 ya no toca la comida si el usuario come a las 15:00",
);
igual(
  avisosPendientes(15, 10, VENTANA_MINUTOS, horarioUsuario),
  ["comida"],
  "a las 15:10 toca la comida personalizada a las 15:00",
);
igual(
  avisosQueSeMandan(8, 5, VACIO, {}, horarioUsuario),
  ["desayuno"],
  "avisosQueSeMandan respeta el horario personalizado del usuario",
);

// ------------------------------------------------------------------
// Validaci?n anti-SSRF de suscripciones Web Push
// ------------------------------------------------------------------

const LLAVES_OK = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};

igual(
  suscripcionBuena({ endpoint: "https://fcm.googleapis.com/fcm/send/abc123", keys: LLAVES_OK }),
  true,
  "acepta endpoint oficial de FCM por HTTPS",
);
igual(
  suscripcionBuena({ endpoint: "https://web.push.apple.com/Q12345", keys: LLAVES_OK }),
  true,
  "acepta endpoint oficial de Apple Web Push por HTTPS",
);
igual(
  suscripcionBuena({ endpoint: "https://updates.push.services.mozilla.com/wpush/v2/abc", keys: LLAVES_OK }),
  true,
  "acepta endpoint oficial de Mozilla Web Push por HTTPS",
);
igual(
  suscripcionBuena({ endpoint: "http://fcm.googleapis.com/fcm/send/abc123", keys: LLAVES_OK }),
  false,
  "rechaza suscripci?n sin HTTPS",
);
igual(
  suscripcionBuena({ endpoint: "https://localhost/push", keys: LLAVES_OK }),
  false,
  "rechaza localhost (anti-SSRF)",
);
igual(
  suscripcionBuena({ endpoint: "https://127.0.0.1/push", keys: LLAVES_OK }),
  false,
  "rechaza IP local 127.0.0.1 (anti-SSRF)",
);
igual(
  suscripcionBuena({ endpoint: "https://169.254.169.254/latest/meta-data/", keys: LLAVES_OK }),
  false,
  "rechaza IP de metadatos cloud 169.254.169.254 (anti-SSRF)",
);
igual(
  suscripcionBuena({ endpoint: "https://atacante.ejemplo.com/webhook", keys: LLAVES_OK }),
  false,
  "rechaza dominio externo arbitrario (anti-SSRF)",
);
igual(
  suscripcionBuena({ endpoint: "https://storage.googleapis.com/bucket/x", keys: LLAVES_OK }),
  false,
  "rechaza otros subdominios de googleapis que no sean Web Push",
);
igual(
  suscripcionBuena({ endpoint: "https://fcm.googleapis.com:8443/fcm/send/abc", keys: LLAVES_OK }),
  false,
  "rechaza puertos no est?ndar en endpoint Web Push",
);
igual(
  suscripcionBuena({ endpoint: "https://usuario:clave@fcm.googleapis.com/fcm/send/abc", keys: LLAVES_OK }),
  false,
  "rechaza credenciales incrustadas en la URL del endpoint",
);
igual(
  suscripcionBuena({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "corta", auth: "corta" } }),
  false,
  "rechaza llaves criptogr?ficas demasiado cortas",
);

{
  const { default: webpush } = await import("web-push");
  const { enviarPushA, enviarPushPorCodigo } = await import("../lib/push.ts");
  const claves = webpush.generateVAPIDKeys();
  const prevPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const prevPriv = process.env.VAPID_PRIVATE_KEY;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = claves.publicKey;
  process.env.VAPID_PRIVATE_KEY = claves.privateKey;

  try {
    const consultas: Array<{ tabla: string; col?: string; val?: string }> = [];
    const crearSupabaseMock = (filasDispositivos: Array<{ id: string; suscripcion: unknown }>) => {
      const sb = {
        from(tabla: string) {
          const registro: { tabla: string; col?: string; val?: string } = { tabla };
          const cadena = {
            select() {
              return cadena;
            },
            eq(col: string, val: string) {
              registro.col = col;
              registro.val = val;
              consultas.push({ ...registro });
              return cadena;
            },
            not() {
              return cadena;
            },
            update() {
              return {
                eq: async () => ({ error: null }),
              };
            },
            async maybeSingle() {
              return { data: null, error: null };
            },
            then<TResult1 = { data: Array<{ id: string; suscripcion: unknown }>; error: null }>(
              onfulfilled?: ((value: { data: Array<{ id: string; suscripcion: unknown }>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
            ) {
              const res = { data: tabla === "dispositivos" ? filasDispositivos : [], error: null };
              return Promise.resolve(res).then(onfulfilled ?? undefined);
            },
          };
          return cadena;
        },
      };
      return sb as unknown as Parameters<typeof enviarPushA>[0];
    };

    const enviadosSsrf = await enviarPushA(
      crearSupabaseMock([
        {
          id: "disp-ssrf",
          suscripcion: {
            endpoint: "https://169.254.169.254/latest/meta-data",
            keys: { p256dh: "p".repeat(32), auth: "a".repeat(20) },
          },
        },
      ]),
      "11111111-1111-4111-8111-111111111111",
      { titulo: "Test", cuerpo: "Cuerpo" },
    );
    igual(enviadosSsrf, 0, "enviarPushA descarta endpoints SSRF antes de hacer fetch");

    consultas.length = 0;
    const enviadosNoUuid = await enviarPushPorCodigo(
      crearSupabaseMock([]),
      "isaac_abc12",
      { titulo: "Test", cuerpo: "Cuerpo" },
    );
    igual(enviadosNoUuid, 0, "enviarPushPorCodigo no falla con identificador que no es UUID");
    igual(
      consultas.some((c) => c.tabla === "personas" && c.col === "codigo" && c.val === "ISAAC_ABC12"),
      true,
      "enviarPushPorCodigo busca primero por personas.codigo",
    );
    igual(
      consultas.some((c) => c.tabla === "personas" && c.col === "id"),
      false,
      "enviarPushPorCodigo no consulta personas.id si el identificador no tiene formato UUID",
    );
    igual(
      consultas.some((c) => c.tabla === "dispositivos" && c.col === "id" && c.val === "isaac_abc12"),
      true,
      "enviarPushPorCodigo cae a dispositivos.id tras omitir personas.id no-UUID",
    );

    consultas.length = 0;
    const uuidValido = "11111111-1111-4111-8111-111111111111";
    await enviarPushPorCodigo(crearSupabaseMock([]), uuidValido, { titulo: "Test", cuerpo: "Cuerpo" });
    igual(
      consultas.some((c) => c.tabla === "personas" && c.col === "id" && c.val === uuidValido),
      true,
      "enviarPushPorCodigo si consulta personas.id cuando el identificador es UUID valido",
    );
  } finally {
    if (prevPub === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = prevPub;
    if (prevPriv === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = prevPriv;
  }
}

console.log("");
console.log(fallos === 0 ? `${hechas} de ${hechas} bien.` : `${fallos} FALLAS de ${hechas}.`);
if (fallos > 0) process.exit(1);
