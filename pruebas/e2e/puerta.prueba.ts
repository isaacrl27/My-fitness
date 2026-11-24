import { expect, test } from "@playwright/test";
import { datosBase, claveDeLaPuerta, encenderVentilador, entrar, sembrar } from "./ayudas";

/**
 * La puerta de la app: que no entre cualquiera.
 *
 * Ojo: el servidor frena los intentos fallidos, así que aquí solo se prueba UNA
 * vez con clave mala. Si se prueba más, las demás pruebas se quedan sin poder
 * entrar durante cinco minutos.
 */
test.describe("La puerta", () => {
  test("sin sesión, cualquier pantalla lleva a la entrada", async ({ page }) => {
    await page.goto("/hoy");
    await expect(page).toHaveURL(/\/entrar(\?|$)/);
    await expect(page.getByRole("heading", { name: "Entra en My Fitness" })).toBeVisible();
  });

  test("después de entrar, vuelve a donde iba: por ejemplo a progreso", async ({ page }) => {
    await sembrar(page, datosBase());
    // El enlace que se manda a la familia es /instalar. Al abrirlo sin sesión,
    // la puerta tiene que acordarse y devolver ahí, no a la raíz.
    await page.goto("/progreso");
    await expect(page).toHaveURL(/\/entrar\?.*siguiente=%2Fprogreso/);
    await encenderVentilador(page);
    await page.locator('input[name="clave"]').fill(claveDeLaPuerta());
    await page.getByRole("button", { name: /Entrar/ }).click();
    await expect(page).toHaveURL(/\/progreso$/);
  });

  test("sin sesión, el manifiesto y los iconos quedan libres para instalar", async ({ page }) => {
    const manifiesto = await page.request.get("/manifest.webmanifest", { maxRedirects: 0 });
    expect(manifiesto.status()).toBe(200);
  });

  test("con una clave inventada no se pasa", async ({ page }) => {
    await page.goto("/entrar");
    await encenderVentilador(page);
    await page.locator('input[name="clave"]').fill("esta-clave-no-es-la-buena");
    await page.getByRole("button", { name: /Entrar/ }).click();

    await expect(page.getByText("Esa no es la clave")).toBeVisible();

    await page.goto("/hoy");
    await expect(page).toHaveURL(/\/entrar(\?|$)/);
  });

  test("el ojito enseña la clave y la vuelve a esconder sin perderla", async ({ page }) => {
    await page.goto("/entrar");
    await encenderVentilador(page);
    const campo = page.locator('input[name="clave"]');
    await campo.fill(claveDeLaPuerta());

    await expect(campo).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Ver la clave" }).click();
    await expect(campo).toHaveAttribute("type", "text");
    await expect(campo).toHaveValue(claveDeLaPuerta());

    await page.getByRole("button", { name: "Esconder la clave" }).click();
    await expect(campo).toHaveAttribute("type", "password");
    await expect(campo).toHaveValue(claveDeLaPuerta());
  });

  test("con la clave buena se entra", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await expect(page).toHaveURL(/\/hoy$/);
    await expect(page.getByRole("heading", { name: "Hola, Isaac" })).toBeVisible();
  });

  test("la política de privacidad se lee sin sesión", async ({ page }) => {
    await page.goto("/privacidad");
    await expect(page).toHaveURL(/\/privacidad$/);
    await expect(page.getByText("Privacidad", { exact: false }).first()).toBeVisible();
  });

  test("robots.txt se sirve sin sesión y dice que no entren", async ({ page }) => {
    // Los buscadores lo piden sin cookies: si la puerta lo mandara a /entrar,
    // no lo leerían y la app podría acabar en Google.
    const respuesta = await page.request.get("/robots.txt", { maxRedirects: 0 });
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.text()).toContain("Disallow: /");
  });

  test("cerrar sesión deja fuera otra vez", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);

    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Nube", exact: true }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/entrar(\?|$)/);

    await page.goto("/hoy");
    await expect(page).toHaveURL(/\/entrar(\?|$)/);
  });
});
