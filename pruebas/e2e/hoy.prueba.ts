import { expect, test, type Page } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/** Lee las calorías del día del aro de la pantalla de Hoy. */
async function kcalDeHoy(page: Page): Promise<number> {
  const etiqueta = await page
    .getByRole("img", { name: /Calorías de hoy/ })
    .getAttribute("aria-label");
  const trozo = etiqueta?.match(/Calorías de hoy: (\d+) de/);
  return trozo ? Number(trozo[1]) : -1;
}

/** La meta de calorías del día, leída del propio aro. */
async function objetivoDeHoy(page: Page): Promise<number> {
  const etiqueta = await page
    .getByRole("img", { name: /Calorías de hoy/ })
    .getAttribute("aria-label");
  return Number(etiqueta?.match(/de (\d+)/)?.[1] ?? 0);
}

/** Las kcal del plato del Plan que hoy toca en la cena. */
async function kcalDelPlatoDeLaCena(page: Page): Promise<number> {
  const texto = await tarjetaCena(page).getByText(/^\d+ kcal$/).first().textContent();
  return Number(texto?.match(/(\d+) kcal/)?.[1] ?? 0);
}

/** La tarjeta de la cena, que es donde vive el plato del Plan de ese hueco. */
function tarjetaCena(page: Page) {
  return page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Cena", level: 3 }) });
}

/** Tarjeta de agua del día. */
function seccionAgua(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: /Agua de hoy/ }) });
}

/** Bloque de pasos y descanso del día. */
function seccionSalud(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Pasos y descanso" }) });
}

