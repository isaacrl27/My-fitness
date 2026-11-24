import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LockKeyhole, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoClave } from "@/components/app/campo-clave";
import { ContenedorLoginIluminado } from "@/components/ui/cordon-luz-login";
import { leerConfigNube } from "@/lib/config-nube";
import { COOKIE_SESION, invitacionCorrecta, rutaInterna, sesionValida } from "@/lib/sesion";

export const instant = false;

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

/*
 * Esta pantalla puede esperar: necesita leer de la dirección si la clave
 * falló. Es una página que se ve una vez, así que no pasa nada porque no
 * sea instantánea.
 */

/**
 * La puerta.
 *
 * Los usuarios no tienen que registrarse ni crear contraseñas propias:
 * es una clave fija que les proporciona Isaac o un enlace de invitación familiar.
 * Quien ya tiene la sesión iniciada en este móvil no vuelve a ver esta pantalla,
 * salvo que acceda explícitamente mediante ?invitacion=... o ?ver=1.
 */
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; siguiente?: string; ver?: string; invitacion?: string }>;
}) {
  const { error, siguiente, ver, invitacion } = await searchParams;
  const siguienteLimpio = rutaInterna(siguiente);

  // Si trae invitación o ?ver=1, siempre permitimos ver el ventilador y la tarjeta VIP.
  // En entrada limpia normal (/entrar a secas), si ya tiene sesión le mandamos a su día:
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value ?? "";
  if (!invitacion && ver !== "1" && (await sesionValida(token))) {
    redirect(siguienteLimpio !== "/" ? siguienteLimpio : "/hoy");
  }

  const config = await leerConfigNube();
  const esInvitacionValida = Boolean(invitacion && invitacionCorrecta(invitacion, config.invitacion));

  const falloInvitacion = error === "invitacion";
  const sinClave = error === "sin-clave";

  return (
    <div data-tema="oscuro" className="w-full">
      <ContenedorLoginIluminado>
        <main className="mx-auto flex w-full max-w-[430px] flex-col gap-4 px-6 pt-10 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] text-zinc-100">
          {esInvitacionValida ? (
            <div className="flex flex-col items-center gap-2.5 text-center">
              <span className="inline-flex h-13 w-13 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
                <Sparkles size={24} aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">¡Invitación de la familia!</h1>
              <p className="text-sm text-zinc-300">
                Tienes pase directo de parte de Isaac.{" "}
                <strong className="text-white font-semibold">No necesitas contraseña</strong>.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 text-center">
              <span className="inline-flex h-13 w-13 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                <LockKeyhole size={24} aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">Entra en My Fitness</h1>
              <p className="text-sm text-zinc-300">
                Esta es la app privada de la familia.{" "}
                <strong className="text-white font-semibold">No tienes que inventar ni crear una contraseña</strong>.
              </p>
            </div>
          )}

          {esInvitacionValida ? (
            <div className="rounded-xl border border-emerald-500/30 bg-[#13221b] p-4 text-sm text-zinc-200 shadow-lg text-center">
              <p className="font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                <Sparkles size={16} aria-hidden="true" />
                Acceso VIP verificado
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                Tira de la cuerda del ventilador para encender la luz y pulsa abajo para empezar.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-[#13221b] p-4 text-sm text-zinc-200 shadow-lg">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <MessageCircle size={16} aria-hidden="true" />
                ¿Cuál es la contraseña?
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                Es una clave de acceso que <strong className="text-white font-semibold">te debe proporcionar Isaac</strong>. Si
                todavía no la tienes o no te abre el enlace directo, pídesela a Isaac por WhatsApp.
              </p>
            </div>
          )}

          {sinClave ? (
            <div
              role="alert"
              className="rounded-md border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            >
              <p className="font-semibold">La app no está configurada.</p>
              <p className="mt-1">
                Falta la clave de entrada en el servidor, así que nadie puede pasar. Avisa a Isaac
                para que la ponga en Vercel.
              </p>
            </div>
          ) : null}

          {falloInvitacion ? (
            <p role="alert" className="rounded-md border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              Ese enlace directo ha caducado o no vale. Pídele a Isaac la clave de acceso.
            </p>
          ) : null}

          {sinClave ? null : esInvitacionValida ? (
            <form method="post" action="/api/entrar" className="flex flex-col gap-4">
              <input type="hidden" name="invitacion" value={invitacion} />
              {siguienteLimpio !== "/" ? <input type="hidden" name="siguiente" value={siguienteLimpio} /> : null}
              <Button type="submit" size="lg" className="w-full font-semibold shadow-lg shadow-emerald-500/20">
                Entrar a la app
              </Button>
            </form>
          ) : (
            <form method="post" action="/api/entrar" className="flex flex-col gap-4">
              {siguienteLimpio !== "/" ? <input type="hidden" name="siguiente" value={siguienteLimpio} /> : null}
              <CampoClave error={Boolean(error) && !falloInvitacion && !sinClave} />
              {error && !falloInvitacion && !sinClave ? (
                <p id="fallo-clave" role="alert" className="text-sm text-red-400">
                  Esa no es la clave. Comprueba los caracteres o pídesela a Isaac y prueba otra vez.
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full">
                Entrar a la app
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-zinc-400">
            Una vez que entres en tu móvil, la app te recordará y no volverá a pedirte la clave.
          </p>
        </main>
      </ContenedorLoginIluminado>
    </div>
  );
}
