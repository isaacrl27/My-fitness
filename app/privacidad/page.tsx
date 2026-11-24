import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Cookie,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { BotonAceptarPrivacidad } from "@/components/app/boton-aceptar-privacidad";

export const metadata: Metadata = {
  title: "Privacidad y Cookies — My Fitness",
  description: "Política de privacidad y cookies de My Fitness: transparencia total sobre a qué tiene acceso Isaac y a qué no.",
  robots: { index: false, follow: false },
};

/**
 * Política de privacidad y cookies de My Fitness.
 *
 * Es pública para poder leerse sin clave (obligatorio para Android Health Connect)
 * y explica de forma clara y directa a la familia y amigos cómo se tratan sus datos.
 */
export default function PaginaPrivacidad() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-6 px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1rem))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1rem))]">
      {/* Botón de retorno para PWA e iPhone */}
      <Link
        href="/hoy"
        className="inline-flex h-10 w-fit items-center gap-2 text-sm font-semibold text-accent transition duration-150 ease-app hover:opacity-80"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a la app
      </Link>

      {/* Cabecera */}
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent shadow-sm">
          <ShieldCheck size={32} aria-hidden="true" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles size={13} aria-hidden="true" />
          Versión Alfa de Isaac
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Privacidad y Cookies
        </h1>
        <p className="text-sm text-muted">
          Transparencia absoluta: lo que hace My Fitness con tus datos, a qué tiene acceso Isaac y a qué no.
        </p>
      </header>

      {/* El compromiso de Isaac */}
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-ink">
          <Lock size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-base font-semibold">El compromiso de privacidad</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Esta app es una <strong className="font-semibold text-ink">versión Alfa de pruebas</strong> desarrollada por <strong className="font-semibold text-ink">Isaac</strong> para su familia y amigos, como una herramienta útil para comer mejor y cuidarnos sin obsesiones.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Tu cuerpo, tu peso y lo que comes son datos <strong className="font-semibold text-ink">estrictamente personales e íntimos</strong>. La app está construida con el principio de privacidad por diseño: <span className="underline decoration-accent underline-offset-2">Isaac no cotillea ni tiene acceso a tu vida privada</span>.
        </p>
      </section>

      {/* A lo que NO tiene acceso */}
      <section className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-surface p-5">
        <div className="flex items-center gap-2 text-ink">
          <EyeOff size={18} className="text-warning" aria-hidden="true" />
          <h2 className="text-base font-semibold">A lo que Isaac NO tiene acceso</h2>
        </div>
        <p className="text-xs text-muted">
          Cosas que nunca verá nadie más que tú en tu propio móvil:
        </p>
        <ul className="flex flex-col gap-2.5 pt-1">
          <li className="flex items-start gap-2.5 text-sm">
            <XCircle size={17} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Tu peso y báscula:</strong> Isaac no sabe cuánto pesas, si has subido o bajado de peso, ni cuál es tu objetivo.
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <XCircle size={17} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Lo que comes a diario:</strong> Ni tus desayunos, comidas, cenas, cantidades ni si te has comido un capricho.
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <XCircle size={17} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Tus fotos de comida:</strong> Si usas la cámara o el texto para estimar un plato con IA, el servidor envía solo esa consulta (sin tu nombre ni tu cuenta) a la IA de Google Gemini para calcular los nutrientes al momento y <strong className="font-medium text-ink">no guarda la foto en ningún álbum ni base de datos propia</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <XCircle size={17} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Tu móvil o reloj (Salud / Health Connect):</strong> La app solo lee pasos y sueño si tú le das permiso en tu móvil. Isaac no tiene acceso a tu teléfono ni a tus contactos o ubicación.
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <XCircle size={17} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Tus hábitos y gustos:</strong> La lista de alimentos que no te gustan o tus hábitos diarios se quedan en tu perfil privado.
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <XCircle size={17} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Sin publicidad ni venta de datos:</strong> Cero anuncios y cero venta o cesión comercial de tu información. Solo intervienen los servicios técnicos necesarios cuando tú usas cada función (Vercel y Supabase para alojar la app y la copia cifrada, Google Gemini sin tu nombre al consultar la IA o clasificar el buzón, Open Food Facts al buscar códigos de barras y YouTube en modo sin cookies si abres un vídeo de ejercicio).
            </span>
          </li>
        </ul>
      </section>

      {/* A lo que SÍ se tiene acceso técnico */}
      <section className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-surface p-5">
        <div className="flex items-center gap-2 text-ink">
          <Eye size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-base font-semibold">A lo que SÍ se tiene acceso técnico</h2>
        </div>
        <p className="text-xs text-muted">
          Solo los elementos imprescindibles para que la app funcione y te pueda dar soporte:
        </p>
        <ul className="flex flex-col gap-2.5 pt-1">
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Copia de seguridad en la nube:</strong> Si activas la nube con tu código personal, tus datos se guardan aislados en una base de datos segura (Supabase) bajo tu código anónimo, para que no los pierdas si cambias de móvil. Solo quien conozca tu código puede restaurarlos.
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Mensajes que envíes al buzón:</strong> Si tú voluntariamente escribes en <em>Ajustes → Ayuda → Buzón</em> (para pedir una mejora o avisar de un error), ese mensaje le llega a Isaac por Telegram para poder ayudarte y solucionarlo.
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span className="text-muted">
              <strong className="font-medium text-ink">Métricas anónimas del servidor:</strong> Para saber si los servidores están encendidos o si hay algún error técnico general en la web.
            </span>
          </li>
        </ul>
      </section>

      {/* Política de Cookies y Almacenamiento Local */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-ink">
          <Cookie size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-base font-semibold">Política de Cookies y Almacenamiento</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          My Fitness <strong className="font-medium text-ink">NO utiliza cookies publicitarias, de rastreo ni de terceros</strong> (sin píxeles de Facebook, sin Google Ads, sin rastreadores comerciales).
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Al usar la app en esta versión Alfa, solo das acceso a <strong className="font-medium text-ink">esto y poco más</strong>:
        </p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span><strong className="text-ink">Almacenamiento en tu propio móvil (localStorage):</strong> para recordar tu tema visual, tamaño de letra y las compras tachadas en el súper.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span><strong className="text-ink">Copia en la nube:</strong> con tu código único si decides no perder los datos.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span><strong className="text-ink">Pasos y sueño:</strong> solo si tú decides activar la conexión con Salud.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span><strong className="text-ink">Sesión técnica:</strong> una cookie segura para no pedirte la contraseña en cada visita.</span>
          </li>
        </ul>
        <p className="text-xs text-muted pt-1">
          Y poco más: ni Isaac ni terceras empresas tienen acceso a tu báscula, tus platos ni tu información íntima.
        </p>
      </section>

      {/* Cómo borrarlo todo */}
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-ink">
          <Trash2 size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-base font-semibold">Tus derechos: cómo borrarlo todo</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Tú tienes el control total en todo momento. En <strong className="font-medium text-ink">Ajustes → Nube → Eliminar cuenta</strong> puedes borrar todos tus datos con un solo toque. Se borran de tu móvil y de la nube inmediatamente sin dejar copias.
        </p>
      </section>

      {/* Botón de aceptación interactivo */}
      <BotonAceptarPrivacidad />

      <footer className="pt-2 text-center text-xs text-muted">
        My Fitness · Versión Alfa para familia y amigos · Sin anuncios ni rastreo
      </footer>
    </main>
  );
}
