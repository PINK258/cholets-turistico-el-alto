'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { api, urlArchivo } from '@/lib/api';
import { buscarLugar } from '@/lib/ubicacion';
import { textoTiposLocal } from '@/lib/tiposLocal';
import AvatarUsuario from '@/components/AvatarUsuario';
import Icono, { ConIconos } from '@/components/Icono';

const MapaComoLlegar = dynamic(() => import('@/components/MapaComoLlegar'), { ssr: false });

type EventoDetalle = {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string | null;
  aficheUrl: string | null;
  lugar: string | null;
  local: {
    id: string;
    nombre: string;
    descripcion: string;
    direccion: string;
    latitud: number;
    longitud: number;
    horarioFuncionamiento: string | null;
    tiposLocal: string[];
    zona: { distritoNumero: number; nombreZonaPrincipal: string };
    fotos: { id: string; url: string }[];
    anfitrion: { nombre: string; apellidoPaterno: string; avatarUrl: string | null };
  } | null;
};

const ZONA = 'America/La_Paz';
const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA });
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: ZONA });

// "Empieza en 2 d 5 h 12 min" / "¡Está ocurriendo ahora!" / "Este evento ya terminó".
function cuentaRegresiva(inicio: string, fin: string | null, ahora: number) {
  const ini = new Date(inicio).getTime();
  // Sin fin (o con un fin anterior al inicio, como en eventos viejos mal cargados)
  // se asume que dura unas 6 horas.
  const finMs = fin ? new Date(fin).getTime() : NaN;
  const termina = finMs > ini ? finMs : ini + 6 * 3600000;
  if (ahora >= termina) return { texto: 'Este evento ya terminó', vivo: false };
  if (ahora >= ini) return { texto: '¡Está ocurriendo ahora!', vivo: true };
  const min = Math.floor((ini - ahora) / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return { texto: `Empieza en ${d ? `${d} d ` : ''}${h ? `${h} h ` : ''}${m} min`, vivo: false };
}

// Ficha de un evento de la cartelera: mas llamativa que la del local, con el
// afiche en grande, cuenta regresiva, el local y el mapa con "Cómo llegar".
export default function EventoPage() {
  const { id } = useParams<{ id: string }>();
  const [evento, setEvento] = useState<EventoDetalle | null>(null);
  const [error, setError] = useState('');
  const [ahora, setAhora] = useState(() => Date.now());
  const [puntoLugar, setPuntoLugar] = useState<{ lat: number; lng: number } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    api<EventoDetalle>(`/eventos/${id}`)
      .then(setEvento)
      .catch((e) => setError(e.message || 'No se encontró el evento.'));
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Evento sin local: se intenta ubicar el lugar escrito en el mapa (aproximado).
  useEffect(() => {
    if (evento && !evento.local && evento.lugar) {
      buscarLugar(evento.lugar)
        .then((r) => r[0] && setPuntoLugar({ lat: r[0].lat, lng: r[0].lng }))
        .catch(() => {});
    }
  }, [evento]);

  if (error) {
    return (
      <div className="contenedor py-16 text-center">
        <p className="text-4xl mb-2"><Icono nombre="drama" /></p>
        <p className="text-morado-700 mb-4">{error}</p>
        <Link href="/cartelera" className="boton-primario-sm">Ver la cartelera</Link>
      </div>
    );
  }
  if (!evento) return <div className="contenedor py-16 text-morado-500">Cargando evento…</div>;

  const imagen = evento.aficheUrl ?? evento.local?.fotos[0]?.url ?? null;
  const cuenta = cuentaRegresiva(evento.fechaInicio, evento.fechaFin, ahora);
  const nombreLugar = evento.local ? evento.local.nombre : evento.lugar ?? '';
  const punto = evento.local ? { lat: evento.local.latitud, lng: evento.local.longitud } : puntoLugar;

  const compartir = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: evento.titulo, text: `${evento.titulo} · ${fechaLarga(evento.fechaInicio)}`, url });
        return;
      } catch {
        /* cancelado: se copia el enlace */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* sin portapapeles */
    }
  };

  return (
    <div className="pb-12">
      {/* Portada: afiche grande sobre su propia imagen desenfocada */}
      <section className="relative overflow-hidden bg-morado-900">
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlArchivo(imagen)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-morado-900/40 via-morado-900/70 to-morado-900" />
        <div className="contenedor relative z-10 py-8 grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-8 items-center">
          <div className="mx-auto w-56 md:w-72 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/20 bg-gradient-to-br from-morado-600 to-morado-800 flex items-center justify-center">
            {imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlArchivo(imagen)} alt={`Afiche de ${evento.titulo}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-7xl" aria-hidden><Icono nombre="party-popper" /></span>
            )}
          </div>
          <div className="text-white">
            <Link href="/cartelera" className="text-xs text-morado-200 hover:text-white">← Volver a la cartelera</Link>
            <p className="mt-3 inline-block text-[11px] font-bold uppercase tracking-widest text-dorado-400 bg-white/10 rounded-full px-3 py-1">
              Cartelera de los cholets
            </p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold leading-tight">{evento.titulo}</h1>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${cuenta.vivo ? 'bg-green-500 text-white animate-pulse' : 'bg-dorado-500 text-morado-900'}`}>
              <Icono nombre="timer" /> {cuenta.texto}
            </div>
            <ul className="mt-5 space-y-2 text-morado-50">
              <li className="flex gap-2 capitalize">
                <Icono nombre="calendar" /> {fechaLarga(evento.fechaInicio)}
              </li>
              <li className="flex gap-2">
                <span aria-hidden><Icono nombre="clock" /></span> {hora(evento.fechaInicio)}
                {evento.fechaFin && evento.fechaFin > evento.fechaInicio ? ` a ${hora(evento.fechaFin)}` : ''}
              </li>
              <li className="flex gap-2">
                <Icono nombre="map-pin" />
                <span>
                  {nombreLugar}
                  {evento.local && evento.lugar ? ` · ${evento.lugar}` : ''}
                  {evento.local && (
                    <span className="block text-xs text-morado-200">
                      {evento.local.direccion} · D{evento.local.zona.distritoNumero} {evento.local.zona.nombreZonaPrincipal}
                    </span>
                  )}
                </span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              {punto && (
                <a href="#como-llegar" className="inline-flex items-center gap-2 rounded-xl bg-white text-morado-800 font-bold px-4 py-2 hover:bg-morado-50">
                  <Icono nombre="compass" /> Cómo llegar
                </a>
              )}
              {evento.local && (
                <Link href={`/locales/${evento.local.id}`} className="inline-flex items-center gap-2 rounded-xl border-2 border-white/60 text-white font-semibold px-4 py-2 hover:bg-white/10">
                  <Icono nombre="house" /> Ver el local
                </Link>
              )}
              <button type="button" onClick={compartir} className="inline-flex items-center gap-2 rounded-xl border-2 border-white/60 text-white font-semibold px-4 py-2 hover:bg-white/10">
                <ConIconos texto={copiado ? '✔ Enlace copiado' : '📤 Compartir'} />
              </button>
            </div>
          </div>
        </div>
        <div className="franja-andina absolute bottom-0 left-0 right-0" />
      </section>

      <div className="contenedor mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-lg font-bold text-morado-900 mb-2">Sobre el evento</h2>
            <p className="text-morado-800 leading-relaxed whitespace-pre-wrap">{evento.descripcion}</p>
          </section>

          <section id="ubicacion" className="scroll-mt-24">
            <h2 className="text-lg font-bold text-morado-900 mb-2">¿Dónde es?</h2>
            {punto ? (
              <>
                {!evento.local && (
                  <p className="text-xs text-amber-700 mb-2">
                    Ubicación aproximada según la dirección escrita: “{evento.lugar}”.
                  </p>
                )}
                <MapaComoLlegar
                  lat={punto.lat}
                  lng={punto.lng}
                  nombre={nombreLugar}
                  // Foto del cholet donde es el evento; si el lugar no es un local registrado, el afiche.
                  foto={(() => {
                    const url = evento.local?.fotos[0]?.url ?? evento.aficheUrl;
                    return url ? urlArchivo(url) : null;
                  })()}
                />
              </>
            ) : (
              <p className="text-sm text-morado-600"><Icono nombre="map-pin" /> {evento.lugar}</p>
            )}
          </section>
        </div>

        {evento.local && (
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-morado-100 bg-white shadow-card overflow-hidden">
              {evento.local.fotos.length > 0 && (
                <div className="grid grid-cols-2 gap-0.5">
                  {evento.local.fotos.slice(0, 4).map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={f.id} src={urlArchivo(f.url)} alt="" className={`w-full object-cover ${i === 0 && evento.local!.fotos.length !== 2 ? 'col-span-2 h-36' : 'h-24'}`} />
                  ))}
                </div>
              )}
              <div className="p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-dorado-600">El local</p>
                <p className="text-lg font-bold text-morado-900 leading-tight">{evento.local.nombre}</p>
                <p className="text-xs text-morado-600">{textoTiposLocal(evento.local.tiposLocal)}</p>
                <p className="text-sm text-morado-700 line-clamp-3">{evento.local.descripcion}</p>
                {evento.local.horarioFuncionamiento && (
                  <p className="text-xs text-morado-600"><Icono nombre="clock" /> {evento.local.horarioFuncionamiento}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <AvatarUsuario url={evento.local.anfitrion.avatarUrl} nombre={evento.local.anfitrion.nombre} apellido={evento.local.anfitrion.apellidoPaterno} tamano="w-8 h-8 text-[11px]" />
                  <span className="text-xs text-morado-700">
                    {evento.local.anfitrion.nombre} {evento.local.anfitrion.apellidoPaterno}
                  </span>
                </div>
                <Link href={`/locales/${evento.local.id}`} className="boton-primario-sm w-full mt-2">
                  Ver la ficha del local
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
