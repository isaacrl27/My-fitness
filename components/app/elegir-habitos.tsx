"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { CATALOGO_HABITOS, crearHabitoPropio, type HabitoPropio } from "@/lib/habitos";

/**
 * Elegir los hábitos diarios: los del catálogo y los que se invente cada uno.
 *
 * Se usa en el cuestionario (para no empezar con cinco hábitos impuestos) y en
 * la pantalla de Ajustes → Hábitos. Aquí no se guarda nada: se avisa de cada
 * cambio con `onCambiar` y quien lo usa decide dónde apuntarlo.
 *
 * Los hábitos propios se quedan guardados aunque se apaguen, para no perder el
 * nombre que escribió la persona: solo se borran con la X.
 */
export function ElegirHabitos({
  activos,
  propios,
  onCambiar,
  conBorrar = false,
}: {
  activos: string[];
  propios: HabitoPropio[];
  onCambiar: (activos: string[], propios: HabitoPropio[]) => void;
  /** En Ajustes se pueden borrar los propios; en el cuestionario, todavía no. */
  conBorrar?: boolean;
}) {
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function alternar(id: string) {
    const siguientes = activos.includes(id)
      ? activos.filter((x) => x !== id)
      : [...activos, id];
    onCambiar(siguientes, propios);
  }

  function anadir() {
    const creado = crearHabitoPropio(nuevo, propios);
    if (!creado.ok) {
      setError(creado.motivo);
      return;
    }
    setNuevo("");
    setError(undefined);
    onCambiar([...activos, creado.habito.id], [...propios, creado.habito]);
  }

  function borrar(habito: HabitoPropio) {
    onCambiar(
      activos.filter((id) => id !== habito.id),
      propios.filter((p) => p.id !== habito.id),
    );
  }

  const elegido = (id: string) => activos.includes(id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {activos.length === 0
            ? "Ahora mismo no sigues ninguno."
            : `Sigues ${activos.length} ${activos.length === 1 ? "hábito" : "hábitos"}.`}
        </p>
        {activos.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => onCambiar([], propios)}>
            Ninguno
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {CATALOGO_HABITOS.map((h) => (
          <button
            key={h.id}
            type="button"
            aria-pressed={elegido(h.id)}
            onClick={() => alternar(h.id)}
            className={[
              "inline-flex items-center gap-1.5 rounded-pill border px-3 py-2 text-sm transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              elegido(h.id)
                ? "border-accent bg-accent-soft font-semibold text-accent"
                : "border-border bg-surface text-ink",
            ].join(" ")}
          >
            {elegido(h.id) ? <Check size={14} aria-hidden="true" /> : null}
            {h.etiqueta}
          </button>
        ))}
      </div>

      {activos.length > 5 ? (
        <p className="text-sm text-muted">
          Tienes {activos.length} activos. Los puntos se cuentan como máximo cinco al día; los que
          pasan de cinco no suman.
        </p>
      ) : null}

      {propios.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">Los tuyos</h3>
          <div className="flex flex-wrap gap-2">
            {propios.map((h) => (
              <span
                key={h.id}
                className={[
                  "inline-flex items-center rounded-pill border text-sm",
                  elegido(h.id)
                    ? "border-accent bg-accent-soft font-semibold text-accent"
                    : "border-border bg-surface text-ink",
                ].join(" ")}
              >
                <button
                  type="button"
                  aria-pressed={elegido(h.id)}
                  onClick={() => alternar(h.id)}
                  className="inline-flex items-center gap-1.5 rounded-pill py-2 pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {elegido(h.id) ? <Check size={14} aria-hidden="true" /> : null}
                  {h.etiqueta}
                </button>
                {conBorrar ? (
                  <IconButton
                    label={`Borrar el hábito «${h.etiqueta}»`}
                    variant="danger"
                    size="sm"
                    className="mr-1"
                    onClick={() => borrar(h)}
                  >
                    <X size={14} aria-hidden="true" />
                  </IconButton>
                ) : (
                  <span className="pr-3" />
                )}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">¿El tuyo no está en la lista?</h3>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <TextField
              label="Escríbelo con tus palabras"
              value={nuevo}
              maxLength={30}
              placeholder="Ej. Tomar infusión después de cenar"
              hint="Se añade a tus hábitos y sale también en el aviso de la noche."
              error={error}
              onChange={(e) => {
                setNuevo(e.target.value);
                if (error) setError(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  anadir();
                }
              }}
            />
          </div>
          <Button variant="secondary" size="md" onClick={anadir} className="mt-6">
            <Plus size={16} aria-hidden="true" />
            Añadir
          </Button>
        </div>
      </div>
    </div>
  );
}
