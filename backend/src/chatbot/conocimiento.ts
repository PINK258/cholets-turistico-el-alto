// Base de conocimiento general de El Alto para el chatbot. Cuando la pregunta
// es solo de informacion general (historia, cholets, transporte, clima...), se
// responde con estos textos tal cual: en las pruebas, el modelo de 1.5B los
// reescribia con errores (p. ej. "fundada en 1536", "16 distritos").
// Son datos generales y conocidos; conviene revisarlos con fuentes oficiales
// (G.A.M.E.A., INE) antes de la defensa y actualizarlos aqui.
//
// Los patrones se evaluan sobre el texto normalizado (minusculas, sin tildes).

// sugerencias: preguntas relacionadas que el chat ofrece como botones despues
// de responder el tema.
export type TemaConocimiento = { tema: string; patron: RegExp; texto: string; sugerencias?: string[] };

export const CONOCIMIENTO: TemaConocimiento[] = [
  {
    tema: 'Historia de El Alto',
    patron: /\b(historia|fundacion|fundo|fundada|aniversario|cuando se creo|creacion|origen|antiguedad|cumple anos)\b/,
    texto:
      'El Alto nació como una zona de La Paz en el altiplano y creció rápidamente con migrantes aymaras del campo. ' +
      'Se creó como cuarta sección municipal de la provincia Murillo el **6 de marzo de 1985** (Ley 728), fecha de su ' +
      'aniversario, y fue elevada a ciudad en **1988**. Hoy es una de las ciudades más pobladas de Bolivia y un gran ' +
      'centro comercial y cultural aymara. Está organizada en **14 distritos**, cada uno con su subalcaldía.',
    sugerencias: ['¿Qué es un cholet?', '¿Cuáles son los distritos de El Alto?', '¿Qué es la Feria 16 de Julio?'],
  },
  {
    tema: 'Los cholets y su arquitectura',
    patron: /\b(que (es|son) (un |los )?cholets?|historia de los cholets|arquitectura|arquitecto|freddy|mamani silvestre|neoandin\w*|por que se llaman)\b/,
    texto:
      'Los **cholets** son edificios de estilo "arquitectura andina contemporánea" (también llamada neoandina), con ' +
      'fachadas de colores vivos y formas inspiradas en Tiwanaku y en los aguayos. Los popularizó el arquitecto alteño ' +
      '**Freddy Mamani Silvestre** desde la década de 2000. Normalmente tienen comercios en la planta baja, uno o más ' +
      'salones de eventos (para matrimonios, prestes, quinceañeros y fiestas) y, en el último piso, la vivienda del dueño ' +
      'con forma de chalet; de ahí el nombre "cholet" (cholo + chalet).',
    sugerencias: ['¿Qué locales nuevos hay?', '¿Cuáles son los locales mejor calificados?', 'Cuéntame la historia de El Alto'],
  },
  {
    tema: 'Feria 16 de Julio',
    patron: /\b(feria|16 de julio|mercado|comprar|compras|que visitar|lugares turisticos|turismo en el alto|que hacer)\b/,
    texto:
      'La **Feria 16 de Julio** es una enorme feria al aire libre en la zona 16 de Julio de El Alto; funciona sobre todo ' +
      'los **jueves y domingos** y se vende de todo: ropa, electrodomésticos, autos, artesanía y comida. Es una de las ' +
      'ferias más grandes de Sudamérica y un paseo típico junto con los cholets y el mirador de La Ceja.',
    sugerencias: ['¿Qué comida típica hay en El Alto?', '¿Es seguro visitar El Alto?', '¿Cómo llego a El Alto desde La Paz?'],
  },
  {
    tema: 'Transporte',
    patron: /\b(teleferico|transporte|minibus|micro|trufi|desde la paz|del aeropuerto|aeropuerto|como voy a el alto|como llego a el alto)\b/,
    texto:
      'El Alto se conecta con La Paz por la **autopista La Paz - El Alto** (unos 20 a 30 minutos en auto desde el centro ' +
      'de La Paz, según el tráfico) y por **Mi Teleférico**, el sistema de cabinas aéreas: varias líneas, como la Roja, ' +
      'Amarilla, Azul, Morada y Plateada, llegan a El Alto. Dentro de la ciudad se usan minibuses y trufis, y el ' +
      'Aeropuerto Internacional El Alto está en la misma ciudad. Para llegar a un local, en su ficha está el botón ' +
      '**"Cómo llegar"**, con la ruta paso a paso a pie o en auto.',
    sugerencias: ['¿Cómo es el clima en El Alto?', '¿Es seguro visitar El Alto?', '¿Qué locales hay en La Ceja?'],
  },
  {
    tema: 'Clima, altura y consejos',
    patron: /\b(clima|frio|temperatura|altura|altitud|soroche|mal de altura|que llevar|llevo|ropa|consejos?|recomendaciones para visitar)\b/,
    texto:
      'El Alto está a **más de 4.000 metros** sobre el nivel del mar: el clima es frío, sobre todo en la noche, y el sol ' +
      'es fuerte de día. Se recomienda llevar **abrigo, protector solar y gorra**, caminar despacio el primer día, tomar ' +
      'mate de coca y mucha agua para evitar el soroche (mal de altura).',
    sugerencias: ['¿Qué transporte hay en El Alto?', '¿Qué comida típica hay en El Alto?', '¿Hay eventos próximos?'],
  },
  {
    tema: 'G.A.M.E.A.',
    patron: /\b(gamea|g a m e a|alcaldia|municipio|gobierno municipal|subalcaldia|operador)\b/,
    texto:
      'El **G.A.M.E.A.** es el Gobierno Autónomo Municipal de El Alto. En esta plataforma, el **Operador G.A.M.E.A.** ' +
      'revisa y aprueba los locales antes de publicarlos, verifica los datos de los dueños, publica eventos en la ' +
      'cartelera y también puede subir edificios propios.',
    sugerencias: ['¿Cuánto tarda la revisión de mi local?', '¿Cómo registro mi local?', '¿Cómo denuncio un local?'],
  },
  {
    tema: 'Cómo usar la plataforma',
    patron: /\b(como funciona|que puedo hacer|para que sirve|ayuda|como uso|que haces|que sabes)\b/,
    texto:
      'En **Cholets Turístico El Alto** puedes explorar los locales por distrito, ver sus fotos, horario, eventos y ' +
      'ubicación con "Cómo llegar", revisar la **Cartelera** de eventos y dejar una **calificación con estrellas** y un ' +
      'comentario (con una cuenta de Usuario Turístico). Los dueños registran su local con "Registra tu local" y lo ' +
      'administran desde "Administrador Turístico"; el Operador G.A.M.E.A. lo revisa antes de publicarlo. También puedes ' +
      'pedirme, por ejemplo, «ábreme los locales de Río Seco».',
    sugerencias: ['¿Cómo guardo un local en favoritos?', '¿Cómo califico un local?', '¿Cómo instalo la app en mi celular?'],
  },
  // ---------- Preguntas frecuentes sobre la plataforma ----------
  {
    tema: 'Favoritos',
    patron: /\b(favoritos?|guardar (un |el |este )?local|guardo un local|corazon)\b/,
    texto:
      'Para guardar un local en **Favoritos** toca el **corazón ❤️** en su tarjeta o en su página. Necesitas una cuenta de ' +
      '**Usuario Turístico** (es gratis). Tus favoritos se guardan en tu cuenta, así los ves en cualquier celular o ' +
      'computadora, en el menú **❤️ Mis favoritos**.',
    sugerencias: ['¿Cómo creo mi cuenta?', '¿Cómo califico un local?', '¿Qué locales nuevos hay?'],
  },
  {
    tema: 'Reseñas y calificaciones',
    patron: /\b(califico|calificar|resenas?|comentar|dejar (un )?comentario|opinion|puntuar|valorar)\b/,
    texto:
      'En la página de cada local, más abajo, está **Reseñas**: eliges de **1 a 5 estrellas** y escribes un comentario. ' +
      'Si quieres, también calificas por aspectos: **atención, limpieza, ubicación, precio y ambiente**. Necesitas iniciar ' +
      'sesión con una cuenta de Usuario Turístico, y puedes editar tu reseña después.',
    sugerencias: ['¿Cuáles son los locales mejor calificados?', '¿Cómo denuncio un local?', '¿Cómo creo mi cuenta?'],
  },
  {
    tema: 'Denunciar un local',
    patron: /\b(denunci\w*|reportar|estafa|fraude|local falso|enganos\w*|queja|reclamo)\b/,
    texto:
      'Si un local es falso, tiene información engañosa, contenido inapropiado o ya cerró, entra a su página y toca ' +
      '**🚩 Denunciar este local** (en la columna de la derecha). Elige el motivo y, si quieres, explica qué pasó. La ' +
      'denuncia es **confidencial**: el dueño no sabe quién la hizo, y el **Operador G.A.M.E.A.** la revisa.',
    sugerencias: ['¿Qué es el G.A.M.E.A.?', '¿Cómo califico un local?'],
  },
  {
    tema: 'Reservas, precios y contacto',
    patron: /\b(reserv\w*|precios?|cuanto cuesta|cuanto cobra\w*|cobran|tarifas?|alquil\w*|cotiza\w*|pagar|pago|contactar|contacto|whatsapp|telefono|llamar)\b/,
    texto:
      'La plataforma **no hace reservas ni cobros**: los precios, las fechas y el alquiler se acuerdan **directamente con ' +
      'el dueño**. En la página de cada local, en **Conoce al anfitrión**, está el botón **💬 Escribir por WhatsApp** (si ' +
      'el dueño lo registró), y en **Lo que debes saber** están su horario, capacidad y reglas.',
    sugerencias: ['🔎 Buscar un local paso a paso', '¿Qué locales tienen estacionamiento?', '¿Dónde puedo hacer un matrimonio?'],
  },
  {
    tema: 'Registrar un local',
    patron: /\b(como registro (mi |un )?local|requisitos|que necesito para (registrar|publicar)|pasos para registrar|como publico mi local|cuanto tarda|cuando aprueban|revision de mi local|aprobacion|aprueban|correcciones?|rechaz\w*)\b/,
    texto:
      'Para publicar tu local entra a **Registra tu local**, en 3 pasos: **1)** tus datos (nombre, CI y correo, que se ' +
      'verifica con un código); **2)** los datos del local: nombre, descripción, tipo, los eventos que realizas, la ' +
      'ubicación en el mapa y, si quieres, su historia, capacidad, servicios, WhatsApp, reglas y un video; **3)** fotos ' +
      '(al menos una) y, si lo tienes, tu registro de funcionamiento. Luego el **Operador G.A.M.E.A.** lo revisa: puede ' +
      '**aprobarlo**, pedirte **correcciones** (te llega un aviso para arreglarlo desde tu panel) o rechazarlo. El estado ' +
      'lo ves en **Administrador Turístico**.',
    sugerencias: ['Quiero registrar mi local', '¿Cómo publico un evento en la cartelera?', '¿Cómo subo una foto 360°?'],
  },
  {
    tema: 'Publicar eventos',
    patron: /\b(publicar (un |mi )?evento|subir (un |mi )?evento|como publico un evento|agregar (un )?evento|afiche|banner)\b/,
    texto:
      'Si tienes un local aprobado, entra a **Administrador Turístico → Eventos**: escribe el título, la descripción, las ' +
      'fechas y la categoría, y sube un **afiche vertical** y, si quieres, un **banner horizontal** para el carrusel de la ' +
      'página principal. El evento aparece en la **Cartelera** y en la página de tu local. También puedes eliminarlo.',
    sugerencias: ['¿Hay eventos próximos?', 'Ábreme la cartelera'],
  },
  {
    tema: 'Foto 360° y video',
    patron: /\b(360|panoramica|recorrido virtual|paseo virtual|subir (un )?video|subo una foto)\b/,
    texto:
      'Los dueños pueden mostrar su local con un **Paseo 360°**: en **Administrador Turístico → Fotos** suben una foto ' +
      'panorámica (modo «Panorámica» del celular, hasta 20 MB) y los visitantes la recorren arrastrándola. También pueden ' +
      'agregar un **video de YouTube o TikTok** en la pestaña **Información**.',
    sugerencias: ['¿Cómo registro mi local?', '¿Cómo publico un evento en la cartelera?'],
  },
  {
    tema: 'Cuenta y contraseña',
    patron: /\b(olvide (mi )?contrasena|recuperar (mi )?(contrasena|cuenta)|cambiar (mi )?contrasena|no puedo entrar|no me llega el codigo|mi perfil)\b/,
    texto:
      'Si olvidaste tu contraseña, en **Iniciar sesión** toca **«¿Olvidaste tu contraseña? Entra con un código a tu ' +
      'correo»**: te llega un código de 6 números. Si no lo ves, revisa la carpeta de **spam** y espera 30 segundos para ' +
      'pedir otro. Tus datos los cambias en **Mi perfil**.',
    sugerencias: ['¿Cómo creo mi cuenta?', '¿Qué hacen con mis datos personales?'],
  },
  {
    tema: 'Instalar la app',
    patron: /\b(instalo|instalar|descargar (la )?app|app (para|en) (el )?celular|pantalla de inicio)\b/,
    texto:
      'Puedes **instalar la página como app** en tu celular: toca **📲 Instalar app** (en Chrome o Edge) o, en iPhone, ' +
      '**Compartir → Agregar a pantalla de inicio**. Se abre como una aplicación y carga más rápido.',
    sugerencias: ['¿Cómo guardo un local en favoritos?', '¿Cómo uso la página?'],
  },
  {
    tema: 'Datos personales',
    patron: /\b(datos personales|privacidad|mis datos|protegen mis datos|eliminar mi cuenta|borrar mi cuenta)\b/,
    texto:
      'Tus datos se usan solo para el funcionamiento de la plataforma y para los **informes estadísticos del G.A.M.E.A.** ' +
      '(por ejemplo, cuántos visitantes hay por edad o ciudad, sin publicar tu nombre). Tu correo y tu CI **no se muestran** ' +
      'a otros usuarios. Para eliminar tu cuenta, comunícate con el Operador G.A.M.E.A.',
    sugerencias: ['¿Qué es el G.A.M.E.A.?', '¿Cómo creo mi cuenta?'],
  },
  {
    tema: 'Tipos de cuenta',
    patron: /\b(roles?|tipos? de (cuenta|usuario)|usuario turistico|administrador turistico|que es un anfitrion)\b/,
    texto:
      'Hay tres tipos de cuenta: el **Usuario Turístico** (visitante: guarda favoritos, califica y denuncia), el ' +
      '**Administrador Turístico** (dueño: registra y administra su local, sus fotos y sus eventos) y el **Operador ' +
      'G.A.M.E.A.** (revisa y aprueba los locales, atiende denuncias y saca informes).',
    sugerencias: ['¿Cómo creo mi cuenta?', '¿Cómo registro mi local?'],
  },
  // ---------- El Alto para el visitante ----------
  {
    tema: 'Comida típica',
    patron: /\b(comida tipica|platos? tipicos?|gastronomia|que (se )?come|que comer|api con pastel|saltenas?|anticuchos?)\b/,
    texto:
      'En El Alto y La Paz son típicos el **api con pastel** (bebida caliente de maíz morado, ideal para el frío), las ' +
      '**salteñas** a media mañana y el **anticucho** en la noche; en las fiestas de los salones se sirven platos como el ' +
      '**plato paceño** o el **fricasé**. En las ferias, como la 16 de Julio, hay muchos puestos de comida.',
    sugerencias: ['¿Qué restaurantes hay?', '¿Qué es la Feria 16 de Julio?'],
  },
  {
    tema: 'Seguridad y emergencias',
    patron: /\b(es seguro|inseguridad|emergencias?|policia|ambulancia|bomberos|robo|me robaron)\b/,
    texto:
      'Como en toda ciudad grande, cuida tus pertenencias en ferias y lugares con mucha gente, usa transporte conocido en ' +
      'la noche y lleva solo lo necesario. Números de emergencia en Bolivia: **110** Policía (Radio Patrulla), **118** ' +
      'ambulancia y **119** bomberos.',
    sugerencias: ['¿Cómo es el clima en El Alto?', '¿Qué transporte hay en El Alto?'],
  },
  {
    tema: 'Fiestas y prestes',
    patron: /\b(que es un preste|pasantes?|fiestas? patronal\w*|entradas? folklorica\w*|folklore|morenada|caporales|costumbres|tradiciones)\b/,
    texto:
      'En El Alto son muy importantes las **fiestas patronales y los prestes**: el **pasante** organiza la fiesta en honor ' +
      'a un santo o virgen, con **entradas folklóricas** (morenada, caporales, llamerada y otras danzas), bandas de bronce ' +
      'y una gran celebración en un salón de eventos, muchas veces en un **cholet**. También se celebran matrimonios, ' +
      'quinceañeros y graduaciones con mucha música y baile.',
    sugerencias: ['¿Qué cholet hace prestes?', '¿Hay eventos próximos?', '🔎 Buscar un local paso a paso'],
  },
];

export function temasDeConocimiento(preguntaNormal: string) {
  return CONOCIMIENTO.filter((t) => t.patron.test(preguntaNormal));
}
