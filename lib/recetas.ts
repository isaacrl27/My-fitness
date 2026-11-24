/**
 * Las recetas detalladas de los platos, paso a paso «para tontos».
 *
 * Isaac lo pidió con estas palabras: cuando no cocina nunca, «corta la cebolla
 * y sofríe» no significa nada. Aquí cada paso dice qué fuego, cuántos minutos y
 * cómo se sabe que está hecho (el color, el olor, la textura), y cada receta
 * lleva un truco y una preparación previa.
 *
 * Viven aparte de `platos.ts` (que guarda lo nutricional y los gramos) para no
 * mezclar cuentas con texto, y se enganchan por el nombre exacto del plato: la
 * receta NO repite cantidades, esas salen del plato en la pantalla. Si un plato
 * aún no tiene receta detallada, la app enseña sus tres pasos de siempre.
 */

import { PIEZAS_POR_ID } from "./combinaciones.ts";
import type { Pieza } from "./combinaciones.ts";
import type { Plato } from "./platos.ts";

export type PasoReceta = {
  /** «Enciende los fuegos», «Pela y corta»… en dos o tres palabras. */
  titulo: string;
  /** Qué se hace, con fuego, minutos y cómo se nota que va bien. */
  texto: string;
};

export type Receta = {
  /** Minutos en total, con el horno o los hervores contados. */
  tiempoMin: number;
  dificultad: "muy fácil" | "fácil" | "media";
  /** Lo que hay que sacar antes de empezar (ollas, sartén, batidora…). */
  utensilios: string[];
  /** La preparación previa: «calienta el horno», «pon la olla con agua»… */
  antes: string;
  pasos: PasoReceta[];
  /** El consejo que evita el fallo típico de quien está aprendiendo. */
  truco: string;
  /** Solo cuando tiene sentido guardarlo para otro día. */
  conservacion?: string;
};

