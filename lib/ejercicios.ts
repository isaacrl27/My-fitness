/**
 * El plan de ejercicios: catálogo propio y rutinas que cambian solas.
 *
 * Hay dos sitios separados, casa y gimnasio, porque lo que se puede hacer en
 * uno no se puede hacer en el otro. Cada sitio trae rutinas de 2, 3 o 4 días
 * (los que pida la persona) y cada sesión está montada por bloques: dentro de
 * un bloque hay variantes del mismo movimiento que se turnan semana a semana.
 * Así la rutina no se queda clavada y no hace falta IA para cambiarla.
 *
 * Nada de esto cuenta calorías ni promete resultados: es una guía de qué hacer
 * y cómo hacerlo bien. Los vídeos son de YouTube y van incrustados en la ficha.
 */

import type { Actividad } from "./calculos.ts";

export type Sitio = "casa" | "gimnasio";
export type Dias = 2 | 3 | 4;

export type Grupo =
  | "piernas"
  | "gluteo"
  | "pecho"
  | "espalda"
  | "hombro"
  | "brazos"
  | "core"
  | "cardio";

export const GRUPOS: Record<Grupo, string> = {
  piernas: "Piernas",
  gluteo: "Glúteo",
  pecho: "Pecho",
  espalda: "Espalda",
  hombro: "Hombro",
  brazos: "Brazos",
  core: "Core",
  cardio: "Cardio",
};

export type Ejercicio = {
  id: string;
  nombre: string;
  grupo: Grupo;
  sitio: Sitio;
  /** Qué hace falta. «Sin material» es que no hace falta nada. */
  material: string;
  series: number;
  /** Texto libre: «12-15», «10 por pierna», «30-45 s». */
  reps: string;
  descansoSeg: number;
  pasos: string[];
  truco: string;
  /** Identificador del vídeo de YouTube (lo de después de `watch?v=`). */
  video: string;
};

/** Un bloque es un movimiento con sus variantes: cada semana toca una. */
export type Sesion = {
  id: string;
  nombre: string;
  resumen: string;
  bloques: string[][];
};

export type SesionResuelta = {
  id: string;
  nombre: string;
  resumen: string;
  ejercicios: Ejercicio[];
};

export type DiaEntreno = {
  fecha: string;
  dia: string;
  entrena: boolean;
  sesion: SesionResuelta | null;
  esHoy: boolean;
};

