"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Plus, RefreshCw, ShoppingCart, Trash2, Users } from "lucide-react";
import { useDatos } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Confirmar } from "@/components/ui/confirmar";
import { Badge, RatingButtons, type Rating } from "@/components/ui/controls";
import { Cargando } from "@/components/app/onboarding";
import dynamic from "next/dynamic";

const ModalCambiarObjetivo = dynamic(
  () => import("@/components/app/modal-cambiar-objetivo").then((m) => m.ModalCambiarObjetivo),
  { ssr: false },
);
import { useHoy } from "@/lib/use-hoy";
import { useFamilia } from "@/lib/use-familia";
import { sonidoCheck, sonidoExito, sonidoTap } from "@/lib/sonido";
import { vibrarCheck, vibrarExito, vibrarTap } from "@/lib/haptica";
import {
  CATEGORIAS,
  enCompra,
  enPeso,
  escalarDia,
  generarSemana,
  kcalDelDia,
  listaCompra,
  type Momento,
} from "@/lib/platos";
import { recetaDePlato } from "@/lib/recetas";
import {
  conComaSinCeros,
  edad,
  fechaUltimaPesada,
  gastoDiario,
  macrosDiarios,
  kcalDeHoy,
  pesoSuavizado,
} from "@/lib/calculos";

const CLAVE_COMPRADOS = "mi-peso:compra-tachados";
const CLAVE_COMPRA_EXTRAS = "mi-peso:compra-extras";
const CLAVE_CAMBIOS_SUELTOS = "mi-peso:plan-cambios-sueltos";

const ETIQUETA_MOMENTO: Record<Momento, string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  cena: "Cena",
  snack: "Snack",
};

const ICONO_MOMENTO: Record<Momento, string> = {
  desayuno: "☕",
  comida: "☀️",
  cena: "🌙",
  snack: "🍎",
};

const ARTICULO_MOMENTO: Record<Momento, string> = {
  desayuno: "el",
  comida: "la",
  cena: "la",
  snack: "el",
};

