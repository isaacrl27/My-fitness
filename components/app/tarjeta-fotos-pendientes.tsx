"use client";

import { Camera, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enPalabras } from "@/lib/calculos";
import type { FotoPendiente } from "@/lib/cola-fotos-offline";

const ETIQUETA_TURNO: Record<FotoPendiente["tipo"], string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  cena: "Cena",
  snack: "Merienda / snack",
};

/**
 * Muestra las fotos guardadas en el dispositivo cuando se hicieron sin señal,
 * permitiendo analizarlas al instante cuando vuelva la cobertura.
 */
export function TarjetaFotosPendientes({
  pendientes,
  cargandoId,
  deshabilitado,
  sinSenal = false,
  onAnalizar,
  onDescartar,
}: {
  pendientes: FotoPendiente[];
  cargandoId: string | null;
  deshabilitado: boolean;
  sinSenal?: boolean;
  onAnalizar: (item: FotoPendiente) => void;
  onDescartar: (id: string) => void;
}) {
  if (pendientes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink">
          {pendientes.length === 1
            ? "1 foto guardada sin cobertura"
            : `${pendientes.length} fotos guardadas sin cobertura`}
        </span>
        <span className="text-[11px] text-muted">
          {sinSenal ? "Esperando señal…" : "Lista para analizar"}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {pendientes.map((item) => {
          const ocupada = cargandoId === item.id;
          const esJpeg = item.mime === "image/jpeg";
          return (
            <li
              key={item.id}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-bg p-2"
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-accent-soft/40">
                <Camera size={18} className="text-accent" aria-hidden="true" />
                {esJpeg ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`data:image/jpeg;base64,${item.imagen}`}
                    alt="Foto pendiente de analizar"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-semibold text-ink">
                  {item.esCapricho ? "Capricho" : ETIQUETA_TURNO[item.tipo]} · {enPalabras(item.fecha)}
                </span>
                <span className="truncate text-[11px] text-muted">
                  {item.comentario ? `Detalle: ${item.comentario}` : "Guardada automáticamente sin señal"}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={ocupada}
                  disabled={deshabilitado && !ocupada}
                  onClick={() => onAnalizar(item)}
                  aria-label="Analizar ahora"
                >
                  {!ocupada ? <RefreshCw size={13} aria-hidden="true" /> : null}
                  <span>Analizar ahora</span>
                </Button>
                <button
                  type="button"
                  disabled={ocupada}
                  onClick={() => onDescartar(item.id)}
                  aria-label="Quitar foto pendiente"
                  className="rounded-lg p-1.5 text-muted hover:text-ink disabled:opacity-40"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
