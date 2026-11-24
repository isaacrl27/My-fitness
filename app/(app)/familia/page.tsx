"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Copy,
  Check,
  Plus,
  Trash2,
  Flame,
  CheckCircle2,
  MessageCircle,
  LogOut,
  Target,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Home,
  UserPlus,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP } from "@/components/ui/input-otp";
import { TextField } from "@/components/ui/field";
import { Confirmar } from "@/components/ui/confirmar";
import {
  AVATARES_DISPONIBLES,
  calcularHabitosGrupo,
  META_HABITOS_SEMANA_DEFECTO,
  obtenerMetaHabitosGrupo,
  progresoMetaGrupo,
  type TipoReaccion,
} from "@/lib/social";
import { useFamilia } from "@/lib/use-familia";
import { useDatos } from "@/lib/store";
import { Cargando } from "@/components/app/onboarding";
import { useBloqueoModal } from "@/lib/use-modal";
import { mostrarTostada } from "@/lib/tostada";
import { lanzarReaccion } from "@/lib/reacciones";

const BASICOS_SUPERMERCADO = [
  { nombre: "Leche", icono: "🥛", cant: "2 bricks" },
  { nombre: "Huevos", icono: "🥚", cant: "1 docena" },
  { nombre: "Plátanos", icono: "🍌", cant: "1 kg" },
  { nombre: "Pechuga de pollo", icono: "🍗", cant: "500 g" },
  { nombre: "Pan integral", icono: "🍞", cant: "1 barra" },
  { nombre: "Arroz", icono: "🍚", cant: "1 paquete" },
  { nombre: "Patatas", icono: "🥔", cant: "1 bolsa" },
  { nombre: "Manzanas", icono: "🍎", cant: "1 kg" },
  { nombre: "Aceite de oliva", icono: "🫒", cant: "1 botella" },
  { nombre: "Atún al natural", icono: "🐟", cant: "1 pack" },
];

