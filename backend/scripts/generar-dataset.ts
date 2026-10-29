// Genera el dataset para el fine-tuning (LoRA) de Qwen2.5-1.5B-Instruct.
//
//   cd backend
//   npm run dataset:generar
//
// Salida en ../finetuning/dataset/:
//   cholets_train.jsonl  -> ejemplos de entrenamiento (90 %)
//   cholets_val.jsonl    -> ejemplos de validacion (10 %)
//   evaluacion.jsonl     -> preguntas de prueba con los datos que debe contener
//                           la respuesta (los usa scripts/evaluar-modelos.ts)
//
// Cada ejemplo es una conversacion {"messages": [system, user, assistant]} con
// el MISMO mensaje de sistema que usa la pagina (src/chatbot/prompt.ts) y la
// misma ficha de local (src/chatbot/ficha.ts). Asi el modelo aprende a:
//   1. responder con los datos de la ficha (RAG) sin inventar;
//   2. decir "no tengo esa informacion" si el dato no esta;
//   3. conocer las preguntas frecuentes de la plataforma y de El Alto;
//   4. rechazar con amabilidad preguntas ajenas a la plataforma.
// Ademas de los locales reales se inventan locales de ejemplo (con las zonas y
// categorias reales): si solo viera 3 locales, los memorizaria en vez de
// aprender a leer la ficha.
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CONOCIMIENTO } from '../src/chatbot/conocimiento';
import { nombreServicio, SERVICIOS_CHAT } from '../src/chatbot/consultas';
import { describirLocal, LocalParaFicha, textoCalificacion } from '../src/chatbot/ficha';
import { construirPromptSistema } from '../src/chatbot/prompt';

type Mensaje = { role: 'system' | 'user' | 'assistant'; content: string };
type Ejemplo = { messages: Mensaje[]; tipo: string; claves: string[] };

