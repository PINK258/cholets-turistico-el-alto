'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, urlArchivo } from '@/lib/api';
import type { EventoCartelera } from '@/components/TarjetaEvento';
import Icono from '@/components/Icono';

const ZONA_HORARIA = 'America/La_Paz';
const DURACION_MS = 6500; // tiempo de cada diapositiva
const MAX_EVENTOS = 8;

type Diapositiva =
  | { tipo: 'bienvenida'; imagen: string | null; vertical: false }
  | { tipo: 'evento'; evento: EventoCartelera; imagen: string | null; vertical: boolean };

const fechaEvento = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', {
    timeZone: ZONA_HORARIA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

// Carrusel de la portada (estilo cartelera de cine): primero la bienvenida y
// despues los eventos que publican los Administradores Turísticos y el
// Operador G.A.M.E.A., con su afiche, "Más información" y "Visitar local".
// Avanza solo, se pausa con el mouse encima y se puede deslizar en el celular.
export default function CarruselInicio({ fotosLocales, alExplorar }: { fotosLocales: string[]; alExplorar: () => void }) {
  const [eventos, setEventos] = useState<EventoCartelera[]>([]);
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const toqueRef = useRef<number | null>(null);

  useEffect(() => {
    api<EventoCartelera[]>('/eventos/cartelera')
      .then((lista) => setEventos(lista.slice(0, MAX_EVENTOS)))
      .catch(() => setEventos([]));
  }, []);

  const diapositivas: Diapositiva[] = [
    { tipo: 'bienvenida', imagen: fotosLocales[0] ?? null, vertical: false },
    // Imagen horizontal si la subieron; si no, el afiche vertical (se muestra
    // entero como poster); si no, la foto del local.
    ...eventos.map((e) => ({
      tipo: 'evento' as const,
      evento: e,
      imagen: e.bannerUrl ?? e.aficheUrl ?? e.local?.fotos[0]?.url ?? null,
      vertical: !e.bannerUrl && !!e.aficheUrl,
    })),
  ];
  const total = diapositivas.length;

  const ir = useCallback((i: number) => setActual(((i % total) + total) % total), [total]);

  // Avance automatico (no corre si esta en pausa o solo hay una diapositiva).
  useEffect(() => {
    if (pausado || total < 2) return;
    const t = setTimeout(() => ir(actual + 1), DURACION_MS);
    return () => clearTimeout(t);
  }, [actual, pausado, total, ir]);

  return (
    <section
      // overflow-clip (no overflow-hidden): asi el navegador no puede desplazar
      // la seccion al enfocar las flechas, lo que corria el texto hacia un lado.
      className="relative overflow-clip bg-morado-900 h-[440px] sm:h-[400px] select-none"
      aria-roledescription="carrusel"
      aria-label="Bienvenida y cartelera de eventos"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') ir(actual - 1);
        if (e.key === 'ArrowRight') ir(actual + 1);
      }}
      onTouchStart={(e) => (toqueRef.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toqueRef.current === null) return;
        const dx = e.changedTouches[0].clientX - toqueRef.current;
        if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1));
        toqueRef.current = null;
      }}
    >
      {diapositivas.map((d, i) => {
        const activa = i === actual;
        return (
          <div
            key={d.tipo === 'evento' ? d.evento.id : 'bienvenida'}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${activa ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            aria-hidden={!activa}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
          >
            <Fondo imagen={d.imagen} vertical={d.vertical} activa={activa} />
            {/* La clave cambia al activarse: asi el texto vuelve a animarse. */}
            <div key={activa ? `on-${actual}` : 'off'} className="contenedor relative h-full flex items-center">
              {d.tipo === 'bienvenida' ? (
                <ContenidoBienvenida activa={activa} alExplorar={alExplorar} hayEventos={eventos.length > 0} />
              ) : (
                <ContenidoEvento evento={d.evento} activa={activa} />
              )}
            </div>
          </div>
        );
      })}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => ir(actual - 1)}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 h-24 w-10 items-center justify-center rounded-r-2xl bg-black/25 text-white text-2xl hover:bg-black/45 transition-colors"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => ir(actual + 1)}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 h-24 w-10 items-center justify-center rounded-l-2xl bg-black/25 text-white text-2xl hover:bg-black/45 transition-colors"
            aria-label="Siguiente"
          >
            ›
          </button>
          {/* Indicadores: el activo se llena como barra de progreso. */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {diapositivas.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => ir(i)}
                className={`h-1.5 rounded-full overflow-hidden bg-white/35 transition-all duration-300 ${i === actual ? 'w-10' : 'w-4 hover:bg-white/60'}`}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === actual}
              >
                {i === actual && (
                  <span
                    key={`${actual}-${pausado}`}
                    className="block h-full bg-dorado-400 carrusel-progreso"
                    style={{ animationDuration: `${DURACION_MS}ms`, animationPlayState: pausado || total < 2 ? 'paused' : 'running' }}
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="franja-andina absolute bottom-0 left-0 right-0 z-20" />
    </section>
  );
}