const UN_MOMENTO: Record<Momento, string> = {
  desayuno: "un desayuno",
  comida: "una comida",
  cena: "una cena",
  snack: "un snack",
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** «12 de octubre» o «28 de septiembre», a partir de una fecha en ISO. */
function enPalabras(iso: string): string {
  const [anyo, mes, dia] = iso.split("-").map(Number);
  if (!anyo || !mes || !dia) return iso;
  return `${dia} de ${MESES[mes - 1]}`;
}

/** «Semana del 12 al 18 de octubre», o cruzando de mes, «del 28 de septiembre al 4 de octubre». */
function rangoEnPalabras(desdeISO: string, hastaISO: string): string {
  const mesDesde = desdeISO.slice(5, 7);
  const mesHasta = hastaISO.slice(5, 7);
  if (mesDesde === mesHasta) return `del ${enPalabras(desdeISO)} al ${hastaISO.slice(8, 10).replace(/^0/, "")} de ${MESES[Number(mesHasta) - 1]}`;
  return `del ${enPalabras(desdeISO)} al ${enPalabras(hastaISO)}`;
}

export default function PaginaPlan() {
  const { perfil, pesadas, gustos, comidas, marcarGusto, listo, anadirComida, borrarComida } =
    useDatos();
  const [semilla, setSemilla] = useState(0);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [comprados, setComprados] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CLAVE_COMPRADOS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const { grupo, compraHogar, anadirLoteCompra, anadirProductoCompra } = useFamilia();
  const [enviandoFamilia, setEnviandoFamilia] = useState(false);
  const [volcadoFamilia, setVolcadoFamilia] = useState(false);

  const cambiarComprados = (nuevo: string[] | ((prev: string[]) => string[])) => {
    setComprados((prev) => {
      const val = typeof nuevo === "function" ? nuevo(prev) : nuevo;
      try {
        window.localStorage.setItem(CLAVE_COMPRADOS, JSON.stringify(val));
      } catch {
        // sin localStorage
      }
      return val;
    });
  };
  const [vista, setVista] = useState<"menu" | "compra">("menu");
  const [alcanceCompra, setAlcanceCompra] = useState<"restante" | "semana">("restante");
  const [modalObjetivoAbierto, setModalObjetivoAbierto] = useState(false);
  const [extras, setExtras] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CLAVE_COMPRA_EXTRAS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [nuevoExtra, setNuevoExtra] = useState("");
  const [cambiosSueltos, setCambiosSueltos] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(CLAVE_CAMBIOS_SUELTOS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const rotarPlatoIndividual = (fechaDia: string, momento: Momento) => {
    sonidoTap();
    vibrarTap();
    const clave = `${fechaDia}:${momento}`;
    setCambiosSueltos((prev) => {
      const sig = { ...prev, [clave]: (prev[clave] ?? 0) + 1 };
      try {
        window.localStorage.setItem(CLAVE_CAMBIOS_SUELTOS, JSON.stringify(sig));
      } catch {}
      return sig;
    });
  };

  const anadirExtra = () => {
    const texto = nuevoExtra.trim();
    if (!texto) return;
    sonidoTap();
    vibrarTap();
    setExtras((prev) => {
      const actualizados = prev.includes(texto) ? prev : [...prev, texto];
      try {
        window.localStorage.setItem(CLAVE_COMPRA_EXTRAS, JSON.stringify(actualizados));
      } catch {
        // sin storage
      }
      return actualizados;
    });
    // Si tiene grupo familiar activo, se añade automáticamente al carro compartido
    if (compraHogar || grupo) {
      void anadirProductoCompra(texto);
    }
    setNuevoExtra("");
  };

  const borrarExtra = (item: string) => {
    setExtras((prev) => {
      const actualizados = prev.filter((i) => i !== item);
      try {
        window.localStorage.setItem(CLAVE_COMPRA_EXTRAS, JSON.stringify(actualizados));
      } catch {
        // sin storage
      }
      return actualizados;
    });
    cambiarComprados((prev) => prev.filter((i) => i !== `extra:${item}`));
  };

  const [confirmarCambio, setConfirmarCambio] = useState(false);
  // `undefined` = «todavía no sé qué día es» (hoy llega tarde desde el
  // navegador); `null` = «lo ha plegado todo». Así solo el día de hoy empieza
  // desplegado sin necesidad de un setState dentro de un efecto o un useMemo,
  // que React rechaza por riesgo de bucle.
  const [diaAbierto, setDiaAbierto] = useState<string | null | undefined>(undefined);
  const hoy = useHoy();
  const diaVisible = diaAbierto === undefined ? hoy : diaAbierto;

  const plan = useMemo(() => {
    // Sin la fecha del navegador no se calcula nada: `new Date()` en el
    // servidor daría una cosa y en el móvil otra.
    if (!perfil || !hoy) return null;
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
      hoy,
      fechaUltimaPesada(pesadas) ?? undefined,
    );
    return { kcal, macros: macrosDiarios(kcal, peso) };
  }, [perfil, pesadas, hoy]);

  // Las raciones de cada día se escalan para que sumen las calorías de arriba:
  // con raciones fijas, la semana se quedaba 200-300 kcal por debajo.
  // La semana se calcula con la fecha de hoy, pero solo cuando el navegador ya
  // la sabe: si se leyera el reloj al pintar en el servidor, saldría una
  // semana y el móvil pintaría otra.
  // Referencia siempre fresca a gustos sin provocar que calificar un plato
  // reorganice por sorpresa el resto de la semana
  const [gustosIniciales] = useState(gustos);

  const semana = useMemo(() => {
    if (!hoy || !plan) return [];
    const base = generarSemana(
      perfil?.noLeGustan ?? [],
      gustosIniciales,
      semilla,
      Math.round(plan.kcal),
      new Date(`${hoy}T12:00:00`),
      perfil?.dieta ?? "ninguna",
    );
    if (Object.keys(cambiosSueltos).length === 0) return base;

    return base.map((dia, idxDia) => {
      const comidasDia = { ...dia.comidas };
      for (const m of ["desayuno", "comida", "cena", "snack"] as Momento[]) {
        const saltos = cambiosSueltos[`${dia.fecha}:${m}`] ?? 0;
        if (saltos > 0) {
          const altSemana = generarSemana(
            perfil?.noLeGustan ?? [],
            gustosIniciales,
            semilla + saltos * 17 + idxDia,
            Math.round(plan.kcal),
            new Date(`${hoy}T12:00:00`),
            perfil?.dieta ?? "ninguna",
          );
          const platoAlt = altSemana[idxDia]?.comidas[m];
          if (platoAlt) comidasDia[m] = platoAlt;
        }
      }
      const diaMutado = { ...dia, comidas: comidasDia };
      return plan.kcal > 0 ? escalarDia(diaMutado, Math.round(plan.kcal)) : diaMutado;
    });
  }, [perfil?.noLeGustan, perfil?.dieta, semilla, plan, hoy, cambiosSueltos, gustosIniciales]);

  // Solo lo que queda por comprar o la semana completa según el selector
  const compra = useMemo(
    () => listaCompra(semana, alcanceCompra === "restante" ? (hoy ?? undefined) : undefined),
    [semana, alcanceCompra, hoy],
  );

  // Ingredientes que faltan por comprar para volcar al carro familiar si se desea
  const itemsPendientesDeCompra = useMemo(() => {
    const res: { nombre: string; cantidad: string }[] = [];
    for (const cat of CATEGORIAS) {
      const items = (compra[cat] ?? []).filter((i) => !comprados.includes(i.nombre));
      for (const item of items) {
        const cantidad =
          cat === "Despensa"
            ? `necesitas ${enPeso(item.gramos)}`
            : enCompra(item.nombre, item.gramos, item.categoria);
        res.push({ nombre: item.nombre, cantidad });
      }
    }
    // Incluir los artículos extra añadidos a mano que no estén tachados
    for (const ex of extras) {
      if (!comprados.includes(`extra:${ex}`)) {
        res.push({ nombre: ex, cantidad: "1 unidad" });
      }
    }
    return res;
  }, [compra, comprados, extras]);

  const volcarAFamilia = async () => {
    if ((!compraHogar && !grupo) || itemsPendientesDeCompra.length === 0) return;
    setEnviandoFamilia(true);
    const ok = await anadirLoteCompra(itemsPendientesDeCompra);
    setEnviandoFamilia(false);
    if (ok) {
      setVolcadoFamilia(true);
      setTimeout(() => setVolcadoFamilia(false), 3500);
    }
  };

  if (!listo || !perfil || !plan) return <Cargando />;

  const primeraFecha = semana[0]?.fecha;
  const ultimaFecha = semana[semana.length - 1]?.fecha;

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">Tu semana</p>
        <h1 className="text-xl text-ink">Plan de comidas</h1>
        {primeraFecha && ultimaFecha ? (
          <p className="text-sm text-muted">
            Semana {rangoEnPalabras(primeraFecha, ultimaFecha)}. Cambia sola cuando empieza otra.
          </p>
        ) : null}
        {vista === "menu" ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent shadow-2xs">
              🔥 {plan.kcal} kcal/día
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs">
              🥩 {plan.macros.proteinas}g Proteína
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs">
              🌾 {plan.macros.carbohidratos}g Hidratos
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs">
              🥑 {plan.macros.grasas}g Grasa
            </span>
          </div>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={vista === "menu" ? "primary" : "secondary"}
          size="sm"
          aria-pressed={vista === "menu"}
          onClick={() => setVista("menu")}
        >
          Menú
        </Button>
        <Button
          variant={vista === "compra" ? "primary" : "secondary"}
          size="sm"
          aria-pressed={vista === "compra"}
          onClick={() => setVista("compra")}
        >
          Compra
        </Button>
      </div>

      {vista === "menu" ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmarCambio(true)}>
              <RefreshCw size={16} aria-hidden="true" />
              Cambiar los platos
            </Button>
            <span className="text-sm text-muted">
              {Object.keys(gustos).length === 1
                ? "1 plato valorado"
                : `${Object.keys(gustos).length} platos valorados`}
            </span>
          </div>
          <p className="text-xs text-muted">
            Vuelve a montar los platos de toda la semana, no solo el día que estés mirando.
          </p>
        </div>
      ) : null}

      {vista === "menu" ? (
      <section className="flex flex-col gap-3">
        {semana.map((dia) => {
          const kcal = kcalDelDia(dia);
          const esHoy = dia.fecha === hoy;
          const diaExpandido = diaVisible === dia.fecha;
          return (
            <article
              key={dia.fecha}
              className={`flex flex-col gap-1 rounded-lg p-4 ${
                esHoy ? "border border-accent bg-accent-soft" : "bg-surface"
              }`}
            >
              <button
                type="button"
                data-dia={dia.fecha}
                aria-expanded={diaExpandido}
                onClick={() => setDiaAbierto(diaExpandido ? null : dia.fecha)}
                className="flex w-full items-center justify-between gap-2 pb-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  {dia.dia}
                  {esHoy ? <Badge tone="accent">hoy</Badge> : null}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">{kcal} kcal</span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={[
                      "shrink-0 text-muted transition-transform duration-200 ease-app",
                      diaExpandido ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </div>
              </button>
              {diaExpandido
                ? (Object.keys(ETIQUETA_MOMENTO) as Momento[]).map((momento) => {
                const plato = dia.comidas[momento];
                const clave = `${dia.dia}-${momento}`;
                if (!plato) {
                  return (
                    <p key={clave} className="py-2 text-sm text-muted">
                      {ETIQUETA_MOMENTO[momento]}: no hay ningún plato que encaje con tus gustos.
                    </p>
                  );
                }
                const expandido = abierto === clave;
                // El día entra en la clave para que dos platos iguales de días
                // distintos no se confundan al anotarlos.
                // ¿Este plato ya está anotado en Hoy? Se mira en los datos de
                // verdad (no en un estado suelto): así la marca no se pierde al
                // cambiar de pestaña, aguanta varios momentos a la vez y se
                // apaga sola si luego lo borras en Hoy.
                const yaAnotado =
                  !!hoy &&
                  comidas.some(
                    (c) =>
                      c.fecha === hoy &&
                      c.tipo === momento &&
                      c.alimentos.some((a) => a.nombre === plato.nombre),
                  );
                // Hay veces que ya hay otra comida del mismo turno (otro
                // desayuno, por ejemplo). El plato de este no está anotado,
                // pero si se pulsa se sumará otro. Hay que decirlo antes.
                const yaHayComida =
                  !!hoy && comidas.some((c) => c.fecha === hoy && c.tipo === momento);
                const gusto = gustos[plato.nombre];
                const valoracion: Rating =
                  gusto === "me-gusta" ? "like" : gusto === "no-me-gusta" ? "dislike" : null;
                // La receta detallada: escrita a mano para los platos del
                // catálogo, o montada con las piezas si es una combinación.
                const receta = recetaDePlato(plato);
                return (
                  <div key={clave} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      data-turno={clave}
                      aria-expanded={expandido}
                      onClick={() => setAbierto(expandido ? null : clave)}
                      className="flex w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="flex flex-1 flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                          <span>{ICONO_MOMENTO[momento]}</span>
                          <span>{ETIQUETA_MOMENTO[momento]}</span>
                        </span>
                        <span className="text-base text-ink">{plato.nombre}</span>
                      </span>
                      <span className="shrink-0 text-sm text-muted">{plato.kcal} kcal</span>
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className={[
                          "shrink-0 text-muted transition-transform duration-200 ease-app",
                          expandido ? "rotate-180" : "",
                        ].join(" ")}
                      />
                    </button>

                    {expandido ? (
                      <div className="flex flex-col gap-3 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="neutral">P {conComaSinCeros(plato.proteinas)} g</Badge>
                          <Badge tone="neutral">C {conComaSinCeros(plato.carbohidratos)} g</Badge>
                          <Badge tone="neutral">G {conComaSinCeros(plato.grasas)} g</Badge>
                          {plato.etiquetas.map((e) => (
                            <Badge key={e}>{e}</Badge>
                          ))}
                        </div>

                        {/* Las acciones van justo debajo de los macros: se
                            puede anotar o valorar sin leerse la receta entera. */}
                        {yaHayComida && !yaAnotado ? (
                          <p className="text-xs text-muted">
                            Ya tienes {UN_MOMENTO[momento]} anotado en Hoy. Puedes sumar este plato
                            o reemplazar el que había.
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          {/* Si ya hay algo anotado en ese turno, lo que se
                              quiere casi siempre es sustituirlo por el plato
                              del plan, no duplicarlo. Por eso Reemplazar va
                              primero y con más peso que Sumar otro. */}
                          {yaAnotado ? (
                            <Button variant="secondary" size="sm" disabled>
                              ✓ Anotado en Hoy
                            </Button>
                          ) : yaHayComida && esHoy ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (!hoy) return;
                                  for (const previa of comidas.filter(
                                    (c) => c.fecha === hoy && c.tipo === momento && !c.capricho,
                                  )) {
                                    borrarComida(previa.id);
                                  }
                                  sonidoExito();
                                  vibrarExito();
                                  anadirComida({
                                    fecha: hoy,
                                    tipo: momento,
                                    alimentos: [
                                      {
                                        id: `${Date.now()}-plan`,
                                        nombre: plato.nombre,
                                        cantidad: "1 plato del plan",
                                        kcal: plato.kcal,
                                        proteinas: plato.proteinas,
                                        carbohidratos: plato.carbohidratos,
                                        grasas: plato.grasas,
                                      },
                                    ],
                                  });
                                }}
                              >
                                Reemplazar {ETIQUETA_MOMENTO[momento].toLowerCase()}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!hoy) return;
                                  sonidoExito();
                                  vibrarExito();
                                  anadirComida({
                                    fecha: hoy,
                                    tipo: momento,
                                    alimentos: [
                                      {
                                        id: `${Date.now()}-plan`,
                                        nombre: plato.nombre,
                                        cantidad: "1 plato del plan",
                                        kcal: plato.kcal,
                                        proteinas: plato.proteinas,
                                        carbohidratos: plato.carbohidratos,
                                        grasas: plato.grasas,
                                      },
                                    ],
                                  });
                                }}
                              >
                                Sumar otro {ETIQUETA_MOMENTO[momento].toLowerCase()}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                // El plato entra entero al diario de hoy para no
                                // escribirlo a mano.
                                if (!hoy) return;
                                sonidoExito();
                                vibrarExito();
                                anadirComida({
                                  fecha: hoy,
                                  tipo: momento,
                                  alimentos: [
                                    {
                                      id: `${Date.now()}-plan`,
                                      nombre: plato.nombre,
                                      cantidad: "1 plato del plan",
                                      kcal: plato.kcal,
                                      proteinas: plato.proteinas,
                                      carbohidratos: plato.carbohidratos,
                                      grasas: plato.grasas,
                                    },
                                  ],
                                });
                              }}
                            >
                              {esHoy
                                ? `Anotar ${ARTICULO_MOMENTO[momento]} ${ETIQUETA_MOMENTO[momento].toLowerCase()} en Hoy`
                                : `Anotar ${ARTICULO_MOMENTO[momento]} ${ETIQUETA_MOMENTO[momento].toLowerCase()} del ${dia.dia.toLowerCase()} en Hoy`}
                            </Button>
                          )}
                        </div>

                        <RatingButtons
                          value={valoracion}
                          onChange={(v) => {
                            const nuevoGusto = v === "dislike" ? "no-me-gusta" : "me-gusta";
                            marcarGusto(plato.nombre, nuevoGusto);
                            if (nuevoGusto === "no-me-gusta") {
                              rotarPlatoIndividual(dia.fecha, momento);
                            }
                          }}
                        />
                        <p className="text-xs text-muted">
                          {valoracion === "dislike"
                            ? "Plato reemplazado en este día y guardado en tus preferencias."
                            : "Si marcas «no me gusta», desaparece de este día y te propongo otro."}
                        </p>

                        <div>
                          <h4 className="text-sm font-semibold text-ink">Ingredientes</h4>
                          <ul className="pt-1">
                            {plato.ingredientes.map((i) => (
                              <li
                                key={i.nombre}
                                className="flex justify-between py-0.5 text-sm text-muted"
                              >
                                <span>{i.nombre}</span>
                                <span>{enPeso(i.gramos)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {receta ? (
                          <div className="flex flex-col gap-2 rounded-md bg-bg p-3">
                            <h4 className="text-sm font-semibold text-ink">Receta paso a paso</h4>
                            <p className="text-xs text-muted">
                              {receta.tiempoMin} min · {receta.dificultad} · Necesitas:{" "}
                              {receta.utensilios.join(", ")}
                            </p>
                            <p className="text-sm text-muted">
                              <span className="font-semibold text-ink">Antes de empezar:</span>{" "}
                              {receta.antes}
                            </p>
                            <ol className="flex flex-col gap-2 pt-1">
                              {receta.pasos.map((paso, i) => (
                                <li key={paso.titulo} className="text-sm">
                                  <p className="font-semibold text-ink">
                                    {i + 1}. {paso.titulo}
                                  </p>
                                  <p className="text-muted">{paso.texto}</p>
                                </li>
                              ))}
                            </ol>
                            <p className="text-sm text-muted">
                              <span className="font-semibold text-ink">Truco:</span> {receta.truco}
                            </p>
                            {receta.conservacion ? (
                              <p className="text-xs text-muted">
                                Para guardarlo: {receta.conservacion}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <h4 className="text-sm font-semibold text-ink">Cómo se hace</h4>
                            <ol className="list-decimal pl-5 pt-1 text-sm text-muted">
                              {plato.pasos.map((p) => (
                                <li key={p} className="py-0.5">
                                  {p}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                      </div>
                    ) : null}
                  </div>
                );
              })
                : null}
            </article>
          );
        })}
      </section>
      ) : null}

      {vista === "compra" ? (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <ShoppingCart size={18} aria-hidden="true" className="text-accent" />
            Lista de la compra
          </h2>
          {comprados.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cambiarComprados([])}
              className="text-xs text-muted hover:text-ink h-7 px-2"
            >
              Desmarcar todo ({comprados.length})
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          Lo que necesitas para cocinar según tu plan semanal. Toca un artículo para tacharlo.
        </p>

        {/* Alcance de la compra: días restantes vs semana completa */}
        <div className="flex flex-col gap-2 rounded-xl bg-accent-soft/30 border border-accent/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Plan personalizado
            </span>
            <button
              type="button"
              onClick={() => setModalObjetivoAbierto(true)}
              className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold text-accent shadow-2xs border border-accent/30 hover:bg-accent hover:text-on-accent transition active:scale-95"
            >
              <span>
                {perfil?.objetivo
                  ? {
                      adelgazar: "Adelgazar",
                      mantener: "Mantenerme",
                      subir: "Subir de peso",
                      recomposicion: "Ganar músculo y perder grasa",
                      "volumen-limpio": "Ganar músculo sin grasa",
                    }[perfil.objetivo] ?? perfil.objetivo
                  : "Adelgazar"}
              </span>
              <span className="text-[10px] font-normal underline underline-offset-2 opacity-80">(Cambiar)</span>
            </button>
          </div>
          <p className="text-xs text-ink/90 leading-relaxed font-medium">
            {alcanceCompra === "restante"
              ? "Mostrando solo los ingredientes para los días que quedan de esta semana."
              : "Mostrando todos los ingredientes para cocinar los 7 días completos de la semana."}
          </p>
          <p className="text-[11px] text-muted leading-relaxed">
            💡 Esta lista se genera sola con los platos de tu menú: calculados con las {plan.kcal} kcal y {plan.macros.proteinas} g de proteína diaria que necesitas para tu objetivo de {perfil?.objetivo === "recomposicion" ? "ganar músculo y perder grasa" : perfil?.objetivo === "volumen-limpio" ? "ganar músculo sin grasa" : "tu peso ideal"}.
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                sonidoTap();
                vibrarTap();
                setAlcanceCompra("restante");
              }}
              className={[
                "flex-1 rounded-lg py-1.5 text-xs font-bold transition active:scale-95 text-center",
                alcanceCompra === "restante"
                  ? "bg-accent text-on-accent shadow-xs"
                  : "bg-surface border border-border text-muted hover:text-ink",
              ].join(" ")}
            >
              Días que quedan
            </button>
            <button
              type="button"
              onClick={() => {
                sonidoTap();
                vibrarTap();
                setAlcanceCompra("semana");
              }}
              className={[
                "flex-1 rounded-lg py-1.5 text-xs font-bold transition active:scale-95 text-center",
                alcanceCompra === "semana"
                  ? "bg-accent text-on-accent shadow-xs"
                  : "bg-surface border border-border text-muted hover:text-ink",
              ].join(" ")}
            >
              Semana completa (7 días)
            </button>
          </div>
        </div>

        {/* Añadir extras personalizados a la lista de la compra */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              <span>Tus extras añadidos ({extras.length})</span>
              {compraHogar ? (
                <span className="text-3xs font-semibold text-accent bg-accent-soft px-1.5 py-0.5 rounded-full lowercase">
                  ✓ en {compraHogar.nombre}
                </span>
              ) : grupo ? (
                <span className="text-3xs font-semibold text-accent bg-accent-soft px-1.5 py-0.5 rounded-full lowercase">
                  ✓ en {grupo.nombre}
                </span>
              ) : null}
            </h3>
            {extras.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setExtras([]);
                  try {
                    window.localStorage.removeItem(CLAVE_COMPRA_EXTRAS);
                  } catch {}
                }}
                className="text-[11px] font-medium text-muted hover:text-danger"
              >
                Limpiar extras
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nuevoExtra}
              onChange={(e) => setNuevoExtra(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  anadirExtra();
                }
              }}
              placeholder="Añadir extra a mano (ej. café, papel, agua...)"
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={anadirExtra}
              disabled={!nuevoExtra.trim()}
              className="h-8 text-xs shrink-0"
            >
              <Plus size={14} />
              Añadir
            </Button>
          </div>
          {extras.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border/50 pt-1">
              {extras.map((ex, idx) => {
                const hecho = comprados.includes(`extra:${ex}`);
                return (
                  <li key={`${ex}-${idx}`} className="flex items-center justify-between py-1.5 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sonidoCheck();
                        vibrarCheck();
                        cambiarComprados((prev) =>
                          hecho
                            ? prev.filter((n) => n !== `extra:${ex}`)
                            : [...prev, `extra:${ex}`],
                        );
                      }}
                      className="flex flex-1 items-center gap-2.5 text-left"
                    >
                      <span
                        className={[
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px]",
                          hecho
                            ? "border-accent bg-accent text-on-accent"
                            : "border-border-input bg-bg",
                        ].join(" ")}
                      >
                        {hecho ? "✓" : ""}
                      </span>
                      <span
                        className={[
                          "text-xs",
                          hecho ? "line-through text-muted" : "text-ink font-medium",
                        ].join(" ")}
                      >
                        {ex}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => borrarExtra(ex)}
                      className="text-muted hover:text-danger p-1 transition"
                      aria-label={`Eliminar ${ex}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>



        {/* Carro compartido familiar: SOLO si el usuario está en un grupo */}
        {compraHogar || grupo ? (
          <div className="flex flex-col gap-2.5 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-accent" />
                <h3 className="text-sm font-bold text-ink">
                  Carro de casa · {compraHogar?.nombre ?? grupo?.nombre}
                </h3>
              </div>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent shadow-xs border border-accent/20">
                {(compraHogar ? compraHogar.items : grupo?.compra ?? []).filter((i) => !i.comprado).length} en el carro
              </span>
            </div>
            <p className="text-xs text-muted">
              Comparte la compra en tiempo real con tu grupo. Quien vaya al súper verá lo que añadas.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Link
                href="/familia"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-accent/50 bg-accent px-3.5 text-xs font-semibold text-on-accent transition duration-150 ease-app hover:brightness-105 active:scale-95"
              >
                <Users size={14} />
                Ver carro familiar
              </Link>
              {itemsPendientesDeCompra.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={enviandoFamilia}
                  onClick={() => void volcarAFamilia()}
                  className="h-9 text-xs"
                >
                  {volcadoFamilia ? (
                    <>
                      <Check size={14} className="text-accent" />
                      ¡Añadidos a la familia!
                    </>
                  ) : enviandoFamilia ? (
                    "Añadiendo…"
                  ) : (
                    `Añadir lo que me falta (${itemsPendientesDeCompra.length})`
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        {CATEGORIAS.map((categoria) => {
          const articulos = compra[categoria];
          if (!articulos || articulos.length === 0) return null;
          return (
            <div key={categoria} className="flex flex-col gap-1">
              <h3 className="pt-2 text-sm font-semibold text-ink">{categoria}</h3>
              {categoria === "Despensa" ? (
                <p className="text-xs text-muted">
                  Lo que suele estar en el armario. No hace falta comprarlo cada semana: mira si
                  te queda lo que necesitas y repón solo lo que se haya acabado.
                </p>
              ) : null}
              <ul>
                {articulos.map((a) => {
                  const hecho = comprados.includes(a.nombre);
                  return (
                    <li key={a.nombre} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-pressed={hecho}
                        onClick={() => {
                          sonidoCheck();
                          vibrarCheck();
                          cambiarComprados((prev) =>
                            hecho ? prev.filter((n) => n !== a.nombre) : [...prev, a.nombre],
                          );
                        }}
                        className="flex flex-1 items-center gap-3 rounded-md py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent min-w-0"
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-xs",
                            hecho
                              ? "border-accent bg-accent text-on-accent"
                              : "border-border-input bg-bg",
                          ].join(" ")}
                        >
                          {hecho ? "✓" : ""}
                        </span>
                        <span
                          className={[
                            "flex-1 text-base",
                            hecho ? "text-muted line-through" : "text-ink",
                          ].join(" ")}
                        >
                          {a.nombre}
                        </span>
                        <span className="text-sm text-muted">
                          {/* En Despensa no se pide una cantidad de tienda: se
                              enseña lo que hace falta esta semana para mirar si
                              queda en el armario. */}
                          {categoria === "Despensa"
                            ? `necesitas ${enPeso(a.gramos)}`
                            : enCompra(a.nombre, a.gramos, a.categoria)}
                        </span>
                      </button>

                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {!compraHogar && !grupo ? (
          <div className="mt-2 rounded-xl border border-dashed border-border/70 bg-surface/40 p-3.5 text-center">
            <p className="text-xs text-muted">
              💡 ¿Haces la compra para casa entre varios? Puedes crear un grupo en la pestaña{" "}
              <Link href="/familia" className="font-semibold text-accent underline underline-offset-2">
                Familia
              </Link>{" "}
              para compartir el carro en tiempo real.
            </p>
          </div>
        ) : null}
      </section>
      ) : null}

      <Confirmar
        abierto={confirmarCambio}
        titulo="¿Cambiar los platos de la semana?"
        cuerpo="Se vuelven a montar los platos de toda la semana. Los que ya tienes anotados en Hoy no se tocan."
        confirmar="Sí, cambiar"
        onConfirmar={() => {
          setSemilla((s) => s + 1);
          setCambiosSueltos({});
          try {
            window.localStorage.removeItem(CLAVE_CAMBIOS_SUELTOS);
          } catch {}
          setConfirmarCambio(false);
        }}
        onCancelar={() => setConfirmarCambio(false)}
      />

      <ModalCambiarObjetivo
        abierto={modalObjetivoAbierto}
        onCerrar={() => setModalObjetivoAbierto(false)}
      />
    </div>
  );
}
