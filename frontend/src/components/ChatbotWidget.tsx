'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AccionChat, MensajeChat, RespuestaChatbot } from '@/lib/types';
import TextoFormateado from '@/components/chat/TextoFormateado';
import BuscadorGuiado from '@/components/chat/BuscadorGuiado';
import Icono, { ConIconos } from '@/components/Icono';

type MensajeUI = MensajeChat & {
  fuente?: RespuestaChatbot['fuente'];
  acciones?: AccionChat[];
  sugerencias?: string[];
  error?: boolean;
  // Pregunta que fallo, para el boton "Reintentar".
  pregunta?: string;
};

const CLAVE_SESION = 'turismo_el_alto_chat_sesion';

// "este local" deja claro que se pregunta por el local de la pagina abierta,
// aunque antes se haya hablado de otro.
const SUGERENCIAS_LOCAL = [
  '¿Qué servicios tiene este local?',
  '¿Cómo llego a este local?',
  '¿Qué eventos tiene este local?',
  '¿Cómo contacto al dueño de este local?',
];
// Boton especial: abre el buscador guiado en vez de enviarse como pregunta.
const BUSCAR_PASO_A_PASO = '🔎 Buscar un local paso a paso';
// Menu de opciones por tema: el usuario elige un tema y luego una pregunta,
// sin tener que escribir.
type TemaMenu = { icono: string; tema: string; preguntas: string[] };
const MENU: TemaMenu[] = [
  {
    icono: '🎉',
    tema: 'Cartelera y eventos',
    preguntas: ['¿Hay eventos próximos?', '¿Qué eventos hay este fin de semana?', 'Ábreme la cartelera'],
  },
  {
    icono: '📍',
    tema: 'Locales por zona',
    preguntas: ['Ábreme los locales de Río Seco', '¿Qué locales hay en La Ceja?', '¿Qué locales hay en Ciudad Satélite?', '¿Qué locales hay en Villa Adela?'],
  },
  {
    icono: '🎊',
    tema: 'Según tu evento',
    preguntas: ['¿Dónde puedo hacer un matrimonio?', '¿Qué cholet hace prestes?', '¿Dónde celebrar una graduación?', '¿Dónde hacer un quinceañero?'],
  },
  {
    icono: '🅿️',
    tema: 'Servicios y capacidad',
    preguntas: [
      '¿Qué locales tienen estacionamiento?',
      '¿Qué locales hay para 300 personas?',
      '¿Qué locales tienen catering?',
      '¿Qué locales tienen acceso para silla de ruedas?',
      '¿Cuáles son los locales mejor calificados?',
    ],
  },
  {
    icono: '💬',
    tema: 'Reservas y precios',
    preguntas: ['¿Cómo reservo un local?', '¿Cuánto cuesta alquilar un salón?', '¿Cómo contacto al dueño de un local?'],
  },
  {
    icono: '🏛️',
    tema: 'Historia y cultura',
    preguntas: ['¿Qué es un cholet?', 'Cuéntame la historia de El Alto', '¿Qué es un preste?', '¿Qué es la Feria 16 de Julio?', '¿Qué comida típica hay en El Alto?'],
  },
  {
    icono: '🧭',
    tema: 'Cómo moverse',
    preguntas: ['¿Cómo llego a El Alto desde La Paz?', '¿Qué transporte hay en El Alto?', '¿Cómo es el clima en El Alto?', '¿Es seguro visitar El Alto?'],
  },
  {
    icono: '❓',
    tema: 'Ayuda con la página',
    preguntas: [
      '¿Cómo creo mi cuenta?',
      '¿Cómo guardo un local en favoritos?',
      '¿Cómo califico un local?',
      '¿Cómo denuncio un local?',
      'Olvidé mi contraseña',
      '¿Cómo instalo la app?',
    ],
  },
  {
    icono: '🏢',
    tema: 'Soy dueño de un local',
    preguntas: ['¿Cómo registro mi local?', '¿Cuánto tarda la revisión de mi local?', '¿Cómo publico un evento en la cartelera?', '¿Cómo subo una foto 360°?'],
  },
];
// Menu en la pagina de un local: preguntas sobre ese local.
const MENU_LOCAL: TemaMenu[] = [
  {
    icono: '🏠',
    tema: 'Este local',
    preguntas: ['¿Qué servicios tiene este local?', '¿Cuál es la capacidad de este local?', '¿Qué horario tiene este local?', '¿Quién es el dueño de este local?'],
  },
  {
    icono: '💬',
    tema: 'Contacto y precios',
    preguntas: ['¿Cómo contacto al dueño de este local?', '¿Cuánto cuesta alquilar este local?', '¿Qué reglas tiene este local?'],
  },
  {
    icono: '🎉',
    tema: 'Eventos',
    preguntas: ['¿Qué eventos tiene este local?', '¿Qué tipos de eventos realiza este local?', '¿Hay eventos próximos?'],
  },
  {
    icono: '🧭',
    tema: 'Ubicación',
    preguntas: ['¿Cómo llego a este local?', '¿En qué zona está este local?', '¿Tiene estacionamiento este local?'],
  },
  {
    icono: '⭐',
    tema: 'Opiniones',
    preguntas: ['¿Qué calificación tiene este local?', '¿Cómo califico un local?', '¿Cómo denuncio un local?'],
  },
  {
    icono: '🎥',
    tema: 'Fotos y video',
    preguntas: ['¿Este local tiene video o foto 360°?', '¿Cómo subo una foto 360°?'],
  },
];

