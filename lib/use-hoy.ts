"use client";

import { useEffect, useState } from "react";
import { hoyISO } from "./calculos";

/**
 * La fecha de hoy, pero solo cuando la app ya está en el móvil.
 *
 * Si se leyera el reloj mientras Next prepara la página, la fecha quedaría
 * congelada en el momento del montaje. Aquí se calcula al abrir, y se refresca
 * sola cada minuto; además, al volver a la app (desbloquear el móvil, cambiar
 * de pestaña o darle a la ventana), se vuelve a preguntar la fecha. Sin eso,
 * dejar la app abierta de un día para otro hacía que siguiera creyendo que era
 * ayer.
 */
export function useHoy(): string | null {
  const [hoy, setHoy] = useState<string | null>(null);

  useEffect(() => {
    const actualizar = () => setHoy(hoyISO());
    actualizar();
    const alVolver = () => {
      if (document.visibilityState === "visible") actualizar();
    };
    const t = window.setInterval(actualizar, 60_000);
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", actualizar);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", actualizar);
    };
  }, []);

  return hoy;
}
