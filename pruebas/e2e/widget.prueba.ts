import { expect, test } from "@playwright/test";

/**
 * El widget del iPhone: `/api/widget?codigo=ABC234`.
 *
 * Su llave es el código de recuperación, no la cookie de la app, así que estas
 * pruebas se hacen SIN sesión: si la puerta lo tapase, el widget del iPhone no
 * podría leerlo nunca.
 */
test.describe("El widget del iPhone", () => {
  test("se puede pedir sin estar dentro de la app", async ({ request }) => {
    const sinCodigo = await request.get("/api/widget");
    // Sin código ni siquiera se mira la nube.
    expect(sinCodigo.status()).toBe(400);
    expect((await sinCodigo.json()).hay).toBe(false);
  });

  test("con un código bien escrito responde (sin nube local, avisa)", async ({ request }) => {
    const conCodigo = await request.get("/api/widget?codigo=ABC234");
    // En local no hay nube montada: el mismo 503 que da `/api/nube`. Lo que
    // comprueba la prueba es que la petición llega al código de la dirección
    // y no la devuelve la puerta.
    expect([404, 503]).toContain(conCodigo.status());
    expect((await conCodigo.json()).hay).toBe(false);
  });

  test("un código mal escrito tampoco pasa a la nube", async ({ request }) => {
    const malCodigo = await request.get("/api/widget?codigo=XX");
    expect(malCodigo.status()).toBe(400);
  });

  test("sin cuerpo no se apunta nada", async ({ request }) => {
    const vacio = await request.post("/api/widget", { data: {} });
    expect(vacio.status()).toBe(400);
    expect((await vacio.json()).hay).toBe(false);
  });

  test("los pasos no pueden pasar del tope", async ({ request }) => {
    const muchos = await request.post("/api/widget", {
      data: { codigo: "ABCDEF", pasos: 100001, suenoHoras: 7 },
    });
    expect(muchos.status()).toBe(400);
  });

  test("el sueño no puede pasar de 24 horas", async ({ request }) => {
    const mucho = await request.post("/api/widget", {
      data: { codigo: "ABCDEF", pasos: 100, suenoHoras: 30 },
    });
    expect(mucho.status()).toBe(400);
  });
});