const CASA: Ejercicio[] = [
  {
    id: "sentadilla",
    nombre: "Sentadilla al aire",
    grupo: "piernas",
    sitio: "casa",
    material: "Sin material",
    series: 3,
    reps: "12-15",
    descansoSeg: 60,
    pasos: [
      "Pies a la anchura de los hombros, ligeramente hacia fuera.",
      "Baja como si te sentaras en una silla, con la espalda recta y el pecho arriba.",
      "Las rodillas van en la misma dirección que los pies, sin meterse hacia dentro.",
      "Baja hasta donde controles (muslos cerca de la horizontal) y sube empujando con los talones.",
    ],
    truco: "Si las rodillas se juntan, separa un poco los pies y empuja las rodillas hacia fuera al bajar.",
    video: "m9pMtbfYFQU",
  },
  {
    id: "sentadilla-silla",
    nombre: "Sentadilla a la silla",
    grupo: "piernas",
    sitio: "casa",
    material: "Una silla",
    series: 3,
    reps: "10-12",
    descansoSeg: 60,
    pasos: [
      "Ponte delante de una silla, con los pies a la anchura de la cadera.",
      "Baja controlando hasta tocar el asiento con el culo, sin dejarte caer.",
      "Toca y sube sin balancearte ni coger impulso con los brazos.",
      "Al terminar, da un paso atrás para dejar la silla libre.",
    ],
    truco: "La silla marca la profundidad: no hace falta bajar más, sino controlar la bajada.",
    video: "m9pMtbfYFQU",
  },
  {
    id: "zancada",
    nombre: "Zancada",
    grupo: "piernas",
    sitio: "casa",
    material: "Sin material",
    series: 3,
    reps: "10 por pierna",
    descansoSeg: 60,
    pasos: [
      "Da un paso largo hacia delante y baja la rodilla de atrás hacia el suelo.",
      "La rodilla de delante queda por encima del pie, no más allá de la punta.",
      "El tronco se mantiene recto y el peso repartido entre las dos piernas.",
      "Empuja con la pierna de delante para volver y cambia de lado.",
    ],
    truco: "Si te cuesta el equilibrio, apoya una mano en la pared o en una silla.",
    video: "uqvt79Uh4o4",
  },
  {
    id: "zancada-atras",
    nombre: "Zancada hacia atrás",
    grupo: "piernas",
    sitio: "casa",
    material: "Sin material",
    series: 3,
    reps: "10 por pierna",
    descansoSeg: 60,
    pasos: [
      "De pie, da un paso largo hacia atrás con una pierna.",
      "Baja la rodilla de atrás hacia el suelo, manteniendo el pecho arriba.",
      "La rodilla de delante no debe pasarse mucho de la punta del pie.",
      "Vuelve al centro empujando con el talón de delante y alterna.",
    ],
    truco: "Hacia atrás suele costar menos a las rodillas que hacia delante y trabaja igual.",
    video: "uqvt79Uh4o4",
  },
  {
    id: "bulgara",
    nombre: "Sentadilla búlgara",
    grupo: "piernas",
    sitio: "casa",
    material: "Una silla",
    series: 3,
    reps: "8-10 por pierna",
    descansoSeg: 75,
    pasos: [
      "Ponte de espaldas a una silla y apoya en ella el empeine del pie de atrás.",
      "Adelanta el pie de delante lo suficiente para que la rodilla no se vaya de la punta.",
      "Baja recto, como una sentadilla con una sola pierna, hasta donde controles.",
      "Sube empujando con el talón de delante y cambia de lado al acabar la serie.",
    ],
    truco: "Cuanto más cerca tengas la silla, más trabaja el cuádriceps; cuanto más lejos, más el glúteo.",
    video: "Xfa3Ql_NwmE",
  },
  {
    id: "step-up",
    nombre: "Subida a la silla",
    grupo: "piernas",
    sitio: "casa",
    material: "Una silla",
    series: 3,
    reps: "10 por pierna",
    descansoSeg: 60,
    pasos: [
      "Pon una silla estable contra la pared y colócate delante.",
      "Apoya un pie entero en el asiento, sin coger impulso.",
      "Sube empujando con esa pierna hasta quedarte de pie encima.",
      "Baja despacio con la misma pierna y cambia de lado.",
    ],
    truco: "No te impulses con la pierna de abajo: el trabajo es de la que sube.",
    video: "uqvt79Uh4o4",
  },
  {
    id: "puente-gluteo",
    nombre: "Puente de glúteo",
    grupo: "gluteo",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "15",
    descansoSeg: 45,
    pasos: [
      "Túmbate boca arriba con las rodillas dobladas y los pies apoyados.",
      "Aprieta el culo y sube la cadera hasta formar una línea recta con el tronco.",
      "Aguanta un segundo arriba sin arquear la espalda.",
      "Baja despacio sin llegar a soltar del todo el glúteo.",
    ],
    truco: "Si notas la espalda en vez del culo, sube menos y aprieta más el glúteo.",
    video: "uuiN9NRFMBo",
  },
  {
    id: "puente-una-pierna",
    nombre: "Puente de glúteo a una pierna",
    grupo: "gluteo",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "10 por pierna",
    descansoSeg: 45,
    pasos: [
      "Túmbate con una rodilla doblada y el otro pie levantado del suelo.",
      "Sube la cadera empujando con el talón que está apoyado.",
      "Mantén la cadera nivelada: no debe caerse hacia el lado de la pierna levantada.",
      "Baja despacio y cambia de pierna al terminar la serie.",
    ],
    truco: "Es normal que un lado pueda menos: empieza por el que te cuesta y ajusta las repeticiones a ese.",
    video: "S0oUDi076k8",
  },
  {
    id: "gemelos",
    nombre: "Gemelos de pie",
    grupo: "piernas",
    sitio: "casa",
    material: "Pared o escalón",
    series: 3,
    reps: "15-20",
    descansoSeg: 30,
    pasos: [
      "De pie, con las manos en la pared para no perder el equilibrio.",
      "Sube los talones todo lo que puedas y aguanta arriba un segundo.",
      "Baja despacio hasta que el talón toque el suelo.",
      "Si usas un escalón, baja el talón por debajo del nivel y estira el gemelo.",
    ],
    truco: "El truco está en la bajada lenta, no en subir muchas veces rápido.",
    video: "gGxiLgZisT0",
  },
  {
    id: "flexion-pared",
    nombre: "Flexión en la pared",
    grupo: "pecho",
    sitio: "casa",
    material: "Pared",
    series: 3,
    reps: "12-15",
    descansoSeg: 45,
    pasos: [
      "Apoya las manos en la pared, a la altura del pecho y un poco más anchas que los hombros.",
      "Da un paso atrás y mantén el cuerpo recto, como una tabla.",
      "Dobla los codos y acerca el pecho a la pared sin sacar el culo.",
      "Empuja para volver, sin bloquear los codos de golpe.",
    ],
    truco: "Cuanto más lejos estés de la pared, más cuesta. Es la versión más suave de la flexión.",
    video: "23NYAAo1usA",
  },
  {
    id: "flexion-rodillas",
    nombre: "Flexión con rodillas apoyadas",
    grupo: "pecho",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "8-12",
    descansoSeg: 60,
    pasos: [
      "Apoya las manos en el suelo, un poco más anchas que los hombros, y las rodillas en la esterilla.",
      "Alinea la cabeza, la espalda y la cadera; no dejes que la cadera se hunda.",
      "Baja el pecho doblando los codos, con ellos hacia atrás y no hacia los lados.",
      "Empuja hasta estirar los brazos sin arquear la espalda.",
    ],
    truco: "Si se te hunde la cadera, aprieta el abdomen como si fueras a recibir un golpe.",
    video: "b2UagYWNErY",
  },
  {
    id: "flexion",
    nombre: "Flexión",
    grupo: "pecho",
    sitio: "casa",
    material: "Sin material",
    series: 3,
    reps: "6-12",
    descansoSeg: 60,
    pasos: [
      "Manos en el suelo a la anchura de los hombros, pies juntos o algo separados.",
      "El cuerpo forma una línea recta desde la cabeza hasta los talones.",
      "Baja el pecho hasta casi tocar el suelo, con los codos cerca del cuerpo.",
      "Empuja el suelo hasta volver arriba sin perder la línea.",
    ],
    truco: "Si la cadera sube o baja, haz menos repeticiones y cuida la línea: vale más una buena que cinco malas.",
    video: "b2UagYWNErY",
  },
  {
    id: "fondos-silla",
    nombre: "Fondos de tríceps en la silla",
    grupo: "brazos",
    sitio: "casa",
    material: "Una silla",
    series: 3,
    reps: "10-12",
    descansoSeg: 45,
    pasos: [
      "Siéntate en el borde de una silla estable y agarra el asiento por los lados.",
      "Lleva el culo hacia delante, fuera del asiento, con los pies apoyados.",
      "Baja el cuerpo doblando los codos hacia atrás, hasta donde puedas sin dolor.",
      "Empuja con los brazos para subir, sin encoger los hombros.",
    ],
    truco: "Si notas pinchazos en el hombro, baja menos o separa un poco más los pies.",
    video: "R9TzSqoDMBw",
  },
  {
    id: "remo-mochila",
    nombre: "Remo con mochila",
    grupo: "espalda",
    sitio: "casa",
    material: "Mochila cargada",
    series: 3,
    reps: "10-12",
    descansoSeg: 60,
    pasos: [
      "Llena una mochila con libros o botellas y agárrala por las asas.",
      "Inclina el tronco hacia delante con la espalda recta y las rodillas algo dobladas.",
      "Tira de la mochila hacia el abdomen juntando los omóplatos.",
      "Baja controlando el peso hasta estirar los brazos.",
    ],
    truco: "El movimiento sale de la espalda, no de los brazos: piensa en llevar los codos hacia atrás.",
    video: "fZYGcNtMWSc",
  },
  {
    id: "remo-mesa",
    nombre: "Remo invertido en la mesa",
    grupo: "espalda",
    sitio: "casa",
    material: "Mesa fuerte",
    series: 3,
    reps: "8-12",
    descansoSeg: 60,
    pasos: [
      "Túmbate debajo de una mesa fuerte y agarra el borde con las dos manos.",
      "El cuerpo recto, los talones en el suelo y los brazos estirados.",
      "Tira del pecho hacia la mesa juntando los omóplatos.",
      "Baja despacio hasta estirar los brazos, sin dejar caer la cadera.",
    ],
    truco: "Cuanto más estires las piernas, más difícil. Si no puedes, dobla las rodillas y apoya los pies.",
    video: "cczgGh3YdWE",
  },
  {
    id: "bird-dog",
    nombre: "Pájaro-perro",
    grupo: "core",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "10 por lado",
    descansoSeg: 45,
    pasos: [
      "A cuatro patas, con las manos bajo los hombros y las rodillas bajo la cadera.",
      "Estira a la vez un brazo hacia delante y la pierna contraria hacia atrás.",
      "Mantén la espalda plana y la cadera nivelada un par de segundos.",
      "Vuelve al centro y cambia de lado.",
    ],
    truco: "Imagina que llevas un vaso de agua en la espalda: si se derrama, has movido la cadera.",
    video: "QABW99qPiNM",
  },
  {
    id: "press-hombro-mochila",
    nombre: "Press de hombro con mochila",
    grupo: "hombro",
    sitio: "casa",
    material: "Mochila cargada",
    series: 3,
    reps: "10-12",
    descansoSeg: 60,
    pasos: [
      "Siéntate o ponte de pie con la espalda recta y sujeta la mochila a la altura del pecho.",
      "Sube la mochila por encima de la cabeza hasta estirar los brazos.",
      "No arquees la espalda: si hace falta, aprieta el abdomen y baja un poco el peso.",
      "Baja despacio hasta la altura del pecho.",
    ],
    truco: "La mochila pesa distinto según lo que lleve dentro: empieza con poco y sube cuando controles.",
    video: "9AQraNQRCYs",
  },
  {
    id: "elevaciones-botellas",
    nombre: "Elevaciones laterales con botellas",
    grupo: "hombro",
    sitio: "casa",
    material: "Dos botellas",
    series: 3,
    reps: "12-15",
    descansoSeg: 45,
    pasos: [
      "De pie, con una botella en cada mano y los brazos a los lados.",
      "Sube los brazos hacia los lados hasta la altura de los hombros, sin pasar de ahí.",
      "Los codos van ligeramente doblados y los hombros lejos de las orejas.",
      "Baja despacio, controlando el peso.",
    ],
    truco: "No hace falta levantar mucho peso: con botellas de agua ya se nota si el movimiento es limpio.",
    video: "hgLpdwMtEEs",
  },
  {
    id: "curl-botellas",
    nombre: "Curl de bíceps con botellas",
    grupo: "brazos",
    sitio: "casa",
    material: "Dos botellas",
    series: 3,
    reps: "12-15",
    descansoSeg: 45,
    pasos: [
      "De pie o sentado, con una botella en cada mano y los brazos estirados.",
      "Dobla los codos llevando las botellas hacia los hombros.",
      "Los codos se quedan pegados al cuerpo; no los lleves hacia delante.",
      "Baja despacio hasta estirar del todo.",
    ],
    truco: "Si te balanceas, el peso es demasiado: apoya la espalda en la pared y baja las repeticiones.",
    video: "Fgm1Kd86Wl8",
  },
  {
    id: "plancha",
    nombre: "Plancha",
    grupo: "core",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "20-40 s",
    descansoSeg: 45,
    pasos: [
      "Apoya los antebrazos en el suelo, con los codos bajo los hombros.",
      "Estira las piernas y apoya las puntas de los pies.",
      "El cuerpo forma una línea recta: no subas el culo ni lo dejes caer.",
      "Aprieta el abdomen y respira sin aguantar el aire.",
    ],
    truco: "Es mejor aguantar 20 segundos bien que 40 con la espalda hundida.",
    video: "zfY5XXa26ug",
  },
  {
    id: "plancha-lateral",
    nombre: "Plancha lateral",
    grupo: "core",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "15-30 s por lado",
    descansoSeg: 45,
    pasos: [
      "Túmbate de lado apoyando el antebrazo, con el codo bajo el hombro.",
      "Levanta la cadera hasta formar una línea recta con el cuerpo.",
      "Aprieta el abdomen y mantén la cadera alta, sin dejarla caer.",
      "Aguanta el tiempo y cambia de lado.",
    ],
    truco: "Si te cuesta, apoya la rodilla de abajo en el suelo y hazlo desde ahí.",
    video: "45t3tTcRcKE",
  },
  {
    id: "dead-bug",
    nombre: "Bicho muerto",
    grupo: "core",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "10 por lado",
    descansoSeg: 45,
    pasos: [
      "Túmbate boca arriba con los brazos hacia el techo y las rodillas dobladas a 90 grados.",
      "Baja a la vez un brazo y la pierna contraria, sin despegar la espalda del suelo.",
      "Vuelve al centro y cambia de lado.",
      "Hazlo despacio: el objetivo es que la espalda no se mueva.",
    ],
    truco: "Si la espalda se arquea, baja menos la pierna o hazlo con una sola pierna a la vez.",
    video: "XkTtXA3-IqU",
  },
  {
    id: "crunch",
    nombre: "Encogimiento de abdomen",
    grupo: "core",
    sitio: "casa",
    material: "Esterilla",
    series: 3,
    reps: "15",
    descansoSeg: 45,
    pasos: [
      "Túmbate boca arriba con las rodillas dobladas y los pies apoyados.",
      "Pon las manos en las sienes, sin tirar del cuello.",
      "Despega un poco los omóplatos del suelo encogiendo el abdomen.",
      "Baja despacio sin relajar del todo.",
    ],
    truco: "No es un movimiento de cuello: mira al techo y deja que el abdomen haga el trabajo.",
    video: "oRIi-jKzCro",
  },
  {
    id: "mountain-climbers",
    nombre: "Escaladores",
    grupo: "cardio",
    sitio: "casa",
    material: "Sin material",
    series: 3,
    reps: "30 s",
    descansoSeg: 45,
    pasos: [
      "Empieza como en una flexión, con los brazos estirados y el cuerpo recto.",
      "Lleva una rodilla hacia el pecho y vuelve a la posición inicial.",
      "Alterna las piernas a un ritmo que puedas mantener sin perder la línea.",
      "No levantes el culo ni dejes caer la cadera.",
    ],
    truco: "Si te falta el aire, baja el ritmo antes que la técnica.",
    video: "FPLXxBxYcmE",
  },
  {
    id: "jumping-jacks",
    nombre: "Jumping jacks",
    grupo: "cardio",
    sitio: "casa",
    material: "Sin material",
    series: 3,
    reps: "30-45 s",
    descansoSeg: 45,
    pasos: [
      "De pie, con los pies juntos y los brazos a los lados.",
      "Salta separando los pies mientras subes los brazos por encima de la cabeza.",
      "Vuelve a juntar pies y brazos con otro salto.",
      "Mantén un ritmo constante y cae con las rodillas algo dobladas.",
    ],
    truco: "Si molesta a los vecinos o a las rodillas, hazlo sin salto: un pie sale y el otro se queda.",
    video: "vjKGK90UJHQ",
  },
  {
    id: "burpee",
    nombre: "Burpee",
    grupo: "cardio",
    sitio: "casa",
    material: "Sin material",
    series: 3,
    reps: "8-10",
    descansoSeg: 60,
    pasos: [
      "De pie, baja a cuclillas y apoya las manos en el suelo.",
      "Lleva los pies atrás hasta quedar en plancha (o da un paso atrás si prefieres).",
      "Vuelve a traer los pies a las manos y levántate.",
      "Termina con un salto suave y cae con las rodillas dobladas.",
    ],
    truco: "Se puede hacer sin salto y dando pasos: cansa igual y cuida más las rodillas.",
    video: "Uy2nUNX38xE",
  },
  {
    id: "cardio-casa",
    nombre: "Cardio sin saltos",
    grupo: "cardio",
    sitio: "casa",
    material: "Sin material",
    series: 1,
    reps: "10-15 min",
    descansoSeg: 0,
    pasos: [
      "Elige un ritmo que te deje hablar pero notar que respiras más.",
      "Alterna marcha rápida en el sitio, rodillas al pecho y brazos al aire.",
      "Mantén el movimiento constante, sin parones largos.",
      "Termina con dos minutos suaves para bajar pulsaciones.",
    ],
    truco: "Sirve para cerrar el entrenamiento o para un día en el que no quieras fuerza.",
    video: "cKZEuxFJKA8",
  },
];

