"use client";

import { useId, useMemo, useState } from "react";
import { Flame, Calendar, CheckCircle2 } from "lucide-react";
import { generarMapaCalor, type DatosMapaCalor, type DiaCalor, type NivelActividad } from "@/lib/mapa-calor";

const ETIQUETAS_DIAS = ["L", "", "X", "", "V", "", "D"];

const COLORES_NIVEL: Record<NivelActividad, string> = {
  0: "bg-surface-raised border border-border/60 hover:border-border",
  1: "bg-emerald-950/40 border border-emerald-800/40 hover:border-emerald-700/60 dark:bg-emerald-950/60",
  2: "bg-emerald-600/50 border border-emerald-500/50 hover:border-emerald-400/70",
  3: "bg-emerald-500/80 border border-emerald-400/70 hover:border-emerald-300",
  4: "bg-emerald-400 border border-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.35)]",
};

type PropsMapaCalor = {
  datos: DatosMapaCalor;
  hoyStr: string;
  numSemanas?: number;
  className?: string;
};

/**
 * Mapa de calor de actividad estilo GitHub / Rare UI.
 *
 * Muestra la constancia diaria en una cuadrícula interactiva con casillas
 * sensibles al toque, pie de página informativo y niveles de actividad.
 */
export function MapaCalorGitHub({
  datos,
  hoyStr,
  numSemanas = 12,
  className = "",
}: PropsMapaCalor) {
  const idUnico = useId();

  const { columnas, diasTotales, diasActivos, racha } = useMemo(
    () => generarMapaCalor(datos, hoyStr, numSemanas),
    [datos, hoyStr, numSemanas]
  );

  // Día seleccionado para inspección en el pie de página (por defecto, hoy)
  const hoyDia = useMemo(() => {
    for (const col of columnas) {
      for (const d of col) {
        if (d.esHoy) return d;
      }
    }
    return columnas[columnas.length - 1]?.[columnas[columnas.length - 1].length - 1] ?? null;
  }, [columnas]);

  const [seleccionado, setSeleccionado] = useState<DiaCalor | null>(hoyDia);

  const porcentaje = diasTotales > 0 ? Math.round((diasActivos / diasTotales) * 100) : 0;

  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-border/70 bg-surface p-4 shadow-sm ${className}`}>
      {/* Cabecera del bloque */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-base font-bold text-ink">Actividad y constancia</h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
          <Flame size={14} className="fill-current text-accent" aria-hidden="true" />
          <span>{racha} día{racha === 1 ? "" : "s"} de racha</span>
        </div>
      </div>

      {/* Cuadrícula interactiva */}
      <div className="flex justify-center overflow-x-auto py-2">
        <div className="flex items-start gap-1.5 select-none">
          {/* Etiquetas laterales (L, X, V) */}
          <div className="flex flex-col gap-1 pr-1 pt-0.5 text-[9px] font-semibold text-muted">
            {ETIQUETAS_DIAS.map((etq, i) => (
              <span key={`${idUnico}-dia-${i}`} className="h-3 w-2.5 leading-3 text-center">
                {etq}
              </span>
            ))}
          </div>

          {/* Columnas de semanas */}
          <div className="flex gap-1">
            {columnas.map((semana, sIdx) => (
              <div key={`${idUnico}-sem-${sIdx}`} className="flex flex-col gap-1">
                {semana.map((dia) => {
                  const esActivo = seleccionado?.fechaISO === dia.fechaISO;

                  return (
                    <button
                      key={dia.fechaISO}
                      type="button"
                      disabled={dia.esFuturo}
                      onClick={() => setSeleccionado(dia)}
                      title={`${dia.fechaTexto}: ${dia.detalles.length > 0 ? dia.detalles.join(", ") : "Sin actividad"}`}
                      aria-label={`${dia.fechaTexto}: nivel ${dia.nivel} de actividad`}
                      className={[
                        "h-3 w-3 rounded-[3px] transition-all duration-150 active:scale-90",
                        COLORES_NIVEL[dia.nivel],
                        dia.esHoy ? "ring-1.5 ring-accent ring-offset-1 ring-offset-surface" : "",
                        dia.esFuturo ? "opacity-15 cursor-not-allowed border-dashed" : "cursor-pointer hover:scale-125",
                        esActivo && !dia.esFuturo ? "scale-125 ring-2 ring-ink" : "",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pie de página interactivo: Detalle del día tocado */}
      <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-surface-raised p-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink">
            {seleccionado ? seleccionado.fechaTexto : "Toca un día para ver detalle"}
          </span>
          <span className="text-[11px] font-medium text-muted">
            {seleccionado?.totalActividades
              ? `${seleccionado.totalActividades} actividad${seleccionado.totalActividades > 1 ? "es" : ""}`
              : "Sin registros"}
          </span>
        </div>

        {seleccionado && seleccionado.detalles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {seleccionado.detalles.map((det, idx) => (
              <span
                key={`${seleccionado.fechaISO}-det-${idx}`}
                className="inline-flex items-center gap-1 rounded-md bg-accent-soft/70 px-2 py-0.5 text-[11px] font-semibold text-accent"
              >
                <CheckCircle2 size={11} aria-hidden="true" />
                {det}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted italic">
            {seleccionado?.esFuturo ? "Día futuro aún por vivir." : "Día de descanso sin pesada, comida ni hábitos anotados."}
          </p>
        )}
      </div>

      {/* Leyenda y balance general (estilo GitHub) */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-muted">
        <span>
          <strong className="text-ink font-semibold">{diasActivos}</strong> de {diasTotales} días activos ({porcentaje}%)
        </span>

        <div className="flex items-center gap-1">
          <span>Menos</span>
          {([0, 1, 2, 3, 4] as NivelActividad[]).map((lvl) => (
            <span
              key={`legend-${lvl}`}
              className={`h-2.5 w-2.5 rounded-[2px] ${COLORES_NIVEL[lvl]}`}
              aria-hidden="true"
            />
          ))}
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}
