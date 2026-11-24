"use client";

import { useMemo, useState } from "react";
import { Info, Plus, RotateCcw, Zap } from "lucide-react";
import type { AlimentoBase } from "@/lib/alimentos";
import type { Comida, TipoComida } from "@/lib/store";
import {
  alimentoBaseDesdeGuardado,
  avisoCrudoCocido,
  comidaDeAyerParaFranja,
  crearBaseCaloriasRapidas,
  recientesParaFranja,
} from "@/lib/atajos-comida";
import { sonidoTap } from "@/lib/sonido";
import { vibrarTap } from "@/lib/haptica";

type ElegidoEntrada = { base: AlimentoBase; gramos: number };

const ETIQUETA_FRANJA: Record<TipoComida, string> = {
  desayuno: "desayuno",
  comida: "comida",
  cena: "cena",
  snack: "snack",
};

export function PanelAtajosComida({
  comidas,
  fechaDestino,
  tipo,
  onAnadirLote,
}: {
  comidas: Comida[];
  fechaDestino: string;
  tipo: TipoComida;
  onAnadirLote: (items: ElegidoEntrada[]) => void;
}) {
  const [abiertoRapido, setAbiertoRapido] = useState(false);
  const [kcalTexto, setKcalTexto] = useState("");
  const [nombreRapido, setNombreRapido] = useState("");
  const [proteinaTexto, setProteinaTexto] = useState("");
  const [errorRapido, setErrorRapido] = useState("");

  const ayer = useMemo(
    () => comidaDeAyerParaFranja(comidas, fechaDestino, tipo),
    [comidas, fechaDestino, tipo],
  );
  const recientes = useMemo(() => recientesParaFranja(comidas, tipo, 8), [comidas, tipo]);

  function repetirAyer() {
    if (!ayer) return;
    sonidoTap();
    vibrarTap();
    onAnadirLote(ayer.alimentos.map((a) => alimentoBaseDesdeGuardado(a)));
  }

  function anadirRapido() {
    const kcal = Number(kcalTexto.replace(",", "."));
    const prot = proteinaTexto.trim() ? Number(proteinaTexto.replace(",", ".")) : 0;
    const creado = crearBaseCaloriasRapidas({
      kcal,
      nombre: nombreRapido,
      proteinas: prot,
    });
    if (!creado) {
      setErrorRapido("Pon un número de calorías entre 1 y 5000.");
      return;
    }
    sonidoTap();
    vibrarTap();
    onAnadirLote([creado]);
    setKcalTexto("");
    setNombreRapido("");
    setProteinaTexto("");
    setErrorRapido("");
    setAbiertoRapido(false);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {ayer ? (
        <button
          type="button"
          onClick={repetirAyer}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent-soft/40 px-3.5 py-2.5 text-left transition active:scale-[0.99] hover:bg-accent-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-accent shadow-2xs">
              <RotateCcw size={15} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-xs font-bold text-ink">
                Repetir {ETIQUETA_FRANJA[tipo]} de ayer
              </span>
              <span className="truncate text-2xs text-muted">{ayer.resumen}</span>
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-2xs font-bold text-accent tabular-nums">
            {ayer.totalKcal} kcal
          </span>
        </button>
      ) : null}

      {recientes.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-bold uppercase tracking-wider text-muted px-0.5">
            Tus recientes (1 toque)
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {recientes.map((item) => (
              <button
                key={`${item.alimento.nombre}-${item.alimento.cantidad}`}
                type="button"
                onClick={() => {
                  sonidoTap();
                  vibrarTap();
                  onAnadirLote([alimentoBaseDesdeGuardado(item.alimento)]);
                }}
                className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs text-ink transition active:scale-95 hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Plus size={12} className="text-accent" aria-hidden="true" />
                <span className="max-w-[140px] truncate font-medium">{item.alimento.nombre}</span>
                <span className="text-2xs text-muted tabular-nums">
                  {Math.round(item.alimento.kcal)} kcal
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-surface/70">
        <button
          type="button"
          onClick={() => {
            sonidoTap();
            setAbiertoRapido((v) => !v);
            setErrorRapido("");
          }}
          aria-expanded={abiertoRapido}
          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Zap size={15} aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="text-xs font-bold text-ink">Calorías rápidas</span>
              <span className="text-2xs text-muted">
                Para comer fuera: pones las kcal y listo
              </span>
            </span>
          </span>
          <span className="text-xs font-semibold text-accent">
            {abiertoRapido ? "Cerrar" : "Abrir"}
          </span>
        </button>

        {abiertoRapido ? (
          <div className="flex flex-col gap-2.5 border-t border-border px-3.5 pb-3.5 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-semibold text-muted">Calorías (kcal) *</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={5000}
                  value={kcalTexto}
                  onChange={(e) => {
                    setKcalTexto(e.target.value);
                    setErrorRapido("");
                  }}
                  placeholder="Ej. 650"
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-base font-bold text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-semibold text-muted">Proteína g (opcional)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={300}
                  value={proteinaTexto}
                  onChange={(e) => setProteinaTexto(e.target.value)}
                  placeholder="Ej. 30"
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold text-muted">Nombre (opcional)</span>
              <input
                type="text"
                maxLength={60}
                value={nombreRapido}
                onChange={(e) => setNombreRapido(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    anadirRapido();
                  }
                }}
                placeholder="Ej. Menú del día o tapas"
                className="rounded-lg border border-border bg-bg px-3 py-2 text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            {errorRapido ? <p className="text-xs text-warning">{errorRapido}</p> : null}
            <button
              type="button"
              onClick={anadirRapido}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-on-accent shadow-xs transition active:scale-95 hover:brightness-105"
            >
              <Plus size={15} aria-hidden="true" />
              <span>Añadir calorías rápidas</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AvisoCrudoCocido({
  nombre,
  gramosActuales,
  onAplicar,
}: {
  nombre: string;
  gramosActuales: number;
  onAplicar: (nuevosGramos: number) => void;
}) {
  const [ajustado, setAjustado] = useState(false);
  const aviso = useMemo(() => avisoCrudoCocido(nombre), [nombre]);
  if (!aviso) return null;

  const gramosConvertidos = aviso.factorDesdeCrudo
    ? Math.max(1, Math.min(3000, Math.round(gramosActuales * aviso.factorDesdeCrudo)))
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface px-2.5 py-2 text-2xs text-muted">
      <span className="flex items-center gap-1.5 leading-snug">
        <Info size={13} className="shrink-0 text-accent" aria-hidden="true" />
        <span>{aviso.mensaje}</span>
      </span>
      {aviso.etiquetaBoton && gramosConvertidos !== null && !ajustado ? (
        <button
          type="button"
          onClick={() => {
            sonidoTap();
            vibrarTap();
            onAplicar(gramosConvertidos);
            setAjustado(true);
          }}
          className="shrink-0 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-2xs font-bold text-accent transition active:scale-95"
        >
          {aviso.etiquetaBoton} (→ {gramosConvertidos} g)
        </button>
      ) : ajustado ? (
        <span className="shrink-0 text-2xs font-semibold text-accent">✓ Peso ajustado</span>
      ) : null}
    </div>
  );
}
