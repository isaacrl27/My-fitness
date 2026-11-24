import { expect, test } from "@playwright/test";
import { datosBase, diasAtras, entrar, sembrar } from "./ayudas";

test.describe("El análisis", () => {
  test("la pestaña Análisis se unió a Progreso y su dirección redirige", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/analisis");

    await expect(page).toHaveURL(/\/progreso$/);
    await expect(page.getByRole("heading", { name: "Peso y calorías" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calorías por día" })).toBeVisible();
  });

  test("la gráfica de calorías enseña los días y marca el exceso", async ({ page }) => {
    const datos = datosBase();
    datos.comidas = [
      {
        id: "comida-exceso",
        fecha: diasAtras(0),
        tipo: "comida",
        alimentos: [
          {
            id: "plato-exceso",
            nombre: "Comida de prueba",
            cantidad: "1 plato",
            kcal: 3000,
            proteinas: 0,
            carbohidratos: 0,
            grasas: 0,
          },
        ],
      },
    ];
    await sembrar(page, datos);
    await entrar(page);
    await page.goto("/progreso");

    await expect(page.getByRole("heading", { name: "Calorías por día" })).toBeVisible();
    // El eje no lleva decimales.
    await expect(page.locator("[data-eje]")).toHaveText(/^\d+$/);
    // Hay una inicial por cada una de las siete barras.
    await expect(page.locator("[data-inicial]")).toHaveCount(7);
    // La barra que pasa del objetivo se marca aparte.
    await expect(page.locator('[data-supera="si"]')).toHaveCount(1);
  });
});
