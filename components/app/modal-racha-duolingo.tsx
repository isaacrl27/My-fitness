"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flame, Sparkles, X, ShieldCheck } from "lucide-react";
import { sonidoCelebracion, sonidoExito, sonidoTap } from "@/lib/sonido";
import { vibrarCelebracion, vibrarCheck, vibrarTap } from "@/lib/haptica";
import { useBloqueoModal } from "@/lib/use-modal";

interface ModalRachaDuolingoProps {
  abierto: boolean;
  onCerrar: () => void;
  racha: number;
  nombre?: string;
  diasActivosSemana?: boolean[]; // 7 booleanos L-D
}

const DIAS_LETRAS = ["L", "M", "X", "J", "V", "S", "D"];

export function ModalRachaDuolingo({
  abierto,
  onCerrar,
  racha,
  nombre = "Atleta",
  diasActivosSemana = [true, true, true, true, true, false, false],
}: ModalRachaDuolingoProps) {
  const [encendido, setEncendido] = useState(false);
  const [numero, setNumero] = useState(racha > 1 ? racha - 1 : 0);
  const [subido, setSubido] = useState(false);

  // Determinar el índice del día actual en la semana (0 = Lunes, 6 = Domingo)
  const indiceHoy = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    if (!abierto) return;

    // 1. Momento de ignición teatral (como en Duolingo)
    const tIgnicion = setTimeout(() => {
      setEncendido(true);
      sonidoCelebracion();
      vibrarCelebracion();
    }, 280);

    // 2. Conteo del odómetro y subida del número
    const tNumero = setTimeout(() => {
      setNumero(racha);
      setSubido(true);
      sonidoExito();
      vibrarCheck();
    }, 620);

    return () => {
      clearTimeout(tIgnicion);
      clearTimeout(tNumero);
    };
  }, [abierto, racha]);

  function cerrar() {
    sonidoTap();
    vibrarTap();
    onCerrar();
    setTimeout(() => {
      setEncendido(false);
      setSubido(false);
      setNumero(racha > 1 ? racha - 1 : 0);
    }, 200);
  }

  useBloqueoModal({ abierto, onCerrar: cerrar });

  if (!abierto || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-racha"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="relative max-h-[90dvh] w-full max-w-sm overflow-x-hidden overflow-y-auto rounded-3xl border border-amber-500/30 bg-surface p-6 shadow-pop text-center">
        {/* Resplandor radial cálido de fondo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/30 via-orange-500/20 to-transparent blur-3xl animate-resplandor-fuego"
        />

        {/* Botón de cierre */}
        <button
          type="button"
          onClick={cerrar}
          className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* CONTENEDOR CENTRAL: Fuego con ignición Duolingo */}
        <div className="relative mx-auto my-3 flex h-40 w-40 items-center justify-center">
          {/* Onda de choque al encenderse */}
          {encendido ? (
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/40 animate-onda-expansion" />
          ) : null}

          {/* Halo luminoso */}
          <div
            className={[
              "absolute inset-3 rounded-full transition-all duration-500",
              encendido ? "bg-amber-500/20 blur-xl scale-110" : "bg-transparent scale-90",
            ].join(" ")}
          />

          {/* Chispas flotantes alrededor */}
          {encendido ? (
            <>
              <span
                className="absolute top-1 left-3 text-sm animate-chispa text-amber-400 select-none"
                style={{ "--desplazamiento": "-18px" } as React.CSSProperties}
              >
                ✨
              </span>
              <span
                className="absolute top-2 right-3 text-sm animate-chispa text-orange-400 select-none"
                style={{ "--desplazamiento": "20px", animationDelay: "0.3s" } as React.CSSProperties}
              >
                🔥
              </span>
              <span
                className="absolute bottom-5 left-1 text-sm animate-chispa text-amber-300 select-none"
                style={{ "--desplazamiento": "-14px", animationDelay: "0.6s" } as React.CSSProperties}
              >
                ⚡
              </span>
            </>
          ) : null}

          {/* La llama viva */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <Flame
              size={100}
              className={[
                "transition-all duration-300",
                encendido
                  ? "fill-amber-500 text-orange-500 animate-duolingo-ignicion"
                  : "fill-neutral-400 text-neutral-500 opacity-40 scale-75",
              ].join(" ")}
              aria-hidden="true"
            />
            {/* Badge de subida de día */}
            {subido ? (
              <span className="absolute -bottom-2 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-white shadow-md animate-bounce">
                {racha > 1 ? "+1 DÍA" : "¡ENCENDIDA!"}
              </span>
            ) : null}
          </div>
        </div>

        {/* TEXTO Y CONTADOR ODÓMETRO ESTILO DUOLINGO */}
        <div className="mt-3 flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
            {racha >= 7 ? "¡Racha legendaria!" : "¡Racha en llamas!"}
          </p>

          <div className="flex items-center justify-center gap-1.5 py-0.5">
            <span
              id="titulo-racha"
              className={[
                "text-4xl font-black text-ink transition-transform duration-300",
                subido ? "scale-110 text-amber-500" : "scale-100",
              ].join(" ")}
            >
              {numero}
            </span>
            <span className="text-2xl font-black text-ink">
              {numero === 1 ? "día" : "días"}
            </span>
          </div>

          <p className="text-sm text-muted px-2">
            {racha >= 7
              ? `¡${racha} días seguidos, ${nombre}! Una semana completa sin fallar. ¡Eres imparable!`
              : racha > 1
              ? `¡Genial, ${nombre}! Has vuelto hoy y tu racha sigue ardiendo. ¡Sigue así!`
              : `¡Primer día de racha, ${nombre}! Acabas de encender tu llama. Entra mañana para aumentarla.`}
          </p>
        </div>

        {/* CALENDARIO SEMANAL DUOLINGO CON ENCENDIDO DE HOY */}
        <div className="my-5 rounded-2xl border border-border/80 bg-bg/85 p-3.5">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-2xs font-bold text-muted uppercase tracking-wider">
              Esta semana
            </p>
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-accent">
              <ShieldCheck size={13} /> Racha activa
            </span>
          </div>

          <div className="flex items-center justify-between gap-1.5">
            {DIAS_LETRAS.map((letra, i) => {
              const esHoy = i === indiceHoy;
              const completado = diasActivosSemana[i];
              const enJuegoHoy = esHoy && !completado && encendido;
              return (
                <div key={letra} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition-all duration-300",
                      completado
                        ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm scale-105"
                        : enJuegoHoy
                        ? "border-2 border-dashed border-amber-400 bg-amber-500/15 text-amber-500 scale-105 ring-2 ring-amber-400/50"
                        : "border border-border bg-surface text-muted",
                    ].join(" ")}
                  >
                    {completado ? (
                      <Flame size={15} className="fill-white text-white animate-pulse" />
                    ) : enJuegoHoy ? (
                      <Flame size={14} className="text-amber-500 animate-pulse" />
                    ) : (
                      letra
                    )}
                  </div>
                  <span
                    className={[
                      "text-[10px] font-bold",
                      esHoy ? "text-amber-700 dark:text-amber-400 font-black underline" : "text-muted",
                    ].join(" ")}
                  >
                    {esHoy ? "Hoy" : letra}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTÓN 3D ESTILO DUOLINGO CON RELIEVE TÁCTIL */}
        <button
          type="button"
          onClick={cerrar}
          className="w-full h-12 rounded-2xl border-b-4 border-amber-700 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-6 font-black text-white shadow-md transition-all duration-100 hover:brightness-105 active:border-b-0 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 text-base select-none"
        >
          <Sparkles size={18} />
          ¡A por el día!
        </button>
      </div>
    </div>,
    document.body,
  );
}
