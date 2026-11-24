"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Clock, ChefHat, Sparkles, X, Check } from "lucide-react";
import {
  calcularTransformAbanico,
  estiloTransformAbanico,
} from "@/lib/carpeta-interactiva";
import { sonidoTap, sonidoExito } from "@/lib/sonido";
import { vibrarTap, vibrarExito } from "@/lib/haptica";
import type { Plato } from "@/lib/platos";
import { recetaDePlato } from "@/lib/recetas";
import { Badge } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";

export interface CarpetaRecetasProps {
  id: string;
  titulo: string;
  subtitulo: string;
  icono: string;
  color: "amber" | "emerald" | "indigo" | "rose";
  platos: Plato[];
  onAnotarEnHoy?: (plato: Plato) => void;
  yaAnotado?: (plato: Plato) => boolean;
}

const TEMAS_COLOR = {
  amber: {
    borde: "border-amber-500/30",
    bgPestana: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    bgFondo: "bg-gradient-to-b from-amber-500/10 to-amber-600/5",
    frontCover: "bg-amber-500/10 border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    resalte: "border-amber-500 text-amber-600",
  },
  emerald: {
    borde: "border-emerald-500/30",
    bgPestana: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    bgFondo: "bg-gradient-to-b from-emerald-500/10 to-emerald-600/5",
    frontCover: "bg-emerald-500/10 border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    resalte: "border-emerald-500 text-emerald-600",
  },
  indigo: {
    borde: "border-indigo-500/30",
    bgPestana: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    bgFondo: "bg-gradient-to-b from-indigo-500/10 to-indigo-600/5",
    frontCover: "bg-indigo-500/10 border-indigo-500/30",
    badge: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
    resalte: "border-indigo-500 text-indigo-600",
  },
  rose: {
    borde: "border-rose-500/30",
    bgPestana: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    bgFondo: "bg-gradient-to-b from-rose-500/10 to-rose-600/5",
    frontCover: "bg-rose-500/10 border-rose-500/30",
    badge: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
    resalte: "border-rose-500 text-rose-600",
  },
};

