import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION, NOVEDADES } from "../lib/novedades.ts";
import { VERSION_MAYOR, VERSION_MENOR, VERSION_PARCHE, VERSION_APP, VERSION_ETIQUETA } from "../lib/version.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, "..");

function afirmar(condicion: boolean, mensaje: string) {
  if (!condicion) {
    throw new Error(`FALLO: ${mensaje}`);
  }
}

console.log("--- Pruebas Fase 11: Gran Ensayo Final y Verificación Global ---");

// 1. SemVer 0.1.35 y Novedades
afirmar(VERSION_MAYOR === 0, "VERSION_MAYOR es 0");
afirmar(VERSION_MENOR === 1, "VERSION_MENOR es 1");
afirmar(VERSION_PARCHE === 35, "VERSION_PARCHE es 35");
afirmar(VERSION_APP === "0.1.35", "VERSION_APP es '0.1.35'");
afirmar(VERSION_ETIQUETA === "Versión 0.1.35", "VERSION_ETIQUETA es 'Versión 0.1.35'");
afirmar(VERSION === 100, "lib/novedades.ts tiene VERSION = 100");

const pkg = JSON.parse(readFileSync(path.join(RAIZ, "package.json"), "utf-8")) as { version: string };
afirmar(pkg.version === "0.1.35", "package.json tiene la versión '0.1.35'");

const primeraNovedad = NOVEDADES[0];
afirmar(primeraNovedad.version === 100, "La primera novedad es de la versión 100");
afirmar(
  typeof primeraNovedad.detalle === "string" && primeraNovedad.detalle.length > 0 && primeraNovedad.detalle.length < 140,
  `El detalle de la novedad (<140 chars) tiene ${primeraNovedad.detalle?.length} caracteres`,
);
console.log("  ✓ SemVer 0.1.35 y Novedades v100 perfectamente sincronizados");

// 2. Licencia libre y plantilla de variables de entorno
afirmar(existsSync(path.join(RAIZ, "LICENSE")), "Existe archivo LICENSE");
afirmar(existsSync(path.join(RAIZ, ".env.example")), "Existe .env.example");
console.log("  ✓ Licencia y plantilla .env.example verificadas");

// 3. Enlace de Proyecto Vercel (opcional en despliegues externos)
const rutaProjectJson = path.join(RAIZ, ".vercel", "project.json");
if (existsSync(rutaProjectJson)) {
  const configVercel = JSON.parse(readFileSync(rutaProjectJson, "utf-8")) as { projectId?: string; orgId?: string };
  afirmar(typeof configVercel.projectId === "string" && configVercel.projectId.length > 0, "projectId válido en .vercel/project.json");
  afirmar(typeof configVercel.orgId === "string" && configVercel.orgId.length > 0, "orgId válido en .vercel/project.json");
  console.log("  ✓ Enlace de proyecto Vercel verificado (projectId y orgId presentes)");
}

// 4. Puerta de Seguridad y Middleware
const rutaProxy = path.join(RAIZ, "proxy.ts");
const contenidoProxy = readFileSync(rutaProxy, "utf-8");
afirmar(contenidoProxy.includes("hayClave"), "proxy.ts comprueba que la clave esté configurada con hayClave()");
afirmar(contenidoProxy.includes("valorSesion"), "proxy.ts usa valorSesion() para firmar la cookie");
afirmar(contenidoProxy.includes("/entrar"), "proxy.ts redirige a /entrar si no hay sesión");

const rutaSesion = path.join(RAIZ, "lib", "sesion.ts");
const contenidoSesion = readFileSync(rutaSesion, "utf-8");
afirmar(contenidoSesion.includes("CLAVE_APP"), "lib/sesion.ts lee la variable de entorno CLAVE_APP");
afirmar(contenidoSesion.includes("SHA-256"), "lib/sesion.ts calcula resumen SHA-256 para firmar sesión");
afirmar(contenidoSesion.includes("timingSafeEqual"), "lib/sesion.ts compara con timingSafeEqual contra ataques de tiempo");
console.log("  ✓ Puerta de seguridad y middleware SHA-256 validados");

// 5. Configuración de PWA y Service Worker
const rutaSw = path.join(RAIZ, "public", "sw.js");
const contenidoSw = readFileSync(rutaSw, "utf-8");
afirmar(contenidoSw.includes("const CACHE = \"mi-peso-v5\";"), "SW activo con CACHE mi-peso-v5");
afirmar(contenidoSw.includes("skipWaiting"), "SW activa inmediatamente con skipWaiting()");
afirmar(contenidoSw.includes("clients.claim()"), "SW toma control de clientes con claim()");
console.log("  ✓ Service Worker v5 listo para activación en producción");

console.log("\nTODAS LAS COMPROBACIONES DE FASE 11 (GRAN ENSAYO FINAL) HAN PASADO.\n");