const GIMNASIO: Ejercicio[] = [
  {
    id: "prensa",
    nombre: "Prensa de piernas",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Prensa",
    series: 4,
    reps: "10-12",
    descansoSeg: 90,
    pasos: [
      "Apoya los pies en la plataforma a la anchura de los hombros.",
      "Baja la plataforma doblando las rodillas hasta donde controlen sin despegar la espalda.",
      "Empuja con los talones hasta estirar las piernas, sin bloquear las rodillas.",
      "Mantén la espalda y la cadera pegadas al asiento todo el movimiento.",
    ],
    truco: "No pongas las manos en las rodillas ni bajes tanto que la cadera se despegue.",
    video: "xvCynwyNoP4",
  },
  {
    id: "sentadilla-barra",
    nombre: "Sentadilla con barra",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Barra y rack",
    series: 4,
    reps: "8-10",
    descansoSeg: 120,
    pasos: [
      "Coloca la barra en la espalda alta, no en el cuello, y agarra con las manos firmes.",
      "Separa los pies a la anchura de los hombros y saca la barra del rack.",
      "Baja con la espalda recta y el pecho arriba, como si te sentaras.",
      "Sube empujando con los pies y mantén el peso repartido.",
    ],
    truco: "Empieza con la barra vacía o muy poco peso: la técnica pesa más que el disco.",
    video: "m9pMtbfYFQU",
  },
  {
    id: "peso-muerto",
    nombre: "Peso muerto con barra",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Barra",
    series: 4,
    reps: "6-8",
    descansoSeg: 150,
    pasos: [
      "Pies debajo de la barra, a la anchura de la cadera, y manos fuera de las piernas.",
      "Con la espalda recta y el pecho arriba, empuja el suelo con los pies para levantar la barra.",
      "La barra sube pegada a las piernas, sin dar tirones.",
      "Baja controlando el movimiento, doblando la cadera y las rodillas a la vez.",
    ],
    truco: "Si la espalda se redondea, quita peso: aquí se cuida la lumbar antes que el número de discos.",
    video: "0XL4cZR2Ink",
  },
  {
    id: "zancada-mancuernas",
    nombre: "Zancada con mancuernas",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Dos mancuernas",
    series: 3,
    reps: "10 por pierna",
    descansoSeg: 90,
    pasos: [
      "Coge una mancuerna en cada mano y deja los brazos estirados a los lados.",
      "Da un paso largo y baja la rodilla de atrás hacia el suelo.",
      "Mantén el tronco recto y la mirada al frente.",
      "Empuja con la pierna de delante para volver y cambia de lado.",
    ],
    truco: "Da pasos de verdad, no zancadas cortas: así la rodilla no se lleva todo el peso.",
    video: "uqvt79Uh4o4",
  },
  {
    id: "extension-cuadriceps",
    nombre: "Extensión de cuádriceps",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Máquina",
    series: 3,
    reps: "12-15",
    descansoSeg: 60,
    pasos: [
      "Ajusta el respaldo para que la rodilla quede alineada con el eje de la máquina.",
      "Apoya los tobillos en el rodillo y agarra las asas.",
      "Estira las piernas sin dar un tirón, hasta donde te deje la máquina.",
      "Baja despacio hasta la posición inicial.",
    ],
    truco: "No uses impulso ni sueltes el peso de golpe: la bajada lenta es la mitad del ejercicio.",
    video: "DI34ngDC8FU",
  },
  {
    id: "curl-femoral",
    nombre: "Curl femoral tumbado",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Máquina",
    series: 3,
    reps: "12-15",
    descansoSeg: 60,
    pasos: [
      "Túmbate boca abajo en la máquina con el rodillo en los tobillos.",
      "Agarra las asas y mantén la cadera pegada al banco.",
      "Dobla las rodillas llevando los talones hacia el culo.",
      "Baja despacio sin dejar que el peso caiga de golpe.",
    ],
    truco: "Si la cadera se levanta, baja el peso: el movimiento es de la rodilla, no de la espalda.",
    video: "9xbBr5Ytl8c",
  },
  {
    id: "hip-thrust",
    nombre: "Hip thrust con barra",
    grupo: "gluteo",
    sitio: "gimnasio",
    material: "Barra y banco",
    series: 4,
    reps: "10-12",
    descansoSeg: 90,
    pasos: [
      "Apoya la espalda alta en un banco y la barra sobre la cadera, con una almohadilla.",
      "Pies a la anchura de la cadera y rodillas dobladas.",
      "Sube la cadera apretando el glúteo hasta que el tronco quede recto.",
      "Baja controlando sin llegar a apoyar el culo en el suelo.",
    ],
    truco: "Empuja con los talones y no arquees la espalda arriba: el último trozo lo hace el glúteo.",
    video: "3SHkXmrQtxQ",
  },
  {
    id: "gemelos-maquina",
    nombre: "Gemelos de pie en máquina",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Máquina",
    series: 4,
    reps: "15-20",
    descansoSeg: 45,
    pasos: [
      "Coloca los hombros bajo las almohadillas y las puntas de los pies en la plataforma.",
      "Sube los talones todo lo que puedas y aguanta arriba un segundo.",
      "Baja despacio hasta estirar el gemelo por debajo del nivel.",
      "Mantén las rodillas casi rectas, sin bloquearlas.",
    ],
    truco: "El recorrido completo importa más que el peso: estira abajo y aprieta arriba.",
    video: "5OR8DdMXUIQ",
  },
  {
    id: "sentadilla-goblet",
    nombre: "Sentadilla goblet",
    grupo: "piernas",
    sitio: "gimnasio",
    material: "Una mancuerna",
    series: 3,
    reps: "10-12",
    descansoSeg: 90,
    pasos: [
      "Sujeta una mancuerna vertical contra el pecho, con las dos manos.",
      "Pies a la anchura de los hombros y codos hacia abajo.",
      "Baja recto manteniendo el pecho arriba y la mancuerna pegada.",
      "Sube empujando con los talones.",
    ],
    truco: "Es la mejor forma de aprender la sentadilla: el peso delante te obliga a mantener el tronco recto.",
    video: "XANUniwN1Jg",
  },
  {
    id: "press-banca",
    nombre: "Press de banca",
    grupo: "pecho",
    sitio: "gimnasio",
    material: "Barra y banco",
    series: 4,
    reps: "8-10",
    descansoSeg: 120,
    pasos: [
      "Túmbate en el banco con los pies apoyados y la espalda con una curva natural.",
      "Agarra la barra un poco más ancha que los hombros.",
      "Baja la barra al pecho controlando, con los codos a unos 45 grados.",
      "Empuja hasta estirar los brazos sin despegar la cadera del banco.",
    ],
    truco: "Si entrenas solo, usa el seguro del rack o pide a alguien que te ayude en las últimas repeticiones.",
    video: "TAH8RxOS0VI",
  },
  {
    id: "press-mancuernas",
    nombre: "Press de banca con mancuernas",
    grupo: "pecho",
    sitio: "gimnasio",
    material: "Dos mancuernas y banco",
    series: 4,
    reps: "10-12",
    descansoSeg: 90,
    pasos: [
      "Siéntate en el banco con una mancuerna en cada mano sobre los muslos.",
      "Túmbate y lleva las mancuernas a la altura del pecho, con los codos hacia abajo.",
      "Empuja hacia arriba hasta estirar los brazos, sin juntar las mancuernas de golpe.",
      "Baja controlando hasta notar el estiramiento del pecho.",
    ],
    truco: "Las mancuernas permiten bajar más que la barra; no fuerces si notas tirantez en el hombro.",
    video: "TAH8RxOS0VI",
  },
  {
    id: "press-inclinado",
    nombre: "Press inclinado con mancuernas",
    grupo: "pecho",
    sitio: "gimnasio",
    material: "Dos mancuernas y banco inclinado",
    series: 3,
    reps: "10-12",
    descansoSeg: 90,
    pasos: [
      "Sube el respaldo del banco a unos 30 grados.",
      "Coloca las mancuernas a la altura del pecho, con los codos algo cerrados.",
      "Empuja hacia arriba y ligeramente hacia dentro.",
      "Baja despacio hasta la posición inicial.",
    ],
    truco: "No pongas el banco casi vertical: se convierte en press de hombro y el pecho trabaja menos.",
    video: "MkMf308jXww",
  },
  {
    id: "aperturas",
    nombre: "Aperturas con mancuernas",
    grupo: "pecho",
    sitio: "gimnasio",
    material: "Dos mancuernas y banco",
    series: 3,
    reps: "12-15",
    descansoSeg: 60,
    pasos: [
      "Túmbate en el banco con una mancuerna en cada mano y los brazos abiertos.",
      "Los codos ligeramente doblados y las palmas mirando al techo.",
      "Junta las mancuernas arriba como si abrazaras un árbol.",
      "Abre despacio hasta notar el estiramiento, sin bajar de más.",
    ],
    truco: "Con poco peso basta: si tienes que doblar mucho los codos, es press, no aperturas.",
    video: "OrlXQdNwNwM",
  },
  {
    id: "dominadas",
    nombre: "Dominadas (o asistidas)",
    grupo: "espalda",
    sitio: "gimnasio",
    material: "Barra o máquina asistida",
    series: 4,
    reps: "5-10",
    descansoSeg: 120,
    pasos: [
      "Agarra la barra con las palmas hacia delante y las manos algo más anchas que los hombros.",
      "Cuelga con los brazos estirados y los hombros activos.",
      "Tira del cuerpo hacia arriba juntando los omóplatos.",
      "Baja controlando hasta estirar los brazos.",
    ],
    truco: "Si todavía no sales, usa la máquina asistida o una goma: es mejor hacer pocas bien que colgarse sin más.",
    video: "ZZbQ8x9BW4U",
  },
  {
    id: "jalon",
    nombre: "Jalón al pecho",
    grupo: "espalda",
    sitio: "gimnasio",
    material: "Polea alta",
    series: 4,
    reps: "10-12",
    descansoSeg: 90,
    pasos: [
      "Siéntate con los muslos bajo las almohadillas y agarra la barra ancha.",
      "Lleva la barra al pecho llevando los codos hacia abajo y atrás.",
      "No te eches atrás para tirar: el tronco se queda casi recto.",
      "Sube la barra controlando hasta estirar los brazos.",
    ],
    truco: "Si tiras con los brazos, te cansas antes: piensa en llevar los codos al bolsillo de atrás.",
    video: "EO9AmI-bu_0",
  },
  {
    id: "remo-barra",
    nombre: "Remo con barra",
    grupo: "espalda",
    sitio: "gimnasio",
    material: "Barra",
    series: 4,
    reps: "8-10",
    descansoSeg: 90,
    pasos: [
      "Inclina el tronco hacia delante con la espalda recta y las rodillas algo dobladas.",
      "Agarra la barra con las palmas hacia abajo, a la anchura de los hombros.",
      "Tira de la barra hacia el abdomen juntando los omóplatos.",
      "Baja controlando sin redondear la espalda.",
    ],
    truco: "El tronco no sube y baja con la barra: se queda quieto mientras los brazos tiran.",
    video: "fZYGcNtMWSc",
  },
  {
    id: "remo-mancuerna",
    nombre: "Remo con mancuerna",
    grupo: "espalda",
    sitio: "gimnasio",
    material: "Una mancuerna y banco",
    series: 3,
    reps: "10-12 por lado",
    descansoSeg: 75,
    pasos: [
      "Apoya una rodilla y una mano en el banco, con la espalda recta.",
      "Coge la mancuerna con la otra mano, con el brazo estirado.",
      "Tira de la mancuerna hacia la cadera llevando el codo hacia atrás.",
      "Baja despacio hasta estirar el brazo y cambia de lado.",
    ],
    truco: "No gires el tronco para subir más peso: el trabajo es de la espalda, no de la cintura.",
    video: "fZYGcNtMWSc",
  },
  {
    id: "remo-polea",
    nombre: "Remo en polea baja",
    grupo: "espalda",
    sitio: "gimnasio",
    material: "Polea baja",
    series: 3,
    reps: "12-15",
    descansoSeg: 75,
    pasos: [
      "Siéntate con los pies apoyados y agarra el maneral con las dos manos.",
      "Mantén la espalda recta y el pecho arriba.",
      "Tira del maneral hacia el abdomen juntando los omóplatos.",
      "Vuelve despacio hasta estirar los brazos, sin encorvarte.",
    ],
    truco: "No te balancees hacia atrás para ayudar: si hace falta, baja el peso.",
    video: "duJvtG1qIko",
  },
  {
    id: "press-militar",
    nombre: "Press militar",
    grupo: "hombro",
    sitio: "gimnasio",
    material: "Barra o mancuernas",
    series: 4,
    reps: "8-10",
    descansoSeg: 120,
    pasos: [
      "De pie, con la barra a la altura de los hombros y las manos algo más anchas.",
      "Aprieta el abdomen y el glúteo para no arquear la espalda.",
      "Empuja la barra hacia arriba hasta estirar los brazos.",
      "Baja controlando hasta la altura de la barbilla o el pecho.",
    ],
    truco: "Si la espalda se arquea, es que el peso es demasiado o que falta apretar el abdomen.",
    video: "KLT18ahosQw",
  },
  {
    id: "elevaciones-laterales",
    nombre: "Elevaciones laterales",
    grupo: "hombro",
    sitio: "gimnasio",
    material: "Dos mancuernas",
    series: 3,
    reps: "12-15",
    descansoSeg: 60,
    pasos: [
      "De pie, con una mancuerna en cada mano y los brazos a los lados.",
      "Sube los brazos hacia los lados hasta la altura de los hombros.",
      "Los codos van ligeramente doblados y los hombros bajos.",
      "Baja despacio, sin dejar caer las mancuernas.",
    ],
    truco: "Con menos peso y sin balanceo se nota más que con mucho peso y trampa.",
    video: "hgLpdwMtEEs",
  },
  {
    id: "face-pull",
    nombre: "Face pull",
    grupo: "hombro",
    sitio: "gimnasio",
    material: "Polea alta y cuerda",
    series: 3,
    reps: "15-20",
    descansoSeg: 60,
    pasos: [
      "Coloca la polea a la altura de la cara y agarra la cuerda con las dos manos.",
      "Tira de la cuerda hacia la cara, separando las manos al final.",
      "Los codos salen hacia los lados y los omóplatos se juntan.",
      "Vuelve despacio manteniendo la espalda recta.",
    ],
    truco: "Es el ejercicio que compensa tanto press: no lo quites aunque parezca ligero.",
    video: "UaZPhyztYNU",
  },
  {
    id: "curl-barra",
    nombre: "Curl de bíceps con barra",
    grupo: "brazos",
    sitio: "gimnasio",
    material: "Barra",
    series: 3,
    reps: "10-12",
    descansoSeg: 60,
    pasos: [
      "De pie, con la barra agarrada con las palmas hacia arriba y los codos pegados.",
      "Dobla los codos llevando la barra hacia el pecho.",
      "No muevas los codos hacia delante ni balances el tronco.",
      "Baja despacio hasta estirar los brazos.",
    ],
    truco: "Si te balanceas, apoya la espalda en la pared y baja el peso.",
    video: "PY9QylAMtyE",
  },
  {
    id: "curl-mancuernas",
    nombre: "Curl alterno con mancuernas",
    grupo: "brazos",
    sitio: "gimnasio",
    material: "Dos mancuernas",
    series: 3,
    reps: "12-15",
    descansoSeg: 60,
    pasos: [
      "De pie o sentado, con una mancuerna en cada mano y los brazos estirados.",
      "Sube una mancuerna girando la palma hacia arriba.",
      "Baja despacio y repite con el otro brazo.",
      "Mantén los codos quietos al lado del cuerpo.",
    ],
    truco: "Alternar brazos te deja descansar lo justo sin perder el ritmo.",
    video: "PY9QylAMtyE",
  },
  {
    id: "triceps-polea",
    nombre: "Extensión de tríceps en polea",
    grupo: "brazos",
    sitio: "gimnasio",
    material: "Polea alta",
    series: 3,
    reps: "12-15",
    descansoSeg: 60,
    pasos: [
      "De pie, frente a la polea, agarra la cuerda con las dos manos.",
      "Codos pegados al cuerpo y manos a la altura del pecho.",
      "Estira los codos llevando las manos hacia abajo.",
      "Vuelve despacio sin separar los codos del cuerpo.",
    ],
    truco: "Si los codos se abren, baja el peso: el movimiento es solo del codo.",
    video: "HAS8uy73HqM",
  },
  {
    id: "fondos",
    nombre: "Fondos en paralelas",
    grupo: "brazos",
    sitio: "gimnasio",
    material: "Paralelas o máquina asistida",
    series: 3,
    reps: "8-12",
    descansoSeg: 90,
    pasos: [
      "Agarra las paralelas y sube con los brazos estirados.",
      "Baja doblando los codos hasta donde puedas sin dolor en el hombro.",
      "El tronco se queda casi recto y los codos miran hacia atrás.",
      "Empuja para subir sin encoger los hombros hacia las orejas.",
    ],
    truco: "Si te cuesta, usa la máquina asistida o una goma; mejor hacer pocas que forzar el hombro.",
    video: "DcS44T6Y5GQ",
  },
  {
    id: "elevacion-piernas",
    nombre: "Elevación de piernas colgado",
    grupo: "core",
    sitio: "gimnasio",
    material: "Barra",
    series: 3,
    reps: "10-12",
    descansoSeg: 60,
    pasos: [
      "Cuélgate de una barra con los brazos estirados y los hombros activos.",
      "Sube las piernas rectas o con las rodillas dobladas, según controles.",
      "Lleva las rodillas o los pies hacia el pecho sin balancearte.",
      "Baja despacio hasta la posición inicial.",
    ],
    truco: "No uses impulso: si empiezas a balancearte, apoya los pies y vuelve a empezar.",
    video: "_QMu7MSAYQg",
  },
  {
    id: "crunch-polea",
    nombre: "Encogimiento en polea",
    grupo: "core",
    sitio: "gimnasio",
    material: "Polea alta",
    series: 3,
    reps: "15",
    descansoSeg: 60,
    pasos: [
      "Arrodíllate frente a la polea y agarra la cuerda a los lados de la cabeza.",
      "Con la cadera quieta, encoge el abdomen llevando los codos hacia las rodillas.",
      "Aprieta el abdomen abajo y aguanta un segundo.",
      "Vuelve despacio sin tirar del cuello.",
    ],
    truco: "El movimiento es corto y sale del abdomen; no es un peso muerto de rodillas.",
    video: "oRIi-jKzCro",
  },
  {
    id: "plancha-gym",
    nombre: "Plancha",
    grupo: "core",
    sitio: "gimnasio",
    material: "Esterilla",
    series: 3,
    reps: "30-45 s",
    descansoSeg: 45,
    pasos: [
      "Apoya los antebrazos con los codos bajo los hombros.",
      "Estira las piernas y apoya las puntas de los pies.",
      "Mantén la línea recta y aprieta el abdomen.",
      "Respira con normalidad durante todo el tiempo.",
    ],
    truco: "Si la cadera se hunde, aguanta menos segundos y descansa: la técnica manda.",
    video: "zfY5XXa26ug",
  },
];

