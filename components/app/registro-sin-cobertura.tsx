"use client";

import { useEffect } from "react";

/**
 * Pide al navegador que guarde la app para que abra aunque no haya cobertura.
 *
 * Si el navegador no lo admite (o el usuario lo tiene desactivado) la app
 * funciona igual, solo que necesita señal: no es un fallo que valga la pena
 * enseñarle a nadie.
 */
export function RegistroSinCobertura() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Comprueba si hay una versión nueva del service worker en segundo plano.
        void reg.update().catch(() => {});
      })
      .catch(() => {});
  }, []);

  return null;
}
