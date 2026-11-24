import { expect, test, type Page } from "@playwright/test";
import { datosBase, diasAtras, entrar, sembrar } from "./ayudas";

/** Lee las calorías del día del aro de la pantalla de Hoy. */
async function kcalDeHoy(page: Page): Promise<number> {
  const etiqueta = await page
    .getByRole("img", { name: /Calorías de hoy/ })
    .getAttribute("aria-label");
  const trozo = etiqueta?.match(/Calorías de hoy: (\d+) de/);
  return trozo ? Number(trozo[1]) : -1;
}

/**
 * Cinco días bien hechos: comida dentro del plan, proteína, agua y hábitos.
 * Dan más de 500 puntos sin tocar la nube, para poder canjear en la prueba.
 */
function datosConPuntos(): Record<string, unknown> {
  const comidas: unknown[] = [];
  const aguaLitros: Record<string, number> = {};
  const habitosHechos: Record<string, string[]> = {};
  for (let i = 1; i <= 10; i += 1) {
    const fecha = diasAtras(i);
    comidas.push({
      id: `comida-${i}`,
      fecha,
      tipo: "comida",
      alimentos: [
        {
          id: `alimento-${i}`,
          nombre: "Comida de prueba",
          cantidad: "1 ración",
          kcal: 1500,
          proteinas: 120,
          carbohidratos: 150,
          grasas: 50,
        },
      ],
    });
    aguaLitros[fecha] = 2;
    habitosHechos[fecha] = ["sol", "vitaminas", "leer", "dormir", "correr"];
  }
  return { ...datosBase(), comidas, aguaLitros, habitosHechos };
}

test.describe("La tienda de puntos", () => {
  test("desde Hoy se llega a la tienda y se explica cuánto falta", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);

    await page.getByRole("link", { name: /Canjear capricho|Tienda/i }).click();
    await expect(page).toHaveURL(/\/tienda$/);
    await expect(page.getByRole("heading", { name: "Tienda de puntos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Capricho" })).toBeVisible();
    await expect(page.getByText(/Te faltan \d+ puntos/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Canjear capricho/ })).toHaveCount(0);
  });

  test("canjear, anotarlo con la foto y que no cuente en el día", async ({ page }) => {
    await sembrar(page, datosConPuntos());
    await entrar(page);

    await page.getByRole("link", { name: /Canjear capricho|Tienda/i }).click();
    await expect(page.getByRole("button", { name: /Canjear capricho \(500 pts\)/ })).toBeVisible();
    await page.getByRole("button", { name: /Canjear capricho \(500 pts\)/ }).click();

    const aviso = page.getByRole("alertdialog", { name: "¿Canjear el capricho?" });
    await expect(aviso).toBeVisible();
    await page.getByRole("button", { name: "Sí, canjear" }).click();
    await expect(page.getByText("Hoy es tu día de capricho.")).toBeVisible();
    await page.getByRole("button", { name: "Anotar mi capricho", exact: true }).click();

    const hoja = page.getByRole("dialog", { name: "Anotar capricho" });
    await expect(hoja).toBeVisible();
    await expect(page.getByText(/no cuenta en tus calorías ni en tus macros/)).toBeVisible();
    // La escritura a palabras ya no existe, y el capricho no enseña ni código
    // de barras ni buscador: solo foto o el nombre escrito.
    await expect(page.getByRole("button", { name: /Escribir a palabras/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Hacer foto" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Código de barras/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Buscar en la lista/ })).toHaveCount(0);

    await page.getByLabel(/Nombre del plato/).fill("Pizza y cerveza");
    await page.getByRole("button", { name: "Anotar capricho", exact: true }).click();

    await expect(page.getByText(/Capricho anotado/)).toBeVisible();

    // En Hoy está aparte y el aro sigue a cero: no cuenta en el día.
    await page.goto("/hoy");
    expect(await kcalDeHoy(page)).toBe(0);
  });

  test("el capricho no se puede repetir hasta que pasen los días de espera", async ({ page }) => {
    const datos = datosConPuntos();
    datos.caprichos = [diasAtras(3)];
    await sembrar(page, datos);
    await entrar(page);

    await page.goto("/tienda");
    await expect(
      page.getByText(/te quedan 2 días desde el último capricho/),
    ).toBeVisible();
    // La tarjeta «Cuándo te conviene» dice cuándo se abre la veda y, cuando el
    // día de entreno no coincide, cuál encaja mejor. El aviso de abajo solo
    // cuenta los días que faltan: no remite a «arriba» ni repite el consejo.
    const cuando = page.getByText(/^Podrás canjear otro a partir del/);
    await expect(cuando).toBeVisible();
    await expect(cuando).toContainText(/después de entrenar/);
    await expect(page.getByText(/El día que mejor encaja está arriba/)).toHaveCount(0);
  });
});
