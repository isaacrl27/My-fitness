import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { expect, type BrowserContext, type Page } from "@playwright/test";

const contextosAislados = new WeakSet<BrowserContext>();

/**
 * Evita que las pruebas E2E escriban en el Supabase real si el servidor local
 * arrancó con `.env.local`. Las pruebas que registran su propio `page.route(...)`
 * siguen teniendo prioridad sobre `context.route(...)`.
 */
export async function aislarNubeEnPrueba(page: Page): Promise<void> {
  const ctx = page.context();
  if (contextosAislados.has(ctx)) return;
  contextosAislados.add(ctx);
  await ctx.route(
    (url) =>
      url.pathname.startsWith("/api/nube") ||
      url.pathname.startsWith("/api/comentarios") ||
      url.pathname.startsWith("/api/avisos/") ||
      url.pathname.startsWith("/api/social/") ||
      url.pathname.startsWith("/api/admin/") ||
      url.pathname.startsWith("/api/widget"),
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          hay: false,
          ok: false,
          motivo: "Sin nube configurada: pruebas E2E aisladas.",
        }),
      }),
  );
}

/** La clave que usa la app para guardar todo en el móvil. */
export const CLAVE_DATOS = "mi-peso:v1";
export const CLAVE_NOVEDADES = "mi-peso:novedades";

/**
 * La clave de la puerta.
 *
 * Vive en el fichero de secretos de Isaac, fuera del vault, así que se lee en
 * tiempo de ejecución. Aquí no se escribe nunca.
 */
export function claveDeLaPuerta(): string {
  const clave = (process.env.CLAVE_APP ?? "").trim();
  if (!clave) throw new Error("Define CLAVE_APP en el entorno para ejecutar las pruebas E2E.");
  return clave;
}

/** El perfil de prueba, para no repetir el cuestionario en cada prueba. */
export const PERFIL = {
  nombre: "Isaac",
  sexo: "hombre",
  fechaNacimiento: "1998-04-12",
  alturaCm: 178,
  pesoInicialKg: 84,
  pesoObjetivoKg: 76,
  actividad: "ligero",
  ritmoKgSemana: 0.5,
  dieta: "ninguna",
  noLeGustan: ["hígado"],
  creado: "2026-10-17T08:00:00.000Z",
};

/** Una fecha de hace n días, en el formato que usa la app por dentro. */
export function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Datos de partida: perfil puesto y casi dos semanas de pesadas. */
export function datosBase(): Record<string, unknown> {
  return {
    perfil: PERFIL,
    pesadas: [
      { fecha: diasAtras(13), kg: 85.4 },
      { fecha: diasAtras(10), kg: 85.1 },
      { fecha: diasAtras(7), kg: 84.8 },
      { fecha: diasAtras(4), kg: 84.3 },
      { fecha: diasAtras(1), kg: 84 },
    ],
    comidas: [],
    aguaLitros: {},
    metaAguaL: 2,
    gustos: {},
  };
}

/**
 * Deja los datos ya puestos antes de que la app arranque.
 *
 * Solo escribe si no hay nada guardado: si no, cada navegación borraría lo que
 * la propia prueba acaba de anotar.
 */
export async function sembrar(
  page: Page,
  datos: Record<string, unknown>,
  yaVioNovedades = true,
): Promise<void> {
  await aislarNubeEnPrueba(page);
  await page.addInitScript(
    (carga) => {
      const [clave, contenido, yaVio] = carga as [string, string, boolean];
      if (!window.localStorage.getItem(clave)) window.localStorage.setItem(clave, contenido);
      if (yaVio && !window.localStorage.getItem("mi-peso:novedades")) {
        window.localStorage.setItem("mi-peso:novedades", "100");
      }
      if (!window.localStorage.getItem("mi-peso:privacidad-aceptada")) {
        window.localStorage.setItem("mi-peso:privacidad-aceptada", "2026-01-01T00:00:00.000Z");
      }
      const d = new Date();
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const dia = String(d.getDate()).padStart(2, "0");
      const hoyStr = `${d.getFullYear()}-${mes}-${dia}`;
      if (!window.localStorage.getItem(`mi-peso:racha-celebrada-dia:${hoyStr}`)) {
        window.localStorage.setItem(`mi-peso:racha-celebrada-dia:${hoyStr}`, "1");
      }
    },
    [CLAVE_DATOS, JSON.stringify(datos), yaVioNovedades],
  );
}

/**
 * Enciende el ventilador de la puerta.
 *
 * Desde el Vídeo 4 el formulario de acceso está a oscuras (sin clics) hasta que
 * se tira del cordón. Con teclado basta Enter sobre el cordón, que es la vía
 * normal para quien no puede arrastrar. Si la puerta no lleva ventilador (o ya
 * está encendido), no hace nada.
 */
export async function encenderVentilador(page: Page): Promise<void> {
  const cordon = page.getByRole("button", { name: /Tirar de la cuerda/ });
  if ((await cordon.count()) > 0) await cordon.press("Enter");
}

/** Pasa la puerta con la clave buena. */
export async function entrar(page: Page): Promise<void> {
  await aislarNubeEnPrueba(page);
  await page.goto("/entrar");
  await encenderVentilador(page);
  await page.locator('input[name="clave"]').fill(claveDeLaPuerta());
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
  // La pantalla de carga tapa la app unos instantes al abrir. Se espera a que
  // termine para que las pruebas pulsen lo que hay debajo sin pelearse.
  await expect(page.getByRole("status", { name: "Cargando la app" })).toBeHidden();
}

/**
 * Abre la pestaña «Plan» de Ajustes.
 *
 * Desde la ronda 16 Ajustes abre en «Datos» (el tema y el perfil), así que
 * cualquier prueba que busque el plan, los gustos o los hábitos tiene que
 * pulsar antes su pestaña.
 */
export async function abrirPlanAjustes(page: Page): Promise<void> {
  await page.getByRole("radio", { name: "Plan", exact: true }).click();
}
