/**
 * Pruebas de Fase 5: Pila LIFO real de modales, trampa de foco, modo oscuro,
 * escala tipográfica y ausencia de tokens CSS fantasma.
 *
 * Se ejecuta con: `node pruebas/diseno.prueba.mts`
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  apilarModal,
  cantidadModalesAbiertos,
  cerrarModalSuperior,
  reiniciarPilaModalesParaTests,
} from "../lib/pila-modales.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_APP = path.resolve(__dirname, "..");

let fallos = 0;
let hechas = 0;

function afirmar(condicion: boolean, que: string) {
  hechas += 1;
  if (!condicion) {
    fallos += 1;
    console.error(`FALLO: ${que}`);
  }
}

/* ========================================================================== */
/* 1. PILA LIFO REAL DE MODALES (`lib/pila-modales.ts`)                       */
/* ========================================================================== */

type HandlerTeclado = (e: {
  key: string;
  shiftKey?: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}) => void;

const oyentesKeydown = new Set<HandlerTeclado>();
let elementoActivo: unknown = null;
let dialogosAbiertos: Array<{
  contains: (el: unknown) => boolean;
  querySelectorAll: () => Array<{ offsetParent: object | null; focus: () => void }>;
}> = [];

const fakeBody = {
  style: {
    overflow: "auto",
    paddingRight: "0px",
  },
};

const fakeWindow = {
  innerWidth: 405,
  addEventListener: (ev: string, fn: HandlerTeclado) => {
    if (ev === "keydown") oyentesKeydown.add(fn);
  },
  removeEventListener: (ev: string, fn: HandlerTeclado) => {
    if (ev === "keydown") oyentesKeydown.delete(fn);
  },
};

const fakeDocument = {
  body: fakeBody,
  documentElement: { clientWidth: 390 },
  get activeElement() {
    return elementoActivo;
  },
  querySelectorAll: (sel: string) => (sel === '[aria-modal="true"]' ? dialogosAbiertos : []),
};

Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true, writable: true });
Object.defineProperty(globalThis, "document", { value: fakeDocument, configurable: true, writable: true });

function pulsarTecla(key: string, shiftKey = false): boolean {
  let prevenido = false;
  const ev = {
    key,
    shiftKey,
    preventDefault: () => {
      prevenido = true;
    },
    stopPropagation: () => {},
  };
  oyentesKeydown.forEach((fn) => fn(ev));
  return prevenido;
}

reiniciarPilaModalesParaTests();

// 1.1 Bloqueo de scroll con compensación de scrollbar y restauración exacta
let cierresA = 0;
let cierresB = 0;
const modalA = apilarModal({
  onCerrar: () => {
    cierresA += 1;
  },
  bloquearScroll: true,
});

afirmar(cantidadModalesAbiertos() === 1, "un modal abierto en la pila");
afirmar(fakeBody.style.overflow === "hidden", "primer modal bloquea overflow del body");
afirmar(fakeBody.style.paddingRight === "15px", "compensa exactamente el ancho del scrollbar (405 - 390)");
afirmar(oyentesKeydown.size === 1, "instala un único oyente global de teclado");

// 1.2 Apilado LIFO: Confirmar (B) encima de ModalFloCiclo (A)
const modalB = apilarModal({
  onCerrar: () => {
    cierresB += 1;
  },
  bloquearScroll: true,
});

afirmar(cantidadModalesAbiertos() === 2, "dos modales apilados");
afirmar(oyentesKeydown.size === 1, "mantiene un solo oyente global aunque haya varios modales");

// Pulsar Escape SOLO debe cerrar el modal superior (B), nunca el inferior (A)
const escPrevenido = pulsarTecla("Escape");
afirmar(escPrevenido === true, "Escape previene acción por defecto cuando cierra el tope");
afirmar(cierresB === 1 && cierresA === 0, "Escape cierra exclusivamente el modal superior (LIFO)");

// Botón atrás de Android (`cerrarModalSuperior`) también cierra solo el superior
afirmar(cerrarModalSuperior() === true, "cerrarModalSuperior devuelve true con tope cerrable");
afirmar(cierresB === 2 && cierresA === 0, "botón atrás cierra exclusivamente el modal superior");

