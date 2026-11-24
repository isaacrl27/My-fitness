"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Play,
  Plus,
} from "lucide-react";
import { TIPOS_COMIDA, sumar, useDatos, type TipoComida } from "@/lib/store";
import { generarSemana, type Momento } from "@/lib/platos";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ProgressRing } from "@/components/ui/data-viz";
import { saldoPuntos } from "@/lib/puntos";
import { HABITOS_INICIALES, etiquetaDe } from "@/lib/habitos";
import { calcularEstadoCiclo, debeMostrarCiclo } from "@/lib/ciclo";
import { EsqueletoHoy } from "@/components/app/esqueleto-hoy";
import { useHoy } from "@/lib/use-hoy";
import { useGuardado } from "@/lib/use-guardado";
import { useEntradaQuitada } from "@/lib/use-entrada";
import { guardarMostrado } from "@/lib/ultimo-mostrado";
import { esAppNativa, hayPermisoSalud, leerSaludUltimosDias } from "@/lib/salud-nativa";
import { sonidoAgua, sonidoCheck, sonidoTap } from "@/lib/sonido";
import { vibrarCheck, vibrarTap } from "@/lib/haptica";
import { ContadorRodante } from "@/components/ui/contador-rodante";
import { BotonBorradoElastico } from "@/components/ui/boton-elastico";
import { FilaDeslizable } from "@/components/ui/fila-deslizable";
import { CampanaNotificaciones } from "@/components/ui/campana-notificaciones";
import { MediaSemanalBadge } from "@/components/app/media-semanal-badge";
import { mediaSemanalCalorias } from "@/lib/atajos-comida";
import { mostrarTostada } from "@/lib/tostada";
import { lanzarReaccion } from "@/lib/reacciones";
import {
  aNumero,
  aPasos,
  conComa,
  conComaSinCeros,
  edad,
  enPalabras,
  ajusteSemanal,
  fechaUltimaPesada,
  gastoDiario,
  hoyISO,
  kcalDeHoy,
  macrosDiarios,
  objetivoCalorico,
  pesoSuavizado,
} from "@/lib/calculos";
import { diasConActividad, rachaActual } from "@/lib/racha";

// Estas ventanas solo se descargan cuando hace falta abrirlas. Antes viajaban
// en el paquete de Hoy aunque nadie las usara.
const HojaAnadir = dynamic(
  () => import("@/components/app/hoja-anadir").then((modulo) => modulo.HojaAnadir),
  { ssr: false },
);
const ModalRachaDuolingo = dynamic(
  () =>
    import("@/components/app/modal-racha-duolingo").then((modulo) => modulo.ModalRachaDuolingo),
  { ssr: false },
);
const ModalGuiaVideo = dynamic(
  () => import("@/components/app/modal-guia-video").then((modulo) => modulo.ModalGuiaVideo),
  { ssr: false },
);
const ModalFloCiclo = dynamic(
  () => import("@/components/app/modal-flo-ciclo").then((modulo) => modulo.ModalFloCiclo),
  { ssr: false },
);
const ModalRelojSalud = dynamic(
  () => import("@/components/app/modal-reloj-salud").then((modulo) => modulo.ModalRelojSalud),
  { ssr: false },
);
const ModalCambiarObjetivo = dynamic(
  () =>
    import("@/components/app/modal-cambiar-objetivo").then((modulo) => modulo.ModalCambiarObjetivo),
  { ssr: false },
);

/**
 * De «200 g» o «2 porciones» saca solo el número, para dejarlo en el campo de
 * corregir cantidad. La unidad se muestra al lado (sufijo), así lo que la
 * persona escriba se lee como su número y no se pega a la cola de texto: antes
 * «200» sobre «200 g» podía acabar como «200 g200» y reescalar de más.
 */
function soloNumero(cantidad: string): string {
  const m = cantidad.trim().match(/^([\d.,]+)/);
  return m ? m[1] : "";
}

/** La cola de texto tras el número («g», «porciones»), para el sufijo. */
function unidadDe(cantidad: string): string {
  const m = cantidad.trim().match(/^[\d.,]+\s*(.*)$/);
  return (m?.[1] ?? "").trim();
}

/** La cantidad guardada se escribe con punto decimal; para enseñarla, coma. */
function enComa(cantidad: string): string {
  return cantidad.replace(/(\d)\.(\d)/g, "$1,$2");
}

