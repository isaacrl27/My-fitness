"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Trophy, Check, Droplets, Utensils, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confeti } from "@/components/ui/confeti";
import { useDatos } from "@/lib/store";
import {
  edad,
  fechaUltimaPesada,
  gastoDiario,
  hoyISO,
  kcalDeHoy,
  macrosDiarios,
  pesoSuavizado,
} from "@/lib/calculos";
import { esDiaARajatabla } from "@/lib/puntos";
import { HABITOS_INICIALES } from "@/lib/habitos";
import { sonidoCelebracion } from "@/lib/sonido";
import { vibrarCelebracion } from "@/lib/haptica";
import { useBloqueoModal } from "@/lib/use-modal";

const PREFIJO_CELEBRADO = "mi-peso:celebrado-rajatabla:";

/**
 * Diálogo de máxima celebración cuando el usuario cumple su día «a rajatabla»
 * (comidas en rango del plan, meta de agua conseguida y 100% de hábitos hechos).
 */
export function ModalCelebracionRajatabla() {
  const { listo, perfil, comidas, pesadas, aguaLitros, habitosHechos, caprichos, metaAguaL } =
    useDatos();
  const [abierto, setAbierto] = useState(false);
  const [lanzarConfeti, setLanzarConfeti] = useState(false);

  useEffect(() => {
    if (!listo || !perfil) return;
    const hoy = hoyISO();
    const clave = `${PREFIJO_CELEBRADO}${hoy}`;

    let yaCelebrado = false;
    try {
      yaCelebrado = window.localStorage.getItem(clave) === "true";
    } catch {
      yaCelebrado = false;
    }

    if (yaCelebrado) return;

    // Calcular si hoy está a rajatabla
    const comidasHoy = comidas.filter((c) => c.fecha === hoy);
    const kcalComidas = comidasHoy.reduce((acc, c) => {
      const sumaAlimentos = c.alimentos?.reduce((s, a) => s + (a.kcal || 0), 0) ?? 0;
      return acc + sumaAlimentos;
    }, 0);
    const protComidas = comidasHoy.reduce((acc, c) => {
      const sumaProt = c.alimentos?.reduce((s, a) => s + (a.proteinas || 0), 0) ?? 0;
      return acc + sumaProt;
    }, 0);

    const aguaHoy = aguaLitros[hoy] ?? 0;
    const metaAgua = metaAguaL ?? 2;

    const habitosActivos = perfil.habitosActivos ?? HABITOS_INICIALES;
    const hechosHoy = habitosHechos?.[hoy]?.length ?? 0;

    const esCapricho = (caprichos ?? []).includes(hoy);

    // Kcal y proteínas del plan para hoy
    const peso = pesoSuavizado(pesadas) ?? perfil.pesoInicialKg;
    const gasto = gastoDiario(
      peso,
      perfil.alturaCm,
      edad(perfil.fechaNacimiento),
      perfil.sexo,
      perfil.actividad,
    );
    const kcalObjetivo = kcalDeHoy(
      perfil,
      gasto,
      peso,
      hoy,
      fechaUltimaPesada(pesadas) ?? undefined,
    );
    const proteinasObjetivo = macrosDiarios(kcalObjetivo, peso).proteinas;

    const aRajatabla = esDiaARajatabla({
      kcalComidas,
      kcalObjetivo,
      proteinasComidas: protComidas,
      proteinasObjetivo,
      aguaL: aguaHoy,
      metaAguaL: metaAgua,
      sePeso: true, // no bloqueante si no toca
      esCapricho,
      habitosHechos: hechosHoy,
      habitosActivos: habitosActivos.length,
    });

    if (aRajatabla) {
      try {
        window.localStorage.setItem(clave, "true");
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(PREFIJO_CELEBRADO) && k !== clave) {
            window.localStorage.removeItem(k);
          }
        }
      } catch {}

      // Disparamos celebración sonora y háptica estilo Apple en el siguiente frame
      const t = setTimeout(() => {
        sonidoCelebracion();
        vibrarCelebracion();
        setLanzarConfeti(true);
        setAbierto(true);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [listo, perfil, comidas, pesadas, aguaLitros, habitosHechos, caprichos, metaAguaL]);

  function cerrar() {
    setAbierto(false);
  }

  useBloqueoModal({ abierto, onCerrar: cerrar });

  if (!abierto && !lanzarConfeti) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {lanzarConfeti ? <Confeti onCompletado={() => setLanzarConfeti(false)} /> : null}

      {abierto ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 px-5 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-rajatabla"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <div className="flex max-h-[90dvh] w-full max-w-sm flex-col items-center overflow-y-auto rounded-3xl border border-border bg-surface p-6 text-center shadow-pop animate-in fade-in zoom-in-95 duration-200">
            {/* Medalla dorada resplandeciente */}
            <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-accent/20 via-accent/30 to-accent/10 text-accent shadow-inner">
              <Trophy size={42} className="text-accent" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm">
                <Sparkles size={16} />
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-bold text-accent uppercase tracking-wider">
              ¡Día Perfecto!
            </span>

            <h2 id="titulo-rajatabla" className="mt-2 text-2xl font-bold text-ink">
              ¡Día a rajatabla! 🎯
            </h2>

            <p className="mt-2 text-sm text-muted leading-relaxed">
              Has clavado tu comida en el plan, has bebido toda tu agua y has cumplido todos tus
              hábitos de hoy. ¡Un 10 absoluto!
            </p>

            {/* Tarjeta de logros */}
            <div className="mt-4 flex w-full flex-col gap-2 rounded-2xl border border-border/70 bg-bg p-3.5 text-left text-xs font-semibold text-ink">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Utensils size={13} />
                </span>
                <span>Comidas dentro del objetivo calórico</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Droplets size={13} />
                </span>
                <span>Meta de agua 100% completada</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Star size={13} />
                </span>
                <span>Todos tus hábitos del día marcados</span>
              </div>
            </div>

            <Button onClick={cerrar} className="mt-5 w-full justify-center h-12 text-base font-bold shadow-md">
              <Check size={18} aria-hidden="true" />
              ¡A seguir así!
            </Button>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
