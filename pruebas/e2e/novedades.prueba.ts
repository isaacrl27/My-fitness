import { expect, test } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

test.describe("Aviso de novedades", () => {
  test("sale la primera vez y al pulsar «Vale» se apunta en el móvil y no vuelve a salir", async ({
    page,
  }) => {
    // Se siembra sin marcar las novedades como leídas.
    await sembrar(page, datosBase(), false);
    await entrar(page);
    await page.goto("/hoy");

    // Sale la ventana de novedades modal.
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    await expect(page.getByRole("heading", { name: /Novedades|Lo nuevo/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dar feedback" })).toBeVisible();

    // Se pulsa «Vale» para cerrarla.
    const botonVale = page.getByRole("button", { name: "Vale" });
    await botonVale.click();
    await expect(dialogo).toBeHidden();

    // Se comprueba que en localStorage quedó guardada la versión.
    const guardado = await page.evaluate(() => window.localStorage.getItem("mi-peso:novedades"));
    expect(guardado).toBe("100");

    // Al recargar o navegar a Ajustes, ya no vuelve a salir.
    await page.goto("/ajustes");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
