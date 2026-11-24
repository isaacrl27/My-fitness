/**
 * Lógica matemática y utilidades para las carpetas interactivas
 * con despliegue en abanico (Rare UI / Microinteracciones fluidas).
 */

export interface TransformAbanico {
  rotacionDeg: number;
  xPx: number;
  yPx: number;
  zIndex: number;
  opacidad: number;
}

/**
 * Calcula la posición espacial, rotación y capa de cada tarjeta
 * dentro o fuera de la carpeta, formando un abanico simétrico con elevación central.
 */
export function calcularTransformAbanico(
  index: number,
  total: number,
  abierto: boolean,
  indiceHover?: number | null,
): TransformAbanico {
  const seguroTotal = Math.max(1, total);

  if (!abierto) {
    // Apiladas ordenadas dentro de la carpeta con un ligero asomo
    return {
      rotacionDeg: Number(((index - 1) * 1.5).toFixed(1)),
      xPx: Math.round((index - (seguroTotal - 1) / 2) * 2),
      yPx: -Math.min(index * 5, 15),
      zIndex: index + 1,
      opacidad: 0.95,
    };
  }

  // Despliegue en abanico elástico
  const mid = (seguroTotal - 1) / 2;
  const pasoX = seguroTotal <= 3 ? 34 : 26;
  const pasoRot = seguroTotal <= 3 ? 10 : 7;
  const offset = index - mid;

  // Arco con cúspide suave en el centro
  const normalizado = mid === 0 ? 0 : offset / mid;
  const curvatura = 1 - Math.pow(normalizado, 2);
  const elevacion = -48 - curvatura * 14;

  const esHover = indiceHover === index;

  return {
    rotacionDeg: esHover ? 0 : Math.round(offset * pasoRot),
    xPx: Math.round(offset * pasoX),
    yPx: Math.round(esHover ? elevacion - 14 : elevacion),
    zIndex: esHover ? 50 : index + 10,
    opacidad: 1,
  };
}

/**
 * Genera el string CSS transform a partir de los cálculos geométricos.
 */
export function estiloTransformAbanico(t: TransformAbanico): React.CSSProperties {
  return {
    transform: `translate3d(${t.xPx}px, ${t.yPx}px, 0px) rotate(${t.rotacionDeg}deg)`,
    zIndex: t.zIndex,
    opacity: t.opacidad,
    transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, opacity 0.3s ease",
  };
}