export const RECETAS: Record<string, Receta> = {
  "Avena con plátano y nueces": {
    tiempoMin: 8,
    dificultad: "muy fácil",
    utensilios: ["Un bol grande", "Una olla pequeña", "Una cuchara"],
    antes: "Saca todo de la despensa y quita la piel al plátano.",
    pasos: [
      {
        titulo: "Calienta la leche",
        texto:
          "Echa la leche en la olla y ponla a fuego medio. Espera hasta que salgan hilillos de vapor, como cuando ves subir el humo de un café caliente. No hace falta que hierva: si la dejas hervir, luego la avena se pega.",
      },
      {
        titulo: "Echa la avena",
        texto:
          "Cuando la leche esté caliente, echa los copos de avena y remueve con la cuchara. Baja el fuego a bajo, que apenas se note, y deja 3 minutos. Remueve cada medio minuto para que no se pegue al fondo.",
      },
      {
        titulo: "La prueba del punto",
        texto:
          "Está lista cuando la mezcla se ve espesa y no cae de la cuchara de golpe: cae despacio, medio pegada. Si la ves líquida, un minuto más; si está muy dura, un chorrito de leche.",
      },
      {
        titulo: "Aparca y añade",
        texto:
          "Apaga el fuego, echa la mezcla en el bol y corta el plátano en rodajas de medio dedo. Pon las rodajas por encima y espolvorea las nueces, partiéndolas antes con las manos en trozos pequeños.",
      },
    ],
    truco:
      "Las nueces van al final, nunca al fuego: si se calientan mucho amargan. Y si la avena te queda sosa, el toque no es más azúcar, es una pizca de sal cuando eches los copos.",
    conservacion:
      "De un día para otro se pone dura: al recalentarla, échale un chorro de leche y remueve.",
  },

  "Pollo con arroz y brócoli": {
    tiempoMin: 25,
    dificultad: "fácil",
    utensilios: ["Una olla", "Una sartén grande", "Una tabla y un cuchillo"],
    antes: "Pon agua a hervir en la olla y corta el brócoli en ramilletes del tamaño de una nuez.",
    pasos: [
      {
        titulo: "El brócoli, primero",
        texto:
          "Cuando el agua esté hirviendo, echa una pizca de sal y el brócoli. Deja 5 minutos con el fuego alto. Se pincha con un tenedor para ver si cede: si entra sin fuerza, está. Escúrrelo en un colador y reserva.",
      },
      {
        titulo: "Corta el pollo",
        texto:
          "Mientras se cuece el brócoli, corta la pechuga en tiras del grosor de un dedo meñique. Cuanto más iguales, mejor: así no queda una cruda y otra seca.",
      },
      {
        titulo: "A la sartén",
        texto:
          "Pon la sartén a fuego medio-alto con el aceite. Cuando una pizca de pan o una gota de agua chisporrotee al caer, echa el pollo. Deja 4 minutos SIN tocarlo: se dora. Luego dale la vuelta y 3 minutos más.",
      },
      {
        titulo: "Comprueba el pollo",
        texto:
          "Corta una tira por la mitad: por dentro tiene que estar blanco entero, sin nada rosa. Si ves rosa, deja 2 minutos más. Cuando esté, baja el fuego al mínimo.",
      },
      {
        titulo: "Monta el plato",
        texto:
          "Añade el brócoli escurrido y el arroz a la sartén, remueve 1 minuto para que se mezcle con el aceite y el jugo del pollo, y sirve. Si tienes limón, un chorrito por encima cambia el plato entero.",
      },
    ],
    truco:
      "La sartén se llena como mucho por la mitad. Si echas todo el pollo de golpe, suelta agua y en vez de dorarse se cuece, que es lo que hace que sepa a cartón.",
    conservacion: "Guarda el sobrante en un táper y cómelo dentro de 2 días, bien caliente.",
  },

  "Lentejas estofadas": {
    tiempoMin: 20,
    dificultad: "fácil",
    utensilios: ["Una cazuela o una olla", "Una cuchara de madera", "Una tabla y un cuchillo"],
    antes:
      "Las lentejas son ya cocidas (de bote), así que solo hay que escurrirlas y pasarles agua por encima en el colador.",
    pasos: [
      {
        titulo: "Corta las verduras pequeñas",
        texto:
          "Pela la zanahoria y la cebolla, y corta las dos en trozos pequeños, como la mitad de una uña. El pimiento rojo, igual, y quítale las pepitas de dentro. Todo del mismo tamaño para que se haga a la vez.",
      },
      {
        titulo: "El sofrito, sin prisa",
        texto:
          "Echa el aceite en la cazuela a fuego medio, añade la cebolla y espera 4 minutos removiendo de vez en cuando. Buscas que esté blandita y casi transparente, no dorada. Después, la zanahoria y el pimiento: 4 minutos más.",
      },
      {
        titulo: "Todo junto",
        texto:
          "Echa las lentejas, remueve, y añade medio vaso de agua (o dos dedos, que asome un poco). Sube el fuego para que hierva, y en cuanto hierva, otra vez abajo. Deja 5 minutos con la tapa puesta y el fuego bajo.",
      },
      {
        titulo: "El toque final",
        texto:
          "Apaga y prueba. Aquí van las especias: una pizca de sal, pimentón (una cucharadita, fuera del fuego para que no amargue) y, si te atreves, un pellizco de comino. Remueve y tapa 2 minutos para que se junten los sabores.",
      },
    ],
    truco:
      "Si le falta sabor, no eches más sal: echa media cucharadita de pimentón y deja reposar. Saben mejor de un día para otro.",
    conservacion: "Aguantan 3 días en la nevera y congelan perfectamente en raciones.",
  },

  "Merluza a la plancha con verduras": {
    tiempoMin: 15,
    dificultad: "fácil",
    utensilios: ["Una plancha o sartén grande", "Una tabla", "Papel de cocina"],
    antes:
      "Saca el pescado 10 minutos de la nevera (frío del todo, se pega) y seca las verduras y el pescado con papel: si hay agua, no se dorarán.",
    pasos: [
      {
        titulo: "Corta las verduras",
        texto:
          "Corta el calabacín en aros de medio centímetro (ni finos ni gruesos) y el pimiento en tiras de dos dedos de ancho. Cuanto más iguales, mejor quedan.",
      },
      {
        titulo: "El fuego alto",
        texto:
          "Pon la plancha o sartén a fuego fuerte con 2 cucharadas del aceite. Espera un minuto entero a que esté bien caliente: se nota porque las gotas de agua que caen desaparecen al instante.",
      },
      {
        titulo: "Primero las verduras",
        texto:
          "Echa calabacín y pimiento. Déjalos 4 minutos sin moverlos (que se marquen) y otros 3 moviendo de vez en cuando. Tienen que quedar flexibles y con manchitas doradas, no negras.",
      },
      {
        titulo: "El pescado, con regla",
        texto:
          "Aparta las verduras a un lado y echa la merluza con un poco más de aceite. Regla de oro: 3 minutos por cada lado SIN tocarla. Se le da la vuelta una sola vez, con la espátula, sin pegarla un pellizco.",
      },
      {
        titulo: "La prueba del punto",
        texto:
          "Está hecha cuando el pescado se abre en lascas blancas al meter un tenedor por la mitad. Si se resiste, un minuto más por lado. Junta todo, echa sal por encima y sirve.",
      },
    ],
    truco:
      "Saca la merluza un rato antes de cocinarla y sécala bien: esos dos gestos valen más que cualquier salsa. Y no la muevas en la sartén, que se deshace.",
  },

  "Tortilla de patatas con ensalada": {
    tiempoMin: 20,
    dificultad: "media",
    utensilios: ["Una sartén antiadherente", "Un bol", "Un tenedor", "Una espátula"],
    antes: "La patata viene cocida. Solo hay que cortarla en rodajas de medio centímetro y tener los huevos fuera de la nevera.",
    pasos: [
      {
        titulo: "Bate los huevos",
        texto:
          "Casca los huevos en el bol y bátelos con el tenedor unos 30 segundos, hasta que la clara y la yema sean una sola cosa amarilla. Echa una pizca de sal.",
      },
      {
        titulo: "La patata, a la mezcla",
        texto:
          "Añade las rodajas de patata al bol y remueve para que se empapen. Déjalas ahí 2 minutos: ese reposo es lo que hace que la tortilla quede jugosa.",
      },
      {
        titulo: "Cuájala a fuego medio-bajo",
        texto:
          "Echa el aceite en la sartén a fuego medio-bajo y, cuando brille, vierte la mezcla. Mueve con la espátula los bordes hacia el centro durante los primeros 2 minutos, como recogiendo. Después déjala quieta 4-5 minutos.",
      },
      {
        titulo: "El momento de girarla",
        texto:
          "Sabes que está cuando los bordes están cuajados y el centro todavía tiembla un poco al mover la sartén. Pon un plato encima, dale la vuelta con un golpe de muñeca decidido y cuájala 2 minutos más (si la quieres jugosa, 1 minuto).",
      },
      {
        titulo: "La ensalada, en un minuto",
        texto:
          "Corta la lechuga en tiras con las manos (con cuchillo se oxida antes), ponla en un bol, añade un chorrito del aceite con sal y remueve. Sirve la tortilla al lado, caliente.",
      },
    ],
    truco:
      "El fuego medio-bajo es todo: a fuego fuerte se dora por fuera y queda cruda por dentro, que es el fallo clásico de la primera tortilla.",
    conservacion: "En la nevera aguanta 2 días; fría está igual de buena.",
  },

  "Crema de calabacín con pollo": {
    tiempoMin: 30,
    dificultad: "fácil",
    utensilios: ["Una olla", "Una sartén", "Una batidora", "Una tabla y un cuchillo"],
    antes: "Lava el calabacín y la cebolla, y corta todo en trozos gruesos: dan igual las formas, porque al final se bate.",
    pasos: [
      {
        titulo: "Pocha la cebolla",
        texto:
          "Echa el aceite en la olla a fuego medio y añade la cebolla cortada. 5 minutos removiendo de vez en cuando. Tiene que quedar blanda y sin color: si se dora, baja el fuego.",
      },
      {
        titulo: "El calabacín",
        texto:
          "Añade el calabacín cortado (sin pelar, la piel da el color verde) y remueve 2 minutos. Cubre de agua con medio dedo por encima de las verduras, sube el fuego y cuenta 12 minutos desde que hierva.",
      },
      {
        titulo: "El pollo, aparte",
        texto:
          "Mientras cuece la crema, corta el pollo en taquitos y hazlos en la sartén a fuego medio-alto: 4 minutos por un lado y 3 por otro, sin tocarlos al principio. Comprueba que no quede rosa por dentro.",
      },
      {
        titulo: "Bate",
        texto:
          "Escurre medio vaso del agua de las verduras (guárdala) y bate la olla con la batidora, bien metida y con movimiento, hasta que no queden grumos. Si está espesa, échale el agua guardada poco a poco.",
      },
      {
        titulo: "Junta y sirve",
        texto:
          "Prueba, echa sal y una pizca de pimienta negra. Sirve la crema en el plato con el pollo por encima o dentro, como más te guste.",
      },
    ],
    truco:
      "Bate siempre con la batidora metida del todo y con la olla fuera del fuego: así no saltan gotas ardiendo. Y si quieres que sepa más a calabacín, menos agua, que se cueza con la que suelta.",
    conservacion: "La crema sola aguanta 3 días; el pollo, 2. Se recalientan juntos en la olla.",
  },

  "Ensalada de atún con tomate y maíz": {
    tiempoMin: 7,
    dificultad: "muy fácil",
    utensilios: ["Un bol grande", "Un escurridor"],
    antes: "Escurre bien el atún y el maíz por separado: si tienen su agua, la ensalada sale aguada.",
    pasos: [
      {
        titulo: "La base",
        texto:
          "Lava la lechuga y sécala bien (si tiene goteos, el aliño resbala). Córtala en tiras anchas y ponla en el bol, formando una cama.",
      },
      {
        titulo: "El tomate",
        texto:
          "Corta el tomate en trozos de bocado, de un par de centímetros. Si es en rodajas finas y grandes, se deshace al remover.",
      },
      {
        titulo: "El atún y el maíz",
        texto:
          "Añade el atún en lascas, no de un bloque: sepáralo con el tenedor. Después el maíz, escurrido, repartido por encima.",
      },
      {
        titulo: "Aliña al final",
        texto:
          "Echa el aceite, una pizca de sal y, si tienes, unas gotas de vinagre o medio limón. Remueve con las manos desde el fondo, con suavidad, para no aplastar el tomate. Sirve enseguida.",
      },
    ],
    truco:
      "El aliño, en el último momento: si la ensalada espera aliñada, la lechuga se pone mustia y sabe a poquito.",
  },

  "Yogur natural con nueces": {
    tiempoMin: 2,
    dificultad: "muy fácil",
    utensilios: ["Un bol", "Una cuchara"],
    antes: "Nada: saca el yogur y las nueces y listo.",
    pasos: [
      {
        titulo: "Echa el yogur",
        texto: "Pon el yogur en el bol. Si te gusta más suelto, remuévelo 10 segundos con la cuchara antes.",
      },
      {
        titulo: "Parte las nueces",
        texto:
          "Parte las nueces con las manos en trozos medianos, de los que se ven. No las machaques del todo: al morder tienen que crujir, y si son polvo no se notan.",
      },
      {
        titulo: "El toque",
        texto:
          "Echa las nueces por encima y, si quieres, media cucharadita de miel o una pizca de canela. Remueve una vez, para que se mezcle un poco, y ya está.",
      },
    ],
    truco:
      "Compra el yogur natural sin azúcar y mira la etiqueta: algunos «naturales» llevan azúcar y no son mejores que un flan.",
  },

  "Huevos revueltos con aguacate y pan": {
    tiempoMin: 10,
    dificultad: "fácil",
    utensilios: ["Una sartén antiadherente", "Un bol", "Un tenedor", "Una espátula"],
    antes: "Saca los huevos y el aguacate 10 minutos antes de la nevera: el aguacate frío sabe a poco.",
    pasos: [
      {
        titulo: "Bate los huevos",
        texto:
          "Casca los huevos en el bol y bátelos con el tenedor 20 segundos, sin fuerza: solo que la yema y la clara se junten. Una pizca de sal.",
      },
      {
        titulo: "Fuego bajo, muy bajo",
        texto:
          "Pon la sartén a fuego BAJO con un poco de aceite y echa los huevos. Empieza a remover despacio con la espátula, pasando por el fondo cada pocos segundos. A los 2 minutos verás que espesan poco a poco.",
      },
      {
        titulo: "El punto del revuelto",
        texto:
          "Retíralos cuando estén cuajados pero todavía brillantes y con alguna parte jugosa, sobre los 3 minutos. SI los dejas hasta que estén secos, parecerán de goma: se cuajan del todo en el plato.",
      },
      {
        titulo: "El pan y el aguacate",
        texto:
          "Tuesta el pan mientras. Corta el aguacate por la mitad, sácale el hueso con la punta de una cuchara y corta láminas. Sírvelo encima de los huevos, con una pizca de sal en el aguacate.",
      },
    ],
    truco:
      "Con el aguacate y los huevos, menos es más: no le eches ajo ni especias fuertes, que se comen los dos sabores. Sal y listo.",
  },

  "Yogur con kiwi y pipas": {
    tiempoMin: 4,
    dificultad: "muy fácil",
    utensilios: ["Un bol", "Un cuchillo pequeño", "Una cuchara"],
    antes: "Nada. Si el kiwi está duro como una piedra, mejor espera otro día: un kiwi duro pica en la lengua.",
    pasos: [
      {
        titulo: "El truco del kiwi",
        texto:
          "Corta los dos extremos del kiwi y mételo una cucharilla entre la piel y la carne, girando todo alrededor, como si el kiwi fuese una taza. Sale entero. Si se resiste, pégalo con el cuchillo.",
      },
      {
        titulo: "Corta y monta",
        texto:
          "Echa el yogur en el bol y pon el kiwi en trozos por encima, del tamaño de un bocado.",
      },
      {
        titulo: "Las pipas, al final",
        texto:
          "Echa las pipas de girasol por encima justo antes de comerlas: si se echan mucho antes se ablandan y pierden el crujiente, que es lo único que hacen estas pipas.",
      },
    ],
    truco:
      "Las pipas de girasol del supermercado vienen ya peladas y tostadas sin sal. Si las coges con sal, no eches sal al yogur, claro.",
  },

  "Tostada de queso fresco y tomate": {
    tiempoMin: 6,
    dificultad: "muy fácil",
    utensilios: ["Un tostador o la sartén", "Un cuchillo"],
    antes: "Saca el queso fresco de la nevera un rato antes: frío de todo no sabe a nada.",
    pasos: [
      {
        titulo: "El pan",
        texto:
          "Tuesta el pan hasta que esté firme y con las puntas doradas, pero no carbonizado. En tostador, dos pasadas; en sartén, 1 minuto por cara a fuego medio.",
      },
      {
        titulo: "Primero el queso",
        texto:
          "Unta el queso fresco batido, generoso, como si fuera mantequilla: cubre toda la tostada, porque es lo que sujeta el tomate.",
      },
      {
        titulo: "El tomate, en rodajas finas",
        texto:
          "Corta el tomate en rodajas de medio centímetro y colócalas encima. Echa la cucharadita de aceite y una pizca de sal. Si tienes albahaca seca, una pizca por encima, y gana de verdad.",
      },
    ],
    truco:
      "El tomate fuera de la nevera sabe el doble. Si lo guardas en frío, sácalo una hora antes de comerlo.",
  },

  "Batido de fresas y avena": {
    tiempoMin: 5,
    dificultad: "muy fácil",
    utensilios: ["Una batidora de vaso", "Una báscula de cocina"],
    antes: "Quita las hojas de las fresas y pásalas bajo el grifo un segundo; no las dejes en remojo, se llenan de agua.",
    pasos: [
      {
        titulo: "Primero lo blando",
        texto:
          "Echa la leche y las fresas en el vaso. Bate 15 segundos. Así las fresas se hacen puré antes de que la avena empiece a costar.",
      },
      {
        titulo: "La avena",
        texto:
          "Añade la avena y la miel. Bate 30 segundos más. Mira el vaso por la ventana: cuando ya no veas copos enteros subiendo, está listo.",
      },
      {
        titulo: "La prueba",
        texto:
          "Si en el primer sorbo notas trozos de avena y no te gustan así, bate 30 segundos más. Y si está espeso de más, un chorro de leche y una vuelta rápida.",
      },
    ],
    truco:
      "Con la avena no hagas el batido la noche antes: se pone pastoso. Se bate al momento, que son dos minutos.",
  },

  "Revuelto de espinacas y queso": {
    tiempoMin: 8,
    dificultad: "fácil",
    utensilios: ["Una sartén antiadherente", "Un bol", "Una espátula"],
    antes: "Ten las espinacas listas: mejor de bolsa, que vienen lavadas. No necesitan cortarse.",
    pasos: [
      {
        titulo: "Las espinacas",
        texto:
          "Echa las espinacas en la sartén a fuego medio SIN aceite aún, con una pizca de sal. En un minuto bajan y sueltan su agua: eso es normal. Remueve hasta que estén verdes oscuras y compactas, unos 2 minutos. Echa entonces el aceite alrededor.",
      },
      {
        titulo: "Los huevos",
        texto:
          "Bate los huevos en el bol y échalos a la sartén con las espinacas. Fuego medio-bajo y remueve despacio, como en cualquier revuelto.",
      },
      {
        titulo: "El queso, al final",
        texto:
          "Cuando el huevo esté casi cuajado, echa el queso rallado y remueve 30 segundos para que se funda con el calor residual. Retira y sirve con el pan tostado.",
      },
    ],
    truco:
      "El exceso de agua que sueltan las espinacas frías de supermercado se corrige con ese primer minuto sin aceite: se hacen con su propio vapor.",
  },

  "Cereales de avena con leche y fresas": {
    tiempoMin: 3,
    dificultad: "muy fácil",
    utensilios: ["Un bol", "Un cuchillo"],
    antes: "Nada.",
    pasos: [
      {
        titulo: "Echa y cubre",
        texto:
          "Pon la avena en el bol y cúbrela con la leche. Deja 1 minuto antes de comer: eso ablanda los copos lo justo para que no raspen.",
      },
      {
        titulo: "Las fresas",
        texto:
          "Quita las hojas, lávalas un segundo y córtalas por la mitad, de arriba abajo. Encima del bol.",
      },
      {
        titulo: "El orden importa",
        texto:
          "Si te gustan crujientes, come enseguida; si te gusta que se mezcle todo, remueve y espera 2 minutos más. Y si quieres el bol más completo, una cucharadita de miel y ya.",
      },
    ],
    truco:
      "Con cereales de avena mira la etiqueta: los crujientes azucarados parecen avena pero llevan más azúcar que un bollo. Los copos «de siempre» son la buena opción.",
  },

  "Curry de garbanzos con arroz": {
    tiempoMin: 20,
    dificultad: "fácil",
    utensilios: ["Una sartén o cazuela", "Una cuchara de madera", "Una tabla y un cuchillo"],
    antes: "Escurre los garbanzos y pásalos por agua en el colador, así no te sabe a conserva. Ten el arroz ya cocido.",
    pasos: [
      {
        titulo: "Pica pequeño",
        texto:
          "Corta la cebolla en trozos de medio centímetro. El aceite en la sartén a fuego medio, y la cebolla: 5 minutos removiendo de vez en cuando, hasta que se vea blandita y transparente.",
      },
      {
        titulo: "El curry se despierta",
        texto:
          "Echa una CUCHARADITA de curry y remueve 30 segundos con la cebolla: así las especias sueltan su aroma antes de que llegue el tomate, y si no lo haces saben a polvo crudo. Después, el tomate triturado y la sal.",
      },
      {
        titulo: "Los garbanzos",
        texto:
          "Echa los garbanzos, remueve y añade medio vaso de agua. Deja 8 minutos a fuego bajo. El color de la salsa tiene que quedar de ladrillo oscuro. Si se seca, un chorrito más de agua; si está caldoso, otros dos minutos sin tapa.",
      },
      {
        titulo: "Sirve y prueba",
        texto:
          "Echa el arroz en el plato y el curry por encima. Prueba primero una cucharada: si te pica de más, un chorrito de leche o una cucharada de yogur lo arregla al instante.",
      },
    ],
    truco:
      "El curry del supermercado varía un montón de picante: empieza con media cucharadita la primera vez y ajusta. Y deja reposar 2 minutos antes de comer, que espesa y se junta.",
    conservacion: "Está mejor al día siguiente; en la nevera aguanta 3 días.",
  },

  "Espaguetis con verduras salteadas": {
    tiempoMin: 15,
    dificultad: "muy fácil",
    utensilios: ["Una sartén grande", "Una tabla y un cuchillo"],
    antes: "Ten las verduras cortadas antes de empezar: es un plato rápido y no da tiempo a cortar mientras.",
    pasos: [
      {
        titulo: "Corta fino",
        texto:
          "Corta la cebolla en tiras finas, el pimiento en tiras de un centímetro y el calabacín en tacos de medio. Todo del tamaño parecido: es lo que hace que se haga a la vez.",
      },
      {
        titulo: "El orden",
        texto:
          "Aceite en la sartén a fuego medio-alto. Primero la cebolla y el pimiento, 4 minutos, hasta que la cebolla esté doradita en los bordes. Después el calabacín, 3 minutos más, sin tapar, que se dore.",
      },
      {
        titulo: "La pasta se incorpora",
        texto:
          "Echa la pasta ya cocida a la sartén y remueve un minuto. Dos cucharadas del agua de cocer la pasta (o de agua normal) hacen que todo se ligue y no salga seco.",
      },
      {
        titulo: "El toque final",
        texto:
          "Fuera del fuego: sal, una vuelta de pimienta negra y, si tienes, albahaca seca o queso rallado por encima. Sirve al momento.",
      },
    ],
    truco:
      "Si la pasta es de ayer, a la sartén directa: los espaguetis del día tienen mejor mordida, pero los de ayer se recomponen perfectamente salteados.",
  },

  "Lubina a la plancha con patatas": {
    tiempoMin: 18,
    dificultad: "media",
    utensilios: ["Una plancha o sartén grande", "Una espátula", "Papel de cocina"],
    antes: "Saca la lubina 10 minutos de la nevera y sécala con papel por dentro y por fuera. Sin agua, no se pega.",
    pasos: [
      {
        titulo: "Prepara el ajo",
        texto:
          "Pela el ajo, córtalo en láminas muy finas y échalas al aceite cuando esté templado, a fuego bajo, 1 minuto: el ajo tiene que dorarse pero no quemarse, que amarga. Aparta las láminas.",
      },
      {
        titulo: "La plancha, muy caliente",
        texto:
          "Sube el fuego y espera a que la plancha esté bien caliente: una gota de agua desaparece al instante. La lubina con la piel hacia abajo. NO la toques ni la muevas.",
      },
      {
        titulo: "Tres y tres",
        texto:
          "3 minutos por el lado de la piel, hasta verla crujiente y dorada en los bordes. Otra vez con la espátula, un solo giro decidido, y 3 minutos más. Está hecha cuando la carne se abre en lascas al meter el tenedor.",
      },
      {
        titulo: "Las patatas",
        texto:
          "Con la plancha todavía caliente, pasa las rodajas de patata cocida 1 minuto por cada lado, para que se doren un poco con el jugo del pescado. Sirve todo junto, con sal gruesa y el ajo por encima.",
      },
    ],
    truco:
      "La lubina se puede pedir entera o en lomos: si eres de los que no quiere espinas, pide los lomos. Con la piel, si la dejas bien crujiente, se come y todo.",
  },

  "Pollo con cous cous y calabacín": {
    tiempoMin: 20,
    dificultad: "fácil",
    utensilios: ["Una sartén", "Un cazo o un bol resistente al calor", "Una tabla y un cuchillo"],
    antes: "Pon a hervir agua en el cazo: el cous cous pide agua hirviendo y cinco minutos tapado, sin más cocción.",
    pasos: [
      {
        titulo: "El cous cous",
        texto:
          "Pon el cous cous en un bol y échale la misma cantidad de agua hirviendo (misma cantidad que cous cous, ni más ni menos), un chorrito de aceite y sal. Tapa con un plato 5 minutos. Luego suelta los granos con un tenedor, no con la cuchara.",
      },
      {
        titulo: "El pollo",
        texto:
          "Corta la pechuga en tiras y salpimienta. Sartén a fuego medio-alto con el aceite. 4 minutos por un lado SIN moverlo (ese es el dorado), y 3 por el otro. Aparta al final, cuando ya no veas rosa al cortar una tira.",
      },
      {
        titulo: "El calabacín",
        texto:
          "En la misma sartén, echa el calabacín en dados. 3 minutos a fuego fuerte moviéndolo, solo que pierda el duro y coja manchitas doradas. No lo tengas más: se pone mustio.",
      },
      {
        titulo: "Junta y sirve",
        texto:
          "Mezcla el cous cous, el calabacín y el pollo. Prueba de sal y un chorrito de limón (o un poco de ras el hanout o comino si tienes) y ya tienes un plato del norte de África de andar por casa.",
      },
    ],
    truco:
      "El cous cous se pasa en un momento: agua hirviendo, 5 minutos tapado y a soltar. Si lo dejas más, se apelmaza y no hay quien lo separe.",
  },

  "Ensalada de lentejas con tomate y cebolla": {
    tiempoMin: 8,
    dificultad: "muy fácil",
    utensilios: ["Un bol", "Un colador", "Una tabla y un cuchillo"],
    antes: "Escurre las lentejas y pásalas por agua fría: pierden el sabor a bote y quedan sueltas.",
    pasos: [
      {
        titulo: "El trabajo fino",
        texto:
          "Corta el tomate en trozos de un centímetro y la cebolla en trozos muy pequeños (a la cebolla cruda, cuanto más pequeña, menos pica).",
      },
      {
        titulo: "Monta",
        texto:
          "Pon las lentejas en el bol y añade el tomate y la cebolla. Remueve con cuidado: las lentejas de bote se rompen si las remueves con fuerza.",
      },
      {
        titulo: "El aliño",
        texto:
          "Aceite, una pizca de sal abundante, un chorrito de vinagre y, si tienes salvia, orégano o comino, una pizca. Los sabores necesitan 10 minutos de reposo: hacerla un poco antes cambia el plato.",
      },
    ],
    truco:
      "Un puñadito de atún o un huevo duro la convierten en un plato completo de comida, y ya está la comida resuelta sin encender nada.",
  },

  "Estofado de ternera con patatas": {
    tiempoMin: 40,
    dificultad: "media",
    utensilios: ["Una cazuela", "Una cuchara de madera", "Una tabla y un cuchillo"],
    antes: "Corta la ternera en dados de bocado y sécala con papel: para dorarse necesita ir seca a la cazuela.",
    pasos: [
      {
        titulo: "Dora la carne",
        texto:
          "Aceite en la cazuela a fuego fuerte. Echa la ternera y déjala 2 minutos por cada cara SIN tocarla, hasta que esté marrón oscura por fuera. No la muevas para ver si se pega: esa costra es el sabor.",
      },
      {
        titulo: "Las verduras",
        texto:
          "Baja el fuego a medio, añade la cebolla y la zanahoria en trozos y remueve 5 minutos, para que la cebolla se ablande con el jugo de la carne.",
      },
      {
        titulo: "El agua y la espera",
        texto:
          "Cubre de agua (que asome un dedo por encima), echa sal y tapa. Fuego bajo, que apenas hierva a borbotones pequeños, 20 minutos.",
      },
      {
        titulo: "Las patatas, al final",
        texto:
          "Añade las patatas en trozos grandes y deja 8 minutos más. Están cuando un cuchillo entra sin esfuerzo. Prueba de sal y, si el caldo está claro, aplasta una o dos patatas en la cazuela para espesarlo.",
      },
    ],
    truco:
      "Si te queda duro y no es ternera (es de otra parte del animal), 10 minutos más y otra vez. La carne de guisos no se pasa, se mejora.",
    conservacion: "Está mejor al día siguiente. Aguanta 3 días en la nevera.",
  },

  "Macarrones con tomate y atún": {
    tiempoMin: 12,
    dificultad: "muy fácil",
    utensilios: ["Una sartén", "Una cuchara de madera"],
    antes: "Escurre bien el atún y ten la pasta ya cocida.",
    pasos: [
      {
        titulo: "El tomate",
        texto:
          "Echa el tomate triturado en la sartén con el aceite y una pizca de sal, fuego medio. Deja 4 minutos: tiene que perder el color naranja brillante y oscurecerse un poco. Ese es el momento en que deja de saber a chino.",
      },
      {
        titulo: "El atún",
        texto:
          "Añade el atún en lascas con el tenedor (no un bloque) y remueve 1 minuto. Con el atún natural no hace falta más.",
      },
      {
        titulo: "La pasta",
        texto:
          "Echa la pasta y remueve 1 minuto más para que se impregne. Si queda espeso, un par de cucharadas del agua de cocer la pasta. Sirve con orégano por encima si te gusta.",
      },
    ],
    truco:
      "El atún al natural se rompe menos y deja la salsa más limpia que el de aceite. Y añade las especias al tomate (orégano, pimienta) mientras se hace, no al final.",
  },

  "Arroz con gambas y guisantes": {
    tiempoMin: 15,
    dificultad: "fácil",
    utensilios: ["Una sartén grande o paellera", "Una cuchara de madera"],
    antes: "Si las gambas son congeladas, déjalas 10 minutos en agua fría y sécalas. Frías y mojadas sueltan agua y cuecen en vez de dorarse.",
    pasos: [
      {
        titulo: "Las gambas",
        texto:
          "Aceite a fuego fuerte en la sartén. Echa las gambas y déjalas 1 minuto por lado, hasta que cambien de gris a rosa vivo. Sácalas a un plato: solo entran ahora para dar sabor al aceite.",
      },
      {
        titulo: "La verdura y el arroz",
        texto:
          "Baja a fuego medio. Echa los guisantes y remueve 2 minutos. Añade el arroz ya cocido y remueve 2 minutos más, para que se dore un poco.",
      },
      {
        titulo: "Devuelve las gambas",
        texto:
          "Echa las gambas de vuelta, remueve 1 minuto y apaga. Prueba de sal y sirve en el momento: el arroz caliente dura caliente diez minutos.",
      },
    ],
    truco:
      "Con un pellizco de pimentón (fuera del fuego, que no amargue) y medio limón por encima, sabe a paella sin serlo. Y la próxima vez, prueba a cambiar las gambas por calamar.",
  },
};

