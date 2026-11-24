"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check, Dumbbell } from "lucide-react";
import { Badge, SegmentedControl } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { HABITOS_INICIALES, etiquetaDe } from "@/lib/habitos";
import { sonidoCheck, sonidoExito } from "@/lib/sonido";
import { vibrarCheck, vibrarExito } from "@/lib/haptica";
import { mostrarTostada } from "@/lib/tostada";
import type { Perfil } from "@/lib/store";
import {
  GRUPOS,
  diasDeEntrenamiento,
  diasSugeridos,
  proximoEntrenamiento,
  semanaDeEntrenamiento,
  sitioDeEntrenamiento,
  type Dias,
  type Ejercicio,
  type SesionResuelta,
} from "@/lib/ejercicios";

const OPCIONES_SITIO = [
  { value: "casa", label: "En casa" },
  { value: "gimnasio", label: "En el gimnasio" },
];

const OPCIONES_DIAS = [
  { value: "2", label: "2 días" },
  { value: "3", label: "3 días" },
  { value: "4", label: "4 días" },
];

type Props = {
  perfil: Perfil;
  hoy: string;
  guardarPerfil: (perfil: Perfil) => void;
  /** Ejercicios ya tachados, por día. */
  hechos: Record<string, string[]>;
  alternarEjercicio: (fecha: string, id: string) => void;
  marcarTodosEjercicios: (fecha: string, ids: string[]) => void;
  /** Hábitos del día, para marcar el de entrenar al completar la sesión. */
  habitosHechos: Record<string, string[]>;
  alternarHabito: (fecha: string, id: string) => void;
};

/**
 * El plan de ejercicios dentro de Plan.
 *
 * Dos apartados separados, casa y gimnasio, porque el material no es el
 * mismo. La semana se pinta entera, con hoy destacado, y cada sesión se abre
 * para ver los ejercicios. El vídeo va plegado dentro de cada ficha: quien
 * quiere leer los pasos no carga el reproductor, y quien quiere verlo lo abre.
 */