// 1.3 Cierre FUERA DE ORDEN: A se desmonta antes que B -> overflow debe seguir hidden hasta que B cierre
modalA.desapilar();
afirmar(cantidadModalesAbiertos() === 1, "queda B tras cerrar A fuera de orden");
afirmar(
  fakeBody.style.overflow === "hidden",
  "cerrar el modal inferior fuera de orden NO desbloquea el scroll mientras el superior sigue abierto",
);

// Idempotencia: desapilar A dos veces no altera el contador de B
modalA.desapilar();
afirmar(
  fakeBody.style.overflow === "hidden",
  "desapilar dos veces la misma instancia es idempotente y no rompe el contador",
);

// Ahora cierra B: el contador llega a 0 y restaura los estilos originales del body
modalB.desapilar();
afirmar(cantidadModalesAbiertos() === 0, "pila vacía al cerrar el último modal");
afirmar(fakeBody.style.overflow === "auto", "restaura overflow original ('auto') al vaciar la pila");
afirmar(fakeBody.style.paddingRight === "0px", "restaura paddingRight original ('0px') al vaciar la pila");
afirmar(oyentesKeydown.size === 0, "desinstala el oyente global de teclado cuando no quedan modales");

// 1.4 Si el modal superior es obligatorio (sin `onCerrar`, ej. BannerPrivacidad), Escape NO cierra el de abajo
let cierresFondo = 0;
const fondo = apilarModal({
  onCerrar: () => {
    cierresFondo += 1;
  },
});
const obligatorio = apilarModal({ onCerrar: undefined });
pulsarTecla("Escape");
afirmar(cierresFondo === 0, "un modal obligatorio encima impide que Escape cierre modales inferiores");
afirmar(cerrarModalSuperior() === false, "cerrarModalSuperior devuelve false si el tope es obligatorio");
obligatorio.desapilar();
fondo.desapilar();

// 1.5 Trampa universal de foco Tab / Shift+Tab en el diálogo `[aria-modal="true"]` superior
const btnPrimero = {
  offsetParent: {},
  focus() {
    elementoActivo = btnPrimero;
  },
};
const btnUltimo = {
  offsetParent: {},
  focus() {
    elementoActivo = btnUltimo;
  },
};
const dialogoTope = {
  contains: (el: unknown) => el === btnPrimero || el === btnUltimo,
  querySelectorAll: () => [btnPrimero, btnUltimo],
};
dialogosAbiertos = [dialogoTope];

const modalFoco = apilarModal({ onCerrar: () => {} });
elementoActivo = btnUltimo;
afirmar(pulsarTecla("Tab", false) === true, "Tab en el último botón atrapa el foco");
afirmar(elementoActivo === btnPrimero, "Tab desde el último botón salta al primero");

afirmar(pulsarTecla("Tab", true) === true, "Shift+Tab en el primer botón atrapa el foco");
afirmar(elementoActivo === btnUltimo, "Shift+Tab desde el primer botón salta al último");

// Si el foco se escapó fuera del modal, Tab lo mete al primer botón
elementoActivo = null;
afirmar(pulsarTecla("Tab", false) === true, "Tab con foco fuera del modal lo reconduce dentro");
afirmar(elementoActivo === btnPrimero, "foco externo entra al primer control del modal");

modalFoco.desapilar();
dialogosAbiertos = [];

/* ========================================================================== */
/* 2. INVARIANTES DE SISTEMA DE DISEÑO, MODO OSCURO Y TIPOGRAFÍA              */
/* ========================================================================== */

const globalsCss = fs.readFileSync(path.join(RAIZ_APP, "app", "globals.css"), "utf8");
const themeCss = fs.readFileSync(path.join(RAIZ_APP, "app", "theme.css"), "utf8");
const designPage = fs.readFileSync(path.join(RAIZ_APP, "app", "design", "page.tsx"), "utf8");
const offlineHtml = fs.readFileSync(path.join(RAIZ_APP, "public", "offline.html"), "utf8");

