import { defineConfig } from "@playwright/test";

/**
 * Pruebas de navegador de la app de peso.
 *
 * Usan el Edge que ya está instalado en el PC (nada de descargar navegadores) y
 * apuntan al servidor de pruebas que haya levantado. Por defecto, el 3100, que
 * es donde se sirve la versión ya compilada:
 *
 *   DESACTIVAR_NUBE_E2E=1 npx next start -p 3100   (o sin SUPABASE_URL)
 *   npm run prueba:e2e
 *
 * La clave de la puerta se lee del fichero de secretos en tiempo de ejecución
 * (ver pruebas/e2e/ayudas.ts). Nunca se escribe aquí.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./pruebas/e2e",
  testMatch: "**/*.prueba.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // De una en una: las pruebas comparten el contador de intentos fallidos de la
  // puerta y el mismo servidor.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    channel: "msedge",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },
});
