"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { sonidoTap, sonidoCheck } from "@/lib/sonido";
import { vibrarTap } from "@/lib/haptica";

export const UMBRAL_TIRON_CORDON_PX = 18;
export const LONGITUD_BASE_CORDON_PX = 32;
export const TOPE_MAX_CORDON_PX = 68;

export interface PropsContenedorLoginIluminado {
  children: React.ReactNode;
  className?: string;
}

/**
 * Cálculo de resistencia elástica 2D para la cuerda del ventilador durante el arrastre.
 */
export function calcularDesplazamientoCordon(dx: number, dy: number): { x: number; y: number } {
  const factorX = 1 / (1 + Math.abs(dx) / 75);
  const x = Math.max(-50, Math.min(50, dx * factorX));

  const factorY = dy > 0 ? 1 / (1 + dy / 100) : 1 / (1 + Math.abs(dy) / 40);
  const extensionY = dy * factorY;
  const y = Math.max(14, Math.min(TOPE_MAX_CORDON_PX, LONGITUD_BASE_CORDON_PX + extensionY));

  return { x, y };
}

/**
 * Cálculo físico de velocidad con inercia para las aspas del ventilador.
 * - Al encender: aceleración suave hasta velocidad de crucero (~700ms).
 * - Al apagar: deceleración gradual con resistencia aerodinámica y de rodamientos (~2.2s).
 */
export function calcularPasoRotacionFisica(
  velocidadActual: number,
  luzEncendida: boolean,
  dtMs: number,
  maxVelocidad: number = 360 / 2400
): number {
  const dt = Math.max(0, Math.min(dtMs, 64));
  if (luzEncendida) {
    return Math.min(maxVelocidad, velocidadActual + (maxVelocidad / 700) * dt);
  }
  const arrastre = 0.0007;
  const rozamiento = 0.000035;
  return Math.max(0, velocidadActual * (1 - arrastre * dt) - rozamiento * dt);
}

/**
 * Pantalla de acceso interactiva con Ventilador de Techo Nórdico 3D (Tripala de nogal macizo esculpido)
 * y Cordón Elástico con física de muelle armónico y detección Pointer Events ultra-sensible (Vídeo 4).
 *
 * Optimizado para rendimiento extremo en móviles (60 / 120 FPS):
 * - Cero filtros SVG en tiempo real sobre elementos animados (elimina cuellos de botella CPU).
 * - Rotación acelerada directamente por hardware GPU (translate3d + backface-visibility: hidden).
 * - Manipulación directa del DOM en arrastre y muelle del cordón (cero re-renders de React durante el movimiento).
 * - Sombra proyectada radial fija para volumen sin penalización de repintado.
 */
