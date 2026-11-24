import type { MetadataRoute } from "next";

/**
 * Le decimos a los buscadores que no entren ni guarden nada de aquí.
 * No es una barrera (eso lo hace el middleware), pero evita que la app
 * aparezca en Google.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