// Fondo: la imagen difuminada a todo lo ancho y, a la derecha, la imagen
// nitida. Si es horizontal se funde con el morado (como el banner de un cine);
// si es un afiche vertical se muestra ENTERO como poster, sin recortarlo.
function Fondo({ imagen, vertical, activa }: { imagen: string | null; vertical: boolean; activa: boolean }) {
  if (!imagen) {
    return <div className="absolute inset-0 bg-gradient-to-br from-morado-800 via-morado-700 to-morado-900" />;
  }
  const src = urlArchivo(imagen);
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-50" />
      <div className="absolute inset-0 bg-gradient-to-r from-morado-900 via-morado-900/80 to-morado-900/20" />
      <div className={`absolute inset-y-0 right-0 w-full sm:w-[58%] overflow-hidden carrusel-mascara ${vertical ? 'sm:hidden' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={`w-full h-full object-cover transition-transform ease-out ${activa ? 'scale-100 duration-[7000ms]' : 'scale-110 duration-0'}`}
        />
      </div>
      {vertical && (
        // Afiche vertical: poster completo a la derecha (en computadora).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={`hidden sm:block absolute right-[7%] top-1/2 h-[82%] w-auto max-w-[38%] object-contain rounded-xl shadow-2xl ring-1 ring-white/20 transition-all ease-out ${
            activa ? '-translate-y-1/2 opacity-100 duration-700' : '-translate-y-[45%] opacity-0 duration-0'
          }`}
        />
      )}
      {/* En el celular el texto va sobre la imagen: se oscurece para que se lea. */}
      <div className="absolute inset-0 bg-gradient-to-t from-morado-900 via-morado-900/70 to-transparent sm:hidden" />
    </div>
  );
}

function ContenidoBienvenida({ activa, alExplorar, hayEventos }: { activa: boolean; alExplorar: () => void; hayEventos: boolean }) {
  const anim = (ms: number) => (activa ? { animationDelay: `${ms}ms` } : undefined);
  return (
    <div className="max-w-xl self-end sm:self-center pb-12 sm:pb-0">
      <p className={`inline-block text-[11px] font-bold uppercase tracking-widest text-dorado-400 bg-white/10 rounded-full px-3 py-1 mb-3 ${activa ? 'carrusel-entrar' : 'opacity-0'}`} style={anim(0)}>
        Bienvenido a la ciudad de El Alto
      </p>
      <h1 className={`text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-3 ${activa ? 'carrusel-entrar' : 'opacity-0'}`} style={anim(120)}>
        Descubre los cholets de El Alto
      </h1>
      <p className={`text-morado-100 sm:text-lg mb-6 ${activa ? 'carrusel-entrar' : 'opacity-0'}`} style={anim(240)}>
        Locales, cholets y puntos turísticos verificados en las zonas de La Ceja, Río Seco, Puente Vela y más.
      </p>
      <div className={`flex flex-wrap gap-3 ${activa ? 'carrusel-entrar' : 'opacity-0'}`} style={anim(360)}>
        <button type="button" onClick={alExplorar} className="rounded-xl bg-dorado-400 hover:bg-dorado-500 text-morado-900 font-bold px-5 py-2.5 shadow-lg transition-colors">
          Explorar locales
        </button>
        {hayEventos && (
          <Link href="/cartelera" className="rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold px-5 py-2.5 backdrop-blur transition-colors">
            <Icono nombre="party-popper" /> Ver cartelera →
          </Link>
        )}
      </div>
    </div>
  );
}

function ContenidoEvento({ evento, activa }: { evento: EventoCartelera; activa: boolean }) {
  const anim = (ms: number) => (activa ? { animationDelay: `${ms}ms` } : undefined);
  const clase = activa ? 'carrusel-entrar' : 'opacity-0';
  const lugar = evento.local
    ? `${evento.local.nombre} · ${evento.local.zona.nombreZonaPrincipal}`
    : evento.lugar;
  return (
    <div className="max-w-xl self-end sm:self-center pb-12 sm:pb-0">
      <p className={`inline-flex items-center gap-2 text-xs font-bold text-white bg-black/30 border border-white/20 rounded-full pl-1.5 pr-3 py-1 mb-3 ${clase}`} style={anim(0)}>
        <span className="w-6 h-6 rounded-full bg-dorado-400 text-morado-900 flex items-center justify-center" aria-hidden>
          <Icono nombre="party-popper" />
        </span>
        En cartelera
      </p>
      <h2 className={`text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-3 line-clamp-2 ${clase}`} style={anim(120)}>
        {evento.titulo}
      </h2>
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-morado-100 mb-3 ${clase}`} style={anim(220)}>
        <span className="capitalize"><Icono nombre="calendar" /> {fechaEvento(evento.fechaInicio)}</span>
        {lugar && <span><Icono nombre="map-pin" /> {lugar}</span>}
      </div>
      <p className={`text-morado-100/90 mb-6 line-clamp-2 ${clase}`} style={anim(320)}>
        {evento.descripcion}
      </p>
      <div className={`flex flex-wrap gap-3 ${clase}`} style={anim(420)}>
        <Link href={`/cartelera/${evento.id}`} className="rounded-xl bg-dorado-400 hover:bg-dorado-500 text-morado-900 font-bold px-5 py-2.5 shadow-lg transition-colors">
          Más información →
        </Link>
        {evento.local && (
          <Link href={`/locales/${evento.local.id}`} className="rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold px-5 py-2.5 backdrop-blur transition-colors">
            <Icono nombre="house" /> Visitar local
          </Link>
        )}
      </div>
    </div>
  );
}