/** Todos los ejercicios, en el orden en que se enseñan. */
export const EJERCICIOS: Ejercicio[] = [...CASA, ...GIMNASIO];

export const POR_ID = new Map(EJERCICIOS.map((e) => [e.id, e]));

export function ejerciciosDe(sitio: Sitio): Ejercicio[] {
  return EJERCICIOS.filter((e) => e.sitio === sitio);
}

const RUTINAS_CASA: Record<Dias, Sesion[]> = {
  2: [
    {
      id: "casa-2-a",
      nombre: "Cuerpo entero (día 1)",
      resumen: "Piernas, pecho, espalda y core. La base de la semana.",
      bloques: [
        ["sentadilla", "sentadilla-silla"],
        ["flexion-pared", "flexion-rodillas", "flexion"],
        ["remo-mochila", "remo-mesa"],
        ["puente-gluteo", "puente-una-pierna"],
        ["plancha", "dead-bug"],
      ],
    },
    {
      id: "casa-2-b",
      nombre: "Cuerpo entero (día 2)",
      resumen: "Piernas, hombro, brazos y core. Cierra la semana.",
      bloques: [
        ["zancada", "zancada-atras"],
        ["press-hombro-mochila", "elevaciones-botellas"],
        ["curl-botellas", "fondos-silla"],
        ["gemelos", "step-up"],
        ["bird-dog", "plancha-lateral"],
      ],
    },
  ],
  3: [
    {
      id: "casa-3-a",
      nombre: "Cuerpo entero",
      resumen: "Un poco de todo, con la técnica como prioridad.",
      bloques: [
        ["sentadilla", "sentadilla-silla"],
        ["flexion-pared", "flexion-rodillas"],
        ["remo-mochila", "remo-mesa"],
        ["puente-gluteo", "puente-una-pierna"],
        ["plancha", "dead-bug"],
      ],
    },
    {
      id: "casa-3-b",
      nombre: "Tren superior y core",
      resumen: "Pecho, espalda, hombro y abdomen.",
      bloques: [
        ["flexion-rodillas", "flexion"],
        ["remo-mochila", "remo-mesa"],
        ["press-hombro-mochila", "elevaciones-botellas"],
        ["curl-botellas", "fondos-silla"],
        ["plancha-lateral", "bird-dog"],
      ],
    },
    {
      id: "casa-3-c",
      nombre: "Piernas, glúteo y cardio",
      resumen: "Piernas, glúteo y un final que te deja sin aire.",
      bloques: [
        ["zancada", "zancada-atras"],
        ["bulgara", "step-up"],
        ["gemelos"],
        ["puente-gluteo", "puente-una-pierna"],
        ["mountain-climbers", "burpee"],
      ],
    },
  ],
  4: [
    {
      id: "casa-4-a",
      nombre: "Tren superior",
      resumen: "Pecho, espalda, hombro y brazos.",
      bloques: [
        ["flexion-pared", "flexion-rodillas", "flexion"],
        ["remo-mochila", "remo-mesa"],
        ["press-hombro-mochila", "elevaciones-botellas"],
        ["curl-botellas", "fondos-silla"],
        ["plancha", "crunch"],
      ],
    },
    {
      id: "casa-4-b",
      nombre: "Piernas y glúteo",
      resumen: "Fuerza de piernas sin material, con silla si hace falta.",
      bloques: [
        ["sentadilla", "sentadilla-silla"],
        ["zancada", "zancada-atras"],
        ["puente-gluteo", "puente-una-pierna"],
        ["gemelos", "step-up"],
        ["bird-dog", "dead-bug"],
      ],
    },
    {
      id: "casa-4-c",
      nombre: "Cuerpo entero y cardio",
      resumen: "Fuerza general y un poco de cardio al final.",
      bloques: [
        ["bulgara", "step-up"],
        ["flexion-rodillas", "flexion"],
        ["remo-mochila", "remo-mesa"],
        ["jumping-jacks", "mountain-climbers"],
        ["cardio-casa"],
      ],
    },
    {
      id: "casa-4-d",
      nombre: "Core y movilidad",
      resumen: "Abdomen, zona baja de la espalda y cardio suave.",
      bloques: [
        ["plancha", "crunch"],
        ["plancha-lateral"],
        ["bird-dog"],
        ["dead-bug"],
        ["cardio-casa"],
      ],
    },
  ],
};

