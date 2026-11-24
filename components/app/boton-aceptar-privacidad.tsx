"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aceptarPrivacidad, haAceptadoPrivacidad } from "@/lib/privacidad";

export function BotonAceptarPrivacidad() {
  const router = useRouter();
  const aceptadaStore = useSyncExternalStore(
    () => () => {},
    () => haAceptadoPrivacidad(),
    () => false,
  );
  const [aceptadaLocal, setAceptadaLocal] = useState(false);
  const yaAceptada = aceptadaStore || aceptadaLocal;

  function handleAceptar() {
    aceptarPrivacidad();
    setAceptadaLocal(true);
    router.push("/hoy");
  }

  if (yaAceptada) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft p-4 text-center">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
          <Check size={18} aria-hidden="true" />
          Has aceptado esta política de privacidad y cookies
        </p>
        <p className="text-xs text-muted">
          Tus datos se mantienen privados y bajo tu control.
        </p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/hoy")}>
          Volver a la app
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-5 text-center">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-ink">
          ¿Estás de acuerdo con estas condiciones?
        </h3>
        <p className="text-xs text-muted">
          Al pulsar aceptar, confirmas que entiendes que tus datos son privados y que Isaac no tiene acceso a tu peso ni a tus comidas.
        </p>
      </div>
      <Button onClick={handleAceptar} className="w-full sm:w-auto">
        <ShieldCheck size={18} aria-hidden="true" />
        Aceptar política y continuar
      </Button>
    </div>
  );
}
