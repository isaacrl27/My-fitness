"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Cookie, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aceptarPrivacidad, haAceptadoPrivacidad } from "@/lib/privacidad";
import { useBloqueoModal } from "@/lib/use-modal";

/**
 * Diálogo de privacidad y cookies para la versión Alfa de Isaac.
 *
 * Se presenta de forma clara y honesta para que cualquier familiar o amigo
 * que reciba la app entienda de inmediato que es una versión Alfa de pruebas,
 * que Isaac no tiene acceso a sus datos íntimos y a qué cosas mínimas da acceso.
 */
export function BannerPrivacidad() {
  const yaAceptada = useSyncExternalStore(
    () => () => {},
    () => haAceptadoPrivacidad(),
    () => true, // En el servidor no se enseña para evitar flash
  );
  const [cerrado, setCerrado] = useState(false);

  function aceptar() {
    aceptarPrivacidad();
    setCerrado(true);
  }

  useBloqueoModal({ abierto: !yaAceptada && !cerrado, bloquearScroll: true });

  if (yaAceptada || cerrado || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 sm:px-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-privacidad"
    >
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col rounded-2xl border border-border bg-surface p-5 shadow-pop">
        {/* Encabezado */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2.5 py-0.5 text-2xs font-semibold text-accent">
                <Sparkles size={11} aria-hidden="true" />
                Versión Alfa de Isaac
              </span>
            </div>
            <h2 id="titulo-privacidad" className="text-base font-bold text-ink">
              Privacidad y Cookies
            </h2>
          </div>
        </div>

        {/* Explicación directa */}
        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto py-3 text-xs leading-relaxed text-muted">
          <p>
            Esta app es una <strong className="text-ink">versión Alfa de pruebas</strong> creada por Isaac para su familia y amigos.
          </p>
          <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-bg p-3">
            <div className="flex items-start gap-2">
              <EyeOff size={15} className="mt-0.5 shrink-0 text-accent" />
              <p>
                <strong className="text-ink">Isaac NO tiene acceso a nada tuyo:</strong> no puede ver tu peso, lo que comes, ni tus fotos. Tus datos son 100% privados.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Cookie size={15} className="mt-0.5 shrink-0 text-accent" />
              <p>
                <strong className="text-ink">Al usar la app solo das acceso a esto:</strong>
              </p>
            </div>
            <ul className="list-disc space-y-1 pl-6 text-muted">
              <li>
                <strong className="text-ink">Almacenamiento en tu móvil:</strong> para guardar tus comidas y preferencias (cero cookies de publicidad o rastreo).
              </li>
              <li>
                <strong className="text-ink">Copia en la nube:</strong> con tu código privado para no perder tus datos.
              </li>
              <li>
                <strong className="text-ink">Pasos y sueño (opcional):</strong> solo si tú decides conectarlos.
              </li>
            </ul>
          </div>
          <p className="text-2xs">
            Y poco más: sin anuncios comerciales, sin vender datos y puedes borrar tu cuenta con un toque desde Ajustes.
          </p>
        </div>

        {/* Acciones */}
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <Link
            href="/privacidad"
            onClick={aceptar}
            className="text-xs font-semibold text-accent underline underline-offset-2 hover:opacity-80"
          >
            Ver política completa
          </Link>
          <Button onClick={aceptar} className="h-10 px-5 text-sm font-semibold">
            <Check size={16} aria-hidden="true" />
            Aceptar y entrar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
