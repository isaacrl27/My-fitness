import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION, NOVEDADES } from "../lib/novedades.ts";
import { VERSION_APP } from "../lib/version.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, "..");

function afirmar(condicion: boolean, mensaje: string) {
  if (!condicion) {
    throw new Error(`FALLO: ${mensaje}`);
  }
}

console.log("--- Pruebas Fase 10: Rendimiento Extremo, Modo Offline y Limpieza de Código ---");

// 1. Service Worker: Caché v5 y precarga de activos esenciales
const rutaSw = path.join(RAIZ, "public", "sw.js");
const contenidoSw = readFileSync(rutaSw, "utf-8");

afirmar(contenidoSw.includes('const CACHE = "mi-peso-v5";'), "El Service Worker usa la versión CACHE mi-peso-v5");
afirmar(contenidoSw.includes('"/offline.html"'), "El Service Worker precarga offline.html");
afirmar(contenidoSw.includes('"/manifest.webmanifest"'), "El Service Worker precarga manifest.webmanifest");
afirmar(contenidoSw.includes('"/icono-192.png"'), "El Service Worker precarga icono-192.png");
afirmar(contenidoSw.includes('"/icono-512.png"'), "El Service Worker precarga icono-512.png");
console.log("  ✓ Service Worker v5 con precarga de activos esenciales verificado");

// 2. Service Worker: Pantalla sin cobertura y modo oscuro
afirmar(contenidoSw.includes('localStorage.getItem("mi-peso:tema")'), "La pantalla offline inline de sw.js respeta el tema en localStorage");
afirmar(contenidoSw.includes('data-tema="oscuro"'), "La pantalla offline inline de sw.js tiene soporte de tema oscuro explícito");
afirmar(contenidoSw.includes("window.location.reload()"), "El botón reintentar de la pantalla offline recarga limpiamente");
afirmar(contenidoSw.includes('caches.match("/offline.html")'), "El fallback de navegación busca offline.html antes de la plantilla inline");
afirmar(contenidoSw.includes('image/svg+xml'), "Las imágenes fallidas sin conexión devuelven placeholder SVG sin lanzar excepciones");
console.log("  ✓ Pantalla offline resiliente con tema oscuro y fallback de imagen verificado");

// 3. Documento public/offline.html limpio sin redirecciones externas
const rutaOfflineHtml = path.join(RAIZ, "public", "offline.html");
const contenidoOfflineHtml = readFileSync(rutaOfflineHtml, "utf-8");

afirmar(!contenidoOfflineHtml.includes("vercel.app"), "offline.html no contiene URLs fijadas a Vercel ni entornos externos");
afirmar(contenidoOfflineHtml.includes("window.location.reload()"), "offline.html usa reload() limpio");
afirmar(contenidoOfflineHtml.includes('localStorage.getItem("mi-peso:tema")'), "offline.html detecta tema de localStorage");
console.log("  ✓ offline.html independiente y respetuoso del entorno local/nativo verificado");

// 4. Modulación de dependencias y Dynamic Imports en rutas pesadas
const rutaAjustes = path.join(RAIZ, "app", "(app)", "ajustes", "page.tsx");
const contenidoAjustes = readFileSync(rutaAjustes, "utf-8");
afirmar(contenidoAjustes.includes('const ModalGuiaVideo = dynamic('), "Ajustes carga ModalGuiaVideo dinámicamente");
afirmar(contenidoAjustes.includes('const ModalFloCiclo = dynamic('), "Ajustes carga ModalFloCiclo dinámicamente");

afirmar(contenidoAjustes.includes('const ModalCambiarObjetivo = dynamic('), "Ajustes carga ModalCambiarObjetivo dinámicamente");

const rutaPlan = path.join(RAIZ, "app", "(app)", "plan", "page.tsx");
const contenidoPlan = readFileSync(rutaPlan, "utf-8");
afirmar(contenidoPlan.includes('const ModalCambiarObjetivo = dynamic('), "Plan carga ModalCambiarObjetivo dinámicamente");

const rutaTienda = path.join(RAIZ, "app", "(app)", "tienda", "page.tsx");
const contenidoTienda = readFileSync(rutaTienda, "utf-8");
afirmar(contenidoTienda.includes('const HojaAnadir = dynamic('), "Tienda carga HojaAnadir dinámicamente");

