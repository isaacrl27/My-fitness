"use client";

import { useEffect, useState } from "react";

/**
 * Si la persona ha pedido a su móvil que no haya movimiento.
 *
 * El CSS ya apaga animaciones y transiciones con `prefers-reduced-motion`,
 * pero lo que se mueve desde JavaScript (el conteo del anillo, por ejemplo)
 * no lo ve el CSS. Este gancho lo consulta para saltar directo al valor final.
 *
 * Empieza en `false` para que el primer pintado coincida con el del servidor;
 * el valor de verdad se lee al montar, que es cuando existe `window`.
 */
export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setReducido(consulta.matches);
    leer();
    consulta.addEventListener("change", leer);
    return () => consulta.removeEventListener("change", leer);
  }, []);

  return reducido;
}
