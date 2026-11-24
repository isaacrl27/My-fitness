import { expect, test } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/**
 * Modo claro / oscuro / como el móvil.
 *
 * No basta con que cambie un atributo: el fondo del cuerpo tiene que ser de
 * verdad el oscuro (#0f1512) y la elección tiene que aguantar una recarga.
 * «Como el móvil» se prueba emulando un móvil en oscuro.
 */

const FONDO_OSCURO = "rgb(15, 21, 18)"; // #0f1512, el bg de la paleta oscura

test.describe("El tema", () => {
  test("elegir oscuro pinta la app y se queda al recargar; claro lo deshace", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);

    const html = page.locator("html");
    const cuerpo = page.locator("body");
    await expect(html).toHaveAttribute("data-tema", "claro");
    await expect(cuerpo).not.toHaveCSS("background-color", FONDO_OSCURO);

    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Datos", exact: true }).click();
    await page.getByRole("radio", { name: "Oscuro", exact: true }).click();
    await expect(html).toHaveAttribute("data-tema", "oscuro");
    await expect(html).toHaveCSS("background-color", FONDO_OSCURO);
    await expect(html).toHaveCSS("color-scheme", "dark");
    await expect(cuerpo).toHaveCSS("background-color", FONDO_OSCURO);
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", "#0f1512");

    // Recargar: la elección vive en el móvil, no en la pestaña.
    await page.reload();
    await expect(html).toHaveAttribute("data-tema", "oscuro");
    await expect(html).toHaveCSS("background-color", FONDO_OSCURO);
    await expect(html).toHaveCSS("color-scheme", "dark");
    await expect(cuerpo).toHaveCSS("background-color", FONDO_OSCURO);
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", "#0f1512");

    // Claro lo devuelve.
    await page.getByRole("radio", { name: "Datos", exact: true }).click();
    await page.getByRole("radio", { name: "Claro", exact: true }).click();
    await expect(html).toHaveAttribute("data-tema", "claro");
    await expect(cuerpo).not.toHaveCSS("background-color", FONDO_OSCURO);
  });

  test("«como el móvil» sigue al móvil cuando está en oscuro", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await sembrar(page, datosBase());
    await entrar(page);

    await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
    await expect(page.locator("body")).toHaveCSS("background-color", FONDO_OSCURO);

    // Y si el móvil cambia a claro con la app abierta, cambia con él.
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  });
});
