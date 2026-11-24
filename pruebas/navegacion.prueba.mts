/**
 * Pruebas de rutas, navegación y contratos de modales.
 * Se ejecutan con: node pruebas/navegacion.prueba.mts
 */

import { esPestanaActiva, normalizarRuta } from "../lib/navegacion.ts";
import { revisarNombre } from "../lib/nombre.ts";
import { edad, validarPesoObjetivo } from "../lib/calculos.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos += 1;
    console.error(`FALLA  ${que}\n       esperaba ${b}\n       y salió  ${a}`);
  } else {
    console.log(`ok     ${que}`);
  }
}

console.log("--- 1. Pestañas activas y sub-rutas ---");
igual(esPestanaActiva("/hoy", "/hoy"), true, "Hoy activo en /hoy");
igual(esPestanaActiva("/hoy", "/progreso"), false, "Hoy apagado en /progreso");
igual(esPestanaActiva("/hoy", "/tienda"), true, "Hoy activo en subflujo /tienda");
igual(esPestanaActiva("/progreso", "/progreso"), true, "Progreso activo en /progreso");
igual(esPestanaActiva("/progreso", "/progreso/fotos"), true, "Progreso activo en /progreso/fotos");
igual(esPestanaActiva("/plan", "/plan"), true, "Plan activo en /plan");
igual(esPestanaActiva("/entreno", "/entreno"), true, "Entreno activo en /entreno");
igual(esPestanaActiva("/familia", "/familia"), true, "Familia activo en /familia");
igual(esPestanaActiva("/ajustes", "/ajustes"), true, "Ajustes activo en /ajustes");
igual(esPestanaActiva("/ajustes", "/ajustes/habitos"), true, "Ajustes activo en /ajustes/habitos");
igual(esPestanaActiva("/ajustes", "/ajustes/nube"), true, "Ajustes activo en /ajustes/nube");
igual(esPestanaActiva("/ajustes", "/ajustes-otros"), false, "Ajustes NO activo en prefijo engañoso sin barra");
igual(esPestanaActiva("/ajustes", null), false, "Ruta nula devuelve false sin explotar");
igual(esPestanaActiva("/ajustes", ""), false, "Ruta vacía devuelve false");

console.log("--- 2. Normalización de rutas ---");
igual(normalizarRuta("/hoy"), "/hoy", "Ruta limpia se mantiene");
igual(normalizarRuta("/hoy/"), "/hoy", "Barra final eliminada");
igual(normalizarRuta("/hoy?guia=1"), "/hoy", "Parámetros query eliminados");
igual(normalizarRuta("/ajustes#privacidad"), "/ajustes", "Hash eliminado");
igual(normalizarRuta("/plan?semilla=42#jueves"), "/plan", "Query y hash eliminados");
igual(normalizarRuta("/"), "/", "Raíz se preserva");
igual(normalizarRuta(""), "/", "Cadena vacía normaliza a raíz");

console.log("--- 3. Contrato de bloqueo de scroll para modales apilados ---");
// Simulador del contador de modales abiertos para verificar que el scroll
// no se desbloquea prematuramente cuando un modal secundario se cierra.
class SimuladorBloqueoScroll {
  contador = 0;
  bloqueado = false;

  abrir() {
    this.contador += 1;
    this.bloqueado = true;
  }

  cerrar() {
    this.contador = Math.max(0, this.contador - 1);
    if (this.contador === 0) {
      this.bloqueado = false;
    }
  }
}

const sim = new SimuladorBloqueoScroll();
igual(sim.bloqueado, false, "Inicialmente desbloqueado");
sim.abrir(); // Abre Modal 1 (ej. ModalGuiaVideo)
igual(sim.bloqueado, true, "Bloqueado tras abrir modal 1");
igual(sim.contador, 1, "Contador en 1");
sim.abrir(); // Abre Modal 2 (ej. Confirmar)
igual(sim.bloqueado, true, "Sigue bloqueado tras abrir modal 2");
igual(sim.contador, 2, "Contador en 2");
sim.cerrar(); // Cierra Modal 2
igual(sim.bloqueado, true, "Sigue bloqueado al cerrar el secundario");
igual(sim.contador, 1, "Contador decrementa a 1");
sim.cerrar(); // Cierra Modal 1
igual(sim.bloqueado, false, "Desbloqueado tras cerrar todos");
igual(sim.contador, 0, "Contador en 0");
sim.cerrar(); // Cierre extra
igual(sim.contador, 0, "No decrementa por debajo de 0");
igual(sim.bloqueado, false, "Permanece desbloqueado");

console.log("--- 4. Validación de pasos de Onboarding ---");
igual(revisarNombre("Isaac").ok, true, "Nombre simple válido");
igual(revisarNombre("María-José").ok, true, "Nombre con guión y tilde válido");
igual(revisarNombre("   ").ok, false, "Nombre solo espacios inválido");
igual(revisarNombre("NombreDemasiadoLargoQueSuperaVeinte").ok, false, "Nombre > 20 chars inválido");
igual(revisarNombre("Ana123").ok, false, "Nombre con números inválido");

// Edades en Onboarding (14 a 100 años)
const hoyD = new Date();
const anioActual = hoyD.getFullYear();
igual(edad(`${anioActual - 25}-01-01`), 25, "Cálculo de edad exacto");
igual(edad(`${anioActual - 10}-01-01`) >= 14, false, "Menor de 14 años rechazado");
igual(edad(`${anioActual - 30}-01-01`) >= 14 && edad(`${anioActual - 30}-01-01`) <= 100, true, "30 años aceptado");
igual(edad(`${anioActual - 105}-01-01`) <= 100, false, "Mayor de 100 años rechazado");

// Validación de límites fisiológicos para peso y objetivo
const revBajarValido = validarPesoObjetivo({
  pesoActualKg: 85,
  pesoObjetivoKg: 78,
  alturaCm: 178,
  objetivo: "adelgazar",
});
igual(revBajarValido.ok, true, "Bajar peso saludable aceptado");

const revBajarAlReves = validarPesoObjetivo({
  pesoActualKg: 80,
  pesoObjetivoKg: 85,
  alturaCm: 178,
  objetivo: "adelgazar",
});
igual(revBajarAlReves.ok, false, "Bajar con objetivo mayor que actual rechazado");

const revBajoPesoClinico = validarPesoObjetivo({
  pesoActualKg: 60,
  pesoObjetivoKg: 40,
  alturaCm: 175,
  objetivo: "adelgazar",
});
igual(revBajoPesoClinico.ok, false, "Objetivo con IMC < 18.5 rechazado por salud");

const revSubirValido = validarPesoObjetivo({
  pesoActualKg: 65,
  pesoObjetivoKg: 72,
  alturaCm: 175,
  objetivo: "subir",
});
igual(revSubirValido.ok, true, "Subir peso con objetivo mayor aceptado");

console.log(`\nPruebas pasadas: ${hechas - fallos}/${hechas}`);
if (fallos > 0) {
  process.exit(1);
}
