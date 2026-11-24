"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * El «✓ Guardado» de los botones que guardan algo.
 *
 * Devuelve `[guardado, marcar]`. Al llamar a `marcar()` se enciende durante
 * `ms` milisegundos y se apaga solo. Sirve para que el botón no se limite a
 * apagarse en seco, que parece que no ha pasado nada.
 *
 * Si se vuelve a llamar antes de que se apague, el reloj se reinicia en vez de
 * acumular temporizadores.
 */
export function useGuardado(ms = 1200) {
  const [guardado, setGuardado] = useState(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marcar = useCallback(() => {
    setGuardado(true);
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setGuardado(false), ms);
  }, [ms]);

  useEffect(
    () => () => {
      if (reloj.current) clearTimeout(reloj.current);
    },
    [],
  );

  return [guardado, marcar] as const;
}
