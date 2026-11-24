/**
 * Cliente compartido para consultas a la IA de comida (`/api/ia/foto` y
 * `/api/ia/texto`), preparación de imágenes en alta nitidez (1280 px + soporte
 * HEIC de iPhone) y conversión de `AlimentoIA` a `AlimentoBase` sin pisar los
 * ajustes de la descripción del usuario.
 */

import { ALIMENTOS, normalizar, type AlimentoBase } from "./alimentos.ts";
import type { AlimentoIA, ModoFotoIA } from "./ia-alimentos.ts";

export type { AlimentoIA, ModoFotoIA };

const ESPERA_IA_MS = 40_000;
const TOPE_BASE64_PLATO = 420_000; // ~315 KB JPEG máximo (~150 KB típicos en plato)
const TOPE_BASE64_ETIQUETA = 650_000; // ~485 KB JPEG máximo para tablas con letra pequeña
const TOPE_ARCHIVO_CRUDO_BYTES = 12_000_000; // 12 MB máximo para fotos de iPhone/Android
const TOPE_BASE64_CRUDO = 4_000_000; // 4 MB máximo en base64 (por debajo de los 4.5 MB de Vercel)

export type RespuestaClienteIA =
  | { ok: true; alimentos: AlimentoIA[]; restantes: number | null }
  | { ok: false; estado: number; tope: boolean; motivo?: string };

/**
 * Normaliza y deduce el tipo MIME real de una foto de comida, protegiendo
 * contra iOS Safari que devuelve `archivo.type = ""` o "application/octet-stream".
 */
export function normalizarMimeArchivo(archivo: File): string {
  const tipo = (archivo.type || "").trim().toLowerCase();
  if (tipo && tipo !== "application/octet-stream") {
    if (tipo === "image/jpg") return "image/jpeg";
    if (tipo === "image/heif") return "image/heic";
    return tipo;
  }
  const nombre = (archivo.name || "").toLowerCase();
  if (nombre.endsWith(".png")) return "image/png";
  if (nombre.endsWith(".webp")) return "image/webp";
  if (nombre.endsWith(".heic") || nombre.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

/**
 * Convierte un resultado de la IA en `AlimentoBase` conservando SIEMPRE los
 * valores nutricionales calculados para la descripción del usuario («sin aceite»,
 * «desnatada», «en crudo», «media ración»), usando el catálogo solo para saber
 * si es bebida (`ml`).
 */
export function alimentoBaseDeIA(
  a: AlimentoIA,
  opciones?: { categoriaPorDefecto?: string },
): AlimentoBase {
  const g = Number.isFinite(a.gramos) && a.gramos > 0 ? Math.round(a.gramos) : 100;
  const enCatalogo = ALIMENTOS.find((x) => normalizar(x.nombre) === normalizar(a.nombre));
  const esBebida = a.esBebida === true || enCatalogo?.categoria === "Bebidas";
  const unidad = esBebida ? "ml" : "g";

  return {
    nombre: a.nombre.trim(),
    porcion: `${g} ${unidad}`,
    gramos: g,
    kcal100: Math.round(((a.kcal * 100) / g) * 10) / 10,
    p100: Math.round(((a.proteinas * 100) / g) * 10) / 10,
    c100: Math.round(((a.carbohidratos * 100) / g) * 10) / 10,
    g100: Math.round(((a.grasas * 100) / g) * 10) / 10,
    categoria: esBebida ? "Bebidas" : (opciones?.categoriaPorDefecto ?? "Otros"),
  };
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result !== "string") {
        rechazar(new Error("No he podido leer esa foto."));
        return;
      }
      const sinPrefijo = lector.result.replace(/^data:[^,]*,/, "").trim();
      if (!sinPrefijo) {
        rechazar(new Error("No he podido leer esa foto."));
        return;
      }
      resolver(sinPrefijo);
    };
    lector.onerror = () => rechazar(new Error("No he podido leer esa foto."));
    lector.readAsDataURL(blob);
  });
}

