import { ThumbsDown, ThumbsUp } from "lucide-react";

type Option = { value: string; label: string };

/** Grupo de opciones cortas (desayuno/comida/cena/snack, sexo, actividad…). */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  label: string;
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;
    const idx = options.findIndex((o) => o.value === value);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (idx + 1) % options.length;
      onChange(options[nextIdx].value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (idx - 1 + options.length) % options.length;
      onChange(options[prevIdx].value);
    }
  };

  // Si el valor guardado no coincide con ninguna opción, el grupo se quedaría
  // fuera del teclado (ninguna opción tabulable). La primera hace de entrada.
  const sinNinguna = !options.some((o) => o.value === value);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={["flex w-full rounded-pill bg-surface p-1 border border-border/40", className]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((o, indice) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (sinNinguna && indice === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={[
              "flex-1 min-w-0 min-h-[38px] rounded-pill px-2 py-2 text-center text-sm font-semibold transition duration-150 ease-app active:scale-[.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "bg-accent-soft text-accent shadow-xs" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            <span className="block truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Interruptor. Toda la fila es pulsable, no solo el mando. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
    >
      <span className="text-base text-ink">{label}</span>
      <span
        aria-hidden="true"
        className={[
          "relative h-7 w-12 shrink-0 rounded-pill transition duration-200 ease-app",
          checked ? "bg-accent" : "bg-border",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-6 w-6 rounded-pill bg-bg shadow-card transition-all duration-200 ease-app",
            checked ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

const TONES = {
  accent: "bg-accent-soft text-accent",
  neutral: "bg-surface text-muted",
  success: "bg-surface text-success",
  warning: "bg-surface text-warning",
  danger: "bg-surface text-danger",
} as const;

/** Etiqueta corta: macros, estados, dietas. */
export function Badge({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export type Rating = "like" | "dislike" | null;

/** Me gusta / no me gusta. */
export function RatingButtons({
  value,
  onChange,
}: {
  value: Rating;
  onChange: (v: Rating) => void;
}) {
  const item = (kind: "like" | "dislike", text: string, Icon: typeof ThumbsUp) => {
    const active = value === kind;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onChange(active ? null : kind)}
        className={[
          "inline-flex items-center gap-2 rounded-pill border px-3 py-2 text-sm font-semibold transition duration-150 ease-app",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          active
            ? kind === "like"
              ? "border-accent bg-accent-soft text-accent"
              : "border-border-input bg-surface text-ink"
            : "border-border bg-bg text-muted hover:text-ink",
        ].join(" ")}
      >
        <Icon size={16} aria-hidden="true" />
        {text}
      </button>
    );
  };
  return (
    <div className="inline-flex gap-2">
      {item("like", "Me gusta", ThumbsUp)}
      {item("dislike", "No me gusta", ThumbsDown)}
    </div>
  );
}
