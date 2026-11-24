"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDatos } from "@/lib/store";
import { Cargando, Onboarding } from "@/components/app/onboarding";

export default function Page() {
  const { perfil, listo } = useDatos();
  const router = useRouter();

  // Al acabar el cuestionario se va directo a Hoy: se acabaron las sesiones de
  // valorar platos uno a uno (decisión de Isaac, 22/10). Lo que no quiere ver
  // se apunta como ingredientes, y el «me gusta / no me gustó» se dice al
  // comer, en Hoy, que es donde lo sabe de verdad.
  useEffect(() => {
    if (listo && perfil) router.replace("/hoy");
  }, [listo, perfil, router]);

  if (!listo || perfil) return <Cargando />;
  return <Onboarding onEmpezar={() => router.replace("/hoy")} />;
}
