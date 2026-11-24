import { test, expect } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/**
 * La página de instalación: es la que se manda a la familia.
 *
 * Tiene que explicar las dos vías (Android con la app, iPhone con la web en la
 * pantalla de inicio) y servirse SIN sesión: el móvil necesita el manifest, los
 * iconos y el APK antes de que nadie haya escrito una clave. Si la puerta los
 * tapa, Android no ofrece instalar y el logo sale distinto.
 */

test.describe("Instalar la app", () => {
  test("sin sesión, la página de instalación se ve", async ({ page }) => {
    await page.goto("/instalar");
    await expect(page).toHaveURL(/\/instalar/);
    await expect(page.getByRole("heading", { name: /instalar my fitness/i })).toBeVisible();
  });

  test("sin sesión, el archivo de la app se descarga y es un APK", async ({ page }) => {
    const respuesta = await page.request.get("/descargas/my-fitness-android.apk", {
      maxRedirects: 0,
    });
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()["content-type"] ?? "").toContain("android");
    const cuerpo = await respuesta.body();
    // Un APK es un ZIP: empieza por "PK".
    expect(cuerpo.subarray(0, 2).toString()).toBe("PK");
  });

  test("sin sesión, el manifest y los iconos se sirven de verdad", async ({ page }) => {
    const manifest = await page.request.get("/manifest.webmanifest", { maxRedirects: 0 });
    expect(manifest.status()).toBe(200);
    expect(manifest.headers()["content-type"] ?? "").toContain("json");
    const datos = (await manifest.json()) as { name?: string; icons?: unknown[] };
    expect(datos.name).toBe("My Fitness");
    expect((datos.icons ?? []).length).toBeGreaterThanOrEqual(3);

    for (const ruta of ["/icono-192.png", "/icono-512.png", "/icono-maskable.png", "/apple-icon.png"]) {
      const icono = await page.request.get(ruta, { maxRedirects: 0 });
      expect(icono.status(), ruta).toBe(200);
      expect(icono.headers()["content-type"] ?? "", ruta).toContain("image/png");
    }
  });

  test("con sesión, explica Android y iPhone y enlaza el archivo", async ({ page }) => {
    await entrar(page);
    await page.goto("/instalar");

    await expect(page.getByRole("heading", { name: /instalar my fitness/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /android/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /iphone/i })).toBeVisible();

    const enlace = page.getByRole("link", { name: /descargar.*android/i });
    await expect(enlace).toHaveAttribute("href", /\/descargas\/my-fitness-android\.apk$/);
    await expect(enlace).toHaveAttribute("download", "");
  });

  test("con sesión, la nota de iPhone explica cómo van los pasos y el sueño", async ({ page }) => {
    await entrar(page);
    await page.goto("/instalar");

    // La misma historia que en Ajustes y Privacidad: a mano en Hoy y, si se
    // quiere, con el Atajo. Nunca una cosa distinta en cada pantalla.
    await expect(
      page.getByText(
        "En iPhone los pasos y el sueño los apuntas a mano en Hoy, en la tarjeta «Pasos y sueño». Si algún día quieres, hay un Atajo de iPhone que los manda solo; pídemelo y te lo paso.",
      ),
    ).toBeVisible();
  });

  test("con sesión, el archivo se sirve y es un APK", async ({ page }) => {
    await entrar(page);
    const respuesta = await page.request.get("/descargas/my-fitness-android.apk");
    expect(respuesta.status()).toBe(200);
    const tipo = respuesta.headers()["content-type"] ?? "";
    expect(tipo).toContain("android");
    const cuerpo = await respuesta.body();
    // Un APK es un ZIP: empieza por "PK".
    expect(cuerpo.subarray(0, 2).toString()).toBe("PK");
  });

  test("con sesión, el enlace sale escrito para poder pasarlo", async ({ page }) => {
    await entrar(page);
    await page.goto("/instalar");
    const origen = new URL(page.url()).origin;
    // El enlace que se copia lleva a /instalar, no a la raíz: quien lo recibe
    // tiene que ver primero cómo se instala. Si la app se abre en el PC de
    // pruebas (localhost), el enlace enseña la dirección pública: un enlace a
    // localhost no le sirve a nadie fuera de esta máquina.
    const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);
    const base = esLocal ? (process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com") : origen;
    await expect(page.getByText(`${base}/instalar`).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /copiar enlace/i })).toBeVisible();
  });

  test("desde Ajustes se llega a la página de instalación", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    // Se espera a que la app esté abierta del todo antes de cambiar de
    // pantalla: si se navega a mitad de la entrada, el guardia todavía ve el
    // perfil vacío y devuelve al cuestionario.
    await expect(page.getByRole("heading", { name: /Hola, Isaac/ })).toBeVisible();
    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Ayuda", exact: true }).click();
    const enlace = page.getByRole("link", { name: /instalar|pasar la app|familia/i }).first();
    await expect(enlace).toBeVisible();
    await enlace.click();
    await expect(page).toHaveURL(/\/instalar/);
  });

  test("al volver de instalar a la app no vuelve a salir la cortina", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await expect(page.getByRole("heading", { name: /Hola, Isaac/ })).toBeVisible();

    // Todo el camino sin recargar la página, que es como lo hace la familia:
    // Ajustes por la barra de abajo y de ahí a las instrucciones.
    await page.getByRole("link", { name: "Ajustes" }).first().click();
    await expect(page).toHaveURL(/\/ajustes/);
    await page.getByRole("radio", { name: "Ayuda", exact: true }).click();
    await page.getByRole("link", { name: /ver cómo instalarla/i }).click();
    await expect(page).toHaveURL(/\/instalar/);

    await page.getByRole("link", { name: /volver a la app/i }).click();
    await expect(page).toHaveURL(/\/hoy/);

    // La cortina ya salió al abrir la app: al regresar no puede taparlo todo
    // otra vez en mitad de la navegación.
    await expect(page.getByRole("status", { name: "Cargando la app" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Hola, Isaac/ })).toBeVisible();
  });
});
