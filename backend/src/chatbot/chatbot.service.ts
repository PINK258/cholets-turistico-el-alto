import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoVerificacion, Prisma, Zona } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccionChat, PAGINAS, PIDE_NAVEGAR, PIDE_UBICACION } from './acciones';
import { eventoVigente, eventoYaPublicado } from '../locales/locales.service';
import { temasDeConocimiento } from './conocimiento';
import { construirPromptSistema } from './prompt';
import { describirLocal, formatearFecha, resumen, textoCalificacion } from './ficha';
import {
  aforoPedido,
  nombreServicio,
  HABLA_DE_LA_CIUDAD,
  PIDE_AFORO,
  PIDE_HISTORIA_LOCAL,
  PIDE_CONTACTO,
  PIDE_REGLAS,
  PIDE_SERVICIOS,
  serviciosMencionados,
} from './consultas';

// Preguntas que se responden con consultas extra a la base (ademas de los locales).
const PIDE_NUEVOS = /\b(nuevos?|nuevas?|recientes?|ultimos?|ultimas?|recien)\b/;
// Solo cuando preguntan por eventos de la cartelera; "fiesta" u "hoy" solos no
// bastan ("¿donde hago una fiesta?" busca locales, no la cartelera).
const PIDE_EVENTOS = /\b(eventos?|cartelera|conciertos?|presentaciones?|que hay (hoy|manana|este fin de semana))\b/;
const PIDE_RANKING = /\b(mejor(es)? (calificad|valorad|puntuad|recomendad)\w*|mas (recomendad|popular|visitad)\w*|mejor local|mejores locales|estrellas)\b/;
const PIDE_CUANTOS = /\bcuant[oa]s\b/;
// "¿Que locales hay en La Ceja?", "¿Cuales son los hoteles de Rio Seco?": pedir la lista.
const PIDE_LISTA = /\b(que|cuales|cuantos|hay|lista|muestrame|dime)\b.*\b(locales|cholets|lugares|salones|restaurantes|hoteles|alojamientos|discotecas|karaokes|opciones)\b/;
const PIDE_DISTRITOS = /\b(distritos|subalcaldias?|cuantos distritos|zonas de el alto|que zonas)\b/;
// Mensajes de cortesia: se responden al instante, sin buscar locales.
const SALUDO = /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|saludos)( (asistente|bot|amigo|que tal|como estas))?[\s!.,?]*$/;
const AGRADECE = /^(gracias|muchas gracias|ok|okey|vale|listo|perfecto|genial|excelente|chau|adios|hasta luego)( (gracias|muchas gracias|amigo|asistente))?[\s!.,]*$/;
// Botones que el chat ofrece cuando no hay algo mas concreto. El primero lo
// intercepta el widget: abre el buscador guiado en lugar de enviarse.
const SUGERENCIAS_GENERALES = ['🔎 Buscar un local paso a paso', '¿Hay eventos próximos?', '¿Qué es un cholet?'];

// ---------------------------------------------------------------------------
// Chatbot NO basado en reglas, con un LLM local (Ollama + Qwen2.5) y RAG:
//  1. Recuperacion: se buscan en PostgreSQL los locales relevantes para la
//     pregunta (y el local que el usuario tiene abierto, si hay uno).
//  2. Generacion: el modelo redacta la respuesta en lenguaje natural usando
//     SOLO ese contexto. No hay ningun "si la pregunta dice X responde Y".
//  3. Respaldo: si Ollama no responde, se devuelven los datos de la BD tal
//     cual, para que el chatbot nunca quede mudo.
//  4. Acciones: junto a la respuesta se devuelven botones para abrir en la web
//     la zona o los locales encontrados; si el usuario pide "abreme...", la
//     pagina se abre sola (ver acciones.ts).
// ---------------------------------------------------------------------------

// Funcion para que el filtro de eventos ya publicados use la fecha actual.
const incluirLocal = () => ({
  zona: true,
  eventos: { where: { AND: [eventoYaPublicado(), eventoVigente()] }, orderBy: { fechaInicio: 'asc' as const } },
  anfitrion: { select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true, rol: true } },
  categorias: {
    include: { categoria: { select: { nombre: true, grupo: true, palabrasClave: true } } },
    orderBy: { categoria: { orden: 'asc' as const } },
  },
  resenas: { select: { calificacion: true } },
});

type LocalConDetalle = Prisma.LocalGetPayload<{ include: ReturnType<typeof incluirLocal> }>;

type Contexto = {
  texto: string;
  cantidad: number;
  // Ej. "en el Distrito 1, Zona Santa Rosa (La Ceja) que realizan Matrimonios":
  // presente si la pregunta filtro por zona y/o categoria de eventos.
  filtro?: string;
  localAbierto?: string;
  // Lo recuperado de la BD, para armar los botones de accion.
  recuperacion: Recuperacion;
  // Otras secciones para el modelo: informacion general de El Alto, eventos,
  // locales nuevos, mejor calificados, resumen por distrito...
  secciones: string[];
};

type CategoriaMencionada = { id: string; nombre: string };

type RespuestaChat = {
  respuesta: string;
  // ia = redactada por el modelo; base_de_datos = datos de la BD sin el modelo;
  // accion = confirmacion de una accion sobre la pagina (abrir zona, local...).
  fuente: 'ia' | 'base_de_datos' | 'accion';
  acciones: AccionChat[];
  // Accion que el widget ejecuta sola porque el usuario pidio abrir algo.
  navegar?: AccionChat;
  // Preguntas de seguimiento que el widget muestra como botones.
  sugerencias?: string[];
};

type Recuperacion = {
  locales: LocalConDetalle[];
  // Presentes cuando la pregunta filtra por zona o por categoria de eventos;
  // entonces los locales son exactamente los que cumplen ese filtro.
  zonas?: Zona[];
  categorias?: CategoriaMencionada[];
  tipos?: string[];
  // "con estacionamiento", "para 300 personas" (columnas servicios y aforo).
  servicios?: { id: string; nombre: string }[];
  aforoMin?: number;
  // Cumplen zona/evento/tipo pero no el servicio o la capacidad pedidos porque
  // no los indicaron (null o lista vacia).
  sinFicha?: LocalConDetalle[];
  // true si no hubo coincidencias y "locales" es solo un panorama general.
  general?: boolean;
  // Sin coincidencias pese a tener palabras de busqueda: tema que la plataforma
  // no conoce (ej. "¿quien gano el mundial?").
  desconocida?: boolean;
};

// Palabras con las que la gente pregunta por cada tipo de local. "Cholet" no
// tiene: "cholet(s)" es palabra vacia porque toda la plataforma es de cholets.
const SINONIMOS_TIPO_LOCAL: Record<string, string[]> = {
  'Salón de eventos': ['salon', 'salones'],
  'Restaurante / Comida típica': ['restaurante', 'restaurantes', 'restaurant', 'comida', 'comer'],
  'Hotel / Alojamiento': ['hotel', 'hoteles', 'alojamiento', 'hospedaje', 'hostal', 'dormir'],
  'Discoteca o karaoke': ['discoteca', 'discotecas', 'karaoke', 'karaokes', 'boliche', 'bailar'],
};

