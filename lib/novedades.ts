/**
 * Lo que se le cuenta a la familia al abrir la app.
 *
 * Cada vez que haya algo que merezca la pena contar, se sube `VERSION` en uno
 * y se añaden las líneas nuevas arriba con su número de versión.
 *
 * Quien ya leyó una versión anterior solo ve lo que ha cambiado desde su
 * última visita, sin repetir lo que ya vio.
 */

export type Novedad = {
  /** La versión en la que se introdujo esta mejora. */
  version?: number;
  /** La frase corta, en negrita. */
  titulo: string;
  /** Una línea de detalle, opcional. */
  detalle?: string;
};

/** La versión del aviso. Se sube de uno en uno, nunca se baja. */
export const VERSION = 100;

/** La marca que se guarda en el móvil. */
export const CLAVE_NOVEDADES = "mi-peso:novedades";

/** Lo que hay de nuevo en esta versión. Lo más importante, arriba. */
export const NOVEDADES: Novedad[] = [
  {
    version: 100,
    titulo: "Ventilador nórdico de nogal con luz inferior",
    detalle:
      "Aspas de nogal macizo con giro e inercia física, tija metálica recta, luz difusa inferior y tirador táctil fluido.",
  },
  {
    version: 99,
    titulo: "Lámpara elástica y revelación de acceso",
    detalle:
      "Tira de la bombilla para estirar su cable y encender la luz que revela el formulario de entrada en la app.",
  },
  {
    version: 98,
    titulo: "Lámpara interactiva con cordón en la entrada",
    detalle:
      "Tira del cordón elástico con física de muelles para encender la luz de la pantalla al entrar en la app.",
  },
  {
    version: 97,
    titulo: "Deslizamiento ultrasuave y avisos limpios",
    detalle:
      "Desliza comidas con aceleración fluida sin mover la pantalla, y campana centrada con botón para marcar todo leído al instante.",
  },
  {
    version: 96,
    titulo: "Deslizar para borrar y editar comidas",
    detalle:
      "Desliza cualquier comida a la izquierda para borrar con deshacer instantáneo, o a la derecha para editar.",
  },
  {
    version: 95,
    titulo: "Papelera elástica y casillas de código en grupos",
    detalle:
      "Papelera directa en comidas con confirmación elástica de 2 toques, y casillas OTP táctiles para unirte a grupos con animación.",
  },
  {
    version: 94,
    titulo: "Borrados seguros con confirmación elástica e Input OTP",
    detalle:
      "Confirmación elástica al borrar comidas o pesadas, y casillas OTP táctiles con avance automático en códigos de familia.",
  },
  {
    version: 93,
    titulo: "Plan de comidas limpio y directo",
    detalle:
      "Pantalla simplificada enfocada en lo verdaderamente útil: tu menú diario y tu lista de la compra sin botones superfluos.",
  },
  {
    version: 92,
    titulo: "Contador numérico continuo y fluido",
    detalle:
      "Arreglado el giro de dígitos en los litros de agua y calorías con carrete continuo que sube y baja suavemente al sumar o restar.",
  },
  {
    version: 91,
    titulo: "Plan de comidas organizado por momentos",
    detalle:
      "Explora desayunos, comidas, cenas y snacks con detalle paso a paso y añade platos a tu día en un toque.",
  },
  {
    version: 90,
    titulo: "Sincronización nocturna automática de pasos en iPhone",
    detalle:
      "Guía directa en Ajustes para activar la automatización de las 23:00 en Atajos y enviar los pasos solos sin tocar nada.",
  },
  {
    version: 89,
    titulo: "Campana de notificaciones interactiva",
    detalle:
      "Nueva campanilla estilo iOS en la cabecera que se balancea al tocarla y reúne mensajes de Isaac y novedades en un panel directo.",
  },
  {
    version: 88,
    titulo: "Mapa de calor de actividad y constancia",
    detalle:
      "Nueva cuadrícula interactiva en Progreso con los días del mes iluminados según tu constancia, racha y actividades completadas.",
  },
  {
    version: 87,
    titulo: "Giro continuo y fluido en los contadores",
    detalle:
      "Arreglado el giro del contador de agua y calorías para que ruede siempre en la misma dirección al sumar o restar sin saltos ni bloqueos.",
  },
  {
    version: 86,
    titulo: "Contadores numéricos rodantes animados",
    detalle:
      "Las cifras de agua, calorías y puntos ahora ruedan y se deslizan suavemente en pantalla al cambiar de valor, como un reloj o ruleta.",
  },
  {
    version: 85,
    titulo: "Reacciones animadas con emojis flotantes",
    detalle:
      "Al tocar el agua o chocar los cinco en familia verás ráfagas de emojis flotando por la pantalla con animación orgánica elástica.",
  },
  {
    version: 84,
    titulo: "Lector de fotos de platos compatible con iPhone",
    detalle:
      "Arreglado el lector de fotos de platos para que admita fotos nativas de cualquier iPhone sin dar error al analizar la comida.",
  },
  {
    version: 83,
    titulo: "Consejos de cocina, pasos sin reloj y caprichos",
    detalle:
      "Aclarado el arroz y pasta crudo vs cocido, nuevos botones rápidos de pasos si no llevas el reloj y caprichos libres en mantenimiento.",
  },
  {
    version: 82,
    titulo: "Cálculos más justos y protección de cuenta",
    detalle:
      "Ajustes semanales protegidos ante retención de líquidos, mayor precisión al cambiar cantidades de comida y servidor blindado.",
  },
  {
    version: 81,
    titulo: "Foto a tu reloj y pasos a un toque",
    detalle:
      "Apunta tus pasos y sueño en segundos: con botones rápidos de 1 toque o haciéndole una foto a la pantalla de tu reloj o pulsera.",
  },
  {
    version: 80,
    titulo: "Tu cuenta y tu salud más protegidas",
    detalle:
      "Mayor seguridad para tus datos personales y de salud, con un acceso más rápido, fiable y protegido desde tu móvil.",
  },
  {
    version: 79,
    titulo: "Pasos directos con tu móvil",
    detalle:
      "Simplificada la conexión de salud: enlace directo con tu móvil (iPhone o Android) sin menús confusos de relojes.",
  },
  {
    version: 78,
    titulo: "Pasos a mano o automáticos desde Hoy",
    detalle:
      "Ahora en Hoy tienes el aviso y enlace directo para elegir si apuntar tus pasos a mano o conectarlos en Ajustes para que entren solos.",
  },
  {
    version: 77,
    titulo: "Salud a medida según tu móvil",
    detalle:
      "Ajustes se adapta a tu dispositivo: si tienes iPhone ves solo Apple Salud, y si tienes Android ves solo Health Connect.",
  },
  {
    version: 76,
    titulo: "Conexión de salud adaptada para Android y iPhone",
    detalle:
      "Ajustes detecta tu móvil y te muestra el botón exacto para conectar tus pasos: Health Connect en Android o Atajo en iPhone.",
  },
  {
    version: 75,
    titulo: "Conexión de pasos en iPhone con Apple Salud",
    detalle:
      "Conecta tus pasos del iPhone y Apple Watch en Ajustes con 1 toque para que se sincronicen solos cada noche.",
  },
  {
    version: 74,
    titulo: "Acceso directo y bienvenida sin líos",
    detalle:
      "Si ya entraste una vez, la app te recuerda y no te vuelve a pedir la clave. ¡Directo a tus comidas y tu día!",
  },
  {
    version: 73,
    titulo: "Buzón directo con Isaac en Ajustes",
    detalle:
      "¿Te falta un alimento o tienes una idea? Escríbela en Ajustes y le llega directamente a Isaac al momento.",
  },
  {
    version: 72,
    titulo: "Foto a la etiqueta si falta el producto",
    detalle:
      "Si escaneas un envase que no sale, haz foto a la tabla nutricional y la app te saca las calorías y gramos sola.",
  },
  {
    version: 71,
    titulo: "Privacidad de emoticono en familia",
    detalle:
      "Solo tú puedes cambiar tu propio emoticono en el grupo, respetando la elección de cada familiar.",
  },
  {
    version: 70,
    titulo: "Aviso importante de Isaac y comunicados globales",
    detalle:
      "Ventana emergente destacada «LEER IMPORTANTE» al entrar y comunicados con push a toda la app.",
  },
  {
    version: 69,
    titulo: "Auditoría de seguridad y blindaje ampliado",
    detalle:
      "Nuevo escaneo contra fugas de claves, CORS abierto, stacktraces y variables privadas en cliente, más guía de pentest.",
  },
  {
    version: 68,
    titulo: "Elige y personaliza tu emoticono en el grupo",
    detalle:
      "Toca tu avatar en la pantalla de Familia para elegir tu emoji favorito sin que se cambie solo a la plantita.",
  },
  {
    version: 67,
    titulo: "My Fitness 0.1.0: App blindada y lista para la familia",
    detalle:
      "Gran actualización: datos protegidos, escáner rápido, IA afinada, lista compartida, recetas exactas y sin cobertura impecable.",
  },
  {
    version: 66,
    titulo: "App ultrarrápida y modo sin conexión mejorado",
    detalle:
      "Abre más rápido, carga solo lo que necesitas, la pantalla sin cobertura respeta tu tema y la memoria del móvil queda siempre limpia.",
  },
  {
    version: 65,
    titulo: "Plan de comidas equilibrado y recetas exactas",
    detalle:
      "Cambiar un plato reajusta las calorías del día al instante, la semana nueva limpia cambios viejos y las recetas no fallan.",
  },
  {
    version: 64,
    titulo: "Familia y compra en directo blindadas",
    detalle:
      "Códigos de cuenta protegidos, lista de compra compartida en tiempo real y caprichos justos tras entrenar.",
  },
  {
    version: 63,
    titulo: "Escáner de envases mejor y cantidades exactas con IA",
    detalle:
      "Más códigos encontrados, foto de la tabla si falta un envase, y la IA respeta tus gramos, «la mitad» o «sin aceite».",
  },
  {
    version: 62,
    titulo: "App más estable sin señal, avisos y pasos en hora",
    detalle:
      "Las pantallas abren mejor sin cobertura, los pasos no bailan con el cambio de hora y los avisos en Ajustes responden al instante.",
  },
  {
    version: 61,
    titulo: "Modo oscuro, letra grande y gráficas más claras",
    detalle:
      "Modo oscuro más nítido, letra grande bien ajustada en toda la app, gráficas más claras y mejor encaje en pantallas con muesca.",
  },
  {
    version: 60,
    titulo: "Navegación más cómoda y cierre fácil de ventanas",
    detalle:
      "Las ventanas se cierran tocando fuera o con atrás en el móvil, pestañas activas en cualquier rincón y cuestionario inicial más ágil.",
  },
  {
    version: 59,
    titulo: "Sincronización más rápida y borrados que no vuelven",
    detalle:
      "El móvil sube solo lo que cambia en cada toque, recupera la red al instante y vaciar pasos o sueño ya no los resucita.",
  },
  {
    version: 58,
    titulo: "Cálculos de salud, sueño y racha más precisos",
    detalle:
      "Límite saludable al bajar de peso, sueño sin restar despertares dobles, puntos exactos y widget cuadrado con tus caprichos.",
  },
  {
    version: 57,
    titulo: "Grupos familiares, avisos y privacidad aún más protegidos",
    detalle:
      "Freno contra códigos probados al azar en grupos, avisos blindados y explicación clara de qué servicios usa la app.",
  },
  {
    version: 56,
    titulo: "🛡️ Puerta blindada y sincronización segura",
    detalle:
      "Comparación segura sin pistas de tiempo, freno a intentos repetidos y bloqueo firme si falta la clave en el servidor.",
  },
  {
    version: 55,
    titulo: "Familia sin gente repetida y bebidas en ml",
    detalle:
      "Cada persona sale una vez en el grupo, las bebidas se miden en mililitros y Flo ya no promete una conexión que aún no existe.",
  },
  {
    version: 54,
    titulo: "Android 1.1 con la copia de seguridad cerrada",
    detalle:
      "El APK nuevo ya no deja que el sistema copie tus datos y se instala encima del anterior sin borrar nada.",
  },
  {
    version: 53,
    titulo: "Pesadas que no se borran solas y teclado que llega",
    detalle:
      "Una pesada repetida ya no desaparece al sincronizar, los diálogos atrapan el foco y las gráficas se leen con teclado.",
  },
  {
    version: 52,
    titulo: "Puerta más firme y racha de familia",
    detalle:
      "Sin clave configurada no entra nadie, la IA pide cuenta, la racha de familia dice la verdad y comer bien cuenta desde el 85 %.",
  },
  {
    version: 51,
    titulo: "Menos sorpresas al guardar",
    detalle:
      "Una pesada borrada y vuelta a apuntar ya no desaparece; el sueño no cuenta los ratos despiertos y la nube avisa si falla.",
  },
  {
    version: 50,
    titulo: "El buzón ordena los mensajes y marca los de salud",
    detalle: "Cada mensaje se etiqueta como fallo, duda o idea, y los temas de salud llegan a Isaac con prioridad.",
  },
  {
    version: 49,
    titulo: "Racha más justa y pesadas sin fechas viejas",
    detalle: "La racha cuenta agua y hábitos y perdona un día al mes; el peso solo se apunta de los últimos 7 días.",
  },
  {
    version: 48,
    titulo: "Hoy abre más rápido y los contadores no se pisan",
    detalle: "Las ventanas de Hoy se cargan solo al abrirlas y el uso de IA se apunta sin pisar otros cambios.",
  },
  {
    version: 47,
    titulo: "Conexión blindada y sincronización eficiente",
    detalle: "Subidas seguras en segundo plano y reintentos inteligentes que ahorran batería.",
  },
  {
    version: 46,
    titulo: "Mejoras de accesibilidad y foco seguro",
    detalle: "Navegacion con teclado en selectores, botones adaptables con letra grande y foco seguro en dialogos.",
  },
  {
    version: 45,
    titulo: "Mejor lectura de sueño y salud del móvil",
    detalle: "Registra la noche completa de sueño sin cortes y sincroniza tus pasos aunque desactives el sueño.",
  },
  {
    version: 44,
    titulo: "Sincronizacion limpia sin elementos fantasma",
    detalle: "Los alimentos y pesadas que borras se eliminan de verdad en todos tus dispositivos.",
  },
  {
    version: 43,
    titulo: "Codigo de recuperacion ya no visible en grupos",
    detalle: "Tu codigo privado de cuenta no sale de tu perfil; los grupos usan un ID anonimo.",
  },
  {
    version: 42,
    titulo: "🛡️ Blindaje de seguridad y protección de acceso",
    detalle: "Protegida la puerta contra accesos externos, cabeceras seguras contra espías y sesiones más protegidas.",
  },
  {
    version: 41,
    titulo: "✨ Compra colaborativa blindada y sincronización total",
    detalle: "Sincronización segura entre varios móviles a la vez, compra compartida sin colisiones y precisión biológica en el ciclo.",
  },
  {
    version: 40,
    titulo: "🛡️ Telegram más seguro y sin mensajes repetidos",
    detalle: "Acceso exclusivo blindado para ti, panel actualizado al minuto y sin avisos duplicados por cortes de cobertura.",
  },
  {
    version: 39,
    titulo: "🛡️ Menú semanal fijo y sincronización blindada",
    detalle: "Valorar platos ya no mueve tu semana de sitio, la subida a la nube no pierde datos si falla la red y Telegram queda protegido.",
  },
  {
    version: 38,
    titulo: "🎛 Panel de control interactivo en Telegram",
    detalle: "Controla el mantenimiento, los usuarios de la familia y el estado del sistema directamente con botones en tu bot de Telegram.",
  },
  {
    version: 37,
    titulo: "✨ Pantalla limpia y enlaces mágicos de WhatsApp",
    detalle: "Menos botones para que no agobie: 1 toque para comida o agua, y tu familia entra al carro tocando un enlace directo.",
  },
  {
    version: 36,
    titulo: "⚡ Guardado ultra rápido y sin consumo fantasma",
    detalle: "Optimizada la sincronización al cambiar de app y cálculo exacto de los hábitos de la semana en tu equipo.",
  },
  {
    version: 35,
    titulo: "🔔 Notificaciones al chocar los 5 y dar ánimos",
    detalle: "Cuando alguien te choque los 5 o te mande ánimos, te saldrá una notificación en el móvil para que la motivación llegue al instante.",
  },
  {
    version: 34,
    titulo: "👥 Varios grupos a la vez y compra de casa separada",
    detalle: "Únete a varios grupos para motivaros juntos, y comparte la lista del súper solo con quien compartes nevera con código de casa.",
  },
  {
    version: 33,
    titulo: "🛒 Comida de casa de Mercadona, Carrefour y Día",
    detalle: "Fuera cosas raras como el seitán. Platos 100% de supermercado normal: pollo, ternera, merluza, huevos, arroz y verduras.",
  },
  {
    version: 32,
    titulo: "🛒 Compra familiar en directo y preparar foto IA",
    detalle: "Prepara la foto y escribe la pista antes de enviar, y añade productos al carro familiar al momento desde Plan y Familia.",
  },
  {
    version: 31,
    titulo: "📸 Fotos desde la fototeca y pistas para la IA",
    detalle: "Elige fotos de tu carrete o hazlas al momento, y añade una pista opcional para que la IA dé en el clavo con tu plato.",
  },
  {
    version: 30,
    titulo: "👥 Integrantes de familia en vivo y al instante",
    detalle: "El creador y los miembros se ven al momento en cuanto se unen, con actualización automática en vivo sin recargar.",
  },
  {
    version: 29,
    titulo: "🏆 Meta semanal familiar y cambio de platos sueltos",
    detalle: "Reto de hábitos juntos sin mirar la báscula, cambiar un plato sin tocar el resto de la semana y ciclo menstrual compacto.",
  },
  {
    version: 28,
    titulo: "⚡ Guardado el doble de rápido y compra limpia",
    detalle: "Sincronización en paralelo sin esperas, lista de la compra al grano con los días que quedan y datos de perfil arriba.",
  },
  {
    version: 27,
    titulo: "✨ Rediseño Bento y gráficas de peso",
    detalle: "Anillo con macros integrados, gráficas con área degradada y chips visuales en el plan de comidas.",
  },
  {
    version: 26,
    titulo: "🎬 Guía al 100% y días del menú desplegables",
    detalle: "Puntero clavado en el botón de agua, sincronización perfecta en Ajustes y apertura fluida de días en el menú.",
  },
  {
    version: 25,
    titulo: "🎬 Vídeo guía completo y formato con coma",
    detalle: "Puntero calibrado en el agua, los 6 capítulos sin cortes y formato con coma en todos los kilos de la familia.",
  },
  {
    version: 24,
    titulo: "🎬 Vídeo guía sin saltos y toques exactos",
    detalle: "Puntero táctil alineado al milímetro, rotación completa de recetas y cuenta de calorías exacta al apuntar comidas.",
  },
  {
    version: 23,
    titulo: "🎬 Vídeo guía directo y navegación completa",
    detalle: "El vídeo guía arranca directo desde su enlace y todas las pestañas se recorren con fluidez.",
  },
  {
    version: 22,
    titulo: "🎬 Vídeo guía más real y fluido",
    detalle: "Demostración viva con voz sincronizada, cálculo exacto de calorías y toques reales de móvil que van al grano.",
  },
  {
    version: 21,
    titulo: "📅 Apunta comidas de ayer y mantén tu peso",
    detalle: "Si te dan las 12 puedes volver a ayer con un toque para apuntar tu cena, y en ganar músculo puedes mantener tu mismo peso.",
  },
  {
    version: 20,
    titulo: "🎬 Grabación de pantalla con vida",
    detalle: "El móvil de Isaac reacciona de verdad al tocarlo: abre la cámara IA, cambia el plato en directo y descuenta descansos.",
  },
  {
    version: 19,
    titulo: "📱 Grabación de pantalla con Isaac",
    detalle: "Como si te grabara la pantalla de su móvil: te enseña la app de verdad, para qué sirve cada botón y cómo usarlo.",
  },
  {
    version: 18,
    titulo: "🎬 Vídeo guía con voz y capítulos",
    detalle: "Aprende cada pestaña como en YouTube: dale al Play, escucha la voz que te lo explica y salta al capítulo que quieras.",
  },
  {
    version: 17,
    titulo: "🛡️ Blindaje de velocidad y escalabilidad",
    detalle: "Optimizaciones internas para soportar alto tráfico: envío de avisos en lotes y protección de carga masiva en la nube.",
  },
  {
    version: 16,
    titulo: "🔥 Racha limpia y sin agobios",
    detalle: "El fuego de la racha ya no se abre al tocarlo si ya has cumplido hoy. La animación te sale solo al entrar a la app en un nuevo día.",
  },
  {
    version: 15,
    titulo: "⏰ Horario de avisos a tu ritmo",
    detalle: "Elige a qué hora desayunas, comes o cenas. Los recordatorios se adaptan a tu horario real en vez de a una hora fija.",
  },
  {
    version: 14,
    titulo: "🌸 Ajustes a tu medida",
    detalle: "El ciclo menstrual solo aparece si eres mujer, dejando los ajustes limpios y sin opciones innecesarias para los hombres.",
  },
  {
    version: 13,
    titulo: "🔍 Buscador inteligente, cambio de objetivo y compra",
    detalle: "Buscador con plurales y marcas (chips, tostadas), cambio de objetivo rápido con simulación de kcal y extras en la compra.",
  },
  {
    version: 12,
    titulo: "✨ Novedades solo con lo que no has visto",
    detalle: "Cada vez que entres, la app te muestra únicamente las novedades que se han añadido desde tu última visita.",
  },
  {
    version: 11,
    titulo: "🎯 Recomposición y comida libre precisa",
    detalle: "Recomposición corporal sin bloqueos, teclado numérico para gramos y calorías a tu gusto en comidas libres.",
  },
  {
    version: 10,
    titulo: "🌸 Configuración de Regla Sencilla",
    detalle: "Asistente fácil en 2 pasos para tu ciclo, alimentos libres al buscar, compra de 7 días y cambio de objetivo en Ajustes.",
  },
  {
    version: 9,
    titulo: "⌚ Conexión de Reloj Inteligente",
    detalle: "Conecta tu Apple Watch, Galaxy Watch, Garmin o pulsera para traer pasos y sueño, con atajos de 1 toque.",
  },
  {
    version: 8,
    titulo: "🩸 Ajuste y corrección en Flo",
    detalle: "Control directo para cambiar la fecha de tu último período o corregir si no tienes la regla con un toque.",
  },
  {
    version: 7,
    titulo: "📖 Guía completa de cada pestaña",
    detalle: "Tour interactivo paso a paso por las 6 pestañas de la app: Hoy, Progreso, Plan, Entreno, Familia y Ajustes.",
  },
  {
    version: 6,
    titulo: "🌸 Conexión Flo o My Fitness",
    detalle: "Tú decides: sincronizar tus datos desde la app Flo o llevar el seguimiento directo y privado en My Fitness.",
  },
  {
    version: 5,
    titulo: "✨ Perfeccionamiento y Auditoría",
    detalle: "Detección inteligente de retraso menstrual, control táctil pausado en la guía y racha en juego hoy.",
  },
  {
    version: 4,
    titulo: "🌸 Ciclo Menstrual estilo Flo",
    detalle: "Dial interactivo, registro de síntomas y aviso para entender la retención de agua (0,5 a 2 kg) sin agobios.",
  },
  {
    version: 3,
    titulo: "📱 Guía interactiva de la app",
    detalle: "Aprende a usar cada botón paso a paso con una demo interactiva real y táctil, sin vídeos externos.",
  },
  {
    version: 2,
    titulo: "🔥 Racha teatral Duolingo",
    detalle: "Ignición elástica con onda expansiva, contador odómetro en vivo y botón táctil con relieve 3D.",
  },
  {
    version: 1,
    titulo: "🎉 Celebración a rajatabla y confeti",
    detalle: "Si cumples tus calorías, agua y hábitos diarios, ¡la app te felicita con confeti, sonido y trofeo!",
  },
];

