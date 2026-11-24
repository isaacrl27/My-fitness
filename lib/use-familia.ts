"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  CLAVE_LOCAL_GRUPO,
  CLAVE_LOCAL_GRUPOS,
  CLAVE_LOCAL_GRUPO_ACTIVO,
  CLAVE_LOCAL_COMPRA_HOGAR,
  CLAVE_LOCAL_MI_AVATAR,
  normalizarCodigoGrupo,
  normalizarCodigoHogar,
  migrarGruposLocales,
  contarMisHabitosSemana,
  codigoDeMiembro,
  baseDeMiembro,
  type GrupoFamiliar,
  type CompraHogar,
  type ItemCompraFamiliar,
  type TipoReaccion,
} from "./social";
import { useDatos } from "./store";
import { hoyISO } from "./calculos";
import { diasConActividad, rachaActual } from "./racha";
import { HABITOS_INICIALES } from "./habitos";
import { sonidoCelebracion, sonidoCheck, sonidoExito, sonidoTap } from "./sonido";
import { vibrarCheck, vibrarExito, vibrarTap } from "./haptica";
import { mostrarTostada } from "./tostada";

export function useFamilia() {
  const { listo, perfil, pesadas, comidas, aguaLitros, habitosHechos } = useDatos();

  // 1. Estado multi-grupo
  const [grupos, setGrupos] = useState<GrupoFamiliar[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const viejo = window.localStorage.getItem(CLAVE_LOCAL_GRUPO);
      const nuevo = window.localStorage.getItem(CLAVE_LOCAL_GRUPOS);
      const migrados = migrarGruposLocales(viejo, nuevo);
      if (nuevo === null && migrados.length > 0) {
        window.localStorage.setItem(CLAVE_LOCAL_GRUPOS, JSON.stringify(migrados));
      }
      return migrados;
    } catch {
      return [];
    }
  });

  const [grupoActivoCodigo, setGrupoActivoCodigo] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const guardado = window.localStorage.getItem(CLAVE_LOCAL_GRUPO_ACTIVO);
      return guardado || null;
    } catch {
      return null;
    }
  });

  // Grupo activo resuelto
  const grupoActivo = useMemo(() => {
    if (grupos.length === 0) return null;
    if (grupoActivoCodigo) {
      const encontrado = grupos.find((g) => g.codigo === grupoActivoCodigo);
      if (encontrado) return encontrado;
    }
    return grupos[0] || null;
  }, [grupos, grupoActivoCodigo]);

  // Alias para retrocompatibilidad
  const grupo = grupoActivo;

  // 2. Estado Compra Compartida del Hogar
  const [compraHogar, setCompraHogar] = useState<CompraHogar | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const guardado = window.localStorage.getItem(CLAVE_LOCAL_COMPRA_HOGAR);
      if (guardado) return JSON.parse(guardado) as CompraHogar;

      // Migración inicial: si el grupo antiguo tenía items en compra, preservarlos en hogar local
      const grupoViejoRaw = window.localStorage.getItem(CLAVE_LOCAL_GRUPO);
      if (grupoViejoRaw) {
        const grupoViejo = JSON.parse(grupoViejoRaw) as GrupoFamiliar;
        if (grupoViejo && Array.isArray(grupoViejo.compra) && grupoViejo.compra.length > 0) {
          const hogarInicial: CompraHogar = {
            id: `hog_migrado_${Date.now()}`,
            codigo: "",
            nombre: "Compra de Casa",
            creadorCodigo: grupoViejo.creadorCodigo || "yo",
            miembros: [],
            items: grupoViejo.compra,
            actualizado: new Date().toISOString(),
          };
          window.localStorage.setItem(CLAVE_LOCAL_COMPRA_HOGAR, JSON.stringify(hogarInicial));
          return hogarInicial;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [cargando, setCargando] = useState(false);
  const [cargandoHogar, setCargandoHogar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guardar grupos en localStorage
  const guardarGruposLocal = useCallback((nuevosGrupos: GrupoFamiliar[]) => {
    setGrupos(nuevosGrupos);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CLAVE_LOCAL_GRUPOS, JSON.stringify(nuevosGrupos));
      if (nuevosGrupos.length > 0) {
        window.localStorage.setItem(CLAVE_LOCAL_GRUPO, JSON.stringify(nuevosGrupos[0]));
      } else {
        window.localStorage.removeItem(CLAVE_LOCAL_GRUPO);
        window.localStorage.removeItem(CLAVE_LOCAL_GRUPO_ACTIVO);
      }
    } catch {}
  }, []);

  // Guardar hogar en localStorage
  const guardarHogarLocal = useCallback((hogar: CompraHogar | null) => {
    setCompraHogar(hogar);
    if (typeof window === "undefined") return;
    try {
      if (hogar) {
        window.localStorage.setItem(CLAVE_LOCAL_COMPRA_HOGAR, JSON.stringify(hogar));
      } else {
        window.localStorage.removeItem(CLAVE_LOCAL_COMPRA_HOGAR);
      }
    } catch {}
  }, []);

  // Seleccionar grupo activo
  const seleccionarGrupo = useCallback((codigo: string) => {
    setGrupoActivoCodigo(codigo);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CLAVE_LOCAL_GRUPO_ACTIVO, codigo);
      } catch {}
    }
  }, []);

  // Traer grupo activo de la nube
  const refrescar = useCallback(async (codigo?: string) => {
    const cod = codigo ?? grupoActivo?.codigo;
    if (!cod) return;

    try {
      const resp = await fetch(`/api/social/grupo?codigo=${encodeURIComponent(cod)}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.ok && json.grupo) {
          const gActualizado: GrupoFamiliar = json.grupo;
          setGrupos((prev) => {
            const existe = prev.some((g) => g.codigo === gActualizado.codigo);
            const lista = existe
              ? prev.map((g) => (g.codigo === gActualizado.codigo ? gActualizado : g))
              : [...prev, gActualizado];
            if (typeof window !== "undefined") {
              try {
                window.localStorage.setItem(CLAVE_LOCAL_GRUPOS, JSON.stringify(lista));
              } catch {}
            }
            return lista;
          });
        }
      }
    } catch {}
  }, [grupoActivo?.codigo]);

  // Traer compra del hogar de la nube
  const refrescarHogar = useCallback(async (codigo?: string) => {
    const cod = codigo ?? compraHogar?.codigo;
    if (!cod) return;

    try {
      const resp = await fetch(`/api/social/compra?codigo=${encodeURIComponent(cod)}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.ok && json.hogar) {
          guardarHogarLocal(json.hogar);
        }
      }
    } catch {}
  }, [compraHogar?.codigo, guardarHogarLocal]);

  // Sondeo lento: el grupo y el hogar cambian poco y cada consulta es una