afirmar(
  globalsCss.includes('@custom-variant dark (&:where([data-tema="oscuro"], [data-tema="oscuro"] *));'),
  "globals.css sincroniza la variante dark: de Tailwind v4 con data-tema='oscuro'",
);

for (const token of ["--text-3xs:", "--text-2xs:", "--text-2xl:", "--text-3xl:", "--text-4xl:"]) {
  const apariciones = globalsCss.split(token).length - 1;
  afirmar(
    apariciones >= 4,
    `globals.css escala ${token} en @theme y en pequeno/grande/gigante (encontradas ${apariciones})`,
  );
}

afirmar(
  globalsCss.includes("--color-surface-raised:") &&
    globalsCss.includes('html[data-tema="oscuro"]') &&
    globalsCss.includes("--color-surface-raised: #212c26"),
  "globals.css define --color-surface-raised tanto en claro (@theme) como en oscuro",
);

for (const claseAnim of [".animate-in", ".animate-fade-in", ".animate-scale-in"]) {
  afirmar(
    globalsCss.includes(claseAnim),
    `globals.css implementa la animación de apertura ${claseAnim}`,
  );
}

// Todos los roles de COLORES mostrados en /design existen de verdad en app/theme.css
const bloqueColores = designPage.match(/const COLORES = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
const rolesDesign = Array.from(bloqueColores.matchAll(/\["([a-z-]+)",\s*"[^"]+"\]/g)).map(
  (m) => m[1],
);
afirmar(rolesDesign.length === 13, "la página /design lista exactamente los 13 roles de color del sistema");
for (const rol of rolesDesign) {
  afirmar(
    themeCss.includes(`--color-${rol}:`),
    `el rol '${rol}' de /design existe como --color-${rol} en app/theme.css`,
  );
}

// offline.html soporta safe-area y modo oscuro sin red
afirmar(offlineHtml.includes("viewport-fit=cover"), "offline.html usa viewport-fit=cover válido");
afirmar(offlineHtml.includes('[data-tema="oscuro"]'), "offline.html respeta el modo oscuro guardado");

// Escaneo estático de cero clases fantasma y cero velos blancos bg-ink/40..90 en modales
function listarArchivos(dir: string): string[] {
  const res: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      res.push(...listarArchivos(ruta));
    } else if (ruta.endsWith(".ts") || ruta.endsWith(".tsx")) {
      res.push(ruta);
    }
  }
  return res;
}

const archivosCodigo = [
  ...listarArchivos(path.join(RAIZ_APP, "app")),
  ...listarArchivos(path.join(RAIZ_APP, "components")),
];

const clasesProhibidas = [
  "border-strong",
  "surface-elevated",
  "surface-alt",
  "no-scrollbar",
  "py-0.2",
  "bg-ink/40",
  "bg-ink/50",
  "bg-ink/75",
  "bg-ink/90",
];

let hallazgosProhibidos = 0;
for (const archivo of archivosCodigo) {
  const contenido = fs.readFileSync(archivo, "utf8");
  for (const patron of clasesProhibidas) {
    if (contenido.includes(patron)) {
      hallazgosProhibidos += 1;
      console.error(`Clase fantasma o velo invertido '${patron}' en ${path.relative(RAIZ_APP, archivo)}`);
    }
  }
}
afirmar(hallazgosProhibidos === 0, "cero clases CSS fantasma ni velos blancos de modal en todo el código");

const familiaPage = fs.readFileSync(path.join(RAIZ_APP, "app", "(app)", "familia", "page.tsx"), "utf8");
afirmar(
  familiaPage.includes("useBloqueoModal("),
  "app/(app)/familia/page.tsx conecta su diálogo de emoticono a useBloqueoModal (Push Back + Escape + foco)",
);

console.log(
  fallos === 0
    ? `ok     ${hechas} comprobaciones de diseño, pila modal, modo oscuro y tipografía`
    : `\n${fallos} fallos de ${hechas}.`,
);
process.exit(fallos === 0 ? 0 : 1);