test.describe("El día de hoy", () => {
  test.beforeEach(async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await expect(page).toHaveURL(/\/hoy$/);
  });

  test("buscar en la lista y anotar", async ({ page }) => {
    expect(await kcalDeHoy(page)).toBe(0);

    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    await page.getByRole("button", { name: /Buscar en la lista/ }).click();
    await page.getByRole("searchbox").fill("arroz");
    await page.getByRole("button", { name: /Arroz/ }).first().click();

    await expect(page.getByRole("heading", { name: "Lo que vas a anotar" })).toBeVisible();
    await page.getByRole("button", { name: /^Anotar \d+ kcal$/ }).click();

    expect(await kcalDeHoy(page)).toBeGreaterThan(0);
    await page.getByRole("button", { name: /Ver proteínas e hidratos/ }).click();
    await expect(page.getByText(/Proteína/).first()).toBeVisible();
    await expect(page.getByText(/\d+ \/ \d+g/).first()).toBeVisible();
  });

  test("el agua se anota vaso a vaso y se puede restar", async ({ page }) => {
    const agua = seccionAgua(page);
    const restarVaso = agua.getByRole("button", { name: "Restar un vaso de agua" });
    await expect(restarVaso).toHaveCount(0);

    const sumarVaso = agua.getByRole("button", { name: "+ 1 vaso (0,25 L)" });
    await sumarVaso.click();
    await expect(agua.locator('[aria-label="0,25"]')).toBeVisible();
    await expect(restarVaso).toBeVisible();

    await sumarVaso.click();
    await expect(agua.locator('[aria-label="0,50"], [aria-label="0,5"]')).toBeVisible();

    await restarVaso.click();
    await expect(agua.locator('[aria-label="0,25"]')).toBeVisible();

    await restarVaso.click();
    await expect(restarVaso).toHaveCount(0);
  });

  test("los pasos y el sueño se anotan a mano y siguen tras recargar", async ({ page }) => {
    const salud = seccionSalud(page);
    await expect(salud.getByRole("heading", { name: "Pasos y descanso" })).toBeVisible();

    await salud.getByRole("button", { name: "Apuntar", exact: true }).click();
    await page.getByLabel("Pasos de hoy").fill("9000");
    await salud.getByRole("button", { name: "Guardar", exact: true }).first().click();
    await expect(salud.getByText(/9\.?000 pasos/)).toBeVisible();

    if (!(await page.getByLabel("Horas de sueño de anoche").isVisible().catch(() => false))) {
      await salud.getByRole("button", { name: "Apuntar", exact: true }).click();
    }
    await page.getByLabel("Horas de sueño de anoche").fill("7,5");
    await salud.getByRole("button", { name: "Guardar", exact: true }).nth(1).click();
    await expect(salud.getByText(/7,5 h de sueño/)).toBeVisible();

    // Y al volver a cargar la página siguen ahí (están en los datos del día).
    await page.reload();
    await expect(salud.getByText(/9\.?000 pasos/)).toBeVisible();
    await expect(salud.getByText(/7,5 h de sueño/)).toBeVisible();
  });

  test("los pasos se pueden escribir con punto de miles", async ({ page }) => {
    const salud = seccionSalud(page);
    await expect(salud.getByRole("heading", { name: "Pasos y descanso" })).toBeVisible();

    await salud.getByRole("button", { name: "Apuntar", exact: true }).click();
    await page.getByLabel("Pasos de hoy").fill("8.000");
    await salud.getByRole("button", { name: "Guardar", exact: true }).first().click();
    await expect(salud.getByText(/8\.?000 pasos/)).toBeVisible();

    if (!(await page.getByLabel("Pasos de hoy").isVisible().catch(() => false))) {
      await salud.getByRole("button", { name: "Apuntar", exact: true }).click();
    }
    await page.getByLabel("Pasos de hoy").fill("8.500");
    await salud.getByRole("button", { name: "Guardar", exact: true }).first().click();
    await expect(salud.getByText(/8\.?500 pasos/)).toBeVisible();
  });

  test("en Hoy ya no aparece el peso; se anota en Progreso", async ({ page }) => {
    await expect(page.getByText("Peso de hoy")).toHaveCount(0);

    await page.getByRole("link", { name: "Progreso" }).click();
    await expect(page.getByRole("button", { name: "Guardar peso" })).toBeVisible();
  });

  test("el peso se puede escribir con coma, como se escribe aquí", async ({ page }) => {
    // El peso ya no se anota en Hoy, sino aquí.
    await page.getByRole("link", { name: "Progreso" }).click();

    await page.getByLabel("Peso", { exact: true }).fill("83,4");
    await expect(page.getByRole("button", { name: "Guardar peso" })).toBeEnabled();
    await page.getByRole("button", { name: "Guardar peso" }).click();

    // Las pesadas de partida son cinco: al guardar esta tendrían que ser seis.
    await expect(page.getByText("6 pesadas")).toBeVisible();
  });

  test("el código de barras encuentra el producto por su número", async ({ page }) => {
    // Este sí sale a internet de verdad: pregunta a Open Food Facts.
    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    await page.getByRole("button", { name: /Código de barras/ }).click();

    // Sin cámara (o sin permiso) sale directamente el teclado; con cámara hay
    // que pedirlo.
    const aMano = page.getByRole("button", { name: "Escribirlo a mano" });
    if (await aMano.isVisible().catch(() => false)) await aMano.click();

    await page.getByLabel("Número del envase").fill("3017620422003");
    await page.getByRole("button", { name: "Buscar el producto" }).click();

    await expect(page.getByRole("heading", { name: "Lo que vas a anotar" })).toBeVisible();
    await expect(page.getByText(/Nutella/i).first()).toBeVisible();
    await page.getByRole("button", { name: /^Anotar \d+ kcal$/ }).click();
    expect(await kcalDeHoy(page)).toBeGreaterThan(0);
  });

  test("una comida anotada se puede quitar", async ({ page }) => {
    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    await page.getByRole("button", { name: /Buscar en la lista/ }).click();
    await page.getByRole("searchbox").fill("arroz");
    await page.getByRole("button", { name: /Arroz/ }).first().click();
    await page.getByRole("button", { name: /^Anotar \d+ kcal$/ }).click();
    expect(await kcalDeHoy(page)).toBeGreaterThan(0);

    await page.getByRole("button", { name: /^Quitar / }).first().click();
    await page.getByRole("button", { name: "¿Borrar?", exact: true }).first().click();
    expect(await kcalDeHoy(page)).toBe(0);
  });

  test("la cantidad de un alimento se corrige en línea y cambian las kcal", async ({ page }) => {
    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    await page.getByRole("button", { name: /Buscar en la lista/ }).click();
    await page.getByRole("searchbox").fill("arroz");
    await page.getByRole("button", { name: /Arroz/ }).first().click();
    await page.getByRole("button", { name: /^Anotar \d+ kcal$/ }).click();

    await expect(page.getByRole("heading", { name: "Tus comidas de hoy" })).toBeVisible();
    const kcalAntes = await kcalDeHoy(page);
    expect(kcalAntes).toBeGreaterThan(0);

    // Tocar el alimento abre sus opciones rápidas y la corrección en línea.
    await page.getByRole("button", { name: /Arroz/ }).first().click();
    await page.getByRole("button", { name: "Cambiar cantidad", exact: true }).click();
    await page.getByLabel(/^Cantidad de /).fill("400");
    await page.getByRole("button", { name: "Guardar", exact: true }).first().click();

    const kcalDespues = await kcalDeHoy(page);
    expect(kcalDespues).toBeGreaterThan(kcalAntes);
  });

  test("el turno se elige nada más abrir Anotar comida", async ({ page }) => {
    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();

    const grupo = page.getByRole("radiogroup", { name: "Comida" });
    await expect(grupo).toBeVisible();
    await expect(grupo.getByRole("radio", { name: "Desayuno" })).toBeVisible();
    await expect(grupo.getByRole("radio", { name: "Comida" })).toBeVisible();
    await expect(grupo.getByRole("radio", { name: "Cena" })).toBeVisible();
    await expect(grupo.getByRole("radio", { name: "Snack" })).toBeVisible();
  });

  test("se anota desde el botón principal y desde cada turno de comida", async ({ page }) => {
    const abrir = page.getByRole("button", { name: "Anotar lo que he comido", exact: true });
    await expect(abrir).toBeVisible();
    await abrir.click();

    const hoja = page.getByRole("dialog", { name: "Anotar comida" });
    await expect(hoja).toBeVisible();
    // La hoja empieza arriba, no escondida por encima.
    await expect.poll(async () => Math.round((await hoja.boundingBox())?.y ?? -1)).toBe(0);
    // El selector y las opciones se ven sin deslizar.
    await expect(page.getByText("¿En qué comida?", { exact: true })).toBeInViewport();
    await expect(page.getByText("Foto de tu plato", { exact: true })).toBeInViewport();
    for (const titulo of ["Código de barras", "Buscar en la lista"]) {
      await expect(page.getByRole("button", { name: new RegExp(titulo) })).toBeInViewport();
    }
    // La escritura a palabras se quitó: no debe quedar ni el botón.
    await expect(page.getByRole("button", { name: /Escribir a palabras/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(hoja).toBeHidden();

    // Cada comida muestra su acceso y abre la hoja con ese turno ya elegido.
    for (const comida of ["Desayuno", "Comida", "Cena", "Snack"]) {
      await expect(page.getByRole("heading", { name: comida, level: 3 })).toBeVisible();
    }
    await page.getByRole("button", { name: /Cena/ }).first().click();
    await expect(page.getByRole("dialog", { name: "Anotar comida" })).toBeVisible();
    const grupo = page.getByRole("radiogroup", { name: "Comida" });
    await expect(grupo.getByRole("radio", { name: "Cena" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("el plato se guarda en la comida elegida", async ({ page }) => {
    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    await page
      .getByRole("radiogroup", { name: "Comida" })
      .getByRole("radio", { name: "Cena" })
      .click();
    await page.getByRole("button", { name: /Buscar en la lista/ }).click();
    await page.getByRole("searchbox").fill("arroz");
    await page.getByRole("button", { name: /Arroz/ }).first().click();
    await page.getByRole("button", { name: /^Anotar \d+ kcal$/ }).click();

    await expect(tarjetaCena(page).getByText(/Arroz/)).toBeVisible();
  });

  test("los hábitos marcados se ven con ✓ y en verde", async ({ page }) => {
    const habito = page.getByRole("button", { name: "Tomar el sol" });
    await expect(habito).toHaveAttribute("aria-pressed", "false");
    await habito.click();
    await expect(habito).toHaveAttribute("aria-pressed", "true");
    await expect(habito).toHaveClass(/bg-accent/);
    await expect(habito).not.toHaveClass(/bg-accent-soft/);
    await expect(habito.locator("svg")).toHaveCount(1);
  });

  test("los presets rápidos de pasos y agua funcionan al primer toque", async ({ page }) => {
    const salud = seccionSalud(page);
    await salud.getByRole("button", { name: "Apuntar", exact: true }).click();
    await expect(page.getByPlaceholder("Ej. 8000")).toBeVisible();
    await salud.getByRole("button", { name: "+3.000", exact: true }).click();
    await expect(salud.getByText(/3\.?000 pasos/)).toBeVisible();

    await seccionAgua(page).getByRole("button", { name: "+ 1 vaso (0,25 L)" }).click();
    await expect(seccionAgua(page).locator('[aria-label="0,25"]')).toBeVisible();
  });

  test("el plato del plan se anota con Ya lo comí y suma sus calorías", async ({ page }) => {
    const objetivo = await objetivoDeHoy(page);
    expect(objetivo).toBeGreaterThan(500);
    expect(await kcalDeHoy(page)).toBe(0);

    const cena = tarjetaCena(page);
    const plato = await kcalDelPlatoDeLaCena(page);
    expect(plato).toBeGreaterThan(240);

    await expect(cena.getByText(/En tu plan de hoy:/)).toBeVisible();
    await cena.getByRole("button", { name: "Ya lo comí", exact: true }).click();

    await expect.poll(() => kcalDeHoy(page)).toBe(plato);
    await expect(cena.getByRole("button", { name: "Ya lo comí", exact: true })).toHaveCount(0);
  });

  test("el plato anotado del plan persiste tras recargar el día", async ({ page }) => {
    const plato = await kcalDelPlatoDeLaCena(page);
    expect(plato).toBeGreaterThan(240);

    const cena = tarjetaCena(page);
    await cena.getByRole("button", { name: "Ya lo comí", exact: true }).click();
    await expect.poll(() => kcalDeHoy(page)).toBe(plato);

    await page.reload();
    await expect(page.getByRole("status", { name: "Cargando la app" })).toBeHidden();
    await expect.poll(() => kcalDeHoy(page)).toBe(plato);
    await expect(cena.getByRole("button", { name: "Ya lo comí", exact: true })).toHaveCount(0);
  });
});