// crypto.randomUUID() solo existe en contextos seguros (https o localhost); al
// abrir la web con la IP de la red (http://192.168.x.x:3000) es undefined y el
// chat se rompia. crypto.getRandomValues() si esta disponible en http.
function generarId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function obtenerSesionId() {
  let id = localStorage.getItem(CLAVE_SESION);
  if (!id) {
    id = generarId();
    localStorage.setItem(CLAVE_SESION, id);
  }
  return id;
}

// Ruta interna de una accion. Solo rutas propias armadas aqui: nunca se navega a
// un texto libre que venga del servidor.
function rutaInterna(accion: AccionChat): string | null {
  switch (accion.tipo) {
    case 'abrir_zona':
      return `/?zona=${encodeURIComponent(accion.zonaId)}`;
    case 'abrir_local':
      return /^[0-9a-f-]{36}$/i.test(accion.localId) ? `/locales/${accion.localId}` : null;
    case 'como_llegar':
      return /^[0-9a-f-]{36}$/i.test(accion.localId) ? `/locales/${accion.localId}#como-llegar` : null;
    case 'ir':
      return /^\/[a-z0-9-]*$/i.test(accion.ruta) ? accion.ruta : null;
    default:
      return null;
  }
}

// El mapa del local se carga despues de abrir la pagina, asi que el salto del
// navegador a #como-llegar no lo encuentra: se espera a que aparezca (hasta 10 s).
function bajarAComoLlegar(localId: string, intentos = 40) {
  const destino = window.location.pathname === `/locales/${localId}` && document.getElementById('como-llegar');
  if (destino) return destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (intentos > 0) setTimeout(() => bajarAComoLlegar(localId, intentos - 1), 250);
}

const ICONO_ACCION: Record<AccionChat['tipo'], string> = {
  abrir_zona: '📍',
  abrir_local: '🏠',
  ir: '➜',
  como_llegar: '🧭',
};

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

function AvatarBot() {
  return (
    <span className="shrink-0 w-7 h-7 rounded-full bg-white border border-morado-200 shadow-sm flex items-center justify-center">
      <Image src="/imagenes/logos/logo-icono.png" alt="" width={20} height={10} className="w-5 h-auto" />
    </span>
  );
}

