import { expect, test } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/**
 * La IA de comida, en local (sin la clave de Google).
 *
 * La clave `GEMINI_API_KEY` solo vive en el servidor de Vercel: en el PC no
 * hay, así que aquí se comprueba el modo degradado sin tocar la red de
 * Google. Las peticiones van con `page.request`, que comparte las cookies de
 * la sesión ya iniciada, igual que si las hiciera la propia app.
 */
test.describe("La IA de comida", () => {
  test("sin la clave del servidor, avisa de que no está configurada", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);

    const r = await page.request.post("/api/ia/texto", {
      data: { texto: "comida rara que nadie conoce xyz" },
    });

    expect([403, 503]).toContain(r.status());
    const json = await r.json();
    expect(json.ok).toBe(false);
  });

  test("un texto demasiado corto se rechaza antes de llamar a la IA", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);

    const r = await page.request.post("/api/ia/texto", { data: { texto: "x" } });

    expect(r.status()).toBe(400);
    expect((await r.json()).ok).toBe(false);
  });

  test("foto del plato analiza en 1 toque, comprime ligero y recalcula sin duplicar", async ({
    page,
  }) => {
    await sembrar(page, datosBase());
    await entrar(page);

    const peticiones: Array<{ mime: string; comentario?: string; len: number }> = [];
    await page.route("**/api/ia/foto", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        mime?: string;
        comentario?: string;
        imagen?: string;
      };
      peticiones.push({
        mime: body.mime ?? "",
        comentario: body.comentario,
        len: (body.imagen ?? "").length,
      });

      const esMitad = (body.comentario ?? "").toLowerCase().includes("mitad");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          restantes: esMitad ? 8 : 9,
          alimentos: [
            {
              nombre: "Pechuga de pollo a la plancha",
              gramos: esMitad ? 100 : 200,
              kcal: esMitad ? 165 : 330,
              proteinas: esMitad ? 31 : 62,
              carbohidratos: 0,
              grasas: esMitad ? 4.5 : 9,
            },
          ],
        }),
      });
    });

    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    await expect(page.getByRole("button", { name: "Hacer foto" })).toBeVisible();

    // Genera un JPEG de prueba grande (1600x1200) para comprobar el reescalado rápido en cliente.
    const jpegBase64 = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 1600;
      c.height = 1200;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#d97706";
      ctx.fillRect(0, 0, 1600, 1200);
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(800, 600, 350, 0, Math.PI * 2);
      ctx.fill();
      return c.toDataURL("image/jpeg", 0.92).replace(/^data:image\/jpeg;base64,/, "");
    });

    const inputCamara = page.locator('input[type="file"][capture="environment"]');
    await expect(inputCamara).toHaveAttribute("accept", "image/*");

    // 1 toque: nada más elegir archivo debe analizar sin pantalla intermedia ni botón previo.
    await inputCamara.setInputFiles({
      name: "plato-prueba.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(jpegBase64, "base64"),
    });

    await expect(page.getByRole("heading", { name: "Lo que vas a anotar" })).toBeVisible();
    await expect(page.getByText("Pechuga de pollo a la plancha")).toBeVisible();
    const campoGramos = page.getByRole("spinbutton", {
      name: "Gramos de Pechuga de pollo a la plancha",
    });
    await expect(campoGramos).toHaveValue("200");
    await expect(page.getByRole("button", { name: "Anotar 330 kcal" })).toBeVisible();
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].mime).toBe("image/jpeg");
    expect(peticiones[0].len).toBeLessThanOrEqual(420_000);

    // No debe abrir teclado automático tras hacer la foto.
    const inputDetalle = page.getByPlaceholder("Ej: solo la mitad, sin aceite, 150g arroz…");
    await expect(inputDetalle).toBeVisible();
    await expect(inputDetalle).not.toBeFocused();

    // Recalcular con detalle después: sustituye los 200 g por 100 g sin sumar 300 g.
    await inputDetalle.fill("solo me comí la mitad");
    await page.getByRole("button", { name: "Recalcular" }).click();

    await expect(campoGramos).toHaveValue("100");
    await expect(page.getByRole("button", { name: "Anotar 165 kcal" })).toBeVisible();
    expect(peticiones).toHaveLength(2);
    expect(peticiones[1].comentario).toBe("solo me comí la mitad");

    // Multiplicadores rápidos de 1 toque (½×, 1×, 2×) recalculan al instante sin volver a llamar a la IA.
    await page.getByRole("button", { name: "Media ración de Pechuga de pollo a la plancha" }).click();
    await expect(campoGramos).toHaveValue("50");
    await expect(page.getByRole("button", { name: "Anotar 83 kcal" })).toBeVisible();

    await page.getByRole("button", { name: "Doble ración de Pechuga de pollo a la plancha" }).click();
    await expect(campoGramos).toHaveValue("200");
    await expect(page.getByRole("button", { name: "Anotar 330 kcal" })).toBeVisible();

    await page.getByRole("button", { name: "Ración normal de Pechuga de pollo a la plancha" }).click();
    await expect(campoGramos).toHaveValue("100");
    expect(peticiones).toHaveLength(2);
  });

  test("foto hecha sin cobertura se guarda en el móvil y se analiza después sin perderse", async ({
    page,
  }) => {
    await sembrar(page, datosBase());
    await entrar(page);

    let hayRed = false;
    await page.route("**/api/ia/foto", async (route) => {
      if (!hayRed) {
        await route.abort("internetdisconnected");
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          restantes: 9,
          alimentos: [
            {
              nombre: "Tortilla francesa",
              gramos: 150,
              kcal: 230,
              proteinas: 18,
              carbohidratos: 1.5,
              grasas: 16.5,
            },
          ],
        }),
      });
    });

    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    const jpegBase64 = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 400;
      c.height = 300;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#eab308";
      ctx.fillRect(0, 0, 400, 300);
      return c.toDataURL("image/jpeg", 0.9).replace(/^data:image\/jpeg;base64,/, "");
    });

    await page.locator('input[type="file"][capture="environment"]').setInputFiles({
      name: "tortilla-offline.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(jpegBase64, "base64"),
    });

    await expect(page.getByText("1 foto guardada sin cobertura")).toBeVisible();

    // Al cerrar y volver a abrir la hoja, la foto sigue a salvo esperando señal.
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Anotar comida" })).toBeHidden();

    hayRed = true;
    await page.getByRole("button", { name: "Anotar lo que he comido", exact: true }).click();
    await expect(page.getByText("1 foto guardada sin cobertura")).toBeVisible();

    await page.getByRole("button", { name: "Analizar ahora" }).click();
    await expect(page.getByText("Tortilla francesa")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anotar 230 kcal" })).toBeVisible();
    await expect(page.getByText("1 foto guardada sin cobertura")).toBeHidden();
  });
});
