import { expect, test, type Page } from "@playwright/test";
import { CLAVE_DATOS, abrirPlanAjustes, entrar, sembrar, datosBase } from "./ayudas";

test.beforeEach(async ({ page }) => {
  await sembrar(page, datosBase());
  await entrar(page);
});

test("las variantes aparecen y al clickar una se excluye esa variante", async ({ page }) => {
  // La taxonomía de ingredientes (nombres canónicos; con un código de aditivo
  // metido a propósito para comprobar que no cuela)…
  await page.route("**/world.openfoodfacts.org/api/v3/taxonomy_suggestions*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        suggestions: ["brocoli", "brocoli fresco", "brocolis del norte", "E100"],
      }),
    }),
  );
  // …y los productos, con basura de marca y de envase que no puede salir.
  await page.route("**/search.openfoodfacts.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        hits: [
          { product_name: "Brócoli picado congelado BRIK 500 g" },
          { product_name: "Brócoli al vapor" },
          { product_name: "SugarBee Apple Cider" }, // solo encaja por la marca
        ],
      }),
    }),
  );

  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
    await abrirPlanAjustes(page);
  await expect(page.getByRole("heading", { name: "Lo que no quieres ver" })).toBeVisible();

  await page.getByLabel("Busca cualquier alimento").fill("brocoli");

  // Las variantes aparecen: la taxonomía primero y los productos después,
  // y a cada una se la puede echar con un clic.
  await expect(page.getByRole("button", { name: "Excluir brocoli", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir brocoli fresco" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir brocolis del norte" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir Brócoli al vapor" })).toBeVisible();

  // La basura se queda fuera: aditivos, envases y marcas de oídas.
  await expect(page.getByRole("button", { name: "Excluir E100" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Excluir Brócoli picado congelado BRIK 500 g" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Excluir SugarBee Apple Cider" })).toHaveCount(0);

  // Clickar la variante la excluye tal cual; los datos de partida ya llevan
  // una exclusión: van dos. Y el resto de fichas sigue ahí para seguir echando.
  await page.getByRole("button", { name: "Excluir brocoli", exact: true }).click();
  await expect(page.getByText("Vas a excluir 2 ingredientes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir brocoli fresco" })).toBeVisible();

  // Ya en el plan no puede aparecer ni en los platos ni en la compra.
  // Next deja montados un momento los componentes de la página anterior, así
  // que se mira solo lo que se ve de verdad.
  await page.getByRole("link", { name: "Plan" }).click();
  await expect(page.getByRole("heading", { name: "Plan de comidas" })).toBeVisible();

  const aLaVista = await page
    .getByText(/brócoli|brocoli/i)
    .evaluateAll((els) =>
      els
        .filter((e) => (e as HTMLElement).getClientRects().length > 0)
        .map((e) => e.textContent?.trim()),
    );
  expect(aLaVista).toEqual([]);
});

test("si solo falla la taxonomía, las de productos salen de todas formas", async ({ page }) => {
  await page.route("**/world.openfoodfacts.org/api/v3/taxonomy_suggestions*", (route) =>
    route.abort(),
  );
  await page.route("**/search.openfoodfacts.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hits: [{ product_name: "Brócoli al vapor" }] }),
    }),
  );

  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
    await abrirPlanAjustes(page);
  await page.getByLabel("Busca cualquier alimento").fill("brocoli");

  // Una fuente que llegue basta: fichas y sin bronca de red.
  await expect(page.getByRole("button", { name: "Excluir Brócoli al vapor" })).toBeVisible();
  await expect(page.getByText(/No llego a Open Food Facts/)).toHaveCount(0);
});

test("sin conexión el buscador avisa y se puede excluir igual", async ({ page }) => {
  await page.route("**/world.openfoodfacts.org/api/v3/taxonomy_suggestions*", (route) =>
    route.abort(),
  );
  await page.route("**/search.openfoodfacts.org/**", (route) => route.abort());

  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
    await abrirPlanAjustes(page);
  await page.getByLabel("Busca cualquier alimento").fill("espinaca");

  // Llega la bronca de la red...
  await expect(
    page.getByText("No llego a Open Food Facts. Lo puedes excluir igual, con el botón de abajo."),
  ).toBeVisible();

  // ...y lo escrito se excluye de todas formas.
  await page.getByRole("button", { name: "Excluir «espinaca»" }).click();
  await expect(page.getByText("Vas a excluir 2 ingredientes.")).toBeVisible();
});

/**
 * Mete (o cambia) datos con la app ya abierta, como si los hubiera escrito el
 * usuario, y recarga para que la app los lea.
 */
async function completarDatos(page: Page, extra: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    ({ clave, extra }) => {
      const datos = JSON.parse(window.localStorage.getItem(clave) ?? "{}");
      Object.assign(datos, extra);
      window.localStorage.setItem(clave, JSON.stringify(datos));
    },
    { clave: CLAVE_DATOS, extra },
  );
  await page.reload();
  await expect(page.getByRole("status", { name: "Cargando la app" })).toBeHidden();
}



test("lo rechazado se ve y se perdona en Ajustes", async ({
  page,
}) => {
  const plato = "Avena con plátano y nueces";
  await completarDatos(page, { gustos: { [plato]: "no-me-gusta" } });

  // Ajustes lo enseña en la lista de rechazados, y «Perdonar» lo devuelve.
  await page.getByRole("link", { name: "Ajustes", exact: true }).click();
  await abrirPlanAjustes(page);
  await expect(page.getByRole("heading", { name: "Lo que no quieres ver" })).toBeVisible();
  await expect(page.getByText(plato)).toBeVisible();
  await page.getByRole("button", { name: `Perdonar ${plato}` }).click();
  await expect(page.getByRole("button", { name: `Perdonar ${plato}` })).toHaveCount(0);
  await expect(page.getByText("Todavía no has dicho que no a ninguno")).toBeVisible();
});

test("un plato rechazado no aparece en el plan", async ({ page }) => {
  const plato = "Avena con plátano y nueces";
  await completarDatos(page, { gustos: { [plato]: "no-me-gusta" } });

  await page.getByRole("link", { name: "Plan" }).click();
  await expect(page.getByRole("heading", { name: "Plan de comidas" })).toBeVisible();

  // Next deja montados un momento los componentes de la página anterior: se
  // mira solo lo que se ve de verdad.
  const aLaVista = await page
    .getByText(plato)
    .evaluateAll((els) =>
      els
        .filter((e) => (e as HTMLElement).getClientRects().length > 0)
        .map((e) => e.textContent?.trim()),
    );
  expect(aLaVista).toEqual([]);
});
