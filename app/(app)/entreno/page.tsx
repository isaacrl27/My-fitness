"use client";

import { useDatos } from "@/lib/store";
import { useHoy } from "@/lib/use-hoy";
import { Cargando } from "@/components/app/onboarding";
import { PlanEjercicios } from "@/components/app/plan-ejercicios";

/**
 * La pestaña de entreno, separada del Plan de comidas.
 *
 * El componente es el mismo que antes vivía dentro de Plan: aquí solo se le
 * da el perfil y el día de hoy, y él se encarga de la rutina y de guardar los
 * cambios de sitio y de días.
 */
export default function PaginaEntreno() {
  const {
    perfil,
    guardarPerfil,
    listo,
    entrenosHechos,
    alternarEjercicio,
    marcarTodosEjercicios,
    habitosHechos,
    alternarHabito,
  } = useDatos();
  const hoy = useHoy();

  if (!listo || !perfil || !hoy) return <Cargando />;

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">Tu semana</p>
        <h1 className="text-xl text-ink">Entreno</h1>
      </header>

      <PlanEjercicios
        perfil={perfil}
        hoy={hoy}
        guardarPerfil={guardarPerfil}
        hechos={entrenosHechos ?? {}}
        alternarEjercicio={alternarEjercicio}
        marcarTodosEjercicios={marcarTodosEjercicios}
        habitosHechos={habitosHechos ?? {}}
        alternarHabito={alternarHabito}
      />
    </div>
  );
}
