"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDatos } from "@/lib/store";
import { HABITOS_INICIALES } from "@/lib/habitos";
import { Cargando } from "@/components/app/onboarding";
import { ElegirHabitos } from "@/components/app/elegir-habitos";

/**
 * La pantalla de los hábitos, aparte de Ajustes.
 *
 * En Ajustes queda solo una línea que lleva aquí: la lista larga dentro de
 * Ajustes era un muro de interruptores. Aquí se eligen los del catálogo, se
 * crean los propios y se borran los que ya no se quieran.
 */
export default function PaginaHabitos() {
  const { perfil, guardarPerfil, listo } = useDatos();

  if (!listo || !perfil) return <Cargando />;

  const activos = perfil.habitosActivos ?? HABITOS_INICIALES;
  const propios = perfil.habitosPropios ?? [];

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/ajustes"
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-accent"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Ajustes
        </Link>
        <h1 className="text-xl text-ink">Tus hábitos diarios</h1>
        <p className="text-sm text-muted">
          Los marcas en la pantalla de Hoy con un toque. Cada marca suma puntos, con un tope de
          cinco al día aunque tengas más hábitos activos. Si el que quieres no está en la lista,
          escríbelo tú.
        </p>
      </header>

      <section className="rounded-lg border border-border p-4">
        <ElegirHabitos
          activos={activos}
          propios={propios}
          conBorrar
          onCambiar={(nuevosActivos, nuevosPropios) =>
            guardarPerfil({
              ...perfil,
              habitosActivos: nuevosActivos,
              habitosPropios: nuevosPropios,
            })
          }
        />
      </section>

      <Link
        href="/ajustes"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-ink transition duration-150 ease-app hover:bg-bg"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a Ajustes
      </Link>
    </div>
  );
}
