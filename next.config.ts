import type { NextConfig } from "next";

const esProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Mientras se prueba desde el móvil contra este PC, Next necesita saber que
  // las peticiones vienen de la wifi de casa y de Tailscale (si no, bloquea los
  // recursos internos del modo desarrollo y la app se ve a medias).
  allowedDevOrigins: ["192.168.1.11", "100.81.108.117"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              // Next necesita `unsafe-eval` para recargar en caliente, pero en
              // producción solo abre la puerta a ejecutar cadenas como código.
              (!esProd ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.openfoodfacts.org https://*.openfoodfacts.org https://i.ytimg.com; font-src 'self' data:; frame-src 'self' https://www.youtube-nocookie.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openfoodfacts.org https://world.openfoodfacts.org https://search.openfoodfacts.org; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';" +
              (esProd ? " upgrade-insecure-requests;" : ""),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