/** La receta detallada de un plato, o null si aún no la tiene. */
export function recetaDe(nombre: string): Receta | null {
  return RECETAS[nombre] ?? null;
}

// --- Recetas de los platos combinados ---------------------------------------

/** Minutos que pide cada pieza (varias se hacen a la vez). */
const TIEMPO_PIEZA: Record<string, number> = {
  arroz: 18,
  pasta: 10,
  patata: 20,
  couscous: 5,
  quinoa: 15,
  boniato: 25,
  pan: 3,
  pollo: 8,
  pavo: 6,
  ternera: 6,
  cerdo: 8,
  merluza: 12,
  salmon: 12,
  atun: 4,
  gambas: 3,
  huevo: 5,
  tofu: 8,
  lentejas: 10,
  garbanzos: 5,
  sardinas: 6,
  brocoli: 6,
  judias: 8,
  espinacas: 3,
  calabacin: 6,
  pimientos: 15,
  ensalada: 5,
  tomate: 3,
  coliflor: 8,
  limon: 2,
  yogur: 2,
  soja: 2,
  mostaza: 2,
  salsaTomate: 5,
  vinagreta: 2,
};

const AL_HORNO = new Set(["merluza", "salmon", "boniato", "pimientos"]);
const A_LA_OLLA = new Set([
  "arroz",
  "pasta",
  "patata",
  "couscous",
  "quinoa",
  "brocoli",
  "judias",
  "coliflor",
]);
const A_LA_SARTEN = new Set([
  "pollo",
  "pavo",
  "ternera",
  "cerdo",
  "atun",
  "gambas",
  "huevo",
  "tofu",
  "garbanzos",
  "sardinas",
  "calabacin",
  "espinacas",
]);

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * La receta de un plato combinado, montada con las recetas de sus piezas.
 *
 * No hay una receta escrita para cada una de las miles de combinaciones (sería
 * imposible de mantener), pero sí por cada pieza: aquí se juntan en el orden en
 * que se cocinan, con el tiempo y los cacharros que hacen falta. Si el plato ya
 * tiene una receta escrita a mano, manda esa.
 */
