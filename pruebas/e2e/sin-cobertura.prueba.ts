import { expect, test } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/**
 * Sin cobertura la app no se abría: el navegador se quedaba en blanco.
 * Ahora pide guardarla para que funcione aunque no haya red.
 */
test.describe("Sin cobertura", () => {
  test("la app se deja guardada en el móvil", async ({ page }) => {
    // Sin esto, tras entrar se quedaría en la encuesta inicial, que está
    // fuera de la parte protegida y no guarda nada.
    await sembrar(page, datosBase());
    await entrar(page);

    const guardado = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "sin service worker";
      const registro = await navigator.serviceWorker.ready;
      return registro.active ? "guardado" : "aun no";
    });

    expect(guardado).toBe("guardado");
  });

  test("una vez guardada, la app abre sin ir a por red", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.evaluate(() => navigator.serviceWorker.ready);

    // Cortamos la red del todo: ni documentos ni llamadas.
    await page.route("**/*", (ruta) => ruta.abort());

    await page.reload({ waitUntil: "domcontentloaded" });

    // O la copia guardada, o la página amable de «estás sin cobertura»: lo que
    // no puede pasar es el fondo blanco de antes.
    const hayAlgo = await page.evaluate(() => {
      const cuerpo = document.body;
      return cuerpo.textContent !== null && cuerpo.textContent.trim().length > 0;
    });

    expect(hayAlgo).toBe(true);
  });
});