async function leerArchivoComoBase64(
  archivo: File,
  mime: string,
): Promise<{ imagen: string; mime: string }> {
  if (archivo.size > TOPE_ARCHIVO_CRUDO_BYTES) {
    throw new Error("La foto pesa demasiado. Prueba con otra o haciendo captura.");
  }
  const sinPrefijo = await blobABase64(archivo);
  if (sinPrefijo.length > TOPE_BASE64_CRUDO) {
    throw new Error("La foto pesa demasiado para enviarla. Prueba haciendo captura o con otra foto.");
  }
  return { imagen: sinPrefijo, mime };
}

async function lienzoABase64Jpeg(lienzo: HTMLCanvasElement, calidad: number): Promise<string> {
  if (typeof lienzo.toBlob === "function") {
    const blob = await new Promise<Blob | null>((resolver) => {
      try {
        lienzo.toBlob((resultado) => resolver(resultado), "image/jpeg", calidad);
      } catch {
        resolver(null);
      }
    });
    if (blob) {
      return blobABase64(blob);
    }
  }
  return lienzo.toDataURL("image/jpeg", calidad).replace(/^data:image\/jpeg;base64,/, "");
}

async function pintarEnLienzo(
  origen: HTMLImageElement | ImageBitmap,
  ancho: number,
  alto: number,
  ladoMax: number,
  calidad: number,
): Promise<string> {
  const lado = Math.max(ancho, alto);
  const escala = lado > ladoMax ? ladoMax / lado : 1;
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.max(1, Math.round(ancho * escala));
  lienzo.height = Math.max(1, Math.round(alto * escala));
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No hay lienzo para pintar la foto.");
  ctx.drawImage(origen, 0, 0, lienzo.width, lienzo.height);
  return lienzoABase64Jpeg(lienzo, calidad);
}

async function comprimirLienzoProgresivo(
  origen: HTMLImageElement | ImageBitmap,
  ancho: number,
  alto: number,
  modo: ModoFotoIA,
): Promise<string> {
  const tope = modo === "etiqueta" ? TOPE_BASE64_ETIQUETA : TOPE_BASE64_PLATO;
  const escalones: Array<[number, number]> =
    modo === "etiqueta"
      ? [
          [1280, 0.84],
          [1024, 0.76],
          [800, 0.66],
          [640, 0.55],
        ]
      : [
          [1024, 0.8],
          [880, 0.72],
          [720, 0.62],
          [560, 0.52],
        ];

  for (let i = 0; i < escalones.length; i += 1) {
    const [ladoMax, calidad] = escalones[i];
    const base64 = await pintarEnLienzo(origen, ancho, alto, ladoMax, calidad);
    if (base64.length <= tope || i === escalones.length - 1) return base64;
  }
  return "";
}

/**
 * Decodifica el bitmap intentando aprovechar el escalado nativo del navegador
 * cuando la foto pesa mucho (>400 KB), evitando cargar 48 MP enteros en RAM.
 */
async function decodificarBitmapRapido(archivo: File, ladoObjetivo: number): Promise<ImageBitmap> {
  if (archivo.size > 400_000) {
    try {
      return await createImageBitmap(archivo, {
        resizeWidth: ladoObjetivo,
        imageOrientation: "from-image",
      });
    } catch {
      // Safari antiguo o MIME exótico sin soporte de opciones de redimensionado.
    }
  }
  return createImageBitmap(archivo);
}

/**
 * Prepara la foto para la IA de comida con máxima velocidad y compatibilidad iPhone/Android:
 * 1. Intenta decodificar con `createImageBitmap` escalando en hardware fotos grandes (~1024 px plato).
 * 2. Si falla, intenta con `new Image()` y un Blob con tipo MIME explícito (soporte universal web).
 * 3. En ambos casos comprime asíncronamente en JPEG ligero (~140-200 KB en platos).
 * 4. Si el navegador no puede decodificarla en lienzo (ej. HEIC en un entorno sin soporte web),
 *    lee el archivo crudo en base64 y lo envía con su tipo MIME nativo a Gemini.
 */
