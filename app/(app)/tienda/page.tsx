"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  Gift,
  Info,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirmar } from "@/components/ui/confirmar";
import dynamic from "next/dynamic";

const HojaAnadir = dynamic(
  () => import("@/components/app/hoja-anadir").then((modulo) => modulo.HojaAnadir),
  { ssr: false },
);
import { Cargando } from "@/components/app/onboarding";
import { Confeti } from "@/components/ui/confeti";
import { sonidoCelebracion } from "@/lib/sonido";
import { vibrarCelebracion } from "@/lib/haptica";
import { useHoy } from "@/lib/use-hoy";
import { useDatos } from "@/lib/store";
import {
  COSTE_CAPRICHO,
  DIAS_ENFRIAMIENTO,
  saldoPuntos,
} from "@/lib/puntos";
import { HABITOS_INICIALES } from "@/lib/habitos";
import { diasDeEspera, recomendarCapricho } from "@/lib/tienda";
import {
  edad,
  fechaUltimaPesada,
  gastoDiario,
  hoyISO,
  kcalDeHoy,
  macrosDiarios,
  pesoSuavizado,
} from "@/lib/calculos";

/**
 * La tienda de puntos.
 *
 * Vive fuera de las pestañas: se entra desde el enlace de Hoy. Vende una sola
 * cosa, el capricho, y explica cuándo conviene: después de entrenar y sin
 * pesarse al día siguiente. El canje no apunta la comida; para eso está la
 * hoja de la foto, que guarda el capricho aparte del día.
 */
