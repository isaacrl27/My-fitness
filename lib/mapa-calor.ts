/**
 * Lógica pura de cálculo para el mapa de calor de actividad (Heatmap estilo GitHub / Rare UI).
 *
 * Sin dependencias externas, 100% testeable y resistente a cambios de año/mes.
 */

import { rachaActual, diasConActividad } from "./racha.ts";
import { conComaSinCeros, enPalabras } from "./calculos.ts";

export type NivelActividad = 0 | 1 | 2 | 3 | 4;

export type DiaCalor = {
  fechaISO: string;
  fechaTexto: string;
  diaSemana: number; // 0 = Lunes, 6 = Domingo
  nivel: NivelActividad;
  totalActividades: number;
  detalles: string[];
  esHoy: boolean;
  esFuturo: boolean;
};

export type DatosMapaCalor = {
  comidas: { fecha: string }[];
  pesadas: { fecha: string; kg: number }[];
  aguaLitros?: Record<string, number>;
  habitosHechos?: Record<string, string[]>;
};

export function generarMapaCalor(
  datos: DatosMapaCalor,
  hoyStr: string,
  numSemanas = 12
): {
  columnas: DiaCalor[][];
  diasTotales: number;
  diasActivos: number;
  racha: number;
} {
  const hoyDate = new Date(`${hoyStr}T12:00:00`);
  const diaSemanaHoy = (hoyDate.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo

  // Encontrar el domingo de la semana actual
  const finSemanaActual = new Date(hoyDate);
  finSemanaActual.setDate(hoyDate.getDate() + (6 - diaSemanaHoy));

  // Encontrar el lunes de inicio (numSemanas atrás)
  const inicioLunes = new Date(finSemanaActual);
  inicioLunes.setDate(finSemanaActual.getDate() - (numSemanas * 7 - 1));

  // Mapeos rápidos para O(1)
  const comidasPorDia: Record<string, number> = {};
  for (const c of datos.comidas) {
    const f = c.fecha.slice(0, 10);
    comidasPorDia[f] = (comidasPorDia[f] ?? 0) + 1;
  }

  const pesadaPorDia: Record<string, number> = {};
  for (const p of datos.pesadas) {
    const f = p.fecha.slice(0, 10);
    pesadaPorDia[f] = p.kg;
  }

  const columnas: DiaCalor[][] = [];
  const cur = new Date(inicioLunes);
  let columnaActual: DiaCalor[] = [];
  let diasActivosContador = 0;
  let diasTotalesContador = 0;

  for (let s = 0; s < numSemanas; s++) {
    columnaActual = [];
    for (let d = 0; d < 7; d++) {
      const anio = cur.getFullYear();
      const mes = String(cur.getMonth() + 1).padStart(2, "0");
      const dia = String(cur.getDate()).padStart(2, "0");
      const fISO = `${anio}-${mes}-${dia}`;

      const esHoy = fISO === hoyStr;
      const esFuturo = fISO > hoyStr;

      const numComidas = comidasPorDia[fISO] ?? 0;
      const kgPesada = pesadaPorDia[fISO];
      const litrosAgua = datos.aguaLitros?.[fISO] ?? 0;
      const numHabitos = datos.habitosHechos?.[fISO]?.length ?? 0;

      const detalles: string[] = [];
      let total = 0;

      if (!esFuturo) {
        diasTotalesContador++;
        if (numComidas > 0) {
          total++;
          detalles.push(`${numComidas} comida${numComidas > 1 ? "s" : ""}`);
        }
        if (kgPesada !== undefined) {
          total++;
          detalles.push(`Pesada (${conComaSinCeros(kgPesada)} kg)`);
        }
        if (litrosAgua > 0) {
          total++;
          detalles.push(`${conComaSinCeros(litrosAgua)} L agua`);
        }
        if (numHabitos > 0) {
          total++;
          detalles.push(`${numHabitos} hábito${numHabitos > 1 ? "s" : ""}`);
        }
        if (total > 0) {
          diasActivosContador++;
        }
      }

      // Nivel 0 a 4
      const nivel: NivelActividad = esFuturo ? 0 : (Math.min(4, total) as NivelActividad);

      columnaActual.push({
        fechaISO: fISO,
        fechaTexto: enPalabras(fISO),
        diaSemana: d,
        nivel,
        totalActividades: total,
        detalles,
        esHoy,
        esFuturo,
      });

      cur.setDate(cur.getDate() + 1);
    }
    columnas.push(columnaActual);
  }

  const setDias = diasConActividad({
    comidas: datos.comidas,
    pesadas: datos.pesadas,
    aguaLitros: datos.aguaLitros,
    habitosHechos: datos.habitosHechos,
  });

  const racha = rachaActual(setDias, hoyStr);

  return {
    columnas,
    diasTotales: diasTotalesContador,
    diasActivos: diasActivosContador,
    racha,
  };
}
