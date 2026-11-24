"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDatos } from "@/lib/store";
import { marcarEntradaQuitada } from "@/lib/entrada";

/**
 * PANTALLA DE CARGA & ZOOM-THROUGH (ESTILO TWITTER / UBER / NATIVE APP)
 *
 * Opción A (Elección de Isaac):
 * - Literalmente SOLO el logotipo de My Fitness en el centro (cero textos, cero balizas).
 * - Fase 1 (0.0s - 0.5s): Trazado dinámico de alta fidelidad del arco esmeralda y la "M".
 * - Fase 2 (0.5s - 1.0s): Sostenido de héroe nítido y radiante con halo ambiental.
 * - Fase 3 (1.0s - 1.45s): Salida Zoom-Through inmersiva: el logotipo se expande
 *   exponencialmente (scale 22) atravesando la pantalla como si la cámara se sumergiera
 *   en él hacia el dashboard, disolviendo el fondo de forma continua y limpia.
 * - Garantizado: NUNCA se salta la animación por modo ahorro de batería o flags de sistema.
 */
const MINIMO_MS = 1000;
const TOPE_MS = 2200;
const PAUSA_LISTO_MS = 80;
const SALIDA_MS = 460;

export function PantallaCarga() {
  const { listo, estadoNube } = useDatos();
  const [minimoHecho, setMinimoHecho] = useState(false);
  const [topeHecho, setTopeHecho] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [fuera, setFuera] = useState(false);

  // Tiempo mínimo garantizado para ver la cinemática completa y tope por si falla la red
  useEffect(() => {
    if (fuera) return;
    const minimo = setTimeout(() => setMinimoHecho(true), MINIMO_MS);
    const tope = setTimeout(() => setTopeHecho(true), TOPE_MS);
    return () => {
      clearTimeout(minimo);
      clearTimeout(tope);
    };
  }, [fuera]);

  const nubeResuelta = estadoNube !== "desconocido";
  const puedeSalir = !fuera && listo && minimoHecho && (nubeResuelta || topeHecho);
  const toquesPasan = puedeSalir;

  useEffect(() => {
    if (!puedeSalir) return;
    const iniciarSalida = setTimeout(() => setSaliendo(true), PAUSA_LISTO_MS);

    // El contenido de Hoy arranca cuando el zoom ha traspasado el primer tercio
    const avisar = setTimeout(
      marcarEntradaQuitada,
      PAUSA_LISTO_MS + Math.round(SALIDA_MS * 0.35),
    );
    const quitar = setTimeout(() => setFuera(true), PAUSA_LISTO_MS + SALIDA_MS);

    return () => {
      clearTimeout(iniciarSalida);
      clearTimeout(avisar);
      clearTimeout(quitar);
    };
  }, [puedeSalir]);

  // Red de seguridad si la cortina se desmonta a mitad
  useEffect(() => {
    const seguro = setTimeout(
      marcarEntradaQuitada,
      TOPE_MS + PAUSA_LISTO_MS + SALIDA_MS + 200,
    );
    return () => clearTimeout(seguro);
  }, []);

  if (fuera) return null;

  return (
    <AnimatePresence>
      {!saliendo && (
        <motion.div
          role="status"
          aria-label="Cargando la app"
          initial={false}
          exit={{
            opacity: 0,
            transition: {
              duration: 0.38,
              delay: 0.08,
              ease: [0.16, 1, 0.3, 1],
            },
          }}
          className={[
            "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden select-none",
            "bg-[#05070a] text-white",
            toquesPasan ? "pointer-events-none" : "",
          ].join(" ")}
          style={{ willChange: "transform, opacity" }}
        >
          {/* Halo de luz ambiental tenue en penumbra */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5, transition: { duration: 0.38 } }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute w-[min(480px,85vw)] h-[min(480px,85vw)] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.04) 45%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Único Elemento en Pantalla: El Logo Puro con Zoom-Through */}
          <div className="relative flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{
                scale: 22,
                opacity: 0,
                transition: {
                  duration: 0.44,
                  ease: [0.48, 0.15, 0.25, 0.96], // Curva emblemática Twitter/Uber
                },
              }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative w-28 h-28 flex items-center justify-center will-change-transform"
            >
              <svg
                viewBox="0 0 512 512"
                className="w-full h-full overflow-visible"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="logoVerdeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0e5f49" />
                    <stop offset="35%" stopColor="#10b981" />
                    <stop offset="70%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>

                {/* Pista sutil del arco (fondo tenue) */}
                <circle
                  cx="256"
                  cy="256"
                  r="158"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="42"
                  strokeLinecap="round"
                  strokeDasharray="770 222"
                  transform="rotate(-45 256 256)"
                />

                {/* Arco dinámico trazándose con físicas de muelle */}
                <motion.circle
                  cx="256"
                  cy="256"
                  r="158"
                  stroke="url(#logoVerdeGrad)"
                  strokeWidth="42"
                  strokeLinecap="round"
                  strokeDasharray="770 222"
                  transform="rotate(-45 256 256)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 0.75,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />

                {/* Monograma / Pulso "M" central en blanco radiante */}
                <motion.path
                  d="M186 306 V220 L256 288 L326 220 V306"
                  stroke="#ffffff"
                  strokeWidth="34"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="drop-shadow(0 0 12px rgba(52, 211, 153, 0.8))"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.15,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