const RUTINAS_GIMNASIO: Record<Dias, Sesion[]> = {
  2: [
    {
      id: "gym-2-a",
      nombre: "Cuerpo entero (día 1)",
      resumen: "Piernas, empuje, tirón y core. La base de la semana.",
      bloques: [
        ["sentadilla-barra", "prensa"],
        ["press-banca", "press-mancuernas"],
        ["jalon", "dominadas"],
        ["press-militar"],
        ["curl-barra", "curl-mancuernas"],
        ["plancha-gym", "crunch-polea"],
      ],
    },
    {
      id: "gym-2-b",
      nombre: "Cuerpo entero (día 2)",
      resumen: "Cadena posterior, pecho, espalda y hombro.",
      bloques: [
        ["peso-muerto", "hip-thrust"],
        ["press-inclinado", "aperturas"],
        ["remo-barra", "remo-polea"],
        ["elevaciones-laterales"],
        ["triceps-polea", "fondos"],
        ["elevacion-piernas"],
      ],
    },
  ],
  3: [
    {
      id: "gym-3-empuje",
      nombre: "Empuje",
      resumen: "Pecho, hombro y tríceps.",
      bloques: [
        ["press-banca", "press-mancuernas"],
        ["press-inclinado", "aperturas"],
        ["press-militar"],
        ["elevaciones-laterales"],
        ["triceps-polea", "fondos"],
        ["plancha-gym"],
      ],
    },
    {
      id: "gym-3-tiron",
      nombre: "Tirón",
      resumen: "Espalda, bíceps y abdomen.",
      bloques: [
        ["dominadas", "jalon"],
        ["remo-barra", "remo-polea"],
        ["remo-mancuerna"],
        ["face-pull"],
        ["curl-barra", "curl-mancuernas"],
        ["elevacion-piernas", "crunch-polea"],
      ],
    },
    {
      id: "gym-3-piernas",
      nombre: "Piernas y core",
      resumen: "Piernas, glúteo y abdomen.",
      bloques: [
        ["sentadilla-barra", "prensa"],
        ["peso-muerto", "hip-thrust"],
        ["extension-cuadriceps"],
        ["curl-femoral"],
        ["gemelos-maquina"],
        ["plancha-gym", "crunch-polea"],
      ],
    },
  ],
  4: [
    {
      id: "gym-4-empuje",
      nombre: "Empuje",
      resumen: "Pecho, hombro y tríceps.",
      bloques: [
        ["press-banca", "press-mancuernas"],
        ["press-inclinado", "aperturas"],
        ["press-militar"],
        ["elevaciones-laterales"],
        ["triceps-polea", "fondos"],
      ],
    },
    {
      id: "gym-4-tiron",
      nombre: "Tirón",
      resumen: "Espalda, bíceps y hombro posterior.",
      bloques: [
        ["dominadas", "jalon"],
        ["remo-barra", "remo-polea"],
        ["remo-mancuerna"],
        ["face-pull"],
        ["curl-barra", "curl-mancuernas"],
      ],
    },
    {
      id: "gym-4-piernas",
      nombre: "Piernas",
      resumen: "Cuádriceps, femoral, glúteo y gemelo.",
      bloques: [
        ["sentadilla-barra", "prensa"],
        ["peso-muerto", "hip-thrust"],
        ["extension-cuadriceps"],
        ["curl-femoral"],
        ["zancada-mancuernas"],
        ["gemelos-maquina"],
      ],
    },
    {
      id: "gym-4-cuerpo-entero",
      nombre: "Cuerpo entero y core",
      resumen: "Un repaso general y abdomen para cerrar la semana.",
      bloques: [
        ["sentadilla-goblet", "prensa"],
        ["press-mancuernas", "press-inclinado"],
        ["jalon", "remo-polea"],
        ["plancha-gym"],
        ["elevacion-piernas", "crunch-polea"],
      ],
    },
  ],
};

