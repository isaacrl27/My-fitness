"use client";

import type { MediaSemanal } from "@/lib/atajos-comida";

export function MediaSemanalBadge({ media }: { media: MediaSemanal | null }) {
  if (!media) return null;

  const kcalFmt = media.mediaKcal.toLocaleString("es-ES");
  const absDiff = Math.abs(media.diferencia).toLocaleString("es-ES");

  const detalle =
    media.estado === "en_rango"
      ? "en objetivo"
      : media.estado === "bajo"
        ? `-${absDiff} kcal vs plan`
        : `+${absDiff} kcal vs plan`;

  const tonoDetalle =
    media.estado === "en_rango"
      ? "text-accent font-semibold"
      : media.estado === "bajo"
        ? "text-muted font-semibold"
        : "text-warning font-semibold";

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-full border border-border/70 bg-bg/70 px-3 py-1 text-2xs text-muted tabular-nums"
      aria-label={`Media semanal de ${kcalFmt} kilocalorías al día en ${media.diasConDatos} días`}
    >
      <span>
        Media 7 días: <strong className="font-bold text-ink">{kcalFmt} kcal/día</strong>
      </span>
      <span aria-hidden="true">·</span>
      <span className={tonoDetalle}>{detalle}</span>
      <span className="text-muted/80">({media.diasConDatos} d)</span>
    </div>
  );
}