export default function PaginaHoy() {
  const {
    perfil,
    codigoNube,
    comidas,
    gustos,
    aguaLitros,
    metaAguaL,
    pesadas,
    borrarAlimento,
    editarAlimento,
    ajustarSobrasAlimento,
    ponerAgua,
    ponerSalud,
    ponerSaludLote,
    guardarPerfil,
    caprichos,
    habitosHechos,
    alternarHabito,
    saludDiaria,
    anadirComida,
    listo,
  } = useDatos();
  const hoy = useHoy();
  // Día elegido en el selector de fecha; si es null, muestra hoy.
  // Permite a usuarios volver a ayer para apuntar la cena si pasaron las 12.
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [verMacros, setVerMacros] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("mi-peso:ver-macros-hoy") === "1";
    } catch {
      return false;
    }
  });
  const [alimentoActivoId, setAlimentoActivoId] = useState<string | null>(null);

  const alternarVerMacros = () => {
    sonidoTap();
    vibrarTap();
    setVerMacros((prev) => {
      const sig = !prev;
      try {
        window.localStorage.setItem("mi-peso:ver-macros-hoy", sig ? "1" : "0");
      } catch {}
      return sig;
    });
  };
  const diaActivo = diaSeleccionado ?? hoy;
  const esHoy = !diaSeleccionado || diaSeleccionado === hoy;

  const ayerISO = useMemo(() => {
    if (!hoy) return null;
    const d = new Date(`${hoy}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return hoyISO(d);
  }, [hoy]);
  const esAyer = Boolean(diaActivo && ayerISO && diaActivo === ayerISO);

  const cambiarDia = (offset: number) => {
    if (!diaActivo || !hoy) return;
    sonidoTap();
    vibrarTap();
    const base = new Date(`${diaActivo}T12:00:00`);
    base.setDate(base.getDate() + offset);
    const nueva = hoyISO(base);
    if (nueva > hoy) return; // no ir al futuro
    setDiaSeleccionado(nueva === hoy ? null : nueva);
  };

  // null = cerrada; "libre" = abierta desde el recuadro de arriba, para elegir
  // la comida dentro; un tipo = abierta con esa comida ya puesta.
  const [hoja, setHoja] = useState<TipoComida | "libre" | null>(null);
  // El capricho tiene su propia hoja: solo foto (o nombre) y aparte del día.
  const [hojaCapricho, setHojaCapricho] = useState(false);
  const [pasosTexto, setPasosTexto] = useState("");
  const [suenoTexto, setSuenoTexto] = useState("");
  const [editarSalud, setEditarSalud] = useState(false);
  const [cargandoSaludFoto, setCargandoSaludFoto] = useState(false);
  const [mensajeSaludFoto, setMensajeSaludFoto] = useState<string | null>(null);
  const inputFotoSaludRef = useRef<HTMLInputElement>(null);

  async function procesarFotoSalud(archivo: File) {
    if (!archivo || !diaActivo) return;
    setCargandoSaludFoto(true);
    setMensajeSaludFoto("Leyendo la pantalla de tu reloj o pulsera...");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 1000;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              try {
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;
                let sumaLuma = 0;
                let muestras = 0;
                const paso = 4;
                for (let i = 0; i < data.length; i += 4 * paso) {
                  const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                  sumaLuma += luma;
                  muestras++;
                }
                const lumaMedia = muestras > 0 ? sumaLuma / muestras : 128;
                if (lumaMedia < 15) {
                  reject(new Error("LUMA_OSCURA"));
                  return;
                }
                if (lumaMedia > 245) {
                  reject(new Error("LUMA_QUEMADA"));
                  return;
                }
              } catch {
                // Si falla el acceso a píxeles en canvas, continuar
              }
            }
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
      });

      const res = await fetch("/api/ia/salud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagen: dataUrl,
          mime: "image/jpeg",
          ...(codigoNube ? { codigo: codigoNube } : {}),
        }),
      });

      const datos = (await res.json()) as {
        ok?: boolean;
        motivo?: string;
        pasos?: number | null;
        suenoHoras?: number | null;
      };
      if (!datos.ok) {
        setMensajeSaludFoto(datos.motivo || "No se han podido leer los números. Prueba con otra foto.");
        return;
      }

      const updates: { pasos?: number; suenoHoras?: number } = {};
      const partesTexto: string[] = [];
      if (typeof datos.pasos === "number") {
        updates.pasos = datos.pasos;
        partesTexto.push(`${datos.pasos.toLocaleString("es-ES")} pasos`);
      }
      if (typeof datos.suenoHoras === "number") {
        updates.suenoHoras = datos.suenoHoras;
        partesTexto.push(`${conComaSinCeros(datos.suenoHoras)} h sueño`);
      }

      if (Object.keys(updates).length > 0) {
        ponerSalud(diaActivo, updates);
        marcarSalud();
        setMensajeSaludFoto(`✓ ¡Detectado!: ${partesTexto.join(" y ")}`);
        setTimeout(() => setMensajeSaludFoto(null), 6000);
      } else {
        setMensajeSaludFoto("No se han encontrado números claros de pasos o sueño en la foto.");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "LUMA_OSCURA") {
        setMensajeSaludFoto("La foto está demasiado oscura o la pantalla del reloj apagada. Enciende la pantalla y vuelve a hacer la foto.");
      } else if (err instanceof Error && err.message === "LUMA_QUEMADA") {
        setMensajeSaludFoto("La foto tiene demasiado reflejo o flash. Apaga el flash y vuelve a hacer la foto.");
      } else {
        setMensajeSaludFoto("Error al procesar la foto. Inténtalo de nuevo.");
      }
    } finally {
      setCargandoSaludFoto(false);
      if (inputFotoSaludRef.current) inputFotoSaludRef.current.value = "";
    }
  }
  // La cantidad que se está corrigiendo en línea en Hoy: id del alimento y su
  // cantidad escrita a mano. null = no se está corrigiendo nada.
  const [editando, setEditando] = useState<string | null>(null);
  const [cantidadEdit, setCantidadEdit] = useState("");
  // El aviso cuando lo escrito no se ha podido escalar (antes fallaba en
  // silencio y parecía que la app se había tragado el cambio).
  const [errorCantidad, setErrorCantidad] = useState<string | null>(null);
  // El anillo no debe gastar su animación debajo de la cortina de carga: al
  // retirarse, aparecería ya quieto. Se espera a que la cortina avise.
  const entradaLista = useEntradaQuitada();

  // Lo apuntado en el día seleccionado de pasos y sueño: sea a mano o lo que suba el Atajo
  // del iPhone.
  const saludHoy = diaActivo ? saludDiaria?.[diaActivo] : undefined;
  const pasosHoy = saludHoy?.pasos;
  const suenoHoy = saludHoy?.suenoHoras;

  // El plan se recalcula con el último peso conocido, no con el del primer día.
  // Y con la media de los últimos 7 días desde la última pesada en lugar de la
  // última pesada a pelo: un día que salgas con más agua (una cena fuerte, sal,
  // poco descanso) no es grasa y no debe mover el plan. Con una sola pesada, la
  // media es ese mismo número.
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
    // Con el ajuste semanal aplicado: si vas más lento de lo que toca, baja.
    // Se usa la fecha reactiva (hoy) para que el plan no se quede con la del día
    // en que se abrió la app. Y se manda la fecha de la última pesada: sin
    // báscula nueva, la revisión no entra y el plan se queda donde estaba.
    const kcal = kcalDeHoy(
      perfil,
      gasto,
      peso,
      hoy ?? hoyISO(),
      fechaUltimaPesada(pesadas) ?? undefined,
    );
    return { kcal, macros: macrosDiarios(kcal, peso) };
  }, [perfil, pesadas, hoy]);

  // El plato que toca hoy según el Plan, para poderlo cargar desde el hueco
  // vacío de cada comida sin ir a la pestaña Plan. Se genera con la misma
  // semilla y los mismos gustos que usa Plan, así sale exactamente el mismo.
  const platoDelPlanHoy = useMemo(() => {
    if (!perfil || !plan || !diaActivo) return null;
    const semana = generarSemana(
      perfil.noLeGustan ?? [],
      gustos,
      0,
      Math.round(plan.kcal),
      new Date(`${diaActivo}T12:00:00`),
      perfil.dieta ?? "ninguna",
    );
    return semana.find((d) => d.fecha === diaActivo) ?? null;
  }, [perfil, plan, gustos, diaActivo]);

  // Una vez por semana se apunta la revisión, para que no se recalcule siempre
  // contra el peso del primer día.
  useEffect(() => {
    if (!perfil || !listo || !hoy) return;
    if (perfil.fechaAjuste === hoy) return;

    // La revisión semanal también va con la media de los últimos 7 días desde
    // la última pesada: si mirase la última pesada a pelo, un pico de agua del
    // último día se leería como grasa ganada y te quitaría calorías por algo
    // que no ha pasado.
    const peso = pesoSuavizado(pesadas) ?? perfil.pesoInicialKg;
    const fechaPesada = fechaUltimaPesada(pesadas);
    const base = objetivoCalorico(
      gastoDiario(
        peso,
        perfil.alturaCm,
        edad(perfil.fechaNacimiento),
        perfil.sexo,
        perfil.actividad,
      ),
      perfil.ritmoKgSemana,
      perfil.objetivo,
    );
    const revision = ajusteSemanal({
      fechaAjuste: perfil.fechaAjuste ?? perfil.creado,
      kcalBase: base,
      ajusteActual: perfil.ajusteKcal ?? 0,
      pesoEnAjuste: perfil.pesoEnAjuste ?? perfil.pesoInicialKg,
      pesoActualKg: peso,
      ritmoKgSemana: perfil.ritmoKgSemana,
      hoy,
      objetivo: perfil.objetivo,
      // Sin una pesada posterior a la revisión, no se compara nada: comparar
      // el mismo peso de la vez anterior metía recortes que no venían de
      // ninguna báscula.
      fechaPesadaActual: fechaPesada ?? undefined,
    });
    if (!revision) return;

    guardarPerfil({
      ...perfil,
      ajusteKcal: revision.ajusteKcal,
      // La revisión se fecha en el día de la pesada que se ha usado, no en
      // hoy: si la última báscula fue hace cinco días, el cambio real se midió
      // en cinco días menos y contarlo como una semana entera recorta de más.
      fechaAjuste: fechaPesada ?? hoy,
      pesoEnAjuste: peso,
    });
  }, [perfil, pesadas, listo, hoy, guardarPerfil]);

  // En la app nativa, al abrir (y al volver a primer plano) se traen de
  // golpe los pasos y el sueño de los últimos 7 días: la promesa honesta
  // en vez de segundo plano, que Android se lo mata a las apps.
  useEffect(() => {
    if (!esAppNativa()) return;
    let vivo = true;
    const traer = async () => {
      // El permiso solo se pide desde Ajustes; aquí no se insiste.
      if (!(await hayPermisoSalud())) return;
      const lote = await leerSaludUltimosDias(7);
      if (vivo && Object.keys(lote).length > 0) ponerSaludLote(lote);
    };
    traer();
    const alVolver = () => {
      if (document.visibilityState === "visible") traer();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [ponerSaludLote]);

  // Racha: días seguidos con algo anotado (comida, pesada, agua o hábito).
  // La fórmula vive en `lib/racha.ts`, compartida con el widget, para que las
  // dos pantallas digan siempre el mismo número.
  const diasActivos = useMemo(
    () => diasConActividad({ comidas, pesadas, aguaLitros, habitosHechos }),
    [comidas, pesadas, aguaLitros, habitosHechos],
  );

  const racha = useMemo(() => (hoy ? rachaActual(diasActivos, hoy) : 0), [diasActivos, hoy]);

  // Actividad de los 7 días de la semana (L-D) para el desglose visual estilo Duolingo
  const diasActivosSemana = useMemo(() => {
    if (!hoy) return [false, false, false, false, false, false, false];
    const hoyD = new Date(`${hoy}T12:00:00`);
    const diaSem = hoyD.getDay(); // 0 domingo, 1 lunes...
    const diffLunes = (diaSem + 6) % 7;
    const lunes = new Date(hoyD);
    lunes.setDate(hoyD.getDate() - diffLunes);

    const res: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(lunes);
      cur.setDate(lunes.getDate() + i);
      res.push(diasActivos.has(hoyISO(cur)));
    }
    return res;
  }, [diasActivos, hoy]);

  const [modalRachaAbierto, setModalRachaAbierto] = useState(false);
  const [modalGuiaAbierto, setModalGuiaAbierto] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.search.includes("guia=1");
    }
    return false;
  });
  const [modalFloAbierto, setModalFloAbierto] = useState(false);
  const [modalRelojAbierto, setModalRelojAbierto] = useState(false);
  const [modalObjetivoAbierto, setModalObjetivoAbierto] = useState(false);

  // Ciclo menstrual / Flo: solo para mujeres si está activo o por defecto
  const floActivo = debeMostrarCiclo(perfil?.sexo, perfil?.cicloMenstrual);

  const estadoCiclo = useMemo(
    () => (floActivo ? calcularEstadoCiclo(perfil?.cicloMenstrual, hoy ?? undefined) : null),
    [floActivo, perfil?.cicloMenstrual, hoy],
  );

  // Celebración automática de racha en nuevo día
  useEffect(() => {
    if (!listo || !perfil || !hoy || racha <= 0) return;
    const claveCelebrada = `mi-peso:racha-celebrada-dia:${hoy}`;
    try {
      const yaCelebrada = window.localStorage.getItem(claveCelebrada);
      if (!yaCelebrada) {
        const t = setTimeout(() => {
          setModalRachaAbierto(true);
          try {
            window.localStorage.setItem(claveCelebrada, "1");
            for (let i = window.localStorage.length - 1; i >= 0; i--) {
              const k = window.localStorage.key(i);
              if (k && k.startsWith("mi-peso:racha-celebrada-dia:") && k !== claveCelebrada) {
                window.localStorage.removeItem(k);
              }
            }
          } catch {}
        }, 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [listo, perfil, hoy, racha]);

  // Los puntos: el saldo de siempre y lo que se gana en el día visible. Todo el cálculo
  // vive en lib/puntos.ts; aquí solo se le dan los datos del día y los
  // objetivos (los hábitos ya cuentan: 5 pts por marca, con tope de 5 al día).
  const puntos = useMemo(() => {
    if (!plan || !diaActivo) return null;
    return {
      esCapricho: caprichos.includes(diaActivo),
      ...saldoPuntos(
        {
          comidas: comidas
            .filter((c) => !c.capricho)
            .map((c) => ({
              fecha: c.fecha,
              kcal: c.alimentos.reduce((s, a) => s + a.kcal, 0),
              proteinas: c.alimentos.reduce((s, a) => s + a.proteinas, 0),
            })),
          aguaLitros,
          pesadas,
          // Los puntos cuentan marcas, no ids: de cada día se pasa el número.
          habitosHechos: Object.fromEntries(
            Object.entries(habitosHechos ?? {}).map(([f, ids]) => [f, ids.length]),
          ),
          // Los pasos y el sueño que manda el iPhone (Atajo → /api/widget).
          salud: saludDiaria,
        },
        {
          kcal: plan.kcal,
          proteinas: plan.macros.proteinas,
          aguaL: metaAguaL,
          habitosActivos: (perfil?.habitosActivos ?? HABITOS_INICIALES).length,
          // Los pasos dan puntos con la meta de Ajustes; si nunca la tocó, con
          // los 8.000 de fábrica (los mismos que enseña la pantalla).
          metaPasos: perfil?.metaPasos ?? 8000,
        },
        caprichos,
        diaActivo,
      ),
    };
  }, [plan, diaActivo, comidas, aguaLitros, pesadas, metaAguaL, caprichos, perfil, habitosHechos, saludDiaria]);

  const ganadosHoy = puntos?.ganadosHoy ?? 0;
  useEffect(() => {
    if (!listo || !diaActivo) return;
    const clave = `puntos:${diaActivo}`;
    guardarMostrado(clave, ganadosHoy);
  }, [ganadosHoy, listo, diaActivo]);

  // El «✓ Guardado» de las cajas que se guardan a mano.
  const [, marcarSalud] = useGuardado();

  if (!listo || !perfil || !plan || !hoy || !diaActivo || !puntos) return <EsqueletoHoy />;

  const deHoy = comidas.filter((c) => c.fecha === diaActivo && !c.capricho);
  const total = sumar(deHoy);
  const litros = aguaLitros[diaActivo] ?? 0;
  // Los hábitos que se marcan hoy: los que eligió la persona; si nunca eligió
  // ninguno, los de fábrica (los 5 de Isaac: sol, vitaminas, leer, dormir y
  // correr). Lo mismo que calculan los puntos de arriba.
  const habitosDeHoy = perfil.habitosActivos ?? HABITOS_INICIALES;
  const marcadosHoy = habitosHechos?.[diaActivo] ?? [];
  // El capricho va aparte: no cambia el objetivo del día ni el total.
  const objetivoHoy = plan.kcal;
  const restante = objetivoHoy - total.kcal;
  const pasado = restante < 0;
  const mediaSemanal = mediaSemanalCalorias(comidas, diaActivo, objetivoHoy);

  return (
    <div className="flex flex-col gap-4 px-5 pb-10 pt-7">
      {/* 1. CABECERA LIMPIA */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-xl font-bold text-ink">Hola, {perfil.nombre}</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <CampanaNotificaciones />
            <button
              type="button"
              onClick={() => {
                sonidoTap();
                vibrarTap();
                setModalGuiaAbierto(true);
              }}
              className="inline-flex min-h-[36px] shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted transition duration-150 hover:text-ink hover:border-border-input active:scale-95 shadow-2xs"
              title="Vídeo guía: Cómo usar la app paso a paso"
            >
              <Play size={11} className="fill-current text-accent" />
              <span>Guía</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sonidoTap();
                vibrarTap();
                mostrarTostada(
                  racha > 0
                    ? `🔥 Llevas ${racha} ${racha === 1 ? "día seguido" : "días seguidos"} cuidándote.`
                    : "Anota tu primera comida hoy para encender tu racha 🔥",
                );
              }}
              className={[
                "inline-flex min-h-[36px] shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition duration-150 active:scale-95",
                racha > 0
                  ? "border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-2xs"
                  : "border border-border bg-surface text-muted",
              ].join(" ")}
            >
              <Flame
                size={14}
                className={racha > 0 ? "fill-amber-500 text-amber-500 animate-racha-fuego" : "text-muted"}
                aria-hidden="true"
              />
              <span>{racha} {racha === 1 ? "día" : "días"}</span>
            </button>
          </div>
        </div>

        {/* Selector de día minimalista */}
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface/60 px-2 py-1">
          <button
            type="button"
            onClick={() => cambiarDia(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:text-ink active:scale-95"
            aria-label="Ver día anterior"
          >
            <ChevronLeft size={17} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink">
              {esHoy
                ? `Hoy · ${enPalabras(diaActivo)}`
                : esAyer
                  ? `Ayer · ${enPalabras(diaActivo)}`
                  : enPalabras(diaActivo)}
            </span>
            {!esHoy && (
              <button
                type="button"
                onClick={() => {
                  sonidoTap();
                  vibrarTap();
                  setDiaSeleccionado(null);
                }}
                className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent"
              >
                Volver a hoy
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => cambiarDia(1)}
            disabled={esHoy}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-lg transition",
              esHoy ? "opacity-25 cursor-not-allowed text-muted" : "text-muted hover:text-ink",
            ].join(" ")}
            aria-label="Ver día siguiente"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </header>

      {/* 2. TARJETA PRINCIPAL DE ENERGÍA (REVELACIÓN PROGRESIVA EN 2 SEGUNDOS) */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface p-5 shadow-xs">
        <div className="flex flex-col items-center gap-2 text-center">
          <ProgressRing
            value={total.kcal}
            max={objetivoHoy}
            label="Calorías de hoy"
            activo={entradaLista}
          />
          <p className="text-base text-ink font-medium pt-1">
            {pasado ? (
              <>
                Hoy llevas <strong className="font-bold text-warning tabular-nums inline-flex items-baseline gap-1"><ContadorRodante valor={Math.round(-restante)} /> kcal</strong> de más. No pasa nada, mañana seguimos.
              </>
            ) : total.kcal === 0 ? (
              <>
                Tienes <strong className="font-bold text-accent tabular-nums inline-flex items-baseline gap-1"><ContadorRodante valor={Math.round(restante)} /> kcal</strong> para tus comidas de hoy.
              </>
            ) : (
              <>
                Vas muy bien: te quedan <strong className="font-bold text-accent tabular-nums inline-flex items-baseline gap-1"><ContadorRodante valor={Math.round(restante)} /> kcal</strong> hoy.
              </>
            )}
          </p>

          <MediaSemanalBadge media={mediaSemanal} />

          {/* Botón sutil para ver/ocultar proteínas, hidratos y grasas sin agobiar a quien no los usa */}
          <button
            type="button"
            onClick={alternarVerMacros}
            className="inline-flex min-h-[38px] items-center rounded-full px-3 py-2 text-xs font-medium text-muted hover:bg-bg/70 hover:text-ink transition"
          >
            {verMacros ? "Ocultar nutrientes ▴" : "Ver proteínas e hidratos ▾"}
          </button>
        </div>

        {verMacros && (
          <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
            <div className="flex flex-col gap-1 rounded-xl bg-bg/70 p-2.5 border border-border/40">
              <span className="text-2xs font-bold text-muted">🥩 Proteína</span>
              <span className="text-xs font-bold text-ink tabular-nums">
                {Math.round(total.proteinas)} <span className="text-[10px] font-normal text-muted">/ {plan.macros.proteinas}g</span>
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60 mt-0.5">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.min(100, (total.proteinas / plan.macros.proteinas) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-xl bg-bg/70 p-2.5 border border-border/40">
              <span className="text-2xs font-bold text-muted">🌾 Hidratos</span>
              <span className="text-xs font-bold text-ink tabular-nums">
                {Math.round(total.carbohidratos)} <span className="text-[10px] font-normal text-muted">/ {plan.macros.carbohidratos}g</span>
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60 mt-0.5">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.min(100, (total.carbohidratos / plan.macros.carbohidratos) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-xl bg-bg/70 p-2.5 border border-border/40">
              <span className="text-2xs font-bold text-muted">🥑 Grasa</span>
              <span className="text-xs font-bold text-ink tabular-nums">
                {Math.round(total.grasas)} <span className="text-[10px] font-normal text-muted">/ {plan.macros.grasas}g</span>
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60 mt-0.5">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.min(100, (total.grasas / plan.macros.grasas) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* EL ÚNICO BOTÓN DE ACCIÓN PRINCIPAL EN PANTALLA */}
        <Button
          size="lg"
          className="w-full h-12 text-sm font-bold shadow-xs mt-1"
          onClick={() => {
            sonidoTap();
            vibrarTap();
            setHoja("libre");
          }}
        >
          <Plus size={19} aria-hidden="true" />
          Anotar lo que he comido
        </Button>
      </section>

      {/* 3. ALERTA DE RETENCIÓN MENSTRUAL (SOLO SI HAY RETENCIÓN O FALTA CONFIGURAR) */}
      {floActivo && (!perfil?.cicloMenstrual?.modo || estadoCiclo?.esFaseRetencion) ? (
        <section className="flex items-center justify-between gap-3 rounded-xl border border-rose-200/70 bg-rose-50/40 px-3.5 py-2.5 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <Droplets size={16} className="shrink-0 text-rose-500 fill-current" />
            <p className="text-xs text-ink leading-snug">
              {estadoCiclo?.esFaseRetencion ? (
                <>
                  <strong>Días de retención ({estadoCiclo.retencionEstimadaKg}):</strong> normal si la báscula sube un poco por agua.
                </>
              ) : (
                "Configura tu ciclo para que la app tenga en cuenta la retención de líquidos."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalFloAbierto(true)}
            className="shrink-0 rounded-lg border border-rose-200 bg-surface px-2.5 py-1 text-xs font-bold text-rose-600 dark:border-rose-800 dark:text-rose-300"
          >
            Ver
          </button>
        </section>
      ) : null}

      {/* 4. COMIDAS DE HOY (LIMPIAS, SIN BOTONES REDUNDANTES NI RUIDO) */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted px-0.5">
          Tus comidas de hoy
        </h2>

        {TIPOS_COMIDA.map((t) => {
          const entradas = deHoy.filter((c) => c.tipo === t.valor);
          const kcal = entradas.reduce(
            (s, c) => s + c.alimentos.reduce((x, a) => x + a.kcal, 0),
            0,
          );
          const previsto = platoDelPlanHoy?.comidas[t.valor as Momento];

          return (
            <article key={t.valor} className="rounded-xl border border-border/70 bg-surface p-3.5">
              <header className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sonidoTap();
                    vibrarTap();
                    setHoja(t.valor);
                  }}
                  className="flex flex-1 min-h-[40px] -my-1.5 py-1.5 items-center justify-between rounded-lg text-left"
                >
                  <h3 className="text-sm font-bold text-ink">{t.etiqueta}</h3>
                  <span className="text-xs font-semibold text-accent">
                    {kcal > 0 ? `${Math.round(kcal)} kcal · + Añadir` : "+ Apuntar"}
                  </span>
                </button>
              </header>

              {entradas.length === 0 ? (
                previsto ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-bg/70 px-3 py-2 border border-border/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-accent">En tu plan de hoy:</p>
                      <p className="text-xs font-medium text-ink truncate">{previsto.nombre}</p>
                      <p className="text-[11px] text-muted">{previsto.kcal} kcal</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-[38px] px-3.5 text-xs shrink-0"
                      onClick={() => {
                        sonidoCheck();
                        vibrarCheck();
                        anadirComida({
                          fecha: diaActivo,
                          tipo: t.valor,
                          alimentos: [
                            {
                              id: `${Date.now()}-plan-hoy`,
                              nombre: previsto.nombre,
                              cantidad: "1 plato del plan",
                              kcal: previsto.kcal,
                              proteinas: previsto.proteinas,
                              carbohidratos: previsto.carbohidratos,
                              grasas: previsto.grasas,
                            },
                          ],
                        });
                      }}
                    >
                      <Check size={14} />
                      Ya lo comí
                    </Button>
                  </div>
                ) : null
              ) : (
                <ul className="mt-2 flex flex-col divide-y divide-border/50">
                  {entradas.flatMap((c) =>
                    c.alimentos.map((a) => {
                      const abiertoAcciones = alimentoActivoId === a.id || editando === a.id;
                      const guardarCantidad = () => {
                        if (editarAlimento(c.id, a.id, cantidadEdit)) {
                          setEditando(null);
                          setAlimentoActivoId(null);
                          setErrorCantidad(null);
                        } else {
                          setErrorCantidad("Escribe solo el número (por ejemplo 200).");
                        }
                      };

                      return (
                        <li key={a.id} className="py-2 first:pt-1 last:pb-0">
                          <FilaDeslizable
                            onBorrar={() => borrarAlimento(c.id, a.id)}
                            onAccionDerecha={() => {
                              setEditando(a.id);
                              setCantidadEdit(soloNumero(a.cantidad));
                              setErrorCantidad(null);
                            }}
                            nombreElemento={a.nombre}
                            etiquetaBorrar="Quitar"
                            etiquetaDerecha="Editar"
                            desactivado={editando === a.id}
                            className="rounded-xl"
                          >
                            <div className="flex items-center justify-between gap-2 py-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setAlimentoActivoId((prev) => (prev === a.id ? null : a.id))
                                }
                                className="flex flex-1 items-baseline justify-between gap-2 text-left min-w-0"
                              >
                                <span className="truncate text-sm font-medium text-ink">{a.nombre}</span>
                                <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
                                  {conComaSinCeros(a.kcal)} kcal
                                </span>
                              </button>
                              <BotonBorradoElastico
                                onBorrar={() => borrarAlimento(c.id, a.id)}
                                variante="icono"
                                etiquetaConfirmar="¿Borrar?"
                                ariaLabel={`Quitar ${a.nombre}`}
                                className="shrink-0 ml-1 text-muted hover:text-danger"
                              />
                            </div>
                          </FilaDeslizable>

                          {editando === a.id ? (
                            <div className="flex flex-col gap-2 pt-2">
                              <TextField
                                label={`Cantidad de ${a.nombre}`}
                                value={cantidadEdit}
                                onChange={(e) => {
                                  setCantidadEdit(e.target.value);
                                  if (errorCantidad) setErrorCantidad(null);
                                }}
                                inputMode="decimal"
                                autoFocus
                                suffix={unidadDe(a.cantidad)}
                                error={errorCantidad ?? undefined}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") guardarCantidad();
                                }}
                              />
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-3xs font-semibold text-muted">¿Te sobró?:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    ajustarSobrasAlimento(c.id, a.id, 0.5);
                                    setEditando(null);
                                    setAlimentoActivoId(null);
                                  }}
                                  className="rounded-lg border border-border bg-surface px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition active:scale-95"
                                >
                                  ½ La mitad
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    ajustarSobrasAlimento(c.id, a.id, 0.75);
                                    setEditando(null);
                                    setAlimentoActivoId(null);
                                  }}
                                  className="rounded-lg border border-border bg-surface px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition active:scale-95"
                                >
                                  ¾ Dejé un poco
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    ajustarSobrasAlimento(c.id, a.id, 0.33);
                                    setEditando(null);
                                    setAlimentoActivoId(null);
                                  }}
                                  className="rounded-lg border border-border bg-surface px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition active:scale-95"
                                >
                                  ⅓ Un tercio
                                </button>
                              </div>
                              <div className="flex items-center gap-2 pt-0.5">
                                <Button size="sm" onClick={guardarCantidad}>
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditando(null);
                                    setErrorCantidad(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : abiertoAcciones ? (
                            <div className="mt-1.5 flex flex-col gap-1.5 rounded-lg bg-bg px-2.5 py-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted">{enComa(a.cantidad)}</span>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditando(a.id);
                                      setCantidadEdit(soloNumero(a.cantidad));
                                      setErrorCantidad(null);
                                    }}
                                    className="font-semibold text-ink hover:text-accent"
                                  >
                                    Cambiar cantidad
                                  </button>
                                  <BotonBorradoElastico
                                    onBorrar={() => borrarAlimento(c.id, a.id)}
                                    variante="texto"
                                    etiquetaInicial="Quitar"
                                    etiquetaConfirmar="¿Borrar?"
                                    ariaLabel={`Quitar ${a.nombre}`}
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-1.5">
                                <span className="text-3xs font-semibold text-muted">¿Dejaste comida?:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    ajustarSobrasAlimento(c.id, a.id, 0.5);
                                    setAlimentoActivoId(null);
                                  }}
                                  className="rounded-lg border border-border bg-surface px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition active:scale-95"
                                >
                                  ½ Comí la mitad
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    ajustarSobrasAlimento(c.id, a.id, 0.75);
                                    setAlimentoActivoId(null);
                                  }}
                                  className="rounded-lg border border-border bg-surface px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition active:scale-95"
                                >
                                  ¾ Dejé un poco
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    ajustarSobrasAlimento(c.id, a.id, 0.33);
                                    setAlimentoActivoId(null);
                                  }}
                                  className="rounded-lg border border-border bg-surface px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition active:scale-95"
                                >
                                  ⅓ Comí un tercio
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      );
                    }),
                  )}
                </ul>
              )}
            </article>
          );
        })}
      </section>

      {/* 5. AGUA EN 1 SOLA LÍNEA Y 1 BOTÓN DIRECTO */}
      <section className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">💧 Agua de hoy</h2>
            <p className="text-xs text-muted">
              Llevas <strong className="text-ink inline-flex items-baseline gap-0.5"><ContadorRodante valor={litros} formateador={(n) => conComa(n, 2)} /> L</strong> de {conComaSinCeros(metaAguaL)} L
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {litros > 0 ? (
              <button
                type="button"
                aria-label="Restar un vaso de agua"
                onClick={() => {
                  sonidoTap();
                  vibrarTap();
                  ponerAgua(diaActivo, Math.max(0, litros - 0.25));
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg text-sm font-bold text-muted hover:text-ink active:scale-95"
              >
                −
              </button>
            ) : null}
            <Button
              size="sm"
              onClick={(e) => {
                sonidoAgua();
                vibrarTap();
                const nuevo = litros + 0.25;
                if (litros < metaAguaL && nuevo >= metaAguaL) {
                  mostrarTostada(`¡Objetivo de agua cumplido, ${perfil.nombre}! 💧`, "💧");
                  lanzarReaccion("💧", e, 8);
                } else {
                  mostrarTostada(`+1 vaso de agua (${nuevo.toFixed(2).replace(".", ",")} L)`, "💧");
                  lanzarReaccion("💧", e, 5);
                }
                ponerAgua(diaActivo, nuevo);
              }}
              className="h-9 px-3.5 text-xs font-bold"
            >
              + 1 vaso (0,25 L)
            </Button>
          </div>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-pill bg-border/60">
          <div
            className="h-full rounded-pill bg-accent transition-all duration-300 ease-app"
            style={{ width: `${Math.min(100, (litros / metaAguaL) * 100)}%` }}
          />
        </div>
      </section>

      {/* 6. HÁBITOS DE HOY */}
      {habitosDeHoy.length > 0 ? (
        <section className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Hábitos de hoy</h2>
            <span className="text-xs text-muted">
              {marcadosHoy.length} de {habitosDeHoy.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {habitosDeHoy.map((id) => {
              const marcado = marcadosHoy.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={marcado}
                  onClick={(e) => {
                    sonidoCheck();
                    vibrarCheck();
                    if (!marcado) {
                      if (marcadosHoy.length + 1 >= habitosDeHoy.length) {
                        mostrarTostada(`¡Pleno de hábitos hoy! ⭐`, "⭐");
                        lanzarReaccion("⭐", e, 7);
                      } else {
                        mostrarTostada(`Hábito: ${etiquetaDe(id, perfil.habitosPropios)}`, "✨");
                        lanzarReaccion("✨", e, 4);
                      }
                    }
                    alternarHabito(diaActivo, id);
                  }}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs",
                    "transition-all duration-200 active:scale-95",
                    marcado
                      ? "border-accent bg-accent font-semibold text-on-accent"
                      : "border-border bg-bg text-ink",
                  ].join(" ")}
                >
                  {marcado ? <Check size={13} aria-hidden="true" /> : null}
                  {etiquetaDe(id, perfil.habitosPropios)}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* 7. PASOS, SUEÑO Y PUNTOS COMPACTADOS (CERO FORMULARIOS ABIERTOS POR DEFECTO) */}
      <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink">Pasos y descanso</h2>
            <p className="text-xs text-muted truncate">
              {pasosHoy !== undefined ? `${pasosHoy.toLocaleString("es-ES")} pasos` : "Sin pasos hoy"}
              {" · "}
              {suenoHoy !== undefined ? `${conComaSinCeros(suenoHoy)} h de sueño` : "Sin sueño hoy"}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs shrink-0"
            onClick={() => setEditarSalud((v) => !v)}
          >
            {editarSalud ? "Cerrar" : "Apuntar"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs font-medium text-muted">¿Sin reloj?:</span>
            {[
              { extra: 1500, etiqueta: "+1.500" },
              { extra: 3000, etiqueta: "+3.000" },
              { extra: 6000, etiqueta: "+6.000" },
            ].map(({ extra, etiqueta }) => (
              <button
                key={extra}
                type="button"
                className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-2xs font-bold text-accent hover:bg-accent/20 active:scale-95 transition-all shadow-2xs"
                onClick={() => {
                  const actual = pasosHoy ?? 0;
                  const nuevo = actual + extra;
                  ponerSalud(diaActivo, { pasos: nuevo });
                  marcarSalud();
                  sonidoTap();
                  vibrarTap();
                  mostrarTostada(`+${extra.toLocaleString("es-ES")} pasos (${nuevo.toLocaleString("es-ES")} hoy)`, "👟");
                }}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        <p className="text-2xs text-muted leading-relaxed">
          Puedes apuntarlos a mano aquí o{" "}
          <Link href="/ajustes" className="font-semibold text-accent hover:underline">
            conectarlo en Ajustes
          </Link>{" "}
          para que se sincronicen solos desde tu móvil.
        </p>

        {editarSalud && (
          <div className="flex flex-col gap-3.5 border-t border-border/60 pt-3">
            {/* Foto OCR inteligente para pulseras de AliExpress, Temu, Xiaomi o cualquier reloj */}
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink">¿Llevas pulsera o reloj inteligente?</p>
                  <p className="text-2xs text-muted">Foto a la pantalla del reloj o pulsera (Da Fit, FitPro, Xiaomi...) y la IA los apunta por ti.</p>
                </div>
                <input
                  ref={inputFotoSaludRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) procesarFotoSalud(f);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0 text-xs font-bold gap-1.5 shadow-sm"
                  disabled={cargandoSaludFoto}
                  onClick={() => inputFotoSaludRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5 text-accent" />
                  {cargandoSaludFoto ? "Leyendo..." : "Foto al reloj"}
                </Button>
              </div>
              {mensajeSaludFoto && (
                <p className="text-2xs font-medium text-accent">
                  {mensajeSaludFoto}
                </p>
              )}
            </div>

            {/* Pasos a mano y presets de 1 toque */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    label="Pasos de hoy"
                    inputMode="numeric"
                    value={pasosTexto}
                    onChange={(e) => setPasosTexto(e.target.value)}
                    placeholder={pasosHoy !== undefined ? String(pasosHoy) : "Ej. 8000"}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={aPasos(pasosTexto) <= 0 || aPasos(pasosTexto) > 100000}
                  onClick={() => {
                    ponerSalud(diaActivo, { pasos: aPasos(pasosTexto) });
                    setPasosTexto("");
                    marcarSalud();
                    setEditarSalud(false);
                  }}
                >
                  Guardar
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-2xs text-muted">A un toque:</span>
                {[4000, 6000, 8000, 10000, 12000, 15000].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="rounded-lg border border-border/70 bg-surface-raised px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition-colors"
                    onClick={() => {
                      ponerSalud(diaActivo, { pasos: p });
                      marcarSalud();
                      setEditarSalud(false);
                    }}
                  >
                    {p >= 1000 ? `${p / 1000}k` : p}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-2xs text-muted">¿Sin reloj?:</span>
                {[
                  { extra: 1500, etiqueta: "+1.500 (Casa)" },
                  { extra: 3000, etiqueta: "+3.000 (Recados)" },
                  { extra: 6000, etiqueta: "+6.000 (Paseo 1 h)" },
                ].map(({ extra, etiqueta }) => (
                  <button
                    key={extra}
                    type="button"
                    className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-0.5 text-2xs font-semibold text-accent hover:bg-accent/20 transition-colors"
                    onClick={() => {
                      const actual = pasosHoy ?? 0;
                      const nuevo = actual + extra;
                      ponerSalud(diaActivo, { pasos: nuevo });
                      marcarSalud();
                      setEditarSalud(false);
                      sonidoTap();
                      vibrarTap();
                      mostrarTostada(`+${extra.toLocaleString("es-ES")} pasos (${nuevo.toLocaleString("es-ES")} hoy)`, "👟");
                    }}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {/* Sueño a mano y presets de 1 toque */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    label="Horas de sueño de anoche"
                    inputMode="decimal"
                    suffix="h"
                    value={suenoTexto}
                    onChange={(e) => setSuenoTexto(e.target.value)}
                    placeholder={suenoHoy !== undefined ? conComaSinCeros(suenoHoy) : "Ej. 7,5"}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={aNumero(suenoTexto) <= 0 || aNumero(suenoTexto) > 24}
                  onClick={() => {
                    ponerSalud(diaActivo, { suenoHoras: aNumero(suenoTexto) });
                    setSuenoTexto("");
                    marcarSalud();
                    setEditarSalud(false);
                  }}
                >
                  Guardar
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-2xs text-muted">A un toque:</span>
                {[6, 6.5, 7, 7.5, 8, 8.5].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="rounded-lg border border-border/70 bg-surface-raised px-2 py-0.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent transition-colors"
                    onClick={() => {
                      ponerSalud(diaActivo, { suenoHoras: h });
                      marcarSalud();
                      setEditarSalud(false);
                    }}
                  >
                    {conComaSinCeros(h)}h
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 8. PUNTOS Y TIENDA EN UNA FILA DISCRETA AL FINAL */}
      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-4 py-2.5 text-xs">
        <span className="text-muted">
          ⭐ Tienes <strong className="text-ink inline-flex items-baseline gap-0.5"><ContadorRodante valor={puntos.saldo} /> puntos</strong> acumulados (+{puntos.ganadosHoy} hoy)
        </span>
        <Link href="/tienda" className="font-bold text-accent hover:underline">
          Canjear capricho →
        </Link>
      </div>

      {/* Modales y Hojas (intactos) */}
      {hoja ? (
        <HojaAnadir
          fecha={diaActivo}
          tipoInicial={hoja === "libre" ? undefined : hoja}
          onCerrar={() => setHoja(null)}
        />
      ) : null}
      {hojaCapricho ? (
        <HojaAnadir fecha={diaActivo} esCapricho onCerrar={() => setHojaCapricho(false)} />
      ) : null}
      {modalRachaAbierto ? (
        <ModalRachaDuolingo
          abierto
          onCerrar={() => setModalRachaAbierto(false)}
          racha={racha}
          nombre={perfil.nombre}
          diasActivosSemana={diasActivosSemana}
        />
      ) : null}
      {modalGuiaAbierto ? (
        <ModalGuiaVideo abierto onCerrar={() => setModalGuiaAbierto(false)} />
      ) : null}
      {perfil?.sexo === "mujer" && modalFloAbierto ? (
        <ModalFloCiclo abierto onCerrar={() => setModalFloAbierto(false)} />
      ) : null}
      {modalRelojAbierto ? (
        <ModalRelojSalud abierto onCerrar={() => setModalRelojAbierto(false)} />
      ) : null}
      {modalObjetivoAbierto ? (
        <ModalCambiarObjetivo abierto onCerrar={() => setModalObjetivoAbierto(false)} />
      ) : null}
    </div>
  );
}
