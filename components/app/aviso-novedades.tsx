"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatos } from "@/lib/store";
import { useBloqueoModal } from "@/lib/use-modal";
import {
  CLAVE_NOVEDADES,
  VERSION,
  hayQueEnsenar,
  novedadesPendientes,
  type Novedad,
} from "@/lib/novedades";

/**
 * La ventana de «esto es lo nuevo».
 *
 * Muestra ÚNICAMENTE las novedades que este usuario aún no ha visto,
 * en lugar de repetir la lista entera de todas las versiones pasadas.
 *
 * Al pulsar «Vale» se apunta la versión actual en `localStorage`
 * y no vuelve hasta que haya una novedad posterior.
 */
export function AvisoNovedades() {
  const { listo, perfil } = useDatos();
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Novedad[]>([]);

  useEffect(() => {
    if (!listo || !perfil) return;
    let guardado: string | null = null;
    try {
      guardado = window.localStorage.getItem(CLAVE_NOVEDADES);
    } catch {
      // Sin almacenamiento (modo privado raro): se enseña igual.
    }
    if (hayQueEnsenar(guardado)) {
      const pendientes = novedadesPendientes(guardado);
      if (pendientes.length > 0) {
        // Se difiere un microtask para no disparar re-render síncrono dentro del efecto.
        queueMicrotask(() => {
          setItems(pendientes);
          setAbierto(true);
        });
      }
    }
  }, [listo, perfil]);

  function cerrar() {
    try {
      window.localStorage.setItem(CLAVE_NOVEDADES, String(VERSION));
    } catch {
      // Si no se puede guardar, se cierra igual: no se deja la ventana pegada.
    }
    setAbierto(false);
  }

  useBloqueoModal({ abierto, onCerrar: cerrar });

  if (!abierto || items.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-novedades"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col rounded-2xl bg-surface p-5 shadow-pop border border-border/80">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 id="titulo-novedades" className="text-base font-bold text-ink leading-tight">
              {items.length === 1 ? "Lo nuevo en la app" : "Novedades para ti"}
            </h2>
            <p className="text-2xs text-muted">
              {items.length === 1
                ? "Novedad añadida desde tu última visita"
                : `${items.length} novedades añadidas desde tu última visita`}
            </p>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-3 overflow-y-auto pt-4">
          {items.map((novedad) => (
            <li
              key={novedad.titulo}
              className="flex flex-col gap-0.5 rounded-xl border border-border/60 bg-bg/50 p-3"
            >
              <span className="text-sm font-bold text-ink">{novedad.titulo}</span>
              {novedad.detalle ? (
                <span className="text-xs text-muted leading-relaxed">{novedad.detalle}</span>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2 pt-5">
          <Link
            href="/ajustes#ayuda"
            onClick={cerrar}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold text-ink transition duration-150 ease-app hover:bg-surface active:scale-[.97]"
          >
            Dar feedback
          </Link>
          <Button size="sm" onClick={cerrar} autoFocus className="rounded-xl px-5 text-xs font-bold">
            Vale
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