export function PlanEjercicios({
  perfil,
  hoy,
  guardarPerfil,
  hechos,
  alternarEjercicio,
  marcarTodosEjercicios,
  habitosHechos,
  alternarHabito,
}: Props) {
  const sitio = sitioDeEntrenamiento(perfil.ejercicioSitio);
  const dias = diasDeEntrenamiento(perfil.ejercicioDias, perfil.actividad);
  const sugerido = diasSugeridos(perfil.actividad);

  // `undefined` = todavía no ha plegado nada; `null` = lo ha plegado todo.
  const [diaAbierto, setDiaAbierto] = useState<string | null | undefined>(undefined);
  const [abierto, setAbierto] = useState<string | null>(null);
  const diaVisible = diaAbierto === undefined ? hoy : diaAbierto;

  const semana = useMemo(
    () => semanaDeEntrenamiento(sitio, dias, hoy),
    [sitio, dias, hoy],
  );
  const proximo = useMemo(
    () => proximoEntrenamiento(sitio, dias, hoy),
    [sitio, dias, hoy],
  );

  const hoyEntrena = semana.find((d) => d.esHoy)?.sesion ?? null;
  // Cuántos ejercicios de hoy están hechos: lo usan la tarjeta de arriba y el
  // acordeón, para que los dos digan lo mismo al terminar.
  const hechosHoy = hoyEntrena
    ? hoyEntrena.ejercicios.filter((e) => (hechos[hoy] ?? []).includes(e.id)).length
    : 0;
  const totalHoy = hoyEntrena?.ejercicios.length ?? 0;
  const hoyCompleto = totalHoy > 0 && hechosHoy === totalHoy;

  const cambiarSitio = (valor: string) => {
    setAbierto(null);
    setDiaAbierto(undefined);
    guardarPerfil({ ...perfil, ejercicioSitio: valor === "gimnasio" ? "gimnasio" : "casa" });
  };

  const cambiarDias = (valor: string) => {
    const numero = Number(valor);
    if (numero !== 2 && numero !== 3 && numero !== 4) return;
    setAbierto(null);
    setDiaAbierto(undefined);
    guardarPerfil({ ...perfil, ejercicioDias: numero as Dias });
  };

  return (
    <section data-sitio={sitio} className="flex flex-col gap-4" aria-label="Plan de ejercicios">
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-ink">Dónde entrenas</p>
          <SegmentedControl
            label="Dónde entrenas"
            options={OPCIONES_SITIO}
            value={sitio}
            onChange={cambiarSitio}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-ink">Días a la semana</p>
          <SegmentedControl
            label="Días de ejercicio a la semana"
            options={OPCIONES_DIAS}
            value={String(dias)}
            onChange={cambiarDias}
          />
          <p className="text-xs text-muted">
            {dias === sugerido
              ? `Te propongo ${sugerido} días según lo que dijiste de tu actividad. Puedes cambiarlo cuando quieras.`
              : `Has elegido ${dias} días. Según tu actividad te proponía ${sugerido}, pero manda lo que elijas tú.`}
          </p>
        </div>
      </div>

      {hoyEntrena ? (
        <button
          type="button"
          onClick={() => {
            setDiaAbierto(hoy);
            // La tarjeta de hoy ya existe debajo; se baja hasta ella en el
            // siguiente fotograma, cuando el desplegable ya está abierto.
            requestAnimationFrame(() => {
              document
                .querySelector(`[data-dia-entreno="${hoy}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
          className={[
            "flex w-full items-start justify-between gap-2 rounded-lg p-4 text-left",
            "transition-transform duration-150 ease-out active:scale-[0.99]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            "bg-accent-soft",
          ].join(" ")}
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-2 text-sm text-muted">
              {hoyCompleto ? (
                <Check size={16} aria-hidden="true" className="text-accent" />
              ) : (
                <Dumbbell size={16} aria-hidden="true" className="text-accent" />
              )}
              {hoyCompleto ? "Hoy has cumplido" : "Hoy toca"}
            </span>
            <span className="text-base font-semibold text-ink">{hoyEntrena.nombre}</span>
            <span className="text-sm text-muted">
              {hoyCompleto
                ? `${totalHoy} de ${totalHoy} ejercicios. Ya está hecho.`
                : hoyEntrena.resumen}
            </span>
            <span className={hoyCompleto ? "text-sm font-semibold text-accent" : "inline-flex items-center gap-1 text-sm font-semibold text-accent"}>
              {hoyCompleto ? "Buen trabajo" : "Ver ejercicios"}
              {hoyCompleto ? null : <ChevronDown size={15} aria-hidden="true" />}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="mt-1 shrink-0 text-muted"
          />
        </button>
      ) : (
        <article className="flex flex-col gap-1 rounded-lg bg-accent-soft p-4">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Dumbbell size={16} aria-hidden="true" className="text-accent" />
            Hoy toca descansar
          </p>
          <h2 className="text-base font-semibold text-ink">Descanso</h2>
          <p className="text-sm text-muted">
            Vuelves el {proximo.dia.toLowerCase()} con «{proximo.sesion.nombre}». Andar, estirar
            o no hacer nada también cuenta.
          </p>
        </article>
      )}

      <div className="flex flex-col gap-3">
        {semana.map((dia) => {
          const expandido = diaVisible === dia.fecha && dia.entrena;
          const sesion: SesionResuelta | null = dia.sesion;
          const marcadosDia = hechos[dia.fecha] ?? [];
          const hechosDia = sesion
            ? sesion.ejercicios.filter((e) => marcadosDia.includes(e.id)).length
            : 0;
          const totalDia = sesion?.ejercicios.length ?? 0;
          const completoDia = totalDia > 0 && hechosDia === totalDia;
          return (
            <article
              key={dia.fecha}
              className={`flex flex-col gap-1 rounded-lg p-4 ${
                dia.esHoy ? "border border-accent bg-accent-soft" : "bg-surface"
              }`}
            >
              {sesion ? (
                <>
                  <button
                    type="button"
                    data-dia-entreno={dia.fecha}
                    aria-expanded={expandido}
                    onClick={() => setDiaAbierto(expandido ? null : dia.fecha)}
                    className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="flex flex-col">
                      <span className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-ink">{dia.dia}</h2>
                        {dia.esHoy ? <Badge tone="accent">hoy</Badge> : null}
                      </span>
                      <span className="text-sm text-muted">{sesion.nombre}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {completoDia ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                          <Check size={14} aria-hidden="true" />
                          {totalDia}/{totalDia}
                        </span>
                      ) : (
                        <span className="text-sm text-muted">
                          {hechosDia > 0
                            ? `${hechosDia} de ${totalDia} hechos`
                            : `${totalDia} ejercicios`}
                        </span>
                      )}
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className={[
                          "text-muted transition-transform duration-200 ease-app",
                          expandido ? "rotate-180" : "",
                        ].join(" ")}
                      />
                    </span>
                  </button>

                  {expandido ? (
                    <div className="flex flex-col gap-1 pt-1">
                      {/* En el día de hoy el resumen ya está en la tarjeta de
                          arriba; repetirlo aquí solo alarga la lista. */}
                      {!dia.esHoy ? (
                        <p className="pb-1 text-sm text-muted">{sesion.resumen}</p>
                      ) : null}
                      {sesion.ejercicios.map((ejercicio) => {
                        const estaHecho = marcadosDia.includes(ejercicio.id);
                        const clave = `${dia.fecha}-${ejercicio.id}`;
                        return (
                          <FichaEjercicio
                            key={ejercicio.id}
                            ejercicio={ejercicio}
                            hecho={estaHecho}
                            onAlternar={() => {
                              sonidoCheck();
                              vibrarCheck();
                              alternarEjercicio(dia.fecha, ejercicio.id);
                              // Si con este queda la sesión entera, se marca
                              // también el hábito de entrenar, igual que con
                              // el botón «Marcar todo como hecho».
                              if (!estaHecho && hechosDia + 1 === totalDia) {
                                const activos = perfil.habitosActivos ?? HABITOS_INICIALES;
                                if (
                                  activos.includes("correr") &&
                                  !(habitosHechos[dia.fecha] ?? []).includes("correr")
                                ) {
                                  alternarHabito(dia.fecha, "correr");
                                }
                              }
                              // Al tachar el ejercicio que estaba abierto, se
                              // pliega y se abre el siguiente pendiente: la
                              // pantalla no se queda llena de texto ya leído.
                              if (!estaHecho && abierto === clave) {
                                const siguiente = sesion.ejercicios.find(
                                  (e) => e.id !== ejercicio.id && !marcadosDia.includes(e.id),
                                );
                                setAbierto(siguiente ? `${dia.fecha}-${siguiente.id}` : null);
                              }
                            }}
                            abierto={abierto === clave}
                            onToggle={() => {
                              setAbierto(abierto === clave ? null : clave);
                            }}
                          />
                        );
                      })}

                      {dia.esHoy ? (
                        (() => {
                          const todos = totalDia > 0 && hechosDia === totalDia;
                          const activos = perfil.habitosActivos ?? HABITOS_INICIALES;
                          const habitoMarcado =
                            activos.includes("correr") &&
                            (habitosHechos[dia.fecha] ?? []).includes("correr");
                          return (
                            <div className="flex flex-col gap-2 pt-2">
                              {/* Con la sesión completa ya lo dice el 5/5 de la
                                  cabecera del acordeón: esta línea era la
                                  tercera vez que se leía lo mismo. Cuando aún
                                  falta algo, sí se queda: es lo único que lo
                                  dice. */}
                              {!todos ? (
                                <p className="text-xs text-muted">
                                  {hechosDia} de {totalDia} ejercicios hechos.
                                </p>
                              ) : null}
                              {todos ? (
                                <div className="flex flex-col gap-1.5 rounded-lg bg-accent-soft p-3">
                                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                                    <Check size={16} aria-hidden="true" />
                                    ¡Entreno de hoy completado!
                                  </p>
                                  <p className="text-xs text-muted">
                                    {habitoMarcado
                                      ? `Se ha marcado tu hábito «${etiquetaDe("correr", perfil.habitosPropios)}» (+5 pts).`
                                      : "Buen trabajo, sesión guardada en tu semana."}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-fit"
                                    onClick={() => {
                                      marcarTodosEjercicios(dia.fecha, []);
                                      // Al deshacer, ninguna ficha debe quedar
                                      // abierta: se vuelve al estado de partida.
                                      setAbierto(null);
                                    }}
                                  >
                                    Deshacer
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="w-fit border-accent text-accent"
                                  onClick={() => {
                                    sonidoExito();
                                    vibrarExito();
                                    mostrarTostada("¡Entreno de hoy completado! 💪 Sesión guardada.", "💪");
                                    marcarTodosEjercicios(
                                      dia.fecha,
                                      sesion.ejercicios.map((e) => e.id),
                                    );
                                    // Con la sesión entera hecha, la ficha que
                                    // estuviera abierta ya no aporta nada.
                                    setAbierto(null);
                                    // Si lleva el hábito de entrenar apuntado y
                                    // aún no lo había marcado, se marca solo:
                                    // acaba de hacer la sesión entera.
                                    const yaMarcado = (habitosHechos[dia.fecha] ?? []).includes(
                                      "correr",
                                    );
                                    if (activos.includes("correr") && !yaMarcado) {
                                      alternarHabito(dia.fecha, "correr");
                                    }
                                  }}
                                >
                                  Marcar todo como hecho
                                </Button>
                              )}
                            </div>
                          );
                        })()
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">{dia.dia}</h2>
                      {dia.esHoy ? <Badge tone="accent">hoy</Badge> : null}
                    </span>
                    <span className="text-sm text-muted">Descanso</span>
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        La rutina cambia sola cada semana. Si algo te duele, para y cámbialo: esto es una guía, no
        una receta médica.
      </p>
    </section>
  );
}

function FichaEjercicio({
  ejercicio,
  hecho,
  onAlternar,
  abierto,
  onToggle,
}: {
  ejercicio: Ejercicio;
  hecho: boolean;
  onAlternar: () => void;
  abierto: boolean;
  onToggle: () => void;
}) {
  // El vídeo no se crea hasta que se abre el desplegable: así la ficha no
  // carga veinte reproductores de golpe ni gasta datos sin querer.
  const [videoAbierto, setVideoAbierto] = useState(false);
  const descanso =
    ejercicio.descansoSeg > 0
      ? `${ejercicio.descansoSeg} s de descanso entre series`
      : "sin descanso programado";

  return (
    <div className="border-b border-border last:border-0">
      {/* La fila del check y el nombre va aparte de la ficha: si el
          desplegable fuera hermano dentro del mismo flex horizontal, los pasos
          se colarían al lado del nombre y lo dejarían en un hilo. */}
      <div className="flex items-center gap-1">
      {/* El check va en su propio botón: tachar un ejercicio no debe abrir
          su ficha, igual que tachar un artículo no abre la receta. */}
      <button
        type="button"
        aria-pressed={hecho}
        aria-label={
          hecho
            ? `Desmarcar ${ejercicio.nombre} como hecho`
            : `Marcar ${ejercicio.nombre} como hecho`
        }
        onClick={onAlternar}
        className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          aria-hidden="true"
          className={[
            "flex h-5 w-5 items-center justify-center rounded-sm border text-xs transition-colors duration-150",
            hecho
              ? "pulso-check border-accent bg-accent text-on-accent"
              : "border-border-input bg-bg",
          ].join(" ")}
        >
          {hecho ? "✓" : ""}
        </span>
      </button>

      <button
        type="button"
        data-ejercicio={ejercicio.id}
        aria-expanded={abierto}
        onClick={onToggle}
        className="flex flex-1 items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex flex-1 flex-col">
          <span className={hecho ? "text-base text-muted line-through" : "text-base text-ink"}>
            {ejercicio.nombre}
          </span>
          <span
            aria-hidden={hecho && !abierto}
            className={[
              "grid overflow-hidden text-xs text-muted transition-[grid-template-rows,opacity] duration-200 ease-out",
              // Al tachar se pliega para dejar la lista limpia, pero si la
              // persona toca el nombre para consultar qué hizo, las series y el
              // descanso vuelven a verse sin tener que quitarle el check.
              hecho && !abierto
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100",
            ].join(" ")}
          >
            <span className="min-h-0 overflow-hidden">
              {ejercicio.series} series × {ejercicio.reps} · {descanso}
            </span>
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={[
            "shrink-0 text-muted transition-transform duration-200 ease-app",
            abierto ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      </div>

      {/* El contenido se queda montado y se pliega con la rejilla: así al
          tachar un ejercicio abierto baja suave en vez de desaparecer de
          golpe, y el siguiente pendiente ocupa su sitio. */}
      <div
        data-ficha={ejercicio.id}
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
        aria-hidden={!abierto}
        inert={!abierto}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="neutral">{GRUPOS[ejercicio.grupo]}</Badge>
              <Badge tone="neutral">{ejercicio.material}</Badge>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-ink">Cómo se hace</h4>
              <ol className="list-decimal pl-5 pt-1 text-sm text-muted">
                {ejercicio.pasos.map((paso) => (
                  <li key={paso} className="py-0.5">
                    {paso}
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">Truco:</span> {ejercicio.truco}
            </p>

            <details
              className="rounded-md bg-bg p-3"
              onToggle={(e) => setVideoAbierto(e.currentTarget.open)}
            >
              <summary className="cursor-pointer text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Ver cómo se hace en vídeo
              </summary>
              {videoAbierto ? (
                <>
                  <div
                    className="relative mt-2 aspect-video w-full overflow-hidden rounded-md bg-black bg-cover bg-center"
                    style={{
                      backgroundImage: `url(https://i.ytimg.com/vi/${ejercicio.video}/hqdefault.jpg)`,
                    }}
                  >
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ejercicio.video}?rel=0&playsinline=1`}
                      title={`${ejercicio.nombre}: cómo se hace`}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${ejercicio.video}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Abrir el vídeo en YouTube
                  </a>
                </>
              ) : null}
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
