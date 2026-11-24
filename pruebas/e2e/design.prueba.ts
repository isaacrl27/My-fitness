import { expect, test } from "@playwright/test";
import { entrar } from "./ayudas";

/**
 * La página de control del sistema de diseño (`/design`).
 *
 * Sirve para ver las piezas sueltas sin montar una pantalla entera. El corredor
 * de la pantalla de carga se retiró en la ronda 11 (ahora el arco del logo se
 * cierra como el anillo de Hoy), así que aquí solo se comprueba que la página
 * abre y que no queda la pieza vieja.
 */

test.describe("La página de diseño", () => {
  test("abre y ya no enseña el corredor retirado", async ({ page }) => {
    await entrar(page);
    await page.goto("/design");

    await expect(page.getByText("Sistema de diseño")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Fitness" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Corredor" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pantalla de carga" })).toHaveCount(0);
  });
});
