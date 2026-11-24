import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold select-none " +
  "transition duration-150 ease-app active:scale-[.97] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:opacity-45 disabled:pointer-events-none";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-95 active:brightness-90",
  secondary: "bg-surface text-ink border border-border hover:bg-bg",
  ghost: "bg-transparent text-accent hover:bg-accent-soft",
  danger: "bg-danger text-on-accent hover:brightness-95 active:brightness-90",
};

const SIZE: Record<Size, string> = {
  sm: "min-h-8 px-3 py-1 text-sm",
  md: "min-h-11 px-4 py-2 text-sm",
  lg: "min-h-[52px] px-6 py-2.5 text-base",
};

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[BASE, VARIANT[variant], SIZE[size], className].filter(Boolean).join(" ")}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Obligatorio: el botón no tiene texto visible. */
  label: string;
  variant?: "ghost" | "solid" | "danger";
  size?: "sm" | "md";
  children: ReactNode;
};

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: IconButtonProps) {
  const v = {
    ghost: "bg-transparent text-ink hover:bg-surface",
    solid: "bg-accent text-on-accent hover:brightness-95",
    danger: "bg-transparent text-danger hover:bg-surface",
  }[variant];
  const s = { sm: "h-9 w-9 min-h-[36px] min-w-[36px]", md: "h-11 w-11 min-h-[44px] min-w-[44px]" }[size];
  return (
    <button
      {...rest}
      type={rest.type ?? "button"}
      aria-label={label}
      title={label}
      className={[
        "inline-flex items-center justify-center rounded-pill transition duration-150 ease-app active:scale-[.94]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:opacity-45 disabled:pointer-events-none",
        v,
        s,
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