export function CarpetaInteractiva({
  id,
  titulo,
  subtitulo,
  icono,
  color,
  platos,
  onAnotarEnHoy,
  yaAnotado,
}: CarpetaRecetasProps) {
  const [abierta, setAbierta] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Plato | null>(null);

  const tema = TEMAS_COLOR[color] || TEMAS_COLOR.amber;

  // Mostramos hasta 5 platos en el abanico visual
  const platosAbanico = platos.slice(0, 5);

  const alternarCarpeta = () => {
    sonidoTap();
    vibrarTap();
    setAbierta((prev) => {
      const sig = !prev;
      if (!sig) setPlatoSeleccionado(null);
      return sig;
    });
  };

  const seleccionarPlato = (plato: Plato) => {
    sonidoTap();
    vibrarTap();
    setPlatoSeleccionado((prev) => (prev?.nombre === plato.nombre ? null : plato));
  };

  const receta = platoSeleccionado ? recetaDePlato(platoSeleccionado) : null;
  const estaAnotado = platoSeleccionado && yaAnotado ? yaAnotado(platoSeleccionado) : false;

  return (
    <article
      data-carpeta={id}
      className={`relative rounded-2xl border ${tema.borde} ${tema.bgFondo} p-4 transition-all duration-300 shadow-xs`}
    >
      {/* Pestaña superior estilo pestaña de archivador físico */}
      <div className="flex items-center justify-between pb-2">
        <div
          className={`inline-flex items-center gap-1.5 rounded-t-lg border-t border-x px-3 py-1 text-xs font-bold uppercase tracking-wider ${tema.bgPestana}`}
        >
          <span>{icono}</span>
          <span>{titulo}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${tema.badge}`}>
          {platos.length} platos
        </span>
      </div>

      {/* Escenario 3D interactivo con el abanico de tarjetas */}
      <div
        className="relative mx-auto my-3 flex h-36 w-full max-w-[340px] items-center justify-center select-none"
        style={{ perspective: "800px" }}
      >
        {/* Pared trasera de la carpeta */}
        <div
          className={`absolute bottom-0 h-28 w-full rounded-xl border ${tema.borde} bg-surface/80 backdrop-blur-xs shadow-inner`}
        />

        {/* Tarjetas que se despliegan en abanico (Rare UI Animated Folder) */}
        <div className="absolute bottom-6 flex items-center justify-center">
          {platosAbanico.map((plato, idx) => {
            const transform = calcularTransformAbanico(
              idx,
              platosAbanico.length,
              abierta,
              hoverIndex,
            );
            const estilo = estiloTransformAbanico(transform);
            const esSeleccionado = platoSeleccionado?.nombre === plato.nombre;

            return (
              <button
                key={plato.nombre}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!abierta) {
                    alternarCarpeta();
                  } else {
                    seleccionarPlato(plato);
                  }
                }}
                onMouseEnter={() => abierta && setHoverIndex(idx)}
                onMouseLeave={() => abierta && setHoverIndex(null)}
                style={estilo}
                className={`absolute w-24 h-24 rounded-xl border p-2 text-left shadow-sm backdrop-blur-md cursor-pointer transition-colors ${
                  esSeleccionado
                    ? "border-accent ring-2 ring-accent/50 bg-surface shadow-md"
                    : "border-border/80 bg-surface/95 hover:border-accent/60"
                }`}
                title={plato.nombre}
                aria-label={`Plato: ${plato.nombre}`}
              >
                <div className="flex h-full flex-col justify-between overflow-hidden">
                  <div>
                    <span className="text-base">{icono}</span>
                    <p className="line-clamp-2 text-[11px] font-bold leading-tight text-ink mt-0.5">
                      {plato.nombre}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
                    <span>{plato.kcal} kcal</span>
                    {esSeleccionado ? <span className="text-accent">●</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tapa frontal de la carpeta con inclinación 3D (hinge) */}
        <div
          onClick={alternarCarpeta}
          className={`absolute bottom-0 h-24 w-full cursor-pointer rounded-xl border ${tema.frontCover} bg-surface/90 backdrop-blur-md p-3 shadow-md transition-transform duration-500 ease-out flex flex-col justify-between`}
          style={{
            transformOrigin: "bottom center",
            transform: abierta
              ? "rotateX(-26deg) translateY(6px)"
              : "rotateX(0deg) translateY(0px)",
          }}
          role="button"
          tabIndex={0}
          aria-expanded={abierta}
          aria-label={`${titulo}: toca para ${abierta ? "plegar" : "desplegar en abanico"}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              alternarCarpeta();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">{subtitulo}</span>
            <span className="text-xs text-muted flex items-center gap-1 font-medium">
              {abierta ? "Plegar" : "Abrir"}
              {abierta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted">
              {abierta ? "Toca una tarjeta para ver receta" : "Toca para abrir abanico"}
            </span>
            <span className="text-xs text-accent font-bold">
              {abierta ? "Abierto" : "Cerrado"}
            </span>
          </div>
        </div>
      </div>

      {/* Vista expandida: Detalle del plato seleccionado o explorador del catálogo */}
      {abierta ? (
        <div className="mt-3 flex flex-col gap-3 pt-2 border-t border-border/50 animate-fadeIn">
          {platoSeleccionado ? (
            <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{icono}</span>
                    <h3 className="text-base font-bold text-ink">{platoSeleccionado.nombre}</h3>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{platoSeleccionado.descripcion}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlatoSeleccionado(null)}
                  className="rounded-lg p-1 text-muted hover:bg-surface-raised hover:text-ink transition-colors"
                  aria-label="Cerrar detalle"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Badges nutricionales */}
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="accent">🔥 {platoSeleccionado.kcal} kcal</Badge>
                <Badge tone="neutral">🥩 {platoSeleccionado.proteinas}g Prot</Badge>
                <Badge tone="neutral">🌾 {platoSeleccionado.carbohidratos}g HC</Badge>
                <Badge tone="neutral">🥑 {platoSeleccionado.grasas}g Grasa</Badge>
              </div>

              {/* Botón de acción rápida: Anotar en Hoy */}
              {onAnotarEnHoy ? (
                <div className="flex items-center gap-2 pt-1">
                  {estaAnotado ? (
                    <Button variant="secondary" size="sm" disabled className="gap-1.5">
                      <Check size={14} className="text-emerald-500" />
                      Anotado hoy
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        sonidoExito();
                        vibrarExito();
                        onAnotarEnHoy(platoSeleccionado);
                      }}
                      className="gap-1.5"
                    >
                      <Sparkles size={14} />
                      Anotar plato en Hoy
                    </Button>
                  )}
                </div>
              ) : null}

              {/* Ingredientes */}
              <div className="pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Ingredientes</h4>
                <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-ink/80">
                  {platoSeleccionado.ingredientes.map((ing) => (
                    <li key={ing.nombre} className="flex justify-between py-0.5 border-b border-border/40">
                      <span>• {ing.nombre}</span>
                      <span className="text-muted font-medium">{ing.gramos} g</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Receta detallada paso a paso si existe */}
              {receta ? (
                <div className="mt-2 rounded-lg bg-bg/80 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {receta.tiempoMin} min
                    </span>
                    <span className="flex items-center gap-1 font-medium capitalize">
                      <ChefHat size={13} /> {receta.dificultad}
                    </span>
                  </div>
                  <p className="text-xs text-ink/90">
                    <strong className="text-ink">Antes: </strong>
                    {receta.antes}
                  </p>
                  <ol className="space-y-1.5 pt-1 text-xs text-ink/90">
                    {receta.pasos.map((paso, idx) => (
                      <li key={paso.titulo} className="leading-relaxed">
                        <span className="font-bold text-accent">{idx + 1}. {paso.titulo}: </span>
                        <span>{paso.texto}</span>
                      </li>
                    ))}
                  </ol>
                  {receta.truco ? (
                    <div className="mt-1 rounded bg-accent-soft/40 p-2 text-2xs text-ink/90">
                      <strong className="text-accent">💡 Truco de cocina: </strong>
                      {receta.truco}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Carrusel / lista de todos los platos de esta carpeta */}
          <div className="flex flex-col gap-2">
            <p className="text-2xs font-bold uppercase tracking-wider text-muted">
              Todos los platos en esta carpeta ({platos.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {platos.map((p) => {
                const activo = platoSeleccionado?.nombre === p.nombre;
                return (
                  <button
                    key={p.nombre}
                    type="button"
                    onClick={() => seleccionarPlato(p)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      activo
                        ? "bg-accent text-accent-contrast shadow-2xs"
                        : "bg-surface-raised border border-border text-ink hover:border-accent"
                    }`}
                  >
                    {p.nombre} <span className="text-[10px] opacity-75 font-normal">({p.kcal} kcal)</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
