import { AlertTriangle, CheckCircle2, Info, Utensils } from "lucide-react";

type ToastTone = "success" | "warning" | "danger" | "info";

const TOAST = {
  success: { bar: "bg-success", Icon: CheckCircle2, role: "status" as const },
  warning: { bar: "bg-warning", Icon: AlertTriangle, role: "status" as const },
  danger: { bar: "bg-danger", Icon: AlertTriangle, role: "alert" as const },
  info: { bar: "bg-accent", Icon: Info, role: "status" as const },
};

/** Aviso flotante. */
export function Toast({ tone = "info", children }: { tone?: ToastTone; children: React.ReactNode }) {
  const t = TOAST[tone];
  const Icon = t.Icon;
  return (
    <div
      role={t.role}
      className="flex items-start gap-3 overflow-hidden rounded-md bg-surface shadow-pop"
    >
      <span aria-hidden="true" className={["w-[3px] self-stretch", t.bar].join(" ")} />
      <span className="flex items-start gap-2 py-3 pr-4">
        <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
        <span className="text-sm text-ink">{children}</span>
      </span>
    </div>
  );
}

/** Bloque gris mientras carga. */
export function Skeleton({
  className = "",
  rounded = "rounded-md",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={["animate-pulse bg-surface", rounded, className].join(" ")}
    />
  );
}

/** Pantalla vacía: explica qué hacer. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-bg text-muted">
        <Utensils size={22} aria-hidden="true" />
      </span>
      <h3 className="text-lg text-ink">{title}</h3>
      <p className="max-w-xs text-sm text-muted">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
