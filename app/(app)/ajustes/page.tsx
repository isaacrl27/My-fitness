"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { Droplets, Footprints, GlassWater, Heart, Info, ListChecks, LogOut, Play, Share2, ShieldCheck, SunMoon, Trash2, Type, Volume2 } from "lucide-react";
import { useDatos, type EstadoNube, type Perfil } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ChoiceList } from "@/components/ui/choice";
import { HABITOS_INICIALES } from "@/lib/habitos";
import { Cargando } from "@/components/app/onboarding";
import { NOMBRE_MAX, revisarNombre } from "@/lib/nombre";
import { aguaRecomendadaL } from "@/lib/agua";
import { ListaRoja } from "@/components/app/lista-roja";
import { SeccionAvisos } from "@/components/app/seccion-avisos";
import { BuzonBeta } from "@/components/app/buzon-beta";
import dynamic from "next/dynamic";

const ModalGuiaVideo = dynamic(
  () => import("@/components/app/modal-guia-video").then((m) => m.ModalGuiaVideo),
  { ssr: false },
);
const ModalFloCiclo = dynamic(
  () => import("@/components/app/modal-flo-ciclo").then((m) => m.ModalFloCiclo),
  { ssr: false },
);
const ModalCambiarObjetivo = dynamic(
  () => import("@/components/app/modal-cambiar-objetivo").then((m) => m.ModalCambiarObjetivo),
  { ssr: false },
);
import { SegmentedControl, Switch } from "@/components/ui/controls";
import { esAppNativa, leerSaludUltimosDias, pedirPermisoSalud } from "@/lib/salud-nativa";
import { guardarTema, leerTema, normalizarTema, type Tema } from "@/lib/tema";
import { guardarTamano, leerTamano, normalizarTamano, type TamanoTexto } from "@/lib/tamano";
import { guardarSonidosActivados, sonidoTap, sonidosActivados } from "@/lib/sonido";
import { guardarVibracionActivada, vibracionActivada, vibrarTap } from "@/lib/haptica";
import { VERSION_ETIQUETA } from "@/lib/version";
import {
  ACTIVIDADES,
  ritmosPara,
  aAlturaCm,
  type Objetivo,
  aNumero,
  clasificacionImc,
  conComa,
  conComaSinCeros,
  conMiles,
  edad,
  fechaUltimaPesada,
  gastoDiario,
  hoyISO,
  imc,
  kcalDeHoy,
  kcalRedondeadas,
  macrosDiarios,
  objetivoCalorico,
  pesoSuavizado,
  validarPesoObjetivo,
  type Actividad,
} from "@/lib/calculos";

/**
 * Conectar la app con la salud del móvil (pasos y sueño). Solo aparece
 * dentro de la app de Android/iPhone: en la web no hay nada que conectar.
 */
function detectarPlataforma(): "ios" | "android" | "otro" {
  if (typeof navigator === "undefined") return "otro";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "otro";
}