// Numeros "al azar" pero siempre los mismos (semilla fija): el dataset se puede
// volver a generar igual para la tesis.
let semilla = 20261029;
function azar() {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const uno = <T>(xs: T[]) => xs[Math.floor(azar() * xs.length)];
const varios = <T>(xs: T[], n: number) => [...xs].sort(() => azar() - 0.5).slice(0, n);
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

// Fechas de "hoy" variadas, en el formato de la pagina.
const HOYS = ['15 oct 2026, 10:30', '2 nov 2026, 18:05', '20 dic 2026, 12:00', '8 ene 2027, 9:15', '14 feb 2027, 20:40'];

// Mensaje de sistema corto, sin datos: para que el modelo tambien "sepa" las
// preguntas frecuentes sin que se las pasen en el contexto.
const SISTEMA_CORTO =
  'Eres el asistente turistico de "Cholets Turistico El Alto", una plataforma de locales y cholets de ' +
  'El Alto, Bolivia. Responde en español, breve y amable.';

// ---------------------------------------------------------------------------
// 1. Preguntas frecuentes: varias formas de preguntar cada tema de conocimiento.
// ---------------------------------------------------------------------------
const PREGUNTAS_TEMA: Record<string, string[]> = {
  'Historia de El Alto': ['Cuéntame la historia de El Alto', '¿Cuándo se fundó El Alto?', '¿Cuándo es el aniversario de El Alto?', '¿Cómo nació la ciudad de El Alto?', '¿Cuántos distritos tiene El Alto?'],
  'Los cholets y su arquitectura': ['¿Qué es un cholet?', '¿Por qué se llaman cholets?', '¿Quién creó los cholets?', '¿Qué es la arquitectura neoandina?', 'Háblame de Freddy Mamani'],
  'Feria 16 de Julio': ['¿Qué es la Feria 16 de Julio?', '¿Qué días funciona la feria 16 de Julio?', '¿Qué puedo visitar en El Alto?', '¿Qué lugares turísticos hay en El Alto?', '¿Dónde puedo ir de compras en El Alto?'],
  Transporte: ['¿Cómo llego a El Alto desde La Paz?', '¿Qué transporte hay en El Alto?', '¿Hay teleférico a El Alto?', '¿Cómo voy del aeropuerto a El Alto?', '¿Qué líneas del teleférico llegan a El Alto?'],
  'Clima, altura y consejos': ['¿Cómo es el clima en El Alto?', '¿Hace frío en El Alto?', '¿Qué ropa llevo a El Alto?', '¿Cómo evito el soroche?', '¿A qué altura está El Alto?'],
  'G.A.M.E.A.': ['¿Qué es el G.A.M.E.A.?', '¿Qué hace el operador del GAMEA?', '¿Quién aprueba los locales?', '¿Qué es la alcaldía de El Alto en esta página?'],
  'Cómo usar la plataforma': ['¿Cómo funciona esta página?', '¿Qué puedo hacer aquí?', '¿Para qué sirve esta plataforma?', 'Ayuda, ¿cómo uso la página?', '¿Qué sabes hacer?'],
  Favoritos: ['¿Cómo guardo un local en favoritos?', '¿Dónde veo mis favoritos?', '¿Para qué sirve el corazón?', '¿Cómo guardo un local que me gustó?'],
  'Reseñas y calificaciones': ['¿Cómo califico un local?', '¿Puedo dejar un comentario?', '¿Cómo dejo una reseña?', '¿Cómo pongo estrellas a un local?', '¿Puedo editar mi reseña?'],
  'Denunciar un local': ['¿Cómo denuncio un local?', 'Creo que un local es falso, ¿qué hago?', '¿Cómo reporto una estafa?', 'Quiero poner una queja de un local'],
  'Reservas, precios y contacto': ['¿Cómo reservo un local?', '¿Cuánto cuesta alquilar un salón?', '¿Puedo pagar en la página?', '¿Cómo contacto al dueño de un local?', '¿Cuáles son los precios de los locales?'],
  'Registrar un local': ['¿Cómo registro mi local?', '¿Qué requisitos necesito para registrar mi local?', '¿Cuánto tarda la revisión de mi local?', '¿Qué pasa si me piden correcciones?', '¿Por qué rechazaron mi local?'],
  'Publicar eventos': ['¿Cómo publico un evento en la cartelera?', '¿Cómo subo un afiche?', '¿Puedo agregar un evento a mi local?', '¿Dónde subo el banner de mi evento?'],
  'Foto 360° y video': ['¿Cómo subo una foto 360°?', '¿Puedo poner un video de mi local?', '¿Qué es el paseo 360?', '¿Cómo hago un recorrido virtual de mi local?'],
  'Cuenta y contraseña': ['Olvidé mi contraseña', 'No me llega el código al correo', '¿Cómo recupero mi cuenta?', '¿Cómo cambio mi contraseña?'],
  'Instalar la app': ['¿Cómo instalo la app?', '¿Hay app para el celular?', '¿Puedo descargar la aplicación?', '¿Cómo la pongo en la pantalla de inicio?'],
  'Datos personales': ['¿Qué hacen con mis datos personales?', '¿Mis datos están protegidos?', '¿Cómo elimino mi cuenta?', '¿Otros usuarios ven mi correo?'],
  'Tipos de cuenta': ['¿Qué tipos de cuenta hay?', '¿Qué es un usuario turístico?', '¿Qué es el administrador turístico?', '¿Qué roles tiene la página?'],
  'Comida típica': ['¿Qué comida típica hay en El Alto?', '¿Qué es el api con pastel?', '¿Qué se come en El Alto?', '¿Qué platos típicos sirven en las fiestas?'],
  'Seguridad y emergencias': ['¿Es seguro visitar El Alto?', '¿Cuál es el número de la policía?', '¿A qué número llamo en una emergencia?', 'Me robaron, ¿qué hago?'],
  'Fiestas y prestes': ['¿Qué es un preste?', '¿Qué es un pasante?', '¿Qué fiestas hay en El Alto?', '¿Qué danzas hay en las entradas folklóricas?'],
};

// Datos que deben aparecer en la respuesta de cada tema (para la evaluacion).
const CLAVES_TEMA: Record<string, string[]> = {
  'Historia de El Alto': ['1985', '14 distritos'],
  'Los cholets y su arquitectura': ['Freddy Mamani'],
  'Feria 16 de Julio': ['jueves', 'domingo'],
  Transporte: ['Teleférico'],
  'Clima, altura y consejos': ['4.000'],
  'Reservas, precios y contacto': ['WhatsApp'],
  'Seguridad y emergencias': ['110'],
  'Comida típica': ['api'],
  'Denunciar un local': ['Denunciar'],
};

function ejemplosConocimiento(): Ejemplo[] {
  const ejemplos: Ejemplo[] = [];
  for (const t of CONOCIMIENTO) {
    const preguntas = PREGUNTAS_TEMA[t.tema];
    if (!preguntas) throw new Error(`Faltan preguntas para el tema "${t.tema}" en PREGUNTAS_TEMA`);
    for (const p of preguntas) {
      // Con el tema en el contexto (como en la pagina)...
      ejemplos.push({
        tipo: 'conocimiento_rag',
        claves: CLAVES_TEMA[t.tema] ?? [],
        messages: [
          { role: 'system', content: construirPromptSistema({ cantidad: 0, textoLocales: '', secciones: [`INFORMACION GENERAL (${t.tema}): ${t.texto}`], hoy: uno(HOYS) }) },
          { role: 'user', content: p },
          { role: 'assistant', content: t.texto },
        ],
      });
      // ...y sin contexto, para que el modelo lo aprenda.
      ejemplos.push({
        tipo: 'conocimiento',
        claves: CLAVES_TEMA[t.tema] ?? [],
        messages: [
          { role: 'system', content: SISTEMA_CORTO },
          { role: 'user', content: p },
          { role: 'assistant', content: t.texto },
        ],
      });
    }
  }
  return ejemplos;
}

// ---------------------------------------------------------------------------
// 2. Locales de ejemplo (inventados) con zonas y categorias reales.
// ---------------------------------------------------------------------------
const PREFIJOS = ['Salón', 'Cholet', 'Palacio', 'Complejo', 'Local', 'Salón de eventos'];
const NOMBRES = [
  'Inti Raymi', 'Illimani', 'Wiphala', 'Tiwanaku', 'Kantuta', 'Sol Andino', 'Cóndor Dorado', 'Aguayo', 'Estrella Real',
  'Willka', 'Pachamama', 'Huayna Potosí', 'Mallku', 'Qhana', 'Thunupa', 'Kollasuyo', 'Ajayu', 'Suma Qamaña', 'Chakana',
  'Jaylli', 'Sariri', 'Phuju', 'Lluvia de Oro', 'Esmeralda', 'Diamante Azul', 'Rubí', 'Arcoíris', 'Imperio', 'Majestic', 'Los Andes',
];
const CALLES = ['Av. 6 de Marzo', 'Av. Juan Pablo II', 'Av. Bolivia', 'Calle Jorge Carrasco', 'Av. Tiwanaku', 'Calle Raúl Salmón', 'Av. Alfonso Ugarte', 'Calle Antofagasta', 'Av. Litoral', 'Av. Cívica'];
const HORARIOS = ['Lunes a domingo, de 18:00 a 00:00', 'Viernes a domingo, de 16:00 a 02:00', 'Sábados y domingos, de 12:00 a 23:00', 'Martes a domingo, de 10:00 a 22:00', null];
const PERSONAS = [['Juana', 'Mamani', 'Quispe'], ['Carlos', 'Choque', 'Limachi'], ['Rosa', 'Apaza', null], ['Mario', 'Condori', 'Ticona'], ['Elena', 'Huanca', 'Copa'], ['Freddy', 'Laura', null], ['Sonia', 'Callisaya', 'Poma'], ['Wilson', 'Yujra', 'Alanoca']];
const REGLAS = ['No se permite ingresar con bebidas propias. Se pide una garantía por daños.', 'Ingreso hasta las 22:00. Prohibido fumar dentro del salón.', 'El alquiler incluye limpieza. La decoración la pone el cliente.', null, null];
const TIPOS = ['Salón de eventos', 'Cholet', 'Restaurante / Comida típica', 'Hotel / Alojamiento', 'Discoteca o karaoke'];

type Zona = { distritoNumero: number; nombreZonaPrincipal: string };

function localDeEjemplo(i: number, zonas: Zona[], categorias: string[]): LocalParaFicha {
  const [nombre, paterno, materno] = uno(PERSONAS);
  const tipos = varios(TIPOS, 1 + Math.floor(azar() * 2));
  return {
    nombre: `${uno(PREFIJOS)} ${NOMBRES[i % NOMBRES.length]}${i >= NOMBRES.length ? ` ${Math.floor(i / NOMBRES.length) + 1}` : ''}`,
    tiposLocal: tipos,
    categorias: varios(categorias, 1 + Math.floor(azar() * 4)).map((c) => ({ categoria: { nombre: c } })),
    zona: uno(zonas),
    direccion: `${uno(CALLES)} N° ${100 + Math.floor(azar() * 3900)}`,
    horarioFuncionamiento: uno(HORARIOS),
    anfitrion: { nombre: nombre!, apellidoPaterno: paterno!, apellidoMaterno: materno, rol: azar() < 0.1 ? 'OPERADOR' : 'ANFITRION' },
    resenas: Array.from({ length: Math.floor(azar() * 5) }, () => ({ calificacion: 3 + Math.floor(azar() * 3) })),
    aforo: azar() < 0.3 ? null : uno([80, 120, 150, 200, 250, 300, 400, 500, 800, 1000, 1500]),
    servicios: azar() < 0.25 ? [] : varios(SERVICIOS_CHAT.map((s) => s.id), 2 + Math.floor(azar() * 6)),
    whatsapp: azar() < 0.4 ? null : `7${Math.floor(1000000 + azar() * 8999999)}`,
    reglas: uno(REGLAS),
    descripcion: `${tipos[0]} con ambiente familiar, ideal para celebraciones con música y baile.`,
    historia: azar() < 0.3 ? 'El edificio se construyó con el esfuerzo de toda la familia durante diez años, al estilo de los cholets alteños.' : null,
    eventos: [],
  };
}

// ---------------------------------------------------------------------------
// 3. Preguntas sobre la ficha de un local (respuestas a partir de la ficha).
// ---------------------------------------------------------------------------
function preguntasDeFicha(l: LocalParaFicha): { pregunta: string; respuesta: string; claves: string[] }[] {
  const n = l.nombre;
  const zona = `Distrito ${l.zona.distritoNumero}, ${l.zona.nombreZonaPrincipal}`;
  const duenio = [l.anfitrion.nombre, l.anfitrion.apellidoPaterno, l.anfitrion.apellidoMaterno].filter(Boolean).join(' ');
  const consultar = l.whatsapp ? ` Puedes consultarle al dueño por WhatsApp al ${l.whatsapp}.` : ' Puedes consultarle al dueño.';
  const servicioPedido = uno(SERVICIOS_CHAT);
  const tieneServicio = l.servicios.includes(servicioPedido.id);
  const salidas = [
    {
      pregunta: uno([`¿Dónde queda ${n}?`, `¿Cuál es la dirección de ${n}?`, `¿En qué zona está ${n}?`]),
      respuesta: `**${n}** está en ${l.direccion}, ${zona}. En su página, el botón **Cómo llegar** te muestra la ruta.`,
      claves: [l.direccion],
    },
    {
      pregunta: uno([`¿Qué horario tiene ${n}?`, `¿A qué hora atiende ${n}?`, `¿Cuándo abre ${n}?`]),
      respuesta: l.horarioFuncionamiento
        ? `**${n}** atiende: ${l.horarioFuncionamiento}.`
        : `El dueño de **${n}** no indicó su horario.${consultar}`,
      claves: l.horarioFuncionamiento ? [l.horarioFuncionamiento] : ['no indicó'],
    },
    {
      pregunta: uno([`¿Qué eventos se pueden hacer en ${n}?`, `¿Qué tipo de fiestas realiza ${n}?`, `¿Para qué eventos sirve ${n}?`]),
      respuesta: `En **${n}** se realizan: ${lista(l.categorias.map((c) => c.categoria.nombre))}.`,
      claves: l.categorias.map((c) => c.categoria.nombre),
    },
    {
      pregunta: uno([`¿Quién es el dueño de ${n}?`, `¿De quién es ${n}?`]),
      respuesta:
        l.anfitrion.rol === 'OPERADOR' || l.anfitrion.rol === 'ADMIN'
          ? `**${n}** fue publicado por el G.A.M.E.A. (Gobierno Autónomo Municipal de El Alto).`
          : `El dueño de **${n}** es ${duenio}.`,
      claves: l.anfitrion.rol === 'ANFITRION' ? [l.anfitrion.apellidoPaterno] : ['G.A.M.E.A.'],
    },
    {
      pregunta: uno([`¿Cuántas personas entran en ${n}?`, `¿Qué capacidad tiene ${n}?`, `¿${n} es para 300 personas?`]),
      respuesta: l.aforo
        ? `**${n}** tiene capacidad para hasta **${l.aforo} personas**.`
        : `El dueño de **${n}** no indicó la capacidad del local.${consultar}`,
      claves: l.aforo ? [String(l.aforo)] : ['no indicó'],
    },
    {
      pregunta: uno([`¿${n} tiene ${servicioPedido.nombre}?`, `¿Hay ${servicioPedido.nombre} en ${n}?`]),
      respuesta: tieneServicio
        ? `Sí, **${n}** indica que tiene ${servicioPedido.nombre}.`
        : `El dueño de **${n}** no indicó que tenga ${servicioPedido.nombre}.${consultar}`,
      claves: tieneServicio ? ['Sí'] : ['no indicó'],
    },
    {
      pregunta: uno([`¿Qué servicios tiene ${n}?`, `¿Qué ofrece ${n}?`]),
      respuesta: l.servicios.length > 0
        ? `**${n}** ofrece: ${lista(l.servicios.map(nombreServicio))}.`
        : `El dueño de **${n}** todavía no indicó sus servicios.${consultar}`,
      claves: l.servicios.length > 0 ? [nombreServicio(l.servicios[0])] : ['no indicó'],
    },
    {
      // Dato que la ficha nunca tiene: no debe inventarlo.
      pregunta: uno([`¿${n} tiene piscina?`, `¿${n} tiene jacuzzi?`, `¿Cuánto cuesta alquilar ${n}?`, `¿${n} acepta tarjeta de crédito?`]),
      respuesta: `No tengo esa información sobre **${n}**.${consultar} La plataforma no hace reservas ni cobros.`,
      claves: ['No tengo esa información'],
    },
    {
      pregunta: uno([`¿Qué calificación tiene ${n}?`, `¿${n} es bueno?`, `¿Cuántas estrellas tiene ${n}?`]),
      respuesta: `Los visitantes le dan a **${n}**: ${textoCalificacion(l.resenas)}.`,
      claves: l.resenas.length > 0 ? ['de 5'] : ['sin reseñas'],
    },
  ];
  if (l.whatsapp) {
    salidas.push({
      pregunta: uno([`¿Cuál es el WhatsApp de ${n}?`, `¿Cómo contacto al dueño de ${n}?`]),
      respuesta: `Puedes escribirle al dueño de **${n}** por WhatsApp al **${l.whatsapp}**. Los precios y las fechas se acuerdan directamente con el dueño.`,
      claves: [l.whatsapp],
    });
  }
  if (l.reglas) {
    salidas.push({ pregunta: `¿Qué reglas tiene ${n}?`, respuesta: `Reglas de **${n}**: ${l.reglas}`, claves: [l.reglas.split('.')[0]] });
  }
  return salidas;
}

function ejemplosDeFicha(locales: LocalParaFicha[], ahora: Date): Ejemplo[] {
  const ejemplos: Ejemplo[] = [];
  for (const l of locales) {
    const ficha = describirLocal(l, ahora);
    for (const { pregunta, respuesta, claves } of preguntasDeFicha(l)) {
      // La mitad como si el usuario estuviera en la pagina del local ("este local").
      const enPagina = azar() < 0.5;
      ejemplos.push({
        tipo: 'ficha',
        claves,
        messages: [
          {
            role: 'system',
            content: construirPromptSistema({
              cantidad: 1,
              textoLocales: ficha,
              secciones: [],
              localAbierto: enPagina ? l.nombre : undefined,
              hoy: uno(HOYS),
            }),
          },
          { role: 'user', content: enPagina ? pregunta.replace(l.nombre, 'este local') : pregunta },
          { role: 'assistant', content: respuesta },
        ],
      });
    }
  }
  return ejemplos;
}

// ---------------------------------------------------------------------------
// 4. Listas: "¿Que locales hay en ...?" / "¿Donde hago un ...?" (con filtro).
// ---------------------------------------------------------------------------
function ejemplosDeLista(locales: LocalParaFicha[], ahora: Date, cantidad: number): Ejemplo[] {
  const ejemplos: Ejemplo[] = [];
  for (let i = 0; i < cantidad; i++) {
    const base = uno(locales);
    const porZona = azar() < 0.5;
    const categoria = uno(base.categorias).categoria.nombre;
    const cumplen = locales
      .filter((l) =>
        porZona ? l.zona.distritoNumero === base.zona.distritoNumero : l.categorias.some((c) => c.categoria.nombre === categoria),
      )
      .slice(0, 4);
    const filtro = porZona
      ? `en el Distrito ${base.zona.distritoNumero}, ${base.zona.nombreZonaPrincipal}`
      : `que realicen ${categoria}`;
    const pregunta = porZona
      ? uno([`¿Qué locales hay en ${base.zona.nombreZonaPrincipal}?`, `¿Qué locales hay en el Distrito ${base.zona.distritoNumero}?`, `Recomiéndame locales del Distrito ${base.zona.distritoNumero}`])
      : uno([`¿Dónde puedo hacer ${categoria.toLowerCase()}?`, `¿Qué locales hacen ${categoria.toLowerCase()}?`, `Busco un local para ${categoria.toLowerCase()}`]);
    const lineas = cumplen.map((l) => `- **${l.nombre}** · ${l.direccion} (Distrito ${l.zona.distritoNumero}, ${l.zona.nombreZonaPrincipal})`);
    ejemplos.push({
      tipo: 'lista',
      claves: cumplen.map((l) => l.nombre),
      messages: [
        {
          role: 'system',
          content: construirPromptSistema({
            cantidad: cumplen.length,
            textoLocales: cumplen.map((l) => describirLocal(l, ahora)).join('\n\n'),
            secciones: [],
            filtro,
            hoy: uno(HOYS),
          }),
        },
        { role: 'user', content: pregunta },
        {
          role: 'assistant',
          content: `${cumplen.length === 1 ? 'Hay 1 local registrado' : `Hay ${cumplen.length} locales registrados`} ${filtro}:\n${lineas.join('\n')}`,
        },
      ],
    });
  }
  return ejemplos;
}

// ---------------------------------------------------------------------------
// 5. Preguntas ajenas a la plataforma: rechazo amable.
// ---------------------------------------------------------------------------
const AJENAS = [
  '¿Quién ganó el mundial de fútbol?', '¿Cuánto es 25 por 48?', 'Escríbeme un poema de amor', '¿Cómo hago una torta de chocolate?',
  '¿Quién es el presidente de Estados Unidos?', 'Hazme la tarea de matemáticas', '¿Cómo programo en Python?', '¿Qué opinas de la política?',
  'Recomiéndame una película', '¿Cuál es la capital de Francia?', 'Traduce esto al inglés: buenos días', '¿Cómo invierto en criptomonedas?',
  'Cuéntame un chiste', '¿Qué hora es en Japón?', '¿Cómo arreglo mi computadora?', '¿Quién descubrió América?',
];
const RECHAZO =
  'Lo siento, solo puedo ayudarte con temas de **Cholets Turístico El Alto**: los locales y cholets (servicios, ' +
  'capacidad, ubicación y contacto), la cartelera de eventos, datos de El Alto para visitarlo y el uso de la página. ' +
  '¿Te ayudo con algo de eso?';

function ejemplosAjenos(): Ejemplo[] {
  return AJENAS.flatMap((p) => [
    {
      tipo: 'fuera_de_tema',
      claves: ['solo puedo ayudarte'],
      messages: [
        { role: 'system' as const, content: construirPromptSistema({ cantidad: 0, textoLocales: '', secciones: [], hoy: uno(HOYS) }) },
        { role: 'user' as const, content: p },
        { role: 'assistant' as const, content: RECHAZO },
      ],
    },
    {
      tipo: 'fuera_de_tema',
      claves: ['solo puedo ayudarte'],
      messages: [
        { role: 'system' as const, content: SISTEMA_CORTO },
        { role: 'user' as const, content: p },
        { role: 'assistant' as const, content: RECHAZO },
      ],
    },
  ]);
}

// ---------------------------------------------------------------------------

async function main() {
  const prisma = new PrismaClient();
  const ahora = new Date();
  try {
    const zonas = await prisma.zona.findMany({ orderBy: { distritoNumero: 'asc' } });
    const categorias = (await prisma.categoriaEvento.findMany({ orderBy: { orden: 'asc' } })).map((c) => c.nombre);
    const reales: LocalParaFicha[] = await prisma.local.findMany({
      where: { estado: 'APROBADO' },
      include: {
        zona: true,
        eventos: true,
        anfitrion: { select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true, rol: true } },
        categorias: { include: { categoria: { select: { nombre: true } } } },
        resenas: { select: { calificacion: true } },
      },
    });
    if (zonas.length === 0 || categorias.length === 0) throw new Error('La BD no tiene zonas o categorías.');

    const inventados = Array.from({ length: 90 }, (_, i) => localDeEjemplo(i, zonas, categorias));
    const todos = [...reales, ...inventados];

    const ejemplos = [
      ...ejemplosConocimiento(),
      ...ejemplosDeFicha(todos, ahora),
      ...ejemplosDeLista(inventados, ahora, 120),
      ...ejemplosAjenos(),
    ].sort(() => azar() - 0.5);

    const corte = Math.round(ejemplos.length * 0.9);
    const entrenamiento = ejemplos.slice(0, corte);
    const validacion = ejemplos.slice(corte);

    const carpeta = join(__dirname, '..', '..', 'finetuning', 'dataset');
    mkdirSync(carpeta, { recursive: true });
    const jsonl = (xs: Ejemplo[]) => xs.map((e) => JSON.stringify({ messages: e.messages })).join('\n') + '\n';
    writeFileSync(join(carpeta, 'cholets_train.jsonl'), jsonl(entrenamiento), 'utf-8');
    writeFileSync(join(carpeta, 'cholets_val.jsonl'), jsonl(validacion), 'utf-8');
    // La evaluacion usa los ejemplos de validacion: el modelo nunca los vio al entrenar.
    writeFileSync(
      join(carpeta, 'evaluacion.jsonl'),
      validacion
        .filter((e) => e.claves.length > 0)
        .map((e) => JSON.stringify({ tipo: e.tipo, system: e.messages[0].content, pregunta: e.messages[1].content, claves: e.claves }))
        .join('\n') + '\n',
      'utf-8',
    );

    const porTipo = ejemplos.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.tipo]: (acc[e.tipo] ?? 0) + 1 }), {});
    console.log(`Locales reales: ${reales.length} · inventados: ${inventados.length}`);
    console.log(`Ejemplos: ${ejemplos.length} (entrenamiento ${entrenamiento.length}, validación ${validacion.length})`);
    console.log('Por tipo:', porTipo);
    console.log(`Archivos en ${carpeta}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
