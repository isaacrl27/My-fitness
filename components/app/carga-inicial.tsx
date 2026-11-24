"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { aplicarTema, leerTema } from "@/lib/tema";
import { aplicarTamano, leerTamano } from "@/lib/tamano";
import { reiniciarEntrada } from "@/lib/entrada";
import { PantallaCarga } from "./pantalla-carga";

/**
 * La pantalla de carga, al entrar en la app y al reabrirla desde el móvil.
 *
 * Vive en el armazón raíz. Comportamiento (Opción A):
 * - Salta siempre en la primera apertura / recarga de la app.
 * - Salta siempre cuando el usuario vuelve a la app tras haberla dejado en segundo
 *   plano (bloquear móvil, ir al menú de inicio o cambiar a otra app como WhatsApp).
 * - NO interrumpe la navegación fluida entre pestañas internas (Hoy, Progreso, Plan...).
 */
const SIN_CARGA = ["/entrar", "/instalar", "/privacidad", "/mantenimiento", "/design"];

export function CargaInicial() {
  const ruta = usePathname() ?? "/";
  const [aperturaId, setAperturaId] = useState(0);

  // Sincronización de tema y tamaño
  useEffect(() => {
    aplicarTema(leerTema());
    aplicarTamano(leerTamano());
    const medio = window.matchMedia("(prefers-color-scheme: dark)");
    const revisar = () => aplicarTema(leerTema());
    medio.addEventListener("change", revisar);
    return () => medio.removeEventListener("change", revisar);
  }, []);

  // Detectar reanudación desde segundo plano (bloqueo de pantalla o cambio de app en móvil)
  useEffect(() => {
    let ocultoEn = 0;

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") {
        ocultoEn = Date.now();
      } else if (document.visibilityState === "visible") {
        const tiempoFuera = ocultoEn > 0 ? Date.now() - ocultoEn : 0;
        // Si estuvo en segundo plano más de 600ms, reiniciamos la animación al volver
        if (tiempoFuera > 600) {
          reiniciarEntrada();
          setAperturaId((prev) => prev + 1);
        }
        ocultoEn = 0;
      }
    };

    const alRestaurarPagina = (e: PageTransitionEvent) => {
      if (e.persisted) {
        reiniciarEntrada();
        setAperturaId((prev) => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("pageshow", alRestaurarPagina);

    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("pageshow", alRestaurarPagina);
    };
  }, []);

  if (SIN_CARGA.some((p) => ruta === p || ruta.startsWith(`${p}/`))) return null;
  return <PantallaCarga key={aperturaId} />;
}
