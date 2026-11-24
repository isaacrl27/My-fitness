"use client";

import { useEffect } from "react";

/**
 * Vuelve a cargar la pantalla cada minuto, pero solo si se está mirando.
 *
 * Sirve para el cartel de mantenimiento: cuando Isaac termina y lo apaga, la
 * familia vuelve a entrar sola sin tener que cerrar y abrir la app.
 */
export function RecargarSola({ cadaMs = 60_000 }: { cadaMs?: number }) {
  useEffect(() => {
    const reloj = window.setInterval(() => {
      if (document.visibilityState === "visible") window.location.reload();
    }, cadaMs);
    return () => window.clearInterval(reloj);
  }, [cadaMs]);

  return null;
}
