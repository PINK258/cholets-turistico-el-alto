import Link from 'next/link';
import { urlArchivo } from '@/lib/api';
import Icono from '@/components/Icono';

export interface EventoCartelera {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string | null;
  aficheUrl: string | null;
  // Imagen horizontal (opcional) para el carrusel de la portada.
  bannerUrl?: string | null;
  // Lugar escrito por el operador (eventos sin local o como detalle).
  lugar: string | null;
  local: {
    id: string;
    nombre: string;
    direccion: string;
    zona: { distritoNumero: number; nombreZonaPrincipal: string };
    fotos: { url: string }[];
  } | null;
}

const ZONA_HORARIA = 'America/La_Paz';

// Afiche tipo cartelera: la imagen del evento (o la foto del local) y la fecha
// destacada. Toda la tarjeta abre la ficha del evento (/cartelera/<id>).
export default function TarjetaEvento({ evento }: { evento: EventoCartelera }) {
  const inicio = new Date(evento.fechaInicio);
  const imagen = evento.aficheUrl ?? evento.local?.fotos[0]?.url ?? null;
  const local = evento.local;
  const dia = inicio.toLocaleDateString('es-BO', { day: 'numeric', timeZone: ZONA_HORARIA });
  const mes = inicio.toLocaleDateString('es-BO', { month: 'short', timeZone: ZONA_HORARIA }).replace('.', '');
  const diaSemana = inicio.toLocaleDateString('es-BO', { weekday: 'long', timeZone: ZONA_HORARIA });
  const hora = inicio.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_HORARIA });

  return (
    <Link href={`/cartelera/${evento.id}`} className="tarjeta-local flex flex-col group" aria-label={`Ver el evento ${evento.titulo}`}>
      <div className="relative block aspect-[3/4] overflow-hidden bg-gradient-to-br from-morado-700 to-morado-900">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlArchivo(imagen)} alt={`Afiche de ${evento.titulo}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden>
            <Icono nombre="party-popper" />
          </span>
        )}
        <span className="absolute top-2 left-2 rounded-xl bg-white/95 text-center px-2.5 py-1 shadow">
          <span className="block text-xl font-extrabold leading-none text-morado-900">{dia}</span>
          <span className="block text-[11px] font-bold uppercase text-dorado-600">{mes}</span>
        </span>
        {!evento.aficheUrl && imagen && (
          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            <span className="font-titulo block text-white font-bold leading-tight">{evento.titulo}</span>
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="font-semibold text-morado-900 leading-tight">{evento.titulo}</p>
        <p className="text-xs text-morado-600 mt-0.5 capitalize">
          {diaSemana} · {hora}
        </p>
        {local ? (
          <>
            <p className="mt-1.5 text-sm font-medium text-morado-700 truncate"><Icono nombre="map-pin" /> {local.nombre}</p>
            <p className="text-[11px] text-morado-500 truncate">
              {evento.lugar ? `${evento.lugar} · ` : ''}D{local.zona.distritoNumero} · {local.zona.nombreZonaPrincipal}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm font-medium text-morado-700 truncate"><Icono nombre="map-pin" /> {evento.lugar}</p>
        )}
        <span className="mt-2 text-xs font-semibold text-morado-700 group-hover:underline">Ver evento →</span>
      </div>
    </Link>
  );
}