export async function prepararImagenIA(
  archivo: File,
  opciones?: { modo?: ModoFotoIA },
): Promise<{ imagen: string; mime: string }> {
  const mime = normalizarMimeArchivo(archivo);
  const modo: ModoFotoIA = opciones?.modo === "etiqueta" ? "etiqueta" : "plato";
  const ladoObjetivo = modo === "etiqueta" ? 1280 : 1024;

  // Vía 1: createImageBitmap (si está disponible y soporta el formato)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await decodificarBitmapRapido(archivo, ladoObjetivo);
      try {
        const base64 = await comprimirLienzoProgresivo(bitmap, bitmap.width, bitmap.height, modo);
        return { imagen: base64, mime: "image/jpeg" };
      } finally {
        bitmap.close();
      }
    } catch {
      // Si falla en HEIC o en el motor de renderizado, pasar a Vía 2
    }
  }

  // Vía 2: new Image() con Blob tipado explícitamente
  try {
    const blobConTipo = archivo.type ? archivo : new Blob([archivo], { type: mime });
    const url = URL.createObjectURL(blobConTipo);
    try {
      const base64 = await new Promise<string>((resolver, rechazar) => {
        const img = new Image();
        img.onload = () => {
          void comprimirLienzoProgresivo(img, img.naturalWidth, img.naturalHeight, modo).then(
            resolver,
            rechazar,
          );
        };
        img.onerror = () => rechazar(new Error("No se pudo cargar la imagen"));
        img.src = url;
      });
      return { imagen: base64, mime: "image/jpeg" };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    // Vía 3: Lectura directa como base64 con su MIME original (Gemini soporta HEIC/HEIF/PNG/JPEG nativo)
    return leerArchivoComoBase64(archivo, mime);
  }
}

async function enviarRutaIA(
  ruta: "/api/ia/foto" | "/api/ia/texto",
  cuerpo: Record<string, unknown>,
): Promise<RespuestaClienteIA> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_IA_MS);
  try {
    const r = await fetch(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
    });
    let json: {
      ok?: unknown;
      alimentos?: unknown;
      restantes?: unknown;
      topeAlcanzado?: unknown;
      motivo?: unknown;
    };
    try {
      json = (await r.json()) as typeof json;
    } catch {
      json = {};
    }
    if (r.redirected || r.status === 401) {
      return {
        ok: false,
        estado: 401,
        tope: false,
        motivo: "Tu sesión ha caducado. Recarga la página y vuelve a poner la clave.",
      };
    }
    if (r.ok && json.ok === true) {
      const restantes =
        typeof json.restantes === "number" && Number.isFinite(json.restantes)
          ? json.restantes
          : null;
      const alimentos = Array.isArray(json.alimentos) ? (json.alimentos as AlimentoIA[]) : [];
      return { ok: true, alimentos, restantes };
    }
    return {
      ok: false,
      estado: r.status,
      tope: json.topeAlcanzado === true,
      motivo:
        typeof json.motivo === "string" && json.motivo.trim() !== "" ? json.motivo : undefined,
    };
  } catch {
    return {
      ok: false,
      estado: 0,
      tope: false,
      motivo: "La IA ha tardado demasiado o no hay conexión: inténtalo otra vez.",
    };
  } finally {
    clearTimeout(reloj);
  }
}

export function pedirFotoIA(cuerpo: {
  imagen: string;
  mime: string;
  codigo?: string;
  comentario?: string;
  modo?: ModoFotoIA;
}): Promise<RespuestaClienteIA> {
  return enviarRutaIA("/api/ia/foto", cuerpo);
}

export function pedirTextoIA(cuerpo: {
  texto: string;
  codigo?: string;
}): Promise<RespuestaClienteIA> {
  return enviarRutaIA("/api/ia/texto", cuerpo);
}
