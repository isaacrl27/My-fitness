import { expect, test } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/**
 * Ajustes repartido en pestañas: Plan / Datos / Avisos / Nube / Ayuda.
 *
 * Cada pestaña enseña lo suyo y calla lo demás; al abrir, «Datos» está delante
 * (es donde viven el tema, el perfil y las metas). Silencio a que todo siga
 * accesible: la pestaña es una puerta, no un borrado.
 */

test.describe("Ajustes por pestañas", () => {
  test("al abrir se ve «Datos», y las pestañas esconden lo suyo", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/ajustes");

    const grupo = page.getByRole("radiogroup", { name: "Grupos de Ajustes" });
    await expect(grupo).toBeVisible();

    // Pestaña de fábrica: Datos. Lleva el perfil, el IMC y el tema.
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
    await expect(page.getByText("Índice de masa corporal")).toBeVisible();
    // El antetítulo «Tus datos» ya no se repite encima de Ajustes.
    await expect(page.getByText("Tus datos", { exact: true })).toHaveCount(1);
    // Pero no lo de las otras pestañas.
    await expect(page.getByText("Gastas al día")).toBeHidden();
    await expect(page.getByText("Que te avise")).toBeHidden();
    await expect(page.getByText("Contar un problema o una idea")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Eliminar cuenta" })).toBeHidden();

    // Plan: calorías, agua y pasos.
    await page.getByRole("radio", { name: "Plan", exact: true }).click();
    await expect(page.getByText("Gastas al día")).toBeVisible();
    await expect(page.getByText("2 L al día")).toBeVisible();
    await expect(page.getByText("8.000 pasos")).toBeVisible();
    await expect(page.getByText("Índice de masa corporal")).toBeHidden();

    // Avisos.
    await page.getByRole("radio", { name: "Avisos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Horario de tus avisos" })).toBeVisible();
    await expect(page.getByText("Índice de masa corporal")).toBeHidden();

    // Nube: también salen Salir y Eliminar cuenta.
    await page.getByRole("radio", { name: "Nube", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Eliminar cuenta" })).toBeVisible();
    await expect(page.getByText("Cerrar sesión")).toBeVisible();

    // Ayuda: el buzón y la instalación.
    await page.getByRole("radio", { name: "Ayuda", exact: true }).click();
    await expect(page.getByText("Contar un problema o una idea")).toBeVisible();
    await expect(page.getByText("Ver cómo instalarla")).toBeVisible();

    // Y volviendo a Plan, todo vuelve.
    await page.getByRole("radio", { name: "Plan", exact: true }).click();
    await expect(page.getByText("Gastas al día")).toBeVisible();
  });

  test("eliminar cuenta pide a la nube borrar la cuenta y deja el móvil limpio", async ({
    page,
  }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    // Este móvil ya tiene cuenta en la nube (marca y código guardados).
    await page.evaluate(() => {
      window.localStorage.setItem("mi-peso:dispositivo", "movil-prueba");
      window.localStorage.setItem("mi-peso:codigo", "ABC123");
    });

    let pedidosBorrar = 0;
    await page.route("**/api/nube*", async (route) => {
      if (route.request().method() === "DELETE") {
        pedidosBorrar += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ hay: true }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hay: false }),
      });
    });

    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Nube", exact: true }).click();
    await page.getByRole("button", { name: "Eliminar cuenta" }).click();
    await page.getByRole("button", { name: "Sí, eliminar todo" }).click();

    // La nube recibe el borrado una vez y el móvil vuelve al cuestionario.
    expect(pedidosBorrar).toBe(1);
    await expect(page).toHaveURL(/\/$/);
    const queda = await page.evaluate(() => {
      const datos = window.localStorage.getItem("mi-peso:v1");
      return {
        datos: datos ? (JSON.parse(datos) as Record<string, unknown>) : null,
        marca: window.localStorage.getItem("mi-peso:dispositivo"),
        codigo: window.localStorage.getItem("mi-peso:codigo"),
      };
    });
    // El móvil queda como recién estrenado: sin perfil, sin comidas y sin
    // cuenta, y de los datos guardados no queda ni el nombre.
    expect(queda.datos?.perfil ?? null).toBeNull();
    expect(queda.datos?.comidas ?? []).toHaveLength(0);
    expect(JSON.stringify(queda.datos?.perfil ?? {})).not.toContain("Isaac");
    expect(queda.marca).toBeNull();
    expect(queda.codigo).toBeNull();
  });

  test("si la nube no deja borrar, no se borra nada a medias y se avisa", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.evaluate(() => window.localStorage.setItem("mi-peso:dispositivo", "movil-prueba"));

    await page.route("**/api/nube*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          hay: false,
          motivo: "No se ha podido conectar con la nube. Inténtalo de nuevo.",
        }),
      }),
    );

    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Nube", exact: true }).click();
    await page.getByRole("button", { name: "Eliminar cuenta" }).click();
    await page.getByRole("button", { name: "Sí, eliminar todo" }).click();

    await expect(
      page.getByText("No se ha podido conectar con la nube. Inténtalo de nuevo."),
    ).toBeVisible();
    // El móvil sigue como estaba: sin medio borrados.
    const datos = await page.evaluate(() => window.localStorage.getItem("mi-peso:v1"));
    expect(datos).not.toBeNull();
  });
});
