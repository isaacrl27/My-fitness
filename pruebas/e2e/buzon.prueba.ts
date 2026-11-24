import { expect, test } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/**
 * El buzón de la beta.
 *
 * En las pruebas no hay Supabase montado, así que se simulan las dos
 * direcciones con las que habla la pantalla: `/api/nube` (para que la app crea
 * que tiene código) y `/api/comentarios` (el buzón en sí). Lo que se comprueba
 * es lo que ve la persona: que puede escribir, que sale el agradecimiento y
 * que la lista de mensajes solo aparece cuando el servidor dice que es Isaac.
 */

const CODIGO = "ABC234";

async function conNubeSimulada(page: import("@playwright/test").Page) {
  await page.route("**/api/nube**", (ruta) => {
    const peticion = ruta.request();
    if (peticion.method() === "GET") {
      return ruta.fulfill({
        json: { hay: true, datos: datosBase(), codigo: CODIGO, nombre: "Isaac" },
      });
    }
    return ruta.fulfill({ json: { hay: true, codigo: CODIGO } });
  });
}

test("se puede contar un problema y sale el agradecimiento", async ({ page }) => {
  await conNubeSimulada(page);

  let enviado: Record<string, unknown> | null = null;
  await page.route("**/api/comentarios", async (ruta) => {
    if (ruta.request().method() === "GET") {
      return ruta.fulfill({ status: 403, json: { ok: false, motivo: "Esto solo lo puede ver Isaac." } });
    }
    enviado = ruta.request().postDataJSON() as Record<string, unknown>;
    return ruta.fulfill({ json: { ok: true } });
  });

  await sembrar(page, datosBase());
  await entrar(page);
  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
  await page.getByRole("radio", { name: "Ayuda", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Contar un problema o una idea" })).toBeVisible();

  await page.getByRole("radio", { name: /Algo no funciona/ }).click();
  await page
    .getByLabel("¿Qué problema has tenido?")
    .fill("Al apuntar el agua no me deja poner dos litros.");
  await page.getByRole("button", { name: "Enviar a Isaac" }).click();

  await expect(page.getByText("Enviado a Isaac. Muchas gracias por tu comentario.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviado" })).toBeDisabled();
  expect(enviado).not.toBeNull();
  expect(enviado).toMatchObject({
    codigo: CODIGO,
    tipo: "problema",
    texto: "Al apuntar el agua no me deja poner dos litros.",
    pantalla: "/ajustes",
  });

  // Al escribir otra cosa, el botón se vuelve a encender.
  await page.getByLabel("¿Qué problema has tenido?").fill("Otra cosa que contar.");
  await expect(page.getByRole("button", { name: "Enviar a Isaac" })).toBeEnabled();

  // La lista no es para quien escribe: no aparece.
  await expect(page.getByRole("heading", { name: "Comentarios de la beta" })).toBeHidden();
});

test("al elegir una idea cambia la pregunta y el ejemplo", async ({ page }) => {
  await conNubeSimulada(page);
  await page.route("**/api/comentarios**", (ruta) =>
    ruta.fulfill({
      status: 403,
      json: { ok: false, motivo: "Esto solo lo puede ver Isaac." },
    }),
  );

  await sembrar(page, datosBase());
  await entrar(page);
  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
  await page.getByRole("radio", { name: "Ayuda", exact: true }).click();

  await page.getByRole("radio", { name: /Una idea/ }).click();
  await expect(page.getByLabel("¿Qué idea tienes?")).toBeVisible();
  await expect(page.getByPlaceholder(/me gustaría ver lo que comí ayer/)).toBeVisible();
  await expect(page.getByLabel("¿Qué problema has tenido?")).toHaveCount(0);
});

test("Isaac ve la lista de mensajes y los nuevos van marcados", async ({ page }) => {
  await conNubeSimulada(page);

  let marcado = false;
  await page.route("**/api/comentarios**", async (ruta) => {
    const peticion = ruta.request();
    // El código de Isaac no puede ir en la dirección: se exige en la cabecera.
    if (peticion.headers()["x-codigo"] !== CODIGO) {
      return ruta.fulfill({ status: 403, json: { ok: false, motivo: "Esto solo lo puede ver Isaac." } });
    }
    if (peticion.method() === "PUT") {
      marcado = true;
      return ruta.fulfill({ json: { ok: true } });
    }
    return ruta.fulfill({
      json: {
        ok: true,
        leidos: "2026-10-20T08:00:00.000Z",
        comentarios: [
          {
            id: "c-1",
            tipo: "mejora",
            texto: "Me gustaría ver lo de ayer de un vistazo.",
            pantalla: "/hoy",
            creado: "2026-10-21T09:00:00.000Z",
            nombre: "Marta",
          },
          {
            id: "c-0",
            tipo: "problema",
            texto: "Ayer se me cerró sola.",
            pantalla: "/ajustes",
            creado: "2026-10-19T09:00:00.000Z",
            nombre: "Ana",
          },
        ],
      },
    });
  });

  await sembrar(page, datosBase());
  await entrar(page);
  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
  await page.getByRole("radio", { name: "Ayuda", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Comentarios de la beta" })).toBeVisible();
  await expect(page.getByText("Me gustaría ver lo de ayer de un vistazo.")).toBeVisible();
  await expect(page.getByText("Ayer se me cerró sola.")).toBeVisible();
  await expect(page.getByText("Marta")).toBeVisible();
  const nueva = page.locator("li").filter({ hasText: "Me gustaría ver lo de ayer" });
  await expect(nueva.getByText("Nuevo", { exact: true })).toBeVisible();
  const vieja = page.locator("li").filter({ hasText: "Ayer se me cerró sola" });
  await expect(vieja.getByText("Nuevo", { exact: true })).toBeHidden();

  // Entrar a Ajustes no marca nada: los «nuevo» siguen ahí hasta que Isaac
  // baja al buzón y lo pide.
  expect(marcado).toBe(false);

  await page.getByRole("button", { name: "Marcar leídos (1)" }).click();
  expect(marcado).toBe(true);
  await expect(nueva.getByText("Nuevo", { exact: true })).toBeHidden();
});
