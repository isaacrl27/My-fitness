import { expect, test, type Page } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/** Abre la hoja de anotar comida desde Hoy y espera a que termine de subir. */
async function abrirHoja(page: Page) {
  await page.getByRole("button", { name: /Anotar lo que he comido/ }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  const hoja = dialogo.locator(".hoja-entra");
  // La animación de subida dura ~340 ms: se espera a que la hoja quede quieta.
  await expect
    .poll(async () => {
      const a = (await hoja.boundingBox())?.y ?? -1;
      await page.waitForTimeout(120);
      const b = (await hoja.boundingBox())?.y ?? -2;
      return a === b;
    })
    .toBe(true);
  return { dialogo, hoja };
}

/** Arrastra con el dedo (puntero) desde un punto hacia abajo, en pasos. */
async function arrastrarAbajo(page: Page, x: number, y: number, dy: number, pasos = 10, pausa = 25) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= pasos; i++) {
    await page.mouse.move(x, y + (dy * i) / pasos);
    await page.waitForTimeout(pausa);
  }
}

test.describe("Hoja de anotar comida: arrastrar la barrita para cerrar", () => {
  test.beforeEach(async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/hoy");
  });

  test("un arrastre corto y lento la suelta y vuelve a su sitio", async ({ page }) => {
    const { dialogo, hoja } = await abrirHoja(page);
    const antes = (await hoja.boundingBox())!;
    const asa = dialogo.locator(".cursor-grab");
    const caja = (await asa.boundingBox())!;

    await arrastrarAbajo(page, caja.x + caja.width / 2, caja.y + 14, 50, 5, 60);
    const durante = (await hoja.boundingBox())!;
    expect(durante.y, "mientras se arrastra, la hoja baja con el dedo").toBeGreaterThan(antes.y + 30);

    await page.mouse.up();
    await expect(dialogo).toBeVisible();
    await expect.poll(async () => Math.round((await hoja.boundingBox())!.y)).toBe(Math.round(antes.y));
  });

  test("un arrastre largo la cierra", async ({ page }) => {
    const { dialogo } = await abrirHoja(page);
    const asa = dialogo.locator(".cursor-grab");
    const caja = (await asa.boundingBox())!;

    await arrastrarAbajo(page, caja.x + caja.width / 2, caja.y + 14, 260);
    await page.mouse.up();
    await expect(dialogo).toBeHidden();
  });

  test("también se cierra arrastrando desde el título de la cabecera", async ({ page }) => {
    const { dialogo } = await abrirHoja(page);
    const titulo = dialogo.getByRole("heading", { name: "Anotar comida" });
    const caja = (await titulo.boundingBox())!;

    await arrastrarAbajo(page, caja.x + caja.width / 2, caja.y + caja.height / 2, 280);
    await page.mouse.up();
    await expect(dialogo).toBeHidden();
  });

  test("arrastrar hacia arriba no mueve la hoja", async ({ page }) => {
    const { dialogo, hoja } = await abrirHoja(page);
    const antes = (await hoja.boundingBox())!;
    const caja = (await dialogo.locator(".cursor-grab").boundingBox())!;

    await arrastrarAbajo(page, caja.x + caja.width / 2, caja.y + 14, -120);
    const durante = (await hoja.boundingBox())!;
    expect(Math.round(durante.y)).toBe(Math.round(antes.y));
    await page.mouse.up();
    await expect(dialogo).toBeVisible();
  });

  test("el botón Cerrar sigue siendo un botón (el arrastre no se lo come)", async ({ page }) => {
    const { dialogo } = await abrirHoja(page);
    await dialogo.getByRole("button", { name: "Cerrar" }).click();
    await expect(dialogo).toBeHidden();
  });

  test("tocar fuera de la hoja sigue cerrándola", async ({ page }) => {
    const { dialogo } = await abrirHoja(page);
    await page.mouse.click(195, 20);
    await expect(dialogo).toBeHidden();
  });
});
