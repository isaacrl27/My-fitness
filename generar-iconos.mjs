/**
 * Genera los iconos de la app a partir del dibujo elegido (aro + M).
 *
 * - Los de `public/` son los que pide el manifest y las notificaciones.
 * - El de `app/` es el de la pantalla de inicio del iPhone.
 * - El `.ico` es el de la pestaña del navegador.
 *
 * Todos van a sangre (sin esquinas transparentes) porque Android recorta el
 * icono con la forma que quiera el móvil: si el fondo no llega a los bordes,
 * sale un cuadrado blanco alrededor del logo. El dibujo va al 82 % para que
 * ningún recorte se lo coma.
 *
 * Se hace todo con `sharp`, que ya viene con Next. Nada de depender de
 * programas externos.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// La carpeta del propio proyecto, para que funcione en cualquier PC.
const CARPETA = fileURLToPath(new URL(".", import.meta.url));

// Para la pantalla de inicio y los iconos «maskable»: cuadrado entero, sin
// esquinas transparentes, y el dibujo un poco más pequeño para que ningún
// recorte del móvil se lo coma.
const cuadrado = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="verde" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#0e5f49" />
      <stop offset="1" stop-color="#2fae7f" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#verde)" />
  <g transform="translate(256 256) scale(0.82) translate(-256 -256)">
    <circle cx="256" cy="256" r="158" fill="none" stroke="#ffffff" stroke-width="46"
      stroke-linecap="round" stroke-dasharray="770 222" transform="rotate(-45 256 256)" />
    <path d="M186 306 V220 L256 288 L326 220 V306" fill="none" stroke="#ffffff"
      stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;

async function png(svg, lado) {
  return sharp(Buffer.from(svg)).resize(lado, lado).png().toBuffer();
}

writeFileSync(join(CARPETA, "public", "icono-192.png"), await png(cuadrado, 192));
writeFileSync(join(CARPETA, "public", "icono-512.png"), await png(cuadrado, 512));
writeFileSync(join(CARPETA, "public", "icono-maskable.png"), await png(cuadrado, 512));
writeFileSync(join(CARPETA, "app", "apple-icon.png"), await png(cuadrado, 180));

/* Un .ico con varios tamaños dentro. Cada tamaño va como PNG, que es lo que
   entienden todos los navegadores de hoy. */
const tamanos = [16, 32, 48];
const imagenes = [];
for (const t of tamanos) imagenes.push({ lado: t, datos: await png(cuadrado, t) });

const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(imagenes.length, 4);

const directorio = Buffer.alloc(16 * imagenes.length);
let desplazamiento = 6 + directorio.length;
imagenes.forEach((img, i) => {
  const base = i * 16;
  directorio.writeUInt8(img.lado >= 256 ? 0 : img.lado, base);
  directorio.writeUInt8(img.lado >= 256 ? 0 : img.lado, base + 1);
  directorio.writeUInt8(0, base + 2);
  directorio.writeUInt8(0, base + 3);
  directorio.writeUInt16LE(1, base + 4);
  directorio.writeUInt16LE(32, base + 6);
  directorio.writeUInt32LE(img.datos.length, base + 8);
  directorio.writeUInt32LE(desplazamiento, base + 12);
  desplazamiento += img.datos.length;
});

writeFileSync(
  join(CARPETA, "app", "favicon.ico"),
  Buffer.concat([cabecera, directorio, ...imagenes.map((i) => i.datos)]),
);

console.log("iconos generados: 192, 512, maskable, apple 180 y favicon.ico (16/32/48)");

