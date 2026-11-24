"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDatos } from "@/lib/store";

/**
 * Si no hay datos guardados en este móvil, devuelve a la pantalla de
 * bienvenida. No pinta nada: solo vigila.
 */
export function Guardia() {
  const { listo, perfil } = useDatos();
  const router = useRouter();

  useEffect(() => {
    if (listo && !perfil) router.replace("/");
  }, [listo, perfil, router]);

  return null;
}
