import { expect, test, type Page } from "@playwright/test";
import { abrirPlanAjustes, datosBase, diasAtras, entrar, PERFIL, sembrar } from "./ayudas";

/** Lee las calorías del día del aro de la pantalla de Hoy (mismo ayudante que en hoy.prueba.ts). */
async function kcalDeHoy(page: Page): Promise<number> {
  const etiqueta = await page
    .getByRole("img", { name: /Calorías de hoy/ })
    .getAttribute("aria-label");
  const trozo = etiqueta?.match(/Calorías de hoy: (\d+) de/);
  return trozo ? Number(trozo[1]) : -1;
}

/** Las cinco pestañas, el plan de comidas, el entreno y los ajustes. */
test.describe("Las pantallas", () => {
  test("las cinco pestañas abren y no sueltan errores", async ({ page }) => {
    const errores: string[] = [];
    page.on("console", (mensaje) => {
      if (mensaje.type() !== "error") return;
      // En pruebas no hay nube montada, y al abrir la app se le pregunta a la
      // nube por si hay algo más. El servidor contesta 503 y el navegador lo
      // apunta aquí; la app lo lee como «sin-nube» y sigue sola, así que no es
      // un fallo que haya que frenar.
      if (/status of 503|ERR_SSL_PROTOCOL_ERROR/.test(mensaje.text())) return;
      errores.push(mensaje.text());
    });
    page.on("pageerror", (fallo) => errores.push(`Error de JavaScript: ${fallo.message}`));

    await sembrar(page, datosBase());
    await entrar(page);

    await page.getByRole("link", { name: "Progreso" }).click();
    await expect(page.getByRole("heading", { name: "Peso y calorías" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Evolución del peso/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calorías por día" })).toBeVisible();
    // Sin comidas anotadas no se dibuja una gráfica vacía: se explica.
    await expect(
      page.getByText("Con un par de comidas ya te dibujo las calorías."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();

    // La pestaña Análisis se unió a Progreso: su dirección vieja redirige.
    await expect(page.getByRole("link", { name: "Análisis" })).toHaveCount(0);
    await page.goto("/analisis");
    await expect(page).toHaveURL(/\/progreso$/);
    await expect(page.getByRole("heading", { name: "Peso y calorías" })).toBeVisible();

    await page.getByRole("link", { name: "Plan" }).click();
    await expect(page.getByRole("heading", { name: "Plan de comidas" })).toBeVisible();
    await page.getByRole("button", { name: "Compra" }).click();
    await expect(page.getByRole("heading", { name: "Lista de la compra" })).toBeVisible();

    await page.getByRole("link", { name: "Entreno" }).click();
    await expect(page.getByRole("heading", { name: "Entreno" })).toBeVisible();
    await expect(page.getByText(/días según lo que dijiste|Has elegido \d días/)).toBeVisible();

    await page.getByRole("link", { name: "Ajustes" }).click();
    await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
    await abrirPlanAjustes(page);
    await expect(page.getByText("Tu plan de esta semana")).toBeVisible();

    await page.getByRole("link", { name: "Hoy" }).click();
    await expect(page.getByRole("heading", { name: "Hola, Isaac" })).toBeVisible();

    expect(errores).toEqual([]);
  });

  test("en el plan se puede valorar un plato", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/plan");

    // Se abre el primer día de la semana (si no es hoy, que empieza plegado)
    // y se valora su primer plato. Al valorar, la semana se rehace sola: el
    // plato marcado queda fijo en su hueco solo si lo está en el primero.
    await expect(page.locator("button[data-dia]").first()).toBeVisible();
    const primerDia = page.locator("button[data-dia]").first();
    if ((await primerDia.getAttribute("aria-expanded")) === "false") await primerDia.click();
    await page.locator("button[data-turno]").first().click();

    const meGusta = page.getByRole("button", { name: "Me gusta", exact: true });
    await meGusta.click();
    await expect(meGusta).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/plato valorado/)).toBeVisible();
  });

  test("marcar «no me gusta» propone otro plato y no deja huecos", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/plan");

    await page.locator("button[data-turno]").first().click();
    await page.getByRole("button", { name: "No me gusta", exact: true }).click();

    await expect(page.getByText(/plato valorado/)).toBeVisible();
    await expect(page.getByText(/no hay ningún plato que encaje/)).toHaveCount(0);
  });

  test("el plan se puede cambiar por otra semana", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/plan");

    const platos = () => page.locator("button[data-turno]").allInnerTexts();
    // Hay que esperar a que la semana esté pintada: la app lee los datos del
    // móvil al abrir y hasta entonces la lista está vacía.
    await expect(page.locator("button[data-turno]").first()).toBeVisible();
    const antes = await platos();
    await page.getByRole("button", { name: "Cambiar los platos" }).click();
    const dialogo = page.getByRole("alertdialog", {
      name: "¿Cambiar los platos de la semana?",
    });
    await expect(dialogo).toBeVisible();
    await page.getByRole("button", { name: "Sí, cambiar" }).click();
    await expect(dialogo).toBeHidden();
    const despues = await platos();

    expect(antes.length).toBeGreaterThan(0);
    expect(despues.join(" | ")).not.toBe(antes.join(" | "));
  });

  test("en progreso se anota un peso y sale en el historial", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/progreso");

    await page.getByLabel("Fecha").fill(diasAtras(2));
    const campoPeso = page.getByLabel("Peso", { exact: true });
    // La caja empieza vacía: el último peso se lee en la ayuda, no se cuela
    // como valor y no se puede guardar sin escribir uno nuevo.
    await expect(campoPeso).toHaveValue("");
    await expect(campoPeso).toHaveAttribute("placeholder", "Ej. 76,4");
    await expect(page.getByRole("button", { name: "Guardar peso" })).toBeDisabled();
    await campoPeso.fill("84.6");
    await page.getByRole("button", { name: "Guardar peso" }).click();

    await expect(page.getByText(/84,6/).first()).toBeVisible();
  });

  test("en ajustes se cambian los datos y se guardan", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Datos", exact: true }).click();

    await page.getByRole("button", { name: "Cambiar" }).first().click();
    await expect(page.getByLabel("Nombre")).toHaveValue("Isaac");

    await page.getByLabel("Nombre").fill("Isaac Ruiz");
    await page.getByLabel("Peso objetivo").fill("74");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByRole("button", { name: "Cambiar" }).first()).toBeVisible();
    await page.reload();
    await page.getByRole("radio", { name: "Datos", exact: true }).click();
    await page.getByRole("button", { name: "Cambiar" }).first().click();
    await expect(page.getByLabel("Nombre")).toHaveValue("Isaac Ruiz");
    await expect(page.getByLabel("Peso objetivo")).toHaveValue("74");
  });

  test("en ajustes el nombre nuevo cumple la misma regla", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Datos", exact: true }).click();
    await page.getByRole("button", { name: "Cambiar" }).first().click();

    const caja = page.getByLabel("Nombre");
    const guardar = page.getByRole("button", { name: "Guardar cambios" });

    await caja.fill("Isaac82");
    await expect(page.getByText(/Solo letras, espacios y guiones/)).toBeVisible();
    await expect(guardar).toBeDisabled();

    await caja.fill("Marta");
    await expect(guardar).toBeEnabled();
  });

  test("los hábitos llevan a su pantalla y la recuperación sigue plegada", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/ajustes");
    await abrirPlanAjustes(page);

    // En Ajustes ya no está la lista larga de interruptores: una línea que
    // abre su propia pantalla.
    await expect(page.getByRole("button", { name: /^Elegir tus hábitos/ })).toHaveCount(0);
    await page.getByRole("link", { name: /Cambiar hábitos diarios/ }).click();
    await expect(page).toHaveURL(/\/ajustes\/habitos$/);
    await expect(page.getByRole("heading", { name: "Tus hábitos diarios" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver a Ajustes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tomar el sol" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Apagar uno se guarda de verdad: en Hoy ya no sale.
    await page.getByRole("button", { name: "Tomar el sol" }).click();
    await expect(page.getByRole("button", { name: "Tomar el sol" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.goto("/hoy");
    await expect(page.getByRole("button", { name: "Tomar el sol" })).toHaveCount(0);

    // La recuperación por código, igual: plegada para no pulsarla sin querer.
    // (El pliegue lleva esa frase en su nombre, así que el botón de dentro se
    // busca con el nombre exacto para no contar el del pliegue.)
    await page.goto("/ajustes");
    await page.getByRole("radio", { name: "Nube", exact: true }).click();
    const recuperar = page.getByRole("button", { name: /Cambio de móvil/ });
    await expect(recuperar).toBeVisible();
    await expect(recuperar).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("button", { name: "Recuperar mis datos", exact: true }),
    ).toHaveCount(0);
    await recuperar.click();
    await expect(
      page.getByRole("button", { name: "Recuperar mis datos", exact: true }),
    ).toBeVisible();
  });

  test("un hábito propio se crea, sale en Hoy y se borra", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/ajustes/habitos");

    await page.getByLabel("Escríbelo con tus palabras").fill("Sacar al perro");
    await page.getByRole("button", { name: "Añadir" }).click();
    await expect(page.getByRole("button", { name: "Sacar al perro", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // El nombre que escribió es el que se ve en Hoy.
    await page.goto("/hoy");
    await expect(page.getByRole("button", { name: "Sacar al perro", exact: true })).toBeVisible();

    // Y al borrarlo desaparece de los dos sitios.
    await page.goto("/ajustes/habitos");
    await page.getByRole("button", { name: "Borrar el hábito «Sacar al perro»" }).click();
    await expect(page.getByRole("button", { name: "Sacar al perro", exact: true })).toHaveCount(0);
    await page.goto("/hoy");
    await expect(page.getByRole("button", { name: "Sacar al perro", exact: true })).toHaveCount(0);
  });

  test("con más de cinco hábitos se explica que solo cinco dan puntos", async ({ page }) => {
    const datos = datosBase();
    datos.perfil = {
      ...PERFIL,
      habitosActivos: ["leer", "caminar", "verdura", "fruta", "proteina", "dormir"],
    };
    await sembrar(page, datos);
    await entrar(page);
    await page.goto("/ajustes/habitos");

    await expect(page.getByText(/Tienes 6 activos/)).toBeVisible();
    await expect(page.getByText(/máximo cinco al día/)).toBeVisible();

    // En Ajustes de Hábitos se explica que sólo cinco dan puntos.
    await expect(page.getByText(/Cada marca suma puntos|tope de cinco al día/)).toBeVisible();
    await page.goto("/hoy");

    // Un hábito cumplido se ve sólido, no como la selección de Ajustes.
    const leer = page.getByRole("button", { name: "Leer" });
    await leer.click();
    const clases = await leer.getAttribute("class");
    expect(clases).toContain("bg-accent");
    expect(clases).not.toContain("bg-accent-soft");
  });

  test("el botón de conectar la salud del móvil no aparece en la web", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/ajustes");

    // La conexión con Salud es cosa de la app de Android/iPhone; la web no
    // la enseña ni por casualidad.
    await expect(
      page.getByRole("button", { name: "Conectar con Salud del móvil (Pasos y Sueño)" }),
    ).toHaveCount(0);
  });

  test("en el plan se anota un plato en Hoy y suben sus calorías", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/plan");

    // Hoy empieza desplegado: los botones de anotar salen al abrir un plato.
    await page.locator("button[data-turno]").first().click();

    const anotar = page.getByRole("button", { name: /Anotar (el|la) .* en Hoy/ }).first();
    await anotar.click();
    // No se anota dos veces: el botón cambia de texto y queda deshabilitado.
    const anotado = page.getByRole("button", { name: "Anotado en Hoy" });
    await expect(anotado).toHaveText("✓ Anotado en Hoy");
    await expect(anotado).toBeDisabled();

    await page.getByRole("link", { name: "Hoy" }).click();
    await expect(page).toHaveURL(/\/hoy$/);
    await expect(page.getByRole("img", { name: /Calorías de hoy/ })).toBeVisible();
    expect(await kcalDeHoy(page)).toBeGreaterThan(0);
  });

  test("en el plan solo el día de hoy empieza desplegado", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/plan");

    const dias = page.locator("button[data-dia]");
    await expect(dias.first()).toBeVisible();

    // Hoy abierto; el resto de días de la semana plegados.
    const hoyISO = new Date().toLocaleDateString("en-CA");
    const deHoy = page.locator(`button[data-dia="${hoyISO}"]`);
    await expect(deHoy).toHaveAttribute("aria-expanded", "true");
    await expect(deHoy.locator("xpath=..")).toHaveClass(/border-accent/);
    await expect(page.locator("button[data-turno]").first()).toBeVisible();

    const total = await dias.count();
    expect(total).toBeGreaterThan(1);
    for (let i = 0; i < total; i += 1) {
      const dia = dias.nth(i);
      if ((await dia.getAttribute("data-dia")) === hoyISO) continue;
      await expect(dia).toHaveAttribute("aria-expanded", "false");
    }
    // Al abrir otro día, se pliega el anterior (solo uno abierto a la vez).
    const manana = dias.nth(1);
    await manana.click();
    await expect(manana).toHaveAttribute("aria-expanded", "true");
    await expect(deHoy).toHaveAttribute("aria-expanded", "false");
  });
});
