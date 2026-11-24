"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Pencil, RotateCcw } from "lucide-react";
import { sonidoTap, sonidoExito } from "@/lib/sonido";
import { vibrarTap, vibrarExito } from "@/lib/haptica";

export interface PropsFilaDeslizable {
  children: React.ReactNode;
  onBorrar: () => void;
  onAccionDerecha?: () => void;
  nombreElemento?: string;
  etiquetaBorrar?: string;
  etiquetaDerecha?: string;
  desactivado?: boolean;
  tiempoDeshacerMs?: number;
  className?: string;
}

export const UMBRAL_SWIPE_PX = 72;
export const TOPE_MAX_SWIPE_PX = 130;

/**
 * Fila táctil con microinteracciones de deslizamiento ultrasuaves (60/120 fps).
 * - Aceleración por hardware con translate3d y will-change: transform.
 * - Fondos de acción estáticos en capas inferiores (cero layout reflow por width).
 * - touch-action: pan-y para permitir scroll vertical nativo sin mover la pantalla horizontalmente.
 * - Soporte dual: gestos táctiles (móvil) y arrastre con ratón (escritorio con supresión de click).
 * - Liquid Delete con resistencia elástica (rubber-band) e Inline Undo con cuenta atrás.
 * - Swipe to Edit hacia la derecha y Peek Hint elástico al soltar antes del umbral.
 */
