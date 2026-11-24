"use client";

import { useSyncExternalStore } from "react";
import { entradaQuitada, suscribirEntrada } from "./entrada";

/**
 * `false` mientras la cortina de carga tapa la app y `true` cuando ya se ha
 * ido. En el servidor siempre es `false`: allí no hay cortina que esperar.
 */
export function useEntradaQuitada(): boolean {
  return useSyncExternalStore(suscribirEntrada, entradaQuitada, () => false);
}
