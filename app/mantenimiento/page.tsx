import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { RecargarSola } from "@/components/app/recargar-sola";

export const metadata: Metadata = {
  title: "My Fitness — en mantenimiento",
  robots: { index: false, follow: false },
};

/**
 * El cartel que se ve mientras Isaac toca la app.
 *
 * No se llega aquí por un enlace: la puerta (`proxy.ts`) reescribe cualquier
 * pantalla a esta mientras el mantenimiento está encendido, con un 503. Por eso
 * no lleva menú ni botones: solo el aviso y una recarga sola cada minuto, para
 * que la familia vuelva sin hacer nada cuando se apague.
 */
export default function PaginaMantenimiento() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center gap-5 px-6 pt-[max(3rem,calc(env(safe-area-inset-top)+1.5rem))] pb-[max(3rem,calc(env(safe-area-inset-bottom)+1.5rem))] text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Wrench size={26} aria-hidden="true" />
      </span>
      <h1 className="text-2xl text-ink">Estamos mejorando la app</h1>
      <p className="text-base text-muted">
        Isaac está haciendo unos arreglos. Vuelve en un rato: esta pantalla se abre sola en cuanto
        esté lista, sin que tengas que hacer nada.
      </p>
      <p className="text-sm text-muted">Tus datos están guardados y no se pierde nada.</p>
      <RecargarSola />
    </main>
  );
}
