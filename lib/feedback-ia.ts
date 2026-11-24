/**
 * El clasificador del buzón: pone etiqueta a cada mensaje de la familia.
 *
 * Cuando alguien cuenta un problema o una idea desde Ajustes, el mensaje se
 * guarda al momento y, después de contestar, se le pide a Gemini que lo
 * clasifique. Solo se le manda el texto, la pantalla y si la persona lo marcó
 * como problema o idea. Nunca el peso, las comidas, el ciclo, la edad ni nada
 * de salud: el clasificador no necesita saber nada de eso para decir si es un
 * fallo, una duda o una idea.
 *
 * Una excepción: si alguien escribe algo que suena a problema médico (un
 * síntoma, un desmayo, dejar de comer, una pastilla), se marca como
 * `salud_medico` y se avisa a Isaac por Telegram como prioritario. La app NO
 * toca las calorías ni las metas por su cuenta: eso lo decide una persona.
 *
 * Si Gemini no está configurado o falla, no pasa nada: el mensaje ya está
 * guardado y se queda sin etiqueta. El buzón funciona igual.
 */

/** Las seis etiquetas del clasificador (viven en `feedback-categorias.ts`). */
export type { CategoriaFeedback } from "./feedback-categorias.ts";
import { CATEGORIAS, categoriaDe, type CategoriaFeedback } from "./feedback-categorias.ts";
import { extraerTextoCandidato } from "./ia-alimentos.ts";
import { MODELOS_TEXTO_IA, URL_BASE_GEMINI, thinkingConfigDeModelo } from "./gemini-modelos.ts";

/** Lo que devuelve el clasificador. */
export type Clasificacion = {
  categoria: CategoriaFeedback;
  /** Si hay que avisar a Isaac con prioridad. */
  alertaSalud: boolean;
};

/** Lo único que sale del móvil hacia Gemini: nada de datos personales. */
export type EntradaClasificador = {
  texto: string;
  pantalla: string;
  /** Lo que la persona marcó: "problema" o "mejora". */
  tipoDeclarado: string;
};

const URL_GEMINI = URL_BASE_GEMINI;

/**
 * El modelo barato primero; si está lleno, caído o retirado (404), el
 * siguiente cubo gratis. Todos son del nivel gratuito.
 */
const MODELOS = MODELOS_TEXTO_IA;

/** El clasificador no debe tardar: si tarda, se deja sin etiqueta. */
const ESPERA_MS = 8000;

/** La instrucción que recibe el modelo. */
export const PROMPT_CLASIFICADOR = `Clasifica el mensaje de un usuario de una app de control de peso. Devuelve solo el JSON pedido.

Categorías:
- bug_bloqueante: algo no deja usar la app (no guarda, se cierra, un botón no responde, error que impide continuar).
- bug_visual: algo se ve mal pero se puede usar (descuadrado, texto cortado, color raro).
- duda: pregunta sobre cómo funciona algo.
- sugerencia: idea o mejora que no es un fallo.
- salud_medico: habla de síntomas, desmayos, mareos, dejar de comer, atracones, vómitos, medicación, o pide consejo médico. Marca alertaSalud=true.
- spam: publicidad, insultos, texto sin sentido o repetido.

alertaSalud debe ser true solo cuando haya un riesgo real para la salud. No marques salud_medico por hablar de comida, peso o dieta en general: solo por síntomas, conductas de riesgo o medicación.`;

/** El esquema de respuesta que se le exige al modelo. */
export const ESQUEMA_CLASIFICACION = {
  type: "OBJECT",
  properties: {
    categoria: { type: "STRING", enum: CATEGORIAS },
    alertaSalud: { type: "BOOLEAN" },
  },
  required: ["categoria", "alertaSalud"],
};

/**
 * Del texto crudo de Gemini a la clasificación.
 *
 * Tolera lo que suele pasar: que venga envuelto en ```json```, que el JSON no
 * esté cerrado o que la categoría no sea ninguna de las seis. En cualquiera de
 * esos casos devuelve `null` y el mensaje se queda sin etiqueta, que es mejor
 * que ponerle una falsa.
 */
export function leerClasificacion(textoCrudo: string): Clasificacion | null {
  const limpio = textoCrudo
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;

  const bruto = json as Record<string, unknown>;
  const categoria = categoriaDe(bruto.categoria);
  if (!categoria) return null;

  const alertaSalud = bruto.alertaSalud === true || categoria === "salud_medico";
  return { categoria, alertaSalud };
}

/**
 * Las palabras que, si aparecen, hacen saltar el aviso de salud aunque la IA
 * no esté disponible. Van sin tildes porque el texto se compara normalizado.
 *
 * Esto es una red de seguridad, no un diagnóstico: si alguien escribe «me
 * mareo al no desayunar» y Gemini está caído o sin clave, Isaac tiene que
 * enterarse igual. Mejor un aviso de más que uno de menos.
 */
