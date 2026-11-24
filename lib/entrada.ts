/**
 * Cuándo ha terminado la cortina de carga.
 *
 * La cortina tapa la app entera al abrir. Si el anillo de Hoy anima debajo, la
 * persona no lo ve: cuando la cortina sube, el anillo ya está quieto. Con esto,
 * la cortina avisa de que ya se ha ido y el anillo arranca entonces.
 *
 * Es una variable de módulo, como la marca de «ya se vio la carga»: sobrevive a
 * cambiar de pestaña (el armazón no se recarga) y vuelve a cero al recargar la
 * página, que es justo cuando toca enseñar la cortina otra vez.
 */
let quitada = false;
const oyentes = new Set<() => void>();

/** Si la cortina ya no tapa la app en esta apertura. */
export function entradaQuitada(): boolean {
  return quitada;
}

/** Avisa de que la cortina ya se fue. Solo hace algo la primera vez. */
export function marcarEntradaQuitada(): void {
  if (quitada) return;
  quitada = true;
  for (const oyente of oyentes) oyente();
}

/** Reinicia la marca de cortina al reabrir la app tras estar en segundo plano. */
export function reiniciarEntrada(): void {
  if (!quitada) return;
  quitada = false;
  for (const oyente of oyentes) oyente();
}

/** Suscripción para que la pantalla que espera la cortina se entere. */
export function suscribirEntrada(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
