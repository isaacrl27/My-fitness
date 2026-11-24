import type { MetadataRoute } from "next";

/**
 * El fichero que hace que el iPhone (y Android) puedan instalarla en la
 * pantalla de inicio como una app: con su nombre, su icono y a pantalla
 * completa, sin la barra del navegador.
 *
 * Los iconos llevan `?v=3` para romper la caché de los móviles que ya tenían
 * el logo viejo. Todos son a sangre: Android recorta con la forma que quiera y,
 * si el fondo no llega a los bordes, sale un cuadrado blanco alrededor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "My Fitness",
    short_name: "My Fitness",
    description: "Tu app personal para bajar de peso",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0e5f49",
    icons: [
      { src: "/icono-192.png?v=3", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png?v=3", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icono-maskable.png?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icono-192.png?v=3", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  };
}