/** Qué días de la semana toca entrenar (0 = lunes, 6 = domingo). */
export const DIAS_DE_ENTRENO: Record<Dias, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
};

export const NOMBRES_DE_DIA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/**
 * Cuántos días propone la app según lo que la persona dijo que se movía.
 *
 * No es una obligación: el plan se puede cambiar a 2, 3 o 4 con un toque.
 */
export function diasSugeridos(actividad: Actividad): Dias {
  switch (actividad) {
    case "sedentario":
      return 2;
    case "ligero":
      return 2;
    case "moderado":
      return 3;
    case "alto":
      return 4;
    case "muy-alto":
      return 4;
    default:
      return 3;
  }
}

/** Un valor guardado que no sea 2, 3 o 4 se cambia por el que toque. */
export function diasDeEntrenamiento(valor: unknown, actividad: Actividad): Dias {
  return valor === 2 || valor === 3 || valor === 4 ? valor : diasSugeridos(actividad);
}

export function sitioDeEntrenamiento(valor: unknown): Sitio {
  return valor === "gimnasio" ? "gimnasio" : "casa";
}

function rutinasDe(sitio: Sitio): Record<Dias, Sesion[]> {
  return sitio === "gimnasio" ? RUTINAS_GIMNASIO : RUTINAS_CASA;
}

