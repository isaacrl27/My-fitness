/**
 * Saca capturas de las pantallas, para poder mirarlas con los ojos.
 *
 *   node pruebas/capturas.mts                      (contra localhost:3100)
 *   node pruebas/capturas.mts https://example.com
 *
 * Se guardan en la carpeta temporal del PC (fuera del vault, que no hace falta
 * que viajen por Drive).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const SALIDA = join(process.env.TEMP ?? "/tmp", "capturas-peso");
mkdirSync(SALIDA, { recursive: true });

function claveDeLaPuerta(): string {
  const clave = (process.env.CLAVE_APP ?? "").trim();
  if (!clave) throw new Error("Define CLAVE_APP en el entorno para ejecutar las capturas.");
  return clave;
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const HOY = diasAtras(0);

const DATOS = {
  perfil: {
    nombre: "Isaac",
    sexo: "hombre",
    fechaNacimiento: "1998-04-12",
    alturaCm: 178,
    pesoInicialKg: 84,
    pesoObjetivoKg: 76,
    actividad: "ligero",
    ritmoKgSemana: 0.5,
    dieta: "ninguna",
    noLeGustan: ["hígado"],
    creado: "2026-10-17T08:00:00.000Z",
  },
  pesadas: [
    { fecha: diasAtras(20), kg: 85.6 },
    { fecha: diasAtras(16), kg: 85.2 },
    { fecha: diasAtras(13), kg: 85.4 },
    { fecha: diasAtras(10), kg: 85.1 },
    { fecha: diasAtras(7), kg: 84.8 },
    { fecha: diasAtras(4), kg: 84.3 },
    { fecha: diasAtras(1), kg: 84 },
  ],
  comidas: [
    {
      id: "c1",
      fecha: HOY,
      tipo: "desayuno",
      alimentos: [
        { id: "a1", nombre: "Avena en copos", cantidad: "1 ración", kcal: 152, proteinas: 5.2, carbohidratos: 24, grasas: 2.8 },
        { id: "a2", nombre: "Plátano", cantidad: "1 unidad mediana", kcal: 89, proteinas: 1.1, carbohidratos: 23, grasas: 0.3 },
      ],
    },
    {
      id: "c2",
      fecha: HOY,
      tipo: "comida",
      alimentos: [
        { id: "a3", nombre: "Pechuga de pollo a la plancha", cantidad: "1 ración", kcal: 165, proteinas: 31, carbohidratos: 0, grasas: 3.6 },
        { id: "a4", nombre: "Arroz blanco cocido", cantidad: "1 plato", kcal: 260, proteinas: 5.4, carbohidratos: 56, grasas: 0.6 },
        { id: "a5", nombre: "Ensalada mixta", cantidad: "1 plato", kcal: 45, proteinas: 2, carbohidratos: 6, grasas: 1.5 },
      ],
    },
  ],
  aguaLitros: { [HOY]: 1.5 },
  metaAguaL: 2,
  gustos: {},
};

const navegador = await chromium.launch({ channel: "msedge" });
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-ES",
  timezoneId: "Europe/Madrid",
});
const pagina = await contexto.newPage();

async function captura(nombre: string, entera = true) {
  await pagina.screenshot({ path: join(SALIDA, `${nombre}.png`), fullPage: entera });
  console.log(`guardada ${nombre}.png`);
}

// 1. La puerta
await pagina.goto(`${BASE}/entrar`);
await captura("01-entrar", false);

// 2. El cuestionario (sin datos todavía)
await pagina.getByLabel("Tu clave").fill(claveDeLaPuerta());
await pagina.getByRole("button", { name: "Entrar" }).click();
await pagina.waitForURL((u) => !u.pathname.startsWith("/entrar"));
await captura("02-cuestionario");

// 3. Con datos puestos
await pagina.evaluate(
  (datos) => window.localStorage.setItem("mi-peso:v1", JSON.stringify(datos)),
  DATOS,
);

await pagina.goto(`${BASE}/hoy`);
await captura("03-hoy");
await pagina.goto(`${BASE}/progreso`);
await captura("04-progreso");
await pagina.goto(`${BASE}/plan`);
await captura("05-plan");
await pagina.goto(`${BASE}/analisis`);
await captura("06-analisis");
await pagina.goto(`${BASE}/ajustes`);
await captura("07-ajustes");

// 4. La hoja de anotar y el escáner
await pagina.goto(`${BASE}/hoy`);
await pagina.getByRole("button", { name: "Anotar comida", exact: true }).click();
await captura("08-anotar", false);
await pagina.getByRole("button", { name: /Código de barras/ }).click();
await pagina.waitForTimeout(1200);
const aMano = pagina.getByRole("button", { name: "Escribirlo a mano" });
if (await aMano.isVisible().catch(() => false)) await aMano.click();
await captura("09-codigo-barras", false);

await navegador.close();
console.log(`\nTodas en: ${SALIDA}`);