export default function PaginaFamilia() {
  const { listo, perfil } = useDatos();
  const {
    grupos,
    grupoActivo,
    seleccionarGrupo,
    cargando,
    cargandoHogar,
    error,
    miCodigo,
    miAvatar,
    cambiarMiAvatar,
    crearGrupo,
    unirseGrupo,
    refrescar,
    chocarCinco,
    salirGrupo,
    compraHogar,
    crearHogar,
    unirseHogar,
    salirHogar,
    anadirProductoHogar,
    alternarProductoHogar,
    borrarProductoHogar,
    limpiarCompradosHogar,
    refrescarHogar,
  } = useFamilia();

  // Pestaña principal: "social" (Grupos de Motivación) vs "compra" (Compra del Hogar)
  const [pestanaPrincipal, setPestanaPrincipal] = useState<"social" | "compra">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("unirseHogar")) return "compra";
    }
    return "social";
  });

  // Auto-vinculación mágica desde enlaces de WhatsApp
  useEffect(() => {
    if (typeof window === "undefined" || !listo || !perfil) return;
    const params = new URLSearchParams(window.location.search);
    const codGrupo = params.get("unirseGrupo");
    const codHogar = params.get("unirseHogar");

    if (codHogar) {
      window.history.replaceState({}, "", "/familia");
      void unirseHogar(codHogar);
    } else if (codGrupo) {
      window.history.replaceState({}, "", "/familia");
      void unirseGrupo(codGrupo, "🥑");
    }
  }, [listo, perfil, unirseGrupo, unirseHogar]);

  // Estados para Retos en Grupo
  const [modoGrupo, setModoGrupo] = useState<"unirse" | "crear">("unirse");
  const [codigoGrupoInput, setCodigoGrupoInput] = useState("");
  const [nombreGrupoInput, setNombreGrupoInput] = useState("");
  const metaHabitosInput = String(META_HABITOS_SEMANA_DEFECTO);
  const [avatarElegido, setAvatarElegido] = useState(miAvatar || "🥑");

  // Estado para modal selector de avatar en el grupo
  const [miembroParaAvatar, setMiembroParaAvatar] = useState<{
    codigo: string;
    nombre: string;
    avatar: string;
    esYo: boolean;
  } | null>(null);
  useBloqueoModal({
    abierto: miembroParaAvatar !== null,
    onCerrar: () => setMiembroParaAvatar(null),
  });
  const [mostrarModalNuevoGrupo, setMostrarModalNuevoGrupo] = useState(false);
  const [confirmarSalirGrupo, setConfirmarSalirGrupo] = useState(false);
  const [chocados, setChocados] = useState<Record<string, boolean>>({});
  const [copiadoGrupo, setCopiadoGrupo] = useState(false);

  // Estados para Compra del Hogar
  const [modoHogar, setModoHogar] = useState<"unirse" | "crear">("crear");
  const [codigoHogarInput, setCodigoHogarInput] = useState("");
  const [nombreHogarInput, setNombreHogarInput] = useState("Compra de Casa");
  const [mostrarModalConectarHogar, setMostrarModalConectarHogar] = useState(false);
  const [confirmarSalirHogar, setConfirmarSalirHogar] = useState(false);
  const [copiadoHogar, setCopiadoHogar] = useState(false);
  const [productoTexto, setProductoTexto] = useState("");
  const [productoCantidad, setProductoCantidad] = useState("");

  if (!listo || !perfil) return <Cargando />;

  // Copiar código del grupo
  const copiarCodigoGrupo = () => {
    if (!grupoActivo?.codigo) return;
    try {
      void navigator.clipboard.writeText(grupoActivo.codigo);
      setCopiadoGrupo(true);
      setTimeout(() => setCopiadoGrupo(false), 2000);
    } catch {}
  };

  // Copiar código de compra del hogar
  const copiarCodigoHogar = () => {
    if (!compraHogar?.codigo) return;
    try {
      void navigator.clipboard.writeText(compraHogar.codigo);
      setCopiadoHogar(true);
      setTimeout(() => setCopiadoHogar(false), 2000);
    } catch {}
  };

  const origenUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com");

  const enlaceWhatsappGrupo = grupoActivo?.codigo
    ? `https://wa.me/?text=${encodeURIComponent(
        `¡Únete a nuestro grupo «${grupoActivo.nombre}» en My Fitness tocando este enlace directo:\n${origenUrl}/familia?unirseGrupo=${grupoActivo.codigo}`
      )}`
    : "#";

  const enlaceWhatsappHogar = compraHogar?.codigo
    ? `https://wa.me/?text=${encodeURIComponent(
        `¡Toca este enlace para entrar directo a la lista de la compra de «${compraHogar.nombre}»!\n${origenUrl}/familia?unirseHogar=${compraHogar.codigo}`
      )}`
    : "#";

  return (
    <div className="flex flex-col gap-5 px-5 pb-16 pt-8">
      {/* Selector Superior: Grupos de Motivación vs Compra del Hogar */}
      <div className="flex rounded-pill border border-border bg-surface p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setPestanaPrincipal("social")}
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-bold transition duration-150 ease-app",
            pestanaPrincipal === "social"
              ? "bg-accent-soft text-accent shadow-xs"
              : "text-muted hover:text-ink",
          ].join(" ")}
        >
          <Users size={16} />
          <span>Retos en Grupo</span>
          {grupos.length > 0 ? (
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent font-mono">
              {grupos.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setPestanaPrincipal("compra")}
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-bold transition duration-150 ease-app",
            pestanaPrincipal === "compra"
              ? "bg-accent-soft text-accent shadow-xs"
              : "text-muted hover:text-ink",
          ].join(" ")}
        >
          <ShoppingBag size={16} />
          <span>Compra de Casa</span>
          {compraHogar && compraHogar.items.filter((i) => !i.comprado).length > 0 ? (
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent font-mono">
              {compraHogar.items.filter((i) => !i.comprado).length}
            </span>
          ) : null}
        </button>
      </div>

      {/* =================================================================== */}
      {/* SECCIÓN 1: GRUPOS SOCIALES (MOTIVACIÓN MULTI-GRUPO)                 */}
      {/* =================================================================== */}
      {pestanaPrincipal === "social" && (
        <div className="flex flex-col gap-5">
          {/* Cabecera general */}
          <header className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Comunidad y Motivación</p>
            <h1 className="text-xl font-bold text-ink">Equipos y Amigos</h1>
            <p className="text-xs text-muted leading-relaxed">
              Animaos juntos cada día sin enseñar vuestro peso. Puedes estar en varios grupos
              a la vez (familia, gimnasio, pareja) y tus hábitos diarios sumarán en todos.
            </p>
          </header>

          {/* Selector de grupos existentes (Pills horizontales) */}
          {grupos.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {grupos.map((g) => {
                const esActivo = g.codigo === grupoActivo?.codigo;
                return (
                  <button
                    key={g.codigo}
                    type="button"
                    onClick={() => seleccionarGrupo(g.codigo)}
                    className={[
                      "flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold whitespace-nowrap transition duration-150 ease-app shrink-0 border",
                      esActivo
                        ? "border-accent bg-accent-soft text-accent shadow-2xs scale-102"
                        : "border-border bg-surface text-muted hover:text-ink hover:border-border-input",
                    ].join(" ")}
                  >
                    <span>{g.miembros[0]?.avatar || "🥑"}</span>
                    <span>{g.nombre}</span>
                    <span className="text-[10px] opacity-75">({g.miembros.length})</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setMostrarModalNuevoGrupo(true)}
                className="flex items-center gap-1 rounded-pill border border-dashed border-border bg-surface/50 px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-accent hover:border-accent transition shrink-0"
              >
                <Plus size={13} />
                <span>Otro grupo</span>
              </button>
            </div>
          ) : null}

          {/* Si no tiene grupos o abrió el modal de nuevo grupo */}
          {grupos.length === 0 || mostrarModalNuevoGrupo ? (
            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">
                  {grupos.length === 0 ? "Únete o crea tu primer grupo" : "Añadir otro grupo"}
                </h2>
                {grupos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setMostrarModalNuevoGrupo(false)}
                    className="text-xs font-medium text-muted hover:text-ink"
                  >
                    Cerrar
                  </button>
                ) : null}
              </div>

              <div className="flex rounded-pill border border-border bg-bg p-1">
                <button
                  type="button"
                  onClick={() => setModoGrupo("unirse")}
                  className={[
                    "flex-1 rounded-pill py-1.5 text-xs font-semibold transition duration-150 ease-app",
                    modoGrupo === "unirse" ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  Unirme con código
                </button>
                <button
                  type="button"
                  onClick={() => setModoGrupo("crear")}
                  className={[
                    "flex-1 rounded-pill py-1.5 text-xs font-semibold transition duration-150 ease-app",
                    modoGrupo === "crear" ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  Crear nuevo grupo
                </button>
              </div>

              {modoGrupo === "unirse" ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">
                      Código de invitación del grupo (ej. FAM-842)
                    </label>
                    <InputOTP
                      longitud={6}
                      tipo="alfanumerico"
                      separadorEn={3}
                      valor={codigoGrupoInput.replace(/[^A-Za-z0-9]/g, "")}
                      onChange={(v: string) => setCodigoGrupoInput(v)}
                      error={Boolean(error)}
                      autoFocus
                    />
                    <p className="text-[11px] text-muted">
                      Teclea las 6 letras/números del grupo (ej. FAM842).
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink">Elige tu avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATARES_DISPONIBLES.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setAvatarElegido(av)}
                          className={[
                            "flex h-9 w-9 items-center justify-center rounded-xl border text-base transition duration-150 ease-app",
                            avatarElegido === av
                              ? "border-accent bg-accent-soft shadow-xs scale-105"
                              : "border-border bg-bg hover:border-border-input",
                          ].join(" ")}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                  {error ? <p role="alert" className="text-xs font-medium text-danger">{error}</p> : null}
                  <Button
                    size="lg"
                    disabled={cargando || codigoGrupoInput.trim().length < 3}
                    onClick={async () => {
                      const ok = await unirseGrupo(codigoGrupoInput, avatarElegido);
                      if (ok) {
                        setMostrarModalNuevoGrupo(false);
                        setCodigoGrupoInput("");
                      }
                    }}
                  >
                    {cargando ? "Uniéndome…" : "Unirme al grupo"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <TextField
                    label="Nombre del grupo"
                    placeholder="Ej. Los Serrano, Amigos del Gym, Pareja..."
                    value={nombreGrupoInput}
                    onChange={(e) => setNombreGrupoInput(e.target.value)}
                    autoFocus
                  />
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink">Elige el avatar del equipo</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATARES_DISPONIBLES.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setAvatarElegido(av)}
                          className={[
                            "flex h-9 w-9 items-center justify-center rounded-xl border text-base transition duration-150 ease-app",
                            avatarElegido === av
                              ? "border-accent bg-accent-soft shadow-xs scale-105"
                              : "border-border bg-bg hover:border-border-input",
                          ].join(" ")}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                  {error ? <p role="alert" className="text-xs font-medium text-danger">{error}</p> : null}
                  <Button
                    size="lg"
                    disabled={cargando || nombreGrupoInput.trim().length < 3}
                    onClick={async () => {
                      const ok = await crearGrupo(
                        nombreGrupoInput,
                        Number(metaHabitosInput) || META_HABITOS_SEMANA_DEFECTO,
                        avatarElegido
                      );
                      if (ok) {
                        setMostrarModalNuevoGrupo(false);
                        setNombreGrupoInput("");
                      }
                    }}
                  >
                    {cargando ? "Creando grupo…" : "Crear mi grupo"}
                  </Button>
                </div>
              )}
            </section>
          ) : null}

          {/* VISTA DEL GRUPO ACTIVO */}
          {grupoActivo && !mostrarModalNuevoGrupo && (
            <div className="flex flex-col gap-4">
              {/* Tarjeta de cabecera con código y opciones */}
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Equipo activo</span>
                    <h2 className="text-lg font-bold text-ink">{grupoActivo.nombre}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmarSalirGrupo(true)}
                    className="text-xs text-muted hover:text-danger h-8"
                  >
                    <LogOut size={13} className="mr-1" />
                    Salir
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex flex-1 items-center gap-1.5">
                    <span className="text-xs text-muted">Código:</span>
                    <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs font-bold text-accent">
                      {grupoActivo.codigo}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="secondary" onClick={copiarCodigoGrupo} className="h-8 text-xs">
                      {copiadoGrupo ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                      {copiadoGrupo ? "Copiado" : "Copiar"}
                    </Button>
                    <a
                      href={enlaceWhatsappGrupo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition duration-150 ease-app hover:bg-emerald-500/20 active:scale-95 shadow-2xs"
                    >
                      <MessageCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Meta semanal del equipo estilo Duolingo */}
              {(() => {
                const habitosSemana = calcularHabitosGrupo(grupoActivo.miembros);
                const metaHabitos = obtenerMetaHabitosGrupo(grupoActivo);
                const progreso = progresoMetaGrupo(habitosSemana, metaHabitos);

                return (
                  <section className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                          <Target size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-ink">Meta semanal de hábitos</h3>
                          <p className="text-xs text-muted">
                            Objetivo conjunto: {metaHabitos} hábitos saludables
                          </p>
                        </div>
                      </div>
                      <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                        {progreso}%
                      </span>
                    </div>

                    <div className="h-3.5 w-full overflow-hidden rounded-pill bg-border/60">
                      <div
                        className="h-full rounded-pill bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>

                    <div className="flex items-baseline justify-between pt-0.5">
                      <p className="text-xs font-semibold text-ink">
                        {habitosSemana} de {metaHabitos} hábitos{" "}
                        <span className="font-normal text-muted">completados juntos</span>
                      </p>
                      {progreso >= 100 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                          <Sparkles size={13} /> ¡Meta conseguida!
                        </span>
                      ) : (
                        <span className="text-xs text-muted">
                          Faltan {Math.max(0, metaHabitos - habitosSemana)}
                        </span>
                      )}
                    </div>
                  </section>
                );
              })()}

              {/* Miembros del equipo */}
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">
                    Miembros ({grupoActivo.miembros.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => void refrescar()}
                    disabled={cargando}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition active:scale-95"
                  >
                    <RefreshCw size={12} className={cargando ? "animate-spin text-accent" : ""} />
                    Actualizar
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {grupoActivo.miembros.map((m) => {
                    const esYo = m.codigo === miCodigo;
                    const puedeCambiarAvatar = esYo;
                    const avatarAMostrar = esYo ? (m.avatar && m.avatar !== "🌱" ? m.avatar : miAvatar || m.avatar || "🌱") : (m.avatar || "🌱");

                    return (
                      <article
                        key={m.codigo}
                        className={[
                          "flex items-center justify-between rounded-xl border p-3 transition duration-150 ease-app",
                          esYo ? "border-accent/40 bg-accent-soft/30" : "border-border bg-surface",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          {puedeCambiarAvatar ? (
                            <button
                              type="button"
                              onClick={() =>
                                setMiembroParaAvatar({
                                  codigo: m.codigo,
                                  nombre: m.nombre,
                                  avatar: avatarAMostrar,
                                  esYo: true,
                                })
                              }
                              className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-surface text-2xl transition hover:scale-105 hover:border-accent active:scale-95"
                              title="Toca para cambiar tu emoticono"
                              aria-label="Cambiar mi emoticono"
                            >
                              <span aria-hidden="true">{avatarAMostrar}</span>
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-on-accent shadow-xs">
                                ✎
                              </span>
                            </button>
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl" aria-hidden="true">
                              {avatarAMostrar}
                            </span>
                          )}
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                              {m.nombre}
                              {esYo ? (
                                <span className="rounded-pill bg-accent px-1.5 py-0.5 text-[9px] font-bold text-on-accent">
                                  Tú
                                </span>
                              ) : null}
                            </span>
                            <div className="flex items-center gap-2 pt-0.5 text-xs text-muted">
                              <span className="inline-flex items-center gap-1 text-accent font-semibold">
                                <Flame size={12} /> {m.racha} d
                              </span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-muted" /> {m.habitosHoy}/{m.habitosTotal} hoy
                              </span>
                            </div>
                          </div>
                        </div>

                        {esYo ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setMiembroParaAvatar({
                                  codigo: m.codigo,
                                  nombre: m.nombre,
                                  avatar: avatarAMostrar,
                                  esYo: true,
                                })
                              }
                              className="h-8 gap-1.5 px-2.5 text-xs font-semibold hover:border-accent hover:bg-accent-soft active:scale-95"
                              title="Cambiar tu emoticono en el grupo"
                            >
                              <span className="text-sm" aria-hidden="true">{avatarAMostrar}</span>
                              <span>Cambiar</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.habitosHoy > 0 && (
                              <button
                                type="button"
                                aria-label={`Enviar ánimos a ${m.nombre}`}
                                title={`Enviar ánimos a ${m.nombre}`}
                                onClick={(e) => {
                                  void chocarCinco(m.codigo, grupoActivo.codigo, "animo");
                                  mostrarTostada(`¡Ánimos enviados al móvil de ${m.nombre}! 🔔`, "👋", 2600);
                                  lanzarReaccion("👋", e, 6);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-sm transition hover:border-accent hover:bg-accent-soft active:scale-90"
                              >
                                👋
                              </button>
                            )}
                            <Button
                              size="sm"
                              variant={chocados[m.codigo] ? "primary" : "secondary"}
                              className={[
                                "h-8 px-2.5 text-xs transition-all active:scale-90",
                                chocados[m.codigo]
                                  ? "border border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold scale-105"
                                  : "",
                              ].join(" ")}
                              onClick={() => {
                                const tipoReaccion: TipoReaccion =
                                  m.habitosHoy >= m.habitosTotal && m.habitosTotal > 0
                                    ? "fuego"
                                    : m.habitosHoy === 0
                                      ? "animo"
                                      : "cinco";

                                setChocados((prev) => ({ ...prev, [m.codigo]: true }));
                                setTimeout(() => {
                                  setChocados((prev) => ({ ...prev, [m.codigo]: false }));
                                }, 2500);

                                void chocarCinco(m.codigo, grupoActivo.codigo, tipoReaccion);
                                const icono = tipoReaccion === "animo" ? "👋" : tipoReaccion === "fuego" ? "🔥" : "✋";
                                mostrarTostada(`¡Notificación enviada al móvil de ${m.nombre}! 🔔`, icono, 2600);
                              }}
                            >
                              {chocados[m.codigo]
                                ? "🔔 ¡Avisado!"
                                : m.habitosHoy >= m.habitosTotal && m.habitosTotal > 0
                                  ? "🔥 ¡Pleno!"
                                  : m.habitosHoy === 0
                                    ? "👋 Dar ánimo"
                                    : "✋ Chocar"}
                            </Button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Actividad reciente de choques */}
              {grupoActivo.reacciones.length > 0 ? (
                <section className="rounded-xl border border-border/70 bg-surface/60 p-3">
                  <p className="text-[11px] font-semibold text-muted mb-1">Actividad reciente</p>
                  <div className="flex flex-col gap-1 text-xs text-ink">
                    {grupoActivo.reacciones.slice(0, 3).map((r) => (
                      <p key={r.id} className="inline-flex items-center gap-1.5">
                        <span>✋</span>
                        <span>
                          <strong>{r.deNombre}</strong> chocó los cinco. ¡A tope!
                        </span>
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SECCIÓN 2: COMPRA COMPARTIDA DEL HOGAR (DESPENSA INDEPENDIENTE)     */}
      {/* =================================================================== */}
      {pestanaPrincipal === "compra" && (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Despensa y Nevera</p>
            <h1 className="flex items-center gap-2 text-xl font-bold text-ink">
              <ShoppingBag size={22} className="text-accent" />
              Compra del Hogar
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              Lleva la lista de la compra al día y compártela en tiempo real únicamente con las personas
              con las que compartes cocina y nevera (tu madre, tu pareja o compañeros de piso).
            </p>
          </header>

          {/* Tarjeta de vinculación con el hogar */}
          {!compraHogar?.codigo ? (
            <section className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Home size={18} className="text-accent" />
                <h2 className="text-sm font-bold text-ink">Comparte la nevera de casa</h2>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Actualmente tienes tu lista guardada en el móvil. Vincúlala con un código de casa para
                que lo que tú o tu familia tachéis en el supermercado se actualice al segundo.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => {
                    setModoHogar("crear");
                    setMostrarModalConectarHogar(true);
                  }}
                  className="h-8 text-xs"
                >
                  <Plus size={13} className="mr-1" />
                  Crear código de casa
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setModoHogar("unirse");
                    setMostrarModalConectarHogar(true);
                  }}
                  className="h-8 text-xs"
                >
                  <UserPlus size={13} className="mr-1" />
                  Unirme a una casa
                </Button>
              </div>
            </section>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏡</span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">{compraHogar.nombre}</h2>
                    <p className="text-[11px] text-muted">
                      {compraHogar.miembros.length > 0
                        ? `${compraHogar.miembros.length} personas conectadas`
                        : "Compartida en la nube"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmarSalirHogar(true)}
                  className="text-xs text-muted hover:text-danger h-8"
                >
                  <LogOut size={13} className="mr-1" />
                  Salir de la lista
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex flex-1 items-center gap-1.5">
                  <span className="text-xs text-muted">Código:</span>
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs font-bold text-accent">
                    {compraHogar.codigo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" onClick={copiarCodigoHogar} className="h-8 text-xs">
                    {copiadoHogar ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                    {copiadoHogar ? "Copiado" : "Copiar"}
                  </Button>
                  <a
                    href={enlaceWhatsappHogar}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition duration-150 ease-app hover:bg-emerald-500/20 active:scale-95 shadow-2xs"
                  >
                    <MessageCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Modal / formulario para conectar hogar */}
          {mostrarModalConectarHogar && (
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">
                  {modoHogar === "crear" ? "Crear lista compartida de casa" : "Unirme a una lista de casa"}
                </h3>
                <button
                  type="button"
                  onClick={() => setMostrarModalConectarHogar(false)}
                  className="text-xs font-medium text-muted hover:text-ink"
                >
                  Cancelar
                </button>
              </div>

              {modoHogar === "crear" ? (
                <div className="flex flex-col gap-3">
                  <TextField
                    label="Nombre de tu casa"
                    placeholder="Ej. Casa Isaac, Piso Centro..."
                    value={nombreHogarInput}
                    onChange={(e) => setNombreHogarInput(e.target.value)}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    disabled={cargandoHogar || !nombreHogarInput.trim()}
                    onClick={async () => {
                      const ok = await crearHogar(nombreHogarInput);
                      if (ok) setMostrarModalConectarHogar(false);
                    }}
                  >
                    {cargandoHogar ? "Creando…" : "Crear código y compartir"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ink">Código de la casa (ej. HOG842)</label>
                    <InputOTP
                      longitud={6}
                      tipo="alfanumerico"
                      separadorEn={3}
                      valor={codigoHogarInput.replace(/[^A-Za-z0-9]/g, "")}
                      onChange={(v: string) => setCodigoHogarInput(v)}
                      onCompleto={(v: string) => void unirseHogar(v)}
                      autoFocus
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={cargandoHogar || codigoHogarInput.trim().length < 3}
                    onClick={async () => {
                      const ok = await unirseHogar(codigoHogarInput);
                      if (ok) setMostrarModalConectarHogar(false);
                    }}
                  >
                    {cargandoHogar ? "Uniéndome…" : "Unirme a la lista"}
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Atajos de 1 toque: básicos del supermercado de casa */}
          <section className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted">Básicos del súper (1 toque)</span>
            <div className="flex flex-wrap gap-1.5">
              {BASICOS_SUPERMERCADO.map((b) => (
                <button
                  key={b.nombre}
                  type="button"
                  onClick={() => void anadirProductoHogar(b.nombre, b.cant)}
                  className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:border-accent hover:bg-accent-soft/40 transition active:scale-95"
                >
                  <span>{b.icono}</span>
                  <span>{b.nombre}</span>
                  <Plus size={11} className="text-muted" />
                </button>
              ))}
            </div>
          </section>

          {/* Formulario para añadir producto manual */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!productoTexto.trim()) return;
              void anadirProductoHogar(productoTexto, productoCantidad || "1");
              setProductoTexto("");
              setProductoCantidad("");
            }}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Añadir producto (ej. manzanas, avena...)"
                value={productoTexto}
                onChange={(e) => setProductoTexto(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <input
                type="text"
                placeholder="Cant."
                value={productoCantidad}
                onChange={(e) => setProductoCantidad(e.target.value)}
                className="w-16 rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-ink text-center placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <Button size="sm" type="submit" disabled={!productoTexto.trim()} className="h-8.5 px-3 text-xs">
                <Plus size={14} className="mr-0.5" />
                Añadir
              </Button>
            </div>
          </form>

          {/* Lista de productos pendientes */}
          {(() => {
            const items = compraHogar?.items ?? [];
            const pendientes = items.filter((i) => !i.comprado);
            const comprados = items.filter((i) => i.comprado);

            return (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">
                    Por comprar ({pendientes.length})
                  </h3>
                  {compraHogar?.codigo ? (
                    <button
                      type="button"
                      onClick={() => void refrescarHogar()}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink transition"
                    >
                      <RefreshCw size={11} /> Actualizar
                    </button>
                  ) : null}
                </div>

                {pendientes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                    No hay productos pendientes. Toca un básico de arriba o escribe lo que falte.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border/60 rounded-xl border border-border bg-surface">
                    {pendientes.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between px-3.5 py-2.5 gap-2 transition hover:bg-bg/50"
                      >
                        <button
                          type="button"
                          onClick={() => void alternarProductoHogar(item.id)}
                          className="flex flex-1 items-center gap-2.5 text-left"
                        >
                          <Square size={17} className="text-muted shrink-0" />
                          <span className="text-xs font-semibold text-ink leading-tight">{item.nombre}</span>
                          {item.cantidad ? (
                            <span className="rounded-md bg-bg px-1.5 py-0.5 text-[10px] font-medium text-muted">
                              {item.cantidad}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => void borrarProductoHogar(item.id)}
                          className="p-1 text-muted hover:text-danger transition"
                          aria-label={`Eliminar ${item.nombre}`}
                          title="Eliminar"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Ya comprados en el súper */}
                {comprados.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">
                        Ya comprados ({comprados.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => void limpiarCompradosHogar()}
                        className="text-[11px] font-medium text-muted hover:text-danger transition"
                      >
                        Limpiar lista
                      </button>
                    </div>

                    <ul className="flex flex-col divide-y divide-border/40 rounded-xl border border-border/70 bg-surface/60 opacity-80">
                      {comprados.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between px-3.5 py-2 gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => void alternarProductoHogar(item.id)}
                            className="flex flex-1 items-center gap-2.5 text-left"
                          >
                            <CheckSquare size={16} className="text-accent shrink-0" />
                            <span className="text-xs text-muted line-through">{item.nombre}</span>
                            {item.compradoPor ? (
                              <span className="text-[10px] text-accent/80 italic">
                                ({item.compradoPor})
                              </span>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => void borrarProductoHogar(item.id)}
                            className="p-1 text-muted/60 hover:text-danger transition"
                            aria-label={`Eliminar ${item.nombre}`}
                            title="Eliminar"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })()}
        </div>
      )}

      {/* MODAL SELECTOR DE AVATAR */}
      {miembroParaAvatar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-selector-avatar"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setMiembroParaAvatar(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3">
              <div className="flex flex-col">
                <h3 id="titulo-selector-avatar" className="text-base font-bold text-ink">
                  Elige tu emoticono
                </h3>
                <p className="text-xs text-muted">
                  Así te verán tus familiares y amigos en el grupo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMiembroParaAvatar(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-muted hover:text-ink transition"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5 py-4">
              {AVATARES_DISPONIBLES.map((av) => {
                const seleccionado = (miembroParaAvatar.avatar || "🌱") === av;
                return (
                  <button
                    key={av}
                    type="button"
                    onClick={async () => {
                      setMiembroParaAvatar(null);
                      await cambiarMiAvatar(av);
                      mostrarTostada(`¡Emoticono cambiado a ${av}!`, av, 2600);
                    }}
                    className={[
                      "relative flex h-14 w-full flex-col items-center justify-center rounded-2xl border text-2xl transition duration-150 ease-app active:scale-90",
                      seleccionado
                        ? "border-accent bg-accent-soft shadow-xs scale-105"
                        : "border-border bg-bg hover:border-accent/40 hover:bg-surface",
                    ].join(" ")}
                  >
                    <span>{av}</span>
                    {seleccionado && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-on-accent font-bold shadow-xs">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setMiembroParaAvatar(null)}
            >
              Listo
            </Button>
          </div>
        </div>
      )}

      {/* MODALES DE CONFIRMACIÓN */}
      {confirmarSalirGrupo && (
        <Confirmar
          abierto={confirmarSalirGrupo}
          onCancelar={() => setConfirmarSalirGrupo(false)}
          onConfirmar={() => {
            void salirGrupo();
            setConfirmarSalirGrupo(false);
          }}
          titulo="¿Salir del grupo?"
          cuerpo="Tus hábitos seguirán guardados en tu perfil, pero dejarás de sumar a la meta colectiva de este grupo."
          confirmar="Salir del grupo"
          cancelar="Cancelar"
          peligro
        />
      )}

      {confirmarSalirHogar && (
        <Confirmar
          abierto={confirmarSalirHogar}
          onCancelar={() => setConfirmarSalirHogar(false)}
          onConfirmar={() => {
            void salirHogar();
            setConfirmarSalirHogar(false);
          }}
          titulo="¿Salir de la lista la compra de casa?"
          cuerpo="Dejarás de compartir la lista de la compra con este hogar. Tus productos actuales se mantendrán en tu lista personal."
          confirmar="Salir de la lista"
          cancelar="Cancelar"
          peligro
        />
      )}
    </div>
  );
}
