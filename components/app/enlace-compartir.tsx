"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Copy } from "lucide-react";

/**
 * El enlace de la app, escrito y con un botón para copiarlo.
 *
 * Sirve para que quien ya la tiene se la pueda pasar a otro sin tener que
 * buscar la dirección. Se lee del navegador (no está escrito en el código),
 * así vale igual en el PC de pruebas que en la dirección de verdad.
 */
/**
 * La dirección pública de la app.
 *
 * En el móvil de verdad se usa la dirección desde la que se abrió, que es la
 * buena. Pero si se abre en el PC de pruebas (`localhost`), el enlace que se
 * copia no le serviría a nadie: se enseña la dirección pública.
 */
const URL_PUBLICA = (process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com").replace(/\/$/, "");

function enlaceDe(origen: string): string {
  const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origen);
  return `${esLocal ? URL_PUBLICA : origen}/instalar`;
}

export function EnlaceCompartir() {
  const [copiado, setCopiado] = useState(false);

  // El enlace se lee del navegador. `useSyncExternalStore` es la forma de
  // leer algo del navegador sin romper la hidratación: en el servidor sale
  // vacío y en cuanto la página está viva, la dirección de verdad.
  // El enlace lleva a `/instalar`, no a la raíz: quien lo recibe tiene que ver
  // primero cómo se instala (Android con el archivo, iPhone con Safari), y no
  // caer de golpe en el cuestionario dentro del navegador.
  const enlace = useSyncExternalStore(
    () => () => {},
    () => enlaceDe(window.location.origin),
    () => "",
  );

  // El enlace se parte por la barra de `/instalar`, no por cualquier letra:
  // así no queda un «/ins» colgado al final de una línea.
  const base = enlace.replace(/\/instalar$/, "");
  const ruta = enlace.slice(base.length);

  useEffect(() => {
    if (!copiado) return;
    const reloj = setTimeout(() => setCopiado(false), 2500);
    return () => clearTimeout(reloj);
  }, [copiado]);

  async function copiar() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      // Algunos móviles no dejan copiar sin permiso. El enlace está escrito
      // justo encima, así que se puede apuntar a mano.
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-md bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Para pasárselo a otra persona</h2>
      <p className="text-sm text-muted">
        Este es el enlace de la app. Al abrirlo se ve cómo instalarla en Android o en iPhone.
      </p>
      <code className="break-words rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink">
        {enlace ? (
          <>
            {base}
            <wbr />
            {ruta}
          </>
        ) : (
          "…"
        )}
      </code>
      <button
        type="button"
        onClick={copiar}
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-ink transition duration-150 ease-app hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copiado ? "Copiado" : "Copiar enlace"}
      </button>
    </section>
  );
}