export function recetaDePlato(plato: Plato): Receta | null {
  const escrita = RECETAS[plato.nombre];
  if (escrita) return escrita;
  if (!plato.piezas?.length) return null;

  const piezas = plato.piezas
    .map((id) => PIEZAS_POR_ID.get(id))
    .filter((p): p is Pieza => p !== undefined);
  if (piezas.length !== plato.piezas.length) return null;

  const ids = piezas.map((p) => p.id);
  const tiempoMin = Math.max(...ids.map((id) => TIEMPO_PIEZA[id] ?? 5)) + 5;

  const utensilios: string[] = [];
  if (ids.some((id) => A_LA_OLLA.has(id))) utensilios.push("Una olla");
  if (ids.some((id) => A_LA_SARTEN.has(id))) utensilios.push("Una sartén");
  if (ids.some((id) => AL_HORNO.has(id))) utensilios.push("El horno y una bandeja");
  utensilios.push("Un bol pequeño para el aliño", "Un cuchillo y una tabla");

  const hayHorno = ids.some((id) => AL_HORNO.has(id));
  const hayOlla = ids.some((id) => A_LA_OLLA.has(id));

  return {
    tiempoMin,
    dificultad: "fácil",
    utensilios,
    antes: hayHorno
      ? "Calienta el horno a 200 °C y pon agua a hervir si hace falta. Saca las piezas de la nevera para que no estén heladas."
      : hayOlla
        ? "Pon agua a hervir y saca las piezas de la nevera para que no estén heladas."
        : "Saca las piezas de la nevera y deja todo a mano antes de encender el fuego.",
    pasos: piezas.map((p) => ({ titulo: conMayuscula(p.nombre), texto: p.preparacion })),
    truco:
      "Lo que más tarda va primero: si hay olla u horno, empieza por ahí y aprovecha mientras se hace para preparar la proteína y el aliño. La verdura se hace al final para que no se pase; el aliño, en un bol aparte, para echarlo justo antes de comer.",
  };
}