const PALABRAS_SALUD = [
  "mare",
  "desmay",
  "vomit",
  "atrac",
  "pastilla",
  "medicament",
  "medicacion",
  "sangr",
  "dolor",
  "duele",
  "ansiedad",
  "ansios",
  "depres",
  "anorex",
  "bulim",
  "trastorno",
  "hospital",
  "urgencia",
  "medico",
  "doctor",
  "enfermer",
  "sintoma",
  "fiebre",
  "embaraz",
  "lactancia",
  "diabet",
  "tiroides",
  "antidepresiv",
  "insulina",
  "hipoglucem",
  "desnutri",
  "dejar de comer",
  "deje de comer",
  "no puedo comer",
  "saltarme comidas",
  "deshidrat",
  "taquicard",
  "laxante",
  "purga",
  "suicid",
  "autolesion",
];

/** Quita las tildes para comparar sin depender de cómo se escriba. */
function sinTildes(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** ¿El texto huele a tema de salud? Funciona sin red y sin IA. */
export function sospechaSalud(texto: string): boolean {
  const limpio = sinTildes(texto);
  return PALABRAS_SALUD.some((palabra) => limpio.includes(palabra));
}

/**
 * La etiqueta final de un mensaje.
 *
 * Si la IA contesta, manda ella, pero una sospecha local de salud siempre
 * enciende la alerta: el modelo puede quedarse corto y la red no. Si la IA no
 * contesta, la sospecha local basta para etiquetar el mensaje como salud.
 */
export function clasificacionFinal(
  delModelo: Clasificacion | null,
  texto: string,
): Clasificacion | null {
  const sospecha = sospechaSalud(texto);
  if (!delModelo) {
    return sospecha ? { categoria: "salud_medico", alertaSalud: true } : null;
  }
  if (!sospecha || delModelo.alertaSalud) return delModelo;
  return { ...delModelo, alertaSalud: true };
}

/** Una llamada a Gemini con el esquema del clasificador. */
async function llamarGemini(
  modelo: string,
  entrada: EntradaClasificador,
  clave: string,
): Promise<{ estado: number; texto: string | null }> {
  // Se manda un objeto con SOLO estos tres campos. Si algún día alguien añade
  // datos aquí, que sea algo que no identifique ni describa a la persona.
  const mensaje = JSON.stringify({
    texto: entrada.texto,
    pantalla: entrada.pantalla,
    tipoDeclarado: entrada.tipoDeclarado,
  });

  const respuesta = await fetch(`${URL_GEMINI}/${modelo}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": clave,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PROMPT_CLASIFICADOR}\n\nMensaje:\n${mensaje}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ESQUEMA_CLASIFICACION,
        ...(thinkingConfigDeModelo(modelo, "minima")
          ? { thinkingConfig: thinkingConfigDeModelo(modelo, "minima") }
          : {}),
      },
    }),
    signal: AbortSignal.timeout(ESPERA_MS),
  });

  if (!respuesta.ok) return { estado: respuesta.status, texto: null };

  // Los modelos 3.x «piensan» y mandan partes `thought: true` antes del JSON:
  // se lee la última parte de texto que no sea pensamiento.
  const texto = extraerTextoCandidato(await respuesta.json());
  return texto !== null ? { estado: 200, texto } : { estado: 502, texto: null };
}

/**
 * Pide la clasificación a Gemini.
 *
 * Devuelve `null` sin ruido si no hay clave, si el modelo está lleno o si la
 * respuesta no se puede leer. Nunca lanza: quien llama está en un `after()` y
 * un fallo aquí no debe romper nada.
 */
export async function clasificarComentario(
  entrada: EntradaClasificador,
): Promise<Clasificacion | null> {
  const clave = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!clave) return null;

  for (const modelo of MODELOS) {
    try {
      const r = await llamarGemini(modelo, entrada, clave);
      // Lleno (429), retirado (404), caído (5xx) o respuesta vacía: se prueba
      // el siguiente modelo en vez de dejar el mensaje sin etiqueta.
      if (r.estado === 429 || r.estado === 404 || r.estado >= 500 || r.texto === null) continue;
      if (r.estado !== 200) return null;
      const leida = leerClasificacion(r.texto);
      if (leida) return leida;
    } catch {
      // Tiempo agotado o red caída: siguiente modelo.
    }
  }
  return null;
}

/**
 * El texto del aviso prioritario de Telegram.
 *
 * Va aparte del aviso normal para que en el móvil de Isaac se vea de un
 * vistazo que hay que mirarlo ya, y con la recomendación de responder como
 * persona y no como app.
 */
export function avisoSaludDelBuzon(
  texto: string,
  nombre: string,
  pantalla: string,
  codigo?: string,
): string {
  const quien = nombre.trim() || "alguien de la familia";
  const donde = pantalla ? ` (${pantalla})` : "";
  // Con el código, Isaac puede contestar deslizando el aviso en Telegram
  // (el bot lo lee con `extraerCodigoDeMensaje`), igual que en el aviso normal.
  const limpio = (codigo ?? "").trim().toUpperCase();
  return [
    "🚨 POSIBLE TEMA DE SALUD EN EL BUZÓN",
    `De ${quien}${donde}`,
    ...(limpio ? [`Código: ${limpio}`] : []),
    "",
    `"${texto}"`,
    "",
    "Responde como persona, no como app: no cambies metas ni calorías por tu cuenta.",
  ].join("\n");
}