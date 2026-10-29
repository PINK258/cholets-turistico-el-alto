'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Local } from '@/lib/types';
import { urlArchivo } from '@/lib/api';
import { textoTiposLocal } from '@/lib/tiposLocal';
import { CalificacionCorta } from '@/components/Estrellas';
import BotonFavorito from '@/components/BotonFavorito';
import Icono from '@/components/Icono';

// Locales subidos por el Operador G.A.M.E.A. ("Subir edificio").
export const esDelGamea = (local: Local) => local.anfitrion?.rol === 'OPERADOR' || local.anfitrion?.rol === 'ADMIN';

// Tarjeta estilo Airbnb: foto grande redondeada (zoom lento al pasar el cursor)
// y el texto debajo, sin recuadro. El detalle completo esta en la ficha.
export default function LocalCard({ local }: { local: Local }) {
  const portada = local.fotos.find((f) => f.esPortada) || local.fotos[0];

  return (
    <Link href={`/locales/${local.id}`} className="group block active:scale-[0.98] transition-transform duration-200">
      <div className="relative w-full aspect-[4/3] rounded-2xl bg-morado-100 overflow-hidden">
        <Image
          src={portada ? urlArchivo(portada.url) : '/imagenes/locales/sin-foto.svg'}
          alt={local.nombre}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          unoptimized
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-xs font-bold text-morado-800">
          Distrito {local.zona.distritoNumero}
        </span>
        {/* Sin indicador de eventos: los eventos se ven solo en la Cartelera. */}
        <BotonFavorito localId={local.id} flotante />
      </div>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-titulo font-bold text-lg leading-snug text-morado-900 truncate">
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1.5px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_1.5px]">
              {local.nombre}
            </span>
          </p>
          {local.calificacion && (
            <span className="shrink-0 pt-1">
              <CalificacionCorta promedio={local.calificacion.promedio} total={local.calificacion.total} />
            </span>
          )}
        </div>
        <p className="text-sm text-morado-600 truncate">{textoTiposLocal(local.tiposLocal, esDelGamea(local))}</p>
        <p className="text-sm text-morado-500 truncate">
          <Icono nombre="map-pin" /> {local.zona.nombreZonaPrincipal}
        </p>
      </div>
    </Link>
  );
}
