"use client";

import { useEffect, useId, useRef, useState } from "react";
import { conComa, ddMM } from "@/lib/calculos";
import { useMovimientoReducido } from "@/lib/use-movimiento";
import { guardarMostrado, ultimoMostrado } from "@/lib/ultimo-mostrado";

/** Lo que tarda el anillo en llegar a su número. */
const DURACION_ANILLO = 450;

/** Easing de resorte elástico amortiguado tipo Apple Activity Ring. */
function resorteAnillo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-5.5 * t) * Math.cos(2.8 * t);
}

/**
 * Anillo de progreso (calorías, agua). Se pasa → ámbar, nunca rojo.
 *
 * El arco y el número central crecen juntos: al abrir Hoy el número cuenta
 * desde cero, y cuando anotas o corriges una comida cuenta solo la diferencia.
 * Antes aparecía congelado en el valor final y la pantalla se sentía muerta.
 * Quien pida menos movimiento lo ve de golpe, sin animación.
 */
export function ProgressRing({
  value,
  max,
  size = 168,
  stroke = 12,
  label,
  /**
   * Si la animación puede correr ya. Hoy la pone en falso mientras la cortina
   * de carga tapa la pantalla: si animara debajo, al retirarse la cortina el
   * anillo aparecería ya quieto. En el resto de sitios no hace falta.
   */
  activo = true,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  activo?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const idVerde = `anilloGradienteVerde-${uid}`;
  const idAviso = `anilloGradienteAviso-${uid}`;
  const reducido = useMovimientoReducido();
  const clave = `anillo:${label}`;
  // El arco y el número no arrancan en cero cuando el anillo espera detrás de
  // la cortina de carga. Si arrancara en 0, al retirarse la cortina se leería
  // «0 de 1630» justo debajo de «Te quedan 540 kcal», que ya tiene su valor
  // final, y parecía que faltaban datos por cargar. Empieza en el 30 % de su
  // valor y sube desde ahí.
  const arranque = (): number => {
    // Con cero no hay nada que animar: pintar un 30 % sería mentir. El arco
    // tiene que medir cero (solo el carril gris) y el centro decir «0 de X».
    if (value <= 0) return 0;
    const guardado = ultimoMostrado(clave);
    if (guardado !== undefined) return guardado;
    return activo ? 0 : value * 0.3;
  };
  // El número que se pinta. Si esta pantalla ya se vio en esta sesión, arranca
  // en el valor de antes: al volver de otra pestaña no se vacía ni vuelve a
  // contar. La primera vez sí empieza en el arranque de arriba.
  const [mostrado, setMostrado] = useState(arranque);
  // De dónde arranca cada animación: el valor al que se llegó la última vez.
  const anterior = useRef(arranque());

  useEffect(() => {
    if (!activo) return;
    const desde = anterior.current;
    if (reducido || desde === value) {
      anterior.current = value;
      setMostrado(value);
      guardarMostrado(clave, value);
      return;
    }

    let raf = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / DURACION_ANILLO);
      // Salida rápida y frenada muy suave al llegar a la cifra.
      const suave = resorteAnillo(avance);
      const actual = desde + (value - desde) * suave;
      setMostrado(actual);
      // Se guarda en cada fotograma: si se cambia de pestaña a mitad de la
      // animación, al volver retoma donde se quedó en vez de saltar al final.
      guardarMostrado(clave, actual);
      if (avance < 1) {
        raf = requestAnimationFrame(paso);
      } else {
        anterior.current = value;
        guardarMostrado(clave, value);
      }
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [value, reducido, clave, activo]);

  const over = value > max;
  // El arco se dibuja con el número animado para que crezca a la vez.
  const pct = Math.max(0, Math.min(mostrado / max, 1));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const rest = Math.max(0, Math.round(max - value));
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${Math.round(value)} de ${max}. ${
          over ? `te has pasado ${Math.round(value - max)}` : `te quedan ${rest}`
        }`}
      >
        <defs>
          <linearGradient id={idVerde} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-success)" />
          </linearGradient>
          <linearGradient id={idAviso} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-warning)" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-track)"
          strokeWidth={stroke}
        />
        {pct >= 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? `url(#${idAviso})` : `url(#${idVerde})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            // Se pinta siempre (incluso con 0) para que el arco llene con
            // suavidad al apuntar el primer alimento: con cap redondo un arco
            // a cero dibujaria un punto, así que se esconde con opacidad.
            className={pct === 0 ? "opacity-0" : undefined}
            style={{
              // El arco no lleva transición propia: lo mueve el mismo
              // requestAnimationFrame que el número. Con las dos animaciones a
              // la vez, el arco se quedaba atrás y parecía que parpadeaba.
              transition: "opacity 200ms ease",
            }}
          />
        ) : null}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">{Math.round(mostrado)}</span>
        <span className="text-xs font-medium text-muted">de {max} kcal</span>
      </div>
    </div>
  );
}

