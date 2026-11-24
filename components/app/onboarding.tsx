"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Flame, Footprints, GlassWater, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ChoiceList } from "@/components/ui/choice";
import { ListaRoja } from "@/components/app/lista-roja";
import { useDatos, type Perfil } from "@/lib/store";
import { NOMBRE_MAX, revisarNombre } from "@/lib/nombre";
import { aguaRecomendadaL } from "@/lib/agua";
import { HABITOS_INICIALES, type HabitoPropio } from "@/lib/habitos";
import { CLAVE_NOVEDADES, VERSION } from "@/lib/novedades";
import { aceptarPrivacidad } from "@/lib/privacidad";
import { ElegirHabitos } from "@/components/app/elegir-habitos";
import {
  ACTIVIDADES,
  aAlturaCm,
  aNumero,
  ritmosPara,
  type Objetivo,
  clasificacionImc,
  conComa,
  conComaSinCeros,
  conMiles,
  edad,
  gastoDiario,
  imc,
  KCAL_MINIMAS,
  kcalRedondeadas,
  macrosDiarios,
  objetivoCalorico,
  pasosSugeridos,
  validarPesoObjetivo,
  type Actividad,
  type Sexo,
} from "@/lib/calculos";

const DIETAS = [
  { valor: "ninguna", etiqueta: "Como de todo", ayuda: "Sin restricciones" },
  { valor: "vegetariano", etiqueta: "Vegetariano", ayuda: "Sin carne ni pescado" },
  { valor: "vegano", etiqueta: "Vegano", ayuda: "Sin nada de origen animal" },
  { valor: "sin-gluten", etiqueta: "Sin gluten", ayuda: "Nada de trigo ni similares" },
  { valor: "sin-lactosa", etiqueta: "Sin lactosa", ayuda: "Nada de leche ni derivados" },
];

const TOTAL_PASOS = 8;

