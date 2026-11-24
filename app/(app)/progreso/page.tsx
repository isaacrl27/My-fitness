"use client";

import { useMemo, useState } from "react";
import { Check, Droplets, Pencil, Scale, TrendingDown, TrendingUp, X } from "lucide-react";
import { useDatos } from "@/lib/store";
import { calcularEstadoCiclo, debeMostrarCiclo } from "@/lib/ciclo";
import { Button, IconButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { LineChart } from "@/components/ui/data-viz";
import { EmptyState } from "@/components/ui/feedback";
import { SegmentedControl } from "@/components/ui/controls";
import { Barras, diasDelRango } from "@/components/app/barras-kcal";
import { Cargando } from "@/components/app/onboarding";
import { MapaCalorGitHub } from "@/components/ui/mapa-calor-github";
import { BotonBorradoElastico } from "@/components/ui/boton-elastico";
import { useHoy } from "@/lib/use-hoy";
import { useGuardado } from "@/lib/use-guardado";
import { sumar } from "@/lib/comidas";
import { sonidoBascula, sonidoTap } from "@/lib/sonido";
import { vibrarExito, vibrarTap } from "@/lib/haptica";
import {
  PESO_MAX_KG,
  PESO_MIN_KG,
  aNumero,
  cambioSemanalPorFechas,
  conComa,
  ddMM,
  diasHastaObjetivo,
  edad,
  enPalabras,
  fechaUltimaPesada,
  gastoDiario,
  hoyISO,
  kcalDeHoy,
  pesoSuavizado,
  tendencia,
} from "@/lib/calculos";

/** Días dichos como los piensa la gente: más de dos meses, en meses. */
function enTiempo(dias: number): string {
  if (dias < 60) return `unos ${dias} días`;
  // Hacia arriba: 3,4 meses se cuenta como 4, no como 3. Decir «unos 3» cuando
  // faltan casi cuatro semanas de más es prometer de menos.
  const meses = Math.ceil(dias / 30);
  if (meses < 12) return `unos ${meses} meses`;
  return "más de un año";
}

export default function PaginaProgreso() {
  const { perfil, pesadas, comidas, aguaLitros, habitosHechos, anadirPesada, borrarPesada, listo } = useDatos();
  const hoy = useHoy();
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");
  const [pesoTocado, setPesoTocado] = useState(false);
  const [rango, setRango] = useState<"7d" | "30d">("7d");
  const [guardadoPeso, marcarPeso] = useGuardado();
  const [editandoFecha, setEditandoFecha] = useState<string | null>(null);
  const [pesoEditando, setPesoEditando] = useState<string>("");

  const guardarEdicion = () => {
    if (!editandoFecha) return;
    const num = aNumero(pesoEditando);
    if (!num || num < PESO_MIN_KG || num > PESO_MAX_KG) return;
    anadirPesada({ fecha: editandoFecha, kg: num });
    setEditandoFecha(null);
  };

  const ordenadas = useMemo(
    () => [...pesadas].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [pesadas],
  );
  const kcalPorDia = useMemo(() => {
    const dias: { dia: string; kcal: number }[] = [];
    for (const c of comidas) {
      // El capricho va aparte también en la gráfica: no empaña el día.
      if (c.capricho) continue;
      const kcal = sumar([c]).kcal;
      const prev = dias.find((d) => d.dia === c.fecha);
      if (prev) prev.kcal += kcal;
      else dias.push({ dia: c.fecha, kcal });
    }
    return dias.sort((a, b) => a.dia.localeCompare(b.dia));
  }, [comidas]);

  const estadoCiclo = useMemo(() => {
    if (!perfil) return null;
    const floActivo = debeMostrarCiclo(perfil.sexo, perfil.cicloMenstrual);
    if (!floActivo) return null;
    return calcularEstadoCiclo(perfil.cicloMenstrual, hoy ?? undefined);
  }, [perfil, hoy]);

  if (!listo || !perfil || !hoy) return <Cargando />;

  const kgs = ordenadas.map((p) => p.kg);
  // El último peso anotado, para sugerirlo en la caja en vez de un número de mentira.
  const ultimoPeso = conComa(ordenadas[ordenadas.length - 1]?.kg ?? perfil.pesoInicialKg);
  const tend = tendencia(kgs);
  const actual = kgs.at(-1) ?? perfil.pesoInicialKg;
  const cambio = cambioSemanalPorFechas(ordenadas);
  const desdeElPrincipio = kgs.length > 1 ? kgs[kgs.length - 1] - kgs[0] : 0;
  const dias = diasHastaObjetivo(
    actual,
    perfil.pesoObjetivoKg,
    perfil.ritmoKgSemana,
    perfil.objetivo,
  );

  // La gráfica de calorías vive aquí desde la ronda 11: antes tenía su propia
  // pestaña, pero repetía el peso y el cambio semanal de esta pantalla.
  const desde = hoyISO(
    new Date(new Date(`${hoy}T00:00:00`).getTime() - (rango === "7d" ? 6 : 29) * 86400000),
  );
  const kcalRango = diasDelRango(kcalPorDia, desde, hoy);
  const peso = pesoSuavizado(pesadas) ?? perfil.pesoInicialKg;
  const objetivoKcal = Math.round(
    kcalDeHoy(
      perfil,
      gastoDiario(
        peso,
        perfil.alturaCm,
        edad(perfil.fechaNacimiento),
        perfil.sexo,
        perfil.actividad,
      ),
      peso,
      hoy,
      fechaUltimaPesada(pesadas) ?? undefined,
    ),
  );

  const fechaCampo = fecha || hoy;

  // Solo se admiten pesadas de los últimos 7 días. Apuntar fechas antiguas sin
  // freno servía para inflar los puntos que dan las pesadas.
  const fechaMinima = (() => {
    const d = new Date(`${hoy}T12:00:00`);
    d.setDate(d.getDate() - 7);
    return hoyISO(d);
  })();
  const fechaFueraDeRango = fechaCampo < fechaMinima || fechaCampo > hoy;

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">Tu progreso</p>
        <h1 className="text-xl text-ink">Peso y calorías</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Tarjeta
          titulo="Peso de hoy"
          valor={`${conComa(actual)} kg`}
          pie={ordenadas.length > 0 ? `Última pesada del ${ddMM(ordenadas[ordenadas.length - 1].fecha)}` : "Última pesada"}
        />
        <Tarjeta
          titulo="Tendencia"
          valor={`${conComa(tend.at(-1) ?? actual)} kg`}
          pie="Media de los últimos días"
        />
        <Tarjeta
          titulo="Cambio por semana"
          valor={`${cambio > 0 ? "+" : ""}${conComa(cambio, 2)} kg`}
          pie={cambio < 0 ? "Bajando" : cambio > 0 ? "Subiendo" : "Sin moverse"}
          // El icono solo cuando de verdad se mueve: con cambio 0 decía
          // «Subiendo 0 kg» con la flecha de subir, un cuento.
          Icono={cambio > 0 ? TrendingUp : cambio < 0 ? TrendingDown : undefined}
        />
        <Tarjeta
          titulo="Desde el principio"
          valor={`${desdeElPrincipio > 0 ? "+" : ""}${conComa(desdeElPrincipio)} kg`}
          pie={ordenadas.length === 1 ? "1 pesada" : `${ordenadas.length} pesadas`}
        />
      </section>

      {/* Anotar el peso va lo primero después de las cifras: antes estaba
          debajo de las dos gráficas y había que bajar media pantalla para
          apuntar la pesada del día. */}
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Scale size={18} aria-hidden="true" className="text-accent" />
          Anotar un peso
        </h2>
        {estadoCiclo?.esFaseRetencion ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/60 bg-rose-50/70 p-3 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            <Droplets size={16} className="shrink-0 text-rose-500 mt-0.5 fill-current" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">
                Retención esperada ({estadoCiclo.nombreFase} · {estadoCiclo.retencionEstimadaKg})
              </span>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {estadoCiclo.explicacionBascula}
              </p>
            </div>
          </div>
        ) : null}
        <TextField
          label="Fecha"
          type="date"
          min={fechaMinima}
          max={hoy}
          value={fechaCampo}
          onChange={(e) => setFecha(e.target.value)}
          hint="Solo los últimos 7 días."
          error={fechaFueraDeRango ? "Esa fecha queda fuera: apunta una de la última semana." : undefined}
        />
        <TextField
          label="Peso"
          type="text"
          inputMode="decimal"
          suffix="kg"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => setPesoTocado(true)}
          placeholder="Ej. 76,4"
          error={
            pesoTocado && texto.trim() !== "" && (aNumero(texto) < PESO_MIN_KG || aNumero(texto) > PESO_MAX_KG)
              ? `Escribe un peso entre ${PESO_MIN_KG} y ${PESO_MAX_KG} kg.`
              : undefined
          }
        />
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ajuste rápido del peso">
          {(
            [
              { etiqueta: "−0,1 kg", delta: -0.1 },
              { etiqueta: `Igual (${ultimoPeso})`, delta: 0 },
              { etiqueta: "+0,1 kg", delta: 0.1 },
            ] as const
          ).map((atajo) => (
            <button
              key={atajo.etiqueta}
              type="button"
              onClick={() => {
                sonidoTap();
                vibrarTap();
                if (atajo.delta === 0) {
                  setTexto(ultimoPeso);
                } else {
                  const actualCampo = aNumero(texto);
                  const base =
                    texto.trim() !== "" && actualCampo >= PESO_MIN_KG && actualCampo <= PESO_MAX_KG
                      ? actualCampo
                      : actual;
                  const nuevo = Math.min(
                    PESO_MAX_KG,
                    Math.max(PESO_MIN_KG, Math.round((base + atajo.delta) * 10) / 10),
                  );
                  setTexto(conComa(nuevo));
                }
                setPesoTocado(false);
              }}
              className="min-h-[38px] rounded-xl border border-border bg-bg px-2 py-2 text-xs font-semibold text-ink tabular-nums transition active:scale-95 hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {atajo.etiqueta}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Última pesada: {ultimoPeso} kg
        </p>
        <Button
          disabled={
            aNumero(texto) < PESO_MIN_KG ||
            aNumero(texto) > PESO_MAX_KG ||
            guardadoPeso ||
            fechaFueraDeRango
          }
          onClick={() => {
            sonidoBascula();
            vibrarExito();
            anadirPesada({ fecha: fechaCampo, kg: aNumero(texto) });
            setTexto("");
            setFecha("");
            setPesoTocado(false);
            marcarPeso();
          }}
        >
          {guardadoPeso ? "✓ Guardado" : "Guardar peso"}
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="text-base font-semibold text-ink">La línea de tu peso</h2>
        {kgs.length >= 2 ? (
          <LineChart
            points={kgs}
            fechas={ordenadas.map((p) => p.fecha)}
            // Eje X por calendario de verdad: los huecos sin pesarse se ven.
            posiciones={ordenadas.map((p) => new Date(`${p.fecha}T12:00:00`).getTime())}
            label="Evolución del peso"
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            Con dos pesadas ya te dibujo la línea.
          </p>
        )}
        {dias !== null && dias > 0 ? (
          <p className="text-sm text-muted">
            Al ritmo que has elegido ({conComa(perfil?.ritmoKgSemana ?? 0.5, 2)} kg por semana)
            llegarías a tu objetivo en {enTiempo(dias)}. Lo iremos ajustando con lo que de verdad
            cambies.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="text-base font-semibold text-ink">Calorías por día</h2>
        <SegmentedControl
          label="Periodo"
          value={rango}
          onChange={(v) => setRango(v as "7d" | "30d")}
          options={[
            { value: "7d", label: "7 días" },
            { value: "30d", label: "30 días" },
          ]}
        />
        {comidas.length > 0 ? (
          <Barras
            datos={kcalRango}
            etiqueta="Calorías por día"
            fechas={kcalRango.map((d) => d.dia)}
            objetivo={objetivoKcal}
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            Con un par de comidas ya te dibujo las calorías.
          </p>
        )}
      </section>

      {/* Mapa de calor de constancia (Rare UI / GitHub) */}
      <MapaCalorGitHub
        datos={{
          comidas,
          pesadas,
          aguaLitros,
          habitosHechos,
        }}
        hoyStr={hoy}
        numSemanas={12}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">Historial</h2>
        {ordenadas.length === 0 ? (
          <EmptyState
            title="Todavía no hay pesadas"
            body="Anota tu primer peso y empezamos a ver la tendencia."
          />
        ) : (
          <ul className="flex flex-col rounded-lg bg-surface px-4">
            {[...ordenadas].reverse().map((p) => (
              <li
                key={p.fecha}
                className="flex items-center justify-between border-b border-border py-3 last:border-0"
              >
                <span className="text-base text-ink">{enPalabras(p.fecha)}</span>
                {editandoFecha === p.fecha ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pesoEditando}
                      onChange={(e) => setPesoEditando(e.target.value)}
                      className="w-20 rounded-md border border-border-input bg-bg px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") guardarEdicion();
                        if (e.key === "Escape") setEditandoFecha(null);
                      }}
                    />
                    <span className="text-xs text-muted">kg</span>
                    <IconButton
                      label="Guardar peso"
                      size="sm"
                      variant="solid"
                      onClick={guardarEdicion}
                    >
                      <Check size={14} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label="Cancelar edición"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditandoFecha(null)}
                    >
                      <X size={14} aria-hidden="true" />
                    </IconButton>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-base text-muted">{conComa(p.kg)} kg</span>
                    <IconButton
                      label={`Corregir la pesada del ${enPalabras(p.fecha)}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditandoFecha(p.fecha);
                        setPesoEditando(conComa(p.kg));
                      }}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </IconButton>
                    {/* La papelera: para una pesada mal anotada. Con la última
                        no se puede: la app necesita al menos un peso de partida. */}
                    {ordenadas.length > 1 ? (
                      <BotonBorradoElastico
                        onBorrar={() => borrarPesada(p.fecha)}
                        variante="icono"
                        etiquetaConfirmar="¿Borrar?"
                        ariaLabel={`Quitar la pesada del ${enPalabras(p.fecha)}`}
                      />
                    ) : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  pie,
  Icono,
}: {
  titulo: string;
  valor: string;
  pie: string;
  Icono?: typeof TrendingUp;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface p-4">
      <span className="text-sm text-muted">{titulo}</span>
      <span className="inline-flex items-center gap-1.5 text-lg text-ink">
        {Icono ? <Icono size={18} aria-hidden="true" className="text-accent" /> : null}
        {valor}
      </span>
      <span className="text-xs text-muted">{pie}</span>
    </div>
  );
}