// llamada al servidor. Antes iba cada 6 s y mantenía despierta la radio del
// móvil; al volver a la app se refresca igual, que es cuando importa.
  useEffect(() => {
    const arranque = setTimeout(() => {
      if (grupoActivo?.codigo) void refrescar();
      if (compraHogar?.codigo) void refrescarHogar();
    }, 0);

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        if (grupoActivo?.codigo) void refrescar();
        if (compraHogar?.codigo) void refrescarHogar();
      }
    }, 25000);

    const alVolver = () => {
      if (document.visibilityState === "visible") {
        if (grupoActivo?.codigo) void refrescar();
        if (compraHogar?.codigo) void refrescarHogar();
      }
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearTimeout(arranque);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [grupoActivo?.codigo, compraHogar?.codigo, refrescar, refrescarHogar]);

  // Identificador público del usuario en el grupo.
  //
  // Sale de aquí y nunca del código de recuperación (ese abre la cuenta y no
  // debe verlo nadie más). Y tiene que ser UNO solo: antes se generaba antes
  // de que el perfil tuviera nombre y otra vez al cargarlo, así que cada
  // persona aparecía dos o tres veces en la pantalla de Familia.
  const [miembroIdLocal, setMiembroIdLocal] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sin nombre no se sabe quién es: no se inventa nada todavía.
    if (!perfil?.nombre || miembroIdLocal) return;

    let guardado: string | null = null;
    try {
      guardado = window.localStorage.getItem("mi-peso:miembro-id");
    } catch {}

    // Sin identificador guardado se espera a tener los grupos: así se adopta
    // la ficha que ya existe con este nombre en vez de crear otra.
    if (!guardado && !listo) return;

    const codigo = codigoDeMiembro(perfil.nombre, guardado, grupos);
    try {
      window.localStorage.setItem("mi-peso:miembro-id", codigo);
    } catch {}
    // En microtarea para no encadenar renders dentro del propio efecto.
    queueMicrotask(() => setMiembroIdLocal((actual) => actual || codigo));
  }, [perfil?.nombre, miembroIdLocal, listo, grupos]);

  // Vacío mientras no se sabe, para no mandar al grupo un miembro inventado.
  const miCodigo = miembroIdLocal;

  const miNombre = perfil?.nombre || "Yo";

  // Emoticono elegido por el usuario (persiste en localStorage y se sincroniza con el grupo)
  const [miAvatar, setMiAvatar] = useState<string>(() => {
    if (typeof window === "undefined") return "🥑";
    try {
      const guardado = window.localStorage.getItem(CLAVE_LOCAL_MI_AVATAR);
      if (guardado) return guardado;
      const gruposRaw = window.localStorage.getItem(CLAVE_LOCAL_GRUPOS) || window.localStorage.getItem(CLAVE_LOCAL_GRUPO);
      if (gruposRaw) {
        const parseados: unknown = JSON.parse(gruposRaw);
        const lista: GrupoFamiliar[] = Array.isArray(parseados) ? parseados : [parseados as GrupoFamiliar];
        const miCodGuardado = window.localStorage.getItem("mi-peso:miembro-id");
        for (const g of lista) {
          const yo = g.miembros?.find((m) => m.codigo === miCodGuardado);
          if (yo?.avatar && yo.avatar !== "🌱") return yo.avatar;
        }
      }
    } catch {}
    return "🥑";
  });

  // Si los grupos se descargan y descubren el avatar elegido del usuario, adoptarlo localmente
  useEffect(() => {
    if (typeof window === "undefined" || !miCodigo) return;
    try {
      const guardado = window.localStorage.getItem(CLAVE_LOCAL_MI_AVATAR);
      if (!guardado) {
        for (const g of grupos) {
          const yo = g.miembros?.find((m) => m.codigo === miCodigo);
          if (yo?.avatar && yo.avatar !== "🌱") {
            const nuevoAv = yo.avatar;
            window.localStorage.setItem(CLAVE_LOCAL_MI_AVATAR, nuevoAv);
            queueMicrotask(() => setMiAvatar(nuevoAv));
            break;
          }
        }
      }
    } catch {}
  }, [grupos, miCodigo]);

  // Sincronizar mis métricas y mi avatar con TODOS los grupos a los que pertenezco
  useEffect(() => {
    if (grupos.length === 0 || !listo || !perfil || !miCodigo) return;

    const hoy = hoyISO();
    const habitosActivos = perfil.habitosActivos ?? HABITOS_INICIALES;
    const habitosHoy = habitosHechos?.[hoy]?.length ?? 0;
    const habitosSemana = contarMisHabitosSemana(habitosHechos, hoy);
    // La racha de verdad, con la misma fórmula que Hoy y el widget.
    const racha = rachaActual(
      diasConActividad({ comidas, pesadas, aguaLitros, habitosHechos }),
      hoy,
    );

    // Privacidad sagrada: el peso y la báscula son 100% privados; en grupo solo se comparten hábitos
    for (const g of grupos) {
      const yoEnGrupo = g.miembros.find((m) => m.codigo === miCodigo);
      if (
        !yoEnGrupo ||
        yoEnGrupo.habitosHoy !== habitosHoy ||
        yoEnGrupo.habitosSemana !== habitosSemana ||
        yoEnGrupo.racha !== racha ||
        yoEnGrupo.nombre !== miNombre ||
        yoEnGrupo.avatar !== miAvatar
      ) {
        void fetch("/api/social/grupo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "sincronizar_miembro",
            codigo: g.codigo,
            miembroCodigo: miCodigo,
            miembroNombre: miNombre,
            miembroAvatar: miAvatar,
            racha,
            habitosHoy,
            habitosTotal: habitosActivos.length,
            habitosSemana,
            kgAportados: 0,
          }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.ok && res.grupo) {
              const actualizado: GrupoFamiliar = res.grupo;
              setGrupos((prev) =>
                prev.map((item) => (item.codigo === actualizado.codigo ? actualizado : item))
              );
            }
          })
          .catch(() => {});
      }
    }
  }, [grupos, listo, perfil, comidas, pesadas, aguaLitros, habitosHechos, miCodigo, miNombre, miAvatar]);

  // 4. Detección en vivo de reacciones dirigidas a mí (sonido, vibración y tostada en pantalla)
  useEffect(() => {
    if (!grupoActivo || !Array.isArray(grupoActivo.reacciones) || !miCodigo) return;
    if (typeof window === "undefined") return;

    try {
      const claveVistas = "mi-peso:reacciones-notificadas";
      const guardadas = JSON.parse(window.localStorage.getItem(claveVistas) || "[]") as string[];
      const conjuntoVistos = new Set(guardadas);

      const paraMi = grupoActivo.reacciones.filter((r) => r.paraCodigo === miCodigo);
      const nuevas = paraMi.filter((r) => !conjuntoVistos.has(r.id));

      if (nuevas.length > 0) {
        const actualizadas = [...guardadas, ...nuevas.map((r) => r.id)].slice(-60);
        window.localStorage.setItem(claveVistas, JSON.stringify(actualizadas));

        const r = nuevas[0];
        sonidoCelebracion();
        vibrarExito();

        let icono = "✋";
        let mensaje = `¡${r.deNombre} te ha chocado los 5!`;
        if (r.tipo === "animo") {
          icono = "👋";
          mensaje = `¡${r.deNombre} te ha enviado ánimos!`;
        } else if (r.tipo === "fuego") {
          icono = "🔥";
          mensaje = `¡${r.deNombre} está a tope contigo!`;
        } else if (r.tipo === "aplauso") {
          icono = "👏";
          mensaje = `¡${r.deNombre} te aplaude!`;
        } else if (r.tipo === "agua") {
          icono = "💧";
          mensaje = `¡${r.deNombre} te recuerda hidratarte!`;
        }

        mostrarTostada(mensaje, icono, 4000);
      }
    } catch {}
  }, [grupoActivo, miCodigo]);

  // -------------------------------------------------------------------------
  // ACCIONES DE GRUPOS SOCIALES (MOTIVACIÓN)
  // -------------------------------------------------------------------------

  // Permite a la persona cambiar EXCLUSIVAMENTE su propio avatar en el grupo
  const cambiarAvatarDeMiembro = useCallback(
    async (codigoMiembro: string, nuevoAvatar: string, nombreMiembro?: string) => {
      // Blindaje de privacidad: nadie puede cambiar el avatar de otro miembro
      if (codigoMiembro && miCodigo && codigoMiembro !== miCodigo) {
        return;
      }

      const limpio = (nuevoAvatar || "🥑").trim().slice(0, 12);
      setMiAvatar(limpio);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(CLAVE_LOCAL_MI_AVATAR, limpio);
        } catch {}
      }

      // 1. Actualización optimista local en todos los grupos para el propio usuario
      setGrupos((prev) => {
        const actualizados = prev.map((g) => ({
          ...g,
          miembros: g.miembros.map((m) =>
            m.codigo === miCodigo || (miNombre && baseDeMiembro(m.nombre) === baseDeMiembro(miNombre))
              ? { ...m, avatar: limpio, actualizado: new Date().toISOString() }
              : m
          ),
        }));
        guardarGruposLocal(actualizados);
        return actualizados;
      });

      // 2. Persistir en la nube para el grupo activo (y cualquier otro grupo)
      const lista = grupoActivo ? [grupoActivo] : grupos;
      for (const g of lista) {
        try {
          const resp = await fetch("/api/social/grupo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accion: "cambiar_avatar",
              codigo: g.codigo,
              miembroCodigo: miCodigo,
              miembroNombre: miNombre || nombreMiembro || "Familiar",
              avatar: limpio,
            }),
          });
          const data = await resp.json();
          if (data.ok && data.grupo) {
            const actualizado: GrupoFamiliar = data.grupo;
            setGrupos((prev) =>
              prev.map((item) => (item.codigo === actualizado.codigo ? actualizado : item))
            );
          }
        } catch {}
      }
    },
    [miCodigo, miNombre, grupoActivo, grupos, guardarGruposLocal]
  );

  const cambiarMiAvatar = useCallback(
    (nuevoAvatar: string) => cambiarAvatarDeMiembro(miCodigo, nuevoAvatar, miNombre),
    [cambiarAvatarDeMiembro, miCodigo, miNombre]
  );

  const crearGrupo = async (nombre: string, metaHabitos = 60, avatar = "🌱") => {
    // Todavía no se sabe quién es: mejor no crear un grupo con el creador vacío.
    if (!miCodigo) return false;
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("/api/social/grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "crear",
          nombre,
          creadorCodigo: miCodigo,
          creadorNombre: miNombre,
          creadorAvatar: avatar,
          metaHabitos,
        }),
      });
      const data = await resp.json();
      setCargando(false);
      if (data.ok && data.grupo) {
        sonidoExito();
        vibrarExito();
        if (avatar) {
          setMiAvatar(avatar);
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(CLAVE_LOCAL_MI_AVATAR, avatar);
            } catch {}
          }
        }
        const nuevo: GrupoFamiliar = data.grupo;
        const nuevos = [...grupos.filter((g) => g.codigo !== nuevo.codigo), nuevo];
        guardarGruposLocal(nuevos);
        seleccionarGrupo(nuevo.codigo);
        return true;
      } else {
        setError(data.error ?? "No se pudo crear el grupo.");
        return false;
      }
    } catch {
      setCargando(false);
      setError("Error de conexión. Inténtalo de nuevo.");
      return false;
    }
  };

  const unirseGrupo = async (codigo: string, avatar = "🥑") => {
    setCargando(true);
    setError(null);
    try {
      const hoy = hoyISO();
      const habitosHoy = habitosHechos?.[hoy]?.length ?? 0;
      const habitosSemana = contarMisHabitosSemana(habitosHechos, hoy);
      const resp = await fetch("/api/social/grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "unirse",
          codigo: normalizarCodigoGrupo(codigo),
          miembroCodigo: miCodigo,
          miembroNombre: miNombre,
          miembroAvatar: avatar,
          habitosHoy,
          habitosSemana,
        }),
      });
      const data = await resp.json();
      setCargando(false);
      if (data.ok && data.grupo) {
        sonidoExito();
        vibrarExito();
        if (avatar) {
          setMiAvatar(avatar);
          if (typeof window !== "undefined") {
            try {
              window.localStorage.setItem(CLAVE_LOCAL_MI_AVATAR, avatar);
            } catch {}
          }
        }
        const nuevo: GrupoFamiliar = data.grupo;
        const nuevos = [...grupos.filter((g) => g.codigo !== nuevo.codigo), nuevo];
        guardarGruposLocal(nuevos);
        seleccionarGrupo(nuevo.codigo);
        return true;
      } else {
        setError(data.error ?? "Código no válido o grupo no encontrado.");
        return false;
      }
    } catch {
      setCargando(false);
      setError("Error de conexión al unirse al grupo.");
      return false;
    }
  };

  const chocarCinco = async (
    paraCodigo: string,
    grupoCodigo?: string,
    tipo: TipoReaccion = "cinco"
  ) => {
    const cod = grupoCodigo ?? grupoActivo?.codigo;
    if (!cod) return;
    sonidoTap();
    vibrarTap();
    try {
      const resp = await fetch("/api/social/grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "reaccion",
          codigo: cod,
          deCodigo: miCodigo,
          deNombre: miNombre,
          paraCodigo,
          tipo,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.grupo) {
        const actualizado: GrupoFamiliar = data.grupo;
        setGrupos((prev) =>
          prev.map((g) => (g.codigo === actualizado.codigo ? actualizado : g))
        );
      }
    } catch {}
  };

  const salirGrupo = async (codigo?: string) => {
    const cod = codigo ?? grupoActivo?.codigo;
    if (!cod) return;
    sonidoTap();
    vibrarTap();
    try {
      await fetch("/api/social/grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "salir",
          codigo: cod,
          miembroCodigo: miCodigo,
        }),
      });
    } catch {}

    const restantes = grupos.filter((g) => g.codigo !== cod);
    guardarGruposLocal(restantes);
    if (restantes.length > 0) {
      seleccionarGrupo(restantes[0].codigo);
    } else {
      setGrupoActivoCodigo(null);
    }
  };

  // -------------------------------------------------------------------------
  // ACCIONES DE COMPRA DEL HOGAR (DESACASADA DE LOS GRUPOS)
  // -------------------------------------------------------------------------

  const crearHogar = async (nombre: string) => {
    setCargandoHogar(true);
    try {
      const resp = await fetch("/api/social/compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "crear",
          nombre: nombre.trim() || "Compra de Casa",
          creadorCodigo: miCodigo,
          creadorNombre: miNombre,
          creadorAvatar: "🏡",
        }),
      });
      const data = await resp.json();
      setCargandoHogar(false);
      if (data.ok && data.hogar) {
        sonidoExito();
        vibrarExito();
        // Si teníamos items locales previos, los volcamos al hogar recién creado
        if (compraHogar && compraHogar.items.length > 0) {
          void fetch("/api/social/compra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accion: "item_compra",
              subAccion: "anadir_lote",
              codigo: data.hogar.codigo,
              items: compraHogar.items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad })),
            }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.ok && res.hogar) guardarHogarLocal(res.hogar);
            });
        }
        guardarHogarLocal(data.hogar);
        return true;
      }
      return false;
    } catch {
      setCargandoHogar(false);
      return false;
    }
  };

  const unirseHogar = async (codigo: string) => {
    setCargandoHogar(true);
    try {
      const resp = await fetch("/api/social/compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "unirse",
          codigo: normalizarCodigoHogar(codigo),
          miembroCodigo: miCodigo,
          miembroNombre: miNombre,
          miembroAvatar: "🏡",
        }),
      });
      const data = await resp.json();
      setCargandoHogar(false);
      if (data.ok && data.hogar) {
        sonidoExito();
        vibrarExito();
        guardarHogarLocal(data.hogar);
        return true;
      }
      return false;
    } catch {
      setCargandoHogar(false);
      return false;
    }
  };

  const salirHogar = async () => {
    if (!compraHogar) return;
    sonidoTap();
    vibrarTap();
    if (compraHogar.codigo) {
      try {
        await fetch("/api/social/compra", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "salir",
            codigo: compraHogar.codigo,
            miembroCodigo: miCodigo,
          }),
        });
      } catch {}
    }
    guardarHogarLocal(null);
  };

  const anadirProductoHogar = async (nombre: string, cantidad = "1") => {
    sonidoTap();
    vibrarTap();
    const limpio = nombre.trim();
    if (!limpio) return;

    // Si no tiene código en la nube todavía, guardar en local directamente
    if (!compraHogar || !compraHogar.codigo) {
      const nuevoItem: ItemCompraFamiliar = {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nombre: limpio,
        cantidad: cantidad.trim() || "1",
        comprado: false,
        compradoPor: null,
        fecha: new Date().toISOString(),
      };
      const base: CompraHogar = compraHogar ?? {
        id: `hog_local_${Date.now()}`,
        codigo: "",
        nombre: "Mi lista de la compra",
        creadorCodigo: miCodigo,
        miembros: [],
        items: [],
        actualizado: new Date().toISOString(),
      };
      guardarHogarLocal({
        ...base,
        items: [nuevoItem, ...base.items],
        actualizado: new Date().toISOString(),
      });
      return;
    }

    try {
      const resp = await fetch("/api/social/compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "item_compra",
          subAccion: "anadir",
          codigo: compraHogar.codigo,
          nombre: limpio,
          cantidad,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.hogar) {
        guardarHogarLocal(data.hogar);
      }
    } catch {}
  };

  const anadirLoteHogar = async (items: { nombre: string; cantidad?: string }[]) => {
    if (items.length === 0) return false;
    sonidoTap();
    vibrarTap();

    if (!compraHogar || !compraHogar.codigo) {
      const base: CompraHogar = compraHogar ?? {
        id: `hog_local_${Date.now()}`,
        codigo: "",
        nombre: "Mi lista de la compra",
        creadorCodigo: miCodigo,
        miembros: [],
        items: [],
        actualizado: new Date().toISOString(),
      };
      const existentes = new Set(base.items.filter((i) => !i.comprado).map((i) => i.nombre.toLowerCase().trim()));
      const nuevos: ItemCompraFamiliar[] = [];
      const ahora = new Date().toISOString();
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        const nom = it.nombre.trim();
        if (!nom || existentes.has(nom.toLowerCase())) continue;
        existentes.add(nom.toLowerCase());
        nuevos.push({
          id: `item_${Date.now()}_${idx}`,
          nombre: nom,
          cantidad: (it.cantidad ?? "1").trim() || "1",
          comprado: false,
          compradoPor: null,
          fecha: ahora,
        });
      }
      guardarHogarLocal({
        ...base,
        items: [...nuevos, ...base.items],
        actualizado: ahora,
      });
      sonidoExito();
      vibrarExito();
      return true;
    }

    try {
      const resp = await fetch("/api/social/compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "item_compra",
          subAccion: "anadir_lote",
          codigo: compraHogar.codigo,
          items,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.hogar) {
        sonidoExito();
        vibrarExito();
        guardarHogarLocal(data.hogar);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const alternarProductoHogar = async (itemId: string) => {
    sonidoCheck();
    vibrarCheck();
    if (!compraHogar) return;

    if (!compraHogar.codigo) {
      const items = compraHogar.items.map((it) => {
        if (it.id !== itemId) return it;
        const nuevo = !it.comprado;
        return {
          ...it,
          comprado: nuevo,
          compradoPor: nuevo ? miNombre : null,
          fecha: new Date().toISOString(),
        };
      });
      guardarHogarLocal({ ...compraHogar, items, actualizado: new Date().toISOString() });
      return;
    }

    try {
      const resp = await fetch("/api/social/compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "item_compra",
          subAccion: "alternar",
          codigo: compraHogar.codigo,
          itemId,
          personaNombre: miNombre,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.hogar) {
        guardarHogarLocal(data.hogar);
      }
    } catch {}
  };

  const borrarProductoHogar = async (itemId: string) => {
    sonidoTap();
    vibrarTap();
    if (!compraHogar) return;

    if (!compraHogar.codigo) {
      const items = compraHogar.items.filter((it) => it.id !== itemId);
      guardarHogarLocal({ ...compraHogar, items, actualizado: new Date().toISOString() });
      return;
    }

    try {
      const resp = await fetch("/api/social/compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "item_compra",
          subAccion: "borrar",
          codigo: compraHogar.codigo,
          itemId,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.hogar) {
        guardarHogarLocal(data.hogar);
      }
    } catch {}
  };

  const limpiarCompradosHogar = async () => {
    sonidoTap();
    vibrarTap();
    if (!compraHogar) return;

    if (!compraHogar.codigo) {
      const items = compraHogar.items.filter((it) => !it.comprado);
      guardarHogarLocal({ ...compraHogar, items, actualizado: new Date().toISOString() });
      return;
    }

    try {
      const resp = await fetch("/api/social/compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "item_compra",
          subAccion: "limpiar_comprados",
          codigo: compraHogar.codigo,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.hogar) {
        guardarHogarLocal(data.hogar);
      }
    } catch {}
  };

  // -------------------------------------------------------------------------
  // MÉTODOS DE RETROCOMPATIBILIDAD (PARA QUE PLAN Y OTROS NO SE ROMPAN)
  // -------------------------------------------------------------------------

  const anadirProductoCompra = async (nombre: string, cantidad = "1") => {
    if (compraHogar) {
      await anadirProductoHogar(nombre, cantidad);
      return;
    }
    if (grupoActivo) {
      try {
        const resp = await fetch("/api/social/grupo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "item_compra",
            subAccion: "anadir",
            codigo: grupoActivo.codigo,
            nombre,
            cantidad,
          }),
        });
        const data = await resp.json();
        if (data.ok && data.grupo) {
          const actualizado: GrupoFamiliar = data.grupo;
          setGrupos((prev) =>
            prev.map((g) => (g.codigo === actualizado.codigo ? actualizado : g))
          );
        }
      } catch {}
    }
  };

  const anadirLoteCompra = async (items: { nombre: string; cantidad?: string }[]) => {
    if (compraHogar) {
      return await anadirLoteHogar(items);
    }
    if (grupoActivo) {
      try {
        const resp = await fetch("/api/social/grupo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "item_compra",
            subAccion: "anadir_lote",
            codigo: grupoActivo.codigo,
            items,
          }),
        });
        const data = await resp.json();
        if (data.ok && data.grupo) {
          const actualizado: GrupoFamiliar = data.grupo;
          setGrupos((prev) =>
            prev.map((g) => (g.codigo === actualizado.codigo ? actualizado : g))
          );
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }
    return false;
  };

  const alternarProductoCompra = async (itemId: string) => {
    if (compraHogar) {
      await alternarProductoHogar(itemId);
      return;
    }
    if (grupoActivo) {
      try {
        const resp = await fetch("/api/social/grupo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "item_compra",
            subAccion: "alternar",
            codigo: grupoActivo.codigo,
            itemId,
            personaNombre: miNombre,
          }),
        });
        const data = await resp.json();
        if (data.ok && data.grupo) {
          const actualizado: GrupoFamiliar = data.grupo;
          setGrupos((prev) =>
            prev.map((g) => (g.codigo === actualizado.codigo ? actualizado : g))
          );
        }
      } catch {}
    }
  };

  const limpiarCompradosCompra = async () => {
    if (compraHogar) {
      await limpiarCompradosHogar();
      return;
    }
    if (grupoActivo) {
      try {
        const resp = await fetch("/api/social/grupo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "item_compra",
            subAccion: "limpiar_comprados",
            codigo: grupoActivo.codigo,
          }),
        });
        const data = await resp.json();
        if (data.ok && data.grupo) {
          const actualizado: GrupoFamiliar = data.grupo;
          setGrupos((prev) =>
            prev.map((g) => (g.codigo === actualizado.codigo ? actualizado : g))
          );
        }
      } catch {}
    }
  };

  const borrarProductoCompra = async (itemId: string) => {
    if (compraHogar) {
      await borrarProductoHogar(itemId);
      return;
    }
    if (grupoActivo) {
      try {
        const resp = await fetch("/api/social/grupo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "item_compra",
            subAccion: "borrar",
            codigo: grupoActivo.codigo,
            itemId,
          }),
        });
        const data = await resp.json();
        if (data.ok && data.grupo) {
          const actualizado: GrupoFamiliar = data.grupo;
          setGrupos((prev) =>
            prev.map((g) => (g.codigo === actualizado.codigo ? actualizado : g))
          );
        }
      } catch {}
    }
  };

  return {
    // Grupos Sociales (Motivación)
    grupos,
    grupoActivo,
    grupo, // alias retrocompatible
    grupoActivoCodigo,
    seleccionarGrupo,
    crearGrupo,
    unirseGrupo,
    chocarCinco,
    salirGrupo,
    refrescar,
    miCodigo,
    miAvatar,
    cambiarMiAvatar,
    cambiarAvatarDeMiembro,
    cargando,
    error,

    // Compra del Hogar independiente
    compraHogar,
    cargandoHogar,
    crearHogar,
    unirseHogar,
    salirHogar,
    anadirProductoHogar,
    anadirLoteHogar,
    alternarProductoHogar,
    borrarProductoHogar,
    limpiarCompradosHogar,
    refrescarHogar,

    // Aliases para retrocompatibilidad
    anadirProductoCompra,
    anadirLoteCompra,
    alternarProductoCompra,
    borrarProductoCompra,
    limpiarCompradosCompra,
  };
}