function Escribiendo() {
  return (
    <div className="flex items-end gap-2 animate-aparecer" aria-label="El asistente está escribiendo">
      <AvatarBot />
      <div className="bg-white border border-morado-100 rounded-2xl rounded-bl-sm px-3 py-3 shadow-sm flex gap-1">
        {[0, 150, 300].map((retraso) => (
          <span
            key={retraso}
            className="w-1.5 h-1.5 rounded-full bg-morado-400 animate-bounce"
            style={{ animationDelay: `${retraso}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // Si el usuario esta viendo un cholet (/locales/<id>), el bot responde sobre ese local.
  const localId = pathname?.match(/^\/locales\/([0-9a-f-]{36})$/i)?.[1];

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeUI[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Menu de opciones: abierto (null = lista de temas) o cerrado; tema elegido.
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [temaElegido, setTemaElegido] = useState<number | null>(null);
  const [buscador, setBuscador] = useState(false);
  const menu = localId ? MENU_LOCAL : MENU;
  const historialCargado = useRef(false);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recupera la conversacion guardada la primera vez que se abre el chat, asi no
  // se pierde al recargar la pagina o al pasar de un local a otro.
  useEffect(() => {
    if (!abierto || historialCargado.current) return;
    historialCargado.current = true;
    const sesionId = obtenerSesionId();
    api<MensajeChat[]>(`/chatbot/historial?sesionId=${encodeURIComponent(sesionId)}`)
      .then((previos) =>
        setMensajes((actuales) =>
          actuales.length > 0
            ? actuales
            : previos.map((m) => ({ id: m.id, rol: m.rol, contenido: m.contenido, creadoEn: m.creadoEn })),
        ),
      )
      .catch(() => {
        // Sin historial no pasa nada: el chat empieza vacio.
      });
  }, [abierto]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, enviando, abierto]);

  useEffect(() => {
    if (abierto && !enviando) inputRef.current?.focus();
  }, [abierto, enviando]);

  // Abre en la pagina lo que propone el chatbot. En celulares el chat tapa la
  // pagina, asi que se cierra para que el usuario vea lo que se abrio.
  const ejecutarAccion = (accion: AccionChat) => {
    const ruta = rutaInterna(accion);
    if (!ruta) return;
    router.push(ruta);
    if (window.innerWidth < 640) setAbierto(false);
    if (accion.tipo === 'como_llegar') bajarAComoLlegar(accion.localId);
  };

  const enviar = async (preguntaDirecta?: string, esReintento = false) => {
    const contenido = (preguntaDirecta ?? texto).trim();
    if (!contenido || enviando) return;
    if (contenido === BUSCAR_PASO_A_PASO) {
      setBuscador(true);
      setMenuAbierto(false);
      return;
    }
    setBuscador(false);

    if (preguntaDirecta === undefined) setTexto('');
    setMenuAbierto(false);
    setTemaElegido(null);
    setMensajes((prev) => {
      const sinErrores = prev.filter((m) => !m.error);
      // Al reintentar, la pregunta ya esta en pantalla: no se duplica.
      return esReintento
        ? sinErrores
        : [...sinErrores, { id: generarId(), rol: 'user', contenido, creadoEn: new Date().toISOString() }];
    });
    setEnviando(true);

    try {
      const resp = await api<RespuestaChatbot>('/chatbot/mensaje', {
        method: 'POST',
        token,
        body: JSON.stringify({
          sesionId: obtenerSesionId(),
          mensaje: contenido,
          ...(localId ? { localId } : {}),
        }),
      });
      setMensajes((prev) => [
        ...prev,
        {
          id: generarId(),
          rol: 'assistant',
          contenido: resp.respuesta,
          fuente: resp.fuente,
          acciones: resp.acciones,
          sugerencias: resp.sugerencias,
          creadoEn: new Date().toISOString(),
        },
      ]);
      // "Abreme los locales de Rio Seco": la pagina se abre sola.
      if (resp.navegar) ejecutarAccion(resp.navegar);
    } catch (e: any) {
      setMensajes((prev) => [
        ...prev,
        {
          id: generarId(),
          rol: 'assistant',
          contenido: e.message || 'Ocurrió un error al contactar al asistente.',
          error: true,
          pregunta: contenido,
          creadoEn: new Date().toISOString(),
        },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const nuevaConversacion = () => {
    localStorage.setItem(CLAVE_SESION, generarId());
    setMensajes([]);
    setTexto('');
  };

  const ultimo = mensajes[mensajes.length - 1];
  const yaPreguntadas = new Set(mensajes.filter((m) => m.rol === 'user').map((m) => m.contenido));
  // Botones de seguimiento: los que propone el servidor para la ultima respuesta
  // o, al empezar en la pagina de un local, preguntas sobre ese local.
  const base = ultimo?.rol === 'assistant' && ultimo.sugerencias?.length ? ultimo.sugerencias : localId ? SUGERENCIAS_LOCAL : [];
  const sugerencias = base.filter((s) => !yaPreguntadas.has(s)).slice(0, 3);
  const mostrarSugerencias = !enviando && !buscador && (!ultimo || (ultimo.rol === 'assistant' && !ultimo.error));

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {abierto && (
        <div
          className="mb-3 w-[min(360px,calc(100vw-2.5rem))] h-[min(520px,calc(100vh-7rem))] bg-white rounded-2xl shadow-2xl border border-morado-200 flex flex-col overflow-hidden animate-aparecer"
          onKeyDown={(e) => e.key === 'Escape' && setAbierto(false)}
        >
          <div className="bg-gradient-to-r from-morado-700 to-morado-900 text-white px-3 py-2.5 flex items-center gap-2.5">
            <AvatarBot />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">Asistente de Cholets Turístico</p>
              <p className="text-[11px] text-morado-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {localId ? 'Respondo sobre el local que estás viendo' : 'Pregúntame o pídeme abrir una zona o local'}
              </p>
            </div>
            <button
              onClick={nuevaConversacion}
              title="Nueva conversación"
              aria-label="Nueva conversación"
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar chat"
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icono nombre="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="franja-andina" />

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-morado-50/40" aria-live="polite">
            <div className="flex items-end gap-2">
              <AvatarBot />
              <div className="max-w-[85%] bg-white border border-morado-100 text-morado-900 rounded-2xl rounded-bl-sm px-3 py-2 text-sm shadow-sm">
                {localId
                  ? '¡Hola! 👋 Estás viendo un local. Pregúntame su dirección, horario, eventos o quién es el dueño.'
                  : '¡Hola! 👋 Soy el asistente de Cholets Turístico El Alto. Puedo recomendarte locales, contarte sus eventos y abrirte la página que necesites, por ejemplo: «ábreme los locales de Río Seco».'}
              </div>
            </div>

            {mensajes.map((m) =>
              m.rol === 'user' ? (
                <div key={m.id} className="flex flex-col items-end animate-aparecer">
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm text-sm shadow-sm whitespace-pre-wrap bg-gradient-to-b from-morado-600 to-morado-800 text-white">
                    {m.contenido}
                  </div>
                  <span className="text-[10px] text-morado-400 mt-0.5 mr-1">{hora(m.creadoEn)}</span>
                </div>
              ) : (
                <div key={m.id} className="flex items-end gap-2 animate-aparecer">
                  <AvatarBot />
                  <div className="max-w-[85%] flex flex-col">
                    {m.error ? (
                      <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm shadow-sm bg-red-50 border border-red-200 text-red-700">
                        <p><Icono nombre="triangle-alert" /> {m.contenido}</p>
                        {m.pregunta && (
                          <button
                            onClick={() => enviar(m.pregunta, true)}
                            className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                          >
                            Reintentar
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm shadow-sm bg-white border border-morado-100 text-morado-900">
                        <TextoFormateado texto={m.contenido} />
                      </div>
                    )}
                    {m.acciones && m.acciones.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {m.acciones.map((a, i) => {
                          const clase =
                            'inline-flex items-center gap-1 max-w-full text-xs font-medium px-2.5 py-1 rounded-full bg-morado-700 text-white hover:bg-morado-800 transition-colors';
                          const contenido = (
                            <>
                              <ConIconos texto={ICONO_ACCION[a.tipo]} />
                              <span className="truncate">{a.etiqueta}</span>
                            </>
                          );
                          if (!rutaInterna(a)) return null;
                          return (
                            <button key={i} type="button" onClick={() => ejecutarAccion(a)} className={clase}>
                              {contenido}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <span className="text-[10px] text-morado-400 mt-0.5 ml-1">
                      {hora(m.creadoEn)}
                      {m.fuente === 'base_de_datos' && ' · Respuesta directa de la base de datos'}
                    </span>
                  </div>
                </div>
              ),
            )}

            {enviando && <Escribiendo />}

            {/* Buscador guiado: evento, zona, invitados y servicios con botones. */}
            {buscador && !enviando && (
              <div className="pl-9 animate-aparecer">
                <BuscadorGuiado onBuscar={(p) => enviar(p)} onCerrar={() => setBuscador(false)} />
              </div>
            )}

            {/* Menu de opciones por tema. */}
            {!enviando && !buscador && menuAbierto && (
              <div className="pl-9 animate-aparecer">
                <div className="rounded-2xl border border-morado-100 bg-white p-2.5 shadow-sm">
                  {temaElegido === null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setBuscador(true);
                          setMenuAbierto(false);
                        }}
                        className="w-full mb-2 flex items-center gap-2 text-left text-xs font-semibold px-2.5 py-2 rounded-xl bg-gradient-to-r from-morado-700 to-morado-900 text-white hover:from-morado-800"
                      >
                        <span aria-hidden className="text-base"><Icono nombre="search" /></span>
                        <span className="leading-tight">
                          Buscar un local paso a paso
                          <span className="block font-normal text-[10px] text-morado-100">Elige tu evento, zona, invitados y servicios</span>
                        </span>
                      </button>
                      <p className="text-xs font-semibold text-morado-800 mb-2">
                        {localId ? '¿Qué quieres saber de este local?' : '¿Sobre qué quieres saber? Elige una opción:'}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {menu.map((m, i) => (
                          <button
                            key={m.tema}
                            type="button"
                            onClick={() => setTemaElegido(i)}
                            className="flex items-center gap-1.5 text-left text-xs px-2 py-2 rounded-xl border border-morado-100 bg-morado-50/60 text-morado-800 hover:bg-morado-100 hover:border-morado-300 transition-colors"
                          >
                            <span aria-hidden className="text-base flex"><ConIconos texto={m.icono} /></span>
                            <span className="leading-tight">{m.tema}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-morado-800">
                          <ConIconos texto={menu[temaElegido].icono} /> {menu[temaElegido].tema}
                        </p>
                        <button type="button" onClick={() => setTemaElegido(null)} className="text-[11px] text-morado-600 hover:underline">
                          ← Temas
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {menu[temaElegido].preguntas.map((pregunta) => (
                          <button
                            key={pregunta}
                            type="button"
                            onClick={() => enviar(pregunta)}
                            className="text-left text-xs px-2.5 py-1.5 rounded-xl border border-morado-200 bg-white text-morado-700 hover:bg-morado-50 hover:border-morado-400 transition-colors"
                          >
                            {pregunta}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {mostrarSugerencias && sugerencias.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-9 animate-aparecer">
                {sugerencias.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      s === BUSCAR_PASO_A_PASO
                        ? 'border-morado-700 bg-morado-700 text-white hover:bg-morado-800'
                        : 'border-morado-200 bg-white text-morado-700 hover:bg-morado-50 hover:border-morado-400'
                    }`}
                  >
                    <ConIconos texto={s} />
                  </button>
                ))}
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form
            className="p-2 border-t border-morado-100 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuAbierto((v) => !v || temaElegido !== null || buscador);
                setTemaElegido(null);
                setBuscador(false);
              }}
              className={`shrink-0 px-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                menuAbierto ? 'bg-morado-700 text-white border-morado-700' : 'bg-white text-morado-700 border-morado-200 hover:bg-morado-50'
              }`}
              title="Ver las opciones"
              aria-pressed={menuAbierto}
            >
              <Icono nombre="list" /> Opciones
            </button>
            <input
              ref={inputRef}
              className="input-campo"
              placeholder={enviando ? 'Esperando respuesta…' : 'Escribe tu pregunta…'}
              value={texto}
              maxLength={1000}
              disabled={enviando}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button
              type="submit"
              className="boton-primario-sm !px-3"
              disabled={enviando || !texto.trim()}
              aria-label="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setAbierto((v) => !v)}
        className="ml-auto w-14 h-14 rounded-full bg-gradient-to-b from-morado-600 to-morado-800 text-white shadow-boton ring-2 ring-dorado-500/60 flex items-center justify-center text-2xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
        aria-label={abierto ? 'Cerrar chatbot' : 'Abrir chatbot'}
      >
        {abierto ? <Icono nombre="x" className="h-6 w-6" /> : <Icono nombre="messages-circle" className="h-7 w-7" />}
      </button>
    </div>
  );
}
