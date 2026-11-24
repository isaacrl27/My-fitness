import { expect, test } from "@playwright/test";
import { datosBase, diasAtras, entrar, sembrar } from "./ayudas";

/**
 * El Plan de comidas y sus pestañas (Menú / Compra).
 *
 * Solo una a la vez: si das a Compra, la lista abajo y el menú calla; al
 * volver a Menú sale solo el menú. (Fallo real del 22/10: con Compra
 * elegida se veían las dos cosas una debajo de otra.)
 */

test.describe("El Plan", () => {
  test("al dar a Compra se ve solo la compra, sin el menú detrás", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/plan");

    await expect(page.getByRole("heading", { name: "Plan de comidas" })).toBeVisible();
    // Los controles del menú están debajo de las pestañas y solo en Menú.
    await expect(page.getByRole("button", { name: "Cambiar los platos" })).toBeVisible();
    await expect(page.getByText(/Vuelve a montar los platos de toda la semana/)).toBeVisible();
    const dias = page.locator("button[data-dia]");
    await expect(dias).toHaveCount(7);

    // Se pasa a Compra: la lista aparece...
    await page.getByRole("button", { name: "Compra" }).click();
    await expect(page.getByRole("heading", { name: "Lista de la compra" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cambiar los platos" })).toBeHidden();
    await expect(page.getByText(/\d+ platos? valorados?/)).toHaveCount(0);

    // ...y el menú ha de desaparecer: ningún día de la semana ahí.
    await expect(dias).toHaveCount(0);

    // Se vuelve a Menú y todo vuelve a su sitio.
    await page.getByRole("button", { name: "Menú" }).click();
    await expect(dias).toHaveCount(7);
    await expect(page.getByRole("button", { name: "Cambiar los platos" })).toBeVisible();
    await expect(page.getByText(/\d+ platos? valorados?/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lista de la compra" })).toBeHidden();
  });

  test("la compra enseña huevos y leche como se compran", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/plan");
    await page.getByRole("button", { name: "Compra" }).click();

    const huevo = page.getByRole("button", { name: /^Huevo/ }).first();
    await expect(huevo).toBeVisible();
    await expect(huevo.getByText(/docena/)).toBeVisible();
    await expect(huevo.getByText(/^\d+ g$/)).toHaveCount(0);

    const leche = page.getByRole("button", { name: /^Leche entera/ }).first();
    if ((await leche.count()) > 0) {
      await expect(leche).toBeVisible();
      await expect(leche.getByText(/brik/)).toBeVisible();
      await expect(leche.getByText(/\d+ ml/)).toBeVisible();
    }
  });

  test("si ya hay un desayuno, el plan avisa de que se suma", async ({ page }) => {
    const datos = datosBase();
    datos.comidas = [
      {
        id: "desayuno-otro",
        fecha: diasAtras(0),
        tipo: "desayuno",
        alimentos: [
          {
            id: "desayuno-otro-1",
            nombre: "Tostada con tomate",
            cantidad: "1 plato",
            kcal: 300,
            proteinas: 10,
            carbohidratos: 40,
            grasas: 8,
          },
        ],
      },
    ];
    await sembrar(page, datos);
    await entrar(page);
    await page.goto("/plan");

    // Hoy ya empieza desplegado; se abre su desayuno.
    await page.locator('button[data-turno$="-desayuno"]').first().click();

    await expect(page.getByText(/Ya tienes un desayuno anotado en Hoy/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sumar otro desayuno" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reemplazar desayuno" })).toBeVisible();
  });
});
