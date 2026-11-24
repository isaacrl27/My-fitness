"use client";

import { useEffect, useState } from "react";
import { SearchField } from "@/components/ui/field";
import { buscarTaxonomia, buscarEnOFF, mezclarVariantes } from "@/lib/off";
import { normalizar } from "@/lib/platos";

/**
 * La lista de lo que nunca aparece en tu plan.
 *
 * Es el mismo sitio en el cuestionario y en Ajustes. Es un buscador que
 * pregunta a Open Food Facts —a la taxonomía de ingredientes (nombres
 * canónicos en español) y a los productos— y saca las VARIANTES de lo que
 * escribes: «leche entera», «leche de cabra», «pimentón dulce»…
 *
 * Cada variante se excluye con un clic, tal cual. Lo escrito a mano también
 * se puede excluir con el botón de abajo: ese cruce del plan funciona por el
 * texto que llevan los platos, así que lo escrito siempre cuadra.
 */
export function ListaRoja({
  marcados,
  onCambiar,
  descripcion,
}: {
  marcados: string[];
  onCambiar: (lista: string[]) => void;
  descripcion?: string;
}) {
  const [busca, setBusca] = useState("");
  const [pedida, setPedida] = useState("");
  const [estado, setEstado] = useState<"parado" | "buscando" | "nada" | "red">("parado");
  const [nombres, setNombres] = useState<string[]>([]);

  useEffect(() => {
    const texto = busca.trim();
    if (normalizar(texto).length < 3) return;
    const control = new AbortController();
    const reloj = setTimeout(() => {
      setPedida(texto);
      setNombres([]);
      setEstado("buscando");
      // Dos fuentes a la vez: la taxonomía (nombres canónicos) y los
      // productos. Si cae una la otra basta; si caen las dos, bronca de red.
      Promise.allSettled([
        buscarTaxonomia(texto, { senal: control.signal }),
        buscarEnOFF(texto, { senal: control.signal }),
      ]).then(([taxonomia, productos]) => {
        if (control.signal.aborted) return;
        if (taxonomia.status === "rejected" && productos.status === "rejected") {
          setNombres([]);
          setEstado("red");
          return;
        }
        setNombres(
          mezclarVariantes(
            taxonomia.status === "fulfilled" ? taxonomia.value : [],
            productos.status === "fulfilled" ? productos.value : [],
            texto,
          ),
        );
        setEstado("nada");
      });
    }, 350);
    return () => {
      clearTimeout(reloj);
      control.abort();
    };
  }, [busca]);

  const estaMarcado = (nombre: string) =>
    marcados.some((m) => normalizar(m) === normalizar(nombre));

  /** ¿Se puede echar este término? Limpio, no repetido y no vacío. */
  const cabeElTermino = (termino: string) =>
    normalizar(termino.trim()).length >= 3 && !estaMarcado(termino);

  /** Echa lo escrito: se limpia el buscador para empezar con otra cosa. */
  function excluirEscrito() {
    if (!cabeElTermino(escrito)) return;
    onCambiar([...marcados, escrito]);
    setBusca("");
    setPedida("");
    setNombres([]);
    setEstado("parado");
  }

  /** Echa una variante clicable: el buscador queda para seguir buscando. */
  function excluirVariante(nombre: string) {
    if (!cabeElTermino(nombre)) return;
    onCambiar([...marcados, nombre]);
  }

  const escrito = busca.trim();
  const cabeElEscrito = cabeElTermino(escrito);

  // Lo que se enseña vale mientras no cambie lo escrito: si cambias la
  // búsqueda, lo de antes se esconde al momento, sin esperar al reloj.
  const vigente = pedida === busca.trim();
  const estadoVisto = vigente ? estado : "parado";
  // Las fichas son las variantes que aún no están echadas.
  const fichas = (estadoVisto === "nada" ? nombres : []).filter((n) => !estaMarcado(n));

  return (
    <div className="flex flex-col gap-3">
      {descripcion ? <p className="text-sm text-muted">{descripcion}</p> : null}

      <div className="flex flex-wrap gap-2">
        {marcados.map((nombre) => (
          <button
            key={nombre}
            type="button"
            aria-pressed="true"
            onClick={() =>
              onCambiar(marcados.filter((x) => normalizar(x) !== normalizar(nombre)))
            }
            className="rounded-pill border border-danger bg-danger px-3 py-1.5 text-sm text-on-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {nombre}
          </button>
        ))}
      </div>

      <SearchField
        value={busca}
        onChange={setBusca}
        placeholder="Busca cualquier alimento"
        results={estadoVisto === "nada" ? fichas.length : null}
        loading={estadoVisto === "buscando"}
      />

      {estadoVisto === "red" ? (
        <p role="status" className="text-sm text-danger">
          No llego a Open Food Facts. Lo puedes excluir igual, con el botón de abajo.
        </p>
      ) : null}

      {fichas.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted">
            Variantes de lo que buscas (con un clic, fuera esa variante):
          </p>
          <ul className="flex flex-wrap gap-2">
            {fichas.map((nombre) => (
              <li key={nombre}>
                <button
                  type="button"
                  aria-label={`Excluir ${nombre}`}
                  onClick={() => excluirVariante(nombre)}
                  className="rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink transition hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {nombre}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {cabeElEscrito ? (
        <button
          type="button"
          onClick={excluirEscrito}
          className="rounded-pill border border-border bg-bg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Excluir «{escrito}»
        </button>
      ) : null}

      <p className="text-sm text-muted" role="status">
        {marcados.length === 0
          ? "No has marcado ninguno todavía."
          : `Vas a excluir ${marcados.length} ${marcados.length === 1 ? "ingrediente" : "ingredientes"}.`}
      </p>
    </div>
  );
}
