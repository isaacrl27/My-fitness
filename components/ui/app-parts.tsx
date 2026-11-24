import { BarChart3, CalendarDays, House, Plus, Settings, TrendingUp } from "lucide-react";
import { IconButton } from "./button";

/** Tarjeta de una comida del diario. */
export function MealCard({
  meal,
  items,
  onAdd,
}: {
  meal: string;
  items: { name: string; qty: string; kcal: number }[];
  onAdd?: () => void;
}) {
  const total = items.reduce((s, i) => s + i.kcal, 0);
  return (
    <section className="rounded-lg bg-surface p-4 shadow-card">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-ink">{meal}</h3>
        <div className="flex items-center gap-1">
          {items.length > 0 ? <span className="text-sm text-muted">{total} kcal</span> : null}
          {onAdd ? (
            <IconButton label={`Añadir a ${meal.toLowerCase()}`} size="sm" onClick={onAdd}>
              <Plus size={18} aria-hidden="true" />
            </IconButton>
          ) : null}
        </div>
      </header>
      {items.length === 0 ? (
        <p className="pt-2 text-sm text-muted">Añade tu {meal.toLowerCase()}.</p>
      ) : (
        <ul className="pt-2">
          {items.map((i) => (
            <li key={i.name} className="flex justify-between py-1 text-sm">
              <span className="text-ink">
                {i.name} <span className="text-muted">· {i.qty}</span>
              </span>
              <span className="text-muted">{i.kcal} kcal</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const NAV = [
  { id: "hoy", label: "Hoy", Icon: House },
  { id: "progreso", label: "Progreso", Icon: TrendingUp },
  { id: "plan", label: "Plan", Icon: CalendarDays },
  { id: "analisis", label: "Análisis", Icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", Icon: Settings },
];

/** Barra de navegación inferior con botón central. */
export function BottomNav({
  active,
  onChange,
  onAdd,
}: {
  active: string;
  onChange: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <nav
      aria-label="Navegación principal"
      className="flex items-center justify-around border-t border-border bg-bg px-2 pb-2 pt-2"
    >
      {NAV.map(({ id, label, Icon }, idx) => (
        <div key={id} className="flex flex-1 justify-center">
          {idx === 2 ? (
            <IconButton label="Añadir comida" variant="solid" onClick={onAdd}>
              <Plus size={22} aria-hidden="true" />
            </IconButton>
          ) : null}
          {idx !== 2 ? (
            <button
              type="button"
              onClick={() => onChange(id)}
              aria-current={active === id ? "page" : undefined}
              className={[
                "flex w-full flex-col items-center gap-1 rounded-md py-1 text-xs",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                active === id ? "text-accent" : "text-muted",
              ].join(" ")}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          ) : (
            <span className="flex w-full flex-col items-center gap-1 py-1 text-xs text-muted">
              <span className="h-5" aria-hidden="true" />
              {label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
