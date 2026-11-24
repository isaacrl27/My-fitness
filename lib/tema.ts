/**
 * El tema de la app: claro, oscuro o «como el móvil».
 *
 * Se guarda en el propio móvil (localStorage) y se aplica poniendo
 * data-tema="oscuro" en el <html>: los colores oscuros están en theme.css
 * bajo ese atributo, así que todo lo demás (texto, fondos, botones) cambia
 * solo. La cortina de carga no cambia: es verde de marca y se ve bien en los
 * dos temas.
 *
 * El script `SCRIPT_TEMA` corre antes de pintar nada (en el <head>), para que
 * quien tenga el móvil en oscuro no vea un destello blanco al abrir, y deja
 * conectado un oyente sobre `prefers-color-scheme` para que si el móvil cambia
 * entre día y noche con la app abierta (y el tema está en «sistema»), la app
 * cambie al instante con él.
 */

export type Tema = "sistema" | "claro" | "oscuro";

/** La marca de este móvil, igual que las demás claves de la app. */
export const CLAVE_TEMA = "mi-peso:tema";

export const COLOR_TEMA_CLARO = "#0e5f49";
export const COLOR_TEMA_OSCURO = "#0f1512";

/** Lo que venga guardado vale si es «claro» u «oscuro»; el resto, «sistema». */
export function normalizarTema(valor: unknown): Tema {
  return valor === "claro" || valor === "oscuro" ? valor : "sistema";
}

/** ¿Con este tema se ve la app en oscuro? */
export function esOscuro(tema: Tema, prefiereOscuro: boolean): boolean {
  return tema === "oscuro" || (tema === "sistema" && prefiereOscuro);
}

/** El tema elegido por la persona (si nunca eligió, «sistema»). */
export function leerTema(): Tema {
  if (typeof window === "undefined") return "sistema";
  try {
    return normalizarTema(window.localStorage.getItem(CLAVE_TEMA));
  } catch {
    return "sistema";
  }
}

/**
 * Pinta la app con el tema elegido ahora mismo.
 *
 * Además de data-tema en <html>:
 * 1. Pone `color-scheme: dark | light` y `background-color` en el elemento raíz
 *    y en el body para que el lienzo del navegador y el rebote elástico
 *    (overscroll arriba y abajo en iPhone y Android) tomen el color correcto
 *    y nunca muestren franjas blancas en modo oscuro.
 * 2. Actualiza `<meta name="theme-color">` quitando la condición media, para
 *    que quien tenga el móvil en claro pero elija «Oscuro» en la app vea la
 *    barra de estado y las esquinas en oscuro sin desajustes.
 */
export function aplicarTema(tema: Tema): void {
  if (typeof window === "undefined") return;
  const oscuro = esOscuro(tema, window.matchMedia("(prefers-color-scheme: dark)").matches);
  const doc = document.documentElement;
  doc.setAttribute("data-tema", oscuro ? "oscuro" : "claro");
  doc.style.colorScheme = oscuro ? "dark" : "light";
  doc.style.backgroundColor = oscuro ? COLOR_TEMA_OSCURO : "#ffffff";
  if (document.body) {
    document.body.style.backgroundColor = oscuro ? COLOR_TEMA_OSCURO : "#ffffff";
  }

  const color = oscuro ? COLOR_TEMA_OSCURO : COLOR_TEMA_CLARO;
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length > 0) {
    metas.forEach((m) => {
      m.removeAttribute("media");
      m.setAttribute("content", color);
    });
  }
}

/** Guarda la elección y la aplica sin recargar. */
export function guardarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin sitio para guardar: al menos se aplica ahora.
  }
  aplicarTema(tema);
}

/**
 * Escucha cambios en vivo del esquema de color del sistema operativo y
 * reaplica el tema si el usuario eligió «Como el móvil» (`sistema`).
 */
export function escucharCambioTemaSistema(): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const alCambiar = () => {
    if (leerTema() === "sistema") {
      aplicarTema("sistema");
    }
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }
  if (typeof mq.addListener === "function") {
    mq.addListener(alCambiar);
    return () => mq.removeListener(alCambiar);
  }
  return () => {};
}

/**
 * El script que corre antes de pintar. Va dentro del layout como texto: no
 * puede depender de ningún módulo (se ejecuta antes de que la app arranque)
 * y mantiene sincronizado `data-tema` si el móvil cambia de claro a oscuro.
 */
export const SCRIPT_TEMA = `(function(){function aplicar(){try{var t=localStorage.getItem("${CLAVE_TEMA}");var mq=window.matchMedia("(prefers-color-scheme: dark)");var oscuro=t==="oscuro"||(t!=="claro"&&mq.matches);var d=document.documentElement;d.setAttribute("data-tema",oscuro?"oscuro":"claro");d.style.colorScheme=oscuro?"dark":"light";d.style.backgroundColor=oscuro?"${COLOR_TEMA_OSCURO}":"#ffffff";if(document.body){document.body.style.backgroundColor=oscuro?"${COLOR_TEMA_OSCURO}":"#ffffff";}var c=oscuro?"${COLOR_TEMA_OSCURO}":"${COLOR_TEMA_CLARO}";var ms=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<ms.length;i++){ms[i].removeAttribute("media");ms[i].setAttribute("content",c);}return mq;}catch(e){return null;}}var m=aplicar();if(m){var fn=function(){try{var t=localStorage.getItem("${CLAVE_TEMA}");if(t!=="claro"&&t!=="oscuro"){aplicar();}}catch(e){aplicar();}};if(m.addEventListener){m.addEventListener("change",fn);}else if(m.addListener){m.addListener(fn);}}})();`;
