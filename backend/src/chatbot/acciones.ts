// Acciones que el chatbot le propone a la pagina: abrir la lista de una zona,
// abrir la ficha de un local, ir a una seccion o abrir "Cómo llegar" (la guia
// paso a paso del mapa de la ficha del local).
// El widget las muestra como botones y, si el usuario pidio "abreme...",
// "llevame..." o "muestrame...", ejecuta la principal por su cuenta.

export type AccionChat =
  | { tipo: 'abrir_zona'; zonaId: string; etiqueta: string }
  | { tipo: 'abrir_local'; localId: string; etiqueta: string }
  | { tipo: 'ir'; ruta: string; etiqueta: string }
  | { tipo: 'como_llegar'; localId: string; etiqueta: string };

// Se evalua sobre el texto normalizado (minusculas, sin tildes). Se listan
// las formas exactas: con "abr\w*" coincidia tambien "abril".
export const PIDE_NAVEGAR =
  /\b(abre|abreme|abrelo|abrela|abrelos|abrir|abrirme|abra|abrame|muestrame|mostrame|muestrales|ensename|llevame|llevanos|lleva|llevar|redirigeme|redirige|dirigeme|ir a|ve a|vamos a|entra a|quiero ver|ver la pagina|ver los locales|ver el local)\b/;

// Preguntas sobre como llegar: se ofrece la guia del mapa de la ficha del local.
export const PIDE_UBICACION = /\b(llegar|llego|ubicacion|ubicado|ubicada|mapa|como voy|ruta|gps)\b/;

// Secciones de la web a las que el chatbot puede llevar. Solo rutas fijas:
// nunca se navega a una URL que venga del texto del usuario o del modelo.
// soloAlPedirAbrir: la frase sola no basta ("¿cuales son todos los locales?" es una
// pregunta para la IA); hace falta que pida abrir/llevar/mostrar.
export const PAGINAS: {
  patron: RegExp;
  ruta: string;
  etiqueta: string;
  respuesta: string;
  soloAlPedirAbrir?: boolean;
}[] = [
  {
    patron: /\b(registr\w* (mi |un |el |nuestro )?(local|cholet|negocio|salon)|publicar (mi |un )?(local|cholet|negocio)|registra tu local)\b/,
    ruta: '/registrar-local',
    etiqueta: 'Registrar mi local',
    respuesta:
      'Para publicar tu local llena el formulario **Registra tu local**: tus datos, fotos, horario, ' +
      'ubicación en el mapa y los eventos que realizas. El Operador G.A.M.E.A. lo revisa antes de publicarlo. ' +
      'Necesitas iniciar sesión para enviarlo.',
  },
  {
    patron: /\b(inicia\w* sesion|iniciar sesion|login|ingresar a mi cuenta|entrar a mi cuenta)\b/,
    ruta: '/login',
    etiqueta: 'Iniciar sesión',
    respuesta: 'Puedes iniciar sesión con tu correo y contraseña, o con un código que te enviamos al correo.',
  },
  {
    patron: /\b(crear (una |mi )?cuenta|registrarme|registrarse|crear (un )?usuario)\b/,
    ruta: '/registro',
    etiqueta: 'Crear cuenta',
    respuesta: 'Crear una cuenta es gratis: solo necesitas tu nombre, tu correo y una contraseña. Te enviaremos un código al correo para verificarlo.',
  },
  {
    patron: /\b(cartelera|agenda de eventos|eventos de (esta|la) semana)\b/,
    ruta: '/cartelera',
    etiqueta: 'Ver la cartelera',
    respuesta: 'En la **Cartelera** están los próximos eventos de los cholets: fiestas, grupos musicales, prestes y más. Puedes filtrarlos por fecha y por distrito.',
    soloAlPedirAbrir: true,
  },
  {
    patron: /\b(pagina principal|pagina de inicio|al inicio|todos los locales|todas las zonas)\b/,
    ruta: '/',
    etiqueta: 'Ver todos los locales',
    respuesta: 'En la página principal están todos los locales verificados; puedes filtrarlos por zona.',
    soloAlPedirAbrir: true,
  },
];

