"use client";

import { useEffect, useRef } from "react";
import { apilarModal, cerrarModalSuperior } from "./pila-modales";
import { esAppNativa } from "./salud-nativa";

export interface OpcionesModal {
  abierto: boolean;
  onCerrar?: () => void;
  bloquearScroll?: boolean;
}

/**
 * Hook universal para modales, hojas emergentes y diálogos en la app.
 *
 * Delega en `pila-modales.ts` para garantizar comportamiento LIFO real:
 * 1. Bloqueo de scroll con contador de referencias (nunca se queda atascado
 *    `overflow: hidden` al apilar `Confirmar` sobre otro diálogo).
 * 2. Tecla `Escape` global y botón atrás físico/gestual de Android (Capacitor):
 *    cierran exclusivamente la ventana situada arriba del todo.
 * 3. Trampa de foco `Tab` / `Shift+Tab` en el diálogo activo y restauración
 *    limpia del foco al elemento que abrió la ventana.
 */
export function useBloqueoModal({
  abierto,
  onCerrar,
  bloquearScroll = true,
}: OpcionesModal) {
  const onCerrarRef = useRef(onCerrar);
  const registroRef = useRef<ReturnType<typeof apilarModal> | null>(null);

  useEffect(() => {
    onCerrarRef.current = onCerrar;
    registroRef.current?.actualizarOnCerrar(
      onCerrar ? () => onCerrarRef.current?.() : undefined,
    );
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto || typeof document === "undefined") return;

    const previoFocus = document.activeElement as HTMLElement | null;

    const registro = apilarModal({
      onCerrar: onCerrarRef.current ? () => onCerrarRef.current?.() : undefined,
      bloquearScroll,
    });
    registroRef.current = registro;

    // Botón atrás en app nativa Android (Capacitor): delega en la cima de la pila
    let removerNativo: (() => void) | null = null;
    if (esAppNativa() && typeof window !== "undefined") {
      const cap = (window as unknown as {
        Capacitor?: {
          Plugins?: {
            App?: {
              addListener?: (
                event: string,
                handler: (data: { canGoBack: boolean }) => void,
              ) => Promise<{ remove: () => void }>;
            };
          };
        };
      }).Capacitor;

      cap?.Plugins?.App?.addListener?.("backButton", () => {
        cerrarModalSuperior();
      })?.then((h) => {
        removerNativo = () => h?.remove?.();
      });
    }

    return () => {
      registro.desapilar();
      if (registroRef.current === registro) {
        registroRef.current = null;
      }
      removerNativo?.();
      if (previoFocus && previoFocus.isConnected) {
        previoFocus.focus?.();
      }
    };
  }, [abierto, bloquearScroll]);
}