function SeccionSaludNativa() {
  const { ponerSaludLote, codigoNube } = useDatos();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const plataforma = useSyncExternalStore(
    () => () => {},
    () => detectarPlataforma(),
    () => "otro" as const,
  );

  // La app no cambia de contenedor en caliente: leer si estamos dentro de la
  // app nativa como «valor externo» evita renders de más (y el linter lo pide).
  const nativa = useSyncExternalStore(
    () => () => {},
    () => esAppNativa(),
    () => false,
  );

  async function conectar() {
    setOcupado(true);
    setAviso(null);
    const permiso = await pedirPermisoSalud();
    if (!permiso) {
      setOcupado(false);
      setAviso("No se pudo abrir el permiso de Salud de Android.");
      return;
    }
    const lote = await leerSaludUltimosDias(7);
    ponerSaludLote(lote);
    setOcupado(false);
    setAviso(
      Object.keys(lote).length > 0
        ? `Conectado: guardados ${Object.keys(lote).length} días de pasos y sueño.`
        : "Sin datos todavía. Si llevas el móvil encima y sale 0, revisa Ajustes del móvil → Salud → Acceso a datos → My Fitness.",
    );
  }

  function abrirAtajoIPhone() {
    if (codigoNube && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codigoNube).catch(() => {});
      setCopiado(true);
      setTimeout(() => setCopiado(false), 4000);
    }
    window.open("https://www.icloud.com/shortcuts/315e8bfc4a6944aeadd440a6c19ac2dc", "_blank");
  }

  const esIos = plataforma === "ios";
  const esAndroid = plataforma === "android";

  const titulo = esIos
    ? "Apple Salud (Pasos de tu iPhone)"
    : esAndroid
      ? "Health Connect (Pasos de Android)"
      : "Pasos automáticos del móvil";

  const etiqueta = esIos
    ? "Apple (iPhone)"
    : esAndroid
      ? (nativa ? "Health Connect activo" : "Android")
      : "Apple / Android";

  const descripcion = esIos
    ? "Sincroniza tus pasos automáticamente desde tu iPhone con Apple Salud."
    : esAndroid
      ? "Sincroniza tus pasos automáticamente con Health Connect en tu móvil Android."
      : "Sincroniza tus pasos automáticamente conectando Apple Salud en iPhone o Health Connect en Android.";

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Footprints size={18} aria-hidden="true" className="text-accent shrink-0" />
          {titulo}
        </h2>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent">
          {etiqueta}
        </span>
      </div>
      <p className="text-sm text-muted">
        {descripcion}
      </p>
      <div className="flex flex-wrap gap-2">
        {esAndroid ? (
          nativa ? (
            <Button onClick={conectar} disabled={ocupado}>
              <span>🤖</span>
              <span>{ocupado ? "Conectando…" : "Sincronizar Salud (Health Connect)"}</span>
            </Button>
          ) : (
            <a
              href="/descargas/my-fitness-android.apk"
              download
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90 active:scale-95 transition"
            >
              <span>🤖</span>
              <span>Conectar Android (Instalar app a 1 toque)</span>
            </a>
          )
        ) : esIos ? (
          <Button onClick={abrirAtajoIPhone}>
            <span>🍏</span>
            <span>Conectar Apple Salud (1 toque)</span>
          </Button>
        ) : (
          <>
            <Button onClick={abrirAtajoIPhone}>
              <span>🍏</span>
              <span>Conectar Apple Salud (iPhone)</span>
            </Button>
            <a
              href="/descargas/my-fitness-android.apk"
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-bg active:scale-95 transition"
            >
              <span>🤖</span>
              <span>Conectar Android (Health Connect)</span>
            </a>
          </>
        )}
      </div>
      {copiado ? (
        <p className="text-xs font-medium text-emerald-600">
          ✓ Código ({codigoNube}) copiado. Al abrir el atajo en tu iPhone, dale a «Añadir atajo».
        </p>
      ) : null}
      {aviso ? <p className="text-sm text-ink">{aviso}</p> : null}
      {(esIos || (!esAndroid && !esIos)) && (
        <div className="mt-2 rounded-xl border border-border bg-surface-raised/70 p-3 text-xs leading-relaxed text-ink/90 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-bold text-accent">
            <span>⚡</span>
            <span>Activar sincronización 100% automática en tu iPhone</span>
          </div>
          <p className="text-2xs text-muted">
            En iPhone, para que los pasos se envíen solos en segundo plano sin tener que pulsar nada:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-2xs text-ink/80">
            <li>Abre la app <strong>Atajos</strong> de Apple y pulsa abajo en la pestaña <strong>Automatización</strong>.</li>
            <li>Pulsa el botón <strong>+</strong> y elige <strong>Hora del día</strong> (ej. 23:00) o <strong>App</strong> (al abrir My Fitness).</li>
            <li>Marca la opción <strong>«Ejecutar inmediatamente»</strong> (y desmarca «Avisar al ejecutar»).</li>
            <li>Toca Siguiente y selecciona el atajo <strong>«My Fitness Salud»</strong>. ¡Listo! Ya sincroniza solo cada noche.</li>
          </ol>
        </div>
      )}
    </section>
  );
}

