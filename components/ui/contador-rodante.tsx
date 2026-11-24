"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useMovimientoReducido } from "@/lib/use-movimiento";
import { descomponerNumero } from "@/lib/contador";

// Carrete continuo de dígitos de 0 a 9 más un 0 al final (índice 10)
// para permitir rollovers fluidos hacia delante (7 -> 0, 9 -> 0) y hacia atrás (0 -> 7, 0 -> 9).
const DIGITOS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

type PropsContadorRodante = {
  /** Valor numérico a mostrar. */
  valor: number;
  /** Función opcional para dar formato al número (p.ej. conComa). */
  formateador?: (n: number) => string;
  /** Duración de la animación en milisegundos (por defecto 450ms). */
  duracionMs?: number;
  /** Clases CSS adicionales para el contenedor. */
  className?: string;
};

/**
 * Columna individual de un dígito animado estilo Rare UI / Odómetro físico.
 * Utiliza un carrete continuo con aceleración por hardware que rueda suavemente
 * hacia arriba cuando se suma y hacia abajo cuando se resta, sincronizando rollovers (7->0 y 0->7).
 */
function ColumnaDigito({
  digito,
  direccion,
  duracionMs,
  retrasoMs,
  reducido,
}: {
  digito: number;
  direccion: "sube" | "baja";
  duracionMs: number;
  retrasoMs: number;
  reducido: boolean;
}) {
  const [posicion, setPosicion] = useState(digito);
  const [sinTransicion, setSinTransicion] = useState(false);
  const previoRef = useRef(digito);

  useEffect(() => {
    if (digito === previoRef.current) return;

    const actual = previoRef.current;
    previoRef.current = digito;

    if (reducido) {
      queueMicrotask(() => {
        setPosicion(digito);
        setSinTransicion(true);
      });
      return;
    }

    if (direccion === "sube" && digito < actual) {
      // Rollover hacia arriba: p.ej. 7 -> 0 (o 5 -> 0, o 9 -> 0).
      // Rueda hacia delante hasta la posición 10 (que muestra '0')
      setSinTransicion(false);
      setPosicion(10);
      const timer = setTimeout(() => {
        // Al terminar el giro, salta instantáneamente a la posición 0 sin animación
        setSinTransicion(true);
        setPosicion(0);
      }, duracionMs + retrasoMs + 40);
      return () => clearTimeout(timer);
    }

    if (direccion === "baja" && digito > actual) {
      // Rollover hacia abajo: p.ej. 0 -> 7 (o 0 -> 5, o 0 -> 9).
      // Salta instantáneamente a la posición 10 sin animación
      setSinTransicion(true);
      setPosicion(10);
      const timer = setTimeout(() => {
        // En el siguiente ciclo de render, rueda hacia abajo hasta la posición deseada
        setSinTransicion(false);
        setPosicion(digito);
      }, 20);
      return () => clearTimeout(timer);
    }

    // Movimiento normal dentro de 0..9
    setSinTransicion(false);
    setPosicion(digito);
  }, [digito, direccion, duracionMs, retrasoMs, reducido]);

  return (
    <span
      className="relative inline-block h-[1.15em] overflow-hidden align-baseline tabular-nums leading-[1.15em]"
      aria-hidden="true"
    >
      <span
        className="flex flex-col will-change-transform"
        style={{
          transform: `translateY(-${posicion * 1.15}em)`,
          transitionProperty: sinTransicion || reducido ? "none" : "transform",
          transitionDuration: sinTransicion || reducido ? "0ms" : `${duracionMs}ms`,
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: sinTransicion || reducido ? "0ms" : `${retrasoMs}ms`,
        }}
      >
        {DIGITOS.map((d, i) => (
          <span
            key={i}
            className="flex h-[1.15em] items-center justify-center leading-[1.15em]"
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Contador numérico rodante estilo Rare UI / Odómetro físico.
 *
 * Muestra las cifras deslizándose suavemente con números tabulares estables.
 * Sincroniza la dirección de giro (arriba al sumar, abajo al restar) al instante.
 */
export function ContadorRodante({
  valor,
  formateador,
  duracionMs = 450,
  className = "",
}: PropsContadorRodante) {
  const idUnico = useId();
  const reducido = useMovimientoReducido();

  // Detectar la dirección del cambio numérico global inmediatamente en render
  const [prevValor, setPrevValor] = useState(valor);
  const [direccion, setDireccion] = useState<"sube" | "baja">("sube");

  if (prevValor !== valor) {
    setDireccion(valor < prevValor ? "baja" : "sube");
    setPrevValor(valor);
  }

  const { texto, elementos } = descomponerNumero(valor, formateador);

  return (
    <span
      role="text"
      aria-label={texto}
      className={`inline-flex items-baseline font-bold tabular-nums ${className}`}
    >
      {elementos.map((elem) => {
        if (elem.tipo === "simbolo") {
          return (
            <span
              key={`${idUnico}-${elem.clave}`}
              className="inline-block leading-[1.15em] select-none"
              aria-hidden="true"
            >
              {elem.caracter}
            </span>
          );
        }

        return (
          <ColumnaDigito
            key={`${idUnico}-${elem.clave}`}
            digito={elem.valor}
            direccion={direccion}
            duracionMs={duracionMs}
            retrasoMs={elem.retrasoMs}
            reducido={reducido}
          />
        );
      })}
    </span>
  );
}
