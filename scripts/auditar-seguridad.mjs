/**
 * auditar-seguridad.mjs
 *
 * Auditoría automática de seguridad, privacidad y calidad anti-slop
 * para la app de peso (My Fitness).
 *
 * Comprobaciones:
 * 1. Privacidad: Sin llamadas a Google Fonts CDN en runtime (previene sanciones GDPR).
 * 2. Seguridad: Sin fugas de SUPABASE_SERVICE_ROLE_KEY ni variables privadas en archivos cliente ("use client").
 * 3. Accesibilidad: Elementos <img> o <Image> deben tener atributo alt.
 * 4. Calidad Anti-Slop (Thermos): Alerta en componentes que superen 500 líneas para fomentar la modularidad.
 * 5. Seguridad: Sin variables privadas disfrazadas con prefijo NEXT_PUBLIC_ (evita leaks al cliente).
 * 6. Seguridad: Sin comodines CORS abiertos ('Access-Control-Allow-Origin': '*') en endpoints de API.
 * 7. Seguridad: Sin fugas de stack traces (error.stack) en respuestas de API hacia el exterior.
 * 8. Seguridad: Sin secretos o claves de API en claro (tokens hardcodeados tipo AIza..., sk-...).
 * 9. Higiene: Ficheros de variables de entorno (.env*) debidamente ignorados en .gitignore.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DIRECTORIOS_A_REVISAR = [
  path.join(ROOT, "app"),
  path.join(ROOT, "components"),
  path.join(ROOT, "lib"),
];

const SECRETOS_SENSIBLES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "service_role",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "CLAVE_APP",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "VAPID_PRIVATE_KEY",
  "ADMIN_CODIGO",
];

// Variables públicas que son legítimas en cliente
const NEXT_PUBLIC_PERMITIDAS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "NEXT_PUBLIC_APP_URL",
]);

let erroresCriticos = 0;
let advertencias = 0;

function listarArchivos(dir) {
  let resultados = [];
  if (!fs.existsSync(dir)) return resultados;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const rutaCompleta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "node_modules" && entrada.name !== ".next") {
        resultados = resultados.concat(listarArchivos(rutaCompleta));
      }
    } else if (/\.(tsx|ts|jsx|js|css|html)$/.test(entrada.name)) {
      resultados.push(rutaCompleta);
    }
  }
  return resultados;
}

console.log("==================================================");
console.log("🛡️  AUDITORÍA DE SEGURIDAD, PRIVACIDAD Y ANTI-SLOP");
console.log("==================================================\n");

// Comprobación de Higiene: .gitignore
const rutaGitignore = path.join(ROOT, ".gitignore");
if (fs.existsSync(rutaGitignore)) {
  const contenidoGitignore = fs.readFileSync(rutaGitignore, "utf-8");
  if (!contenidoGitignore.includes(".env")) {
    console.error("❌ [HIGIENE] .gitignore no contiene reglas para ignorar archivos .env");
    erroresCriticos++;
  } else {
    console.log("✓ Higiene: Regla .env presente en .gitignore");
  }
}

const todosLosArchivos = DIRECTORIOS_A_REVISAR.flatMap(listarArchivos);

for (const archivo of todosLosArchivos) {
  const rel = path.relative(ROOT, archivo);
  const contenido = fs.readFileSync(archivo, "utf-8");
  const lineas = contenido.split("\n");

  // 1. Privacidad: Fuentes externas
  if (
    contenido.includes("fonts.googleapis.com") ||
    contenido.includes("fonts.gstatic.com")
  ) {
    console.error(`❌ [PRIVACIDAD] Fuente externa de Google Fonts en: ${rel}`);
    erroresCriticos++;
  }

  // 2. Seguridad: Secretos en cliente
  const esCliente =
    contenido.includes('"use client"') || contenido.includes("'use client'");
  if (esCliente) {
    for (const secreto of SECRETOS_SENSIBLES) {
      if (contenido.includes(secreto)) {
        console.error(`❌ [SEGURIDAD] Clave secreta (${secreto}) referenciada en componente cliente: ${rel}`);
        erroresCriticos++;
      }
    }
  }

  // 3. Accesibilidad: <img> sin alt
  if (/\.tsx?$/.test(archivo)) {
    const tieneImgSinAlt = /<(?:img|Image)\b(?![^>]*\balt=)[^>]*>/i.test(contenido);
    if (tieneImgSinAlt) {
      console.warn(`⚠️  [ACCESIBILIDAD] Imagen sin atributo alt en: ${rel}`);
      advertencias++;
    }
  }

  // 4. Calidad Anti-Slop: Límite de líneas (regla 500 líneas)
  if (lineas.length > 500 && (archivo.includes("app") || archivo.includes("components"))) {
    console.warn(
      `⚠️  [MODULARIDAD/ANTI-SLOP] Archivo muy extenso (${lineas.length} líneas): ${rel} (considerar dividir)`
    );
    advertencias++;
  }

  // 5. Seguridad: Variables NEXT_PUBLIC_ sospechosas en cualquier archivo
  const coincidenciasPublic = contenido.match(/NEXT_PUBLIC_[A-Z0-9_]+/g);
  if (coincidenciasPublic) {
    for (const varPub of coincidenciasPublic) {
      if (!NEXT_PUBLIC_PERMITIDAS.has(varPub)) {
        if (/SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|TOKEN|KEY/.test(varPub)) {
          console.error(`❌ [SEGURIDAD] Variable NEXT_PUBLIC potencialmente sensible (${varPub}) en: ${rel}`);
          erroresCriticos++;
        }
      }
    }
  }

  // 6. Seguridad: Sin CORS comodín en endpoints de API
  const esApi = rel.startsWith("app" + path.sep + "api") || rel.startsWith("app/api");
  if (esApi) {
    if (
      contenido.includes("'Access-Control-Allow-Origin': '*'") ||
      contenido.includes('"Access-Control-Allow-Origin": "*"')
    ) {
      console.error(`❌ [SEGURIDAD] Endpoint con CORS abierto (wildcard '*') en: ${rel}`);
      erroresCriticos++;
    }
  }

  // 7. Seguridad: Sin fugas de stacktrace en endpoints de API
  if (esApi) {
    if (/stack:\s*(?:error|err|e)\.stack\b/.test(contenido)) {
      console.error(`❌ [SEGURIDAD] Respuesta de API exponiendo stacktrace en: ${rel}`);
      erroresCriticos++;
    }
  }

  // 8. Seguridad: Detección de API Keys hardcodeadas en claro
  if (!rel.includes(".test.") && !rel.includes(".prueba.")) {
    if (/\b(?:sk-[a-zA-Z0-9]{24,}|AIzaSy[0-9A-Za-z-_]{33}|-----BEGIN PRIVATE KEY-----)\b/.test(contenido)) {
      console.error(`❌ [SEGURIDAD] Posible token o clave privada hardcodeada en claro en: ${rel}`);
      erroresCriticos++;
    }
  }
}

console.log("\n--------------------------------------------------");
console.log(`Archivos auditados: ${todosLosArchivos.length}`);
console.log(`Errores críticos:   ${erroresCriticos}`);
console.log(`Advertencias:       ${advertencias}`);
console.log("--------------------------------------------------");

if (erroresCriticos > 0) {
  console.error("\n❌ Auditoría fallida. Corrige los errores críticos antes de publicar.");
  process.exit(1);
} else {
  console.log("\n✅ Auditoría superada con éxito. Cero fallos críticos de seguridad y privacidad.");
  process.exit(0);
}