// Pistas de que la pregunta busca entre todos los locales ("¿donde...?",
// "¿que cholets...?") y no sobre el local de la pagina abierta.
const PREGUNTA_AMPLIA = /\b(donde|locales|cholets|algun|alguno|recomienda\w*|otros?|otras?)\b/;
const REFIERE_LOCAL_ABIERTO = /\b(este local|este cholet|aqui|aca)\b/;

// Palabras de los nombres de zona que no sirven para distinguir una de otra.
const PALABRAS_GENERICAS_ZONA = new Set([
  'zona', 'comunidad', 'urbanizacion', 'distrito', 'plaza', 'originaria', 'cercania', 'sud', 'altura',
]);

const PALABRAS_VACIAS = new Set([
  'que', 'cual', 'cuales', 'como', 'donde', 'cuando', 'quien', 'quienes', 'tiene', 'tienen', 'hay',
  'los', 'las', 'del', 'por', 'para', 'con', 'una', 'uno', 'unos', 'unas', 'sus', 'son', 'esta',
  'este', 'estos', 'esas', 'ese', 'eso', 'mas', 'muy', 'me', 'mi', 'puedo', 'quiero', 'sobre',
  'hola', 'local', 'locales', 'cholet', 'cholets', 'alto', 'el', 'la', 'de', 'en', 'y', 'es', 'su',
  // Aparecen en casi todas las categorias ("Fiestas de...") y no ayudan a elegir.
  'fiesta', 'fiestas', 'hacer', 'realizar', 'celebrar', 'organizar',
  // Palabras de tiempo o de consulta general: con ellas "¿que eventos hay esta
  // semana?" coincidia con la descripcion de un local y se colaban sus datos.
  'semana', 'hoy', 'manana', 'fin', 'nuevo', 'nuevos', 'nueva', 'nuevas', 'reciente', 'recientes',
  'historia', 'cuantos', 'cuantas', 'mejor', 'mejores', 'calificado', 'distritos', 'distrito',
  'evento', 'eventos',
  // Pedidos de navegacion ("abreme los locales de...") no son terminos de busqueda.
  'abre', 'abreme', 'abrir', 'abrelo', 'abrela', 'muestrame', 'mostrame', 'llevame', 'ensename', 'pagina', 'ver',
  // Consultas de ficha ("¿que servicios tiene...?", "para 300 personas"): se
  // filtran aparte (consultas.ts), no son palabras del nombre de un local.
  'servicio', 'servicios', 'personas', 'invitados', 'capacidad', 'aforo', 'tengan', 'cual', 'whatsapp', 'numero',
  'contacto', 'reglas', 'buscar', 'paso',
  // Pedidos de recomendacion general: van al panorama de locales.
  'recomiendas', 'recomienda', 'recomiendame', 'recomendar', 'recomendacion', 'sugieres', 'sugerencia', 'opciones',
  'lugar', 'lugares', 'algo', 'alguno', 'alguna', 'bueno', 'buena', 'buenos', 'buenas', 'todos', 'todas',
]);

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function palabrasClave(texto: string) {
  return normalizar(texto)
    .split(/[^a-z0-9ñ]+/)
    .filter((p) => p.length >= 3 && !PALABRAS_VACIAS.has(p));
}

// Compara palabras completas, no subcadenas: "ver" no debe coincidir con
// "verificados". Para palabras de 4+ letras acepta prefijos, asi coinciden
// singular/plural ("evento"/"eventos", "pelea"/"peleas").
function coincide(clave: string, palabrasTexto: Set<string>) {
  if (palabrasTexto.has(clave)) return true;
  if (clave.length < 4) return false;
  for (const p of palabrasTexto) {
    if (p.length >= 4 && (p.startsWith(clave) || clave.startsWith(p))) return true;
  }
  return false;
}

// Cargar qwen2.5:1.5b en memoria tarda ~20 s la primera vez; ya cargado responde
// en ~1-2 s. Se mantiene cargado varias horas para cumplir el RNF02 (< 5 s).
const KEEP_ALIVE = '24h';

