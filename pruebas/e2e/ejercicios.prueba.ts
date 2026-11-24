import { expect, test, type Page } from "@playwright/test";
import { datosBase, entrar, sembrar } from "./ayudas";

/**
 * Abre Entreno con «hoy» en un día que tenga sesión.
 *
 * Los planes de la app son de lunes a viernes: un sábado o un domingo no hay
 * ejercicios que marcar y el botón de completar no existe. Para que la prueba
 * valga cualquier día, en fin de semana se fija el reloj del navegador al
 * lunes de esa misma semana. Los datos sembrados no dependen de la fecha en
 * estas pruebas.
 */
async function irAEntreno(page: Page): Promise<void> {
  const hoy = new Date();
  if (hoy.getDay() === 0 || hoy.getDay() === 6) {
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    lunes.setHours(10, 0, 0, 0);
    await page.clock.setFixedTime(lunes);
  }
  await page.goto("/entreno");
}

/**
 * Un perfil que entrena hoy seguro.
 *
 * El plan de 2 días es lunes y jueves; si la prueba cae en otro día, el
 * bloque de «Marcar todo como hecho» no aparecería. Se elige el plan más
 * pequeño que incluya el día de hoy, con los mismos días que DIAS_DE_ENTRENO
 * en lib/ejercicios.ts (0 = lunes).
 */
function conEntrenoHoy(datos: Record<string, unknown>) {
  const indiceHoy = (new Date().getDay() + 6) % 7;
  const planes: Record<number, number[]> = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
  };
  const dias = ([2, 3, 4] as const).find((d) => planes[d].includes(indiceHoy)) ?? 3;
  return {
    ...datos,
    perfil: {
      ...(datos.perfil as Record<string, unknown>),
      ejercicioDias: dias,
      ejercicioSitio: "casa",
    },
  };
}

/**
 * La pestaña Entreno, ya separada del Plan.
 *
 * Lo que se comprueba: que se puede cambiar de casa a gimnasio y de 2 a 3
 * días, que la semana enseña los días que toca, que cada ejercicio abre su
 * ficha con pasos y vídeo plegado, y que las preferencias aguantan al
 * recargar. También que el menú de comidas no se cuela por debajo.
 */

