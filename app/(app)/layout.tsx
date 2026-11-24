import { AvisoNovedades } from "@/components/app/aviso-novedades";
import { BannerPrivacidad } from "@/components/app/banner-privacidad";
import { ModalCelebracionRajatabla } from "@/components/app/modal-celebracion-rajatabla";
import { ModalMensajeIsaac } from "@/components/app/modal-mensaje-isaac";
import { ContenedorTostada } from "@/components/ui/tostada";
import { ContenedorReacciones } from "@/components/ui/reacciones-flotantes";
import { Guardia } from "@/components/app/guardia";
import { NavInferior } from "@/components/app/nav-inferior";
import { RegistroSinCobertura } from "@/components/app/registro-sin-cobertura";
import { RepararAvisos } from "@/components/app/seccion-avisos";
import { TransicionRuta } from "@/components/app/transicion-ruta";
import { ContenedorPushBack } from "@/components/ui/contenedor-push-back";

/**
 * Armazón de la app: la barra de pestañas abajo y la pantalla en medio.
 * Cada pantalla decide por su cuenta si todavía está leyendo los datos.
 *
 * El servicio que guarda la app para sin cobertura va aquí y no en la raíz:
 * solo se registra cuando ya se ha pasado la puerta, que es cuando el
 * navegador puede pedir los archivos sin que le redirijan.
 */
export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-bg sm:bg-surface sm:px-4 sm:py-4">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-bg text-ink sm:min-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border sm:border-border/80 sm:shadow-card sm:overflow-x-clip">
        <RegistroSinCobertura />
        <RepararAvisos />
        <Guardia />
        <ContenedorPushBack>
          <TransicionRuta>{children}</TransicionRuta>
          <NavInferior />
        </ContenedorPushBack>
        <BannerPrivacidad />
        <AvisoNovedades />
        <ModalMensajeIsaac />
        <ModalCelebracionRajatabla />
        <ContenedorTostada />
        <ContenedorReacciones />
      </div>
    </div>
  );
}