/**
 * ¿Hay que enseñar la ventana?
 *
 * Sí cuando en este móvil no hay marca o la marca es de una versión anterior.
 * Cualquier cosa rara (número más alto, texto, vacío) se toma como «no hay
 * marca»: mejor enseñarlo una vez de más que dejarse lo nuevo sin contar.
 */
export function hayQueEnsenar(guardado: string | null | undefined, version = VERSION): boolean {
  if (!guardado) return true;
  const leida = Number.parseInt(guardado.trim(), 10);
  if (!Number.isFinite(leida)) return true;
  return leida < version;
}

/**
 * Devuelve únicamente las novedades que este usuario aún NO ha visto.
 *
 * - Si el usuario ya vio la versión 12, y ahora estamos en la 13:
 *   solo le devuelve la novedad de la versión 13.
 * - Si vio la 11, le devuelve la 12 y la 13.
 * - Si entra por primera vez (sin marca previa), le devuelve como mucho
 *   las 3 más recientes para que la ventana sea clara y no infinita.
 */
export function novedadesPendientes(
  guardado: string | null | undefined,
  versionActual = VERSION,
): Novedad[] {
  if (!hayQueEnsenar(guardado, versionActual)) return [];

  const leida = guardado ? Number.parseInt(guardado.trim(), 10) : 0;
  const versionLeida = Number.isFinite(leida) ? leida : 0;

  // Si no hay versión leída previa (usuario nuevo o sin marca),
  // mostramos las 3 más recientes.
  if (versionLeida <= 0) {
    return NOVEDADES.slice(0, 3);
  }

  // Filtramos las novedades que sean estrictamente posteriores a la versión vista
  const noVistas = NOVEDADES.filter((n) => (n.version ?? 0) > versionLeida);

  if (noVistas.length === 0) {
    return NOVEDADES.slice(0, 1);
  }

  // Como máximo enseñamos las 4 más recientes no vistas
  return noVistas.slice(0, 4);
}