export default function PaginaTienda() {
  const {
    perfil,
    comidas,
    pesadas,
    aguaLitros,
    metaAguaL,
    caprichos,
    canjearCapricho,
    habitosHechos,
    saludDiaria,
    listo,
  } = useDatos();
  const hoy = useHoy();
  const [hoja, setHoja] = useState(false);
  const [confirmarCanje, setConfirmarCanje] = useState(false);
  const [lanzarConfeti, setLanzarConfeti] = useState(false);

  const plan = useMemo(() => {
    if (!perfil) return null;
    const peso = pesoSuavizado(pesadas) ?? perfil.pesoInicialKg;
    const gasto = gastoDiario(
      peso,
      perfil.alturaCm,
      edad(perfil.fechaNacimiento),
      perfil.sexo,
      perfil.actividad,
    );
    const kcal = kcalDeHoy(
      perfil,
      gasto,
      peso,
      hoy ?? hoyISO(),
      fechaUltimaPesada(pesadas) ?? undefined,
    );
    return { kcal, macros: macrosDiarios(kcal, peso) };
  }, [perfil, pesadas, hoy]);

  const puntos = useMemo(() => {
    if (!plan || !hoy || !perfil) return null;
    return {
      esCapricho: caprichos.includes(hoy),
      ...saldoPuntos(
        {
          // Los caprichos no cuentan en el día: ni suman kcal ni dan puntos
          // por comida. Se filtran antes de pasarlos a la cuenta.
          comidas: comidas
            .filter((c) => !c.capricho)
            .map((c) => ({
              fecha: c.fecha,
              kcal: c.alimentos.reduce((s, a) => s + a.kcal, 0),
              proteinas: c.alimentos.reduce((s, a) => s + a.proteinas, 0),
            })),
          aguaLitros,
          pesadas,
          habitosHechos: Object.fromEntries(
            Object.entries(habitosHechos ?? {}).map(([f, ids]) => [f, ids.length]),
          ),
          salud: saludDiaria,
        },
        {
          kcal: plan.kcal,
          proteinas: plan.macros.proteinas,
          aguaL: metaAguaL,
          habitosActivos: (perfil.habitosActivos ?? HABITOS_INICIALES).length,
          metaPasos: perfil.metaPasos ?? 8000,
          esMantenimiento: perfil.objetivo === "mantener" || perfil.objetivo === "subir",
        },
        caprichos,
        hoy,
      ),
    };
  }, [plan, hoy, perfil, comidas, aguaLitros, pesadas, metaAguaL, caprichos, habitosHechos, saludDiaria]);

  if (!listo || !perfil || !plan || !hoy || !puntos) return <Cargando />;

  const caprichoDeHoy = comidas.filter((c) => c.fecha === hoy && c.capricho);
  const yaAnotado = caprichoDeHoy.length > 0;
  const recomendacion = recomendarCapricho(perfil, hoy, caprichos);
  const espera = diasDeEspera(caprichos, hoy, perfil.objetivo);
  const faltan = Math.max(0, COSTE_CAPRICHO - puntos.saldo);
  const progreso = Math.min(100, (puntos.saldo / COSTE_CAPRICHO) * 100);

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-8">
      <header className="flex flex-col gap-1">
        <Link
          href="/hoy"
          className="mb-1 inline-flex w-fit items-center gap-0.5 text-sm font-semibold text-accent underline underline-offset-2"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Hoy
        </Link>
        <p className="text-sm text-muted">Con lo que ganas cada día</p>
        <h1 className="text-xl text-ink">Tienda de puntos</h1>
      </header>

      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="text-base font-semibold text-ink">Tu saldo</h2>
        <p className="text-3xl text-ink">
          {puntos.saldo} <span className="text-base text-muted">puntos</span>
        </p>
        <div
          role="progressbar"
          aria-label={`Saldo para el capricho: ${puntos.saldo} de ${COSTE_CAPRICHO} puntos.`}
          aria-valuemin={0}
          aria-valuemax={COSTE_CAPRICHO}
          aria-valuenow={Math.min(puntos.saldo, COSTE_CAPRICHO)}
          className="h-2 w-full overflow-hidden rounded-pill bg-border"
        >
          <div
            className="h-full rounded-pill bg-accent transition-[width] duration-500 ease-app"
            style={{ width: `${progreso}%` }}
          />
        </div>
        <p className="text-sm text-muted">
          {puntos.esCapricho
            ? // El saldo grande de arriba ya lleva descontado el capricho de hoy
              // (`saldoPuntos` resta 500 el mismo día del canje), así que esta
              // cifra es lo que va guardado para el siguiente. Antes el texto
              // decía «el saldo de arriba es para el siguiente» y obligaba a
              // mirar arriba: ahora se dice el número tal cual.
              `Has gastado ${COSTE_CAPRICHO} puntos hoy. ${
                puntos.saldo > 0
                  ? `Te quedan ${puntos.saldo} para el siguiente capricho.`
                  : "Vuelves a empezar de cero para el siguiente capricho."
              }`
            : faltan > 0
              ? `Te faltan ${faltan} puntos para el capricho.`
              : "Ya tienes puntos para el capricho."}{" "}
          Hoy llevas {puntos.ganadosHoy} pts.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-accent/30 bg-accent-soft p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-accent text-on-accent">
            <Gift size={24} aria-hidden="true" />
          </span>
          <div className="flex flex-1 flex-col">
            <h2 className="text-lg font-semibold text-ink">Capricho</h2>
            <p className="text-sm text-muted">Una comida libre, sin contar en el día.</p>
          </div>
          <span className="shrink-0 rounded-pill bg-bg px-3 py-1 text-sm font-semibold text-ink">
            {COSTE_CAPRICHO} pts
          </span>
        </div>

        <ul className="flex flex-col gap-1.5 text-sm text-muted">
          <li className="flex items-center gap-2">
            <Check size={15} aria-hidden="true" className="shrink-0 text-accent" />
            Eliges el día y lo canjeas aquí.
          </li>
          <li className="flex items-center gap-2">
            <Check size={15} aria-hidden="true" className="shrink-0 text-accent" />
            Lo apuntas con una foto o escribiendo el nombre.
          </li>
          <li className="flex items-center gap-2">
            <Check size={15} aria-hidden="true" className="shrink-0 text-accent" />
            {perfil.objetivo === "mantener" || perfil.objetivo === "subir" ? "En mantenimiento no hay espera de 5 días: canjea cuando mejor te cuadre." : `No puedes repetir hasta ${DIAS_ENFRIAMIENTO} días después.`}
          </li>
        </ul>

        <div className="flex flex-col gap-1 rounded-md bg-bg/70 p-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CalendarDays size={15} aria-hidden="true" />
            Cuándo te conviene
          </span>
          <p className="text-sm text-muted">{recomendacion.texto}</p>
        </div>

        {puntos.esCapricho ? (
          yaAnotado ? (
            <div className="flex flex-col gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                <Check size={16} aria-hidden="true" />
                Capricho anotado. Va aparte del día.
              </p>
              <p className="text-sm text-muted">
                {caprichoDeHoy
                  .flatMap((c) => c.alimentos)
                  .map((a) => a.nombre)
                  .join(", ")}
              </p>
              <Link
                href="/hoy"
                className="w-fit text-sm font-semibold text-accent underline underline-offset-2"
              >
                Verlo en Hoy
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                <Sparkles size={16} aria-hidden="true" />
                Hoy es tu día de capricho.
              </p>
              <Button size="lg" onClick={() => setHoja(true)}>
                <Camera size={18} aria-hidden="true" />
                Anotar mi capricho
              </Button>
            </div>
          )
        ) : puntos.puedeCanjear && !confirmarCanje ? (
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={() => setConfirmarCanje(true)}>
              <Gift size={18} aria-hidden="true" />
              Canjear capricho ({COSTE_CAPRICHO} pts)
            </Button>
          </div>
        ) : espera > 0 ? (
          <p className="rounded-md bg-bg/70 px-3 py-2 text-sm text-muted">
            Todavía no puedes canjear otro: te{" "}
            {espera === 1 ? "queda 1 día" : `quedan ${espera} días`} desde el último capricho.
          </p>
        ) : (
          <p className="rounded-md bg-bg/70 px-3 py-2 text-sm text-muted">
            Te faltan {faltan} puntos. Se ganan comiendo dentro del plan, con el agua, la proteína,
            pesándote y marcando hábitos.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">Cómo aprovecharlo</h2>
        <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
          <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm text-muted">
            Cómelo después de entrenar y, si puedes, no te peses al día siguiente. Así el capricho
            no te estropea la pesada ni te hace pensar que has tirado la semana.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
          <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm text-muted">
            Que sea una comida que te guste de verdad, no picotear todo el día. El resto de comidas
            siguen su curso normal.
          </p>
        </div>
      </section>

      {hoja ? <HojaAnadir esCapricho onCerrar={() => setHoja(false)} /> : null}
      {lanzarConfeti ? <Confeti onCompletado={() => setLanzarConfeti(false)} /> : null}

      <Confirmar
        abierto={confirmarCanje}
        titulo="¿Canjear el capricho?"
        cuerpo={`Se gastan ${COSTE_CAPRICHO} puntos y no se devuelven. Después podrás apuntarlo con una foto o escribiendo el nombre.`}
        confirmar="Sí, canjear"
        onConfirmar={() => {
          canjearCapricho(hoy);
          sonidoCelebracion();
          vibrarCelebracion();
          setLanzarConfeti(true);
          setConfirmarCanje(false);
        }}
        onCancelar={() => setConfirmarCanje(false)}
      />
    </div>
  );
}