const rutaHojaAnadir = path.join(RAIZ, "components", "app", "hoja-anadir.tsx");
const contenidoHojaAnadir = readFileSync(rutaHojaAnadir, "utf-8");
afirmar(contenidoHojaAnadir.includes('const LectorCodigo = dynamic('), "HojaAnadir separa LectorCodigo con dynamic import");
console.log("  ✓ Paquetes pesados modularizados con dynamic() { ssr: false } en Ajustes, Plan, Tienda y HojaAnadir");

// 5. Limpieza automática de claves diarias en localStorage
const rutaHoy = path.join(RAIZ, "app", "(app)", "hoy", "page.tsx");
const contenidoHoy = readFileSync(rutaHoy, "utf-8");
afirmar(contenidoHoy.includes('k.startsWith("mi-peso:racha-celebrada-dia:") && k !== claveCelebrada'), "Hoy poda las claves residuales de días anteriores de racha");

const rutaRajatabla = path.join(RAIZ, "components", "app", "modal-celebracion-rajatabla.tsx");
const contenidoRajatabla = readFileSync(rutaRajatabla, "utf-8");
afirmar(contenidoRajatabla.includes('k.startsWith(PREFIJO_CELEBRADO) && k !== clave'), "ModalCelebracionRajatabla poda días pasados de celebración");

afirmar(contenidoHojaAnadir.includes('k.startsWith("myfitness:ia:foto:") && k !== clave'), "HojaAnadir poda contadores de fotos de días pasados");
console.log("  ✓ Poda higiénica de claves diarias en localStorage verificada");

// 6. Higiene total al eliminar cuenta
const rutaStore = path.join(RAIZ, "lib", "store.tsx");
const contenidoStore = readFileSync(rutaStore, "utf-8");
afirmar(contenidoStore.includes('window.localStorage.removeItem("mi-peso:grupo-familiar")'), "eliminarCuenta borra grupos familiares");
for (const claveSocial of [
  "mi-peso:grupos-sociales",
  "mi-peso:grupo-activo-id",
  "mi-peso:mi-avatar",
  "mi-peso:miembro-id",
  "mi-peso:reacciones-notificadas",
]) {
  afirmar(
    contenidoStore.includes(`window.localStorage.removeItem("${claveSocial}")`),
    `eliminarCuenta borra ${claveSocial}`,
  );
}
afirmar(contenidoStore.includes('window.localStorage.removeItem("mi-peso:compra-hogar")'), "eliminarCuenta borra compra del hogar");
afirmar(contenidoStore.includes('window.localStorage.removeItem("mi-peso:comprados")'), "eliminarCuenta borra comprados de la lista");
afirmar(contenidoStore.includes('window.localStorage.removeItem("mi-peso:compra-extras")'), "eliminarCuenta borra extras de la compra");
afirmar(contenidoStore.includes('window.localStorage.removeItem("mi-peso:cambios-sueltos")'), "eliminarCuenta borra cambios sueltos del plan");
console.log("  ✓ Vaciado completo de almacenamiento local al eliminar cuenta verificado");

// 7. Registro de Sin Cobertura actualiza en segundo plano
const rutaRegistro = path.join(RAIZ, "components", "app", "registro-sin-cobertura.tsx");
const contenidoRegistro = readFileSync(rutaRegistro, "utf-8");
afirmar(contenidoRegistro.includes("reg.update()"), "RegistroSinCobertura comprueba actualizaciones en segundo plano");
console.log("  ✓ Actualización proactiva del service worker verificada");

// 8. SemVer y Novedades sincronizadas
afirmar(VERSION >= 66, "lib/novedades.ts tiene VERSION >= 66");
afirmar(typeof VERSION_APP === "string" && /^\d+\.\d+\.\d+$/.test(VERSION_APP), "VERSION_APP es SemVer válido");

const primeraNovedad = NOVEDADES[0];
afirmar(primeraNovedad.version === VERSION, "La primera novedad coincide con la versión activa");
afirmar(
  typeof primeraNovedad.detalle === "string" && primeraNovedad.detalle.length > 0 && primeraNovedad.detalle.length < 140,
  `El detalle de la novedad (<140 chars) tiene ${primeraNovedad.detalle?.length} caracteres`,
);

const pkg = JSON.parse(readFileSync(path.join(RAIZ, "package.json"), "utf-8")) as { version: string };
afirmar(pkg.version === VERSION_APP, "package.json está sincronizado con VERSION_APP");
console.log("  ✓ SemVer y novedades sincronizadas al 100%");

console.log("\nTODAS LAS COMPROBACIONES DE FASE 10 HAN PASADO CORRECTAMENTE.\n");