/** Barras de proteína / carbo / grasa. */
export function MacroBar({
  name,
  value,
  max,
}: {
  name: string;
  value: number;
  max: number;
}) {
  const over = value > max;
  const pct = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted">{name}</span>
        <span className="text-ink tabular-nums">
          {value} / {max} g
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={name}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 overflow-hidden rounded-pill bg-border"
      >
        <div
          className={["h-full rounded-pill transition-[width] duration-300 ease-app", over ? "bg-warning" : "bg-accent"].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}


/** Gráfica de línea (peso, gasto, calorías). */
export function LineChart({
  points,
  width = 320,
  height = 130,
  label,
  fechas,
  unidad = "kg",
  /**
   * Cola opcional de posiciones, una por punto, para el eje X. Los puntos
   * equidistantes mienten si las pesadas no son regulares: con «3 de octubre»,
   * «7 de octubre» y «21 de octubre» la línea se ve pareja cuando no lo fue.
   * Se pasa lo que sea (días, milisegundos) y se escala dentro.
   */
  posiciones,
}: {
  points: number[];
  width?: number;
  height?: number;
  label: string;
  fechas?: string[];
  unidad?: string;
  posiciones?: number[];
}) {
  const uid = useId().replace(/:/g, "");
  const idArea = `areaGradientePeso-${uid}`;

  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Hacen falta al menos dos pesadas para ver la tendencia.
      </p>
    );
  }
  const pad = 10;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pos = posiciones ?? points.map((_, i) => i);
  const posMin = Math.min(...pos);
  const posSpan = Math.max(...pos) - posMin || 1;
  const x = (i: number) =>
    pad + ((pos[i] - posMin) / posSpan) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const delta = points[points.length - 1] - points[0];
  const primera = fechas?.[0] ? ddMM(fechas[0]) : "";
  const ultima = fechas?.[fechas.length - 1] ? ddMM(fechas[fechas.length - 1]) : "";
  // El nombre accesible lo lleva el SVG (role="img"): quien use lector de
  // pantalla oí el mismo resumen que se ve, con máx, mín y las fechas.
  const nombre =
    fechas?.length && primera && ultima
      ? `${label}: de ${conComa(min)} a ${conComa(max)} ${unidad}, del ${primera} al ${ultima}.`
      : `${label}: de ${conComa(min)} a ${conComa(max)} ${unidad}.`;
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* Eje de la izquierda: arriba el máximo, abajo el mínimo. */}
        <div className="flex w-12 flex-col justify-between py-0.5 text-right text-xs text-muted tabular-nums">
          <span>{conComa(max)}</span>
          <span>{conComa(min)}</span>
        </div>
        <div className="relative flex-1">
          <svg
            width="100%"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={nombre}
          >
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={pad}
                x2={width - pad}
                y1={pad + f * (height - pad * 2)}
                y2={pad + f * (height - pad * 2)}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
            ))}
            <defs>
              <linearGradient id={idArea} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Área sombreada con gradiente bajo la curva */}
            <path
              d={`${d} L ${x(points.length - 1)} ${height - pad} L ${x(0)} ${height - pad} Z`}
              fill={`url(#${idArea})`}
            />
            {/* Curva continua */}
            <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* Puntos destacados sobre la línea */}
            {points.map((v, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={i === points.length - 1 ? 4.5 : 3}
                fill={i === points.length - 1 ? "var(--color-accent)" : "var(--color-surface)"}
                stroke="var(--color-accent)"
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
      </div>
      {/* Fechas: principio y final del periodo, si las tenemos. */}
      {fechas?.length && primera && ultima ? (
        <div className="flex justify-between pl-14 text-xs text-muted">
          <span>{primera}</span>
          <span>{ultima}</span>
        </div>
      ) : null}
      <figcaption className="text-sm text-muted">
        {delta === 0
          ? "Sin cambios"
          : `${delta > 0 ? "Subiste" : "Bajaste"} ${conComa(Math.abs(delta))} ${unidad}`}
      </figcaption>
    </figure>
  );
}
