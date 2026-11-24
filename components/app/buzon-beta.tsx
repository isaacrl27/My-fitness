"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Megaphone, MessageSquare, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice";
import { TextArea } from "@/components/ui/field";
import { useDatos } from "@/lib/store";
import {
  esAlertaSalud,
  esNuevo,
  type ComentarioConNombre,
  type TipoComentario,
} from "@/lib/comentarios";
import { ETIQUETA_CATEGORIA } from "@/lib/feedback-categorias";

/**
 * El buzón de la beta, dentro de Ajustes.
 *
 * Cualquiera escribe un problema o una idea y le llega a Isaac: guardado en su
 * perfil y, si tiene los avisos puestos, también al móvil. No hay respuestas;
 * al enviar sale el agradecimiento y ya.
 *
 * La lista de mensajes solo la ve Isaac. No se pregunta quién es en el móvil:
 * se pide al servidor y, si el código no es el del admin, contesta que no. Así
 * el resto de la familia ni siquiera ve que existe la lista.
 */

const LARGO_MINIMO = 5;

export function BuzonBeta() {
  const { codigoNube, estadoNube, mensajesIsaac } = useDatos();

  const [tipo, setTipo] = useState<TipoComentario>("problema");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [esAdmin, setEsAdmin] = useState(false);
  const [lista, setLista] = useState<ComentarioConNombre[]>([]);
  const [nuevos, setNuevos] = useState<string[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [textoAviso, setTextoAviso] = useState("");
  const [enviandoAviso, setEnviandoAviso] = useState(false);
  const [resultadoAviso, setResultadoAviso] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const sinNube = estadoNube === "sin-nube" || estadoNube === "sin-conexion";
  const sinCodigo = !codigoNube;
  const puede = !sinNube && !sinCodigo;

  const cargarLista = useCallback(async () => {
    if (!codigoNube) return;
    try {
      const r = await fetch("/api/comentarios", {
        cache: "no-store",
        headers: { "x-codigo": codigoNube },
      });
      if (!r.ok) {
        setEsAdmin(false);
        setLista([]);
        return;
      }
      const cuerpo = (await r.json()) as {
        ok?: boolean;
        comentarios?: ComentarioConNombre[];
        leidos?: string;
      };
      if (!cuerpo.ok) {
        setEsAdmin(false);
        return;
      }
      const recibidos = Array.isArray(cuerpo.comentarios) ? cuerpo.comentarios : [];
      setEsAdmin(true);
      setLista(recibidos);
      setNuevos(recibidos.filter((c) => esNuevo(c, cuerpo.leidos)).map((c) => c.id));
    } catch {
      setEsAdmin(false);
    }
  }, [codigoNube]);

  const refrescar = useCallback(async () => {
    setCargandoLista(true);
    try {
      await cargarLista();
    } finally {
      setCargandoLista(false);
    }
  }, [cargarLista]);

  /**
   * Marca la lista como vista, y solo cuando Isaac lo pide.
   *
   * Antes se hacía solo al abrir Ajustes, aunque no bajara hasta el buzón: los
   * mensajes perdían la etiqueta «Nuevo» sin que los hubiera visto. Si el
   * aviso al servidor falla, las etiquetas vuelven a salir.
   */
  async function enviarAvisoATodos() {
    if (!codigoNube || textoAviso.trim().length < LARGO_MINIMO || enviandoAviso) return;
    setEnviandoAviso(true);
    setResultadoAviso(null);
    try {
      const res = await fetch("/api/admin/comunicado", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-codigo": codigoNube,
        },
        body: JSON.stringify({ texto: textoAviso.trim() }),
      });
      const datos = await res.json();
      if (!res.ok || !datos.ok) {
        setResultadoAviso({
          ok: false,
          mensaje: datos?.motivo || "No se ha podido enviar el comunicado.",
        });
        return;
      }
      setResultadoAviso({
        ok: true,
        mensaje: `¡Enviado con éxito! Llegó a ${datos.perfilesActualizados ?? 0} usuarios (${datos.pushEntregados ?? 0} notificaciones push entregadas).`,
      });
      setTextoAviso("");
    } catch {
      setResultadoAviso({
        ok: false,
        mensaje: "Error de conexión al enviar el comunicado.",
      });
    } finally {
      setEnviandoAviso(false);
    }
  }

  async function marcarLeidos() {
    if (!codigoNube) return;
    const antes = nuevos;
    setNuevos([]);
    try {
      const r = await fetch("/api/comentarios", {
        method: "PUT",
        headers: { "x-codigo": codigoNube },
      });
      if (!r.ok) setNuevos(antes);
    } catch {
      setNuevos(antes);
    }
  }

  useEffect(() => {
    // Al abrir Ajustes hay que preguntar si esta persona es Isaac; no hay
    // ningún suceso externo al que suscribirse. Los cambios de estado llegan
    // después del `fetch`, no antes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (puede) void cargarLista();
  }, [puede, cargarLista]);

  async function enviar() {
    setError(null);
    setEnviado(false);
    if (texto.trim().length < LARGO_MINIMO) {
      setError("Cuéntalo con un poco más de detalle.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoNube, tipo, texto, pantalla: "/ajustes" }),
      });
      const cuerpo = (await r.json().catch(() => ({}))) as { ok?: boolean; motivo?: string };
      if (!r.ok || !cuerpo.ok) {
        setError(cuerpo.motivo ?? "No se ha podido enviar. Inténtalo de nuevo.");
        return;
      }
      setTexto("");
      setEnviado(true);
      if (esAdmin) void cargarLista();
    } catch {
      setError("No se ha podido enviar. Mira a ver si tienes cobertura.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <MessageSquare size={18} aria-hidden="true" className="text-accent" />
          Contar un problema o una idea
        </h2>
        <p className="text-sm text-muted">
          Esto le llega a Isaac directamente. Cuéntale lo que falla o lo que te gustaría tener, con
          tus palabras. No hace falta que sea largo.
        </p>

        <ChoiceList
          label="¿Qué quieres contar?"
          valor={tipo}
          onChange={(v) => setTipo(v as TipoComentario)}
          opciones={[
            { valor: "problema", etiqueta: "Algo no funciona", ayuda: "Un fallo, algo que se cierra o que no deja hacer lo que quieres." },
            { valor: "mejora", etiqueta: "Una idea", ayuda: "Algo que te gustaría que hiciera o que se pudiera hacer mejor." },
          ]}
        />

        <TextArea
          label={tipo === "problema" ? "¿Qué problema has tenido?" : "¿Qué idea tienes?"}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (enviado) setEnviado(false);
          }}
          placeholder={
            tipo === "problema"
              ? "Por ejemplo: al apuntar el agua no me deja poner 2 litros."
              : "Por ejemplo: me gustaría ver lo que comí ayer de un vistazo."
          }
          maxLength={1000}
          hint="Sin prisas: con una o dos frases basta."
        />

        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

        {enviado ? (
          <p className="rounded-md bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
            Enviado a Isaac. Muchas gracias por tu comentario.
          </p>
        ) : null}

        {sinNube ? (
          <p className="text-sm text-muted">
            Ahora mismo la app va solo en este móvil, así que el mensaje no puede salir. Prueba
            cuando tengas cobertura.
          </p>
        ) : null}
        {!sinNube && sinCodigo ? (
          <p className="text-sm text-muted">
            Tu ficha en la nube todavía se está creando. Anota cualquier dato en Hoy, espera unos
            segundos y vuelve a probar.
          </p>
        ) : null}

        <Button
          onClick={enviar}
          disabled={!puede || texto.trim().length < LARGO_MINIMO || enviando || enviado}
          className="w-fit"
        >
          <Send size={16} aria-hidden="true" />
          {enviando ? "Enviando…" : enviado ? "Enviado" : "Enviar a Isaac"}
        </Button>
      </section>

      {mensajesIsaac && mensajesIsaac.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4 bg-accent-soft/30">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-accent" aria-hidden="true" />
            <h2 className="text-base font-semibold text-ink">Mensajes recibidos de Isaac</h2>
          </div>
          <p className="text-xs text-muted">
            Respuestas y avisos que Isaac te ha enviado directamente desde Telegram.
          </p>
          <ul className="flex flex-col gap-2.5">
            {[...mensajesIsaac]
              .sort((a, b) => b.fecha.localeCompare(a.fecha))
              .map((m) => (
                <li key={m.id} className="rounded-md border border-border bg-surface p-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                      {m.paraTodos ? "Aviso general" : "Respuesta de Isaac"}
                    </span>
                    <span className="text-xs text-muted">{cuando(m.fecha)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-ink">{m.texto}</p>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {esAdmin ? (
        <>
          <section className="flex flex-col gap-3 rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-amber-500" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink">📢 Enviar comunicado general a toda la app</h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Escribe un mensaje para todos los usuarios de My Fitness. Recibirán una notificación push con el aviso <strong>«LEER IMPORTANTE»</strong> y al abrir la app verán tu mensaje en una ventana emergente destacada.
            </p>

            <TextArea
              label="Mensaje para todos los usuarios"
              placeholder="Ej: Hola a todos, recordad registrar el peso antes de las 11..."
              value={textoAviso}
              onChange={(e) => {
                setTextoAviso(e.target.value);
                if (resultadoAviso) setResultadoAviso(null);
              }}
              rows={3}
              disabled={enviandoAviso}
            />

            {resultadoAviso ? (
              <div
                className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                  resultadoAviso.ok
                    ? "bg-success-soft text-ink border border-success/30"
                    : "bg-danger-soft text-danger border border-danger/30"
                }`}
              >
                {resultadoAviso.ok ? (
                  <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span>{resultadoAviso.mensaje}</span>
              </div>
            ) : null}

            <Button
              onClick={() => void enviarAvisoATodos()}
              disabled={textoAviso.trim().length < LARGO_MINIMO || enviandoAviso}
              className="w-fit"
            >
              <Megaphone size={16} aria-hidden="true" />
              {enviandoAviso ? "Enviando a todos…" : "Enviar comunicado a toda la app"}
            </Button>
          </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">Comentarios de la beta</h2>
            <div className="flex flex-wrap items-center gap-2">
              {nuevos.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={() => void marcarLeidos()}>
                  Marcar leídos ({nuevos.length})
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refrescar()}
                disabled={cargandoLista}
              >
                <RefreshCw size={14} aria-hidden="true" />
                {cargandoLista ? "Mirando…" : "Actualizar"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted">
            Esto solo lo ves tú. Los mensajes con la etiqueta «nuevo» llegaron desde la última vez
            que marcaste la lista como leída.
          </p>

          {lista.length === 0 ? (
            <p className="text-sm text-muted">Todavía no ha escrito nadie.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lista.map((c) => (
                <li key={c.id} className="rounded-md border border-border bg-bg p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {c.nombre.trim() || "Sin nombre"}
                    </span>
                    <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                      {c.tipo === "problema" ? "Problema" : "Idea"}
                    </span>
                    {c.categoria ? (
                      <span className="rounded-pill border border-border px-2 py-0.5 text-xs font-semibold text-muted">
                        {ETIQUETA_CATEGORIA[c.categoria]}
                      </span>
                    ) : null}
                    {esAlertaSalud(c) ? (
                      <span className="rounded-pill bg-danger px-2 py-0.5 text-xs font-semibold text-on-accent">
                        Prioridad
                      </span>
                    ) : null}
                    {nuevos.includes(c.id) ? (
                      <span className="rounded-pill bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">
                        Nuevo
                      </span>
                    ) : null}
                    <span className="text-xs text-muted">{cuando(c.creado)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink">{c.texto}</p>
                  {c.pantalla && c.pantalla !== "/ajustes" ? (
                    <p className="mt-1 text-xs text-muted">Estaba en {c.pantalla}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
      ) : null}
    </>
  );
}

/** Fecha corta y en llano, sin depender del idioma del móvil. */
function cuando(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