export function Onboarding({ onEmpezar }: { onEmpezar: () => void }) {
  const { guardarPerfil, ponerMetaAgua, recuperar } = useDatos();
  const router = useRouter();

  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState("");
  const [sexo, setSexo] = useState<Sexo>("hombre");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [pesoObjetivo, setPesoObjetivo] = useState("");
  const [actividad, setActividad] = useState<Actividad>("ligero");
  const [ritmo, setRitmo] = useState("0.5");
  // Las dos metas del día (agua y pasos) arrancan sin decidir: guardan null
  // hasta que el usuario las toca, así el valor propuesto «se queda así» solo.
  const [aguaElegida, setAguaElegida] = useState<number | null>(null);
  const [pasosElegidos, setPasosElegidos] = useState<number | null>(null);
  const [objetivo, setObjetivo] = useState<Objetivo>("adelgazar");
  const [dieta, setDieta] = useState("ninguna");
  const [noLeGustan, setNoLeGustan] = useState<string[]>([]);
  // Los hábitos empiezan con los cinco de siempre marcados: se ven, y con un
  // toque en «Ninguno» se quedan en cero.
  const [habitosActivos, setHabitosActivos] = useState<string[]>([...HABITOS_INICIALES]);
  const [habitosPropios, setHabitosPropios] = useState<HabitoPropio[]>([]);
  // Recuperar los datos de otro móvil desde aquí: quien reinstala la app no
  // tiene perfil todavía, así que no puede llegar a Ajustes a teclear el código.
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [codigoRec, setCodigoRec] = useState("");
  const [recuperando, setRecuperando] = useState(false);
  const [errorRec, setErrorRec] = useState("");

  // Al cambiar de paso, asegura que la pantalla empiece arriba
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [paso]);

  const alturaNum = aAlturaCm(altura);
  const pesoNum = aNumero(peso);
  const objetivoNum = aNumero(pesoObjetivo);
  const anios = edad(fechaNacimiento);

  const gasto = gastoDiario(pesoNum, alturaNum, anios, sexo, actividad);
  const kcal = kcalRedondeadas(objetivoCalorico(gasto, Number(ritmo), objetivo));
  const macros = macrosDiarios(kcal, pesoNum);

  /** La meta que se enseña y se guarda: la elegida, o la que le toca. */
  const aguaActual = aguaElegida ?? aguaRecomendadaL(pesoNum, objetivo);
  const pasosActuales = pasosElegidos ?? pasosSugeridos(actividad);

  /** Cambiar la meta de agua en cuartos de litro (entre medio y cinco litros). */
  function cambiarAgua(dif: number) {
    setAguaElegida(Math.min(5, Math.max(0.5, Math.round((aguaActual + dif) * 100) / 100)));
  }

  /** Cambiar la meta de pasos en tandas de quinientos (entre 2.000 y 40.000). */
  function cambiarPasos(dif: number) {
    setPasosElegidos(Math.min(40000, Math.max(2000, pasosActuales + dif)));
  }

  // El peso objetivo tiene que ir en el sentido del objetivo que ha elegido,
  // quedar dentro de 35..300 kg y no buscar bajo peso clínico (IMC < 18,5) al adelgazar.
  const quiereSubir = objetivo === "subir" || objetivo === "volumen-limpio";
  const revisionObjetivo = validarPesoObjetivo({
    pesoActualKg: pesoNum,
    pesoObjetivoKg: objetivoNum,
    alturaCm: alturaNum,
    objetivo,
    minKg: 35,
  });

  // Solo letras, espacios y guiones, y como mucho 20. El motivo se enseña
  // debajo de la caja en cuanto se escribe algo que no vale.
  const nombreRevisado = revisarNombre(nombre);

  const puedeSeguir = [
    nombreRevisado.ok,
    fechaNacimiento !== "" && anios >= 14 && anios <= 100,
    alturaNum >= 100 && alturaNum <= 250 && pesoNum >= 35 && pesoNum <= 300,
    pesoObjetivo.trim() !== "" && pesoNum > 0 && revisionObjetivo.ok,
    true,
    true,
    true,
    true,
  ][paso];

  function terminar() {
    const perfil: Perfil = {
      nombre: nombreRevisado.ok ? nombreRevisado.nombre : nombre.trim(),
      sexo,
      fechaNacimiento,
      alturaCm: alturaNum,
      pesoInicialKg: pesoNum,
      pesoObjetivoKg: objetivoNum,
      actividad,
      ritmoKgSemana: Number(ritmo),
      objetivo,
      dieta,
      noLeGustan,
      habitosActivos,
      habitosPropios,
      metaPasos: pasosActuales,
      creado: new Date().toISOString(),
    };
    guardarPerfil(perfil);
    // La meta de agua: la que le toca por su cuerpo, o la que eligió tocando
    // −/+ en el cuestionario. Los pasos van dentro del perfil. Desde Ajustes
    // las dos se pueden cambiar cuando quiera.
    ponerMetaAgua(aguaActual);
    // Quien acaba de rellenar el cuestionario ya tiene la versión de hoy:
    // no tiene sentido enseñarle un cartel de «esto es lo nuevo» sobre una
    // versión vieja que nunca llegó a ver.
    try {
      window.localStorage.setItem(CLAVE_NOVEDADES, String(VERSION));
    } catch {
      // sin localStorage
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5">
      <header className="flex flex-col gap-3 pt-8">
        {paso > 0 ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaso((p) => p - 1)}
              aria-label="Atrás"
              className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div className="flex flex-1 gap-1.5" aria-hidden="true">
              {Array.from({ length: TOTAL_PASOS }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "h-1.5 flex-1 rounded-pill",
                    i <= paso ? "bg-accent" : "bg-border",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex flex-1 flex-col gap-6 py-8">
        {paso === 0 ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
                <Sparkles size={14} aria-hidden="true" />
                Beta de Isaac
              </span>
              <h1 className="text-display text-ink">
                {nombre.trim() ? `¡Hola, ${nombre.trim()}!` : "¡Hola!"}
              </h1>
              <p className="text-base text-muted">
                Soy la app que te va a llevar la cuenta de lo que comes y de cómo vas. Antes de
                empezar necesito hacerte unas preguntas rápidas y te monto el plan. Se tarda un
                minuto.
              </p>
            </div>
            <TextField
              label="¿Cómo te llamas?"
              value={nombre}
              autoFocus
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && puedeSeguir) setPaso(1);
              }}
              maxLength={NOMBRE_MAX}
              autoComplete="given-name"
              placeholder="Ej. María"
              hint="Lo uso para saludarte y para hablar contigo en los avisos."
              error={
                nombre.trim() && !nombreRevisado.ok ? nombreRevisado.motivo : undefined
              }
            />
            {/* Recuperar la cuenta desde el paso 0: un móvil nuevo o recién
                instalado no tiene perfil, así que no hay forma de llegar a
                Ajustes a escribir el código de recuperación. */}
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-center text-xs text-muted">
                Tus datos son 100% privados e Isaac no tiene acceso a ellos.{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
                >
                  Privacidad y cookies
                </a>
              </p>
              {mostrarRecuperar ? (
                <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
                  <TextField
                    label="Código de recuperación (6 letras o números)"
                    value={codigoRec}
                    onChange={(e) => setCodigoRec(e.target.value.toUpperCase())}
                    placeholder="ABC234"
                    error={errorRec || undefined}
                  />
                  <Button
                    variant="secondary"
                    disabled={recuperando || codigoRec.trim().length < 6}
                    onClick={async () => {
                      setRecuperando(true);
                      setErrorRec("");
                      const ok = await recuperar(codigoRec);
                      setRecuperando(false);
                      if (!ok) {
                        setErrorRec("Ese código no existe o no hay conexión.");
                      } else {
                        aceptarPrivacidad();
                        router.replace("/hoy");
                      }
                    }}
                  >
                    {recuperando ? "Recuperando…" : "Traer mis datos"}
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setMostrarRecuperar(true)}>
                  ¿Ya tenías la app en otro móvil? Recuperar mis datos
                </Button>
              )}
            </div>
          </>
        ) : null}

        {paso === 1 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl text-ink">Sobre ti</h1>
              <p className="text-base text-muted">
                La edad y el sexo cambian cuánta energía gastas al día. Sin esto, el plan sería
                una cifra inventada.
              </p>
            </div>
            <ChoiceList
              label="Sexo"
              valor={sexo}
              onChange={(v) => setSexo(v as Sexo)}
              opciones={[
                { valor: "hombre", etiqueta: "Hombre", ayuda: "Para calcular el gasto" },
                { valor: "mujer", etiqueta: "Mujer", ayuda: "Para calcular el gasto" },
              ]}
            />
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && puedeSeguir) setPaso(2);
              }}
              hint={
                anios > 0
                  ? `Tienes ${anios} años.`
                  : "Toca para abrir el calendario (dd/mm/aaaa)."
              }
              error={
                fechaNacimiento !== "" && (anios < 14 || anios > 100)
                  ? "Revisa el año: hay que tener entre 14 y 100 años."
                  : undefined
              }
            />
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl text-ink">Tu cuerpo hoy</h1>
              <p className="text-base text-muted">
                El peso de hoy es el punto de partida. Pésate por la mañana, en ayunas y sin ropa,
                para que las cifras se puedan comparar entre días.
              </p>
            </div>
            <TextField
              label="Altura (m o cm)"
              type="text"
              inputMode="decimal"
              hint="Escribe 1,68 o 168: las dos valen"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && puedeSeguir) setPaso(3);
              }}
              placeholder="1,68"
              error={
                altura.trim() !== "" && (alturaNum < 100 || alturaNum > 250)
                  ? "Escribe una altura entre 100 y 250 cm (por ejemplo 168 o 1,68)."
                  : undefined
              }
            />
            <TextField
              label="Peso de hoy"
              type="text"
              inputMode="decimal"
              suffix="kg"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && puedeSeguir) setPaso(3);
              }}
              placeholder="82,5"
              hint="Con decimales si los sabes: 82,5"
              error={
                peso.trim() !== "" && (pesoNum < 35 || pesoNum > 300)
                  ? "Escribe un peso entre 35 y 300 kg."
                  : undefined
              }
            />
            {alturaNum > 0 && pesoNum > 0 ? (
              <p className="rounded-md bg-surface px-4 py-3 text-sm text-muted">
                Tu índice de masa corporal es {conComa(imc(pesoNum, alturaNum))} ·{" "}
                {clasificacionImc(imc(pesoNum, alturaNum))}
              </p>
            ) : null}
          </>
        ) : null}

        {paso === 3 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl text-ink">Hasta dónde quieres llegar</h1>
              <p className="text-base text-muted">
                Primero dime qué buscas, y después el peso y el ritmo.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink">Qué quieres</span>
              <ChoiceList
                label="Qué quieres"
                valor={objetivo}
                onChange={(v) => {
                  const nuevo = v as Objetivo;
                  setObjetivo(nuevo);
                  // Si quiere mantenerse o recomposición y aún no ha escrito un peso
                  // objetivo, se propone el suyo actual para no bloquear el avance:
                  if ((nuevo === "mantener" || nuevo === "recomposicion") && pesoObjetivo.trim() === "" && pesoNum > 0) {
                    setPesoObjetivo(peso);
                  }
                  // El ritmo del sentido anterior se queda huérfano (ya no está
                  // en la lista del nuevo objetivo): al mantener no hay ritmo,
                  // recomposición y volumen limpio traen los suyos, y al volver
                  // a adelgazar o subir se empieza por el ritmo normal.
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
            <div className="flex flex-col gap-1.5">
              <TextField
                label="Peso objetivo"
                type="text"
                inputMode="decimal"
                suffix="kg"
                value={pesoObjetivo}
                onChange={(e) => setPesoObjetivo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && puedeSeguir) setPaso(4);
                }}
                placeholder={quiereSubir ? "65" : pesoNum > 0 ? String(pesoNum) : "75"}
                error={
                  pesoObjetivo.trim() !== "" && pesoNum > 0 && !revisionObjetivo.ok
                    ? revisionObjetivo.motivo
                    : undefined
                }
              />
              {pesoNum > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-1 px-1">
                  <button
                    type="button"
                    onClick={() => setPesoObjetivo(peso)}
                    className="text-xs font-semibold text-accent hover:underline active:scale-95 transition"
                  >
                    🎯 Usar mi peso de hoy ({pesoNum} kg)
                  </button>
                  {objetivo === "recomposicion" ? (
                    <span className="text-[11px] text-muted">
                      Puedes mantener tu peso exacto
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {objetivo === "recomposicion" ? (
              <p className="rounded-xl border border-accent/20 bg-accent-soft/30 p-3 text-xs text-muted leading-relaxed">
                💡 <strong>Ganar músculo y perder grasa</strong>: No te preocupes por ver menos kilos en la báscula. Tu peso puede quedarse igual que hoy porque el músculo pesa más y ocupa menos volumen que la grasa.
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink">
                {quiereSubir ? "Ritmo de subida" : "Ritmo"}
              </span>
              <ChoiceList
                label="Ritmo"
                valor={ritmo}
                onChange={setRitmo}
                opciones={ritmosPara(objetivo).map((r) => ({
                  valor: String(r.valor),
                  etiqueta: r.etiqueta,
                  ayuda: r.ayuda,
                }))}
              />
            </div>
          </>
        ) : null}

        {paso === 4 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl text-ink">Cuánto te mueves</h1>
              <p className="text-base text-muted">
                Cuenta el ejercicio de una semana normal, no la mejor. Si te pasas, el plan sale
                alto y no bajarás.
              </p>
            </div>
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
          </>
        ) : null}

        {paso === 5 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl text-ink">Tus metas del día</h1>
              <p className="text-base text-muted">
                La botella y los pasos que verás en la pantalla de Hoy. Los que salen son los que
                te tocan; si los cambias con los botones, los tuyos mandan. Recuerda que puedes
                cambiarlos después en Ajustes.
              </p>
            </div>
            <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <GlassWater aria-hidden="true" className="text-accent" size={18} />
                Agua
              </h2>
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg text-ink">{conComaSinCeros(aguaActual)} L al día</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Quitar cuarto de litro al agua"
                    disabled={aguaActual <= 0.5}
                    onClick={() => cambiarAgua(-0.25)}
                  >
                    −0,25
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Añadir cuarto de litro al agua"
                    onClick={() => cambiarAgua(0.25)}
                  >
                    +0,25
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted">
                Para tu peso ({conComa(pesoNum)}) y tu objetivo te tocan{" "}
                {conComaSinCeros(aguaRecomendadaL(pesoNum, objetivo))} L.
              </p>
            </section>
            <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Footprints aria-hidden="true" className="text-accent" size={18} />
                Pasos
              </h2>
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg text-ink">{conMiles(pasosActuales)} pasos al día</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Quitar 500 pasos"
                    disabled={pasosActuales <= 2000}
                    onClick={() => cambiarPasos(-500)}
                  >
                    −500
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Añadir 500 pasos"
                    onClick={() => cambiarPasos(500)}
                  >
                    +500
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted">Por lo que dijiste de moverte, te salen estos.</p>
            </section>
          </>
        ) : null}

        {paso === 6 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl text-ink">Tus hábitos</h1>
              <p className="text-base text-muted">
                ¿Qué hábitos saludables quieres implantar? Los marcas en la pantalla de Hoy con
                un toque. Vienen cinco marcados para empezar: quita los que no quieras o pulsa
                «Ninguno». Si el tuyo no está en la lista, escríbelo.
              </p>
            </div>
            <ElegirHabitos
              activos={habitosActivos}
              propios={habitosPropios}
              onCambiar={(nuevos, nuevosPropios) => {
                setHabitosActivos(nuevos);
                setHabitosPropios(nuevosPropios);
              }}
            />
          </>
        ) : null}

        {paso === 7 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-xl text-ink">Lo que no te gusta</h1>
              <p className="text-base text-muted">
                Esto es para el plan de comidas: no te voy a proponer platos que no te gusten.
                Puedes cambiarlo cuando quieras.
              </p>
            </div>
            <ChoiceList
              label="Alimentación"
              valor={dieta}
              onChange={setDieta}
              opciones={DIETAS}
            />
            <ListaRoja
              marcados={noLeGustan}
              onCambiar={setNoLeGustan}
              descripcion="Marca los ingredientes que nunca quieres que aparezcan en tu plan. Puedes dejarlo vacío y cambiarlo cuando quieras."
            />
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <Flame size={16} aria-hidden="true" className="text-accent" />
                Tu plan, con estos datos
              </span>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-sm text-muted">Gastas al día</dt>
                  <dd className="text-lg text-ink">{Math.round(gasto)} kcal</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Comerás al día</dt>
                  <dd className="text-lg font-bold text-accent">{kcal} kcal</dd>
                </div>
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
                  <dt className="text-sm text-muted">
                    {quiereSubir
                      ? "Subes por semana"
                      : objetivo === "mantener"
                        ? "Ritmo"
                        : "Bajas por semana"}
                  </dt>
                  <dd className="text-base text-ink">{conComa(Number(ritmo), 2)} kg</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Agua</dt>
                  <dd className="text-base text-ink">{conComaSinCeros(aguaActual)} L al día</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Pasos</dt>
                  <dd className="text-base text-ink">{conMiles(pasosActuales)} al día</dd>
                </div>
              </dl>
              {kcal <= KCAL_MINIMAS ? (
                <p className="rounded-md bg-accent-soft/40 px-3 py-2 text-xs text-ink">
                  Tu plan se queda en el suelo seguro de {KCAL_MINIMAS} kcal al día: comer por
                  debajo no es saludable aunque busques ir más rápido.
                </p>
              ) : null}
              <p className="text-sm text-muted">
                Esta cifra es una estimación de partida. En cuanto te peses unos días, la app
                ajusta el plan con lo que de verdad pierdes.
              </p>
            </div>
          </>
        ) : null}
      </main>

      <footer className="sticky bottom-0 flex gap-3 bg-bg pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-3">
        {paso > 0 ? (
          <Button variant="secondary" size="lg" onClick={() => setPaso((p) => p - 1)}>
            Atrás
          </Button>
        ) : null}
        {paso < TOTAL_PASOS - 1 ? (
          <Button
            size="lg"
            className="flex-1"
            disabled={!puedeSeguir}
            onClick={() => setPaso((p) => p + 1)}
          >
            {paso === 0 ? "Empezamos" : "Siguiente"}
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              aceptarPrivacidad();
              terminar();
              onEmpezar();
            }}
          >
            Empezar
          </Button>
        )}
      </footer>
    </div>
  );
}

/** Pantalla de espera mientras se leen los datos del móvil.
 * Estilo esqueleto reactivo para evitar pantallas en blanco (Vídeo 6). */
export function Cargando() {
  return (
    <div
      className="flex min-h-dvh flex-col gap-4 px-5 pb-10 pt-7 bg-bg animate-pulse"
      aria-hidden="true"
      role="status"
      aria-label="Cargando..."
    >
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded-lg bg-surface border border-border/40" />
        <div className="h-7 w-16 rounded-full bg-surface border border-border/40" />
      </div>
      <div className="h-44 w-full rounded-2xl border border-border/70 bg-surface p-4 flex flex-col justify-between">
        <div className="h-4 w-28 rounded bg-border/60" />
        <div className="h-20 w-full rounded-xl bg-bg/50 border border-border/30" />
        <div className="h-3 w-40 rounded bg-border/40" />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="h-3.5 w-24 rounded bg-border/50" />
        <div className="h-16 w-full rounded-xl border border-border/70 bg-surface" />
        <div className="h-16 w-full rounded-xl border border-border/70 bg-surface" />
        <div className="h-16 w-full rounded-xl border border-border/70 bg-surface" />
      </div>
    </div>
  );
}
