"use client";

import React, { useEffect, useRef, useState } from "react";
import { vibrarTap, vibrarCheck, vibrarExito } from "@/lib/haptica";
import { sonidoTap, sonidoCheck, sonidoExito } from "@/lib/sonido";

export interface PropsInputOTP {
  longitud?: number;
  valor: string;
  onChange: (valor: string) => void;
  onCompleto?: (valor: string) => void;
  error?: boolean;
  tipo?: "alfanumerico" | "numerico";
  mascara?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  separadorEn?: number; // ej. 3 para códigos tipo HOG-842 o 123-456
  className?: string;
  ariaLabel?: string;
}

/**
 * Campo de texto especializado para códigos de verificación o PINs (Rare UI / OTP Input).
 * Distribuye los caracteres en casillas táctiles individuales con auto-avance,
 * salto atrás con retroceso, soporte de pegado completo y rebote elástico.
 */
export function InputOTP({
  longitud = 6,
  valor,
  onChange,
  onCompleto,
  error = false,
  tipo = "alfanumerico",
  mascara = false,
  autoFocus = false,
  disabled = false,
  separadorEn,
  className = "",
  ariaLabel = "Código de verificación",
}: PropsInputOTP) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [slotActivo, setSlotActivo] = useState<number>(0);
  const [animandoSlot, setAnimandoSlot] = useState<number | null>(null);

  // Array de caracteres según la longitud fija
  const caracteres = Array.from({ length: longitud }, (_, i) => valor[i] || "");

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (error) {
      sonidoCheck();
      vibrarCheck();
    }
  }, [error]);

  const enfocarSlot = (indice: number) => {
    const idxValido = Math.max(0, Math.min(longitud - 1, indice));
    inputsRef.current[idxValido]?.focus();
    setSlotActivo(idxValido);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, indice: number) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      vibrarTap();

      if (caracteres[indice]) {
        // Borrar el carácter actual
        const nuevo = valor.slice(0, indice) + valor.slice(indice + 1);
        onChange(nuevo);
      } else if (indice > 0) {
        // Si ya estaba vacío, retroceder al anterior y borrarlo
        const nuevo = valor.slice(0, indice - 1) + valor.slice(indice);
        onChange(nuevo);
        enfocarSlot(indice - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && indice > 0) {
      e.preventDefault();
      enfocarSlot(indice - 1);
      return;
    }

    if (e.key === "ArrowRight" && indice < longitud - 1) {
      e.preventDefault();
      enfocarSlot(indice + 1);
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, indice: number) => {
    if (disabled) return;
    const char = e.target.value.slice(-1); // último carácter introducido

    if (!char) return;

    // Validación de tipo
    if (tipo === "numerico" && !/^[0-9]$/.test(char)) return;
    if (tipo === "alfanumerico" && !/^[a-zA-Z0-9]$/.test(char)) return;

    const charFinal = tipo === "alfanumerico" ? char.toUpperCase() : char;
    sonidoTap();
    vibrarTap();

    // Animación de pop en el slot
    setAnimandoSlot(indice);
    setTimeout(() => setAnimandoSlot(null), 200);

    const arrValores = [...caracteres];
    arrValores[indice] = charFinal;
    const nuevoValor = arrValores.join("").slice(0, longitud);
    onChange(nuevoValor);

    // Auto-avanzar al siguiente slot si no es el último
    if (indice < longitud - 1) {
      enfocarSlot(indice + 1);
    }

    // Si se ha completado todo el código
    if (nuevoValor.length === longitud) {
      sonidoExito();
      vibrarExito();
      onCompleto?.(nuevoValor);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pegado = e.clipboardData.getData("text").trim();
    if (!pegado) return;

    // Filtrar caracteres válidos
    const regex = tipo === "numerico" ? /[0-9]/g : /[a-zA-Z0-9]/g;
    const coincidentes = pegado.match(regex);
    if (!coincidentes) return;

    let textoFinal = coincidentes.join("").slice(0, longitud);
    if (tipo === "alfanumerico") textoFinal = textoFinal.toUpperCase();

    sonidoTap();
    vibrarTap();
    onChange(textoFinal);

    // Enfocar el slot correspondiente
    const sigSlot = Math.min(longitud - 1, textoFinal.length);
    enfocarSlot(sigSlot);

    if (textoFinal.length === longitud) {
      sonidoExito();
      vibrarExito();
      onCompleto?.(textoFinal);
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex items-center justify-center gap-2 ${error ? "anim-otp-shake" : ""} ${className}`}
    >
      {caracteres.map((char, idx) => {
        const esActivo = slotActivo === idx;
        const estaLleno = Boolean(char);
        const conPop = animandoSlot === idx;

        return (
          <React.Fragment key={idx}>
            {separadorEn && idx === separadorEn ? (
              <span className="text-muted/60 font-bold select-none px-0.5 text-base">−</span>
            ) : null}
            <div
              className={`relative flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-xl border bg-surface text-center font-mono text-lg sm:text-xl font-bold shadow-2xs transition-all duration-200
                ${conPop ? "scale-110" : "scale-100"}
                ${error
                  ? "border-danger bg-danger/5 text-danger ring-2 ring-danger/30"
                  : esActivo
                  ? "border-accent ring-2 ring-accent/40 bg-accent-soft/30 text-ink scale-[1.04]"
                  : estaLleno
                  ? "border-border text-ink bg-surface-raised/60"
                  : "border-border text-muted/40"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text hover:border-accent/60"}
              `}
              onClick={() => !disabled && enfocarSlot(idx)}
            >
              <input
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type="text"
                inputMode={tipo === "numerico" ? "numeric" : "text"}
                maxLength={1}
                value={mascara && char ? "●" : char}
                disabled={disabled}
                onChange={(e) => handleChange(e, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onFocus={() => setSlotActivo(idx)}
                onPaste={handlePaste}
                aria-label={`Dígito ${idx + 1} de ${longitud}`}
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              />
              <span className="select-none pointer-events-none">
                {mascara && char ? "●" : char || (esActivo ? <span className="animate-pulse text-accent">|</span> : "·")}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
