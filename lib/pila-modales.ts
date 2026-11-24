/**
 * Pila global LIFO para modales, diálogos y hojas emergentes.
 *
 * Centraliza tres invariantes de interfaz que fallan cuando cada componente
 * toca `document.body` o escucha `Escape` por su cuenta:
 * 1. Bloqueo de scroll con contador de referencias: si un modal abre otro
 *    encima (por ejemplo `Confirmar` sobre `ModalFloCiclo`) y se cierran en
 *    cualquier orden, `body.style.overflow` solo se restaura cuando queda 0.
 * 2. Cierre exclusivo del modal superior: pulsar `Escape` o el botón atrás
 *    físico de Android cierra únicamente la ventana de arriba del todo. Si la
 *    ventana superior es obligatoria (sin `onCerrar`), no cierra por error una
 *    capa inferior.
 * 3. Trampa de foco (`Tab` / `Shift+Tab`) automática sobre el diálogo superior
 *    con `[aria-modal="true"]`, evitando que el teclado navegue por detrás.
 */

export interface EntradaPilaModal {
  id: symbol;
  onCerrar?: () => void;
  bloquearScroll: boolean;
}

const SELECTOR_ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const pila: EntradaPilaModal[] = [];

export type OyentePilaModal = (cantidad: number) => void;
const oyentesPila: Set<OyentePilaModal> = new Set();

function notificarOyentes(): void {
  for (const oyente of oyentesPila) {
    try {
      oyente(pila.length);
    } catch {
      // Evitar que el error de un observador interrumpa el ciclo del resto
    }
  }
}

/**
 * Suscribe un observador a los cambios de la pila de modales.
 * Llama inmediatamente al oyente con la cantidad actual y devuelve la función
 * para desuscribirse limpiamente.
 */
export function suscribirPilaModales(oyente: OyentePilaModal): () => void {
  oyentesPila.add(oyente);
  try {
    oyente(pila.length);
  } catch {}
  return () => {
    oyentesPila.delete(oyente);
  };
}

/** Comprueba si actualmente existe al menos un modal, hoja o diálogo abierto. */
export function hayModalAbierto(): boolean {
  return pila.length > 0;
}

let bloqueosActivos = 0;
let overflowOriginal = "";
let paddingRightOriginal = "";
let escuchandoTeclado = false;

function aplicarBloqueoScroll(): void {
  if (typeof document === "undefined" || !document.body) return;
  if (bloqueosActivos === 0) {
    overflowOriginal = document.body.style.overflow;
    paddingRightOriginal = document.body.style.paddingRight;
    const anchoScrollbar =
      typeof window !== "undefined" && document.documentElement
        ? window.innerWidth - document.documentElement.clientWidth
        : 0;
    document.body.style.overflow = "hidden";
    if (anchoScrollbar > 0) {
      document.body.style.paddingRight = `${anchoScrollbar}px`;
    }
  }
  bloqueosActivos += 1;
}

function liberarBloqueoScroll(): void {
  if (bloqueosActivos <= 0) return;
  bloqueosActivos -= 1;
  if (bloqueosActivos === 0 && typeof document !== "undefined" && document.body) {
    document.body.style.overflow = overflowOriginal;
    document.body.style.paddingRight = paddingRightOriginal;
  }
}

/**
 * Intenta cerrar únicamente el modal situado en la cima de la pila.
 * Devuelve `true` si había un modal superior con `onCerrar` y se invocó.
 */
export function cerrarModalSuperior(): boolean {
  if (pila.length === 0) return false;
  const tope = pila[pila.length - 1];
  if (!tope.onCerrar) return false;
  tope.onCerrar();
  return true;
}

/** Número actual de modales abiertos en la pila (útil para diagnósticos y tests). */
export function cantidadModalesAbiertos(): number {
  return pila.length;
}

/** Reinicia la pila (uso exclusivo en pruebas unitarias). */
export function reiniciarPilaModalesParaTests(): void {
  while (pila.length > 0) {
    const entrada = pila.pop();
    if (entrada?.bloquearScroll) liberarBloqueoScroll();
  }
  desinstalarOyenteTeclado();
  notificarOyentes();
}

function obtenerDialogoSuperior(): HTMLElement | null {
  if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") {
    return null;
  }
  const modales = document.querySelectorAll<HTMLElement>('[aria-modal="true"]');
  if (modales.length === 0) return null;
  return modales[modales.length - 1] ?? null;
}

function manejarTecladoGlobal(e: KeyboardEvent): void {
  if (pila.length === 0) return;

  if (e.key === "Escape") {
    const tope = pila[pila.length - 1];
    if (tope?.onCerrar) {
      e.preventDefault();
      e.stopPropagation();
      tope.onCerrar();
    }
    return;
  }

  if (e.key === "Tab") {
    const dialogo = obtenerDialogoSuperior();
    if (!dialogo) return;
    const candidatos = Array.from(dialogo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (candidatos.length === 0) {
      e.preventDefault();
      return;
    }
    const primero = candidatos[0];
    const ultimo = candidatos[candidatos.length - 1];
    const activo = document.activeElement as HTMLElement | null;
    const dentro = activo ? dialogo.contains(activo) : false;

    if (e.shiftKey) {
      if (!dentro || activo === primero) {
        e.preventDefault();
        ultimo.focus();
      }
    } else if (!dentro || activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }
}

function instalarOyenteTeclado(): void {
  if (escuchandoTeclado || typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return;
  }
  window.addEventListener("keydown", manejarTecladoGlobal);
  escuchandoTeclado = true;
}

function desinstalarOyenteTeclado(): void {
  if (!escuchandoTeclado || typeof window === "undefined" || typeof window.removeEventListener !== "function") {
    return;
  }
  window.removeEventListener("keydown", manejarTecladoGlobal);
  escuchandoTeclado = false;
}

/**
 * Registra un modal abierto en la pila LIFO y devuelve su función de retirada
 * idempotente. Permite actualizar `onCerrar` en caliente sin desapilar.
 */
export function apilarModal(opciones: {
  onCerrar?: () => void;
  bloquearScroll?: boolean;
}): {
  actualizarOnCerrar: (nuevo?: () => void) => void;
  desapilar: () => void;
} {
  const entrada: EntradaPilaModal = {
    id: Symbol("modal"),
    onCerrar: opciones.onCerrar,
    bloquearScroll: opciones.bloquearScroll ?? true,
  };

  pila.push(entrada);
  if (entrada.bloquearScroll) {
    aplicarBloqueoScroll();
  }
  instalarOyenteTeclado();
  notificarOyentes();

  let retirado = false;

  return {
    actualizarOnCerrar(nuevo?: () => void) {
      entrada.onCerrar = nuevo;
    },
    desapilar() {
      if (retirado) return;
      retirado = true;
      const idx = pila.findIndex((item) => item.id === entrada.id);
      if (idx !== -1) {
        pila.splice(idx, 1);
      }
      if (entrada.bloquearScroll) {
        liberarBloqueoScroll();
      }
      if (pila.length === 0) {
        desinstalarOyenteTeclado();
      }
      notificarOyentes();
    },
  };
}