export function FilaDeslizable({
  children,
  onBorrar,
  onAccionDerecha,
  nombreElemento = "elemento",
  etiquetaBorrar = "Quitar",
  etiquetaDerecha = "Editar",
  desactivado = false,
  tiempoDeshacerMs = 4200,
  className = "",
}: PropsFilaDeslizable) {
  const [offset, setOffset] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [borradoPendiente, setBorradoPendiente] = useState(false);
  const [msRestantes, setMsRestantes] = useState(tiempoDeshacerMs);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const direccionDetectadaRef = useRef<"horizontal" | "vertical" | null>(null);
  const superadoUmbralRef = useRef(false);
  const haArrastradoRef = useRef(false);
  const timerBorradoRef = useRef<NodeJS.Timeout | null>(null);
  const intervaloProgresoRef = useRef<NodeJS.Timeout | null>(null);
  const onBorrarRef = useRef(onBorrar);
  const offsetRef = useRef(offset);
  useEffect(() => {
    onBorrarRef.current = onBorrar;
    offsetRef.current = offset;
  });

  // Limpiar temporizadores al desmontar y asegurar el borrado si quedó pendiente
  useEffect(() => {
    return () => {
      if (timerBorradoRef.current) {
        clearTimeout(timerBorradoRef.current);
        onBorrarRef.current();
      }
      if (intervaloProgresoRef.current) {
        clearInterval(intervaloProgresoRef.current);
      }
    };
  }, []);

  // Confirmar el borrado tras agotar la cuenta atrás de deshacer
  const confirmarBorrado = useCallback(() => {
    if (timerBorradoRef.current) clearTimeout(timerBorradoRef.current);
    if (intervaloProgresoRef.current) clearInterval(intervaloProgresoRef.current);
    timerBorradoRef.current = null;
    intervaloProgresoRef.current = null;
    setBorradoPendiente(false);
    onBorrar();
  }, [onBorrar]);

  // Iniciar el estado de Inline Undo
  const iniciarInlineUndo = useCallback(() => {
    sonidoExito();
    vibrarExito();
    setOffset(0);
    setArrastrando(false);
    setBorradoPendiente(true);
    setMsRestantes(tiempoDeshacerMs);

    const inicio = Date.now();
    intervaloProgresoRef.current = setInterval(() => {
      const transcurrido = Date.now() - inicio;
      const queda = Math.max(0, tiempoDeshacerMs - transcurrido);
      setMsRestantes(queda);
      if (queda <= 0 && intervaloProgresoRef.current) {
        clearInterval(intervaloProgresoRef.current);
      }
    }, 100);

    timerBorradoRef.current = setTimeout(() => {
      confirmarBorrado();
    }, tiempoDeshacerMs);
  }, [tiempoDeshacerMs, confirmarBorrado]);

  // Cancelar el borrado y restaurar la fila
  const cancelarDeshacer = () => {
    sonidoTap();
    vibrarTap();
    if (timerBorradoRef.current) clearTimeout(timerBorradoRef.current);
    if (intervaloProgresoRef.current) clearInterval(intervaloProgresoRef.current);
    timerBorradoRef.current = null;
    intervaloProgresoRef.current = null;
    setBorradoPendiente(false);
    setOffset(0);
  };

  // Terminar el arrastre y evaluar umbrales con rebote suave
  const finalizarArrastre = useCallback(() => {
    if (desactivado || !arrastrando || borradoPendiente) return;
    setArrastrando(false);

    const currentOffset = offsetRef.current;
    if (currentOffset <= -UMBRAL_SWIPE_PX) {
      iniciarInlineUndo();
    } else if (onAccionDerecha && currentOffset >= UMBRAL_SWIPE_PX) {
      sonidoExito();
      vibrarExito();
      setOffset(0);
      onAccionDerecha();
    } else {
      setOffset(0);
    }
  }, [desactivado, arrastrando, borradoPendiente, iniciarInlineUndo, onAccionDerecha]);

  // Soporte de ratón para escritorio
  useEffect(() => {
    if (!arrastrando) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      if (Math.abs(deltaX) > 4) {
        haArrastradoRef.current = true;
      }

      const factorResistencia = 1 / (1 + Math.abs(deltaX) / 240);
      const offsetResistido = deltaX * factorResistencia;
      const offsetLimitado = Math.max(
        -TOPE_MAX_SWIPE_PX,
        Math.min(TOPE_MAX_SWIPE_PX, offsetResistido)
      );

      const sobrepasaIzquierda = offsetLimitado <= -UMBRAL_SWIPE_PX;
      const sobrepasaDerecha = onAccionDerecha && offsetLimitado >= UMBRAL_SWIPE_PX;

      if ((sobrepasaIzquierda || sobrepasaDerecha) && !superadoUmbralRef.current) {
        superadoUmbralRef.current = true;
        vibrarTap();
      } else if (!sobrepasaIzquierda && !sobrepasaDerecha && superadoUmbralRef.current) {
        superadoUmbralRef.current = false;
      }

      setOffset(offsetLimitado);
    };

    const handleMouseUp = () => {
      finalizarArrastre();
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastrando, finalizarArrastre, onAccionDerecha]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (desactivado || borradoPendiente) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    haArrastradoRef.current = false;
    direccionDetectadaRef.current = "horizontal";
    superadoUmbralRef.current = false;
    setArrastrando(true);
  };

  // Gestión de gestos táctiles optimizada (móvil)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (desactivado || borradoPendiente) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    haArrastradoRef.current = false;
    direccionDetectadaRef.current = null;
    superadoUmbralRef.current = false;
    setArrastrando(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (desactivado || !arrastrando || borradoPendiente) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    // Detectar dirección una sola vez al inicio del movimiento
    if (!direccionDetectadaRef.current) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        // El usuario está haciendo scroll vertical: abortar swipe y no interferir
        direccionDetectadaRef.current = "vertical";
        setArrastrando(false);
        setOffset(0);
        return;
      }
      if (Math.abs(deltaX) > 8) {
        direccionDetectadaRef.current = "horizontal";
        haArrastradoRef.current = true;
      }
    }

    if (direccionDetectadaRef.current !== "horizontal") return;

    // Resistencia elástica tipo muelle (Rubber band)
    const factorResistencia = 1 / (1 + Math.abs(deltaX) / 240);
    const offsetResistido = deltaX * factorResistencia;
    const offsetLimitado = Math.max(
      -TOPE_MAX_SWIPE_PX,
      Math.min(TOPE_MAX_SWIPE_PX, offsetResistido)
    );

    const sobrepasaIzquierda = offsetLimitado <= -UMBRAL_SWIPE_PX;
    const sobrepasaDerecha = onAccionDerecha && offsetLimitado >= UMBRAL_SWIPE_PX;

    if ((sobrepasaIzquierda || sobrepasaDerecha) && !superadoUmbralRef.current) {
      superadoUmbralRef.current = true;
      vibrarTap();
    } else if (!sobrepasaIzquierda && !sobrepasaDerecha && superadoUmbralRef.current) {
      superadoUmbralRef.current = false;
    }

    setOffset(offsetLimitado);
  };

  const handleTouchEnd = () => {
    finalizarArrastre();
  };

  // Interceptar clics accidentales si el usuario estaba arrastrando
  const handleClickCapture = (e: React.MouseEvent) => {
    if (haArrastradoRef.current) {
      e.stopPropagation();
      e.preventDefault();
      haArrastradoRef.current = false;
    }
  };

  // Proporciones fluidas para escalado de iconos (acelerado por hardware)
  const ratioIzquierda = Math.min(1, Math.max(0, -offset / UMBRAL_SWIPE_PX));
  const ratioDerecha = Math.min(1, Math.max(0, offset / UMBRAL_SWIPE_PX));
  const escalaIconoBorrar = offset <= -UMBRAL_SWIPE_PX ? 1.2 : 0.8 + ratioIzquierda * 0.35;
  const escalaIconoDerecha = offset >= UMBRAL_SWIPE_PX ? 1.2 : 0.8 + ratioDerecha * 0.35;

  // Si está en Inline Undo, renderizar la barra interactiva de deshacer
  if (borradoPendiente) {
    const porcentajeProgreso = Math.max(0, Math.min(100, (msRestantes / tiempoDeshacerMs) * 100));

    return (
      <div
        className={`relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2 text-xs transition-all animate-fadeIn ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Trash2 size={14} className="shrink-0 text-danger animate-bounce" />
          <span className="truncate text-ink font-medium">
            Se quitó <strong className="font-bold">{nombreElemento}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={cancelarDeshacer}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-surface px-2.5 py-1 text-2xs font-bold text-accent shadow-2xs hover:bg-accent-soft active:scale-95 transition cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Deshacer</span>
          </button>
        </div>
        {/* Barra de progreso de cuenta atrás */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-danger/20">
          <div
            className="h-full bg-danger transition-all ease-linear"
            style={{ width: `${porcentajeProgreso}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden select-none touch-pan-y ${className}`}
      style={{
        overscrollBehaviorX: "contain",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClickCapture={handleClickCapture}
    >
      {/* Fondo subyacente para Swipe to Edit (Derecha) - Capa fija sin reflow */}
      {onAccionDerecha ? (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full flex items-center bg-accent-soft px-4 text-accent pointer-events-none"
          style={{
            opacity: offset > 0 ? 1 : 0,
            transition: arrastrando ? "none" : "opacity 0.2s ease-out",
          }}
        >
          <div
            className="flex items-center gap-2 font-bold text-xs"
            style={{
              transform: `scale(${escalaIconoDerecha}) translate3d(0, 0, 0)`,
              willChange: "transform",
            }}
          >
            <Pencil size={15} />
            {offset >= UMBRAL_SWIPE_PX ? (
              <span className="text-2xs uppercase tracking-wider">{etiquetaDerecha}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Fondo subyacente para Liquid Delete (Izquierda) - Capa fija sin reflow */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-full flex items-center justify-end bg-danger/15 px-4 text-danger pointer-events-none"
        style={{
          opacity: offset < 0 ? 1 : 0,
          transition: arrastrando ? "none" : "opacity 0.2s ease-out",
        }}
      >
        <div
          className="flex items-center gap-2 font-bold text-xs"
          style={{
            transform: `scale(${escalaIconoBorrar}) translate3d(0, 0, 0)`,
            willChange: "transform",
          }}
        >
          {offset <= -UMBRAL_SWIPE_PX ? (
            <span className="text-2xs uppercase tracking-wider font-extrabold">{etiquetaBorrar}</span>
          ) : null}
          <Trash2 size={16} />
        </div>
      </div>

      {/* Contenido principal deslizante con aceleración por capas GPU */}
      <div
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: arrastrando
            ? "none"
            : "transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)",
          willChange: "transform",
        }}
        className="relative z-10 w-full bg-surface"
      >
        {children}
      </div>
    </div>
  );
}
