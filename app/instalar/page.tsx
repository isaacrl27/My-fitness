import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Share, Smartphone } from "lucide-react";
import { EnlaceCompartir } from "@/components/app/enlace-compartir";

export const metadata: Metadata = {
  title: "Instalar My Fitness",
  robots: { index: false, follow: false },
};

/**
 * La página que se manda a la familia.
 *
 * Explica las dos formas de tenerla, en el orden en el que se van a encontrar
 * el móvil: Android con su archivo, iPhone con la web en la pantalla de inicio.
 * Todo en lenguaje de casa: nada de «APK», «PWA» ni «certificado».
 */
export default function PaginaInstalar() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-6 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1rem))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1rem))]">
      <div className="flex flex-col gap-3">
        <Link
          href="/hoy"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-accent"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la app
        </Link>
        <h1 className="text-2xl text-ink">Instalar My Fitness</h1>
        <p className="text-base text-muted">
          Elige tu móvil. Son dos minutos y no hay que pagar nada.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-md bg-surface p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Smartphone size={20} aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-ink">Android</h2>
        </div>
        <p className="text-base text-muted">
          Tienes dos formas de tenerla en tu móvil:
        </p>

        <div className="flex flex-col gap-2 rounded-md border border-border bg-bg p-3.5">
          <h3 className="text-sm font-semibold text-ink">
            Opción 1: La más fácil (rápida y sin avisos)
          </h3>
          <p className="text-sm text-muted">
            Toca los <strong className="text-ink">tres puntos (⋮)</strong> arriba a la derecha de Chrome y dale a <strong className="text-ink">«Instalar aplicación»</strong> o <strong className="text-ink">«Añadir a pantalla de inicio»</strong>. Se instala en dos segundos y no sale ningún aviso de archivo desconocido.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-3.5">
          <h3 className="text-sm font-semibold text-ink">
            Opción 2: Con pasos y sueño automáticos (archivo)
          </h3>
          <p className="text-sm text-muted">
            Si llevas pulsera o reloj inteligente y quieres que lea tus pasos y sueño solos, descarga el archivo de la app:
          </p>
          <a
            href="/descargas/my-fitness-android.apk"
            download=""
            className="inline-flex h-[48px] items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-on-accent transition duration-150 ease-app hover:brightness-95 active:brightness-90"
          >
            <Download size={18} aria-hidden="true" />
            Descargar la app para Android
          </a>
          <div className="flex flex-col gap-1 text-xs text-muted">
            <p>
              • Al descargar, si Chrome dice <em>«archivo potencialmente dañino»</em>, dale a <strong className="text-ink">Descargar de todos modos</strong>.
            </p>
            <p>
              • Si Play Protect dice <em>«Bloqueada por Play Protect»</em> o <em>«Desarrollador desconocido»</em>, toca en <strong className="text-ink">«Más detalles»</strong> y luego en <strong className="text-ink">«Instalar de todas formas»</strong>. Es 100% segura; solo sale porque no está en la tienda oficial de Google.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md bg-surface p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Share size={20} aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-ink">iPhone</h2>
        </div>
        <p className="text-base text-muted">
          No hay que descargar nada: la web se queda como una app más en la pantalla de inicio.
        </p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-base text-muted">
          <li>Abre esta web con <strong className="text-ink">Safari</strong> (no con Chrome).</li>
          <li>
            <span className="inline-flex items-center gap-1.5">
              Toca el botón de compartir,
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block h-4 w-4 text-ink align-[-0.15em]"
                aria-hidden="true"
              >
                {/* Cuadrado abierto por arriba con la flecha saliendo. */}
                <path d="M12 3v12" />
                <path d="M8 7l4-4 4 4" />
                <path d="M6 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
              </svg>
              , el cuadrado con la flecha hacia arriba.
            </span>
          </li>
          <li>
            Baja y toca <strong className="text-ink">Añadir a pantalla de inicio</strong>.
          </li>
          <li>
            Abre My Fitness desde el icono nuevo, entra (con el enlace o con la clave) y haz el cuestionario.
          </li>
        </ol>
        <p className="text-sm text-muted">
          En iPhone los pasos y el sueño los apuntas a mano en Hoy, en la tarjeta «Pasos y sueño».
          Si algún día quieres, hay un Atajo de iPhone que los manda solo; pídemelo y te lo paso.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-md bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Cuando ya esté dentro</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base text-muted">
          <li>Haz el cuestionario una vez: con eso la app calcula lo tuyo.</li>
          <li>
            En <strong className="text-ink">Ajustes</strong> sale un{" "}
            <strong className="text-ink">código de rescate</strong> de seis letras. Apúntalo: es lo
            que te devuelve tus datos si cambias de móvil.
          </li>
          <li>
            Si te sale un aviso de notificaciones, acéptalo: así te aviso de lo del día. Si no,
            funciona igual.
          </li>
        </ul>
      </section>

      <EnlaceCompartir />

      <p className="text-center text-sm text-muted">
        Si algo no sale, escríbeme y lo miro. Esto es una beta: cuanto más lo uses, mejor se queda.
      </p>
    </main>
  );
}