@Injectable()
export class ChatbotService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly ollamaUrl: string;
  private readonly modelo: string;
  private readonly timeoutMs: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.ollamaUrl = this.config.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.modelo = this.config.get<string>('OLLAMA_MODEL') || 'qwen2.5:1.5b';
    this.timeoutMs = Number(this.config.get<string>('OLLAMA_TIMEOUT_MS')) || 20000;
  }

  // Precalienta el modelo al arrancar el backend (sin bloquear el arranque), para
  // que la primera pregunta de un usuario no pague la carga en frio.
  onModuleInit() {
    void this.precalentarModelo();
  }

  private async precalentarModelo() {
    const inicio = Date.now();
    try {
      // Con "messages" vacio, Ollama solo carga el modelo en memoria.
      const res = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.modelo, messages: [], keep_alive: KEEP_ALIVE }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) throw new Error(`Ollama respondio ${res.status}`);
      this.logger.log(`Modelo ${this.modelo} cargado en memoria en ${Date.now() - inicio} ms`);
    } catch (error) {
      this.logger.warn(
        `No se pudo precargar ${this.modelo} (${(error as Error).message}). ` +
          'El chatbot respondera con datos de la BD hasta que Ollama este disponible.',
      );
    }
  }

  // ---------- 1. Recuperacion ----------

  // Zonas (subalcaldias) que menciona la pregunta: "La Ceja", "Rio Seco",
  // "Puente Vela", "Distrito 5"/"D5"... Se queda con las de mayor coincidencia,
  // asi "San Pedro" elige la Zona San Pedro y no tambien "Pedro Domingo Murillo".
  private async zonasMencionadas(pregunta: string, claves: string[]): Promise<Zona[]> {
    const zonas = await this.prisma.zona.findMany({ orderBy: { distritoNumero: 'asc' } });

    const distrito = normalizar(pregunta).match(/\b(?:distrito|d)\s*-?\s*(\d{1,2})\b/);
    if (distrito) {
      return zonas.filter((z) => z.distritoNumero === Number(distrito[1]));
    }

    const puntuadas = zonas.map((z) => {
      const palabrasZona = new Set(
        palabrasClave(z.nombreZonaPrincipal).filter((p) => !PALABRAS_GENERICAS_ZONA.has(p)),
      );
      // Palabra exacta vale mas que prefijo: "Villandrani" no debe empatar con
      // "Villa Caluyo" (por "villa").
      const puntaje = claves.reduce(
        (acc, c) => acc + (palabrasZona.has(c) ? 2 : coincide(c, palabrasZona) ? 1 : 0),
        0,
      );
      return { z, puntaje };
    });
    const maximo = Math.max(0, ...puntuadas.map((p) => p.puntaje));
    return maximo === 0 ? [] : puntuadas.filter((p) => p.puntaje === maximo).map((p) => p.z);
  }

  private async buscarLocalesRelevantes(pregunta: string, localId?: string): Promise<Recuperacion> {
    const locales = await this.prisma.local.findMany({
      where: { estado: EstadoVerificacion.APROBADO },
      include: incluirLocal(),
      take: 200,
    });

    const preguntaNormal = normalizar(pregunta);
    // Los servicios ("sonido", "cocina"...) se filtran aparte y se quitan del
    // texto: si no, coincidian con sinonimos de categorias de eventos.
    const pedidos = serviciosMencionados(preguntaNormal);
    const servicios = pedidos.map(({ id, nombre }) => ({ id, nombre }));
    const aforoMin = aforoPedido(preguntaNormal);
    const claves = palabrasClave(pedidos.reduce((t, sv) => t.replace(sv.patron, ' '), preguntaNormal));
    const palabras = (texto: string) => new Set(palabrasClave(texto));

    // Pregunta por zona: SOLO los locales aprobados registrados en esa zona,
    // aunque el usuario este en la pagina de un local de otra zona. Antes se
    // buscaba la palabra en cualquier campo y aparecian locales de otras zonas.
    const zonas = await this.zonasMencionadas(pregunta, claves);

    // Pregunta por tipo de evento ("¿donde hago mi boda?"): SOLO los locales que
    // marcaron esa categoria. En la pagina de un local, "¿hacen matrimonios?" se
    // responde sobre ese local; solo si la pregunta es amplia se busca en todos.
    const categorias = await this.categoriasMencionadas(claves);
    // Igual con el tipo de local ("¿que hoteles hay en La Ceja?").
    const tipos = Object.entries(SINONIMOS_TIPO_LOCAL)
      .filter(([, sinonimos]) => claves.some((c) => sinonimos.includes(c)))
      .map(([tipo]) => tipo);

    const hayLocalAbierto = !!localId && locales.some((l) => l.id === localId);
    const buscaEnTodos =
      !hayLocalAbierto ||
      (PREGUNTA_AMPLIA.test(preguntaNormal) && !REFIERE_LOCAL_ABIERTO.test(preguntaNormal));
    const usarCategorias = categorias.length > 0 && buscaEnTodos;
    const usarTipos = tipos.length > 0 && buscaEnTodos;
    const usarServicios = servicios.length > 0 && buscaEnTodos;
    const usarAforo = aforoMin !== undefined && buscaEnTodos;

    if (zonas.length > 0 || usarCategorias || usarTipos || usarServicios || usarAforo) {
      let lista = locales;
      if (zonas.length > 0) {
        const idsZona = new Set(zonas.map((z) => z.id));
        lista = lista.filter((l) => idsZona.has(l.zonaId));
      }
      if (usarCategorias) {
        const idsCategoria = new Set(categorias.map((c) => c.id));
        lista = lista.filter((l) => l.categorias.some((c) => idsCategoria.has(c.categoriaId)));
      }
      if (usarTipos) {
        lista = lista.filter((l) => l.tiposLocal.some((t) => tipos.includes(t)));
      }
      const antesDeFicha = lista;
      if (usarServicios) {
        lista = lista.filter((l) => servicios.every((sv) => l.servicios.includes(sv.id)));
      }
      if (usarAforo) {
        lista = lista.filter((l) => l.aforo !== null && l.aforo >= aforoMin);
      }
      // Cada dato pedido se cumple o no esta indicado (nunca "indico otro").
      const serviciosOk = (l: LocalConDetalle) =>
        !usarServicios || l.servicios.length === 0 || servicios.every((sv) => l.servicios.includes(sv.id));
      const aforoOk = (l: LocalConDetalle) => !usarAforo || l.aforo === null || l.aforo >= aforoMin;
      const sinFicha = antesDeFicha.filter((l) => !lista.includes(l) && serviciosOk(l) && aforoOk(l));
      return {
        sinFicha: sinFicha.slice(0, 5),
        locales: lista.slice(0, 8),
        zonas: zonas.length > 0 ? zonas : undefined,
        categorias: usarCategorias ? categorias : undefined,
        tipos: usarTipos ? tipos : undefined,
        servicios: usarServicios ? servicios : undefined,
        aforoMin: usarAforo ? aforoMin : undefined,
      };
    }

    return this.porNombreOPalabras(locales, claves, palabras, pregunta, localId);
  }

  // Categorias de eventos que menciona la pregunta, por su nombre o sus
  // sinonimos (palabras_clave). Igual que con las zonas, gana la de mayor
  // coincidencia: "bandas de bronce" elige Retretas y Diana, no todas.
  private async categoriasMencionadas(claves: string[]): Promise<CategoriaMencionada[]> {
    if (claves.length === 0) return [];
    const catalogo = await this.prisma.categoriaEvento.findMany({
      select: { id: true, nombre: true, palabrasClave: true },
      orderBy: { orden: 'asc' },
    });
    const puntuadas = catalogo.map((c) => {
      const palabrasCategoria = new Set(palabrasClave(`${c.nombre} ${c.palabrasClave}`));
      return { c, puntaje: claves.filter((k) => coincide(k, palabrasCategoria)).length };
    });
    const maximo = Math.max(0, ...puntuadas.map((p) => p.puntaje));
    return maximo === 0
      ? []
      : puntuadas.filter((p) => p.puntaje === maximo).map((p) => ({ id: p.c.id, nombre: p.c.nombre }));
  }

  private porNombreOPalabras(
    locales: LocalConDetalle[],
    claves: string[],
    palabras: (texto: string) => Set<string>,
    pregunta: string,
    localId?: string,
  ): Recuperacion {
    const abierto = localId ? locales.find((l) => l.id === localId) : undefined;

    // Con un local abierto, la pregunta es sobre ese local, salvo que nombre a
    // otro: entonces solo va el nombrado (y el abierto si dice "este local" o lo
    // nombra). Con los dos juntos el modelo de 1.5B mezclaba sus datos, p.ej.
    // dando como dueño de "Loques" al anfitrion de la pagina abierta.
    if (abierto) {
      const nombra = (l: LocalConDetalle) => {
        const palabrasNombre = palabras(l.nombre);
        return claves.some((c) => coincide(c, palabrasNombre));
      };
      const mencionados = locales.filter((l) => l.id !== abierto.id && nombra(l));
      if (mencionados.length === 0) return { locales: [abierto] };
      const incluyeAbierto = nombra(abierto) || /\beste local\b/.test(normalizar(pregunta));
      return { locales: [...(incluyeAbierto ? [abierto] : []), ...mencionados].slice(0, 3) };
    }

    const puntuados = locales.map((local) => {
      const palabrasLocal = palabras(
        [
          local.nombre,
          ...local.tiposLocal,
          local.direccion,
          local.descripcion,
          local.historia ?? '',
          local.zona.nombreZonaPrincipal,
          `distrito ${local.zona.distritoNumero}`,
          local.anfitrion.nombre,
          local.anfitrion.apellidoPaterno,
          ...local.eventos.map((e) => e.titulo),
          // Nombre + sinonimos de cada categoria: asi "¿donde hago mi boda?"
          // encuentra los locales que marcaron "Matrimonios".
          ...local.categorias.map((c) => `${c.categoria.nombre} ${c.categoria.palabrasClave}`),
        ].join(' '),
      );
      const puntaje = claves.reduce((acc, c) => acc + (coincide(c, palabrasLocal) ? 1 : 0), 0);
      return { local, puntaje };
    });

    const coincidentes = puntuados
      .filter((p) => p.puntaje > 0)
      .sort((a, b) => b.puntaje - a.puntaje)
      .map((p) => p.local)
      .slice(0, 3);

    // Sin coincidencias (ej. "¿que me recomiendas?"): un panorama general corto.
    return coincidentes.length > 0
      ? { locales: coincidentes }
      : { locales: locales.slice(0, 5), general: true, desconocida: claves.length > 0 };
  }

  private resumirLocal(local: LocalConDetalle) {
    const tipos = local.tiposLocal.length > 0 ? local.tiposLocal.join(', ') : 'local';
    const eventos = local.categorias.slice(0, 3).map((c) => c.categoria.nombre).join(', ');
    return (
      `- LOCAL: ${local.nombre} (${tipos}), Distrito ${local.zona.distritoNumero}, ` +
      `${local.zona.nombreZonaPrincipal}${eventos ? `. Realiza: ${eventos}` : ''}. ` +
      `Calificacion: ${textoCalificacion(local.resenas)}`
    );
  }

  // Consultas extra segun lo que se pregunta (ver PIDE_* y conocimiento.ts).
  private async seccionesExtra(p: string): Promise<string[]> {
    const secciones = temasDeConocimiento(p).map((t) => `INFORMACION GENERAL (${t.tema}): ${t.texto}`);
    const aprobado = { estado: EstadoVerificacion.APROBADO };

    if (PIDE_NUEVOS.test(p)) {
      const nuevos = await this.prisma.local.findMany({
        where: aprobado,
        orderBy: { creadoEn: 'desc' },
        take: 5,
        include: { zona: true },
      });
      secciones.push(
        'LOCALES MAS NUEVOS (del mas reciente al mas antiguo):\n' +
          nuevos
            .map(
              (l) =>
                `- ${l.nombre} (${l.tiposLocal.join(', ') || 'local'}): registrado el ${formatearFecha(l.creadoEn)}, ` +
                `Distrito ${l.zona.distritoNumero}, ${l.zona.nombreZonaPrincipal}. Descripcion: ${resumen(l.descripcion)}`,
            )
            .join('\n'),
      );
    }

    if (PIDE_EVENTOS.test(p)) {
      const eventos = await this.prisma.evento.findMany({
        where: {
          AND: [
            eventoYaPublicado(),
            { OR: [{ localId: null }, { local: aprobado }] },
            eventoVigente(),
          ],
        },
        include: { local: { include: { zona: true } } },
        orderBy: { fechaInicio: 'asc' },
        take: 8,
      });
      secciones.push(
        eventos.length === 0
          ? 'EVENTOS PROXIMOS DE LA CARTELERA: por ahora no hay eventos publicados.'
          : 'EVENTOS PROXIMOS DE LA CARTELERA:\n' +
              eventos
                .map((e) => {
                  const donde = e.local
                    ? `en ${e.local.nombre} (Distrito ${e.local.zona.distritoNumero}, ${e.local.zona.nombreZonaPrincipal})`
                    : `en ${e.lugar}`;
                  return `- ${e.titulo}: ${formatearFecha(e.fechaInicio)}, ${donde}. ${resumen(e.descripcion)}`;
                })
                .join('\n'),
      );
    }

    if (PIDE_RANKING.test(p)) {
      const ranking = await this.prisma.resena.groupBy({
        by: ['localId'],
        where: { local: aprobado },
        _avg: { calificacion: true },
        _count: { _all: true },
        orderBy: { _avg: { calificacion: 'desc' } },
        take: 5,
      });
      const nombres = await this.prisma.local.findMany({
        where: { id: { in: ranking.map((r) => r.localId) } },
        select: { id: true, nombre: true },
      });
      secciones.push(
        ranking.length === 0
          ? 'LOCALES MEJOR CALIFICADOS: todavia ningun local tiene reseñas.'
          : 'LOCALES MEJOR CALIFICADOS (por los visitantes):\n' +
              ranking
                .map((r) => {
                  const nombre = nombres.find((n) => n.id === r.localId)?.nombre ?? '';
                  return `- ${nombre}: ${(Math.round((r._avg.calificacion ?? 0) * 10) / 10).toString()} de 5 (${r._count._all} reseña(s))`;
                })
                .join('\n'),
      );
    }

    if (PIDE_CUANTOS.test(p) || PIDE_DISTRITOS.test(p)) {
      const zonas = await this.prisma.zona.findMany({
        orderBy: { distritoNumero: 'asc' },
        include: { _count: { select: { locales: { where: aprobado } } } },
      });
      const total = zonas.reduce((acc, z) => acc + z._count.locales, 0);
      secciones.push(
        `RESUMEN: hay ${total} locales aprobados en la plataforma. Por distrito: ` +
          zonas.map((z) => `Distrito ${z.distritoNumero} (${z.nombreZonaPrincipal}): ${z._count.locales}`).join('; ') +
          '.',
      );
      if (PIDE_DISTRITOS.test(p)) {
        secciones.push(
          'DISTRITOS DE EL ALTO Y SUS SUBALCALDIAS:\n' +
            zonas.map((z) => `- Distrito ${z.distritoNumero}, ${z.nombreZonaPrincipal}: subalcaldia en ${z.direccionSubalcaldia}`).join('\n'),
        );
      }
    }
    return secciones;
  }

  private async construirContexto(pregunta: string, localId?: string): Promise<Contexto> {
    const ahora = new Date();
    const recuperacion = await this.buscarLocalesRelevantes(pregunta, localId);
    const secciones = await this.seccionesExtra(normalizar(pregunta));
    const { locales, zonas, categorias, tipos, servicios, aforoMin } = recuperacion;
    const partesFiltro = [
      tipos && `de tipo ${tipos.join(' o ')}`,
      zonas && `en ${zonas.map((z) => `el Distrito ${z.distritoNumero}, ${z.nombreZonaPrincipal}`).join(' o en ')}`,
      categorias && `que realicen ${categorias.map((c) => c.nombre).join(' o ')}`,
      aforoMin && `con capacidad para ${aforoMin} personas o más`,
      servicios && `con ${servicios.map((sv) => sv.nombre).join(' y ')}`,
    ].filter(Boolean);
    const filtro = partesFiltro.length > 0 ? partesFiltro.join(' ') : undefined;

    if (locales.length === 0) {
      return {
        texto: filtro
          ? `No hay locales registrados ${filtro}.`
          : 'Todavia no hay locales aprobados en la plataforma.',
        cantidad: 0,
        filtro,
        recuperacion,
        secciones,
      };
    }
    // Pregunta general (historia, eventos, locales nuevos...) que no nombra
    // ningun local: van solo las secciones, sin el panorama de locales al azar.
    if (recuperacion.general && secciones.length > 0) {
      return { texto: '', cantidad: 0, recuperacion, secciones };
    }
    // En el panorama general ("¿cuales son todos los locales?") va una linea por
    // local: con las fichas completas el modelo las copiaba enteras y tardaba
    // ~9 s, fuera del RNF02 (< 5 s).
    const texto = recuperacion.general
      ? locales.map((l) => this.resumirLocal(l)).join('\n')
      : locales.map((l) => describirLocal(l, ahora)).join('\n\n');
    return {
      texto,
      cantidad: locales.length,
      filtro,
      recuperacion,
      secciones,
      // porNombreOPalabras pone primero el local abierto, si lo hay.
      localAbierto: !filtro && localId && locales[0].id === localId ? locales[0].nombre : undefined,
    };
  }

  // ---------- 2. Generacion con Ollama ----------

  private async generarRespuesta(
    pregunta: string,
    contexto: Contexto,
    historial: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    const inicio = Date.now();

    const res = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelo,
        stream: false,
        keep_alive: KEEP_ALIVE,
        // num_predict es un tope de seguridad: sin el, ante "¿que locales hay en
        // La Ceja?" el modelo copiaba la ficha completa de cada local y tardaba
        // 12 s, fuera del RNF02 (< 5 s).
        // Con solo informacion general (historia, transporte...) la temperatura
        // baja: con 0.3 el modelo llego a inventar que El Alto se fundo en 1536.
        // Sin fichas de locales (solo secciones como el ranking o el resumen) la
        // temperatura baja para que se ciña a los datos. No usar repeat_penalty
        // alto: hace que evite copiar el contexto y termina inventando.
        options: { temperature: contexto.cantidad === 0 ? 0.2 : 0.3, num_predict: 220 },
        messages: [
          {
            role: 'system',
            // Mismo formato que los ejemplos del fine-tuning (ver prompt.ts).
            content: construirPromptSistema({
              cantidad: contexto.cantidad,
              textoLocales: contexto.texto,
              secciones: contexto.secciones,
              localAbierto: contexto.localAbierto,
              filtro: contexto.filtro,
              hoy: formatearFecha(new Date()),
            }),
          },
          ...historial,
          { role: 'user', content: pregunta },
        ],
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) throw new Error(`Ollama respondio ${res.status}`);
    const data = await res.json();
    const texto: string | undefined = data?.message?.content;
    if (!texto?.trim()) throw new Error('Ollama devolvio una respuesta vacia');

    this.logger.log(`Ollama (${this.modelo}) respondio en ${Date.now() - inicio} ms`);
    return texto.trim();
  }

  // ---------- 3. Orquestacion ----------

  async responder(sesionId: string, mensajeUsuario: string, usuarioId?: string, localId?: string) {
    // Solo el ultimo intercambio: basta para seguimientos ("¿y su horario?") y,
    // con mas historial, el modelo de 1.5B copia el patron "Si/No" de respuestas
    // previas y empieza a afirmar datos que no estan en la BD.
    const historialPrevio = await this.prisma.mensajeChat.findMany({
      where: { sesionId },
      orderBy: { creadoEn: 'desc' },
      take: 2,
    });
    const historial = historialPrevio.reverse().map((m) => ({
      role: (m.rol === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.contenido,
    }));

    await this.prisma.mensajeChat.create({
      data: { sesionId, usuarioId, rol: 'user', contenido: mensajeUsuario },
    });

    const preguntaNormal = normalizar(mensajeUsuario);
    const pideNavegar = PIDE_NAVEGAR.test(preguntaNormal);
    const corto = preguntaNormal.trim().replace(/^[¡¿\s]+/, '');

    if (SALUDO.test(corto)) {
      return this.guardarRespuesta(sesionId, {
        respuesta: localId
          ? '¡Hola! 👋 Pregúntame lo que quieras de este local: servicios, capacidad, horario, eventos, cómo llegar o cómo contactar al dueño.'
          : '¡Hola! 👋 ¿En qué te ayudo? Puedo buscarte un local para tu evento, contarte la cartelera o resolver tus dudas sobre El Alto y la página.',
        fuente: 'base_de_datos',
        acciones: [],
        sugerencias: localId ? this.sugerenciasLocal(undefined, localId) : SUGERENCIAS_GENERALES,
      });
    }
    if (AGRADECE.test(corto)) {
      return this.guardarRespuesta(sesionId, {
        respuesta: '¡Con gusto! 😊 Si necesitas algo más, aquí estoy.',
        fuente: 'base_de_datos',
        acciones: [],
        sugerencias: SUGERENCIAS_GENERALES,
      });
    }

    // Pedido de ir a una seccion de la web ("quiero registrar mi local"): se
    // responde directo y se lleva al usuario alla; el modelo no aporta nada aqui.
    const pagina = PAGINAS.find((p) => p.patron.test(preguntaNormal) && (!p.soloAlPedirAbrir || pideNavegar));
    if (pagina) {
      const accion: AccionChat = { tipo: 'ir', ruta: pagina.ruta, etiqueta: pagina.etiqueta };
      // "¿Como registro mi local?": la explicacion completa de conocimiento.ts.
      const temasPagina = temasDeConocimiento(preguntaNormal);
      return this.guardarRespuesta(sesionId, {
        respuesta: temasPagina.length > 0 ? temasPagina.map((t) => t.texto).join('\n\n') : pagina.respuesta,
        sugerencias: temasPagina.flatMap((t) => t.sugerencias ?? []).slice(0, 3),
        fuente: 'accion',
        acciones: [accion],
        navegar: pideNavegar || /\bquiero\b/.test(preguntaNormal) ? accion : undefined,
      });
    }

    const contexto = await this.construirContexto(mensajeUsuario, localId);

    // Servicios, capacidad, contacto o reglas de UN local: datos exactos de su
    // ficha (el modelo de 1.5B confundia "no indicado" con "no tiene").
    const rec = contexto.recuperacion;
    if (!rec.general && !contexto.filtro && rec.locales.length === 1) {
      const local = rec.locales[0];
      const ficha = this.responderFicha(local, preguntaNormal);
      if (ficha) {
        return this.guardarRespuesta(sesionId, {
          respuesta: ficha,
          fuente: 'base_de_datos',
          acciones: local.id === localId ? [] : [{ tipo: 'abrir_local', localId: local.id, etiqueta: `Ver ${local.nombre}` }],
          sugerencias: this.sugerenciasLocal(local, localId),
        });
      }
    }

    // Pregunta solo de informacion general (historia, cholets, transporte,
    // clima...): se responde con los textos revisados de conocimiento.ts.
    // Tambien si la pregunta activo un filtro ("¿que comida tipica hay?" filtra
    // restaurantes): el tema responde y los locales van como botones. No si
    // habla del local abierto ("¿que historia tiene este local?").
    const temas = temasDeConocimiento(preguntaNormal);
    // En la pagina de un local, "¿como califico un local?" o "la historia de El
    // Alto" siguen siendo temas generales: solo cuenta si nombra al local.
    const sobreUnLocal =
      !rec.general &&
      !contexto.filtro &&
      rec.locales.some((l) => palabrasClave(l.nombre).some((w) => palabrasClave(preguntaNormal).includes(w)));
    if (
      temas.length > 0 &&
      !sobreUnLocal &&
      !REFIERE_LOCAL_ABIERTO.test(preguntaNormal) &&
      !PIDE_LISTA.test(preguntaNormal) &&
      contexto.secciones.length === temas.length
    ) {
      const relacionados = contexto.filtro ? rec.locales.slice(0, 3) : [];
      return this.guardarRespuesta(sesionId, {
        respuesta:
          temas.map((t) => t.texto).join('\n\n') +
          (relacionados.length > 0
            ? `\n\nEn la plataforma, locales ${contexto.filtro}: ${relacionados.map((l) => `**${l.nombre}**`).join(', ')}.`
            : ''),
        fuente: 'base_de_datos',
        acciones: relacionados.map((l) => ({ tipo: 'abrir_local' as const, localId: l.id, etiqueta: `Ver ${l.nombre}` })),
        sugerencias: [...new Set(temas.flatMap((t) => t.sugerencias ?? []))].slice(0, 3),
      });
    }

    // Lista de locales de una zona, tipo o evento: se responde con los datos
    // exactos. El modelo de 1.5B a veces decia "hay varios" o inventaba un
    // "Local 2" cuando habia uno solo.
    if (contexto.filtro && contexto.cantidad > 0 && PIDE_LISTA.test(preguntaNormal)) {
      const locales = contexto.recuperacion.locales;
      const resumenes = await this.prisma.resena.groupBy({
        by: ['localId'],
        where: { localId: { in: locales.map((l) => l.id) } },
        _avg: { calificacion: true },
      });
      const estrellas = (id: string) => {
        const prom = resumenes.find((r) => r.localId === id)?._avg.calificacion;
        return prom ? ` · ★ ${(Math.round(prom * 10) / 10).toString()}` : '';
      };
      return this.guardarRespuesta(sesionId, {
        respuesta:
          `${locales.length === 1 ? 'Hay 1 local registrado' : `Hay ${locales.length} locales registrados`} ${contexto.filtro}:\n` +
          locales
            .map(
              (l) =>
                `- **${l.nombre}** (${l.tiposLocal.join(', ') || 'local'}) · ${l.direccion}` +
                `${l.aforo ? ` · 👥 ${l.aforo} personas` : ''}` +
                `${l.horarioFuncionamiento ? ` · ${l.horarioFuncionamiento}` : ''}${estrellas(l.id)}`,
            )
            .join('\n'),
        fuente: 'base_de_datos',
        acciones: this.accionesPara(contexto.recuperacion, preguntaNormal, false, localId).acciones,
        sugerencias: this.sugerenciasLocal(locales[0], localId),
      });
    }

    // "¿Que eventos hay (hoy / esta semana / el fin de semana)?": lista directa
    // de la cartelera. Con solo esa seccion, el modelo de 1.5B respondia "no hay
    // eventos" aunque los hubiera.
    if (PIDE_EVENTOS.test(preguntaNormal) && contexto.recuperacion.general && !contexto.recuperacion.zonas) {
      return this.guardarRespuesta(sesionId, await this.responderEventos(preguntaNormal));
    }

    // "¿Hay locales nuevos?": lista directa de la BD (con el modelo copiaba
    // descripciones largas y se repetia).
    if (PIDE_NUEVOS.test(preguntaNormal) && contexto.recuperacion.general) {
      const nuevos = await this.prisma.local.findMany({
        where: { estado: EstadoVerificacion.APROBADO },
        orderBy: { creadoEn: 'desc' },
        take: 5,
        include: { zona: true },
      });
      return this.guardarRespuesta(sesionId, {
        respuesta:
          nuevos.length === 0
            ? 'Todavía no hay locales publicados.'
            : 'Estos son los locales más nuevos de la plataforma:\n' +
              nuevos
                .map(
                  (l) =>
                    `- **${l.nombre}** (${l.tiposLocal.join(', ') || 'local'}) · Distrito ${l.zona.distritoNumero}, ` +
                    `${l.zona.nombreZonaPrincipal} · publicado el ${l.creadoEn.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' })}`,
                )
                .join('\n'),
        fuente: 'base_de_datos',
        acciones: nuevos.slice(0, 3).map((l) => ({ tipo: 'abrir_local' as const, localId: l.id, etiqueta: `Ver ${l.nombre}` })),
        sugerencias: ['¿Cuáles son los locales mejor calificados?', '¿Hay eventos próximos?', '🔎 Buscar un local paso a paso'],
      });
    }

    // "¿Cuales son los distritos de El Alto?": lista directa de la BD (14 lineas
    // fijas; con el modelo tardaba ~10 s y decia "subdistritos").
    if (PIDE_DISTRITOS.test(preguntaNormal) && !contexto.recuperacion.zonas) {
      const zonas = await this.prisma.zona.findMany({
        orderBy: { distritoNumero: 'asc' },
        include: { _count: { select: { locales: { where: { estado: EstadoVerificacion.APROBADO } } } } },
      });
      return this.guardarRespuesta(sesionId, {
        respuesta:
          `El Alto tiene **${zonas.length} distritos**, cada uno con su subalcaldía:\n` +
          zonas
            .map((z) => `- **Distrito ${z.distritoNumero}** · ${z.nombreZonaPrincipal} (${z._count.locales} local${z._count.locales === 1 ? '' : 'es'})`)
            .join('\n') +
          '\n\nPídeme, por ejemplo, «ábreme los locales del Distrito 5» para verlos en la página.',
        fuente: 'base_de_datos',
        acciones: [],
        sugerencias: ['Ábreme los locales del Distrito 1', '¿Qué locales hay en Ciudad Satélite?', '🔎 Buscar un local paso a paso'],
      });
    }
    // Tema que la plataforma no conoce: se dice con claridad y se ofrecen
    // opciones. El modelo de 1.5B contestaba igual (p. ej. sobre futbol).
    if (rec.desconocida && contexto.secciones.length === 0 && !pideNavegar) {
      return this.guardarRespuesta(sesionId, {
        respuesta:
          'No tengo información sobre eso 🤔. Puedo ayudarte con los **locales y cholets** de El Alto (servicios, ' +
          'capacidad, ubicación, contacto), la **cartelera de eventos**, datos de **El Alto** para visitarlo y el ' +
          '**uso de la página**. Elige una opción o escríbeme de otra forma:',
        fuente: 'base_de_datos',
        acciones: [],
        sugerencias: [...SUGERENCIAS_GENERALES, '¿Cómo uso la página?'],
      });
    }

    const { acciones, navegar } = this.accionesPara(contexto.recuperacion, preguntaNormal, pideNavegar, localId);

    // "Abreme los locales de Rio Seco": la pagina se abre sola y el chat confirma
    // con los datos exactos de la BD (rapido y sin riesgo de inventar).
    if (navegar) {
      return this.guardarRespuesta(sesionId, {
        respuesta: this.confirmarNavegacion(navegar, contexto),
        fuente: 'accion',
        acciones,
        navegar,
        sugerencias: this.sugerenciasLocal(contexto.recuperacion.locales[0], localId),
      });
    }
    if (acciones.some((a) => a.tipo === 'como_llegar')) {
      return this.guardarRespuesta(sesionId, {
        respuesta: this.explicarUbicacion(contexto),
        fuente: 'accion',
        acciones,
        sugerencias: this.sugerenciasLocal(contexto.recuperacion.locales[0], localId),
      });
    }

    // Con un solo local en el contexto (tipicamente la pagina abierta) el tema ya
    // esta definido y el historial solo estorba: en pruebas, tras hablar de
    // "Loques", "¿Que eventos tiene este local?" se respondia sobre Loques aun
    // estando en la pagina de Iroman. Con varios locales (preguntas generales) el
    // historial si hace falta para seguimientos como "¿y cual es su direccion?".
    // Tambien sin historial en preguntas por zona o categoria: la lista ya es
    // exactamente la que cumple el filtro y el historial podria traer locales de
    // otra conversacion.
    const historialUsado = contexto.cantidad === 1 || contexto.filtro ? [] : historial;

    let respuesta: string;
    let fuente: RespuestaChat['fuente'];
    try {
      if (contexto.cantidad === 0 && contexto.filtro) {
        // Ningun local cumple la zona/categoria: respuesta directa. Con 0 locales
        // en el contexto el modelo de 1.5B inventaba alguno (p.ej. recomendaba
        // "Loques" para quinceañeros sin que tuviera esa categoria).
        respuesta = `Por ahora no hay locales registrados ${contexto.filtro}.`;
        // Locales que cumplen el resto pero no indicaron capacidad o servicios:
        // se ofrecen para consultarles (muchos aun no llenaron esos datos).
        const sinDatos = rec.sinFicha ?? [];
        if (sinDatos.length > 0) {
          respuesta +=
            ' Pero estos locales cumplen lo demás y todavía no indicaron su capacidad o sus servicios; puedes consultarles:\n' +
            sinDatos.map((l) => `- **${l.nombre}** · ${l.direccion}${l.aforo ? ` · 👥 ${l.aforo} personas` : ''}`).join('\n');
          acciones.push(...sinDatos.slice(0, 3).map((l) => ({ tipo: 'abrir_local' as const, localId: l.id, etiqueta: `Ver ${l.nombre}` })));
        } else {
          respuesta += ' ¿Quieres que te recomiende otros locales?';
        }
        fuente = 'base_de_datos';
      } else {
        respuesta = await this.generarRespuesta(mensajeUsuario, contexto, historialUsado);
        fuente = 'ia';
      }
    } catch (error) {
      this.logger.warn(`Ollama no disponible (${(error as Error).message}); se responde con datos de la BD.`);
      // Respaldo legible: una linea por local (antes salia la ficha completa).
      const lineas = contexto.recuperacion.locales.map((l) => this.resumirLocal(l));
      respuesta =
        'El asistente de IA está tardando en responder. Esto es lo que encontré en la base de datos:\n\n' +
        [contexto.cantidad > 0 ? lineas.join('\n') : '', ...contexto.secciones].filter(Boolean).join('\n\n');
      fuente = 'base_de_datos';
    }

    const concretos = rec.general ? [] : rec.locales;
    const sugerencias =
      contexto.cantidad === 0 && contexto.filtro
        ? ['🔎 Buscar un local paso a paso', '¿Cuáles son los distritos de El Alto?']
        : concretos.length > 0
          ? this.sugerenciasLocal(concretos[0], localId)
          : SUGERENCIAS_GENERALES;
    return this.guardarRespuesta(sesionId, { respuesta, fuente, acciones, sugerencias });
  }

  // Respuesta con los datos exactos de la ficha de un local, o null si la
  // pregunta no es sobre servicios, capacidad, contacto ni reglas.
  private responderFicha(l: LocalConDetalle, p: string): string | null {
    const partes: string[] = [];
    const lista = (xs: { nombre: string }[]) =>
      xs.length === 1 ? xs[0].nombre : `${xs.slice(0, -1).map((x) => x.nombre).join(', ')} y ${xs[xs.length - 1].nombre}`;
    const consultar = l.whatsapp ? `; puedes consultarle por WhatsApp al **${l.whatsapp}**` : '; puedes consultarle al dueño';

    const pedidos = serviciosMencionados(p);
    if (pedidos.length > 0) {
      const tiene = pedidos.filter((sv) => l.servicios.includes(sv.id));
      const falta = pedidos.filter((sv) => !l.servicios.includes(sv.id));
      if (tiene.length > 0) partes.push(`✅ **${l.nombre}** indica que tiene ${lista(tiene)}.`);
      if (falta.length > 0) partes.push(`ℹ️ El dueño de **${l.nombre}** no indicó ${lista(falta)}${consultar}.`);
    } else if (PIDE_SERVICIOS.test(p)) {
      partes.push(
        l.servicios.length > 0
          ? `**${l.nombre}** ofrece: ${l.servicios.map(nombreServicio).join(', ')}.`
          : `El dueño de **${l.nombre}** todavía no indicó sus servicios${consultar}.`,
      );
    }
    if (PIDE_AFORO.test(p) || (PIDE_SERVICIOS.test(p) && l.aforo)) {
      partes.push(l.aforo ? `👥 Capacidad: hasta **${l.aforo} personas**.` : `El dueño no indicó la capacidad de **${l.nombre}**.`);
    }
    if (PIDE_CONTACTO.test(p)) {
      partes.push(
        (l.whatsapp
          ? `💬 Puedes escribirle al dueño por **WhatsApp al ${l.whatsapp}** (botón «Escribir por WhatsApp» en la página del local).`
          : `El dueño de **${l.nombre}** no registró un WhatsApp; en su página están su dirección y su horario.`) +
          ' La plataforma no hace reservas ni cobros: los precios y las fechas se acuerdan directamente con el dueño.',
      );
    }
    if (PIDE_REGLAS.test(p)) {
      partes.push(l.reglas ? `📋 Reglas de **${l.nombre}**: ${resumen(l.reglas, 500)}` : `El dueño de **${l.nombre}** no publicó reglas del local.`);
    }
    if (PIDE_HISTORIA_LOCAL.test(p) && !HABLA_DE_LA_CIUDAD.test(p)) {
      partes.push(
        l.historia
          ? `📜 Historia de **${l.nombre}**, contada por su dueño: ${resumen(l.historia, 700)}`
          : `El dueño de **${l.nombre}** todavía no contó la historia de su local.`,
      );
    }
    if (/\b(video|360|panoramica|recorrido virtual|paseo virtual)\b/.test(p)) {
      partes.push(
        `En su página, **${l.nombre}** ${l.foto360Url ? 'tiene un **Paseo 360°**' : 'no tiene foto 360°'} y ` +
          `${l.videoUrl ? 'tiene un **video**' : 'no tiene video'}.`,
      );
    }
    return partes.length > 0 ? partes.join('\n\n') : null;
  }

  // Preguntas de seguimiento sobre un local (con "este local" si es la pagina abierta).
  private sugerenciasLocal(local: LocalConDetalle | undefined, localId?: string): string[] {
    if (localId && (!local || local.id === localId)) {
      return ['¿Qué servicios tiene este local?', '¿Cuál es la capacidad de este local?', '¿Cómo contacto al dueño de este local?'];
    }
    if (!local) return SUGERENCIAS_GENERALES;
    return [`¿Cómo llego a ${local.nombre}?`, `¿Qué servicios tiene ${local.nombre}?`, `¿Cómo contacto al dueño de ${local.nombre}?`];
  }

  private async responderEventos(p: string): Promise<RespuestaChat> {
    const ahora = new Date();
    const eventos = await this.prisma.evento.findMany({
      where: {
        AND: [
          eventoYaPublicado(),
          { OR: [{ localId: null }, { local: { estado: EstadoVerificacion.APROBADO } }] },
          eventoVigente(),
        ],
      },
      include: { local: { include: { zona: true } } },
      orderBy: { fechaInicio: 'asc' },
      take: 10,
    });
    // Fecha en hora de Bolivia (AAAA-MM-DD) para comparar dias.
    const dia = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
    const hoy = dia(ahora);
    const enDias = (n: number) => dia(new Date(ahora.getTime() + n * 86400000));
    const diaSemana = Number(new Date(ahora.toLocaleString('en-US', { timeZone: 'America/La_Paz' })).getDay());
    let periodo = '';
    let enPeriodo = (_: Date) => true;
    if (/\bhoy\b/.test(p)) {
      periodo = 'hoy';
      enPeriodo = (d) => dia(d) === hoy;
    } else if (/\bmanana\b/.test(p)) {
      periodo = 'mañana';
      enPeriodo = (d) => dia(d) === enDias(1);
    } else if (/fin de semana/.test(p)) {
      periodo = 'este fin de semana';
      const sabado = enDias((6 - diaSemana + 7) % 7);
      const domingo = enDias((7 - diaSemana) % 7);
      enPeriodo = (d) => dia(d) >= sabado && dia(d) <= domingo;
    } else if (/esta semana|semana/.test(p)) {
      periodo = 'en los próximos 7 días';
      enPeriodo = (d) => dia(d) <= enDias(7);
    }
    const linea = (e: (typeof eventos)[number]) => {
      const donde = e.local ? `${e.local.nombre} (Distrito ${e.local.zona.distritoNumero})` : e.lugar;
      return `- **${e.titulo.trim()}** · ${formatearFecha(e.fechaInicio)} · ${donde}`;
    };
    const elegidos = eventos.filter((e) => enPeriodo(e.fechaInicio));
    let respuesta: string;
    if (eventos.length === 0) {
      respuesta = 'Por ahora no hay eventos publicados en la cartelera. ¡Vuelve pronto!';
    } else if (elegidos.length > 0) {
      respuesta = `Eventos ${periodo || 'próximos'} en la cartelera:\n${elegidos.map(linea).join('\n')}`;
    } else {
      respuesta =
        `No hay eventos ${periodo}. Los próximos en la cartelera son:\n` + eventos.slice(0, 5).map(linea).join('\n');
    }
    return {
      respuesta,
      fuente: 'base_de_datos',
      acciones: [{ tipo: 'ir', ruta: '/cartelera', etiqueta: 'Ver la cartelera' }],
      sugerencias: ['¿Qué eventos hay este fin de semana?', '¿Cuáles son los locales mejor calificados?', '🔎 Buscar un local paso a paso'],
    };
  }

  private async guardarRespuesta(sesionId: string, resultado: RespuestaChat) {
    await this.prisma.mensajeChat.create({
      data: { sesionId, rol: 'assistant', contenido: resultado.respuesta },
    });
    return resultado;
  }

  // ---------- 4. Acciones sobre la pagina ----------

  private accionesPara(
    rec: Recuperacion,
    preguntaNormal: string,
    pideNavegar: boolean,
    localId?: string,
  ): { acciones: AccionChat[]; navegar?: AccionChat } {
    const acciones: AccionChat[] = [];

    for (const z of (rec.zonas ?? []).slice(0, 2)) {
      acciones.push({
        tipo: 'abrir_zona',
        zonaId: z.id,
        etiqueta: `Ver locales del D${z.distritoNumero} · ${z.nombreZonaPrincipal}`,
      });
    }

    // Botones solo para locales concretos (no para el panorama general) y nunca
    // para el local cuya pagina ya esta abierta.
    const concretos = rec.general ? [] : rec.locales;
    const paraAbrir = concretos.filter((l) => l.id !== localId).slice(0, 4);
    for (const l of paraAbrir) {
      acciones.push({ tipo: 'abrir_local', localId: l.id, etiqueta: `Ver ${l.nombre}` });
    }

    if (rec.general && !localId) {
      acciones.push({ tipo: 'ir', ruta: '/', etiqueta: 'Ver todos los locales' });
    }

    // "¿Como llego?" sobre un local concreto: la guia paso a paso de su ficha.
    if (concretos.length === 1 && PIDE_UBICACION.test(preguntaNormal)) {
      const l = concretos[0];
      acciones.push({ tipo: 'como_llegar', localId: l.id, etiqueta: `Cómo llegar a ${l.nombre}` });
    }

    let navegar: AccionChat | undefined;
    if (pideNavegar) {
      if (rec.zonas?.length) navegar = acciones.find((a) => a.tipo === 'abrir_zona');
      else if (paraAbrir.length === 1) navegar = acciones.find((a) => a.tipo === 'abrir_local');
    }
    return { acciones, navegar };
  }

  private confirmarNavegacion(accion: AccionChat, contexto: Contexto) {
    const { locales, zonas } = contexto.recuperacion;
    if (accion.tipo === 'abrir_local') {
      return (
        `Listo, te abrí la página de **${accion.etiqueta.replace(/^Ver /, '')}**. ` +
        'Ahí ves sus fotos, su ubicación en el mapa, su horario y sus eventos.'
      );
    }
    const zona = zonas?.find((z) => accion.tipo === 'abrir_zona' && z.id === accion.zonaId);
    const nombreZona = zona ? `Distrito ${zona.distritoNumero}, ${zona.nombreZonaPrincipal}` : 'esa zona';
    if (locales.length === 0) {
      return (
        `Te abrí en la página la zona **${nombreZona}**, pero por ahora no hay locales registrados ` +
        `${contexto.filtro ?? 'ahí'}.`
      );
    }
    const lista = locales.map((l) => `- **${l.nombre}**: ${l.direccion}`).join('\n');
    const { categorias, tipos } = contexto.recuperacion;
    // Si ademas filtro por tipo o evento ("abreme los salones de La Ceja") se
    // aclara el filtro; si solo fue por zona, basta la cantidad.
    const encabezado =
      categorias || tipos
        ? `Locales ${contexto.filtro}:`
        : locales.length === 1
          ? 'Hay 1 local registrado:'
          : `Hay ${locales.length} locales registrados:`;
    return `Listo, te abrí en la página los locales de **${nombreZona}**. ${encabezado}\n${lista}`;
  }

  // "¿Como llego?" sobre un local concreto: la direccion exacta de la BD y el
  // boton a la guia del mapa. El modelo inventaba recorridos ("unos 10 minutos").
  private explicarUbicacion(contexto: Contexto) {
    const l = contexto.recuperacion.locales[0];
    return (
      `**${l.nombre}** está en ${l.direccion} (Distrito ${l.zona.distritoNumero}, ${l.zona.nombreZonaPrincipal}). ` +
      'Toca **Cómo llegar** para ver la ruta paso a paso en el mapa, a pie o en auto, y seguir la guía.'
    );
  }

  historial(sesionId: string) {
    return this.prisma.mensajeChat.findMany({
      where: { sesionId },
      orderBy: { creadoEn: 'asc' },
    });
  }
}