export function ContenedorLoginIluminado({
  children,
  className = "",
}: PropsContenedorLoginIluminado) {
  const [luzEncendida, setLuzEncendida] = useState(false);

  const startPointRef = useRef({ x: 0, y: 0 });
  const posicionRef = useRef({ x: 0, y: LONGITUD_BASE_CORDON_PX });
  const arrastrandoRef = useRef(false);
  const superadoUmbralRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);

  // Referencias DOM directas para arrastre y físicas del cordón a 60/120 fps sin re-renders de React
  const cordonPathRef = useRef<SVGPathElement>(null);
  const anillaRef = useRef<HTMLDivElement>(null);

  const actualizarVisualCordon = useCallback((x: number, y: number) => {
    const cx = x * 0.45;
    const cy = y * 0.72;
    const dCurva = `M 0,0 Q ${cx.toFixed(1)},${cy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    if (cordonPathRef.current) {
      cordonPathRef.current.setAttribute("d", dCurva);
    }
    if (anillaRef.current) {
      anillaRef.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }, []);

  // Física de rotación continua e inercia de frenado gradual de aspas
  const luzEncendidaRef = useRef(luzEncendida);
  useEffect(() => {
    luzEncendidaRef.current = luzEncendida;
  }, [luzEncendida]);

  const rotorRef = useRef<HTMLDivElement>(null);
  const anguloRef = useRef(15);
  const velocidadRef = useRef(0);
  const animRotacionIdRef = useRef<number | null>(null);
  const ultimoTiempoRef = useRef<number | null>(null);

  useEffect(() => {
    if (rotorRef.current && animRotacionIdRef.current === null) {
      rotorRef.current.style.transform = `translate3d(0, 0, 0) rotate(${anguloRef.current.toFixed(2)}deg)`;
    }

    const pasoRotacion = (timestamp: number) => {
      if (ultimoTiempoRef.current === null) {
        ultimoTiempoRef.current = timestamp;
      }
      const dt = Math.min(timestamp - ultimoTiempoRef.current, 40);
      ultimoTiempoRef.current = timestamp;

      velocidadRef.current = calcularPasoRotacionFisica(
        velocidadRef.current,
        luzEncendidaRef.current,
        dt
      );

      anguloRef.current = (anguloRef.current + velocidadRef.current * dt) % 360;

      if (rotorRef.current) {
        rotorRef.current.style.transform = `translate3d(0, 0, 0) rotate(${anguloRef.current.toFixed(2)}deg)`;
      }

      if (luzEncendidaRef.current || velocidadRef.current > 0) {
        animRotacionIdRef.current = requestAnimationFrame(pasoRotacion);
      } else {
        animRotacionIdRef.current = null;
        ultimoTiempoRef.current = null;
      }
    };

    if (animRotacionIdRef.current === null && (luzEncendida || velocidadRef.current > 0)) {
      ultimoTiempoRef.current = null;
      animRotacionIdRef.current = requestAnimationFrame(pasoRotacion);
    }
  }, [luzEncendida]);

  useEffect(() => {
    return () => {
      if (animRotacionIdRef.current !== null) {
        cancelAnimationFrame(animRotacionIdRef.current);
        animRotacionIdRef.current = null;
      }
    };
  }, []);

  // Detener la animación de resorte en curso
  const detenerAnimacionMuelle = useCallback(() => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  }, []);

  // Animación física de muelle (Spring Physics con oscilación armónica amortiguada en 2D)
  const iniciarReboteResorte = useCallback(
    (startX: number, startY: number, initialVy: number = 0) => {
      detenerAnimacionMuelle();

      let x = startX;
      let y = startY;
      let vx = 0;
      let vy = initialVy;
      const targetX = 0;
      const targetY = LONGITUD_BASE_CORDON_PX;
      const k = 0.22;
      const damping = 0.82;

      const pasoFisica = () => {
        const fx = -k * (x - targetX) - (1 - damping) * vx;
        const fy = -k * (y - targetY) - (1 - damping) * vy;

        vx += fx;
        vy += fy;
        x += vx;
        y += vy;

        if (
          Math.abs(x - targetX) < 0.25 &&
          Math.abs(y - targetY) < 0.25 &&
          Math.abs(vx) < 0.25 &&
          Math.abs(vy) < 0.25
        ) {
          posicionRef.current = { x: targetX, y: targetY };
          actualizarVisualCordon(targetX, targetY);
          animFrameIdRef.current = null;
          return;
        }

        posicionRef.current = { x, y };
        actualizarVisualCordon(x, y);
        animFrameIdRef.current = requestAnimationFrame(pasoFisica);
      };

      animFrameIdRef.current = requestAnimationFrame(pasoFisica);
    },
    [actualizarVisualCordon, detenerAnimacionMuelle]
  );

  // Conmutar el ventilador y la luz con chasquido y vibración
  const dispararTiron = useCallback(() => {
    sonidoCheck();
    vibrarTap();
    setLuzEncendida((prev) => !prev);
    iniciarReboteResorte(posicionRef.current.x, posicionRef.current.y, -6);
  }, [iniciarReboteResorte]);

  // Procesar arrastre elástico
  const procesarMovimiento = useCallback(
    (clientX: number, clientY: number) => {
      if (!arrastrandoRef.current) return;

      const dx = clientX - startPointRef.current.x;
      const dy = clientY - startPointRef.current.y;

      const pos = calcularDesplazamientoCordon(dx, dy);

      const deltaY = pos.y - LONGITUD_BASE_CORDON_PX;
      if (deltaY >= UMBRAL_TIRON_CORDON_PX && !superadoUmbralRef.current) {
        superadoUmbralRef.current = true;
        vibrarTap();
      } else if (deltaY < UMBRAL_TIRON_CORDON_PX && superadoUmbralRef.current) {
        superadoUmbralRef.current = false;
      }

      posicionRef.current = pos;
      actualizarVisualCordon(pos.x, pos.y);
    },
    [actualizarVisualCordon]
  );

  // Controladores unificados Pointer Events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    detenerAnimacionMuelle();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si no está soportado
    }
    startPointRef.current = { x: e.clientX, y: e.clientY };
    arrastrandoRef.current = true;
    superadoUmbralRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrandoRef.current) return;
    procesarMovimiento(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrandoRef.current) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignorar si ya fue liberado
    }
    arrastrandoRef.current = false;

    const dx = e.clientX - startPointRef.current.x;
    const dy = e.clientY - startPointRef.current.y;
    const totalMovement = Math.hypot(dx, dy);
    const deltaY = posicionRef.current.y - LONGITUD_BASE_CORDON_PX;

    if (deltaY >= UMBRAL_TIRON_CORDON_PX || totalMovement < 8) {
      dispararTiron();
    } else {
      sonidoTap();
      iniciarReboteResorte(posicionRef.current.x, posicionRef.current.y, 0);
    }

    superadoUmbralRef.current = false;
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      detenerAnimacionMuelle();
    };
  }, [detenerAnimacionMuelle]);

  return (
    <div
      className={`relative min-h-dvh w-full overflow-x-hidden transition-colors duration-700 select-none ${
        luzEncendida
          ? "bg-[#0e0e11] text-zinc-100"
          : "bg-[#08080a] text-zinc-400"
      } ${className}`}
    >
      {/* Halo ambiental difuso de luz cálida acelerado en GPU */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 ease-out ${
          luzEncendida ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(ellipse 95% 75% at 50% 20%, rgba(251, 191, 36, 0.28) 0%, rgba(245, 158, 11, 0.12) 45%, rgba(14, 14, 17, 0.95) 85%)",
          willChange: "opacity",
          transform: "translateZ(0)",
        }}
      />

      {/* Sombra proyectada volumétrica fija bajo el ventilador (cero coste de repintado GPU) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-15 rounded-full"
        style={{
          top: "40px",
          width: "280px",
          height: "100px",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* Cabezal de Techo con Ventilador Nórdico RECTO y centrado en perspectiva 3D (Vídeo 4) */}
      <header
        className="relative z-30 mx-auto flex w-full max-w-[430px] flex-col items-center pt-0 pointer-events-none select-none h-[175px]"
        style={{
          perspective: "850px",
          perspectiveOrigin: "50% 25%",
        }}
      >
        <div className="relative w-[350px] h-[175px] pointer-events-none [transform-style:preserve-3d]">
          {/* Eje de hierro vertical fijo (Roseta -> Tija metálica -> Cuello motor encastrado) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-25 pointer-events-none">
            {/* Roseta anclada al techo */}
            <div
              className="w-[46px] h-[22px] rounded-b-[14px] border border-zinc-700/80 border-t-0 shadow-[0_8px_18px_rgba(0,0,0,0.85)]"
              style={{
                background: "radial-gradient(circle at 50% 120%, #0d0d10 0%, #222226 65%, #141416 100%)",
              }}
            />
            {/* Tija metálica vertical con reflejos cilíndricos */}
            <div
              className="w-[10px] h-[46px]"
              style={{
                background: "linear-gradient(90deg, #121215 0%, #4a4a52 45%, #27272c 80%, #0d0d10 100%)",
                boxShadow: "inset 1px 0 2px rgba(255,255,255,0.18), inset -1px 0 2px rgba(0,0,0,0.85)",
              }}
            />
            {/* Cuello del motor encastrado directamente dentro del rotor de madera maciza */}
            <div
              className="w-[24px] h-[14px] rounded-[5px_5px_2px_2px] border border-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.8)] -mb-1"
              style={{
                background: "linear-gradient(180deg, #3f3f46 0%, #1c1c20 60%, #0d0d10 100%)",
              }}
            />
          </div>

          {/* Conjunto 3D del rotor de madera con 3 aspas en plano horizontal RECTO y centrado (rotateX: 58deg) */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              top: "76px",
              left: "50%",
              width: "350px",
              height: "350px",
              marginLeft: "-175px",
              marginTop: "-175px",
              transform: "rotateX(58deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Rotor con 3 aspas de nogal esculpidas (acelerado 100% en GPU a 60/120 fps) */}
            <div
              ref={rotorRef}
              id="rotor-giratorio"
              className="absolute inset-0"
              style={{
                transformOrigin: "175px 175px",
                transformStyle: "preserve-3d",
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
            >
              <svg
                viewBox="-175 -175 350 350"
                width="350"
                height="350"
                className="overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  {/* Gradiente de madera de nogal macizo */}
                  <linearGradient id="walnutGrad" x1="0%" y1="0%" x2="100%" y2="40%">
                    <stop offset="0%" stopColor="#341407" />
                    <stop offset="18%" stopColor="#54230b" />
                    <stop offset="42%" stopColor="#7c3611" />
                    <stop offset="65%" stopColor="#9a4718" />
                    <stop offset="85%" stopColor="#6e2d0d" />
                    <stop offset="100%" stopColor="#321305" />
                  </linearGradient>

                  {/* Reflejo biselado de la talla de madera maciza */}
                  <linearGradient id="bevelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
                    <stop offset="40%" stopColor="transparent" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
                  </linearGradient>

                  {/* Veta longitudinal tallada */}
                  <linearGradient id="grainStreak" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(0,0,0,0.2)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
                  </linearGradient>
                </defs>

                {/* 3 Aspas estilizadas esculpidas en madera noble */}
                <g>
                  {/* Aspa 1 (0°) */}
                  <g transform="rotate(0)">
                    <path
                      d="M 18,-10 C 40,-13 85,-28 140,-26 C 172,-25 188,-10 184,5 C 180,20 152,26 102,23 C 55,20 28,12 18,10 Z"
                      fill="url(#walnutGrad)"
                      stroke="#260d03"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 18,-10 C 40,-13 85,-28 140,-26 C 172,-25 188,-10 184,5 C 180,20 152,26 102,23 C 55,20 28,12 18,10 Z"
                      fill="url(#bevelGrad)"
                    />
                    <path
                      d="M 22,-2 C 60,-8 115,-10 170,-2"
                      fill="none"
                      stroke="url(#grainStreak)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.65"
                    />
                  </g>

                  {/* Aspa 2 (120°) */}
                  <g transform="rotate(120)">
                    <path
                      d="M 18,-10 C 40,-13 85,-28 140,-26 C 172,-25 188,-10 184,5 C 180,20 152,26 102,23 C 55,20 28,12 18,10 Z"
                      fill="url(#walnutGrad)"
                      stroke="#260d03"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 18,-10 C 40,-13 85,-28 140,-26 C 172,-25 188,-10 184,5 C 180,20 152,26 102,23 C 55,20 28,12 18,10 Z"
                      fill="url(#bevelGrad)"
                    />
                    <path
                      d="M 22,-2 C 60,-8 115,-10 170,-2"
                      fill="none"
                      stroke="url(#grainStreak)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.65"
                    />
                  </g>

                  {/* Aspa 3 (240°) */}
                  <g transform="rotate(240)">
                    <path
                      d="M 18,-10 C 40,-13 85,-28 140,-26 C 172,-25 188,-10 184,5 C 180,20 152,26 102,23 C 55,20 28,12 18,10 Z"
                      fill="url(#walnutGrad)"
                      stroke="#260d03"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M 18,-10 C 40,-13 85,-28 140,-26 C 172,-25 188,-10 184,5 C 180,20 152,26 102,23 C 55,20 28,12 18,10 Z"
                      fill="url(#bevelGrad)"
                    />
                    <path
                      d="M 22,-2 C 60,-8 115,-10 170,-2"
                      fill="none"
                      stroke="url(#grainStreak)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.65"
                    />
                  </g>

                  {/* Buje central esculpido en madera maciza que funde las 3 aspas */}
                  <circle cx="0" cy="0" r="34" fill="url(#walnutGrad)" stroke="#260d03" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="28" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1" />
                </g>

                {/* Encastre superior de hierro oscuro que recibe la tija en el corazón de madera */}
                <circle cx="0" cy="0" r="14" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="6" fill="#09090b" />
              </svg>
            </div>
          </div>

          {/* Plafón / Tulipa de luz inferior integrada en la base del buje (100% pasivo, no interactivo) */}
          <div
            aria-hidden="true"
            className="absolute z-35 pointer-events-none left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
            style={{
              top: "80px",
            }}
          >
            {/* Aro de unión bronce oscuro con la madera de nogal */}
            <div
              className="w-[28px] h-[4px] rounded-t-[2px] transition-colors duration-500"
              style={{
                background: "linear-gradient(90deg, #271406 0%, #5c2d12 40%, #78350f 70%, #271406 100%)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2)",
              }}
            />

            {/* Tulipa de vidrio opalino satinado */}
            <div
              className="w-[32px] h-[15px] rounded-b-full border transition-all duration-500 flex flex-col items-center justify-end pb-[1px]"
              style={{
                marginTop: "-1px",
                background: luzEncendida
                  ? "radial-gradient(ellipse at 50% 25%, #ffffff 0%, #fffbeb 30%, #f59e0b 72%, #b45309 100%)"
                  : "radial-gradient(ellipse at 50% 25%, #ffffff 0%, #f8fafc 40%, #e2e8f0 70%, #cbd5e1 100%)",
                borderColor: luzEncendida ? "#fbbf24" : "#94a3b8",
                boxShadow: luzEncendida
                  ? "0 0 24px rgba(245, 158, 11, 0.9), 0 0 10px #fbbf24, inset 0 2px 4px #ffffff"
                  : "0 4px 10px rgba(0,0,0,0.6), inset 0 1px 3px rgba(255,255,255,0.8)",
              }}
            >
              {/* Casquillo / Remate metálico inferior de donde sale la cadena */}
              <div
                className={`w-[6px] h-[3px] rounded-full border transition-colors ${
                  luzEncendida ? "bg-amber-600 border-amber-300" : "bg-zinc-500 border-zinc-400"
                }`}
              />
            </div>
          </div>

          {/* Conjunto de tirador táctil ultra-sensible (Diana de 64x85px) */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Tirar de la cuerda para encender ventilador y luz"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                dispararTiron();
              }
            }}
            style={{
              touchAction: "none",
              top: "98px",
              left: "50%",
              width: "64px",
              height: "85px",
              marginLeft: "-32px",
            }}
            className="absolute z-50 flex flex-col items-center rounded-2xl cursor-grab active:cursor-grabbing pointer-events-auto select-none"
          >
            {/* Ancla superior de la cadena que nace exactamente en el eje */}
            <div className="relative w-full flex flex-col items-center pt-[4px]">
              {/* Cadena dinámica 2D en SVG con actualización directa en DOM */}
              <svg
                className="overflow-visible pointer-events-none"
                style={{ width: "1px", height: "1px" }}
                aria-hidden="true"
              >
                <path
                  ref={cordonPathRef}
                  d={`M 0,0 Q 0,${(LONGITUD_BASE_CORDON_PX * 0.72).toFixed(1)} 0,${LONGITUD_BASE_CORDON_PX}`}
                  fill="none"
                  stroke={luzEncendida ? "#f59e0b" : "#71717a"}
                  strokeWidth="2.2"
                  strokeDasharray="2 3"
                  strokeLinecap="round"
                />
              </svg>

              {/* Anilla / tirador táctil con física armónica y translate3d */}
              <div
                ref={anillaRef}
                style={{
                  transform: `translate3d(0px, ${LONGITUD_BASE_CORDON_PX}px, 0)`,
                  willChange: "transform",
                }}
                className="absolute top-[4px] flex h-10 w-10 -mt-2.5 items-center justify-center pointer-events-none"
              >
                {/* Anilla visible estilizada */}
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors shadow-md ${
                    luzEncendida
                      ? "border-amber-400 bg-amber-500/30 text-amber-300 shadow-amber-500/20"
                      : "border-zinc-500 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full transition-colors ${
                      luzEncendida ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" : "bg-zinc-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pista discreta en pantalla apagada para guiar el primer toque */}
          <p
            aria-hidden="true"
            style={{ top: "194px" }}
            className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-zinc-700/70 bg-zinc-900/75 px-3 py-1 text-xs font-medium tracking-wide text-zinc-300 pointer-events-none select-none transition-opacity duration-300 ${
              luzEncendida ? "opacity-0" : "opacity-100"
            }`}
          >
            Tira del cordón para entrar
          </p>
        </div>
      </header>

      {/* Contenido de la pantalla de acceso («Entra en My Fitness» con candado 100% visible) */}
      <div
        className={`relative z-10 mx-auto transition-opacity duration-500 ease-out ${
          luzEncendida
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none select-none"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