export function sesionesDe(sitio: Sitio, dias: Dias): Sesion[] {
  return rutinasDe(sitio)[dias];
}

/** Milisegundos de un día ISO, en UTC, para no depender de la hora del móvil. */
function msDe(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Lunes de la semana de una fecha ISO. */
function lunesDe(iso: string): number {
  const ms = msDe(iso);
  const dia = (new Date(ms).getUTCDay() + 6) % 7; // 0 = lunes
  return ms - dia * 86400000;
}

function isoDe(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * La semana de entrenamiento de una fecha: los siete días, con la sesión que
 * toca o el descanso. La rotación usa el número de semana desde 1970, así que
 * dos móviles con la misma fecha ven lo mismo y la rutina cambia sola los
 * lunes.
 */
export function semanaDeEntrenamiento(
  sitio: Sitio,
  dias: Dias,
  hoyISO: string,
): DiaEntreno[] {
  const sesiones = sesionesDe(sitio, dias);
  const lunes = lunesDe(hoyISO);
  const indiceSemana = Math.floor(lunes / (7 * 86400000));
  const diasEntreno = DIAS_DE_ENTRENO[dias];

  return Array.from({ length: 7 }, (_, i) => {
    const fecha = isoDe(lunes + i * 86400000);
    const posicion = diasEntreno.indexOf(i);
    if (posicion === -1) {
      return { fecha, dia: NOMBRES_DE_DIA[i], entrena: false, sesion: null, esHoy: fecha === hoyISO };
    }
    const sesion = sesiones[posicion];
    return {
      fecha,
      dia: NOMBRES_DE_DIA[i],
      entrena: true,
      sesion: resolverSesion(sesion, indiceSemana),
      esHoy: fecha === hoyISO,
    };
  });
}

/** Convierte una sesión con bloques de variantes en los ejercicios de esta semana. */
export function resolverSesion(sesion: Sesion, indiceSemana: number): SesionResuelta {
  const vuelta = ((indiceSemana % 4) + 4) % 4;
  return {
    id: sesion.id,
    nombre: sesion.nombre,
    resumen: sesion.resumen,
    ejercicios: sesion.bloques.map((bloque) => {
      const id = bloque[vuelta % bloque.length];
      const ejercicio = POR_ID.get(id);
      if (!ejercicio) {
        throw new Error(`El ejercicio ${id} no está en el catálogo`);
      }
      return ejercicio;
    }),
  };
}

/**
 * El próximo día de entrenamiento desde una fecha (incluida). Si hoy toca,
 * devuelve el de hoy. Si la semana ya se acabó, salta al lunes siguiente.
 */
export function proximoEntrenamiento(
  sitio: Sitio,
  dias: Dias,
  hoyISO: string,
): { fecha: string; dia: string; sesion: SesionResuelta } {
  const semana = semanaDeEntrenamiento(sitio, dias, hoyISO);
  const desdeHoy = semana.find((d) => d.fecha >= hoyISO && d.entrena);
  if (desdeHoy?.sesion) {
    return { fecha: desdeHoy.fecha, dia: desdeHoy.dia, sesion: desdeHoy.sesion };
  }
  const lunes = lunesDe(hoyISO) + 7 * 86400000;
  const siguiente = semanaDeEntrenamiento(sitio, dias, isoDe(lunes)).find((d) => d.entrena);
  if (siguiente?.sesion) {
    return { fecha: siguiente.fecha, dia: siguiente.dia, sesion: siguiente.sesion };
  }
  // No puede pasar con 2, 3 o 4 días, pero deja un error claro si alguien toca
  // las rutinas y se queda sin ninguna sesión.
  throw new Error("La rutina no tiene ningún día de entrenamiento");
}
