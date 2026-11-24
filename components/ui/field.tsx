import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Search, X } from "lucide-react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;
};

/** Campo de texto con etiqueta de verdad, ayuda y error enlazados. */
export function TextField({
  label,
  hint,
  error,
  suffix,
  id,
  className = "",
  ...rest
}: TextFieldProps) {
  const inputId = id ?? `f-${label.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`;
  const helpId = `${inputId}-help`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? helpId : undefined}
          className={[
            "h-11 w-full rounded-md bg-bg px-3 text-base text-ink",
            "border placeholder:text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent",
            "disabled:opacity-45",
            error ? "border-danger" : "border-border-input",
            suffix ? "pr-12" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 text-sm text-muted">{suffix}</span>
        ) : null}
      </div>
      {hint || error ? (
        <p
          id={helpId}
          role={error ? "alert" : undefined}
          aria-live={error ? "polite" : undefined}
          className={error ? "text-sm text-danger" : "text-sm text-muted"}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Cuadro de texto largo, con el mismo aspecto que los campos de una línea. */
export function TextArea({
  label,
  hint,
  error,
  id,
  className = "",
  ...rest
}: TextAreaProps) {
  const inputId = id ?? `f-${label.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`;
  const helpId = `${inputId}-help`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? helpId : undefined}
        className={[
          "min-h-28 w-full resize-y rounded-md bg-bg px-3 py-2.5 text-base text-ink",
          "border placeholder:text-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent",
          "disabled:opacity-45",
          error ? "border-danger" : "border-border-input",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {hint || error ? (
        <p
          id={helpId}
          role={error ? "alert" : undefined}
          aria-live={error ? "polite" : undefined}
          className={error ? "text-sm text-danger" : "text-sm text-muted"}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

type SearchFieldProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Nº de resultados, para el aviso a lectores de pantalla. */
  results?: number | null;
  loading?: boolean;
};

/** Buscador de alimentos. */
export function SearchField({
  value,
  onChange,
  placeholder = "Buscar alimento",
  results = null,
  loading = false,
}: SearchFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-center">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-muted"
        />
        <input
          type="search"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 w-full rounded-md border border-border-input bg-bg pl-10 pr-10 text-base text-ink placeholder:text-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {value ? (
          <button
            type="button"
            aria-label="Borrar la búsqueda"
            onClick={() => onChange("")}
            className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-pill text-muted hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <p role="status" className="min-h-5 text-sm text-muted">
        {loading
          ? "Buscando…"
          : results === null
            ? ""
            : results === 0
              ? "No he encontrado nada. Prueba con otro nombre."
              : `${results} resultado${results === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
