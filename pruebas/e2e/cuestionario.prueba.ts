import { expect, test } from "@playwright/test";
import { abrirPlanAjustes, entrar } from "./ayudas";

/** El cuestionario del principio: los seis pasos hasta dejar la app lista. */test("el cuestionario inicial deja la app lista y saludando", async ({ page }) => {
  await entrar(page);

  // Paso 0: el saludo y el nombre. Arranca vacío a propósito: si viniera
  // relleno, toda la familia acabaría llamándose igual sin darse cuenta.
  await expect(page.getByRole("heading", { name: "¡Hola!" })).toBeVisible();
  await expect(page.getByText("Beta de Isaac")).toBeVisible();
  await expect(page.getByLabel("¿Cómo te llamas?")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Empezamos" })).toBeDisabled();
  await page.getByLabel("¿Cómo te llamas?").fill("Isaac");
  await page.getByRole("button", { name: "Empezamos" }).click();

  // Paso 1: sexo y fecha de nacimiento.
  await expect(page.getByRole("heading", { name: "Sobre ti" })).toBeVisible();
  await page.getByLabel("Fecha de nacimiento").fill("1998-04-12");
  await expect(page.getByText(/Tienes \d+ años/)).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Paso 2: altura y peso de hoy.
  await expect(page.getByRole("heading", { name: "Tu cuerpo hoy" })).toBeVisible();
  await page.getByLabel("Altura").fill("178");
  await page.getByLabel("Peso de hoy").fill("84");
  await expect(page.getByText(/índice de masa corporal/)).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Paso 3: peso objetivo y ritmo.
  await expect(page.getByRole("heading", { name: "Hasta dónde quieres llegar" })).toBeVisible();
  await page.getByLabel("Peso objetivo").fill("76");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Paso 4: cuánto se mueve.
  await expect(page.getByRole("heading", { name: "Cuánto te mueves" })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Paso 5: las metas del día. El agua sale de su cuerpo (84 kg y bajando:
  // 2,75 L) y los pasos del nivel que acaba de decir (ligero: 8.000). Se
  // pueden dejar tal cual (no tocar nada) o ajustar con los botones.
  await expect(page.getByRole("heading", { name: "Tus metas del día" })).toBeVisible();
  await expect(page.getByText("2,75 L al día")).toBeVisible();
  await expect(page.getByText("8.000 pasos al día")).toBeVisible();
  await page.getByRole("button", { name: "Añadir cuarto de litro al agua" }).click();
  await expect(page.getByText("3 L al día")).toBeVisible();
  await page.getByRole("button", { name: "Quitar 500 pasos" }).click();
  await expect(page.getByText("7.500 pasos al día")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Paso 6: los hábitos. Vienen cinco marcados y aquí se añade uno propio.
  await expect(page.getByRole("heading", { name: "Tus hábitos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tomar el sol" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("Escríbelo con tus palabras").fill("Beber 2 litros de agua");
  await page.getByRole("button", { name: "Añadir" }).click();
  await expect(page.getByRole("button", { name: "Beber 2 litros de agua" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Paso 6: lo que no le gusta y el resumen del plan.
  await expect(page.getByRole("heading", { name: "Lo que no te gusta" })).toBeVisible();
  await expect(page.getByText("Gastas al día")).toBeVisible();
  await expect(page.getByText("Comerás al día")).toBeVisible();

  // Open Food Facts se simula: la prueba no depende de la red. Se busca
  // «brocoli» y se excluye tal cual lo escrito.
  await page.route("**/search.openfoodfacts.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hits: [] }),
    }),
  );
  await page.getByLabel("Busca cualquier alimento").fill("brocoli");
  await page.getByRole("button", { name: "Excluir «brocoli»" }).click();
  await expect(page.getByText("Vas a excluir 1 ingrediente.")).toBeVisible();
  await page.getByRole("button", { name: "Empezar" }).click();

  // Al acabar se va directo a Hoy: ya no hay cata de platos (22/10).
  await expect(page).toHaveURL(/\/hoy$/);
  await expect(page.getByRole("heading", { name: "Hola, Isaac" })).toBeVisible();

  // El hábito propio que se creó en el cuestionario está en Hoy, con su nombre.
  await expect(page.getByRole("button", { name: "Beber 2 litros de agua" })).toBeVisible();

  // El agua se marcó en el cuestionario: 2,75 de fábrica +1 cuarto = 3 litros,
  // y los pasos quedaron en 7.500 (8.000 − 500). Los dos salen en Ajustes.
  await page.goto("/ajustes");
  await abrirPlanAjustes(page);
  await expect(page.getByText("3 L al día")).toBeVisible();
  await expect(page.getByText("7.500 pasos")).toBeVisible();
});

/** La fecha nativa no siempre se ve entera: el formato se dice debajo. */
test("la fecha de nacimiento dice el formato completo", async ({ page }) => {
  await entrar(page);
  await page.getByLabel("¿Cómo te llamas?").fill("Marta");
  await page.getByRole("button", { name: "Empezamos" }).click();

  await expect(page.getByText("Toca para abrir el calendario (dd/mm/aaaa).")).toBeVisible();
});

/** Los tropiezos del primer día: nadie tiene que adivinar por qué no avanza. */
test("el cuestionario avisa cuando un dato no tiene sentido", async ({ page }) => {
  await entrar(page);
  await page.getByLabel("¿Cómo te llamas?").fill("María");
  await page.getByRole("button", { name: "Empezamos" }).click();

  // Una fecha de hace cinco años no es una persona de 14 a 100 años.
  await page.getByLabel("Fecha de nacimiento").fill("2020-01-01");
  await expect(page.getByText(/entre 14 y 100 años/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-20");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Una altura de 3 cm tampoco.
  await page.getByLabel("Altura").fill("3");
  await expect(page.getByText(/altura entre 100 y 250/)).toBeVisible();
  await page.getByLabel("Altura").fill("165");
  await page.getByLabel("Peso de hoy").fill("5");
  await expect(page.getByText(/peso entre 35 y 300/)).toBeVisible();
  await page.getByLabel("Peso de hoy").fill("62");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // «Mantenerme» no obliga a inventarse un peso objetivo: se pone el de hoy.
  await page.getByRole("radio", { name: /Mantenerme/ }).click();
  await expect(page.getByLabel("Peso objetivo")).toHaveValue("62");
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();
});

/**
 * El nombre: solo letras, espacios y guiones, y como mucho 20.
 *
 * Viaja a la nube y sale en el aviso del buzón, así que no puede ser
 * cualquier cosa. La regla se aplica mientras se escribe y también al guardar.
 */
test("el nombre no admite números ni símbolos y tiene tope", async ({ page }) => {
  await entrar(page);
  const caja = page.getByLabel("¿Cómo te llamas?");
  const seguir = page.getByRole("button", { name: "Empezamos" });

  await caja.fill("Isaac82");
  await expect(page.getByText(/Solo letras, espacios y guiones/)).toBeVisible();
  await expect(seguir).toBeDisabled();

  await caja.fill("Ana!");
  await expect(seguir).toBeDisabled();

  // Al llegar a 20 ya no entra ni una letra más (se escribe tecla a tecla).
  await caja.fill("");
  await caja.pressSequentially("abcdefghijklmnopqrstuvwxyz");
  await expect(caja).toHaveValue("abcdefghijklmnopqrst");

  // Un nombre de verdad, con tilde y dos palabras, sí vale.
  await caja.fill("María José");
  await expect(seguir).toBeEnabled();
  await expect(page.getByText(/Solo letras, espacios y guiones/)).toBeHidden();
});
