"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Entrada de cada pantalla al cambiar de pestaña.
 *
 * El armazón de la app no se remonta al cambiar de ruta, pero cada PÁGINA sí.
 * Con esta envoltura (key = ruta actual), el contenido entra subiendo un pelín
 * y aclarándose, como el fundido de las apps móviles, y respeta el margen
 * superior de seguridad (`safe-area-inset-top`) en iPhone con isla/ceja y
 * Android a pantalla completa.
 */
export function TransicionRuta({ children }: { children: ReactNode }) {
  const ruta = usePathname() ?? "";
  return (
    <div key={ruta} className="enruta flex-1 pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  );
}
