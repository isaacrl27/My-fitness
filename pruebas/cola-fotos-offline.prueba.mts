/**
 * Pruebas unitarias de la cola offline de fotos y los multiplicadores rápidos de ración.
 * Se ejecutan con: `node pruebas/cola-fotos-offline.prueba.mts`
 */

import {
  MAX_FOTOS_PENDIENTES,
  calcularGramosPorFactor,
  crearAlmacenMemoria,
  eliminarFotoPendiente,
  encolarFotoPendiente,
  limpiarColaFotosOffline,
  listarFotosPendientes,
} from "../lib/cola-fotos-offline.ts";

let fallos = 0;
let hechas = 0;

function igual(obtenido: unknown, esperado: unknown, que: string) {
  hechas += 1;
  if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
    fallos += 1;
    console.log(
      `FALLO: ${que}\n  esperado: ${JSON.stringify(esperado)}\n  obtenido: ${JSON.stringify(obtenido)}`,
    );
  }
}

async function ejecutar() {
  const almacen = crearAlmacenMemoria();

  const primera = await encolarFotoPendiente(
    {
      imagen: "AAA111",
      mime: "image/jpeg",
      comentario: "sin aceite",
      tipo: "comida",
      fecha: "2026-11-16",
      esCapricho: false,
    },
    almacen,
  );
  igual(Boolean(primera.id), true, "genera identificador único al guardar offline");

  // Evita duplicar si el usuario pulsa reintentar dos veces offline con la misma foto y comentario.
  const duplicada = await encolarFotoPendiente(
    {
      imagen: "AAA111",
      mime: "image/jpeg",
      comentario: "sin aceite",
      tipo: "comida",
      fecha: "2026-11-16",
      esCapricho: false,
    },
    almacen,
  );
  igual(duplicada.id, primera.id, "reutiliza la entrada si misma foto y detalle siguen pendientes");

  let lista = await listarFotosPendientes(almacen);
  igual(lista.length, 1, "solo hay una foto pendiente tras evitar duplicado");

  // Si excede el máximo, expulsa la más antigua para proteger el espacio del móvil.
  for (let i = 0; i < MAX_FOTOS_PENDIENTES + 2; i += 1) {
    await encolarFotoPendiente(
      {
        imagen: `IMG_${i}`,
        mime: "image/jpeg",
        comentario: "",
        tipo: "cena",
        fecha: "2026-11-16",
        esCapricho: false,
      },
      almacen,
    );
  }
  lista = await listarFotosPendientes(almacen);
  igual(lista.length, MAX_FOTOS_PENDIENTES, "respeta el tope máximo de fotos en cola");
  igual(
    lista.some((f) => f.imagen === "AAA111"),
    false,
    "expulsa primero la entrada más antigua al llenarse",
  );

  await eliminarFotoPendiente(lista[0].id, almacen);
  const trasBorrar = await listarFotosPendientes(almacen);
  igual(trasBorrar.length, MAX_FOTOS_PENDIENTES - 1, "elimina solo la foto resuelta");

  await limpiarColaFotosOffline(almacen);
  igual((await listarFotosPendientes(almacen)).length, 0, "vacía la cola al limpiar");

  // Multiplicadores rápidos de ración (1/2x, 1x, 1.5x, 2x).
  igual(calcularGramosPorFactor(200, 0.5), 100, "½x de 200 g son 100 g");
  igual(calcularGramosPorFactor(200, 1.5), 300, "1½x de 200 g son 300 g");
  igual(calcularGramosPorFactor(200, 2), 400, "2x de 200 g son 400 g");
  igual(calcularGramosPorFactor(1, 0.5), 1, "nunca baja de 1 g");
  igual(calcularGramosPorFactor(2000, 2), 3000, "respeta el límite superior de 3000 g");

  if (fallos > 0) {
    console.log(`\n${fallos} fallo(s) de ${hechas} comprobación(es).`);
    process.exitCode = 1;
  } else {
    console.log(`OK (${hechas} comprobaciones de cola-fotos-offline).`);
  }
}

void ejecutar();
