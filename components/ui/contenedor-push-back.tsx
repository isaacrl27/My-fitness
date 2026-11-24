"use client";

import { useEffect, useState } from "react";
import { suscribirPilaModales } from "@/lib/pila-modales";

/**
 * Contenedor Push Back estilo iOS / nativo.
 *
 * Cuando se abre cualquier modal, hoja inferior o diálogo (gestionado
 * centralmente por `pila-modales.ts`), la vista de fondo se hunde suavemente
 * en perspectiva 3D (scale 0.93, translateY de 8px, esquinas redondeadas y
 * ligera penumbra visual), dando un efecto de profundidad multicapa auténtico
 * sin estorbar ni añadir elementos flotantes a la interfaz.
 */
export function ContenedorPushBack({ children }: { children: React.ReactNode }) {
  const [empujado, setEmpujado] = useState(false);

  useEffect(() => {
    return suscribirPilaModales((abiertos) => {
      setEmpujado(abiertos > 0);
    });
  }, []);

  return (
    <div
      data-push-back={empujado ? "activo" : "inactivo"}
      className={[
        "flex flex-1 flex-col min-h-dvh sm:min-h-full w-full origin-top transform-gpu bg-bg text-ink",
        "transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "motion-reduce:transform-none motion-reduce:transition-none",
        empujado
          ? "scale-[0.93] translate-y-2 rounded-2xl overflow-hidden brightness-[0.86] shadow-2xl pointer-events-none select-none"
          : "scale-100 translate-y-0 rounded-none sm:rounded-3xl brightness-100 pointer-events-auto",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