test.describe("El plan de ejercicios", () => {
  test("cambia de sitio y de días, y cada ficha trae pasos y vídeo", async ({ page }) => {
    await sembrar(page, datosBase());
    await entrar(page);
    await page.goto("/entreno");

    await expect(page.getByRole("heading", { name: "Entreno" })).toBeVisible();

    // El perfil de prueba es «ligero»: 2 días y casa por defecto.
    await expect(page.getByRole("radio", { name: "En casa" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("radio", { name: "2 días" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator("button[data-dia-entreno]")).toHaveCount(2);

    // Cambiar a 3 días y a gimnasio: la semana se rehace sin perder la pestaña.
    await page.getByRole("radio", { name: "3 días" }).click();
    await expect(page.locator("button[data-dia-entreno]")).toHaveCount(3);
    await page.getByRole("radio", { name: "En el gimnasio" }).click();
    await expect(page.locator("button[data-dia-entreno]")).toHaveCount(3);

    // Abrir el primer día (si no está ya abierto, que es lo normal si es hoy).
    const primerDia = page.locator("button[data-dia-entreno]").first();
    if ((await primerDia.getAttribute("aria-expanded")) === "false") {
      await primerDia.click();
    }

    const ejercicios = page.locator("button[data-ejercicio]");
    await expect(ejercicios.first()).toBeVisible();
    expect(await ejercicios.count()).toBeGreaterThanOrEqual(4);

    // Ninguno es del catálogo de casa: los ids de gimnasio no se cuelan.
    const ids = await ejercicios.evaluateAll((botones) =>
      botones.map((b) => b.getAttribute("data-ejercicio") ?? ""),
    );
    expect(ids).not.toContain("sentadilla");
    expect(ids).not.toContain("flexion");
    expect(ids).toContain("plancha-gym");

    // Abrir el primer ejercicio: pasos y truco.
    await ejercicios.first().click();
    // El contenido de todas las fichas queda montado (plegado) para que la
    // apertura y el cierre puedan animarse. Se comprueba el bloque de la
    // ficha, que es lo que de verdad ocupa sitio en pantalla.
    const ficha = page.locator("[data-ficha]").first();
    await expect(ficha).toBeVisible();
    await expect(ficha.getByText("Cómo se hace", { exact: true })).toBeVisible();
    await expect(ficha.getByText(/Truco:/)).toBeVisible();

    // El vídeo está plegado: primero el resumen, luego el reproductor.
    await expect(page.locator('iframe[title*="cómo se hace"]')).toHaveCount(0);
    await ficha.getByText("Ver cómo se hace en vídeo", { exact: true }).click();
    const video = page.locator('iframe[title*="cómo se hace"]');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute("src", /youtube-nocookie\.com\/embed\//);
    await expect(page.getByRole("link", { name: "Abrir el vídeo en YouTube" })).toHaveAttribute(
      "href",
      /youtube\.com\/watch\?v=/,
    );

    // El menú de comidas no se queda por debajo.
    await expect(page.locator("button[data-dia]")).toHaveCount(0);

    // Al recargar, se mantienen el sitio y los días elegidos.
    await page.reload();
    await expect(page.getByRole("status", { name: "Cargando la app" })).toBeHidden();
    await expect(page.getByRole("radio", { name: "En el gimnasio" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("radio", { name: "3 días" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Entreno" })).toBeVisible();
  });

  test("los ejercicios se tachan y el entreno del día se da por hecho", async ({ page }) => {
    await sembrar(page, conEntrenoHoy(datosBase()));
    await entrar(page);
    await irAEntreno(page);

    // Tachar el primer ejercicio del primer día que tenga rutina. El check va
    // en su propio botón, así que no abre la ficha: solo cambia a tachado.
    const abrirPrimerDia = async () => {
      const primerDia = page.locator("button[data-dia-entreno]").first();
      if ((await primerDia.getAttribute("aria-expanded")) === "false") await primerDia.click();
    };
    await abrirPrimerDia();

    const marcar = page.getByRole("button", { name: /^Marcar .* como hecho$/ });
    await expect(marcar.first()).toBeVisible();
    await marcar.first().click();
    await expect(page.getByRole("button", { name: /^Desmarcar .* como hecho$/ }).first()).toBeVisible();
    // El contenido sigue montado para poder plegarse suave, pero el bloque
    // se cierra con altura cero y no ocupa sitio.
    await expect(page.locator("[data-ficha]").first()).toBeHidden();
    // El subtítulo de series y descanso también se pliega: no queda una
    // segunda línea colgando debajo del nombre tachado.
    await expect(page.getByText(/series ×/).first()).toBeHidden();

    // Al recargar, lo tachado sigue tachado.
    await page.reload();
    await expect(page.getByRole("status", { name: "Cargando la app" })).toBeHidden();
    await abrirPrimerDia();
    await expect(page.getByRole("button", { name: /^Desmarcar .* como hecho$/ }).first()).toBeVisible();

    // El día de hoy entrena seguro (lo monta conEntrenoHoy), así que el botón
    // de completar está siempre: la comprobación no depende de que la prueba
    // caiga en lunes o jueves.
    const diaDeHoy = page
      .locator("button[data-dia-entreno]")
      .filter({ has: page.getByText("hoy", { exact: true }) });
    await expect(diaDeHoy).toHaveCount(1);
    if ((await diaDeHoy.first().getAttribute("aria-expanded")) === "false") {
      await diaDeHoy.first().click();
    }
    // Se deja una ficha abierta a propósito: el botón debe cerrarla.
    const fichaAbierta = page.locator("button[data-ejercicio]").first();
    if ((await fichaAbierta.getAttribute("aria-expanded")) === "false") {
      await fichaAbierta.click();
    }
    await expect(page.locator("[data-ficha]").first()).toBeVisible();
    await page.getByRole("button", { name: "Marcar todo como hecho" }).click();
    // Al completarse, el botón se convierte en aviso de hecho y ninguna
    // ficha queda abierta: no se lee texto de un ejercicio ya tachado.
    await expect(page.getByText("¡Entreno de hoy completado!", { exact: true })).toBeVisible();
    // La segunda línea dice qué ha pasado con el hábito: con «correr» activo
    // se marca y se avisa; si no lo estuviera, diría que la sesión quedó
    // guardada. Las dos ramas se prueban aquí y en la prueba de abajo.
    await expect(page.getByText(/Se ha marcado tu hábito/)).toBeVisible();
    await expect(page.getByText("Buen trabajo, sesión guardada en tu semana.")).toHaveCount(0);
    await expect(page.locator("[data-ficha]").first()).toBeHidden();
    await expect(page.getByRole("button", { name: "Deshacer" })).toBeVisible();
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByRole("button", { name: "Marcar todo como hecho" })).toBeVisible();
  });

  test("el nombre de un ejercicio tachado se despliega sin quitarle el check", async ({ page }) => {
    await sembrar(page, conEntrenoHoy(datosBase()));
    await entrar(page);
    await page.goto("/entreno");

    const primerDia = page.locator("button[data-dia-entreno]").first();
    if ((await primerDia.getAttribute("aria-expanded")) === "false") await primerDia.click();

    // El último de la lista: al tacharlo no queda ningún pendiente al que
    // saltar, así que no se abre nada solo y la lista queda limpia.
    const ultimo = page.locator("button[data-ejercicio]").last();
    const id = await ultimo.getAttribute("data-ejercicio");
    await page.getByRole("button", { name: /^Marcar .* como hecho$/ }).last().click();

    // Tachado y plegado: ni la ficha ni la línea de series ocupan sitio.
    await expect(ultimo).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`[data-ficha="${id}"]`)).toBeHidden();
    await expect(ultimo.getByText(/series ×/)).toBeHidden();

    // Tocar el nombre lo despliega para consultarlo, sin quitarle el check.
    await ultimo.click();
    await expect(ultimo).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`[data-ficha="${id}"]`)).toBeVisible();
    await expect(ultimo.getByText(/series ×/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Desmarcar .* como hecho$/ }).last(),
    ).toBeVisible();

    // Y se vuelve a plegar sin más, con el check puesto.
    await ultimo.click();
    await expect(page.locator(`[data-ficha="${id}"]`)).toBeHidden();
  });

  test("sin el hábito de entrenar, el aviso dice que la sesión quedó guardada", async ({
    page,
  }) => {
    const datos = conEntrenoHoy(datosBase());
    // Un perfil que no lleva «correr» entre sus hábitos activos.
    const perfil = { ...datos.perfil, habitosActivos: ["sol", "leer"] };
    await sembrar(page, { ...datos, perfil });
    await entrar(page);
    await irAEntreno(page);

    const diaDeHoy = page
      .locator("button[data-dia-entreno]")
      .filter({ has: page.getByText("hoy", { exact: true }) });
    if ((await diaDeHoy.first().getAttribute("aria-expanded")) === "false") {
      await diaDeHoy.first().click();
    }
    await page.getByRole("button", { name: "Marcar todo como hecho" }).click();

    await expect(page.getByText("¡Entreno de hoy completado!", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Buen trabajo, sesión guardada en tu semana."),
    ).toBeVisible();
    await expect(page.getByText(/Se ha marcado tu hábito/)).toHaveCount(0);
  });
});