export default function PaginaAjustes() {
  const {
    perfil,
    pesadas,
    guardarPerfil,
    eliminarCuenta,
    metaAguaL,
    ponerMetaAgua,
    listo,
    estadoNube,
    codigoNube,
    recuperar,
  } = useDatos();
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const [modalGuiaAbierto, setModalGuiaAbierto] = useState(false);
  const [modalFloAbierto, setModalFloAbierto] = useState(false);
  const [modalObjetivoAbierto, setModalObjetivoAbierto] = useState(false);
  // Las pestañas: todo lo de Ajustes cabe en cinco grupos, al abrir sale
  // «Datos», que es donde vive el tema y lo que más se toca (perfil y metas).
  // Si se viene desde el enlace de dar feedback (#ayuda), abre directo Ayuda.
  const [pestana, setPestana] = useState<string>(() => {
    if (typeof window !== "undefined" && window.location.hash === "#ayuda") {
      return "ayuda";
    }
    return "datos";
  });
  // El tema vive en el móvil (localStorage). Se lee como «valor externo»,
  // igual que la salud nativa, para no provocar renders de más; al tocar los
  // botones manda la elección de esta sesión.
  const temaGuardado = useSyncExternalStore(
    () => () => {},
    () => leerTema(),
    () => "sistema" as Tema,
  );
  const [temaElegido, setTemaElegido] = useState<Tema | null>(null);
  const tema = temaElegido ?? temaGuardado;
  const tamanoGuardado = useSyncExternalStore(
    () => () => {},
    () => leerTamano(),
    () => "normal" as TamanoTexto,
  );
  const [tamanoElegido, setTamanoElegido] = useState<TamanoTexto | null>(null);
  const tamano = tamanoElegido ?? tamanoGuardado;
  const [conSonidos, setConSonidos] = useState(() => sonidosActivados());
  const [conVibracion, setConVibracion] = useState(() => vibracionActivada());

  const cambiarSonidos = (activo: boolean) => {
    setConSonidos(activo);
    guardarSonidosActivados(activo);
    if (activo) sonidoTap();
  };

  const cambiarVibracion = (activo: boolean) => {
    setConVibracion(activo);
    guardarVibracionActivada(activo);
    if (activo) vibrarTap();
  };

  if (!listo || !perfil) return <Cargando />;

  const pesoActual = pesoSuavizado(pesadas) ?? perfil.pesoInicialKg;
  // Los litros que le tocan por peso y objetivo. Solo se usan para proponerlos:
  // la meta que vale es la que tenga guardada, que puede haber cambiado a mano.
  const aguaSugerida = aguaRecomendadaL(pesoActual, perfil.objetivo ?? "adelgazar");
  // Los hábitos que la persona quiere seguir; si nunca eligió, los de fábrica.
  const habitosActivos = perfil.habitosActivos ?? HABITOS_INICIALES;
  const gasto = gastoDiario(
    pesoActual,
    perfil.alturaCm,
    edad(perfil.fechaNacimiento),
    perfil.sexo,
    perfil.actividad,
  );
  // Con el ajuste semanal (el que mueve las calorías si vas más lento o más
  // rápido de lo que toca); la fórmula sola se queda para enseñar la diferencia.
  const kcalBase = kcalRedondeadas(
    objetivoCalorico(gasto, perfil.ritmoKgSemana, perfil.objetivo),
  );
  const kcal = kcalDeHoy(
    perfil,
    gasto,
    pesoActual,
    undefined,
    fechaUltimaPesada(pesadas) ?? undefined,
  );
  const ajuste = kcal - kcalBase;
  const macros = macrosDiarios(kcal, pesoActual);

  // Eliminar la cuenta: primero la nube y, solo si eso va bien, el móvil. Así
  // nunca se queda a medias.
  async function eliminar() {
    setBorrando(true);
    setErrorBorrar(null);
    const fallo = await eliminarCuenta();
    setBorrando(false);
    if (fallo) setErrorBorrar(fallo);
    // Si va bien, los datos quedan vacíos y la guardia devuelve al cuestionario.
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl text-ink">Ajustes</h1>
      </header>

      <SegmentedControl
        label="Grupos de Ajustes"
        value={pestana}
        onChange={setPestana}
        options={[
          { value: "datos", label: "Datos" },
          { value: "plan", label: "Plan" },
          { value: "avisos", label: "Avisos" },
          { value: "nube", label: "Nube" },
          { value: "ayuda", label: "Ayuda" },
        ]}
      />

      {pestana === "plan" ? (
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Info size={18} aria-hidden="true" className="text-accent" />
          Tu plan de esta semana
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-sm text-muted">Gastas al día</dt>
            <dd className="text-lg text-ink">{Math.round(gasto)} kcal</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Comerás al día</dt>
            <dd className="text-lg font-bold text-accent">{kcal} kcal</dd>
          </div>
          {ajuste !== 0 ? (
            <p className="col-span-2 text-sm text-muted">
              {ajuste > 0 ? "Te suben" : "Te bajan"} {Math.round(Math.abs(ajuste))} kcal esta semana
              según cómo se ha movido tu peso en la última semana respecto al plan.
            </p>
          ) : null}
          <div>
            <dt className="text-sm text-muted">Proteína</dt>
            <dd className="text-base text-ink">{macros.proteinas} g</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Carbohidrato</dt>
            <dd className="text-base text-ink">{macros.carbohidratos} g</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Grasa</dt>
            <dd className="text-base text-ink">{macros.grasas} g</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Objetivo</dt>
            <dd className="text-base text-ink">{conComa(perfil.pesoObjetivoKg)} kg</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">
          Estos números salen de tu peso medio de las últimas pesadas ({conComa(pesoActual)} kg),
          tu altura y tu nivel de actividad. En cuanto tengas una semana de pesadas, el plan se
          ajustará con lo que de verdad bajes, no con la estimación de partida.
        </p>
        <div className="flex items-center justify-between rounded-xl bg-bg border border-border p-3 mt-1">
          <div className="flex flex-col">
            <span className="text-xs text-muted">¿Quieres cambiar de objetivo?</span>
            <span className="text-sm font-bold text-ink">
              {
                {
                  adelgazar: "Adelgazar (perder grasa)",
                  mantener: "Mantenerme",
                  subir: "Subir de peso",
                  recomposicion: "Ganar músculo y perder grasa",
                  "volumen-limpio": "Ganar músculo sin grasa",
                }[perfil.objetivo ?? "adelgazar"] ?? "Adelgazar"
              }
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalObjetivoAbierto(true)}
          >
            Cambiar
          </Button>
        </div>
      </section>
      ) : null}

      {pestana === "nube" ? (
      <SeccionNube estado={estadoNube} codigo={codigoNube} onRecuperar={recuperar} />
      ) : null}

      {pestana === "avisos" ? (
      <SeccionAvisos />
      ) : null}

      {pestana === "datos" ? (<>
<section className="flex flex-col gap-4 rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Tus datos</h2>
          <Button variant="secondary" size="sm" onClick={() => setEditando((v) => !v)}>
            {editando ? "Cerrar" : "Cambiar"}
          </Button>
        </div>

        {editando ? (
          <FormularioPerfil perfil={perfil} pesoActual={pesoActual} onGuardar={(p) => { guardarPerfil(p); setEditando(false); }} />
        ) : (
          <dl className="flex flex-col gap-2">
            <Fila etiqueta="Nombre" valor={perfil.nombre} />
            <Fila etiqueta="Sexo" valor={perfil.sexo === "hombre" ? "Hombre" : "Mujer"} />
            <Fila etiqueta="Edad" valor={`${edad(perfil.fechaNacimiento)} años`} />
            <Fila etiqueta="Altura" valor={`${perfil.alturaCm} cm`} />
            <Fila etiqueta="Peso de partida" valor={`${conComa(perfil.pesoInicialKg)} kg`} />
            <Fila etiqueta="Peso objetivo" valor={`${conComa(perfil.pesoObjetivoKg)} kg`} />
            <Fila
              etiqueta="Índice de masa corporal"
              valor={`${conComa(imc(pesoActual, perfil.alturaCm))} · ${clasificacionImc(
                imc(pesoActual, perfil.alturaCm),
              )}`}
            />
            <Fila
              etiqueta="Actividad"
              valor={
                ACTIVIDADES.find((a) => a.valor === perfil.actividad)?.etiqueta ?? perfil.actividad
              }
            />
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted">Qué buscas</dt>
              <dd className="flex items-center gap-2 text-right text-base text-ink">
                <span>
                  {
                    {
                      adelgazar: "Adelgazar (perder grasa)",
                      mantener: "Mantenerme",
                      subir: "Subir de peso",
                      recomposicion: "Ganar músculo y perder grasa",
                      "volumen-limpio": "Ganar músculo sin grasa",
                    }[perfil.objetivo ?? "adelgazar"] ?? "Adelgazar"
                  }
                </span>
                <button
                  type="button"
                  onClick={() => setModalObjetivoAbierto(true)}
                  className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent hover:bg-accent hover:text-on-accent transition active:scale-95"
                >
                  Cambiar
                </button>
              </dd>
            </div>
            <Fila
              etiqueta="Ritmo"
              valor={`${conComa(perfil.ritmoKgSemana, 2)} kg por semana`}
            />
            <Fila
              etiqueta="Alimentación"
              valor={
                {
                  ninguna: "Como de todo",
                  vegetariano: "Vegetariano",
                  vegano: "Vegano",
                  "sin-gluten": "Sin gluten",
                  "sin-lactosa": "Sin lactosa",
                }[perfil.dieta] ?? perfil.dieta
              }
            />
            <Fila
              etiqueta="No te gusta"
              valor={perfil.noLeGustan.length > 0 ? perfil.noLeGustan.join(", ") : "Nada apuntado"}
            />
          </dl>
        )}
      </section>

      <SeccionSaludNativa />

{perfil.sexo === "mujer" && (
        <section className="flex flex-col gap-3 rounded-lg bg-surface p-4 border border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500">
                <Droplets size={18} aria-hidden="true" className="fill-current" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-semibold text-ink">Ciclo Menstrual</h2>
                  <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-600 dark:text-rose-400">
                    {perfil?.cicloMenstrual?.modo === "flo"
                      ? "Flo · A mano"
                      : perfil?.cicloMenstrual?.modo === "nativo"
                      ? "My Fitness"
                      : "Personalizar"}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {perfil?.cicloMenstrual?.modo === "flo"
                    ? "Tú apuntas el día en My Fitness"
                    : perfil?.cicloMenstrual?.modo === "nativo"
                    ? "Seguimiento propio en My Fitness"
                    : "Retención de líquidos y nutrición adaptada"}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setModalFloAbierto(true)}>
              {!perfil?.cicloMenstrual?.modo
                ? "Elegir modo"
                : perfil?.cicloMenstrual?.modo === "flo"
                ? "Ver ciclo"
                : "Ver ciclo"}
            </Button>
          </div>
        </section>
      )}

{/* El tema vivía fuera de las pestañas para que se viera nada más
          entrar, pero empujaba todas las demás y dejaba cortado «Eliminar
          cuenta» al final de Nube. Vuelve a Datos, que es su sitio, y arriba
          del todo para no tener que bajar a buscarlo. */}
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <SunMoon size={18} aria-hidden="true" className="text-accent" />
          Tema
        </h2>
        <SegmentedControl
          label="Tema de la app"
          value={tema}
          onChange={(v) => {
            const elegido = normalizarTema(v);
            setTemaElegido(elegido);
            guardarTema(elegido);
          }}
          options={[
            { value: "sistema", label: "Como el móvil" },
            { value: "claro", label: "Claro" },
            { value: "oscuro", label: "Oscuro" },
          ]}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4 border border-border/70">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Type size={18} aria-hidden="true" className="text-accent" />
            Tamaño de letra
          </h2>
          <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent capitalize">
            {tamano}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Tamaño del texto"
          className="grid grid-cols-2 gap-2"
        >
          {[
            { valor: "pequeno", etiqueta: "Pequeño", muestra: "text-xs" },
            { valor: "normal", etiqueta: "Normal", muestra: "text-sm" },
            { valor: "grande", etiqueta: "Grande", muestra: "text-base" },
            { valor: "gigante", etiqueta: "Gigante", muestra: "text-lg" },
          ].map((op, i, lista) => {
            const activo = tamano === op.valor;
            return (
              <button
                key={op.valor}
                type="button"
                role="radio"
                aria-checked={activo}
                tabIndex={activo ? 0 : -1}
                onClick={() => {
                  const elegido = normalizarTamano(op.valor);
                  setTamanoElegido(elegido);
                  guardarTamano(elegido);
                }}
                onKeyDown={(e) => {
                  let delta = 0;
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") delta = 1;
                  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") delta = -1;
                  if (delta === 0) return;
                  e.preventDefault();
                  const sig = (i + delta + lista.length) % lista.length;
                  const elegido = normalizarTamano(lista[sig].valor);
                  setTamanoElegido(elegido);
                  guardarTamano(elegido);
                  e.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                    [sig]?.focus();
                }}
                className={[
                  "flex items-center justify-between rounded-xl border p-3 transition duration-150 ease-app active:scale-[.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  activo
                    ? "border-accent bg-accent-soft text-accent font-bold shadow-xs"
                    : "border-border bg-bg text-muted hover:border-border-input hover:text-ink font-semibold",
                ].join(" ")}
              >
                <span className="text-sm font-semibold">{op.etiqueta}</span>
                <span className={["font-bold text-accent", op.muestra].join(" ")}>
                  Aa
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          Para leer con comodidad en la pantalla de tu móvil.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4 border border-border/70">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Volume2 size={18} aria-hidden="true" className="text-accent" />
          Sonido y vibración
        </h2>
        <div className="flex flex-col divide-y divide-border">
          <Switch
            label="Sonidos de la app"
            checked={conSonidos}
            onChange={cambiarSonidos}
          />
          <Switch
            label="Vibración táctil"
            checked={conVibracion}
            onChange={cambiarVibracion}
          />
        </div>
        <p className="text-xs text-muted">
          Sonidos nativos y respuesta táctil estilo iPhone al marcar hábitos, comidas, pesadas y celebraciones.
        </p>
      </section>
</>) : null}

      {pestana === "plan" ? (<>
      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Heart size={18} aria-hidden="true" className="text-accent" />
          Lo que no quieres ver
        </h2>
        <p className="text-sm text-muted">
          Aquí le dices al plan lo que no quieres: la app monta cada semana los platos sola, con
          lo que queda.
        </p>

        <h3 className="text-sm font-semibold text-ink">Ingredientes que no quieres ver</h3>
        <ListaRoja
          marcados={perfil.noLeGustan}
          onCambiar={(lista) => guardarPerfil({ ...perfil, noLeGustan: lista })}
          descripcion="Si marcas uno, no verás ningún plato que lo lleve."
        />

        <PlatosRechazados />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <GlassWater size={18} aria-hidden="true" className="text-accent" />
          Agua
        </h2>
        <p className="text-sm text-muted">
          Cuántos litros quieres beber al día. En la pantalla de Hoy puedes sumar vasos con los
          botones o escribir el total del día. Para tu peso y tu objetivo salen{" "}
          {conComaSinCeros(aguaSugerida)} L.
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg text-ink">{conComaSinCeros(metaAguaL)} L al día</p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label="Quitar un cuarto de litro a la meta"
              disabled={metaAguaL <= 0.5}
              onClick={() => ponerMetaAgua(metaAguaL - 0.25)}
            >
              −0,25
            </Button>
            <Button
              variant="secondary"
              aria-label="Añadir un cuarto de litro a la meta"
              onClick={() => ponerMetaAgua(metaAguaL + 0.25)}
            >
              +0,25
            </Button>
          </div>
        </div>
        {Math.abs(metaAguaL - aguaSugerida) > 0.001 ? (
          <Button variant="ghost" size="sm" onClick={() => ponerMetaAgua(aguaSugerida)}>
            Poner los {conComaSinCeros(aguaSugerida)} L que me tocan
          </Button>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Footprints size={18} aria-hidden="true" className="text-accent" />
          Pasos al día
        </h2>
        <p className="text-sm text-muted">
          Tu meta de pasos. En iPhone los apuntas a mano en Hoy (si montas el Atajo de iPhone, los
          manda solo). Cuando la alcanzas, suma puntos ese día.
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg text-ink">{conMiles(perfil.metaPasos ?? 8000)} pasos</p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label="Bajar la meta en quinientos pasos"
              disabled={(perfil.metaPasos ?? 8000) <= 2000}
              onClick={() =>
                guardarPerfil({
                  ...perfil,
                  metaPasos: Math.max(2000, (perfil.metaPasos ?? 8000) - 500),
                })
              }
            >
              −500
            </Button>
            <Button
              variant="secondary"
              aria-label="Subir la meta en quinientos pasos"
              disabled={(perfil.metaPasos ?? 8000) >= 40000}
              onClick={() =>
                guardarPerfil({
                  ...perfil,
                  metaPasos: Math.min(40000, (perfil.metaPasos ?? 8000) + 500),
                })
              }
            >
              +500
            </Button>
          </div>
        </div>
      </section>
      </>) : null}

      {pestana === "plan" ? (
      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <ListChecks size={18} aria-hidden="true" className="text-accent" />
          Tus hábitos
        </h2>
        <p className="text-sm text-muted">
          Elige los que quieres seguir. En la pantalla de Hoy los marcas con un toque cada día,
          y cada marca suma puntos.
        </p>
        <Link
          href="/ajustes/habitos"
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-ink transition duration-150 ease-app hover:bg-bg"
        >
          Cambiar hábitos diarios
          <span className="text-muted">
            ({habitosActivos.length} {habitosActivos.length === 1 ? "activo" : "activos"})
          </span>
        </Link>
      </section>
      ) : null}

      {pestana === "ayuda" ? (<>
      {/* Vídeo Guía paso a paso */}
      <section className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent-soft/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent shadow-xs">
              <Play size={18} className="fill-current ml-0.5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink leading-tight">Vídeo Guía Paso a Paso</h2>
              <p className="text-xs text-muted">Aprende a usar cada parte de la app en 4 minutos</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setModalGuiaAbierto(true)}
            className="text-xs font-bold gap-1.5 shrink-0"
          >
            <Play size={13} className="fill-current" />
            Ver guía
          </Button>
        </div>
      </section>

      {/* El buzón: si algo falla, esto es lo que se busca. */}
      <BuzonBeta />

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-base font-semibold text-ink">Pasar la app a otro móvil</h2>
        <p className="text-sm text-muted">
          Aquí tienes el enlace y las instrucciones para instalarla en otro móvil, sea Android o
          iPhone.
        </p>
        <Link
          href="/instalar"
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-ink transition duration-150 ease-app hover:bg-bg"
        >
          <Share2 size={16} aria-hidden="true" />
          Ver cómo instalarla
        </Link>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <ShieldCheck size={18} aria-hidden="true" className="text-accent" />
          Privacidad y Cookies
        </h2>
        <p className="text-sm text-muted">
          Tu peso, tus comidas y tus fotos son 100% privadas. Isaac no tiene acceso a tus datos personales ni hay cookies de publicidad ni rastreadores.
        </p>
        <Link
          href="/privacidad"
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-ink transition duration-150 ease-app hover:bg-bg"
        >
          <ShieldCheck size={16} aria-hidden="true" />
          Leer política de privacidad y cookies
        </Link>
      </section>
      </>) : null}

      {pestana === "nube" ? (<>
      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-base font-semibold text-ink">Salir</h2>
        <p className="text-sm text-muted">
          Cierra la sesión en este aparato. Tus datos se quedan donde están: solo tendrás que
          volver a escribir la clave la próxima vez.
        </p>
        <form method="post" action="/api/salir">
          <Button type="submit" variant="secondary">
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-base font-semibold text-ink">Eliminar cuenta</h2>
        <p className="text-sm text-muted">
          Borra tu cuenta y todo lo anotado: de este móvil y de la nube, sin dejar copia. No se
          puede deshacer.
        </p>
        {confirmar ? (
          <div className="flex gap-3">
            <Button variant="danger" onClick={eliminar} disabled={borrando}>
              {borrando ? "Eliminando…" : "Sí, eliminar todo"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmar(false)} disabled={borrando}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmar(true)}>
            <Trash2 size={16} aria-hidden="true" />
            Eliminar cuenta
          </Button>
        )}
        {errorBorrar ? <p className="text-sm text-ink">{errorBorrar}</p> : null}
      </section>
      </>) : null}

      <footer className="mt-4 flex flex-col items-center justify-center gap-1.5 border-t border-border pt-6 text-center">
        <p className="text-xs text-muted">
          My Fitness · <span className="font-medium text-ink">{VERSION_ETIQUETA}</span>
        </p>
        <p className="text-xs text-muted">
          Hecha con cariño para la familia y amigos.
        </p>
      </footer>

      <ModalGuiaVideo
        abierto={modalGuiaAbierto}
        onCerrar={() => setModalGuiaAbierto(false)}
      />

      {perfil.sexo === "mujer" && (
        <ModalFloCiclo
          abierto={modalFloAbierto}
          onCerrar={() => setModalFloAbierto(false)}
        />
      )}

      <ModalCambiarObjetivo
        abierto={modalObjetivoAbierto}
        onCerrar={() => setModalObjetivoAbierto(false)}
      />
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-muted">{etiqueta}</dt>
      <dd className="text-right text-base text-ink">{valor}</dd>
    </div>
  );
}

/**
 * Los platos a los que has dicho «no me gustó» al comer. No vuelven a salir en
 * el plan; si cambias de idea, «Perdonar» los quita de la lista y pueden
 * volver.
 */
function PlatosRechazados() {
  const { gustos, marcarGusto } = useDatos();
  const rechazados = Object.entries(gustos)
    .filter(([, g]) => g === "no-me-gusta")
    .map(([nombre]) => nombre)
    .sort((a, b) => a.localeCompare(b, "es"));

  return (
    <>
      <h3 className="text-sm font-semibold text-ink">Platos que no te han gustado</h3>
      {rechazados.length === 0 ? (
        <p className="text-sm text-muted">
          Todavía no has dicho que no a ninguno. Cuando lo digas en Hoy, aparecerá aquí y no
          volverá a salir.
        </p>
      ) : (
        <ul className="flex flex-col">
          {rechazados.map((nombre) => (
            <li
              key={nombre}
              className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
            >
              <span className="text-sm text-ink">{nombre}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Perdonar ${nombre}`}
                onClick={() => marcarGusto(nombre, "no-me-gusta")}
              >
                Perdonar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * La sección de la nube: qué está pasando con los datos y cómo recuperarlos
 * desde otro móvil.
 */
function SeccionNube({
  estado,
  codigo,
  onRecuperar,
}: {
  estado: EstadoNube;
  codigo: string;
  onRecuperar: (codigo: string) => Promise<boolean>;
}) {
  const [aRecuperar, setARecuperar] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [recuperarAbierto, setRecuperarAbierto] = useState(false);

  const palabras =
    estado === "guardado"
      ? "Guardado en la nube"
      : estado === "sin-conexion"
        ? "Sin conexión por ahora; se subirá sola en cuanto vuelva la red"
        : estado === "sin-nube"
          ? "Sin nube: la app va solo en este móvil"
          : estado === "error"
            ? "No se ha podido guardar en la nube"
            : "Mirando la nube";

  async function reclamar() {
    setOcupado(true);
    setAviso(null);
    const bien = await onRecuperar(aRecuperar);
    setOcupado(false);
    setAviso(
      bien
        ? "¡Listo! Ya están aquí tus datos."
        : "Ese código no ha servido. Míralo bien, son 6 letras o números.",
    );
    if (bien) setARecuperar("");
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg bg-surface p-4">
      <h2 className="text-base font-semibold text-ink">Tus datos en la nube</h2>
      <p className="text-sm text-muted">
        {palabras}. Se guarda solo, sin que tengas que hacer nada, y la app sigue funcionando
        aunque no haya internet.
      </p>

      {codigo ? (
        <div className="rounded-md border border-border bg-bg p-3">
          <p className="text-sm text-muted">Tu código de recuperación</p>
          <p className="text-xl font-semibold tracking-[0.3em] text-ink">{codigo}</p>
          <p className="text-xs text-muted">
            Con este código, desde otro móvil nuevo, recuperas lo que tienes aquí. Anótalo.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-fit text-left text-sm font-semibold text-ink underline underline-offset-2"
          aria-expanded={recuperarAbierto}
          onClick={() => setRecuperarAbierto((v) => !v)}
        >
          ¿Cambio de móvil? Recuperar mis datos
        </button>
        {recuperarAbierto ? (
          <>
            <TextField
              label="Código de otro móvil"
              hint="Si acabas de instalar la app y quieres recuperar lo que ya tenías"
              value={aRecuperar}
              onChange={(e) => setARecuperar(e.target.value)}
              placeholder="ABC234"
            />
            <Button
              variant="secondary"
              disabled={ocupado || aRecuperar.trim().length < 6}
              onClick={reclamar}
            >
              Recuperar mis datos
            </Button>
            {aviso ? <p className="text-sm text-ink">{aviso}</p> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function FormularioPerfil({
  perfil,
  pesoActual,
  onGuardar,
}: {
  perfil: Perfil;
  pesoActual: number;
  onGuardar: (p: Perfil) => void;
}) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [altura, setAltura] = useState(String(perfil.alturaCm));
  const [objetivo, setObjetivo] = useState(String(perfil.pesoObjetivoKg));
  const [objetivoTocado, setObjetivoTocado] = useState(false);
  const [actividad, setActividad] = useState<Actividad>(perfil.actividad);
  const [ritmo, setRitmo] = useState(String(perfil.ritmoKgSemana));
  // Si qué busca, no confundir con el peso objetivo.
  const [sentido, setSentido] = useState<Objetivo>(perfil.objetivo ?? "adelgazar");

  const alturaNum = aAlturaCm(altura);
  const objetivoNum = aNumero(objetivo);
  const revisionObjetivo = validarPesoObjetivo({
    pesoActualKg: pesoActual,
    pesoObjetivoKg: objetivoNum,
    alturaCm: alturaNum || perfil.alturaCm,
    objetivo: sentido,
  });
  // El nombre nuevo tiene que cumplir la regla; el viejo se respeta tal cual
  // aunque no la cumpla (hay perfiles de antes con cosas raras y no se les
  // toca el suyo por guardar otra cosa).
  const nombreTocado = nombre !== perfil.nombre;
  const nombreRevisado = revisarNombre(nombre);
  const nombreVale = !nombreTocado || nombreRevisado.ok;

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={NOMBRE_MAX}
        error={nombreTocado && !nombreRevisado.ok ? nombreRevisado.motivo : undefined}
      />
      <TextField
        label="Altura (m o cm)"
        type="text"
        inputMode="decimal"
        hint="Escribe 1,68 o 168: las dos valen"
        value={altura}
        onChange={(e) => setAltura(e.target.value)}
      />
      <TextField
        label="Peso objetivo"
        type="text"
        inputMode="decimal"
        suffix="kg"
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        onBlur={() => setObjetivoTocado(true)}
        error={objetivoTocado && !revisionObjetivo.ok ? revisionObjetivo.motivo : undefined}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">Qué buscas</span>
        <ChoiceList
          label="Qué buscas"
          valor={sentido}
          onChange={(v) => {
            const nuevo = v as Objetivo;
            setSentido(nuevo);
            // El ritmo del sentido anterior se queda huérfano (ya no está en la
            // lista del nuevo objetivo): al mantener no hay ritmo, recomposición
            // y volumen limpio traen los suyos, y al volver a adelgazar o subir
            // se empieza por el ritmo normal.
            const suyos = ritmosPara(nuevo).map((r) => String(r.valor));
            if (!suyos.includes(ritmo)) {
              setRitmo(nuevo === "adelgazar" || nuevo === "subir" ? "0.5" : suyos[0]);
            }
          }}
          opciones={[
            { valor: "adelgazar", etiqueta: "Adelgazar", ayuda: "Comer menos de lo que gastas." },
            { valor: "mantener", etiqueta: "Mantenerme", ayuda: "Seguir como estás." },
            { valor: "subir", etiqueta: "Subir de peso", ayuda: "Comer un poco más de lo que gastas." },
            {
              valor: "recomposicion",
              etiqueta: "Ganar músculo y perder grasa",
              ayuda: "Comes casi lo que gastas, con mucha proteína.",
            },
            {
              valor: "volumen-limpio",
              etiqueta: "Ganar músculo sin grasa",
              ayuda: "Subes despacio para no engordar.",
            },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">Actividad</span>
        <ChoiceList
          label="Nivel de actividad"
          valor={actividad}
          onChange={(v) => setActividad(v as Actividad)}
          opciones={ACTIVIDADES.map((a) => ({
            valor: a.valor,
            etiqueta: a.etiqueta,
            ayuda: a.ayuda,
          }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">Ritmo</span>
        <ChoiceList
          label="Ritmo"
          valor={ritmo}
          onChange={setRitmo}
          opciones={ritmosPara(sentido).map((r) => ({
            valor: String(r.valor),
            etiqueta: r.etiqueta,
            ayuda: r.ayuda,
          }))}
        />
      </div>
      <Button
        disabled={
          !nombreVale ||
          alturaNum < 100 ||
          alturaNum > 250 ||
          !revisionObjetivo.ok
        }
        onClick={() => {
          const nuevoRitmo = Number(ritmo);
          const cambioPlan =
            sentido !== (perfil.objetivo ?? "adelgazar") ||
            nuevoRitmo !== perfil.ritmoKgSemana;
          onGuardar({
            ...perfil,
            nombre: nombreTocado && nombreRevisado.ok ? nombreRevisado.nombre : perfil.nombre,
            alturaCm: alturaNum,
            pesoObjetivoKg: objetivoNum,
            actividad,
            ritmoKgSemana: nuevoRitmo,
            objetivo: sentido,
            ...(cambioPlan
              ? { ajusteKcal: 0, fechaAjuste: hoyISO(), pesoEnAjuste: pesoActual }
              : {}),
          });
        }}
      >
        Guardar cambios
      </Button>
    </div>
  );
}
