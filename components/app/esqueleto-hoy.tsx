/**
 * esqueleto-hoy.tsx
 *
 * Silueta de carga reactiva (Skeleton) para la pantalla de Hoy.
 * Sustituye la pantalla en blanco y el texto estático por la forma
 * visual real de la interfaz (cabecera, anillo de energía, comidas,
 * agua y hábitos) con animación fluida de pulso (animate-pulse).
 *
 * Inspirado en las mejores prácticas de UI nativa (Vídeo 6).
 */

export function EsqueletoHoy() {
  return (
    <div
      className="flex flex-col gap-4 px-5 pb-10 pt-7 animate-pulse"
      aria-hidden="true"
      role="status"
      aria-label="Cargando tu día..."
    >
      {/* 1. CABECERA LIMPIA */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          {/* Saludo */}
          <div className="h-7 w-36 rounded-lg bg-surface border border-border/40" />
          {/* Acciones superiores (Campana, Guía, Racha) */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-surface border border-border/40" />
            <div className="h-7 w-14 rounded-full bg-surface border border-border/40" />
            <div className="h-7 w-16 rounded-full bg-surface border border-border/40" />
          </div>
        </div>

        {/* Selector de día */}
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface/60 px-3 py-2.5">
          <div className="h-4 w-4 rounded bg-border/50" />
          <div className="h-4 w-32 rounded bg-border/60" />
          <div className="h-4 w-4 rounded bg-border/50" />
        </div>
      </header>

      {/* 2. TARJETA PRINCIPAL DE ENERGÍA */}
      <section className="flex flex-col items-center gap-3.5 rounded-2xl border border-border/80 bg-surface p-5 shadow-xs">
        {/* Anillo de calorías simulado */}
        <div className="relative flex items-center justify-center my-1">
          <div className="h-28 w-28 rounded-full border-8 border-border/40 bg-bg/40 flex flex-col items-center justify-center gap-1.5">
            <div className="h-4 w-12 rounded bg-border/60" />
            <div className="h-3 w-8 rounded bg-border/40" />
          </div>
        </div>

        {/* Resumen de kcal */}
        <div className="h-4 w-52 rounded bg-border/60" />
        {/* Enlace de nutrientes */}
        <div className="h-3 w-28 rounded bg-border/40" />

        {/* Botón de acción principal */}
        <div className="h-12 w-full rounded-xl bg-accent/20 border border-accent/30 mt-1" />
      </section>

      {/* 3. TUS COMIDAS DE HOY */}
      <section className="flex flex-col gap-2.5">
        <div className="h-3.5 w-36 rounded bg-border/60 px-0.5" />

        {/* 4 ranuras de comidas (Desayuno, Almuerzo, Merienda, Cena) */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-border/70 bg-surface p-3.5"
          >
            <div className="h-4 w-20 rounded bg-border/60" />
            <div className="h-4 w-16 rounded bg-border/40" />
          </div>
        ))}
      </section>

      {/* 4. TARJETA DE AGUA */}
      <section className="rounded-xl border border-border/70 bg-surface p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-border/60" />
          <div className="h-4 w-14 rounded bg-border/40" />
        </div>
        <div className="grid grid-cols-4 gap-2 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-bg/70 border border-border/40" />
          ))}
        </div>
      </section>

      {/* 5. TARJETA DE HÁBITOS */}
      <section className="rounded-xl border border-border/70 bg-surface p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1">
          <div className="h-4 w-32 rounded bg-border/60" />
          <div className="h-4 w-12 rounded bg-border/40" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="h-5 w-5 rounded-md bg-border/50 shrink-0" />
            <div className="h-3.5 w-full rounded bg-border/40" />
          </div>
        ))}
      </section>
    </div>
  );
}
