"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Dumbbell,
  House,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Pestana = { href: string; etiqueta: string; Icono: LucideIcon };

export const PESTANAS: Pestana[] = [
  { href: "/hoy", etiqueta: "Hoy", Icono: House },
  { href: "/progreso", etiqueta: "Progreso", Icono: TrendingUp },
  { href: "/plan", etiqueta: "Plan", Icono: CalendarDays },
  { href: "/entreno", etiqueta: "Entreno", Icono: Dumbbell },
  { href: "/familia", etiqueta: "Familia", Icono: Users },
  { href: "/ajustes", etiqueta: "Ajustes", Icono: Settings },
];

import { esPestanaActiva } from "@/lib/navegacion";
export { esPestanaActiva };

function Enlace({ pestana, activa }: { pestana: Pestana; activa: boolean }) {
  const { href, etiqueta, Icono } = pestana;
  return (
    <Link
      href={href}
      aria-current={activa ? "page" : undefined}
      className={[
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-0.5 py-2 text-2xs leading-tight",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        activa ? "font-semibold text-accent" : "text-muted",
      ].join(" ")}
    >
      {/* La pestaña activa sube 2 px y engorda el trazo: es el único
          movimiento de la barra, sin píldoras que crucen la pantalla. */}
      <Icono
        size={20}
        aria-hidden="true"
        strokeWidth={activa ? 2.4 : 2}
        className={[
          "transition-all duration-150 ease-out",
          activa ? "-translate-y-0.5" : "translate-y-0",
        ].join(" ")}
      />
      <span className="max-w-full truncate">{etiqueta}</span>
    </Link>
  );
}

/**
 * Barra de pestañas de abajo.
 *
 * Antes llevaba un `+` central para anotar comida; se quitó porque solo
 * servía para eso y tapaba contenido. Ahora son seis pestañas y las puertas
 * para anotar son el botón de debajo del anillo y el `+` de cada comida.
 */
export function NavInferior() {
  const ruta = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-20 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] sm:rounded-b-3xl"
    >
      <div className="flex items-stretch px-0.5">
        {PESTANAS.map((p) => (
          <Enlace key={p.href} pestana={p} activa={esPestanaActiva(p.href, ruta)} />
        ))}
      </div>
    </nav>
  );
}
