import type { Comida } from "./store";

/**
 * Repartir y sumar comidas, sin pantalla.
 *
 * Estas funciones viven aquí (y no en `store.tsx`) porque las necesitan tanto
 * la app del móvil como el servidor: `store.tsx` es de cliente («use client»)
 * y una dirección del servidor no puede cargarlo. El tipo `Comida` se importa
 * como tipo a secas, que el compilador lo borra antes de arrancar.
 */

/** Las comidas de un día concreto. */
export function comidasDelDia(comidas: Comida[], fecha: string): Comida[] {
  return comidas.filter((c) => c.fecha === fecha);
}

/** Suma de calorías y macros de un conjunto de comidas. */
export function sumar(comidas: Comida[]) {
  return comidas.reduce(
    (total, comida) => {
      for (const a of comida.alimentos) {
        total.kcal += a.kcal;
        total.proteinas += a.proteinas;
        total.carbohidratos += a.carbohidratos;
        total.grasas += a.grasas;
      }
      return total;
    },
    { kcal: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
  );
}
