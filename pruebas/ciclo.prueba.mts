import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularEstadoCiclo,
  cicloPorDefecto,
  debeMostrarCiclo,
  diasEntreFechas,
  sumarDiasISO,
  type DatosCiclo,
} from "../lib/ciclo.ts";

describe("Motor de Ciclo Menstrual (Flo)", () => {
  it("diasEntreFechas calcula la diferencia exacta en días", () => {
    assert.equal(diasEntreFechas("2026-10-01", "2026-10-15"), 14);
    assert.equal(diasEntreFechas("2026-10-15", "2026-10-15"), 0);
    assert.equal(diasEntreFechas("2026-10-10", "2026-10-05"), -5);
  });

  it("sumarDiasISO suma días preservando el formato ISO", () => {
    assert.equal(sumarDiasISO("2026-10-01", 5), "2026-10-06");
    assert.equal(sumarDiasISO("2026-10-25", 7), "2026-11-01");
  });

  it("detecta fase de menstruación en los primeros 5 días con alerta de retención", () => {
    const ciclo: DatosCiclo = {
      activo: true,
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-10-23", // Hace 2 días -> Día 3 del ciclo
    };

    const estado = calcularEstadoCiclo(ciclo, "2026-10-25");
    assert.ok(estado);
    assert.equal(estado.diaDelCiclo, 3);
    assert.equal(estado.fase, "menstruacion");
    assert.equal(estado.esFaseRetencion, true);
    assert.ok(estado.retencionEstimadaKg.includes("+0,5"));
  });

  it("detecta fase folicular tras la regla", () => {
    const ciclo: DatosCiclo = {
      activo: true,
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-10-17", // Hace 8 días -> Día 9 del ciclo
    };

    const estado = calcularEstadoCiclo(ciclo, "2026-10-25");
    assert.ok(estado);
    assert.equal(estado.diaDelCiclo, 9);
    assert.equal(estado.fase, "folicular");
    assert.equal(estado.esFaseRetencion, false);
  });

  it("detecta fase de ovulación alrededor del día 14", () => {
    const ciclo: DatosCiclo = {
      activo: true,
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-10-11", // Hace 14 días -> Día 15 del ciclo
    };

    const estado = calcularEstadoCiclo(ciclo, "2026-10-25");
    assert.ok(estado);
    assert.equal(estado.fase, "ovulacion");
    assert.equal(estado.probabilidadEmbarazo, "Muy alta");
  });

  it("detecta fase lútea tardía con retención y explicación para la báscula", () => {
    const ciclo: DatosCiclo = {
      activo: true,
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-10-03", // Hace 22 días -> Día 23 del ciclo
    };

    const estado = calcularEstadoCiclo(ciclo, "2026-10-25");
    assert.ok(estado);
    assert.equal(estado.diaDelCiclo, 23);
    assert.equal(estado.fase, "lutea");
    assert.equal(estado.esFaseRetencion, true);
    assert.ok(estado.explicacionBascula.includes("progesterona"));
  });

  it("detecta retraso de regla en lugar de ciclar en falso bucle", () => {
    const ciclo: DatosCiclo = {
      activo: true,
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-09-20", // Hace 35 días
    };

    const estado = calcularEstadoCiclo(ciclo, "2026-10-25");
    assert.ok(estado);
    assert.equal(estado.fase, "retraso");
    assert.equal(estado.esRetraso, true);
    assert.equal(estado.diasRetraso, 8);
    assert.equal(estado.diaDelCiclo, 36);
    assert.ok(estado.nombreFase.includes("8 días de retraso"));
  });

  it("devuelve null si el ciclo está desactivado", () => {
    const ciclo: DatosCiclo = {
      activo: false,
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-10-01",
    };
    assert.equal(calcularEstadoCiclo(ciclo), null);
    assert.equal(calcularEstadoCiclo(undefined), null);
  });

  it("cicloPorDefecto devuelve un ciclo coherente", () => {
    const porDef = cicloPorDefecto("2026-10-25");
    assert.equal(porDef.activo, true);
    assert.equal(porDef.duracionCiclo, 28);
    assert.equal(porDef.duracionRegla, 5);
    assert.equal(porDef.fechaUltimaRegla, "2026-10-11");
  });

  it("admite modo nativo y modo flo en DatosCiclo", () => {
    const cicloNativo: DatosCiclo = {
      activo: true,
      modo: "nativo",
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-10-11",
    };
    const cicloFlo: DatosCiclo = {
      activo: true,
      modo: "flo",
      duracionCiclo: 28,
      duracionRegla: 5,
      fechaUltimaRegla: "2026-10-11",
    };
    assert.equal(cicloNativo.modo, "nativo");
    assert.equal(cicloFlo.modo, "flo");
    const estado = calcularEstadoCiclo(cicloNativo, "2026-10-25");
    assert.ok(estado);
  });

  it("debeMostrarCiclo devuelve false para hombres siempre", () => {
    assert.equal(debeMostrarCiclo("hombre", undefined), false);
    assert.equal(
      debeMostrarCiclo("hombre", {
        activo: true,
        duracionCiclo: 28,
        duracionRegla: 5,
        fechaUltimaRegla: "2026-10-11",
      }),
      false,
    );
    assert.equal(
      debeMostrarCiclo(undefined, {
        activo: true,
        duracionCiclo: 28,
        duracionRegla: 5,
        fechaUltimaRegla: "2026-10-11",
      }),
      false,
    );
  });

  it("debeMostrarCiclo devuelve true para mujeres activas", () => {
    assert.equal(debeMostrarCiclo("mujer", undefined), true);
    assert.equal(
      debeMostrarCiclo("mujer", {
        activo: true,
        duracionCiclo: 28,
        duracionRegla: 5,
        fechaUltimaRegla: "2026-10-11",
      }),
      true,
    );
    assert.equal(
      debeMostrarCiclo("mujer", {
        activo: false,
        duracionCiclo: 28,
        duracionRegla: 5,
        fechaUltimaRegla: "2026-10-11",
      }),
      false,
    );
  });
});
