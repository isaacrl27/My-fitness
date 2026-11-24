"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { IconButton } from "@/components/ui/button";

/**
 * El campo de la clave, con un ojito para leerla.
 *
 * Va aparte porque la página de entrar es del servidor y el ojito necesita
 * acordarse de si está enseñada o escondida. Al alternar no se pierde lo
 * escrito: el valor se queda dentro del propio input del navegador.
 */
export function CampoClave({ error = false }: { error?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="clave" className="text-sm font-semibold text-ink">
        Clave proporcionada por Isaac
      </label>
      <div className="relative">
        <input
          id="clave"
          name="clave"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Escribe aquí la clave de Isaac"
          required
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "fallo-clave" : undefined}
          className={[
            "h-12 w-full rounded-md bg-bg pl-3 pr-12 text-base text-ink",
            "border placeholder:text-muted/60",
            "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            error ? "border-danger" : "border-border-input",
          ].join(" ")}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          <IconButton
            label={visible ? "Esconder la clave" : "Ver la clave"}
            size="sm"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
